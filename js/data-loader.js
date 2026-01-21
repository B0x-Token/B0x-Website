/**
 * @module data-loader
 * @description RPC queries and blockchain data fetching
 *
 * This module handles:
 * - Contract statistics fetching via multicall
 * - Blockchain event monitoring
 * - Position data loading from remote sources
 * - Real-time blockchain scanning
 * - Log processing and position validation
 * - Continuous monitoring with automatic retry logic
 *
 * Main Functions:
 * - mainRPCStarterForPositions() - Entry point for position monitoring
 * - GetContractStatsWithMultiCall() - Fetch contract statistics
 * - runContinuous() - Start continuous blockchain monitoring
 * - runOnce() - Run a single scan cycle
 * - stopMonitoring() - Stop continuous monitoring
 *
 * RPC Functions:
 * - makeRpcCall() - Core RPC call wrapper with rate limiting
 * - retryWithBackoff() - Retry logic with exponential backoff
 * - getLogs() - Event log fetching
 * - callContract() - Contract method calls
 * - getLatestBlock() - Get latest block number
 *
 * Position Functions:
 * - getPoolAndPositionInfo() - Get single position details
 * - multicallGetPoolAndPositionInfo() - Batch position fetch via multicall
 * - validatePositions() - Validate positions in batches
 * - validatePositionsFullMulticall() - Validate all positions in single multicall
 *
 * Log Processing:
 * - processMintTransferLogs() - Parse mint events from Transfer logs
 * - processTransferLogs() - Parse regular Transfer events
 *
 * Block Scanning:
 * - scanBlocks() - Scan block range for events
 * - calculateBlockRanges() - Split block ranges for efficient scanning
 *
 * Utility Functions:
 * - poolKeyMatches() - Compare pool keys
 * - printSummary() - Print monitoring summary
 * - sleep() - Async delay helper
 * - exponentialBackoffDelay() - Calculate backoff delay
 * - isRateLimitError() - Check for rate limit errors
 * - saveDataLocally() - Save data to localStorage
 * - loadDataLocally() - Load data from localStorage
 */

// Import dependencies
import { MULTICALL_ABI, MULTICALL_ABI_PAYABLE, CONTRACT_ABI } from './abis.js';
import { ProofOfWorkAddresss, MULTICALL_ADDRESS } from './config.js';
import { CONFIG, customRPC, customDataSource, customBACKUPDataSource ,loadSettings } from './settings.js';
import { showLoadingWidget, hideLoadingWidget, updateLoadingStatus, updateLoadingStatusWidget, setLoadingProgress } from './ui.js';

// ============================================
// STATE VARIABLES
// ============================================

/**
 * NFT owners mapping (tokenId -> owner address)
 * @type {Object}
 */
let nftOwners = {};

/**
 * Valid positions array
 * @type {Array}
 */
let validPositions = [];

/**
 * Invalid positions array
 * @type {Array}
 */
let invalidPositions = [];

/**
 * Current block number being scanned
 * @type {number}
 */
let currentBlockzzzz = 37667910;

/**
 * Flag indicating if monitoring is running
 * @type {boolean}
 */
let isRunning = false;

/**
 * Flag to force refresh
 * @type {boolean}
 */
let forceRefresh = false;

/**
 * Flag indicating if log search is in progress
 * @type {boolean}
 */
let WeAreSearchingLogsRightNow = true;

/**
 * Flag indicating if latest search is complete
 * @type {boolean}
 */
let latestSearch = false;

// Loop counter for scan progress - persists across scanBlocks() calls
let scanLoopCounter = 0;

// ============================================
// GETTERS (for external access to state)
// ============================================

export function getNFTOwners() { return nftOwners; }
export function getValidPositions() { return validPositions; }
export function getInvalidPositions() { return invalidPositions; }
export function getCurrentBlock() { return currentBlockzzzz; }
export function isMonitoringRunning() { return isRunning; }
export function isLatestSearchComplete() { return latestSearch; }
export function isSearchingLogs() { return WeAreSearchingLogsRightNow; }

// ============================================
// SETTERS
// ============================================

export function setNFTOwners(value) { nftOwners = value; }
export function setValidPositions(value) { validPositions = value; }
export function setCurrentBlock(value) { currentBlockzzzz = value; }
export function setIsRunning(value) { isRunning = value; }
export function setLatestSearchComplete(value) { latestSearch = value; }
export function triggerRefresh() { forceRefresh = true; }

// ============================================
// CONTRACT STATS FETCHING
// ============================================

// Rate limiting for contract stats
let lastContractStatsUpdate = 0;
export let cachedContractStats = null;
const CONTRACT_STATS_COOLDOWN = 180000; // 180 seconds in milliseconds


/**
 * Get time remaining until next contract stats update is allowed
 * @returns {number} Seconds remaining (0 if update is available)
 */
export function getContractStatsCooldown() {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastContractStatsUpdate;
    const remainingTime = Math.max(0, CONTRACT_STATS_COOLDOWN - timeSinceLastUpdate);
    return Math.ceil(remainingTime / 1000);
}

/**
 * Fetches contract statistics using multicall for efficiency
 * Gets mining stats, difficulty, rewards, etc. in a single call
 * Rate limited to once every 180 seconds to reduce RPC load
 * @async
 * @param {boolean} forceUpdate - Force update even if cooldown hasn't passed
 * @returns {Promise<Object>} Contract statistics object
 */
