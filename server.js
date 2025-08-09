const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Handle WebSocket connections
wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === "join") {
                console.log(`Player joined: ${data.name}`);
                ws.send(JSON.stringify({ type: "welcome", msg: `Hello ${data.name}!` }));
            }
        } catch (err) {
            console.error("Invalid message from client:", message);
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

// Port for Render or local
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
