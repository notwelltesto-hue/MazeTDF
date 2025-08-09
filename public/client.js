window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let socket;
    let playerId = null;
    let players = {};
    let resources = [];

    let myName = "";

    // UI elements
    const menu = document.getElementById("menu");
    const nameInput = document.getElementById("nameInput");
    const playBtn = document.getElementById("playBtn");

    playBtn.addEventListener("click", () => {
        myName = nameInput.value.trim() || "Player";
        menu.style.display = "none";
        connect();
    });

    function connect() {
        socket = new WebSocket(
            (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host
        );

        socket.addEventListener("open", () => {
            socket.send(JSON.stringify({ type: "setName", name: myName }));
        });

        socket.addEventListener("message", (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "state") {
                players = {};
                data.players.forEach((p) => {
                    players[p.id] = p;
                    if (p.name === myName) {
                        playerId = p.id;
                    }
                });
                resources = data.resources || [];
            }
        });

        // Movement input
        document.addEventListener("keydown", (e) => {
            socket.send(JSON.stringify({ type: "move", key: e.key, state: true }));
        });
        document.addEventListener("keyup", (e) => {
            socket.send(JSON.stringify({ type: "move", key: e.key, state: false }));
        });
    }

    // Draw background grass tiles
    function drawGrass(camX, camY) {
        const tileSize = 50;
        const startX = Math.floor(camX / tileSize) * tileSize;
        const startY = Math.floor(camY / tileSize) * tileSize;
        for (let x = startX - tileSize; x < camX + canvas.width + tileSize; x += tileSize) {
            for (let y = startY - tileSize; y < camY + canvas.height + tileSize; y += tileSize) {
                ctx.fillStyle = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0
                    ? "#9ED98D"
                    : "#91CE80";
                ctx.fillRect(x - camX, y - camY, tileSize, tileSize);
            }
        }
    }

    // Draw loop
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (playerId && players[playerId]) {
            const me = players[playerId];
            const camX = me.x - canvas.width / 2;
            const camY = me.y - canvas.height / 2;

            // Background
            drawGrass(camX, camY);

            // Draw resources
            resources.forEach((r) => {
                ctx.beginPath();
                ctx.arc(r.x - camX, r.y - camY, r.size, 0, Math.PI * 2);
                ctx.fillStyle = r.type === "tree" ? "#228B22" : "#808080";
                ctx.fill();
            });

            // Draw players
            Object.values(players).forEach((p) => {
                const px = p.x - camX;
                const py = p.y - camY;

                // Body
                ctx.beginPath();
                ctx.arc(px, py, 20, 0, Math.PI * 2);
                ctx.fillStyle = "#F5CBA7";
                ctx.fill();

                // Head
                ctx.beginPath();
                ctx.arc(px, py - 25, 12, 0, Math.PI * 2);
                ctx.fillStyle = "#FAD7A0";
                ctx.fill();

                // Hammer (placeholder)
                ctx.strokeStyle = "#654321";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(px + 20, py);
                ctx.lineTo(px + 35, py - 15);
                ctx.stroke();

                ctx.fillStyle = "#000";
                ctx.font = "14px Arial";
                ctx.textAlign = "center";
                ctx.fillText(`${p.name} (Age ${p.age || 1})`, px, py - 45);
            });
        }

        requestAnimationFrame(draw);
    }

    draw();
});
