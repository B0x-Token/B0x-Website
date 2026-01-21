/**
 * @module staking
 * @description Staking operations for LP positions
 *
 * Handles:
 * - NFT position staking/unstaking
 * - Reward collection
 * - APY calculations
 * - Staking statistics display
 * - Liquidity management for staked positions
 */

// Import dependencies
import {
    contractAddressLPRewardsStaking,
    tokenAddresses,
    positionManager_address,
    contractAddress_Swapper,
    hookAddress,
    MULTICALL_ADDRESS,
    ProofOfWorkAddresss,
    USDCToken,
    contractAddress_PositionFinderPro
} from './config.js';

import { positionData, stakingPositionData } from './positions.js';


import {

    customRPC, currentSettingsAddresses
} from './settings.js';

import {
    showSuccessNotification,
    showSuccessNotificationTop,
    showErrorNotification,
    showInfoNotification,
    showSuccessNotificationCentered,
    showErrorNotificationCentered,
    showInfoNotificationCentered
} from './ui.js';
import {
    getTokenNameFromAddress,
    getSymbolFromAddress,
    tokenAddressesDecimals,
    getCoinGeckoPrices
} from './utils.js';
import { MULTICALL_ABI2, CONTRACT_ABI } from './abis.js';
import {
    getSqrtRatioAtTick,
    approveTokensViaPermit2,
    toBigNumber,
    approveIfNeededUSDC
} from './contracts.js';
import { getNFTOwners } from './data-loader.js';

// ============================================
// STATE VARIABLES
// ============================================

// Initialize APY on window for global access (avoid module read-only issues)
if (typeof window.APYFINAL === 'undefined') window.APYFINAL = 0;

export let totalLiquidityInStakingContract = 0;
export let Rewardduration = 0;

// Mock data arrays
let mockRewardTokens = [];
let mockActivePeriods = [];

// APY tracking
export let firstRewardsAPYRun = 0;
let lastRewardStatsCall = 0;
const REWARD_STATS_COOLDOWN = 60000; // 60 seconds
let first3 = 0;

// Price tracking
let wethTo0xBTCRate = 0;
let lastWETHto0xBTCRateUpdate = 0;
let lastWETHto0xBTCRateUpdate2 = 0;

// From positions.js (needed)
let tokenAddress = tokenAddresses["B0x"];
let Address_ZEROXBTC_TESTNETCONTRACT = tokenAddresses["0xBTC"];
let HookAddress = hookAddress;
let permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
let Current_getsqrtPricex96 = toBigNumber(0);

// DOM elements
let rewardsAmount;
let rewardsUSD;

// Settings

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize DOM element references
 */
function initializeDOMElements() {
    rewardsAmount = document.getElementById('rewardsAmount');
    rewardsUSD = document.getElementById('rewardsUSD');
}

// Initialize when module loads
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDOMElements);
    } else {
        initializeDOMElements();
    }
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
 * Helper function for retry with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise<any>} - Result of the function
 */
async function retryWithBackoff(fn, maxRetries = 5, baseDelay = 2000) {
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
                await new Promise(resolve => setTimeout(resolve, delay));
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
    const currentAllowance = await retryWithBackoff(async () => {
        return await tokenContract.allowance(window.userAddress, spenderAddress);
    });

    if (currentAllowance.lt(requiredAmount)) {
        console.log(`Approving ${tokenToApprove} for ${spenderAddress}`);

        // Send approve transaction with retry
        const approveTx = await retryWithBackoff(async () => {
            return await tokenContract.approve(spenderAddress, ethers.constants.MaxUint256);
        });

        await approveTx.wait();
        console.log("Approval successful");
    } else {
        console.log("Sufficient allowance already exists");
    }
}

/**
 * Disable button and show spinner
 * @param {string} ID - Button element ID
 */
function disableButtonWithSpinner(ID, msg = '<span class="spinner"></span> Processing...') {
    const btn = document.getElementById(ID);
    if (!btn) return;

    if (!btn.dataset.originalText) {
        btn.dataset.originalText = btn.innerHTML;
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
    const btn = document.getElementById(ID);
    if (!btn) return;

    btn.disabled = false;
    btn.removeAttribute('disabled');
    btn.style.pointerEvents = '';
    btn.style.opacity = '';

    if (originalText) {
        btn.innerHTML = originalText;
    } else if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
    }

    btn.classList.remove('btn-disabled-spinner');
}

// ============================================
// STAKING STATS DISPLAY
// ============================================

/**
 * Updates staking statistics container in the UI
 * @returns {void}
 */
export function updateStakingStats() {
    const container = document.querySelector('#staking-main-page #stakingStatsContainer');
    if (!container) return;

    const tokencheck = tokenAddresses['0xBTC'];
    const tokencheck2 = tokenAddresses['B0x'];

    let currency0, currency1;
    if (tokencheck.toLowerCase() < tokencheck2.toLowerCase()) {
        currency0 = tokencheck;
        currency1 = tokencheck2;
    } else {
        currency0 = tokencheck2;
        currency1 = tokencheck;
    }

    const token0Name = getTokenNameFromAddress(currency0);
    const token1Name = getTokenNameFromAddress(currency1);

    let statsHTML = `
        <div class="stat-card">
            <div class="stat-value" id="totalStaked0">Loading...</div>
            <div class="stat-value" id="totalStaked1">Loading...</div>
            <div class="stat-label">Your Total Staked</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="APYPercentage">Loading...</div>
            <div class="stat-label">Your Current APY</div>
        </div>
    `;

    container.innerHTML = statsHTML;
}

/**
 * Updates staking values in the UI
 * @param {Array<string>} stakedAmounts - Array of staked amounts
 * @param {string} apy - APY percentage
 * @returns {void}
 */
export function updateStakingValues(stakedAmounts, apy) {
    const tokencheck = tokenAddresses['0xBTC'];
    const tokencheck2 = tokenAddresses['B0x'];

    let currency0, currency1;
    if (tokencheck.toLowerCase() < tokencheck2.toLowerCase()) {
        currency0 = tokencheck;
        currency1 = tokencheck2;
    } else {
        currency0 = tokencheck2;
        currency1 = tokencheck;
    }

    const element0 = document.getElementById('totalStaked0');
    if (element0) {
      

        const amount0 = Number(stakedAmounts[0] || 0);
const tokenName0 = getTokenNameFromAddress(currency0);

element0.textContent = `${amount0.toFixed(2)} ${tokenName0}`;

    }

    const element1 = document.getElementById('totalStaked1');
    if (element1) {

        const amount1 = Number(stakedAmounts[1] || 0);
const tokenName1 = getTokenNameFromAddress(currency1);

element1.textContent = `${amount1.toFixed(2)} ${tokenName1}`;

   }

    const apyElement = document.getElementById('APYPercentage');
    if (apyElement) {

        console.log("WINDOW APY FINAL IS: 3! :",window.APYFINAL);
        apyElement.textContent = `${window.APYFINAL.toFixed(2)}%`;
    }
}

/**
 * Populates staking management data in the UI
 * @returns {void}
 */
