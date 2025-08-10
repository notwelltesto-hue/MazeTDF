// js/main.js

import { CANVAS_W, CANVAS_H, TILE_SIZE, spawnIntervalMs, updateCanvasSize, TOWER } from './config.js';
import { camera, keys, gameState, setSeed, resetState } from './state.js';
import * as world from './world.js';
import * as entities from './entities.js';
import * as drawing from './drawing.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// ---------- Game Loop & Core Functions ----------
let lastFrameTime = performance.now();

function gameLoop(now) {
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    updateCamera(dt);

    gameState.lastSpawn += dt * 1000;
    if (gameState.lastSpawn >= spawnIntervalMs) {
        entities.spawnEnemy(now);
        gameState.lastSpawn = 0;
    }

    entities.updateEnemies(dt);
    entities.updateTowers(dt);
    entities.updateProjectiles(dt);

    // --- Drawing ---
    ctx.save();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x * TILE_SIZE, -camera.y * TILE_SIZE);

    // Set line width for all scaled drawings
    ctx.lineWidth = 1 / TILE_SIZE;

    // Scale all drawing operations by tile size
    ctx.save();
    ctx.scale(TILE_SIZE, TILE_SIZE);
    drawing.drawGrid(ctx);
    drawing.drawTowers(ctx);
    drawing.drawEnemies(ctx);
    drawing.drawProjectiles(ctx);
    ctx.restore();

    ctx.restore();
    drawing.drawHUD();

    if (gameState.lives <= 0) {
        drawing.drawGameOver(ctx);
    } else {
        requestAnimationFrame(gameLoop);
    }
}

// ---------- Initialization ----------
function initGame(reseed = false) {
    if (!reseed) {
        setSeed(Math.floor(Math.random() * 0x7fffffff));
    }
    resetState();

    world.revealArea(gameState.base.x, gameState.base.y, 4);
    entities.placeTower(gameState.base.x + 1, gameState.base.y, TOWER.LIGHTER);

    lastFrameTime = performance.now();

    camera.zoom = 1;
    camera.x = gameState.base.x + 0.5 - (CANVAS_W / 2 / TILE_SIZE);
    camera.y = gameState.base.y + 0.5 - (CANVAS_H / 2 / TILE_SIZE);

    // Start the game loop if it's not the first time
    if (reseed) {
       requestAnimationFrame(gameLoop);
    }
}

// ---------- Input & Camera ----------
function updateCamera(dt) {
    const moveSpeed = camera.speed * dt / camera.zoom;
    if (keys['w']) camera.y -= moveSpeed / TILE_SIZE;
    if (keys['s']) camera.y += moveSpeed / TILE_SIZE;
    if (keys['a']) camera.x -= moveSpeed / TILE_SIZE;
    if (keys['d']) camera.x += moveSpeed / TILE_SIZE;
    if (keys['q']) camera.zoom *= (1 + dt);
    if (keys['e']) camera.zoom *= (1 - dt);
    camera.zoom = Math.max(0.3, Math.min(camera.zoom, 4));
}

function screenToWorld(x, y) {
    const worldX = x / camera.zoom + camera.x * TILE_SIZE;
    const worldY = y / camera.zoom + camera.y * TILE_SIZE;
    return { x: worldX / TILE_SIZE, y: worldY / TILE_SIZE };
}

canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const worldCoords = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    entities.placeTower(Math.floor(worldCoords.x), Math.floor(worldCoords.y), gameState.selectedTower);
});

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === '1') gameState.selectedTower = TOWER.BASIC;
    else if (e.key === '2') gameState.selectedTower = TOWER.LIGHTER;
    else if (e.key === '3') gameState.selectedTower = TOWER.MINE;
    else if (e.key.toLowerCase() === 'r') {
        initGame(true);
    }
});

document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

window.addEventListener('resize', () => {
    updateCanvasSize();
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
});

// --- Start Game ---
initGame(false);
requestAnimationFrame(gameLoop);
