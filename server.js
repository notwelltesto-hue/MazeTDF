const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files (HTML, JS, CSS) from "public"
app.use(express.static(path.join(__dirname, "public")));

// Handle WebSocket connections
wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (message) => {
        console.log(`Received: ${message}`);
        // Echo back to client
        ws.send(`Server got: ${message}`);
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

// Port for Render or local testing
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
