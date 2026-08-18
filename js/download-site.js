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
    'contracts/README.md',
    'contracts/Decentralized_FrontEnd_On_Optimsim_0x00000000004710af531cda9bed8447bc40bae6c8/metadata.json',
    'contracts/Decentralized_FrontEnd_On_Optimsim_0x00000000004710af531cda9bed8447bc40bae6c8/sources/B0xWebsiteFrontend.sol',
    'contracts/0xBitcoin_Token_0xBTC_0xc4d4fd4f4459730d176844c170f2bb323c87eb3b/metadata.json',
    'contracts/0xBitcoin_Token_0xBTC_0xc4d4fd4f4459730d176844c170f2bb323c87eb3b/standard-json-input.json',
    'contracts/B0x_Guess_0x57da35b42b97908255d5b1655dac6ed936fc3668/metadata.json',
    'contracts/B0x_Guess_0x57da35b42b97908255d5b1655dac6ed936fc3668/standard-json-input.json',
    'contracts/B0x_LP_Staking_Contract_0x08f489c5017942d3b7c82c1c178877c80492c948/metadata.json',
    'contracts/B0x_LP_Staking_Contract_0x08f489c5017942d3b7c82c1c178877c80492c948/standard-json-input.json',
    'contracts/B0x_Mainnet_Eth_Contract_0x1f8f212540b31b37f40d8c57b5c7d8b55bf25919/metadata.json',
    'contracts/B0x_Mainnet_Eth_Contract_0x1f8f212540b31b37f40d8c57b5c7d8b55bf25919/standard-json-input.json',
    'contracts/B0x_Token_0x6b19e31c1813cd00b0d47d798601414b79a3e8ad/metadata.json',
    'contracts/B0x_Token_0x6b19e31c1813cd00b0d47d798601414b79a3e8ad/standard-json-input.json',
    'contracts/B0x_Uniswap_Router_0x6c6b14b49cb4e9771c555689c2d11af9a7500a6f/metadata.json',
    'contracts/B0x_Uniswap_Router_0x6c6b14b49cb4e9771c555689c2d11af9a7500a6f/standard-json-input.json',
    'contracts/Position_Finder_Helper_Contract_0xe75af8215042b1919b1b1d38db72c0de56a5aebe/metadata.json',
    'contracts/Position_Finder_Helper_Contract_0xe75af8215042b1919b1b1d38db72c0de56a5aebe/standard-json-input.json',
    'contracts/PoW_Mining_Address_0xd44ee7dadbf50214ca7009a29d9f88bccd0e9ff4/metadata.json',
    'contracts/PoW_Mining_Address_0xd44ee7dadbf50214ca7009a29d9f88bccd0e9ff4/standard-json-input.json',
    'contracts/Timelock_Factory_0xff054c399444d64bd772ca4efe71c6449e08c955/metadata.json',
    'contracts/Timelock_Factory_0xff054c399444d64bd772ca4efe71c6449e08c955/standard-json-input.json',
    'contracts/Uniswap_Hook_Address_0x785319f8fce23cd733de94fd7f34b74a5caa1000/metadata.json',
    'contracts/Uniswap_Hook_Address_0x785319f8fce23cd733de94fd7f34b74a5caa1000/standard-json-input.json',
    'contracts/Uniswapv4PoolCreator_0x80d68014e12c76b60dba69c4d33e0ced06f602ef/metadata.json',
    'contracts/Uniswapv4PoolCreator_0x80d68014e12c76b60dba69c4d33e0ced06f602ef/standard-json-input.json',
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

// Live mainnet data (rich lists, Uniswap V4 positions, price history, etc.) isn't part
// of the static site — it's fetched at runtime from customDataSource (see js/settings.js),
// same as the app itself does throughout js/ui.js, js/charts.js and js/data-loader.js.
// Fetch fresh copies of all of it here so the zip ships the latest data rather than
// whatever happens to be cached in this browser.
//
// mined_blocks_mainnet.json and mainnet_uniswap_v4_data.json are the exceptions: they're
// built from this browser's own synced state instead (see the getCurrentMinedBlocksData()
// and getCurrentUniswapV4Data() calls below), so the zip ships exactly what "Download Mined
// Blocks" / "Download Uniswap Data" in Settings would produce rather than a fresh fetch of
// the remote files.
const MAINNET_DATA_DIR = 'mainnet/';
const MAINNET_DATA_FILENAMES = [
    'RichList_B0x_mainnet_miners.json',
    'RichList_B0x_mainnet.json',
    'B0x_Mainnet_APY_STATS.json',
    'price_data_bwork_mainnetv2.json',
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

// Public IPFS gateways resolve a deeply-nested path (like contracts/<name>/<file>)
// one DAG hop at a time, so firing 90+ requests at once - as this used to via a
// single Promise.all over SITE_FILES - routinely trips transient 502/504s on
// gateways like inbrowser.link. Fetching in small batches, with a short retry
// per file, keeps the download working without hammering the gateway, and
// means one flaky blip doesn't abort the whole zip the way Promise.all did.
const FETCH_CONCURRENCY = 3;
const FETCH_RETRIES = 3;
const FETCH_RETRY_DELAY_MS = 800;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(path, attempts = FETCH_RETRIES) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try {
            const response = await fetch(path, { cache: 'no-store' });
            if (response.ok) {
                return await response.blob();
            }
            lastErr = new Error(`Failed to fetch ${path}: ${response.status}`);
        } catch (err) {
            lastErr = err;
        }
        if (i < attempts - 1) {
            await sleep(FETCH_RETRY_DELAY_MS * (i + 1));
        }
    }
    throw lastErr;
}

