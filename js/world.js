// js/world.js

import { CHUNK_SIZE } from './config.js';
import { GAME_SEED, gameState } from './state.js';

function mulberry32(a) {
    return function() {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
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
    // UPDATED: Increased wall probability for more maze-like structures
    const isWall = cellRng() < 0.33;
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
    const goalKey = `${Math.floor(goal.x)},${Math.floor(goal.y)}`;
    const q = [{ x: Math.floor(start.x), y: Math.floor(start.y), path: [] }];
    const visited = new Set([`${Math.floor(start.x)},${Math.floor(start.y)}`]);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (q.length > 0) {
        const cur = q.shift();
        const curKey = `${cur.x},${cur.y}`;
        if (curKey === goalKey) {
            return cur.path;
        }
        for (const d of dirs) {
            const nx = cur.x + d[0];
            const ny = cur.y + d[1];
            const key = `${nx},${ny}`;
            if (!visited.has(key) && getTile(nx, ny).tile === 0) {
                visited.add(key);
                const newPath = cur.path.slice();
                newPath.push({ x: nx, y: ny });
                q.push({ x: nx, y: ny, path: newPath });
            }
        }
    }
    return null;
}
