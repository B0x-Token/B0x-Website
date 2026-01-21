/**
 * @module positions-ratio
 * @description Position ratio calculations for create, increase, and stake operations
 *
 * Handles:
 * - Token ratio calculations for creating positions
 * - Token ratio calculations for increasing liquidity
 * - Token ratio calculations for stake increase operations
 * - Optimal amount calculations with wallet balance checks
 * - Token A and Token B priority calculations
 */

// Import dependencies
import { tokenAddresses, hookAddress, contractAddress_Swapper } from './config.js';
import { connectWallet } from './wallet.js';
import { positionData, stakingPositionData, updateTotalLiqIncrease, getTokenIDsOwnedByMetamask, loadPositionsIntoDappSelections } from './positions.js';
import { updateTotalLiqIncreaseSTAKING } from './staking.js';
import { customRPC } from './settings.js';
import { getEstimate } from './swaps.js';
import { showSuccessNotification, showInfoNotification } from './ui.js';
import { fetchBalances } from './utils.js';
// Note: Using window.checkAdminAccess instead of direct import to avoid circular dependency

// Create aliases for commonly used addresses
const Address_ZEROXBTC_TESTNETCONTRACT = tokenAddresses['0xBTC'];
const HookAddress = hookAddress;
const tokenAddress = tokenAddresses['B0x'];

// ============================================
// GLOBAL STATE ACCESS
// ============================================

// These need to be accessed from window object since they're set globally
const getWalletConnected = () => window.walletConnected;
const getWalletBalances = () => window.walletBalances || {};
const getRatioz = () => window.ratioz;
const getCurrentSqrtPricex96 = () => window.Current_getsqrtPricex96;

// ============================================
// THROTTLING STATE
// ============================================

let lastCallTime = 0;
const THROTTLE_DELAY = 2000; // 2 seconds
let isProgrammaticUpdate = false;
let ratiozToSave = 0;

// ============================================
// PRICE RATIO STATE
// ============================================

// Helper function to create BigNumber from number or string
const toBigNumber = (value) => {
    if (typeof value === 'bigint') return value;
    if (ethers.BigNumber.isBigNumber(value)) return value;
    return ethers.BigNumber.from(value.toString());
};

// Global state for price ratios
export let ratioz = toBigNumber(0);
export let Current_getsqrtPricex96 = toBigNumber(0);
export let readableAmountOut = '0';
export let ratioAsWei = ethers.BigNumber.from(0);
let firstRun = false;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetches price ratio and sqrt price data using multicall
 * Updates global ratioz and Current_getsqrtPricex96 values
 * Triggers updates to estimate and ratio functions if values changed
 * @param {string} nameOfFunction - Name of calling function for logging and control flow
 * @returns {Promise<void>}
 */
