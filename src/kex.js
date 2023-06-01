const io = require("socket.io-client");
const { exec } = require("child_process");
const sockets = require("./sockets");
const { encryptionMethods } = require("./constants");
const serverIP = process.env.IP;
const ioURL = process.env.IO_URL;
console.log(ioURL);
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
socket.on("ss-manager", async (data) => {
    try {
		if (typeof data.port === "string") {
			data.port = parseInt(data.port);
		}

		// req.checkBody("port", "Invalid port number").isInt({
		// 	min: 1,
		// 	max: 65535,
		// });
		// req.checkBody("password", "Invalid password").notEmpty();
		// req.checkBody("method", "Invalid encryption method")
		// 	.optional()
		// 	.isIn(encryptionMethods);

		data.method = data.method || "aes-256-cfb";
        switch (data.action) {
            case "add":
                await sockets.addPort(data);
                socket.emit("ss-response", {
                    action: data.action,
                    state: true,
                    data: data,
                });
                break;
            case "remove":
                await sockets.removePort(Number(data.port));
                socket.emit("ss-response", {
                    action: data.action,
                    state: true,
                    data: {
                        port: data.port
                    }
                });
                break;
            case "getAll":
                const ports = await sockets.getAllPorts();
                socket.emit("ss-response", {
                    action: data.action,
                    state: true,
                    data: ports
                });
                break;
            case "getTraffic":
                const traffic = await sockets.getAllTraffic();

                socket.emit("ss-response", {
                    action: data.action,
                    state: true,
                    data: traffic
                });
                break;
            case "ping":
                const result = await sockets.ping();
                socket.emit("ss-response", {
                    action: data.action,
                    state: true,
                    data: result
                });
                break;
        
            default:
                break;
        }
	} catch (error) {
        socket.emit("ss-response", {
            action: data.action,
            state: false,
            data: error.message
        });
		// if (error.message === "port already exists from shadowsocks") {
		// 	return res.status(409).end();
		// } else if (
		// 	error.message === "port not available from operating system"
		// ) {
		// 	return res.status(410).end();
		// } else if (error.message === "shadowsocks failed adding port") {
		// 	return res.status(422).end();
		// } else if (error.message === "operating system failed adding port") {
		// 	return res.status(427).end();
		// } else if (error.message === "shadowsocks unreachable") {
		// 	return res.status(424).end();
		// } else if (error.message === "shadowsocks no response") {
		// 	return res.status(425).end();
		// }

		// return res.status(500).send({ error: error.message });
	}
});
