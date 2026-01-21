// ============================================================================
// B0x Website Utility Functions Module
// ============================================================================
// This file contains general-purpose utility and helper functions used
// throughout the application for balance fetching, formatting, validation,
// and token operations.
// ============================================================================

import { tokenAddresses, tokenAddressesETH, tokenMap, MULTICALL_ADDRESS } from './config.js';
import {userAddress} from './wallet.js';
import { customRPC } from './settings.js';
// ============================================================================
// TOKEN DECIMALS CONFIGURATION
// ============================================================================

/**
 * Token decimals mapping for Base network
 */
export const tokenAddressesDecimals = {
    'USDC': '6',
    'ETH': '18',
    'DAI': '18',
    'WBTC': '8',
    'B0x': '18',
    '0xBTC': '8',
    'WETH': '18',
    'RightsTo0xBTC': '18'
};

/**
 * Token decimals mapping for Ethereum network
 */
export const tokenAddressesDecimalsETH = {
    'USDC': '6',
    'ETH': '18',
    'DAI': '18',
    'WBTC': '8',
    'B0x': '18',
    '0xBTC': '8',
    'RightsTo0xBTC': '18'
};

// ============================================================================
// ADDRESS TO SYMBOL MAPPINGS
// ============================================================================

/**
 * Reverse mapping: address -> symbol for Base network
 */
export const addressToSymbol = {};
Object.keys(tokenAddresses).forEach(symbol => {
    const address = tokenAddresses[symbol].toLowerCase();
    addressToSymbol[address] = symbol;
});

/**
 * Reverse mapping: address -> symbol for Ethereum network
 */
export const addressToSymbolETH = {};
Object.keys(tokenAddressesETH).forEach(symbol => {
    const address = tokenAddressesETH[symbol].toLowerCase();
    addressToSymbolETH[address] = symbol;
});

// ============================================================================
// TOKEN NAME/SYMBOL RESOLUTION FUNCTIONS
// ============================================================================

/**
 * Get token name from address using tokenMap
 * Falls back to truncated address if not found
 * @param {string} address - The token contract address
 * @returns {string} Token name or truncated address
 */
export function getTokenNameFromAddress(address) {
    return tokenMap[address] || `Token${address.slice(-4)}`;
}

/**
 * Get token symbol from address using reverse mapping (Base network)
 * @param {string} address - The token contract address
 * @returns {string|null} Token symbol or null if not found
 */
export function getSymbolFromAddress(address) {
    if (!address) return null;

    const normalizedAddress = address.toLowerCase();
    return addressToSymbol[normalizedAddress] || null;
}

/**
 * Get token symbol from address using reverse mapping (Ethereum network)
 * @param {string} address - The token contract address
 * @returns {string|null} Token symbol or null if not found
 */
export function getSymbolFromAddressETH(address) {
    if (!address) return null;

    const normalizedAddress = address.toLowerCase();
    return addressToSymbolETH[normalizedAddress] || null;
}

// ============================================================================
// BALANCE FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format balance with exact precision (no rounding)
 * Converts BigNumber to human-readable string with proper decimal placement
 * @param {BigNumber|string} balance - The raw balance (in smallest units)
 * @param {number} decimals - Number of decimal places for the token
 * @returns {string} Formatted balance as string
 */
export function formatBalanceExact(balance, decimals) {
    // Convert BigNumber to string to avoid precision loss
    const balanceString = balance.toString();

    // If decimals is 0, return the raw value
    if (decimals === 0) {
        return balanceString;
    }

    // For tokens with decimals, we need to handle the decimal point
    if (balanceString.length <= decimals) {
        // If the balance is smaller than the decimal places, pad with zeros
        const padded = balanceString.padStart(decimals, '0');
        return '0.' + padded;
    } else {
        // Insert decimal point at the right position
        const integerPart = balanceString.slice(0, balanceString.length - decimals);
        const decimalPart = balanceString.slice(balanceString.length - decimals);

        // Remove trailing zeros from decimal part for cleaner display
        const trimmedDecimal = decimalPart.replace(/0+$/, '');

        if (trimmedDecimal === '') {
            return integerPart;
        } else {
            return integerPart + '.' + trimmedDecimal;
        }
    }
}