export async function getSqrtRtAndPriceRatio(nameOfFunction) {
    if (!window.walletConnected) {
        await connectWallet();
    }

    const tokenSwapperABI = [
        { "inputs": [{ "name": "token", "type": "address" }, { "name": "token2", "type": "address" }, { "name": "amountIn", "type": "uint256" }, { "name": "amountIn2", "type": "uint256" }, { "name": "currentx96", "type": "uint256" }, { "name": "slippage", "type": "uint256" }, { "name": "hookAddress", "type": "address" }, { "name": "toSendNFTto", "type": "address" }], "name": "createPositionWith2Tokens", "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "payable", "type": "function" },
        { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "address", "name": "token2", "type": "address" }, { "internalType": "address", "name": "hookAddress", "type": "address" }], "name": "getsqrtPricex96", "outputs": [{ "internalType": "uint160", "name": "", "type": "uint160" }], "stateMutability": "view", "type": "function" },
        {
            "inputs": [
                { "internalType": "address", "name": "token", "type": "address" },
                { "internalType": "address", "name": "token2", "type": "address" },
                { "internalType": "address", "name": "hookAddress", "type": "address" }
            ],
            "name": "getPriceRatio",
            "outputs": [
                { "internalType": "uint256", "name": "ratio", "type": "uint256" },
                { "internalType": "address", "name": "token0z", "type": "address" },
                { "internalType": "address", "name": "token1z", "type": "address" },
                { "internalType": "uint8", "name": "token0decimals", "type": "uint8" },
                { "internalType": "uint8", "name": "token1decimals", "type": "uint8" }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    // MultiCall3 ABI (only aggregate3 function needed)
    const multicall3ABI = [
        {
            "inputs": [
                {
                    "components": [
                        { "internalType": "address", "name": "target", "type": "address" },
                        { "internalType": "bool", "name": "allowFailure", "type": "bool" },
                        { "internalType": "bytes", "name": "callData", "type": "bytes" }
                    ],
                    "internalType": "struct Multicall3.Call3[]",
                    "name": "calls",
                    "type": "tuple[]"
                }
            ],
            "name": "aggregate3",
            "outputs": [
                {
                    "components": [
                        { "internalType": "bool", "name": "success", "type": "bool" },
                        { "internalType": "bytes", "name": "returnData", "type": "bytes" }
                    ],
                    "internalType": "struct Multicall3.Result[]",
                    "name": "returnData",
                    "type": "tuple[]"
                }
            ],
            "stateMutability": "payable",
            "type": "function"
        }
    ];

    // MultiCall3 is deployed at the same address on most chains
    const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

    console.log("Custom RPC4: ", customRPC);
    const provider_zzzzz12 = new ethers.providers.JsonRpcProvider(customRPC);

    // Create interface for encoding/decoding
    const tokenSwapperInterface = new ethers.utils.Interface(tokenSwapperABI);

    // Create MultiCall3 contract instance
    const multicall3Contract = new ethers.Contract(
        MULTICALL3_ADDRESS,
        multicall3ABI,
        provider_zzzzz12
    );

    let oldratioz = ratioz;
    let oldsqrtPricex96 = Current_getsqrtPricex96;

    try {
        console.log("4444441111 tokenAddresses['B0x']", tokenAddresses['B0x']);
        console.log("4444441111 Address_ZEROXBTC_TESTNETCONTRACT", Address_ZEROXBTC_TESTNETCONTRACT);
        console.log("4444441111 hookAddress", hookAddress);

        // Encode the function calls
        const getPriceRatioCallData = tokenSwapperInterface.encodeFunctionData(
            "getPriceRatio",
            [tokenAddresses['B0x'], Address_ZEROXBTC_TESTNETCONTRACT, hookAddress]
        );

        const getSqrtPriceCallData = tokenSwapperInterface.encodeFunctionData(
            "getsqrtPricex96",
            [tokenAddresses['B0x'], Address_ZEROXBTC_TESTNETCONTRACT, hookAddress]
        );

        // Prepare MultiCall3 calls array
        const calls = [
            {
                target: contractAddress_Swapper,
                allowFailure: false, // Set to true if you want to continue even if this call fails
                callData: getPriceRatioCallData
            },
            {
                target: contractAddress_Swapper,
                allowFailure: false,
                callData: getSqrtPriceCallData
            }
        ];

        // Execute batched call
        const results = await multicall3Contract.callStatic.aggregate3(calls);

        console.log("MultiCall3 results:", results);

        // Decode first result (getPriceRatio)
        if (results[0].success) {
            const decodedPriceRatio = tokenSwapperInterface.decodeFunctionResult(
                "getPriceRatio",
                results[0].returnData
            );

            console.log("Raw getPriceRatio result:", decodedPriceRatio);
            ratioz = decodedPriceRatio[0];
            console.log(`Found valid Ratio x10**18: ${ratioz.toString()}`);

            // Format to display as a readable number
            readableAmountOut = ethers.utils.formatEther(ratioz);
            ratioAsWei = ethers.utils.parseEther(readableAmountOut);
            console.log(`Found valid Ratio x10**18: ${readableAmountOut} multiplier`);
        } else {
            console.error("getPriceRatio call failed");
        }

        // Decode second result (getsqrtPricex96)
        if (results[1].success) {
            const decodedSqrtPrice = tokenSwapperInterface.decodeFunctionResult(
                "getsqrtPricex96",
                results[1].returnData
            );

            console.log("Raw getsqrtPricex96 result:", decodedSqrtPrice);
            Current_getsqrtPricex96 = decodedSqrtPrice[0];
            console.log(`Found valid Current_getsqrtPricex96: ${Current_getsqrtPricex96.toString()}`);
        } else {
            console.error("getsqrtPricex96 call failed");
        }

    } catch (error) {
        console.error(`Error in MultiCall3 aggregate3:`, error);
    }

    // Check for changes and trigger updates
    if (!oldsqrtPricex96.eq(Current_getsqrtPricex96)) {
        console.log("Calling oldsqrtPricex96 != Current_getsqrtPricex96 changed");
    }
    if (!oldratioz.eq(ratioz)) {
        console.log("Calling oldratioz != ratioz changed");
        console.log("Calling oldratioz:", oldratioz, " &&&&  ratioz:", ratioz);
    }
    if ((!oldsqrtPricex96.eq(Current_getsqrtPricex96) || !oldratioz.eq(ratioz)) && firstRun) {
        console.log("Value changed calling getEstimate, getMaxCreate and getRatio");
        console.log("Value changed and called from:", nameOfFunction);
        if (nameOfFunction != "SwapFunction") {
            await getEstimate();
        }
        await getRatioCreatePositiontokenA();
        await getRatioIncreasePositiontokenA();
        await getRatioStakeIncreasePositiontokenA();
    }
    oldsqrtPricex96 = Current_getsqrtPricex96;
    oldratioz = ratioz;
    firstRun = true;

    // Also update window object for backwards compatibility
    window.ratioz = ratioz;
    window.Current_getsqrtPricex96 = Current_getsqrtPricex96;
    window.readableAmountOut = readableAmountOut;
    window.ratioAsWei = ratioAsWei;
}

/**
 * Throttled version of getSqrtRtAndPriceRatio
 * Prevents excessive calls to the price ratio function
 * @param {string} NameOfFunction - Name of calling function for logging
 * @returns {Promise<any>} Price ratio data or null if throttled
 */
async function throttledGetSqrtRtAndPriceRatio(NameOfFunction = "General") {
    const now = Date.now();

    if (now - lastCallTime < THROTTLE_DELAY) {
        console.log(`Function throttled. Please wait ${Math.ceil((THROTTLE_DELAY - (now - lastCallTime)) / 1000)} more seconds.`);
        return null;
    }

    lastCallTime = now;

    // Call the module function
    return await getSqrtRtAndPriceRatio(NameOfFunction);
}

/**
 * Calculate optimal amounts with proper priority handling
 * @param {string} tokenAValue - Token A symbol
 * @param {string} tokenBValue - Token B symbol
 * @param {string} tokenAAmount - Token A amount
 * @param {string} tokenBAmount - Token B amount
 * @param {Object} walletBalances - Wallet balances object
 * @param {bigint} ratioz - Price ratio
 * @param {string} priorityToken - 'A' or 'B'
 * @param {boolean} StakeSection - Whether this is for staking section
 * @returns {Object} Calculated amounts and adjustment info
 */
function calculateOptimalAmounts(tokenAValue, tokenBValue, tokenAAmount, tokenBAmount, walletBalances, ratioz, priorityToken = null, StakeSection = false) {
    tokenAValue = tokenAValue.trim();
    tokenBValue = tokenBValue.trim();
    const tokenAinputAddress = tokenAddresses[tokenAValue];
    const tokenBinputAddress = tokenAddresses[tokenBValue];

    console.log("TOKENA VALUE OPTIMAL : ", tokenAValue);
    console.log("TOKENB VALUE OPTIMAL : ", tokenBValue);
    console.log("tokenAAmount VALUE OPTIMAL : ", tokenAAmount);
    console.log("tokenBAmount VALUE OPTIMAL : ", tokenBAmount);
    console.log("tokenAinputAddress VALUE OPTIMAL : ", tokenAinputAddress);
    console.log("tokenBinputAddress VALUE OPTIMAL : ", tokenBinputAddress);

    // Check if ratioz is valid
    if (!ratioz || ratioz.toString() === '0' || BigInt(ratioz.toString()) === 0n) {
        console.warn("calculateOptimalAmounts: ratioz is 0 or undefined");
        return {
            amountToDeposit: 0n,
            amountWith8Decimals0xBTC: 0n,
            needsAdjustment: false,
            limitingFactor: null,
            error: 'Price ratio not loaded'
        };
    }

    // Determine which amount to use as the base calculation based on priority
    let baseAmount, baseTokenValue, baseTokenAddress, otherTokenValue;

    if (priorityToken === 'A') {
        baseAmount = tokenAAmount;
        baseTokenValue = tokenAValue;
        baseTokenAddress = tokenAinputAddress;
        otherTokenValue = tokenBValue;
    } else if (priorityToken === 'B') {
        baseAmount = tokenBAmount;
        baseTokenValue = tokenBValue;
        baseTokenAddress = tokenBinputAddress;
        otherTokenValue = tokenAValue;
    }

    // Parse the base amount with correct decimals
    const baseAmountParsed = ethers.utils.parseUnits(baseAmount, baseTokenValue === "0xBTC" ? 8 : 18);

    console.log("Base Amount Parsed:", baseAmountParsed.toString());
    console.log("Base Token:", baseTokenValue);
    console.log("Priority Token:", priorityToken);

    // Calculate the required amounts based on which token is the base
    let amountToDeposit, amountWith8Decimals0xBTC;
    const calculatedPriceRatio = BigInt(ratioz);

    // Determine token order for ratio calculation
    const is0xBTCToken0 = BigInt(Address_ZEROXBTC_TESTNETCONTRACT.toLowerCase()) < BigInt(tokenAddresses['B0x'].toLowerCase());
    console.log("is0xBTCToken0:", is0xBTCToken0);

    if (baseTokenAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
        // Base token is 0xBTC, calculate the B0x amount needed
        console.log("Base is 0xBTC, calculating B0x needed");

        let priceIn18Decimals;
        if (is0xBTCToken0) {
            // 0xBTC is token0, ratio is 0xBTC/B0x
            // To get B0x from 0xBTC: multiply by ratio
            priceIn18Decimals = calculatedPriceRatio / (10n ** 10n); // Convert 28 decimals to 18
            console.log("0xBTC is token0, using direct ratio");
        } else {
            // 0xBTC is token1, ratio is B0x/0xBTC
            // To get B0x from 0xBTC: divide by inverted ratio (multiply by inverse)
            priceIn18Decimals = (10n ** 36n) / (calculatedPriceRatio * (10n ** 10n));
            console.log("0xBTC is token1, inverting ratio");
        }

        const amountZer0XIn18Decimals = BigInt(baseAmountParsed) * (10n ** 10n);
        amountWith8Decimals0xBTC = baseAmountParsed;
        amountToDeposit = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n);

        console.log("Calculated B0x from 0xBTC:");
        console.log("  0xBTC amount:", ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8));
        console.log("  B0x needed:", ethers.utils.formatUnits(amountToDeposit, 18));

    } else {
        // Base token is B0x, calculate how much 0xBTC is needed
        console.log("Base is B0x, calculating 0xBTC needed");

        let priceIn18Decimals;
        if (is0xBTCToken0) {
            // 0xBTC is token0, ratio is 0xBTC/B0x
            // To get 0xBTC from B0x: divide by ratio
            priceIn18Decimals = calculatedPriceRatio / (10n ** 10n);
            console.log("0xBTC is token0, using direct ratio for division");
        } else {
            // 0xBTC is token1, ratio is B0x/0xBTC
            // To get 0xBTC from B0x: multiply by inverted ratio
            priceIn18Decimals = (10n ** 36n) / (calculatedPriceRatio * (10n ** 10n));
            console.log("0xBTC is token1, inverting ratio for multiplication");
        }

        amountToDeposit = baseAmountParsed;
        amountWith8Decimals0xBTC = (BigInt(baseAmountParsed) * (10n ** 18n)) / priceIn18Decimals / (10n ** 10n);

        console.log("Calculated 0xBTC from B0x:");
        console.log("  B0x amount:", ethers.utils.formatUnits(amountToDeposit, 18));
        console.log("  0xBTC needed:", ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8));
    }

    // Get position data to include unclaimed fees
    var positionSelect = document.querySelector('#increase select');
    var positionDataSource = positionData;
    if (StakeSection == true) {
        positionSelect = document.querySelector('#stake-increase select');
        positionDataSource = stakingPositionData;
    }
    console.log("Test positionSelect ", positionSelect);
    const selectedPositionId = positionSelect ? positionSelect.value : null;
    const position = selectedPositionId ? positionDataSource[selectedPositionId] : null;

    // Calculate total available amounts (wallet + unclaimed fees)
    const zeroxbtcdecimal = amountWith8Decimals0xBTC.toString();
    let total_available_zeroxbtc;

    if (position && position.tokenA === tokenAddresses['0xBTC']) {
        const walletAmount = ethers.utils.parseUnits(walletBalances['0xBTC'], 8);
        const unclaimedAmount = ethers.utils.parseUnits(position.unclaimedFeesTokenA.toString(), 8);
        total_available_zeroxbtc = walletAmount.add(unclaimedAmount).toString();
    } else if (position && position.tokenB === tokenAddresses['0xBTC']) {
        const walletAmount = ethers.utils.parseUnits(walletBalances['0xBTC'], 8);
        const unclaimedAmount = ethers.utils.parseUnits(position.unclaimedFeesTokenB.toString(), 8);
        total_available_zeroxbtc = walletAmount.add(unclaimedAmount).toString();
    } else {
        total_available_zeroxbtc = ethers.utils.parseUnits(walletBalances['0xBTC'], 8).toString();
    }

    const b0xdecimal = amountToDeposit.toString();
    let total_available_b0x;

    if (position && position.tokenA === tokenAddresses['B0x']) {
        const walletAmount = ethers.utils.parseUnits(walletBalances['B0x'], 18);
        const unclaimedAmount = ethers.utils.parseUnits(position.unclaimedFeesTokenA.toString(), 18);
        total_available_b0x = walletAmount.add(unclaimedAmount).toString();
    } else if (position && position.tokenB === tokenAddresses['B0x']) {
        const walletAmount = ethers.utils.parseUnits(walletBalances['B0x'], 18);
        const unclaimedAmount = ethers.utils.parseUnits(position.unclaimedFeesTokenB.toString(), 18);
        total_available_b0x = walletAmount.add(unclaimedAmount).toString();
    } else {
        total_available_b0x = ethers.utils.parseUnits(walletBalances['B0x'], 18).toString();
    }

    const zeroxbtcExceeded = parseFloat(zeroxbtcdecimal) > parseFloat(total_available_zeroxbtc);
    const b0xExceeded = parseFloat(b0xdecimal) > parseFloat(total_available_b0x);

    console.log("zeroxbtcExceeded:", zeroxbtcExceeded);
    console.log("b0xExceeded:", b0xExceeded);
    console.log("0xBTC needed:", ethers.utils.formatUnits(zeroxbtcdecimal, 8));
    console.log("0xBTC available:", ethers.utils.formatUnits(total_available_zeroxbtc, 8));
    console.log("B0x needed:", ethers.utils.formatUnits(b0xdecimal, 18));
    console.log("B0x available:", ethers.utils.formatUnits(total_available_b0x, 18));

    // If both are within limits, return as is
    if (!zeroxbtcExceeded && !b0xExceeded) {
        return {
            amountToDeposit,
            amountWith8Decimals0xBTC,
            needsAdjustment: false,
            priorityUsed: priorityToken,
            debugInfo: {
                baseToken: baseTokenValue,
                baseAmount: baseAmount,
                calculatedFrom: `${baseTokenValue} -> ${otherTokenValue}`
            }
        };
    }

    // If we exceed limits, calculate the optimal amounts within constraints
    let maxZeroxbtc, maxB0x;

    if (position && position.tokenA === tokenAddresses['0xBTC']) {
        const walletAmount = ethers.utils.parseUnits(walletBalances['0xBTC'], 8);
        const unclaimedAmount = ethers.utils.parseUnits(position.unclaimedFeesTokenA.toString(), 8);
        maxZeroxbtc = walletAmount.add(unclaimedAmount);
    } else if (position && position.tokenB === tokenAddresses['0xBTC']) {
        const walletAmount = ethers.utils.parseUnits(walletBalances['0xBTC'], 8);
        const unclaimedAmount = ethers.utils.parseUnits(position.unclaimedFeesTokenB.toString(), 8);
        maxZeroxbtc = walletAmount.add(unclaimedAmount);
    } else {
        maxZeroxbtc = ethers.utils.parseUnits(walletBalances['0xBTC'], 8);
    }

    if (position && position.tokenA === tokenAddresses['B0x']) {
        const walletAmount = ethers.utils.parseUnits(walletBalances['B0x'], 18);
        const unclaimedAmount = ethers.utils.parseUnits(position.unclaimedFeesTokenA.toString(), 18);
        maxB0x = walletAmount.add(unclaimedAmount);
    } else if (position && position.tokenB === tokenAddresses['B0x']) {
        const walletAmount = ethers.utils.parseUnits(walletBalances['B0x'], 18);
        const unclaimedAmount = ethers.utils.parseUnits(position.unclaimedFeesTokenB.toString(), 18);
        maxB0x = walletAmount.add(unclaimedAmount);
    } else {
        maxB0x = ethers.utils.parseUnits(walletBalances['B0x'], 18);
    }

    // Calculate what amounts would be needed if we max out each token
    let priceIn18Decimals;
    let amountZer0XIn18Decimals;
    let zeroxbtcNeededForMaxB0x;
    let b0xNeededForMax0xBTC;

    if (is0xBTCToken0) {
        // 0xBTC is token0
        priceIn18Decimals = calculatedPriceRatio / (10n ** 10n);

        // If we max out 0xBTC, how much B0x do we need?
        amountZer0XIn18Decimals = BigInt(maxZeroxbtc) * (10n ** 10n);
        b0xNeededForMax0xBTC = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n);

        // If we max out B0x, how much 0xBTC do we need?
        zeroxbtcNeededForMaxB0x = (BigInt(maxB0x) * (10n ** 18n)) / priceIn18Decimals / (10n ** 10n);
    } else {
        // 0xBTC is token1
        priceIn18Decimals = (10n ** 36n) / (calculatedPriceRatio * (10n ** 10n));

        // If we max out 0xBTC, how much B0x do we need?
        amountZer0XIn18Decimals = BigInt(maxZeroxbtc) * (10n ** 10n);
        b0xNeededForMax0xBTC = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n);

        // If we max out B0x, how much 0xBTC do we need?
        zeroxbtcNeededForMaxB0x = (BigInt(maxB0x) * (10n ** 18n)) / priceIn18Decimals / (10n ** 10n);
    }

    // Determine which scenario is actually possible
    const canMaxOut0xBTC = b0xNeededForMax0xBTC <= BigInt(maxB0x);
    const canMaxOutB0x = zeroxbtcNeededForMaxB0x <= BigInt(maxZeroxbtc);

    let actualLimitingFactor;
    let finalAmountToDeposit, finalAmountWith8Decimals0xBTC;

    // Priority-based selection with proper limiting factor detection
    if (canMaxOut0xBTC && canMaxOutB0x) {
        // Both are possible, choose based on priority
        if (priorityToken === 'A') {
            if (tokenAinputAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
                actualLimitingFactor = 'B0x';
                finalAmountWith8Decimals0xBTC = maxZeroxbtc;
                finalAmountToDeposit = b0xNeededForMax0xBTC;
            } else {
                actualLimitingFactor = '0xBTC';
                finalAmountToDeposit = maxB0x;
                finalAmountWith8Decimals0xBTC = zeroxbtcNeededForMaxB0x;
            }
        } else if (priorityToken === 'B') {
            if (tokenBinputAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
                actualLimitingFactor = 'B0x';
                finalAmountWith8Decimals0xBTC = maxZeroxbtc;
                finalAmountToDeposit = b0xNeededForMax0xBTC;
            } else {
                actualLimitingFactor = '0xBTC';
                finalAmountToDeposit = maxB0x;
                finalAmountWith8Decimals0xBTC = zeroxbtcNeededForMaxB0x;
            }
        }
    } else if (canMaxOut0xBTC) {
        actualLimitingFactor = 'B0x';
        finalAmountWith8Decimals0xBTC = maxZeroxbtc;
        finalAmountToDeposit = b0xNeededForMax0xBTC;
    } else if (canMaxOutB0x) {
        actualLimitingFactor = '0xBTC';
        finalAmountToDeposit = maxB0x;
        finalAmountWith8Decimals0xBTC = zeroxbtcNeededForMaxB0x;
    } else {
        const zeroxbtcRatio = parseFloat(total_available_zeroxbtc) / parseFloat(zeroxbtcdecimal);
        const b0xRatio = parseFloat(total_available_b0x) / parseFloat(b0xdecimal);

        if (zeroxbtcRatio < b0xRatio) {
            actualLimitingFactor = '0xBTC';
            finalAmountWith8Decimals0xBTC = maxZeroxbtc;
            finalAmountToDeposit = b0xNeededForMax0xBTC;
        } else {
            actualLimitingFactor = 'B0x';
            finalAmountToDeposit = maxB0x;
            finalAmountWith8Decimals0xBTC = zeroxbtcNeededForMaxB0x;
        }
    }

    return {
        amountToDeposit: finalAmountToDeposit,
        amountWith8Decimals0xBTC: finalAmountWith8Decimals0xBTC,
        needsAdjustment: true,
        limitingFactor: actualLimitingFactor,
        priorityUsed: priorityToken,
        debugInfo: {
            baseToken: baseTokenValue,
            baseAmount: baseAmount,
            calculatedFrom: `${baseTokenValue} -> ${otherTokenValue}`,
            canMaxOut0xBTC,
            canMaxOutB0x,
            b0xNeededForMax0xBTC: b0xNeededForMax0xBTC.toString(),
            zeroxbtcNeededForMaxB0x: zeroxbtcNeededForMaxB0x.toString(),
            maxZeroxbtc: maxZeroxbtc.toString(),
            maxB0x: maxB0x.toString()
        }
    };
}