export async function GetContractStatsWithMultiCall(forceUpdate = false) {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastContractStatsUpdate;

    // Check if we have cached stats from the combined multicall in getRewardStats
    if (!forceUpdate && window.cachedContractStats) {
        console.log(`Using contract stats from combined multicall in getRewardStats`);
        cachedContractStats = window.cachedContractStats;
        lastContractStatsUpdate = now;
        return cachedContractStats;
    }

    // Return cached stats if cooldown hasn't passed and not forcing update
    if (!forceUpdate && cachedContractStats && timeSinceLastUpdate < CONTRACT_STATS_COOLDOWN) {
        const remainingTime = Math.ceil((CONTRACT_STATS_COOLDOWN - timeSinceLastUpdate) / 1000);
        console.log(`Using cached contract stats (updates again in ${remainingTime}s)`);
        return cachedContractStats;
    }

    // Connect if not already connected
    if (!window.walletConnected) {
        if (window.connectTempRPCforStats) {
            await window.connectTempRPCforStats();
        }
    }

    var provids = window.walletConnected ? window.provider : window.providerTempStats;
    if (!window.walletConnected) {
        provids = new ethers.providers.JsonRpcProvider(customRPC);
    }
    console.log("Contract stats fetch - connection ready");

    try {
        const contractInterface = new ethers.utils.Interface(CONTRACT_ABI);
        const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provids);

        // Prepare multicall requests
        const calls3 = [
            { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("miningTarget", []) },
            { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("getMiningDifficulty", []) },
            { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("epochCount", []) },
            { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("inflationMined", []) },
            { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("blocksToReadjust", []) },
            { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("seconds_Until_adjustmentSwitch", []) },
            { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("latestDifficultyPeriodStarted", []) },
            { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("latestDifficultyPeriodStarted2", []) },
            { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("rewardEra", []) },
            { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("readjustsToWhatDifficulty", []) },
            { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("tokensMinted", []) },
            { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("maxSupplyForEra", []) }
        ];

        let blockNumber, returnData;

        try {
            // Try aggregate3 first (more robust)
            console.log("Executing aggregate3 multicall with", calls3.length, "function calls...");
            const results = await multicallContract.aggregate3(calls3);
            blockNumber = await provids.getBlockNumber();
            returnData = results.map(result => {
                if (!result.success) {
                    throw new Error("One of the multicall functions failed");
                }
                return result.returnData;
            });
            console.log("Multicall executed successfully at block:", blockNumber.toString());
        } catch (aggregate3Error) {
            console.log("Aggregate3 failed, trying regular aggregate...", aggregate3Error.message);

            // Fallback to regular aggregate
            const calls = calls3.map(call => ({ target: call.target, callData: call.callData }));
            const result = await multicallContract.aggregate(calls);
            blockNumber = result.blockNumber;
            returnData = result.returnData;
        }

        // Decode results
        const [
            miningTarget,
            miningDifficulty,
            epochCount,
            inflationMined,
            blocksToReadjust,
            secondsUntilSwitch,
            latestDiffPeriod,
            latestDiffPeriod2,
            rewardEra,
            readjustDifficulty,
            tokensMinted,
            maxSupplyForEra
        ] = returnData.map((data, index) => {
            const functionName = [
                "miningTarget", "getMiningDifficulty", "epochCount", "inflationMined", "blocksToReadjust",
                "seconds_Until_adjustmentSwitch", "latestDifficultyPeriodStarted",
                "latestDifficultyPeriodStarted2", "rewardEra", "readjustsToWhatDifficulty",
                "tokensMinted", "maxSupplyForEra"
            ][index];

            return contractInterface.decodeFunctionResult(functionName, data);
        });

        // Format stats object
        const stats = {
            blockNumber: blockNumber.toString(),
            miningTarget: miningTarget[0].toString(),
            miningDifficulty: miningDifficulty[0].toString(),
            epochCount: epochCount[0].toString(),
            inflationMined: {
                yearlyInflation: inflationMined.YearlyInflation.toString(),
                epochsPerYear: inflationMined.EpochsPerYear.toString(),
                rewardsAtTime: inflationMined.RewardsAtTime.toString(),
                timePerEpoch: inflationMined.TimePerEpoch.toString()
            },
            blocksToReadjust: blocksToReadjust[0].toString(),
            secondsUntilSwitch: secondsUntilSwitch[0].toString(),
            latestDiffPeriod: latestDiffPeriod[0].toString(),
            latestDiffPeriod2: latestDiffPeriod2[0].toString(),
            rewardEra: rewardEra[0].toString(),
            readjustDifficulty: readjustDifficulty[0].toString(),
            tokensMinted: tokensMinted[0].toString(),
            maxSupplyForEra: maxSupplyForEra[0].toString()
        };

        // Cache the stats and update timestamp
        cachedContractStats = stats;
        lastContractStatsUpdate = now;

        console.log('✓ Contract stats fetched and cached for 180s');
        return stats;

    } catch (error) {
        console.error("Error in GetContractStatsWithMultiCall:", error);

        // Return cached stats if available, even on error
        if (cachedContractStats) {
            console.log('Returning cached contract stats due to error');
            return cachedContractStats;
        }

        throw error;
    }
}

// ============================================
// DATA FETCHING FROM REMOTE SOURCES
// ============================================

/**
 * Fetches position data from remote URL
 * Loads pre-computed position data to reduce RPC load
 * @async
 * @returns {Promise<void>}
 */
export async function fetchDataFromUrl() {
    console.log("Fetching data from URL:", CONFIG.DATA_URL);

    try {
        const response = await fetch(CONFIG.DATA_URL);

        if (!response.ok) {
            console.warn(`Failed to fetch from primary source: ${response.status}`);
            return;
        }

        const data = await response.json();
        console.log("DATA DATA: ",data);
        console.log("Data fetched successfully:", {
            owners: Object.keys(data.nft_owners || {}).length,
            positions: (data.valid_positions || []).length,
            block: data.metadata.current_block || 'unknown'
        });

        // Update state with fetched data
        if (data.nft_owners) nftOwners = data.nft_owners;
        if (data.valid_positions) validPositions = data.valid_positions;
        if (data.metadata.current_block) currentBlockzzzz = data.metadata.current_block;

    } catch (error) {
        console.error("Error fetching data from URL:", error);
        console.log("Continuing without pre-loaded data...");
    }
}

// ============================================
// MAIN ENTRY POINT
// ============================================

