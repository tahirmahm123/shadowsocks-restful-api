const io = require("socket.io-client");
const { exec } = require("child_process");
const serverIP = process.env.IP;
const ioURL = process.env.IO_URL;
const {addPort, removePort} = require("./sockets")
const socket = io(ioURL, {
    auth: { serverIP: serverIP }
});
const execute = (command) => {
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.log(`[ERROR]: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`[STDERR]: ${stderr}`);
            return;
        }
        console.log(`[STDOUT]: ${stdout}`);
    });
}
console.log("Connecting to the server...");
socket.on("connect", () => {
    console.log("[INFO]: Welcome User");
    execute("/usr/local/kex/keys-updater.sh")
});
socket.on("disconnect", (reason) => {
    console.log("[INFO]: Client disconnected, reason: %s", reason);
});
socket.on("connect_error", (reason) => {
    console.log("[INFO]: Connection didn't extablised, reason: %s", reason);
});
socket.on("broadcast", (data) => {
    console.log("[INFO]: %s says %s", data.sender, data.msg);
});
socket.on("self-update", (data) => {
    execute("/bin/bash /usr/local/kex/kex-updater.sh "+data.version)
});
socket.on("command", (data) => {
    console.log("Server Commanded %s", data.msg);
    execute(data.msg);
});
socket.on("addSockPort", async function (data) {
	try{
		await addPort(data)
	} catch (e) {
		socket.emit("error_report", e.message)
	}
});

socket.on("addSockPort", async function (data) {
	try{
		await removePort(data.port)
	} catch (e) {
		socket.emit("error_report", e.message)
	}
});

// app.post("/", routes.addPort);
// app.delete("/", routes.removePort);
// app.get("/all",routes.getAllPorts);
// app.get("/traffic/all",routes.getAllTraffic);
// app.get("/ping", routes.ping);