// Wrapper functions for different priority modes
function calculateOptimalAmountsWithTokenAPriority(tokenAValue, tokenBValue, tokenAAmount, tokenBAmount, walletBalances, ratioz) {
    return calculateOptimalAmounts(tokenAValue, tokenBValue, tokenAAmount, tokenBAmount, walletBalances, ratioz, 'A', false);
}

function calculateOptimalAmountsWithTokenBPriority(tokenAValue, tokenBValue, tokenAAmount, tokenBAmount, walletBalances, ratioz) {
    return calculateOptimalAmounts(tokenAValue, tokenBValue, tokenAAmount, tokenBAmount, walletBalances, ratioz, 'B', false);
}

function calculateOptimalAmountsWithTokenAPrioritySTAKESECTIONI(tokenAValue, tokenBValue, tokenAAmount, tokenBAmount, walletBalances, ratioz) {
    console.log("Calling Token A calculateOptimalAmounts");
    return calculateOptimalAmounts(tokenAValue, tokenBValue, tokenAAmount, tokenBAmount, walletBalances, ratioz, 'A', true);
}

function calculateOptimalAmountsWithTokenBPrioritySTAKESECTIONI(tokenAValue, tokenBValue, tokenAAmount, tokenBAmount, walletBalances, ratioz) {
    console.log("Calling Token B calculateOptimalAmounts");
    return calculateOptimalAmounts(tokenAValue, tokenBValue, tokenAAmount, tokenBAmount, walletBalances, ratioz, 'B', true);
}

/**
 * Calculate maximum amounts with proper limiting for position creation/increase
 * Considers wallet balances and optional position unclaimed fees
 * @param {string} tokenAValue - Token A symbol
 * @param {string} tokenBValue - Token B symbol
 * @param {Object} walletBalances - Wallet balances object
 * @param {BigNumber} ratioz - Price ratio
 * @param {string} requestedMaxToken - Which token to maximize ('0xBTC' or 'B0x')
 * @param {Object} position - Optional position object with unclaimed fees
 * @param {boolean} useFeesz - Whether to include unclaimed fees in calculation
 * @returns {Object} Final amounts with limiting factor information
 */
export function getMaxAmountsWithProperLimiting(tokenAValue, tokenBValue, walletBalances, ratioz, requestedMaxToken, position = null, useFeesz) {
    // Check if walletBalances is valid before proceeding
    if (!walletBalances || !walletBalances['0xBTC'] || !walletBalances['B0x']) {
        console.warn("getMaxAmountsWithProperLimiting: wallet balances not yet loaded");
        return {
            amountWith8Decimals0xBTC: 0n,
            amountToDeposit: 0n,
            actualLimitingFactor: 'none',
            requestFulfilled: false,
            reason: 'Wallet balances not yet loaded. Please wait.'
        };
    }

    // Check if ratioz is valid before proceeding
    if (!ratioz || ratioz.toString() === '0' || BigInt(ratioz.toString()) === 0n) {
        console.warn("getMaxAmountsWithProperLimiting: ratioz is 0 or undefined, cannot calculate amounts");
        return {
            amountWith8Decimals0xBTC: 0n,
            amountToDeposit: 0n,
            actualLimitingFactor: 'none',
            requestFulfilled: false,
            reason: 'Price ratio not yet loaded. Please wait for ratio to be fetched.'
        };
    }

    // Calculate what the maximum possible amounts would be for each token (wallet + unclaimed fees)
    let maxZeroxbtc, maxB0x;

    if (position && position.tokenA == '0xBTC') {
        // 0xBTC is tokenA, add unclaimedFeesTokenA
        const walletAmount = ethers.utils.parseUnits(walletBalances['0xBTC'], 8);
        const unclaimedAmount = ethers.utils.parseUnits(position.unclaimedFeesTokenA.toString(), 8);
        maxZeroxbtc = walletAmount.add(unclaimedAmount);
        if (!useFeesz) {
            maxZeroxbtc = walletAmount;
        }
    } else if (position && position.tokenB == '0xBTC') {
        // 0xBTC is tokenB, add unclaimedFeesTokenB
        const walletAmount = ethers.utils.parseUnits(walletBalances['0xBTC'], 8);
        const unclaimedAmount = ethers.utils.parseUnits(position.unclaimedFeesTokenB.toString(), 8);
        maxZeroxbtc = walletAmount.add(unclaimedAmount);

        if (!useFeesz) {
            maxZeroxbtc = walletAmount;
        }
    } else {
        // No position or 0xBTC not in position, use wallet only
        maxZeroxbtc = ethers.utils.parseUnits(walletBalances['0xBTC'], 8);
    }

    if (position && position.tokenA == 'B0x') {
        // B0x is tokenA, add unclaimedFeesTokenA
        const walletAmount = ethers.utils.parseUnits(walletBalances['B0x'], 18);
        const unclaimedAmount = ethers.utils.parseUnits(position.unclaimedFeesTokenA.toString(), 18);
        maxB0x = walletAmount.add(unclaimedAmount);

        if (!useFeesz) {
            maxB0x = walletAmount;
        }
    } else if (position && position.tokenB == 'B0x') {
        // B0x is tokenB, add unclaimedFeesTokenB
        const walletAmount = ethers.utils.parseUnits(walletBalances['B0x'], 18);
        const unclaimedAmount = ethers.utils.parseUnits(position.unclaimedFeesTokenB.toString(), 18);
        maxB0x = walletAmount.add(unclaimedAmount);

        if (!useFeesz) {
            maxB0x = walletAmount;
        }
    } else {
        console.log("EUR EUR ");
        // No position or B0x not in position, use wallet only
        maxB0x = ethers.utils.parseUnits(walletBalances['B0x'], 18);
    }

    const calculatedPriceRatio = BigInt(ratioz);

    var b0xNeededForMax0xBTC = 0;
    var zeroxbtcNeededForMaxB0x = 0;
    var priceIn18Decimals = 0n;
    if (BigInt(Address_ZEROXBTC_TESTNETCONTRACT.toLowerCase()) > BigInt(tokenAddresses['B0x'].toLowerCase())) {
        // INVERTED: Use division instead of multiplication
        priceIn18Decimals = (10n ** 36n) / (calculatedPriceRatio * (10n ** 10n)); // Invert the ratio
        // Calculate scenarios
        const amountZer0XIn18Decimals = BigInt(maxZeroxbtc) * 10n ** 10n;
        b0xNeededForMax0xBTC = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n);

        // For 0xBTC needed from B0x, we divide by the inverted price
        console.log("ffff this)");
        zeroxbtcNeededForMaxB0x = (BigInt(maxB0x) * (10n ** 18n)) / priceIn18Decimals / (10n ** 10n);
    } else {
        // INVERTED: Use division instead of multiplication
        priceIn18Decimals = calculatedPriceRatio / (10n ** 10n); // Convert 28 decimals to 18 decimals
        // Calculate scenarios
        const amountZer0XIn18Decimals = BigInt(maxZeroxbtc) * 10n ** 10n;
        b0xNeededForMax0xBTC = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n);

        // For 0xBTC needed from B0x, we divide by the inverted price
        zeroxbtcNeededForMaxB0x = (BigInt(maxB0x) * (10n ** 18n)) / priceIn18Decimals / (10n ** 10n);
        console.log("ffff This this)");
    }

    console.log(`zzMax 0xBTC: ${ethers.utils.formatUnits(maxZeroxbtc, 8)}`);
    console.log(`zzB0x needed for max 0xBTC: ${ethers.utils.formatEther(b0xNeededForMax0xBTC)}`);
    console.log(`zzMax B0x: ${ethers.utils.formatEther(maxB0x)}`);
    console.log(`zz0xBTC needed for max B0x: ${ethers.utils.formatUnits(zeroxbtcNeededForMaxB0x, 8)}`);
    // Check which scenarios are feasible
    const canMaxOut0xBTC = b0xNeededForMax0xBTC <= BigInt(maxB0x);
    const canMaxOutB0x = zeroxbtcNeededForMaxB0x <= BigInt(maxZeroxbtc);
    console.log("zzcanMaxOut0xBTC: ", canMaxOut0xBTC);
    console.log("zzcanMaxOutB0x: ", canMaxOutB0x);

    // Determine the actual amounts to use
    let finalAmounts;

    if (requestedMaxToken === '0xBTC' && canMaxOut0xBTC) {
        // User wants max 0xBTC and it's possible
        finalAmounts = {
            amountWith8Decimals0xBTC: maxZeroxbtc,
            amountToDeposit: b0xNeededForMax0xBTC,
            actualLimitingFactor: 'none',
            requestFulfilled: true
        };
    } else if (requestedMaxToken === 'B0x' && canMaxOutB0x) {
        // User wants max B0x and it's possible
        finalAmounts = {
            amountWith8Decimals0xBTC: zeroxbtcNeededForMaxB0x,
            amountToDeposit: maxB0x,
            actualLimitingFactor: 'none',
            requestFulfilled: true
        };
    } else {
        // User's request can't be fulfilled, use the truly limiting factor
        if (canMaxOut0xBTC && !canMaxOutB0x) {
            finalAmounts = {
                amountWith8Decimals0xBTC: maxZeroxbtc,
                amountToDeposit: b0xNeededForMax0xBTC,
                actualLimitingFactor: 'B0x',
                requestFulfilled: false,
                reason: `Cannot max out ${requestedMaxToken} because B0x is limiting`
            };
        } else if (!canMaxOut0xBTC && canMaxOutB0x) {
            finalAmounts = {
                amountWith8Decimals0xBTC: zeroxbtcNeededForMaxB0x,
                amountToDeposit: maxB0x,
                actualLimitingFactor: '0xBTC',
                requestFulfilled: false,
                reason: `Cannot max out ${requestedMaxToken} because 0xBTC is limiting`
            };
        } else {
            // Neither can be maxed out independently, find the most limiting
            const b0xRatio = parseFloat(maxB0x.toString()) / parseFloat(b0xNeededForMax0xBTC.toString());
            const zeroxbtcRatio = parseFloat(maxZeroxbtc.toString()) / parseFloat(zeroxbtcNeededForMaxB0x.toString());

            if (b0xRatio < zeroxbtcRatio) {
                finalAmounts = {
                    amountWith8Decimals0xBTC: zeroxbtcNeededForMaxB0x,
                    amountToDeposit: maxB0x,
                    actualLimitingFactor: 'B0x',
                    requestFulfilled: requestedMaxToken === 'B0x',
                    reason: 'B0x is the most limiting factor'
                };
            } else {
                finalAmounts = {
                    amountWith8Decimals0xBTC: maxZeroxbtc,
                    amountToDeposit: b0xNeededForMax0xBTC,
                    actualLimitingFactor: '0xBTC',
                    requestFulfilled: requestedMaxToken === '0xBTC',
                    reason: '0xBTC is the most limiting factor'
                };
            }
        }
    }

    return finalAmounts;
}

