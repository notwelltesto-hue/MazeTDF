// js/drawing.js

import { TILE_SIZE, CHUNK_SIZE, TOWER, CANVAS_W, CANVAS_H } from './config.js';
import { camera, gameState, GAME_SEED } from './state.js';
import { getChunk } from './world.js';
import { assets } from './assets.js';

export function drawGrid(ctx) { /* ... no changes ... */ }

export function drawTowers(ctx) {
    // Draw supply range for powered relays first
    ctx.fillStyle = 'rgba(150, 120, 255, 0.08)';
    const sources = [gameState.base, ...gameState.towers.filter(t => t.type === TOWER.SUPPLY && t.isPowered && !t.isConstructing)];
    for(const source of sources) {
        const range = source.supplyRange * TILE_SIZE;
        ctx.beginPath();
        ctx.arc((source.x + 0.5) * TILE_SIZE, (source.y + 0.5) * TILE_SIZE, range, 0, Math.PI * 2);
        ctx.fill();
    }

    for (const t of gameState.towers) {
        const cx = (t.x + 0.5) * TILE_SIZE;
        const cy = (t.y + 0.5) * TILE_SIZE;
        const size = TILE_SIZE;
        ctx.globalAlpha = t.isConstructing ? 0.5 + t.buildProgress * 0.5 : 1.0;

        if (t.type === TOWER.BASIC) { /* ... */ }
        else if (t.type === TOWER.LIGHTER) { /* ... */ }
        else if (t.type === TOWER.MINE) {
            if (assets.gemMine) ctx.drawImage(assets.gemMine, cx - size / 2, cy - size / 2, size, size);
            else { ctx.fillStyle = 'green'; ctx.beginPath(); ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2); ctx.fill(); }
        }
        else if (t.type === TOWER.SUPPLY) {
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
}

export function drawEnemies(ctx) { /* ... no changes ... */ }
export function drawProjectiles(ctx) { /* ... no changes ... */ }
export function drawHUD() { /* ... no changes ... */ }
export function drawGameOver(ctx) { /* ... no changes ... */ }
