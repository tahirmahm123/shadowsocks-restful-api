"use strict";

const regeneratorRuntime = require("regenerator-runtime");
const unixDgram = require("unix-dgram");
const fs = require("fs");
const path = require("path");
const asyncLock = require("async-lock");
const validator = require("validator");
const debug = require("debug")("service");
const portastic = require("portastic");
const Ports = require("./ports");
const { ProtocolTypes, encryptionMethods } = require("./constants");

const socketPath = path.resolve(__dirname, "/tmp/shadowsocks-manager.sock");
const controllerPath = path.resolve(__dirname, "/tmp/ss-controller.sock");
const loginPassword = process.env.LOGIN_PASSWORD;

const socket = unixDgram.createSocket("unix_dgram");
const lock = new asyncLock();
const commandKeywords = {
	libev: {
		ping: "ping",
		getAllPorts: "list",
		getAllTraffic: "ping",
		add: "add",
		remove: "remove",
	},
	python: {
		ping: "ping",
		getAllPorts: "",
		getAllTraffic: "",
		add: "add",
		remove: "remove",
	},
};

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
								throw new Error("Shadowsocks unreachable");
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

async function initialize() {
	try {
		const allPorts = await Ports.getAllPorts();
		const response = await sendCommand("ping");

		if (response === "shadowsocks unreachable") {
			// Handle unreachable error
		} else if (response === "shadowsocks no response") {
			// Handle no response error
		} else {
			await updatePorts();
		}
	} catch (error) {
		throw error;
	}
}

function isValidJSON(jsonString) {
	try {
		JSON.parse(jsonString);
		return true;
	} catch (error) {
		return false;
	}
}

const updatePorts = async function () {
	try {
		const ports = await Ports.getAllPorts();
		const results = await getSockPorts();
		const activePorts = results.map((result) => result.port);

		// Stop unused ports
		for (const port of ports) {
			if (!activePorts.includes(port.port)) {
				await addSockPort(port);
			}
		}

		// Start missing ports
		for (const result of results) {
			if (!ports.find((port) => port.port === result.port)) {
				await removePort(result.port);
			}
		}
	} catch (error) {
		if (
			error.message !== "shadowsocks unreachable" &&
			error.message !== "shadowsocks no response"
		) {
			throw error;
		}
	}
};

const login = async function (e) {
	if (!e) {
		throw new Error("illegal argument");
	}

	if (e !== Y) {
		throw new Error("invalid password");
	}
};

const addPort = async function (e) {
	if (!e) {
		throw new Error("illegal argument");
	}

	const { port, password, method } = e;

	if (!port || !Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error("illegal argument");
	}

	if (!password || typeof password !== "string" || password.length < 1) {
		throw new Error("illegal argument");
	}

	if (
		!method ||
		typeof method !== "string" ||
		!validator.isIn(method, encryptionMethods)
	) {
		throw new Error("illegal argument");
	}

	await addSockPort({
		port,
		password,
		method,
	});

	await Ports.addPort({
		port,
		password,
		method,
	});
};

const addSockPort = async function (e) {
	if (!e) {
		throw new Error("illegal argument");
	}

	const { port, password, method } = e;

	if (!port || !Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error("illegal argument");
	}

	if (!password || typeof password !== "string" || password.length < 1) {
		throw new Error("illegal argument");
	}

	if (
		!method ||
		typeof method !== "string" ||
		!validator.isIn(method, encryptionMethods)
	) {
		throw new Error("illegal argument");
	}

	const portExists = await isPortUsed(port);
	if (portExists) {
		throw new Error("port already exists from shadowsocks");
	}

	const portAvailable = await L(port);
	if (!portAvailable) {
		throw new Error("port not available from operating system");
	}

	const shadowsocksType = await ProtocolTypes.getType();
	if (shadowsocksType === "libev") {
		await sendAddToLibev({
			port,
			password,
			method,
		});
	} else if (shadowsocksType === "python") {
		await sendAddToPython({
			port,
			password,
		});
	} else {
		throw new Error("should not come here");
	}

	const portAdded = await isPortUsed(port);
	if (!portAdded) {
		throw new Error("shadowsocks failed adding port");
	}
};

