/**
 * @module pools
 * @description Pool fees management and side-pools page functionality
 *
 * Handles:
 * - Fetching current pool fees from hook contract
 * - Updating side-pools page UI with fee data
 * - Generating Uniswap pool creation links
 */

import {
    tokenAddresses,
    hookAddress,
    MULTICALL_ADDRESS
} from './config.js';

// Get runtime values from window object
const getCustomRPC = () => window.customRPC || 'https://mainnet.base.org';
const Address_ZEROXBTC_TESTNETCONTRACT = tokenAddresses['0xBTC'];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sort two currency addresses for pool key creation
 * @param {string} token1 - First token address
 * @param {string} token2 - Second token address
 * @returns {Array} Sorted array of [currency0, currency1]
 */
function sortCurrencies(token1, token2) {
    if (token1.toLowerCase() < token2.toLowerCase()) {
        return [token1, token2];
    } else {
        return [token2, token1];
    }
}

// ============================================
// ABI DEFINITIONS
// ============================================

const multicall3ABI = [
    {
        "type": "function",
        "name": "aggregate3",
        "inputs": [
            {
                "name": "calls",
                "type": "tuple[]",
                "components": [
                    { "name": "target", "type": "address" },
                    { "name": "allowFailure", "type": "bool" },
                    { "name": "callData", "type": "bytes" }
                ]
            }
        ],
        "outputs": [
            {
                "name": "returnData",
                "type": "tuple[]",
                "components": [
                    { "name": "success", "type": "bool" },
                    { "name": "returnData", "type": "bytes" }
                ]
            }
        ],
        "stateMutability": "view"
    }
];

const hookABI = [
    {
        "type": "function",
        "name": "getCurrentPoolFee",
        "inputs": [
            {
                "name": "poolKey",
                "type": "tuple",
                "components": [
                    { "name": "currency0", "type": "address" },
                    { "name": "currency1", "type": "address" },
                    { "name": "fee", "type": "uint24" },
                    { "name": "tickSpacing", "type": "int24" },
                    { "name": "hooks", "type": "address" }
                ]
            }
        ],
        "outputs": [
            { "name": "currentFee", "type": "uint24" }
        ],
        "stateMutability": "view"
    }
];

// ============================================
// POOL FEE FUNCTIONS
// ============================================

/**
 * Fetch all pool fees using multicall
 * @returns {Promise<Object|null>} Pool fees object or null on error
 */
export async function getAllPoolFees() {
    const customRPC = getCustomRPC();
    const provider = new ethers.providers.JsonRpcProvider(customRPC);
    const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, multicall3ABI, provider);
    const hookInterface = new ethers.utils.Interface(hookABI);

    // Prepare pool keys for all pools
    const [b0xEthCurrency0, b0xEthCurrency1] = sortCurrencies(tokenAddresses['ETH'], tokenAddresses['B0x']);
    const poolKeyB0xETH = {
        currency0: b0xEthCurrency0,
        currency1: b0xEthCurrency1,
        fee: 0x800000,
        tickSpacing: 60,
        hooks: hookAddress
    };

    const [oxbtcEthCurrency0, oxbtcEthCurrency1] = sortCurrencies(Address_ZEROXBTC_TESTNETCONTRACT, tokenAddresses['ETH']);
    const poolKey0xBTCETH = {
        currency0: oxbtcEthCurrency0,
        currency1: oxbtcEthCurrency1,
        fee: 0x800000,
        tickSpacing: 60,
        hooks: hookAddress
    };

    const [b0x0xbtcCurrency0, b0x0xbtcCurrency1] = sortCurrencies(Address_ZEROXBTC_TESTNETCONTRACT, tokenAddresses['B0x']);
    const poolKeyB0x0xBTC = {
        currency0: b0x0xbtcCurrency0,
        currency1: b0x0xbtcCurrency1,
        fee: 0x800000,
        tickSpacing: 60,
        hooks: hookAddress
    };

    const [R0xBTC0xbtcCurrency0, R0xBTC0xbtcCurrency1] = sortCurrencies(Address_ZEROXBTC_TESTNETCONTRACT, tokenAddresses['RightsTo0xBTC']);
    const poolKeyR0xBTC0xBTC = {
        currency0: R0xBTC0xbtcCurrency0,
        currency1: R0xBTC0xbtcCurrency1,
        fee: 0x800000,
        tickSpacing: 60,
        hooks: hookAddress
    };
