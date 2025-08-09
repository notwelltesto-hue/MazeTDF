window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    let socket;
    let playerId = null;
    let players = {};
    let resources = [];
    let keys = {};
    let myName = "";
    let worldSize = 5000;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    document.getElementById("playBtn").addEventListener("click", () => {
        const nameInput = document.getElementById("nameInput");
        myName = nameInput.value.trim() || "unknown";

        document.getElementById("menu").style.display = "none";
        canvas.style.display = "block";

        connect();
        gameLoop();
    });

    function connect() {
        const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
        socket = new WebSocket(wsProtocol + window.location.host);

        socket.onopen = () => {
            socket.send(JSON.stringify({ type: "join", name: myName }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "init") {
                playerId = data.id;
                players = data.players;
                resources = data.resources || [];
            } else if (data.type === "update") {
                players = data.players;
                resources = data.resources || [];
            }
        };
    }

    function drawWorld() {
        ctx.fillStyle = "#7ec850";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Get camera offset so player is centered
        const me = players[playerId];
        if (!me) return;
        const camX = me.x - canvas.width / 2;
        const camY = me.y - canvas.height / 2;

        // Draw resources
        for (const r of resources) {
            ctx.fillStyle = r.type === "tree" ? "#228B22" : "#a9a9a9";
            ctx.beginPath();
            ctx.arc(r.x - camX, r.y - camY, r.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw players
        for (const id in players) {
            const p = players[id];
            ctx.beginPath();
            ctx.fillStyle = id === playerId ? "#ffdd55" : "#ff5555";
            ctx.arc(p.x - camX, p.y - camY, 20, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#000";
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillText(p.name, p.x - camX, p.y - camY - 30);
        }
    }

    function gameLoop() {
        update();
        drawWorld();
        requestAnimationFrame(gameLoop);
    }

    function update() {
        if (!socket || socket.readyState !== WebSocket.OPEN || !players[playerId]) return;
        let dx = 0, dy = 0;
        if (keys["w"]) dy -= 1;
        if (keys["s"]) dy += 1;
        if (keys["a"]) dx -= 1;
        if (keys["d"]) dx += 1;

        if (dx !== 0 || dy !== 0) {
            socket.send(JSON.stringify({ type: "move", dx, dy }));
        }
    }

    window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);
});
