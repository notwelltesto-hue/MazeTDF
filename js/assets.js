// js/assets.js

export const assets = {};

const assetList = [
    { name: 'gemMine', src: '/media/gemMine.png' },
    { name: 'lightTower', src: '/media/lightTower.png' },
    // UPDATED: This now points to your new cannon sprite
    { name: 'basicTower', src: '/media/basicTower.png' },
    { name: 'supplyRelayIcon', src: '/media/supplyRelay.png' }
];

let assetsLoaded = 0;

export function loadAssets(onProgress) {
    return new Promise((resolve) => {
        if (assetList.length === 0) {
            onProgress(1);
            resolve();
            return;
        }

        const onAssetLoad = () => {
            assetsLoaded++;
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
                onAssetLoad(); // Continue even if an asset fails
            }
        });
    });
}
