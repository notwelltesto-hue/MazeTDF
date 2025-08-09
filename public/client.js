const socket = new WebSocket(`wss://${window.location.host}`);

let playerId = null;
let players = {};
let myName = "";
let keys = {};
let mouse = { x: 0, y: 0, down: false };

// UI elements
const homeScreen = document.getElementById("homeScreen");
const playBtn = document.getElementById("playBtn");
const nameInput = document.getElementById("nameInput");
const hotbarApple = document.getElementById("hotbarApple");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

playBtn.addEventListener("click", () => {
    myName = nameInput.value.trim() || "unknown";
    socket.send(JSON.stringify({ type: "setName", name: myName }));
    homeScreen.style.display = "none";
});

hotbarApple.addEventListener("click", () => {
    socket.send(JSON.stringify({ type: "eatApple" }));
});

document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener("mousedown", () => mouse.down = true);
canvas.addEventListener("mouseup", () => mouse.down = false);
canvas.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "state") {
        players = {};
        data.players.forEach(p => {
            players[p.id] = p;
        });
    }
});

function gameLoop() {
    // send movement & actions
    if (myName && playerId !== null) {
        const me = players[playerId];
        if (me) {
            if (keys['w']) me.y -= 3;
            if (keys['s']) me.y += 3;
            if (keys['a']) me.x -= 3;
            if (keys['d']) me.x += 3;

            socket.send(JSON.stringify({ type: "move", x: me.x, y: me.y }));

            if (mouse.down) {
                socket.send(JSON.stringify({ type: "harvest" }));
            }
        }
    }

    draw();
    requestAnimationFrame(gameLoop); // 60 FPS
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const me = players[playerId];
    if (!me) return;

    Object.values(players).forEach(p => {
        const screenX = canvas.width / 2 + (p.x - me.x);
        const screenY = canvas.height / 2 + (p.y - me.y);

        // Player body (round)
        ctx.beginPath();
        ctx.arc(screenX, screenY, 20, 0, Math.PI * 2);
        ctx.fillStyle = "#b5651d"; // brown
        ctx.fill();

        // Name
        ctx.fillStyle = "white";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(p.name, screenX, screenY - 30);

        // HP bar
        ctx.fillStyle = "red";
        ctx.fillRect(screenX - 20, screenY + 25, 40, 5);
        ctx.fillStyle = "lime";
        ctx.fillRect(screenX - 20, screenY + 25, 40 * (p.hp / 100), 5);

        // Age
        ctx.fillStyle = "yellow";
        ctx.fillText(`Age ${p.age}`, screenX, screenY + 45);

        // Inventory count for self
        if (p.id === playerId) {
            hotbarApple.textContent = `🍎 ${p.inventory.apples}`;
        }
    });
}

socket.addEventListener("open", () => {
    // Assign a random local ID
    playerId = Math.floor(Math.random() * 100000);
});

gameLoop();
