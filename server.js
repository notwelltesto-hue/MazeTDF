// Maze TD Game with working pathfinding, shooting, and tower selection

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 800;

const TILE_SIZE = 32;
const MAZE_WIDTH = 25;
const MAZE_HEIGHT = 25;

const TOWER_TYPES = {
  BASIC: 'basic',
  LIGHTER: 'lighter',
  MINE: 'mine'
};
let selectedTowerType = TOWER_TYPES.BASIC;

let maze = [];
let fog = [];
let towers = [];
let enemies = [];
let projectiles = [];
let gems = 100;
let basePos = { x: Math.floor(MAZE_WIDTH / 2), y: Math.floor(MAZE_HEIGHT / 2) };

function generateMaze() {
  for (let y = 0; y < MAZE_HEIGHT; y++) {
    maze[y] = [];
    fog[y] = [];
    for (let x = 0; x < MAZE_WIDTH; x++) {
      maze[y][x] = Math.random() < 0.2 ? 1 : 0;
      fog[y][x] = true;
    }
  }
  maze[basePos.y][basePos.x] = 0;
  revealFog(basePos.x, basePos.y, 3);
}

function revealFog(cx, cy, radius) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x >= 0 && x < MAZE_WIDTH && y >= 0 && y < MAZE_HEIGHT) {
        fog[y][x] = false;
      }
    }
  }
}

function placeTower(x, y, type) {
  if (maze[y][x] === 0 && !towers.some(t => t.x === x && t.y === y) && !fog[y][x]) {
    let cost = type === TOWER_TYPES.BASIC ? 20 : type === TOWER_TYPES.LIGHTER ? 30 : 50;
    if (gems >= cost) {
      gems -= cost;
      towers.push({ x, y, type, cooldown: 0 });
      if (type === TOWER_TYPES.LIGHTER) revealFog(x, y, 4);
    }
  }
}

function findPath(sx, sy, tx, ty) {
  let queue = [{ x: sx, y: sy, path: [] }];
  let visited = Array.from({ length: MAZE_HEIGHT }, () => Array(MAZE_WIDTH).fill(false));
  visited[sy][sx] = true;

  while (queue.length) {
    let { x, y, path } = queue.shift();
    if (x === tx && y === ty) return path;

    for (let [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      let nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < MAZE_WIDTH && ny >= 0 && ny < MAZE_HEIGHT && !visited[ny][nx] && maze[ny][nx] === 0) {
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] });
      }
    }
  }
  return [];
}

function spawnEnemy() {
  enemies.push({ path: findPath(0, 0, basePos.x, basePos.y), step: 0, hp: 10 });
}

function updateEnemies() {
  enemies.forEach(e => {
    if (e.path.length > 0 && e.step < e.path.length - 1) {
      e.step += 0.02;
    }
  });
  enemies = enemies.filter(e => e.hp > 0);
}

function updateTowers() {
  towers.forEach(t => {
    if (t.type === TOWER_TYPES.BASIC) {
      if (t.cooldown > 0) t.cooldown--;
      else {
        let target = enemies.find(e => {
          let pos = e.path[Math.floor(e.step)];
          return pos && Math.hypot(pos.x - t.x, pos.y - t.y) < 5;
        });
        if (target) {
          let pos = target.path[Math.floor(target.step)];
          projectiles.push({ x: t.x, y: t.y, tx: pos.x, ty: pos.y, target });
          t.cooldown = 30;
        }
      }
    }
  });
}

function updateProjectiles() {
  projectiles.forEach(p => {
    p.x += (p.tx - p.x) * 0.2;
    p.y += (p.ty - p.y) * 0.2;
    if (Math.hypot(p.x - p.tx, p.y - p.ty) < 0.1) {
      p.target.hp -= 5;
    }
  });
  projectiles = projectiles.filter(p => p.target.hp > 0);
}

function drawMaze() {
  for (let y = 0; y < MAZE_HEIGHT; y++) {
    for (let x = 0; x < MAZE_WIDTH; x++) {
      ctx.fillStyle = fog[y][x] ? '#111' : maze[y][x] === 1 ? '#555' : '#999';
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

function drawTowers() {
  towers.forEach(t => {
    ctx.fillStyle = t.type === TOWER_TYPES.BASIC ? 'blue' : t.type === TOWER_TYPES.LIGHTER ? 'yellow' : 'green';
    ctx.beginPath();
    ctx.arc(t.x * TILE_SIZE + TILE_SIZE / 2, t.y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEnemies() {
  enemies.forEach(e => {
    let pos = e.path[Math.floor(e.step)];
    if (pos) {
      ctx.fillStyle = 'red';
      ctx.fillRect(pos.x * TILE_SIZE + 8, pos.y * TILE_SIZE + 8, TILE_SIZE - 16, TILE_SIZE - 16);
    }
  });
}

function drawProjectiles() {
  ctx.fillStyle = 'white';
  projectiles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x * TILE_SIZE + TILE_SIZE / 2, p.y * TILE_SIZE + TILE_SIZE / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHUD() {
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText(`Gems: ${gems}`, 10, 20);
  ctx.fillText(`Tower: ${selectedTowerType}`, 10, 40);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateEnemies();
  updateTowers();
  updateProjectiles();
  drawMaze();
  drawTowers();
  drawEnemies();
  drawProjectiles();
  drawHUD();
  requestAnimationFrame(gameLoop);
}

generateMaze();
placeTower(basePos.x, basePos.y, TOWER_TYPES.LIGHTER);
setInterval(spawnEnemy, 2000);
gameLoop();

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
  const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
  placeTower(x, y, selectedTowerType);
});

document.addEventListener('keydown', e => {
  if (e.key === '1') selectedTowerType = TOWER_TYPES.BASIC;
  if (e.key === '2') selectedTowerType = TOWER_TYPES.LIGHTER;
  if (e.key === '3') selectedTowerType = TOWER_TYPES.MINE;
});