/**
 * Main entry point for position monitoring
 * Initializes the Uniswap V4 position tracker
 * @async
 * @returns {Promise<Object>} Final NFT owners and valid positions
 */
 export async function mainRPCStarterForPositions() {
    console.log("Initializing Uniswap V4 Monitor...");

    // Load settings first
    await loadSettings();
    CONFIG.RPC_URL = customRPC;
    CONFIG.DATA_URL = customDataSource + "mainnet_uniswap_v4_data.json";
    CONFIG.DATA_URL_Backup = customBACKUPDataSource + "mainnet_uniswap_v4_data.json";

    // Set additional CONFIG properties for RPC monitoring
    CONFIG.START_BLOCK = CONFIG.START_BLOCK || 35937447;
    CONFIG.MAX_LOGS_PER_REQUEST = CONFIG.MAX_LOGS_PER_REQUEST || 499;
    CONFIG.MAX_BLOCKS_PER_REQUEST = CONFIG.MAX_BLOCKS_PER_REQUEST || 499;
    CONFIG.MAX_RETRIES = CONFIG.MAX_RETRIES || 5;
    CONFIG.BASE_RETRY_DELAY = CONFIG.BASE_RETRY_DELAY || 1000;
    CONFIG.MAX_RETRY_DELAY = CONFIG.MAX_RETRY_DELAY || 60000;
    CONFIG.RATE_LIMIT_DELAY = CONFIG.RATE_LIMIT_DELAY || 1250;
    CONFIG.NFT_ADDRESS = CONFIG.NFT_ADDRESS || "0x7C5f5A4bBd8fD63184577525326123B519429bDc";
    CONFIG.MULTICALL_ADDRESS = CONFIG.MULTICALL_ADDRESS || "0xcA11bde05977b3631167028862bE2a173976CA11";
    CONFIG.TRANSFER_TOPIC = CONFIG.TRANSFER_TOPIC || "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    CONFIG.TARGET_POOL_KEY = CONFIG.TARGET_POOL_KEY || {
        currency0: "0x6B19E31C1813cD00b0d47d798601414b79A3e8AD",
        currency1: "0xc4D4FD4F4459730d176844c170F2bB323c87Eb3B",
        fee: 8388608,
        tickSpacing: 60,
        hooks: "0x785319f8fCE23Cd733DE94Fd7f34b74A5cAa1000"
    };

    console.log("Config RPC URL:", CONFIG.RPC_URL);
    console.log("Config Data URL:", CONFIG.DATA_URL);

    // Compare localStorage vs remote data and use whichever has higher block number
    const LOCAL_STORAGE_KEY = 'testnet_uniswap_v4_local_data';
    let loadedFromLocal = false;
    let localBlock = 0;

    // Fetch both remote data sources in parallel
    const fetchRemoteData = async (url, label) => {
        try {
            console.log(`Fetching ${label} data...`);
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                const block = data?.metadata?.current_block || 0;
                console.log(`${label} current_block: ${block}`);
                return { data, block };
            }
        } catch (error) {
            console.log(`Failed to fetch ${label} data:`, error);
        }
        return { data: null, block: 0 };
    };

    // Fetch both sources simultaneously
    const [primary, backup] = await Promise.all([
        fetchRemoteData(CONFIG.DATA_URL, "Primary"),
        fetchRemoteData(CONFIG.DATA_URL_Backup, "Backup")
    ]);

    // Determine which remote source is freshest
    let remoteData = null;
    let remoteBlock = 0;
    let remoteSource = null;

    if (primary.block > backup.block) {
        remoteData = primary.data;
        remoteBlock = primary.block;
        remoteSource = "Primary";
    } else if (backup.block > 0) {
        remoteData = backup.data;
        remoteBlock = backup.block;
        remoteSource = "Backup";
    } else if (primary.block > 0) {
        remoteData = primary.data;
        remoteBlock = primary.block;
        remoteSource = "Primary";
    }

    if (remoteSource) {
        console.log(`✓ Using ${remoteSource} remote data (block ${remoteBlock})`);
    } else {
        console.log("⚠ No remote data available from either source");
    }

    // Check localStorage data
    let localData = null;
    try {
        localData = loadDataLocally(LOCAL_STORAGE_KEY);
        if (localData && localData.metadata) {
            localBlock = localData.metadata.current_block || 0;
            console.log(`localStorage current_block: ${localBlock}`);
        }
    } catch (error) {
        console.warn("Failed to load from localStorage:", error);
    }

    // Decide which data source to use based on block numbers
    if (localData && localBlock > remoteBlock) {
        // Use localStorage data - it's ahead of remote
        validPositions = localData.valid_positions || [];
        nftOwners = localData.nft_owners || {};
        currentBlockzzzz = localBlock;

        const cacheAge = Date.now() - new Date(localData.metadata.last_updated).getTime();
        console.log(`✓ Using localStorage data (block ${localBlock} > remote block ${remoteBlock})`);
        console.log(`  - Cache is ${Math.round(cacheAge / 60000)} min old`);
        console.log(`  - ${validPositions.length} valid positions`);
        console.log(`  - ${Object.keys(nftOwners).length} NFT owners`);
        console.log(`  - Continuing from block ${currentBlockzzzz}`);
        loadedFromLocal = true;
    } else if (remoteData) {
        // Use remote data - it's ahead or equal
        if (remoteData.nft_owners) nftOwners = remoteData.nft_owners;
        if (remoteData.valid_positions) validPositions = remoteData.valid_positions;
        if (remoteData.metadata?.current_block) currentBlockzzzz = remoteData.metadata.current_block;

        console.log(`✓ Using remote data (block ${remoteBlock} >= localStorage block ${localBlock})`);
        console.log(`  - ${validPositions.length} valid positions`);
        console.log(`  - ${Object.keys(nftOwners).length} NFT owners`);
    } else if (localData) {
        // Fallback to localStorage if remote failed
        validPositions = localData.valid_positions || [];
        nftOwners = localData.nft_owners || {};
        currentBlockzzzz = localBlock || CONFIG.START_BLOCK;

        console.log(`✓ Fallback to localStorage (remote unavailable)`);
        console.log(`  - ${validPositions.length} valid positions`);
        loadedFromLocal = true;
    } else {
        console.log("No cached data available, starting fresh...");
    }

    // Mark as complete since we've attempted to load the data
    latestSearch = true;

    console.log("✓ Position tracking initialized");

    // Start continuous monitoring in the background
    // blocksPerScan = 1996, sleepSeconds = 180 (3 minutes between scans)
    runContinuous(1996, 180).catch(err => {
        console.warn("Continuous monitoring error:", err);
    });

    // Return current state
    return {
        nftOwners: getNFTOwners(),
        validPositions: getValidPositions()
    };
}

// ============================================
// CORE RPC FUNCTIONS
// ============================================

/**
 * Makes a raw RPC call with rate limiting
 * @async
 * @param {string} method - RPC method name
 * @param {Array} params - Method parameters
 * @returns {Promise<any>} RPC result
 */
export async function makeRpcCall(method, params) {
    const payload = {
        jsonrpc: "2.0",
        method: method,
        params: params,
        id: Date.now()
    };

    await sleep(CONFIG.RATE_LIMIT_DELAY || 250);

    const response = await fetch(CONFIG.RPC_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.error) {
        const errorMsg = typeof result.error === 'object' ?
            result.error.message || JSON.stringify(result.error) :
            result.error;
        throw new Error(`RPC Error: ${errorMsg}`);
    }

    return result.result;
}

/**
 * Retries a function with exponential backoff
 * @async
 * @param {Function} func - Function to retry
 * @param {...any} args - Arguments to pass to function
 * @returns {Promise<any>} Function result
 */
export async function retryWithBackoff(func, ...args) {
    const maxRetries = CONFIG.MAX_RETRIES || 5;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await func(...args);
        } catch (error) {
            lastError = error;
            if (attempt === maxRetries - 1) break;

            const delay = exponentialBackoffDelay(attempt);
            console.log(`Attempt ${attempt + 1} failed: ${error.message.substring(0, 100)}...`);
            console.log(`Retrying in ${(delay / 1000).toFixed(2)} seconds...`);
            await sleep(delay);
        }
    }

    console.log(`All ${maxRetries} attempts failed. Last error: ${lastError.message}`);
    throw lastError;
}

/**
 * Calls a contract method
 * @async
 * @param {string} address - Contract address
 * @param {string} data - Encoded call data
 * @param {string|number} block - Block number or "latest"
 * @returns {Promise<string|null>} Call result
 */
export async function callContract(address, data, block = "latest") {
    try {
        return await retryWithBackoff(async () => {
            return await makeRpcCall('eth_call', [{
                to: address,
                data: data
            }, block]);
        });
    } catch (error) {
        console.log(`Failed to call contract after retries: ${error.message}`);
        return null;
    }
}

/**
 * Gets the latest block number
 * @async
 * @returns {Promise<number>} Latest block number
 */
export async function getLatestBlock() {
    try {
        return await retryWithBackoff(async () => {
            const result = await makeRpcCall('eth_blockNumber', []);
            return parseInt(result, 16);
        });
    } catch (error) {
        console.log(`Failed to get latest block after retries: ${error.message}`);
        return currentBlockzzzz;
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Saves data to localStorage
 * @param {string} key - Storage key
 * @param {any} data - Data to save
 * @returns {void}
 */
export function saveDataLocally(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Data saved locally: ${key}`);
    } catch (error) {
        console.error(`Error saving data locally:`, error);
    }
}

/**
 * Loads data from localStorage
 * @param {string} key - Storage key
 * @returns {any} Loaded data or null
 */
export function loadDataLocally(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Error loading data locally:`, error);
        return null;
    }
}

/**
 * Sleep helper for delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay
 * @param {number} attempt - Current attempt number
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
export function exponentialBackoffDelay(attempt, baseDelay = 1000, maxDelay = 60000) {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay;
}

/**
 * Checks if error is a rate limit error
 * @param {Error} error - Error object
 * @returns {boolean} True if rate limit error
 */
export function isRateLimitError(error) {
    const message = error.message?.toLowerCase() || '';
    return message.includes('rate limit') ||
        message.includes('429') ||
        message.includes('too many requests') ||
        error.code === 429;
}

/**
 * Compares two pool keys for equality
 * @param {Object} poolKey - Pool key to compare
 * @param {Object} target - Target pool key
 * @returns {boolean} True if pool keys match
 */