// Runs `worker` over `items` with at most `limit` in flight at once.
async function runWithConcurrency(items, limit, worker) {
    let index = 0;
    async function next() {
        while (index < items.length) {
            const i = index++;
            await worker(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
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

        await runWithConcurrency(SITE_FILES, FETCH_CONCURRENCY, async (path) => {
            const blob = await fetchWithRetry(path);
            zip.file(ZIP_ROOT_FOLDER + path, blob);

            done += 1;
            if (btn) {
                btn.textContent = `Zipping... ${Math.round((done / SITE_FILES.length) * 100)}%`;
            }
        });

        if (btn) {
            btn.textContent = 'Fetching latest mainnet data...';
        }

        // Dynamic import() resolves relative to this file's own location (js/), so
        // './settings.js' reaches js/settings.js — a bare 'settings.js' (no leading
        // ./) would be rejected by browsers as an unmapped bare specifier.
        const { customDataSource, customBACKUPDataSource, getCurrentMinedBlocksData, getCurrentUniswapV4Data } = await import('./settings.js');
        const failedMainnetFiles = [];
        await Promise.all(MAINNET_DATA_FILENAMES.map(async (filename) => {
            const blob = await fetchLatestMainnetFile(filename, customDataSource, customBACKUPDataSource);
            if (blob) {
                zip.file(ZIP_ROOT_FOLDER + MAINNET_DATA_DIR + filename, blob);
            } else {
                failedMainnetFiles.push(filename);
            }
        }));

        // mined_blocks_mainnet.json ships this browser's own synced state (same data
        // "Download Mined Blocks" in Settings would save) instead of a fresh network
        // fetch, so the zip reflects what this dapp instance has actually seen. Only
        // fall back to fetching the remote copy if nothing has been synced yet.
        const minedBlocksData = getCurrentMinedBlocksData();
        if (minedBlocksData) {
            const minedBlocksBlob = new Blob([JSON.stringify(minedBlocksData, null, 2)], { type: 'application/json' });
            zip.file(ZIP_ROOT_FOLDER + MAINNET_DATA_DIR + 'mined_blocks_mainnet.json', minedBlocksBlob);
        } else {
            const fallbackBlob = await fetchLatestMainnetFile('mined_blocks_mainnet.json', customDataSource, customBACKUPDataSource);
            if (fallbackBlob) {
                zip.file(ZIP_ROOT_FOLDER + MAINNET_DATA_DIR + 'mined_blocks_mainnet.json', fallbackBlob);
            } else {
                failedMainnetFiles.push('mined_blocks_mainnet.json');
            }
        }

        // mainnet_uniswap_v4_data.json ships this browser's own synced state (same data
        // "Download Uniswap Data" in Settings would save) instead of a fresh network
        // fetch. Only fall back to fetching the remote copy if nothing has been synced yet.
        const uniswapData = getCurrentUniswapV4Data();
        if (uniswapData) {
            const uniswapBlob = new Blob([JSON.stringify(uniswapData, null, 2)], { type: 'application/json' });
            zip.file(ZIP_ROOT_FOLDER + MAINNET_DATA_DIR + 'mainnet_uniswap_v4_data.json', uniswapBlob);
        } else {
            const fallbackUniswapBlob = await fetchLatestMainnetFile('mainnet_uniswap_v4_data.json', customDataSource, customBACKUPDataSource);
            if (fallbackUniswapBlob) {
                zip.file(ZIP_ROOT_FOLDER + MAINNET_DATA_DIR + 'mainnet_uniswap_v4_data.json', fallbackUniswapBlob);
            } else {
                failedMainnetFiles.push('mainnet_uniswap_v4_data.json');
            }
        }

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