/**
 * Handle max button click for regular increase section
 * @param {string} tokenSymbol - Token symbol
 * @param {HTMLElement} inputElement - Input element
 * @returns {Object} Result of max amount calculation
 */
async function handleMaxButtonClick(tokenSymbol, inputElement) {
    const tokenALabel = document.querySelector('#increase #tokenALabel');
    const tokenBLabel = document.querySelector('#increase #tokenBLabel');
    const tokenAValue = tokenALabel.textContent.trim();
    const tokenBValue = tokenBLabel.textContent.trim();

    const positionSelect = document.querySelector('#increase select');
    const selectedPositionId = positionSelect.value;
    const position = positionData[selectedPositionId];
    console.log(" handleMaxButtonClick position: ", position);

    // Ensure ratio is fetched before calculating amounts
    await throttledGetSqrtRtAndPriceRatio();

    const ratioz = getRatioz();
    const walletBalances = getWalletBalances();

    const useFees = true;

    // Call the module function
    const result = getMaxAmountsWithProperLimiting(tokenAValue, tokenBValue, walletBalances, ratioz, tokenSymbol, position, useFees);

    if (!result.requestFulfilled) {
        console.log(`Max ${tokenSymbol} request could not be fulfilled: ${result.reason}`);
        console.log(`Using max amounts based on actual limiting factor: ${result.actualLimitingFactor}`);
    } else {
        console.log(`Max ${tokenSymbol} request fulfilled successfully`);
    }

    const createInputs = document.querySelectorAll('#increase input[type="number"]');
    const amountInputA = createInputs[0];
    const amountInputB = createInputs[1];

    const tokenAinputAddress = tokenAddresses[tokenAValue];

    if (tokenAinputAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
        amountInputA.value = ethers.utils.formatUnits(result.amountWith8Decimals0xBTC, 8);
        amountInputB.value = ethers.utils.formatUnits(result.amountToDeposit, 18);
    } else {
        amountInputA.value = ethers.utils.formatUnits(result.amountToDeposit, 18);
        amountInputB.value = ethers.utils.formatUnits(result.amountWith8Decimals0xBTC, 8);
    }

    updateTotalLiqIncrease();
    return result;
}

/**
 * Handle max button click for stake increase section
 * @param {string} tokenSymbol - Token symbol
 * @param {HTMLElement} inputElement - Input element
 * @returns {Object} Result of max amount calculation
 */
async function handleMaxButtonClickStakeIncrease(tokenSymbol, inputElement) {
    const tokenALabel = document.querySelector('#stake-increase #tokenALabelINC');
    const tokenBLabel = document.querySelector('#stake-increase #tokenBLabelINC');
    const tokenAValue = tokenALabel.textContent;
    const tokenBValue = tokenBLabel.textContent;

    const positionSelect = document.querySelector('#stake-increase select');
    const selectedPositionId = positionSelect.value;
    const position = stakingPositionData[selectedPositionId];
    console.log(" handleMaxButtonClickStakeIncrease position: ", position);

    // Ensure ratio is fetched before calculating amounts
    await throttledGetSqrtRtAndPriceRatio();

    const ratioz = getRatioz();
    const walletBalances = getWalletBalances();

    const useFees = true;

    // Call the module function
    const result = getMaxAmountsWithProperLimiting(tokenAValue, tokenBValue, walletBalances, ratioz, tokenSymbol, position, useFees);

    if (!result.requestFulfilled) {
        console.log(`Max ${tokenSymbol} request could not be fulfilled: ${result.reason}`);
        console.log(`Using max amounts based on actual limiting factor: ${result.actualLimitingFactor}`);
    }

    const createInputs = document.querySelectorAll('#stake-increase input[type="number"]');
    const amountInputA = createInputs[0];
    const amountInputB = createInputs[1];

    const tokenAinputAddress = tokenAddresses[tokenAValue];

    if (tokenAinputAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
        amountInputA.value = ethers.utils.formatUnits(result.amountWith8Decimals0xBTC, 8);
        amountInputB.value = ethers.utils.formatUnits(result.amountToDeposit, 18);
    } else {
        amountInputA.value = ethers.utils.formatUnits(result.amountToDeposit, 18);
        amountInputB.value = ethers.utils.formatUnits(result.amountWith8Decimals0xBTC, 8);
    }

    if (typeof updateTotalLiqIncreaseSTAKING === 'function') {
        updateTotalLiqIncreaseSTAKING();
    }

    return result;
}

// ============================================
// CREATE POSITION RATIO FUNCTIONS
// ============================================

/**
 * Calculate ratio when Token B input changes in create position section
 * Updates Token A based on Token B value and current price ratio
 * @async
 * @returns {Promise<void>}
 */
async function getRatioCreatePositiontokenB() {
    const walletConnected = getWalletConnected();

    if (!walletConnected) {
        await connectWallet();
    }

    const createInputs = document.querySelectorAll('#create input[type="number"]');
    const amountInputA = createInputs[0];
    const amountInputB = createInputs[1];

    if (!amountInputA || !amountInputB) {
        console.error("Could not find amount input fields");
        return;
    }

    const tokenASelect = document.querySelector('#create .form-group:nth-child(1) select');
    const tokenBSelect = document.querySelector('#create .form-group:nth-child(2) select');

    const selectedOptionA = tokenASelect.options[tokenASelect.selectedIndex];
    const selectedOptionB = tokenBSelect.options[tokenBSelect.selectedIndex];

    const tokenAinputAddress = tokenAddresses[selectedOptionA.value];
    const tokenBinputAddress = tokenAddresses[selectedOptionB.value];

    const tokenAInput = amountInputA.value;
    const tokenBInput = amountInputB.value;

    console.log("Currently amountInputA value:", tokenAInput);
    console.log("Currently amountInputB value:", tokenBInput);

    const amountBtoCreate = ethers.utils.parseUnits(tokenBInput, selectedOptionB.value === "0xBTC" ? 8 : 18);

    await throttledGetSqrtRtAndPriceRatio();

    const ratioz = getRatioz();
    let amountToDeposit, amountWith8Decimals0xBTC;

    if (tokenBinputAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
        console.log("TokenB is 0xBTC, calculating TokenA amount");
        const calculatedPriceRatio = BigInt(ratioz);

        const amountZer0XIn18Decimals = BigInt(amountBtoCreate) * 10n ** 10n;
        amountWith8Decimals0xBTC = amountBtoCreate;

        if (BigInt(Address_ZEROXBTC_TESTNETCONTRACT.toLowerCase()) < BigInt(tokenAddresses['B0x'].toLowerCase())) {
            const priceIn18Decimals = calculatedPriceRatio / (10n ** 10n);
            amountToDeposit = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n);
        } else {
            amountToDeposit = (amountZer0XIn18Decimals * (10n ** 18n)) / (calculatedPriceRatio * 10n ** 10n);
        }

        console.log(`TokenB (0xBTC) amount: ${ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8)}`);
        console.log(`Calculated TokenA (B0x) amount: ${ethers.utils.formatEther(amountToDeposit)}`);

    } else {
        console.log("TokenB is B0x, calculating TokenA amount");
        const priceRatio = BigInt(ratioz);
        amountToDeposit = amountBtoCreate;

        if (BigInt(Address_ZEROXBTC_TESTNETCONTRACT.toLowerCase()) < BigInt(tokenAddresses['B0x'].toLowerCase())) {
            amountWith8Decimals0xBTC = (BigInt(amountBtoCreate) * (10n ** 18n)) / priceRatio;
        } else {
            amountWith8Decimals0xBTC = (BigInt(amountBtoCreate) * priceRatio) / (10n ** 18n);
        }

        console.log(`TokenB (B0x) amount: ${ethers.utils.formatEther(amountToDeposit)}`);
        console.log(`Calculated TokenA (0xBTC) amount: ${ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8)}`);
    }

    // Wallet balance checks
    const walletBalances = getWalletBalances();
    const zeroxbtcdecimal = amountWith8Decimals0xBTC.toString();
    const wallet_zeroxbtc = ethers.utils.parseUnits(walletBalances['0xBTC'], 8).toString();

    if (parseFloat(zeroxbtcdecimal) > parseFloat(wallet_zeroxbtc)) {
        alert("Too much 0xBTC - you don't have enough, lower the amount!");
        if (typeof window.getMaxCreatePosition === 'function') {
            await window.getMaxCreatePosition();
        }
        return;
    }

    const b0xdecimal = amountToDeposit.toString();
    const wallet_b0x = ethers.utils.parseUnits(walletBalances['B0x'], 18).toString();

    if (parseFloat(b0xdecimal) > parseFloat(wallet_b0x)) {
        alert("Too much B0x - you don't have enough, lower the amount!");
        if (typeof window.getMaxCreatePosition === 'function') {
            await window.getMaxCreatePosition();
        }
        return;
    }

    const amountToDepositBN = ethers.BigNumber.from(amountToDeposit.toString());
    const amountToDepositBN2 = ethers.BigNumber.from(amountWith8Decimals0xBTC.toString());

    try {
        console.log("Updating TokenA input with calculated value");

        if (tokenAinputAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
            amountInputA.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
            amountInputB.value = ethers.utils.formatUnits(amountToDeposit, 18);
        } else {
            amountInputA.value = ethers.utils.formatUnits(amountToDeposit, 18);
            amountInputB.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
        }

        ratiozToSave = 10000 * amountToDepositBN / amountToDepositBN2;

    } catch (error) {
        console.error(`Error in getRatioCreatePositiontokenB:`, error);
    }
}

/**
 * Calculate ratio when Token A input changes in create position section
 * Updates Token B based on Token A value and current price ratio
 * @async
 * @returns {Promise<void>}
 */
