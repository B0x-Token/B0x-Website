/**
 * @module settings
 * @description Settings management and localStorage operations
 *
 * This module handles all application settings including:
 * - RPC URL configuration (Base and Ethereum networks)
 * - Data source URLs (primary and backup)
 * - Staking reward contract addresses
 * - Minimum staking and holdings thresholds
 * - User selection tracking for positions
 */

// Import dependencies
import {
    defaultRPC_Base,
    defaultRPC_ETH,
    defaultDataSource_Testnet,
    defaultBACKUPDataSource_Testnet,
    defaultAddresses,
    appSettings,
    contractAddressLPRewardsStaking
} from './config.js';

import { showToast, showSuccessNotification, showErrorNotification } from './ui.js';

// ============================================
// STATE VARIABLES
// ============================================

/**
 * Custom RPC URL for Base network
 * @type {string}
 */
export let customRPC = defaultRPC_Base;

/**
 * Custom RPC URL for Ethereum network
 * @type {string}
 */
export let customRPC_ETH = defaultRPC_ETH;

/**
 * Primary data source URL for leaderboard/position data
 * @type {string}
 */
export let customDataSource = defaultDataSource_Testnet;

/**
 * Backup data source URL
 * @type {string}
 */
export let customBACKUPDataSource = defaultBACKUPDataSource_Testnet;

/**
 * Current settings for staking reward addresses
 * @type {Object}
 */
export let currentSettingsAddresses = {
    contractAddresses: defaultAddresses
};

/**
 * User's selected position (for tracking manual selections)
 * @type {string|null}
 */
export let userSelectedPosition = null;

/**
 * Auto-fetch reward tokens toggle state
 * @type {boolean}
 */
export let autoFetchRewardTokens = true;

/**
 * Cache duration for reward tokens (24 hours in milliseconds)
 * @constant {number}
 */
const REWARD_TOKENS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Flag to track if user has made a manual selection
 * @type {boolean}
 */
export let hasUserMadeSelection = false;

/**
 * Counter for position dropdown update function calls
 * @type {number}
 */
export let functionCallCounter = 0;
export function incrementFunctionCallCounter() {
    functionCallCounter++;
}

// ============================================
// CONFIG OBJECT (for data-loader compatibility)
// ============================================

/**
 * CONFIG object used by data-loader module
 * This will be populated with runtime values
 */
export const CONFIG = {
    RPC_URL: customRPC,
    DATA_URL: customDataSource,
    START_BLOCK: 35937447,
    MAX_LOGS_PER_REQUEST: 499,
    MAX_BLOCKS_PER_REQUEST: 499,
    MAX_RETRIES: 5,
    BASE_RETRY_DELAY: 1000,
    RATE_LIMIT_DELAY: 250,
    NFT_ADDRESS: "0x7C5f5A4bBd8fD63184577525326123B519429bDc",
    MULTICALL_ADDRESS: "0xcA11bde05977b3631167028862bE2a173976CA11",
    TRANSFER_TOPIC: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    TARGET_POOL_KEY: {
        currency0: "0x6B19E31C1813cD00b0d47d798601414b79A3e8AD",
        currency1: "0xc4D4FD4F4459730d176844c170F2bB323c87Eb3B",
        fee: 8388608,
        tickSpacing: 60,
        hooks: "0x785319f8fCE23Cd733DE94Fd7f34b74A5cAa1000"
    }
};

// ============================================
// SETTERS (for updating exported values)
// ============================================

export function setCustomRPC(value) { customRPC = value; CONFIG.RPC_URL = value; }
export function setCustomRPC_ETH(value) { customRPC_ETH = value; }
export function setCustomDataSource(value) { customDataSource = value; CONFIG.DATA_URL = value; }
export function setCustomBACKUPDataSource(value) { customBACKUPDataSource = value; }
export function setUserSelectedPosition(value) { userSelectedPosition = value; }
export function setHasUserMadeSelection(value) { hasUserMadeSelection = value; }
export function setAutoFetchRewardTokens(value) { autoFetchRewardTokens = value; }

// ============================================
// AUTO-FETCH TOGGLE MANAGEMENT
// ============================================

/**
 * Saves the auto-fetch reward tokens toggle state to localStorage
 * @param {boolean} enabled - Whether auto-fetch is enabled
 */
