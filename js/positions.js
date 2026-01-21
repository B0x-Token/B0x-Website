/**
 * @module positions
 * @description Uniswap V4 position management
 *
 * Handles:
 * - Position creation and modification
 * - Liquidity increases/decreases
 * - Position data fetching
 * - Fee collection
 */

// Import dependencies
import {
    positionManager_address,
    contractAddress_PositionFinderPro,
    contractAddress_Swapper,
    tokenAddresses,
    tokenIconsBase,
    hookAddress
} from './config.js';
import { showSuccessNotification, showErrorNotification, showInfoNotification, hideLoadingWidget, showLoadingWidget, updateLoadingStatusWidget, setLoadingProgress } from './ui.js';
import { POSITION_FINDER_ABI } from './abis.js';
import { getSqrtRatioAtTick, approveTokensViaPermit2, toBigNumber } from './contracts.js';
import { getSymbolFromAddress, tokenAddressesDecimals, fetchBalances } from './utils.js';
import { getNFTOwners, isSearchingLogs } from './data-loader.js';
import { updateStakingValues, totalLiquidityInStakingContract } from './staking.js';
// ============================================
// STATE VARIABLES
// ============================================

export let positionData = {};
export let stakingPositionData = {};
export let userSelectedPosition = null;

// Cache tracking for position fetches
let lastPositionFetchTime = 0;
let lastPositionFetchAddress = null;
const POSITION_CACHE_DURATION = 30000; // 30 seconds minimum between fetches

// Store total staked amounts globally for display updates
export let totalStakedAmounts = {
    token0: '0',
    token1: '0',
    token0Symbol: '',
    token1Symbol: ''
};

// Reset total staked amounts (used when switching accounts)
export function resetTotalStakedAmounts() {
    totalStakedAmounts.token0 = '0';
    totalStakedAmounts.token1 = '0';
    totalStakedAmounts.token0Symbol = '';
    totalStakedAmounts.token1Symbol = '';
}

// Position selection tracking variables
let userManualSelection = null;
let userManualSelectionIncrease = null;
let userManualSelectionDecrease = null;
let userManualSelectionWithdraw = null;
let userManualSelectionStakeIncrease = null;
let userManualSelectionStakeDecrease = null;

// Initial position load tracking - shows loading UI during first wallet connection
let isInitialPositionLoad = true;
export function getIsInitialPositionLoad() { return isInitialPositionLoad; }
export function setIsInitialPositionLoad(value) { isInitialPositionLoad = value; }

// Global position tracking variables
let tokenAddress = tokenAddresses["B0x"];
let Address_ZEROXBTC_TESTNETCONTRACT = tokenAddresses["0xBTC"];
let HookAddress = hookAddress;
let permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
//let Current_getsqrtPricex96 = toBigNumber(0);
let nftOwners = {};
// APYFINAL is now stored on window object (set in staking.js)
let WhereToStartSearch = 0;
let WhereToStartSearchStaked = 0;
// WeAreSearchingLogsRightNow is now imported from data-loader.js via isSearchingLogs()
let inFunctionDontRefresh = false;
// Sync with window for countdown.js access
window.inFunctionDontRefresh = false;

// Button state tracking
const buttonStates = {};

// CONFIG object for position finder
const CONFIG = {
    TARGET_POOL_KEY: {
        currency0: tokenAddress,
        currency1: Address_ZEROXBTC_TESTNETCONTRACT,
        hooks: HookAddress
    }
};

// ============================================
// LOADING STATE FUNCTIONS
// ============================================

/**
 * Shows loading state in all position selectors and info cards during initial wallet connection
 * @returns {void}
 */
export function showPositionsLoadingState() {
    const loadingMessage = 'Loading Positions, Please wait while positions are loaded into dApp';
    console.log("Called showPositionsLoadingState ");
    // Update increase page
    const increaseSelect = document.querySelector('#increase select');
    if (increaseSelect) {
        increaseSelect.innerHTML = `<option value="">${loadingMessage}</option>`;
    }
    const increaseInfoCard = document.querySelector('#increase .info-card:nth-child(5)');
    if (increaseInfoCard) {
        increaseInfoCard.innerHTML = `
            <h3>Current Selected Position</h3>
            <p>${loadingMessage}</p>
        `;
    }

    // Update decrease page
    const decreaseSelect = document.querySelector('#decrease select');
    if (decreaseSelect) {
        decreaseSelect.innerHTML = `<option value="">${loadingMessage}</option>`;
    }
    const decreaseInfoCard = document.querySelector('#decrease .info-card:nth-child(4)');
    if (decreaseInfoCard) {
        decreaseInfoCard.innerHTML = `
            <h3>Current Selected Position</h3>
            <p>${loadingMessage}</p>
        `;
    }

    // Update stake-increase page
    const stakeIncreaseSelect = document.querySelector('#stake-increase select');

        console.log("showPositionsLoadingState Found stake increase select")
    if (stakeIncreaseSelect) {
        stakeIncreaseSelect.innerHTML = `<option value="">${loadingMessage}</option>`;
    }
    const stakeIncreaseInfoCard = document.querySelector('#stake-increase .info-card:nth-child(5)');
    if (stakeIncreaseInfoCard) {
        stakeIncreaseInfoCard.innerHTML = `
            <h3>Current Selected Position</h3>
            <p>${loadingMessage}</p>
        `;
    }

    // Update stake-decrease page
    const stakeDecreaseSelect = document.querySelector('#stake-decrease select');
    if (stakeDecreaseSelect) {
        stakeDecreaseSelect.innerHTML = `<option value="">${loadingMessage}</option>`;
    }
    const stakeDecreaseInfoCard = document.querySelector('#stake-decrease .info-card:nth-child(4)');
    if (stakeDecreaseInfoCard) {
        stakeDecreaseInfoCard.innerHTML = `
            <h3>Current Selected Position</h3>
            <p>${loadingMessage}</p>
        `;
    }

    // Update staking main page - deposit NFT selector
    const stakingMainSelect = document.querySelector('#staking-deposit-select');
    if (stakingMainSelect) {
        stakingMainSelect.innerHTML = `<option value="">${loadingMessage}</option>`;
    }
    const stakingMainInfoCard = document.querySelector('#staking-main-page .info-card2');
    if (stakingMainInfoCard) {
        stakingMainInfoCard.innerHTML = `
            <h3>NFT Position Info</h3>
            <p>${loadingMessage}</p>
        `;
    }

    // Update staking main page - withdraw NFT selector
    const stakingWithdrawSelect = document.querySelector('#staking-main-page .form-group2 select');
    if (stakingWithdrawSelect) {
        stakingWithdrawSelect.innerHTML = `<option value="">${loadingMessage}</option>`;
    }
    const stakingWithdrawInfoCard = document.querySelector('#staking-main-page .info-card');
    if (stakingWithdrawInfoCard) {
        stakingWithdrawInfoCard.innerHTML = `
            <h3>Token Withdrawing</h3>
            <p>${loadingMessage}</p>
        `;
    }

    console.log('Showing positions loading state');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Helper function to sleep/delay execution
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Trigger refresh function placeholder
 */
function triggerRefresh() {
    console.log("Triggering refresh");
}

/**
 * Helper function for 24-bit sign extension
 * @param {number} value - Value to sign extend
 * @returns {number} Sign extended value
 */
function signExtend24Bit(value) {
    const SIGN_BIT = 0x800000; // Bit 23 for 24-bit numbers
    const MASK_24BIT = 0xFFFFFF;

    if (value & SIGN_BIT) {
        // Negative number - extend with 1s
        return (value | (~MASK_24BIT)) | 0; // | 0 converts to 32-bit signed int
    } else {
        // Positive number
        return value;
    }
}

/**
 * Calculate tick lower from packed position info
 * @param {string} info - Packed position information
 * @returns {number} Tick lower value
 */
function TOtickLower(info) {
    const TICK_LOWER_OFFSET = 8;
    const shifted = Number((BigInt(info) >> BigInt(TICK_LOWER_OFFSET)) & 0xFFFFFFn);
    return signExtend24Bit(shifted);
}

/**
 * Calculate tick upper from packed position info
 * @param {string} info - Packed position information
 * @returns {number} Tick upper value
 */
function TOtickUpper(info) {
    const TICK_UPPER_OFFSET = 32;
    const shifted = Number((BigInt(info) >> BigInt(TICK_UPPER_OFFSET)) & 0xFFFFFFn);
    return signExtend24Bit(shifted);
}

/**
 * Sum an array of BigNumbers
 * @param {Array} array - Array of BigNumber values
 * @returns {BigNumber} Sum of all values
 */
function sumBigNumberArray(array) {
    return array.reduce((acc, val) => acc.add(val), ethers.BigNumber.from(0));
}

/**
 * Calculate amount with slippage tolerance
 * @param {BigNumber} amount - Amount to calculate slippage for
 * @param {number} decimalValueSlippage - Slippage as decimal (e.g., 0.01 for 1%)
 * @returns {BigNumber} Amount adjusted for slippage
 */
function calculateWithSlippageBigNumber(amount, decimalValueSlippage) {
    const slippageBasisPoints = Math.floor(decimalValueSlippage * 10000);
    const remainingBasisPoints = 10000 - slippageBasisPoints;

    console.log("Slippage basis points:", slippageBasisPoints);
    console.log("Remaining basis points:", remainingBasisPoints);

    const amountBN = ethers.BigNumber.from(amount.toString());
    const remainingBN = ethers.BigNumber.from(remainingBasisPoints);
    const divisorBN = ethers.BigNumber.from(10000);

    const result = amountBN.mul(remainingBN).div(divisorBN);
    return result;
}

/**
 * Add two numbers with precision handling
 * @param {number|string} value1 - First value
 * @param {number|string} value2 - Second value
 * @param {number} decimals - Decimal places (default 18)
 * @returns {string} Sum as formatted string
 */
function addWithPrecision(value1, value2, decimals = 18) {
    console.log("Value1:", value1.toString());
    console.log("Value2:", value2.toString());

    const parts = value1.toString().split('.');
    const truncatedValue = parts.length > 1
        ? parts[0] + '.' + parts[1].substring(0, decimals)
        : value1.toString();

    const bigNum1 = ethers.utils.parseUnits(truncatedValue, decimals);

    const parts2 = value2.toString().split('.');
    const truncatedValue2 = parts2.length > 1
        ? parts2[0] + '.' + parts2[1].substring(0, decimals)
        : value2.toString();

    const bigNum2 = ethers.utils.parseUnits(truncatedValue2, decimals);

    const sum = bigNum1.add(bigNum2);

    return ethers.utils.formatUnits(sum, decimals);
}

/**
 * Check if button is enabled
 * @param {string} id - Button ID
 * @param {boolean|null} bool - Set state (null to get current state)
 * @returns {boolean} Button enabled state
 */
function isEnabled(id, bool = null) {
    if (bool !== null) {
        buttonStates[id] = bool;
        return bool;
    } else {
        return buttonStates[id] !== false;
    }
}

/**
 * Disable button and show spinner
 * @param {string} ID - Button element ID
 * @param {string} msg - Message to display
 */
function disableButtonWithSpinner(ID, msg = '<span class="spinner"></span> Approve transactions in wallet...') {
    if (!isEnabled(ID)) {
        console.log(`Button ${ID} is already disabled`);
        return;
    }

    isEnabled(ID, false);

    if (msg == "No positions to increase Liquidity on, stake a position" ||
        msg == "No positions to Decrease Liquidity on, create a position" ||
        msg == "No positions to increase Liquidity on, create a position" ||
        msg == "No positions to increase Liquidity on, stake a position first" ||
        msg == "No positions to decrease Liquidity on, stake a position first") {
        inFunctionDontRefresh = false;
        window.inFunctionDontRefresh = false;
    } else {
        inFunctionDontRefresh = true;
        window.inFunctionDontRefresh = true;
    }

    const btn = document.getElementById(ID);
    if (!btn) {
        console.error(`Button with ID '${ID}' not found`);
        return;
    }

    if (!btn.dataset.originalText) {
        btn.dataset.originalText = btn.innerHTML;
    }
    if (!btn.dataset.originalOnclick) {
        btn.dataset.originalOnclick = btn.getAttribute('onclick') || '';
    }

    btn.disabled = true;
    btn.setAttribute('disabled', 'disabled');
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.6';
    btn.innerHTML = msg;
    btn.classList.add('btn-disabled-spinner');
}

/**
 * Enable button and restore original text
 * @param {string} ID - Button element ID
 * @param {string|null} originalText - Text to restore (optional)
 */
function enableButton(ID, originalText = null) {
    if (isEnabled(ID)) {
        console.log(`Button ${ID} is already enabled`);
        return;
    }

    isEnabled(ID, true);
    inFunctionDontRefresh = false;
    window.inFunctionDontRefresh = false;

    const btn = document.getElementById(ID);
    if (!btn) {
        console.error(`Button with ID '${ID}' not found`);
        return;
    }

    btn.disabled = false;
    btn.removeAttribute('disabled');
    btn.style.pointerEvents = '';
    btn.style.opacity = '';

    if (originalText) {
        btn.innerHTML = originalText;
    } else if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
    }

    if (btn.dataset.originalOnclick) {
        btn.setAttribute('onclick', btn.dataset.originalOnclick);
    }

    btn.classList.remove('btn-disabled-spinner');
}

