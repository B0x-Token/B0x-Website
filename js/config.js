// ============================================================================
// B0x Website Configuration Module
// ============================================================================
// This file contains all configuration constants, contract addresses, network
// settings, and global variables used throughout the application.
// ============================================================================

// ============================================================================
// IMAGE URLS - Token Icons (Base Network)
// ============================================================================
export const bbaseurlBASE = "https://raw.githubusercontent.com/B0x-Token/B0x-Website/refs/heads/main/images/";
export const ethbase = bbaseurlBASE + "ETHonBase.png";
export const Zeroxbtcbase = bbaseurlBASE + "0xBTConBase.png";
export const B0xbase = bbaseurlBASE + "B0xonBase.png";
export const RightsTo0xBTCbase = bbaseurlBASE + "RightsTo0xBTConBase.png";
export const WETHbase = bbaseurlBASE + "WETHonBase.png";
export const USDCbase = bbaseurlBASE + "USDConBase.png";

// Token icons mapping for Base network
export const tokenIconsBase = {
    'ETH': ethbase,
    'B0x': B0xbase,
    '0xBTC': Zeroxbtcbase,
    'WETH': WETHbase,
    'RightsTo0xBTC': RightsTo0xBTCbase,
    'USDC': USDCbase,
};

// ============================================================================
// IMAGE URLS - Token Icons (Ethereum Network)
// ============================================================================
export const bbaseurl = "https://raw.githubusercontent.com/B0x-Token/B0x-Website/refs/heads/main/images/";
export const etheth = bbaseurl + "ETHonETH.png";
export const Zeroxbtceth = bbaseurl + "0xBTConETH.png";
export const B0xeth = bbaseurl + "B0xonETH.png";
export const RightsTo0xBTCeth = bbaseurl + "RightsTo0xBTConETH.png";
export const WETHeth = bbaseurl + "WETHonETH.png";

// Token icons mapping for Ethereum network
export const tokenIconsETH = {
    'ETH': etheth,
    'B0x': B0xeth,
    '0xBTC': Zeroxbtceth,
    'WETH': WETHeth,
    'RightsTo0xBTC': RightsTo0xBTCeth,
};

// ============================================================================
// CONTRACT ADDRESSES - Base Network
// ============================================================================
export const UnsiwapV4PoolCreatorAddress = "0x80D68014E12C76B60DbA69c4d33E0ceD06f602EF";
export const USDCToken = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const positionManager_address = "0x7c5f5a4bbd8fd63184577525326123b519429bdc";
//export const contractAddress_PositionFinderPro = '0x09faDBe933dfF4C7217E7d88C551E9EA6d49eE0f';
export const contractAddress_PositionFinderPro = '0xe75Af8215042b1919B1b1D38db72C0dE56A5aEBE';
export const contractAddress_Swapper = '0x6c6B14B49Cb4E9771c555689C2D11aF9A7500a6f';
export const contractAddressLPRewardsStaking = '0x08f489C5017942d3b7c82C1c178877C80492c948';
export const hookAddress = '0x785319f8fCE23Cd733DE94Fd7f34b74A5cAa1000';
export const ProofOfWorkAddresss = '0xd44Ee7dAdbF50214cA7009a29D9F88BCcD0E9Ff4';

// Multicall3 address (same across multiple networks)
export const MULTICALL_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

