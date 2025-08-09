// server.js - Express + ws combined server with XP/age/inventory/resource harvesting
const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const TICK_RATE = 20; // server updates/sec
const WORLD_SIZE = 2000;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

let nextId = 1;
let players = {}; // id -> player
let bullets = []; // basic bullets kept
let resources = []; // trees/resources

function rand(min, max){ return Math.random()*(max-min)+min; }

// XP thresholds for ages
const AGE_XP = [0, 0, 100, 300]; // index == age, age 1 starts at 0, age2 at 100, age3 at 300
// We'll restrict to ages 1..3

// init some resources
for(let i=0;i<80;i++){
  resources.push({ id: 'r'+i, x: rand(-WORLD_SIZE/2, WORLD_SIZE/2), y: rand(-WORLD_SIZE/2, WORLD_SIZE/2), hp: 100 });
}

wss.on('connection', function(ws, req){
  const id = nextId++;
  const p = {
    id,
    x: rand(-200,200),
    y: rand(-200,200),
    rot: 0,
    vx: 0, vy: 0,
    health: 100,
    name: 'Player'+id,
    lastInputSeq: 0,
    inputs: {},
    xp: 0,
    age: 1,
    inventory: { apple: 1, hammer: 1 }, // start with 1 apple & hammer (tool)
    tool: 'hammer' // current tool
  };
  players[id] = p;
  console.log('player connected', id);

  ws.send(JSON.stringify({ type: 'init', id, worldSize: WORLD_SIZE }));

  ws.on('message', function(msg){
    try{
      const data = JSON.parse(msg);
      if(data.type === 'input' && players[id]){
        const player = players[id];
        player.inputs = data;
        player.lastInputSeq = data.seq;
        // if player used item (apple) send immediate server-side effect
        if(data.useItem === 'apple'){
          // apply heal server-side for authoritative health
          if(player.inventory.apple && player.inventory.apple > 0){
            player.inventory.apple -= 1;
            player.health = Math.min(100, player.health + 30);
          }
        }
        // tool changes handled below via separate messages
      }
      if(data.type === 'name' && players[id]){
        players[id].name = String(data.name).slice(0,20);
      }
      if(data.type === 'selectTool' && players[id]){
        const t = data.tool;
        if(t === 'hammer' || t === 'hand'){ players[id].tool = t; }
      }
      if(data.type === 'harvest' && players[id]){
        // attempt to harvest a resource id
        const rid = data.resourceId;
        const res = resources.find(r=>r.id===rid);
        const player = players[id];
        if(res){
          const dx = player.x - res.x, dy = player.y - res.y;
          if(Math.hypot(dx,dy) < 40){
            // harvest amount dependent on tool (hammer harvests)
            const amount = (player.tool === 'hammer') ? 40 : 10;
            res.hp -= amount;
            if(res.hp <= 0){
              // award xp and give apple sometimes
              const xpGain = 20;
              player.xp += xpGain;
              // give apple 30% chance
              if(Math.random() < 0.3){
                player.inventory.apple = (player.inventory.apple||0) + 1;
              }
              // remove resource and respawn after short delay
              const idx = resources.indexOf(res);
              resources.splice(idx,1);
              setTimeout(()=>{
                resources.push({ id: 'r'+Date.now()+Math.random(), x: rand(-WORLD_SIZE/2, WORLD_SIZE/2), y: rand(-WORLD_SIZE/2, WORLD_SIZE/2), hp: 100 });
              }, 5000 + Math.random()*5000);
            }
            // update age if crossed thresholds
            if(player.age < 3){
              for(let a=3;a>player.age;a--){
                if(player.xp >= AGE_XP[a]){ player.age = a; break; }
              }
            }
          }
        }
      }
    }catch(e){}
  });

  ws.on('close', function(){ delete players[id]; console.log('player disconnected', id); });
  ws.on('error', function(err){ console.log('ws error', err && err.message); });
  ws._playerId = id;
});

// server main loop
setInterval(()=>{
  // apply inputs & movement (authoritative)
  for(const id in players){
    const p = players[id];
    const inp = p.inputs || {};
    let ax = 0, ay = 0;
    if(inp.up) ay -= 1;
    if(inp.down) ay += 1;
    if(inp.left) ax -= 1;
    if(inp.right) ax += 1;
    const mag = Math.hypot(ax, ay);
    if(mag>0){ ax/=mag; ay/=mag; }
    const SPEED = 220;
    const dt = 1 / TICK_RATE;
    p.x += ax * SPEED * dt;
    p.y += ay * SPEED * dt;
    p.rot = inp.rot || p.rot;

    // basic friction
    p.vx *= 0.9; p.vy *= 0.9;
  }

  // update bullets (if any)
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.life -= 1/TICK_RATE;
    b.x += b.vx*(1/TICK_RATE);
    b.y += b.vy*(1/TICK_RATE);
    for(const id in players){
      const p = players[id];
      if(p.id == b.owner) continue;
      if(Math.hypot(p.x-b.x,p.y-b.y) < 20){
        p.health -= 20;
        bullets.splice(i,1);
        break;
      }
    }
    if(b && b.life <= 0) bullets.splice(i,1);
  }

  // snapshot to clients
  const snapshot = {
    type: 'snapshot',
    t: Date.now(),
    players: Object.values(players).map(p=>({
      id:p.id,x:p.x,y:p.y,rot:p.rot,health:p.health,name:p.name,lastInputSeq:p.lastInputSeq,xp:p.xp,age:p.age,inventory:p.inventory,tool:p.tool
    })),
    bullets: bullets.map(b=>({id:b.id,x:b.x,y:b.y})),
    resources: resources
  };
  const dataStr = JSON.stringify(snapshot);
  wss.clients.forEach(c => { if(c.readyState === WebSocket.OPEN) c.send(dataStr); });

}, 1000 / TICK_RATE);

// listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>{ console.log('Server listening on port', PORT); });