export function poolKeyMatches(poolKey, target) {
    return poolKey.currency0.toLowerCase() === target.currency0.toLowerCase() &&
        poolKey.currency1.toLowerCase() === target.currency1.toLowerCase() &&
        poolKey.fee === target.fee &&
        poolKey.tickSpacing === target.tickSpacing &&
        poolKey.hooks.toLowerCase() === target.hooks.toLowerCase();
}

// ============================================
// POSITION INFO FUNCTIONS
// ============================================

/**
 * Gets pool and position info for a single token ID
 * @async
 * @param {number} tokenId - NFT token ID
 * @returns {Promise<Object|null>} Pool and position info
 */
export async function getPoolAndPositionInfo(tokenId) {
    const functionSelector = "0x7ba03aad";
    const encodedTokenId = tokenId.toString(16).padStart(64, '0');
    const data = functionSelector + encodedTokenId;

    const nftAddress = CONFIG.NFT_ADDRESS || "0x7C5f5A4bBd8fD63184577525326123B519429bDc";
    const result = await callContract(nftAddress, data);
    if (!result) return null;

    try {
        const resultBytes = result.slice(2);

        const currency0 = "0x" + resultBytes.slice(24, 64);
        const currency1 = "0x" + resultBytes.slice(88, 128);
        const fee = parseInt(resultBytes.slice(128, 192), 16);
        const tickSpacing = parseInt(resultBytes.slice(192, 256), 16);
        const hooks = "0x" + resultBytes.slice(280, 320);
        const info = parseInt(resultBytes.slice(320, 384), 16);

        const poolKey = { currency0, currency1, fee, tickSpacing, hooks };
        return { poolKey, info };

    } catch (error) {
        console.log(`Error decoding getPoolAndPositionInfo result: ${error.message}`);
        return null;
    }
}

/**
 * Gets pool and position info for multiple token IDs using multicall
 * @async
 * @param {Array<number>} tokenIds - Array of NFT token IDs
 * @returns {Promise<Array>} Array of results with success status
 */
