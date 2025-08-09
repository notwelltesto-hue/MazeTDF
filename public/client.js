const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.style.margin = "0";
document.body.appendChild(canvas);

let socket;
let playerId;
let players = {};
let resources = [];
let worldSize = 5000;

let keys = {};
let myName = prompt("Enter your name:") || "unknown";

let pos = { x: 0, y: 0 };
let vel = { x: 0, y: 0 };
let speed = 3;

function connect() {
    socket = new WebSocket(window.location.origin.replace(/^http/, "ws"));

    socket.addEventListener("open", () => {
        console.log("Connected to server");
    });

    socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "init") {
            playerId = data.id;
            players = data.players;
            resources = data.resources;
            worldSize = data.worldSize;
        }
        else if (data.type === "state") {
            players = data.players;
            resources = data.resources;
        }
    });
}

function update() {
    vel.x = (keys["d"] ? 1 : 0) - (keys["a"] ? 1 : 0);
    vel.y = (keys["s"] ? 1 : 0) - (keys["w"] ? 1 : 0);
    let len = Math.hypot(vel.x, vel.y);
    if (len > 0) {
        vel.x /= len;
        vel.y /= len;
    }
    pos.x += vel.x * speed;
    pos.y += vel.y * speed;

    socket.send(JSON.stringify({ type: "update", x: pos.x, y: pos.y, name: myName }));
}

function drawPlayer(p) {
    ctx.save();
    ctx.translate(p.x, p.y);

    // body
    ctx.fillStyle = "#d9a066";
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();

    // hammer
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(30, 0);
    ctx.stroke();

    ctx.restore();

    // name + age
    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${p.name} (Age ${p.age})`, p.x, p.y - 30);

    // HP bar
    ctx.fillStyle = "red";
    ctx.fillRect(p.x - 20, p.y - 25, 40, 4);
    ctx.fillStyle = "lime";
    ctx.fillRect(p.x - 20, p.y - 25, (p.hp / 100) * 40, 4);
}

function drawResource(r) {
    ctx.save();
    ctx.translate(r.x, r.y);
    if (r.type === "tree") {
        ctx.fillStyle = "green";
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = "gray";
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function render() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let me = players[playerId];
    if (!me) return;

    let camX = me.x - canvas.width / 2;
    let camY = me.y - canvas.height / 2;

    // grass background
    ctx.fillStyle = "#a7d07c";
    ctx.fillRect(-camX, -camY, worldSize, worldSize);

    // draw resources
    for (let r of resources) {
        drawResource({ ...r, x: r.x - camX, y: r.y - camY });
    }

    // draw players
    for (let id in players) {
        let p = players[id];
        drawPlayer({ ...p, x: p.x - camX, y: p.y - camY });
    }
}

function loop() {
    update();
    render();
    requestAnimationFrame(loop);
}

window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

connect();
loop();
