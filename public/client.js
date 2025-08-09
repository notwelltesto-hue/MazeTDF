// client.js - improved client: 60fps render, interpolation, home screen, inventory, apple/heal, hammer harvest

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width = innerWidth;
let H = canvas.height = innerHeight;
window.addEventListener('resize', ()=>{ W = canvas.width = innerWidth; H = canvas.height = innerHeight; });

const infoEl = document.getElementById('info');
const nameWrap = document.getElementById('nameWrap');
const xpVal = document.getElementById('xpVal');
const ageVal = document.getElementById('ageVal');
const appleCountEl = document.getElementById('appleCount');
const homeScreen = document.getElementById('homeScreen');
const joinBtn = document.getElementById('joinBtn');
const nameInputHome = document.getElementById('nameInputHome');
const toolSelect = document.getElementById('toolSelect');
const appleBtn = document.getElementById('appleBtn');
const hammerBtn = document.getElementById('hammerBtn');

let ws = null;
let myId = null;
let worldSize = 2000;
let state = { players: [], bullets: [], resources: [] };

// interpolation buffer: latest snapshot and previous for lerp
let lastSnapshot = null;
let prevSnapshot = null;
let lastSnapshotTime = 0;

let inputs = { up:false, down:false, left:false, right:false, rot:0, shooting:false, seq:0, useItem:null };
let tool = 'hammer';

// connect helper
function connect(name, chosenTool){
  const wsProtocol = (location.protocol === 'https:') ? 'wss:' : 'ws:';
  const wsHost = location.host;
  const wsPath = '/ws';
  const wsUrl = `${wsProtocol}//${wsHost}${wsPath}`;
  ws = new WebSocket(wsUrl);
  tool = chosenTool || 'hammer';

  ws.onopen = ()=>{ infoEl.textContent = 'Connected. Use WASD, mouse, left-click to harvest.'; if(name) ws.send(JSON.stringify({type:'name', name})); ws.send(JSON.stringify({type:'selectTool', tool})); };
  ws.onmessage = (e)=>{ try{ const d = JSON.parse(e.data); if(d.type==='init'){ myId = d.id; worldSize = d.worldSize; } else if(d.type==='snapshot'){ prevSnapshot = lastSnapshot; lastSnapshot = d; lastSnapshotTime = Date.now(); state = d; updateHUD(); } }catch(err){} };
  ws.onclose = ()=>{ infoEl.textContent = 'Disconnected'; };
}

function updateHUD(){
  const me = state.players.find(p=>p.id===myId);
  if(me){
    xpVal.textContent = me.xp||0;
    ageVal.textContent = me.age||1;
    appleCountEl.textContent = (me.inventory && me.inventory.apple) ? me.inventory.apple : 0;
    nameWrap.textContent = me.name || ('P'+myId);
  } else {
    nameWrap.textContent = 'Not joined';
  }
}

// Input handling
window.addEventListener('keydown',(e)=>{ if(e.key==='w') inputs.up=true; if(e.key==='s') inputs.down=true; if(e.key==='a') inputs.left=true; if(e.key==='d') inputs.right=true; if(e.key==='e'){ /* maybe interact */ }});
window.addEventListener('keyup',(e)=>{ if(e.key==='w') inputs.up=false; if(e.key==='s') inputs.down=false; if(e.key==='a') inputs.left=false; if(e.key==='d') inputs.right=false; });

canvas.addEventListener('mousemove',(e)=>{ const mx = e.clientX - W/2; const my = e.clientY - H/2; inputs.rot = Math.atan2(my, mx); });
canvas.addEventListener('mousedown',(e)=>{ inputs.shooting = true; });
canvas.addEventListener('mouseup',(e)=>{ inputs.shooting = false; });

