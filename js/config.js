// js/config.js

export const TILE_SIZE = 32;
export const CHUNK_SIZE = 16;
export let CANVAS_W = window.innerWidth - 30;
export let CANVAS_H = window.innerHeight - 150;

export const spawnIntervalMs = 1700;
export const BUILD_TIME_SECONDS = 3.0; // How long it takes to build a tower

export const COST = { basic: 20, lighter: 30, mine: 50, supply: 40 };
export const TOWER = { BASIC: 'basic', LIGHTER: 'lighter', MINE: 'mine', SUPPLY: 'supply' };

export function updateCanvasSize() {
    CANVAS_W = window.innerWidth - 30;
    CANVAS_H = window.innerHeight - 150;
}