async function getRatioCreatePositiontokenA() {
    console.log("running: getRatioCreatePositiontokenA");

    const walletConnected = getWalletConnected();

    if (!walletConnected) {
        await connectWallet();
    }

    const tokenASelect = document.querySelector('#create .form-group:nth-child(1) select');
    const tokenBSelect = document.querySelector('#create .form-group:nth-child(2) select');

    const selectedOptionA = tokenASelect.options[tokenASelect.selectedIndex];
    const selectedOptionB = tokenBSelect.options[tokenBSelect.selectedIndex];

    const tokenAinputAddress = tokenAddresses[selectedOptionA.value];
    const tokenBinputAddress = tokenAddresses[selectedOptionB.value];

    const createInputs = document.querySelectorAll('#create input[type="number"]');
    const amountInputA = createInputs[0];
    const amountInputB = createInputs[1];

    if (!amountInputA || !amountInputB) {
        console.error("Could not find amount input fields");
        return;
    }

    const tokenAInput = amountInputA.value;
    const tokenBInput = amountInputB.value;

    let amountAtoCreate = ethers.utils.parseUnits(tokenAInput, 18);
    if (selectedOptionA.value === "0xBTC") {
        amountAtoCreate = ethers.utils.parseUnits(tokenAInput, 8);
    }

    await throttledGetSqrtRtAndPriceRatio();

    const ratioz = getRatioz();
    let amountToDeposit, amountWith8Decimals0xBTC;

    if (tokenAinputAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
        console.log("TokenA is 0xBTC, calculating TokenB amount");
        const calculatedPriceRatio = BigInt(ratioz);

        const amountZer0XIn18Decimals = BigInt(amountAtoCreate) * 10n ** 10n;
        amountWith8Decimals0xBTC = amountAtoCreate;

        if (BigInt(Address_ZEROXBTC_TESTNETCONTRACT.toLowerCase()) < BigInt(tokenAddresses['B0x'].toLowerCase())) {
            const priceIn18Decimals = calculatedPriceRatio / (10n ** 10n);
            amountToDeposit = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n);
        } else {
            amountToDeposit = (amountZer0XIn18Decimals * (10n ** 18n)) / (calculatedPriceRatio * 10n ** 10n);
        }

        console.log(`TokenA (0xBTC) amount: ${ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8)}`);
        console.log(`Calculated TokenB (B0x) amount: ${ethers.utils.formatEther(amountToDeposit)}`);
    } else {
        console.log("TokenA is B0x, calculating TokenB amount");
        const priceRatio = BigInt(ratioz);
        amountToDeposit = BigInt(amountAtoCreate);

        if (BigInt(Address_ZEROXBTC_TESTNETCONTRACT.toLowerCase()) < BigInt(tokenAddresses['B0x'].toLowerCase())) {
            amountWith8Decimals0xBTC = (amountToDeposit * (10n ** 18n)) / priceRatio;
        } else {
            amountWith8Decimals0xBTC = (amountToDeposit * priceRatio) / (10n ** 18n);
        }

        console.log(`TokenA (B0x) amount: ${ethers.utils.formatEther(amountToDeposit)}`);
        console.log(`Calculated TokenB (0xBTC) amount: ${ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8)}`);
    }

    // Wallet balance checks
    const walletBalances = getWalletBalances();
    const zeroxbtcdecimal = amountWith8Decimals0xBTC.toString();
    const wallet_zeroxbtc = ethers.utils.parseUnits(walletBalances['0xBTC'], 8).toString();

    if (parseFloat(zeroxbtcdecimal) > parseFloat(wallet_zeroxbtc)) {
        alert("Too much 0xBTC - you don't have enough, lower the amount!");
        if (typeof window.getMaxCreatePosition === 'function') {
            await window.getMaxCreatePosition();
        }
        return;
    }

    const b0xdecimal = amountToDeposit.toString();
    const wallet_b0x = ethers.utils.parseUnits(walletBalances['B0x'], 18).toString();

    if (parseFloat(b0xdecimal) > parseFloat(wallet_b0x)) {
        alert("Too much B0x - you don't have enough, lower the amount!");
        if (typeof window.getMaxCreatePosition === 'function') {
            await window.getMaxCreatePosition();
        }
        return;
    }

    const amountToDepositBN = ethers.BigNumber.from(amountToDeposit.toString());
    const amountToDepositBN2 = ethers.BigNumber.from(amountWith8Decimals0xBTC.toString());

    try {
        if (tokenAinputAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
            amountInputA.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
            amountInputB.value = ethers.utils.formatUnits(amountToDeposit, 18);
        } else {
            amountInputA.value = ethers.utils.formatUnits(amountToDeposit, 18);
            amountInputB.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
        }

        ratiozToSave = 10000 * amountToDepositBN / amountToDepositBN2;

    } catch (error) {
        console.error(`Error in getRatioCreatePositiontokenA:`, error);
    }
}

// ============================================
// INCREASE POSITION RATIO FUNCTIONS
// ============================================

/**
 * Calculate ratio when Token B input changes in increase position section
 * @async
 * @returns {Promise<void>}
 */
async function getRatioIncreasePositiontokenB() {
    console.log("running: getRatioIncreasePositiontokenB");

    const walletConnected = getWalletConnected();
    if (!walletConnected) {
        await connectWallet();
    }

    isProgrammaticUpdate = true;

    const tokenALabel = document.querySelector('#increase #tokenALabel');
    const tokenBLabel = document.querySelector('#increase #tokenBLabel');
    const tokenAInput = document.querySelector('#increase #tokenAAmount');
    const tokenBInput = document.querySelector('#increase #tokenBAmount');

    const tokenAValue = tokenALabel.textContent;
    const tokenBValue = tokenBLabel.textContent;

    console.log("Currently selected value TokenA:", tokenAValue);
    console.log("Currently selected value TokenB:", tokenBValue);

    const tokenAAmount = tokenAInput ? tokenAInput.value : '0';
    const tokenBAmount = tokenBInput ? tokenBInput.value : '0';

    console.log("Token A Amount:", tokenAAmount);
    console.log("Token B Amount:", tokenBAmount);

    const tokenAinputAddress = tokenAddresses[tokenAValue];
    const tokenBinputAddress = tokenAddresses[tokenBValue];

    const createInputs = document.querySelectorAll('#increase input[type="number"]');
    const amountInputA = createInputs[0];
    const amountInputB = createInputs[1];

    if (!amountInputA || !amountInputB) {
        console.error("Could not find amount input fields");
        return;
    }

    await throttledGetSqrtRtAndPriceRatio();

    const walletBalances = getWalletBalances();
    const ratioz = getRatioz();

    const result = calculateOptimalAmountsWithTokenBPrioritySTAKESECTIONI(
        tokenAValue, tokenBValue,
        tokenAAmount, tokenBAmount,
        walletBalances, ratioz
    );

    const { amountToDeposit, amountWith8Decimals0xBTC, needsAdjustment, limitingFactor } = result;

    console.log("calculateOptimalAmounts amountToDeposit:", amountToDeposit);
    console.log("calculateOptimalAmounts amountWith8Decimals0xBTC:", amountWith8Decimals0xBTC);
    console.log("calculateOptimalAmounts needsAdjustment:", needsAdjustment);
    console.log("calculateOptimalAmounts limitingFactor:", limitingFactor);

    try {
        const amountToDepositBN = ethers.BigNumber.from(amountToDeposit.toString());
        const amountToDepositBN2 = ethers.BigNumber.from(amountWith8Decimals0xBTC.toString());

        if (tokenAinputAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
            amountInputB.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 18);
            amountInputA.value = ethers.utils.formatUnits(amountToDeposit, 8);
        } else {
            amountInputA.value = ethers.utils.formatUnits(amountToDeposit, 18);
            amountInputB.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
        }

        ratiozToSave = 10000 * amountToDepositBN / amountToDepositBN2;

        if (needsAdjustment) {
            console.log(`Adjusted amounts B due to ${limitingFactor} being limiting factor`);

            const positionSelect = document.querySelector('#increase select');
            const selectedPositionId = positionSelect.value;
            const position = positionData[selectedPositionId];
            console.log("Position Increase: ", position);
            if (position) {
                const label = amountInputB.closest('.form-group').querySelector('label');
                if (label && label.textContent.includes(position.tokenB)) {
                    const currentTokenSymbol = position.tokenB;
                    console.log("Calling handleMaxButtonClick");
                    handleMaxButtonClick(currentTokenSymbol, amountInputB);
                }
            }
        }

        if (typeof updateTotalLiqIncreaseSTAKING === 'function') {
            updateTotalLiqIncreaseSTAKING();
        }

    } catch (error) {
        console.error(`Error in getRatioIncreasePositiontokenB:`, error);
    }

    isProgrammaticUpdate = false;
}

/**
 * Calculate ratio when Token A input changes in increase position section
 * @async
 * @returns {Promise<void>}
 */
async function getRatioIncreasePositiontokenA() {
    console.log("running: getRatioIncreasePositiontokenA");

    const walletConnected = getWalletConnected();
    if (!walletConnected) {
        await connectWallet();
    }

    isProgrammaticUpdate = true;

    const tokenALabel = document.querySelector('#increase #tokenALabel');
    const tokenBLabel = document.querySelector('#increase #tokenBLabel');
    const tokenAInput = document.querySelector('#increase #tokenAAmount');
    const tokenBInput = document.querySelector('#increase #tokenBAmount');

    const tokenAValue = tokenALabel.textContent.trim();
    const tokenBValue = tokenBLabel.textContent.trim();

    console.log("Currently selected value TokenA:", tokenAValue);
    console.log("Currently selected value TokenB:", tokenBValue);

    const tokenAAmount = tokenAInput ? tokenAInput.value : '0';
    const tokenBAmount = tokenBInput ? tokenBInput.value : '0';

    console.log("Token A Amount:", tokenAAmount);
    console.log("Token B Amount:", tokenBAmount);

    const tokenAinputAddress = tokenAddresses[tokenAValue];
    const tokenBinputAddress = tokenAddresses[tokenBValue];

    const createInputs = document.querySelectorAll('#increase input[type="number"]');
    const amountInputA = createInputs[0];
    const amountInputB = createInputs[1];

    if (!amountInputA || !amountInputB) {
        console.error("Could not find amount input fields");
        return;
    }

    await throttledGetSqrtRtAndPriceRatio();

    const walletBalances = getWalletBalances();
    const ratioz = getRatioz();

    const result = calculateOptimalAmountsWithTokenAPriority(
        tokenAValue, tokenBValue,
        tokenAAmount, tokenBAmount,
        walletBalances, ratioz
    );

    const { amountToDeposit, amountWith8Decimals0xBTC, needsAdjustment, limitingFactor } = result;

    console.log("calculateOptimalAmounts amountToDeposit:", amountToDeposit);
    console.log("calculateOptimalAmounts amountWith8Decimals0xBTC:", amountWith8Decimals0xBTC.toString());
    console.log("calculateOptimalAmounts needsAdjustment:", needsAdjustment);
    console.log("calculateOptimalAmounts limitingFactor:", limitingFactor);

    try {
        const amountToDepositBN = ethers.BigNumber.from(amountToDeposit.toString());
        const amountToDepositBN2 = ethers.BigNumber.from(amountWith8Decimals0xBTC.toString());

        if (tokenAinputAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
            amountInputA.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
            amountInputB.value = ethers.utils.formatUnits(amountToDeposit, 18);
        } else {
            amountInputA.value = ethers.utils.formatUnits(amountToDeposit, 18);
            amountInputB.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
        }

        ratiozToSave = 10000 * amountToDepositBN / amountToDepositBN2;

        if (needsAdjustment) {
            console.log(`Adjusted amounts A due to ${limitingFactor} being limiting factor`);

            const positionSelect = document.querySelector('#increase select');
            const selectedPositionId = positionSelect.value;
            const position = positionData[selectedPositionId];
            console.log("Position Increase: ", position);
            if (position) {
                const label = amountInputA.closest('.form-group').querySelector('label');
                if (label && label.textContent.includes(position.tokenA)) {
                    const currentTokenSymbol = position.tokenA;
                    console.log("Calling handleMaxButtonClick");
                    handleMaxButtonClick(currentTokenSymbol, amountInputA);
                }
            }
        }

        updateTotalLiqIncrease();

    } catch (error) {
        console.error(`Error in getRatioIncreasePositiontokenA:`, error);
    }

    isProgrammaticUpdate = false;
}

// ============================================
// STAKE INCREASE RATIO FUNCTIONS
// ============================================

/**
 * Calculate ratio when Token B input changes in stake increase section
 * @async
 * @returns {Promise<void>}
 */
