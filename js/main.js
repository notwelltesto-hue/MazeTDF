// js/main.js (Corrected)

import { CANVAS_W, CANVAS_H, TILE_SIZE, spawnIntervalMs, updateCanvasSize, TOWER } from './config.js';
import { camera, keys, gameState, setSeed, resetState } from './state.js';
import * as world from './world.js';
import * as entities from './entities.js';
import * as drawing from './drawing.js';
import { loadAssets } from './assets.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// ---------- Game Loop & Core Functions ----------
let lastFrameTime = performance.now();
let animationFrameId = null; // To control the game loop

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
    ctx.translate(-camera.x, -camera.y);

    drawing.drawGrid(ctx);
    drawing.drawTowers(ctx);
    drawing.drawEnemies(ctx);
    drawing.drawProjectiles(ctx);

    ctx.restore();
    drawing.drawHUD();

    if (gameState.lives <= 0) {
        drawing.drawGameOver(ctx);
    } else {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// ---------- Initialization ----------
function initGame(reseed = false) {
    if (reseed) {
        setSeed(Math.floor(Math.random() * 0x7fffffff));
    }
    resetState();

    world.revealArea(gameState.base.x, gameState.base.y, 4);
    entities.placeTower(gameState.base.x + 1, gameState.base.y, TOWER.LIGHTER);

    lastFrameTime = performance.now();

    camera.zoom = 1;
    camera.x = (gameState.base.x + 0.5) * TILE_SIZE - (CANVAS_W / 2);
    camera.y = (gameState.base.y + 0.5) * TILE_SIZE - (CANVAS_H / 2);
}

// ---------- Input & Camera ----------
function updateCamera(dt) {
    const moveSpeed = camera.speed * dt / camera.zoom;
    if (keys['w']) camera.y -= moveSpeed;
    if (keys['s']) camera.y += moveSpeed;
    if (keys['a']) camera.x -= moveSpeed;
    if (keys['d']) camera.x += moveSpeed;
    if (keys['q']) camera.zoom *= (1 + dt);
    if (keys['e']) camera.zoom *= (1 - dt);
    camera.zoom = Math.max(0.3, Math.min(camera.zoom, 4));
}

function screenToWorld(sx, sy) {
    const worldX = sx / camera.zoom + camera.x;
    const worldY = sy / camera.zoom + camera.y;
    return { x: Math.floor(worldX / TILE_SIZE), y: Math.floor(worldY / TILE_SIZE) };
}

canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const worldCoords = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    entities.placeTower(worldCoords.x, worldCoords.y, gameState.selectedTower);
});

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === '1') gameState.selectedTower = TOWER.BASIC;
    else if (e.key === '2') gameState.selectedTower = TOWER.LIGHTER;
    else if (e.key === '3') gameState.selectedTower = TOWER.MINE;
    else if (e.key.toLowerCase() === 'r') {
        // FIX: Properly cancel the old loop and restart with the new state
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        initGame(true);
        requestAnimationFrame(gameLoop);
    }
});

document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

window.addEventListener('resize', () => {
    updateCanvasSize();
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
});

// --- Start Game ---
async function startGame() {
    const hud = document.getElementById('hud');
    try {
        hud.innerHTML = 'Loading assets...';
        await loadAssets();
        initGame(false);
        animationFrameId = requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error("Could not start game:", error);
        hud.innerHTML = `<strong>Error:</strong> Could not load game assets. Please check the console (F12) for details.`;
    }
}

startGame();