export async function multicallGetPoolAndPositionInfo(tokenIds) {
    if (tokenIds.length === 0) return [];
    console.log("CALLING multicallGetPoolAndPositionInfo IMPORTANT IMPORANT");
    const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
    const multicallAddress = CONFIG.MULTICALL_ADDRESS || "0xcA11bde05977b3631167028862bE2a173976CA11";
    const nftAddress = CONFIG.NFT_ADDRESS || "0x7C5f5A4bBd8fD63184577525326123B519429bDc";

    const POSITION_MANAGER_ABI = [{
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "getPoolAndPositionInfo",
        "outputs": [
            {
                "components": [
                    { "internalType": "address", "name": "currency0", "type": "address" },
                    { "internalType": "address", "name": "currency1", "type": "address" },
                    { "internalType": "uint24", "name": "fee", "type": "uint24" },
                    { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
                    { "internalType": "address", "name": "hooks", "type": "address" }
                ],
                "internalType": "struct PoolKey",
                "name": "poolKey",
                "type": "tuple"
            },
            {
                "components": [
                    { "internalType": "uint128", "name": "liquidity", "type": "uint128" },
                    { "internalType": "uint256", "name": "feeGrowthInside0LastX128", "type": "uint256" },
                    { "internalType": "uint256", "name": "feeGrowthInside1LastX128", "type": "uint256" },
                    { "internalType": "uint128", "name": "tokensOwed0", "type": "uint128" },
                    { "internalType": "uint128", "name": "tokensOwed1", "type": "uint128" }
                ],
                "internalType": "struct PositionInfo",
                "name": "info",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }];

    const multicallContract = new ethers.Contract(multicallAddress, MULTICALL_ABI, provider);
    const positionManagerContract = new ethers.Contract(nftAddress, POSITION_MANAGER_ABI, provider);

    const calls = tokenIds.map(tokenId => ({
        target: positionManagerContract.address,
        allowFailure: true,
        callData: positionManagerContract.interface.encodeFunctionData('getPoolAndPositionInfo', [tokenId])
    }));

    const MAX_RETRIES = 5;
    const BASE_DELAY = 2000;
    let retryCount = 0;

    while (retryCount <= MAX_RETRIES) {
        try {
            console.log(`Making multicall for ${tokenIds.length} positions... (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

            const results = await multicallContract.callStatic.aggregate3(calls);
            console.log(`Multicall completed successfully, processing ${results.length} results...`);

            const decodedResults = [];

            for (let index = 0; index < results.length; index++) {
                const result = results[index];
                const tokenId = tokenIds[index];

                if (!result.success || result.returnData === '0x') {
                    decodedResults.push({ tokenId, result: null, success: false });
                    continue;
                }

                try {
                    const data = result.returnData;

                    try {
                        const decoded = ethers.utils.defaultAbiCoder.decode(
                            [
                                'tuple(address,address,uint24,int24,address)',
                                'tuple(uint128,uint256,uint256,uint128,uint128)'
                            ],
                            data
                        );

                        decodedResults.push({
                            tokenId,
                            result: {
                                poolKey: {
                                    currency0: decoded[0][0],
                                    currency1: decoded[0][1],
                                    fee: decoded[0][2],
                                    tickSpacing: decoded[0][3],
                                    hooks: decoded[0][4]
                                },
                                info: {
                                    liquidity: decoded[1][0],
                                    feeGrowthInside0LastX128: decoded[1][1],
                                    feeGrowthInside1LastX128: decoded[1][2],
                                    tokensOwed0: decoded[1][3],
                                    tokensOwed1: decoded[1][4]
                                }
                            },
                            success: true
                        });
                    } catch (structDecodeError) {
                        const decoded = ethers.utils.defaultAbiCoder.decode(
                            ['address', 'address', 'uint24', 'int24', 'address', 'uint256'],
                            data
                        );

                        decodedResults.push({
                            tokenId,
                            result: {
                                poolKey: {
                                    currency0: decoded[0],
                                    currency1: decoded[1],
                                    fee: decoded[2],
                                    tickSpacing: decoded[3],
                                    hooks: decoded[4]
                                },
                                info: decoded[5]
                            },
                            success: true
                        });
                    }
                } catch (decodeError) {
                    console.log(`All decoding methods failed for token ${tokenId}:`, decodeError.message);
                    decodedResults.push({ tokenId, result: null, success: false });
                }
            }

            const successCount = decodedResults.filter(r => r.success).length;
            console.log(`Successfully processed ${successCount}/${decodedResults.length} positions`);
            return decodedResults;

        } catch (error) {
            console.log(`Multicall error (attempt ${retryCount + 1}): ${error.message}`);

            if (isRateLimitError(error)) {
                retryCount++;
                if (retryCount <= MAX_RETRIES) {
                    const delay = BASE_DELAY * Math.pow(2, retryCount - 1) + Math.random() * 1000;
                    console.log(`Rate limited. Waiting ${(delay / 1000).toFixed(1)}s before retry ${retryCount}/${MAX_RETRIES}...`);
                    await sleep(delay);
                    continue;
                } else {
                    console.log(`Max retries (${MAX_RETRIES}) reached. Giving up on this batch.`);
                    return tokenIds.map(tokenId => ({ tokenId, result: null, success: false }));
                }
            } else {
                console.log(`Non-rate-limit error: ${error.message}`);
                return tokenIds.map(tokenId => ({ tokenId, result: null, success: false }));
            }
        }
    }

    return tokenIds.map(tokenId => ({ tokenId, result: null, success: false }));
}

// ============================================
// LOG PROCESSING FUNCTIONS
// ============================================

/**
 * Processes mint Transfer logs (from 0x00) to extract new positions
 * @param {Array} logs - Transfer event logs
 * @returns {Array} Array of position objects with tokenId, txHash, blockNumber
 */
export function processMintTransferLogs(logs) {
    const positions = [];
    const transferTopic = CONFIG.TRANSFER_TOPIC || "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    for (const log of logs) {
        try {
            const topics = log.topics || [];
            const txHash = log.transactionHash || "";
            const blockNumber = parseInt(log.blockNumber, 16);

            if (topics.length >= 4 && topics[0] === transferTopic) {
                const fromAddress = topics[1];
                if (fromAddress === "0x0000000000000000000000000000000000000000000000000000000000000000") {
                    const tokenId = parseInt(topics[3], 16);
                    positions.push({ tokenId, txHash, blockNumber });
                    console.log(`Found mint Transfer with token ID: ${tokenId}`);
                }
            }
        } catch (error) {
            console.log(`Error processing mint Transfer log: ${error.message}`);
            continue;
        }
    }

    return positions;
}

/**
 * Processes regular Transfer logs for existing valid positions
 * @param {Array} logs - Transfer event logs
 * @returns {Object} Mapping of tokenId -> new owner address
 */
export function processTransferLogs(logs) {
    const transfers = {};
    const validTokenIds = new Set(validPositions.map(pos => pos.tokenId));
    const transferTopic = CONFIG.TRANSFER_TOPIC || "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    if (validTokenIds.size === 0) {
        return transfers;
    }

    let processedCount = 0;
    let ignoredCount = 0;

    for (const log of logs) {
        try {
            const topics = log.topics || [];

            if (topics.length >= 4 && topics[0] === transferTopic) {
                const fromAddress = "0x" + topics[1].slice(-40);
                const toAddress = "0x" + topics[2].slice(-40);
                const tokenId = parseInt(topics[3], 16);

                if (validTokenIds.has(tokenId)) {
                    transfers[tokenId] = toAddress;
                    console.log(`      ✓ Valid Transfer: Token ${tokenId} from ${fromAddress} to ${toAddress}`);
                    processedCount++;
                } else {
                    ignoredCount++;
                }
            }
        } catch (error) {
            console.log(`Error processing Transfer log: ${error.message}`);
            continue;
        }
    }

    if (ignoredCount > 0) {
        console.log(`      Ignored ${ignoredCount} transfers for non-valid positions`);
    }
    if (processedCount > 0) {
        console.log(`      Processed ${processedCount} transfers for valid positions`);
    }

    return transfers;
}

// ============================================
// POSITION VALIDATION FUNCTIONS
// ============================================

/**
 * Validates all positions in a single multicall (no batching)
 * @async
 * @param {Array} positionData - Array of position data with tokenId, txHash, blockNumber
 * @returns {Promise<Object>} Object with newValidPositions and newInvalidPositions arrays
 */
export async function validatePositionsFullMulticall(positionData) {
    const newValidPositions = [];
    const newInvalidPositions = [];
    const targetPoolKey = CONFIG.TARGET_POOL_KEY || {
        currency0: "0x6B19E31C1813cD00b0d47d798601414b79A3e8AD",
        currency1: "0xc4D4FD4F4459730d176844c170F2bB323c87Eb3B",
        fee: 8388608,
        tickSpacing: 60,
        hooks: "0x785319f8fCE23Cd733DE94Fd7f34b74A5cAa1000"
    };

    const tokenIds = positionData.map(p => p.tokenId);
    console.log(`Making single multicall for ${tokenIds.length} positions...`);

    const multicallResults = await multicallGetPoolAndPositionInfo(tokenIds);

    for (let i = 0; i < positionData.length; i++) {
        const { tokenId, txHash, blockNumber } = positionData[i];
        const multicallResult = multicallResults[i];

        if (!multicallResult.success || !multicallResult.result) {
            console.log(`Could not get pool info for token ${tokenId}`);
            continue;
        }

        const { poolKey, info } = multicallResult.result;
        console.log(`\nToken ${tokenId}:`);
        console.log(`  Currency0: ${poolKey.currency0}`);
        console.log(`  Currency1: ${poolKey.currency1}`);
        console.log(`  Fee: ${poolKey.fee}`);
        console.log(`  TickSpacing: ${poolKey.tickSpacing}`);
        console.log(`  Hooks: ${poolKey.hooks}`);
        console.log(`  Info: ${info}`);

        const owner = nftOwners[tokenId] || "Unknown";
        const timestamp = new Date().toISOString();
        const position = {
            tokenId,
            poolKey,
            owner,
            blockNumber,
            txHash,
            timestamp
        };

        if (poolKeyMatches(poolKey, targetPoolKey)) {
            console.log(`  ✓ VALID - matches target pool`);
            newValidPositions.push(position);
        } else {
            console.log(`  ✗ INVALID - does not match target pool`);
            newInvalidPositions.push(position);
        }
    }

    return { newValidPositions, newInvalidPositions };
}

// ============================================
// BLOCK SCANNING FUNCTIONS
// ============================================





































































































































/**
 * Configuration object for ModifyLiquidity scanning
 */
const CONFIG2 = {
    RPC_URL: "https://mainnet.base.org",
    POOL_MANAGER_ADDRESS: "0x498581ff718922c3f8e6a244956af099b2652b2b",
    TOKEN_OWNER_CHECKER: "0x94b1A7bE1df147DbeEbC6b06de577CcFeD9Dc052",
    NFT_CONTRACT: "0x7C5f5A4bBd8fD63184577525326123B519429bDc",
    MODIFY_LIQUIDITY_TOPIC: "0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec",
    MODIFY_LIQUIDITY_TOPIC2: "0xa2da1740db0db2cf3059413cc2b1ad1185d311ee69bbce1720459eea7c9e4bea",
    BLOCK_RANGE_SIZE: 1000,
    BATCH_SIZE: 1200,
    SLEEP_BETWEEN_BATCHES: 600
};






















/**
 * ABI for getOwnersSafe function
 */
const TOKEN_OWNER_CHECKER_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "nftContract", "type": "address"},
            {"internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]"}
        ],
        "name": "getOwnersSafe",
        "outputs": [
            {"internalType": "address[]", "name": "", "type": "address[]"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
];


/**
 * Calculate block ranges for scanning
 */
function calculateBlockRanges(fromBlock, toBlock, rangeSize = CONFIG2.BLOCK_RANGE_SIZE) {
    const ranges = [];
    for (let start = fromBlock; start <= toBlock; start += rangeSize) {
        const end = Math.min(start + rangeSize - 1, toBlock);
        ranges.push({ start, end });
    }
    return ranges;
}

/**
 * Get logs from the blockchain
 */
async function getLogs(provider, fromBlock, toBlock, topics, address) {
    try {
        const logs = await provider.getLogs({
            fromBlock,
            toBlock,
            topics,
            address
        });
        return logs;
    } catch (error) {
        console.error(`Error getting logs: ${error.message}`);
        throw error;
    }
}

/**
 * Process ModifyLiquidity logs and extract position data
 * The salt value IS the tokenId
 */
function processModifyLiquidityLogs(logs) {
    const positions = [];
    let skippedZeroToken = 0;

    for (const log of logs) {
        try {
            // topics[0] = event signature
            // topics[1] = poolId (indexed)
            // topics[2] = sender (indexed)
            const poolId = log.topics[1];
            
            // Decode the non-indexed parameters from data
            const decoded = ethers.utils.defaultAbiCoder.decode(
                ['int24', 'int24', 'int256', 'bytes32'],
                log.data
            );

            const tickLower = decoded[0];
            const tickUpper = decoded[1];
            const liquidityDelta = decoded[2];
            const salt = decoded[3];

            // The tokenId is the salt value directly
            const tokenId = ethers.BigNumber.from(salt);
            const tokenIdStr = tokenId.toString();

            // Skip tokenId = 0 (direct pool interactions, not NFT positions)
            if (tokenIdStr === '0') {
                skippedZeroToken++;
                continue;
            }

            positions.push({
                tokenId: tokenIdStr,
                txHash: log.transactionHash,
                blockNumber: log.blockNumber,
                poolId,
                salt,
                sender: ('0x' + log.topics[2].slice(26)).toLowerCase(), // Normalize to lowercase
                tickLower,
                tickUpper,
                liquidityDelta: liquidityDelta.toString(),
                logIndex: log.logIndex
            });
        } catch (error) {
            console.error(`Error processing log at block ${log.blockNumber}: ${error.message}`);
        }
    }

    if (skippedZeroToken > 0) {
        console.log(`  Skipped ${skippedZeroToken} events with tokenId=0 (non-NFT positions)`);
    }

    return positions;
}

async function batchCheckOwnership(provider, tokenIds, batchSize = CONFIG2.BATCH_SIZE) {
    const ownerCheckerContract = new ethers.Contract(
        CONFIG2.TOKEN_OWNER_CHECKER,
        TOKEN_OWNER_CHECKER_ABI,
        provider
    );

    const allOwners = {};
    const batches = [];

    // Split tokenIds into batches
    for (let i = 0; i < tokenIds.length; i += batchSize) {
        batches.push(tokenIds.slice(i, i + batchSize));
    }

    console.log(`  Checking ownership for ${tokenIds.length} tokens in ${batches.length} batches...`);

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Add a mandatory delay BEFORE each batch (except the first)
        if (i > 0) {
            const delayMs = CONFIG2.SLEEP_BETWEEN_BATCHES || 3000;
            console.log(`  ⏳ Waiting ${delayMs}ms before batch ${i + 1}/${batches.length}...`);
            await sleep(delayMs);
        }
        
        // Retry logic with exponential backoff
        const maxRetries = 5;
        let retryCount = 0;
        let success = false;

        while (retryCount <= maxRetries && !success) {
            try {
                // Only add EXTRA delay on retries
                if (retryCount > 0) {
                    const backoffTime = Math.min(Math.pow(2, retryCount) * 2000, 30000);
                    console.warn(`  ⏳ Retry ${retryCount}/${maxRetries} for batch ${i + 1}/${batches.length} after ${backoffTime}ms delay`);
                    await sleep(backoffTime);
                }

                // Convert string tokenIds to BigNumber for contract call
                const tokenIdBigNumbers = batch.map(id => ethers.BigNumber.from(id));
                
                const owners = await ownerCheckerContract.getOwnersSafe(
                    CONFIG2.NFT_CONTRACT,
                    tokenIdBigNumbers
                );

                // Map tokenIds to their owners
                for (let j = 0; j < batch.length; j++) {
                    const tokenId = batch[j];
                    const owner = owners[j];
                    
                    if (owner !== ethers.constants.AddressZero) {
                        allOwners[tokenId] = owner;
                    }
                }

                console.log(`  ✓ Batch ${i + 1}/${batches.length} completed (${batch.length} tokens)`);
                success = true;
                
            } catch (error) {
                retryCount++;
                
                const isRateLimit = error.message?.includes('429') || 
                                   error.message?.includes('Too Many Requests') ||
                                   error.code === 'NETWORK_ERROR';
                
                if (isRateLimit) {
                    console.warn(`  ⚠️ Rate limited on batch ${i + 1}/${batches.length} - attempt ${retryCount}/${maxRetries}`);
                }
                
                if (retryCount > maxRetries) {
                    console.error(`  ❌ Failed batch ${i + 1}/${batches.length} after ${maxRetries} retries: ${error.message}`);
                    break;
                } else {
                    if (!isRateLimit) {
                        console.warn(`  ⚠️ Error on batch ${i + 1}: ${error.message}`);
                    }
                }
            }
        }
    }

    console.log(`  ✓ Ownership check complete: ${Object.keys(allOwners).length}/${tokenIds.length} tokens have owners`);
    return allOwners;
}

/**
 * Validate positions by checking ownership
 * Similar to original validatePositions but uses batch ownership checking
 */
async function validatePositions(provider, positionData) {
    const newValidPositions = [];
    const newInvalidPositions = [];

    // Extract unique tokenIds (already strings)
    const uniqueTokenIds = [...new Set(positionData.map(p => p.tokenId))];
    
    console.log(`  Validating ${positionData.length} positions (${uniqueTokenIds.length} unique tokens)...`);

    // Batch check ownership
    const owners = await batchCheckOwnership(provider, uniqueTokenIds);

    // Process each position
    for (const posData of positionData) {
        const { tokenId, txHash, blockNumber, poolId, salt, sender, tickLower, tickUpper, liquidityDelta } = posData;
        const owner = owners[tokenId];  // tokenId is string, used as key

        const timestamp = new Date().toISOString();
        const position = {
            tokenId,  // Keep as string
            poolId,
            salt,
            sender,
            tickLower,
            tickUpper,
            liquidityDelta,
            owner: owner || "Unknown",
            blockNumber,
            txHash,
            timestamp
        };

        if (owner && owner !== ethers.constants.AddressZero) {
            console.log(`  ✓ Valid position ${tokenId} owned by ${owner}`);
            newValidPositions.push(position);
        } else {
            console.log(`  ✗ Invalid position ${tokenId} (no owner or burned)`);
            newInvalidPositions.push(position);
        }
    }

    return { newValidPositions, newInvalidPositions };
}
    var allPositionsToValidate = [];


/**
 * Scans blocks for ModifyLiquidity events and validates positions
 * @async
 * @param {number} fromBlock - Starting block
 * @param {number} toBlock - Ending block
 * @param {number} loopNumbers - Total number of loops for progress tracking
 * @returns {Promise<void>}
 */
export async function scanBlocks(fromBlock, toBlock, loopNumbers) {
    console.log(`\nScanning blocks ${fromBlock} to ${toBlock} for ModifyLiquidity events...`);
    
    const provider = new ethers.providers.JsonRpcProvider(CONFIG2.RPC_URL);
    const blockRanges = calculateBlockRanges(fromBlock, toBlock);
    
    // Collect all positions first before validating
   // const allPositionsToValidate = [];  move to where scanBlocks comes from

    for (const { start, end } of blockRanges) {
        scanLoopCounter++;
        currentBlockzzzz = end;

        // Update loading widget if available
        if (typeof updateLoadingStatusWidget === 'function' && typeof setLoadingProgress === 'function') {
            updateLoadingStatusWidget(`Loading All Positions for users<br>Loop #: ${scanLoopCounter} MaxLoop #: ${loopNumbers}`);
            setLoadingProgress(Math.floor((scanLoopCounter) / loopNumbers * 100));
        }

        console.log(`\n[Loop ${scanLoopCounter}/${loopNumbers}] Scanning sub-range: ${start} to ${end} (${end - start + 1} blocks)`);

        try {
            // Get ModifyLiquidity event logs
            const modifyLogs = await getLogs(
                provider,
                start,
                end,
                [
                    CONFIG2.MODIFY_LIQUIDITY_TOPIC,   // topic[0] - event signature
                    CONFIG2.MODIFY_LIQUIDITY_TOPIC2   // topic[1] - specific pool ID
                ],
                CONFIG2.POOL_MANAGER_ADDRESS
            );

            console.log(` Found ${modifyLogs.length} ModifyLiquidity events`);
            await sleep(100);

            if (modifyLogs.length === 0) {
                continue;
            }

            // Process logs to extract position data
            const positions = processModifyLiquidityLogs(modifyLogs);
            console.log(` Processed ${positions.length} positions`);

            // Add to batch for later validation
            allPositionsToValidate.push(...positions);

        } catch (error) {
            console.error(`Error scanning range ${start}-${end}: ${error.message}`);
        }
    }

}




/**
 * Reset global state (useful for fresh scans)
 */
export function resetScanState() {
    validPositions = [];
    invalidPositions = [];
    nftOwners = {};
    scanLoopCounter = 0;
    currentBlockzzzz = 0;
}

/**
 * Get current scan state
 */
export function getScanState() {
    return {
        validPositions: [...validPositions],
        invalidPositions: [...invalidPositions],
        nftOwners: { ...nftOwners },
        scanLoopCounter,
        currentBlockzzzz
    };
}

// Export CONFIG2 for external modification
export { CONFIG2 };

















/**
 * Prints a summary of monitoring results
 * @returns {void}
 */
export function printSummary() {
    const startBlock = CONFIG.START_BLOCK || 35937447;
    console.log(`\n${'='.repeat(50)}`);
    console.log("SUMMARY");
    console.log(`${'='.repeat(50)}`);
    console.log(`Blocks scanned: ${startBlock} to ${currentBlockzzzz}`);
    console.log(`Valid positions: ${validPositions.length}`);
    console.log(`Invalid positions: ${invalidPositions.length}`);
    console.log(`NFT owners tracked: ${Object.keys(nftOwners).length}`);

    if (validPositions.length > 0) {
        console.log(`\nVALID POSITIONS:`);
        for (const pos of validPositions) {
            console.log(`  Token ID: ${pos.tokenId}, Owner: ${pos.owner}, Block: ${pos.blockNumber}`);
        }
    } else {
        console.log(`\nNo valid positions found yet`);
    }

    if (Object.keys(nftOwners).length > 0) {
        console.log(`\nVALID NFT OWNERS (tracked):`);
        for (const [tokenId, owner] of Object.entries(nftOwners)) {
            console.log(`  Token ID: ${tokenId}, Owner: ${owner}`);
        }
    } else {
        console.log(`No valid NFT owners being tracked`);
    }
}

// ============================================
// MONITORING CONTROL FUNCTIONS
// ============================================

/**
 * Runs a single scan cycle
 * @async
 * @param {number} blocksPerScan - Maximum blocks to scan in one cycle
 * @returns {Promise<number>} Latest block number
 */
export async function runOnce(blocksPerScan = 1000) {
    const latestBlock = await getLatestBlock();

    if (currentBlockzzzz <= latestBlock) {
        const blocksToScan = Math.min(blocksPerScan, latestBlock - currentBlockzzzz + 1);
        const toBlock = currentBlockzzzz + blocksToScan - 1;

        console.log(`Latest block: ${latestBlock}, Current: ${currentBlockzzzz}, Scanning to: ${toBlock}`);

        await scanBlocks(currentBlockzzzz, toBlock, 1);
        currentBlockzzzz = toBlock + 1;
    } else {
        console.log(`Already caught up to block ${latestBlock}`);
    }

    printSummary();
    return latestBlock;
}



async function finishBlocksRun(){

    const provider = new ethers.providers.JsonRpcProvider(CONFIG2.RPC_URL);

    
    // Merge new positions with existing positions for validation
    console.log(`\n=== Validating All Positions (New + Existing) ===`);
    console.log(`New positions found: ${allPositionsToValidate.length}`);
    console.log(`Existing positions: ${validPositions.length}`);

    // Create a map of all positions by tokenId (new positions will override old ones)
    const allPositionsMap = new Map();

    // Add existing positions first (with validation and field name normalization)
    for (const existingPos of validPositions) {
        // Normalize field names - handle both token_id and tokenId
        const tokenId = existingPos.tokenId || existingPos.token_id;
        
        if (tokenId) {
            // Normalize the position object to use camelCase and lowercase addresses
            const normalizedPos = {
                tokenId: tokenId.toString(),
                poolId: existingPos.poolId || existingPos.pool_id,
                poolKey: existingPos.poolKey || existingPos.pool_key,
                salt: existingPos.salt,
                sender: existingPos.sender ? existingPos.sender.toLowerCase() : existingPos.sender,
                tickLower: existingPos.tickLower || existingPos.tick_lower,
                tickUpper: existingPos.tickUpper || existingPos.tick_upper,
                liquidityDelta: existingPos.liquidityDelta || existingPos.liquidity_delta,
                owner: existingPos.owner ? existingPos.owner.toLowerCase() : existingPos.owner,
                blockNumber: existingPos.blockNumber || existingPos.block_number,
                txHash: existingPos.txHash || existingPos.tx_hash,
                timestamp: existingPos.timestamp
            };
            allPositionsMap.set(tokenId.toString(), normalizedPos);
        } else {
            console.warn(`  ⚠ Skipping position with missing tokenId:`, existingPos);
        }
    }

    // Add/update with new positions (this will update if tokenId already exists)
    for (const newPos of allPositionsToValidate) {
        if (newPos && newPos.tokenId) {
            allPositionsMap.set(newPos.tokenId, newPos);
        } else {
            console.warn(`  ⚠ Skipping invalid new position:`, newPos);
        }
    }

    // Convert map to array for validation
    const allPositionsArray = Array.from(allPositionsMap.values());
    const allTokenIds = Array.from(allPositionsMap.keys()).filter(id => id !== undefined && id !== null);

    console.log(`Total unique positions to validate: ${allPositionsArray.length}`);
    console.log(`Total unique tokenIds: ${allTokenIds.length}`);

    if (allTokenIds.length > 0) {
        // Batch check ownership for ALL positions at once
        console.log(`  Checking ownership for ${allTokenIds.length} tokens...`);
        await sleep(500);
        const owners = await batchCheckOwnership(provider, allTokenIds);

        // Reset the arrays
        const newValidPositions = [];
        const newInvalidPositions = [];
        let ownershipChanges = 0;

        // Process all positions
        for (const position of allPositionsArray) {
            if (!position || !position.tokenId) {
                console.warn(`  ⚠ Skipping position with missing tokenId:`, position);
                continue;
            }

            const newOwner = owners[position.tokenId];
            const newOwnerLower = newOwner ? newOwner.toLowerCase() : null;
            const oldOwnerLower = position.owner ? position.owner.toLowerCase() : null;

            if (newOwnerLower && newOwnerLower !== ethers.constants.AddressZero.toLowerCase()) {
                // Valid position with owner
                if (oldOwnerLower && oldOwnerLower !== "unknown" && oldOwnerLower !== newOwnerLower) {
                    console.log(`  ⟳ Ownership changed for token ${position.tokenId}: ${oldOwnerLower} → ${newOwnerLower}`);
                    ownershipChanges++;
                }
                position.owner = newOwnerLower;
                position.timestamp = new Date().toISOString();
                newValidPositions.push(position);
                console.log(`  ✓ Valid position ${position.tokenId} owned by ${newOwnerLower}`);
            } else {
                // Invalid position (burned or no owner)
                console.log(`  ✗ Position ${position.tokenId} invalid (no owner or burned)`);
                position.owner = "Unknown";
                newInvalidPositions.push(position);
            }
        }

        // Update global state with validated positions
        validPositions = newValidPositions;
        invalidPositions = newInvalidPositions;

        // Rebuild nftOwners object with lowercase addresses
        nftOwners = {};
        for (const validPos of validPositions) {
            if (validPos && validPos.tokenId && validPos.owner) {
                nftOwners[validPos.tokenId] = validPos.owner.toLowerCase();
            }
        }

        console.log(`\n  Validation complete:`);
        console.log(`    - Total validated: ${allPositionsArray.length}`);
        console.log(`    - Valid positions: ${newValidPositions.length}`);
        console.log(`    - Invalid positions: ${newInvalidPositions.length}`);
        console.log(`    - Ownership changes detected: ${ownershipChanges}`);
    } else {
        console.log(`  No valid tokenIds to validate`);
    }

    // Save data locally if function is available
    if (typeof saveDataLocally === 'function') {
        const storageKey = 'testnet_uniswap_v4_local_data';
        saveDataLocally(storageKey, {
            metadata: {
                last_updated: new Date().toISOString(),
                current_block: currentBlockzzzz,
                total_valid_positions: validPositions.length,
                total_nft_owners: Object.keys(nftOwners).length
            },
            valid_positions: validPositions,
            invalid_positions: invalidPositions,
            nft_owners: nftOwners
        });
    }

    console.log(`\n=== Scan Complete ===`);
    console.log(`Total valid positions: ${validPositions.length}`);
    console.log(`Total invalid positions: ${invalidPositions.length}`);
    console.log(`Total NFT owners: ${Object.keys(nftOwners).length}`);


                        allPositionsToValidate = [];
                        // VERY IMPORTANT ABOVE NEEDS RESET TO FIND NEW allPositionstoValidate!





}





























/**
 * 
 * 
 * Runs continuous monitoring
 * @async
 * @param {number} blocksPerScan - Maximum blocks to scan per cycle
 * @param {number} sleepSeconds - Seconds to wait between scans
 * @returns {Promise<void>}
 */
/**
 * Runs continuous monitoring
 * @async
 * @param {number} blocksPerScan - Maximum blocks to scan per cycle
 * @param {number} sleepSeconds - Seconds to wait between scans
 * @returns {Promise<void>}
 */
export async function runContinuous(blocksPerScan = 1000, sleepSeconds = 10) {
    console.log("Starting continuous monitoring...");
    console.log("Will continuously scan to the newest block");
    console.log("Call stopMonitoring() to stop");

    if (typeof showLoadingWidget === 'function') {
        showLoadingWidget('Loading all positions from Uniswap');
    }
    if (typeof updateLoadingStatusWidget === 'function') {
        updateLoadingStatusWidget('Loading All Positions logs');
    }

    isRunning = true;
    latestSearch = false;

    while (isRunning) {
        WeAreSearchingLogsRightNow = true;

        try {
            // Fetch latest block ONCE at the start of each scan cycle
            const latestBlock = await getLatestBlock();
            const numOfLoops = Math.ceil((latestBlock - currentBlockzzzz) / 990);

            if (typeof updateLoadingStatusWidget === 'function') {
                updateLoadingStatusWidget(`Loading All Positions for users<br>Loop #: 0 MaxLoop #: ${numOfLoops}`);
            }
            if (typeof setLoadingProgress === 'function') {
                setLoadingProgress(0);
            }
            var loopCount = 0;
            var adjustmentNeeded = 0;
            
            if (currentBlockzzzz <= latestBlock) {
                // Reset loop counter at start of fresh scan session
                scanLoopCounter = 0;
                const remainingBlocks = latestBlock - currentBlockzzzz + 1;
                console.log(`\n${remainingBlocks} blocks behind latest (${currentBlockzzzz} → ${latestBlock})`);

                // Use the cached latestBlock for the entire scan
                while (currentBlockzzzz <= latestBlock && isRunning) {
                    const blocksToScan = Math.min(blocksPerScan, latestBlock - currentBlockzzzz + 1);
                    const toBlock = currentBlockzzzz + blocksToScan - 1;
                    adjustmentNeeded = (blocksToScan + 1) / (latestBlock - currentBlockzzzz);

                    if (blocksToScan > 0) {
                        console.log(`Scanning blocks ${currentBlockzzzz} to ${toBlock} (${blocksToScan} blocks)`);
                        await scanBlocks(currentBlockzzzz, toBlock, numOfLoops);
                        currentBlockzzzz = toBlock + 1;

                        if (currentBlockzzzz <= latestBlock && isRunning) {
                            await sleep(250);
                        }
                    } else {
                        break;
                    }
                    
                    if (loopCount % 20 == 0 &&  remainingBlocks > blocksPerScan*6) {
                        console.log("Running 1 in 20 finishBlocksRun to save and finalize data for us");
                        
                        await finishBlocksRun();

                    }
                    loopCount = loopCount + 1;
                }

                try {
                    await finishBlocksRun();
                } catch (error) {
                    console.warn("finishBlocksRun error after loop?");
                }

                printSummary();
                if (typeof hideLoadingWidget === 'function') {
                    hideLoadingWidget();
                }

                // Save data to localStorage after completing sync
                const storageKey = 'testnet_uniswap_v4_local_data';
                saveDataLocally(storageKey, {
                    metadata: {
                        last_updated: new Date().toISOString(),
                        current_block: currentBlockzzzz,
                        total_valid_positions: validPositions.length,
                        total_nft_owners: Object.keys(nftOwners).length
                    },
                    valid_positions: validPositions,
                    nft_owners: nftOwners
                });
                console.log(`✓ Position data saved to localStorage`);

                console.log(`✓ Caught up to block ${latestBlock}`);
                WeAreSearchingLogsRightNow = false;
            } else {
                
                        await finishBlocksRun();
                WeAreSearchingLogsRightNow = false;
                console.log(`Up to date at block ${latestBlock}`);
            }

            if (isRunning && !forceRefresh) {
                latestSearch = true;
                console.log(`Waiting ${sleepSeconds}s before checking for new blocks...`);
                let waitTime = 0;
                while (!forceRefresh && waitTime < sleepSeconds) {
                    await sleep(1000);
                    waitTime++;
                    if (waitTime % 10 === 0) {
                        console.log(`Still waiting... ${sleepSeconds - waitTime}s remaining`);
                    }
                }
            }

            if (forceRefresh) {
                forceRefresh = false;
                console.log("Force refresh activated - checking immediately");
            }
        } catch (error) {
            console.error(`Error in monitoring loop: ${error.message}`);
            if (isRunning) {
                console.log("Retrying in 30 seconds...");
                await sleep(30000);
            }
        }
    }

                WeAreSearchingLogsRightNow = false;
    console.log("Monitor stopped.");
    if (typeof hideLoadingWidget === 'function') {
        hideLoadingWidget();
    }
    printSummary();
}

/**
 * Stops the continuous monitoring
 * @returns {void}
 */
export function stopMonitoring() {
    isRunning = false;
    console.log("Stopping monitor...");
}

// ============================================
// EXPORTS
// ============================================

console.log('Data-loader module initialized');
