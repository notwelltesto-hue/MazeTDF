// js/world.js (Corrected)

import { CHUNK_SIZE } from './config.js';
import { GAME_SEED, gameState, rng } from './state.js';

// Internal function for seeded random numbers
function mulberry32(a) {
    return function() {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function worldToChunkCoords(worldX, worldY) {
    const cx = Math.floor(worldX / CHUNK_SIZE);
    const cy = Math.floor(worldY / CHUNK_SIZE);
    const lx = worldX - cx * CHUNK_SIZE;
    const ly = worldY - cy * CHUNK_SIZE;
    return { cx, cy, lx, ly };
}

function deterministicTile(x, y) {
    const h = (GAME_SEED ^ (x * 374761393) ^ (y * 668265263)) >>> 0;
    const cellRng = mulberry32(h);
    const isWall = cellRng() < 0.28;
    const hasGem = cellRng() < 0.12;
    return { tile: isWall ? 1 : 0, gem: !isWall && hasGem };
}

function generateChunk(cx, cy) {
    const chunk = {
        tiles: Array.from({ length: CHUNK_SIZE }, () => Array(CHUNK_SIZE)),
        fog: Array.from({ length: CHUNK_SIZE }, () => Array(CHUNK_SIZE).fill(true)),
        gemNodes: Array.from({ length: CHUNK_SIZE }, () => Array(CHUNK_SIZE)),
    };
    const worldStartX = cx * CHUNK_SIZE;
    const worldStartY = cy * CHUNK_SIZE;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            const det = deterministicTile(worldStartX + lx, worldStartY + ly);
            chunk.tiles[ly][lx] = det.tile;
            chunk.gemNodes[ly][lx] = det.gem;
        }
    }
    return chunk;
}

// FIX: Added 'export' so other modules can use this function.
export function getChunk(cx, cy) {
    const key = `${cx},${cy}`;
    if (!gameState.chunks.has(key)) {
        gameState.chunks.set(key, generateChunk(cx, cy));
    }
    return gameState.chunks.get(key);
}

export function getTile(worldX, worldY) {
    const { cx, cy, lx, ly } = worldToChunkCoords(worldX, worldY);
    const chunk = getChunk(cx, cy);
    return {
        tile: chunk.tiles[ly][lx],
        isFoggy: chunk.fog[ly][lx],
        hasGemNode: chunk.gemNodes[ly][lx]
    };
}

export function revealArea(worldX, worldY, radius) {
    for (let y = worldY - radius; y <= worldY + radius; y++) {
        for (let x = worldX - radius; x <= worldX + radius; x++) {
            if (Math.hypot(x - worldX, y - worldY) > radius) continue;

            const { cx, cy, lx, ly } = worldToChunkCoords(x, y);
            const chunk = getChunk(cx, cy);
            if (chunk.fog[ly][lx]) {
                chunk.fog[ly][lx] = false;
                if (chunk.tiles[ly][lx] === 0) {
                    scanForNewSpawner(x, y);
                }
            }
        }
    }
}

function scanForNewSpawner(x, y) {
    let isEdgeOfDarkness = false;
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (getTile(x + d[0], y + d[1]).isFoggy) {
            isEdgeOfDarkness = true;
            break;
        }
    }
    if (!isEdgeOfDarkness) return;
    if (gameState.spawnPoints.some(sp => Math.hypot(sp.x - x, sp.y - y) < 10)) return;

    if (findPath({ x, y }, gameState.base)) {
        gameState.spawnPoints.push({ x, y });
    }
}

export function findPath(start, goal) {
    const q = [{ x: start.x, y: start.y }];
    const visited = new Set([`${start.x},${start.y}`]);
    const prev = new Map();
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (q.length) {
        const cur = q.shift();
        if (cur.x === goal.x && cur.y === goal.y) {
            const path = [];
            let p = cur;
            while (p) {
                path.unshift(p);
                p = prev.get(`${p.x},${p.y}`);
            }
            return path;
        }
        for (const d of dirs) {
            const nx = cur.x + d[0], ny = cur.y + d[1];
            const key = `${nx},${ny}`;
            if (!visited.has(key) && getTile(nx, ny).tile === 0) {
                visited.add(key);
                prev.set(key, cur);
                q.push({ x: nx, y: ny });
            }
        }
    }
    return null;
}
