// js/drawing.js

import { TILE_SIZE, CHUNK_SIZE, COST, TOWER, CANVAS_W, CANVAS_H } from './config.js';
import { camera, gameState } from './state.js';
import { getChunk } from './world.js';

export function drawGrid(ctx) {
    const view = {
        x: camera.x, y: camera.y,
        w: CANVAS_W / camera.zoom / TILE_SIZE, h: CANVAS_H / camera.zoom / TILE_SIZE
    };
    const startCX = Math.floor(view.x / CHUNK_SIZE);
    const endCX = Math.ceil((view.x + view.w) / CHUNK_SIZE);
    const startCY = Math.floor(view.y / CHUNK_SIZE);
    const endCY = Math.ceil((view.y + view.h) / CHUNK_SIZE);

    for (let cy = startCY; cy < endCY; cy++) {
        for (let cx = startCX; cx < endCX; cx++) {
            const chunk = getChunk(cx, cy);
            const worldStartX = cx * CHUNK_SIZE;
            const worldStartY = cy * CHUNK_SIZE;
            for (let ly = 0; ly < CHUNK_SIZE; ly++) {
                for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                    const px = worldStartX + lx, py = worldStartY + ly;
                    if (chunk.fog[ly][lx]) {
                        ctx.fillStyle = '#0c0c0c';
                    } else {
                        ctx.fillStyle = chunk.tiles[ly][lx] === 1 ? '#3a3a3a' : '#bdbdbd';
                    }
                    ctx.fillRect(px, py, 1, 1); // Draw in tile units

                    if (!chunk.fog[ly][lx]) {
                        if (chunk.tiles[ly][lx] === 0) {
                            ctx.strokeStyle = '#a6a6a6';
                            ctx.strokeRect(px, py, 1, 1);
                        }
                        if (chunk.gemNodes[ly][lx]) {
                            ctx.fillStyle = '#8ff';
                            ctx.beginPath();
                            ctx.arc(px + 0.5, py + 0.5, 0.1, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            }
        }
    }
    // Base
    ctx.fillStyle = '#444'; ctx.fillRect(gameState.base.x, gameState.base.y, 1, 1);
    ctx.fillStyle = '#222'; ctx.fillRect(gameState.base.x + 0.2, gameState.base.y + 0.2, 0.6, 0.6);

    // Spawners
    gameState.spawnPoints.forEach(sp => {
        ctx.fillStyle = 'rgba(150, 0, 0, 0.7)';
        ctx.fillRect(sp.x, sp.y, 1, 1);
    });
}

export function drawTowers(ctx) {
    for (const t of gameState.towers) {
        const cx = t.x + 0.5, cy = t.y + 0.5;
        if (t.type === TOWER.BASIC) {
            ctx.fillStyle = 'blue'; ctx.beginPath(); ctx.arc(cx, cy, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(t.angle);
            ctx.fillStyle = '#0033cc'; ctx.fillRect(0, -0.15, 0.45, 0.3); ctx.restore();
        } else if (t.type === TOWER.LIGHTER) {
            ctx.fillStyle = 'gold'; ctx.beginPath(); ctx.arc(cx, cy, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,230,100,0.1)'; ctx.lineWidth = 0.1;
            ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.stroke();
        } else if (t.type === TOWER.MINE) {
            ctx.fillStyle = 'green'; ctx.beginPath(); ctx.arc(cx, cy, 0.28, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0a0'; ctx.fillRect(cx - 0.2, cy + 0.1, 0.4, 0.2);
        }
    }
}

export function drawEnemies(ctx) {
    const size = 0.6; // size in tile units
    for (const e of gameState.enemies) {
        ctx.fillStyle = 'crimson';
        ctx.fillRect(e.x - size / 2, e.y - size / 2, size, size);
        const hpFrac = Math.max(0, e.hp) / e.maxHp;
        ctx.fillStyle = '#222';
        ctx.fillRect(e.x - size / 2, e.y - size / 2 - 0.2, size, 0.15);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(e.x - size / 2, e.y - size / 2 - 0.2, size * hpFrac, 0.15);
    }
}

export function drawProjectiles(ctx) {
    ctx.fillStyle = 'yellow';
    for (const p of gameState.projectiles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.1, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function drawHUD() {
    const hud = document.getElementById('hud');
    hud.innerHTML = `Seed: <b>${gameState.seed}</b> &nbsp; Gems: <b>${gameState.gems}</b> &nbsp; Lives: <b>${gameState.lives}</b> &nbsp; Selected: <b>${gameState.selectedTower}</b> &nbsp; Spawners: ${gameState.spawnPoints.length}`;
}

export function drawGameOver(ctx) {
     ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
     ctx.fillStyle = 'white'; ctx.font = '36px sans-serif'; ctx.textAlign = 'center';
     ctx.fillText('Game Over', CANVAS_W / 2, CANVAS_H / 2);
}
