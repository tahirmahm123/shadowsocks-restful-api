require("dotenv").config();

const express = require("express");
const fs = require("fs");
const https = require("https");
const bodyParser = require("body-parser");
const expressValidator = require("express-validator");
const crypto = require("crypto");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

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

const jwtOptions = {
	jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
	secretOrKey: secretKey,
};

passport.use(
	new JWTStrategy(jwtOptions, (error, user) => {
		return user(null, { id: 1 });
	})
);

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
app.post("/", passport.authenticate("jwt", { session: false }), routes.addPort);
app.delete(
	"/",
	passport.authenticate("jwt", { session: false }),
	routes.removePort
);
app.get(
	"/all",
	passport.authenticate("jwt", { session: false }),
	routes.getAllPorts
);
app.get(
	"/traffic/all",
	passport.authenticate("jwt", { session: false }),
	routes.getAllTraffic
);
app.get("/ping", passport.authenticate("jwt", { session: false }), routes.ping);

httpsServer
	.listen(listenPort, () => {
		console.log("Listening on port", listenPort);
	})
	.on("error", (error) => {
		console.error("Express server error: " + error);
		process.exit(3);
	});
