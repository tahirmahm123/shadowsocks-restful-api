require("dotenv").config();

const express = require("express");
const fs = require("fs");
const https = require("https");
const bodyParser = require("body-parser");
const expressValidator = require("express-validator");
const crypto = require("crypto");

const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
const secretKey = crypto
	.createHash("sha256")
	.update(LOGIN_PASSWORD + "W93Ciowi2398(@qi30vmbj02i@WWSoekwoiK")
	.digest("hex");

let listenPort =
	process.env.LISTEN_PORT &&
	Number(process.env.LISTEN_PORT) >= 1 &&
	Number(process.env.LISTEN_PORT) <= 65535
		? process.env.LISTEN_PORT
		: 4001;


let serverKey, serverCert;
try {
	serverKey = fs.readFileSync("./server.key", "utf8");
	serverCert = fs.readFileSync("./server.cert", "utf8");
} catch (error) {
	console.error("Failed to read ./server.key or ./server.cert");
	process.exit(1);
}

const credentials = {
	key: serverKey,
	cert: serverCert,
};

const app = express();
const httpsServer = https.createServer(credentials, app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());

const routes = require("./routes");
app.post("/login", routes.login);
app.post("/", routes.addPort);
app.delete("/", routes.removePort);
app.get("/all",routes.getAllPorts);
app.get("/traffic/all",routes.getAllTraffic);
app.get("/ping", routes.ping);

httpsServer
	.listen(listenPort, () => {
		console.log("Listening on port", listenPort);
	})
	.on("error", (error) => {
		console.error("Express server error: " + error);
		process.exit(3);
	});
