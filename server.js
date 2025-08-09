const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

const TICK_RATE = 60;
const WORLD_SIZE = 5000;
const RESOURCE_COUNT = 200;

let players = {};
let resources = [];

// Generate resources
function spawnResources() {
    resources = [];
    for (let i = 0; i < RESOURCE_COUNT; i++) {
        resources.push({
            id: i,
            type: Math.random() < 0.5 ? "tree" : "rock",
            x: Math.random() * WORLD_SIZE - WORLD_SIZE / 2,
            y: Math.random() * WORLD_SIZE - WORLD_SIZE / 2,
            hp: 100
        });
    }
}
spawnResources();

function broadcast(data) {
    const msg = JSON.stringify(data);
    for (let client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    }
}

wss.on("connection", (ws) => {
    const id = Math.random().toString(36).substr(2, 9);
    players[id] = {
        id,
        x: 0,
        y: 0,
        name: "unknown",
        hp: 100,
        age: 1,
        xp: 0,
        inventory: { apple: 0 }
    };

    ws.send(JSON.stringify({ type: "init", id, players, resources, worldSize: WORLD_SIZE }));

    ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "update") {
            if (players[id]) {
                players[id].x = data.x;
                players[id].y = data.y;
                players[id].name = data.name;
            }
        }
        else if (data.type === "gather") {
            let res = resources.find(r => r.id === data.id);
            if (res && res.hp > 0) {
                res.hp -= 10;
                if (res.hp <= 0) {
                    if (res.type === "tree") players[id].xp += 5;
                    if (res.type === "rock") players[id].xp += 8;

                    if (players[id].xp >= players[id].age * 100) {
                        players[id].age++;
                        players[id].xp = 0;
                    }
                    resources.splice(resources.indexOf(res), 1);
                    spawnResources();
                }
            }
        }
    });

    ws.on("close", () => {
        delete players[id];
    });
});

setInterval(() => {
    broadcast({ type: "state", players, resources });
}, 1000 / TICK_RATE);

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server listening on ws://localhost:${PORT}`));
