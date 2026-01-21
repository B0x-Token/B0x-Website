/**
 * @module countdown
 * @description Countdown timer and periodic reload functionality
 *
 * Handles:
 * - Countdown timer display
 * - Periodic data reload
 * - Manual countdown reset
 */

// ============================================
// STATE VARIABLES
// ============================================
import { triggerRefresh } from './data-loader.js';

let count = 50;
let interval = null;
let checker = null;
let isCountdownActive = false;
let isReloading = false;

// ============================================
// COUNTDOWN DISPLAY FUNCTIONS
// ============================================

/**
 * Get all countdown display elements
 * @returns {NodeList} Elements displaying countdown
 */
export function getCountdownElements() {
    return document.querySelectorAll("[id='countdown'], .countdown, [data-countdown]");
}

/**
 * Update all countdown display elements with current count
 */
export function updateCountdownDisplay() {
    const countdownElements = getCountdownElements();
    countdownElements.forEach(el => {
        el.textContent = count;
    });
}

// ============================================
// COUNTDOWN CONTROL FUNCTIONS
// ============================================

/**
 * Reset and restart the countdown timer
 * Triggers data reload immediately
 */
export function resetCountdown() {
    console.log("Manual countdown reset triggered");

    // Clear any existing intervals
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
    if (checker) {
        clearInterval(checker);
        checker = null;
    }

    // Reset the countdown state
    isCountdownActive = false;
    count = 50;
    updateCountdownDisplay();

    // Trigger the countdown complete handler
    // This will reload data and start a new countdown
    handleCountdownComplete();
}

/**
 * Start the main countdown timer
 * @returns {Promise<void>}
 */
export async function startCountdown() {
    if (isCountdownActive) {
        console.log("Countdown already active, skipping start");
        return;
    }

    if (interval) clearInterval(interval);
    if (checker) clearInterval(checker);
    interval = null;
    checker = null;
    isCountdownActive = true;

    updateCountdownDisplay();

    interval = setInterval(() => {
        count--;
        updateCountdownDisplay();

        // Check inFunctionDontRefresh from window (set by positions.js)
        const inFunctionDontRefresh = window.inFunctionDontRefresh || false;

        if (count < 0) {
            // Clear interval immediately to prevent multiple triggers
            clearInterval(interval);
            interval = null;

            if (!inFunctionDontRefresh) {
                handleCountdownComplete();
            } else {
                console.log("Paused - waiting for inFunctionDontRefresh to become false");
                startChecker();
            }
        }
    }, 1000);
}

/**
 * Start checker interval to wait for inFunctionDontRefresh to become false
 */
export function startChecker() {
    if (checker) clearInterval(checker);
    const startTime = Date.now();
    const minWaitTime = count * 1000; // Wait at least count seconds

    checker = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const inFunctionDontRefresh = window.inFunctionDontRefresh || false;

        if (!inFunctionDontRefresh && elapsed >= minWaitTime) {
            console.log("Resuming - conditions met");
            clearInterval(checker);
            checker = null;
            handleCountdownComplete();
        }
    }, 1000);
}

/**
 * Handle countdown completion - reload data and restart countdown
 * @returns {Promise<void>}
 */
async function handleCountdownComplete() {
    console.log("Countdown complete - running reload");

    // Reset countdown state
    isCountdownActive = false;
    count = 50;
    updateCountdownDisplay();

    // Run reload functions
    await runReloadFunctions(false, false);

    // Start new countdown after reload completes
    startCountdown();
}

// ============================================
// RELOAD FUNCTIONS
// ============================================

/**
 * Run periodic reload functions to refresh data
 * @param {boolean} fromChecker - Whether called from checker interval
 * @param {boolean} fromReset - Whether called from manual reset
 * @returns {Promise<void>}
 */
export async function runReloadFunctions(fromChecker = false, fromReset = true) {
    // Check wallet connection status from window
    const walletConnected = window.walletConnected || false;

    if (!walletConnected) {
        console.log("Wallet not connected, limited reload");
        // Try to get estimate if function exists
        if (window.getEstimate) {
            try {
                await window.getEstimate();
            } catch (e) {
                console.warn("getEstimate failed:", e);
            }
        }
        return;
    }

    if (isReloading) {
        console.log("Already reloading, skipping...");
        return;
    }

    isReloading = true;

    try {
        // Fetch balances
        if (window.fetchBalances) {
            await window.fetchBalances(
                window.userAddress,
                window.tokenAddresses,
                window.tokenAddressesDecimals,
                window.fetchTokenBalanceWithEthers,
                window.displayWalletBalances,
                window.provider,
                window.signer,
                window.walletConnected,
                window.connectWallet
            );
        }

        // Check if on convert tab - need ETH balances too
        const PreviousTabName = window.PreviousTabName || "";
        if (PreviousTabName === "convert") {
            console.log("Tab is convert, fetching ETH balances");
            if (window.switchToEthereum) await window.switchToEthereum();
            if (window.fetchBalancesETH) {
                await window.fetchBalancesETH(
                    window.userAddress,
                    window.tokenAddressesETH,
                    window.tokenAddressesDecimalsETH,
                    window.fetchTokenBalanceWithEthersETH,
                    window.displayWalletBalancesETH,
                    window.providerETH,
                    window.signerETH,
                    window.walletConnected,
                    window.connectWallet
                );
            }
            if (window.switchToBase) await window.switchToBase();
        }

  await new Promise(resolve => setTimeout(resolve, 200));
        // Get reward stats
        if (window.getRewardStats) {
            await window.getRewardStats();
        }
  await new Promise(resolve => setTimeout(resolve, 200));

        // Get price ratio
        if (window.throttledGetSqrtRtAndPriceRatio) {
            await window.throttledGetSqrtRtAndPriceRatio("ReloadFunction");
        }

        const now = new Date().toLocaleTimeString();
        console.log("Reload completed at:", now);
  await new Promise(resolve => setTimeout(resolve, 400));

  await new Promise(resolve => setTimeout(resolve, 200));
        triggerRefresh();

        // Refresh position data (stakingPositionData and positionData)
        if (window.getTokenIDsOwnedByMetamask) {
            try {
                await window.getTokenIDsOwnedByMetamask();
            } catch (e) {
                console.warn("getTokenIDsOwnedByMetamask failed:", e);
            }
        }

        // Refresh swap estimate if on swap page and amount is entered
        if (window.getEstimate) {
            try {
                const amountInput = document.querySelector('#swap .form-group:nth-child(5) input');
                const amount = parseFloat(amountInput?.value) || 0;
                if (amount > 0) {
                    await window.getEstimate();
                }
            } catch (e) {
                console.warn("getEstimate failed:", e);
            }
        }

    } catch (error) {
        console.error('Error during reload:', error);
    } finally {
        isReloading = false;
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Stop the countdown timer
 */
export function stopCountdown() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
    if (checker) {
        clearInterval(checker);
        checker = null;
    }
    isCountdownActive = false;
}

/**
 * Get current countdown value
 * @returns {number} Current countdown value
 */
export function getCountdownValue() {
    return count;
}

/**
 * Check if countdown is currently active
 * @returns {boolean} Whether countdown is active
 */
export function isCountdownRunning() {
    return isCountdownActive;
}

/**
 * Set the countdown value
 * @param {number} value - New countdown value
 */
export function setCountdownValue(value) {
    count = value;
    updateCountdownDisplay();
}
