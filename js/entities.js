// js/entities.js

import { gameState, rng } from './state.js';
import { COST, TOWER, BUILD_TIME_SECONDS } from './config.js';
import * as world from './world.js';

function normalizeAngle(a) { /* ... no changes ... */ }

function updateSupplyNetwork() {
    gameState.towers.forEach(t => { if (t.type === TOWER.SUPPLY) t.isPowered = false; });
    const queue = [gameState.base];
    const visited = new Set([`${gameState.base.x},${gameState.base.y}`]);
    while(queue.length > 0) {
        const source = queue.shift();
        const sourceRange = source.supplyRange || 0;
        for (const relay of gameState.towers) {
            if (relay.type === TOWER.SUPPLY && !relay.isPowered && !relay.isConstructing) {
                if (Math.hypot(relay.x - source.x, relay.y - source.y) <= sourceRange) {
                    relay.isPowered = true;
                    queue.push(relay);
                }
            }
        }
    }
}

function canPlaceTower(x, y, type) {
    const tile = world.getTile(x, y);
    if (tile.isFoggy || tile.tile === 1 || gameState.towers.some(t => t.x === x && t.y === y)) return false;
    if (type === TOWER.MINE && !tile.hasGemNode) return false;
    if (x === gameState.base.x && y === gameState.base.y) return false;

    const sources = [gameState.base, ...gameState.towers.filter(t => t.type === TOWER.SUPPLY && t.isPowered)];
    for(const source of sources) {
        if (Math.hypot(x - source.x, y - source.y) <= source.supplyRange) return true;
    }
    return false;
}

export function placeTower(x, y, type) {
    if (!canPlaceTower(x, y, type) || gameState.gems < COST[type]) return;
    gameState.gems -= COST[type];
    const tower = {
        x, y, type, cooldown: 0,
        fireRate: type === TOWER.BASIC ? 0.6 : 2.0,
        range: type === TOWER.BASIC ? 3.2 : 0,
        supplyRange: type === TOWER.SUPPLY ? 7 : 0,
        isPowered: false, angle: 0, mineTimer: 0,
        hp: 100, maxHp: 100,
        isConstructing: true, buildProgress: 0,
    };
    gameState.towers.push(tower);
    if (type === TOWER.LIGHTER) world.revealArea(x, y, 5);
}

export function cancelBuilding(x, y) {
    const towerIndex = gameState.towers.findIndex(t => t.x === x && t.y === y && t.isConstructing);
    if (towerIndex !== -1) {
        gameState.gems += COST[gameState.towers[towerIndex].type];
        gameState.towers.splice(towerIndex, 1);
    }
}

export function updateTowers(dt) {
    gameState.towers.forEach(t => {
        if (t.isConstructing) {
            t.buildProgress += dt / BUILD_TIME_SECONDS;
            if (t.buildProgress >= 1) {
                t.isConstructing = false;
                if(t.type === TOWER.SUPPLY) updateSupplyNetwork();
            }
        }
    });

    let networkNeedsUpdate = false;
    for (let i = gameState.towers.length - 1; i >= 0; i--) {
        if (gameState.towers[i].hp <= 0) {
            if(gameState.towers[i].type === TOWER.SUPPLY) networkNeedsUpdate = true;
            gameState.towers.splice(i, 1);
        }
    }
    if (networkNeedsUpdate) updateSupplyNetwork();

    for (const t of gameState.towers) {
        if (t.isConstructing) continue;
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
            } else { t.angle += 0.5 * dt; }
        } else if (t.type === TOWER.MINE) {
            t.mineTimer += dt;
            if (t.mineTimer >= 3.5) {
                gameState.gems += 10 + Math.floor(rng() * 8);
                t.mineTimer = 0;
            }
        }
    }
}

function findClosestTarget(enemy) {
    let closestTarget = gameState.base;
    let minDistance = Math.hypot(enemy.x - (gameState.base.x + 0.5), enemy.y - (gameState.base.y + 0.5));
    for(const tower of gameState.towers) {
        if(tower.isConstructing) continue;
        const distance = Math.hypot(enemy.x - (tower.x + 0.5), enemy.y - (tower.y + 0.5));
        if (distance < minDistance) {
            minDistance = distance;
            closestTarget = tower;
        }
    }
    return closestTarget;
}

export function spawnEnemy(gameTime) {
    if (gameState.spawnPoints.length === 0) return;
    const spawnPoint = gameState.spawnPoints[Math.floor(rng() * gameState.spawnPoints.length)];
    const maxHp = 20 + Math.floor(rng() * 20) + Math.floor(gameTime / 30000);
    gameState.enemies.push({ x: spawnPoint.x + 0.5, y: spawnPoint.y + 0.5, speed: 1.2 + rng() * 0.6, hp: maxHp, maxHp, path: [], target: null, attackCooldown: 0 });
}

export function updateEnemies(dt) {
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const e = gameState.enemies[i];
        if (e.hp <= 0) { gameState.enemies.splice(i, 1); continue; }
        e.attackCooldown -= dt;

        if (!e.target || e.target.hp <= 0) e.target = findClosestTarget(e);

        const targetPos = { x: e.target.x + 0.5, y: e.target.y + 0.5 };
        const distToTarget = Math.hypot(e.x - targetPos.x, e.y - targetPos.y);

        if (distToTarget < 0.8) {
            if (e.attackCooldown <= 0) {
                e.target.hp -= 10;
                e.attackCooldown = 1.0;
                if (e.target === gameState.base) gameState.lives--;
            }
        } else {
            e.path = world.findPath({x: Math.floor(e.x), y: Math.floor(e.y)}, {x: Math.floor(e.target.x), y: Math.floor(e.target.y)});
            if (e.path && e.path.length > 1) {
                const nextNode = e.path[1];
                const tx = nextNode.x + 0.5, ty = nextNode.y + 0.5;
                const distToNode = Math.hypot(tx - e.x, ty - e.y);
                const move = e.speed * dt;
                e.x += (tx - e.x) / distToNode * move;
                e.y += (ty - e.y) / distToNode * move;
            }
        }
    }
}

export function updateProjectiles(dt) { /* ... no changes ... */ }
