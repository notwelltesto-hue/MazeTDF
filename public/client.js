const menu = document.getElementById("menu");
const playBtn = document.getElementById("playBtn");
const nameInput = document.getElementById("nameInput");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let socket = null;
let playerId = null;
let players = {}; // all players in the game

let keys = {};

// ===== Start Game =====
playBtn.addEventListener("click", () => {
    const playerName = nameInput.value.trim();
    if (!playerName) {
        alert("Please enter a name");
        return;
    }

    menu.style.display = "none";
    canvas.style.display = "block";

    socket = new WebSocket(`wss://${window.location.host}`);

    socket.addEventListener("open", () => {
        console.log("Connected to server");
        socket.send(JSON.stringify({ type: "join", name: playerName }));
    });

    socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "init") {
            playerId = data.id;
            players = data.players;
        }
        if (data.type === "update") {
            players = data.players;
        }
    });

    startGameLoop();
});

// ===== Movement Input =====
document.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

function handleMovement() {
    if (!playerId || !players[playerId]) return;

    let speed = 3;
    if (keys["w"]) players[playerId].y -= speed;
    if (keys["s"]) players[playerId].y += speed;
    if (keys["a"]) players[playerId].x -= speed;
    if (keys["d"]) players[playerId].x += speed;

    socket.send(JSON.stringify({
        type: "move",
        x: players[playerId].x,
        y: players[playerId].y
    }));
}

// ===== Game Loop =====
function startGameLoop() {
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        handleMovement();

        for (let id in players) {
            const p = players[id];
            ctx.beginPath();
            ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
            ctx.fillStyle = id === playerId ? "#ffcc00" : "#888";
            ctx.fill();

            ctx.fillStyle = "#000";
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillText(p.name, p.x, p.y - 30);
        }

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
