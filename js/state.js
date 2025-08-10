// js/state.js

function mulberry32(a) {
    return function() {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function parseSeed() {
    const params = new URLSearchParams(location.search);
    return params.get('seed') ? Number(params.get('seed')) || 0 : Math.floor(Math.random()*0x7fffffff);
}

export let GAME_SEED = parseSeed();
export let rng = mulberry32(GAME_SEED);

export const camera = { x: 0, y: 0, zoom: 1, speed: 400 };
export const keys = {};

export const gameState = {
    gems: 0,
    lives: 0,
    chunks: new Map(),
    towers: [],
    enemies: [],
    projectiles: [],
    spawnPoints: [],
    base: { x: 0, y: 0, hp: 500, maxHp: 500 }, // Base now has health
    lastSpawn: 0,
    selectedTower: 'basic',
    hoveredTower: null,
};

export function setSeed(newSeed) {
    GAME_SEED = newSeed | 0;
    rng = mulberry32(GAME_SEED);
}

export function resetState() {
    gameState.gems = 150;
    gameState.lives = 20;
    gameState.chunks = new Map();
    gameState.towers = [];
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.spawnPoints = [];
    gameState.base = { x: 0, y: 0, hp: 500, maxHp: 500, supplyRange: 7 };
    gameState.lastSpawn = 0;
    gameState.hoveredTower = null;
}
