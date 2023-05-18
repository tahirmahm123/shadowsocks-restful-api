"use strict";

const validator = require("validator");
const socketController = require("./sockets");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { encryptionMethods } = require("./constants");
const debug = require("debug")("controller");

async function addPort(data) {
	try {
		await socketController.addPort(data);
		return res.status(201).end();
	} catch (error) {
		return error.message
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
