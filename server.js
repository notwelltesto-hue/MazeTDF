// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Animals = require('./animals');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

// GAME SETTINGS
const MAP_W = 5000;
const MAP_H = 5000;
const TICK_RATE = 20; // server simulation ticks per second
const BROADCAST_RATE = 10; // how many updates per second to send to clients
const RESOURCE_NODES = 200;

// Simple server-side world state
const players = {};      // { socketId: {id, x, y, vx, vy, hp, resources:{wood:..}, buildCount } }
const structures = [];   // {id, x, y, type, ownerId}
const resources = [];    // {id, x, y, type, amount}
const animals = new Animals({mapW: MAP_W, mapH: MAP_H, count: 40});

// Utility
function randRange(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

// populate resource nodes
for(let i=0;i<RESOURCE_NODES;i++){
  resources.push({
    id: 'res_'+i,
    x: randRange(0, MAP_W),
    y: randRange(0, MAP_H),
    type: (Math.random()<0.7)?'wood':'stone',
    amount: randRange(50,200)
  });
}

// socket events
io.on('connection', socket=>{
  console.log('conn', socket.id);
  players[socket.id] = {
    id: socket.id,
    name: 'Player',
    x: randRange(100, MAP_W-100),
    y: randRange(100, MAP_H-100),
    vx:0, vy:0,
    hp:100,
    resources: { wood:0, stone:0, food:0, gold:0 },
    buildCount: 0,
    lastInputSeq: 0
  };

  // send initial handshake
  socket.emit('welcome', {
    id: socket.id,
    map: { w: MAP_W, h: MAP_H },
    resources,
    structures,
    players: Object.values(players),
    animals: animals.list()
  });

  // client input: move keys & build actions
  socket.on('input', data => {
    // data = { seq, dirX, dirY, build: {x,y,type} | null }
    const p = players[socket.id];
    if(!p) return;
    p.lastInputSeq = data.seq || p.lastInputSeq;
    // apply movement - simple
    const speed = 180; // units per second
    p.vx = (data.dirX||0) * speed;
    p.vy = (data.dirY||0) * speed;

    if(data.build){
      const b = data.build;
      // cheapest validation: distance, resource cost, build limits
      const cost = { wood: 20 };
      const canBuild = (p.resources.wood >= cost.wood) && (p.buildCount < 100);
      const dx = b.x - p.x, dy = b.y - p.y;
      if(canBuild && Math.hypot(dx,dy) < 120){
        // create structure
        const id = 's_'+Date.now()+'_'+Math.floor(Math.random()*1000);
        structures.push({ id, x: b.x, y: b.y, type: b.type||'wall', owner: socket.id });
        p.resources.wood -= cost.wood;
        p.buildCount++;
        io.emit('structureCreated', { id, x: b.x, y: b.y, type: b.type||'wall', owner: socket.id });
      } else {
        socket.emit('buildFailed', {reason: canBuild ? 'too_far_or_limit' : 'no_resources'});
      }
    }
  });

  socket.on('chat', msg=>{
    io.emit('chat', { id: socket.id, text: msg });
  });

  socket.on('disconnect', ()=> {
    delete players[socket.id];
    io.emit('playerLeft', { id: socket.id });
  });
});

// GAME LOOP
let last = Date.now();
let acc = 0;
const tickInterval = 1000 / TICK_RATE;
let broadcastAccumulator = 0;
setInterval(()=>{
  const now = Date.now();
  const dt = (now - last) / 1000.0;
  last = now;

  // update players
  for(const id in players){
    const p = players[id];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // clamp to map
    p.x = Math.max(0, Math.min(MAP_W, p.x));
    p.y = Math.max(0, Math.min(MAP_H, p.y));
    // resource gathering: simple auto-gather when near
    for(const r of resources){
      if(r.amount > 0 && Math.hypot(p.x-r.x, p.y-r.y) < 20){
        const gather = Math.min(5, r.amount);
        r.amount -= gather;
        p.resources[r.type] = (p.resources[r.type]||0) + gather;
      }
    }
  }

  // update animals
  animals.update(dt, players);

  // broadcast at lower rate to save bandwidth
  broadcastAccumulator += dt;
  if(broadcastAccumulator >= (1 / BROADCAST_RATE)){
    broadcastAccumulator = 0;
    // prepare shallow snapshots
    const playersSnap = Object.values(players).map(p=>({
      id: p.id, x: p.x, y: p.y, hp: p.hp, resources: p.resources
    }));
    const animalsSnap = animals.list();
    const resSnap = resources.filter(r=>r.amount>0);
    io.emit('state', {
      players: playersSnap,
      structures,
      animals: animalsSnap,
      resources: resSnap
    });
  }

}, tickInterval);

// start server
server.listen(PORT, ()=>console.log('listening on', PORT));