// harvest by clicking near resource: use shooting event + nearest resource within range
canvas.addEventListener('click',(e)=>{
  // only attempt if we have a snapshot
  if(!state.resources || !state.players) return;
  const me = state.players.find(p=>p.id===myId);
  if(!me) return;
  // convert click screen->world
  const cam = {x: me.x, y: me.y};
  const wx = me.x + (e.clientX - W/2);
  const wy = me.y + (e.clientY - H/2);
  // find nearest resource
  let nearest = null, nd = 1e9;
  state.resources.forEach(r=>{
    const d = Math.hypot(r.x-wx, r.y-wy);
    if(d < nd){ nd = d; nearest = r; }
  });
  if(nearest && nd < 60){
    // send harvest request to server
    if(ws && ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({ type:'harvest', resourceId: nearest.id }));
  }
});

// use apple button
appleBtn.addEventListener('click',()=>{
  if(ws && ws.readyState===WebSocket.OPEN){
    inputs.useItem = 'apple';
    // also send explicit message so server applies instantly
    ws.send(JSON.stringify({ type:'input', seq: ++inputs.seq, up:inputs.up, down:inputs.down, left:inputs.left, right:inputs.right, rot:inputs.rot, useItem: 'apple' }));
    // clear useItem so it isn't repeatedly sent
    inputs.useItem = null;
  }
});

// tool select buttons
hammerBtn.addEventListener('click', ()=>{ tool = 'hammer'; if(ws && ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'selectTool', tool})); });

// join flow
joinBtn.addEventListener('click', ()=>{
  const name = nameInputHome.value || ('Player' + Math.floor(Math.random()*999));
  const chosenTool = toolSelect.value || 'hammer';
  connect(name, chosenTool);
  homeScreen.style.display = 'none';
});

// send inputs at 60Hz
setInterval(()=>{
  if(ws && ws.readyState===WebSocket.OPEN){
    inputs.seq++;
    ws.send(JSON.stringify({
      type: 'input',
      seq: inputs.seq,
      up: inputs.up, down: inputs.down, left: inputs.left, right: inputs.right,
      rot: inputs.rot, shooting: inputs.shooting
    }));
  }
}, 1000/60);

// simple client-side prediction for local player (apply movement locally immediately)
function applyLocalPrediction(dt){
  const p = predictedLocal;
  if(!p) return;
  let ax = 0, ay = 0;
  if(localInputs.up) ay -= 1;
  if(localInputs.down) ay += 1;
  if(localInputs.left) ax -= 1;
  if(localInputs.right) ax += 1;
  const mag = Math.hypot(ax, ay);
  if(mag>0){ ax/=mag; ay/=mag; }
  const SPEED = 220;
  p.x += ax * SPEED * dt;
  p.y += ay * SPEED * dt;
}

// We'll keep a light-weight predictedLocal & localInputs for immediate feel
let predictedLocal = null;
let localInputs = { up:false, down:false, left:false, right:false, rot:0 };

// also mirror keys to localInputs
window.addEventListener('keydown',(e)=>{ if(e.key==='w') localInputs.up=true; if(e.key==='s') localInputs.down=true; if(e.key==='a') localInputs.left=true; if(e.key==='d') localInputs.right=true; });
window.addEventListener('keyup',(e)=>{ if(e.key==='w') localInputs.up=false; if(e.key==='s') localInputs.down=false; if(e.key==='a') localInputs.left=false; if(e.key==='d') localInputs.right=false; });

// interpolation helper
function lerp(a,b,t){ return a + (b-a)*t; }

