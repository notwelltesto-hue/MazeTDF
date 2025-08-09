// server.js - simple authoritative server using 'ws'
// Run: npm install, then node server.js
const WebSocket = require('ws');
const http = require('http');

const TICK_RATE = 20; // server updates per second
const PORT = 3000;
const wss = new WebSocket.Server({ port: PORT });
console.log('Server listening on ws://localhost:' + PORT);

let nextId = 1;
let players = {}; // id -> {id, x,y,rot,health,seq}
let bullets = []; // {id,owner,x,y,vx,vy,life}
let resources = []; // trees / resources

const WORLD_SIZE = 2000;

function rand(min,max){ return Math.random()*(max-min)+min; }

// initialize some trees/resources
for(let i=0;i<80;i++){
  resources.push({id: 'r'+i, x: rand(-WORLD_SIZE/2, WORLD_SIZE/2), y: rand(-WORLD_SIZE/2, WORLD_SIZE/2), hp: 100});
}

// handle new connections
wss.on('connection', function(ws){
  const id = nextId++;
  const p = { id, x: rand(-200,200), y: rand(-200,200), rot:0, vx:0, vy:0, speed:0, health:100, name:'Player'+id, lastInputSeq:0 };
  players[id] = p;
  console.log('join',id);

  ws.send(JSON.stringify({type:'init', id, worldSize: WORLD_SIZE}));

  ws.on('message', function(msg){
    try{
      const data = JSON.parse(msg);
      if(data.type === 'input' && players[id]){
        // input: {seq, up, down, left, right, mx, my, shooting}
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

  ws.on('close',function(){ delete players[id]; console.log('left',id); });
  ws._playerId = id;
});

// main update loop
setInterval(()=>{
  const now = Date.now();
  // apply inputs & movement
  for(const id in players){
    const p = players[id];
    const inp = p.inputs || {};
    // movement
    let ax = 0, ay = 0;
    if(inp.up) ay -= 1;
    if(inp.down) ay += 1;
    if(inp.left) ax -= 1;
    if(inp.right) ax += 1;
    const mag = Math.hypot(ax,ay);
    if(mag>0){ ax/=mag; ay/=mag; }
    const SPEED = 220; // units per second
    // integrate (simple, per tick)
    const dt = 1/TICK_RATE;
    p.x += ax * SPEED * dt;
    p.y += ay * SPEED * dt;
    // shooting
    if(inp.shooting && inp.shootingSeq !== p._lastShotSeq){
      p._lastShotSeq = inp.shootingSeq;
      const angle = inp.rot;
      const speed = 600;
      const bx = p.x + Math.cos(angle)*20;
      const by = p.y + Math.sin(angle)*20;
      bullets.push({id: 'b'+Date.now()+Math.random(), owner: p.id, x: bx, y:by, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 2.0});
    }
  }

  // update bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.life -= 1/TICK_RATE;
    b.x += b.vx*(1/TICK_RATE);
    b.y += b.vy*(1/TICK_RATE);
    // collision with players
    for(const id in players){
      const p = players[id];
      if(p.id == b.owner) continue;
      const dx = p.x - b.x, dy = p.y - b.y;
      if(Math.hypot(dx,dy) < 20){
        p.health -= 20;
        bullets.splice(i,1);
        break;
      }
    }
    if(b && b.life <= 0) bullets.splice(i,1);
  }

  // broadcast state snapshot
  const snapshot = {
    type: 'snapshot',
    t: Date.now(),
    players: Object.values(players).map(p=>({id:p.id,x:p.x,y:p.y,rot:p.rot,health:p.health, name:p.name, lastInputSeq:p.lastInputSeq})),
    bullets: bullets.map(b=>({id:b.id,x:b.x,y:b.y})),
    resources: resources
  };

  const dataStr = JSON.stringify(snapshot);
  wss.clients.forEach(function each(client){
    if (client.readyState === WebSocket.OPEN) {
      client.send(dataStr);
    }
  });

}, 1000/TICK_RATE);
