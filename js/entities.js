// js/entities.js

import { gameState, rng } from './state.js';
import { COST, TOWER } from './config.js';
import * as world from './world.js';

function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
}

// --- Towers ---
function canPlaceTower(x, y, type) {
    const tile = world.getTile(x, y);
    if (tile.isFoggy || tile.tile === 1) return false;
    if (gameState.towers.some(t => t.x === x && t.y === y)) return false;
    if (type === TOWER.MINE && !tile.hasGemNode) return false;
    if (gameState.spawnPoints.some(sp => sp.x === x && sp.y === y)) return false;
    if (x === gameState.base.x && y === gameState.base.y) return false;
    return true;
}

export function placeTower(x, y, type) {
    if (!canPlaceTower(x, y, type)) return;
    if (gameState.gems < COST[type]) return;

    gameState.gems -= COST[type];
    gameState.towers.push({ x, y, type, cooldown: 0, fireRate: type === TOWER.BASIC ? 0.6 : 2.0, range: type === TOWER.BASIC ? 3.2 : 0, angle: 0, mineTimer: 0 });

    if (type === TOWER.LIGHTER) {
        world.revealArea(x, y, 5);
    }
}

export function updateTowers(dt) {
    // Kill enemies before towers act
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        if (gameState.enemies[i].hp <= 0) {
            gameState.gems += 5 + Math.floor(rng() * 5);
            gameState.enemies.splice(i, 1);
        }
    }

    for (const t of gameState.towers) {
        if (t.type === TOWER.BASIC) {
            t.cooldown -= dt;
            let target = null, best = Infinity;
            for (const e of gameState.enemies) {
                const d = Math.hypot((t.x + 0.5) - e.x, (t.y + 0.5) - e.y);
                if (d <= t.range && d < best) { best = d; target = e; }
            }
            if (target) {
                const desired = Math.atan2(target.y - (t.y + 0.5), target.x - (t.x + 0.5));
                const diff = normalizeAngle(desired - t.angle);
                t.angle += Math.sign(diff) * Math.min(Math.abs(diff), 7.0 * dt);
                if (t.cooldown <= 0 && Math.abs(diff) < 0.1) {
                    gameState.projectiles.push({ x: t.x + 0.5, y: t.y + 0.5, vx: Math.cos(t.angle) * 8.0, vy: Math.sin(t.angle) * 8.0, target: target, life: 1.2 });
                    t.cooldown = t.fireRate;
                }
            } else {
                t.angle += 0.5 * dt;
            }
        } else if (t.type === TOWER.MINE) {
            t.mineTimer += dt;
            if (t.mineTimer >= 3.5) {
                gameState.gems += 10 + Math.floor(rng() * 8);
                t.mineTimer = 0;
            }
        }
    }
}

// --- Enemies ---
function recomputeEnemyPath(e) {
    const p = world.findPath({ x: Math.floor(e.x), y: Math.floor(e.y) }, gameState.base);
    if (p) { e.path = p; e.idx = 0; }
}

export function spawnEnemy(gameTime) {
    if (gameState.spawnPoints.length === 0) return;
    const spawnPoint = gameState.spawnPoints[Math.floor(rng() * gameState.spawnPoints.length)];
    const path = world.findPath(spawnPoint, gameState.base);
    if (!path) return;

    const maxHp = 20 + Math.floor(rng() * 20) + Math.floor(gameTime / 30000); // Scale with time
    gameState.enemies.push({ path, idx: 0, x: path[0].x + 0.5, y: path[0].y + 0.5, speed: 1.2 + rng() * 0.6, hp: maxHp, maxHp });
}

export function updateEnemies(dt) {
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const e = gameState.enemies[i];
        if (!e.path || e.idx >= e.path.length - 1) {
            if (e.path) gameState.lives -= 1;
            gameState.enemies.splice(i, 1);
            continue;
        }
        const target = e.path[e.idx + 1];
        const tx = target.x + 0.5, ty = target.y + 0.5;
        const dist = Math.hypot(tx - e.x, ty - e.y);
        const move = e.speed * dt;
        if (dist <= move) {
            e.x = tx; e.y = ty; e.idx++;
        } else {
            e.x += (tx - e.x) / dist * move;
            e.y += (ty - e.y) / dist * move;
        }
    }
    // Re-check for defeated enemies after movement
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
       if (gameState.enemies[i].hp <= 0) {
           gameState.gems += 5 + Math.floor(rng() * 5);
           gameState.enemies.splice(i, 1);
       }
   }
}


// --- Projectiles ---
export function updateProjectiles(dt) {
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const p = gameState.projectiles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.target?.hp > 0 && Math.hypot(p.x - p.target.x, p.y - p.target.y) < 0.5) {
            p.target.hp -= 7;
            gameState.projectiles.splice(i, 1);
            continue;
        }
        if (p.life <= 0 || p.target?.hp <= 0) {
            gameState.projectiles.splice(i, 1);
        }
    }
}
