// Bundles every file this site ships with into a single .zip so it can be
// run offline later (see Run_Ubuntu_B0x_dAPP_offline.sh / run_Windows_B0x_dAPP_offline.bat).
// JSZip is vendored locally (js/vendor/jszip.min.js) rather than pulled from a CDN so this
// still works when the page is loaded from an IPFS gateway with no other network access.

const SITE_FILES = [
    'index.html',
    'style.css',
    'README.md',
    'Run_Ubuntu_B0x_dAPP_offline.sh',
    'run_Windows_B0x_dAPP_offline.bat',
    'z_runTheHTTP_Server.sh',
    'js/abis.js',
    'js/admin.js',
    'js/bridge.js',
    'js/charts.js',
    'js/config.js',
    'js/contracts.js',
    'js/convert.js',
    'js/countdown.js',
    'js/data-loader.js',
    'js/download-site.js',
    'js/init.js',
    'js/main.js',
    'js/max-buttons.js',
    'js/miner-info.js',
    'js/mining-calc.js',
    'js/pools.js',
    'js/positions.js',
    'js/positions-ratio.js',
    'js/settings.js',
    'js/staking.js',
    'js/swaps.js',
    'js/timelock.js',
    'js/ui.js',
    'js/utils.js',
    'js/wallet.js',
    'js/whitepaper.js',
    'js/vendor/jszip.min.js',
    'js/vendor/ethers.umd.min.js',
    'js/vendor/chart.min.js',
    'images/0xBTConBase.svg',
    'images/0xBTConETH.svg',
    'images/b0x-defi-title.svg',
    'images/b0x_logo_square.png',
    'images/b0x_logo_square.svg',
    'images/b0x_logo.svg',
    'images/B0xonBase.svg',
    'images/B0xonETH.svg',
    'images/b0x-title.svg',
    'images/b0x-title-zerox.svg',
    'images/ETHonBase.svg',
    'images/ETHonETH.svg',
    'images/favicon.ico',
    'images/favicon.svg',
    'images/RightsTo0xBTConBase.svg',
    'images/RightsTo0xBTConETH.svg',
    'images/USDConBase.svg',
    'images/WETHonBase.svg',
    'images/WETHonETH.svg',
];

// Live mainnet data (rich lists, mined blocks, Uniswap V4 positions, price history, etc.)
// isn't part of the static site — it's fetched at runtime from customDataSource (see
// js/settings.js), same as the app itself does throughout js/ui.js, js/charts.js and
// js/data-loader.js. Fetch fresh copies of all of it here so the zip ships the latest
// data rather than whatever happens to be cached in this browser.
const MAINNET_DATA_DIR = 'mainnet/';
const MAINNET_DATA_FILENAMES = [
    'RichList_B0x_mainnet_miners.json',
    'RichList_B0x_mainnet.json',
    'B0x_Mainnet_APY_STATS.json',
    'mined_blocks_mainnet.json',
    'price_data_bwork_mainnetv2.json',
    'mainnet_uniswap_v4_data.json',
    'RichList_RightsTo0xBTC_mainnet_ETH_holders.json',
    'RichList__Mainnet_ETH_holders.json',
    'GuessB0xStakerBalances.json',
    'B0x_Staking_Rich_List_logs_mainnet.json',
];

// Tries the primary data source first, falls back to the backup mirror, and returns
// null (rather than throwing) if neither has the file — one missing file shouldn't
// abort the whole zip.
async function fetchLatestMainnetFile(filename, primaryBase, backupBase) {
    for (const base of [primaryBase, backupBase]) {
        try {
            const response = await fetch(base + filename, { cache: 'no-store' });
            if (response.ok) {
                return await response.blob();
            }
        } catch (err) {
            // try the next source
        }
    }
    return null;
}

const ZIP_FILENAME = 'B0x_dAPP_Website.zip';
// Every entry is nested under this folder so unzipping doesn't dump files straight into
// whatever directory the user unzips it in — it creates (and unzips into) its own folder.
const ZIP_ROOT_FOLDER = 'B0x_dAPP_Website/';

function toast(message, isError = false) {
    if (typeof window.showToast === 'function') {
        window.showToast(message, isError);
    }
}

async function downloadSiteAsZip() {
    const btn = document.getElementById('downloadSiteBtn');
    const originalBtnText = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Zipping... 0%';
    }

    try {
        const zip = new JSZip();
        let done = 0;

        await Promise.all(SITE_FILES.map(async (path) => {
            const response = await fetch(path, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Failed to fetch ${path}: ${response.status}`);
            }
            const blob = await response.blob();
            zip.file(ZIP_ROOT_FOLDER + path, blob);

            done += 1;
            if (btn) {
                btn.textContent = `Zipping... ${Math.round((done / SITE_FILES.length) * 100)}%`;
            }
        }));

        if (btn) {
            btn.textContent = 'Fetching latest mainnet data...';
        }

        // Dynamic import() resolves relative to this file's own location (js/), so
        // './settings.js' reaches js/settings.js — a bare 'settings.js' (no leading
        // ./) would be rejected by browsers as an unmapped bare specifier.
        const { customDataSource, customBACKUPDataSource } = await import('./settings.js');
        const failedMainnetFiles = [];
        await Promise.all(MAINNET_DATA_FILENAMES.map(async (filename) => {
            const blob = await fetchLatestMainnetFile(filename, customDataSource, customBACKUPDataSource);
            if (blob) {
                zip.file(ZIP_ROOT_FOLDER + MAINNET_DATA_DIR + filename, blob);
            } else {
                failedMainnetFiles.push(filename);
            }
        }));

        if (btn) {
            btn.textContent = 'Building zip...';
        }

        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = ZIP_FILENAME;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        if (failedMainnetFiles.length) {
            toast(`Downloaded ${ZIP_FILENAME} (couldn't reach the data server for: ${failedMainnetFiles.join(', ')}).`, true);
        } else {
            toast('Downloaded ' + ZIP_FILENAME + ' for offline use.');
        }
    } catch (err) {
        console.error('Site download failed:', err);
        toast('Failed to build offline zip: ' + err.message, true);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalBtnText;
        }
    }
}

window.downloadSiteAsZip = downloadSiteAsZip;