export function saveAutoFetchToggle(enabled) {
    autoFetchRewardTokens = enabled;
    localStorage.setItem('autoFetchRewardTokens', JSON.stringify(enabled));
    console.log('Auto-fetch reward tokens setting saved:', enabled);
}

/**
 * Loads the auto-fetch toggle state from localStorage
 * @returns {boolean} Whether auto-fetch is enabled (defaults to true)
 */
export function loadAutoFetchToggle() {
    const saved = localStorage.getItem('autoFetchRewardTokens');
    if (saved !== null) {
        autoFetchRewardTokens = JSON.parse(saved);
    } else {
        autoFetchRewardTokens = true; // Default to enabled
    }
    return autoFetchRewardTokens;
}

/**
 * Checks if the reward tokens cache is still valid (within 24 hours)
 * @returns {boolean} True if cache is valid, false if expired or doesn't exist
 */
export function isRewardTokensCacheValid() {
    const cacheTimestamp = localStorage.getItem('rewardTokensCacheTimestamp');
    if (!cacheTimestamp) {
        return false;
    }

    const timestamp = parseInt(cacheTimestamp, 10);
    const now = Date.now();
    const isValid = (now - timestamp) < REWARD_TOKENS_CACHE_DURATION;

    console.log(`Reward tokens cache: ${isValid ? 'valid' : 'expired'} (age: ${Math.round((now - timestamp) / 1000 / 60)} minutes)`);
    return isValid;
}

/**
 * Updates the reward tokens cache timestamp
 */
export function updateRewardTokensCacheTimestamp() {
    localStorage.setItem('rewardTokensCacheTimestamp', Date.now().toString());
    console.log('Reward tokens cache timestamp updated');
}

/**
 * Clears the reward tokens cache (forces refresh on next load)
 */
export function clearRewardTokensCache() {
    localStorage.removeItem('rewardTokensCacheTimestamp');
    console.log('Reward tokens cache cleared');
}

// ============================================
// RPC URL MANAGEMENT - BASE NETWORK
// ============================================

/**
 * Saves custom RPC URL for Base network to localStorage
 * @async
 * @returns {Promise<void>}
 */
export async function saveCustomRPC_Base() {
    const customRPCElement = document.getElementById('customRPC');

    if (!customRPCElement || !customRPCElement.value.trim()) {
        showToast('Please enter a valid RPC URL', true);
        return;
    }

    try {
        customRPC = customRPCElement.value.trim();
        CONFIG.RPC_URL = customRPC;

        console.log('customRPC Saved:', customRPC);

        localStorage.setItem('customRPCValue_Base', customRPC);
        showSuccessMessage('rpcSuccess');
        showToast('Base RPC URL saved successfully');

        // Reconnect wallet if connected
        if (window.walletConnected) {
            // Trigger wallet reconnection
            if (window.connect2) {
                await window.connect2();
            }
        }
    } catch (error) {
        console.error('Error saving custom RPC:', error);
        showToast('Failed to save RPC URL', true);
    }
}

/**
 * Restores default RPC URL for Base network
 * @returns {void}
 */
export function restoreDefaultRPC_Base() {
    const customRPCElement = document.getElementById('customRPC');
    if (customRPCElement) {
        customRPCElement.value = defaultRPC_Base;
    }
    customRPC = defaultRPC_Base;
    CONFIG.RPC_URL = defaultRPC_Base;

    console.log('Base RPC restored to defaults');
    saveCustomRPC_Base();
}

// ============================================
// RPC URL MANAGEMENT - ETHEREUM NETWORK
// ============================================

/**
 * Saves custom RPC URL for Ethereum network to localStorage
 * @async
 * @returns {Promise<void>}
 */
export async function saveCustomRPC_ETH() {
    const customRPCElement = document.getElementById('customRPC_ETH');

    if (!customRPCElement || !customRPCElement.value.trim()) {
        showToast('Please enter a valid RPC URL', true);
        return;
    }

    try {
        customRPC_ETH = customRPCElement.value.trim();

        console.log('customRPC_ETH Saved:', customRPC_ETH);

        localStorage.setItem('customRPCValue_ETH', customRPC_ETH);
        showSuccessMessage('rpcSuccess');
        showToast('Ethereum RPC URL saved successfully');

        // Reconnect wallet if connected
        if (window.walletConnected) {
            if (window.connect2) {
                await window.connect2();
            }
        }
    } catch (error) {
        console.error('Error saving custom RPC ETH:', error);
        showErrorToast('Failed to save Ethereum RPC URL');
    }
}

