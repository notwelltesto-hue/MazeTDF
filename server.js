// server.js - Express + ws on the same port (ready for Render)
const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// simple health check (Render likes this)
app.get('/health', (req, res) => res.send('OK'));

const server = http.createServer(app);

// attach ws on same server under /ws
const wss = new WebSocket.Server({ server, path: '/ws' });

let nextId = 1;
let players = {};
let resources = [];

// very small world/resource setup for demo
const WORLD_SIZE = 3000;
function rand(min, max){ return Math.random()*(max-min)+min; }
for (let i = 0; i < 120; i++) {
  resources.push({ id: 'r'+i, type: Math.random() < 0.6 ? 'tree' : 'rock', x: rand(-WORLD_SIZE/2, WORLD_SIZE/2), y: rand(-WORLD_SIZE/2, WORLD_SIZE/2), hp: 100 });
}

// helper: age thresholds (example)
function getAgeFromXP(xp){
  if (xp < 100) return 1;
  if (xp < 300) return 2;
  if (xp < 700) return 3;
  return 4;
}

wss.on('connection', (ws, req) => {
  const id = nextId++;
  players[id] = {
    id,
    name: 'Player' + id,
    x: rand(-200,200),
    y: rand(-200,200),
    hp: 100,
    xp: 0,
    age: 1,
    inventory: { apple: 0 },
    tool: 'hammer',
    inputs: {}
  };
  console.log('player connected', id, 'from', req.socket.remoteAddress);

  // send initial state snapshot (optional)
  ws.send(JSON.stringify({ type: 'init', id, worldSize: WORLD_SIZE }));

  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch(e){ return; }

    const p = players[id];
    if (!p) return;

    if (data.type === 'setName') {
      p.name = String(data.name).slice(0, 20);
    } else if (data.type === 'update') {
      // client authoritative movement (simple). Prefer validation in prod.
      p.x = Number(data.x) || p.x;
      p.y = Number(data.y) || p.y;
    } else if (data.type === 'harvest') {
      // harvest resource id -> damage it, award xp/apple when destroyed
      const rid = data.id;
      const res = resources.find(r => r.id === rid);
      if (res) {
        const dx = p.x - res.x, dy = p.y - res.y;
        if (Math.hypot(dx,dy) < 60) {
          res.hp -= (p.tool === 'hammer' ? 40 : 12);
          if (res.hp <= 0) {
            p.xp += (res.type === 'tree' ? 20 : 30);
            if (Math.random() < 0.35) p.inventory.apple = (p.inventory.apple||0) + 1;
            // respawn replacement later
            const idx = resources.indexOf(res);
            if (idx >= 0) resources.splice(idx,1);
            setTimeout(()=> {
              resources.push({ id: res.type[0] + Date.now() + Math.random(), type: res.type, x: rand(-WORLD_SIZE/2, WORLD_SIZE/2), y: rand(-WORLD_SIZE/2, WORLD_SIZE/2), hp: (res.type==='tree'?100:120) });
            }, 3000 + Math.random()*4000);
          }
          p.age = getAgeFromXP(p.xp);
        }
      }
    } else if (data.type === 'useItem') {
      if (data.item === 'apple' && p.inventory.apple > 0) {
        p.inventory.apple--;
        p.hp = Math.min(100, p.hp + 30);
      }
    } else if (data.type === 'selectTool') {
      if (data.tool === 'hammer' || data.tool === 'hand') p.tool = data.tool;
    }
  });

  ws.on('close', () => {
    delete players[id];
    console.log('player disconnected', id);
  });

  ws.on('error', (err) => {
    console.log('ws error', err && err.message);
  });
});

// Broadcast snapshot to clients at server tick rate (20hz here)
const TICK_RATE = 20;
setInterval(() => {
  const snapshot = {
    type: 'state',
    t: Date.now(),
    players: Object.values(players).map(p => ({
      id: p.id, x: p.x, y: p.y, hp: p.hp, name: p.name, xp: p.xp, age: p.age, inventory: p.inventory, tool: p.tool
    })),
    resources: resources
  };
  const data = JSON.stringify(snapshot);
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(data);
  });
}, 1000 / TICK_RATE);

// listen on Render's assigned port
const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
