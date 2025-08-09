const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let socket;
let playerId = null;
let players = {};
let name = "";
let keys = {};

const speed = 3;

// UI
const homeScreen = document.getElementById("homeScreen");
const nameInput = document.getElementById("nameInput");
const playBtn = document.getElementById("playBtn");
const hotbarApple = document.getElementById("hotbarApple");

// Key input tracking
window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
});
window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

playBtn.addEventListener("click", () => {
    name = nameInput.value.trim() || "Player";
    homeScreen.style.display = "none";

    socket = new WebSocket(`wss://${window.location.host}`);

    socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "setName", name }));
    });

    socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "state") {
            players = {};
            data.players.forEach((p) => {
                players[p.id] = p;
                if (p.name === name) {
                    playerId = p.id;
                    hotbarApple.textContent = `🍎 ${p.inventory.apples}`;
                }
            });
        }
    });
});

function sendMove(x, y) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "move", x, y }));
    }
}

function harvest() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "harvest" }));
    }
}

function eatApple() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "eatApple" }));
    }
}

// Game loop
function gameLoop() {
    ctx.fillStyle = "#87ceeb"; // background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Movement for local player
    if (playerId && players[playerId]) {
        let p = players[playerId];
        if (keys["w"]) p.y -= speed;
        if (keys["s"]) p.y += speed;
        if (keys["a"]) p.x -= speed;
        if (keys["d"]) p.x += speed;

        sendMove(p.x, p.y);

        if (keys[" "]) {
            harvest();
        }
        if (keys["e"]) {
            eatApple();
            keys["e"] = false; // prevent holding down
        }
    }

    // Draw all players
    Object.values(players).forEach((p) => {
        // Body
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = "peachpuff";
        ctx.fill();
        ctx.closePath();

        // Hammer
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(p.x + 15, p.y - 5, 15, 5);

        // Name & Age
        ctx.fillStyle = "black";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${p.name} (Age ${p.age})`, p.x, p.y - 30);

        // HP bar
        ctx.fillStyle = "red";
        ctx.fillRect(p.x - 20, p.y + 25, 40, 5);
        ctx.fillStyle = "lime";
        ctx.fillRect(p.x - 20, p.y + 25, (p.hp / 100) * 40, 5);
    });

    requestAnimationFrame(gameLoop);
}

gameLoop();