/**
 * Restores default RPC URL for Ethereum network
 * @returns {void}
 */
export function restoreDefaultRPC_ETH() {
    const customRPCElement = document.getElementById('customRPC_ETH');
    if (customRPCElement) {
        customRPCElement.value = defaultRPC_ETH;
    }
    customRPC_ETH = defaultRPC_ETH;

    console.log('Ethereum RPC restored to defaults');
    saveCustomRPC_ETH();
}

// ============================================
// DATA SOURCE MANAGEMENT
// ============================================

/**
 * Saves custom data source URL to localStorage
 * @async
 * @returns {Promise<void>}
 */
export async function saveCustomDataSource_Testnet() {
    const dataSourceElement = document.getElementById('customDataSource');

    if (!dataSourceElement || !dataSourceElement.value.trim()) {
        showErrorToast('Please enter a valid data source URL');
        return;
    }

    try {
        customDataSource = dataSourceElement.value.trim();
        CONFIG.DATA_URL = customDataSource;

        console.log('customDataSource Saved:', customDataSource);

        localStorage.setItem('customDataSource_Testnet', customDataSource);
        showSuccessMessage('dataSourceSuccess');
        showToast('Data source URL saved successfully');

        // Reconnect if wallet is connected
        if (window.walletConnected && window.connect2) {
            await window.connect2();
        }
    } catch (error) {
        console.error('Error saving custom data source:', error);
        showErrorToast('Failed to save data source URL');
    }
}

/**
 * Restores default data source URL
 * @returns {void}
 */
export function restoreDefaultCustomDataSource() {
    const dataSourceElement = document.getElementById('customDataSource');
    if (dataSourceElement) {
        dataSourceElement.value = defaultDataSource_Testnet;
    }
    customDataSource = defaultDataSource_Testnet;
    CONFIG.DATA_URL = defaultDataSource_Testnet;

    console.log('Data source restored to defaults');
    saveCustomDataSource_Testnet();
}

/**
 * Saves backup custom data source URL to localStorage
 * @async
 * @returns {Promise<void>}
 */
export async function saveBACKUPCustomDataSource_Testnet() {
    const backupDataSourceElement = document.getElementById('BACKUPcustomDataSource');

    if (!backupDataSourceElement || !backupDataSourceElement.value.trim()) {
        showErrorToast('Please enter a valid backup data source URL');
        return;
    }

    try {
        customBACKUPDataSource = backupDataSourceElement.value.trim();

        console.log('customBACKUPDataSource Saved:', customBACKUPDataSource);

        localStorage.setItem('customDataSource_BACKUP_Testnet', customBACKUPDataSource);
        showSuccessMessage('dataBACKUPSourceSuccess');
        showToast('Backup data source URL saved successfully');

        if (window.walletConnected && window.connect2) {
            await window.connect2();
        }
    } catch (error) {
        console.error('Error saving backup data source:', error);
        showErrorToast('Failed to save backup data source URL');
    }
}

/**
 * Restores default backup data source URL
 * @returns {void}
 */
export function restoreDefaultBACKUPCustomDataSource() {
    const backupDataSourceElement = document.getElementById('BACKUPcustomDataSource');
    if (backupDataSourceElement) {
        backupDataSourceElement.value = defaultBACKUPDataSource_Testnet;
    }
    customBACKUPDataSource = defaultBACKUPDataSource_Testnet;

    console.log('Backup data source restored to defaults');
    saveBACKUPCustomDataSource_Testnet();
}

// ============================================
// CONTRACT ADDRESSES MANAGEMENT
// ============================================

/**
 * Saves contract addresses to localStorage
 * @returns {void}
 */
export function saveAddresses() {
    const addressesElement = document.getElementById('contractAddresses');
    if (!addressesElement) return;

    try {
        const addresses = addressesElement.value;
        currentSettingsAddresses.contractAddresses = addresses;
        showSuccessMessage('addressSuccess');
        console.log('Contract addresses saved:', addresses);

        localStorage.setItem('stakingRewardAddresses', JSON.stringify(currentSettingsAddresses.contractAddresses));

        // Update staking stats if function exists
        if (window.updateStakingStats) {
            window.updateStakingStats();
        }
    } catch (error) {
        console.error('Error saving addresses:', error);
        showToast('Invalid address format. Please check your input.', true);
    }
}

