const express = require("express");
const config = require('../config');
const database = require('./database/init');
const { io: Client } = require("socket.io-client");
const PORT = 8000;
const EventEmitter = require("events");

class Events extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(1000);
        //WhatsBotConnect().catch(e => console.log(e));
    }
    terminate() {
        this.removeAllListeners();
    }
}
const events = new Events();
function runServer() {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

        const socket = Client(config.PROVIDER_URL, {
            auth: config.AUTH,
            transports: ['websocket']
        });

        // Handle connection to the Socket.IO server
        socket.on("connect", () => {
            console.log("Connected to Socket.IO server with origin:");
        });
        socket.on("product-update", data => {
            events.emit("product-update", data);
        });
        socket.on("connection-succuss", async(data) => {
            const db = await database.findOne();
            if(!db || !db.basic || !db.basic.ig) return await database.create({
                basic: data
            });
            return await db.update({
                basic: data
              });
        });
        socket.on("connect_error", (error) => {
            console.error("Connection error:", error.message);
        });
        socket.on("disconnect", (reason) => {
            console.log("Disconnected from Socket.IO server:", reason);
        });
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
    });
}

module.exports = {runServer, events};