// ============================================================================
// TOKEN ADDRESSES - Base Network
// ============================================================================
export const tokenAddresses = {
    'ETH': '0x0000000000000000000000000000000000000000',
    'B0x': '0x6B19E31C1813cD00b0d47d798601414b79A3e8AD',
    '0xBTC': '0xc4D4FD4F4459730d176844c170F2bB323c87Eb3B',
    'WETH': '0x4200000000000000000000000000000000000006',
    'RightsTo0xBTC': '0x2FFa14b113b0a598B07aF6714f42dd75bDDFfD3E',
    'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

// Token address to symbol mapping (Base Network)
export const tokenMap = {
    "0x4200000000000000000000000000000000000006": "WETH",
    "0x0000000000000000000000000000000000000000": "ETH",
    "0x6B19E31C1813cD00b0d47d798601414b79A3e8AD": "B0x",
    "0xc4D4FD4F4459730d176844c170F2bB323c87Eb3B": "0xBTC",
    "0x2FFa14b113b0a598B07aF6714f42dd75bDDFfD3E": "RightsTo0xBTC",
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": "USDC",
};

// ============================================================================
// TOKEN ADDRESSES - Ethereum Network
// ============================================================================
export const tokenAddressesETH = {
    'ETH': '0x0000000000000000000000000000000000000000',
    'B0x': '0x1F8f212540B31b37f40D8C57b5c7d8b55bf25919',
    '0xBTC': '0xB6eD7644C69416d67B522e20bC294A9a9B405B31',
    'RightsTo0xBTC': '0xbCEaA05d2C153C3E961Fbae0640f58d968d9DDaD',
};

// ============================================================================
// NETWORK CONFIGURATION
// ============================================================================
export const defaultRPC_ETH = "https://eth.llamarpc.com";
export const defaultRPC_Base = 'https://mainnet.base.org';

// Chain configuration with network details
export const chainConfig = {
    ethereum: {
        name: "Ethereum",
        explorerUrl: "https://etherscan.io/address/",
        chainId: 1,
        nativeCurrency: {
            name: "Ethereum",
            symbol: "ETH",
            decimals: 18
        }
    },
    base: {
        name: "Base",
        explorerUrl: "https://basescan.org/address/",
        chainId: 8453,
        nativeCurrency: {
            name: "Ethereum",
            symbol: "ETH",
            decimals: 18
        }
    },
    baseSepolia: {
        name: "Base Sepolia Testnet",
        explorerUrl: "https://basescan.org/address/",
        chainId: 84532,
        nativeCurrency: {
            name: "Ethereum",
            symbol: "ETH",
            decimals: 18
        }
    }
};

// ============================================================================
// DATA SOURCES
// ============================================================================
export const defaultDataSource_Testnet = "https://data.bzerox.org/mainnet/";
export const defaultBACKUPDataSource_Testnet = "https://data.github.bzerox.org/";

// ============================================================================
// APPLICATION SETTINGS
// ============================================================================
export const appSettings = {
    minStaking: 0,
    minUserHoldings: 0
};

// Default contract addresses for staking rewards
export const defaultAddresses = '["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","0x6B19E31C1813cD00b0d47d798601414b79A3e8AD","0xc4D4FD4F4459730d176844c170F2bB323c87Eb3B","0x4200000000000000000000000000000000000006"]';

// ============================================================================
// THROTTLE AND TIMING CONSTANTS
// ============================================================================
export const THROTTLE_DELAY = 15000; // 15 seconds in milliseconds
export const REWARD_STATS_COOLDOWN = 60000; // 60 seconds in milliseconds

// ============================================================================
// CONFIG OBJECT - Advanced Configuration
// ============================================================================
// Note: This uses dynamic values that will be set at runtime
export const CONFIG_TEMPLATE = {
    START_BLOCK: 35937447,
    MAX_LOGS_PER_REQUEST: 499,
    MAX_BLOCKS_PER_REQUEST: 499,
    MAX_RETRIES: 5,
    BASE_RETRY_DELAY: 1000,
    MAX_RETRY_DELAY: 60000,
    RATE_LIMIT_DELAY: 250,

    // Contract addresses
    NFT_ADDRESS: "0x7C5f5A4bBd8fD63184577525326123B519429bDc",
    MULTICALL_ADDRESS: "0xcA11bde05977b3631167028862bE2a173976CA11",

    // Event signatures
    TRANSFER_TOPIC: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",

    // Target pool key
    TARGET_POOL_KEY: {
        currency0: "0x6B19E31C1813cD00b0d47d798601414b79A3e8AD",
        currency1: "0xc4D4FD4F4459730d176844c170F2bB323c87Eb3B",
        fee: 8388608,
        tickSpacing: 60,
        hooks: "0x785319f8fCE23Cd733DE94Fd7f34b74A5cAa1000"
    }
};

// ============================================================================
// CONTRACTS LIST - For UI Display
// ============================================================================
export const contractsList = [
    {
        name: "B0x Token / B ZERO X Token ",
        address: tokenAddresses['B0x'],
        symbol: "B0X",
        imageSymbol: "B0x",
        decimals: 18,
        isToken: true,
        chain: "base"
    },
    {
        name: "0xBitcoin Token ",
        address: tokenAddresses['0xBTC'],
        symbol: "0xBTC",
        imageSymbol: "0xBTC",
        decimals: 8,
        isToken: true,
        chain: "base"
    },
    {
        name: "Proof of Work / Mining Address ",
        address: ProofOfWorkAddresss,
        isToken: false,
        chain: "base"
    },
    {
        name: "B0x Token Uniswap Liquidity Pool Staking Contract ",
        address: contractAddressLPRewardsStaking,
        isToken: false,
        chain: "base"
    },
    {
        name: "B0x Uniswap Router",
        address: contractAddress_Swapper,
        isToken: false,
        chain: "base"
    },
    {
        name: "Hook Address for Uniswap ",
        address: hookAddress,
        isToken: false,
        chain: "base"
    },
    {
        name: "B0x Token ",
        address: tokenAddressesETH['B0x'],
        symbol: "B0X",
        imageSymbol: "B0x",
        decimals: 18,
        isToken: true,
        chain: "ethereum"
    },
    {
        name: "0xBitcoin Token ",
        address: tokenAddressesETH['0xBTC'],
        symbol: "0xBTC",
        imageSymbol: "0xBTC",
        decimals: 8,
        isToken: true,
        chain: "ethereum"
    },
    {
        name: "RightsTo0xBitcoin Token ",
        address: tokenAddressesETH['RightsTo0xBTC'],
        symbol: "R0xBTC",
        imageSymbol: "RightsTo0xBTC",
        decimals: 18,
        isToken: true,
        chain: "ethereum"
    },
    {
        name: "RightsTo0xBitcoin Token ",
        address: tokenAddresses['RightsTo0xBTC'],
        symbol: "R0xBTC",
        imageSymbol: "RightsTo0xBTC",
        decimals: 18,
        isToken: true,
        chain: "base"
    },
    {
        name: "Position Finder Helper Contract ",
        address: contractAddress_PositionFinderPro,
        isToken: false,
        chain: "base"
    },
    {
        name: "Uniswapv4PoolCreator ",
        address: UnsiwapV4PoolCreatorAddress,
        isToken: false,
        chain: "base"
    }
];

// ============================================================================
// INITIAL STATE VALUES
// ============================================================================
// Wallet balances (Base network)
export const initialWalletBalances = {
    'ETH': 0.0,
    'USDC': 0.000,
    '0xBTC': 0.00,
    'B0x': 0.00,
    'WETH': 0.00
};

// Wallet balances (Ethereum network)
export const initialWalletBalancesETH = {
    'ETH': 0.0,
    '0xBTC': 0.000,
    'B0x': 0.00,
    'RightsTo0xBTC': 0.00
};

// Current settings for addresses
export const initialCurrentSettingsAddresses = {
    contractAddresses: defaultAddresses
};

// Mock data for rewards (these may be replaced with real data at runtime)
export const mockRewardTokens = [
    "0x0000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000"
];

export const mockActivePeriods = [
    0,
    0,
    0,
    0
];

// ============================================================================
// GLOBAL STATE VARIABLES (Initial Values)
// ============================================================================
// These are exported as initial values; the actual state will be managed
// in the main application module

export const initialGlobalState = {
    // Derived contract addresses
    tokenSwapper: contractAddress_Swapper,
    tokenAddress: tokenAddresses["B0x"],
    Address_ZEROXBTC_TESTNETCONTRACT: tokenAddresses["0xBTC"],
    HookAddress: hookAddress,

    // Price and rate tracking
    wethTo0xBTCRate: 0,
    lastWETHto0xBTCRateUpdate: 0,
    lastWETHto0xBTCRateUpdate2: 0,
    APYFINAL: 0,
    ratioB0xTo0xBTC: 0,
    usdCostB0x: 0,
    oxbtcPriceUSD: 0,
    wethPriceUSD: 0,
    amountOut_Saved: 0,

    // Wallet state
    walletConnected: false,
    userAddress: null,

    // Timing
    lastCallTime: 0,
    lastRewardStatsCall: 0,

    // Flags
    pricesLoaded: false,
    latestSearch: false,
    firstRewardsAPYRun: 0,
    first3: 0,

    // Connection state
    previousAct: "",
    attemptf2f21: 0,
    connectionState: {
        isConnecting: false,
        lastAttempt: 0,
        attemptCount: 0
    },

    // Liquidity and rewards
    totalLiquidityInStakingContract: 0,
    Rewardduration: 0,

    // Position tracking
    userSelectedPosition: null,
    hasUserMadeSelection: false,
    functionCallCounter: 0,

    // Position data
    positionData: {},
    stakingPositionData: {},

    // Miscellaneous
    olduserAddy: "0x0",
    MinamountOut: undefined,

    // Data sources (mutable at runtime)
    customDataSource: defaultDataSource_Testnet,
    customBACKUPDataSource: defaultBACKUPDataSource_Testnet,
    customRPC: defaultRPC_Base,
    customRPC_ETH: defaultRPC_ETH,

    // Chart data
    graphData: null,
    prices: null,
    timestamps: null,

    // Provider/Signer (will be initialized at runtime)
    providerETH: "",
    signerETH: "",
    provider: "",
    signer: ""
};

// ============================================================================
// HELPER FUNCTION - Create CONFIG object with runtime values
// ============================================================================
/**
 * Creates a CONFIG object with runtime RPC and data source values
 * @param {string} customRPC - The RPC URL for Base network
 * @param {string} customDataSource - The data source URL
 * @returns {Object} Complete CONFIG object
 */
export function createConfig(customRPC, customDataSource) {
    return {
        ...CONFIG_TEMPLATE,
        RPC_URL: customRPC,
        DATA_URL: customDataSource + "mainnet_uniswap_v4_data.json"
    };
}

// ============================================================================
// EXPORTS SUMMARY
// ============================================================================
// This module exports:
// - Image URLs and token icon mappings (Base & Ethereum)
// - Contract addresses (Base network)
// - Token addresses and mappings (Base & Ethereum)
// - Network configuration (RPC URLs, chain configs)
// - Data source URLs
// - Application settings and constants
// - Throttle/timing constants
// - CONFIG template and creator function
// - Contracts list for UI
// - Initial state values
// - Global state initial values
// ============================================================================
