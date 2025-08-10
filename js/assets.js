// js/assets.js (Corrected)

// This object will hold all our loaded images
export const assets = {};

// A list of all assets we want to load
const assetList = [
    // FIX: The path is relative to index.html. Since they are in the same
    // root folder ('moomoo'), the path is simply 'media/gemMine.png'.
    { name: 'gemMine', src: 'media/gemMine.png' }
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
