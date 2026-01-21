// ============================================================================
// SWAP FUNCTIONS - Complete implementations from script.js
// ============================================================================

// Retry utility function with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000, maxDelay = 10000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on final attempt
            if (attempt === maxRetries) {
                break;
            }

            // Calculate exponential backoff with jitter
            const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
            const delay = exponentialDelay + jitter;

            console.log(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`, error.message);

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // All retries failed
    console.error(`All ${maxRetries + 1} attempts failed:`, lastError);
    throw lastError;
}

// Calculate effective price per 0xBTC from swap
function calculateEffectivePrice(amountIn, amountOut, fromToken, toToken, ethPrice) {
    let pricePerOxBTC = 0;

    if (fromToken === "0xBTC") {
        // Selling 0xBTC
        const amountInFormatted = parseFloat(ethers.utils.formatUnits(amountIn, 8));
        const amountOutFormatted = parseFloat(ethers.utils.formatEther(amountOut));

        if (toToken === "ETH") {
            // 0xBTC -> ETH
            const ethPerOxBTC = amountOutFormatted / amountInFormatted;
            pricePerOxBTC = ethPerOxBTC * ethPrice;
        } else if (toToken === "B0x") {
            // 0xBTC -> B0x
            const b0xPerOxBTC = amountOutFormatted / amountInFormatted;
            pricePerOxBTC = b0xPerOxBTC * usdCostB0x;
        }
    } else if (toToken === "0xBTC") {
        // Buying 0xBTC
        const amountInFormatted = parseFloat(ethers.utils.formatEther(amountIn));
        const amountOutFormatted = parseFloat(ethers.utils.formatUnits(amountOut, 8));

        if (fromToken === "ETH") {
            // ETH -> 0xBTC
            const ethPerOxBTC = amountInFormatted / amountOutFormatted;
            pricePerOxBTC = ethPerOxBTC * ethPrice;
        } else if (fromToken === "B0x") {
            // B0x -> 0xBTC
            const b0xPerOxBTC = amountInFormatted / amountOutFormatted;
            pricePerOxBTC = b0xPerOxBTC * usdCostB0x;
        }
    }

    return pricePerOxBTC;
}

// Extract amount from contract result
function extractAmountFromResult(result) {
    console.log("Raw result type:", typeof result);
    console.log("Raw result structure:", Object.keys(result).join(", "));

    if (typeof result === 'bigint' || typeof result === 'number') {
        return result;
    } else if (result._isBigNumber || result instanceof ethers.BigNumber) {
        return result;
    } else if (typeof result === 'object' && result !== null) {
        if (typeof result.toString === 'function' && result.toString().match(/^[0-9]+$/)) {
            return result;
        } else {
            return result[0] || result.amountOut || result._hex || result.value || result;
        }
    }
    return result;
}

// Get single hop swap estimate
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

    // This function will be wrapped by retryWithBackoff, so just throw on error
    const result = await tokenSwapperContract.callStatic.getOutput(
        tokenOutputAddress,
        tokenInputAddress,
        tokenInputAddress,
        HookAddress,
        amountToSwap
    );

    return extractAmountFromResult(result);
}

// Get multi-hop swap estimate
async function getMultiHopEstimate(fromToken, toToken, tokenInputAddress, tokenOutputAddress, amountToSwap) {
    const multiHopABI = [
        {
            "inputs": [
                { "name": "pool1TokenA", "type": "address" },
                { "name": "pool1TokenB", "type": "address" },
                { "name": "pool2TokenA", "type": "address" },
                { "name": "pool2TokenB", "type": "address" },
                { "name": "tokenIn", "type": "address" },
                { "name": "tokenOut", "type": "address" },
                { "name": "hook1Address", "type": "address" },
                { "name": "hook2Address", "type": "address" },
                { "name": "amountIn", "type": "uint128" }
            ],
            "name": "getOutputMultiHop",
            "outputs": [{ "name": "amountOut", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    console.log("Custom RPC4: ", customRPC);
    const provider_zzzzz12 = new ethers.providers.JsonRpcProvider(customRPC);

    const tokenSwapperContract = new ethers.Contract(
        contractAddress_Swapper,
        multiHopABI,
        provider_zzzzz12
    );

    // Define addresses
    const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
    const OXBTC_ADDRESS = Address_ZEROXBTC_TESTNETCONTRACT;
    const B0X_ADDRESS = tokenAddress;

    // Determine pool configuration based on swap direction
    let pool1TokenA, pool1TokenB, pool2TokenA, pool2TokenB;
    let hook1Address = hookAddress;
    let hook2Address = hookAddress;

    if (fromToken === "B0x" && toToken === "ETH") {
        // B0x -> 0xBTC -> ETH
        pool1TokenA = B0X_ADDRESS;
        pool1TokenB = OXBTC_ADDRESS;
        pool2TokenA = OXBTC_ADDRESS;
        pool2TokenB = ETH_ADDRESS;
    } else if (fromToken === "ETH" && toToken === "B0x") {
        // ETH -> 0xBTC -> B0x
        pool1TokenA = ETH_ADDRESS;
        pool1TokenB = OXBTC_ADDRESS;
        pool2TokenA = OXBTC_ADDRESS;
        pool2TokenB = B0X_ADDRESS;
    } else if (fromToken === "0xBTC" && toToken === "ETH") {
        // 0xBTC -> ETH (direct)
        return await retryWithBackoff(() =>
            getSingleHopEstimate(tokenInputAddress, tokenOutputAddress, amountToSwap)
        );
    } else if (fromToken === "ETH" && toToken === "0xBTC") {
        // ETH -> 0xBTC (direct)
        return await retryWithBackoff(() =>
            getSingleHopEstimate(tokenInputAddress, tokenOutputAddress, amountToSwap)
        );
    } else {
        console.error("Unsupported multi-hop configuration for estimate");
        throw new Error("Unsupported multi-hop configuration");
    }

    console.log("Getting multi-hop estimate with params:");
    console.log("Pool1TokenA:", pool1TokenA);
    console.log("Pool1TokenB:", pool1TokenB);
    console.log("Pool2TokenA:", pool2TokenA);
    console.log("Pool2TokenB:", pool2TokenB);
    console.log("TokenIn:", tokenInputAddress);
    console.log("TokenOut:", tokenOutputAddress);
    console.log("AmountIn:", amountToSwap.toString());

    // This function will be wrapped by retryWithBackoff, so just throw on error
    const result = await tokenSwapperContract.callStatic.getOutputMultiHop(
        pool1TokenA,
        pool1TokenB,
        pool2TokenA,
        pool2TokenB,
        tokenInputAddress,
        tokenOutputAddress,
        hook1Address,
        hook2Address,
        amountToSwap
    );

    console.log("Multi-hop estimate result:", result.toString());
    return extractAmountFromResult(result);
}

// Enhanced estimate function with bridge comparison
async function getEstimateWithBridgeComparison() {
    if (!walletConnected) {
        await connectWallet();
    }

    const fromSelect = document.querySelector('#swap .form-group:nth-child(4) select');
    const toSelect = document.querySelector('#swap .form-group:nth-child(7) select');
    const amountInput = document.querySelector('#swap .form-group:nth-child(5) input');

    const selectedValue = fromSelect.value;
    const toSelectValue = toSelect.value;
    const selectedValue2 = amountInput.value;

    console.log("From token:", selectedValue);
    console.log("To token:", toSelectValue);

    var tokenInputAddress = tokenAddresses[selectedValue];
    var tokenOutputAddress = tokenAddresses[toSelectValue];

    var amountToSwap = ethers.utils.parseUnits(selectedValue2, 18);
    if (amountToSwap == 0) {
        console.log("AmountToSwap 0 returning");
        return;
    }

    // Handle 0xBTC decimal precision
    if (selectedValue == "0xBTC") {
        const numericValue = parseFloat(selectedValue2);
        const decimalPlaces = (selectedValue2.split('.')[1] || '').length;

        let valueToUse;
        if (decimalPlaces > 8) {
            const parts = selectedValue2.split('.');
            valueToUse = parts[0] + '.' + parts[1].substring(0, 8);
            console.log(`Truncated from ${decimalPlaces} to 8 decimal places: ${valueToUse}`);
        } else {
            valueToUse = selectedValue2;
        }
        amountToSwap = ethers.utils.parseUnits(valueToUse, 8);
        amountInput.value = ethers.utils.formatUnits(amountToSwap, 8);
    }

    // Check if this involves 0xBTC
    const involves0xBTC = selectedValue === "0xBTC" || toSelectValue === "0xBTC";

    // Check if multi-hop
    const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
    const isMultiHop = (tokenInputAddress === ETH_ADDRESS && tokenOutputAddress == tokenAddresses["B0x"]) ||
                       (tokenOutputAddress === ETH_ADDRESS && tokenInputAddress == tokenAddresses["B0x"]);

    let amountOut = 0;

    try {
        if (isMultiHop) {
            amountOut = await retryWithBackoff(() =>
                getMultiHopEstimate(
                    selectedValue,
                    toSelectValue,
                    tokenInputAddress,
                    tokenOutputAddress,
                    amountToSwap
                )
            );
        } else {
            amountOut = await retryWithBackoff(() =>
                getSingleHopEstimate(tokenInputAddress, tokenOutputAddress, amountToSwap)
            );
        }

        // Update the display with bridge comparison
        await updateEstimateDisplayWithBridgeInfo(
            selectedValue,
            toSelectValue,
            amountOut,
            amountToSwap,
            involves0xBTC
        );
    } catch (error) {
        console.error("Failed to get estimate with bridge comparison after retries:", error);
        throw error;
    }
}

// Enhanced display update with bridge comparison using your existing oxbtcPriceUSD
async function updateEstimateDisplayWithBridgeInfo(fromToken, toToken, amountOut, amountIn, involves0xBTC) {
    if(!walletConnected){
       await GetRewardAPY();
    }
    // Trim both tokens to remove any whitespace
    fromToken = fromToken.trim();
    toToken = toToken.trim();

    // Format amounts for display
    let readableAmountOut, readableAmountIn;

    if (fromToken === "0xBTC") {
        readableAmountIn = ethers.utils.formatUnits(amountIn, 8);
    } else {
        readableAmountIn = ethers.utils.formatEther(amountIn);
    }

    if (toToken === "0xBTC") {
        readableAmountOut = ethers.utils.formatUnits(amountOut, 8);
    } else {
        readableAmountOut = ethers.utils.formatEther(amountOut);
    }

    // Display basic estimate
    const estimateDisplay = document.getElementById('estimateDisplay');
    if (estimateDisplay) {
        estimateDisplay.innerHTML = `
            <div class="estimate-result">
                <p>You'll receive approximately: <strong>${readableAmountOut} ${toToken}</strong></p>
            </div>
        `;
    }

    // Only do bridge comparison for multi-hop swaps that go through 0xBTC
    console.log("FROM TOKEN: ", fromToken);
    console.log("TO TOKEN: ", toToken);
    const isETHtoB0xVia0xBTC = (fromToken === "ETH" && toToken === "B0x");
    console.log("isETHtoB0xVia0xBTC", isETHtoB0xVia0xBTC);
    if (isETHtoB0xVia0xBTC && oxbtcPriceUSD && oxbtcPriceUSD > 0) {
        try {
            // Get current ETH price
            const ethPrice = wethPriceUSD || 3000; // Fallback price

            // For multi-hop ETH -> 0xBTC -> B0x, we need the actual intermediate 0xBTC amount
            const OXBTC_ADDRESS = tokenAddresses["0xBTC"];
            const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

            // Wrap the getSingleHopEstimate call with retry logic
            const intermediate0xBTCAmount = await retryWithBackoff(() =>
                getSingleHopEstimate(ETH_ADDRESS, OXBTC_ADDRESS, amountIn)
            );
            const oxbtcReceived = parseFloat(ethers.utils.formatUnits(intermediate0xBTCAmount, 8));

            console.log("ETH input:", amountIn.toString());
            console.log("Intermediate 0xBTC amount (with fees/slippage):", oxbtcReceived);
            console.log("Final B0x output:", readableAmountOut);

            // Calculate effective 0xBTC price
            const ethSpent = parseFloat(readableAmountIn);
            const totalETHSpentUSD = ethSpent * ethPrice;
            const swapPrice = totalETHSpentUSD / oxbtcReceived;

            const mainnetPrice = oxbtcPriceUSD;

            console.log("ETH spent:", ethSpent);
            console.log("ETH price:", ethPrice);
            console.log("Total USD spent:", totalETHSpentUSD);
            console.log("Mainnet 0xBTC Price (from oxbtcPriceUSD):", mainnetPrice);
            console.log("Swap Effective Price:", swapPrice);

            // Estimate bridge costs
            const BRIDGE_BASE_FEE_USD = 0;
            const BRIDGE_GAS_COST_USD = 3;
            const totalBridgeCost = BRIDGE_BASE_FEE_USD + BRIDGE_GAS_COST_USD;

            const amount0xBTC = oxbtcReceived;

            // Calculate total cost difference
            const swapCost = totalETHSpentUSD;
            const bridgeCost = (amount0xBTC * mainnetPrice) + totalBridgeCost;
            const potentialSavings = swapCost - bridgeCost;

            // Calculate price difference percentage
            const priceDifference = ((swapPrice - mainnetPrice) / mainnetPrice * 100).toFixed(2);

            // Show comparison
            if (estimateDisplay && swapPrice > 0) {
                let comparisonHTML = `
                    <div class="price-comparison" style="margin-top: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; ">
                        <h4 style="margin-top: 0;">💡 Price Comparison</h4>
                        <p><strong>Your Swap Price:</strong> $${swapPrice.toFixed(4)} per 0xBTC</p>
                        <p><strong>Mainnet Price:</strong> $${mainnetPrice.toFixed(4)} per 0xBTC</p>
                        <p><strong>Difference:</strong> <span style="color: ${priceDifference > 0 ? '#dc3545' : '#28a745'};">${priceDifference > 0 ? '+' : ''}${priceDifference}%</span></p>
                `;

                // Show recommendation if price difference is significant (>5%)
                if (swapPrice > mainnetPrice * 1.05) {
                    comparisonHTML += `
                        <div style="margin-top: 10px; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107;">
                            <strong style="color: white;">⚠️ Consider Bridging Instead!</strong>
                            <p style="margin: 5px 0; color: white;">You're paying <strong>${priceDifference}%</strong> more than mainnet price.</p>
                            <p style="margin: 5px 0; color: white;"><strong>Cost Breakdown:</strong></p>
                            <ul style="margin: 5px 0; padding-left: 20px; color: white;">
                                <li>Swap cost: ${swapCost.toFixed(2)}</li>
                                <li>Bridge cost: ${bridgeCost.toFixed(2)} (includes ~${totalBridgeCost} in fees)</li>
                            </ul>
                            <p style="margin: 5px 0; color: white;"><strong>Potential savings: ~${potentialSavings.toFixed(2)}</strong></p>
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
                            </div><br>Then simply swap your newly Bridged 0xBitcoin -> B0x to get the savings!
                        </div>
                    `;
                } else if (swapPrice < mainnetPrice * 0.95) {
                    comparisonHTML += `
                        <div style="margin-top: 10px; padding: 10px;  border-radius: 5px; border-left: 4px solid #17a2b8;">
                            <strong style="color: white;">💰 Great Deal!</strong>
                            <p style="margin: 5px 0; color: white;">You're getting a <strong>${Math.abs(parseFloat(priceDifference))}%</strong> discount compared to mainnet!</p>
                        </div>
                    `;
                } else {
                    comparisonHTML += `
                        <div style="margin-top: 10px; padding: 10px;  border-radius: 5px; border-left: 4px solid #28a745;">
                            <strong style="color: white;">✅ Fair Price!</strong>
                            <p style="margin: 5px 0; color: white;">This swap offers a competitive rate. The price difference is minimal.</p>
                        </div>
                    `;
                }

                comparisonHTML += `</div>`;
                estimateDisplay.innerHTML += comparisonHTML;
            }
        } catch (error) {
            console.error("Error comparing with mainnet price (all retries failed):", error);
            // Silently fail - don't break the UI
        }
    } else {
        console.log("Not able to get Swapprice > 0")
    }
}

// ============================================================================
// EVENT LISTENERS AND DEBOUNCE HANDLING
// ============================================================================

let debounceTimerSwap;

// Function to handle amount changes
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

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Swaps.js: Setting up amount input event listeners...');

    const amountInput = document.querySelector('#swap .form-group:nth-child(5) input');

    if (amountInput) {
        console.log('Swaps.js: Amount input found, attaching listeners');
        // Listen for both input and change events
        amountInput.addEventListener('input', handleAmountChange);
        amountInput.addEventListener('change', handleAmountChange);
    } else {
        console.error('Swaps.js: Amount input not found with selector: #swap .form-group:nth-child(5) input');
    }
});
