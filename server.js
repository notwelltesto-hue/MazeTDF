const WebSocket = require("ws");
const http = require("http");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let players = {};

const TICK_RATE = 60; // updates per second
const SPEED = 3; // player speed in px/tick

wss.on("connection", (ws) => {
    let playerId = null;

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === "join") {
                playerId = Date.now().toString();
                players[playerId] = {
                    id: playerId,
                    name: data.name || "Player",
                    x: Math.random() * 800 + 100,
                    y: Math.random() * 600 + 100,
                    keys: { up: false, down: false, left: false, right: false }
                };
            }

            if (data.type === "input" && playerId && players[playerId]) {
                players[playerId].keys = data.keys;
            }
        } catch (err) {
            console.error("Invalid message", err);
        }
    });

    ws.on("close", () => {
        if (playerId) {
            delete players[playerId];
        }
    });
});

// Game loop
setInterval(() => {
    // Update positions based on keys
    for (let id in players) {
        const p = players[id];
        if (p.keys.up) p.y -= SPEED;
        if (p.keys.down) p.y += SPEED;
        if (p.keys.left) p.x -= SPEED;
        if (p.keys.right) p.x += SPEED;
    }

    // Broadcast state
    const state = JSON.stringify({ type: "state", players });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(state);
        }
    });
}, 1000 / TICK_RATE);

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server listening on ws://localhost:${PORT}`);
});