console.log("Currency 0 fee: ", R0xBTC0xbtcCurrency0);
console.log("Currency 1 fee: ", R0xBTC0xbtcCurrency1);
    // Encode call data for each pool
    const callData1 = hookInterface.encodeFunctionData("getCurrentPoolFee", [poolKeyB0xETH]);
    const callData2 = hookInterface.encodeFunctionData("getCurrentPoolFee", [poolKey0xBTCETH]);
    const callData3 = hookInterface.encodeFunctionData("getCurrentPoolFee", [poolKeyB0x0xBTC]);
    const callData4 = hookInterface.encodeFunctionData("getCurrentPoolFee", [poolKeyR0xBTC0xBTC]);
      console.log("F2 poolKey:", poolKeyR0xBTC0xBTC);
  console.log("F2 hookAddress used:", hookAddress);

  console.log("F2 callData4:", callData4);

    // Prepare multicall calls array
    const calls = [
        { target: hookAddress, allowFailure: true, callData: callData1 },
        { target: hookAddress, allowFailure: true, callData: callData2 },
        { target: hookAddress, allowFailure: true, callData: callData3 },
        { target: hookAddress, allowFailure: true, callData: callData4 }
    ];

    try {
        const results = await multicallContract.aggregate3(calls);

        // Store the fees
        const poolFees = {
            b0xEth: 0,
            oxbtcEth: 0,
            b0xOxbtc: 0,
            R0xBTC0xBTC: 0
        };

        // Decode result 1 - B0x/ETH
        if (results[0].success) {
            const decoded = hookInterface.decodeFunctionResult("getCurrentPoolFee", results[0].returnData);
            poolFees.b0xEth = decoded.currentFee;
            console.log("B0x/ETH Fee:", poolFees.b0xEth / 10000, "%");
        } else {
            console.error("Failed to fetch B0x/ETH fee");
        }

        // Decode result 2 - 0xBTC/ETH
        if (results[1].success) {
            const decoded = hookInterface.decodeFunctionResult("getCurrentPoolFee", results[1].returnData);
            poolFees.oxbtcEth = decoded.currentFee;
            console.log("0xBTC/ETH Fee:", poolFees.oxbtcEth / 10000, "%");
        } else {
            console.error("Failed to fetch 0xBTC/ETH fee");
        }

        // Decode result 3 - B0x/0xBTC
        if (results[2].success) {
            const decoded = hookInterface.decodeFunctionResult("getCurrentPoolFee", results[2].returnData);
            poolFees.b0xOxbtc = decoded.currentFee;
            console.log("B0x/0xBTC Fee:", poolFees.b0xOxbtc / 10000, "%");
        } else {
            console.error("Failed to fetch B0x/0xBTC fee");
        }
  console.log("R0xBTC0xBTC call success:", results[3].success);
  console.log("R0xBTC0xBTC returnData:", results[3].returnData);

        // Decode result 4 - R0xBTC/0xBTC
        if (results[3].success) {
            const decoded = hookInterface.decodeFunctionResult("getCurrentPoolFee", results[3].returnData);
            poolFees.R0xBTC0xBTC = decoded.currentFee;
            console.log("R0xBTC/0xBTC Fee:", poolFees.R0xBTC0xBTC / 10000, "%");
        } else {
            console.error("Failed to fetch R0xBTC/0xBTC fee");
        }

        // Update admin UI if available
        const infoCard = document.querySelector('#admin-functions .info-card2');
        if (infoCard) {
            infoCard.innerHTML = `
                <h3>Current Pool Fees</h3>
                <p>B0x/ETH: ${poolFees.b0xEth / 10000}%</p>
                <p>0xBTC/ETH: ${poolFees.oxbtcEth / 10000}%</p>
                <p>B0x/0xBTC: ${poolFees.b0xOxbtc / 10000}%</p>
            `;
        }

        return poolFees;

    } catch (error) {
        console.error('Error fetching pool fees:', error);
        const infoCard = document.querySelector('#admin-functions .info-card2');
        if (infoCard) {
            infoCard.innerHTML = `
                <h3>Current Pool Fees</h3>
                <p>Error loading fee data</p>
            `;
        }
        return null;
    }
}

