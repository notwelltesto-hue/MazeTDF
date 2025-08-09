const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let players = {};
let keys = { up: false, down: false, left: false, right: false };

const socket = new WebSocket(`wss://${window.location.host}`);

// When connected, ask for name
socket.addEventListener("open", () => {
    const name = prompt("Enter your name:") || "Player";
    socket.send(JSON.stringify({ type: "join", name }));
});

// When we receive state updates from server
socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "state") {
        players = data.players;
    }
});

// Send key state to server
function sendInput() {
    socket.send(JSON.stringify({ type: "input", keys }));
}

// Keyboard events
window.addEventListener("keydown", (e) => {
    if (e.key === "w") keys.up = true;
    if (e.key === "s") keys.down = true;
    if (e.key === "a") keys.left = true;
    if (e.key === "d") keys.right = true;
    sendInput();
});
window.addEventListener("keyup", (e) => {
    if (e.key === "w") keys.up = false;
    if (e.key === "s") keys.down = false;
    if (e.key === "a") keys.left = false;
    if (e.key === "d") keys.right = false;
    sendInput();
});

// Game render loop
function gameLoop() {
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let id in players) {
        const p = players[id];
        
        // Draw player as a red circle
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Draw name above
        ctx.fillStyle = "black";
        ctx.font = "16px Arial";
        ctx.fillText(p.name, p.x - ctx.measureText(p.name).width / 2, p.y - 30);
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