/**
 * Restores default contract addresses
 * @returns {void}
 */
export function restoreDefaultAddresses() {
    const addressesElement = document.getElementById('contractAddresses');
    if (addressesElement) {
        addressesElement.value = defaultAddresses;
    }
    currentSettingsAddresses.contractAddresses = defaultAddresses;

    console.log('Addresses restored to defaults');
}

/**
 * Restores contract addresses from on-chain contract
 * @async
 * @returns {Promise<void>}
 */
export async function restoreDefaultAddressesfromContract() {
    if (!window.walletConnected) {
        console.log('restoreDefaultAddressesfromContract: wallet not connected, skipping');
        return;
    }

    if (!window.provider) {
        console.log('restoreDefaultAddressesfromContract: provider not ready, skipping');
        return;
    }

    try {
        // Check if we're on the right network (Base = chainId 8453)
        const network = await window.provider.getNetwork();
        if (network.chainId !== 8453) {
            console.log('restoreDefaultAddressesfromContract: not on Base network, skipping');
            return;
        }

        console.log('Getting reward tokens from contract...');

        const getRewardTokensABI = [
            {
                "inputs": [],
                "name": "getRewardTokens",
                "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
                "stateMutability": "view",
                "type": "function"
            }
        ];

        const tokenLPRewardsStakingContract = new ethers.Contract(
            contractAddressLPRewardsStaking,
            getRewardTokensABI,
            window.provider
        );

        const rewardTokens = await tokenLPRewardsStakingContract.getRewardTokens();

        console.log('Raw result from contract:', rewardTokens);

        let tokenAddresses = [];
        if (Array.isArray(rewardTokens)) {
            tokenAddresses = rewardTokens.map(address => address.toString());
        } else {
            tokenAddresses = [rewardTokens.toString()];
        }

        console.log('Parsed token addresses:', tokenAddresses);

        const oneLineFormatted = `["${tokenAddresses.join('","')}"]`;

        const addressesElement = document.getElementById('contractAddresses');
        if (addressesElement) {
            addressesElement.value = oneLineFormatted;
        }
        currentSettingsAddresses.contractAddresses = tokenAddresses;

        // Save to localStorage for persistence across sessions
        localStorage.setItem('stakingRewardAddresses', JSON.stringify(tokenAddresses));

        // Update cache timestamp
        updateRewardTokensCacheTimestamp();

        console.log('Addresses restored from contract:', tokenAddresses);
        showToast('Contract addresses loaded from blockchain');
    } catch (error) {
        // Silently fail for non-critical operation - just log a warning
        console.warn('Could not load settings from contract (non-critical):', error.message || error);
    }
}

/**
 * Conditionally restores contract addresses from on-chain contract
 * Only fetches if:
 * 1. Auto-fetch toggle is enabled (toggle1 is checked)
 * 2. Cache has expired (older than 24 hours) or doesn't exist
 *
 * @async
 * @param {boolean} forceRefresh - Force refresh even if cache is valid
 * @returns {Promise<void>}
 */
export async function maybeRestoreDefaultAddressesfromContract(forceRefresh = false) {
    // Check if the toggle is enabled
    const toggle1 = document.getElementById('toggle1');
    const isToggleEnabled = toggle1 ? toggle1.checked : autoFetchRewardTokens;

    if (!isToggleEnabled) {
        console.log('Auto-fetch reward tokens is disabled, skipping contract fetch');
        return;
    }

    // Check if cache is still valid (unless forced)
    if (!forceRefresh && isRewardTokensCacheValid()) {
        console.log('Reward tokens cache is still valid, using cached data');
        return;
    }

    // Cache expired or forced refresh - fetch from contract
    console.log('Fetching reward tokens from contract (cache expired or forced refresh)');
    await restoreDefaultAddressesfromContract();
}

/**
 * Restores contract addresses from GitHub/data source
 * @async
 * @returns {Promise<void>}
 */
