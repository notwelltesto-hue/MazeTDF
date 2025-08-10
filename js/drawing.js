// js/drawing.js (Corrected)

import { TILE_SIZE, CHUNK_SIZE, COST, TOWER, CANVAS_W, CANVAS_H } from './config.js';
// FIX: Import GAME_SEED to display in the HUD
import { camera, gameState, GAME_SEED } from './state.js';
import { getChunk } from './world.js';

export function drawGrid(ctx) {
    const view = {
        x: camera.x, y: camera.y,
        w: CANVAS_W / camera.zoom, h: CANVAS_H / camera.zoom
    };
    const startX = Math.floor(view.x / TILE_SIZE);
    const endX = Math.ceil((view.x + view.w) / TILE_SIZE);
    const startY = Math.floor(view.y / TILE_SIZE);
    const endY = Math.ceil((view.y + view.h) / TILE_SIZE);

    const startCX = Math.floor(startX / CHUNK_SIZE);
    const endCX = Math.ceil(endX / CHUNK_SIZE);
    const startCY = Math.floor(startY / CHUNK_SIZE);
    const endCY = Math.ceil(endY / CHUNK_SIZE);

    for (let cy = startCY; cy <= endCY; cy++) {
        for (let cx = startCX; cx <= endCX; cx++) {
            const chunk = getChunk(cx, cy);
            const worldStartX = cx * CHUNK_SIZE;
            const worldStartY = cy * CHUNK_SIZE;
            for (let ly = 0; ly < CHUNK_SIZE; ly++) {
                for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                    const px = (worldStartX + lx) * TILE_SIZE;
                    const py = (worldStartY + ly) * TILE_SIZE;

                    if (chunk.fog[ly][lx]) {
                        ctx.fillStyle = '#0c0c0c';
                    } else {
                        ctx.fillStyle = chunk.tiles[ly][lx] === 1 ? '#3a3a3a' : '#bdbdbd';
                    }
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                    if (!chunk.fog[ly][lx]) {
                        if (chunk.tiles[ly][lx] === 0) {
                            ctx.strokeStyle = '#a6a6a6';
                            ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                        }
                        if (chunk.gemNodes[ly][lx]) {
                            ctx.fillStyle = '#8ff';
                            ctx.beginPath();
                            ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 3, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            }
        }
    }
    // Base
    ctx.fillStyle = '#444'; ctx.fillRect(gameState.base.x * TILE_SIZE, gameState.base.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#222'; ctx.fillRect(gameState.base.x * TILE_SIZE + 6, gameState.base.y * TILE_SIZE + 6, TILE_SIZE - 12, TILE_SIZE - 12);

    // Spawners
    gameState.spawnPoints.forEach(sp => {
        ctx.fillStyle = 'rgba(150, 0, 0, 0.7)';
        ctx.fillRect(sp.x * TILE_SIZE, sp.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
}

export function drawTowers(ctx) {
    for (const t of gameState.towers) {
        const cx = (t.x + 0.5) * TILE_SIZE;
        const cy = (t.y + 0.5) * TILE_SIZE;
        if (t.type === TOWER.BASIC) {
            ctx.fillStyle = 'blue'; ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(t.angle);
            ctx.fillStyle = '#0033cc'; ctx.fillRect(0, -5, TILE_SIZE * 0.45, 10); ctx.restore();
        } else if (t.type === TOWER.LIGHTER) {
            ctx.fillStyle = 'gold'; ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,230,100,0.1)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 5, 0, Math.PI * 2); ctx.stroke();
        } else if (t.type === TOWER.MINE) {
            ctx.fillStyle = 'green'; ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.28, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0a0'; ctx.fillRect(cx - 6, cy + 4, 12, 6);
        }
    }
}

export function drawEnemies(ctx) {
    for (const e of gameState.enemies) {
        const cx = e.x * TILE_SIZE;
        const cy = e.y * TILE_SIZE;
        ctx.fillStyle = 'crimson';
        ctx.fillRect(cx - 10, cy - 10, 20, 20);
        const hpFrac = Math.max(0, e.hp) / e.maxHp;
        ctx.fillStyle = '#222';
        ctx.fillRect(cx - 12, cy - 16, 24, 4);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(cx - 12, cy - 16, 24 * hpFrac, 4);
    }
}

export function drawProjectiles(ctx) {
    ctx.fillStyle = 'yellow';
    for (const p of gameState.projectiles) {
        ctx.beginPath();
        ctx.arc(p.x * TILE_SIZE, p.y * TILE_SIZE, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function drawHUD() {
    const hud = document.getElementById('hud');
    // FIX: Used GAME_SEED instead of the non-existent gameState.seed
    hud.innerHTML = `Seed: <b>${GAME_SEED}</b> &nbsp; Gems: <b>${gameState.gems}</b> &nbsp; Lives: <b>${gameState.lives}</b> &nbsp; Selected: <b>${gameState.selectedTower}</b> &nbsp; Spawners: ${gameState.spawnPoints.length}`;
}

export function drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'white'; ctx.font = '36px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Game Over', CANVAS_W / 2, CANVAS_H / 2);
}
