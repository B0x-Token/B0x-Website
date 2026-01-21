/**
 * @module swaps
 * @description Swap routing and execution
 *
 * Handles:
 * - Token swap estimation
 * - Route discovery (single-hop and multi-hop)
 * - Swap execution
 * - Slippage protection
 * - Multi-route optimization
 */

// Import dependencies
import {
    contractAddress_Swapper,
    tokenAddresses,
    MULTICALL_ADDRESS,
    hookAddress
} from './config.js';
import {
    customRPC
} from './settings.js';

import {
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification
} from './ui.js';
import { SPLIT_ROUTE_ABI, MULTICALL_ABI2 } from './abis.js';
import {
    getSymbolFromAddress,
    formatBalance,
    tokenAddressesDecimals,
    fetchBalances
} from './utils.js';
import {
    checkAllowance,
    approveToken
} from './contracts.js';
import { switchToBase } from './wallet.js';
// ============================================
// STATE VARIABLES
// ============================================

export let amountOut_Saved = 0;
export let MinamountOut = undefined;
export let oxbtcPriceUSD = 0;
export let wethPriceUSD = 0;

// Batch size for route optimization
const batchSizeRoutestwo = 110;

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
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {Promise} Result of the function
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000, maxDelay = 10000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries) {
                break;
            }

            const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            const jitter = Math.random() * 0.3 * exponentialDelay;
            const delay = exponentialDelay + jitter;

            console.log(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`, error.message);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    console.error(`All ${maxRetries + 1} attempts failed:`, lastError);
    throw lastError;
}

/**
 * Check if button is enabled
 * @param {string} id - Button ID
 * @param {boolean|null} bool - Set state (null to get current state)
 * @returns {boolean} Button enabled state
 */
const buttonStates = {};
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
 * Approve token if needed
 * @param {string} tokenToApprove - Token address
 * @param {string} spenderAddress - Spender address
 * @param {BigNumber} requiredAmount - Amount to approve
 */
async function approveIfNeeded(tokenToApprove, spenderAddress, requiredAmount) {
    try {
        const allowanceSufficient = await checkAllowance(tokenToApprove, spenderAddress, requiredAmount);

        if (allowanceSufficient) {
            console.log("Approval not needed - sufficient allowance exists");
            return true;
        }

        showInfoNotification('Approve Token', 'Requesting approval for unlimited amount to avoid future approvals...');

        const txResponse = await approveToken(tokenToApprove, spenderAddress, ethers.constants.MaxUint256);

        let txReceipt;
        if (txResponse.wait) {
            txReceipt = await txResponse.wait();
        } else {
            txReceipt = txResponse;
        }

        showSuccessNotification(
            'Approved Tokens!',
            'Tokens have been approved on the contract successfully',
            txReceipt.transactionHash
        );

        return txReceipt;

    } catch (error) {
        console.error("Approve if needed failed:", error);
        alert(`Approval process failed: ${error.message}`);
        return false;
    }
}

/**
 * Update widget display
 */
async function updateWidget() {
    // Placeholder for widget update logic
    console.log("Updating widget display");
}

/**
 * Get single hop swap estimate
 * @param {string} tokenInputAddress - Input token address
 * @param {string} tokenOutputAddress - Output token address
 * @param {BigNumber} amountToSwap - Amount to swap
 * @returns {Promise<BigNumber>} Estimated output amount
 */
async function getSingleHopEstimate(tokenInputAddress, tokenOutputAddress, amountToSwap) {
    const tokenSwapperABI = [
        {
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
        }
    ];

    console.log("Custom RPC3: ", customRPC);
    const provider_zzzzz12 = new ethers.providers.JsonRpcProvider(customRPC);

    const tokenSwapperContract = new ethers.Contract(
        contractAddress_Swapper,
        tokenSwapperABI,
        provider_zzzzz12
    );

    const result = await tokenSwapperContract.callStatic.getOutput(
        tokenOutputAddress,
        tokenInputAddress,
        tokenInputAddress,
        hookAddress,
        amountToSwap
    );

    return result;
}

/**
 * Throttled function to get sqrt price ratio
 */
async function throttledGetSqrtRtAndPriceRatio(NameOfFunction = "General") {
    // Placeholder - import from main if needed
    console.log("Getting sqrt price ratio:", NameOfFunction);
}


// ============================================
// ROUTE DISCOVERY
// ============================================

/**
 * Finds all possible routes between two tokens
 * @param {string} fromToken - Source token symbol
 * @param {string} toToken - Destination token symbol
 * @returns {Array} Array of possible routes
 */
export function findAllRoutes(fromToken, toToken) {
    fromToken = fromToken.trim();
    toToken = toToken.trim();

    console.log(`Finding routes from ${fromToken} to ${toToken}`);

    const routes = [];

    const getAddress = (token) => {
        if (token === "ETH") return "0x0000000000000000000000000000000000000000";
        return tokenAddresses[token];
    };

    // Single-hop routes
    const singleHopRoutes = [
        { from: "ETH", to: "0xBTC" },
        { from: "0xBTC", to: "ETH" },
        { from: "0xBTC", to: "B0x" },
        { from: "B0x", to: "0xBTC" },
        { from: "ETH", to: "B0x" },
        { from: "B0x", to: "ETH" }
    ];

    for (const route of singleHopRoutes) {
        if (route.from === fromToken && route.to === toToken) {
            const addr1 = getAddress(route.from);
            const addr2 = getAddress(route.to);

            routes.push({
                name: `${route.from} → ${route.to} (Direct)`,
                type: 'single',
                isSingleHop: true,
                tokenA: addr1,
                tokenB: addr2,
                pool1TokenA: addr1,
                pool1TokenB: addr2,
                pool2TokenA: "0x0000000000000000000000000000000000000000",
                pool2TokenB: "0x0000000000000000000000000000000000000000",
                hookAddress: hookAddress,
                hook2Address: hookAddress
            });
        }
    }

    // Multi-hop routes
    const multiHopRoutes = [
        {
            from: "ETH",
            to: "B0x",
            via: "0xBTC",
            pool1: ["ETH", "0xBTC"],
            pool2: ["0xBTC", "B0x"]
        },
        {
            from: "B0x",
            to: "ETH",
            via: "0xBTC",
            pool1: ["B0x", "0xBTC"],
            pool2: ["0xBTC", "ETH"]
        }
    ];

    for (const route of multiHopRoutes) {
        if (route.from === fromToken && route.to === toToken) {
            routes.push({
                name: `${route.from} → ${route.via} → ${route.to}`,
                type: 'multi',
                isSingleHop: false,
                tokenA: getAddress(route.pool1[0]),
                tokenB: getAddress(route.pool1[1]),
                tokenC: getAddress(route.pool2[0]),
                tokenD: getAddress(route.pool2[1]),
                pool1TokenA: getAddress(route.pool1[0]),
                pool1TokenB: getAddress(route.pool1[1]),
                pool2TokenA: getAddress(route.pool2[0]),
                pool2TokenB: getAddress(route.pool2[1]),
                hookAddress: hookAddress,
                hook2Address: hookAddress
            });
        }
    }

    console.log(`Found ${routes.length} routes:`, routes.map(r => r.name));
    return routes;
}

/**
 * Gets all possible routes including intermediate tokens
 * @param {string} fromToken - Source token
 * @param {string} toToken - Destination token
 * @returns {Array} All possible route combinations
 */
export function getAllPossibleRoutes(fromToken, toToken) {
    const routes = [];
    const oxbtc = tokenAddresses["0xBTC"];
    const box = tokenAddresses["B0x"];
    const eth = tokenAddresses["ETH"];

    console.log("hookAddress: ", hookAddress);

    // Direct routes
    if (fromToken === "0xBTC" && toToken === "B0x" ||
        fromToken === "B0x" && toToken === "0xBTC") {
        routes.push({
            name: `${fromToken} → ${toToken} (direct)`,
            isSingleHop: true,
            tokenA: fromToken === "0xBTC" ? oxbtc : box,
            tokenB: fromToken === "0xBTC" ? box : oxbtc,
            tokenC: ethers.constants.AddressZero,
            tokenD: ethers.constants.AddressZero,
            hookAddress: hookAddress,
            hookAddress2: hookAddress
        });
    }

    if (fromToken === "B0x" && toToken === "ETH" ||
        fromToken === "ETH" && toToken === "B0x") {
        routes.push({
            name: `${fromToken} → ${toToken} (direct)`,
            isSingleHop: true,
            tokenA: fromToken === "B0x" ? box : eth,
            tokenB: fromToken === "B0x" ? eth : box,
            tokenC: ethers.constants.AddressZero,
            tokenD: ethers.constants.AddressZero,
            hookAddress: hookAddress,
            hookAddress2: hookAddress
        });
    }

    if (fromToken === "0xBTC" && toToken === "ETH" ||
        fromToken === "ETH" && toToken === "0xBTC") {
        routes.push({
            name: `${fromToken} → ${toToken} (direct)`,
            isSingleHop: true,
            tokenA: fromToken === "0xBTC" ? oxbtc : eth,
            tokenB: fromToken === "0xBTC" ? eth : oxbtc,
            tokenC: ethers.constants.AddressZero,
            tokenD: ethers.constants.AddressZero,
            hookAddress: hookAddress,
            hookAddress2: hookAddress
        });
    }

    // Multi-hop routes
    if (fromToken === "0xBTC" && toToken === "ETH") {
        routes.push({
            name: "0xBTC → B0x → ETH",
            isSingleHop: false,
            tokenA: oxbtc,
            tokenB: box,
            tokenC: box,
            tokenD: eth,
            hookAddress: hookAddress,
            hookAddress2: hookAddress
        });
    }

    if (fromToken === "ETH" && toToken === "0xBTC") {
        routes.push({
            name: "ETH → B0x → 0xBTC",
            isSingleHop: false,
            tokenA: eth,
            tokenB: box,
            tokenC: box,
            tokenD: oxbtc,
            hookAddress: hookAddress,
            hookAddress2: hookAddress
        });
    }

    if (fromToken === "B0x" && toToken === "ETH") {
        routes.push({
            name: "B0x → 0xBTC → ETH",
            isSingleHop: false,
            tokenA: box,
            tokenB: oxbtc,
            tokenC: oxbtc,
            tokenD: eth,
            hookAddress: hookAddress,
            hookAddress2: hookAddress
        });
    }

    if (fromToken === "ETH" && toToken === "B0x") {
        routes.push({
            name: "ETH → 0xBTC → B0x",
            isSingleHop: false,
            tokenA: eth,
            tokenB: oxbtc,
            tokenC: oxbtc,
            tokenD: box,
            hookAddress: hookAddress,
            hookAddress2: hookAddress
        });
    }

    if (fromToken === "0xBTC" && toToken === "B0x") {
        routes.push({
            name: "0xBTC → ETH → B0x",
            isSingleHop: false,
            tokenA: oxbtc,
            tokenB: eth,
            tokenC: eth,
            tokenD: box,
            hookAddress: hookAddress,
            hookAddress2: hookAddress
        });
    }

    if (fromToken === "B0x" && toToken === "0xBTC") {
        routes.push({
            name: "B0x → ETH → 0xBTC",
            isSingleHop: false,
            tokenA: box,
            tokenB: eth,
            tokenC: eth,
            tokenD: oxbtc,
            hookAddress: hookAddress,
            hookAddress2: hookAddress
        });
    }

    return routes;
}

// ============================================
// ROUTE ESTIMATION
// ============================================

/**
 * Build call data for a route
 * @param {Object} route - Route object
 * @param {BigNumber} amount - Amount to swap
 * @param {Interface} contractInterface - Contract interface
 * @param {string} tokenInAddress - Input token address
 * @param {string} tokenOutAddress - Output token address
 * @returns {string} Encoded call data
 */
function buildRouteCall(route, amount, contractInterface, tokenInAddress, tokenOutAddress) {
    if (route.isSingleHop) {
        console.log("route.tokenA", route.tokenA);
        console.log("route.tokenB", route.tokenB);
        console.log("tokenInAddress", tokenInAddress);
        console.log("amount", amount);
        console.log("route.hookAddress", route.hookAddress);

        return contractInterface.encodeFunctionData("getOutput", [
            route.tokenA,
            route.tokenB,
            tokenInAddress,
            route.hookAddress,
            amount
        ]);
    } else {
        console.log("route.hookAddress", route.hookAddress);
        console.log("route.hookAddress2", route.hookAddress2);
        console.log("route.hook2Address", route.hook2Address);

        return contractInterface.encodeFunctionData("getOutputMultiHop", [
            route.tokenA,
            route.tokenB,
            route.tokenC,
            route.tokenD,
            tokenInAddress,
            tokenOutAddress,
            route.hookAddress ?? route.hook1Address,
            route.hookAddress2 ?? route.hook2Address,
            amount
        ]);
    }
}

/**
 * Get estimate for a single route
 * @param {Object} route - Route object
 * @param {BigNumber} amountIn - Input amount
 * @param {string} fromToken - Source token
 * @param {string} toToken - Destination token
 * @returns {Promise<Object>} Route estimate
 */
async function getSingleRouteEstimate(route, amountIn, fromToken, toToken) {
    console.log("Custom RPC1: ", customRPC);
    await sleep(300);

    const provider_zzzzz12 = new ethers.providers.JsonRpcProvider(customRPC);
    const provider_temp = window.walletConnected ? window.provider : provider_zzzzz12;
    const contractInterface = new ethers.utils.Interface(SPLIT_ROUTE_ABI);

    const fromAddress = tokenAddresses[fromToken];
    const toAddress = tokenAddresses[toToken];
    const callData = buildRouteCall(route, amountIn, contractInterface, fromAddress, toAddress);

    try {
        const result = await provider_temp.call({
            to: contractAddress_Swapper,
            data: callData,
            gasLimit: 1000000
        });

        const decoded = contractInterface.decodeFunctionResult(
            route.isSingleHop ? "getOutput" : "getOutputMultiHop",
            result
        );

        await sleep(300);

        return {
            route: route,
            output: decoded[0]
        };
    } catch (error) {
        await sleep(500);
        console.error(`Failed to estimate route ${route.name}:`, error);
        throw error;
    }
}

/**
 * Get output for single route
 * @param {Object} route - Route object
 * @param {BigNumber} amount - Input amount
 * @param {Interface} contractInterface - Contract interface
 * @param {string} fromToken - Source token
 * @param {string} toToken - Destination token
 * @returns {Promise<BigNumber>} Output amount
 */
async function getSingleRouteOutput(route, amount, contractInterface, fromToken, toToken) {
    const tokenSwapperContract = new ethers.Contract(
        contractAddress_Swapper,
        contractInterface,
        window.provider
    );

    if (route.isSingleHop) {
        return await tokenSwapperContract.callStatic.getOutput(
            route.pool1TokenA,
            route.pool1TokenB,
            tokenAddresses[fromToken],
            route.hookAddress,
            amount
        );
    } else {
        return await tokenSwapperContract.callStatic.getOutputMultiHop(
            route.pool1TokenA,
            route.pool1TokenB,
            route.pool2TokenA,
            route.pool2TokenB,
            tokenAddresses[fromToken],
            tokenAddresses[toToken],
            route.hook1Address,
            route.hook2Address,
            amount
        );
    }
}

// ============================================
// COMBINED MULTICALL FOR ROUTE OPTIMIZATION
// ============================================

/**
 * Get all route estimates and optimal splits in a single combined multicall
 * Combines single route estimates and multi-route split optimization
 * @param {Array} allRoutes - All possible routes
 * @param {BigNumber} amountToSwap - Amount to swap
 * @param {string} fromToken - Source token
 * @param {string} toToken - Destination token
 * @returns {Promise<{singleRouteEstimates: Array, multiRouteResult: Object}>}
 */
async function getCombinedRouteEstimates(allRoutes, amountToSwap, fromToken, toToken) {
    console.log("Custom RPC (Combined): ", customRPC);
    const provider_zzzzz12 = new ethers.providers.JsonRpcProvider(customRPC);
    const provider_temp = window.walletConnected ? window.provider : provider_zzzzz12;
    const contractInterface = new ethers.utils.Interface(SPLIT_ROUTE_ABI);
    const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI2, provider_temp);

    const tokenInAddress = tokenAddresses[fromToken];
    const tokenOutAddress = tokenAddresses[toToken];

    // Part 1: Build calls for all single route estimates
    const singleRouteCalls = allRoutes.map(route => ({
        target: contractAddress_Swapper,
        allowFailure: true,
        callData: buildRouteCall(route, amountToSwap, contractInterface, tokenInAddress, tokenOutAddress)
    }));

    // Part 2: Build calls for multi-route split optimization (if 2+ routes)
    let multiRouteCalls = [];
    let multiRouteMetadata = [];
    const maxRoutes = Math.min(allRoutes.length, 4);
    const routes = allRoutes.slice(0, maxRoutes);

    if (routes.length >= 2) {
        // Generate test splits using ternary search approach
        const allTestSplits = [];
        let left = 0;
        let right = 10000;

        // Ternary search to find splits to test
        while (right - left > 50) {
            const mid1 = Math.floor(left + (right - left) / 3);
            const mid2 = Math.floor(right - (right - left) / 3);

            allTestSplits.push({
                splits: [mid1, Math.floor((mid1 + mid2) / 2), mid2],
                left,
                right
            });

            const tempBestSplit = Math.floor((mid1 + mid2) / 2);
            if (tempBestSplit === mid1) {
                right = Math.floor((mid1 + mid2) / 2);
            } else if (tempBestSplit === mid2) {
                left = Math.floor((mid1 + mid2) / 2);
            } else {
                left = mid1;
                right = mid2;
            }
        }

        // Build calls for each test split
        for (const iteration of allTestSplits) {
            for (const split of iteration.splits) {
                const amount1 = amountToSwap.mul(split).div(10000);
                const amount2 = amountToSwap.sub(amount1);

                const startIdx = multiRouteCalls.length;

                multiRouteCalls.push({
                    target: contractAddress_Swapper,
                    allowFailure: false,
                    callData: buildRouteCall(routes[0], amount1, contractInterface, tokenInAddress, tokenOutAddress)
                });

                multiRouteCalls.push({
                    target: contractAddress_Swapper,
                    allowFailure: false,
                    callData: buildRouteCall(routes[1], amount2, contractInterface, tokenInAddress, tokenOutAddress)
                });

                multiRouteMetadata.push({
                    split,
                    resultIndices: [startIdx, startIdx + 1],
                    amounts: [amount1, amount2]
                });
            }
        }
    }

    // COMBINED MULTICALL: Execute all calls at once
    const allCalls = [...singleRouteCalls, ...multiRouteCalls];
    console.log(`Executing COMBINED MULTICALL with ${allCalls.length} calls (${singleRouteCalls.length} single route + ${multiRouteCalls.length} multi-route split tests)`);

    const batchSize = 100; // Adjust based on RPC limits
    const allResults = [];

    for (let i = 0; i < allCalls.length; i += batchSize) {
        const batch = allCalls.slice(i, Math.min(i + batchSize, allCalls.length));
        try {
            const results = await multicallContract.callStatic.aggregate3(batch);
            allResults.push(...results);
            await sleep(500);
        } catch (error) {
            console.error(`Batch ${Math.floor(i / batchSize)} error:`, error);
            await sleep(2000);
            // Fill with null results for failed batch
            allResults.push(...batch.map(() => ({ success: false, returnData: '0x' })));
        }
    }

    // Process single route estimates
    const singleRouteEstimates = allRoutes.map((route, i) => {
        const result = allResults[i];
        if (!result || !result.success) {
            console.error(`Route ${route.name} failed`);
            return null;
        }

        try {
            const decoded = contractInterface.decodeFunctionResult(
                route.isSingleHop ? "getOutput" : "getOutputMultiHop",
                result.returnData
            );
            return {
                route: route,
                output: decoded[0]
            };
        } catch (error) {
            console.error(`Failed to decode route ${route.name}:`, error);
            return null;
        }
    });

    // Process multi-route results
    let multiRouteResult = null;
    if (routes.length >= 2 && multiRouteCalls.length > 0) {
        const multiRouteResults = allResults.slice(singleRouteCalls.length);

        let bestSplit = 5000;
        let bestOutput = ethers.BigNumber.from(0);
        let bestAmounts = null;
        let bestOutputs = null;

        for (let i = 0; i < multiRouteMetadata.length; i++) {
            const metadata = multiRouteMetadata[i];
            const result1 = multiRouteResults[metadata.resultIndices[0]];
            const result2 = multiRouteResults[metadata.resultIndices[1]];

            if (result1 && result1.success && result2 && result2.success) {
                try {
                    const output1 = contractInterface.decodeFunctionResult(
                        routes[0].isSingleHop ? "getOutput" : "getOutputMultiHop",
                        result1.returnData
                    )[0];

                    const output2 = contractInterface.decodeFunctionResult(
                        routes[1].isSingleHop ? "getOutput" : "getOutputMultiHop",
                        result2.returnData
                    )[0];

                    const totalOutput = output1.add(output2);

                    if (totalOutput.gt(bestOutput)) {
                        bestOutput = totalOutput;
                        bestSplit = metadata.split;
                        bestAmounts = metadata.amounts;
                        bestOutputs = [output1, output2];
                    }
                } catch (error) {
                    console.error(`Failed to decode split ${metadata.split}:`, error);
                }
            }
        }

        if (bestOutput.gt(0)) {
            multiRouteResult = {
                routes: routes.slice(0, 2),
                splits: [bestSplit / 100, (10000 - bestSplit) / 100],
                amounts: bestAmounts,
                outputs: bestOutputs,
                totalOutput: bestOutput
            };
        }
    }

    return {
        singleRouteEstimates,
        multiRouteResult
    };
}

// ============================================
// MULTI-ROUTE OPTIMIZATION
// ============================================

/**
 * Calculate optimal multi-route split
 * @param {string} fromToken - Source token
 * @param {string} toToken - Destination token
 * @param {BigNumber} totalAmountIn - Total input amount
 * @param {number} maxRoutes - Maximum routes to use
 * @returns {Promise<Object>} Optimization result
 */
async function calculateOptimalMultiRouteSplit(fromToken, toToken, totalAmountIn, maxRoutes = 4) {
    console.log("Custom RPC2: ", customRPC);
    const provider_zzzzz12 = new ethers.providers.JsonRpcProvider(customRPC);
    const provider_temp = window.walletConnected ? window.provider : provider_zzzzz12;
    const contractInterface = new ethers.utils.Interface(SPLIT_ROUTE_ABI);
    const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI2, provider_temp);

    const allRoutes = getAllPossibleRoutes(fromToken, toToken);

    if (!allRoutes || allRoutes.length < 2) {
        console.log("Not enough routes for split routing");
        return null;
    }

    const routes = allRoutes.slice(0, Math.min(maxRoutes, allRoutes.length));
    console.log(`Optimizing across ${routes.length} routes`);

    if (routes.length === 2) {
        return await optimizeTwoRoutes(routes, totalAmountIn, contractInterface, multicallContract, fromToken, toToken);
    } else {
        return await optimizeMultiRoutesBatch(routes, totalAmountIn, contractInterface, multicallContract, fromToken, toToken);
    }
}

/**
 * Optimize split for two routes using ternary search
 * @param {Array} routes - Array of route objects
 * @param {BigNumber} totalAmountIn - Total input amount
 * @param {Interface} contractInterface - Contract interface
 * @param {Contract} multicallContract - Multicall contract
 * @param {string} fromToken - Source token
 * @param {string} toToken - Destination token
 * @returns {Promise<Object>} Optimization result
 */
async function optimizeTwoRoutes(routes, totalAmountIn, contractInterface, multicallContract, fromToken, toToken) {
    console.log("THIS THIS THIS");
    const tokenInAddress = tokenAddresses[fromToken];
    const tokenOutAddress = tokenAddresses[toToken];

    let left = 0;
    let right = 10000;
    let bestSplit = 5000;
    let bestOutput = ethers.BigNumber.from(0);
    let bestResult = null;

    const allTestSplits = [];

    while (right - left > 50) {
        const mid1 = Math.floor(left + (right - left) / 3);
        const mid2 = Math.floor(right - (right - left) / 3);

        allTestSplits.push({
            splits: [mid1, Math.floor((mid1 + mid2) / 2), mid2],
            left,
            right
        });

        const tempBestSplit = Math.floor((mid1 + mid2) / 2);
        if (tempBestSplit === mid1) {
            right = Math.floor((mid1 + mid2) / 2);
        } else if (tempBestSplit === mid2) {
            left = Math.floor((mid1 + mid2) / 2);
        } else {
            left = mid1;
            right = mid2;
        }
    }

    left = 0;
    right = 10000;

    const allCalls = [];
    const callMetadata = [];

    for (const iteration of allTestSplits) {
        for (const split of iteration.splits) {
            const amount1 = totalAmountIn.mul(split).div(10000);
            const amount2 = totalAmountIn.sub(amount1);

            const startIdx = allCalls.length;

            allCalls.push({
                target: contractAddress_Swapper,
                allowFailure: false,
                callData: buildRouteCall(routes[0], amount1, contractInterface, tokenInAddress, tokenOutAddress)
            });

            allCalls.push({
                target: contractAddress_Swapper,
                allowFailure: false,
                callData: buildRouteCall(routes[1], amount2, contractInterface, tokenInAddress, tokenOutAddress)
            });

            callMetadata.push({
                split,
                resultIndices: [startIdx, startIdx + 1]
            });
        }
    }

    const batchSize = batchSizeRoutestwo;
    const allResults = [];

    for (let i = 0; i < allCalls.length; i += batchSize) {
        console.log("THIS THIS THIS123123555");
        const batch = allCalls.slice(i, Math.min(i + batchSize, allCalls.length));

        try {
            const results = await multicallContract.callStatic.aggregate3(batch);
            allResults.push(...results);
            await sleep(1000);
        } catch (error) {
            console.error(`Batch ${i / batchSize} error:`, error);
            await sleep(4000);
            continue;
        }
    }

    let metadataIdx = 0;
    for (const iteration of allTestSplits) {
        for (const split of iteration.splits) {
            const metadata = callMetadata[metadataIdx++];

            const output1 = contractInterface.decodeFunctionResult(
                routes[0].isSingleHop ? "getOutput" : "getOutputMultiHop",
                allResults[metadata.resultIndices[0]].returnData
            )[0];

            const output2 = contractInterface.decodeFunctionResult(
                routes[1].isSingleHop ? "getOutput" : "getOutputMultiHop",
                allResults[metadata.resultIndices[1]].returnData
            )[0];

            const totalOutput = output1.add(output2);

            if (totalOutput.gt(bestOutput)) {
                bestOutput = totalOutput;
                bestSplit = split;
                bestResult = {
                    split1: split,
                    split2: 10000 - split,
                    amount1: totalAmountIn.mul(split).div(10000),
                    amount2: totalAmountIn.sub(totalAmountIn.mul(split).div(10000)),
                    output1: output1,
                    output2: output2,
                    totalOutput: totalOutput
                };
            }
        }

        if (bestSplit === iteration.splits[0]) {
            right = iteration.splits[1];
        } else if (bestSplit === iteration.splits[2]) {
            left = iteration.splits[1];
        } else {
            left = Math.floor(left + (right - left) / 3);
            right = Math.floor(right - (right - left) / 3);
        }
    }

    if (!bestResult) return null;

    console.log("DONE WITH optimizeTwoRoutes");
    return {
        routes: routes,
        splits: [bestResult.split1 / 100, bestResult.split2 / 100],
        amounts: [bestResult.amount1, bestResult.amount2],
        outputs: [bestResult.output1, bestResult.output2],
        totalOutput: bestResult.totalOutput
    };
}

/**
 * Optimize multiple routes in batch
 * @param {Array} routes - Array of route objects
 * @param {BigNumber} totalAmountIn - Total input amount
 * @param {Interface} contractInterface - Contract interface
 * @param {Contract} multicallContract - Multicall contract
 * @param {string} fromToken - Source token
 * @param {string} toToken - Destination token
 * @param {number} stepSize - Step size for optimization
 * @param {number} maxBatchSize - Maximum batch size
 * @returns {Promise<Object>} Optimization result
 */
async function optimizeMultiRoutesBatch(
    routes,
    totalAmountIn,
    contractInterface,
    multicallContract,
    fromToken,
    toToken,
    stepSize = 500,
    maxBatchSize = 100
) {
    const numRoutes = routes.length;
    const tokenInAddress = tokenAddresses[fromToken];
    const tokenOutAddress = tokenAddresses[toToken];

    const splitSets = [];

    function generateSplits(current, remaining, depth) {
        if (depth === numRoutes - 1) {
            splitSets.push([...current, remaining]);
            return;
        }
        for (let i = 0; i <= remaining; i += stepSize) {
            generateSplits([...current, i], remaining - i, depth + 1);
        }
    }

    generateSplits([], 10000, 0);

    console.log(`Generated ${splitSets.length} candidate splits`);

    const calls = [];
    for (const split of splitSets) {
        for (let i = 0; i < numRoutes; i++) {
            const amount = totalAmountIn.mul(split[i]).div(10000);
            calls.push({
                target: contractAddress_Swapper,
                allowFailure: false,
                callData: buildRouteCall(routes[i], amount, contractInterface, tokenInAddress, tokenOutAddress)
            });
        }
    }

    async function safeAggregate3(calls, maxBatchSize) {
        const results = [];
        for (let i = 0; i < calls.length; i += maxBatchSize) {
            const batch = calls.slice(i, i + maxBatchSize);
            const batchResults = await multicallContract.aggregate3(batch);
            results.push(...batchResults);
        }
        return results;
    }

    const results = await safeAggregate3(calls, maxBatchSize);

    let bestOutput = ethers.BigNumber.from(0);
    let bestSplits = null;
    let bestOutputs = [];

    for (let splitIdx = 0; splitIdx < splitSets.length; splitIdx++) {
        let totalOutput = ethers.BigNumber.from(0);
        const outputs = [];

        for (let routeIdx = 0; routeIdx < numRoutes; routeIdx++) {
            const resultIdx = splitIdx * numRoutes + routeIdx;
            const output = contractInterface.decodeFunctionResult(
                routes[routeIdx].isSingleHop ? "getOutput" : "getOutputMultiHop",
                results[resultIdx].returnData
            )[0];
            outputs.push(output);
            totalOutput = totalOutput.add(output);
        }

        if (totalOutput.gt(bestOutput)) {
            bestOutput = totalOutput;
            bestSplits = splitSets[splitIdx];
            bestOutputs = outputs;
        }
    }

    if (!bestSplits) return null;

    const routeAmounts = bestSplits.map(s => totalAmountIn.mul(s).div(10000));

    return {
        routes,
        splits: bestSplits.map(s => s / 100),
        amounts: routeAmounts,
        outputs: bestOutputs,
        totalOutput: bestOutput
    };
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

/**
 * Show error display
 * @param {string} message - Error message
 */
function showErrorDisplay(message) {
    const estimateDisplay = document.getElementById('estimateDisplay');
    if (estimateDisplay) {
        if (message.includes("allResults[metadata.resultIndices[0]] is undefined")) {
            estimateDisplay.innerHTML = `
                <div style="color: #dc3545; padding: 10px; border: 1px solid #dc3545; border-radius: 5px;">
                    <strong>⚠️ Error Too much Inputted amount</strong>
                    <p>Your inputted amount was TOO much for our liquidity, lower the amount and try again</p>
                </div>
            `;
        } else {
            estimateDisplay.innerHTML = `
                <div style="color: #dc3545; padding: 10px; border: 1px solid #dc3545; border-radius: 5px;">
                    <strong>⚠️ Error</strong>
                    <p>${message}</p>
                </div>
            `;
        }
    }
}

/**
 * Updates estimate display in the UI
 * @async
 * @param {string} fromToken - Source token
 * @param {string} toToken - Destination token
 * @param {Object} estimate - Estimate data
 * @param {BigNumber} amountIn - Input amount
 * @returns {Promise<void>}
 */
export async function updateEstimateDisplay(fromToken, toToken, estimate, amountIn) {
    if (!window.walletConnected) {
        await window.getRewardStats();
    }

    fromToken = fromToken.trim();
    toToken = toToken.trim();

    const estimateDisplay = document.getElementById('estimateDisplay');
    if (!estimateDisplay) return;

    const formattedInput = fromToken === "0xBTC" ?
        ethers.utils.formatUnits(amountIn, 8) :
        ethers.utils.formatEther(amountIn);

    const formattedOutput = toToken === "0xBTC" ?
        ethers.utils.formatUnits(estimate.output, 8) :
        ethers.utils.formatEther(estimate.output);

    document.getElementById("estOutput").value = formattedOutput;

    const estOutputField = document.getElementById("estOutput");
    if (estOutputField) {
        estOutputField.value = formattedOutput;
        console.log("Updated estOutput field to:", formattedOutput);
    } else {
        console.error("estOutput field not found");
    }

    let mainDisplayHtml = '';

    if (estimate.type === 'multi') {
        let routesHtml = '';
        estimate.routes.forEach((route, i) => {
            const routeAmount = fromToken === "0xBTC" ?
                ethers.utils.formatUnits(estimate.amounts[i], 8) :
                ethers.utils.formatEther(estimate.amounts[i]);
            const routeOutput = toToken === "0xBTC" ?
                ethers.utils.formatUnits(estimate.outputs[i], 8) :
                ethers.utils.formatEther(estimate.outputs[i]);

            routesHtml += `
                <div style="margin: 8px 0; padding: 8px; border-radius: 4px;">
                    <strong>${route.name}</strong>
                    <div style="font-size: 0.9em;">
                        Split: ${estimate.splits[i].toFixed(1)}% (${routeAmount} ${fromToken})
                        → ${routeOutput} ${toToken}
                    </div>
                </div>
            `;
        });

        mainDisplayHtml = `
            <div style="border: 2px solid #28a745; padding: 15px; border-radius: 8px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #28a745;">Multi-Route Optimized</h4>
                    <span style="background: #28a745; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.85em;">
                        +${estimate.improvement.toFixed(2)}% Better
                    </span>
                </div>

                <div style="font-size: 1.1em; margin: 10px 0;">
                    <strong>You send:</strong> ${formattedInput} ${fromToken}
                    <br><strong>You receive:</strong> ${formattedOutput} ${toToken}
                </div>

                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; color: #007bff;">Route Details</summary>
                    ${routesHtml}
                </details>
            </div>
        `;
    } else {
        mainDisplayHtml = `
            <div style="border: 1px solid #007bff; padding: 15px; border-radius: 8px;">
                <h4 style="margin: 0 0 10px 0; color: #007bff;">Swap Estimate</h4>

                <div style="font-size: 1.1em;">
                    <strong>Route:</strong> ${estimate.route.name}
                    <br><strong>You send:</strong> ${formattedInput} ${fromToken}
                    <br><strong>You receive:</strong> ${formattedOutput} ${toToken}
                </div>
            </div>
        `;
    }

    estimateDisplay.innerHTML = mainDisplayHtml;

    // Bridge comparison logic
    const isETHtoB0xVia0xBTC = (fromToken === "ETH" && toToken === "B0x");

    if (isETHtoB0xVia0xBTC && oxbtcPriceUSD && oxbtcPriceUSD > 0) {
        try {
            const ethPrice = wethPriceUSD || 3000;

            const OXBTC_ADDRESS = tokenAddresses["0xBTC"];
            const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

            const intermediate0xBTCAmount = await retryWithBackoff(() =>
                getSingleHopEstimate(ETH_ADDRESS, OXBTC_ADDRESS, amountIn)
            );
            const oxbtcReceived = parseFloat(ethers.utils.formatUnits(intermediate0xBTCAmount, 8));

            console.log("ETH input:", amountIn.toString());
            console.log("Intermediate 0xBTC amount:", oxbtcReceived);
            console.log("Final B0x output:", formattedOutput);

            const ethSpent = parseFloat(formattedInput);
            const totalETHSpentUSD = ethSpent * ethPrice;
            const swapPrice = totalETHSpentUSD / oxbtcReceived;
            const mainnetPrice = oxbtcPriceUSD;

            console.log("Mainnet 0xBTC Price:", mainnetPrice);
            console.log("Swap Effective Price:", swapPrice);

            const BRIDGE_BASE_FEE_USD = 0;
            const BRIDGE_GAS_COST_USD = 3;
            const totalBridgeCost = BRIDGE_BASE_FEE_USD + BRIDGE_GAS_COST_USD;

            const swapCost = totalETHSpentUSD;
            const bridgeCost = (oxbtcReceived * mainnetPrice) + totalBridgeCost;
            const potentialSavings = swapCost - bridgeCost;

            const priceDifference = ((swapPrice - mainnetPrice) / mainnetPrice * 100).toFixed(2);

            if (swapPrice > 0) {
                let comparisonHTML = `
                    <div class="price-comparison" style="margin-top: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <h4 style="margin-top: 0;">Price Comparison</h4>
                        <p><strong>Your Swap Price:</strong> $${swapPrice.toFixed(4)} per 0xBTC</p>
                        <p><strong>Mainnet Price:</strong> $${mainnetPrice.toFixed(4)} per 0xBTC</p>
                        <p><strong>Difference:</strong> <span style="color: ${priceDifference > 0 ? '#dc3545' : '#28a745'};">${priceDifference > 0 ? '+' : ''}${priceDifference}%</span></p>
                `;

                if (swapPrice > mainnetPrice * 1.05) {
                    comparisonHTML += `
                        <div style="margin-top: 10px; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107;">
                            <strong style="color: white;">Consider Bridging Instead!</strong>
                            <p style="margin: 5px 0; color: white;">You're paying <strong>${priceDifference}%</strong> more than mainnet price.</p>
                            <p style="margin: 5px 0; color: white;"><strong>Cost Breakdown:</strong></p>
                            <ul style="margin: 5px 0; padding-left: 20px; color: white;">
                                <li>Swap cost: $${swapCost.toFixed(2)}</li>
                                <li>Bridge cost: $${bridgeCost.toFixed(2)} (includes ~$${totalBridgeCost} in fees)</li>
                            </ul>
                            <p style="margin: 5px 0; color: white;"><strong>Potential savings: ~$${potentialSavings.toFixed(2)}</strong></p>
                            <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
                                <a href="https://swap.defillama.com/?chain=ethereum&from=0x0000000000000000000000000000000000000000&tab=swap&to=0xb6ed7644c69416d67b522e20bc294a9a9b405b31"
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   style="display: inline-block; padding: 8px 16px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                                    Swap 0xBTC on Mainnet
                                </a>
                                <a href="https://superbridge.app/?fromChainId=1&toChainId=8453&tokenAddress=0xb6ed7644c69416d67b522e20bc294a9a9b405b31"
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   style="display: inline-block; padding: 8px 16px; background-color: #0052FF; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                                    Bridge 0xBTC to Base
                                </a>
                            </div><br>Then simply swap your newly Bridged 0xBitcoin to B0x to get the savings!
                        </div>
                    `;
                } else if (swapPrice < mainnetPrice * 0.95) {
                    comparisonHTML += `
                        <div style="margin-top: 10px; padding: 10px; border-radius: 5px; border-left: 4px solid #17a2b8;">
                            <strong style="color: white;">Great Deal!</strong>
                            <p style="margin: 5px 0; color: white;">You're getting a <strong>${Math.abs(parseFloat(priceDifference))}%</strong> discount compared to mainnet!</p>
                        </div>
                    `;
                } else {
                    comparisonHTML += `
                        <div style="margin-top: 10px; padding: 10px; border-radius: 5px; border-left: 4px solid #28a745;">
                            <strong style="color: white;">Fair Price!</strong>
                            <p style="margin: 5px 0; color: white;">This swap offers a competitive rate. The price difference is minimal.</p>
                        </div>
                    `;
                }

                comparisonHTML += `</div>`;
                estimateDisplay.innerHTML += comparisonHTML;
            }
        } catch (error) {
            console.error("Error comparing with mainnet price:", error);
        }
    }
}

// ============================================
// SWAP ESTIMATION
// ============================================

/**
 * Gets swap output estimate for token pair
 * @async
 * @returns {Promise<void>}
 */
export async function getEstimate() {
    if (!window.walletConnected) {
        console.log("Wallet not connected");
    }else{

     await switchToBase();
    }


    disableButtonWithSpinner('executeSwapBtn', 'Getting estimate...');

    try {
        const fromSelect = document.querySelector('#swap .form-group:nth-child(4) select');
        const toSelect = document.querySelector('#swap .form-group:nth-child(7) select');
        const amountInput = document.querySelector('#swap .form-group:nth-child(5) input');

        const fromToken = fromSelect.value.trim();
        const toToken = toSelect.value.trim();
        let inputAmount = amountInput.value;

        console.log("Swap request:", fromToken, "→", toToken, "Amount:", inputAmount);

        if (inputAmount <= 0) {
            console.log("No value returning");
            return;
        }

        let amountToSwap;
        if (fromToken === "0xBTC") {
            const decimalPlaces = (inputAmount.split('.')[1] || '').length;
            if (decimalPlaces > 8) {
                const parts = inputAmount.split('.');
                inputAmount = parts[0] + '.' + parts[1].substring(0, 8);
                amountInput.value = inputAmount;
                console.log(`Truncated 0xBTC to 8 decimals: ${inputAmount}`);
            }
            amountToSwap = ethers.utils.parseUnits(inputAmount, 8);
        } else {
            amountToSwap = ethers.utils.parseUnits(inputAmount, 18);
        }

        if (amountToSwap.eq(0)) {
            console.log("Amount is zero");
            enableButton('executeSwapBtn', 'Execute Swap');
            return;
        }

        const allRoutes = getAllPossibleRoutes(fromToken, toToken);

        let bestEstimate;

        if (!allRoutes || allRoutes.length === 0) {
            throw new Error(`No routes available for ${fromToken} → ${toToken}`);
        }

        if (allRoutes.length === 1) {
            console.log("Single route available:", allRoutes[0].name);
            const estimate = await getSingleRouteEstimate(
                allRoutes[0],
                amountToSwap,
                fromToken,
                toToken
            );

            bestEstimate = {
                type: 'single',
                output: estimate.output,
                totalOutput: estimate.output,
                route: allRoutes[0],
                routes: [allRoutes[0]],
                amounts: [amountToSwap],
                splits: [100]
            };

            window.lastEstimateType = 'single';
            window.lastSingleRoute = allRoutes[0];
        } else {
            console.log(`${allRoutes.length} routes available - optimizing with COMBINED MULTICALL...`);

            // Use combined multicall to get all estimates at once
            const { singleRouteEstimates, multiRouteResult } = await getCombinedRouteEstimates(
                allRoutes,
                amountToSwap,
                fromToken,
                toToken
            );

            let bestSingleRoute = null;
            let bestSingleOutput = ethers.BigNumber.from(0);
            for (let i = 0; i < allRoutes.length; i++) {
                if (singleRouteEstimates[i] && singleRouteEstimates[i].output.gt(bestSingleOutput)) {
                    bestSingleOutput = singleRouteEstimates[i].output;
                    bestSingleRoute = allRoutes[i];
                }
            }

            console.log("Best single route:", bestSingleRoute?.name);
            console.log("Best single output:", bestSingleOutput.toString());
            if (multiRouteResult) {
                console.log("Multi-route result output:", multiRouteResult.totalOutput.toString());
            }

            if (multiRouteResult && multiRouteResult.totalOutput.gt(bestSingleOutput)) {
                const improvement = multiRouteResult.totalOutput.sub(bestSingleOutput)
                    .mul(10000).div(bestSingleOutput).toNumber() / 100;

                if (improvement >= 0.1) {
                    console.log(`Multi-route is ${improvement.toFixed(2)}% better`);
                    bestEstimate = {
                        type: 'multi',
                        output: multiRouteResult.totalOutput,
                        totalOutput: multiRouteResult.totalOutput,
                        routes: multiRouteResult.routes,
                        splits: multiRouteResult.splits,
                        amounts: multiRouteResult.amounts,
                        outputs: multiRouteResult.outputs,
                        improvement: improvement
                    };
                    window.lastEstimateType = 'multi';
                    window.lastMultiRouteResult = multiRouteResult;
                } else {
                    console.log(`Single route is better (improvement only ${improvement.toFixed(2)}%)`);
                    bestEstimate = {
                        type: 'single',
                        output: bestSingleOutput,
                        totalOutput: bestSingleOutput,
                        route: bestSingleRoute,
                        routes: [bestSingleRoute],
                        amounts: [amountToSwap],
                        splits: [100]
                    };
                    window.lastEstimateType = 'single';
                    window.lastSingleRoute = bestSingleRoute;
                }
            } else {
                console.log("Using single route (multi-route failed or worse)");
                bestEstimate = {
                    type: 'single',
                    output: bestSingleOutput,
                    totalOutput: bestSingleOutput,
                    route: bestSingleRoute,
                    routes: [bestSingleRoute],
                    amounts: [amountToSwap],
                    splits: [100]
                };
                window.lastEstimateType = 'single';
                window.lastSingleRoute = bestSingleRoute;
            }
        }

        window.lastEstimate = bestEstimate;
        window.lastFromToken = fromToken;
        window.lastToToken = toToken;
        window.lastAmountIn = amountToSwap;

        await updateEstimateDisplay(fromToken, toToken, bestEstimate, amountToSwap);

    } catch (error) {
        console.error("Estimate failed:", error);
        showErrorDisplay(error.message);
    } finally {
        enableButton('executeSwapBtn', 'Execute Swap');
        updateWidget();
    }
}

// ============================================
// SWAP EXECUTION
// ============================================

/**
 * Executes a token swap
 * @async
 * @returns {Promise<void>}
 */
export async function getSwapOfTwoTokens() {
    if (!window.walletConnected) await window.connectWallet();

    const fromSelect = document.querySelector('#swap .form-group:nth-child(4) select');
    const amountInput = document.querySelector('#swap .form-group:nth-child(5) input');
    const toSelect = document.querySelector('#swap .form-group:nth-child(7) select');

    const fromToken = fromSelect.value.trim();
    const toToken = toSelect.value.trim();
    const amount = amountInput.value;

    const selectSlippage = document.getElementById('slippageToleranceSwap');
    const decimalValueSlippage = parseFloat(selectSlippage.value.replace('%', '')) / 100;

    // Validate estimate
    if (!window.lastEstimate ||
        window.lastFromToken !== fromToken ||
        window.lastToToken !== toToken ||
        window.lastAmountIn?.toString() !== (fromToken === "0xBTC" ?
            ethers.utils.parseUnits(amount, 8) :
            ethers.utils.parseUnits(amount, 18)).toString()) {

        console.warn("No valid estimate found - getting fresh estimate");
        await getEstimate();

        if (!window.lastEstimate) {
            alert("Failed to get swap estimate");
            return;
        }
    }

    await executeSwapFromEstimate(fromToken, toToken, decimalValueSlippage);
}

/**
 * Executes swap from pre-calculated estimate
 * @async
 * @param {string} fromToken - Source token
 * @param {string} toToken - Destination token
 * @param {string} decimalValueSlippage - Slippage tolerance
 * @returns {Promise<void>}
 */
export async function executeSwapFromEstimate(fromToken, toToken, decimalValueSlippage) {
    const estimate = window.lastEstimate;
    const amountToSwap = window.lastAmountIn;

    const swapperABI = [
        {
            "inputs": [
                {"name": "tokenZeroxBTC", "type": "address"},
                {"name": "tokenBZeroX", "type": "address"},
                {"name": "tokenIn", "type": "address"},
                {"name": "hookAddress", "type": "address"},
                {"name": "amountIn", "type": "uint128"}
            ],
            "name": "getOutput",
            "outputs": [{"name": "amountOut", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "pool1TokenA", "type": "address"},
                {"name": "pool1TokenB", "type": "address"},
                {"name": "pool2TokenA", "type": "address"},
                {"name": "pool2TokenB", "type": "address"},
                {"name": "tokenIn", "type": "address"},
                {"name": "tokenOut", "type": "address"},
                {"name": "hook1Address", "type": "address"},
                {"name": "hook2Address", "type": "address"},
                {"name": "amountIn", "type": "uint128"}
            ],
            "name": "getOutputMultiHop",
            "outputs": [{"name": "amountOut", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "routes", "type": "tuple[]", "components": [
                    {"name": "isSingleHop", "type": "bool"},
                    {"name": "pool1TokenA", "type": "address"},
                    {"name": "pool1TokenB", "type": "address"},
                    {"name": "pool2TokenA", "type": "address"},
                    {"name": "pool2TokenB", "type": "address"},
                    {"name": "hookAddress", "type": "address"},
                    {"name": "hook2Address", "type": "address"}
                ]},
                {"name": "amounts", "type": "uint256[]"},
                {"name": "tokenIn", "type": "address"},
                {"name": "tokenOut", "type": "address"},
                {"name": "minTotalAmountOut", "type": "uint256"},
                {"name": "recipient", "type": "address"}
            ],
            "name": "executeMultiRouteSwap",
            "outputs": [{"name": "totalAmountOut", "type": "uint256"}],
            "stateMutability": "payable",
            "type": "function"
        }
    ];

    const swapperContract = new ethers.Contract(contractAddress_Swapper, swapperABI, window.signer);

    let optimizationResult;

    if (estimate.type === 'single') {
        optimizationResult = {
            routes: [estimate.route],
            splits: [100],
            amounts: [amountToSwap],
            totalOutput: estimate.output
        };
    } else if (estimate.type === 'multi') {
        optimizationResult = {
            routes: estimate.routes,
            splits: estimate.splits,
            amounts: estimate.amounts,
            outputs: estimate.outputs,
            totalOutput: estimate.totalOutput
        };
    }

    const minTotalOut = optimizationResult.totalOutput
        .mul(Math.floor((1 - decimalValueSlippage) * 10000))
        .div(10000);

    const tokenInAddress = tokenAddresses[fromToken];
    const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

    if (tokenInAddress !== ETH_ADDRESS) {
        await approveIfNeeded(tokenInAddress, contractAddress_Swapper, amountToSwap);
    }

    const formattedRoutes = optimizationResult.routes.map(route => {
        const pool1TokenA = route.pool1TokenA || route.tokenA;
        const pool1TokenB = route.pool1TokenB || route.tokenB;
        const pool2TokenA = route.pool2TokenA || route.tokenC || ethers.constants.AddressZero;
        const pool2TokenB = route.pool2TokenB || route.tokenD || ethers.constants.AddressZero;

        const isActuallySingleHop = pool2TokenA === ethers.constants.AddressZero &&
                                    pool2TokenB === ethers.constants.AddressZero;

        return {
            isSingleHop: isActuallySingleHop,
            pool1TokenA,
            pool1TokenB,
            pool2TokenA,
            pool2TokenB,
            hookAddress: route.hookAddress,
            hook2Address: route.hookAddress2 || route.hook2Address || ethers.constants.AddressZero
        };
    });

    console.log("TIS IS IT:  formattedRoutes: ", formattedRoutes);
    console.log("TIS IS IT:  tokenInAddress: ", tokenInAddress);
    console.log("TIS IS IT:  tokenAddresses[toToken]: ", tokenAddresses[toToken]);
    console.log("TIS IS IT:  minTotalOut: ", minTotalOut);
    console.log("TIS IS IT:  userAddress: ", window.userAddress);

    const tx = await swapperContract.executeMultiRouteSwap(
        formattedRoutes,
        optimizationResult.amounts.map(amt => amt.toString()),
        tokenInAddress,
        tokenAddresses[toToken],
        minTotalOut,
        window.userAddress,
        {
            value: tokenInAddress === ETH_ADDRESS ? amountToSwap : 0,
            gasLimit: 1000000
        }
    );

    showInfoNotification();
    await tx.wait();
    showSuccessNotification('Swap Complete!', 'Transaction complete!', tx.hash);

    await new Promise(resolve => setTimeout(resolve, 3000));
    await throttledGetSqrtRtAndPriceRatio("SwapFunction");
    fetchBalances();
}

/**
 * Executes optimized multi-route swap
 * @async
 * @param {string} fromToken - Source token
 * @param {string} toToken - Destination token
 * @param {string} amountStr - Amount to swap
 * @param {string} decimalValueSlippage - Slippage tolerance
 * @returns {Promise<void>}
 */
export async function executeOptimizedMultiRouteSwap(fromToken, toToken, amountStr, decimalValueSlippage) {
    console.log(`Swap request: ${fromToken} → ${toToken} Amount: ${amountStr}`);

    let amountToSwap = ethers.utils.parseUnits(amountStr, 18);
    if (fromToken === "0xBTC") {
        amountToSwap = ethers.utils.parseUnits(amountStr, 8);
    }

    const routes = await findAllRoutes(fromToken, toToken);
    console.log(`${routes.length} routes available - optimizing...`);

    if (routes.length === 0) {
        alert("No routes found!");
        return;
    }

    const multicallABI = [
        {
            "inputs": [{"components": [{"name": "target", "type": "address"}, {"name": "allowFailure", "type": "bool"}, {"name": "callData", "type": "bytes"}], "name": "calls", "type": "tuple[]"}],
            "name": "aggregate3",
            "outputs": [{"components": [{"name": "success", "type": "bool"}, {"name": "returnData", "type": "bytes"}], "type": "tuple[]"}],
            "stateMutability": "payable",
            "type": "function"
        }
    ];

    const swapperABI = SPLIT_ROUTE_ABI;

    var MULTICALL_ADDRESSz = "0xcA11bde05977b3631167028862bE2a173976CA11";
    const multicallContract = new ethers.Contract(MULTICALL_ADDRESSz, multicallABI, window.provider);
    const contractInterface = new ethers.utils.Interface(swapperABI);
    const swapperContract = new ethers.Contract(contractAddress_Swapper, swapperABI, window.signer);

    let optimizationResult;

    if (routes.length === 1) {
        optimizationResult = {
            routes: routes,
            splits: [100],
            amounts: [amountToSwap],
            totalOutput: await getSingleRouteOutput(routes[0], amountToSwap, contractInterface, fromToken, toToken)
        };
    } else if (routes.length === 2) {
        console.log("ROUTES TEST: ", routes);
        optimizationResult = await optimizeTwoRoutes(
            routes,
            amountToSwap,
            contractInterface,
            multicallContract,
            fromToken,
            toToken
        );
    } else {
        optimizationResult = await optimizeMultiRoutesBatch(
            routes,
            amountToSwap,
            contractInterface,
            multicallContract,
            fromToken,
            toToken,
            500,
            100
        );
    }

    if (!optimizationResult) {
        alert("Optimization failed!");
        return;
    }

    console.log("22222Optimization result:", optimizationResult);

    const totalAmounts = optimizationResult.amounts.reduce(
        (sum, amt) => sum.add(amt),
        ethers.BigNumber.from(0)
    );

    console.log("22222amountToSwap:", amountToSwap.toString());
    console.log("2222Sum of amounts:", totalAmounts.toString());
    console.log("2222Amounts match?", totalAmounts.eq(amountToSwap));

    if (!totalAmounts.eq(amountToSwap)) {
        console.error("2222❌ AMOUNTS DON'T MATCH!");
        console.error("2222Difference:", amountToSwap.sub(totalAmounts).toString());
    }

    const minTotalOut = optimizationResult.totalOutput
        .mul(Math.floor((1 - decimalValueSlippage) * 10000))
        .div(10000);

    document.getElementById("estOutput").value = minTotalOut;

    let readableAmountIn = ethers.utils.formatEther(amountToSwap);
    let readableAmountOut = ethers.utils.formatEther(optimizationResult.totalOutput);

    if (fromToken === "0xBTC") readableAmountIn = ethers.utils.formatUnits(amountToSwap, 8);
    if (toToken === "0xBTC") readableAmountOut = ethers.utils.formatUnits(optimizationResult.totalOutput, 8);

    const routeInfo = optimizationResult.splits.map((split, i) =>
        `Route ${i + 1}: ${split.toFixed(2)}%`
    ).join(", ");

    alert(`Multi-route swap: ${readableAmountIn} ${fromToken} → ${readableAmountOut} ${toToken}\n${routeInfo}`);

    const tokenInAddress = tokenAddresses[fromToken];
    const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

    if (tokenInAddress !== ETH_ADDRESS) {
        await approveIfNeeded(tokenInAddress, contractAddress_Swapper, amountToSwap);
    }

    try {
        const formattedRoutes = optimizationResult.routes.map(route => ({
            isSingleHop: route.isSingleHop,
            pool1TokenA: route.pool1TokenA || route.isSingleHop ? route.pool1TokenA : route.pool1TokenA,
            pool1TokenB: route.pool1TokenB || route.isSingleHop ? route.pool1TokenB : route.pool1TokenB,
            pool2TokenA: route.pool2TokenA || ethers.constants.AddressZero,
            pool2TokenB: route.pool2TokenB || ethers.constants.AddressZero,
            hookAddress: route.hookAddress || route.hook1Address,
            hook2Address: route.hook2Address ?? ethers.constants.AddressZero
        }));

        console.log("12121212FormmatedRoutes: ", formattedRoutes);
        console.log("12121212optimizationResult.amounts: ", optimizationResult.amounts);
        console.log("12121212tokenInAddress: ", tokenInAddress);
        console.log("12121212tokenAddresses[toToken]: ", tokenAddresses[toToken]);
        console.log("12121212minTotalOut: : ", minTotalOut.toString());
        console.log("12121212userAddress: ", window.userAddress);
        console.log("12121212Value amountToSwap: ", amountToSwap.toString());

        const tx = await swapperContract.executeMultiRouteSwap(
            formattedRoutes,
            optimizationResult.amounts.map(amt => amt.toString()),
            tokenInAddress,
            tokenAddresses[toToken],
            minTotalOut,
            window.userAddress,
            {
                value: tokenInAddress === ETH_ADDRESS ? amountToSwap : 0,
                gasLimit: 1000000
            }
        );

        showInfoNotification();
        console.log("Multi-route swap transaction sent:", tx.hash);
        await tx.wait();
        console.log("Transaction confirmed!");
        showSuccessNotification('Multi-Route Swap Complete!', 'Transaction complete!', tx.hash);

        await new Promise(resolve => setTimeout(resolve, 3000));
        await throttledGetSqrtRtAndPriceRatio("SwapFunction");
        fetchBalances();

    } catch (error) {
        console.error("Multi-route swap error:", error);
        alert("Swap failed: " + error.message);
    }
}

// ============================================================================
// AMOUNT INPUT DEBOUNCE HANDLER
// ============================================================================

let debounceTimerSwap;

/**
 * Handle amount input changes with debouncing
 * Triggers getEstimate after 1 second of no input
 */
function handleAmountChange() {
    const amount = parseFloat(this.value) || 0;
    console.log("Amount changed:", amount);

    // Clear the previous timer
    clearTimeout(debounceTimerSwap);

    // Only call getEstimate if amount > 0
    if (amount > 0) {
        // Set a new timer for 1 second delay
        debounceTimerSwap = setTimeout(() => {
            getEstimate();
        }, 1000); // 1000ms = 1 second delay
    }
}

/**
 * Handle token select change - refetch estimate when token changes
 * Uses shared debounce timer so if both fromToken and toToken change together,
 * only one getEstimate call is made
 */
function handleTokenChange() {
    const amountInput = document.querySelector('#swap .form-group:nth-child(5) input');
    const amount = parseFloat(amountInput?.value) || 0;
    console.log("Token changed, amount:", amount);

    // Clear the previous timer (shared with amount changes)
    clearTimeout(debounceTimerSwap);

    // Only call getEstimate if amount > 0
    if (amount > 0) {
        // 1 second delay ensures if both tokens change together, only one call is made
        debounceTimerSwap = setTimeout(() => {
            getEstimate();
        }, 1000);
    }
}

/**
 * Initialize amount input and token select event listeners when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Swaps.js: Setting up swap input event listeners...');

    const amountInput = document.querySelector('#swap .form-group:nth-child(5) input');
    const fromSelect = document.querySelector('#swap .form-group:nth-child(4) select');
    const toSelect = document.querySelector('#swap .form-group:nth-child(7) select');

    if (amountInput) {
        console.log('Swaps.js: Amount input found, attaching listeners');
        // Listen for both input and change events
        amountInput.addEventListener('input', handleAmountChange);
        amountInput.addEventListener('change', handleAmountChange);
    } else {
        console.error('Swaps.js: Amount input not found with selector: #swap .form-group:nth-child(5) input');
    }

    if (fromSelect) {
        console.log('Swaps.js: From token select found, attaching listener');
        fromSelect.addEventListener('change', handleTokenChange);
    } else {
        console.error('Swaps.js: From token select not found');
    }

    if (toSelect) {
        console.log('Swaps.js: To token select found, attaching listener');
        toSelect.addEventListener('change', handleTokenChange);
    } else {
        console.error('Swaps.js: To token select not found');
    }
});

console.log('Swaps module initialized');
