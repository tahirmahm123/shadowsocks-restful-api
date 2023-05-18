"use strict";

const validator = require("validator");
const socketController = require("./sockets");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { encryptionMethods } = require("./constants");
const debug = require("debug")("controller");

const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
const secretKey = crypto
	.createHash("sha256")
	.update(LOGIN_PASSWORD + "W93Ciowi2398(@qi30vmbj02i@WWSoekwoiK")
	.digest("hex");

async function login(req, res) {
	try {
		req.checkBody("password", "Invalid password").notEmpty();
		const errors = req.validationErrors();
		if (errors) {
			return res.status(400).send({ error: errors });
		}

		const token = jwt.sign({}, secretKey, { expiresIn: 86400 });
		return res.status(201).send({ token });
	} catch (error) {
		if (error.message === "invalid password") {
			return res.status(401).end();
		}
		return res.status(500).send({ error: JSON.stringify(error) });
	}
}

async function addPort(req, res) {
	try {
		if (typeof req.body.port === "string") {
			req.body.port = parseInt(req.body.port);
		}

		req.checkBody("port", "Invalid port number").isInt({
			min: 1,
			max: 65535,
		});
		req.checkBody("password", "Invalid password").notEmpty();
		req.checkBody("method", "Invalid encryption method")
			.optional()
			.isIn(encryptionMethods);

		const errors = req.validationErrors();
		if (errors) {
			return res.status(400).send({ error: errors });
		}

		req.body.method = req.body.method || "aes-256-cfb";

		await socketController.addPort(req.body);
		return res.status(201).end();
	} catch (error) {
		if (error.message === "port already exists from shadowsocks") {
			return res.status(409).end();
		} else if (
			error.message === "port not available from operating system"
		) {
			return res.status(410).end();
		} else if (error.message === "shadowsocks failed adding port") {
			return res.status(422).end();
		} else if (error.message === "operating system failed adding port") {
			return res.status(427).end();
		} else if (error.message === "shadowsocks unreachable") {
			return res.status(424).end();
		} else if (error.message === "shadowsocks no response") {
			return res.status(425).end();
		}

		return res.status(500).send({ error: error.message });
	}
}

async function getAllPorts(req, res) {
	try {
		const ports = await socketController.getAllPorts();
		return res.status(200).send(ports);
	} catch (error) {
		if (error.message === "shadowsocks unreachable") {
			return res.status(424).end();
		} else if (error.message === "shadowsocks no response") {
			return res.status(425).end();
		}

		return res.status(500).send({ error: JSON.stringify(error) });
	}
}

async function getAllTraffic(req, res) {
	try {
		const traffic = await socketController.getAllTraffic();
		return res.status(200).send(traffic);
	} catch (error) {
		if (error.message === "shadowsocks unreachable") {
			return res.status(424).end();
		} else if (error.message === "shadowsocks no response") {
			return res.status(425).end();
		}

		return res.status(500).send({ error: JSON.stringify(error) });
	}
}


async function ping(req, res) {
	res.send("Hello")
	try {
		const result = await socketController.ping();
		return res.status(200).send(result);
	} catch (error) {
		if (error.message === "shadowsocks unreachable") {
			return res.status(424).send(error.message);
		} else if (error.message === "shadowsocks no response") {
			return res.status(425).send(error.message);
		}

		return res.status(500).send({ error: JSON.stringify(error) });
	}
}

async function removePort(req, res) {
	try {
		if (typeof req.query.port === "string") {
			req.query.port = parseInt(req.query.port);
		}

		req.checkQuery("port", "Invalid port number").isInt({
			min: 1,
			max: 65535,
		});

		const validationErrors = req.validationErrors();
		if (validationErrors) {
			return res.status(400).send({ error: validationErrors });
		}

		await socketController.removePort(Number(req.query.port));
		return res.status(204).end();
	} catch (error) {
		if (error.message === "shadowsocks failed removing port") {
			return res.status(422).end();
		} else if (error.message === "operating system failed removing port") {
			return res.status(427).end();
		} else if (error.message === "shadowsocks unreachable") {
			return res.status(424).end();
		} else if (error.message === "shadowsocks no response") {
			return res.status(425).end();
		}

		return res.status(500).send({ error: JSON.stringify(error) });
	}
}

module.exports = {
	login,
	addPort,
	getAllPorts,
	getAllTraffic,
	ping,
	removePort,
};
