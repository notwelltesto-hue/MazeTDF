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

function getCellPriority(x, y) {
    const h = (GAME_SEED ^ (x * 374761393) ^ (y * 668265263)) >>> 0;
    const cellRng = mulberry32(h);
    return cellRng();
}

function deterministicMazeTile(x, y) {
    const isRoomX = Math.abs(x % 2) === 1;
    const isRoomY = Math.abs(y % 2) === 1;

    if (isRoomX && isRoomY) {
        return { tile: 0, gem: getCellPriority(x,y) < 0.05 };
    }

    if (!isRoomX && !isRoomY) {
        return { tile: 1, gem: false };
    }

    const r1x = isRoomX ? x : x - 1;
    const r1y = isRoomY ? y : y - 1;
    const r2x = isRoomX ? x : x + 1;
    const r2y = isRoomY ? y : y + 1;

    const p1 = getCellPriority(r1x, r1y);
    const p2 = getCellPriority(r2x, r2y);

    const highP_x = p1 > p2 ? r1x : r2x;
    const highP_y = p1 > p2 ? r1y : r2y;

    const neighbors = [
        { x: highP_x, y: highP_y - 2, priority: getCellPriority(highP_x, highP_y - 2) },
        { x: highP_x + 2, y: highP_y, priority: getCellPriority(highP_x + 2, highP_y) },
        { x: highP_x, y: highP_y + 2, priority: getCellPriority(highP_x, highP_y + 2) },
        { x: highP_x - 2, y: highP_y, priority: getCellPriority(highP_x - 2, highP_y) },
    ];

    let minPriority = Infinity;
    let parentX = 0, parentY = 0;
    for(const n of neighbors) {
        if (n.priority < minPriority) {
            minPriority = n.priority;
            parentX = n.x;
            parentY = n.y;
        }
    }

    const wallConnectsToParent = (r1x === parentX && r1y === parentY) || (r2x === parentX && r2y === parentY);

    if (wallConnectsToParent) {
        return { tile: 0, gem: false };
    }

    return { tile: 1, gem: false };
}

function worldToChunkCoords(worldX, worldY) {
    const cx = Math.floor(worldX / CHUNK_SIZE);
    const cy = Math.floor(worldY / CHUNK_SIZE);
    const lx = worldX - cx * CHUNK_SIZE;
    const ly = worldY - cy * CHUNK_SIZE;
    return { cx, cy, lx, ly };
}

function generateChunk(cx, cy) {
    const chunk = {
        tiles: Array.from({ length: CHUNK_SIZE }, () => Array(CHUNK_SIZE)),
        fog: Array.from({ length: CHUNK_SIZE }, () => Array(CHUNK_SIZE).fill(true)),
        gemNodes: Array.from({ length: CHUNK_SIZE }, () => Array(CHUNK_SIZE)),
    };
    const worldStartX = cx * CHUNK_SIZE;
    const worldStartY = cy * CHUNK_SIZE;

    // First Pass: Generate the chunk based on the maze algorithm
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            const worldX = worldStartX + lx;
            const worldY = worldStartY + ly;
            const det = deterministicMazeTile(worldX, worldY);
            chunk.tiles[ly][lx] = det.tile;
            chunk.gemNodes[ly][lx] = det.gem;
        }
    }

    // Second Pass (only for the starting chunk): Guarantee a clear area and minimum gems
    if (cx === 0 && cy === 0) {
        const STARTING_CLEAR_RADIUS = 3;
        const MIN_GEMS = 3;
        let gemCount = 0;
        const potentialGemSpots = [];

        // Clear the area, count existing gems, and find spots for new ones
        for (let y = -STARTING_CLEAR_RADIUS; y <= STARTING_CLEAR_RADIUS; y++) {
            for (let x = -STARTING_CLEAR_RADIUS; x <= STARTING_CLEAR_RADIUS; x++) {
                if (Math.hypot(x, y) > STARTING_CLEAR_RADIUS) continue;

                const { cx: cxt, cy: cyt, lx, ly } = worldToChunkCoords(x, y);
                if (cxt === 0 && cyt === 0) {
                    // Force path
                    chunk.tiles[ly][lx] = 0;

                    if (chunk.gemNodes[ly][lx]) {
                        gemCount++;
                    } else if (x !== 0 || y !== 0) { // Can't place a gem on the base tile
                        potentialGemSpots.push({lx, ly});
                    }
                }
            }
        }

        // Add gems if the count is below the minimum
        let gemsToAdd = MIN_GEMS - gemCount;
        // Shuffle potential spots for random placement
        for (let i = potentialGemSpots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [potentialGemSpots[i], potentialGemSpots[j]] = [potentialGemSpots[j], potentialGemSpots[i]];
        }

        while (gemsToAdd > 0 && potentialGemSpots.length > 0) {
            const spot = potentialGemSpots.pop();
            chunk.gemNodes[spot.ly][spot.lx] = true;
            gemsToAdd--;
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
    if (!gameState.allowSpawners) return;
    let isEdgeOfDarkness = false;
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (getTile(x + d[0], y + d[1]).isFoggy) {
            isEdgeOfDarkness = true;
            break;
        }
    }
    if (!isEdgeOfDarkness) return;
    if (gameState.spawnPoints.some(sp => Math.hypot(sp.x - x, sp.y - y) < 15)) return;
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