export async function restoreDefaultAddressesfromGithub() {
    console.log("Using data source: http://bzerox.org/data/githubERC20RewardsTestnet.json");
    console.log("Backup data source:", customBACKUPDataSource);

    try {
        const response = await fetch('http://bzerox.org/data/githubERC20RewardsTestnet.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const fetchedAddresses = await response.json();

        const addressesElement = document.getElementById('contractAddresses');
        if (addressesElement) {
            addressesElement.value = '[' + fetchedAddresses.map(addr => '"' + addr + '"').join(',') + ']';
        }

        currentSettingsAddresses.contractAddresses = fetchedAddresses;

        console.log('Addresses restored from server:', fetchedAddresses);
        console.log('Total addresses loaded:', fetchedAddresses.length);
        showToast('Contract addresses loaded from server');

    } catch (error) {
        console.error('Failed to fetch addresses from server:', error);

        try {
            // Try backup source
            const response = await fetch(customBACKUPDataSource + 'githubERC20RewardsTestnet.json');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const fetchedAddresses = await response.json();

            const addressesElement = document.getElementById('contractAddresses');
            if (addressesElement) {
                addressesElement.value = '[' + fetchedAddresses.map(addr => '"' + addr + '"').join(',') + ']';
            }

            currentSettingsAddresses.contractAddresses = fetchedAddresses;

            console.log('Addresses restored from GitHub backup:', fetchedAddresses);
            showToast('Contract addresses loaded from backup source');

        } catch (backupError) {
            console.error('Failed to fetch addresses from both sources:', backupError);
            showToast('Unable to load contract addresses from server or backup', true);
        }
    }


    console.log('Addresses restored from GitHub');
    saveAddresses();
}

// ============================================
// STAKING SETTINGS MANAGEMENT
// ============================================

/**
 * Saves minimum staking amount to localStorage
 * @returns {void}
 */
export function saveMinStaking() {
    const minStakingInput = document.getElementById('minStaking');
    if (!minStakingInput) return;

    const value = minStakingInput.value.trim();

    if (!value || isNaN(value) || parseFloat(value) < 0) {
        showToast('Please enter a valid positive number', true);
        return;
    }


    appSettings.minStaking = value;
    localStorage.setItem('stakingSettings', JSON.stringify(appSettings));

    showSuccessMessage('stakingSuccess');
    showToast(`Minimum staking amount set to ${value} tokens`);
}

/**
 * Saves minimum user holdings to localStorage
 * @returns {void}
 */
export function saveMinUserHoldings() {
    const minHoldingsInput = document.getElementById('minUserHoldings');
    if (!minHoldingsInput) return;

    const value = minHoldingsInput.value.trim();

    if (!value || isNaN(value) || parseFloat(value) < 0) {
        showToast('Please enter a valid positive number', true);
        return;
    }


    appSettings.minUserHoldings = value;
    localStorage.setItem('stakingSettings', JSON.stringify(appSettings));

    showSuccessMessage('holdingsSuccess');
    showToast(`Minimum user holdings set to ${value} tokens`);
}

// ============================================
// OFFLINE DATA MANAGEMENT
// ============================================

/**
 * Initializes the data source URL links in the settings UI
 */
export function initDataSourceLinks() {
    const minedBlocksPrimary = document.getElementById('minedBlocksUrlPrimary');
    const minedBlocksBackup = document.getElementById('minedBlocksUrlBackup');
    const uniswapPrimary = document.getElementById('uniswapDataUrlPrimary');
    const uniswapBackup = document.getElementById('uniswapDataUrlBackup');

    const primaryBase = customDataSource || defaultDataSource_Testnet;
    const backupBase = customBACKUPDataSource || defaultBACKUPDataSource_Testnet;

    if (minedBlocksPrimary) {
        minedBlocksPrimary.href = primaryBase + 'mined_blocks_mainnet.json';
        minedBlocksPrimary.textContent = primaryBase + 'mined_blocks_mainnet.json';
    }
    if (minedBlocksBackup) {
        minedBlocksBackup.href = backupBase + 'mined_blocks_mainnet.json';
        minedBlocksBackup.textContent = '(Backup) ' + backupBase + 'mined_blocks_mainnet.json';
    }
    if (uniswapPrimary) {
        uniswapPrimary.href = primaryBase + 'mainnet_uniswap_v4_data.json';
        uniswapPrimary.textContent = primaryBase + 'mainnet_uniswap_v4_data.json';
    }
    if (uniswapBackup) {
        uniswapBackup.href = backupBase + 'mainnet_uniswap_v4_data.json';
        uniswapBackup.textContent = '(Backup) ' + backupBase + 'mainnet_uniswap_v4_data.json';
    }
}

/**
 * Handles upload of mined_blocks_mainnet.json file
 */
export function handleMinedBlocksUpload() {
    const fileInput = document.getElementById('uploadMinedBlocks');
    const statusEl = document.getElementById('minedBlocksUploadStatus');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        if (statusEl) statusEl.innerHTML = '<span style="color: red;">Please select a file first.</span>';
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // Handle both formats: raw array OR object with mined_blocks key
            let minedBlocks;
            let latestBlock = null;
            let previousChallenge = null;

            if (Array.isArray(data)) {
                // Raw array format
                minedBlocks = data;
                // Try to find latest block from the data
                if (minedBlocks.length > 0) {
                    latestBlock = Math.max(...minedBlocks.map(b => b[0]));
                }
            } else if (data.mined_blocks && Array.isArray(data.mined_blocks)) {
                // Object format with mined_blocks key
                minedBlocks = data.mined_blocks;
                latestBlock = data.latest_block_number || null;
                previousChallenge = data.previous_challenge || null;
            } else {
                throw new Error('Invalid format: expected array or object with mined_blocks array');
            }

            if (!minedBlocks || minedBlocks.length === 0) {
                throw new Error('No mined blocks found in file');
            }

            // Save to localStorage
            localStorage.setItem('mintData_EraBitcoin2_afbRAFFABC_B0x1', JSON.stringify(minedBlocks));

            if (latestBlock) {
                localStorage.setItem('lastMintBlock_EraBitcoin2_afbRAFFABC_B0x1', latestBlock.toString());
            }

            if (previousChallenge) {
                localStorage.setItem('mintData_GreekWedding2_B0x1', JSON.stringify(previousChallenge));
            }

            // Clear the oldest block key so backward scan knows data is fresh
            localStorage.removeItem('lastOldestMintBlock_EraBitcoin2_afbRAFFABC_B0x1');

            if (statusEl) {
                statusEl.innerHTML = `<span style="color: green;">Success! Loaded ${minedBlocks.length} blocks. Reloading page...</span>`;
            }

            showToast(`Uploaded ${minedBlocks.length} mined blocks successfully!`);

            // Reload page after short delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err) {
            console.error('Error parsing mined blocks file:', err);
            if (statusEl) statusEl.innerHTML = `<span style="color: red;">Error: ${err.message}</span>`;
            showToast('Failed to parse mined blocks file', true);
        }
    };

    reader.onerror = function() {
        if (statusEl) statusEl.innerHTML = '<span style="color: red;">Error reading file.</span>';
    };

    reader.readAsText(file);
}