/**
 * Helper function for retry with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise<any>} - Result of the function
 */
async function retryWithBackoffPositions(fn, maxRetries = 5, baseDelay = 2000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isRateLimit = error.message?.includes('rate limit') ||
                                error.code === -32005 ||
                                error.message?.includes('-32005') ||
                                error.data?.httpStatus === 429;

            if (isRateLimit && attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
                console.log(`Rate limited, retrying in ${(delay/1000).toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})...`);
                await sleep(delay);
            } else {
                throw error;
            }
        }
    }
}

/**
 * Approve token if needed (with retry logic for rate limiting)
 * @param {string} tokenToApprove - Token address
 * @param {string} spenderAddress - Spender address
 * @param {BigNumber} requiredAmount - Amount to approve
 */
async function approveIfNeeded(tokenToApprove, spenderAddress, requiredAmount) {
    const erc20ABI = [
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
    ];

    const tokenContract = new ethers.Contract(tokenToApprove, erc20ABI, window.signer);

    // Check allowance with retry
    const currentAllowance = await retryWithBackoffPositions(async () => {
        return await tokenContract.allowance(window.userAddress, spenderAddress);
    });

    if (currentAllowance.lt(requiredAmount)) {
        console.log(`Approving ${tokenToApprove} for ${spenderAddress}`);

        // Send approve transaction with retry
        const approveTx = await retryWithBackoffPositions(async () => {
            return await tokenContract.approve(spenderAddress, ethers.constants.MaxUint256);
        });

        await approveTx.wait();
        console.log("Approval successful");
    } else {
        console.log("Sufficient allowance already exists");
    }
}

// ============================================
// STAKING VALUES UPDATE
// ============================================

/**
 * Updates staking values display from stored amounts
 * Called when switching to staking tab to refresh display
 */
export function updateStakingValuesFromStored() {
    console.log("Updating staking values from stored amounts");

    // Check if we have stored amounts
    if (totalStakedAmounts.token0 && totalStakedAmounts.token1) {
        const apy = (window.APYFINAL || 0).toFixed(2);
        updateStakingValues([totalStakedAmounts.token0, totalStakedAmounts.token1], apy);
        console.log("Updated with:", totalStakedAmounts.token0, totalStakedAmounts.token1, "APY:", apy);
    } else {
        console.log("No stored staking amounts available yet");
    }
}

// ============================================
// POSITION DATA FETCHING
// ============================================

/**
 * Gets all token IDs owned by connected wallet
 * Uses caching to prevent redundant fetches within 30 seconds
 * @async
 * @param {boolean} forceRefresh - Force refresh even if cache is valid
 * @returns {Promise<Array>} Array of token IDs
 */
export async function getTokenIDsOwnedByMetamask(forceRefresh = false) {
    const now = Date.now();
    const sameAddress = lastPositionFetchAddress === window.userAddress;
    const cacheValid = (now - lastPositionFetchTime) < POSITION_CACHE_DURATION;
    console.log("Call to getTokenIDsOwnedByMetamask");
    // Skip if cache is valid and same address (unless forced)
    if (!forceRefresh && sameAddress && cacheValid && Object.keys(positionData).length >= 0) {
        console.log("Using cached position data (last fetch:", Math.round((now - lastPositionFetchTime) / 1000), "seconds ago)");
        //await loadPositionsIntoDappSelections();
        return;
    }

    console.log("Call to getTokenIDsOwnedByMetamask 11 Fetching fresh position data...");
    lastPositionFetchTime = now;
    lastPositionFetchAddress = window.userAddress;

    await getTokenIDsOwnedByUser(window.userAddress);
}

/**
 * Gets all token IDs owned by a specific user address
 * Uses multicall to batch RPC requests for efficiency
 * @async
 * @param {string} ADDRESSTOSEARCHOF - User address to search for
 * @returns {Promise<void>}
 */