/**
 * Format balance with 18 decimals (standard for ETH and many tokens)
 * @param {number|string} balance - The raw balance
 * @returns {string} Formatted balance with 4 decimal places
 */
export function formatBalance(balance) {
    return (balance / 1e18).toFixed(4);
}

/**
 * Format numbers without rounding - preserves exact values
 * @param {string|bigint|number} value - The value to format
 * @returns {string} Exact string representation
 */
export function formatExactNumber(value) {
    // If it's already a string, return as-is
    if (typeof value === 'string') {
        return value;
    }

    // If it's a BigInt, convert to string
    if (typeof value === 'bigint') {
        return value.toString();
    }

    // If it's a number, use toFixed(0) for integers or check if it needs decimal places
    if (typeof value === 'number') {
        // Check if it's a whole number
        if (Number.isInteger(value)) {
            return value.toFixed(0);
        }
        // For decimals, you might want to preserve more precision
        return value.toString();
    }

    return value.toString();
}

/**
 * Format exact numbers with comma separators for readability
 * @param {string|bigint|number} value - The value to format
 * @returns {string} Formatted string with commas (e.g., "10,999,900")
 */
export function formatExactNumberWithCommas(value) {
    const exactValue = formatExactNumber(value);
    // Add commas to make large numbers more readable
    return exactValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format large numbers with K, M, B suffixes
 * @param {number} num - The number to format
 * @returns {string} Formatted number with suffix
 */
export function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString();
}

// ============================================================================
// ADDRESS FORMATTING FUNCTIONS
// ============================================================================

/**
 * Truncate Ethereum address for display
 * @param {string} address - The full Ethereum address
 * @returns {string} Truncated address (e.g., "0x1234...5678")
 */
export function truncateAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate if string is a valid Ethereum address format
 * @param {string} address - The address to validate
 * @returns {boolean} True if valid format
 */
export function isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ============================================================================
// BALANCE FETCHING FUNCTIONS
// ============================================================================

/**
 * Fetch token balance using ethers.js (Base network)
 * Handles both native ETH and ERC20 tokens
 * @param {string} tokenAddress - The token contract address (or 0x0...0 for ETH)
 * @param {number} decimals - Number of decimals for the token
 * @param {Object} provider - Ethers provider instance
 * @param {Object} signer - Ethers signer instance
 * @param {boolean} walletConnected - Wallet connection state
 * @param {Function} connectWallet - Function to connect wallet
 * @returns {Promise<string>} Formatted balance or '0' on error
 */
export async function fetchTokenBalanceWithEthers(
    tokenAddress,
    decimals,
    provider,
    signer,
    walletConnected,
    connectWallet
) {
    if (!walletConnected) {
        await connectWallet();
    }

    if (!window.ethereum) {
        console.error("MetaMask not detected");
        return '0';
    }

    try {
        const walletAddress = await signer.getAddress();

        // Handle native ETH
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
            const balance = await provider.getBalance(walletAddress);
            return formatBalanceExact(balance, 18);
        }

        // Handle ERC20 tokens
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
        const balance = await tokenContract.balanceOf(walletAddress);
        return formatBalanceExact(balance, decimals);
    } catch (error) {
        console.error(`Error fetching token balance for ${tokenAddress}:`, error);
        return '0';
    }
}

/**
 * Fetch token balance using ethers.js (Ethereum network)
 * Handles both native ETH and ERC20 tokens
 * @param {string} tokenAddress - The token contract address (or 0x0...0 for ETH)
 * @param {number} decimals - Number of decimals for the token
 * @param {Object} providerETH - Ethers provider instance for Ethereum
 * @param {Object} signerETH - Ethers signer instance for Ethereum
 * @param {boolean} walletConnected - Wallet connection state
 * @param {Function} connectWallet - Function to connect wallet
 * @returns {Promise<string>} Formatted balance or '0' on error
 */
