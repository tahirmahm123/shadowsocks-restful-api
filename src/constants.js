const { sendCommand } = require("./sock")
const ProtocolTypes = {
    type: null,
    getType: async () => {
        if (this.type) {
            if (this.type === "libev" || this.type === "python") {
                return this.type;
            } else {
                throw new Error("Unknown shadowsocks type");
            }
        }
        const response = await sendCommand("ping")
        if (response.substr(0, 5) === "stat:") {
            this.type = "libev";
            return this.type;
        } else if (response.substr(0, 5) === "pong") {
            this.type = "libev";
            return this.type;
        } else {
            throw new Error("ShadowsocksType.getType, received unknown message" );
        }
    }
}

const $ = {
    commandKeywords: {
        libev: {
            ping: "ping",
            getAllPorts: "list",
            getAllTraffic: "ping",
            add: "add",
            remove: "remove"
        },
        python: {
            ping: "ping",
            getAllPorts: "",
            getAllTraffic: "",
            add: "add",
            remove: "remove"
        }
    },
    getCommandKeyword: function(e, r) {
        if ("libev" !== e && "python" !== e) throw new Error("illegal argument");
        if ("ping" !== r && "getAllPorts" !== r && "getAllTraffic" !== r && "add" !== r && "remove" !== r) throw new Error("illegal argument");
        return this.commandKeywords[e][r];
    }
}
module.exports = {
    encryptionMethods: [
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
    ],
    ProtocolTypes,
    $
};