async function getTokenIDsOwnedByUser(ADDRESSTOSEARCHOF) {
    await sleep(200);
    console.log("Calling findUserTokenIds for:", ADDRESSTOSEARCHOF);

    // Clear position data at the start
    positionData = {};
    stakingPositionData = {};
    console.log("Cleared all position data for new account");

    if (!window.walletConnected) {
        await window.connectWallet();
        return;
    }

    // Multicall3 ABI for batching calls
    const MULTICALL3_ABI = [{
        "inputs": [{
            "components": [
                { "internalType": "address", "name": "target", "type": "address" },
                { "internalType": "bool", "name": "allowFailure", "type": "bool" },
                { "internalType": "bytes", "name": "callData", "type": "bytes" }
            ],
            "internalType": "struct Multicall3.Call3[]",
            "name": "calls",
            "type": "tuple[]"
        }],
        "name": "aggregate3",
        "outputs": [{
            "components": [
                { "internalType": "bool", "name": "success", "type": "bool" },
                { "internalType": "bytes", "name": "returnData", "type": "bytes" }
            ],
            "internalType": "struct Multicall3.Result[]",
            "name": "returnData",
            "type": "tuple[]"
        }],
        "stateMutability": "view",
        "type": "function"
    }];

    const positionFinderABI = [
        {
            "inputs": [
                { "internalType": "address", "name": "user", "type": "address" },
                { "internalType": "address", "name": "Token0", "type": "address" },
                { "internalType": "address", "name": "Token1", "type": "address" },
                { "internalType": "uint256", "name": "minAmount0", "type": "uint256" },
                { "internalType": "uint256", "name": "startIndex", "type": "uint256" },
                { "internalType": "uint256", "name": "count", "type": "uint256" },
                { "internalType": "address", "name": "HookAddress", "type": "address" }
            ],
            "name": "getIDSofStakedTokensForUserwithMinimum",
            "outputs": [
                { "internalType": "uint256[]", "name": "ids", "type": "uint256[]" },
                { "internalType": "uint256[]", "name": "LiquidityTokenA", "type": "uint256[]" },
                { "internalType": "uint256[]", "name": "LiquidityTokenB", "type": "uint256[]" },
                { "internalType": "uint128[]", "name": "positionLiquidity", "type": "uint128[]" },
                { "internalType": "uint256[]", "name": "timeStakedAt", "type": "uint256[]" },
                { "internalType": "uint256[]", "name": "multiplierPenalty", "type": "uint256[]" },
                { "internalType": "address[]", "name": "currency0", "type": "address[]" },
                { "internalType": "address[]", "name": "currency1", "type": "address[]" },
                { "internalType": "uint256[]", "name": "poolInfo", "type": "uint256[]" },
                { "internalType": "int128", "name": "startCountAt", "type": "int128" }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
            "name": "getMaxStakedIDforUser",
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                { "name": "user", "type": "address" },
                { "name": "tokenIds", "type": "uint256[]" },
                { "name": "Token0", "type": "address" },
                { "name": "Token1", "type": "address" },
                { "name": "HookAddress", "type": "address" },
                { "name": "minTokenA", "type": "uint256" }
            ],
            "name": "findUserTokenIdswithMinimumIndividual",
            "outputs": [
                { "name": "ownedTokens", "type": "uint256[]" },
                { "name": "amountTokenA", "type": "uint256[]" },
                { "name": "amountTokenB", "type": "uint256[]" },
                { "name": "positionLiquidity", "type": "uint128[]" },
                { "name": "feesOwedTokenA", "type": "int128[]" },
                { "name": "feesOwedTokenB", "type": "int128[]" },
                {
                    "name": "poolKeyz",
                    "type": "tuple[]",
                    "components": [
                        { "name": "currency0", "type": "address" },
                        { "name": "currency1", "type": "address" },
                        { "name": "fee", "type": "uint24" },
                        { "name": "tickSpacing", "type": "int24" },
                        { "name": "hooks", "type": "address" }
                    ]
                },
                { "name": "poolInfo", "type": "uint256[]" }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    const MULTICALL_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
    const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL3_ABI, window.signer);
    const positionFinderInterface = new ethers.utils.Interface(positionFinderABI);

    const minStaking = document.getElementById('minStaking')?.value || 0;
    const minUserHoldings = document.getElementById('minUserHoldings')?.value || 0;
    console.log("Settings: minStaking:", minStaking, "minUserHoldings:", minUserHoldings);

    // Initialize arrays for staked positions
    let ownedTokenIdsOFSwapperOnStaked = [];
    let OWNEDtOKEN1 = [];
    let OWNEDtOKEN2 = [];
    let liquidity = [];
    let timeStakedAT1 = [];
    let PenaltyForWithdraw = [];
    let poolInfoi = [];
    let PoolKeyCurrency0 = [];
    let PoolKeyCurrency1 = [];
    let totalStakedToken0 = toBigNumber(0);
    let totalStakedToken1 = toBigNumber(0);
    let lastSpotTosetStartSearchAt = -1;
    let setx = 0;
    // Wait for nftOwners to be loaded first (needed for unstaked positions)
    while (isSearchingLogs()) {
        if(setx%5==0){
            console.log("Waiting for log search to complete...");
        }
        setx = setx + 1;
        await sleep(250);
    }
    nftOwners = await getNFTOwners();

    // Get user token IDs from nftOwners mapping for unstaked positions
    const userTokenIds = [];
    console.log(`Searching for NFTs owned by: ${window.userAddress}`);
    for (const [tokenId, owner] of Object.entries(nftOwners)) {
        if (owner.toLowerCase() === window.userAddress.toLowerCase()) {
            userTokenIds.push(parseInt(tokenId));
        }
    }
    console.log(`Found ${userTokenIds.length} unstaked NFTs for user`);

    // Limit unstaked positions to first 50 for initial multicall
    const unstakedBatch = userTokenIds.slice(0, 50);

    // ============================================
    // FIRST MULTICALL: getMaxStakedIDforUser + 50 staked positions + 50 unstaked positions
    // ============================================
    console.log("=== MULTICALL #1: Fetching max staked ID + initial positions ===");

    const calls = [];

    // Call 1: getMaxStakedIDforUser
    calls.push({
        target: contractAddress_PositionFinderPro,
        allowFailure: true,
        callData: positionFinderInterface.encodeFunctionData('getMaxStakedIDforUser', [window.userAddress])
    });

    // Call 2: getIDSofStakedTokensForUserwithMinimum (first 50 staked positions)
    calls.push({
        target: contractAddress_PositionFinderPro,
        allowFailure: true,
        callData: positionFinderInterface.encodeFunctionData('getIDSofStakedTokensForUserwithMinimum', [
            ADDRESSTOSEARCHOF,
            tokenAddress,
            Address_ZEROXBTC_TESTNETCONTRACT,
            minStaking,
            0,  // startIndex
            50, // count - assume 50 max initially
            HookAddress
        ])
    });

    // Call 3: findUserTokenIdswithMinimumIndividual (first 50 unstaked positions)
    if (unstakedBatch.length > 0) {
        calls.push({
            target: contractAddress_PositionFinderPro,
            allowFailure: true,
            callData: positionFinderInterface.encodeFunctionData('findUserTokenIdswithMinimumIndividual', [
                window.userAddress,
                unstakedBatch,
                CONFIG.TARGET_POOL_KEY.currency0,
                CONFIG.TARGET_POOL_KEY.currency1,
                CONFIG.TARGET_POOL_KEY.hooks,
                minUserHoldings
            ])
        });
    }

    let maxTokenPossible_STAKING = 0;
    let stakedResult = null;
    let unstakedResult = null;

    // Retry helper with exponential backoff for rate limiting
    const retryWithBackoff = async (fn, maxRetries = 5, baseDelay = 2000) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                const isRateLimit = error.message?.includes('rate limit') ||
                                    error.code === -32005 ||
                                    error.message?.includes('-32005');

                if (isRateLimit && attempt < maxRetries - 1) {
                    const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
                    console.log(`Rate limited, retrying in ${(delay/1000).toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})...`);
                    await sleep(delay);
                } else {
                    throw error;
                }
            }
        }
    };

    try {
        console.log(`=== MULTICALL #1: Fetching max staked ID + initial positions ===`);
        console.log(`Executing multicall with ${calls.length} calls...`);

        const results = await retryWithBackoff(async () => {
            return await multicallContract.aggregate3(calls);
        });

        // Decode getMaxStakedIDforUser result
        if (results[0].success && results[0].returnData !== '0x') {
            const decoded = positionFinderInterface.decodeFunctionResult('getMaxStakedIDforUser', results[0].returnData);
            const MAXTOKENPOSSIBLE_STAKING = decoded[0];
            if (typeof MAXTOKENPOSSIBLE_STAKING === 'bigint') {
                maxTokenPossible_STAKING = Number(MAXTOKENPOSSIBLE_STAKING);
            } else if (MAXTOKENPOSSIBLE_STAKING._isBigNumber || MAXTOKENPOSSIBLE_STAKING instanceof ethers.BigNumber) {
                maxTokenPossible_STAKING = MAXTOKENPOSSIBLE_STAKING.toNumber();
            } else {
                maxTokenPossible_STAKING = Number(MAXTOKENPOSSIBLE_STAKING.toString());
            }
            console.log(`Max staked token ID: ${maxTokenPossible_STAKING}`);
        }

        // Decode getIDSofStakedTokensForUserwithMinimum result
        if (results[1].success && results[1].returnData !== '0x') {
            stakedResult = positionFinderInterface.decodeFunctionResult('getIDSofStakedTokensForUserwithMinimum', results[1].returnData);
            console.log(`First staked batch: ${stakedResult[0].length} positions found`);
        }

        // Decode findUserTokenIdswithMinimumIndividual result
        if (calls.length > 2 && results[2].success && results[2].returnData !== '0x') {
            unstakedResult = positionFinderInterface.decodeFunctionResult('findUserTokenIdswithMinimumIndividual', results[2].returnData);
            console.log(`First unstaked batch: ${unstakedResult[0].length} positions found`);
        }

    } catch (error) {
        console.log("Error in first multicall after retries:", error);
    }

    // Process first staked batch
    if (stakedResult) {
        ownedTokenIdsOFSwapperOnStaked = ownedTokenIdsOFSwapperOnStaked.concat(stakedResult[0]);
        totalStakedToken0 = totalStakedToken0.add(sumBigNumberArray(stakedResult[1]));
        totalStakedToken1 = totalStakedToken1.add(sumBigNumberArray(stakedResult[2]));
        OWNEDtOKEN1 = OWNEDtOKEN1.concat(stakedResult[1]);
        OWNEDtOKEN2 = OWNEDtOKEN2.concat(stakedResult[2]);
        liquidity = liquidity.concat(stakedResult[3]);
        timeStakedAT1 = timeStakedAT1.concat(stakedResult[4]);
        PenaltyForWithdraw = PenaltyForWithdraw.concat(stakedResult[5]);
        PoolKeyCurrency0 = PoolKeyCurrency0.concat(stakedResult[6]);
        PoolKeyCurrency1 = PoolKeyCurrency1.concat(stakedResult[7]);
        poolInfoi = poolInfoi.concat(stakedResult[8]);
        if (lastSpotTosetStartSearchAt == -1) {
            lastSpotTosetStartSearchAt = stakedResult[9];
        }
    }

    // ============================================
    // ADDITIONAL MULTICALLS: If more than 50 staked positions exist
    // ============================================
    if (maxTokenPossible_STAKING > 50) {
        console.log(`Max staked ID (${maxTokenPossible_STAKING}) > 50, fetching additional staked positions...`);

        // Calculate how many more batches we need (50 positions per batch)
        const remainingPositions = maxTokenPossible_STAKING - 50;
        const additionalBatches = Math.ceil(remainingPositions / 50);

        for (let batchNum = 1; batchNum <= additionalBatches; batchNum++) {
            // 1 second delay between multicalls
            await sleep(1000);

            const startIndex = batchNum * 50;
            console.log(`=== MULTICALL #${batchNum + 1}: Fetching staked positions ${startIndex} to ${startIndex + 50} ===`);

            const additionalCalls = [{
                target: contractAddress_PositionFinderPro,
                allowFailure: true,
                callData: positionFinderInterface.encodeFunctionData('getIDSofStakedTokensForUserwithMinimum', [
                    ADDRESSTOSEARCHOF,
                    tokenAddress,
                    Address_ZEROXBTC_TESTNETCONTRACT,
                    minStaking,
                    startIndex,
                    50,
                    HookAddress
                ])
            }];

            try {
                const additionalResults = await retryWithBackoff(async () => {
                    return await multicallContract.aggregate3(additionalCalls);
                });

                if (additionalResults[0].success && additionalResults[0].returnData !== '0x') {
                    const additionalStakedResult = positionFinderInterface.decodeFunctionResult(
                        'getIDSofStakedTokensForUserwithMinimum',
                        additionalResults[0].returnData
                    );

                    console.log(`Additional staked batch ${batchNum}: ${additionalStakedResult[0].length} positions found`);

                    ownedTokenIdsOFSwapperOnStaked = ownedTokenIdsOFSwapperOnStaked.concat(additionalStakedResult[0]);
                    totalStakedToken0 = totalStakedToken0.add(sumBigNumberArray(additionalStakedResult[1]));
                    totalStakedToken1 = totalStakedToken1.add(sumBigNumberArray(additionalStakedResult[2]));
                    OWNEDtOKEN1 = OWNEDtOKEN1.concat(additionalStakedResult[1]);
                    OWNEDtOKEN2 = OWNEDtOKEN2.concat(additionalStakedResult[2]);
                    liquidity = liquidity.concat(additionalStakedResult[3]);
                    timeStakedAT1 = timeStakedAT1.concat(additionalStakedResult[4]);
                    PenaltyForWithdraw = PenaltyForWithdraw.concat(additionalStakedResult[5]);
                    PoolKeyCurrency0 = PoolKeyCurrency0.concat(additionalStakedResult[6]);
                    PoolKeyCurrency1 = PoolKeyCurrency1.concat(additionalStakedResult[7]);
                    poolInfoi = poolInfoi.concat(additionalStakedResult[8]);
                }
            } catch (error) {
                console.log(`Error in additional staked multicall batch ${batchNum} after retries:`, error);
            }
        }
    }

    console.log("Total staked positions found:", ownedTokenIdsOFSwapperOnStaked.length);

    if (lastSpotTosetStartSearchAt != -1) {
        WhereToStartSearchStaked = lastSpotTosetStartSearchAt - 1;
        if (WhereToStartSearchStaked < 0) {
            WhereToStartSearchStaked = 0;
        }
    }

    // Process staked positions
    for (let i = 0; i < ownedTokenIdsOFSwapperOnStaked.length; i++) {
        const tokenId = ownedTokenIdsOFSwapperOnStaked[i];
        const info2 = poolInfoi[i];

        try {
            const decodedInfo = {
                tickLower: TOtickLower(info2.toString()),
                tickUpper: TOtickUpper(info2.toString())
            };
            const idNameID = `stake_position_${tokenId.toString()}`;

            const tokenASymbol = getSymbolFromAddress(PoolKeyCurrency0[i]);
            const tokenBSymbol = getSymbolFromAddress(PoolKeyCurrency1[i]);
            const poolNamepool = `${tokenASymbol}/${tokenBSymbol}`;

            const decimalsTokenA = tokenAddressesDecimals[tokenASymbol];
            const decimalsTokenB = tokenAddressesDecimals[tokenBSymbol];

            const formattedToken1 = ethers.utils.formatUnits(OWNEDtOKEN1[i], decimalsTokenA);
            const formattedToken2 = ethers.utils.formatUnits(OWNEDtOKEN2[i], decimalsTokenB);

            const penaltyWithdrawString = (PenaltyForWithdraw[i] / 1000 * 100) + "%";

            console.log(`Staked position ${tokenId}: TokenA=${formattedToken1} ${tokenASymbol}, TokenB=${formattedToken2} ${tokenBSymbol}, Liquidity=${liquidity[i].toString()}`);

            stakingPositionData[idNameID] = {
                id: idNameID,
                pool: poolNamepool,
                feeTier: "Dynamic Fee",
                tokenA: tokenASymbol,
                tokenB: tokenBSymbol,
                currentLiquidity: parseFloat(liquidity[i].toString()),
                currentTokenA: formattedToken1,
                currentTokenB: formattedToken2,
                tokenAIcon: tokenASymbol ? tokenASymbol[0] : "?",
                tokenBIcon: tokenBSymbol ? tokenBSymbol[0] : "?",
                unclaimedFeesTokenA: 0,
                unclaimedFeesTokenB: 0,
                apy: (window.APYFINAL || 0).toFixed(2) + "%",
                PenaltyForWithdraw: penaltyWithdrawString
            };
        } catch (error) {
            console.error(`Error processing staked position ${tokenId}:`, error);
        }
    }


    // ============================================
    // PROCESS UNSTAKED POSITIONS
    // ============================================
    let ownedTokenIds = [];
    let unstakedOWNEDtOKEN1 = [];
    let unstakedOWNEDtOKEN2 = [];
    let unstakedLiquidity = [];
    let feesOwedToken1 = [];
    let feesOwedToken2 = [];
    let poolKeyi = [];
    let unstakedPoolInfoi = [];

    // Process first unstaked batch from initial multicall
    if (unstakedResult) {
        ownedTokenIds = ownedTokenIds.concat(unstakedResult[0]);
        unstakedOWNEDtOKEN1 = unstakedOWNEDtOKEN1.concat(unstakedResult[1]);
        unstakedOWNEDtOKEN2 = unstakedOWNEDtOKEN2.concat(unstakedResult[2]);
        unstakedLiquidity = unstakedLiquidity.concat(unstakedResult[3]);
        feesOwedToken1 = feesOwedToken1.concat(unstakedResult[4]);
        feesOwedToken2 = feesOwedToken2.concat(unstakedResult[5]);
        poolKeyi = poolKeyi.concat(unstakedResult[6]);
        unstakedPoolInfoi = unstakedPoolInfoi.concat(unstakedResult[7]);
    }

    // Fetch remaining unstaked positions if more than 50
    if (userTokenIds.length > 50) {
        console.log(`More than 50 unstaked positions (${userTokenIds.length}), fetching additional batches...`);

        const batchSize = 50;
        for (let i = 50; i < userTokenIds.length; i += batchSize) {
            // 1 second delay between multicalls
            await sleep(1000);

            const batch = userTokenIds.slice(i, i + batchSize);
            console.log(`=== MULTICALL: Fetching unstaked positions ${i} to ${i + batch.length} ===`);

            const unstakedCalls = [{
                target: contractAddress_PositionFinderPro,
                allowFailure: true,
                callData: positionFinderInterface.encodeFunctionData('findUserTokenIdswithMinimumIndividual', [
                    window.userAddress,
                    batch,
                    CONFIG.TARGET_POOL_KEY.currency0,
                    CONFIG.TARGET_POOL_KEY.currency1,
                    CONFIG.TARGET_POOL_KEY.hooks,
                    0
                ])
            }];

            try {
                const unstakedResults = await retryWithBackoff(async () => {
                    return await multicallContract.aggregate3(unstakedCalls);
                });

                if (unstakedResults[0].success && unstakedResults[0].returnData !== '0x') {
                    const additionalUnstakedResult = positionFinderInterface.decodeFunctionResult(
                        'findUserTokenIdswithMinimumIndividual',
                        unstakedResults[0].returnData
                    );

                    console.log(`Additional unstaked batch: ${additionalUnstakedResult[0].length} positions found`);

                    ownedTokenIds = ownedTokenIds.concat(additionalUnstakedResult[0]);
                    unstakedOWNEDtOKEN1 = unstakedOWNEDtOKEN1.concat(additionalUnstakedResult[1]);
                    unstakedOWNEDtOKEN2 = unstakedOWNEDtOKEN2.concat(additionalUnstakedResult[2]);
                    unstakedLiquidity = unstakedLiquidity.concat(additionalUnstakedResult[3]);
                    feesOwedToken1 = feesOwedToken1.concat(additionalUnstakedResult[4]);
                    feesOwedToken2 = feesOwedToken2.concat(additionalUnstakedResult[5]);
                    poolKeyi = poolKeyi.concat(additionalUnstakedResult[6]);
                    unstakedPoolInfoi = unstakedPoolInfoi.concat(additionalUnstakedResult[7]);
                }
            } catch (error) {
                console.log(`Error in additional unstaked multicall after retries:`, error);
            }
        }
    }

    console.log("Total unstaked positions found:", ownedTokenIds.length);

    // Process each unstaked position
    for (let i = 0; i < ownedTokenIds.length; i++) {
        const tokenId = ownedTokenIds[i];
        if (tokenId > WhereToStartSearch) {
            WhereToStartSearch = parseInt(tokenId.toString());
        }

        try {
            const poolKey = poolKeyi[i];
            const info2 = unstakedPoolInfoi[i];

            const decodedInfo = {
                tickLower: TOtickLower(info2.toString()),
                tickUpper: TOtickUpper(info2.toString())
            };

            let feeVariable = (parseInt(poolKey.fee.toString()) / 10000).toFixed(2) + "%";
            if ("8388608" == poolKey.fee.toString()) {
                feeVariable = "Dynamic Fee";
            }

            const tokenASymbol = getSymbolFromAddress(poolKey.currency0);
            const tokenBSymbol = getSymbolFromAddress(poolKey.currency1);
            const poolNamepool = `${tokenASymbol}/${tokenBSymbol}`;
            const idNameID = `position_${tokenId.toString()}`;

            const decimalsTokenA = tokenAddressesDecimals[tokenASymbol];
            const decimalsTokenB = tokenAddressesDecimals[tokenBSymbol];

            const formattedToken1 = ethers.utils.formatUnits(unstakedOWNEDtOKEN1[i], decimalsTokenA);
            const formattedToken2 = ethers.utils.formatUnits(unstakedOWNEDtOKEN2[i], decimalsTokenB);
            const formattedToken1FEESOWED = ethers.utils.formatUnits(feesOwedToken1[i], decimalsTokenA);
            const formattedToken2FEESOWED = ethers.utils.formatUnits(feesOwedToken2[i], decimalsTokenB);

            // Only include full-range positions
            console.log(`Position ${tokenId}: tickLower=${decodedInfo.tickLower}, tickUpper=${decodedInfo.tickUpper}, isFullRange=${decodedInfo.tickUpper == 887220 && decodedInfo.tickLower == -887220}`);
            if (decodedInfo.tickUpper == 887220 && decodedInfo.tickLower == -887220) {
                positionData[idNameID] = {
                    id: idNameID,
                    pool: poolNamepool,
                    feeTier: feeVariable,
                    tokenA: tokenASymbol,
                    tokenB: tokenBSymbol,
                    currentLiquidity: parseFloat(unstakedLiquidity[i].toString()),
                    currentTokenA: formattedToken1,
                    currentTokenB: formattedToken2,
                    unclaimedFeesTokenA: formattedToken1FEESOWED,
                    unclaimedFeesTokenB: formattedToken2FEESOWED,
                    tokenAIcon: tokenASymbol ? tokenASymbol[0] : "?",
                    tokenBIcon: tokenBSymbol ? tokenBSymbol[0] : "?"
                };
            }
        } catch (positionError) {
            console.error(`Error processing position ${tokenId}:`, positionError);
        }
    }

    await loadPositionsIntoDappSelections();

    // Update staking values display with total staked amounts
    console.log("RUNNING updateStakingValues");
    if (PoolKeyCurrency0.length > 0 && PoolKeyCurrency1.length > 0) {
        const tokenASymbol = getSymbolFromAddress(PoolKeyCurrency0[0]);
        const decimalsTokenA = tokenAddressesDecimals[tokenASymbol];
        const tokenBSymbol = getSymbolFromAddress(PoolKeyCurrency1[0]);
        const decimalsTokenB = tokenAddressesDecimals[tokenBSymbol];

        // Format the BigNumbers to human-readable units
        const formattedTokenA = ethers.utils.formatUnits(totalStakedToken0, decimalsTokenA);
        const formattedTokenB = ethers.utils.formatUnits(totalStakedToken1, decimalsTokenB);

        // Apply toFixed for consistent decimal places
        const formattedTokenAWithDecimals = parseFloat(formattedTokenA).toFixed(6);
        const formattedTokenBWithDecimals = parseFloat(formattedTokenB).toFixed(6);

        // Store globally for tab switching
        totalStakedAmounts.token0 = formattedTokenAWithDecimals;
        totalStakedAmounts.token1 = formattedTokenBWithDecimals;
        totalStakedAmounts.token0Symbol = tokenASymbol;
        totalStakedAmounts.token1Symbol = tokenBSymbol;

        const apy = (window.APYFINAL || 0).toFixed(2);

        // Update the staking values in the UI
        updateStakingValues([formattedTokenAWithDecimals, formattedTokenBWithDecimals], apy);
    } else {
        // No staked positions - reset amounts to 0
        totalStakedAmounts.token0 = '0';
        totalStakedAmounts.token1 = '0';
        const apy = (window.APYFINAL || 0).toFixed(2);
        updateStakingValues([0, 0], apy);
    }

    hideLoadingWidget();
}