export async function fetchTokenBalanceWithEthersETH(
    tokenAddress,
    decimals,
    providerETH,
    signerETH,
    walletConnected,
    connectWallet
) {
    if (!walletConnected) {
        await connectWallet();
    }

    console.log("Fetching token Address: ", tokenAddress);
    if (!window.ethereum) {
        console.error("MetaMask not detected");
        return '0';
    }

    try {
        const walletAddress = await signerETH.getAddress();

        // Handle native ETH
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
            const balance = await providerETH.getBalance(walletAddress);
            return formatBalanceExact(balance, 18);
        }

        // Handle ERC20 tokens
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const tokenContract = new ethers.Contract(tokenAddress, abi, providerETH);
        const balance = await tokenContract.balanceOf(walletAddress);
        console.log("Token balance 4, ", tokenAddress, " = ", balance.toString());
        return formatBalanceExact(balance, decimals);
    } catch (error) {
        console.error(`Error fetching token balance for ${tokenAddress}:`, error);
        return '0';
    }
}

/**
 * Fetch all token balances for Base network using Multicall
 * @param {string} userAddress2 - The wallet address to check (uses window.userAddress if not provided)
 * @param {Object} tokenAddressesParam - Token addresses mapping (optional, uses imported tokenAddresses)
 * @param {Object} tokenAddressesDecimals - Token decimals mapping (optional)
 * @param {Function} fetchTokenBalanceWithEthers - Balance fetching function (unused, kept for compatibility)
 * @param {Function} displayWalletBalances - Function to display balances
 * @returns {Promise<Object>} Object containing all token balances
 */