const getSockPorts = async function () {
	const shadowsocksType = await ProtocolTypes.getType();
	if (shadowsocksType === "libev") {
		const result = await getAllPortsFromLibev();
		return result;
	} else if (shadowsocksType === "python") {
		const result = await getAllPortsFromPython();
		return result;
	} else {
		throw new Error("should not come here");
	}
};

const getAllTraffic = async function () {
	const shadowsocksType = await ProtocolTypes.getType();

	if (shadowsocksType === "libev") {
		const result = await getAllTrafficFromLibev();
		return result;
	} else if (shadowsocksType === "python") {
		const result = await getAllTrafficFromPython();
		return result;
	} else {
		throw new Error("should not come here");
	}
};

const ping = async function () {
	const shadowsocksType = await ProtocolTypes.getType();

	if (shadowsocksType === "libev") {
		await pingLibev();
	} else if (shadowsocksType === "python") {
		await pingPython();
	} else {
		throw new Error("should not come here");
	}

	return {
		pong: "pong",
	};
};

const removePort = async function (r) {
	if (isNaN(r) || !Number.isInteger(r) || r < 1 || r > 65535) {
		throw new Error("illegal argument");
	}

	const shadowsocksType = await ProtocolTypes.getType();

	if (shadowsocksType === "libev") {
		await sendRemoveFromLibev(r);
	} else if (shadowsocksType === "python") {
		await sendRemoveFromPython(r);
	} else {
		throw new Error("should not come here");
	}

	const portExists = await isPortUsed(r);
	if (portExists) {
		throw new Error("shadowsocks failed removing port");
	}

	const portAvailable = await L(r);
	if (!portAvailable) {
		throw new Error("operating system failed removing port");
	}

	await Ports.removePort(r);
};

const pingLibev = async function () {
	const libevPingCommand = $.getCommandKeyword("libev", "ping");
	const result = await sendCommand(libevPingCommand);

	if (result.substr(0, 5) === "stat:") {
		const data = JSON.parse(result.substr(5));
		return data;
	} else {
		throw new Error("pingLibev, received unknown message");
	}
};

const pingPython = async function () {
	const pythonPingCommand = $.getCommandKeyword("python", "ping");
	const result = await sendCommand(pythonPingCommand);

	if (result.substr(0, 4) === "pong") {
		return result;
	} else {
		throw new Error("pingPython, received unknown message");
	}
};

const getAllPortsFromLibev = async function () {
	const libevGetAllPortsCommand = $.getCommandKeyword("libev", "getAllPorts");
	const result = await sendCommand(libevGetAllPortsCommand);

	let ports = [];
	if (result.substr(0, 3) === "[\n\t") {
		const data = JSON.parse(result);
		ports = data.map((e) => ({
			port: Number(e.server_port),
			password: e.password,
			method: e.method,
		}));
	} else if (result.substr(0, 2) !== "\n]") {
		throw new Error("getAllPortsFromLibev, received unknown message");
	}

	return ports;
};

const getAllTrafficFromLibev = async function () {
	const libevGetAllTrafficCommand = $.getCommandKeyword(
		"libev",
		"getAllTraffic"
	);
	const result = await sendCommand(libevGetAllTrafficCommand);

	let traffic = {};
	if (result.substr(0, 5) === "stat:") {
		const data = JSON.parse(result.substr(5));
		const keys = Object.keys(data);
		traffic = keys.map((e) => ({
			port: Number(e),
			traffic: Number(data[e]),
		}));
	} else {
		throw new Error("getAllTrafficFromLibev, received unknown message");
	}

	return traffic;
};

