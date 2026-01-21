/**
 * charts.js - Chart functionality module for B0x Token
 *
 * This module handles all chart-related functionality including:
 * - Price chart initialization and rendering
 * - Mining statistics charts (hashrate, difficulty, block time, revenue)
 * - Blockchain data fetching and processing
 * - Chart.js configuration and custom plugins
 *
 * @module charts
 */

import { ProofOfWorkAddresss } from './config.js';

// ============================================================================
// Constants and Configuration
// ============================================================================

export const CHART_CONSTANTS = {
    MAXIMUM_TARGET_STR_OLD: "27606985387162255149739023449108101809804435888681546220650096895197184",  // 2**234
    BWORK_RPC: 'https://gateway.tenderly.co/public/base',  // Best RPC for graphs/stats
    BWORK_CONTRACT_ADDRESS: '0xd44Ee7dAdbF50214cA7009a29D9F88BCcD0E9Ff4',
    BWORK_LAST_DIFF_START_BLOCK_INDEX: '6',
    BWORK_ERA_INDEX: '7',
    BWORK_TOKENS_MINTED_INDEX: '12',
    BWORK_MINING_TARGET_INDEX: '4',
    SECONDS_PER_ETH_BLOCK: 2,
    IDEAL_BLOCK_TIME_SECONDS: 600,
    HASHRATE_MULTIPLIER: 2 ** 22,
    ETH_BLOCK_START: 30489059,
    ETH_BLOCK_START_B0X: 35930446,
    ADJUST_AVERAGE_REWARD_TIME_GRAPH: 8
};



/**
 * Initialize the BigNumber constant for maximum target
 * @param {Object} ethers - Ethers.js library instance
 */