/**
 * Get all fees and update the side-pools page UI
 * @returns {Promise<void>}
 */
export async function getAllFees() {
    await sleep(300);
    const poolsfee = await getAllPoolFees();

    if (!poolsfee) {
        console.error("Failed to fetch pool fees");
        return;
    }

    console.log("pools Fee: ", poolsfee);

    // R0xBTC/0xBTC Pool
    const feeValueSpanR0xBTC0xBTC = document.querySelector('.fee-valueR0xBTC0xBTC');
    console.log("Found .fee-valueR0xBTC0xBTC", feeValueSpanR0xBTC0xBTC);
    if (feeValueSpanR0xBTC0xBTC) {
        const listItem = feeValueSpanR0xBTC0xBTC.closest('li');
        const curFeeR0xBTC0xBTC = poolsfee.R0xBTC0xBTC / 10000;
        feeValueSpanR0xBTC0xBTC.textContent = curFeeR0xBTC0xBTC + '%';
        if (listItem) {
            listItem.dataset.feeStart = curFeeR0xBTC0xBTC + '%';
        }
        console.log("Set R0xBTC/0xBTC fee to:", curFeeR0xBTC0xBTC + '%');
    } else {
        console.error("Could not find .fee-valueR0xBTC0xBTC element");
    }

    // B0x/ETH Pool
    const feeValueSpanB0xETH = document.querySelector('.fee-valueB0xETH');
    console.log("Found .fee-valueB0xETH:", feeValueSpanB0xETH);
    if (feeValueSpanB0xETH) {
        const listItem = feeValueSpanB0xETH.closest('li');
        const curFeeB0xETH = poolsfee.b0xEth / 10000;
        feeValueSpanB0xETH.textContent = curFeeB0xETH + '%';
        if (listItem) {
            listItem.dataset.feeStart = curFeeB0xETH + '%';
        }
        console.log("Set B0x/ETH fee to:", curFeeB0xETH + '%');
    } else {
        console.error("Could not find .fee-valueB0xETH element");
    }

    // 0xBTC/ETH Pool
    const feeValueSpan0xBTCETH = document.querySelector('.fee-value0xBTCETH');
    console.log("Found .fee-value0xBTCETH:", feeValueSpan0xBTCETH);
    if (feeValueSpan0xBTCETH) {
        const listItem = feeValueSpan0xBTCETH.closest('li');
        const curFee0xBTCETH = poolsfee.oxbtcEth / 10000;
        feeValueSpan0xBTCETH.textContent = curFee0xBTCETH + '%';
        if (listItem) {
            listItem.dataset.feeStart = curFee0xBTCETH + '%';
        }
        console.log("Set 0xBTC/ETH fee to:", curFee0xBTCETH + '%');
    } else {
        console.error("Could not find .fee-value0xBTCETH element");
    }

    // B0x/0xBTC Pool
    const feeValueSpanB0x0xBTC = document.querySelector('.fee-valueB0x0xBTC');
    console.log("Found .fee-valueB0x0xBTC:", feeValueSpanB0x0xBTC);
    if (feeValueSpanB0x0xBTC) {
        const listItem = feeValueSpanB0x0xBTC.closest('li');
        const curFeeB0x0xBTC = poolsfee.b0xOxbtc / 10000;
        feeValueSpanB0x0xBTC.textContent = curFeeB0x0xBTC + '%';
        if (listItem) {
            listItem.dataset.feeStart = curFeeB0x0xBTC + '%';
        }
        console.log("Set B0x/0xBTC fee to:", curFeeB0x0xBTC + '%');
    } else {
        console.error("Could not find .fee-valueB0x0xBTC element");
    }

    // Generate Uniswap pool creation links with current fees
    const linkB0x0xBTCz = "https://app.uniswap.org/positions/create/v4?currencyA=0x6B19E31C1813cD00b0d47d798601414b79A3e8AD&currencyB=0xc4d4fd4f4459730d176844c170f2bb323c87eb3b&chain=base&hook=0x785319f8fCE23Cd733DE94Fd7f34b74A5cAa1000&priceRangeState={%22priceInverted%22:false,%22fullRange%22:true,%22minPrice%22:%22%22,%22maxPrice%22:%22%22,%22initialPrice%22:%22%22}&depositState={%22exactField%22:%22TOKEN0%22,%22exactAmounts%22:{}}&fee={%22feeAmount%22:" + poolsfee.b0xOxbtc + ",%22tickSpacing%22:60,%22isDynamic%22:true}&step=1";

    const linkB0xETHz = "https://app.uniswap.org/positions/create/v4?currencyA=0x6B19E31C1813cD00b0d47d798601414b79A3e8AD&currencyB=NATIVE&chain=base&hook=0x785319f8fCE23Cd733DE94Fd7f34b74A5cAa1000&priceRangeState={%22priceInverted%22:false,%22fullRange%22:true,%22minPrice%22:%22%22,%22maxPrice%22:%22%22,%22initialPrice%22:%22%22}&depositState={%22exactField%22:%22TOKEN0%22,%22exactAmounts%22:{}}&fee={%22isDynamic%22:true,%22feeAmount%22:" + poolsfee.b0xEth + ",%22tickSpacing%22:60}&step=1";

    const link0xBTCETHz = "https://app.uniswap.org/positions/create/v4?currencyA=0xc4d4fd4f4459730d176844c170f2bb323c87eb3b&currencyB=NATIVE&chain=base&hook=0x785319f8fCE23Cd733DE94Fd7f34b74A5cAa1000&priceRangeState={%22priceInverted%22:false,%22fullRange%22:true,%22minPrice%22:%22%22,%22maxPrice%22:%22%22,%22initialPrice%22:%22%22}&depositState={%22exactField%22:%22TOKEN0%22,%22exactAmounts%22:{}}&fee={%22feeAmount%22:" + poolsfee.oxbtcEth + ",%22tickSpacing%22:60,%22isDynamic%22:true}&step=1";

    const linkR0xBTC0xBTCz = "https://app.uniswap.org/positions/create/v4?currencyA=0xc4d4fd4f4459730d176844c170f2bb323c87eb3b&currencyB=0x2ffa14b113b0a598b07af6714f42dd75bddffd3e&chain=base&hook=0x785319f8fCE23Cd733DE94Fd7f34b74A5cAa1000&priceRangeState={%22priceInverted%22:false,%22fullRange%22:true,%22minPrice%22:%22%22,%22maxPrice%22:%22%22,%22initialPrice%22:%22%22}&depositState={%22exactField%22:%22TOKEN0%22,%22exactAmounts%22:{}}&fee={%22feeAmount%22:" + poolsfee.R0xBTC0xBTC + ",%22tickSpacing%22:60,%22isDynamic%22:true}&step=1";

    // Update link elements
    const linkB0xETH = document.getElementById('uniswap-linkB0xETH');
    const linkB0x0xBTC = document.getElementById('uniswap-linkB0x0xBTC');
    const link0xBTCETH = document.getElementById('uniswap-link0xBTCETH');
    const linkR0xBTC0xBTC = document.getElementById('uniswap-linkR0xBTC0xBTC');

    if (linkB0xETH) linkB0xETH.href = linkB0xETHz;
    if (linkB0x0xBTC) linkB0x0xBTC.href = linkB0x0xBTCz;
    if (link0xBTCETH) link0xBTCETH.href = link0xBTCETHz;
    if (linkR0xBTC0xBTC) linkR0xBTC0xBTC.href = linkR0xBTC0xBTCz;

    await sleep(300);
}

// ============================================
// MODULE EXPORTS
// ============================================

export {
    sleep,
    sortCurrencies
};

console.log('Pools module initialized');