async function getRatioStakeIncreasePositiontokenB() {
    console.log("running: getRatioStakeIncreasePositiontokenB");

    const walletConnected = getWalletConnected();
    if (!walletConnected) {
        await connectWallet();
    }

    isProgrammaticUpdate = true;

    const tokenALabel = document.querySelector('#stake-increase #tokenALabelINC');
    const tokenBLabel = document.querySelector('#stake-increase #tokenBLabelINC');
    const tokenAInput = document.querySelector('#stake-increase #tokenAAmount');
    const tokenBInput = document.querySelector('#stake-increase #tokenBAmount');

    const tokenAValue = tokenALabel.textContent;
    const tokenBValue = tokenBLabel.textContent;

    console.log("Currently selected value TokenA:", tokenAValue);
    console.log("Currently selected value TokenB:", tokenBValue);

    const tokenAAmount = tokenAInput ? tokenAInput.value : '0';
    const tokenBAmount = tokenBInput ? tokenBInput.value : '0';

    console.log("Token A Amount:", tokenAAmount);
    console.log("Token B Amount:", tokenBAmount);

    const tokenAinputAddress = tokenAddresses[tokenAValue];
    const tokenBinputAddress = tokenAddresses[tokenBValue];

    const createInputs = document.querySelectorAll('#stake-increase input[type="number"]');
    const amountInputA = createInputs[0];
    const amountInputB = createInputs[1];

    if (!amountInputA || !amountInputB) {
        console.error("Could not find amount input fields");
        return;
    }

    await throttledGetSqrtRtAndPriceRatio();

    const walletBalances = getWalletBalances();
    const ratioz = getRatioz();

    const result = calculateOptimalAmountsWithTokenBPrioritySTAKESECTIONI(
        tokenAValue, tokenBValue,
        tokenAAmount, tokenBAmount,
        walletBalances, ratioz
    );

    const { amountToDeposit, amountWith8Decimals0xBTC, needsAdjustment, limitingFactor } = result;

    console.log("calculateOptimalAmounts amountToDeposit:", amountToDeposit);
    console.log("calculateOptimalAmounts amountWith8Decimals0xBTC:", amountWith8Decimals0xBTC);
    console.log("calculateOptimalAmounts needsAdjustment:", needsAdjustment);
    console.log("calculateOptimalAmounts limitingFactor:", limitingFactor);

    try {
        const amountToDepositBN = ethers.BigNumber.from(amountToDeposit.toString());
        const amountToDepositBN2 = ethers.BigNumber.from(amountWith8Decimals0xBTC.toString());

        if (tokenBinputAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
            amountInputA.value = ethers.utils.formatUnits(amountToDeposit, 18);
            amountInputB.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
        } else {
            amountInputA.value = ethers.utils.formatUnits(amountToDeposit, 18);
            amountInputB.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
        }

        ratiozToSave = 10000 * amountToDepositBN / amountToDepositBN2;

        if (needsAdjustment) {
            console.log(`Adjusted amounts due to ${limitingFactor} being limiting factor`);

            const positionSelect = document.querySelector('#stake-increase select');
            const selectedPositionId = positionSelect.value;
            const position = stakingPositionData[selectedPositionId];
            console.log("Position Stake Increase: ", position);
            if (position) {
                const label = amountInputB.closest('.form-group').querySelector('label');
                if (label && label.textContent.includes(position.tokenB)) {
                    const currentTokenSymbol = position.tokenB;
                    console.log("Worked");
                    handleMaxButtonClickStakeIncrease(currentTokenSymbol, amountInputB);
                }
            }
        }

        if (typeof updateTotalLiqIncreaseSTAKING === 'function') {
            updateTotalLiqIncreaseSTAKING();
        }

    } catch (error) {
        console.error(`Error in getRatioStakeIncreasePositiontokenB:`, error);
    }

    isProgrammaticUpdate = false;
}

/**
 * Calculate ratio when Token A input changes in stake increase section
 * @async
 * @returns {Promise<void>}
 */
async function getRatioStakeIncreasePositiontokenA() {
    console.log("running: getRatioStakeIncreasePositiontokenA");

    const walletConnected = getWalletConnected();
    if (!walletConnected) {
        await connectWallet();
    }

    isProgrammaticUpdate = true;

    const tokenALabel = document.querySelector('#stake-increase #tokenALabelINC');
    const tokenBLabel = document.querySelector('#stake-increase #tokenBLabelINC');
    const tokenAInput = document.querySelector('#stake-increase #tokenAAmount');
    const tokenBInput = document.querySelector('#stake-increase #tokenBAmount');

    const tokenAValue = tokenALabel.textContent;
    const tokenBValue = tokenBLabel.textContent;

    console.log("Currently selected value TokenA:", tokenAValue);
    console.log("Currently selected value TokenB:", tokenBValue);

    const tokenAAmount = tokenAInput ? tokenAInput.value : '0';
    const tokenBAmount = tokenBInput ? tokenBInput.value : '0';

    console.log("Token A Amount:", tokenAAmount);
    console.log("Token B Amount:", tokenBAmount);

    const tokenAinputAddress = tokenAddresses[tokenAValue];
    const tokenBinputAddress = tokenAddresses[tokenBValue];

    const createInputs = document.querySelectorAll('#stake-increase input[type="number"]');
    const amountInputA = createInputs[0];
    const amountInputB = createInputs[1];

    if (!amountInputA || !amountInputB) {
        console.error("Could not find amount input fields");
        return;
    }

    await throttledGetSqrtRtAndPriceRatio();

    const walletBalances = getWalletBalances();
    const ratioz = getRatioz();

    const result = calculateOptimalAmountsWithTokenAPrioritySTAKESECTIONI(
        tokenAValue, tokenBValue,
        tokenAAmount, tokenBAmount,
        walletBalances, ratioz
    );

    const { amountToDeposit, amountWith8Decimals0xBTC, needsAdjustment, limitingFactor } = result;

    console.log("calculateOptimalAmounts amountToDeposit:", amountToDeposit);
    console.log("calculateOptimalAmounts amountWith8Decimals0xBTC:", amountWith8Decimals0xBTC);
    console.log("calculateOptimalAmounts needsAdjustment:", needsAdjustment);
    console.log("calculateOptimalAmounts limitingFactor:", limitingFactor);

    try {
        const amountToDepositBN = ethers.BigNumber.from(amountToDeposit.toString());
        const amountToDepositBN2 = ethers.BigNumber.from(amountWith8Decimals0xBTC.toString());

        if (tokenAinputAddress === Address_ZEROXBTC_TESTNETCONTRACT) {
            amountInputB.value = ethers.utils.formatUnits(amountToDeposit, 18);
            amountInputA.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
        } else {
            amountInputB.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
            amountInputA.value = ethers.utils.formatUnits(amountToDeposit, 18);
        }

        ratiozToSave = 10000 * amountToDepositBN / amountToDepositBN2;

        if (needsAdjustment) {
            console.log(`Adjusted amounts due to ${limitingFactor} being limiting factor`);

            const positionSelect = document.querySelector('#stake-increase select');
            const selectedPositionId = positionSelect.value;
            const position = stakingPositionData[selectedPositionId];
            console.log("Position Stake Increase: ", position);
            if (position) {
                const label = amountInputA.closest('.form-group').querySelector('label');
                if (label && label.textContent.includes(position.tokenB)) {
                    const currentTokenSymbol = position.tokenB;
                    console.log("Worked");
                    handleMaxButtonClickStakeIncrease(currentTokenSymbol, amountInputB);
                }
            }
        }

        if (typeof updateTotalLiqIncreaseSTAKING === 'function') {
            updateTotalLiqIncreaseSTAKING();
        }

    } catch (error) {
        console.error(`Error in getRatioStakeIncreasePositiontokenA:`, error);
    }

    isProgrammaticUpdate = false;
}

// ============================================
// MAX CREATE POSITION FUNCTION
// ============================================

/**
 * Get maximum amounts for create position based on wallet balances
 * Calculates optimal token amounts and updates input fields
 * @returns {Promise<void>}
 */