export async function fetchBalances(
    userAddress2,
    tokenAddressesParam,
    tokenAddressesDecimals,
    fetchTokenBalanceWithEthers,
    displayWalletBalances,
    provider,
    signer,
    walletConnected,
    connectWalletFn
) {
    const addressToUse = userAddress2 || userAddress || window.userAddress;

    if (!addressToUse) {
        console.log('No wallet address available for fetchBalances');
        return;
    }

    if (!isValidEthereumAddress(addressToUse)) {
        console.log('Invalid Ethereum address for fetchBalances');
        return;
    }

    console.log("Fetching Base token balances with multicall...");

    // Multicall3 ABI with aggregate3 and getEthBalance
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
        "inputs": [{ "internalType": "address", "name": "addr", "type": "address" }],
        "name": "getEthBalance",
        "outputs": [{ "internalType": "uint256", "name": "balance", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }];

    // ERC20 balanceOf ABI
    const erc20ABI = [{
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }];

    try {
        const erc20Interface = new ethers.utils.Interface(erc20ABI);
        const multicallInterface = new ethers.utils.Interface(MULTICALL3_ABI);

        // Use tokenAddresses from config (imported at top)
        const tokensConfig = tokenAddressesParam || tokenAddresses;

        // Build multicall for: B0x, 0xBTC, WETH, ETH (native)
        const calls = [
            // Call 0: B0x balance (18 decimals)
            {
                target: tokensConfig['B0x'],
                allowFailure: true,
                callData: erc20Interface.encodeFunctionData("balanceOf", [addressToUse])
            },
            // Call 1: 0xBTC balance (8 decimals)
            {
                target: tokensConfig['0xBTC'],
                allowFailure: true,
                callData: erc20Interface.encodeFunctionData("balanceOf", [addressToUse])
            },
            // Call 2: WETH balance (18 decimals)
            {
                target: tokensConfig['WETH'],
                allowFailure: true,
                callData: erc20Interface.encodeFunctionData("balanceOf", [addressToUse])
            },
            // Call 3: Native ETH balance (18 decimals)
            {
                target: MULTICALL_ADDRESS,
                allowFailure: true,
                callData: multicallInterface.encodeFunctionData("getEthBalance", [addressToUse])
            }
        ];

        // Use custom RPC for the multicall
        const rpcUrl = customRPC || 'https://mainnet.base.org';
        const multicallProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL3_ABI, multicallProvider);

        console.log("Executing fetchBalances multicall with", calls.length, "calls...");
        const results = await multicallContract.aggregate3(calls);
        console.log("fetchBalances multicall executed successfully!");

        // Initialize walletBalances if needed
        if (!window.walletBalances) window.walletBalances = {};

        // Decode B0x balance (index 0) - 18 decimals
        if (results[0].success) {
            const b0xBalance = erc20Interface.decodeFunctionResult("balanceOf", results[0].returnData)[0];
            window.walletBalances['B0x'] = ethers.utils.formatUnits(b0xBalance, 18);
        }

        // Decode 0xBTC balance (index 1) - 8 decimals
        if (results[1].success) {
            const zeroxbtcBalance = erc20Interface.decodeFunctionResult("balanceOf", results[1].returnData)[0];
            window.walletBalances['0xBTC'] = ethers.utils.formatUnits(zeroxbtcBalance, 8);
        }

        // Decode WETH balance (index 2) - 18 decimals
        if (results[2].success) {
            const wethBalance = erc20Interface.decodeFunctionResult("balanceOf", results[2].returnData)[0];
            window.walletBalances['WETH'] = ethers.utils.formatUnits(wethBalance, 18);
        }

        // Decode native ETH balance (index 3) - 18 decimals
        if (results[3].success) {
            const ethBalance = multicallInterface.decodeFunctionResult("getEthBalance", results[3].returnData)[0];
            window.walletBalances['ETH'] = ethers.utils.formatUnits(ethBalance, 18);
        }

        console.log("Token balances loaded from fetchBalances multicall:", window.walletBalances);

        // Update the wallet balances display if function is available
        if (typeof displayWalletBalances === 'function') {
            displayWalletBalances(window.walletBalances);
        } else if (typeof window.displayWalletBalances === 'function') {
            window.displayWalletBalances(window.walletBalances);
        }

        return window.walletBalances;
    } catch (error) {
        console.error("Error in fetchBalances multicall:", error);
        throw error;
    }
}

/**
 * Fetch all token balances for Ethereum network
 * @param {string} userAddress - The wallet address to check
 * @param {Object} tokenAddressesETH - Token addresses mapping for Ethereum
 * @param {Object} tokenAddressesDecimalsETH - Token decimals mapping for Ethereum
 * @param {Function} fetchTokenBalanceWithEthersETH - Balance fetching function for Ethereum
 * @param {Function} displayWalletBalancesETH - Function to display Ethereum balances
 * @returns {Promise<Object>} Object containing all token balances
 */
export async function fetchBalancesETH(
    userAddress2,
    tokenAddressesETH,
    tokenAddressesDecimalsETH,
    fetchTokenBalanceWithEthersETH,
    displayWalletBalancesETH,
    providerETH,
    signerETH,
    walletConnected,
    connectWalletFn
) {
    if (!userAddress) {
        alert('Please enter a wallet address', 'error');
        return;
    }

    if (!isValidEthereumAddress(userAddress)) {
        alert('Please enter a valid Ethereum address', 'error');
        return;
    }

    const walletBalancesETH = {};
    console.log("Fetching ETH balances...");

    try {
        const promises = Object.entries(tokenAddressesETH).map(async ([symbol, address]) => {
            const balance = await fetchTokenBalanceWithEthersETH(
                address,
                tokenAddressesDecimalsETH[symbol],
                providerETH,
                signerETH,
                walletConnected,
                connectWalletFn
            );
            walletBalancesETH[symbol] = balance;
        });

        await Promise.all(promises);

        // Store on window for display function to access
        window.walletBalancesETH = walletBalancesETH;

        displayWalletBalancesETH();
        return walletBalancesETH;
    } catch (error) {
        console.log("Error fetching ETH balances: ", error);
        throw error;
    }
}

