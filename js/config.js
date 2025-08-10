// js/config.js

export const TOWER = { BASIC: 'basic', LIGHTER: 'lighter', MINE: 'mine', SUPPLY: 'supply' };

export const TILE_SIZE = 32;
export const CHUNK_SIZE = 16;
export let CANVAS_W = window.innerWidth;
export let CANVAS_H = window.innerHeight;

// UPDATED: Reverted to the original, faster spawn interval.
export const spawnIntervalMs = 1700;
export const BUILD_TIME_SECONDS = 3.0;

export const COST = { basic: 20, lighter: 30, mine: 50, supply: 40 };

export const TOWER_RANGES = {
    [TOWER.BASIC]: 3.2,
    [TOWER.SUPPLY]: 7,
};

// --- GUI Configuration ---
export const GUI_CONFIG = {
    // Top Bar
    TOP_BAR_HEIGHT: 50,
    RESOURCE_COLOR: '#FFFFFF',
    RESOURCE_FONT: '20px sans-serif',

    // Hotbar
    HOTBAR_SLOT_SIZE: 60,
    HOTBAR_SLOT_GAP: 10,
    HOTBAR_Y_OFFSET: 20,
    HOTBAR_BG_COLOR: 'rgba(0, 0, 0, 0.4)',
    HOTBAR_BORDER_COLOR: '#555',
    HOTBAR_SELECTED_COLOR: '#8ff',

    // Tooltip
    TOOLTIP_BG_COLOR: 'rgba(0, 0, 0, 0.8)',
    TOOLTIP_BORDER_COLOR: '#888',
    TOOLTIP_WIDTH: 200,
    TOOLTIP_FONT_COLOR: '#FFFFFF',
    TOOLTIP_COST_COLOR: '#FFD700',
    TOOLTIP_FONT: '14px sans-serif',
    TOOLTIP_TITLE_FONT: 'bold 16px sans-serif',
};

// Defines the content and order of the hotbar
export const HOTBAR_TOWERS = [
    TOWER.BASIC,
    TOWER.LIGHTER,
    TOWER.MINE,
    TOWER.SUPPLY
];

export function updateCanvasSize() {
    CANVAS_W = window.innerWidth;
    CANVAS_H = window.innerHeight;
}
