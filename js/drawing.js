// js/drawing.js

import { TILE_SIZE, CHUNK_SIZE, CANVAS_W, CANVAS_H, GUI_CONFIG, HOTBAR_TOWERS, COST, TOWER, TOWER_RANGES } from './config.js';
import { camera, gameState, guiState, GAME_SEED } from './state.js';
import { getChunk } from './world.js';
import { assets } from './assets.js';
import { canPlaceTower } from './entities.js';

export function drawGrid(ctx) {
    const view = { x: camera.x, y: camera.y, w: CANVAS_W / camera.zoom, h: CANVAS_H / camera.zoom };
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
            if (assets.basicTower) {
                ctx.save(); ctx.translate(cx, cy);
                ctx.rotate(t.angle + Math.PI / 2);
                ctx.drawImage(assets.basicTower, -size / 2, -size / 2, size, size);
                ctx.restore();
            } else {
                ctx.fillStyle = 'blue'; ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.3, 0, Math.PI * 2); ctx.fill();
            }
        } else if (t.type === TOWER.LIGHTER) {
            if (assets.lightTower) ctx.drawImage(assets.lightTower, cx - size / 2, cy - size / 2, size, size);
            else { ctx.fillStyle = 'gold'; ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.3, 0, Math.PI * 2); ctx.fill(); }
        } else if (t.type === TOWER.MINE) {
            if (assets.gemMine) ctx.drawImage(assets.gemMine, cx - size / 2, cy - size / 2, size, size);
            else { ctx.fillStyle = 'green'; ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.28, 0, Math.PI * 2); ctx.fill(); }
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
            ctx.fillStyle = '#555'; ctx.fillRect(cx - barWidth / 2, barY, barWidth, 5);
            ctx.fillStyle = '#f0d055'; ctx.fillRect(cx - barWidth / 2, barY, barWidth * t.buildProgress, 5);
        } else {
            const hpFrac = Math.max(0, t.hp) / t.maxHp;
            ctx.fillStyle = '#333'; ctx.fillRect(cx - barWidth / 2, barY, barWidth, 5);
            ctx.fillStyle = '#ff4136'; ctx.fillRect(cx - barWidth / 2, barY, barWidth * hpFrac, 5);
        }
    }
}

