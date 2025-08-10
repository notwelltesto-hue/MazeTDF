// js/assets.js

// This object will hold all our loaded images
export const assets = {};

// A list of all assets we want to load
const assetList = [
    { name: 'gemMine', src: 'media/gemMine.png' }
    // We can add more assets here in the future (e.g., for other towers, enemies)
];

let assetsLoaded = 0;

// This function returns a Promise that resolves when all assets are loaded
export function loadAssets() {
    return new Promise((resolve, reject) => {
        if (assetList.length === 0) {
            resolve();
            return;
        }

        assetList.forEach(assetInfo => {
            const img = new Image();
            img.src = assetInfo.src;
            img.onload = () => {
                assets[assetInfo.name] = img;
                assetsLoaded++;
                if (assetsLoaded === assetList.length) {
                    resolve();
                }
            };
            img.onerror = () => {
                // If an asset fails to load, we reject the promise.
                console.error(`Failed to load asset: ${assetInfo.name} at ${assetInfo.src}`);
                reject(new Error(`Failed to load asset: ${assetInfo.name}`));
            }
        });
    });
}
