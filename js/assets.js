// js/assets.js

export const assets = {};

const assetList = [
    { name: 'gemMine', src: '/media/gemMine.png' },
    { name: 'lightTower', src: '/media/lightTower.png' }
];

let assetsLoaded = 0;

// UPDATED: The function now takes a progress callback
export function loadAssets(onProgress) {
    return new Promise((resolve) => {
        if (assetList.length === 0) {
            onProgress(1); // Report 100% if no assets
            resolve();
            return;
        }

        const onAssetLoad = () => {
            assetsLoaded++;
            // Call the callback with the new progress
            onProgress(assetsLoaded / assetList.length);
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
                onAssetLoad();
            }
        });
    });
}