export function drawHoverOverlay(ctx) {
    const t = gameState.hoveredTower;
    if (!t) return;
    const cx = (t.x + 0.5) * TILE_SIZE;
    const cy = (t.y + 0.5) * TILE_SIZE;
    ctx.fillStyle = 'white'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
    if (t.isConstructing) ctx.fillText(`Building... ${Math.floor(t.buildProgress * 100)}%`, cx, cy - TILE_SIZE * 0.8);
    else ctx.fillText(`${Math.ceil(t.hp)} / ${t.maxHp}`, cx, cy - TILE_SIZE * 0.8);
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

export function drawPlacementPreview(ctx) {
    if (gameState.hoveredTower || guiState.isMouseOverGUI) return;
    const {x, y} = gameState.mouseGridPos;
    const type = HOTBAR_TOWERS[guiState.hotbarSlot];
    const cx = (x + 0.5) * TILE_SIZE;
    const cy = (y + 0.5) * TILE_SIZE;
    const size = TILE_SIZE;
    const isValid = canPlaceTower(x,y);
    ctx.globalAlpha = 0.5;
    let icon = null;
    if (type === TOWER.MINE) icon = assets.gemMine;
    else if (type === TOWER.LIGHTER) icon = assets.lightTower;
    else if (type === TOWER.BASIC) icon = assets.basicTower;
    else if (type === TOWER.SUPPLY) icon = assets.supplyRelayIcon;
    if (icon) {
        ctx.drawImage(icon, cx - size / 2, cy - size / 2, size, size);
    } else {
        ctx.fillStyle = isValid ? 'green' : 'red';
        ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    if (!isValid) {
        ctx.strokeStyle = 'red'; ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(cx - size/4, cy - size/4); ctx.lineTo(cx + size/4, cy + size/4);
        ctx.moveTo(cx + size/4, cy - size/4); ctx.lineTo(cx - size/4, cy + size/4);
        ctx.stroke();
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
        ctx.fillStyle = '#222'; ctx.fillRect(cx - 12, cy - 16, 24, 4);
        ctx.fillStyle = '#0f0'; ctx.fillRect(cx - 12, cy - 16, 24 * hpFrac, 4);
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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else { line = testLine; }
    }
    ctx.fillText(line, x, y);
}

const TOWER_INFO = {
    [TOWER.BASIC]: { name: "Basic Turret", desc: "A standard turret that fires projectiles at the nearest enemy." },
    [TOWER.LIGHTER]: { name: "Lighthouse", desc: "Reveals a large area of the map when placed, allowing you to build further out." },
    [TOWER.MINE]: { name: "Gem Mine", desc: "Must be placed on a gem node. Generates gems over time." },
    [TOWER.SUPPLY]: { name: "Supply Relay", desc: "Extends your building range, allowing you to create a forward base." },
};

function drawTooltip(ctx) {
    if (guiState.hoveredSlot === null) return;
    const towerType = HOTBAR_TOWERS[guiState.hoveredSlot];
    const info = TOWER_INFO[towerType];
    const cost = COST[towerType];
    const numSlots = HOTBAR_TOWERS.length;
    const totalWidth = numSlots * GUI_CONFIG.HOTBAR_SLOT_SIZE + (numSlots - 1) * GUI_CONFIG.HOTBAR_SLOT_GAP;
    const startX = (CANVAS_W - totalWidth) / 2;
    const slotX = startX + guiState.hoveredSlot * (GUI_CONFIG.HOTBAR_SLOT_SIZE + GUI_CONFIG.HOTBAR_SLOT_GAP);
    const tooltipY = CANVAS_H - GUI_CONFIG.HOTBAR_Y_OFFSET - GUI_CONFIG.HOTBAR_SLOT_SIZE - 20;
    const tooltipX = slotX + GUI_CONFIG.HOTBAR_SLOT_SIZE / 2;
    const tooltipHeight = 110;
    ctx.fillStyle = GUI_CONFIG.TOOLTIP_BG_COLOR; ctx.strokeStyle = GUI_CONFIG.TOOLTIP_BORDER_COLOR;
    ctx.lineWidth = 1; ctx.beginPath();
    ctx.roundRect(tooltipX - GUI_CONFIG.TOOLTIP_WIDTH / 2, tooltipY - tooltipHeight, GUI_CONFIG.TOOLTIP_WIDTH, tooltipHeight, 5);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = GUI_CONFIG.TOOLTIP_TITLE_FONT; ctx.fillStyle = GUI_CONFIG.TOOLTIP_FONT_COLOR;
    ctx.fillText(info.name, tooltipX - GUI_CONFIG.TOOLTIP_WIDTH / 2 + 10, tooltipY - tooltipHeight + 10);
    ctx.font = GUI_CONFIG.TOOLTIP_FONT; ctx.fillStyle = GUI_CONFIG.TOOLTIP_COST_COLOR; ctx.textAlign = 'right';
    ctx.fillText(`Cost: ${cost}`, tooltipX + GUI_CONFIG.TOOLTIP_WIDTH / 2 - 10, tooltipY - tooltipHeight + 10);
    ctx.textAlign = 'left'; ctx.fillStyle = GUI_CONFIG.TOOLTIP_FONT_COLOR;
    wrapText(ctx, info.desc, tooltipX - GUI_CONFIG.TOOLTIP_WIDTH / 2 + 10, tooltipY - tooltipHeight + 40, GUI_CONFIG.TOOLTIP_WIDTH - 20, 18);
}

function drawHotbar(ctx) {
    const numSlots = HOTBAR_TOWERS.length;
    const totalWidth = numSlots * GUI_CONFIG.HOTBAR_SLOT_SIZE + (numSlots - 1) * GUI_CONFIG.HOTBAR_SLOT_GAP;
    const startX = (CANVAS_W - totalWidth) / 2;
    const startY = CANVAS_H - GUI_CONFIG.HOTBAR_Y_OFFSET - GUI_CONFIG.HOTBAR_SLOT_SIZE;
    for (let i = 0; i < numSlots; i++) {
        const x = startX + i * (GUI_CONFIG.HOTBAR_SLOT_SIZE + GUI_CONFIG.HOTBAR_SLOT_GAP);
        const y = startY;
        ctx.fillStyle = GUI_CONFIG.HOTBAR_BG_COLOR; ctx.fillRect(x, y, GUI_CONFIG.HOTBAR_SLOT_SIZE, GUI_CONFIG.HOTBAR_SLOT_SIZE);
        const iconSize = GUI_CONFIG.HOTBAR_SLOT_SIZE * 0.8;
        const iconX = x + (GUI_CONFIG.HOTBAR_SLOT_SIZE - iconSize) / 2;
        const iconY = y + (GUI_CONFIG.HOTBAR_SLOT_SIZE - iconSize) / 2;
        let icon = null;
        const towerType = HOTBAR_TOWERS[i];
        if (towerType === TOWER.BASIC) icon = assets.basicTower;
        else if (towerType === TOWER.LIGHTER) icon = assets.lightTower;
        else if (towerType === TOWER.MINE) icon = assets.gemMine;
        else if (towerType === TOWER.SUPPLY) icon = assets.supplyRelayIcon;
        if (icon) ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
        ctx.strokeStyle = (i === guiState.hotbarSlot) ? GUI_CONFIG.HOTBAR_SELECTED_COLOR : GUI_CONFIG.HOTBAR_BORDER_COLOR;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, GUI_CONFIG.HOTBAR_SLOT_SIZE - 3, GUI_CONFIG.HOTBAR_SLOT_SIZE - 3);
        ctx.fillStyle = '#FFFFFF'; ctx.font = '14px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(i + 1, x + 5, y + 15);
    }
}

export function drawGUI(ctx) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = GUI_CONFIG.HOTBAR_BG_COLOR; ctx.fillRect(0, 0, CANVAS_W, GUI_CONFIG.TOP_BAR_HEIGHT);
    ctx.fillStyle = GUI_CONFIG.RESOURCE_COLOR; ctx.font = GUI_CONFIG.RESOURCE_FONT;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const textY = GUI_CONFIG.TOP_BAR_HEIGHT / 2;
    ctx.fillText(`Gems: ${gameState.gems}`, 20, textY);
    ctx.fillText(`Lives: ${gameState.lives}`, 150, textY);
    ctx.fillText(`Base HP: ${Math.ceil(gameState.base.hp)}/${gameState.base.maxHp}`, 280, textY);
    drawHotbar(ctx);
    drawTooltip(ctx);
    ctx.restore();
}

export function drawGameOver(ctx) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'white'; ctx.font = '36px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Game Over', CANVAS_W / 2, CANVAS_H / 2);
    ctx.restore();
}
