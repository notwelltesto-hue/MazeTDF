// js/assets.js

// This object will hold all our loaded images
export const assets = {};

// A list of all assets we want to load
const assetList = [
    { name: 'gemMine', src: 'media/gemMine.png' },

    // PREPARATION: Adding placeholders for future sprites.
    // The game will show an error for these until you create and add the images.
    // { name: 'basicTower', src: 'media/basicTower.png' },
    // { name: 'lighterTower', src: 'media/lighterTower.png' },
    // { name: 'enemy', src: 'media/enemy.png' },
];

let assetsLoaded = 0;

// This function returns a Promise that resolves when all assets are loaded or fail
export function loadAssets() {
    return new Promise((resolve) => {
        if (assetList.length === 0) {
            resolve();
            return;
        }

        const onAssetLoad = () => {
            assetsLoaded++;
            if (assetsLoaded === assetList.length) {
                resolve();
            }
        };

        assetList.forEach(assetInfo => {
            const img = new Image();
            img.src = assetInfo.src;
            img.onload = () => {
                assets[assetInfo.name] = img;
                onAssetLoad();
            };
            img.onerror = () => {
                console.error(`Failed to load asset: ${assetInfo.name} at ${assetInfo.src}`);
                onAssetLoad(); // Continue even if an asset fails
            }
        });
    });
}