export async function getMaxCreatePosition() {
    const maxCreatedWhen = Date.now(); // Save current timestamp in milliseconds

    if (!getWalletConnected()) {
        await connectWallet();
    }

    const tokenASelect = document.querySelector('#create .form-group:nth-child(1) select');
    const tokenBSelect = document.querySelector('#create .form-group:nth-child(2) select');

    // Get the currently selected values
    const tokenAValue = tokenASelect.value;
    const tokenBvalue = tokenBSelect.value;
    console.log("Currently selected value TokenA:", tokenAValue);
    console.log("Currently selected value TokenB:", tokenBvalue);

    // Get the selected option elements
    const selectedOptionA = tokenASelect.options[tokenASelect.selectedIndex];
    const selectedOptionB = tokenBSelect.options[tokenBSelect.selectedIndex];
    console.log("selectedOptionA option text:", selectedOptionA.text);
    console.log("selectedOptionA option value:", selectedOptionA.value);
    console.log("selectedOptionB option text:", selectedOptionB.text);
    console.log("selectedOptionB option value:", selectedOptionB.value);

    var tokenAinputAddress = tokenAddresses[selectedOptionA.value];
    var tokenBinputAddress = tokenAddresses[selectedOptionB.value];
    console.log("tokenA InputAddresstoken", tokenAinputAddress);
    console.log("tokenB InputAddresstoken", tokenBinputAddress);

    // Simple and reliable approach - select all number inputs in create page
    const createInputs = document.querySelectorAll('#create input[type="number"]');
    const amountInputA = createInputs[0]; // First number input (Amount A)
    const amountInputB = createInputs[1]; // Second number input (Amount B)

    // Add null checks to prevent errors
    if (!amountInputA || !amountInputB) {
        console.error("Could not find amount input fields");
        return;
    }

    // Get the currently selected values
    const tokenAInput = amountInputA.value;
    const tokenBInput = amountInputB.value;

    console.log("Currently amountInputA value:", tokenAInput);
    console.log("Currently amountInputB value:", tokenBInput);

    const walletBalances = getWalletBalances();
    var amountAtoCreate = 0;

    if (selectedOptionA.value == "0xBTC") {
        console.log("LOGGED 0xBTC selected A Value, getMaxCreate");
        amountAtoCreate = ethers.utils.parseUnits(walletBalances['0xBTC'], 8);
    } else {
        amountAtoCreate = ethers.utils.parseUnits(walletBalances['B0x'], 18);
    }

    var amountBtoCreate = 0;

    if (selectedOptionB.value == "0xBTC") {
        console.log("LOGGED 0xBTC selected B Value, getMaxCreate");
        amountBtoCreate = ethers.utils.parseUnits(walletBalances['0xBTC'], 8);
    } else {
        amountBtoCreate = ethers.utils.parseUnits(walletBalances['B0x'], 18);
    }

    let amountOut = 0;
    await throttledGetSqrtRtAndPriceRatio();

    let amountToDeposit = ethers.utils.parseEther("200");  // 200 * 10^18 for B0x token
    var amountToDepositOfZer0X = ethers.utils.parseUnits("100", 8); // 0.01 * 10^8 for 0xBTC
    var amountWith8Decimals0xBTC = 0n;
    let liquiditySalt = 0;

    const ratioz = getRatioz();

    if (tokenAinputAddress == Address_ZEROXBTC_TESTNETCONTRACT) {
        // TokenB is 0xBTC, calculate how much TokenA (B0x) is needed
        console.log("TokenA is 0xBTC, calculating TokenB amount");

        const calculatedPriceRatio = BigInt(ratioz);
        var priceIn18Decimals = 0n;
        if (BigInt(Address_ZEROXBTC_TESTNETCONTRACT.toLowerCase()) > BigInt(tokenAddresses['B0x'].toLowerCase())) {
            // INVERTED: Use division instead of multiplication
            priceIn18Decimals = (10n ** 36n) / (calculatedPriceRatio * (10n ** 10n)); // Invert the ratio
            const amountZer0XIn18Decimals = BigInt(amountAtoCreate) * 10n ** 10n;
            amountToDeposit = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n);
            console.log("0xBTC bigger than b0x.  b0x smaller than 0xBTC");
        } else {
            // 0xBTC > B0x: Use direct multiplication instead of complex inversion
            const amountZer0XIn18Decimals = BigInt(amountAtoCreate) * 10n ** 10n;
            priceIn18Decimals = calculatedPriceRatio / (10n ** 10n); // Convert 29 decimals to 18 decimals (29-18=11)
            amountToDeposit = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n); // Standard division
            console.log("B0x bigger than 0xBTC. 0xBTC smaller than B0x");
        }

        amountWith8Decimals0xBTC = amountAtoCreate;

        console.log(`fTokenA (0xBTC) amount: ${ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8)}`);
        console.log(`fCalculated TokenB (B0x) amount: ${ethers.utils.formatEther(amountToDeposit)}`);

    } else {
        // Start with b0x amount (this could be user input or calculated value)
        var amountB0x = BigInt(amountAtoCreate); // Your b0x input
        console.log("Amount B0x input: ", amountB0x.toString());
        const priceRatio2 = BigInt(ratioz);
        console.log(`priceRatio: ${priceRatio2}`);

        // Apply the same address comparison logic for ratio handling
        var adjustedPriceRatio = 0n;
        if (BigInt(Address_ZEROXBTC_TESTNETCONTRACT.toLowerCase()) > BigInt(tokenAddresses['B0x'].toLowerCase())) {
            adjustedPriceRatio = (10n ** 36n) / (priceRatio2 * (10n ** 10n)); // Invert the ratio
            amountAtoCreate = (amountB0x * (10n ** 18n)) / adjustedPriceRatio / (10n ** 10n); // Divide by 10^10 to convert from 18 to 8 decimals

            console.log("22 0xBTC bigger than b0x.  b0x smaller than 0xBTC");
        } else {
            const b0xInput = BigInt(amountAtoCreate); // Your B0x input
            const priceRatio = BigInt(ratioz);

            console.log("22 B0x bigger than 0xBTC. 0xBTC smaller than B0x");
            console.log(`B0x input: ${b0xInput}`);
            console.log(`Price ratio: ${priceRatio}`);

            // Calculate 0xBTC needed from B0x amount
            // Formula: 0xBTC = B0x / price_ratio
            // Since priceRatio is in 29 decimals, and B0x is in 18 decimals
            amountB0x = (b0xInput * 10n ** 28n) / priceRatio / 10n ** 10n; // Convert to 8 decimals for 0xBTC

            // Keep the original B0x amount
            amountAtoCreate = b0xInput;

            console.log(`Calculated 0xBTC: ${amountB0x}`);
            console.log(`Original B0x: ${amountAtoCreate}`);

            var temp = amountB0x;
            amountB0x = amountAtoCreate;
            amountAtoCreate = temp;
        }

        console.log(`Adjusted Price ratio: ${adjustedPriceRatio}`);
        console.log(`Estimated Deposit 0xBTC amount: ${amountAtoCreate}`);
        console.log(`Estimated Deposit B0x amount: ${amountB0x}`);
        console.log(`Estimated Deposit 0xBTC amount: ${ethers.utils.formatUnits(amountAtoCreate, 8)}`);
        console.log(`Estimated Deposit B0x amount: ${ethers.utils.formatEther(amountB0x)}`);
        amountToDeposit = amountB0x;
        amountWith8Decimals0xBTC = amountAtoCreate;
    }

    console.log("walletBalances: ", walletBalances['0xBTC']);
    var zeroxbtcdecimal = amountWith8Decimals0xBTC.toString();
    var wallet_zeroxbtc = ethers.utils.parseUnits(walletBalances['0xBTC'], 8).toString();
    console.log("amountWith8Decimals0xBTC: ", zeroxbtcdecimal);
    console.log("wallet_zeroxbtc: ", wallet_zeroxbtc);
    const calculatedPriceRatio = BigInt(ratioz);

    if (parseFloat(zeroxbtcdecimal) > parseFloat(wallet_zeroxbtc)) {
        console.log("too much 0xbtc u dont have lower it!.");

        // If you're starting with 0xBTC amount and want to calculate B0x needed:
        amountWith8Decimals0xBTC = BigInt(wallet_zeroxbtc); // 0xBTC amount (8 decimals)

        console.log("Amount 0xBTC to use: ", amountWith8Decimals0xBTC.toString());
        const priceRatio = BigInt(ratioz);
        console.log(`priceRatio: ${priceRatio}`);

        if (BigInt(Address_ZEROXBTC_TESTNETCONTRACT.toLowerCase()) > BigInt(tokenAddresses['B0x'].toLowerCase())) {
            // INVERTED: Use division instead of multiplication
            priceIn18Decimals = (10n ** 36n) / (calculatedPriceRatio * (10n ** 10n)); // Invert the ratio
            const amountZer0XIn18Decimals = BigInt(amountWith8Decimals0xBTC) * 10n ** 10n;
            amountToDeposit = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n);
            console.log("0xBTC bigger than b0x.  b0x smaller than 0xBTC");
        } else {
            // 0xBTC > B0x: Use direct multiplication instead of complex inversion
            const amountZer0XIn18Decimals = BigInt(amountWith8Decimals0xBTC) * 10n ** 10n;
            priceIn18Decimals = calculatedPriceRatio / (10n ** 10n); // Convert 29 decimals to 18 decimals (29-18=11)
            amountToDeposit = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n); // Standard division
            console.log("B0x bigger than 0xBTC. 0xBTC smaller than B0x");
        }
    }

    var b0xdecimal = amountToDeposit.toString();
    var wallet_b0x = ethers.utils.parseUnits(walletBalances['B0x'], 18).toString();
    console.log("amountWith b0xdecimal:  ", b0xdecimal);
    console.log("wallet_b0x: ", wallet_b0x);

    if (parseFloat(b0xdecimal) > parseFloat(wallet_b0x)) {
        console.log("too much b0x u dont have lower it!.");
        console.log(`Found valid Ratio: ${ratioz.toString()}`);
        console.log("Using available B0x balance to calculate 0xBTC needed");

        // Start with available B0x amount (18 decimals)
        amountToDeposit = BigInt(wallet_b0x); // B0x amount (18 decimals)
        console.log("Available B0x amount to use: ", amountToDeposit.toString());

        const priceRatio = BigInt(ratioz);
        console.log(`priceRatio: ${priceRatio}`);

        var amountB0x = amountToDeposit; // Your b0x input
        console.log("Amount B0x input: ", amountB0x.toString());
        const priceRatio2 = BigInt(ratioz);
        console.log(`priceRatio: ${priceRatio2}`);

        // Apply the same address comparison logic for ratio handling
        var adjustedPriceRatio = 0n;
        if (BigInt(Address_ZEROXBTC_TESTNETCONTRACT.toLowerCase()) > BigInt(tokenAddresses['B0x'].toLowerCase())) {
            adjustedPriceRatio = (10n ** 36n) / (priceRatio2 * (10n ** 10n)); // Invert the ratio
            amountAtoCreate = (amountB0x * (10n ** 18n)) / adjustedPriceRatio / (10n ** 10n); // Divide by 10^10 to convert from 18 to 8 decimals

            console.log("22 0xBTC bigger than b0x.  b0x smaller than 0xBTC");

            amountWith8Decimals0xBTC = amountAtoCreate;

        } else {
            const b0xInput = BigInt(wallet_b0x); // Your B0x input
            const priceRatio = BigInt(ratioz);

            console.log("22 B0x bigger than 0xBTC. 0xBTC smaller than B0x");
            console.log(`B0x input: ${b0xInput}`);
            console.log(`Price ratio: ${priceRatio}`);

            // Calculate 0xBTC needed from B0x amount
            // Formula: 0xBTC = B0x / price_ratio
            // Since priceRatio is in 29 decimals, and B0x is in 18 decimals
            amountB0x = (b0xInput * 10n ** 28n) / priceRatio / 10n ** 10n; // Convert to 8 decimals for 0xBTC

            // Keep the original B0x amount
            amountAtoCreate = b0xInput;

            console.log(`Calculated 0xBTC: ${amountB0x}`);
            console.log(`Original B0x: ${amountAtoCreate}`);

            amountWith8Decimals0xBTC = amountB0x;
        }

        console.log(`Estimated Deposit B0x amount: ${ethers.utils.formatEther(amountToDeposit)}`);
        console.log(`Estimated Deposit 0xBTC amount: ${ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8)}`);
        console.log(`B0x amount raw: ${amountToDeposit}`);
        console.log(`0xBTC amount raw: ${amountWith8Decimals0xBTC}`);
    }

    const amountToDepositBN = ethers.BigNumber.from(amountToDeposit.toString());
    const amountToDepositBN2 = ethers.BigNumber.from(amountWith8Decimals0xBTC.toString());

    try {
        console.log("tokenAddress: ", tokenAddress);
        console.log("Address_ZEROXBTC_TESTNETCONTRACT: ", Address_ZEROXBTC_TESTNETCONTRACT.toString());
        console.log("amountToDepositBN: ", amountToDepositBN.toString());
        console.log("amountToDepositBN2: ", amountToDepositBN2.toString());
        console.log("Current_getsqrtPricex96: ", getCurrentSqrtPricex96().toString());
        console.log("HookAddress: ", HookAddress.toString());

        if (tokenAinputAddress == Address_ZEROXBTC_TESTNETCONTRACT) {
            console.log("Check this out: ");
            console.log("Check this out amountToDeposit: ", amountToDeposit);
            console.log("Check this out amountWith8Decimals0xBTC: ", amountWith8Decimals0xBTC);
            amountInputB.value = ethers.utils.formatUnits(amountToDeposit, 18);
            amountInputA.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
            console.log("THISRIGHT HUR");
            ratiozToSave = 10 ** 16 * amountInputB.value / amountInputA.value;
        } else {
            amountInputB.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
            amountInputA.value = ethers.utils.formatUnits(amountToDeposit, 18);
            ratiozToSave = 10 ** 16 / amountInputB.value / amountInputA.value;
        }

    } catch (error) {
        console.error(`Error in getMaxCreatePosition:`, error);
    }
}

// ============================================
// CREATE POSITION
// ============================================

/**
 * Helper to disable button with spinner
 * @param {string} ID - Button element ID
 * @param {string} msg - Message to display
 */
