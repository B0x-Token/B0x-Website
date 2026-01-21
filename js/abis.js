/**
 * @module abis
 * @description Centralized repository for all contract ABIs used throughout the application
 *
 * This module contains all Application Binary Interfaces (ABIs) for smart contracts.
 * ABIs are organized by contract type for easy maintenance and reuse.
 */

// ============================================
// ERC20 TOKEN ABI
// ============================================

/**
 * Standard ERC20 token ABI
 * Includes common functions: allowance, approve, balanceOf, decimals, name, symbol, totalSupply, transfer, transferFrom
 */
export const ERC20_ABI = [
    { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }
];

// ============================================
// SWAP/ROUTING ABIs
// ============================================

/**
 * Split Route ABI for multi-hop and single-hop swap routing
 * Used for discovering optimal swap paths and getting output estimates
 */
export const SPLIT_ROUTE_ABI = [
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
        "type": "function",
        "stateMutability": "nonpayable"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "tokenZeroxBTC", "type": "address"},
            {"internalType": "address", "name": "tokenBZeroX", "type": "address"},
            {"internalType": "address", "name": "tokenIn", "type": "address"},
            {"internalType": "address", "name": "hookAddress", "type": "address"},
            {"internalType": "uint128", "name": "amountIn", "type": "uint128"}
        ],
        "name": "getOutput",
        "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// ============================================
// MULTICALL ABIs
// ============================================

/**
 * Multicall3 ABI - Variant 1 (view functions)
 * Used for batching multiple read calls into a single RPC request
 */
export const MULTICALL3_ABI = [{
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

/**
 * Multicall ABI - Full version with aggregate and aggregate3
 * Used for blockchain data fetching and position monitoring
 */
export const MULTICALL_ABI = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "address", "name": "target", "type": "address" },
                    { "internalType": "bytes", "name": "callData", "type": "bytes" }
                ],
                "internalType": "struct Multicall3.Call[]",
                "name": "calls",
                "type": "tuple[]"
            }
        ],
        "name": "aggregate",
        "outputs": [
            { "internalType": "uint256", "name": "blockNumber", "type": "uint256" },
            { "internalType": "bytes[]", "name": "returnData", "type": "bytes[]" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
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
        "stateMutability": "view",
        "type": "function"
    }
];

/**
 * Multicall ABI2 - Payable version
 * Simpler aggregate3 implementation for swap estimations
 */
export const MULTICALL_ABI2 = [
    {
        "inputs": [{"components": [{"name": "target", "type": "address"}, {"name": "allowFailure", "type": "bool"}, {"name": "callData", "type": "bytes"}], "name": "calls", "type": "tuple[]"}],
        "name": "aggregate3",
        "outputs": [{"components": [{"name": "success", "type": "bool"}, {"name": "returnData", "type": "bytes"}], "type": "tuple[]"}],
        "stateMutability": "payable",
        "type": "function"
    }
];

/**
 * Multicall ABI - Payable version with aggregate and aggregate3
 * Used in data-loader for blockchain monitoring
 */
export const MULTICALL_ABI_PAYABLE = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "address", "name": "target", "type": "address" },
                    { "internalType": "bytes", "name": "callData", "type": "bytes" }
                ],
                "internalType": "struct Multicall3.Call[]",
                "name": "calls",
                "type": "tuple[]"
            }
        ],
        "name": "aggregate",
        "outputs": [
            { "internalType": "uint256", "name": "blockNumber", "type": "uint256" },
            { "internalType": "bytes[]", "name": "returnData", "type": "bytes[]" }
        ],
        "stateMutability": "payable",
        "type": "function"
    },
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

// ============================================
// MINING CONTRACT ABI
// ============================================

/**
 * Mining/Proof-of-Work Contract ABI
 * Functions for reading mining statistics, difficulty, rewards, etc.
 */
export const CONTRACT_ABI = [
    { "inputs": [], "name": "miningTarget", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "getMiningDifficulty", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "epochCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "inflationMined", "outputs": [{ "internalType": "uint256", "name": "YearlyInflation", "type": "uint256" }, { "internalType": "uint256", "name": "EpochsPerYear", "type": "uint256" }, { "internalType": "uint256", "name": "RewardsAtTime", "type": "uint256" }, { "internalType": "uint256", "name": "TimePerEpoch", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "blocksToReadjust", "outputs": [{ "internalType": "uint256", "name": "blocks", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "seconds_Until_adjustmentSwitch", "outputs": [{ "internalType": "uint256", "name": "secs", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "latestDifficultyPeriodStarted", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "latestDifficultyPeriodStarted2", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "rewardEra", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "readjustsToWhatDifficulty", "outputs": [{ "internalType": "uint256", "name": "newDifficulty", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "tokensMinted", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "maxSupplyForEra", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];

// ============================================
// POSITION FINDER ABI
// ============================================

/**
 * Position Finder Pro ABI
 * Advanced functions for discovering user positions with filtering
 */
export const POSITION_FINDER_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "user", "type": "address" },
            { "internalType": "uint256", "name": "startId", "type": "uint256" },
            { "internalType": "uint256", "name": "endId", "type": "uint256" },
            { "internalType": "address", "name": "Token0", "type": "address" },
            { "internalType": "address", "name": "Token1", "type": "address" },
            { "internalType": "address", "name": "HookAddress", "type": "address" },
            { "internalType": "uint256", "name": "minTokenA", "type": "uint256" }
        ],
        "name": "findUserTokenIdswithMinimum",
        "outputs": [
            { "internalType": "uint256[]", "name": "ownedTokens", "type": "uint256[]" },
            { "internalType": "uint256[]", "name": "amountTokenA", "type": "uint256[]" },
            { "internalType": "uint256[]", "name": "amountTokenB", "type": "uint256[]" },
            { "internalType": "uint128[]", "name": "positionLiquidity", "type": "uint128[]" },
            { "internalType": "int128[]", "name": "feesOwedTokenA", "type": "int128[]" },
            { "internalType": "int128[]", "name": "feesOwedTokenB", "type": "int128[]" },
            {
                "internalType": "struct PoolKey[]", "name": "poolKeyz", "type": "tuple[]",
                "components": [
                    { "internalType": "address", "name": "currency0", "type": "address" },
                    { "internalType": "address", "name": "currency1", "type": "address" },
                    { "internalType": "uint24", "name": "fee", "type": "uint24" },
                    { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
                    { "internalType": "address", "name": "hooks", "type": "address" }
                ]
            },
            { "internalType": "uint256[]", "name": "poolInfo", "type": "uint256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
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
            { "internalType": "uint256[]", "name": "poolInfo", "type": "uint256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// ============================================
// Note: Additional specialized ABIs
// ============================================

/**
 * Note: There are many additional inline ABIs throughout the codebase
 * used for specific operations like:
 * - Token swapper variants
 * - Position manager operations
 * - Staking contract functions
 * - Hook management
 * - Reward collection
 *
 * These remain in their respective modules (staking.js, swaps.js, positions.js)
 * since they're only used locally within specific functions.
 *
 * This file contains only the SHARED ABIs used across multiple modules.
 */
