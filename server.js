const WebSocket = require("ws");
const http = require("http");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let players = {};
let nextPlayerId = 1;

function getAgeFromXP(xp) {
    if (xp < 100) return 1;
    if (xp < 300) return 2;
    if (xp < 600) return 3;
    return 4;
}

wss.on("connection", (ws) => {
    const id = nextPlayerId++;
    players[id] = {
        id,
        name: "unknown",
        x: 0,
        y: 0,
        hp: 100,
        xp: 0,
        age: 1,
        inventory: {
            apples: 0
        }
    };

    ws.on("message", (msg) => {
        try {
            const data = JSON.parse(msg);

            if (data.type === "setName") {
                players[id].name = data.name;
            }

            if (data.type === "move") {
                players[id].x = data.x;
                players[id].y = data.y;
            }

            if (data.type === "harvest") {
                // Gain XP and chance for apples
                players[id].xp += 5;
                if (Math.random() < 0.1) {
                    players[id].inventory.apples++;
                }
                players[id].age = getAgeFromXP(players[id].xp);
            }

            if (data.type === "eatApple") {
                if (players[id].inventory.apples > 0) {
                    players[id].inventory.apples--;
                    players[id].hp = Math.min(players[id].hp + 20, 100);
                }
            }

        } catch (err) {
            console.error("Invalid message", err);
        }
    });

    ws.on("close", () => {
        delete players[id];
    });
});

// Broadcast state at 60 FPS
setInterval(() => {
    const payload = {
        type: "state",
        players: Object.values(players)
    };
    const msg = JSON.stringify(payload);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on ws://localhost:${PORT}`);
});
