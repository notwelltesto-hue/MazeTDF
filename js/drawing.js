// js/drawing.js

import { TILE_SIZE, CHUNK_SIZE, TOWER, CANVAS_W, CANVAS_H, COST } from './config.js';
import { camera, gameState, GAME_SEED } from './state.js';
import { getChunk, getTile } from './world.js';
import { assets } from './assets.js';
import { canPlaceTower } from './entities.js';

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

                    ctx.fillStyle = chunk.fog[ly][lx] ? '#0c0c0c' : (chunk.tiles[ly][lx] === 1 ? '#3a3a3a' : '#bdbdbd');
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                    if (!chunk.fog[ly][lx]) {
                        if (chunk.tiles[ly][lx] === 0) {
                            ctx.strokeStyle = '#a6a6a6';
                            ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                        }
                        if (chunk.gemNodes[ly][lx]) {
                            ctx.fillStyle = '#8ff';
                            ctx.beginPath(); ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 3, 0, Math.PI * 2); ctx.fill();
                        }
                    }
                }
            }
        }
    }
    ctx.fillStyle = '#444'; ctx.fillRect(gameState.base.x * TILE_SIZE, gameState.base.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#222'; ctx.fillRect(gameState.base.x * TILE_SIZE + 6, gameState.base.y * TILE_SIZE + 6, TILE_SIZE - 12, TILE_SIZE - 12);
    gameState.spawnPoints.forEach(sp => {
        ctx.fillStyle = 'rgba(150, 0, 0, 0.7)';
        ctx.fillRect(sp.x * TILE_SIZE, sp.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
}

function drawSupplyLines(ctx) {
    ctx.lineWidth = 2;
    const pulse = Math.sin(gameState.animationTimer * 4) * 0.25 + 0.75;
    ctx.strokeStyle = `rgba(220, 200, 255, ${pulse})`;

    for(const t of gameState.towers) {
        if(t.isPowered && t.powerSource) {
            ctx.beginPath();
            ctx.moveTo((t.x + 0.5) * TILE_SIZE, (t.y + 0.5) * TILE_SIZE);
            ctx.lineTo((t.powerSource.x + 0.5) * TILE_SIZE, (t.powerSource.y + 0.5) * TILE_SIZE);
            ctx.stroke();
        }
    }
}

export function drawTowers(ctx) {
    drawSupplyLines(ctx);

    const baseRange = gameState.base.supplyRange * TILE_SIZE;
    ctx.fillStyle = 'rgba(150, 120, 255, 0.08)';
    ctx.beginPath();
    ctx.arc((gameState.base.x + 0.5) * TILE_SIZE, (gameState.base.y + 0.5) * TILE_SIZE, baseRange, 0, Math.PI * 2);
    ctx.fill();

    for (const t of gameState.towers) {
        const cx = (t.x + 0.5) * TILE_SIZE;
        const cy = (t.y + 0.5) * TILE_SIZE;
        const size = TILE_SIZE;
        ctx.globalAlpha = t.isConstructing ? 0.5 + t.buildProgress * 0.5 : 1.0;

        if (t.type === TOWER.BASIC) {
            ctx.fillStyle = 'blue'; ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(t.angle);
            ctx.fillStyle = '#0033cc'; ctx.fillRect(0, -5, TILE_SIZE * 0.45, 10); ctx.restore();
        } else if (t.type === TOWER.LIGHTER) {
            // Lighters don't emit light, they reveal an area once.
            ctx.fillStyle = 'gold'; ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.3, 0, Math.PI * 2); ctx.fill();
        } else if (t.type === TOWER.MINE) {
            if (assets.gemMine) {
                ctx.drawImage(assets.gemMine, cx - size / 2, cy - size / 2, size, size);
            } else {
                ctx.fillStyle = 'green'; ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.28, 0, Math.PI * 2); ctx.fill();
            }
        } else if (t.type === TOWER.SUPPLY) {
            ctx.fillStyle = t.isPowered ? '#d4a3ff' : '#6b5380';
            ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.35, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = t.isPowered ? '#fff' : '#aaa';
            ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.2, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
        const barWidth = TILE_SIZE * 0.8;
        const barY = cy - TILE_SIZE * 0.6;
        if (t.isConstructing) {
            ctx.fillStyle = '#555';
            ctx.fillRect(cx - barWidth / 2, barY, barWidth, 5);
            ctx.fillStyle = '#f0d055';
            ctx.fillRect(cx - barWidth / 2, barY, barWidth * t.buildProgress, 5);
        } else {
            const hpFrac = Math.max(0, t.hp) / t.maxHp;
            ctx.fillStyle = '#333';
            ctx.fillRect(cx - barWidth / 2, barY, barWidth, 5);
            ctx.fillStyle = '#ff4136';
            ctx.fillRect(cx - barWidth / 2, barY, barWidth * hpFrac, 5);
        }
    }
}

export function drawHoverOverlay(ctx) {
    const t = gameState.hoveredTower;
    if (!t) return;
    const cx = (t.x + 0.5) * TILE_SIZE;
    const cy = (t.y + 0.5) * TILE_SIZE;
    ctx.fillStyle = 'white'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
    if (t.isConstructing) {
        ctx.fillText(`Building... ${Math.floor(t.buildProgress * 100)}%`, cx, cy - TILE_SIZE * 0.8);
    } else {
        ctx.fillText(`${Math.ceil(t.hp)} / ${t.maxHp}`, cx, cy - TILE_SIZE * 0.8);
    }
    const range = (t.range > 0 ? t.range : t.supplyRange) * TILE_SIZE;
    if (range > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 12]);
        ctx.lineDashOffset = -gameState.animationTimer * 50;
        ctx.beginPath(); ctx.arc(cx, cy, range, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
    }
}

const TOWER_RANGES = {
    [TOWER.BASIC]: 3.2,
    [TOWER.SUPPLY]: 7,
};

export function drawPlacementPreview(ctx) {
    if (gameState.hoveredTower) return; // Don't draw if hovering over an existing tower

    const {x, y} = gameState.mouseGridPos;
    const type = gameState.selectedTower;
    const cx = (x + 0.5) * TILE_SIZE;
    const cy = (y + 0.5) * TILE_SIZE;

    const isValid = canPlaceTower(x,y);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = isValid ? 'green' : 'red';

    if (type === TOWER.MINE && assets.gemMine) {
         ctx.drawImage(assets.gemMine, cx - TILE_SIZE / 2, cy - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    } else {
        ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.3, 0, Math.PI * 2); ctx.fill();
    }

    const range = (TOWER_RANGES[type] || 0) * TILE_SIZE;
    if(range > 0) {
        ctx.strokeStyle = isValid ? 'white' : 'red';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, range, 0, Math.PI*2); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
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
    hud.innerHTML = `Seed: <b>${GAME_SEED}</b> &nbsp; Gems: <b>${gameState.gems}</b> &nbsp; Lives: <b>${gameState.lives}</b> &nbsp; Selected: <b>${gameState.selectedTower}</b> &nbsp; Spawners: ${gameState.spawnPoints.length}`;
}

export function drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'white'; ctx.font = '36px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Game Over', CANVAS_W / 2, CANVAS_H / 2);
}
