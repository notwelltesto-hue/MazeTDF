// ===== DOM Elements =====
const menu = document.getElementById("menu");
const playBtn = document.getElementById("playBtn");
const nameInput = document.getElementById("nameInput");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ===== Player Data =====
let socket = null;
let player = {
    name: "",
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 30,
    color: "#ffcc00"
};

// ===== Start Game =====
playBtn.addEventListener("click", () => {
    const playerName = nameInput.value.trim();
    if (!playerName) {
        alert("Please enter a name");
        return;
    }

    // Save name
    player.name = playerName;

    // Hide menu, show game
    menu.style.display = "none";
    canvas.style.display = "block";

    // Connect to WebSocket (dynamic host for Render)
    socket = new WebSocket(`wss://${window.location.host}`);

    socket.addEventListener("open", () => {
        console.log("Connected to server");
        socket.send(JSON.stringify({ type: "join", name: player.name }));
    });

    socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        console.log("Message from server:", data);
    });

    socket.addEventListener("close", () => {
        console.log("Disconnected from server");
    });

    startGameLoop();
});

// ===== Game Loop =====
function startGameLoop() {
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw player (round like human)
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(player.name, player.x, player.y - player.size - 10);

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

// ===== Resize Handling =====
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
