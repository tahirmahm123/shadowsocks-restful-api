const fs = require("fs");
const path = require("path");
const validator = require("validator");
const { encryptionMethods } = require("./constants");
const debug = require("debug")("dao");

const portsFile = path.resolve(__dirname, "./ports.json");

const Ports = {
	ports: [],

	getPorts() {
		return this.ports;
	},

	setPorts(ports) {
		if (!ports || !Array.isArray(ports)) {
			throw new Error("Illegal argument");
		}

		ports.forEach(({ port, password, method }) => {
			if (!port || !Number.isInteger(port) || port < 1 || port > 65535) {
				throw new Error("Illegal argument, port illegal");
			}

			if (
				!password ||
				typeof password !== "string" ||
				password.length < 1
			) {
				throw new Error("Illegal argument, password illegal");
			}

			if (
				!method ||
				typeof method !== "string" ||
				!validator.isIn(method, [
					"aes-128-gcm",
					"aes-192-gcm",
					"aes-256-gcm",
					"aes-128-cfb",
					"aes-192-cfb",
					"aes-256-cfb",
					"aes-128-ctr",
					"aes-192-ctr",
					"aes-256-ctr",
					"camellia-128-cfb",
					"camellia-192-cfb",
					"camellia-256-cfb",
					"bf-cfb",
					"chacha20-ietf-poly1305",
					"xchacha20-ietf-poly1305",
					"salsa20",
					"chacha20",
					"chacha20-ietf",
				])
			) {
				throw new Error("Illegal argument");
			}
		});

		const portNumbers = ports.map((p) => p.port);
		if (new Set(portNumbers).size !== portNumbers.length) {
			throw new Error("Illegal argument, duplicate ports");
		}

		this.ports = JSON.parse(JSON.stringify(ports));
	},

	addPort(portInfo) {
		if (!portInfo) {
			throw new Error("Illegal argument");
		}

		const { port, password, method } = portInfo;
		if (!port || !Number.isInteger(port) || port < 1 || port > 65535) {
			throw new Error("Illegal argument");
		}

		if (!password || typeof password !== "string" || password.length < 1) {
			throw new Error("Illegal argument");
		}

		if (
			!method ||
			typeof method !== "string" ||
			!validator.isIn(method, encryptionMethods)
		) {
			throw new Error("Illegal argument");
		}

		if (this.ports.some((p) => p.port === port)) {
			throw new Error("Port already exists in database");
		}

		this.ports.push({ port, password, method });
		this.savePortsToFile();
	},

	removePort(port) {
		if (
			isNaN(port) ||
			!Number.isInteger(port) ||
			port < 1 ||
			port > 65535
		) {
			throw new Error("Illegal argument");
		}

		this.ports = this.ports.filter((p) => p.port !== port);
		this.savePortsToFile();
	},

	initPortsFromFile() {
		try {
			const data = fs.readFileSync(portsFile, "utf8");
			if (data) {
				this.setPorts(JSON.parse(data));
			}
		} catch (error) {
			fs.openSync(portsFile, "w");
		}
	},

	savePortsToFile() {
		fs.writeFile(portsFile, JSON.stringify(this.ports), (error) => {
			if (error) {
				throw error;
			}
		});
	},
};

Ports.initPortsFromFile();

module.exports.addPort = (portInfo) => {
	Ports.addPort(portInfo);
};

module.exports.removePort = (port) => {
	Ports.removePort(port);
};

module.exports.getAllPorts = () => {
	return Ports.getPorts();
};
