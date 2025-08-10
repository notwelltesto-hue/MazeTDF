// js/main.js

import { CANVAS_W, CANVAS_H, TILE_SIZE, spawnIntervalMs, updateCanvasSize, HOTBAR_TOWERS, GUI_CONFIG, TOWER } from './config.js';
import { camera, keys, gameState, guiState, setSeed, resetState } from './state.js';
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

function updateEffects(dt) {
    for(let i = gameState.effects.length - 1; i >= 0; i--) {
        const effect = gameState.effects[i];
        effect.life -= dt;
        if (effect.life <= 0) {
            gameState.effects.splice(i, 1);
        }
    }
}

function gameLoop(now) {
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    gameState.animationTimer += dt;
    updateCamera(dt);
    gameState.lastSpawn += dt * 1000;
    while (gameState.lastSpawn >= spawnIntervalMs) {
        entities.spawnEnemy(now);
        gameState.lastSpawn -= spawnIntervalMs;
    }
    entities.updateEnemies(dt);
    entities.updateProjectiles(dt);
    entities.updateTowers(dt);
    updateEffects(dt);
    ctx.save();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    drawing.drawGrid(ctx);
    drawing.drawTowers(ctx);
    drawing.drawEnemies(ctx);
    drawing.drawProjectiles(ctx);
    drawing.drawEffects(ctx);
    drawing.drawHoverOverlay(ctx);
    drawing.drawPlacementPreview(ctx);
    ctx.restore();
    drawing.drawGUI(ctx);
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
    world.revealArea(gameState.base.x, gameState.base.y, 5);
    const startLighter = { x: gameState.base.x + 2, y: gameState.base.y, type: TOWER.LIGHTER, hp: 100, maxHp: 100, isConstructing: false, buildProgress: 1, };
    gameState.towers.push(startLighter);
    world.revealArea(startLighter.x, startLighter.y, 5);
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
    const mouseX = ev.clientX - rect.left;
    const mouseY = ev.clientY - rect.top;
    const worldCoords = screenToWorld(mouseX, mouseY);
    gameState.mouseGridPos = { x: worldCoords.x, y: worldCoords.y };
    gameState.hoveredTower = gameState.towers.find(t => t.x === worldCoords.x && t.y === worldCoords.y) || null;
    const numSlots = HOTBAR_TOWERS.length;
    const totalWidth = numSlots * GUI_CONFIG.HOTBAR_SLOT_SIZE + (numSlots - 1) * GUI_CONFIG.HOTBAR_SLOT_GAP;
    const startX = (CANVAS_W - totalWidth) / 2;
    const startY = CANVAS_H - GUI_CONFIG.HOTBAR_Y_OFFSET - GUI_CONFIG.HOTBAR_SLOT_SIZE;
    guiState.hoveredSlot = null;
    guiState.isMouseOverGUI = false;
    if (mouseY > startY && mouseY < startY + GUI_CONFIG.HOTBAR_SLOT_SIZE) {
        for(let i=0; i < numSlots; i++) {
            const slotX = startX + i * (GUI_CONFIG.HOTBAR_SLOT_SIZE + GUI_CONFIG.HOTBAR_SLOT_GAP);
            if(mouseX > slotX && mouseX < slotX + GUI_CONFIG.HOTBAR_SLOT_SIZE) {
                guiState.hoveredSlot = i;
                guiState.isMouseOverGUI = true;
                break;
            }
        }
    }
}

canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('click', (ev) => {
    if (guiState.isMouseOverGUI && guiState.hoveredSlot !== null) {
        guiState.hotbarSlot = guiState.hoveredSlot;
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const worldCoords = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    entities.placeTower(worldCoords.x, worldCoords.y);
});
canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    if (guiState.isMouseOverGUI) return;
    const rect = canvas.getBoundingClientRect();
    const worldCoords = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    entities.cancelBuilding(worldCoords.x, worldCoords.y);
});
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    const keyNum = parseInt(e.key);
    if (keyNum >= 1 && keyNum <= HOTBAR_TOWERS.length) {
        guiState.hotbarSlot = keyNum - 1;
    }
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
        const onProgress = (progress) => { loadingBar.style.width = `${progress * 100}%`; };
        await loadAssets(onProgress);
        loadingOverlay.style.opacity = '0';
        setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);
        initGame(false);
        animationFrameId = requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error("Could not start game:", error);
        loadingOverlay.innerHTML = `<strong>Error:</strong> Could not load game assets. Please check the console (F12) for details.`;
    }
}

startGame();