/**
 * Gets detailed position data for all owned positions
 * @async
 * @returns {Promise<Object>} Position data object
 */
export async function getAllPositionsData() {
    return positionData;
}

// ============================================
// LIQUIDITY OPERATIONS
// ============================================

/**
 * Increases liquidity in an existing position
 * @async
 * @returns {Promise<void>}
 */
export async function increaseLiquidity() {
    disableButtonWithSpinner('increaseLiquidityBtn');

    if (!window.walletConnected) {
        await window.connectWallet();
    }

    // Get slippage tolerance
    const selectSlippage = document.getElementById('slippageToleranceIncreaseLiquidity');
    const selectSlippageValue = selectSlippage.value;
    const numberValueSlippage = parseFloat(selectSlippageValue.replace('%', ''));
    const decimalValueSlippage = numberValueSlippage / 100;

    console.log("Slippage:", decimalValueSlippage);

    // Get token types and amounts
    const tokenALabel = document.querySelector('#increase #tokenALabel');
    const tokenBLabel = document.querySelector('#increase #tokenBLabel');
    const tokenAInput = document.querySelector('#increase #tokenAAmount');
    const tokenBInput = document.querySelector('#increase #tokenBAmount');

    const tokenAValue = tokenALabel.textContent;
    const tokenBValue = tokenBLabel.textContent;
    const tokenAAmount = tokenAInput ? tokenAInput.value : '0';
    const tokenBAmount = tokenBInput ? tokenBInput.value : '0';

    console.log("Token A:", tokenAValue, "Amount:", tokenAAmount);
    console.log("Token B:", tokenBValue, "Amount:", tokenBAmount);

    const tokenAinputAddress = tokenAddresses[tokenAValue];
    const tokenBinputAddress = tokenAddresses[tokenBValue];

    const positionSelect = document.querySelector('#increase select');
    const selectedPositionId = positionSelect.value;
    const position = positionData[selectedPositionId];
    if (!position) return;

    const positionID = position.id.split('_')[1];
    console.log("Position ID:", positionID);

    // Parse amounts
    let amountAtoCreate = ethers.utils.parseUnits(tokenAAmount, 18);
    let amountBtoCreate = ethers.utils.parseUnits("0", 18);

    try {
        amountBtoCreate = ethers.utils.parseUnits(tokenBAmount, 8);
    } catch (e) {
        amountBtoCreate = ethers.utils.parseUnits(tokenBAmount, 18);
    }

    if (tokenAValue == "0xBTC" || tokenAValue == " 0xBTC" || tokenAValue == " 0xBTC ") {
        amountAtoCreate = ethers.utils.parseUnits(tokenAAmount, 8);
        amountBtoCreate = ethers.utils.parseUnits(tokenBAmount, 18);
    }

    let amountInB0x = ethers.BigNumber.from(0);
    let amountIn0xBTC = ethers.BigNumber.from(0);
    let uncalimedFeesB0x = ethers.utils.parseUnits("0", 18);
    let uncalimedFees0xBTC = ethers.utils.parseUnits("0", 8);

    if (tokenBValue != "0xBTC" && tokenBValue != " 0xBTC" && tokenBValue != " 0xBTC ") {
        amountInB0x = amountBtoCreate;
        amountIn0xBTC = amountAtoCreate;
        uncalimedFeesB0x = ethers.utils.parseUnits(position.unclaimedFeesTokenB.toString(), 18);
        uncalimedFees0xBTC = ethers.utils.parseUnits(position.unclaimedFeesTokenA.toString(), 8);
    } else {
        amountInB0x = amountAtoCreate;
        amountIn0xBTC = amountBtoCreate;
        uncalimedFeesB0x = ethers.utils.parseUnits(position.unclaimedFeesTokenA.toString(), 18);
        uncalimedFees0xBTC = ethers.utils.parseUnits(position.unclaimedFeesTokenB.toString(), 8);
    }

    const tokenSwapperABI = [
        {
            "inputs": [
                { "internalType": "address", "name": "tokenA", "type": "address" },
                { "internalType": "address", "name": "tokenB", "type": "address" },
                { "internalType": "address", "name": "hookAddress", "type": "address" },
                { "internalType": "uint256", "name": "amountA", "type": "uint256" },
                { "internalType": "uint256", "name": "amountB", "type": "uint256" },
                { "internalType": "uint256", "name": "tokenID", "type": "uint256" },
                { "internalType": "uint256", "name": "fees0", "type": "uint256" },
                { "internalType": "uint256", "name": "fees1", "type": "uint256" }
            ],
            "name": "increaseLiqTwoTokens",
            "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [
                { "internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160" },
                { "internalType": "uint160", "name": "sqrtPriceAX96", "type": "uint160" },
                { "internalType": "uint160", "name": "sqrtPriceBX96", "type": "uint160" },
                { "internalType": "uint256", "name": "amount0", "type": "uint256" },
                { "internalType": "uint256", "name": "amount1", "type": "uint256" }
            ],
            "name": "getLiquidityForAmounts",
            "outputs": [{ "internalType": "uint128", "name": "liquidity", "type": "uint128" }],
            "stateMutability": "pure",
            "type": "function"
        }
    ];

    const positionManagerABI = [
        {
            "inputs": [
                { "internalType": "bytes", "name": "unlockData", "type": "bytes" },
                { "internalType": "uint256", "name": "deadline", "type": "uint256" }
            ],
            "name": "modifyLiquidities",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        }
    ];

    const [token0, token1] = tokenAddress < Address_ZEROXBTC_TESTNETCONTRACT
        ? [tokenAddress, Address_ZEROXBTC_TESTNETCONTRACT]
        : [Address_ZEROXBTC_TESTNETCONTRACT, tokenAddress];

    const [amount0, amount1] = tokenAddress < Address_ZEROXBTC_TESTNETCONTRACT
        ? [amountInB0x, amountIn0xBTC]
        : [amountIn0xBTC, amountInB0x];

    const [fees0a, fees1a] = tokenAddress < Address_ZEROXBTC_TESTNETCONTRACT
        ? [uncalimedFeesB0x, uncalimedFees0xBTC]
        : [uncalimedFees0xBTC, uncalimedFeesB0x];

    const tokenSwapperContract = new ethers.Contract(
        contractAddress_Swapper,
        tokenSwapperABI,
        window.signer
    );

    const positionManagerContract = new ethers.Contract(
        positionManager_address,
        positionManagerABI,
        window.signer
    );

    const abiCoder = ethers.utils.defaultAbiCoder;
    let liquidityDelta = 0;

    try {
        const afterFees0 = amount0.sub(fees0a);
        const afterFees1 = amount1.sub(fees1a);

        await approveIfNeeded(token0, permit2Address, afterFees0);
        await approveIfNeeded(token1, permit2Address, afterFees1);
        await approveTokensViaPermit2(window.signer, permit2Address, token0, token1, positionManager_address, afterFees0, afterFees1);

        console.log("Approved tokens via Permit2");

        const tickLower = -887220;
        const tickUpper = 887220;

        const sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
        const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);
        const sqrtPricex96 = window.Current_getsqrtPricex96;

        const result = await tokenSwapperContract.getLiquidityForAmounts(sqrtPricex96, sqrtRatioAX96, sqrtRatioBX96, amount0, amount1);
        liquidityDelta = result;
        console.log("Liquidity delta:", liquidityDelta.toString());
    } catch (error) {
        console.error(`Error approving tokens:`, error);
        enableButton('increaseLiquidityBtn', 'Increase Liquidity');
        return;
    }

    let params = new Array(2);

    params[0] = abiCoder.encode(
        ["uint256", "int128", "uint256", "uint256", "bytes"],
        [positionID, liquidityDelta, amount0, amount1, "0x"]
    );

    const currency0 = token0;
    const currency1 = token1;

    params[1] = abiCoder.encode(
        ["address", "address"],
        [currency0, currency1]
    );

    let actions = ethers.utils.concat([
        ethers.utils.hexZeroPad(0x00, 1), // INCREASE_LIQUIDITY
        ethers.utils.hexZeroPad(0x0d, 1)  // SETTLE_PAIR
    ]);

    const remainingFees0 = fees0a > amount0 ? fees0a - amount0 : 0;
    const remainingFees1 = fees1a > amount1 ? fees1a - amount1 : 0;

    if (remainingFees0 > 0 || remainingFees1 > 0) {
        params = new Array(3);

        actions = ethers.utils.concat([
            ethers.utils.hexZeroPad(0x00, 1), // INCREASE_LIQUIDITY
            ethers.utils.hexZeroPad(0x12, 1), // CLOSE_CURRENCY
            ethers.utils.hexZeroPad(0x12, 1)  // CLOSE_CURRENCY
        ]);

        params[0] = abiCoder.encode(
            ["uint256", "int128", "uint256", "uint256", "bytes"],
            [positionID, liquidityDelta, amount0, amount1, "0x"]
        );

        params[1] = abiCoder.encode(["address"], [token0]);
        params[2] = abiCoder.encode(["address"], [token1]);
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const deadline = currentTimestamp + 160;

    const callData = abiCoder.encode(
        ["bytes", "bytes[]"],
        [actions, params]
    );

    showInfoNotification('Confirm Increase Liquidity', 'Confirm the increase liquidity transaction in your wallet');

    try {
        const tx = await positionManagerContract.modifyLiquidities(callData, deadline);
        showInfoNotification();

        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Transaction confirmed:", receipt.transactionHash);

        showSuccessNotification('Increase Liquidity Complete!', 'Transaction confirmed on blockchain', tx.hash);

        enableButton('increaseLiquidityBtn', 'Increase Liquidity');
        alert("Successfully increased liquidity of position");

        await new Promise(resolve => setTimeout(resolve, 1000));
        fetchBalances();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await getTokenIDsOwnedByMetamask(true); // Force refresh after liquidity change
    } catch (error) {
        console.error(`Error increasing liquidity:`, error);
        showErrorNotification('Operation Failed', error.message || 'Failed to increase liquidity');
        enableButton('increaseLiquidityBtn', 'Increase Liquidity');
    }
}

