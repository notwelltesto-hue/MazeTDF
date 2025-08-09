// client.js - simple client
const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

let playerId = null;
let world = { map:{w:5000,h:5000}, players:[], structures:[], animals:[], resources:[] };
let selfPlayer = null;
let keys = {};

// camera
let cam = { x:0, y:0, zoom:1 };

socket.on('welcome', data=>{
  playerId = data.id;
  world.map = data.map;
  world.resources = data.resources;
  world.structures = data.structures;
  world.players = data.players;
  world.animals = data.animals;
  const me = world.players.find(p=>p.id===playerId);
  if(me) selfPlayer = me;
});

socket.on('state', s=>{
  world.players = s.players;
  world.structures = s.structures;
  world.animals = s.animals;
  world.resources = s.resources;
  selfPlayer = world.players.find(p=>p.id===playerId) || selfPlayer;
  updateUI();
});

socket.on('structureCreated', s => {
  // optimistic add handled by full state; we can push here too
});

// input handling
let inputSeq = 0;
function sendInput(){
  const dirX = (keys['ArrowRight']||keys['d']?1:0) - (keys['ArrowLeft']||keys['a']?1:0);
  const dirY = (keys['ArrowDown']||keys['s']?1:0) - (keys['ArrowUp']||keys['w']?1:0);
  socket.emit('input', { seq: ++inputSeq, dirX, dirY });
}
setInterval(sendInput, 50);

// mouse build on click
canvas.addEventListener('click', e=>{
  if(!selfPlayer) return;
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const worldX = cam.x + cx;
  const worldY = cam.y + cy;
  socket.emit('input', { seq: ++inputSeq, dirX:0, dirY:0, build: { x: worldX, y: worldY, type: 'wall' } });
});

// key listeners
window.addEventListener('keydown', e=>{ keys[e.key] = true; });
window.addEventListener('keyup', e=>{ keys[e.key] = false; });

// drawing
function updateUI(){
  document.getElementById('hp').innerText = (selfPlayer && selfPlayer.hp!==undefined) ? selfPlayer.hp : '100';
  document.getElementById('wood').innerText = (selfPlayer && selfPlayer.resources && selfPlayer.resources.wood) ? selfPlayer.resources.wood : 0;
}

function gameLoop(){
  // center camera on player
  if(selfPlayer){
    cam.x = selfPlayer.x - W/2;
    cam.y = selfPlayer.y - H/2;
    // clamp
    cam.x = Math.max(0, Math.min(world.map.w - W, cam.x));
    cam.y = Math.max(0, Math.min(world.map.h - H, cam.y));
  }

  ctx.clearRect(0,0,W,H);

  // draw resources
  for(const r of world.resources){
    const rx = r.x - cam.x, ry = r.y - cam.y;
    if(rx< -50 || ry< -50 || rx>W+50 || ry>H+50) continue;
    ctx.fillStyle = (r.type==='wood') ? '#6b3' : '#888';
    ctx.beginPath(); ctx.arc(rx, ry, Math.max(4, Math.min(14, r.amount/20)), 0, Math.PI*2); ctx.fill();
  }

  // draw structures
  for(const s of world.structures){
    const sx = s.x - cam.x, sy = s.y - cam.y;
    ctx.fillStyle = '#5a3';
    ctx.fillRect(sx-16, sy-16, 32, 32);
  }

  // draw animals
  for(const a of world.animals){
    const ax = a.x - cam.x, ay = a.y - cam.y;
    ctx.fillStyle = (a.type==='bull')?'#b22':'#f5c';
    ctx.beginPath(); ctx.arc(ax, ay, 12, 0, Math.PI*2); ctx.fill();
  }

  // draw players
  for(const p of world.players){
    const px = p.x - cam.x, py = p.y - cam.y;
    ctx.fillStyle = (p.id===playerId)?'#00f':'#0a0';
    ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText(p.id===playerId ? 'You' : p.id.substr(0,4), px-16, py-18);
  }

  requestAnimationFrame(gameLoop);
}
gameLoop();