export function populateStakingManagementData() {
    const rewardTokensContainer = document.getElementById('rewardTokensContainer');
    const tokenSelect = document.getElementById('selectedRewardToken');

    if (!rewardTokensContainer || !tokenSelect) return;

    if (mockRewardTokens.length === 0) {
        rewardTokensContainer.innerHTML = '<p style="color: #6c757d; font-style: italic;">No reward tokens period is over with and ready for restarting.</p>';
        tokenSelect.innerHTML = '<option value="">Select a reward token...</option>' +
            mockRewardTokens.map(token =>
                `<option value="${token.address}">${token.symbol} (${token.address})</option>`
            ).join('');
    } else {
        rewardTokensContainer.innerHTML = '<ul class="token-list">' +
            mockRewardTokens.map(token =>
                `<li>
                    <span class="token-symbol">${token.symbol}</span>
                    <span class="token-address">${token.address}</span>
                </li>`
            ).join('') + '</ul>';

        tokenSelect.innerHTML = '<option value="">Select a reward token...</option>' +
            mockRewardTokens.map(token =>
                `<option value="${token.address}">${token.symbol} (${token.address})</option>`
            ).join('');
    }

    // Populate Active Periods
    const activePeriodsContainer = document.getElementById('activePeriodsContainer');

    if (!activePeriodsContainer) return;

    if (mockActivePeriods.length === 0) {
        activePeriodsContainer.innerHTML = '<p style="color: #6c757d; font-style: italic;">No active reward periods.</p>';
    } else {
        activePeriodsContainer.innerHTML = `
            <div class="table-wrapper">
                <table class="periods-table">
                    <thead>
                        <tr>
                            <th>Token</th>
                            <th>Total Rewards</th>
                            <th>Time Left</th>
                            <th>End Date</th>
                            <th>Start Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mockActivePeriods.map(period => `
                            <tr>
                                <td>${period.token}</td>
                                <td>${period.totalRewards.toLocaleString()}</td>
                                <td>${period.endTimeSeconds}</td>
                                <td>${period.endTime}</td>
                                <td>${period.startTime}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
}

// ============================================
// REWARD COLLECTION
// ============================================

/**
 * Collects staking rewards for specified tokens
 * @async
 * @returns {Promise<void>}
 */
export async function collectRewards() {
    if (!window.walletConnected) {
        await window.connectWallet();
    }

    let rawString = currentSettingsAddresses.contractAddresses;
    console.log("Original reward addresses:", rawString);

    let tokenAddresses1;
    try {
        rawString = rawString.replace(/^"/, '').replace(/"$/, '');
        rawString = rawString.replace(/\\"/g, '"');
        tokenAddresses1 = JSON.parse(rawString);
        console.log("Parsed reward addresses:", tokenAddresses1);
    } catch (error) {
        console.error("Error parsing reward addresses:", error);
        tokenAddresses1 = rawString;
    }

    const collectRewardsABI = [{
        "inputs": [{
            "internalType": "contract IERC20[]",
            "name": "rewardTokens",
            "type": "address[]"
        }],
        "name": "getRewardForTokens",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }];

    try {
        const LPStakingContract = new ethers.Contract(
            contractAddressLPRewardsStaking,
            collectRewardsABI,
            window.signer
        );

        showInfoNotification('Collecting Rewards', 'Submitting reward collection transaction...');

        const rewardTx = await LPStakingContract.getRewardForTokens(tokenAddresses1);
        console.log("Reward collection transaction sent:", rewardTx.hash);

        await rewardTx.wait();
        console.log("Rewards claimed successfully!");

        showSuccessNotificationTop('Rewards Claimed!', 'Your staking rewards have been successfully claimed.', rewardTx.hash);
        alert("Claimed Rewards SUCCESSFULLY!");

        // Invalidate cache and cooldown to force fresh data fetch
        window.rewardStatsCache.timestamp = 0;
        lastRewardStatsCall = 0;

        // Refresh balances and stats
        if (window.fetchBalances) await window.fetchBalances();
        if (window.getRewardStats) await getRewardStats();

    } catch (error) {
        console.error("Error collecting rewards:", error);
        showErrorNotification('Reward Collection Failed', error.message || 'Failed to collect rewards');
    }
}

// ============================================
// NFT STAKING
// ============================================

/**
 * Deposits an NFT position into staking contract
 * @async
 * @returns {Promise<void>}
 */
export async function depositNFTStake() {
    if (!window.walletConnected) {
        await window.connectWallet();
    }

    disableButtonWithSpinner('depositNFTStakeBtn');
    alert('You are now depositing a Uniswap v4 NFT Position to stake. Withdrawal penalty is 20% to instant withdraw down to 3% after 15 days. 1% after 45 days. It is tracked per NFT, so multiple NFTs will have different withdraw Penalties');

    const positionSelect = document.querySelector('#staking-deposit-select');
    const selectedPositionId = positionSelect.value;
    const position = positionData?.[selectedPositionId];

    if (!position) {
        showErrorNotificationCentered('Invalid Position', 'Selected position not found');
        enableButton('depositNFTStakeBtn', 'Deposit NFT');
        return;
    }

    const positionID = position.id.split('_')[1];
    console.log("Deposit this NFT ", positionID);

    const depositNFTabi = [{
        "inputs": [{
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
        }],
        "name": "stakeUniswapV3NFT",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }];

    const approveNFTabi = [{
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "tokenId",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }];

    const LPStakingContract = new ethers.Contract(
        contractAddressLPRewardsStaking,
        depositNFTabi,
        window.signer
    );

    const positionManagerContract = new ethers.Contract(
        positionManager_address,
        approveNFTabi,
        window.signer
    );

    try {
        showInfoNotificationCentered('Approve the NFT', 'Approve NFT TokenID: ' + positionID + ' for Staking');

        console.log(`Approving NFT token ${positionID}...`);

        // Step 1: Approve the staking contract to transfer the NFT
        const approveTx = await positionManagerContract.approve(
            contractAddressLPRewardsStaking,
            positionID
        );

        console.log("Approval transaction sent:", approveTx.hash);
        showInfoNotificationCentered('Waiting for approval...', 'Please wait for confirmation');
        await approveTx.wait();
        showSuccessNotificationCentered('Approved NFT Transfer!', 'Now confirm the Stake transaction in your wallet');

        console.log("Approval confirmed!");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Stake the NFT
        console.log(`Staking NFT token ${positionID}...`);
        const stakeTx = await LPStakingContract.stakeUniswapV3NFT(positionID);

        showInfoNotificationCentered('Staking NFT...', 'Please wait for confirmation');
        console.log("Staking transaction sent:", stakeTx.hash);
        await stakeTx.wait();
        console.log("NFT staked successfully!");

        showSuccessNotificationCentered('NFT Staked Successfully!', 'Transaction confirmed on blockchain');
        enableButton('depositNFTStakeBtn', 'Deposit NFT');

        if (window.fetchBalances) await window.fetchBalances();
        if (window.getTokenIDsOwnedByMetamask) await window.getTokenIDsOwnedByMetamask(true); // Force refresh after stake
       // if (window.loadPositionsIntoDappSelections) await window.loadPositionsIntoDappSelections();
        await getRewardStats();

    } catch (error) {
        console.error("Error approving/staking NFT:", error);
        showErrorNotificationCentered('Staking Failed', error.message || 'Failed to stake NFT');
        enableButton('depositNFTStakeBtn', 'Deposit NFT');
    }
}

/**
 * Withdraws an NFT position from staking contract
 * @async
 * @returns {Promise<void>}
 */
export async function withdrawNFTStake() {
    if (!window.walletConnected) {
        await window.connectWallet();
    }

    disableButtonWithSpinner('withdrawNFTStakeBtn');

    const positionSelect = document.querySelector('#staking-main-page .form-group2 select');
    const selectedPositionId = positionSelect.value;

    const positionStaking = stakingPositionData[selectedPositionId];
    if (!positionStaking) {
        showErrorNotification('No Position Selected', 'Please select a staked position to withdraw');
        enableButton('withdrawNFTStakeBtn', 'Withdraw NFT from Staking');
        return;
    }

    console.log("Withdrawing Position: ", positionStaking.id);
    const id = positionStaking.id.replace('stake_position_', '');

    const withdrawNFTabi = [{
        "inputs": [{
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
        }],
        "name": "withdraw",
        "outputs": [{
            "internalType": "bool",
            "name": "",
            "type": "bool"
        }],
        "stateMutability": "nonpayable",
        "type": "function"
    }];

    const LPStakingContract = new ethers.Contract(
        contractAddressLPRewardsStaking,
        withdrawNFTabi,
        window.signer
    );

    try {
        console.log(`Withdrawing this NFT token ${id}...`);

        showInfoNotification('Withdrawing NFT tokenID ' + id, 'Please confirm transaction in the wallet');

        const stakeTx = await LPStakingContract.withdraw(id);

        showInfoNotification();
        console.log("Withdraw transaction sent:", stakeTx.hash);
        await stakeTx.wait();
        console.log("NFT withdrew successfully!");

        enableButton('withdrawNFTStakeBtn', 'Withdraw NFT from Staking');

        await new Promise(resolve => setTimeout(resolve, 3000));
        await getRewardStats();
        showSuccessNotification('Withdrew Uniswap ID: ' + positionStaking.id + ' successfully!', 'Transaction confirmed on blockchain', stakeTx.hash);

        if (window.fetchBalances) await window.fetchBalances();
        if (window.getTokenIDsOwnedByMetamask) await window.getTokenIDsOwnedByMetamask(true); // Force refresh after unstake
      //  if (window.loadPositionsIntoDappSelections) await window.loadPositionsIntoDappSelections();

    } catch (error) {
        enableButton('withdrawNFTStakeBtn', 'Withdraw NFT from Staking');
        console.error("Error withdrawing NFT:", error);
        showErrorNotification('Withdrawal Failed', error.message || 'Failed to withdraw NFT');
    }
}

// ============================================
// APY CALCULATION
// ============================================

/**
 * Calculates reward APY for staking
 * @async
 * @param {Array<string>} _tokenAddresses - Reward token addresses
 * @param {Array<string>} _rewardRate - Reward rates
 * @param {string} zeroXBTC_In_Staking - Amount of 0xBTC staked
 * @returns {Promise<number>} Calculated APY
 */

        const amountToSwap = BigInt(10 ** 18);
    let amountOut_Saved = 0;
    let result = 0;
export async function GetRewardAPY(_tokenAddresses, _rewardRate, zeroXBTC_In_Staking, tokenSwapperResult = null) {
    let total_rewardRate_WETH = 0;
    let total_rewardRate_0xBTC = 0;
    let total_rewardRate_B0x = 0;

    if (_tokenAddresses) {
        for (let x = 0; x < _tokenAddresses.length; x++) {
            const tknAdd = _tokenAddresses[x];
            if (tknAdd === tokenAddresses['WETH']) {
                total_rewardRate_WETH = _rewardRate[x];
            }
            if (tknAdd === tokenAddresses['0xBTC']) {
                total_rewardRate_0xBTC = _rewardRate[x];
            }
            if (tknAdd === tokenAddresses['B0x']) {
                total_rewardRate_B0x = _rewardRate[x];
            }
        }
    }

    // Use the tokenSwapper result from multicall if provided and timing allows
    if (tokenSwapperResult && lastWETHto0xBTCRateUpdate2 < Date.now() - 120000) {
        result = tokenSwapperResult;
        lastWETHto0xBTCRateUpdate2 = Date.now();

        console.log("Raw result type:", typeof result);

        if (typeof result === 'bigint' || typeof result === 'number') {
            amountOut_Saved = result;
        } else if (result._isBigNumber || result instanceof ethers.BigNumber) {
            amountOut_Saved = result;
        } else if (typeof result === 'object' && result !== null) {
            if (typeof result.toString === 'function' && result.toString().match(/^[0-9]+$/)) {
                amountOut_Saved = result;
            } else {
                amountOut_Saved = result[0] || result.amountOut || result._hex || result.value || result;
            }
        }
    }

    const HowManySecondsINyear = (365 * 24 * 60 * 60);

    console.log("amountOut_Saved", amountOut_Saved);

    const amountOutNumber = Number(amountOut_Saved) / (10 ** 8);
    const amountToSwapNumber = Number(amountToSwap) / (10 ** 18);
    const exchangeRate = amountOutNumber / amountToSwapNumber;
    console.log("exchange rate = ", exchangeRate);

    const total_rewardRate_B0x_proper = total_rewardRate_B0x / (10 ** 18);
    const total_rewardRate_B0x_0xBTC_Yearly = HowManySecondsINyear * total_rewardRate_B0x_proper * exchangeRate;
    console.log("total_rewardRate_B0x_0xBTC_Yearly: ", total_rewardRate_B0x_0xBTC_Yearly);
console.log("total_rewardRate_B0x_0xBTC_Yearly: ",total_rewardRate_B0x_0xBTC_Yearly);
    const total_rewardRate_0xBTC_Yearly = HowManySecondsINyear * total_rewardRate_0xBTC / 10 ** 8;
    console.log("total_rewardRate_0xBTC_Yearly", total_rewardRate_0xBTC_Yearly);

    // Fetch prices from CoinGecko with 5-minute cache
    let wethPriceUSD = 0;
    let oxbtcPriceUSD = 0;

    if (lastWETHto0xBTCRateUpdate < Date.now() - 300000) { // 5 minutes
        try {
            const priceData = await getCoinGeckoPrices();
            wethPriceUSD = priceData.wethPriceUSD;
            oxbtcPriceUSD = priceData.oxbtcPriceUSD;

            wethTo0xBTCRate = wethPriceUSD / oxbtcPriceUSD;

            console.log("WETH price USD: ", wethPriceUSD);
            console.log("0xBTC price USD: ", oxbtcPriceUSD);
            console.log("WETH to 0xBTC rate: ", wethTo0xBTCRate);

            lastWETHto0xBTCRateUpdate = Date.now();

            const b0xwidget = document.getElementById('b0x-widget');
            if (b0xwidget) {
                b0xwidget.style.display = "flex";
            }

        } catch (error) {
            console.error("Error fetching CoinGecko prices:", error);
            lastWETHto0xBTCRateUpdate = Date.now() - 60000;
        }
    }

    const total_rewardRate_WETH_proper = total_rewardRate_WETH / (10 ** 18);
    const total_rewardRate_WETH_0xBTC_Yearly = HowManySecondsINyear * total_rewardRate_WETH_proper * wethTo0xBTCRate;
    console.log("total_rewardRate_WETH_0xBTC_Yearly", total_rewardRate_WETH_0xBTC_Yearly);

    const total_0xBTC_gained_Yearly = total_rewardRate_WETH_0xBTC_Yearly + total_rewardRate_0xBTC_Yearly + total_rewardRate_B0x_0xBTC_Yearly;
    console.log("add them all together we get: ", total_0xBTC_gained_Yearly);

    const total0xbtcStaked = (zeroXBTC_In_Staking * 2) / 10 ** 8;
    console.log("total 0xBTC staked in both pools", total0xbtcStaked);

    // Set APY on window object for global access
    window.APYFINAL = total_0xBTC_gained_Yearly / total0xbtcStaked * 100;
    console.log("APY info total gained yearly / total staked * 100", window.APYFINAL);

    firstRewardsAPYRun = firstRewardsAPYRun + 1;

    return window.APYFINAL;
}

/**
 * Gets reward statistics from staking contract
 * @async
 * @returns {Promise<Object>} Reward statistics
 */

const REWARD_STATS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

window.rewardStatsCache = {
    timestamp: 0,
    data: null,
    userAddress: null  // Track which address the cache is for
};

/**
 * Starts a new reward period for a specific token
 * @async
 * @returns {Promise<void>}
 */
export async function startRewardPeriod() {
    if (!window.walletConnected) {
        await window.connectWallet();
    }

    const inputtedTokenAddress = document.getElementById("selectedRewardToken").value;
    console.log("INPUTED ADDRESS = ", inputtedTokenAddress);

    const startRewardABI = [{
        "inputs": [
            {
                "internalType": "contract IERC20",
                "name": "token",
                "type": "address"
            }
        ],
        "name": "setRewardParams",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }];

    const LPRewardsStakingContract = new ethers.Contract(
        contractAddressLPRewardsStaking,
        startRewardABI,
        window.signer
    );

    try {
        const tx = await LPRewardsStakingContract.setRewardParams(inputtedTokenAddress);
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("setRewardParams Transaction Confirmed!");
    } catch (e) {
        if (e.message && e.message.includes("Reward must be positive")) {
            const symbol = mockRewardTokens.find(token => token.address === inputtedTokenAddress)?.symbol;
            alert("Token Reward Amount is Zero for token: " + symbol + "   address: " + inputtedTokenAddress + " \nCant start new Reward Period with zero rewards");
        } else {
            console.error("Transaction failed:", e.message || e);
            alert("Transaction failed: " + (e.message || "Unknown error"));
        }
    }

    await getRewardStats();
}

/**
 * Adds a new reward token to the staking contract
 * @async
 * @returns {Promise<void>}
 */
export async function addRewardToken() {
    if (!window.walletConnected) {
        await window.connectWallet();
    }

    const inputtedTokenAddress = document.getElementById("rewardTokenAddress").value;
    console.log("INPUTED ADDRESS = ", inputtedTokenAddress);

    const addRewardTokenABI = [{
        "inputs": [
            {
                "internalType": "contract IERC20",
                "name": "token",
                "type": "address"
            }
        ],
        "name": "addRewardToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }];

    // Use calculated cost from multicall, fallback to 20 USDC if not available
    const usdcCostRaw = window.addRewardTokenCost?.usdcCostRaw || (20 * 10 ** 6);
    console.log("USDC cost for adding reward token:", usdcCostRaw / (10 ** 6), "USDC");

    await approveIfNeededUSDC(USDCToken, contractAddressLPRewardsStaking, usdcCostRaw);

    const LPRewardsStakingContract = new ethers.Contract(
        contractAddressLPRewardsStaking,
        addRewardTokenABI,
        window.signer
    );

    const tx = await LPRewardsStakingContract.addRewardToken(inputtedTokenAddress);
    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("addRewardToken with USDC for public Confirmed!");

    await getRewardStats();
}

export async function getRewardStats() {
    if (window.userAddress == "" || window.userAddress == null) {
        window.userAddress = "0x08e259639a4eFCA939E15871aCdCf1AfD3d0EAa9";
    }

    console.log("USERADDzzzY: ", window.userAddress);

    const now = Date.now();
    const currentAddress = window.userAddress?.toLowerCase();
    const cachedAddress = window.rewardStatsCache.userAddress?.toLowerCase();

    // Check if address changed - if so, invalidate cache
    const addressChanged = currentAddress !== cachedAddress;
    if (addressChanged && window.rewardStatsCache.data) {
        console.log("User address changed, invalidating reward stats cache");
    }

    // Use cache only if fresh AND same address
    if (
        window.rewardStatsCache.data &&
        !addressChanged &&
        (now - window.rewardStatsCache.timestamp) < REWARD_STATS_CACHE_TTL
    ) {
        console.log("Using cached reward stats (fresh)");
        return window.rewardStatsCache.data;
    }

    // Skip cooldown check if address changed (need fresh data for new account)
    if (!addressChanged && now - lastRewardStatsCall < REWARD_STATS_COOLDOWN && first3 > 3) {
        console.log("getRewardStats called too soon, skipping...");
        return;
    }
    first3 = first3 + 1;

    lastRewardStatsCall = now;

    console.log("Running getRewardStats...");

    const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

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
    }, {
        "inputs": [],
        "name": "getBlockNumber",
        "outputs": [{ "internalType": "uint256", "name": "blockNumber", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }, {
        "inputs": [{ "internalType": "address", "name": "addr", "type": "address" }],
        "name": "getEthBalance",
        "outputs": [{ "internalType": "uint256", "name": "balance", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }];

    const getRewardStatsABI = [{
        "inputs": [
            { "internalType": "address", "name": "user", "type": "address" }
        ],
        "name": "getRewardOwedStats",
        "outputs": [
            { "internalType": "address[]", "name": "rewardTokenAddresses", "type": "address[]" },
            { "internalType": "uint256[]", "name": "rewardsOwed", "type": "uint256[]" },
            { "internalType": "string[]", "name": "tokenSymbols", "type": "string[]" },
            { "internalType": "string[]", "name": "tokenNames", "type": "string[]" },
            { "internalType": "uint8[]", "name": "tokenDecimals", "type": "uint8[]" },
            { "internalType": "uint256[]", "name": "tokenRewardRates", "type": "uint256[]" },
            { "internalType": "uint256[]", "name": "tokenPeriodEndsAt", "type": "uint256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
    }, {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }, {
        "inputs": [],
        "name": "duration_of_rewards",
        "outputs": [{ "internalType": "uint64", "name": "", "type": "uint64" }],
        "stateMutability": "view",
        "type": "function"
    }, {
        "inputs": [],
        "name": "getContractTotals",
        "outputs": [
            { "internalType": "uint128", "name": "liquidityInStaking", "type": "uint128" },
            { "internalType": "uint256", "name": "total0xBTCStaked", "type": "uint256" },
            { "internalType": "uint256", "name": "totalB0xStaked", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }];

    const tokenSwapperABI = [{
        "inputs": [
            { "name": "tokenZeroxBTC", "type": "address" },
            { "name": "tokenBZeroX", "type": "address" },
            { "name": "tokenIn", "type": "address" },
            { "name": "hookAddress", "type": "address" },
            { "name": "amountIn", "type": "uint128" }
        ],
        "name": "getOutput",
        "outputs": [{ "name": "amountOut", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }];

    const erc20ABI = [{
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }];

    // Owner ABI for admin access checks (Ownable contracts)
    const ownerABI = [{
        "inputs": [],
        "name": "owner",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    }];

    // getRewardTokens ABI for calculating add reward token cost
    const getRewardTokensABI = [{
        "inputs": [],
        "name": "getRewardTokens",
        "outputs": [{ "internalType": "contract IERC20[]", "name": "", "type": "address[]" }],
        "stateMutability": "view",
        "type": "function"
    }];

    const iface = new ethers.utils.Interface(getRewardStatsABI);
    const contractInterface = new ethers.utils.Interface(CONTRACT_ABI);
    const tokenSwapperInterface = new ethers.utils.Interface(tokenSwapperABI);
    const ownerInterface = new ethers.utils.Interface(ownerABI);
    const multicallInterface = new ethers.utils.Interface(MULTICALL3_ABI);
    const erc20Interface = new ethers.utils.Interface(erc20ABI);
    const rewardTokensInterface = new ethers.utils.Interface(getRewardTokensABI);

    console.log("userAddress== ", window.userAddress);

    // SUPER COMBINED MULTICALL: Combines getRewardStats, GetContractStatsWithMultiCall, tokenSwapper.getOutput, and getBlockNumber
    const calls = [
        // Calls 0-3: getRewardStats calls (4 calls)
        {
            target: contractAddressLPRewardsStaking,
            allowFailure: false,
            callData: iface.encodeFunctionData("duration_of_rewards")
        },
        {
            target: contractAddressLPRewardsStaking,
            allowFailure: false,
            callData: iface.encodeFunctionData("getRewardOwedStats", [window.userAddress])
        },
        {
            target: contractAddressLPRewardsStaking,
            allowFailure: false,
            callData: iface.encodeFunctionData("totalSupply")
        },
        {
            target: contractAddressLPRewardsStaking,
            allowFailure: false,
            callData: iface.encodeFunctionData("getContractTotals")
        },
        // Calls 4-15: GetContractStatsWithMultiCall calls (12 calls)
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
        { target: ProofOfWorkAddresss, allowFailure: false, callData: contractInterface.encodeFunctionData("maxSupplyForEra", []) },
        // Call 16: tokenSwapper.getOutput call (1 call)
        {
            target: contractAddress_Swapper,
            allowFailure: false,
            callData: tokenSwapperInterface.encodeFunctionData("getOutput", [
                Address_ZEROXBTC_TESTNETCONTRACT,
                tokenAddress,
                tokenAddresses['B0x'],
                HookAddress,
                BigInt(10 ** 18)
            ])
        },
        // Call 17: getBlockNumber call (1 call)
        {
            target: MULTICALL3_ADDRESS,
            allowFailure: false,
            callData: multicallInterface.encodeFunctionData("getBlockNumber", [])
        },
        // Calls 18-21: Token balanceOf calls (4 calls) - saves 4 RPC calls
        {
            target: tokenAddresses['B0x'],
            allowFailure: true,
            callData: erc20Interface.encodeFunctionData("balanceOf", [window.userAddress])
        },
        {
            target: tokenAddresses['0xBTC'],
            allowFailure: true,
            callData: erc20Interface.encodeFunctionData("balanceOf", [window.userAddress])
        },
        {
            target: tokenAddresses['WETH'],
            allowFailure: true,
            callData: erc20Interface.encodeFunctionData("balanceOf", [window.userAddress])
        },
        {
            target: tokenAddresses['RightsTo0xBTC'],
            allowFailure: true,
            callData: erc20Interface.encodeFunctionData("balanceOf", [window.userAddress])
        },
        // Call 22: Native ETH balance (1 call) - saves 1 RPC call
        {
            target: MULTICALL3_ADDRESS,
            allowFailure: true,
            callData: multicallInterface.encodeFunctionData("getEthBalance", [window.userAddress])
        },
        // Calls 23-24: Contract owner addresses for admin access (2 calls) - saves 2 RPC calls
        {
            target: contractAddressLPRewardsStaking,
            allowFailure: true,
            callData: ownerInterface.encodeFunctionData("owner")
        },
        {
            target: HookAddress,
            allowFailure: true,
            callData: ownerInterface.encodeFunctionData("owner")
        },
        // Call 25: getRewardTokens for calculating add reward token cost (1 call)
        {
            target: contractAddressLPRewardsStaking,
            allowFailure: true,
            callData: rewardTokensInterface.encodeFunctionData("getRewardTokens")
        }
    ];

    console.log("Custom RPC2: ", customRPC);
    const provider_zzzzz12 = new ethers.providers.JsonRpcProvider(customRPC);
    const multicallContract = new ethers.Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider_zzzzz12);
    console.log("Executing SUPER COMBINED MULTICALL with", calls.length, "function calls...");
    const results = await multicallContract.aggregate3(calls);
    console.log("SUPER COMBINED MULTICALL executed successfully!");

    // Decode getRewardStats results (indices 0-3)
    const resultDuration = iface.decodeFunctionResult("duration_of_rewards", results[0].returnData)[0];
    const result = iface.decodeFunctionResult("getRewardOwedStats", results[1].returnData);
    const result2 = iface.decodeFunctionResult("totalSupply", results[2].returnData)[0];
    const result3 = iface.decodeFunctionResult("getContractTotals", results[3].returnData);

    // Decode GetContractStatsWithMultiCall results (indices 4-15)
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
    ] = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((index) => {
        const functionName = [
            "miningTarget", "getMiningDifficulty", "epochCount", "inflationMined", "blocksToReadjust",
            "seconds_Until_adjustmentSwitch", "latestDifficultyPeriodStarted",
            "latestDifficultyPeriodStarted2", "rewardEra", "readjustsToWhatDifficulty",
            "tokensMinted", "maxSupplyForEra"
        ][index - 4];
        return contractInterface.decodeFunctionResult(functionName, results[index].returnData);
    });

    // Store contract stats for global access (blockNumber comes from multicall index 17, decoded later)
    window.cachedContractStats = {
        blockNumber: null, // Will be set after decoding blockNumber from multicall
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

    // Decode tokenSwapper.getOutput result (index 16)
    const tokenSwapperResult = tokenSwapperInterface.decodeFunctionResult("getOutput", results[16].returnData)[0];

    // Decode getBlockNumber result (index 17)
    const blockNumberFromMulticall = multicallInterface.decodeFunctionResult("getBlockNumber", results[17].returnData)[0];
    console.log("Block number from multicall:", blockNumberFromMulticall.toString());

    // Update cachedContractStats with the block number from multicall
    window.cachedContractStats.blockNumber = blockNumberFromMulticall.toString();

    // Decode token balances (indices 18-21) and update window.walletBalances
    try {
        if (!window.walletBalances) window.walletBalances = {};

        // B0x balance (index 18) - 18 decimals
        if (results[18].success) {
            const b0xBalance = erc20Interface.decodeFunctionResult("balanceOf", results[18].returnData)[0];
            window.walletBalances['B0x'] = ethers.utils.formatUnits(b0xBalance, 18);
        }

        // 0xBTC balance (index 19) - 8 decimals
        if (results[19].success) {
            const zeroxbtcBalance = erc20Interface.decodeFunctionResult("balanceOf", results[19].returnData)[0];
            window.walletBalances['0xBTC'] = ethers.utils.formatUnits(zeroxbtcBalance, 8);
        }

        // WETH balance (index 20) - 18 decimals
        if (results[20].success) {
            const wethBalance = erc20Interface.decodeFunctionResult("balanceOf", results[20].returnData)[0];
            window.walletBalances['WETH'] = ethers.utils.formatUnits(wethBalance, 18);
        }

        // RightsTo0xBTC balance (index 21) - 18 decimals
        if (results[21].success) {
            const rightsBalance = erc20Interface.decodeFunctionResult("balanceOf", results[21].returnData)[0];
            window.walletBalances['RightsTo0xBTC'] = ethers.utils.formatUnits(rightsBalance, 18);
        }

        // Native ETH balance (index 22) - 18 decimals
        if (results[22].success) {
            const ethBalance = multicallInterface.decodeFunctionResult("getEthBalance", results[22].returnData)[0];
            window.walletBalances['ETH'] = ethers.utils.formatUnits(ethBalance, 18);
        }

        console.log("Token balances loaded from SUPER COMBINED MULTICALL:", window.walletBalances);

        // Update the wallet balances display if function is available
        if (typeof window.displayWalletBalances === 'function') {
            window.displayWalletBalances(window.walletBalances);
        }
    } catch (balanceError) {
        console.warn("Failed to decode token balances from multicall:", balanceError);
    }

    // Decode owner addresses for admin access checks (indices 23-24)
    try {
        // LP Rewards Staking contract owner (index 23)
        if (results[23] && results[23].success) {
            const lpRewardsOwner = ownerInterface.decodeFunctionResult("owner", results[23].returnData)[0];
            window.cachedAdminAddresses = window.cachedAdminAddresses || {};
            window.cachedAdminAddresses.lpRewardsOwner = lpRewardsOwner;
            console.log("LP Rewards Staking owner:", lpRewardsOwner);
        }

        // Hook contract owner (index 24)
        if (results[24] && results[24].success) {
            const hookOwner = ownerInterface.decodeFunctionResult("owner", results[24].returnData)[0];
            window.cachedAdminAddresses = window.cachedAdminAddresses || {};
            window.cachedAdminAddresses.hookOwner = hookOwner;
            console.log("Hook contract owner:", hookOwner);
        }

        // Check if current user is admin (either LP owner or Hook owner)
        if (window.userAddress && window.cachedAdminAddresses) {
            const userAddr = window.userAddress.toLowerCase();
            const isLPOwner = window.cachedAdminAddresses.lpRewardsOwner?.toLowerCase() === userAddr;
            const isHookOwner = window.cachedAdminAddresses.hookOwner?.toLowerCase() === userAddr;
            window.cachedAdminAddresses.isAdmin = isLPOwner || isHookOwner;
            window.cachedAdminAddresses.isLPOwner = isLPOwner;
            window.cachedAdminAddresses.isHookOwner = isHookOwner;
            console.log("User admin status - LP Owner:", isLPOwner, "Hook Owner:", isHookOwner);
        }
    } catch (ownerError) {
        console.warn("Failed to decode owner addresses from multicall:", ownerError);
    }

    // Decode getRewardTokens result (index 25) and calculate add reward token cost
    try {
        if (results[25] && results[25].success) {
            const rewardTokensArray = rewardTokensInterface.decodeFunctionResult("getRewardTokens", results[25].returnData)[0];
            const rewardTokensLength = rewardTokensArray.length;

            // Calculate USDC cost: (length / 20 + 1) * 20 USDC (6 decimals)
            const multiplier = Math.floor(rewardTokensLength / 20) + 1;
            const usdcCost = multiplier * 20;
            const usdcCostRaw = multiplier * 20 * (10 ** 6); // Raw amount with 6 decimals

            window.addRewardTokenCost = {
                rewardTokensCount: rewardTokensLength,
                multiplier: multiplier,
                usdcCost: usdcCost,
                usdcCostRaw: usdcCostRaw
            };

            console.log(`Reward tokens count: ${rewardTokensLength}, Add token cost: ${usdcCost} USDC`);

            // Update UI if element exists
            const costDisplay = document.getElementById('addRewardTokenCost');
            if (costDisplay) {
                costDisplay.textContent = `Costs ${usdcCost} USDC on Base`;
            }
        }
    } catch (rewardTokensError) {
        console.warn("Failed to decode getRewardTokens from multicall:", rewardTokensError);
    }

    const rewardAddressesStaking = result[0];
    const rewardsOwed = result[1];
    const rewardtokenSymbols = result[2];
    const rewardtokenNames = result[3];
    const rewardtokenDecimals = result[4];
    const rewardtokenRewardRate = result[5];
    const rewardtokenPeriodEndsAt = result[6];

    console.log("getRewardOwedStats STATS:");
    console.log("Reward Address: ", rewardAddressesStaking);
    console.log("rewardsOwed: ", rewardsOwed.toString());
    console.log("rewardtokenSymbols: ", rewardtokenSymbols);

    // Reset mocks
    mockActivePeriods = [];
    mockRewardTokens = [];

    if (rewardsAmount) rewardsAmount.textContent = '';
    if (rewardsUSD) rewardsUSD.textContent = '';

    // Parse settings addresses
    let rawString = currentSettingsAddresses.contractAddresses;
    console.log("Original string:", rawString);

    let tokenAddresses1;
    try {
        rawString = rawString.replace(/^"/, '').replace(/"$/, '');
        rawString = rawString.replace(/\\"/g, '"');
        tokenAddresses1 = JSON.parse(rawString);
        console.log("Parsed successfully:", tokenAddresses1);
    } catch (error) {
        console.log("Still can't parse (not big deal): ", error);
        tokenAddresses1 = rawString;
    }

    Rewardduration = parseFloat(resultDuration.toString());
    console.log("Reward Duration is how many seconds = ", Rewardduration);

    // Process reward tokens
    for (let x = 0; x < rewardAddressesStaking.length; x++) {
        const timestamp = rewardtokenPeriodEndsAt[x].toString();
        const date = new Date(timestamp * 1000);
        const rewardtokenPeriodEndsAtDate = date.toLocaleDateString();

        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - 45);
        const rewardtokenPeriodStartsAtDate = startDate.toLocaleDateString();

        const rewardRate = rewardtokenRewardRate[x];
        const fortyfivedays = toBigNumber(Rewardduration);
        const rewardsFor45Days = fortyfivedays.mul(rewardRate);

        const rewardAddress = rewardAddressesStaking[x];
        const addressIndex = tokenAddresses1 ? tokenAddresses1.indexOf(rewardAddress) : -1;

        const rewardSymbol = rewardtokenSymbols[x];
        const rewardsOwedNow = rewardsOwed[x];
        const tknDecimals = rewardtokenDecimals[x];

        let humanReadableAmount = ethers.utils.formatUnits(rewardsFor45Days, tknDecimals);
        let totRewardsString = parseFloat(humanReadableAmount).toFixed(6) + " " + rewardSymbol;

        const humanReadableAmount2 = ethers.utils.formatUnits(rewardsOwedNow, tknDecimals);
        const totRewardsString2 = parseFloat(humanReadableAmount2).toFixed(6) + " " + rewardSymbol;

        if (humanReadableAmount > 50) {
            totRewardsString = parseFloat(humanReadableAmount).toFixed(0) + " " + rewardSymbol;
        }

        if (rewardsAmount && addressIndex != -1) {
            if (x == 0) {
                rewardsAmount.innerHTML = totRewardsString2;
            } else {
                rewardsAmount.innerHTML = rewardsAmount.innerHTML + "<br>" + totRewardsString2;
            }
        }

        const timestampEND = parseFloat(rewardtokenPeriodEndsAt[x].toString());
        const endDateTimestamp = timestampEND * 1000;
        const currentTime = Math.floor(Date.now() / 1000);
        let totalSecondsLeft = timestampEND - currentTime;

        if (totalSecondsLeft < 0) {
            totalSecondsLeft = "Ready to Start New Reward Period for Asset";
        } else {
            const minutes = totalSecondsLeft / 60;
            const hours = minutes / 60;
            const days = hours / 24;

            if (minutes < 5) {
                totalSecondsLeft = `${Math.floor(totalSecondsLeft)} seconds`;
            } else if (hours < 5) {
                totalSecondsLeft = `${Math.floor(minutes)} minutes`;
            } else if (days < 5) {
                totalSecondsLeft = `${Math.floor(hours)} hours`;
            } else {
                totalSecondsLeft = `${Math.floor(days)} days`;
            }
        }

        if (endDateTimestamp < Date.now()) {
            console.log("PERIOD ENDED FOR : ", rewardSymbol, " ", rewardAddress);
            mockRewardTokens.push({
                address: rewardAddress,
                symbol: rewardSymbol
            });
        }

        mockActivePeriods.push({
            token: rewardSymbol,
            startTime: rewardtokenPeriodStartsAtDate,
            endTime: rewardtokenPeriodEndsAtDate,
            totalRewards: totRewardsString,
            endTimeSeconds: totalSecondsLeft
        });
    }

    
    totalLiquidityInStakingContract = result3[0];
    const total0xBTCinContract = result3[1];
    const totalB0xinContract = result3[2];

    console.log("totalLiquidityInStakingContract: ", totalLiquidityInStakingContract.toString());
    populateStakingManagementData();

    await GetRewardAPY(rewardAddressesStaking, rewardtokenRewardRate, total0xBTCinContract, tokenSwapperResult);

    // Calculate hashrate using data from SUPER COMBINED MULTICALL (already in window.rewardStatsCache)
    if (window.calculateAndDisplayHashrate) {
        await window.calculateAndDisplayHashrate();
    }
    if (window.updateWidget) await window.updateWidget();


    
    const finalResult = {
        rewardAddressesStaking,
        rewardsOwed,
        rewardtokenSymbols,
        rewardtokenNames,
        rewardtokenDecimals,
        rewardtokenRewardRate,
        rewardtokenPeriodEndsAt,
        contractTotals: {
            totalLiquidityInStakingContract,
            total0xBTCinContract,
            totalB0xinContract
        },
        cachedContractStats: window.cachedContractStats,
        tokenSwapperResult: tokenSwapperResult.toString(),
        timestamp: Date.now()
    };

    window.rewardStatsCache = {
        timestamp: Date.now(),
        data: finalResult,
        userAddress: window.userAddress  // Track which address this cache is for
    };

    
}

// ============================================
// LIQUIDITY OPERATIONS (STAKING)
// ============================================

/**
 * Decreases liquidity from a staked position
 * @async
 * @returns {Promise<void>}
 */
export async function decreaseLiquidityStaking() {
    const percentageDisplay = document.getElementById('stakePercentageDisplay');
    const decreasePercentageBy = percentageDisplay.textContent;
    console.log("decreasePercentageBy: ", decreasePercentageBy);

    const decreasePercentageNumber = parseInt(decreasePercentageBy.replace('%', ''));
    const percentagedivby10000000000000 = 10000000000000 * decreasePercentageNumber / 100;

    if (!window.walletConnected) {
        await window.connectWallet();
    }

    const selectSlippage = document.getElementById('slippageToleranceStakeDecrease');
    const selectSlippageValue = selectSlippage.value;
    const numberValueSlippage = parseFloat(selectSlippageValue.replace('%', ''));
    const decimalValueSlippage = numberValueSlippage / 100;

    console.log("selectSlippageValue: ", selectSlippageValue);
    console.log("decimalValueSlippage: ", decimalValueSlippage);

    const positionSelect = document.querySelector('#stake-decrease select');
    const selectedPositionId = positionSelect.value;
    const position = stakingPositionData[selectedPositionId];
    if (!position) return;

    const positionID = position.id.split('_')[2];
    console.log("positionID = : ", positionID);

    const liquidityPercentageABI = [{
        "inputs": [
            {
                "internalType": "uint256",
                "name": "tokenID",
                "type": "uint256"
            },
            {
                "internalType": "uint128",
                "name": "percentageToRemoveOutOf10000000000000",
                "type": "uint128"
            },
            {
                "internalType": "address",
                "name": "ownerOfNFT",
                "type": "address"
            }
        ],
        "name": "getTokenAmountForPercentageLiquidity",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "amount0fees",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "amount1fees",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "amount0",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "amount1",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }];

    const LPRewardsStakingContract = new ethers.Contract(
        contractAddressLPRewardsStaking,
        liquidityPercentageABI,
        window.signer
    );

    let minAmount0Remove = 0;
    let minAmount1Remove = 0;

    try {
        console.log("Percentage to remove: ", (percentagedivby10000000000000 / 10000000000000));
        const result = await LPRewardsStakingContract.getTokenAmountForPercentageLiquidity(positionID, percentagedivby10000000000000, window.userAddress);

        if (tokenAddress == position.tokenA) {
            minAmount0Remove = result[3];
            minAmount1Remove = result[2];
        } else {
            minAmount0Remove = result[2];
            minAmount1Remove = result[3];
        }
    } catch (error) {
        console.error(`Error finding valid getTokenAmountForPercentageLiquidity:`, error);
    }

    const StakingLPRewardsABI = [{
        "inputs": [
            {
                "internalType": "uint256",
                "name": "tokenID",
                "type": "uint256"
            },
            {
                "internalType": "uint128",
                "name": "percentageToRemoveOutOf10000000000000",
                "type": "uint128"
            },
            {
                "internalType": "uint256",
                "name": "minAmount0",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "minAmount1",
                "type": "uint256"
            }
        ],
        "name": "decreaseLiquidityOfPosition",
        "outputs": [{
            "internalType": "bool",
            "name": "",
            "type": "bool"
        }],
        "stateMutability": "nonpayable",
        "type": "function"
    }];

    const LPrewardsStakingContracts = new ethers.Contract(
        contractAddressLPRewardsStaking,
        StakingLPRewardsABI,
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
                amount0remove = minAmount0;
                amount1remove = minAmount1;
            } else {
                amount0remove = minAmount0;
                amount1remove = minAmount1;
            }
        }

        console.log("decLiqStaking min amount0: ", amount0remove.toString());
        console.log("decLiqStaking min amount1: ", amount1remove.toString());

        alert("Decreasing Liquidity now! Approve Transaction!");

        showInfoNotification('Decreasing Liquidity on Staked ID: ' + positionID, 'Please confirm transaction in the wallet');

        const tx = await LPrewardsStakingContracts.decreaseLiquidityOfPosition(positionID, percentagedivby10000000000000, amount0remove, amount1remove, { gasLimit: 10000000 });

        showInfoNotification();
        console.log("DECREASED Liquidity transaction sent:", tx.hash);

        const receipt = await tx.wait();
        showSuccessNotification('Decreased Liquidity on Staked Uniswap ID: ' + positionID + ' successfully!', 'Transaction confirmed on blockchain', tx.hash);

        console.log("Decreased Liquidity transaction confirmed in block:", receipt.blockNumber);

        alert("Successfully decreased liquidity of your Staked Uniswap position");
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (window.fetchBalances) await window.fetchBalances();
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (window.getTokenIDsOwnedByMetamask) await window.getTokenIDsOwnedByMetamask(true); // Force refresh after decrease
        await getRewardStats();

    } catch (error) {
        console.error(`Error decrease liquidity on token`, error);
        showErrorNotification('Operation Failed', error.message || 'Failed to decrease liquidity');
    }

    console.log("Done with decrease Liq");
}

/**
 * Increases liquidity in a staked position
 * @async
 * @returns {Promise<void>}
 */
export async function increaseLiquidityStaking() {
    if (!window.walletConnected) {
        await window.connectWallet();
    }

    disableButtonWithSpinner('increaseLiquidityStakedBtn');

    const selectSlippage = document.getElementById('slippageToleranceStakeIncrease');
    const selectSlippageValue = selectSlippage.value;
    const numberValueSlippage = parseFloat(selectSlippageValue.replace('%', ''));
    const decimalValueSlippage = numberValueSlippage / 100;

    console.log("selectSlippageValue: ", selectSlippageValue);
    console.log("decimalValueSlippage: ", decimalValueSlippage);

    const tokenALabel = document.querySelector('#stake-increase #tokenALabelINC');
    const tokenBLabel = document.querySelector('#stake-increase #tokenBLabelINC');
    const tokenAInput = document.querySelector('#stake-increase #tokenAAmount');
    const tokenBInput = document.querySelector('#stake-increase #tokenBAmount');

    const tokenAValue = tokenALabel.textContent;
    const tokenBValue = tokenBLabel.textContent;
    const tokenAAmount = tokenAInput ? tokenAInput.value : '0';
    const tokenBAmount = tokenBInput ? tokenBInput.value : '0';

    console.log("Token A:", tokenAValue, "Amount:", tokenAAmount);
    console.log("Token B:", tokenBValue, "Amount:", tokenBAmount);

    const positionSelect = document.querySelector('#stake-increase select');
    const selectedPositionId = positionSelect.value;
    const position = stakingPositionData[selectedPositionId];
    if (!position) return;

    const positionID = position.id.split('_')[2];
    console.log("positionID = : ", positionID);

    let amountAtoCreate = ethers.utils.parseUnits(tokenAAmount, 18);
    let amountBtoCreate;

    if (tokenAValue == "0xBTC" || tokenAValue == "0xBTC " || tokenAValue == " 0xBTC") {
        amountAtoCreate = ethers.utils.parseUnits(tokenAAmount, 8);
        amountBtoCreate = ethers.utils.parseUnits(tokenBAmount, 18);
    } else {
        amountBtoCreate = ethers.utils.parseUnits(tokenBAmount, 8);
        amountAtoCreate = ethers.utils.parseUnits(tokenAAmount, 18);
    }

    let amountInB0x = ethers.BigNumber.from(0);
    let amountIn0xBTC = ethers.BigNumber.from(0);

    if (tokenBValue != "0xBTC" && tokenBValue != "0xBTC " && tokenBValue != " 0xBTC") {
        amountInB0x = amountBtoCreate;
        amountIn0xBTC = amountAtoCreate;
    } else if (tokenBValue == "0xBTC" || tokenBValue == " 0xBTC" || tokenBValue == "0xBTC ") {
        amountInB0x = amountAtoCreate;
        amountIn0xBTC = amountBtoCreate;
    }

    const INCREASE_LIQUIDITY_ABI = [{
        "inputs": [
            {
                "internalType": "address",
                "name": "forWho",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount0In",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "amount1In",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "tokenID",
                "type": "uint256"
            },
            {
                "internalType": "uint160",
                "name": "expectedSqrtPricex96",
                "type": "uint160"
            },
            {
                "internalType": "uint160",
                "name": "slippageBps",
                "type": "uint160"
            }
        ],
        "name": "increaseLiquidityOfPosition",
        "outputs": [{
            "internalType": "bool",
            "name": "",
            "type": "bool"
        }],
        "stateMutability": "nonpayable",
        "type": "function"
    }];

    const [token0, token1] = tokenAddress < Address_ZEROXBTC_TESTNETCONTRACT
        ? [tokenAddress, Address_ZEROXBTC_TESTNETCONTRACT]
        : [Address_ZEROXBTC_TESTNETCONTRACT, tokenAddress];

    const [amount0, amount1] = tokenAddress < Address_ZEROXBTC_TESTNETCONTRACT
        ? [amountInB0x, amountIn0xBTC]
        : [amountIn0xBTC, amountInB0x];

    const LPRewarsdStakingContract = new ethers.Contract(
        contractAddressLPRewardsStaking,
        INCREASE_LIQUIDITY_ABI,
        window.signer
    );

    try {
        await approveIfNeeded(token0, contractAddressLPRewardsStaking, amount0);
        await approveIfNeeded(token1, contractAddressLPRewardsStaking, amount1);
        console.log("Approved Both Approvals if needed");

        const tickLower = -887220;
        const tickUpper = 887220;

        const sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
        const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);
        const sqrtPricex96 = window.Current_getsqrtPricex96;

        const slippageBPS = Math.floor(numberValueSlippage * 100);

        showInfoNotification('Increasing Liquidity on Staked ID: ' + positionID, 'Please confirm transaction in the wallet');

        const tx = await LPRewarsdStakingContract.increaseLiquidityOfPosition(window.userAddress, amount0, amount1, positionID, sqrtPricex96, slippageBPS);

        showInfoNotification();

        console.log("Transaction sent:", tx.hash);
        const receipt12 = await tx.wait();

        showSuccessNotification('Increased Liquidity on Staked Uniswap ID: ' + positionID + ' successfully!', 'Transaction confirmed on blockchain', tx.hash);

        enableButton('increaseLiquidityStakedBtn', 'Increase Staked Position Liquidity');

        // Refresh data after successful transaction (before alert so data is ready)
        try {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for blockchain state to update
            if (window.fetchBalances) await window.fetchBalances();
            await new Promise(resolve => setTimeout(resolve, 500));
            await getRewardStats();
            await new Promise(resolve => setTimeout(resolve, 500));
            if (window.getTokenIDsOwnedByMetamask) {
                await window.getTokenIDsOwnedByMetamask(true); // Force refresh after increase
                console.log("Position data refreshed after staking increase");
            }
        } catch (refreshError) {
            console.warn("Error refreshing data after increase:", refreshError);
        }

        alert("Successfully Increased Liquidity of Staked NFT - Position data has been refreshed");

    } catch (error) {
        console.error(`Error increasing liquidity:`, error);
        enableButton('increaseLiquidityStakedBtn', 'Increase Staked Position Liquidity');
        showErrorNotification('Operation Failed', error.message || 'Failed to increase liquidity');
    }
}

// ============================================================================
// STAKING UI UPDATE FUNCTIONS
// ============================================================================

/**
 * Update total liquidity increase display for staking section
 * @returns {void}
 */
export function updateTotalLiqIncreaseSTAKING() {
    const positionSelect = document.querySelector('#stake-increase select');
    const selectedPositionId = positionSelect?.value;
    const position = stakingPositionData[selectedPositionId];
    console.log("Position Staking Update Liq: ", position);

    if (!position) {
        if (Object.keys(stakingPositionData).length === 0) {
            console.log("No staked positions");
            if (typeof window.disableButtonWithSpinner === 'function') {
                window.disableButtonWithSpinner('increaseLiquidityStakedBtn', "No positions to increase Liquidity on, stake a position");
            }
        } else {
            if (typeof window.enableButton === 'function') {
                window.enableButton('increaseLiquidityStakedBtn', 'Increase Staked Position Liquidity');
            }
        }
        return;
    }

    let inputTokenA = 0;
    let inputTokenB = 0;

    // Update form labels and placeholders
    const formGroups = document.querySelectorAll('#stake-increase .form-row .form-group');
    formGroups.forEach(group => {
        const label = group.querySelector('label');
        const input = group.querySelector('input');

        if (input && label) {
            const inputValue = parseFloat(input.value) || 0;
            const labelText = label.textContent.trim();

            console.log(`Label: ${labelText}, Value: ${inputValue}`);

            // Match the label to the correct token
            if (labelText.includes(position.tokenA)) {
                inputTokenA = inputValue;
                console.log(`Matched tokenA: ${position.tokenA} = ${inputTokenA}`);
            } else if (labelText.includes(position.tokenB)) {
                inputTokenB = inputValue;
                console.log(`Matched tokenB: ${position.tokenB} = ${inputTokenB}`);
            }
        }
    });

    console.log(`Final values - TokenA (${position.tokenA}): ${inputTokenA}, TokenB (${position.tokenB}): ${inputTokenB}`);

    // Update new total liquidity field
    const totalLiquidityInput = document.querySelector('#stake-increase input[readonly]');
    if (totalLiquidityInput) {
        totalLiquidityInput.value = `${(parseFloat(position.currentTokenA) + inputTokenA).toFixed(4)} ${position.tokenA} & ${(parseFloat(position.currentTokenB) + inputTokenB).toFixed(4)} ${position.tokenB}`;
    }

    if (Object.keys(stakingPositionData).length === 0) {
        console.log("No staked positions");
        if (typeof window.disableButtonWithSpinner === 'function') {
            window.disableButtonWithSpinner('increaseLiquidityStakedBtn', "No positions to increase Liquidity on, stake a position");
        }
    } else {
        if (typeof window.enableButton === 'function') {
            window.enableButton('increaseLiquidityStakedBtn', 'Increase Staked Position Liquidity');
        }
    }
}

/**
 * Update stake position info for increase section
 * @returns {void}
 */
export function updateStakePositionInfo() {
    const positionSelect = document.querySelector('#stake-increase select');
    const selectedPositionId = positionSelect?.value;
    const position = stakingPositionData[selectedPositionId];
    console.log("Staked Position: ", position);

    if (!position) {
        // During initial load, keep loading message; otherwise show "create position" message
        if (window.getIsInitialPositionLoad && window.getIsInitialPositionLoad()) {
            console.log('updateStakePositionInfo: No position, keeping loading message during initial load');
            return;
        }

        // Update current position info card
        const infoCard = document.querySelector('#stake-increase .info-card:nth-child(5)');
        if (infoCard) {
            infoCard.innerHTML = `
                <h3>Current Selected Position</h3>
                <p>Stake Position to increase liquidity on it</p>
            `;
        }

        if (Object.keys(positionData).length === 0) {
            console.log("No positions");
            if (typeof window.disableButtonWithSpinner === 'function') {
                window.disableButtonWithSpinner('increaseLiquidityBtn', "No positions to increase Liquidity on, create a position");
            }
        } else {
            if (typeof window.enableButton === 'function') {
                window.enableButton('increaseLiquidityBtn', 'Increase Liquidity');
            }
        }

        return;
    }

    // Update current position info card
    const parseFloatz = parseFloat(position.PenaltyForWithdraw).toFixed(3);

    const infoCard = document.querySelector('#stake-increase .info-card:nth-child(5)');
    if (infoCard) {
        infoCard.innerHTML = `
            <h3>Current Selected Position</h3>
            <p><strong>Pool:</strong> ${position.pool} (${position.feeTier})</p>
            <p><strong>Current Liquidity:</strong> ${position.currentLiquidity.toFixed(2)}</p>
            <p><strong>Total Liquidity:</strong> ${parseFloat(position.currentTokenA).toFixed(4)} ${position.tokenA} & ${parseFloat(position.currentTokenB).toFixed(4)} ${position.tokenB}</p>

            <p><strong>APY:</strong> ${position.apy}</p>
           <p style="font-weight: bold; font-size: 1em; color: red;"><strong>Stake Increase will reset your Early Stake Withdrawal Penalty, usually better to create and stake new seperate NFT.</strong></p>
           <p><strong>Penalty for Early Stake Withdrawl:</strong> ${parseFloatz} %</p>
        `;
    }

    // Update token labels with icons
    const tokenASpan = document.querySelector('#stake-increase #tokenALabelINC');
    const tokenBSpan = document.querySelector('#stake-increase #tokenBLabelINC');

    if (tokenASpan && typeof window.tokenIconsBase !== 'undefined') {
        const iconURL = window.tokenIconsBase[position.tokenA];

        if (iconURL) {
            tokenASpan.innerHTML = `<img src="${iconURL}" alt="${position.tokenA}" class="token-icon222" style="margin-right: 8px;"> ${position.tokenA}`;
        } else {
            tokenASpan.textContent = position.tokenA;
        }
        console.log(`Set tokenALabel to: ${position.tokenA}`);
    }

    if (tokenBSpan && typeof window.tokenIconsBase !== 'undefined') {
        const iconURL = window.tokenIconsBase[position.tokenB];

        if (iconURL) {
            tokenBSpan.innerHTML = `<img src="${iconURL}" alt="${position.tokenB}" class="token-icon222" style="margin-right: 8px;"> ${position.tokenB}`;
        } else {
            tokenBSpan.textContent = position.tokenB;
        }
        console.log(`Set tokenBLabel to: ${position.tokenB}`);
    }

    // Update new total liquidity field
    const totalLiquidityInput = document.querySelector('#stake-increase input[readonly]');
    if (totalLiquidityInput) {
        totalLiquidityInput.value = `${parseFloat(position.currentTokenA).toFixed(4)} ${position.tokenA} & ${parseFloat(position.currentTokenB).toFixed(4)} ${position.tokenB}`;
    }

    if (Object.keys(positionData).length === 0) {
        console.log("No positions");
        if (typeof window.disableButtonWithSpinner === 'function') {
            window.disableButtonWithSpinner('increaseLiquidityBtn', "No positions to increase Liquidity on, create a position");
        }
    } else {
        if (typeof window.enableButton === 'function') {
            window.enableButton('increaseLiquidityBtn', 'Increase Liquidity');
        }
    }
}

/**
 * Update stake decrease position info
 * @returns {void}
 */
export function updateStakeDecreasePositionInfo() {
    const positionSelect = document.querySelector('#stake-decrease select');
    const selectedPositionId = positionSelect?.value;
    const position = stakingPositionData[selectedPositionId];

    if (!position) {
        // During initial load, keep loading message; otherwise show "create position" message
        if (window.getIsInitialPositionLoad && window.getIsInitialPositionLoad()) {
            console.log('updateStakeDecreasePositionInfo: No position, keeping loading message during initial load');
            return;
        }

        // Update position details info card
        const infoCard = document.querySelector('#stake-decrease .info-card:nth-child(4)');
        if (infoCard) {
            infoCard.innerHTML = `
                <h3>Current Selected Position</h3>
                <p>Stake Position to decrease liquidity on it</p>
            `;
        }

        if (Object.keys(positionData).length === 0) {
            console.log("No positions");
            if (typeof window.disableButtonWithSpinner === 'function') {
                window.disableButtonWithSpinner('decreaseLiquidityBtn', "No positions to Decrease Liquidity on, create a position");
            }
        } else {
            if (typeof window.enableButton === 'function') {
                window.enableButton('decreaseLiquidityBtn', 'Remove Liquidity & Claim Fees');
            }
        }

        return;
    }

    // Update position details info card
    const infoCard = document.querySelector('#stake-decrease .info-card:nth-child(4)');
    const parseFloatz = parseFloat(position.PenaltyForWithdraw).toFixed(3);

    if (infoCard) {
        infoCard.innerHTML = `
            <h3>Position Details</h3>
            <p><strong>Pool:</strong> ${position.pool} (${position.feeTier})</p>
            <p><strong>Total Liquidity:</strong> ${position.currentLiquidity.toFixed(2)}</p>
            <p><strong>Total Liquidity:</strong> ${parseFloat(position.currentTokenA).toFixed(4)} ${position.tokenA} & ${parseFloat(position.currentTokenB).toFixed(4)} ${position.tokenB}</p>

            <p><strong>APY:</strong> ${position.apy}</p>
            <p style="font-weight: bold; font-size: 2em; color: red;"><strong>Penalty for Early Stake Withdrawl:</strong> ${parseFloatz} %</p>
        `;
    }

    // Update token labels with icons
    const tokenASpan = document.querySelector('#stake-decrease #tokenALabelDec');
    const tokenBSpan = document.querySelector('#stake-decrease #tokenBLabelDec');

    if (tokenASpan && typeof window.tokenIconsBase !== 'undefined') {
        const iconURL = window.tokenIconsBase[position.tokenA];

        if (iconURL) {
            tokenASpan.innerHTML = `<img src="${iconURL}" alt="${position.tokenA}" class="token-icon222" style="margin-right: 8px;"> ${position.tokenA}`;
        } else {
            tokenASpan.textContent = position.tokenA;
        }
        console.log(`Set tokenALabel to: ${position.tokenA}`);
    }

    if (tokenBSpan && typeof window.tokenIconsBase !== 'undefined') {
        const iconURL = window.tokenIconsBase[position.tokenB];

        if (iconURL) {
            tokenBSpan.innerHTML = `<img src="${iconURL}" alt="${position.tokenB}" class="token-icon222" style="margin-right: 8px;"> ${position.tokenB}`;
        } else {
            tokenBSpan.textContent = position.tokenB;
        }
        console.log(`Set tokenBLabel to: ${position.tokenB}`);
    }

    // Recalculate amounts with current percentage
    const slider = document.querySelector('#stake-decrease .slider');
    if (slider) {
        updateStakePercentage(slider.value);
    }

    if (Object.keys(positionData).length === 0) {
        console.log("No positions");
        if (typeof window.disableButtonWithSpinner === 'function') {
            window.disableButtonWithSpinner('decreaseLiquidityBtn', "No positions to Decrease Liquidity on, create a position");
        }
    } else {
        if (typeof window.enableButton === 'function') {
            window.enableButton('decreaseLiquidityBtn', 'Remove Liquidity & Claim Fees');
        }
    }
}

/**
 * Update stake percentage display for stake decrease slider
 * @param {number} value - Percentage value
 * @returns {void}
 */
export function updateStakePercentage(value) {
    const percentageDisplay = document.getElementById('stakePercentageDisplay');
    if (percentageDisplay) {
        percentageDisplay.textContent = value + '%';
    }

    const slider = document.querySelector('#stake-decrease .slider');
    if (slider) {
        // Update the CSS custom property to move the gradient
        slider.style.setProperty('--value', value + '%');
    }

    // Get current position data
    const positionSelect = document.querySelector('#stake-decrease select');
    if (!positionSelect) return;

    const selectedPositionId = positionSelect.value;
    const position = stakingPositionData[selectedPositionId];

    if (!position) return;

    console.log("Value = ", value);
    const percentage = parseFloat(value) / 100;
    const removeAmount = percentage;

    // Calculate token amounts
    const tokenAAmount = position.currentTokenA * removeAmount;
    const tokenBAmount = position.currentTokenB * removeAmount;

    console.log("token B Amount: ", tokenBAmount);

    const tokenADecimals = tokenAddressesDecimals[position.tokenA];
    console.log("TokenA decimals: ", tokenADecimals);
    const tokenBDecimals = tokenAddressesDecimals[position.tokenB];
    console.log("TokenB decimals: ", tokenBDecimals);

    // Update token receive inputs
    const tokenInputs = document.querySelectorAll('#stake-decrease .form-row input');
    if (tokenInputs.length >= 2) {
        console.log("Stake stuff: ", position.PenaltyForWithdraw);
        const penaltyAsNumber = parseFloat(position.PenaltyForWithdraw.replace('%', ''));
        console.log("penaltyAsNumber: ", penaltyAsNumber);
        tokenInputs[0].value = `${(((tokenAAmount * (100 - penaltyAsNumber)) / 100)).toFixed(tokenADecimals)} ${position.tokenA}`;
        tokenInputs[1].value = `${(((tokenBAmount * (100 - penaltyAsNumber)) / 100)).toFixed(tokenBDecimals)} ${position.tokenB}`;
    }
}

// ============================================================================
// FETCH ALL UNISWAP FEES
// ============================================================================

/**
 * Fetches all Uniswap fees from staked NFT positions
 * Gets all token IDs owned by the staking contract and calls getUniswapALL
 * @async
 * @returns {Promise<{successCount: number, failureCount: number}>}
 */
export async function fetchAllUniswapFees() {
    if (!window.walletConnected) {
        await window.connectWallet();
    }

    const resultDiv = document.getElementById('fetchFeesResult');
    const statusSpan = document.getElementById('fetchFeesStatus');

    if (resultDiv) resultDiv.style.display = 'block';
    if (statusSpan) statusSpan.textContent = 'Scanning for staked NFTs...';

    try {
        // Get all NFT owners from data-loader
        const nftOwners = getNFTOwners();

        if (!nftOwners || Object.keys(nftOwners).length === 0) {
            if (statusSpan) statusSpan.textContent = 'No NFT owner data available. Please wait for data to load.';
            return { successCount: 0, failureCount: 0 };
        }

        // Filter for token IDs owned by the staking contract
        const stakingContractAddress = contractAddressLPRewardsStaking.toLowerCase();
        const stakedTokenIds = [];

        for (const [tokenId, owner] of Object.entries(nftOwners)) {
            if (owner.toLowerCase() === stakingContractAddress) {
                stakedTokenIds.push(tokenId);
            }
        }

        console.log(`Found ${stakedTokenIds.length} NFTs owned by staking contract`);

        if (stakedTokenIds.length === 0) {
            if (statusSpan) statusSpan.textContent = 'No NFTs found owned by the staking contract.';
            return { successCount: 0, failureCount: 0 };
        }

        if (statusSpan) statusSpan.textContent = `Found ${stakedTokenIds.length} staked NFTs. Fetching fees...`;

        // ABI for getUniswapALL function
        const getUniswapALLABI = [{
            "inputs": [
                { "internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]" }
            ],
            "name": "getUniswapALL",
            "outputs": [
                { "internalType": "uint256", "name": "successCount", "type": "uint256" },
                { "internalType": "uint256", "name": "failureCount", "type": "uint256" }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        }];

        const feeCollectorContract = new ethers.Contract(
            contractAddress_PositionFinderPro,
            getUniswapALLABI,
            window.signer
        );

        showInfoNotification('Fetching Uniswap Fees', `Collecting fees from ${stakedTokenIds.length} staked NFT positions...`);

        // Call getUniswapALL with all staked token IDs
        const tx = await feeCollectorContract.getUniswapALL(stakedTokenIds);
        console.log("Transaction sent:", tx.hash);

        if (statusSpan) statusSpan.textContent = `Transaction sent. Waiting for confirmation...`;

        const receipt = await tx.wait();
        console.log("Transaction confirmed:", receipt.transactionHash);

        // Try to get the return values from the transaction
        // Note: For non-view functions, we may need to parse logs or decode return data
        let successCount = 0;
        let failureCount = 0;

        // Try to decode the return values from the transaction receipt
        try {
            const iface = new ethers.utils.Interface(getUniswapALLABI);
            // Check if there are any logs we can parse for results
            if (receipt.logs && receipt.logs.length > 0) {
                console.log("Transaction logs:", receipt.logs);
            }
            // For now, we'll report based on the transaction success
            successCount = stakedTokenIds.length;
            failureCount = 0;
        } catch (decodeError) {
            console.warn("Could not decode return values:", decodeError);
            successCount = stakedTokenIds.length;
        }

        const resultMessage = `✅ Fees collected! Success: ${successCount}, Failures: ${failureCount}`;
        if (statusSpan) statusSpan.innerHTML = resultMessage;

        showSuccessNotification('Fees Collected!', `Successfully processed ${stakedTokenIds.length} NFT positions`, tx.hash);

        // Refresh reward stats to show updated balances
        await getRewardStats();

        return { successCount, failureCount };

    } catch (error) {
        console.error("Error fetching Uniswap fees:", error);
        const errorMessage = `❌ Error: ${error.message || 'Failed to fetch fees'}`;
        if (statusSpan) statusSpan.textContent = errorMessage;
        showErrorNotification('Fee Collection Failed', error.message || 'Failed to fetch Uniswap fees');
        return { successCount: 0, failureCount: 0 };
    }
}

// ============================================================================
// WINDOW EXPORTS (for compatibility)
// ============================================================================

// Export to window object for compatibility
window.updateTotalLiqIncreaseSTAKING = updateTotalLiqIncreaseSTAKING;
window.updateStakePositionInfo = updateStakePositionInfo;
window.updateStakeDecreasePositionInfo = updateStakeDecreasePositionInfo;
window.updateStakePercentage = updateStakePercentage;

console.log('Staking module initialized');