/**
 * Handles upload of mainnet_uniswap_v4_data.json file
 */
export function handleUniswapDataUpload() {
    const fileInput = document.getElementById('uploadUniswapData');
    const statusEl = document.getElementById('uniswapDataUploadStatus');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        if (statusEl) statusEl.innerHTML = '<span style="color: red;">Please select a file first.</span>';
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // Basic validation - should be an object or array
            if (typeof data !== 'object') {
                throw new Error('Invalid format: expected JSON object or array');
            }

            // Save to localStorage
            localStorage.setItem('testnet_uniswap_v4_local_data', JSON.stringify(data));

            const itemCount = Array.isArray(data) ? data.length : Object.keys(data).length;

            if (statusEl) {
                statusEl.innerHTML = `<span style="color: green;">Success! Loaded ${itemCount} items. Reloading page...</span>`;
            }

            showToast(`Uploaded Uniswap V4 data successfully!`);

            // Reload page after short delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err) {
            console.error('Error parsing Uniswap data file:', err);
            if (statusEl) statusEl.innerHTML = `<span style="color: red;">Error: ${err.message}</span>`;
            showToast('Failed to parse Uniswap data file', true);
        }
    };

    reader.onerror = function() {
        if (statusEl) statusEl.innerHTML = '<span style="color: red;">Error reading file.</span>';
    };

    reader.readAsText(file);
}

/**
 * Downloads current mined blocks data from localStorage
 */