// draw loop (60fps by default)
let lastFrame = performance.now();
function draw(now){
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;

  // update predicted local
  if(predictedLocal){
    applyLocalPrediction(dt);
  } else {
    // if we have a local player in snapshot, seed predictedLocal
    const me = state.players.find(p=>p.id===myId);
    if(me){ predictedLocal = { x: me.x, y: me.y }; localInputs = { up:false, down:false, left:false, right:false, rot:0 }; }
  }

  ctx.clearRect(0,0,W,H);

  // compute interpolation factor between prevSnapshot and lastSnapshot
  let interp = 1;
  if(prevSnapshot && lastSnapshot){
    const nowT = Date.now();
    const serverDT = (lastSnapshot.t - (prevSnapshot.t||lastSnapshot.t)) || (1000/TICK_RATE);
    const age = nowT - lastSnapshot.t;
    interp = Math.min(1, 0.5 + (age / serverDT)); // biased toward lastSnapshot
    // simpler: if recent, use lastSnapshot directly
  }

  // camera centered on predictedLocal if available else local snapshot
  const meSnap = state.players.find(p=>p.id===myId);
  const cam = { x: (predictedLocal ? predictedLocal.x : (meSnap ? meSnap.x : 0)), y: (predictedLocal ? predictedLocal.y : (meSnap ? meSnap.y : 0)) };

  // draw background grid
  ctx.fillStyle = '#cfeeff';
  ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 1;
  for(let gx=-worldSize; gx<=worldSize; gx+=200){
    const p1 = worldToScreen(gx, -worldSize, cam);
    const p2 = worldToScreen(gx, worldSize, cam);
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
  }
  for(let gy=-worldSize; gy<=worldSize; gy+=200){
    const p1 = worldToScreen(-worldSize, gy, cam);
    const p2 = worldToScreen(worldSize, gy, cam);
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
  }

  // resources (trees)
  state.resources.forEach(r=>{
    const s = worldToScreen(r.x, r.y, cam);
    ctx.fillStyle = '#157a1f';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, 18, 18, 0, 0, Math.PI*2);
    ctx.fill();
  });

  // bullets
  state.bullets.forEach(b=>{
    const s = worldToScreen(b.x, b.y, cam);
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(s.x,s.y,4,0,Math.PI*2); ctx.fill();
  });

  // players (interpolated)
  state.players.forEach(p=>{
    // find previous version if exists to interpolate
    let px = p.x, py = p.y, prot = p.rot;
    if(prevSnapshot){
      const prev = prevSnapshot.players.find(pp=>pp.id===p.id);
      if(prev){
        px = lerp(prev.x, p.x, interp);
        py = lerp(prev.y, p.y, interp);
        prot = lerp(prev.rot||0, p.rot||0, interp);
      }
    }

    const s = worldToScreen(px, py, cam);
    // draw round human-like body
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(prot || 0);
    // body circle
    ctx.fillStyle = (p.id===myId)?'#0074D9':'#FF4136';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
    // simple head (slightly smaller circle)
    ctx.fillStyle = '#ffdca8';
    ctx.beginPath(); ctx.arc(0, -6, 7, 0, Math.PI*2); ctx.fill();
    // tool: small rectangle in front
    ctx.fillStyle = '#555';
    ctx.fillRect(10, -4, 10, 8);
    ctx.restore();

    // name & health & age
    ctx.fillStyle = 'black';
    ctx.font = '14px sans-serif';
    ctx.fillText(p.name||('P'+p.id), s.x-20, s.y-26);
    // health bar
    ctx.fillStyle = 'green';
    const healthW = Math.max(0, (p.health||0)/100)*40;
    ctx.fillRect(s.x-20, s.y-22, healthW, 5);
    ctx.strokeStyle = 'black'; ctx.strokeRect(s.x-20, s.y-22, 40, 5);

    // age indicator
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.fillText('Age '+(p.age||1), s.x-20, s.y+28);
  });

  // HUD crosshair
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.moveTo(W/2-10, H/2); ctx.lineTo(W/2+10, H/2); ctx.moveTo(W/2, H/2-10); ctx.lineTo(W/2, H/2+10); ctx.stroke();

  // schedule next frame
  requestAnimationFrame(draw);
}

// utility world->screen
function worldToScreen(x,y,cam){ return { x: W/2 + (x - cam.x), y: H/2 + (y - cam.y) }; }

// keep local predicted globals in sync with predictedLocal
setInterval(()=>{
  // seed predictedLocal from snapshot if absent
  if(!predictedLocal){
    const me = state.players.find(p=>p.id===myId);
    if(me) predictedLocal = { x: me.x, y: me.y };
  }
  // update predictedLocal rot from inputs
  if(predictedLocal){
    predictedLocal.rot = inputs.rot;
  }
}, 1000/60);

// start the render loop
requestAnimationFrame(draw);
