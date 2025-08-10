// js/main.js

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

let lastFrameTime = performance.now();
let animationFrameId = null;

function gameLoop(now) {
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    gameState.animationTimer += dt;

    updateCamera(dt);
    gameState.lastSpawn += dt * 1000;
    if (gameState.lastSpawn >= spawnIntervalMs) {
        entities.spawnEnemy(now);
        gameState.lastSpawn = 0;
    }
    entities.updateEnemies(dt);
    entities.updateProjectiles(dt);
    entities.updateTowers(dt);

    ctx.save();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    drawing.drawGrid(ctx);
    drawing.drawTowers(ctx);
    drawing.drawEnemies(ctx);
    drawing.drawProjectiles(ctx);
    drawing.drawHoverOverlay(ctx);
    drawing.drawPlacementPreview(ctx);
    ctx.restore();
    drawing.drawHUD();

    if (gameState.lives <= 0 || gameState.base.hp <= 0) {
        drawing.drawGameOver(ctx);
    } else {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function initGame(reseed = false) {
    if (reseed) {
        setSeed(Math.floor(Math.random() * 0x7fffffff));
    }
    resetState();
    // UPDATED: Reveal a larger area at the start
    world.revealArea(gameState.base.x, gameState.base.y, 5);
    gameState.allowSpawners = true;

    lastFrameTime = performance.now();
    camera.zoom = 1;
    camera.x = (gameState.base.x + 0.5) * TILE_SIZE - (CANVAS_W / 2);
    camera.y = (gameState.base.y + 0.5) * TILE_SIZE - (CANVAS_H / 2);
}

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

function handleMouseMove(ev) {
    const rect = canvas.getBoundingClientRect();
    const worldCoords = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    gameState.mouseGridPos = { x: worldCoords.x, y: worldCoords.y };
    gameState.hoveredTower = gameState.towers.find(t => t.x === worldCoords.x && t.y === worldCoords.y) || null;
}

canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const worldCoords = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    entities.placeTower(worldCoords.x, worldCoords.y, gameState.selectedTower);
});
canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const worldCoords = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    entities.cancelBuilding(worldCoords.x, worldCoords.y);
});
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === '1') gameState.selectedTower = TOWER.BASIC;
    else if (e.key === '2') gameState.selectedTower = TOWER.LIGHTER;
    else if (e.key === '3') gameState.selectedTower = TOWER.MINE;
    else if (e.key === '4') gameState.selectedTower = TOWER.SUPPLY;
    else if (e.key.toLowerCase() === 'r') {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        initGame(true);
        animationFrameId = requestAnimationFrame(gameLoop);
    }
});

document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

window.addEventListener('resize', () => {
    updateCanvasSize();
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
});

async function startGame() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingBar = document.getElementById('loading-bar');

    try {
        const onProgress = (progress) => {
            loadingBar.style.width = `${progress * 100}%`;
        };
        await loadAssets(onProgress);

        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 500);

        initGame(false);
        animationFrameId = requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error("Could not start game:", error);
        loadingOverlay.innerHTML = `<strong>Error:</strong> Could not load game assets. Please check the console (F12) for details.`;
    }
}

startGame();
