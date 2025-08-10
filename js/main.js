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
    ctx.restore();
    drawing.drawHUD();

    if (gameState.lives <= 0 || gameState.base.hp <= 0) {
        drawing.drawGameOver(ctx);
    } else {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function initGame(reseed = false) { /* ... no changes ... */ }
function updateCamera(dt) { /* ... no changes ... */ }
function screenToWorld(sx, sy) { /* ... no changes ... */ }
function handleMouseMove(ev) { /* ... no changes ... */ }

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
window.addEventListener('resize', () => { /* ... no changes ... */ });
async function startGame() { /* ... no changes ... */ }
startGame();