const sendAddToLibev = async function (r) {
	if (
		!r ||
		typeof r !== "object" ||
		!r.hasOwnProperty("port") ||
		!r.hasOwnProperty("password") ||
		isNaN(r.port) ||
		!Number.isInteger(r.port) ||
		r.port < 1 ||
		r.port > 65535 ||
		typeof r.password !== "string" ||
		r.password.length < 1
	) {
		throw new Error("illegal argument");
	}

	const libevAddCommand = $.getCommandKeyword("libev", "add");
	const payload =
		libevAddCommand +
		": " +
		JSON.stringify({
			server_port: r.port,
			password: r.password,
			method: r.method,
		});

	const result = await sendCommand(payload);
	if (result.substr(0, 2) === "ok") {
		return;
	} else if (result.substr(0, 3) === "err") {
		throw new Error("illegal command");
	} else {
		throw new Error("sendAddToLibev, received unknown message: " + result);
	}
};

const sendAddToPython = async function (r) {
	if (
		!r ||
		typeof r !== "object" ||
		!r.hasOwnProperty("port") ||
		!r.hasOwnProperty("password") ||
		isNaN(r.port) ||
		!Number.isInteger(r.port) ||
		r.port < 1 ||
		r.port > 65535 ||
		typeof r.password !== "string" ||
		r.password.length < 1
	) {
		throw new Error("illegal argument");
	}

	const pythonAddCommand = $.getCommandKeyword("python", "add");
	const payload =
		pythonAddCommand +
		": " +
		JSON.stringify({
			server_port: r.port,
			password: r.password,
		});

	const result = await sendCommand(payload);
	if (result.substr(0, 2) === "ok") {
		return;
	} else if (result.substr(0, 3) === "err") {
		throw new Error("illegal command");
	} else {
		throw new Error("sendAddToPython, received unknown message: " + result);
	}
};

const isPortUsed = async function (r) {
	if (isNaN(r) || !Number.isInteger(r) || r < 1 || r > 65535) {
		throw new Error("illegal argument");
	}

	const t = await getSockPorts();
	const n = t.map((e) => e.port);
	return n.includes(r);
};

const L = async function (r) {
	if (isNaN(r) || !Number.isInteger(r) || r < 1 || r > 65535) {
		throw new Error("illegal argument");
	}

	const t = await Q.test(r);
	return t;
};

const sendRemoveFromLibev = async function (r) {
	if (isNaN(r) || !Number.isInteger(r) || r < 1 || r > 65535) {
		throw new Error("illegal argument");
	}

	const libevRemoveCommand = $.getCommandKeyword("libev", "remove");
	const payload =
		libevRemoveCommand +
		": " +
		JSON.stringify({
			server_port: r,
		});

	const result = await sendCommand(payload);
	if (result.substr(0, 2) === "ok") {
		return;
	} else if (result.substr(0, 3) === "err") {
		throw new Error("illegal command");
	} else {
		throw new Error(
			"sendRemoveFromLibev, received unknown message: " + result
		);
	}
};

const sendRemoveFromPython = async function (r) {
	if (isNaN(r) || !Number.isInteger(r) || r < 1 || r > 65535) {
		throw new Error("illegal argument");
	}

	const pythonRemoveCommand = $.getCommandKeyword("python", "remove");
	const payload =
		pythonRemoveCommand +
		": " +
		JSON.stringify({
			server_port: r,
		});

	const result = await sendCommand(payload);
	if (result.substr(0, 2) === "ok") {
		return;
	} else if (result.substr(0, 3) === "err") {
		throw new Error("illegal command");
	} else {
		throw new Error(
			"sendRemoveFromPython, received unknown message: " + result
		);
	}
};


// Bind event listeners
socket.bind(controllerPath);
socket.on("error", (error) => {
	throw new Error("Client on error, shadowsocks error: " + error);
});

// Start initialization process
initialize();
setInterval(initialize, 3000);

module.exports = {
    login: login, 
    addPort: addPort, 
    getAllPorts: getSockPorts, 
    getAllTraffic: getAllTraffic, 
    ping: ping, 
    removePort: removePort
};