export function downloadMinedBlocksData() {
    const minedBlocks = localStorage.getItem('mintData_EraBitcoin2_afbRAFFABC_B0x1');
    const latestBlock = localStorage.getItem('lastMintBlock_EraBitcoin2_afbRAFFABC_B0x1');
    const previousChallenge = localStorage.getItem('mintData_GreekWedding2_B0x1');

    if (!minedBlocks) {
        showToast('No mined blocks data found in localStorage', true);
        return;
    }

    try {
        const data = {
            mined_blocks: JSON.parse(minedBlocks),
            latest_block_number: latestBlock ? parseInt(latestBlock) : null,
            previous_challenge: previousChallenge ? JSON.parse(previousChallenge) : null
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mined_blocks_mainnet.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Downloaded ${data.mined_blocks.length} mined blocks`);
    } catch (err) {
        console.error('Error downloading mined blocks:', err);
        showToast('Failed to download mined blocks data', true);
    }
}

/**
 * Downloads current Uniswap V4 data from localStorage
 */
export function downloadUniswapData() {
    const uniswapData = localStorage.getItem('testnet_uniswap_v4_local_data');

    if (!uniswapData) {
        showToast('No Uniswap V4 data found in localStorage', true);
        return;
    }

    try {
        const data = JSON.parse(uniswapData);

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mainnet_uniswap_v4_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const itemCount = Array.isArray(data) ? data.length : Object.keys(data).length;
        showToast(`Downloaded Uniswap V4 data (${itemCount} items)`);
    } catch (err) {
        console.error('Error downloading Uniswap data:', err);
        showToast('Failed to download Uniswap V4 data', true);
    }
}

// ============================================
// LOAD SETTINGS (INITIALIZATION)
// ============================================

/**
 * Loads all settings from localStorage and updates the UI
 * This should be called on app initialization
 * @returns {void}
 */
export function loadSettings() {
    console.log('Loading settings from localStorage...');

    // Load data sources
    const dataSource = localStorage.getItem('customDataSource_Testnet');
    const dataSourceBACKUP = localStorage.getItem('customDataSource_BACKUP_Testnet');
    const rpcETH = localStorage.getItem('customRPCValue_ETH');
    const rpc = localStorage.getItem('customRPCValue_Base');
    const savedSettings = localStorage.getItem('stakingSettings');
    const savedSettingsRewards = localStorage.getItem('stakingRewardAddresses');

    // Load staking reward addresses
    if (savedSettingsRewards) {
        try {
            const setting2 = JSON.parse(savedSettingsRewards);
            console.log("Loaded staking reward addresses:", setting2);
            currentSettingsAddresses.contractAddresses = setting2 || "0xError";

            const addressesElement = document.getElementById('contractAddresses');
            if (addressesElement) {
                // Format as JSON array string for display
                if (Array.isArray(setting2)) {
                    addressesElement.value = JSON.stringify(setting2);
                } else {
                    addressesElement.value = setting2;
                }
            }
        } catch (error) {
            console.error('Error loading staking reward addresses:', error);
        }
    }

    // Load staking settings (min staking, min holdings)
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);

            appSettings.minStaking = settings.minStaking || 0;
            appSettings.minUserHoldings = settings.minUserHoldings || 0;

            const minStakingElement = document.getElementById('minStaking');
            const minHoldingsElement = document.getElementById('minUserHoldings');

            if (minStakingElement) minStakingElement.value = appSettings.minStaking;
            if (minHoldingsElement) minHoldingsElement.value = appSettings.minUserHoldings;

        } catch (error) {
            console.error('Error loading settings:', error);
        }
    } else {
        appSettings.minStaking = 0;
        appSettings.minUserHoldings = 0;
    }

    // Load Base RPC
    if (rpc) {
        customRPC = rpc;
        CONFIG.RPC_URL = rpc;

        const rpcElement = document.getElementById('customRPC');
        if (rpcElement) rpcElement.value = customRPC;

        console.log('Loaded custom Base RPC:', customRPC);
    } else {
        customRPC = defaultRPC_Base;
        CONFIG.RPC_URL = defaultRPC_Base;

        const rpcElement = document.getElementById('customRPC');
        if (rpcElement) rpcElement.value = defaultRPC_Base;
    }

    // Load Ethereum RPC
    if (rpcETH) {
        customRPC_ETH = rpcETH;

        const rpcElement = document.getElementById('customRPC_ETH');
        if (rpcElement) rpcElement.value = customRPC_ETH;

        console.log('Loaded custom Ethereum RPC:', customRPC_ETH);
    } else {
        customRPC_ETH = defaultRPC_ETH;

        const rpcElement = document.getElementById('customRPC_ETH');
        if (rpcElement) rpcElement.value = defaultRPC_ETH;
    }

    // Load data source
    if (dataSource) {
        customDataSource = dataSource;
        CONFIG.DATA_URL = dataSource;

        const dataSourceElement = document.getElementById('customDataSource');
        if (dataSourceElement) dataSourceElement.value = customDataSource;

        console.log('Loaded custom data source:', customDataSource);
    } else {
        customDataSource = defaultDataSource_Testnet;
        CONFIG.DATA_URL = defaultDataSource_Testnet;

        const dataSourceElement = document.getElementById('customDataSource');
        if (dataSourceElement) dataSourceElement.value = customDataSource;
    }

    // Load backup data source
    if (dataSourceBACKUP) {
        customBACKUPDataSource = dataSourceBACKUP;

        const backupElement = document.getElementById('BACKUPcustomDataSource');
        if (backupElement) backupElement.value = customBACKUPDataSource;

        console.log('Loaded backup data source:', customBACKUPDataSource);
    } else {
        customBACKUPDataSource = defaultBACKUPDataSource_Testnet;

        const backupElement = document.getElementById('BACKUPcustomDataSource');
        if (backupElement) backupElement.value = customBACKUPDataSource;
    }

    // Load auto-fetch toggle state
    const savedAutoFetch = loadAutoFetchToggle();
    const toggle1Element = document.getElementById('toggle1');
    if (toggle1Element) {
        toggle1Element.checked = savedAutoFetch;
        // Set up change listener to save toggle state
        if (!toggle1Element.hasAttribute('data-change-listener')) {
            toggle1Element.addEventListener('change', function(e) {
                saveAutoFetchToggle(e.target.checked);
                if (e.target.checked) {
                    // When enabling, clear cache to force refresh on next connect
                    clearRewardTokensCache();
                    console.log('Auto-fetch enabled - will fetch from contract on next wallet connection');
                }
            });
            toggle1Element.setAttribute('data-change-listener', 'true');
        }
    }
    console.log('Auto-fetch reward tokens setting:', savedAutoFetch);

    console.log('Settings loaded successfully');
}

// ============================================
// USER SELECTION TRACKING
// ============================================

/**
 * Sets up user selection tracking for position dropdowns
 * Tracks when users manually select a position vs programmatic updates
 * @returns {void}
 */
export function setupUserSelectionTracking() {
    const positionSelect = document.querySelector('#staking-deposit-select');
    if (positionSelect && !positionSelect.hasAttribute('data-user-tracker')) {
        positionSelect.addEventListener('change', function (e) {
            console.log('Change event details:', {
                value: e.target.value,
                selectedIndex: e.target.selectedIndex,
                optionText: e.target.options[e.target.selectedIndex]?.textContent,
                optionValue: e.target.options[e.target.selectedIndex]?.value
            });

            // Only track if it's a real position (not the static HTML options)
            if (e.target.value && e.target.value.startsWith('position_')) {
                userSelectedPosition = e.target.value;
                hasUserMadeSelection = true;
                console.log('USER MANUALLY SELECTED VALID POSITION:', userSelectedPosition);
            } else {
                console.log('User selected static HTML option, ignoring:', e.target.value || e.target.options[e.target.selectedIndex]?.textContent);
            }
        });
        positionSelect.setAttribute('data-user-tracker', 'true');
        console.log('User selection tracker installed');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Shows a success message for a specific element
 * @param {string} elementId - The ID of the success message element
 * @returns {void}
 */
function showSuccessMessage(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 3000);
}

/**
 * Simple alert notification (fallback)
 * @param {string} message - The message to display
 * @param {string} type - The type of alert ('info', 'success', 'error', 'warning')
 * @returns {void}
 */
export function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    const settingsPage = document.getElementById('settings');
    if (settingsPage) {
        settingsPage.insertBefore(alertDiv, settingsPage.firstChild);
        setTimeout(() => alertDiv.remove(), 5000);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}
