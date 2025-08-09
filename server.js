const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

let players = {};

wss.on("connection", (ws) => {
    const id = uuidv4();

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);

        if (data.type === "join") {
            players[id] = { id, name: data.name, x: 300, y: 300 };
            ws.send(JSON.stringify({ type: "init", id, players }));
            broadcast({ type: "update", players });
        }

        if (data.type === "move") {
            if (players[id]) {
                players[id].x = data.x;
                players[id].y = data.y;
                broadcast({ type: "update", players });
            }
        }
    });

    ws.on("close", () => {
        delete players[id];
        broadcast({ type: "update", players });
    });
});

function broadcast(data) {
    const json = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(json);
        }
    });
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
