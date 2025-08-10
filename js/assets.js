// js/assets.js

export const assets = {};

const assetList = [
    { name: 'gemMine', src: '/media/gemMine.png' },
    // ADDED: New asset for the Lighter Tower
    { name: 'lightTower', src: '/media/lightTower.png' }
];

let assetsLoaded = 0;

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