// ============================================================================
// TOKEN DISPLAY ORDER
// ============================================================================

/**
 * Fixed token order for consistent UI display (Base network)
 */
export const TOKEN_ORDER = ['ETH', 'B0x', '0xBTC', 'USDC', 'DAI', 'WBTC'];

/**
 * Fixed token order for consistent UI display (Ethereum network)
 */
export const TOKEN_ORDERETH = ['ETH', '0xBTC', 'B0x', 'RightsTo0xBTC', 'DAI', 'WBTC'];

// ============================================================================
// COINGECKO PRICE CACHING
// ============================================================================

const COINGECKO_CACHE_KEY = 'coingecko_price_cache';
const COINGECKO_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Fetches CoinGecko prices with 5-minute localStorage caching
 * Prevents excessive API calls and persists across page reloads
 * @returns {Promise<{wethPriceUSD: number, oxbtcPriceUSD: number, timestamp: number}>}
 */
export async function getCoinGeckoPrices() {
    try {
        // Try to load from localStorage first
        const cachedData = localStorage.getItem(COINGECKO_CACHE_KEY);

        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const age = Date.now() - parsed.timestamp;

            // If cache is fresh (less than 5 minutes old), return it
            if (age < COINGECKO_CACHE_DURATION) {
                const remainingSeconds = Math.ceil((COINGECKO_CACHE_DURATION - age) / 1000);
                console.log(`Using cached CoinGecko prices (refreshes in ${remainingSeconds}s)`);
                return {
                    wethPriceUSD: parsed.wethPriceUSD,
                    oxbtcPriceUSD: parsed.oxbtcPriceUSD,
                    timestamp: parsed.timestamp
                };
            }
        }

        // Cache is stale or doesn't exist, fetch new data
        console.log('Fetching fresh CoinGecko prices...');
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=weth,oxbitcoin&vs_currencies=usd');

        if (!response.ok) {
            throw new Error(`CoinGecko API returned ${response.status}`);
        }

        const data = await response.json();
        const wethPriceUSD = data.weth.usd;
        const oxbtcPriceUSD = data['oxbitcoin'].usd;

        // Save to localStorage with timestamp
        const cacheData = {
            wethPriceUSD,
            oxbtcPriceUSD,
            timestamp: Date.now()
        };
        localStorage.setItem(COINGECKO_CACHE_KEY, JSON.stringify(cacheData));

        console.log('CoinGecko prices fetched and cached:', { wethPriceUSD, oxbtcPriceUSD });

        return cacheData;

    } catch (error) {
        console.error('Error fetching CoinGecko prices:', error);

        // Try to return stale cache if available (better than nothing)
        const cachedData = localStorage.getItem(COINGECKO_CACHE_KEY);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const ageMinutes = Math.floor((Date.now() - parsed.timestamp) / 60000);
            console.warn(`CoinGecko fetch failed, using stale cache (${ageMinutes} minutes old)`);
            return {
                wethPriceUSD: parsed.wethPriceUSD,
                oxbtcPriceUSD: parsed.oxbtcPriceUSD,
                timestamp: parsed.timestamp
            };
        }

        // No cache available, return defaults
        console.warn('No cached prices available, using defaults');
        return {
            wethPriceUSD: 3000,
            oxbtcPriceUSD: 0.5,
            timestamp: Date.now()
        };
    }
}

// ============================================================================
// EXPORTS SUMMARY
// ============================================================================
// This module exports:
// - Token decimals configurations (Base & Ethereum)
// - Address to symbol mappings (Base & Ethereum)
// - Token name/symbol resolution functions
// - Balance formatting functions (exact, with decimals, with commas)
// - Number formatting functions (large numbers with suffixes)
// - Address formatting functions (truncation)
// - Validation functions (Ethereum address format)
// - Balance fetching functions (Base & Ethereum)
// - Token display order constants
// ============================================================================
