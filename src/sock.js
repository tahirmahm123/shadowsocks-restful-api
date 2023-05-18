const path = require("path");
const asyncLock = require("async-lock");
const unixDgram = require("unix-dgram");
const socketPath = path.resolve(__dirname, "/tmp/manager.sock");
const controllerPath = path.resolve(__dirname, "/tmp/controller.sock");
const portastic = require("portastic");
const socket = unixDgram.createSocket("unix_dgram");
const lock = new asyncLock();
function sendCommand(command) {
	if (!command || typeof command !== "string") {
		throw new Error("Illegal argument");
	}

	if (
		command !== "ping" &&
		command !== "list" &&
		command.substr(0, 5) !== "add: " &&
		command.substr(0, 8) !== "remove: "
	) {
		throw new Error("Illegal argument");
	}

	if (command.substr(0, 5) === "add: ") {
		const jsonString = command.substr(5);
		if (!isValidJSON(jsonString)) {
			throw new Error("Illegal argument");
		}

		const { server_port, password } = JSON.parse(jsonString);
		if (
			!Number.isInteger(server_port) ||
			server_port < 1 ||
			server_port > 65535 ||
			typeof password !== "string" ||
			password.length < 1
		) {
			throw new Error("Illegal argument");
		}
	}

	if (command.substr(0, 8) === "remove: ") {
		const jsonString = command.substr(8);
		if (!isValidJSON(jsonString)) {
			throw new Error("Illegal argument");
		}

		const { server_port } = JSON.parse(jsonString);
		if (
			!Number.isInteger(server_port) ||
			server_port < 1 ||
			server_port > 65535
		) {
			throw new Error("Illegal argument");
		}
	}

	return lock.acquire("key", () => {
			return new Promise((resolve, reject) => {
				let hasResponse = false;
				socket.once("message", (message) => {
                    hasResponse = true;
                    console.log("Message From Socket: "+message)
					resolve(String(message));
				});

				try {
					const buffer = Buffer.from(command);
					socket.send(
						buffer,
						0,
						buffer.length,
						socketPath,
						(error) => {
							if (error) {
								throw new Error("Shadowsocks unreachable"+error);
							}
						}
					);
				} catch (error) {
					socket.removeAllListeners("message");
					throw error;
				}

				setTimeout(() => {
					if (!hasResponse) {
						socket.removeAllListeners("message");
						reject(new Error("Shadowsocks no response"));
					}
				}, 1000);
			});
		},
		{}
	);
}

function isValidJSON(jsonString) {
	try {
		JSON.parse(jsonString);
		return true;
	} catch (error) {
		return false;
	}
}

const getPortAvailable = async function (r) {
	if (isNaN(r) || !Number.isInteger(r) || r < 1 || r > 65535) {
		throw new Error("illegal argument");
	}

	const t = await portastic.test(r);
	return t;
};
module.exports = {
    controllerPath, sendCommand, socket, getPortAvailable
}