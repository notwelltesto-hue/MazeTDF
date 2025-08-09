// client.js - simple canvas client

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width = innerWidth;
let H = canvas.height = innerHeight;

window.addEventListener('resize', () => {
  W = canvas.width = innerWidth;
  H = canvas.height = innerHeight;
});

const infoEl = document.getElementById('info');
const nameInput = document.getElementById('nameInput');
document.getElementById('setName').onclick = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'name', name: nameInput.value }));
  }
};

// --- FIXED: determine correct WS URL automatically ---
const wsProtocol = (location.protocol === 'https:') ? 'wss:' : 'ws:';
const wsHost = location.host; // includes port if any
const wsPath = '/ws';
const wsUrl = `${wsProtocol}//${wsHost}${wsPath}`;

let ws = new WebSocket(wsUrl);

// state
let myId = null;
let worldSize = 2000;
let state = { players: [], bullets: [], resources: [] };
let inputs = { up: false, down: false, left: false, right: false, rot: 0, shooting: false, seq: 0, shootingSeq: 0 };

ws.onopen = () => { infoEl.textContent = 'Connected. Use WASD / mouse. Click to shoot.'; };
ws.onmessage = (e) => {
  try {
    const data = JSON.parse(e.data);
    if (data.type === 'init') {
      myId = data.id; worldSize = data.worldSize;
    } else if (data.type === 'snapshot') {
      state = data;
    }
  } catch (e) { }
};
ws.onclose = () => { infoEl.textContent = 'Disconnected'; };

// input handlers
window.addEventListener('keydown', (e) => {
  if (e.key === 'w') inputs.up = true;
  if (e.key === 's') inputs.down = true;
  if (e.key === 'a') inputs.left = true;
  if (e.key === 'd') inputs.right = true;
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'w') inputs.up = false;
  if (e.key === 's') inputs.down = false;
  if (e.key === 'a') inputs.left = false;
  if (e.key === 'd') inputs.right = false;
});

canvas.addEventListener('mousemove', (e) => {
  const mx = e.clientX - W / 2;
  const my = e.clientY - H / 2;
  inputs.rot = Math.atan2(my, mx);
});
canvas.addEventListener('mousedown', (e) => { inputs.shooting = true; inputs.shootingSeq++; });
canvas.addEventListener('mouseup', (e) => { inputs.shooting = false; });

function sendInputs() {
  inputs.seq++;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'input',
      seq: inputs.seq,
      up: inputs.up, down: inputs.down, left: inputs.left, right: inputs.right,
      rot: inputs.rot,
      shooting: inputs.shooting,
      shootingSeq: inputs.shootingSeq
    }));
  }
}

function getMyPlayer() {
  return state.players.find(p => p.id === myId);
}

function worldToScreen(x, y, cam) {
  return { x: W / 2 + (x - cam.x), y: H / 2 + (y - cam.y) };
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  const me = getMyPlayer() || { x: 0, y: 0, rot: 0 };
  const cam = { x: me.x, y: me.y };

  // background grid
  ctx.fillStyle = '#cfeeff';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 1;
  for (let gx = -worldSize; gx <= worldSize; gx += 200) {
    const p1 = worldToScreen(gx, -worldSize, cam);
    const p2 = worldToScreen(gx, worldSize, cam);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }
  for (let gy = -worldSize; gy <= worldSize; gy += 200) {
    const p1 = worldToScreen(-worldSize, gy, cam);
    const p2 = worldToScreen(worldSize, gy, cam);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }

  // resources
  state.resources.forEach(r => {
    const s = worldToScreen(r.x, r.y, cam);
    ctx.fillStyle = '#157a1f';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, 18, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // bullets
  state.bullets.forEach(b => {
    const s = worldToScreen(b.x, b.y, cam);
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
  });

  // players
  state.players.forEach(p => {
    const s = worldToScreen(p.x, p.y, cam);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(p.rot || 0);
    ctx.fillStyle = (p.id === myId) ? '#0074D9' : '#FF4136';
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'black';
    ctx.font = '14px sans-serif';
    ctx.fillText(p.name || ('P' + p.id), s.x - 20, s.y - 28);
    ctx.fillStyle = 'green';
    const healthW = Math.max(0, (p.health || 0) / 100) * 40;
    ctx.fillRect(s.x - 20, s.y - 22, healthW, 5);
    ctx.strokeStyle = 'black'; ctx.strokeRect(s.x - 20, s.y - 22, 40, 5);
  });

  // crosshair
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 10, H / 2); ctx.lineTo(W / 2 + 10, H / 2);
  ctx.moveTo(W / 2, H / 2 - 10); ctx.lineTo(W / 2, H / 2 + 10);
  ctx.stroke();

  requestAnimationFrame(draw);
}

setInterval(sendInputs, 1000 / 20);
requestAnimationFrame(draw);