function disableButtonWithSpinner(ID, msg = '<span class="spinner"></span> Approve transactions in wallet...') {
    const btn = document.getElementById(ID);
    if (!btn) {
        console.error(`Button with ID '${ID}' not found`);
        return;
    }
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
 * Helper to enable button and restore original text
 * @param {string} ID - Button element ID
 * @param {string|null} originalText - Text to restore (optional)
 */
function enableButton(ID, originalText = null) {
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
    btn.classList.remove('btn-disabled-spinner');
}

/**
 * Helper function for retry with exponential backoff
 */
async function retryWithBackoffRatio(fn, maxRetries = 5, baseDelay = 2000) {
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
 * Helper to approve token if needed (with retry logic for rate limiting)
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

    const currentAllowance = await retryWithBackoffRatio(async () => {
        return await tokenContract.allowance(window.userAddress, spenderAddress);
    });

    if (currentAllowance.lt(requiredAmount)) {
        console.log(`Approving ${tokenToApprove} for ${spenderAddress}`);
        const approveTx = await retryWithBackoffRatio(async () => {
            return await tokenContract.approve(spenderAddress, ethers.constants.MaxUint256);
        });
        await approveTx.wait();
        console.log("Approval successful");
    } else {
        console.log("Sufficient allowance already exists");
    }
}

/**
 * Creates a new liquidity position with two tokens
 * @async
 * @returns {Promise<void>}
 */
export async function getCreatePosition() {
    if (!getWalletConnected()) {
        await connectWallet();
    }
    disableButtonWithSpinner('getCreatePositionBtn');

    var selectSlippage = document.getElementById('slippageToleranceCreate');
    var selectSlippageValue = selectSlippage.value;
    const numberValueSlippage = parseFloat(selectSlippageValue.replace('%', ''));
    const decimalValueSlippage = numberValueSlippage / 100;
    console.log("selectSlippageValue: ", selectSlippageValue);
    console.log("decimalValueSlippage: ", decimalValueSlippage);

    const tokenASelect = document.querySelector('#create .form-group:nth-child(1) select');
    const tokenAValue = tokenASelect.value;
    console.log("Currently selected value TokenA:", tokenAValue);

    const tokenBSelect = document.querySelector('#create .form-group:nth-child(2) select');
    const tokenBvalue = tokenBSelect.value;
    console.log("Currently selected value TokenB:", tokenBvalue);

    const selectedOptionA = tokenASelect.options[tokenASelect.selectedIndex];
    const selectedOptionB = tokenBSelect.options[tokenBSelect.selectedIndex];
    console.log("selectedOptionA option text:", selectedOptionA.text);
    console.log("selectedOptionA option value:", selectedOptionA.value);
    console.log("selectedOptionB option text:", selectedOptionB.text);
    console.log("selectedOptionB option value:", selectedOptionB.value);

    var tokenAinputAddress = tokenAddresses[selectedOptionA.value];
    var tokenBinputAddress = tokenAddresses[selectedOptionB.value];
    console.log("tokenA InputAddresstoken", tokenAinputAddress);
    console.log("tokenB InputAddresstoken", tokenBinputAddress);

    const createInputs = document.querySelectorAll('#create input[type="number"]');
    const amountInputA = createInputs[0];
    const amountInputB = createInputs[1];

    if (!amountInputA || !amountInputB) {
        console.error("Could not find amount input fields");
        enableButton('getCreatePositionBtn', 'Create Position');
        return;
    }

    const tokenAInput = amountInputA.value;
    const tokenBInput = amountInputB.value;

    console.log("Currently amountInputA value:", tokenAInput);
    console.log("Currently amountInputB value:", tokenBInput);

    var amountAtoCreate = ethers.utils.parseUnits(tokenAInput, 18);

    if (selectedOptionA.value == "0xBTC") {
        console.log("LOGGED 0xBTC selected A Value, createPosition");
        amountAtoCreate = ethers.utils.parseUnits(tokenAInput, 8);
    }

    console.log("Currently amountInputB value:", tokenBInput);
    var amountBtoCreate = ethers.utils.parseUnits(tokenBInput, 18);

    if (selectedOptionB.value == "0xBTC") {
        console.log("LOGGED 0xBTC selected B Value, createPosition");
        amountBtoCreate = ethers.utils.parseUnits(tokenBInput, 8);
    }

    let amountOut = 0;
    await throttledGetSqrtRtAndPriceRatio();

    const ratioz = getRatioz();
    const walletBalances = getWalletBalances();

    let amountToDeposit = ethers.utils.parseEther("200");
    var amountToDepositOfZer0X = ethers.utils.parseUnits("100", 8);
    var amountWith8Decimals0xBTC = 0n;
    let liquiditySalt = 0;

    if (tokenAinputAddress == Address_ZEROXBTC_TESTNETCONTRACT) {
        console.log("TokenA is 0xBTC, calculating TokenB amount");
        const calculatedPriceRatio = BigInt(ratioz);
        var priceIn18Decimals = 0n;
        if (BigInt(Address_ZEROXBTC_TESTNETCONTRACT.toLowerCase()) > BigInt(tokenAddresses['B0x'].toLowerCase())) {
            priceIn18Decimals = (10n ** 36n) / (calculatedPriceRatio * (10n ** 10n));
            const amountZer0XIn18Decimals = BigInt(amountAtoCreate) * 10n ** 10n;
            amountToDeposit = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n);
            console.log("0xBTC bigger than b0x.  b0x smaller than 0xBTC");
        } else {
            const amountZer0XIn18Decimals = BigInt(amountAtoCreate) * 10n ** 10n;
            priceIn18Decimals = calculatedPriceRatio / (10n ** 10n);
            amountToDeposit = (amountZer0XIn18Decimals * priceIn18Decimals) / (10n ** 18n);
            console.log("B0x bigger than 0xBTC. 0xBTC smaller than B0x");
        }
        amountWith8Decimals0xBTC = amountAtoCreate;
        console.log(`fTokenA (0xBTC) amount: ${ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8)}`);
        console.log(`fCalculated TokenB (B0x) amount: ${ethers.utils.formatEther(amountToDeposit)}`);
    } else {
        var amountB0x = BigInt(amountAtoCreate);
        console.log("Amount B0x input: ", amountB0x.toString());
        const priceRatio2 = BigInt(ratioz);
        console.log(`priceRatio: ${priceRatio2}`);

        var adjustedPriceRatio = 0n;
        if (BigInt(Address_ZEROXBTC_TESTNETCONTRACT.toLowerCase()) > BigInt(tokenAddresses['B0x'].toLowerCase())) {
            adjustedPriceRatio = (10n ** 36n) / (priceRatio2 * (10n ** 10n));
            amountAtoCreate = (amountB0x * (10n ** 18n)) / adjustedPriceRatio / (10n ** 10n);
            console.log("22 0xBTC bigger than b0x.  b0x smaller than 0xBTC");
        } else {
            const b0xInput = BigInt(amountAtoCreate);
            const priceRatio = BigInt(ratioz);
            console.log("22 B0x bigger than 0xBTC. 0xBTC smaller than B0x");
            console.log(`B0x input: ${b0xInput}`);
            console.log(`Price ratio: ${priceRatio}`);
            amountB0x = (b0xInput * 10n ** 28n) / priceRatio / 10n ** 10n;
            amountAtoCreate = b0xInput;
            console.log(`Calculated 0xBTC: ${amountB0x}`);
            console.log(`Original B0x: ${amountAtoCreate}`);
        }
        amountWith8Decimals0xBTC = amountB0x;
        amountToDeposit = amountAtoCreate;
    }

    console.log("walletBalances: ", walletBalances['0xBTC']);
    var zeroxbtcdecimal = amountWith8Decimals0xBTC.toString();
    var wallet_zeroxbtc = ethers.utils.parseUnits(walletBalances['0xBTC'], 8).toString();
    console.log("amountWith8Decimals0xBTC: ", zeroxbtcdecimal);
    console.log("wallet_zeroxbtc: ", wallet_zeroxbtc);
    if (parseFloat(zeroxbtcdecimal) > parseFloat(wallet_zeroxbtc)) {
        alert("too much 0xbtc u dont have lower it!.");
        await getMaxCreatePosition();
        enableButton('getCreatePositionBtn', 'Create Position');
        return;
    }

    var b0xdecimal = amountToDeposit.toString();
    var wallet_b0x = ethers.utils.parseUnits(walletBalances['B0x'], 18).toString();
    console.log("amountWith b0xdecimal:  ", b0xdecimal);
    console.log("wallet_b0x: ", wallet_b0x);

    if (parseFloat(b0xdecimal) > parseFloat(wallet_b0x)) {
        alert("too much b0x u dont have lower it!.");
        await getMaxCreatePosition();
        enableButton('getCreatePositionBtn', 'Create Position');
        return;
    }

    const amountToDepositBN = ethers.BigNumber.from(amountToDeposit.toString());
    const amountToDepositBN2 = ethers.BigNumber.from(amountWith8Decimals0xBTC.toString());

    const tokenSwapperABI = [
        { "inputs": [{ "name": "token", "type": "address" }, { "name": "token2", "type": "address" }, { "name": "amountIn", "type": "uint256" }, { "name": "amountIn2", "type": "uint256" }, { "name": "currentx96", "type": "uint256" }, { "name": "slippage", "type": "uint256" }, { "name": "hookAddress", "type": "address" }, { "name": "toSendNFTto", "type": "address" }], "name": "createPositionWith2Tokens", "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "payable", "type": "function" },
        { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "address", "name": "token2", "type": "address" }, { "internalType": "address", "name": "hookAddress", "type": "address" }], "name": "getsqrtPricex96", "outputs": [{ "internalType": "uint160", "name": "", "type": "uint160" }], "stateMutability": "view", "type": "function" },
        {
            "inputs": [
                { "internalType": "address", "name": "token", "type": "address" },
                { "internalType": "address", "name": "token2", "type": "address" },
                { "internalType": "address", "name": "hookAddress", "type": "address" }
            ],
            "name": "getPriceRatio",
            "outputs": [
                { "internalType": "uint256", "name": "ratio", "type": "uint256" },
                { "internalType": "address", "name": "token0z", "type": "address" },
                { "internalType": "address", "name": "token1z", "type": "address" },
                { "internalType": "uint8", "name": "token0decimals", "type": "uint8" },
                { "internalType": "uint8", "name": "token1decimals", "type": "uint8" }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    const tokenSwapperContract = new ethers.Contract(
        contractAddress_Swapper,
        tokenSwapperABI,
        window.signer
    );

    try {
        console.log("tokenAddress: ", tokenAddress);
        console.log("Address_ZEROXBTC_TESTNETCONTRACT: ", Address_ZEROXBTC_TESTNETCONTRACT.toString());
        console.log("amountToDepositBN: ", amountToDepositBN.toString());
        console.log("amountToDepositBN2: ", amountToDepositBN2.toString());
        console.log("Current_getsqrtPricex96: ", getCurrentSqrtPricex96().toString());
        console.log("HookAddress: ", HookAddress.toString());

        alert("approving tokens for create position!");
        await approveIfNeeded(tokenAddress, contractAddress_Swapper, amountToDepositBN);
        await approveIfNeeded(Address_ZEROXBTC_TESTNETCONTRACT, contractAddress_Swapper, amountToDepositBN2);

        var slippage = Math.floor(numberValueSlippage * 100);
        console.log("Slippage = ", slippage);
        console.log("Slippage % = ", (slippage / 100), "%");

        showInfoNotification('Confirm Create Position', 'Confirm the create position transaction in your wallet');
        const tx = await tokenSwapperContract.createPositionWith2Tokens(
            tokenAddress,
            Address_ZEROXBTC_TESTNETCONTRACT,
            amountToDepositBN,
            amountToDepositBN2,
            getCurrentSqrtPricex96(),
            slippage,
            HookAddress,
            window.userAddress
        );

        if (tokenAinputAddress == Address_ZEROXBTC_TESTNETCONTRACT) {
            amountInputB.value = ethers.utils.formatUnits(amountToDeposit, 18);
            amountInputA.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
        } else {
            amountInputB.value = ethers.utils.formatUnits(amountWith8Decimals0xBTC, 8);
            amountInputA.value = ethers.utils.formatUnits(amountToDeposit, 18);
        }

        showInfoNotification();
        await tx.wait();
        console.log("Transaction confirmed!");
        showSuccessNotification('Create Position!', 'Transaction confirmed you have created a liquidity position', tx.hash);

        console.log("create Position transaction sent:", tx.hash);
        console.log("Transaction confirmed!");
        await new Promise(resolve => setTimeout(resolve, 5000));

        enableButton('getCreatePositionBtn', 'Create Position');
        fetchBalances();

        await getTokenIDsOwnedByMetamask(true);
        if (window.checkAdminAccess) await window.checkAdminAccess();
        await loadPositionsIntoDappSelections();

    } catch (error) {
        console.error(`Error create Position:`, error);
        enableButton('getCreatePositionBtn', 'Create Position');
    }
}

// ============================================
// WINDOW EXPORTS (for compatibility)
// ============================================

// Export to window object for compatibility with init.js
window.getRatioCreatePositiontokenA = getRatioCreatePositiontokenA;
window.getRatioCreatePositiontokenB = getRatioCreatePositiontokenB;
window.getRatioIncreasePositiontokenA = getRatioIncreasePositiontokenA;
window.getRatioIncreasePositiontokenB = getRatioIncreasePositiontokenB;
window.getRatioStakeIncreasePositiontokenA = getRatioStakeIncreasePositiontokenA;
window.getRatioStakeIncreasePositiontokenB = getRatioStakeIncreasePositiontokenB;
window.getMaxCreatePosition = getMaxCreatePosition;
window.getCreatePosition = getCreatePosition;

// ============================================
// ES6 EXPORTS
// ============================================

export {
    getRatioCreatePositiontokenA,
    getRatioCreatePositiontokenB,
    getRatioIncreasePositiontokenA,
    getRatioIncreasePositiontokenB,
    getRatioStakeIncreasePositiontokenA,
    getRatioStakeIncreasePositiontokenB,
    handleMaxButtonClick,
    handleMaxButtonClickStakeIncrease,
};

console.log('Positions-ratio module loaded');