export function initializeChartConstants(ethers) {
    _MAXIMUM_TARGET_BN_OLD = ethers.BigNumber.from(CHART_CONSTANTS.MAXIMUM_TARGET_STR_OLD);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Query selector helper
 * @param {string} selector - CSS selector
 * @returns {Element} DOM element
 */
function el(selector) {
    return document.querySelector(selector);
}

/**
 * Console log wrapper
 * @param {...any} args - Arguments to log
 */
function log(...args) {
    console.log(...args);
}

/**
 * Sleep/delay helper
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Convert number to readable thousands format (K/M)
 * @param {number} num - Number to format
 * @returns {string} Formatted string
 */
export function toReadableThousands(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * Convert number to readable thousands format with comma separators
 * @param {number} num - Number to format
 * @returns {string} Formatted string with commas
 */
export function toReadableThousandsLong(num) {
    return num.toLocaleString();
}

/**
 * Convert hashrate to readable format with units
 * @param {number} hashrate - Hashrate value
 * @returns {string} Formatted hashrate string
 */
export function toReadableHashrate(hashrate) {
    if (hashrate >= 1e12) {
        return (hashrate / 1e12).toFixed(2) + ' TH/s';
    } else if (hashrate >= 1e9) {
        return (hashrate / 1e9).toFixed(2) + ' GH/s';
    } else if (hashrate >= 1e6) {
        return (hashrate / 1e6).toFixed(2) + ' MH/s';
    } else if (hashrate >= 1e3) {
        return (hashrate / 1e3).toFixed(2) + ' KH/s';
    }
    return hashrate.toFixed(2) + ' H/s';
}

/**
 * Convert Base network block number to timestamp
 * @param {number} blockNumber - Block number
 * @returns {string} Formatted date string
 */
function ethBlockNumberToTimestamp2(blockNumber) {
    // Block 34966000 was mined on Sep-01-2025 10:09:07 AM +UTC
    const referenceBlock = 34966000;
    const referenceTimestamp = 1756717747; // Unix timestamp for Sep 1, 2025 10:09:07 UTC
    const avgBlockTime = 2; // Base's avg block time is ~2 seconds

    const blockDifference = blockNumber - referenceBlock;
    const timeDifference = blockDifference * avgBlockTime;
    const blockTimestamp = referenceTimestamp + timeDifference;

    return new Date(blockTimestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}




// Configuration constants
const _MAXIMUM_TARGET_STR_OLD = CHART_CONSTANTS.MAXIMUM_TARGET_STR_OLD;  // 2**234

let latest_eth_block = null;
let BWORK_latest_eth_block = null;

          let  ethersProvider = new ethers.providers.JsonRpcProvider(CHART_CONSTANTS.BWORK_RPC);
let _ZERO_BN;
let _MAXIMUM_TARGET_BN_OLD;

export async function initEthers2() {
    console.log("Initializing initEthers...");
    await initEthers();
    // your ethers setup logic
}
var retryAt1123123123 = 0;
// Initialize Ethers connection
async function initEthers() {
    try {
        if (false) {
            //if (window.ethereum) {
            //no metamask for Graphs
            // await window.ethereum.request({ method: 'eth_requestAccounts' });
            // await switchToBaseMainnet();
            // ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
            // ethersSigner = ethersProvider.getSigner();
        } else {
            ethersProvider = new ethers.providers.JsonRpcProvider(CHART_CONSTANTS.BWORK_RPC);
        }

        // Initialize BigNumber constants after ethers is ready
        _ZERO_BN = ethers.BigNumber.from(0);
        _MAXIMUM_TARGET_BN_OLD = ethers.BigNumber.from(_MAXIMUM_TARGET_STR_OLD);

        // Get latest block
        const latestBlock = await ethersProvider.getBlockNumber();
        BWORK_latest_eth_block = latestBlock;
        latest_eth_block = BWORK_latest_eth_block;

        log('Connected to Base Mainnet. Latest block:', BWORK_latest_eth_block);
    } catch (error) {
        console.error('Failed to connect to Ethereum:', error);
        // Initialize fallback values
        ethersProvider = new ethers.providers.JsonRpcProvider(BWORK_RPC);
        _ZERO_BN = ethers.BigNumber.from(0);
        _MAXIMUM_TARGET_BN_OLD = ethers.BigNumber.from(_MAXIMUM_TARGET_STR_OLD);
        // Use a fallback block number if connection fails
        try {
            BWORK_latest_eth_block = await ethersProvider.getBlockNumber();
            latest_eth_block = BWORK_latest_eth_block;
        } catch (error) {
            console.log("ERROR : ", error);
            await sleep(2000 * retryAt1123123123 ** 2);
            await initEthers();
            retryAt1123123123 += 1;
            if (retryAt1123123123 > 3) {
                return;
            }
        }
        retryAt1123123123 = 0;
    }
}

/**
 * Convert BWORK eth block number to date string
 * @param {number} blockNumber - Block number
 * @returns {string} Formatted date string
 */
export function BWORKethBlockNumberToDateStr(blockNumber) {
    return ethBlockNumberToTimestamp2(blockNumber);
}

/**
 * Get responsive font size based on window width
 * @param {number} baseSize - Base font size
 * @returns {number} Scaled font size
 */
export function getResponsiveFontSize(baseSize) {
    const width = window.innerWidth;
    if (width >= 1920) return baseSize * 2.5;      // Large screens: 250%
    if (width >= 1440) return baseSize * 2;        // Desktop: 200%
    if (width >= 1024) return baseSize * 1.75;     // Tablet landscape: 175%
    if (width >= 768) return baseSize * 1.5;       // Tablet: 150%
    return baseSize * 1;                           // Mobile: 100%
}

/**
 * Navigate to URL anchor (placeholder for actual implementation)
 */
function goToURLAnchor() {
    // Placeholder function
}

// ============================================================================
// Price Data Fetching
// ============================================================================

export let pricesLoaded = false;
let lastUpdatedString = '';

/**
 * Fetch price data from primary and backup sources
 * @param {string} customDataSource - Primary data source URL
 * @param {string} customBACKUPDataSource - Backup data source URL
 * @returns {Promise<Object>} Price data object with prices, timestamps, blocks, and lastUpdated
 */
export async function fetchPriceData(customDataSource, customBACKUPDataSource) {
    console.log("customDataSource: ", customDataSource);
    const primaryUrl = customDataSource + 'price_data_bwork_mainnetv2.json';
    const backupUrl = customBACKUPDataSource + 'price_data_bwork_mainnetv2.json';

    try {
        console.log('Fetching price data from primary source...');
        const response = await fetch(primaryUrl);

        if (!response.ok) {
            throw new Error(`Primary source failed with status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Primary source successful for price data');

        // Extract the prices array from the JSON structure
        const prices = data.prices || [];
        const timestamps = data.timestamps || [];
        const blocks = data.blocks || [];
        const lastUpdated = data.last_updated || null;
        const date = new Date(lastUpdated * 1000);

        // Convert from Central Time to local time
        lastUpdatedString = date.toLocaleString('en-US', {
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // User's local timezone
        });

        // Or if you want to show both Central and Local time:
        const centralTime = date.toLocaleString('en-US', {
            timeZone: 'America/Chicago'
        });
        const localTime = date.toLocaleString();

        lastUpdatedString = `${localTime} (was ${centralTime} CT)`;

        console.log(`Last updated: ${lastUpdatedString}`);
        console.log(`Loaded ${prices.length} price data points`);

        pricesLoaded = true;
        return {
            prices: prices,
            timestamps: timestamps,
            blocks: blocks,
            lastUpdated: lastUpdatedString
        };

    } catch (primaryError) {
        console.warn('⚠️ Primary source failed for price data:', primaryError.message);
        console.log('🔄 Falling back to GitHub backup for price data...');

        try {
            const backupResponse = await fetch(backupUrl);

            if (!backupResponse.ok) {
                throw new Error(`Backup source failed with status: ${backupResponse.status}`);
            }

            const data = await backupResponse.json();
            console.log('✅ Backup source successful for price data');

            // Extract the prices array from the JSON structure
            const prices = data.prices || [];
            const timestamps = data.timestamps || [];
            const blocks = data.blocks || [];
            const lastUpdated = data.last_updated || null;
            const date = new Date(lastUpdated * 1000);

            // Convert from Central Time to local time
            lastUpdatedString = date.toLocaleString('en-US', {
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // User's local timezone
            });

            // Or if you want to show both Central and Local time:
            const centralTime = date.toLocaleString('en-US', {
                timeZone: 'America/Chicago'
            });
            const localTime = date.toLocaleString();

            lastUpdatedString = `${localTime} (was ${centralTime} CT) [FROM BACKUP]`;

            console.log(`Last updated: ${lastUpdatedString}`);
            console.log(`Loaded ${prices.length} price data points from backup`);

            pricesLoaded = true;
            return {
                prices: prices,
                timestamps: timestamps,
                blocks: blocks,
                lastUpdated: lastUpdatedString
            };

        } catch (backupError) {
            console.error('❌ Both primary and backup sources failed for price data!');
            console.error('Primary error:', primaryError.message);
            console.error('Backup error:', backupError.message);

            // Fallback data if both sources fail
            const fallbackData = {
                prices: [],
                timestamps: [],
                blocks: [],
                lastUpdated: 'Unable to fetch data - all sources failed'
            };
            pricesLoaded = true;
            return fallbackData;
        }
    }
}

// ============================================================================
// Main Price Chart Initialization
// ============================================================================

let graphData, prices, timestamps;

/**
 * Initialize the main price chart
 * @param {Function} loadSettings - Function to load settings
 * @param {string} customDataSource - Primary data source URL
 * @param {string} customBACKUPDataSource - Backup data source URL
 * @returns {Promise<void>}
 */
export async function initializeChart(loadSettings, customDataSource, customBACKUPDataSource) {
    console.log("Loading setting: customDataSource: ", customDataSource);
    await loadSettings();
    console.log("AFTER setting: customDataSource: ", customDataSource);

    // Fetch both price and timestamp data
    graphData = await fetchPriceData(customDataSource, customBACKUPDataSource);

    // Generate corresponding timestamps
    prices = graphData.prices;
    timestamps = graphData.timestamps;

    // Convert timestamps to human-readable labels with relative time
    const now = Date.now() / 1000; // Current time in seconds
    const labels = timestamps.map(ts => {
        const diffSeconds = now - ts;
        const diffMinutes = diffSeconds / 60;
        const diffHours = diffMinutes / 60;
        const diffDays = diffHours / 24;

        if (diffMinutes < 60) {
            return `${Math.round(diffMinutes)}min ago`;
        } else if (diffHours < 24) {
            return `${diffHours.toFixed(1)}h ago`;
        } else {
            return `${diffDays.toFixed(1)} days ago`;
        }
    });

    let minPrice = 10000000000;
    let maxPrice = 0;

    // Create movement bars data - each bar spans from previous price to current price
    const movementBars = [];
    for (let i = 1; i < prices.length; i++) {
        const prevPrice = prices[i - 1];
        if (minPrice > prices[i]) {
            minPrice = prices[i];
        }
        if (maxPrice < prices[i]) {
            maxPrice = prices[i];
        }
        const currentPrice = prices[i];
        movementBars.push({
            x: i - 0.5, // Position between previous and current point
            y: Math.min(prevPrice, currentPrice), // Bottom of bar
            w: 1, // Width spans full interval
            h: Math.abs(currentPrice - prevPrice) // Height is the price difference
        });
    }

    console.log("minPrice: ", minPrice);
    const ctx = document.getElementById('priceChart').getContext('2d');

    // Custom plugin to draw the movement bars
    const movementBarsPlugin = {
        id: 'movementBars',
        afterDatasetsDraw: function (chart) {
            const ctx = chart.ctx;
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;

            movementBars.forEach((bar, index) => {
                const prevPrice = prices[index];
                const currentPrice = prices[index + 1];
                const isUp = currentPrice >= prevPrice;

                // Calculate pixel positions
                const xStart = xAxis.getPixelForValue(index);
                const xEnd = xAxis.getPixelForValue(index + 1);
                const yStart = yAxis.getPixelForValue(prevPrice);
                const yEnd = yAxis.getPixelForValue(currentPrice);

                // Draw the vertical bar
                ctx.fillStyle = isUp ? 'rgba(147, 51, 234, 0.6)' : 'rgba(234, 179, 8, 0.6)';
                ctx.strokeStyle = isUp ? 'rgba(147, 51, 234, 1)' : 'rgba(234, 179, 8, 1)';
                ctx.lineWidth = 1;

                const barWidth = (xEnd - xStart) * 0.8; // 80% of the interval width
                const barX = xStart + (xEnd - xStart - barWidth) / 2; // Center the bar

                // Draw filled rectangle from prevPrice to currentPrice
                ctx.fillRect(barX, Math.min(yStart, yEnd), barWidth, Math.abs(yEnd - yStart));
                ctx.strokeRect(barX, Math.min(yStart, yEnd), barWidth, Math.abs(yEnd - yStart));
            });
        }
    };

    let divideby = 8;
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    if (mediaQuery.matches) {
        divideby = 4;
    }

    const priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '',
                    data: prices,
                    borderColor: 'rgba(0, 0, 0, 0)', // Transparent border
                    backgroundColor: 'rgba(0, 0, 0, 0)', // Transparent background
                    fill: false,
                    tension: 0,
                    pointRadius: 0, // No points
                    pointHoverRadius: 0, // No hover points
                    borderWidth: 0, // No border width
                    order: 1,
                    yAxisID: 'y' // Explicitly assign to the y-axis
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '',
                        color: 'white',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    type: 'category',
                    ticks: {
                        color: 'white',
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: false,
                        maxTicksLimit: 10,
                        callback: function (value, index) {
                            const totalPoints = labels.length;
                            const showEvery = Math.max(1, Math.floor(totalPoints / divideby));

                            if (index % showEvery === 0 || index === totalPoints - 1) {
                                if (divideby == 4) {
                                    let label = labels[index];
                                    console.log("label2: ", label);
                                    if (totalPoints - showEvery < index && index != totalPoints - 1) {
                                        console.log("not showing index: ", index);
                                        return null;
                                    }

                                    if (label.includes('days ago')) {
                                        const days = Math.round(parseFloat(label));
                                        const result = days + 'd ago';
                                        return result;
                                    } else if (label.includes('hours ago')) {
                                        const hours = Math.round(parseFloat(label));
                                        const result = hours + 'h ago';
                                        return result;
                                    }
                                    if (label.includes('min ago')) {
                                        const min = parseFloat(label);
                                        const result = min + "m ago";
                                        return result;
                                    }
                                } else {
                                    let label = labels[index];

                                    if (totalPoints - showEvery < index && index != totalPoints - 1) {
                                        return null;
                                    }
                                    if (label.includes('min ago')) {
                                        const min = parseFloat(label);
                                        const result = min + " min ago";
                                        return result;
                                    }
                                    if (label.includes('h ago')) {
                                        const min = parseFloat(label);
                                        const result = min + " hours ago";
                                        return result;
                                    }
                                    return label;
                                }
                            }
                            return null;
                        }
                    },
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    position: 'right',
                    display: true,
                    title: {
                        display: true,
                        text: 'Price (USD $)',
                        color: 'white',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    beginAtZero: false,
                    ticks: {
                        color: 'white',
                        callback: function (value) {
                            if (0.025 < minPrice) {
                                return '$' + value.toFixed(2);
                            } else if (0.0025 < minPrice) {
                                return '$' + value.toFixed(3);
                            } else if (0.00025 < minPrice) {
                                return '$' + value.toFixed(4);
                            }
                        }
                    },
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return `$${context.parsed.y.toFixed(8)}`;
                        },
                        afterBody: function (context) {
                            const dataIndex = context[0].dataIndex;
                            if (dataIndex > 0) {
                                const currentPrice = prices[dataIndex];
                                const prevPrice = prices[dataIndex - 1];
                                const change = currentPrice - prevPrice;
                                const changePercent = ((change / prevPrice) * 100).toFixed(2);

                                const date = new Date(timestamps[dataIndex] * 1000);
                                const timeStr = date.toLocaleString();

                                return [
                                    `Time: ${timeStr}`,
                                    `Previous: $${prevPrice.toFixed(8)}`,
                                    `Current: $${currentPrice.toFixed(8)}`,
                                    `Change: ${change >= 0 ? '+' : ''}$${Math.abs(change).toFixed(8)}`,
                                    `(${change >= 0 ? '+' : ''}${changePercent}%)`
                                ];
                            }
                            return [`Time: ${new Date(timestamps[dataIndex] * 1000).toLocaleString()}`];
                        }
                    }
                }
            }
        },
        plugins: [movementBarsPlugin]
    });
}

// ============================================================================
// Contract Value Over Time Class
// ============================================================================

/**
 * Class to track and fetch contract storage values over time
 */
export class contractValueOverTime {
    /**
     * Create a new contractValueOverTime instance
     * @param {Object} ethersProviderInstance - Ethers provider instance
     * @param {string} contract_address - Contract address
     * @param {string} storage_index - Storage slot index
     * @param {string} descriptor - Descriptor name for caching
     */
    constructor(ethersProviderInstance, contract_address, storage_index, descriptor) {
        this.WAIT_DELAY_FIXED_MS = 120;
        this.WAIT_DELAY_ON_TIMEOUT_MS = 1500;
        this.ethersProvider = ethersProviderInstance;
        this.contract_address = contract_address;
        this.storage_index = storage_index;
        this.descriptor = descriptor;
        this.sorted = false;
        this.states = [];
        this.expected_state_length = 0;
        this.pending_requests = [];
    }

    get getValues() {
        return this.states;
    }

    printValuesToLog() {
        this.states.forEach((value) => {
            log('block #', value[0], 'ts', value[2], 'value[1]:', value[1].toString());
        });
    }

    /**
     * Load cached blocks in range from localStorage
     * @param {number} startBlock - Start block number
     * @param {number} endBlock - End block number
     * @param {string} timeRangeLabel - Time range label for cache key
     * @returns {Array} Cached results
     */
    loadFromCache(startBlock, endBlock, timeRangeLabel) {
        const contractPrefix = CHART_CONSTANTS.BWORK_CONTRACT_ADDRESS.slice(0, 7);
        const key = `${this.descriptor}_${timeRangeLabel}_${contractPrefix}`;
        let cache = JSON.parse(localStorage.getItem(key)) || {};
        let results = [];

        for (let blockStr in cache) {
            let block = parseInt(blockStr, 10);
            if (block >= startBlock && block <= endBlock) {
                let value_bn = ethers.BigNumber.from('0x' + cache[blockStr]);
                results.push([block, value_bn, '']);
            }
        }

        results.sort((a, b) => a[0] - b[0]);
        this.states.push(...results);
        this.expected_state_length += results.length;

        return results;
    }

    /**
     * Add values in a range with caching support
     * @param {number} start_eth_block - Start block
     * @param {number} end_eth_block - End block
     * @param {number} num_search_points - Number of data points
     * @param {number} tolerance - Block tolerance for cache reuse
     * @returns {Promise<void>}
     */
    async addValuesInRange(start_eth_block, end_eth_block, num_search_points, tolerance = 100) {
        const stepsize = Math.floor((end_eth_block - start_eth_block) / num_search_points);
        console.log('stepsize', stepsize, 'num_search_points', num_search_points);

        // Load cached blocks
        const cached = this.loadFromCache(start_eth_block, end_eth_block, num_search_points);
        if (cached.length > 0) {
            console.log(`Loaded ${cached.length} cached blocks for ${this.descriptor}_${num_search_points}`);
        }

        // Track loaded blocks globally
        const loadedBlocks = Array.from(this.states.map(s => s[0]));

        // Align end block to UTC midnight
        const d = new Date();
        const secondsSinceMidnight = (d.getTime() - d.setUTCHours(0, 0, 0, 0)) / 1000;
        const blocksSinceMidnight = Math.floor(secondsSinceMidnight / CHART_CONSTANTS.SECONDS_PER_ETH_BLOCK);
        const alignedEndBlock = end_eth_block - blocksSinceMidnight;

        // Collect blocks to fetch
        const blocks_to_fetch = [];
        for (let i = 0; i < num_search_points; i++) {
            const block_num = alignedEndBlock - (stepsize * i);

            // Reuse cached blocks within tolerance
            const exists = loadedBlocks.some(b => Math.abs(b - block_num) <= tolerance);
            if (!exists) {
                blocks_to_fetch.push(block_num);
            }
        }

        if (blocks_to_fetch.length > 0) {
            await this.batchGetStorageAt(blocks_to_fetch);
        }
    }

    /**
     * Batch fetch storage values
     * @param {Array<number>} blockNumbers - Block numbers to fetch
     * @param {number} batchSize - Batch size for requests
     * @returns {Promise<void>}
     */
    async batchGetStorageAt(blockNumbers, batchSize = 20) {
        blockNumbers = blockNumbers.filter(block => block >= CHART_CONSTANTS.ETH_BLOCK_START);
        if (blockNumbers.length === 0) return;

        // Precompute storage slot once
        let storageSlot;
        if (this.storage_index?.slice(0, 2) == '0x') {
            if (this.storage_index.length > 10) {
                storageSlot = this.storage_index;
            } else {
                storageSlot = '0x' + ethers.BigNumber.from(this.storage_index.slice(2)).toHexString().slice(2);
            }
        } else {
            storageSlot = '0x' + ethers.BigNumber.from(this.storage_index).toHexString().slice(2);
        }

        for (let i = 0; i < blockNumbers.length; i += batchSize) {
            const batch = blockNumbers.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(blockNumbers.length / batchSize);

            log(`Processing batch ${batchNumber}/${totalBatches} for ${this.descriptor}`);

            try {
                // Create all promises for the batch
                const promises = batch.map(blockNum =>
                    this.ethersProvider.getStorageAt(
                        this.contract_address,
                        storageSlot,
                        Math.round(blockNum)
                    )
                        .then(value => this.processStorageValue(Math.round(blockNum), value))
                        .catch(error => {
                            console.error('Error fetching block', blockNum, ':', error);
                            return this.addValueAtEthBlock(blockNum);
                        })
                );

                // Execute all requests concurrently
                await Promise.all(promises);

                this.expected_state_length += batch.length;

                await sleep(200);
                // Rate limiting between batches
                if (i + batchSize < blockNumbers.length) {
                    await sleep(400);
                }

            } catch (error) {
                console.error('Batch request failed:', error);

                // Fallback: process each block individually with retries
                for (const blockNum of batch) {
                    try {
                        const value = await this.ethersProvider.getStorageAt(
                            this.contract_address,
                            storageSlot,
                            Math.round(blockNum)
                        );
                        await this.processStorageValue(Math.round(blockNum), value);
                    } catch (individualError) {
                        console.error('Individual request also failed for block', blockNum, ':', individualError);
                        await this.addValueAtEthBlock(blockNum);
                    }
                    await sleep(200);
                }
            }
        }
    }

    /**
     * Process storage value from blockchain
     * @param {number} eth_block_num - Block number
     * @param {string} value - Storage value
     * @returns {Promise<void>}
     */
    async processStorageValue(eth_block_num, value) {
        if (!value || value == '0x') {
            log('Got bad value for block', eth_block_num, ', retrying...');
            await sleep(this.WAIT_DELAY_ON_TIMEOUT_MS);
            return this.addValueAtEthBlock(eth_block_num, true);
        }

        const hex_str = value.substr(2, 64).replace(/[^0-9a-fA-F]/g, '').padStart(64, '0');

        try {
            let value_bn;
            if (this.storage_index.slice(0, 2) == '0x' && this.storage_index == '0xd66bf39be2869094cf8d2d31edffab51dc8326eadf3c7611d397d156993996da') {
                const sqrtPriceX96 = BigInt('0x' + hex_str.slice(-40));
                const Q96 = BigInt('79228162514264337593543950336');
                value_bn = ethers.BigNumber.from(((sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96)).toString());
            } else if (this.storage_index.slice(0, 2) == '0x') {
                const sqrtPriceX96 = BigInt('0x' + hex_str.slice(-40));
                const temp = Number(sqrtPriceX96) / (2 ** 96);
                const final_price = Math.floor((temp ** 2) * 10 ** 12);
                value_bn = ethers.BigNumber.from(final_price.toString());
            } else {
                value_bn = ethers.BigNumber.from('0x' + hex_str);
            }
            this.states.push([eth_block_num, value_bn, '']);
        } catch (error) {
            console.error('Error processing storage value:', hex_str, 'Error:', error);
        }
    }

    /**
     * Add value at specific Ethereum block
     * @param {number} eth_block_num - Block number
     * @param {boolean} is_retry - Whether this is a retry
     * @param {number} retry_delay - Retry delay in milliseconds
     * @returns {void}
     */
    addValueAtEthBlock(eth_block_num, is_retry, retry_delay = 600) {
        if (eth_block_num < CHART_CONSTANTS.ETH_BLOCK_START) return;

        let cv_obj = this;
        if (!is_retry) this.expected_state_length++;

        let storageSlot;
        if (this.storage_index.slice(0, 2) == '0x') {
            storageSlot = this.storage_index.length > 10 ? this.storage_index :
                '0x' + ethers.BigNumber.from(this.storage_index.slice(2)).toHexString().slice(2);
        } else {
            storageSlot = '0x' + ethers.BigNumber.from(this.storage_index).toHexString().slice(2);
        }

        this.ethersProvider.getStorageAt(this.contract_address, storageSlot, eth_block_num)
            .then(this._getSaveStateFunction(this.states, eth_block_num, retry_delay))
            .catch(async (error) => {
                log('Error reading block storage:', error);
                await sleep(retry_delay);
                cv_obj.addValueAtEthBlock(eth_block_num, true, retry_delay * 2);
            });
    }

    /**
     * Get save state function for promise handling
     * @param {Array} block_states - Block states array
     * @param {number} eth_block_num - Block number
     * @param {number} retry_delay - Retry delay
     * @returns {Function} Save state function
     */
    _getSaveStateFunction(block_states, eth_block_num, retry_delay) {
        let cv_obj = this;
        if (!retry_delay) retry_delay = cv_obj.WAIT_DELAY_ON_TIMEOUT_MS;

        return async function (value) {
            if (!value || value == '0x') {
                log('Bad value, retrying block', eth_block_num);
                await sleep(retry_delay);
                cv_obj.addValueAtEthBlock(eth_block_num, true, retry_delay * 2);
                return;
            }
            await cv_obj.processStorageValue(eth_block_num, value);
        }
    }

    /**
     * Check if all values are loaded
     * @returns {boolean} True if all values loaded
     */
    areAllValuesLoaded() {
        log("Expected:", this.expected_state_length, " vs cur Length:", this.states.length);
        return this.expected_state_length === this.states.length;
    }

    /**
     * Wait until all values are loaded
     * @returns {Promise<void>}
     */
    async waitUntilLoaded() {
        while (!this.areAllValuesLoaded()) await sleep(500);
    }

    /**
     * Sort values by block number
     */
    sortValues() {
        log('sorting values..');
        this.states.sort((a, b) => a[0] - b[0]);
        this.sorted = true;
    }

    /**
     * Save states to localStorage
     * @param {string} timeRangeLabel - Time range label for cache key
     */
    saveToLocalStorage(timeRangeLabel) {
        if (this.states.length === 0) return;
        const contractPrefix = CHART_CONSTANTS.BWORK_CONTRACT_ADDRESS.slice(0, 7);
        const key = `${this.descriptor}_${timeRangeLabel}_${contractPrefix}`;
        let cache = JSON.parse(localStorage.getItem(key)) || {};

        // Merge new states
        for (const [block, bnValue] of this.states) {
            cache[block] = bnValue.toHexString().slice(2);
        }

        try {
            localStorage.setItem(key, JSON.stringify(cache));
            console.log(`Saved ${Object.keys(cache).length} unique blocks to ${key}`);
        } catch (error) {
            console.error(`Failed to save ${key} to localStorage:`, error);
        }
    }

    /**
     * Compute UTC midnight block
     * @returns {number} Block number at UTC midnight
     */
    getMidnightBlock() {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        const secondsSinceEpoch = Math.floor(d.getTime() / 1000);
        return CHART_CONSTANTS.ETH_BLOCK_START + Math.floor(secondsSinceEpoch / CHART_CONSTANTS.SECONDS_PER_ETH_BLOCK);
    }
}

// ============================================================================
// Mining Statistics Chart Functions
// ============================================================================

/**
 * Get hashrate data from difficulty and eras per block data
 * @param {Array} difficulty_data - Difficulty data array
 * @param {Array} eras_per_block_data - Eras per block data array
 * @returns {Array} Hashrate data array
 */
function getHashrateDataFromDifficultyAndErasPerBlockData(difficulty_data, eras_per_block_data) {
    const expected_eras_per_block = 1 / 80;
    let difficulty_data_index = 0;
    let difficulty_change_block_num = 0;
    const chart_data = [];

    for (let step = 0; step < eras_per_block_data.length; step++) {
        const current_eth_block = eras_per_block_data[step].x;
        const current_eras_per_block = eras_per_block_data[step].y;

        while (difficulty_data_index < difficulty_data.length - 1
            && difficulty_data[difficulty_data_index + 1].x < current_eth_block) {
            difficulty_change_block_num = difficulty_data[difficulty_data_index + 1].x;
            difficulty_data_index += 1;
        }

        let difficulty = 0;
        try {
            difficulty = parseFloat(difficulty_data[difficulty_data_index].y.toString());
        } catch { }

        // If difficulty change occurs within this step window
        if (step != 0
            && difficulty_data_index != 0
            && eras_per_block_data[step].x > difficulty_change_block_num
            && eras_per_block_data[step - 1].x < difficulty_change_block_num) {

            const step_size_in_eth_blocks = eras_per_block_data[step].x - eras_per_block_data[step - 1].x;
            const diff1_duration = eras_per_block_data[step].x - difficulty_change_block_num;
            const diff2_duration = difficulty_change_block_num - eras_per_block_data[step - 1].x;
            let current_difficulty = 0;
            try {
                current_difficulty = parseFloat(difficulty_data[difficulty_data_index].y.toString());
            } catch { }

            const last_difficulty = parseFloat(difficulty_data[difficulty_data_index - 1].y.toString());
            difficulty = (current_difficulty * (diff1_duration / step_size_in_eth_blocks))
                + (last_difficulty * (diff2_duration / step_size_in_eth_blocks));
        }

        const unadjusted_network_hashrate = difficulty * CHART_CONSTANTS.HASHRATE_MULTIPLIER / CHART_CONSTANTS.IDEAL_BLOCK_TIME_SECONDS;
        const network_hashrate = unadjusted_network_hashrate * (current_eras_per_block / expected_eras_per_block);

        if (current_eth_block > CHART_CONSTANTS.ETH_BLOCK_START) {
            chart_data.push({
                x: current_eth_block,
                y: network_hashrate,
            });
        }
    }
    return chart_data;
}

/**
 * Convert values to chart data format
 * @param {Array} values - Values array
 * @param {Function} value_mod_function - Optional value modification function
 * @returns {Array} Chart data array
 */
function convertValuesToChartData(values, value_mod_function) {
    const chart_data = [];
    for (let i = 0; i < values.length; i++) {
        if (values[i][1].isZero && values[i][1].isZero()) {
            continue;
        }
        if (value_mod_function == undefined) {
            value_mod_function = function (v) { return v };
        }
        if (values[i][0] > CHART_CONSTANTS.ETH_BLOCK_START) {
            chart_data.push({
                x: values[i][0],
                y: value_mod_function(values[i][1]),
            });
        }
    }
    return chart_data;
}

/**
 * Get eras per block from era data
 * @param {Array} era_values - Era values array
 * @returns {Array} Eras per block data array
 */
function getErasPerBlockFromEraData(era_values) {
    const chart_data = [];
    for (let step = 1; step < era_values.length; step++) {
        const eth_blocks_passed = era_values[step][0] - era_values[step - 1][0];
        const eras_passed = parseFloat(era_values[step][1].toString()) - parseFloat(era_values[step - 1][1].toString());

        if (eth_blocks_passed == 0) {
            continue;
        }
        // Determines the amount of tokens from the era
        const eras_per_eth_block = eras_passed / eth_blocks_passed * 3.5;

        chart_data.push({
            x: era_values[step][0],
            y: eras_per_eth_block,
        });
    }
    return chart_data;
}

/**
 * Show progress message for mining statistics loading
 * @param {string} value - Progress message
 * @returns {Promise<void>}
 */
async function show_progress(value) {
    log('updating progress.. (', value, ')');
    el('#difficultystats').innerHTML = '<div class="">Loading info from the blockchain... <span style="font-weight:600;">' + value + '</span></div>';
    el('#blocktimestats').innerHTML = '<div class="">Loading info from the blockchain... <span style="font-weight:600;">' + value + '</span></div>';
    el('#priceOverTimestats').innerHTML = '<div class="">Loading info from the blockchain... <span style="font-weight:600;">' + value + '</span></div>';
    el('#avgRevenue').innerHTML = '<div class="">Loading info from the blockchain... <span style="font-weight:600;">' + value + '</span></div>';
}

/**
 * Generate and display hashrate and block time graphs
 * @param {Object} ethersProviderInstance - Ethers provider instance
 * @param {Object} target_cv_obj - Mining target contract value object
 * @param {Object} era_cv_obj - Era contract value object
 * @param {Object} price_cv_obj - Price contract value object (BWORK/ETH)
 * @param {Object} price_cv_obj3 - Price contract value object (USDC/ETH)
 * @param {Object} tokens_minted_cv_obj - Tokens minted contract value object
 */
export function generateHashrateAndBlocktimeGraph(ethersProviderInstance, target_cv_obj, era_cv_obj, price_cv_obj, price_cv_obj3, tokens_minted_cv_obj) {
    el('#difficultystats').innerHTML = '<canvas id="chart-hashrate-difficulty"></canvas>';
    el('#blocktimestats').innerHTML = '<canvas id="chart-rewardtime"></canvas>';
    el('#priceOverTimestats').innerHTML = '<canvas id="chart-pricetime"></canvas>';
    el('#avgRevenue').innerHTML = '<canvas id="chart-AvgRevenue"></canvas>';

    const target_values = target_cv_obj.getValues;
    const era_values = era_cv_obj.getValues;
    const tokens_minted_values = tokens_minted_cv_obj.getValues;
    const tokens_price_values = price_cv_obj.getValues;
    const tokens_price_values3 = price_cv_obj3.getValues;

    const difficulty_data = convertValuesToChartData(target_values,
        (x) => { return parseFloat(_MAXIMUM_TARGET_BN_OLD.div(x).toString()) });

    // Set Chart.js defaults for dark theme
    Chart.defaults.color = '#f2f2f2';

    const era_data = convertValuesToChartData(era_values);
    const total_supply_data = convertValuesToChartData(tokens_minted_values,
        (x) => { return parseFloat(ethers.utils.formatEther(x)) });
    const total_price_data = convertValuesToChartData(tokens_price_values,
        (x) => { return 1 / (parseFloat(x.toString()) / 10 ** 12) });
    const total_price_data3 = convertValuesToChartData(tokens_price_values3,
        (x) => { return parseFloat(x.toString()) });

    console.log("tokens_price_values: ", total_price_data);
    console.log("total_price_data3: ", total_price_data3);

    const scaleFactor = 1;
    let resultGraph = total_price_data.map((item, index) => {
        if (total_price_data[index].y === 0) {
            console.error("Division by zero at index " + index);
            return null;
        }
        return {
            x: item.x,
            y: (item.y) * scaleFactor
        };
    });

    let result2 = total_price_data.map((item, index) => {
        if (total_price_data[index].y === 0) {
            console.error("Division by zero at index " + index);
            return null;
        }
        return {
            x: item.x,
            y: item.y
        };
    });

    let avgPriceAtTime = total_price_data3.map((item, index) => {
        if (result2[index] && result2[index].y !== 0) {
            return {
                x: item.x,
                y: item.y * result2[index].y
            };
        }
        return null;
    }).filter(item => item !== null);

    const eras_per_block_data = getErasPerBlockFromEraData(era_values);
    const average_reward_time_data = [];
    for (let i = 0; i < eras_per_block_data.length; i += 1) {
        if (eras_per_block_data[i].x > CHART_CONSTANTS.ETH_BLOCK_START) {
            average_reward_time_data.push({
                x: eras_per_block_data[i].x,
                y: 1 / (eras_per_block_data[i].y * CHART_CONSTANTS.ADJUST_AVERAGE_REWARD_TIME_GRAPH),
            });
        }
    }

    const hashrate_data = getHashrateDataFromDifficultyAndErasPerBlockData(difficulty_data, eras_per_block_data);

    console.log("hashrate_data :", hashrate_data);
    let max_hashrate_value = 0;

    for (let i = 0; i < hashrate_data.length; i += 1) {
        if (hashrate_data[i].y > max_hashrate_value) {
            console.log("max_hashrate_value ", hashrate_data[i].y);
            max_hashrate_value = hashrate_data[i].y;
        }
    }

    // Check if the last value in hashrate_data is 0 and remove it if true
    if (hashrate_data.length > 0 && hashrate_data[hashrate_data.length - 1].y === 0) {
        hashrate_data.pop();
    }

    let datasetCopy = [
        average_reward_time_data.slice(0, 1)[0],
        average_reward_time_data.slice(average_reward_time_data.length - 1, average_reward_time_data.length)[0],
    ];
    if (datasetCopy[0]) {
        datasetCopy[0] = Object.assign({}, datasetCopy[0]);
        datasetCopy[1] = Object.assign({}, datasetCopy[1]);
        datasetCopy[0].y = CHART_CONSTANTS.IDEAL_BLOCK_TIME_SECONDS / 60;
        datasetCopy[1].y = CHART_CONSTANTS.IDEAL_BLOCK_TIME_SECONDS / 60;
    }

    // Calculate revenue data
    let avgRevenue = [];
    if (avgPriceAtTime.length > 0 && difficulty_data.length > 0) {
        for (let i = 0; i < Math.min(avgPriceAtTime.length, difficulty_data.length); i++) {
            if (avgPriceAtTime[i] && difficulty_data[i] && difficulty_data[i].y) {
                let difficultyValue = difficulty_data[i].y;
                let revenue = (31000000000 * 4320000 / 2 * 5 / (10 * difficultyValue * 2 ** 22)) * avgPriceAtTime[i].y;
                avgRevenue.push({
                    x: difficulty_data[i].x,
                    y: revenue
                });
            }
        }
    }

    // Create Difficulty Chart
    const difficultyCtx = document.getElementById('chart-hashrate-difficulty').getContext('2d');
    const hr_diff_chart = new Chart(difficultyCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: "Difficulty",
                stepped: 'before',
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: difficulty_data,
                fill: false,
                tension: 0,
                pointRadius: 1,
                pointHoverRadius: 3,
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: "B0x Token Hashrate",
                backgroundColor: 'rgb(156, 204, 101)',
                borderColor: 'rgb(156, 204, 101)',
                data: hashrate_data,
                fill: false,
                tension: 0,
                pointRadius: 1,
                pointHoverRadius: 3,
                borderWidth: 1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            parsing: {
                xAxisKey: 'x',
                yAxisKey: 'y'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    type: 'linear',
                    display: true,
                    position: 'bottom',
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawOnChartArea: true
                    },
                    ticks: {
                        color: '#f2f2f2',
                        maxRotation: 45,
                        maxTicksLimit: 8,
                        font: {
                            size: getResponsiveFontSize(12)
                        },
                        callback: function (value, index, values) {
                            return BWORKethBlockNumberToDateStr(Math.floor(value));
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#f2f2f2',
                        font: {
                            size: getResponsiveFontSize(11),
                            weight: 'normal'
                        }
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    display: true,
                    beginAtZero: true,
                    grace: '5%',
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawOnChartArea: true
                    },
                    title: {
                        display: true,
                        text: 'Difficulty',
                        color: 'rgb(255, 99, 132)',
                        font: {
                            size: getResponsiveFontSize(11),
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: '#f2f2f2',
                        maxTicksLimit: 6,
                        font: {
                            size: getResponsiveFontSize(12)
                        },
                        callback: function (value, index, values) {
                            return toReadableThousandsLong(value);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    display: true,
                    beginAtZero: true,
                    grace: '5%',
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'Hashrate',
                        color: 'rgb(156, 204, 101)',
                        font: {
                            size: getResponsiveFontSize(11),
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: '#f2f2f2',
                        maxTicksLimit: 6,
                        font: {
                            size: getResponsiveFontSize(12)
                        },
                        callback: function (value, index, values) {
                            return toReadableHashrate(value);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            size: getResponsiveFontSize(12)
                        },
                        color: '#f2f2f2',
                        usePointStyle: true
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#f2f2f2',
                    bodyColor: '#f2f2f2',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: 1,
                    callbacks: {
                        title: function (context) {
                            return 'Block: ' + Math.floor(context[0].parsed.x);
                        },
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.dataset.label === "B0x Token Hashrate") {
                                    label += toReadableHashrate(context.parsed.y);
                                } else if (context.dataset.label === "Difficulty") {
                                    label += toReadableThousandsLong(context.parsed.y);
                                } else {
                                    label += context.parsed.y;
                                }
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });

    // Create Block Time & Supply Chart
    const rewardTimeCtx = document.getElementById('chart-rewardtime').getContext('2d');
    const rewardtime_chart = new Chart(rewardTimeCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: "Average Reward Time",
                backgroundColor: 'rgb(79, 195, 247)',
                borderColor: 'rgb(79, 195, 247)',
                data: average_reward_time_data,
                fill: false,
                tension: 0,
                pointRadius: 1,
                pointHoverRadius: 3,
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: 'Target Reward Time',
                backgroundColor: 'rgb(0, 255, 0)',
                borderColor: 'rgb(0, 255, 0)',
                borderDash: [5, 15],
                data: datasetCopy,
                fill: false,
                tension: 0,
                pointRadius: 0,
                pointHoverRadius: 3,
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: "Total Supply",
                backgroundColor: 'rgb(255, 152, 0)',
                borderColor: 'rgb(255, 152, 0)',
                data: total_supply_data,
                fill: false,
                tension: 0,
                pointRadius: 1,
                pointHoverRadius: 3,
                borderWidth: 1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            parsing: {
                xAxisKey: 'x',
                yAxisKey: 'y'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    type: 'linear',
                    display: true,
                    position: 'bottom',
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawOnChartArea: true
                    },
                    ticks: {
                        color: '#f2f2f2',
                        maxRotation: 45,
                        maxTicksLimit: 8,
                        font: {
                            size: getResponsiveFontSize(12)
                        },
                        callback: function (value, index, values) {
                            return BWORKethBlockNumberToDateStr(Math.floor(value));
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#f2f2f2',
                        font: {
                            size: getResponsiveFontSize(12),
                            weight: 'normal'
                        }
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    display: true,
                    beginAtZero: true,
                    grace: '5%',
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawOnChartArea: true
                    },
                    title: {
                        display: true,
                        text: 'Reward Time (Minutes)',
                        color: 'rgb(79, 195, 247)',
                        font: {
                            size: getResponsiveFontSize(11),
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: '#f2f2f2',
                        maxTicksLimit: 6,
                        font: {
                            size: getResponsiveFontSize(12)
                        },
                        callback: function (value, index, values) {
                            return value.toFixed(1) + ' min';
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    display: true,
                    beginAtZero: false,
                    grace: '5%',
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'Total Supply (B0x)',
                        color: 'rgb(255, 152, 0)',
                        font: {
                            size: getResponsiveFontSize(11),
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: '#f2f2f2',
                        maxTicksLimit: 6,
                        font: {
                            size: getResponsiveFontSize(12)
                        },
                        callback: function (value, index, values) {
                            return toReadableThousands(value);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#f2f2f2',
                        usePointStyle: true,
                        font: {
                            size: getResponsiveFontSize(12)
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#f2f2f2',
                    bodyColor: '#f2f2f2',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: 1,
                    titleFont: {
                        size: getResponsiveFontSize(13)
                    },
                    bodyFont: {
                        size: getResponsiveFontSize(12)
                    },
                    callbacks: {
                        title: function (context) {
                            return 'Block: ' + Math.floor(context[0].parsed.x);
                        },
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.dataset.label === "Average Reward Time" ||
                                    context.dataset.label === "Target Reward Time") {
                                    let minutes = context.parsed.y;
                                    if (minutes < 1) {
                                        label += (minutes * 60).toFixed(1) + ' sec';
                                    } else if (minutes < 60) {
                                        label += minutes.toFixed(1) + ' min';
                                    } else {
                                        let hours = Math.floor(minutes / 60);
                                        let mins = minutes % 60;
                                        label += hours + 'h ' + mins.toFixed(0) + 'm';
                                    }
                                } else if (context.dataset.label === "Total Supply") {
                                    label += parseInt(context.parsed.y).toLocaleString();
                                } else {
                                    label += context.parsed.y;
                                }
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });

    // Create Price Chart
    const priceTimeCtx = document.getElementById('chart-pricetime').getContext('2d');
    const price_chart = new Chart(priceTimeCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: "USD Price of 1 B0x",
                backgroundColor: 'rgb(50, 205, 50)',
                borderColor: 'rgb(50, 205, 50)',
                data: avgPriceAtTime,
                fill: false,
                tension: 0,
                pointRadius: 1,
                pointHoverRadius: 3,
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: "ETH Price of 1 B0x",
                backgroundColor: 'rgb(158, 168, 219)',
                borderColor: 'rgb(158, 168, 219)',
                data: resultGraph,
                fill: false,
                tension: 0,
                pointRadius: 1,
                pointHoverRadius: 3,
                borderWidth: 1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            parsing: {
                xAxisKey: 'x',
                yAxisKey: 'y'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    type: 'linear',
                    display: true,
                    position: 'bottom',
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawOnChartArea: true
                    },
                    ticks: {
                        color: '#f2f2f2',
                        maxRotation: 45,
                        maxTicksLimit: 8,
                        font: {
                            size: getResponsiveFontSize(12)
                        },
                        callback: function (value, index, values) {
                            return BWORKethBlockNumberToDateStr(Math.floor(value));
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#f2f2f2',
                        font: {
                            size: getResponsiveFontSize(12),
                            weight: 'normal'
                        }
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    display: true,
                    beginAtZero: false,
                    grace: '5%',
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawOnChartArea: true
                    },
                    title: {
                        display: true,
                        text: 'USD Price',
                        color: 'rgb(50, 205, 50)',
                        font: {
                            size: getResponsiveFontSize(11),
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: '#f2f2f2',
                        maxTicksLimit: 6,
                        font: {
                            size: getResponsiveFontSize(12)
                        },
                        callback: function (value, index, values) {
                            return '$' + value.toFixed(4);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    display: true,
                    beginAtZero: false,
                    grace: '5%',
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'ETH Price',
                        color: 'rgb(158, 168, 219)',
                        font: {
                            size: getResponsiveFontSize(11),
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: '#f2f2f2',
                        maxTicksLimit: 6,
                        font: {
                            size: getResponsiveFontSize(12)
                        },
                        callback: function (value, index, values) {
                            return (value / scaleFactor).toFixed(8) + ' ETH';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#f2f2f2',
                        usePointStyle: true,
                        font: {
                            size: getResponsiveFontSize(12)
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#f2f2f2',
                    bodyColor: '#f2f2f2',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: 1,
                    titleFont: {
                        size: getResponsiveFontSize(13)
                    },
                    bodyFont: {
                        size: getResponsiveFontSize(12)
                    },
                    callbacks: {
                        title: function (context) {
                            return 'Block: ' + Math.floor(context[0].parsed.x);
                        },
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.dataset.label === "USD Price of 1 B0x") {
                                    let value = context.parsed.y;
                                    if (value < 0.0001 && value > 0) {
                                        label += '$' + value.toExponential(3);
                                    } else {
                                        label += '$' + value.toFixed(6);
                                    }
                                } else if (context.dataset.label === "ETH Price of 1 B0x") {
                                    let value = context.parsed.y / scaleFactor;
                                    if (value < 0.00000001 && value > 0) {
                                        label += value.toExponential(3) + ' ETH';
                                    } else if (value < 0.00001) {
                                        label += value.toFixed(10) + ' ETH';
                                    } else {
                                        label += value.toFixed(8) + ' ETH';
                                    }
                                } else {
                                    label += context.parsed.y;
                                }
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });

    // Create Average Revenue Chart
    const revenueCtx = document.getElementById('chart-AvgRevenue').getContext('2d');
    const revenue_chart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: "24 Hour Revenue @ 31 Gh/s",
                backgroundColor: 'rgb(50, 205, 50)',
                borderColor: 'rgb(50, 205, 50)',
                data: avgRevenue,
                fill: false,
                tension: 0,
                pointRadius: 1,
                pointHoverRadius: 3,
                borderWidth: 1,
                yAxisID: 'y'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            parsing: {
                xAxisKey: 'x',
                yAxisKey: 'y'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    type: 'linear',
                    display: true,
                    position: 'bottom',
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawOnChartArea: true
                    },
                    ticks: {
                        color: '#f2f2f2',
                        maxRotation: 45,
                        maxTicksLimit: 8,
                        font: {
                            size: getResponsiveFontSize(13)
                        },
                        callback: function (value, index, values) {
                            return BWORKethBlockNumberToDateStr(Math.floor(value));
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#f2f2f2',
                        font: {
                            size: getResponsiveFontSize(13),
                            weight: 'normal'
                        }
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    display: true,
                    beginAtZero: true,
                    grace: '5%',
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawOnChartArea: true
                    },
                    title: {
                        display: true,
                        text: 'Daily Revenue (USD)',
                        color: 'rgb(50, 205, 50)',
                        font: {
                            size: getResponsiveFontSize(18),
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: '#f2f2f2',
                        maxTicksLimit: 6,
                        font: {
                            size: getResponsiveFontSize(18)
                        },
                        callback: function (value, index, values) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#f2f2f2',
                        usePointStyle: true,
                        font: {
                            size: getResponsiveFontSize(14)
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#f2f2f2',
                    bodyColor: '#f2f2f2',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: 1,
                    titleFont: {
                        size: getResponsiveFontSize(13)
                    },
                    bodyFont: {
                        size: getResponsiveFontSize(12)
                    },
                    callbacks: {
                        title: function (context) {
                            return 'Block: ' + Math.floor(context[0].parsed.x);
                        }
                    }
                }
            }
        }
    });

    goToURLAnchor();
}

/**
 * Update hashrate and block time graph
 * @param {Object} ethersProviderInstance - Ethers provider instance
 * @param {number} start_eth_block - Start block number
 * @param {number} end_eth_block - End block number
 * @param {number} num_search_points - Number of search points
 * @returns {Promise<void>}
 */
export async function updateHashrateAndBlocktimeGraph(ethersProviderInstance, start_eth_block, end_eth_block, num_search_points) {
    console.log("Start search at: ", start_eth_block);
    console.log("end_eth_block: ", end_eth_block);

    // Create contract value trackers
    const last_diff_start_blocks = new contractValueOverTime(ethersProviderInstance, CHART_CONSTANTS.BWORK_CONTRACT_ADDRESS, CHART_CONSTANTS.BWORK_LAST_DIFF_START_BLOCK_INDEX, 'diffStartBlocks2');
    const era_values = new contractValueOverTime(ethersProviderInstance, CHART_CONSTANTS.BWORK_CONTRACT_ADDRESS, CHART_CONSTANTS.BWORK_ERA_INDEX, 'eraValues2');
    const tokens_minted_values = new contractValueOverTime(ethersProviderInstance, CHART_CONSTANTS.BWORK_CONTRACT_ADDRESS, CHART_CONSTANTS.BWORK_TOKENS_MINTED_INDEX, 'tokensMinted2');
    const tokens_price_values = new contractValueOverTime(ethersProviderInstance, '0x498581fF718922c3f8e6A244956aF099B2652b2b', '0x995aee68e7c5c17c86d355406ddd29c7cc6c5e6fa9086d304eb932cc98ae7af5', 'BWORKETHPrice');
    const tokens_price_values3 = new contractValueOverTime(ethersProviderInstance, '0x498581fF718922c3f8e6A244956aF099B2652b2b', '0xe570f6e770bf85faa3d1dbee2fa168b56036a048a7939edbcd02d7ebddf3f948', 'USDCETHPrice');
    const mining_target_values = new contractValueOverTime(ethersProviderInstance, CHART_CONSTANTS.BWORK_CONTRACT_ADDRESS, CHART_CONSTANTS.BWORK_MINING_TARGET_INDEX, 'miningTargets2');

    // Load data with progress updates
    await tokens_price_values.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
    await sleep(500);
    show_progress('10% [42 / 420]');

    await tokens_price_values3.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
    await sleep(200);
    show_progress('20% [84 / 420]');

    await last_diff_start_blocks.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
    await sleep(200);

    // Wait for completion with progress tracking
    while (!last_diff_start_blocks.areAllValuesLoaded() || !tokens_price_values.areAllValuesLoaded() || !tokens_price_values3.areAllValuesLoaded()) {
        let numerator = tokens_price_values.states.length + tokens_price_values3.states.length + last_diff_start_blocks.states.length;
        let denominator = tokens_price_values.expected_state_length + tokens_price_values3.expected_state_length + last_diff_start_blocks.expected_state_length;
        show_progress((50 * (numerator / denominator)).toFixed(0) + '% [' + (0.5 * numerator).toFixed(0) + ' / ' + denominator.toFixed(0) + ']');
        await sleep(1000);
    }

    await sleep(3000);

    await era_values.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
    await sleep(500);
    show_progress('60% [250 / 420]');

    await tokens_minted_values.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
    await sleep(500);
    show_progress('70% [350 / 420]');

    await mining_target_values.addValuesInRange(start_eth_block, end_eth_block, num_search_points);

    // Wait for all to complete
    await last_diff_start_blocks.waitUntilLoaded();
    await mining_target_values.waitUntilLoaded();
    await tokens_minted_values.waitUntilLoaded();
    await era_values.waitUntilLoaded();
    await tokens_price_values3.waitUntilLoaded();
    await tokens_price_values.waitUntilLoaded();

    // Sort and save data
    last_diff_start_blocks.sortValues();
    mining_target_values.sortValues();
    era_values.sortValues();
    tokens_minted_values.sortValues();
    tokens_price_values.sortValues();
    tokens_price_values3.sortValues();

    console.log("TOKENSPRICEVALUES: ", tokens_price_values);
    generateHashrateAndBlocktimeGraph(ethersProviderInstance, mining_target_values, era_values, tokens_price_values, tokens_price_values3, tokens_minted_values);

    document.getElementById('topText').style.display = 'none';
    document.getElementById('topText2').style.display = 'none';

    // Save to localStorage
    era_values.saveToLocalStorage(num_search_points);
    mining_target_values.saveToLocalStorage(num_search_points);
    last_diff_start_blocks.saveToLocalStorage(num_search_points);
    tokens_minted_values.saveToLocalStorage(num_search_points);
    tokens_price_values.saveToLocalStorage(num_search_points);
    tokens_price_values3.saveToLocalStorage(num_search_points);
}

const _SECONDS_PER_ETH_BLOCK = 2;
/**
 * Update graph data based on history days
 * @param {number} history_days - Number of history days
 * @param {number} num_search_points - Number of search points
 * @param {Object} ethersProvider - Ethers provider instance not needeed
 * @param {number} BWORK_latest_eth_block2 - Latest block number not needed
 * @param {Function} log - Log function
 * @returns {void}
 */
export function updateGraphData(history_days, num_search_points, ethersProvider2, BWORK_latest_eth_block2, log) {
    show_progress('0% [0 / 0]');

    setTimeout(async () => {
        while (BWORK_latest_eth_block == null) {
            console.log('waiting for BWORK_latest_eth_block...');
            await sleep(300);
        }

        const eth_blocks_per_day = 24 * 60 * (60 / CHART_CONSTANTS.SECONDS_PER_ETH_BLOCK);
        console.log("_SECONDS_PER_ETH_BLOCK..." + eth_blocks_per_day);

        let max_blocks = history_days * eth_blocks_per_day;
        if (max_blocks / num_search_points > eth_blocks_per_day) {
            console.log("WARNING: search points are greater than 1 day apart. Make sure you know what you are doing...");
        }

        num_search_points = history_days;
        let start_eth_block = (BWORK_latest_eth_block - max_blocks);
        if (start_eth_block < 30413732) {
            start_eth_block = 30413732;
        }

        console.log("latest_eth_block..." + BWORK_latest_eth_block);
        console.log("BWORK_latest_eth_block..." + BWORK_latest_eth_block);
        console.log("latest_eth_block max_blocks..." + max_blocks);
        console.log("latest_eth_block...=" + (BWORK_latest_eth_block - max_blocks));
        console.log("latest_eth_block max_blocks..." + start_eth_block);
        let end_eth_block = BWORK_latest_eth_block - 8;

        console.log("Start search at: ", start_eth_block);
        console.log("end_eth_block: ", end_eth_block);
        updateHashrateAndBlocktimeGraph(ethersProvider, start_eth_block, end_eth_block, num_search_points);

    }, 0);
}

// ============================================================================
// Pie Chart Functions
// ============================================================================

/**
 * Show block distribution pie chart
 * @param {Object} piechart_dataset - Chart dataset
 * @param {Array} piechart_labels - Chart labels
 */
export function showBlockDistributionPieChart(piechart_dataset, piechart_labels) {
    document.querySelector('#row-miners').style.display = 'block';
    document.querySelector('#blockdistributionpiechart').innerHTML = '<canvas id="chart-block-distribution" width="3.5rem" height="3.5rem"></canvas>';

    if (piechart_dataset.length == 0 || piechart_labels.length == 0) {
        return;
    }

    Chart.defaults.elements.arc.borderColor = 'rgb(32, 34, 38)';
    Chart.defaults.elements.arc.borderWidth = 1.8;

    delete piechart_dataset.label;

    const hr_diff_chart = new Chart(document.getElementById('chart-block-distribution').getContext('2d'), {
        type: 'doughnut',
        data: {
            datasets: [piechart_dataset],
            labels: piechart_labels,
        },
        options: {
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function (context) {
                            return piechart_labels[context.dataIndex] + ': ' + context.parsed;
                        }
                    }
                }
            }
        },
    });
}

/**
 * Show second block distribution pie chart
 * @param {Object} piechart_dataset - Chart dataset
 * @param {Array} piechart_labels - Chart labels
 */
export function showBlockDistributionPieChart2(piechart_dataset, piechart_labels) {
    document.querySelector('#row-miners2').style.display = 'block';
    document.querySelector('#blockdistributionpiechart2').innerHTML = '<canvas id="chart-block-distribution2" width="3.5rem" height="3.5rem"></canvas>';

    if (piechart_dataset.length == 0 || piechart_labels.length == 0) {
        return;
    }

    Chart.defaults.elements.arc.borderColor = 'rgb(32, 34, 38)';
    Chart.defaults.elements.arc.borderWidth = 1.8;

    delete piechart_dataset.label;

    const hr_diff_chart = new Chart(document.getElementById('chart-block-distribution2').getContext('2d'), {
        type: 'doughnut',
        data: {
            datasets: [piechart_dataset],
            labels: piechart_labels,
        },
        options: {
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function (context) {
                            return piechart_labels[context.dataIndex] + ': ' + context.parsed;
                        }
                    }
                }
            }
        },
    });
}

export default {
    // Notifications
    pricesLoaded
}