/**
 * Decreases liquidity from an existing position
 * @async
 * @returns {Promise<void>}
 */
export async function decreaseLiquidity() {
    const percentageDisplay = document.getElementById('percentageDisplay');
    const decreasePercentageBy = percentageDisplay.textContent;
    console.log("Decrease percentage:", decreasePercentageBy);

    const decreasePercentageNumber = parseInt(decreasePercentageBy.replace('%', ''));
    let percentagedivby10000 = 10000 * decreasePercentageNumber / 100;

    if (!window.walletConnected) {
        await window.connectWallet();
    }

    disableButtonWithSpinner('decreaseLiquidityBtn');

    // Get slippage tolerance
    const selectSlippage = document.getElementById('slippageToleranceDecrease');
    const selectSlippageValue = selectSlippage.value;
    const numberValueSlippage = parseFloat(selectSlippageValue.replace('%', ''));
    const decimalValueSlippage = numberValueSlippage / 100;

    console.log("Slippage:", decimalValueSlippage);

    // Get token labels and inputs
    const tokenALabel = document.querySelector('#decrease #tokenALabel');
    const tokenBLabel = document.querySelector('#decrease #tokenBLabel');
    const tokenAInput = document.querySelector('#decrease #tokenAAmount');
    const tokenBInput = document.querySelector('#decrease #tokenBAmount');

    const tokenAValue = tokenALabel.textContent;
    const tokenBValue = tokenBLabel.textContent;

    let tokenAAmount = tokenAInput ? tokenAInput.value : '0';
    tokenAAmount = tokenAAmount.split(' ')[0];

    let tokenBAmount = tokenBInput ? tokenBInput.value : '0';
    tokenBAmount = tokenBAmount.split(' ')[0];

    console.log("Token A:", tokenAValue, "Amount:", tokenAAmount);
    console.log("Token B:", tokenBValue, "Amount:", tokenBAmount);

    const tokenAinputAddress = tokenAddresses[tokenAValue];
    const tokenBinputAddress = tokenAddresses[tokenBValue];

    const positionSelect = document.querySelector('#decrease select');
    const selectedPositionId = positionSelect.value;
    const position = positionData[selectedPositionId];
    if (!position) return;

    const positionID = position.id.split('_')[1];
    console.log("Position ID:", positionID);

    // ABI for getAmount0andAmount1forLiquidityPercentage
    const liquidityPercentageABI = [{
        "inputs": [
            { "internalType": "address", "name": "token", "type": "address" },
            { "internalType": "address", "name": "token2", "type": "address" },
            { "internalType": "uint128", "name": "percentagedivby10000", "type": "uint128" },
            { "internalType": "uint256", "name": "tokenID", "type": "uint256" },
            { "internalType": "address", "name": "HookAddress", "type": "address" }
        ],
        "name": "getAmount0andAmount1forLiquidityPercentage",
        "outputs": [
            { "internalType": "uint256", "name": "amount0", "type": "uint256" },
            { "internalType": "uint256", "name": "amount1", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }];

    const tokenSwapperContract = new ethers.Contract(
        contractAddress_Swapper,
        liquidityPercentageABI,
        window.signer
    );

    let minAmount0Remove = 0;
    let minAmount1Remove = 0;

    try {
        const result = await tokenSwapperContract.getAmount0andAmount1forLiquidityPercentage(
            tokenAddress,
            Address_ZEROXBTC_TESTNETCONTRACT,
            percentagedivby10000,
            positionID,
            HookAddress
        );

        if (tokenAddress == position.tokenA) {
            minAmount0Remove = result[0];
            minAmount1Remove = result[1];
        } else {
            minAmount0Remove = result[1];
            minAmount1Remove = result[0];
        }

        console.log("Min remove amount 0:", minAmount0Remove.toString());
        console.log("Min remove amount 1:", minAmount1Remove.toString());
    } catch (error) {
        console.error(`Error calculating liquidity amounts:`, error);
    }

    const positionManagerABI = [
        {
            "inputs": [
                { "internalType": "bytes", "name": "unlockData", "type": "bytes" },
                { "internalType": "uint256", "name": "deadline", "type": "uint256" }
            ],
            "name": "modifyLiquidities",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
            "name": "getPositionLiquidity",
            "outputs": [{ "internalType": "uint128", "name": "liquidity", "type": "uint128" }],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    const positionManagerContract = new ethers.Contract(
        positionManager_address,
        positionManagerABI,
        window.signer
    );

    try {
        const minAmount0 = calculateWithSlippageBigNumber(minAmount0Remove, decimalValueSlippage);
        const minAmount1 = calculateWithSlippageBigNumber(minAmount1Remove, decimalValueSlippage);

        const [token0, token1] = tokenAddress < Address_ZEROXBTC_TESTNETCONTRACT
            ? [tokenAddress, Address_ZEROXBTC_TESTNETCONTRACT]
            : [Address_ZEROXBTC_TESTNETCONTRACT, tokenAddress];

        let amount0remove, amount1remove;

        if (tokenAddress == position.tokenA) {
            if (tokenAddress < Address_ZEROXBTC_TESTNETCONTRACT) {
                amount0remove = minAmount0;
                amount1remove = minAmount1;
            } else {
                amount0remove = minAmount1;
                amount1remove = minAmount0;
            }
        } else {
            if (tokenAddress < Address_ZEROXBTC_TESTNETCONTRACT) {
                amount0remove = minAmount1;
                amount1remove = minAmount0;
            } else {
                amount0remove = minAmount1;
                amount1remove = minAmount0;
            }
        }

        console.log("token0:", token0);
        console.log("token1:", token1);
        console.log("amount0remove:", amount0remove.toString());
        console.log("amount1remove:", amount1remove.toString());

        const result = await positionManagerContract.getPositionLiquidity(positionID);
        let liqtoRemove = 0;
        const liqnow = result;

        if (percentagedivby10000 != 10000) {
            percentagedivby10000 = percentagedivby10000 + 1;
            liqtoRemove = toBigNumber(liqnow * (percentagedivby10000) / 10000);
        } else {
            liqtoRemove = liqnow;
        }

        console.log("Liquidity to remove:", liqtoRemove);

        const actions = ethers.utils.concat([
            ethers.utils.hexZeroPad(0x01, 1), // DECREASE_LIQUIDITY
            ethers.utils.hexZeroPad(0x11, 1)  // TAKE_PAIR
        ]);

        const abiCoder = ethers.utils.defaultAbiCoder;
        const params = new Array(2);

        params[0] = abiCoder.encode(
            ["uint256", "int128", "uint256", "uint256", "bytes"],
            [positionID, liqtoRemove, amount0remove, amount1remove, "0x"]
        );

        params[1] = abiCoder.encode(
            ["address", "address", "address"],
            [token0, token1, window.userAddress]
        );

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const deadline = currentTimestamp + 160;

        const callData = abiCoder.encode(
            ["bytes", "bytes[]"],
            [actions, params]
        );

        alert("Decreasing Liquidity now! Approve Transaction!");
        showInfoNotification('Confirm Decrease Liquidity', 'Confirm the decrease in liquidity transaction in your wallet');

        const tx = await positionManagerContract.modifyLiquidities(callData, deadline, { gasLimit: 10000000 });

        console.log("Decrease liquidity transaction sent:", tx.hash);
        showInfoNotification();

        const receipt = await tx.wait();

        enableButton('decreaseLiquidityBtn', 'Decrease Liquidity and Claim Fees');
        showSuccessNotification('Decrease Liquidity Complete!', 'Transaction confirmed on blockchain', tx.hash);

        console.log("Transaction confirmed in block:", receipt.blockNumber);
        alert("Successfully decreased liquidity of your Uniswap position");

        await new Promise(resolve => setTimeout(resolve, 1000));
        fetchBalances();
        await new Promise(resolve => setTimeout(resolve, 1000));
        getTokenIDsOwnedByMetamask(true); // Force refresh after liquidity change
    } catch (error) {
        enableButton('decreaseLiquidityBtn', 'Decrease Liquidity and Claim Fees');
        console.error(`Error decreasing liquidity:`, error);
        showErrorNotification('Operation Failed', error.message || 'Failed to decrease liquidity');
    }

    console.log("Done with decrease liquidity");
}

// ============================================
// POSITION INFO UPDATES
// ============================================

/**
 * Updates position information in the UI
 * @returns {void}
 */
export function updatePositionInfo() {
    const positionSelect = document.querySelector('#increase select');
    const selectedPositionId = positionSelect.value;
    const position = positionData[selectedPositionId];

    if (!position) {
        // During initial load, keep loading message; otherwise show "create position" message
        if (isInitialPositionLoad) {
            console.log('updatePositionInfo: No position, keeping loading message during initial load');
            return;
        }

        const infoCard = document.querySelector('#increase .info-card:nth-child(5)');
        infoCard.innerHTML = `
            <h3>Increase Position Liquidity</h3>
             <p>Create Position to increase liquidity on it</p>`;
        return;
    }

    const infoCard = document.querySelector('#increase .info-card:nth-child(5)');
    infoCard.innerHTML = `
        <h3>Current Selected Position</h3>
        <p><strong>Pool:</strong> ${position.pool} (${position.feeTier})</p>
        <p><strong>Current Liquidity:</strong> ${position.currentLiquidity.toFixed(2)}</p>
        <p><strong>Total Liquidity:</strong> ${parseFloat(position.currentTokenA).toFixed(4)} ${position.tokenA} & ${parseFloat(position.currentTokenB).toFixed(4)} ${position.tokenB}</p>
        <p><strong>Unclaimed Fees:</strong> ${parseFloat(position.unclaimedFeesTokenA).toFixed(4)} ${position.tokenA} & ${parseFloat(position.unclaimedFeesTokenB).toFixed(4)} ${position.tokenB}</p>
    `;

    updateTotalLiqIncrease();
}

/**
 * Updates the staking deposit position info display
 * Shows position details in the staking main page info-card2
 * @returns {void}
 */
export function updateStakingDepositPositionInfo() {
    const positionSelect = document.querySelector('#staking-deposit-select');
    const infoCard = document.getElementById('staking-position-info');

    if (!positionSelect || !infoCard) {
        console.log('updateStakingDepositPositionInfo: Elements not found');
        return;
    }

    const selectedPositionId = positionSelect.value;
    const position = positionData[selectedPositionId];

    if (!position) {
        // No position selected or no positions available
        if (isInitialPositionLoad) {
            console.log('updateStakingDepositPositionInfo: Initial load, keeping message');
            return;
        }

        infoCard.innerHTML = `
            <h3>NFT Position Info</h3>
            <p>Please Create a Position in order to Deposit the Uniswap v4 NFT into staking</p>
        `;
        const estimatedRewardsEl = document.getElementById('estimatedRewards');
        if (estimatedRewardsEl) estimatedRewardsEl.value = "0%";
        return;
    }

    // Calculate estimated percent of staking rewards
    const positionLiq = parseFloat(position.currentLiquidity);
    const totalLiq = parseFloat(totalLiquidityInStakingContract.toString());
    const percentOfStaking = positionLiq / (totalLiq + positionLiq);

    const estimatedRewardsEl = document.getElementById('estimatedRewards');
    if (estimatedRewardsEl) {
        estimatedRewardsEl.value = (percentOfStaking * 100).toFixed(4) + "%";
    }

    console.log("updateStakingDepositPositionInfo - percentOfStaking:", percentOfStaking);
    console.log("updateStakingDepositPositionInfo - totalLiquidityInStakingContract:", totalLiq);
    console.log("updateStakingDepositPositionInfo - positionLiq:", positionLiq);

    // Display position info (no icons for staking deposit selector)
    infoCard.innerHTML = `
        <h3>NFT Position Info</h3>
        <p><strong>Position ID:</strong> #${position.id.split('_')[1]}</p>
        <p><strong>Pool:</strong> ${position.tokenA} / ${position.tokenB} (${position.feeTier})</p>
        <p><strong>Token Amounts:</strong> ${parseFloat(position.currentTokenA).toFixed(6)} ${position.tokenA} & ${parseFloat(position.currentTokenB).toFixed(8)} ${position.tokenB}</p>
        <p><strong>Current Liquidity:</strong> ${position.currentLiquidity.toFixed(2)}</p>
    `;
}

/**
 * Updates total liquidity increase display
 * @returns {void}
 */
export function updateTotalLiqIncrease() {
    const positionSelect = document.querySelector('#increase select');
    const selectedPositionId = positionSelect.value;
    const position = positionData[selectedPositionId];
    if (!position) return;

    const tokenASpan = document.querySelector('#increase #tokenALabel');
    const tokenBSpan = document.querySelector('#increase #tokenBLabel');

    if (tokenASpan) {
        const iconURL = tokenIconsBase[position.tokenA];
        if (iconURL) {
            tokenASpan.innerHTML = `<img src="${iconURL}" alt="${position.tokenA}" class="token-icon222" style="margin-right: 8px;"> ${position.tokenA}`;
        } else {
            tokenASpan.textContent = position.tokenA;
        }
    }

    if (tokenBSpan) {
        const iconURL = tokenIconsBase[position.tokenB];
        if (iconURL) {
            tokenBSpan.innerHTML = `<img src="${iconURL}" alt="${position.tokenB}" class="token-icon222" style="margin-right: 8px;"> ${position.tokenB}`;
        } else {
            tokenBSpan.textContent = position.tokenB;
        }
    }

    let inputTokenA = 0;
    let inputTokenB = 0;

    const tokenAInput = document.querySelector('#increase #tokenAAmount');
    const tokenBInput = document.querySelector('#increase #tokenBAmount');

    if (tokenAInput) inputTokenA = tokenAInput.value || 0;
    if (tokenBInput) inputTokenB = tokenBInput.value || 0;

    const maxAmountA = addWithPrecision(position.currentTokenA, inputTokenA, tokenAddressesDecimals[position.tokenA]);
    const maxAmountB = addWithPrecision(position.currentTokenB, inputTokenB, tokenAddressesDecimals[position.tokenB]);

    const totalLiquidityInput = document.querySelector('#increase input[readonly]');
    if (totalLiquidityInput) {
        totalLiquidityInput.value = `${maxAmountA.toString()} ${position.tokenA} & ${maxAmountB.toString()} ${position.tokenB}`;
    }
}

/**
 * Updates decrease position information
 * @returns {void}
 */
export function updateDecreasePositionInfo() {
    const positionSelect = document.querySelector('#decrease select');
    const selectedPositionId = positionSelect.value;
    const position = positionData[selectedPositionId];

    if (!position) {
        // During initial load, keep loading message; otherwise show "create position" message
        if (isInitialPositionLoad) {
            console.log('updateDecreasePositionInfo: No position, keeping loading message during initial load');
            return;
        }

        const infoCard = document.querySelector('#decrease .info-card:nth-child(4)');
        infoCard.innerHTML = `
            <h3>Decrease Position Liquidity</h3>
             <p>Create Position to decrease liquidity on it</p>`;

        if (Object.keys(stakingPositionData).length === 0) {
            disableButtonWithSpinner('decreaseLiquidityStakedBtn', "No positions to increase Liquidity on, stake a position");
        } else {
            enableButton('decreaseLiquidityStakedBtn', 'Decrease Liquidity of Staked Position');
        }
        return;
    }

    const infoCard = document.querySelector('#decrease .info-card:nth-child(4)');
    infoCard.innerHTML = `
        <h3>Position Details</h3>
        <p><strong>Pool:</strong> ${position.pool} (${position.feeTier})</p>
        <p><strong>Total Liquidity:</strong> ${position.currentLiquidity.toFixed(2)}</p>
        <p><strong>Total Liquidity:</strong> ${parseFloat(position.currentTokenA).toFixed(4)} ${position.tokenA} & ${parseFloat(position.currentTokenB).toFixed(4)} ${position.tokenB}</p>
        <p><strong>Unclaimed Fees:</strong> ${parseFloat(position.unclaimedFeesTokenA).toFixed(4)} ${position.tokenA} & ${parseFloat(position.unclaimedFeesTokenB).toFixed(4)} ${position.tokenB}</p>
    `;

    const tokenASpan = document.querySelector('#decrease #tokenALabel');
    const tokenBSpan = document.querySelector('#decrease #tokenBLabel');

    if (tokenASpan) {
        const iconURL = tokenIconsBase[position.tokenA];
        if (iconURL) {
            tokenASpan.innerHTML = `<img src="${iconURL}" alt="${position.tokenA}" class="token-icon222" style="margin-right: 8px;"> ${position.tokenA}`;
        } else {
            tokenASpan.textContent = position.tokenA;
        }
    }

    if (tokenBSpan) {
        const iconURL = tokenIconsBase[position.tokenB];
        if (iconURL) {
            tokenBSpan.innerHTML = `<img src="${iconURL}" alt="${position.tokenB}" class="token-icon222" style="margin-right: 8px;"> ${position.tokenB}`;
        } else {
            tokenBSpan.textContent = position.tokenB;
        }
    }

    const feesInput = Array.from(document.querySelectorAll('#decrease .form-group'))
        .find(group => group.querySelector('label')?.textContent === 'Fees to Claim')
        ?.querySelector('input');

    if (feesInput) {
        feesInput.value = `${position.unclaimedFeesTokenA} ${position.tokenA} & ${position.unclaimedFeesTokenB} ${position.tokenB}`;
    }

    const slider = document.querySelector('#decrease .slider');
    if (slider) {
        const percentage = parseFloat(slider.value) / 100;
        const removeAmount = percentage;

        const tokenAAmount = position.currentTokenA * removeAmount;
        const tokenBAmount = position.currentTokenB * removeAmount;

        const tokenInputs = document.querySelectorAll('#decrease .form-row input');
        tokenInputs[0].value = `${(tokenAAmount).toFixed(6)} ${position.tokenA}`;
        tokenInputs[1].value = `${(tokenBAmount).toFixed(6)} ${position.tokenB}`;
    }

    if (Object.keys(stakingPositionData).length === 0) {
        disableButtonWithSpinner('decreaseLiquidityStakedBtn', "No positions to increase Liquidity on, stake a position");
    } else {
        enableButton('decreaseLiquidityStakedBtn', 'Decrease Liquidity of Staked Position');
    }
}

/**
 * Updates percentage slider for position modifications
 * @param {number} value - Percentage value
 * @returns {void}
 */
export function updatePercentage(value) {
    const percentageDisplay = document.getElementById('percentageDisplay');
    percentageDisplay.textContent = value + '%';

    const positionSelect = document.querySelector('#decrease select');
    const selectedPositionId = positionSelect.value;
    const position = positionData[selectedPositionId];

    const slider = document.querySelector('#decrease .slider');
    slider.style.setProperty('--value', value + '%');

    if (!position) return;

    const percentage = parseFloat(value) / 100;
    const removeAmount = percentage;

    const tokenAAmount = position.currentTokenA * removeAmount;
    const tokenBAmount = position.currentTokenB * removeAmount;

    const tokenaDecimals = tokenAddressesDecimals[position.tokenA];
    const tokenBDecimals = tokenAddressesDecimals[position.tokenB];

    const tokenInputs = document.querySelectorAll('#decrease .form-row input');
    if (tokenInputs.length >= 2) {
        tokenInputs[0].value = `${(tokenAAmount).toFixed(tokenaDecimals)} ${position.tokenA}`;
        tokenInputs[1].value = `${(tokenBAmount).toFixed(tokenBDecimals)} ${position.tokenB}`;
    }
}

/**
 * Loads positions into dropdown selections
 * @async
 * @returns {Promise<void>}
 */
export async function loadPositionsIntoDappSelections() {
    console.log("=== loadPositionsIntoDappSelections() called ===");
    console.log("positionData count:", Object.keys(positionData).length);
    console.log("stakingPositionData count:", Object.keys(stakingPositionData).length);
    console.log("isInitialPositionLoad:", isInitialPositionLoad);
    console.log("Populating all position selectors (regular + staking)...");

    // Set up position selector for regular increase
    const positionSelect = document.querySelector('#increase select');

    if (positionSelect) {
        // Only clear select if we have data OR initial load is complete
        // This preserves loading message during initial load when no data yet
        if (Object.keys(positionData).length > 0 || !isInitialPositionLoad) {
            positionSelect.innerHTML = '';
        }

        if (Object.keys(positionData).length > 0) {
            if (!positionSelect.hasAttribute('data-selection-tracker')) {
                positionSelect.addEventListener('change', function (e) {
                    if (e.target.value && e.target.value.startsWith('position_')) {
                        userManualSelectionIncrease = e.target.value;
                        console.log('User manually selected increase position:', userManualSelectionIncrease);
                    }
                });
                positionSelect.setAttribute('data-selection-tracker', 'true');
            }

            let currentValue;
            if (userManualSelectionIncrease) {
                currentValue = userManualSelectionIncrease;
            } else {
                const domValue = positionSelect.value;
                if (domValue && domValue.startsWith('position_')) {
                    currentValue = domValue;
                } else {
                    currentValue = null;
                }
            }

            Object.values(positionData).forEach(position => {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = `${position.pool} #${position.id.split('_')[1]} - ${position.feeTier} Position`;
                positionSelect.appendChild(option);
            });

            setTimeout(() => {
                const targetExists = positionSelect.querySelector(`option[value="${currentValue}"]`);
                if (currentValue && targetExists) {
                    positionSelect.value = currentValue;
                } else if (currentValue) {
                    userManualSelectionIncrease = null;
                }
                updatePositionInfo();
            }, 0);

            if (!positionSelect.hasAttribute('data-main-listener')) {
                positionSelect.addEventListener('change', updatePositionInfo);
                positionSelect.setAttribute('data-main-listener', 'true');
            }
        } else {
            userManualSelectionIncrease = null;
            updatePositionInfo();
        }
    }

    // Set up position selector for decrease
    const positionSelect2 = document.querySelector('#decrease select');

    if (positionSelect2) {
        // Only clear select if we have data OR initial load is complete
        if (Object.keys(positionData).length > 0 || !isInitialPositionLoad) {
            positionSelect2.innerHTML = '';
        }

        if (Object.keys(positionData).length > 0) {
            if (!positionSelect2.hasAttribute('data-selection-tracker')) {
                positionSelect2.addEventListener('change', function (e) {
                    if (e.target.value && e.target.value.startsWith('position_')) {
                        userManualSelectionDecrease = e.target.value;
                        console.log('User manually selected decrease position:', userManualSelectionDecrease);
                    }
                });
                positionSelect2.setAttribute('data-selection-tracker', 'true');
            }

            let currentValue2;
            if (userManualSelectionDecrease) {
                currentValue2 = userManualSelectionDecrease;
            } else {
                const domValue = positionSelect2.value;
                if (domValue && domValue.startsWith('position_')) {
                    currentValue2 = domValue;
                } else {
                    currentValue2 = null;
                }
            }

            Object.values(positionData).forEach(position => {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = `${position.pool} #${position.id.split('_')[1]} - ${position.feeTier} Position`;
                positionSelect2.appendChild(option);
            });

            setTimeout(() => {
                const targetExists = positionSelect2.querySelector(`option[value="${currentValue2}"]`);
                if (currentValue2 && targetExists) {
                    positionSelect2.value = currentValue2;
                } else if (currentValue2) {
                    userManualSelectionDecrease = null;
                }
                updateDecreasePositionInfo();
            }, 1000);

            if (!positionSelect2.hasAttribute('data-main-listener')) {
                positionSelect2.addEventListener('change', updateDecreasePositionInfo);
                positionSelect2.setAttribute('data-main-listener', 'true');
            }
        } else {
            userManualSelectionDecrease = null;
            updateDecreasePositionInfo();
        }
    }

    // ========================================
    // STAKING POSITION SELECTORS
    // ========================================

    // Staking main page - deposit NFT selector (uses positionData)
    const stakingMainPageSelect = document.querySelector('#staking-deposit-select');
    if (stakingMainPageSelect) {
        const currentStakingValue = stakingMainPageSelect.value;
        // Only clear select if we have data OR initial load is complete
        if (Object.keys(positionData).length > 0 || !isInitialPositionLoad) {
            stakingMainPageSelect.innerHTML = '';
        }

        if (Object.keys(positionData).length > 0) {
            Object.values(positionData).forEach(position => {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = `${position.pool} #${position.id.split('_')[1]} - ${position.feeTier} Position`;
                stakingMainPageSelect.appendChild(option);
            });

            // Restore selection if it still exists
            if (currentStakingValue && stakingMainPageSelect.querySelector(`option[value="${currentStakingValue}"]`)) {
                stakingMainPageSelect.value = currentStakingValue;
            }

            // Update the position info display
            updateStakingDepositPositionInfo();
        }
    }

    // Staking main page - withdraw NFT selector (uses stakingPositionData)
    const withdrawNFTSelect = document.querySelector('#staking-main-page .form-group2 select');
    if (withdrawNFTSelect) {
        const currentWithdrawValue = withdrawNFTSelect.value;
        // Only clear select if we have data OR initial load is complete
        if (Object.keys(stakingPositionData).length > 0 || !isInitialPositionLoad) {
            withdrawNFTSelect.innerHTML = '';
        }

        if (Object.keys(stakingPositionData).length > 0) {
            Object.values(stakingPositionData).forEach(position => {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = `${position.pool} #${position.id.split('_')[2]} Staked - ${position.feeTier} Position`;
                withdrawNFTSelect.appendChild(option);
            });

            // Restore selection if it still exists
            if (currentWithdrawValue && withdrawNFTSelect.querySelector(`option[value="${currentWithdrawValue}"]`)) {
                withdrawNFTSelect.value = currentWithdrawValue;
            }

            // Update the position info display
            if (typeof window.updatePositionInfoMAIN_UNSTAKING === 'function') {
                window.updatePositionInfoMAIN_UNSTAKING();
            }
        }
    }

    // Stake increase position selector (uses stakingPositionData)
    // Reversed order so newest positions appear first (to reset largest penalty first)
    const stakeIncreaseSelect = document.querySelector('#stake-increase select');
    if (stakeIncreaseSelect) {
        const currentIncreaseValue = stakeIncreaseSelect.value;
        // Only clear select if we have data OR initial load is complete
        if (Object.keys(stakingPositionData).length > 0 || !isInitialPositionLoad) {
            stakeIncreaseSelect.innerHTML = '';
        }

        if (Object.keys(stakingPositionData).length > 0) {
            Object.values(stakingPositionData).reverse().forEach(position => {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = `${position.pool} #${position.id.split('_')[2]} Staked - ${position.feeTier} Position`;
                stakeIncreaseSelect.appendChild(option);
            });

            // Restore selection if it still exists
            if (currentIncreaseValue && stakeIncreaseSelect.querySelector(`option[value="${currentIncreaseValue}"]`)) {
                stakeIncreaseSelect.value = currentIncreaseValue;
            }

            // Update the position info display
            if (typeof window.updateStakePositionInfo === 'function') {
                window.updateStakePositionInfo();
            }
        }
    }

    // Stake decrease position selector (uses stakingPositionData)
    const stakeDecreaseSelect = document.querySelector('#stake-decrease select');
    if (stakeDecreaseSelect) {
        const currentDecreaseValue = stakeDecreaseSelect.value;
        // Only clear select if we have data OR initial load is complete
        if (Object.keys(stakingPositionData).length > 0 || !isInitialPositionLoad) {
            stakeDecreaseSelect.innerHTML = '';
        }

        if (Object.keys(stakingPositionData).length > 0) {
            Object.values(stakingPositionData).forEach(position => {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = `${position.pool} #${position.id.split('_')[2]} Staked - ${position.feeTier} Position`;
                stakeDecreaseSelect.appendChild(option);
            });

            // Restore selection if it still exists
            if (currentDecreaseValue && stakeDecreaseSelect.querySelector(`option[value="${currentDecreaseValue}"]`)) {
                stakeDecreaseSelect.value = currentDecreaseValue;
            }

            // Update the position info display
            if (typeof window.updateStakeDecreasePositionInfo === 'function') {
                window.updateStakeDecreasePositionInfo();
            }
        }
    }

    // ========================================
    // UPDATE BUTTON STATES
    // ========================================

    // Update button states
    if (Object.keys(positionData).length === 0) {
        disableButtonWithSpinner('decreaseLiquidityBtn', "No positions to Decrease Liquidity on, create a position");
    } else {
        enableButton('decreaseLiquidityBtn', 'Remove Liquidity & Claim Fees');
    }

    if (Object.keys(positionData).length === 0) {
        disableButtonWithSpinner('increaseLiquidityBtn', "No positions to increase Liquidity on, create a position");
    } else {
        enableButton('increaseLiquidityBtn', 'Increase Liquidity');
    }

    if (Object.keys(stakingPositionData).length === 0) {
        disableButtonWithSpinner('increaseLiquidityStakedBtn', "No positions to increase Liquidity on, stake a position first");
    } else {
        enableButton('increaseLiquidityStakedBtn', 'Increase Staked Position Liquidity');
    }

    if (Object.keys(stakingPositionData).length === 0) {
        disableButtonWithSpinner('decreaseLiquidityStakedBtn', "No positions to decrease Liquidity on, stake a position first");
    } else {
        enableButton('decreaseLiquidityStakedBtn', 'Decrease Liquidity of Staked Position');
    }

    // ========================================
    // ENSURE INITIAL LOAD FLAG IS CLEARED AND UPDATE ALL INFO CARDS
    // ========================================
    // After all selectors are populated (or confirmed empty), clear the flag
    // and force update all info cards to show correct state
    if (isInitialPositionLoad) {
        console.log('loadPositionsIntoDappSelections: Clearing initial load flag and updating all info cards');
        isInitialPositionLoad = false;

        // Clear selects that still have loading message (when no data)
        if (Object.keys(positionData).length === 0) {
            const selectors = ['#increase select', '#decrease select', '#staking-deposit-select'];
            selectors.forEach(sel => {
                const el = document.querySelector(sel);
                if (el) el.innerHTML = '';
            });
        }
        if (Object.keys(stakingPositionData).length === 0) {
            const selectors = ['#stake-increase select', '#stake-decrease select', '#staking-main-page .form-group2 select'];
            selectors.forEach(sel => {
                const el = document.querySelector(sel);
                if (el) el.innerHTML = '';
            });
        }

        // Force update all info cards now that flag is cleared
        updatePositionInfo();
        updateDecreasePositionInfo();
        if (typeof window.updateStakePositionInfo === 'function') {
            window.updateStakePositionInfo();
        }
        if (typeof window.updateStakeDecreasePositionInfo === 'function') {
            window.updateStakeDecreasePositionInfo();
        }
        updateStakingDepositPositionInfo();
        if (typeof window.updatePositionInfoMAIN_UNSTAKING === 'function') {
            window.updatePositionInfoMAIN_UNSTAKING();
        }
    }
}

console.log('Positions module initialized');
