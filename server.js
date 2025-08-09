// server.js - Express + ws combined server for Render
const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const TICK_RATE = 20; // updates/sec
const WORLD_SIZE = 2000;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

let nextId = 1;
let players = {};
let bullets = [];
let resources = [];

// helper
function rand(min, max){ return Math.random() * (max - min) + min; }

// create some resources
for(let i = 0; i < 80; i++){
  resources.push({
    id: 'r' + i,
    x: rand(-WORLD_SIZE/2, WORLD_SIZE/2),
    y: rand(-WORLD_SIZE/2, WORLD_SIZE/2),
    hp: 100
  });
}

wss.on('connection', function(ws, req){
  const id = nextId++;
  const p = {
    id,
    x: rand(-200,200),
    y: rand(-200,200),
    rot: 0,
    vx: 0, vy: 0,
    speed: 0,
    health: 100,
    name: 'Player' + id,
    lastInputSeq: 0
  };
  players[id] = p;
  console.log('player connected', id, 'from', req.socket.remoteAddress);

  ws.send(JSON.stringify({ type: 'init', id, worldSize: WORLD_SIZE }));

  ws.on('message', function(msg){
    try{
      const data = JSON.parse(msg);
      if(data.type === 'input' && players[id]){
        const player = players[id];
        player.rot = data.rot;
        player.inputs = data;
        player.lastInputSeq = data.seq;
      }
      if(data.type === 'name' && players[id]){
        players[id].name = String(data.name).slice(0,20);
      }
    }catch(e){}
  });

  ws.on('close', () => { delete players[id]; console.log('player disconnected', id); });
  ws.on('error', (err) => { console.log('ws error', err && err.message); });
});

// main loop
setInterval(() => {
  // move players
  for(const id in players){
    const p = players[id];
    const inp = p.inputs || {};
    let ax = 0, ay = 0;
    if(inp.up) ay -= 1;
    if(inp.down) ay += 1;
    if(inp.left) ax -= 1;
    if(inp.right) ax += 1;
    const mag = Math.hypot(ax, ay);
    if(mag > 0){ ax /= mag; ay /= mag; }
    const SPEED = 220;
    const dt = 1 / TICK_RATE;
    p.x += ax * SPEED * dt;
    p.y += ay * SPEED * dt;

    // shooting
    if(inp.shooting && inp.shootingSeq !== p._lastShotSeq){
      p._lastShotSeq = inp.shootingSeq;
      const angle = inp.rot || 0;
      const speed = 600;
      const bx = p.x + Math.cos(angle) * 20;
      const by = p.y + Math.sin(angle) * 20;
      bullets.push({
        id: 'b' + Date.now() + Math.random(),
        owner: p.id,
        x: bx, y: by,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2.0
      });
    }
  }

  // update bullets
  for(let i = bullets.length - 1; i >= 0; i--){
    const b = bullets[i];
    b.life -= 1 / TICK_RATE;
    b.x += b.vx * (1 / TICK_RATE);
    b.y += b.vy * (1 / TICK_RATE);

    for(const id in players){
      const p = players[id];
      if(p.id == b.owner) continue;
      const dx = p.x - b.x, dy = p.y - b.y;
      if(Math.hypot(dx, dy) < 20){
        p.health -= 20;
        bullets.splice(i, 1);
        break;
      }
    }
    if(b && b.life <= 0) bullets.splice(i, 1);
  }

  // send snapshot
  const snapshot = {
    type: 'snapshot',
    t: Date.now(),
    players: Object.values(players).map(p => ({
      id: p.id,
      x: p.x, y: p.y,
      rot: p.rot,
      health: p.health,
      name: p.name,
      lastInputSeq: p.lastInputSeq
    })),
    bullets: bullets.map(b => ({ id: b.id, x: b.x, y: b.y })),
    resources
  };

  const dataStr = JSON.stringify(snapshot);
  wss.clients.forEach(c => {
    if(c.readyState === WebSocket.OPEN) c.send(dataStr);
  });

}, 1000 / TICK_RATE);

// listen on Render's port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});
