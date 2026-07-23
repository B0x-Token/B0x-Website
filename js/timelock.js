/**
 * @module timelock
 * @description TimeLock Vault functionality for staking Uniswap V4 NFTs under a time lock.
 *
 * Handles:
 * - Creating TimeLockVaults via the TimeLockFactory
 * - Loading and displaying the user's vaults
 * - Staking/unstaking NFTs through the vault
 * - Collecting rewards through the vault
 * - Transferring vault ownership
 */

import {
    positionManager_address,
    tokenAddresses,
    contractAddress_PositionFinderPro,
    contractAddress_Swapper,
    hookAddress,
    MULTICALL_ADDRESS,
    WETHbase
} from './config.js';

import { getSymbolFromAddress, tokenAddressesDecimals } from './utils.js';

import {
    showSuccessNotificationCentered,
    showErrorNotificationCentered,
    showInfoNotificationCentered,
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    showButtonToast,
    setButtonToastAnchor,
    clearButtonToastAnchor
} from './ui.js';

import { positionData, stakingPositionData } from './positions.js';
import { triggerRefresh, isSearchingLogs } from './data-loader.js';

// ============================================
// CONFIGURATION
// ============================================

// Address of the deployed TimeLockFactory contract.
// Update this when the contract is deployed.
export const TIMELOCK_FACTORY_ADDRESS = "0x66194F5527102ade749f9bE950A30cCCD9926B91";
//old 0x7d1CFE679f6BA6483191ed13Ddf021F5D8cAD5aD

// Must match the factory's MAX_PAGE_SIZE constant.
const VAULT_PAGE_SIZE = 100;
// ============================================
// ABIs
// ============================================

const TIMELOCK_FACTORY_ABI = [
    {
        "inputs": [{ "internalType": "uint256", "name": "unlockTime", "type": "uint256" }],
        "name": "createVault",
        "outputs": [{ "internalType": "address", "name": "vault", "type": "address" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "user", "type": "address" },
            { "internalType": "uint256", "name": "start", "type": "uint256" },
            { "internalType": "uint256", "name": "count", "type": "uint256" }
        ],
        "name": "getVaults",
        "outputs": [{ "internalType": "address[]", "name": "result", "type": "address[]" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
        "name": "getVaultCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "myLatestVault",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "vault", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "unlockTime", "type": "uint256" }
        ],
        "name": "VaultCreated",
        "type": "event"
    },
    {
        "inputs": [{ "internalType": "address payable", "name": "vault", "type": "address" }],
        "name": "queryFeeForVaultMetric",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "user", "type": "address" },
            { "internalType": "uint256", "name": "start", "type": "uint256" },
            { "internalType": "uint256", "name": "count", "type": "uint256" }
        ],
        "name": "getVaultsB0xShares",
        "outputs": [
            { "internalType": "address[]", "name": "vaults", "type": "address[]" },
            { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address[]", "name": "contractsToWithdrawFrom", "type": "address[]" },
            { "internalType": "uint256[][]", "name": "tokenIds", "type": "uint256[][]" },
            { "internalType": "IERC20[][]", "name": "ERC20sToGetRewardAndWithdraw", "type": "address[][]" }
        ],
        "name": "SuperWithdrawer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address[]", "name": "contractsToDestroy", "type": "address[]" }
        ],
        "name": "SuperDestroyer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "AmountWeOWE_PER_POSITION2",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
];

const TIMELOCK_VAULT_ABI = [
    // View functions
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "unlockTime",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "isLocked",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "secondsUntilUnlock",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getStakedTokenIds",
        "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "stakedTokenCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "offset", "type": "uint256" },
            { "internalType": "uint256", "name": "limit", "type": "uint256" }
        ],
        "name": "getStakedTokenIdsPaged",
        "outputs": [
            { "internalType": "uint256[]", "name": "page", "type": "uint256[]" },
            { "internalType": "uint256", "name": "total", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
        "name": "tokenBalances",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "stakedNFTs",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    // NFT staking
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "stakeUniswapV4NFT",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "withdrawNFT",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // ERC-20 deposit/withdraw
    {
        "inputs": [
            { "internalType": "address", "name": "token", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "depositToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
        "name": "withdrawToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // Rewards
    {
        "inputs": [],
        "name": "getRewards",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address[]", "name": "rewardTokensToGet", "type": "address[]" }
        ],
        "name": "getRewardForTokensContract",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "startIndex", "type": "uint256" },
            { "internalType": "uint256", "name": "Count", "type": "uint256" },
            { "internalType": "address[]", "name": "additionalERC20s", "type": "address[]" }
        ],
        "name": "exitAllTogether",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]" },
            { "internalType": "IERC20[]", "name": "ERC20sToGetRewardAndWithdraw", "type": "address[]" }
        ],
        "name": "withdraw_Multiple_NFTs_And_ERC20s",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // Ownership
    {
        "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Multicall3 aggregate3 — batches per-vault view calls into one RPC round trip.
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

// Minimal Swapper ABI — just enough to read the current B0x/0xBTC pool price
// ratio for the "Total 0xBTC Staked" conversion below.
const SWAPPER_PRICE_RATIO_ABI = [{
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
}];

const NFT_APPROVE_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// ============================================
// STATE
// ============================================

let selectedVaultAddress = null;
let userVaults = []; // array of { address, unlockTime, isLocked, stakedTokenIds }
let masqueradeAddress = null; // when set, vaults are loaded for this address instead of window.userAddress
let vaultSearchQuery = ''; // current text in the vault search box, used to filter rendered vault cards
let singleVaultView = false; // true when userVaults holds a single direct-address search result, not the bulk list

// Display-only sort for the rendered vault card list ('staked' | 'unlock').
// userVaults itself always stays sorted most-B0x-staked-first (see the sort
// in loadUserVaults) since SuperWithdrawer/SuperDestroyer's batch-picking
// logic depends on that canonical order regardless of what the user is
// currently looking at.
let vaultSortMode = 'staked';

// Bumped every time a new vault load/search starts. In-flight loadUserVaults
// pagination checks this after each await and bails out silently if it no
// longer matches — that's how a direct-address search interrupts a bulk load
// already in progress instead of racing it.
let loadGeneration = 0;

// Below this many vaults, the search box is hidden — not needed for a short list.
const VAULT_SEARCH_THRESHOLD = 0;

// ============================================
// CUSTOM ERROR DECODING
// ============================================

// 4-byte selectors for the vault's custom errors (keccak256 of the signature)
const VAULT_ERRORS = {
    '0x1f2a2005': 'ZeroAmount — this token has no balance in the vault.',
    '0x4bed5e54': 'TransferFailed — the token transfer was rejected.',
    '0x30cd7471': 'NotOwner — you are not the owner of this vault.',
    '0x0a27042e': 'StillLocked — the vault is still time-locked and cannot be withdrawn yet.',
    '0x69a37f7b': 'NFTAlreadyStaked — that NFT is already staked in this vault.',
    '0xe16a9952': 'NFTNotStaked — that NFT is not staked in this vault.',
    '0x0a4b81f4': 'VaultAlreadyUnlocked — vault is unlocked; ownership transfer is disabled.',
};

function decodeVaultError(err) {
    // Try to extract the 4-byte selector from the error data
    const data = err?.error?.data?.data
        || err?.error?.data?.originalError?.data
        || err?.data?.data
        || err?.data;
    if (typeof data === 'string' && data.length >= 10) {
        const selector = data.slice(0, 10).toLowerCase();
        if (VAULT_ERRORS[selector]) return VAULT_ERRORS[selector];
    }
    return err?.reason || err?.message || 'Transaction failed.';
}

// ============================================
// HELPERS
// ============================================

function disableBtn(id, msg = '<span class="spinner"></span> Processing...') {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';
    btn.innerHTML = msg;
}

function enableBtn(id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.pointerEvents = '';
    if (btn.dataset.orig) btn.innerHTML = btn.dataset.orig;
}

function formatUnlockTime(unixTs) {
    const d = new Date(Number(unixTs) * 1000);
    return d.toLocaleString();
}

function formatCountdown(seconds) {
    if (seconds <= 0) return 'Unlocked';
    const days = Math.floor(seconds / 86400);
    const hrs  = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hrs}h ${mins}m`;
    if (hrs > 0)  return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
}

function isFactoryDeployed() {
    return TIMELOCK_FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000";
}

// Renders the "Loading vaults..." progress line as a percentage + fraction
// instead of a bare spinner-less message, e.g. "10% (10/100 vaults loaded)".
function renderVaultLoadProgress(container, loaded, total) {
    if (!container) return;
    const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
    container.innerHTML = `<p style="color:#aaa">Loading vaults... ${pct}% (${loaded}/${total} vaults loaded)</p>`;
}

// ============================================
// RPC PROVIDER RESOLUTION
// ============================================

// Tenderly's public Base gateway is tested exactly once (on first read call);
// if it responds we use it for every Timelock RPC call for the rest of the
// session, otherwise we fall back to window.customRPC / the default Base RPC
// and stick with that — no re-probing on later calls.
const TENDERLY_PUBLIC_RPC = 'https://gateway.tenderly.co/public/base';

let _timelockRpcUrl = null;
let _timelockRpcResolving = null;

async function resolveTimelockRpcUrl() {
    if (_timelockRpcUrl) return _timelockRpcUrl;
    if (_timelockRpcResolving) return _timelockRpcResolving;

    const fallbackUrl = window.customRPC || 'https://mainnet.base.org';

    _timelockRpcResolving = (async () => {
        try {
            const testProvider = new ethers.providers.JsonRpcProvider(TENDERLY_PUBLIC_RPC);
            await testProvider.getBlockNumber();
            _timelockRpcUrl = TENDERLY_PUBLIC_RPC;
        } catch (e) {
            console.warn('[Timelock] Tenderly public RPC test failed, falling back:', e);
            _timelockRpcUrl = fallbackUrl;
        }
        return _timelockRpcUrl;
    })();

    return _timelockRpcResolving;
}

async function getTimelockProvider() {
    const url = await resolveTimelockRpcUrl();
    return new ethers.providers.JsonRpcProvider(url);
}

// ============================================
// STATIC PAGE-LOAD DATA: B0x/0xBTC PRICE RATIO + PER-POSITION B0x FEE
// ============================================

// Both of these are read-only values that don't depend on any specific vault
// or account, so they're fetched together in a single Multicall3 aggregate3
// batch (one RPC round trip instead of two) and cached once per page load:
//  - price ratio: for the "Total 0xBTC Staked" display, doesn't move fast
//    enough to justify re-fetching on every vault refresh.
//  - AmountWeOWE_PER_POSITION2: the factory's per-position anti-spam fee,
//    adjusted automatically on-chain, so the frontend reads it live instead
//    of hardcoding it. Only used for the approve-amount estimate and display
//    copy — approveIfNeeded grants unlimited allowance and the vault/factory
//    pull the real current fee at tx time regardless of what's cached here.
let _cachedPriceRatio = null;
let _cachedFeePerPositionB0x = null;
let _staticDataFetching = null;
const DEFAULT_FEE_PER_POSITION_B0x = 50; // fallback if the RPC call fails

async function fetchStaticTimelockDataOnce() {
    if (_cachedPriceRatio !== null && _cachedFeePerPositionB0x !== null) {
        return { priceRatio: _cachedPriceRatio, feePerPosition: _cachedFeePerPositionB0x };
    }
    if (_staticDataFetching) return _staticDataFetching;

    _staticDataFetching = (async () => {
        try {
            const provider = await getTimelockProvider();
            const swapperInterface = new ethers.utils.Interface(SWAPPER_PRICE_RATIO_ABI);
            const factoryInterface = new ethers.utils.Interface(TIMELOCK_FACTORY_ABI);
            const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL3_ABI, provider);

            const calls = [
                {
                    target: contractAddress_Swapper,
                    allowFailure: true,
                    callData: swapperInterface.encodeFunctionData('getPriceRatio', [tokenAddresses['B0x'], tokenAddresses['0xBTC'], hookAddress])
                },
                {
                    target: TIMELOCK_FACTORY_ADDRESS,
                    allowFailure: true,
                    callData: factoryInterface.encodeFunctionData('AmountWeOWE_PER_POSITION2')
                }
            ];

            const results = await withRpcRetry(() => multicallContract.aggregate3(calls), 'multicall getPriceRatio + AmountWeOWE_PER_POSITION2');

            if (results[0].success) {
                _cachedPriceRatio = swapperInterface.decodeFunctionResult('getPriceRatio', results[0].returnData)[0];
                window.ratioz = _cachedPriceRatio; // shared global other widgets already read
            } else {
                console.warn('[Timelock] getPriceRatio call failed');
            }

            if (results[1].success) {
                const feeBN = factoryInterface.decodeFunctionResult('AmountWeOWE_PER_POSITION2', results[1].returnData)[0];
                _cachedFeePerPositionB0x = parseFloat(ethers.utils.formatUnits(feeBN, 18));
            } else {
                console.warn('[Timelock] AmountWeOWE_PER_POSITION2 call failed');
                _cachedFeePerPositionB0x = DEFAULT_FEE_PER_POSITION_B0x;
            }

            return { priceRatio: _cachedPriceRatio, feePerPosition: _cachedFeePerPositionB0x };
        } catch (err) {
            console.error('[Timelock] fetchStaticTimelockDataOnce error:', err);
            return { priceRatio: _cachedPriceRatio, feePerPosition: _cachedFeePerPositionB0x || DEFAULT_FEE_PER_POSITION_B0x };
        } finally {
            _staticDataFetching = null;
        }
    })();

    return _staticDataFetching;
}

async function fetchPriceRatioOnce() {
    return (await fetchStaticTimelockDataOnce()).priceRatio;
}

async function fetchFeePerPositionB0x() {
    return (await fetchStaticTimelockDataOnce()).feePerPosition;
}

/**
 * Fills in every ".timelock-fee-per-position" span with the live on-chain fee.
 */
function _renderFeePerPositionDisplays(fee) {
    const feeStr = Number.isInteger(fee) ? String(fee) : fee.toFixed(2);
    document.querySelectorAll('.timelock-fee-per-position').forEach(el => {
        el.textContent = feeStr;
    });
}

// ============================================
// RPC RETRY / BACKOFF
// ============================================

// Generic exponential-backoff retry for read-only RPC calls. Centralizing
// this here means every Timelock view call gets the same resilience without
// hand-rolling a retry loop at each site — important once VAULT_PAGE_SIZE is
// turned down (more, smaller batches means more RPC round trips, and more
// chances to hit a public RPC's rate limit).
const RPC_RETRY_MAX_ATTEMPTS = 8;
const RPC_RETRY_BASE_DELAY_MS = 500;
const RPC_RETRY_MAX_DELAY_MS = 15000;

// Enforced after every successful RPC call (on top of the backoff on
// failures below) so consecutive calls never fire back-to-back, however
// tight the loop calling withRpcRetry is.
const RPC_CALL_PACING_MS = 500;

async function withRpcRetry(fn, label = 'RPC call', maxAttempts = RPC_RETRY_MAX_ATTEMPTS) {
    let lastErr;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const result = await fn();
            await sleep(RPC_CALL_PACING_MS);
            return result;
        } catch (err) {
            lastErr = err;
            if (attempt === maxAttempts - 1) break;
            const backoff = Math.min(RPC_RETRY_BASE_DELAY_MS * Math.pow(2, attempt), RPC_RETRY_MAX_DELAY_MS);
            const jitter = backoff * 0.25 * Math.random();
            console.warn(`[Timelock] ${label} failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${Math.round(backoff + jitter)}ms:`, err);
            await sleep(backoff + jitter);
        }
    }
    throw lastErr;
}

// Fetches every staked token ID from a vault via stakedTokenCount() +
// getStakedTokenIdsPaged(), VAULT_PAGE_SIZE (100) at a time, instead of the
// unbounded getStakedTokenIds() — so a vault with hundreds/thousands of
// staked NFTs can't blow up a single RPC call.
async function fetchAllStakedTokenIds(vaultContract) {
    const total = (await withRpcRetry(() => vaultContract.stakedTokenCount(), 'stakedTokenCount')).toNumber();
    const ids = [];
    for (let offset = 0; offset < total; offset += VAULT_PAGE_SIZE) {
        const [page] = await withRpcRetry(
            () => vaultContract.getStakedTokenIdsPaged(offset, VAULT_PAGE_SIZE),
            `getStakedTokenIdsPaged(offset=${offset})`
        );
        ids.push(...page.map(id => id.toString()));
    }
    return ids;
}

// ============================================
// LOAD PAGE
// ============================================

/**
 * Called when the Timelock tab becomes active.
 * Renders the allowed NFT list and loads user vaults if wallet is connected.
 */
export function loadTimelockPage() {
    renderAllowedNFTs();
    _updateMasqueradeBanner();
    fetchFeePerPositionB0x().then(_renderFeePerPositionDisplays);
    if (window.walletConnected || masqueradeAddress) {
        loadUserVaults();
    }
}

// ============================================
// MASQUERADE
// ============================================

/**
 * Sets a masquerade address and reloads vaults for that address.
 * Your connected wallet is still used to sign permissionless withdrawal txs.
 */
export async function setMasquerade() {
    setButtonToastAnchor('timelockMasqueradeBtn');
    try {
        const input = document.getElementById('timelock-masquerade-input');
        const addr = input?.value?.trim();

        if (!addr || !ethers.utils.isAddress(addr)) {
            showButtonToast('error', 'Invalid Address', 'Enter a valid Ethereum address to masquerade as.');
            return;
        }

        masqueradeAddress = ethers.utils.getAddress(addr);
        selectedVaultAddress = null;

        const panel = document.getElementById('timelock-vault-actions');
        if (panel) panel.style.display = 'none';

        _updateMasqueradeBanner();

        if (!isFactoryDeployed()) {
            showButtonToast('error', 'Not Deployed', 'TimeLock Factory address not set.');
            return;
        }

        showButtonToast('info', 'Masquerading', `Loading vaults for ${masqueradeAddress}...`);
        await loadUserVaults();
    } finally {
        clearButtonToastAnchor();
    }
}

/**
 * Clears the selected vault and hides its actions panel — used when the
 * connected account changes so a previously selected vault (belonging to
 * the old account) isn't left showing stake/withdraw/transfer controls.
 */
export function resetVaultSelection() {
    selectedVaultAddress = null;
    const panel = document.getElementById('timelock-vault-actions');
    if (panel) panel.style.display = 'none';
}

/**
 * Clears masquerade mode and reloads the connected wallet's own vaults.
 */
export async function clearMasquerade() {
    setButtonToastAnchor('timelockClearMasqueradeBtn');
    try {
        masqueradeAddress = null;
        selectedVaultAddress = null;

        const input = document.getElementById('timelock-masquerade-input');
        if (input) input.value = '';

        const panel = document.getElementById('timelock-vault-actions');
        if (panel) panel.style.display = 'none';

        _updateMasqueradeBanner();
        await loadUserVaults();
    } finally {
        clearButtonToastAnchor();
    }
}

function _updateMasqueradeBanner() {
    const banner = document.getElementById('timelock-masquerade-banner');
    const heading = document.getElementById('timelock-vaults-heading');
    const stakeWarning = document.getElementById('timelock-stake-masquerade-warning');
    const stakeCost = document.getElementById('timelock-stake-masquerade-cost');

    if (masqueradeAddress) {
        const short = `${masqueradeAddress.slice(0, 10)}...${masqueradeAddress.slice(-8)}`;
        if (banner) {
            banner.style.display = 'block';
            banner.innerHTML = `
                <span style="color:#f0a500;font-weight:700">MASQUERADE ACTIVE</span>
                — viewing vaults for <span style="color:#fff;font-family:monospace">${short}</span>.
                Your wallet signs permissionless withdrawal transactions.
                <button class="btn-secondary" onclick="Timelock.clearMasquerade()" style="margin-left:12px;padding:4px 12px;font-size:0.85em">Exit Masquerade</button>`;
        }
        if (heading) heading.textContent = `Vaults for ${short}`;
        if (stakeWarning) stakeWarning.style.display = 'block';
        if (stakeCost) stakeCost.style.display = 'inline';
        document.querySelectorAll('.timelock-owner-wallet-phrase').forEach(el => {
            el.textContent = `the contract owner's wallet(${short})`;
        });
    } else {
        if (banner) banner.style.display = 'none';
        if (heading) heading.textContent = 'Your Timelock Vaults';
        if (stakeWarning) stakeWarning.style.display = 'none';
        if (stakeCost) stakeCost.style.display = 'none';
        document.querySelectorAll('.timelock-owner-wallet-phrase').forEach(el => {
            el.textContent = 'your wallet';
        });
    }
}

// ============================================
// ALLOWED NFTs DISPLAY
// ============================================

/**
 * Renders the list of allowed (tracked) NFT positions the user owns that can be deposited.
 */
export function renderAllowedNFTs() {
    const container = document.getElementById('timelock-allowed-nfts');
    if (!container) return;

    if (!window.walletConnected) {
        container.innerHTML = '<p style="color:#aaa">Connect your wallet to see your eligible positions.</p>';
        return;
    }

    const entries = Object.values(positionData || {});
    if (entries.length === 0) {
        container.innerHTML = '<p style="color:#aaa">No eligible Uniswap V4 B0x/0xBTC positions found in your wallet.</p>';
        return;
    }

    let html = '<div class="timelock-nft-grid">';
    for (const pos of entries) {
        const tokenId = pos.id.split('_')[1];
        const amount0 = pos.currentTokenA ? Number(pos.currentTokenA).toFixed(4) : '0';
        const amount1 = pos.currentTokenB ? Number(pos.currentTokenB).toFixed(4) : '0';
        const symA = pos.tokenA || 'TokenA';
        const symB = pos.tokenB || 'TokenB';
        html += `
            <div class="timelock-nft-card">
                <div class="timelock-nft-id">NFT #${tokenId}</div>
                <div class="timelock-nft-pool">${pos.pool || 'B0x/0xBTC'}</div>
                <div class="timelock-nft-amounts">${amount0} ${symA} / ${amount1} ${symB}</div>
            </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// VAULT LOADING
// ============================================
var first11111 = 0;
/**
 * Loads all TimeLockVaults for the connected user (or masquerade address) and renders them.
 */
export async function loadUserVaults() {
    const container = document.getElementById('timelock-vaults-container');
    if (!container) return;

    if(first11111 == 0){

        renderVaultCards(container);
        first11111 = 1;
        
    }
    const myGeneration = ++loadGeneration;
    singleVaultView = false;
    vaultSearchQuery = '';
    const searchInput = document.getElementById('timelock-vault-search-input');
    if (searchInput) searchInput.value = '';

    const targetAddress = masqueradeAddress || window.userAddress;

    if (!targetAddress) {
        container.innerHTML = '<p style="color:#aaa">Connect wallet to see your vaults.</p>';
        return;
    }

    if (!isFactoryDeployed()) {
        container.innerHTML = '<p style="color:#f0a500">TimeLock Factory contract not yet deployed. Update TIMELOCK_FACTORY_ADDRESS in timelock.js.</p>';
        return;
    }

    container.innerHTML = '<p style="color:#aaa">Loading vaults...</p>';

    // Hide the stale totals banner immediately so the previous account's
    // B0x/0xBTC totals don't linger while the new account's vaults load
    // (or forever, if the new account turns out to have zero vaults).
    const totalElReset = document.getElementById('timelock-vaults-total');
    if (totalElReset) totalElReset.style.display = 'none';

    _updateMasqueradeBanner();

    try {
        // Kicked off in parallel with the vault RPC calls below; only actually
        // hits the chain once per page load (cached after that).
        const priceRatioPromise = fetchPriceRatioOnce();

        const provider = await getTimelockProvider();
        const factoryContract = new ethers.Contract(TIMELOCK_FACTORY_ADDRESS, TIMELOCK_FACTORY_ABI, provider);

        const vaultCount = (await withRpcRetry(() => factoryContract.getVaultCount(targetAddress), 'getVaultCount')).toNumber();
        if (myGeneration !== loadGeneration) return; // a direct-address search superseded this load

        const vaultAddresses = [];
        // vault address -> B0x-denominated staked amount, computed on-chain in
        // one call per page (getVaultsB0xShares) instead of a per-vault
        // getIDSofStakedTokensForUserwithMinimum + NFT-position decode.
        const b0xStakedByVault = new Map();
        for (let start = 0; start < vaultCount; start += VAULT_PAGE_SIZE) {
            if (myGeneration !== loadGeneration) return;

            const [page, amounts] = await withRpcRetry(
                () => factoryContract.getVaultsB0xShares(targetAddress, start, VAULT_PAGE_SIZE),
                `getVaultsB0xShares(start=${start})`
            );

            if (myGeneration !== loadGeneration) return;
            vaultAddresses.push(...page);
            for (let i = 0; i < page.length; i++) {
                b0xStakedByVault.set(page[i].toLowerCase(), parseFloat(ethers.utils.formatUnits(amounts[i], 18)));
            }
        }

        if (myGeneration !== loadGeneration) return;

        if (vaultAddresses.length === 0) {
            const who = masqueradeAddress
                ? `${masqueradeAddress.slice(0, 8)}...${masqueradeAddress.slice(-6)}`
                : 'You';
            container.innerHTML = `<p style="color:#aaa">${who} have no timelock vaults yet.</p>`;
            userVaults = [];
            await renderSuperWithdrawSection();
            await renderSuperDestroySection();
            // The previously selected vault (e.g. one just transferred away) no
            // longer belongs to this account — hide its stale actions panel
            // instead of leaving it displayed below the empty-state message.
            if (selectedVaultAddress) resetVaultSelection();
            return;
        }

        renderVaultLoadProgress(container, 0, vaultAddresses.length);

        const vaultInterface = new ethers.utils.Interface(TIMELOCK_VAULT_ABI);
        const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL3_ABI, provider);
        const DETAIL_CALLS_PER_VAULT = 5; // unlockTime, isLocked, secondsUntilUnlock, stakedTokenCount, getStakedTokenIdsPaged(0, VAULT_PAGE_SIZE)

        const loadedVaults = [];
        // Batch in the same page size as the address pagination above, so a
        // spam-inflated vault count still can't force one unbounded multicall.
        for (let batchStart = 0; batchStart < vaultAddresses.length; batchStart += VAULT_PAGE_SIZE) {
            if (myGeneration !== loadGeneration) return;

            const batchAddrs = vaultAddresses.slice(batchStart, batchStart + VAULT_PAGE_SIZE);
            const calls = [];
            for (const addr of batchAddrs) {
                calls.push(
                    { target: addr, allowFailure: true, callData: vaultInterface.encodeFunctionData('unlockTime') },
                    { target: addr, allowFailure: true, callData: vaultInterface.encodeFunctionData('isLocked') },
                    { target: addr, allowFailure: true, callData: vaultInterface.encodeFunctionData('secondsUntilUnlock') },
                    { target: addr, allowFailure: true, callData: vaultInterface.encodeFunctionData('stakedTokenCount') },
                    { target: addr, allowFailure: true, callData: vaultInterface.encodeFunctionData('getStakedTokenIdsPaged', [0, VAULT_PAGE_SIZE]) }
                );
            }

            let results;
            try {
                results = await withRpcRetry(
                    () => multicallContract.aggregate3(calls),
                    `multicall aggregate3 [${batchStart}, ${batchStart + batchAddrs.length})`
                );
            } catch (e) {
                console.warn(`Multicall gave up for vaults [${batchStart}, ${batchStart + batchAddrs.length}) after ${RPC_RETRY_MAX_ATTEMPTS} attempts:`, e);
                results = calls.map(() => ({ success: false, returnData: '0x' }));
            }
            if (myGeneration !== loadGeneration) return;

            for (let i = 0; i < batchAddrs.length; i++) {
                const addr = batchAddrs[i];
                const totalB0xStaked = b0xStakedByVault.get(addr.toLowerCase()) || 0;
                const [unlockTimeRes, lockedRes, secsLeftRes, countRes, nftIdsRes] = results.slice(
                    i * DETAIL_CALLS_PER_VAULT, i * DETAIL_CALLS_PER_VAULT + DETAIL_CALLS_PER_VAULT
                );

                if (!unlockTimeRes.success || !lockedRes.success || !secsLeftRes.success || !countRes.success || !nftIdsRes.success) {
                    console.warn(`Failed to load vault ${addr} via multicall`);
                    loadedVaults.push({ address: addr, unlockTime: '0', isLocked: false, secondsLeft: 0, stakedTokenIds: [], _stakedTokenTotal: 0, totalB0xStaked });
                    continue;
                }

                const [unlockTime] = vaultInterface.decodeFunctionResult('unlockTime', unlockTimeRes.returnData);
                const [locked] = vaultInterface.decodeFunctionResult('isLocked', lockedRes.returnData);
                const [secsLeft] = vaultInterface.decodeFunctionResult('secondsUntilUnlock', secsLeftRes.returnData);
                const [totalStaked] = vaultInterface.decodeFunctionResult('stakedTokenCount', countRes.returnData);
                const [firstPage] = vaultInterface.decodeFunctionResult('getStakedTokenIdsPaged', nftIdsRes.returnData);

                loadedVaults.push({
                    address: addr,
                    unlockTime: unlockTime.toString(),
                    isLocked: locked,
                    secondsLeft: secsLeft.toNumber(),
                    stakedTokenIds: firstPage.map(id => id.toString()),
                    _stakedTokenTotal: totalStaked.toNumber(),
                    totalB0xStaked
                });
            }

            if (myGeneration !== loadGeneration) return;
            renderVaultLoadProgress(container, loadedVaults.length, vaultAddresses.length);
        }

        if (myGeneration !== loadGeneration) return;

        // Almost every vault has under VAULT_PAGE_SIZE staked NFTs, so the single
        // multicall page above already has the full list. For the rare vault that
        // has more, page through the rest with getStakedTokenIdsPaged rather than
        // ever issuing one unbounded getStakedTokenIds() RPC call.
        for (const vault of loadedVaults) {
            var sizeToGet = VAULT_PAGE_SIZE/2;
            if(sizeToGet<1){
                sizeToGet=1;
            }
            if (myGeneration !== loadGeneration) return;
            if (vault._stakedTokenTotal <= vault.stakedTokenIds.length) continue;

            const vaultContract = new ethers.Contract(vault.address, TIMELOCK_VAULT_ABI, provider);
            for (let offset = vault.stakedTokenIds.length; offset < vault._stakedTokenTotal; offset += sizeToGet) {
                if (myGeneration !== loadGeneration) return;
                const [page] = await withRpcRetry(
                    () => vaultContract.getStakedTokenIdsPaged(offset, sizeToGet),
                    `getStakedTokenIdsPaged(${vault.address}, offset=${offset})`
                );
                vault.stakedTokenIds.push(...page.map(id => id.toString()));
            }
        }
        loadedVaults.forEach(v => delete v._stakedTokenTotal);

        // 1) Most B0x staked first.
        // 2) Tiebreaker: soonest to unlock first.
        loadedVaults.sort((a, b) => {
            const b0xDiff = b.totalB0xStaked - a.totalB0xStaked;
            if (b0xDiff !== 0) return b0xDiff;
            return a.secondsLeft - b.secondsLeft;
        });

        userVaults = loadedVaults;
        // Same staleness guard as the empty-list branch above: if the vault
        // that was selected is no longer in this account's vault list (e.g.
        // it was just transferred away), don't leave its actions panel showing.
        if (selectedVaultAddress && !userVaults.some(v => v.address === selectedVaultAddress)) {
            resetVaultSelection();
        }
        await priceRatioPromise;
        if (myGeneration !== loadGeneration) return;
        renderVaultCards(container);
        await renderSuperWithdrawSection();
        await renderSuperDestroySection();
    } catch (err) {
        if (myGeneration !== loadGeneration) return;
        console.error("Error loading vaults:", err);
        container.innerHTML = `<p style="color:#e55">Error loading vaults: ${err.message}</p>`;
    }
}

/**
 * Bypasses the bulk paginated load and jumps straight to a single vault
 * address entered in the search box. Cancels any in-flight loadUserVaults
 * pagination (via loadGeneration) so the two never race for the container.
 */
async function searchVaultByAddress(vaultAddress) {
    const container = document.getElementById('timelock-vaults-container');
    if (!container) return;

    const myGeneration = ++loadGeneration;
    singleVaultView = false;

    const targetAddress = masqueradeAddress || window.userAddress;
    const who = masqueradeAddress ? 'your masquerade address' : 'You';

    if (!targetAddress) {
        container.innerHTML = '<p style="color:#aaa">Connect wallet to see your vaults.</p>';
        return;
    }

    if (!isFactoryDeployed()) {
        container.innerHTML = '<p style="color:#f0a500">TimeLock Factory contract not yet deployed. Update TIMELOCK_FACTORY_ADDRESS in timelock.js.</p>';
        return;
    }

    container.innerHTML = '<p style="color:#aaa">Checking vault...</p>';

    try {
        const provider = await getTimelockProvider();
        const vaultContract = new ethers.Contract(vaultAddress, TIMELOCK_VAULT_ABI, provider);

        let owner;
        try {
            // Fewer attempts here — a bad address should fail fast, not take
            // the full backoff ladder before telling the user it's invalid.
            owner = await withRpcRetry(() => vaultContract.owner(), 'owner', 3);
        } catch (e) {
            if (myGeneration !== loadGeneration) return;
            container.innerHTML = `<p style="color:#e55">${vaultAddress} is not a valid TimeLock vault.</p>`;
            return;
        }
        if (myGeneration !== loadGeneration) return;

        if (owner.toLowerCase() !== targetAddress.toLowerCase()) {
            container.innerHTML = `<p style="color:#e55">This vault does not belong to ${who}.</p>`;
            return;
        }

        const [unlockTime, locked, secsLeft] = await Promise.all([
            withRpcRetry(() => vaultContract.unlockTime(), 'unlockTime'),
            withRpcRetry(() => vaultContract.isLocked(), 'isLocked'),
            withRpcRetry(() => vaultContract.secondsUntilUnlock(), 'secondsUntilUnlock')
        ]);
        if (myGeneration !== loadGeneration) return;

        const stakedTokenIds = await fetchAllStakedTokenIds(vaultContract);
        if (myGeneration !== loadGeneration) return;

        userVaults = [{
            address: vaultAddress,
            unlockTime: unlockTime.toString(),
            isLocked: locked,
            secondsLeft: secsLeft.toNumber(),
            stakedTokenIds
        }];
        singleVaultView = true;
        renderVaultCards(container);
        await renderSuperWithdrawSection();
        await renderSuperDestroySection();
    } catch (err) {
        if (myGeneration !== loadGeneration) return;
        console.error("Error searching for vault:", err);
        container.innerHTML = `<p style="color:#e55">Error looking up vault: ${err.message}</p>`;
    }
}

/**
 * Called from the search box's oninput handler. Re-renders the vault list
 * filtered to addresses/staked NFT ids matching `query`.
 */
export function filterVaults(query) {
    const trimmed = (query || '').trim();

    if (ethers.utils.isAddress(trimmed)) {
        // Full address entered — jump straight to that vault instead of
        // waiting on (or racing) the paginated bulk load.
        searchVaultByAddress(trimmed);
        return;
    }

    if (singleVaultView && trimmed === '') {
        // Box cleared after a direct-address search — restore the full list.
        loadUserVaults();
        return;
    }

    vaultSearchQuery = trimmed.toLowerCase();
    const container = document.getElementById('timelock-vaults-container');
    renderVaultCards(container);
}

/**
 * Called from the sort <select>'s onchange handler. Only changes how the
 * card list is displayed — userVaults itself keeps its canonical
 * most-staked-first order for the Super Withdraw/Destroy batch logic.
 */
export function setVaultSortMode(mode) {
    if (mode !== 'staked' && mode !== 'unlock') return;
    vaultSortMode = mode;
    const container = document.getElementById('timelock-vaults-container');
    renderVaultCards(container);
}

// Converts a human-readable B0x amount into its 0xBTC equivalent using the
// pool price ratio Timelock fetches for itself (see fetchPriceRatioOnce),
// falling back to window.ratioz if that hasn't resolved yet for some reason.
// Mirrors the token-order-dependent math used for the "TokenB is B0x" case
// in positions-ratio.js. Returns null if no ratio is available at all.
function convertB0xToOxBtc(b0xAmount) {
    const ratioz = _cachedPriceRatio || window.ratioz;
    if (!ratioz || ratioz.toString() === '0' || !b0xAmount) return null;

    try {
        const priceRatio = BigInt(ratioz.toString());
        const b0xWei = BigInt(ethers.utils.parseUnits(b0xAmount.toFixed(18), 18).toString());

        const zeroxBtcIsToken0 = BigInt(tokenAddresses['0xBTC'].toLowerCase()) < BigInt(tokenAddresses['B0x'].toLowerCase());
        const amountWith8Decimals0xBTC = zeroxBtcIsToken0
            ? (b0xWei * (10n ** 18n)) / priceRatio
            : (b0xWei * priceRatio) / (10n ** 18n);

        return parseFloat(ethers.utils.formatUnits(amountWith8Decimals0xBTC.toString(), 8));
    } catch (err) {
        console.error('convertB0xToOxBtc error:', err);
        return null;
    }
}

function renderVaultCards(container) {
    if (!container) return;

    const searchWrap = document.getElementById('timelock-vault-search-wrap');
    if (searchWrap) {
        // Keep the box visible in single-vault view even though the list is
        // down to 1 entry — otherwise there'd be no way to clear the search
        // and get back to the full list.
        searchWrap.style.display = (userVaults.length >= VAULT_SEARCH_THRESHOLD || singleVaultView) ? 'block' : 'none';
    }

    // Total B0x staked across all of the user's vaults, shown above the list
    // regardless of any active search filter.
    const totalEl = document.getElementById('timelock-vaults-total');
    if (totalEl) {
        if (userVaults.length > 0) {
            const totalB0x = userVaults.reduce((sum, vault) => sum + (vault.totalB0xStaked || 0), 0);
            const totalOxBtc = convertB0xToOxBtc(totalB0x);
            const timelockLabel = userVaults.length > 1 ? 'Timelocks' : 'Timelock';
            totalEl.style.display = 'block';
            totalEl.innerHTML = `<div>Total B0x Staked in ${timelockLabel}: ${totalB0x.toFixed(4)}</div>` +
                (totalOxBtc !== null ? `<div style="color:#ff9800">Total 0xBTC Staked in ${timelockLabel}: ${totalOxBtc.toFixed(8)}</div>` : '');
        } else {
            totalEl.style.display = 'none';
        }
    }

    if (userVaults.length === 0) {
        container.innerHTML = '<p style="color:#aaa">No vaults found.</p>';
        return;
    }

    const visibleVaults = vaultSearchQuery
        ? userVaults.filter(vault =>
            vault.address.toLowerCase().includes(vaultSearchQuery) ||
            vault.stakedTokenIds.some(id => id.toLowerCase().includes(vaultSearchQuery)))
        : userVaults;

    if (visibleVaults.length === 0) {
        container.innerHTML = '<p style="color:#aaa">No vaults match your search.</p>';
        return;
    }

    // Display-only re-sort — doesn't touch userVaults itself (see vaultSortMode).
    const sortedVaults = visibleVaults.slice().sort((a, b) => {
        if (vaultSortMode === 'unlock') {
            return a.secondsLeft - b.secondsLeft; // soonest-to-unlock first
        }
        const b0xDiff = (b.totalB0xStaked || 0) - (a.totalB0xStaked || 0);
        if (b0xDiff !== 0) return b0xDiff;
        return a.secondsLeft - b.secondsLeft;
    });

    let html = '';
    for (const vault of sortedVaults) {
        const lockLabel = vault.isLocked
            ? `<span style="color:#f0a500">LOCKED — unlocks in ${formatCountdown(vault.secondsLeft)}</span>`
            : `<span style="color:#4caf50">UNLOCKED</span>`;
        const shortAddr = vault.address.slice(0, 8) + '...' + vault.address.slice(-6);
        const stakedList = vault.stakedTokenIds.length > 0
            ? vault.stakedTokenIds.map(id => `NFT #${id}`).join(', ')
            : 'None';
        const vaultOxBtcStaked = convertB0xToOxBtc(vault.totalB0xStaked || 0);

        html += `
        <div class="timelock-vault-card ${selectedVaultAddress === vault.address ? 'selected' : ''}">
            <div class="timelock-vault-header">
                <a class="timelock-vault-addr" href="https://basescan.org/address/${vault.address}#readContract#F11" target="_blank" rel="noopener noreferrer" title="${vault.address}" style="color:inherit;text-decoration:underline dotted">${shortAddr}</a>
                ${lockLabel}
            </div>
            <div class="timelock-vault-detail">Unlocks: ${formatUnlockTime(vault.unlockTime)}</div>
            <div class="timelock-vault-detail">NFTs in Vault: ${stakedList}</div>
            <div class="timelock-vault-detail">B0x Staked: ${(vault.totalB0xStaked || 0).toFixed(4)}</div>
            ${vaultOxBtcStaked !== null ? `<div class="timelock-vault-detail" style="color:#ff9800">0xBTC Staked: ${vaultOxBtcStaked.toFixed(8)}</div>` : ''}
            <button class="btn-primary timelock-select-btn" onclick="Timelock.selectVault('${vault.address}')">
                ${selectedVaultAddress === vault.address ? 'Selected' : 'Select Vault'}
            </button>
        </div>`;
    }

    container.innerHTML = html;
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// ============================================
// VAULT SELECTION
// ============================================

export async function refreshSelectedVault() {
    await loadUserVaults();
    if (selectedVaultAddress) {
        await refreshVaultStatus(selectedVaultAddress);
        await populateNFTSelectors(selectedVaultAddress);
        await loadVaultTokenBalances(selectedVaultAddress);
        await loadWalletDepositBalances();
    }
}

/**
 * Selects a vault and populates the actions panel.
 */
export async function selectVault(vaultAddress) {
    selectedVaultAddress = vaultAddress;

    // Re-render vault cards to highlight selected
    const container = document.getElementById('timelock-vaults-container');
    renderVaultCards(container);

    // Show the actions panel
    const panel = document.getElementById('timelock-vault-actions');
    if (panel) panel.style.display = 'block';

    const addrEl = document.getElementById('timelock-selected-vault-addr');
    if (addrEl) addrEl.innerHTML = `<a href="https://basescan.org/address/${vaultAddress}#readContract#F11" target="_blank" rel="noopener noreferrer" style="color:#aaa;text-decoration:underline dotted">${vaultAddress}</a>`;

    await refreshVaultStatus(vaultAddress);
    await populateNFTSelectors(vaultAddress);
    await loadVaultTokenBalances(vaultAddress);
    await loadWalletDepositBalances();
}

async function refreshVaultStatus(vaultAddress) {
    const statusEl = document.getElementById('timelock-vault-status');
    if (!statusEl) return;

    try {
        const provider = await getTimelockProvider();
        const vault = new ethers.Contract(vaultAddress, TIMELOCK_VAULT_ABI, provider);
        const vaultInterface = new ethers.utils.Interface(TIMELOCK_VAULT_ABI);
        const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL3_ABI, provider);

        const calls = [
            { target: vaultAddress, allowFailure: true, callData: vaultInterface.encodeFunctionData('isLocked') },
            { target: vaultAddress, allowFailure: true, callData: vaultInterface.encodeFunctionData('secondsUntilUnlock') },
            { target: vaultAddress, allowFailure: true, callData: vaultInterface.encodeFunctionData('unlockTime') }
        ];
        const [lockedRes, secsLeftRes, unlockTimeRes] = await withRpcRetry(
            () => multicallContract.aggregate3(calls),
            'multicall vault status'
        );
        if (!lockedRes.success || !secsLeftRes.success || !unlockTimeRes.success) {
            throw new Error('multicall vault status call failed');
        }

        const [locked] = vaultInterface.decodeFunctionResult('isLocked', lockedRes.returnData);
        const [secsLeft] = vaultInterface.decodeFunctionResult('secondsUntilUnlock', secsLeftRes.returnData);
        const [unlockTime] = vaultInterface.decodeFunctionResult('unlockTime', unlockTimeRes.returnData);

        const stakedIds = await fetchAllStakedTokenIds(vault);

        const lockText = locked
            ? `<span style="color:#f0a500">Locked — ${formatCountdown(secsLeft.toNumber())} remaining</span>`
            : `<span style="color:#4caf50">Unlocked — withdrawals enabled</span>`;

        statusEl.innerHTML = `
            <div class="timelock-status-row"><b>Status:</b> ${lockText}</div>
            <div class="timelock-status-row"><b>Unlock Time:</b> ${formatUnlockTime(unlockTime.toString())}</div>
            <div class="timelock-status-row"><b>NFTs in Vault:</b> ${stakedIds.length > 0 ? stakedIds.map(id => 'NFT #' + id).join(', ') : 'None'}</div>`;

        updateLockGatedButton('timelockWithdrawNFTBtn', locked, 'Withdraw NFT Disabled until vault unlocks');
        updateLockGatedButton('timelockWithdrawTokenBtn', locked, 'Withdraw ERC-20 Token disabled until vault unlocks');
        updateLockGatedButton('timelockSmartWithdrawBtn', locked, 'Smart Contract Withdrawal disabled until vault unlocks');

        // Ownership transfer is only possible while the vault is locked — hide
        // the whole card once unlocked rather than leaving a button that
        // would just revert.
        const transferSection = document.getElementById('timelock-transfer-ownership-section');
        if (transferSection) transferSection.style.display = locked ? '' : 'none';

        await updateExitAllSectionVisibility(vaultAddress, stakedIds.length);
    } catch (e) {
        statusEl.innerHTML = `<p style="color:#e55">Could not load vault status: ${e.message}</p>`;
    }
}

// Disables a withdrawal button with an explanatory label while the vault is
// locked, and restores its normal label once it unlocks. Relies on
// disableBtn/enableBtn's dataset.orig caching to remember the real label.
function updateLockGatedButton(btnId, locked, disabledLabel) {
    if (locked) {
        disableBtn(btnId, disabledLabel);
    } else {
        enableBtn(btnId);
    }
}

// exitAllTogether(startIndex, count, ...) pages through the LP pool's own
// staked-position records for this vault — not the vault's stakedTokenCount()
// list. If the pool has more NFTs staked for this vault than the vault's own
// counter knows about, the default startIndex=0 call can miss positions —
// that's the only scenario Exit All is needed for, since Smart Contract
// Withdrawal already handles the matching-count case. So the whole section
// stays hidden unless this mismatch is detected.
async function fetchVaultLPPoolStakedCount(vaultAddress) {
    try {
        const readProvider = await getTimelockProvider();
        const positionFinder = new ethers.Contract(contractAddress_PositionFinderPro, POSITION_FINDER_ABI, readProvider);
        const result = await withRpcRetry(
            () => positionFinder.getIDSofStakedTokensForUserwithMinimum(
                vaultAddress,
                tokenAddresses['B0x'],
                tokenAddresses['0xBTC'],
                0, 0, 500,
                hookAddress
            ),
            'getIDSofStakedTokensForUserwithMinimum (exit-all check)'
        );
        return result[0].length;
    } catch (e) {
        console.warn('[Timelock] Could not fetch LP pool staked count:', e);
        return null;
    }
}

async function updateExitAllSectionVisibility(vaultAddress, timelockStakedCount) {
    const section = document.getElementById('timelock-exit-all-section');
    const startInput = document.getElementById('timelock-exit-start');
    const smartWithdrawWarning = document.getElementById('timelock-smart-withdraw-mismatch-warning');

    const poolStakedCount = await fetchVaultLPPoolStakedCount(vaultAddress);
    const mismatch = poolStakedCount !== null && timelockStakedCount < poolStakedCount;

    if (section) section.style.display = mismatch ? '' : 'none';
    if (smartWithdrawWarning) smartWithdrawWarning.style.display = mismatch ? '' : 'none';

    if (mismatch) {
        const tlCountEl = document.getElementById('timelock-exit-mismatch-timelock-count');
        const poolCountEl = document.getElementById('timelock-exit-mismatch-pool-count');
        if (tlCountEl) tlCountEl.textContent = timelockStakedCount;
        if (poolCountEl) poolCountEl.textContent = poolStakedCount;
        const tlCountEl2 = document.getElementById('timelock-exit-mismatch-timelock-count2');
        const poolCountEl2 = document.getElementById('timelock-exit-mismatch-pool-count2');
        if (tlCountEl2) tlCountEl2.textContent = timelockStakedCount;
        if (poolCountEl2) poolCountEl2.textContent = poolStakedCount;
    } else {
        // Reset so a leftover value from a previous (mismatched) vault isn't
        // silently used if the section becomes visible again later.
        if (startInput) startInput.value = '0';
    }
}

const POSITION_FINDER_ABI = [
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
                "name": "poolKeyz", "type": "tuple[]",
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

// Looks up pool/token-amount info for each staked NFT via the PositionFinder
// contract, then ranks them by B0x amount held (used as a value proxy) —
// highest first. Shared by the withdraw-NFT dropdown and the smart withdrawal
// flow so both agree on which positions are "most valuable".
async function fetchVaultPositionsRankedByValue(vaultAddress, stakedIds) {
    const readProvider = await getTimelockProvider();
    const vaultPosById = {};
    const positionFinder = new ethers.Contract(contractAddress_PositionFinderPro, POSITION_FINDER_ABI, readProvider);

    // Query LP pool staked positions (NFT staked into LP pool through vault)
    try {
        const result = await withRpcRetry(
            () => positionFinder.getIDSofStakedTokensForUserwithMinimum(
                vaultAddress,
                tokenAddresses['B0x'],
                tokenAddresses['0xBTC'],
                0, 0, 50,
                hookAddress
            ),
            'getIDSofStakedTokensForUserwithMinimum'
        );
        for (let i = 0; i < result[0].length; i++) {
            const tid = result[0][i].toString();
            const symA = getSymbolFromAddress(result[6][i]);
            const symB = getSymbolFromAddress(result[7][i]);
            const decA = tokenAddressesDecimals[symA] || '18';
            const decB = tokenAddressesDecimals[symB] || '18';
            vaultPosById[tid] = {
                pool: `${symA}/${symB}`,
                tokenA: symA,
                tokenB: symB,
                currentTokenA: ethers.utils.formatUnits(result[1][i], decA),
                currentTokenB: ethers.utils.formatUnits(result[2][i], decB)
            };
        }
    } catch (e) {
        console.warn('[Timelock] PositionFinder staked query failed:', e);
    }
    await sleep(1000);
    // For any IDs not found above, query vault-held positions (NFT sitting in vault, not staked in LP pool)
    const missingIds = stakedIds.map(id => id.toString().trim()).filter(tid => !vaultPosById[tid]);
    if (missingIds.length > 0) {
        try {
            const result2 = await withRpcRetry(
                () => positionFinder.findUserTokenIdswithMinimumIndividual(
                    vaultAddress,
                    missingIds,
                    tokenAddresses['B0x'],
                    tokenAddresses['0xBTC'],
                    hookAddress,
                    0
                ),
                'findUserTokenIdswithMinimumIndividual'
            );
            for (let i = 0; i < result2[0].length; i++) {
                const tid = result2[0][i].toString();
                const poolKey = result2[6][i];
                const symA = getSymbolFromAddress(poolKey.currency0);
                const symB = getSymbolFromAddress(poolKey.currency1);
                const decA = tokenAddressesDecimals[symA] || '18';
                const decB = tokenAddressesDecimals[symB] || '18';
                vaultPosById[tid] = {
                    pool: `${symA}/${symB}`,
                    tokenA: symA,
                    tokenB: symB,
                    currentTokenA: ethers.utils.formatUnits(result2[1][i], decA),
                    currentTokenB: ethers.utils.formatUnits(result2[2][i], decB)
                };
            }
        } catch (e) {
            console.warn('[Timelock] PositionFinder vault-held query failed:', e);
        }
    }

    const getB0xAmount = (pos) => {
        if (!pos) return 0;
        if (pos.tokenA === 'B0x') return parseFloat(pos.currentTokenA) || 0;
        if (pos.tokenB === 'B0x') return parseFloat(pos.currentTokenB) || 0;
        return 0;
    };

    return stakedIds
        .map(id => id.toString().trim())
        .map(tokenId => ({ tokenId, b0xValue: getB0xAmount(vaultPosById[tokenId]), ...vaultPosById[tokenId] }))
        .sort((a, b) => b.b0xValue - a.b0xValue);
}

async function populateNFTSelectors(vaultAddress) {
    // Populate "stake NFT" dropdown with user's unstaked positions
    const stakeSelect = document.getElementById('timelock-nft-select');
    if (stakeSelect) {
        const entries = Object.values(positionData || {});
        if (entries.length === 0) {
            stakeSelect.innerHTML = '<option value="">No eligible positions found</option>';
        } else {
            // Most B0x staked first, so users can easily deposit their most valuable position first.
            const getB0xAmount = (pos) => {
                if (pos.tokenA === 'B0x') return parseFloat(pos.currentTokenA) || 0;
                if (pos.tokenB === 'B0x') return parseFloat(pos.currentTokenB) || 0;
                return 0;
            };
            entries.sort((a, b) => getB0xAmount(b) - getB0xAmount(a));
            stakeSelect.innerHTML = entries.map(pos => {
                const tokenId = pos.id.split('_')[1];
                const a = pos.currentTokenA ? Number(pos.currentTokenA).toFixed(4) : '0';
                const b = pos.currentTokenB ? Number(pos.currentTokenB).toFixed(4) : '0';
                const symA = pos.tokenA || '';
                const symB = pos.tokenB || '';
                return `<option value="${tokenId}">NFT #${tokenId} — ${pos.pool || 'B0x/0xBTC'} (${a} ${symA} / ${b} ${symB})</option>`;
            }).join('');
        }
    }

    // Populate deposit dropdown (B0x, 0xBTC, RightsTo0xBitcoin)
    const depositOptions = DEPOSIT_TOKENS
        .filter(t => tokenAddresses[t.key] && tokenAddresses[t.key] !== '0x0000000000000000000000000000000000000000')
        .map(t => `<option value="${tokenAddresses[t.key]}">${t.symbol}</option>`)
        .join('');
    const depositTokenSelect = document.getElementById('timelock-token-deposit-select');
    if (depositTokenSelect) depositTokenSelect.innerHTML = depositOptions;

    // Populate withdraw dropdown (broader set)
    const withdrawOptions = WITHDRAW_TOKENS
        .filter(t => tokenAddresses[t.key] && tokenAddresses[t.key] !== '0x0000000000000000000000000000000000000000')
        .map(t => `<option value="${tokenAddresses[t.key]}">${t.symbol}</option>`)
        .join('');
    const withdrawTokenSelect = document.getElementById('timelock-token-withdraw-select');
    if (withdrawTokenSelect) withdrawTokenSelect.innerHTML = withdrawOptions;

    // Populate "withdraw NFT" dropdown from vault's own staked token list
    // — must be vault-specific so we don't show NFTs staked directly (not through this vault)
    const withdrawSelect = document.getElementById('timelock-staked-nft-select');
    if (withdrawSelect) {
        withdrawSelect.innerHTML = '<option value="">Loading vault NFTs...</option>';
        try {
            const readProvider = await getTimelockProvider();
            const vaultContract = new ethers.Contract(vaultAddress, TIMELOCK_VAULT_ABI, readProvider);
            const stakedIds = await fetchAllStakedTokenIds(vaultContract);
            if (stakedIds.length === 0) {
                withdrawSelect.innerHTML = '<option value="">No NFTs staked in this vault</option>';
            } else {
                // Ranked highest-value first so users can easily withdraw their
                // most valuable position first.
                const rankedPositions = await fetchVaultPositionsRankedByValue(vaultAddress, stakedIds);

                withdrawSelect.innerHTML = rankedPositions.map(pos => {
                    const a = pos.currentTokenA ? Number(pos.currentTokenA).toFixed(4) : '0';
                    const b = pos.currentTokenB ? Number(pos.currentTokenB).toFixed(4) : '0';
                    const label = `NFT #${pos.tokenId} — ${pos.pool || 'B0x/0xBTC'} (${a} ${pos.tokenA || ''} / ${b} ${pos.tokenB || ''})`;
                    return `<option value="${pos.tokenId}">${label}</option>`;
                }).join('');
            }
        } catch (e) {
            console.warn('[Timelock] fetchAllStakedTokenIds failed:', e);
            withdrawSelect.innerHTML = '<option value="">Could not load vault NFTs</option>';
        }
    }
}

// ============================================
// CREATE VAULT
// ============================================

/**
 * Creates a new TimeLockVault via the factory contract.
 */
export async function createVault() {
    setButtonToastAnchor('timelockCreateVaultBtn');
    try {
        if (!window.walletConnected) {
            await window.connectWallet();
        }

        if (!isFactoryDeployed()) {
            showButtonToast('error', 'Not Deployed', 'TimeLock Factory address not set. Update TIMELOCK_FACTORY_ADDRESS in timelock.js.');
            return;
        }

        const dtInput = document.getElementById('timelock-unlock-datetime');
        if (!dtInput || !dtInput.value) {
            showButtonToast('error', 'Missing Date', 'Please select an unlock date and time.');
            return;
        }

        const unlockTimestamp = Math.floor(new Date(dtInput.value).getTime() / 1000);
        const nowTs = Math.floor(Date.now() / 1000);

        if (unlockTimestamp <= nowTs) {
            showButtonToast('error', 'Invalid Date', 'Unlock time must be in the future.');
            return;
        }

        disableBtn('timelockCreateVaultBtn');
        try {
            const factory = new ethers.Contract(TIMELOCK_FACTORY_ADDRESS, TIMELOCK_FACTORY_ABI, window.signer);
            showButtonToast('info', 'Creating Vault', 'Confirm the transaction in your wallet...');

            const tx = await factory.createVault(unlockTimestamp);
            showButtonToast('info', 'Waiting...', 'Transaction submitted, waiting for confirmation...');
            await tx.wait();

            showButtonToast('success', 'Vault Created!', 'Your TimeLock vault has been deployed.');
            await loadUserVaults();
        } catch (err) {
            console.error('createVault error:', err);
            showButtonToast('error', 'Failed', err.reason || err.message || 'Could not create vault.');
        } finally {
            enableBtn('timelockCreateVaultBtn');
        }
    } finally {
        clearButtonToastAnchor();
    }
}

// ============================================
// STAKE NFT TO VAULT
// ============================================

/**
 * Approves the vault to transfer the NFT, then calls vault.stakeUniswapV4NFT().
 */
export async function stakeNFTToVault() {
    setButtonToastAnchor('timelockStakeNFTBtn');
    try {
    if (!window.walletConnected) await window.connectWallet();
    if (!selectedVaultAddress) {
        showButtonToast('error', 'No Vault Selected', 'Please select a vault first.');
        return;
    }

    const customStakeId = document.getElementById('timelock-nft-custom-id')?.value?.trim();
    const tokenId = customStakeId || document.getElementById('timelock-nft-select')?.value;
    if (!tokenId) {
        showButtonToast('error', 'No NFT Selected', 'Please select an NFT position to stake or enter a custom Token #.');
        return;
    }

    // Anti-spam requires the vault to hold at least AmountWeOWE_PER_POSITION2 worth
    // of B0x (read live from the factory, since that fee adjusts automatically
    // on-chain), but only when staking into someone else's vault via masquerade —
    // depositing into your own vault costs nothing. The position being staked
    // already carries some B0x liquidity, so we only need to approve the
    // shortfall: the fee minus the B0x already in this position (shown as "~"
    // since it's an approximate minimum, not an exact figure).
    const stakePos = positionData[`position_${tokenId}`];
    let positionB0xAmount = 0;
    if (stakePos) {
        if (stakePos.tokenA === 'B0x') positionB0xAmount = parseFloat(stakePos.currentTokenA) || 0;
        else if (stakePos.tokenB === 'B0x') positionB0xAmount = parseFloat(stakePos.currentTokenB) || 0;
    }
    const feePerPosition = masqueradeAddress ? await fetchFeePerPositionB0x() : 0;
    const minB0xNeeded = masqueradeAddress ? Math.max(0, feePerPosition - positionB0xAmount) : 0;
    const minB0xNeededBN = ethers.utils.parseUnits(minB0xNeeded.toFixed(18), 18);

    if (masqueradeAddress) {
        const short = `${masqueradeAddress.slice(0, 10)}...${masqueradeAddress.slice(-8)}`;
        const confirmed = window.confirm(
            `⚠️ Masquerade Mode Active\n\n` +
            `You are currently viewing vaults belonging to:\n${short}\n\n` +
            `Staking an NFT will deposit YOUR NFT into THEIR vault. The NFT and all its contents will be locked under that address until their timelock expires — you will not be able to retrieve it unless you also control that wallet.\n\n` +
            `Liquidity Pool Amount: ${positionB0xAmount.toFixed(4)} B0x\n` +
            `Anti-spam fee you must pay: ~${minB0xNeeded.toFixed(4)} B0x\n\n` +
            `Are you sure you want to stake into this vault?`
        );
        if (!confirmed) return;
    }

    // Always show a staking confirmation summary
    const vaultInfo = userVaults.find(v => v.address === selectedVaultAddress);
    {
        const vaultOwner = masqueradeAddress || window.userAddress;
        const isYou = vaultOwner && window.userAddress &&
            vaultOwner.toLowerCase() === window.userAddress.toLowerCase();
        const daysUntilUnlock = vaultInfo && vaultInfo.secondsLeft > 0
            ? Math.floor(vaultInfo.secondsLeft / 86400)
            : 0;
        const unlockSentence = !vaultInfo || vaultInfo.secondsLeft <= 0
            ? 'It is already unlocked to the owner of the contract.'
            : `It will unlock in ${daysUntilUnlock} day${daysUntilUnlock !== 1 ? 's' : ''} from now to the owner of the contract.`;
        const stakeConfirmed = window.confirm(
            `You are staking Uniswap V4 Liquidity Pool NFT #${tokenId} into a Timelock Contract.\n\n` +
            `This Timelock Contract is owned by ${vaultOwner || 'Unknown'} ${isYou ? '(You)' : '(Not You)'}.\n\n` +
            unlockSentence
        );
        if (!stakeConfirmed) return;
    }

    // Warn if the vault has less than 30 days remaining (including unlocked vaults)
    if (vaultInfo && vaultInfo.secondsLeft < 30 * 86400) {
        const daysLeft = Math.floor(vaultInfo.secondsLeft / 86400);
        const hrsLeft  = Math.floor((vaultInfo.secondsLeft % 86400) / 3600);
        const timeStr  = !vaultInfo.isLocked
            ? 'already unlocked (0 days remaining)'
            : daysLeft > 0
                ? `approximately ${daysLeft} day${daysLeft !== 1 ? 's' : ''} and ${hrsLeft} hour${hrsLeft !== 1 ? 's' : ''}`
                : `approximately ${hrsLeft} hour${hrsLeft !== 1 ? 's' : ''}`;
        const confirmed = window.confirm(
            `⚠️ Short Timelock Warning — Staking Fees May Apply\n\n` +
            `This vault is ${timeStr} (less than 30 days).\n\n` +
            `When you deposit this NFT it will be staked into the LP staking contract. The staking contract charges early withdrawal fees that decrease the longer your position is staked.\n\n` +
            `Important: once the vault unlocks, anyone can trigger a withdrawal of your staking assets back to your wallet — you do not have to do it yourself. This means you may be charged a withdrawal fee even if you never personally withdraw, simply because someone else triggers it before your position has been staked for 30 days.\n\n` +
            `Fee scale: ~20% if staked less than 1 day, scaling down to ~1% at 30 days.\n\n` +
            `Are you sure you want to deposit this NFT?`
        );
        if (!confirmed) return;
    }

    disableBtn('timelockStakeNFTBtn');

    try {
        const nftManager = new ethers.Contract(positionManager_address, NFT_APPROVE_ABI, window.signer);
        const vaultContract = new ethers.Contract(selectedVaultAddress, TIMELOCK_VAULT_ABI, window.signer);
        const totalSteps = minB0xNeededBN.gt(0) ? 3 : 2;

        showButtonToast('info', `Step 1/${totalSteps} — Approve NFT`, `Approve NFT #${tokenId} for the vault. Confirm in your wallet.`);
        const approveTx = await nftManager.approve(selectedVaultAddress, tokenId);
        await approveTx.wait();
        showButtonToast('success', 'Approved!', 'Now confirm the next transaction.');

        if (minB0xNeededBN.gt(0)) {
            showButtonToast('info', `Step 2/${totalSteps} — Approve B0x`, `Approve ~${minB0xNeeded.toFixed(4)} B0x for the vault (anti-spam minimum). Confirm in your wallet.`);
            await approveIfNeeded(tokenAddresses['B0x'], selectedVaultAddress, minB0xNeededBN);
            showButtonToast('success', 'Approved!', 'Now confirm the stake transaction.');
        }

        showButtonToast('info', `Step ${totalSteps}/${totalSteps} — Stake NFT`, 'Staking NFT through the vault. Confirm in your wallet.');
        const stakeTx = await vaultContract.stakeUniswapV4NFT(tokenId);
        await stakeTx.wait();

        showButtonToast('success', 'NFT Staked!', `NFT #${tokenId} is now staked in your vault.`);
        if (window.getTokenIDsOwnedByMetamask) await window.getTokenIDsOwnedByMetamask(true);
        await loadUserVaults();
        await selectVault(selectedVaultAddress);
        renderAllowedNFTs();
    } catch (err) {
        console.error('stakeNFTToVault error:', err);
        showButtonToast('error', 'Stake Failed', decodeVaultError(err));
    } finally {
        enableBtn('timelockStakeNFTBtn');
    }
    } finally { clearButtonToastAnchor(); }
}

// ============================================
// WITHDRAW NFT FROM VAULT
// ============================================

/**
 * Withdraws a staked NFT from the vault back to the owner (only after unlock).
 */
export async function withdrawNFTFromVault() {
    setButtonToastAnchor('timelockWithdrawNFTBtn');
    try {
    if (!window.walletConnected) await window.connectWallet();
    if (!selectedVaultAddress) {
        showButtonToast('error', 'No Vault Selected', 'Please select a vault first.');
        return;
    }

    const customWithdrawId = document.getElementById('timelock-withdraw-custom-id')?.value?.trim();
    const tokenId = customWithdrawId || document.getElementById('timelock-staked-nft-select')?.value;
    if (!tokenId) {
        showButtonToast('error', 'No NFT Selected', 'Please select a staked NFT to withdraw or enter a custom Token #.');
        return;
    }

    disableBtn('timelockWithdrawNFTBtn');

    try {
        const vaultContract = new ethers.Contract(selectedVaultAddress, TIMELOCK_VAULT_ABI, window.signer);
        showButtonToast('info', 'Withdrawing NFT', `Withdrawing NFT #${tokenId}. Confirm in your wallet.`);
        const tx = await vaultContract.withdrawNFT(tokenId);
        await tx.wait();
        showButtonToast('success', 'NFT Withdrawn!', `NFT #${tokenId} has been returned to your wallet.`);

        // Force the background NFT-owner scanner to pick up the returned NFT
        // immediately, so it shows up in "Eligible NFT Positions" right away
        // instead of only after a reload (same fix as Create Position).
        triggerRefresh();
        let waitedForScan = 0;
        while (!isSearchingLogs() && waitedForScan < 3000) {
            await sleep(100);
            waitedForScan += 100;
        }
        if (window.getTokenIDsOwnedByMetamask) await window.getTokenIDsOwnedByMetamask(true);
        renderAllowedNFTs();

        await loadUserVaults();
        await selectVault(selectedVaultAddress);
        await loadVaultTokenBalances(selectedVaultAddress);
    } catch (err) {
        console.error('withdrawNFTFromVault error:', err);
        showButtonToast('error', 'Withdrawal Failed', decodeVaultError(err));
    } finally {
        enableBtn('timelockWithdrawNFTBtn');
    }
    } finally { clearButtonToastAnchor(); }
}

// ============================================
// REWARDS
// ============================================

/**
 * Calls getRewards() on the vault to collect all staking rewards.
 */
export async function getVaultRewards() {
    setButtonToastAnchor('timelockGetRewardsBtn');
    try {
    if (!window.walletConnected) await window.connectWallet();
    if (!selectedVaultAddress) {
        showButtonToast('error', 'No Vault Selected', 'Please select a vault first.');
        return;
    }

    disableBtn('timelockGetRewardsBtn');

    try {
        const vaultContract = new ethers.Contract(selectedVaultAddress, TIMELOCK_VAULT_ABI, window.signer);
        showButtonToast('info', 'Collecting Rewards', 'Confirm in your wallet.');
        const tx = await vaultContract.getRewards();
        await tx.wait();
        showButtonToast('success', 'Rewards Collected!', 'Staking rewards sent to your vault.');
        await loadVaultTokenBalances(selectedVaultAddress);
    } catch (err) {
        console.error('getVaultRewards error:', err);
        showButtonToast('error', 'Failed', err.reason || err.message || 'Could not collect rewards.');
    } finally {
        enableBtn('timelockGetRewardsBtn');
    }
    } finally { clearButtonToastAnchor(); }
}

/**
 * Calls getRewardForTokensContract() with the default reward tokens (B0x, 0xBTC).
 */
export async function getVaultRewardsForTokens() {
    setButtonToastAnchor('timelockGetRewardsTokensBtn');
    try {
    if (!window.walletConnected) await window.connectWallet();
    if (!selectedVaultAddress) {
        showButtonToast('error', 'No Vault Selected', 'Please select a vault first.');
        return;
    }

    disableBtn('timelockGetRewardsTokensBtn');

    const rewardTokens = [
        tokenAddresses['B0x'],
        tokenAddresses['0xBTC'],
        tokenAddresses['WETH']
    ];

    try {
        const vaultContract = new ethers.Contract(selectedVaultAddress, TIMELOCK_VAULT_ABI, window.signer);
        showButtonToast('info', 'Collecting Token Rewards', 'Confirm in your wallet.');
        const tx = await vaultContract.getRewardForTokensContract(rewardTokens);
        await tx.wait();
        showButtonToast('success', 'Token Rewards Collected!', 'Rewards claimed for B0x, 0xBTC, WETH.');
        await loadVaultTokenBalances(selectedVaultAddress);
    } catch (err) {
        console.error('getVaultRewardsForTokens error:', err);
        showButtonToast('error', 'Failed', err.reason || err.message || 'Could not collect token rewards.');
    } finally {
        enableBtn('timelockGetRewardsTokensBtn');
    }
    } finally { clearButtonToastAnchor(); }
}

// ============================================
// EXIT ALL
// ============================================

/**
 * Calls exitAllTogether(startIndex, count) on the vault.
 * Collects all rewards and exits LP positions.
 */
export async function exitAllFromVault() {
    setButtonToastAnchor('timelockExitAllBtn');
    try {
    if (!window.walletConnected) await window.connectWallet();
    if (!selectedVaultAddress) {
        showButtonToast('error', 'No Vault Selected', 'Please select a vault first.');
        return;
    }

    const startInput = document.getElementById('timelock-exit-start');
    const countInput = document.getElementById('timelock-exit-count');
    const startIndex = parseInt(startInput?.value || '0', 10);
    const count = parseInt(countInput?.value || '25', 10);

    disableBtn('timelockExitAllBtn');

    try {
        const vaultContract = new ethers.Contract(selectedVaultAddress, TIMELOCK_VAULT_ABI, window.signer);
        showButtonToast('info', 'Exiting All', `Calling exitAllTogether(${startIndex}, ${count}). Confirm in wallet.`);
        const tx = await vaultContract.exitAllTogether(startIndex, count, []);
        await tx.wait();
        showButtonToast('success', 'Exit Complete!', 'All rewards collected and LP positions exited.');
        await loadUserVaults();
        await selectVault(selectedVaultAddress);
        await loadVaultTokenBalances(selectedVaultAddress);
    } catch (err) {
        console.error('exitAllFromVault error:', err);
        showButtonToast('error', 'Failed', err.reason || err.message || 'Exit failed.');
    } finally {
        enableBtn('timelockExitAllBtn');
    }
    } finally { clearButtonToastAnchor(); }
}

// ============================================
// SMART CONTRACT WITHDRAWAL
// ============================================

// Matches the vault's withdraw_Multiple_NFTs_And_ERC20s batch size — it takes
// an array of tokenIds, so each run withdraws this many NFTs at once.
const SMART_WITHDRAW_BATCH_SIZE = 20;

/**
 * Withdraws the most valuable staked NFTs from the vault in a single
 * transaction via withdraw_Multiple_NFTs_And_ERC20s, claiming B0x / 0xBTC /
 * WETH rewards for them along the way. First sanity-checks the vault's
 * stakedTokenCount() against its actual enumerated staked-token list, then
 * ranks staked NFTs by value (via fetchVaultPositionsRankedByValue) and takes
 * the top SMART_WITHDRAW_BATCH_SIZE. If the vault holds more than that, this
 * only clears one batch — the user is told how many more runs are needed.
 *
 * Works with zero staked NFTs too: withdraw_Multiple_NFTs_And_ERC20s accepts
 * an empty tokenIds array just fine, so with nothing staked this just claims/
 * transfers the reward ERC20 balances (B0x / 0xBTC / WETH) sitting in the vault.
 */
export async function withdrawMultipleNFTsAndERC20sFromVault() {
    setButtonToastAnchor('timelockSmartWithdrawBtn');
    const statusEl = document.getElementById('timelock-smart-withdraw-status');
    try {
    if (!window.walletConnected) await window.connectWallet();
    if (!selectedVaultAddress) {
        showButtonToast('error', 'No Vault Selected', 'Please select a vault first.');
        return;
    }

    disableBtn('timelockSmartWithdrawBtn');
    if (statusEl) statusEl.textContent = 'Checking staked NFTs...';

    try {
        const readProvider = await getTimelockProvider();
        const vaultContract = new ethers.Contract(selectedVaultAddress, TIMELOCK_VAULT_ABI, readProvider);

        // Sanity-check the vault's own counter against its actual enumerable
        // staked-token list before touching anything.
        const totalFromCounter = (await withRpcRetry(() => vaultContract.stakedTokenCount(), 'stakedTokenCount')).toNumber();
        const stakedIds = await fetchAllStakedTokenIds(vaultContract);

        if (totalFromCounter !== stakedIds.length) {
            console.warn(`[Timelock] stakedTokenCount (${totalFromCounter}) does not match enumerated staked IDs (${stakedIds.length})`);
        }

        // With nothing staked there's nothing to rank — skip straight to an
        // empty tokenIds array so this run just claims reward balances.
        let batchTokenIds = [];
        let isAllPositions = true;
        let totalRuns = 0;
        let nftListText = '';
        if (stakedIds.length > 0) {
            const ranked = await fetchVaultPositionsRankedByValue(selectedVaultAddress, stakedIds);
            const batch = ranked.slice(0, SMART_WITHDRAW_BATCH_SIZE);
            batchTokenIds = batch.map(pos => pos.tokenId);
            isAllPositions = stakedIds.length <= SMART_WITHDRAW_BATCH_SIZE;
            totalRuns = Math.ceil(stakedIds.length / SMART_WITHDRAW_BATCH_SIZE);
            nftListText = batchTokenIds.map(id => `#${id}`).join(', ');
        }

        const previewMsg = stakedIds.length === 0
            ? `This vault has no staked NFTs — this will just claim B0x / 0xBTC / WETH reward balances.`
            : (isAllPositions
                ? `This is all ${stakedIds.length} staked NFT(s): ${nftListText}. One withdrawal empties the vault.`
                : `${stakedIds.length} NFTs are staked — this is not all positions. Withdrawing the ${SMART_WITHDRAW_BATCH_SIZE} most valuable now (${nftListText}). You will need to run this ${totalRuns} times total (${SMART_WITHDRAW_BATCH_SIZE} at a time) to withdraw everything.`);
        showButtonToast('info', stakedIds.length === 0 ? 'Rewards Only' : (isAllPositions ? 'All Positions' : 'Partial Withdrawal'), previewMsg);
        if (statusEl) statusEl.textContent = previewMsg;

        const rewardTokens = [
            tokenAddresses['B0x'],
            tokenAddresses['0xBTC'],
            tokenAddresses['WETH']
        ];

        const vaultWriteContract = new ethers.Contract(selectedVaultAddress, TIMELOCK_VAULT_ABI, window.signer);
        showButtonToast('info', 'Withdrawing', stakedIds.length === 0
            ? 'Claiming reward tokens. Confirm in your wallet.'
            : `Withdrawing NFTs ${nftListText}. Confirm in your wallet.`);
        const tx = await vaultWriteContract.withdraw_Multiple_NFTs_And_ERC20s(batchTokenIds, rewardTokens);
        await tx.wait();

        const remaining = stakedIds.length - batchTokenIds.length;
        const successMsg = stakedIds.length === 0
            ? `Claimed B0x / 0xBTC / WETH reward balances. This vault has no staked NFTs.`
            : (remaining > 0
                ? `Withdrew NFTs ${nftListText} and claimed rewards. ${remaining} NFT(s) remain — run this ${Math.ceil(remaining / SMART_WITHDRAW_BATCH_SIZE)} more time(s) to finish.`
                : `Withdrew NFTs ${nftListText} and claimed rewards. Vault is now empty of NFTs.`);
        showButtonToast('success', 'Smart Withdrawal Complete!', successMsg);
        if (statusEl) statusEl.textContent = successMsg;

        // Force the background NFT-owner scanner to pick up the returned NFTs
        // immediately, so they show up in "Eligible NFT Positions" right away
        // instead of only after a reload (same fix as single-NFT withdraw).
        triggerRefresh();
        let waitedForScan = 0;
        while (!isSearchingLogs() && waitedForScan < 3000) {
            await sleep(100);
            waitedForScan += 100;
        }
        if (window.getTokenIDsOwnedByMetamask) await window.getTokenIDsOwnedByMetamask(true);
        renderAllowedNFTs();

        await loadUserVaults();
        await selectVault(selectedVaultAddress);
        await loadVaultTokenBalances(selectedVaultAddress);
    } catch (err) {
        console.error('withdrawMultipleNFTsAndERC20sFromVault error:', err);
        const msg = decodeVaultError(err);
        showButtonToast('error', 'Smart Withdrawal Failed', msg);
        if (statusEl) statusEl.textContent = msg;
    } finally {
        enableBtn('timelockSmartWithdrawBtn');
    }
    } finally { clearButtonToastAnchor(); }
}

// ============================================
// SUPER WITHDRAWER (EXPERIMENTAL — BATCH WITHDRAW ACROSS VAULTS)
// ============================================

// Cap on total NFTs moved in one SuperWithdrawer call, regardless of how many
// vaults that spans — keeps a single tx from growing unbounded when a user
// has many heavily-staked vaults unlocked at once.
const SUPER_WITHDRAW_NFT_CAP = 10;

// Cap on how many separate vaults get touched in one SuperWithdrawer call,
// independent of the NFT cap above — a vault call is its own try/catch inside
// the factory loop, so this also bounds how much per-vault overhead one tx pays.
const SUPER_WITHDRAW_MAX_VAULTS_PER_RUN = 7;

// Only worth surfacing once someone has enough unlocked vaults that clicking
// through them one at a time would actually be tedious.
const SUPER_WITHDRAW_MIN_UNLOCKED_VAULTS = 2;

// Vaults with nothing staked are only worth adding to a SuperWithdrawer batch
// to sweep their loose reward-token balance when the batch is otherwise thin —
// once the NFT-driven portion already has this many NFTs going out, that's
// enough for one run and the empty vaults can wait for a follow-up click.
const SUPER_WITHDRAW_LOOSE_SWEEP_NFT_THRESHOLD = 6;

/**
 * Multicall-checks each given vault's loose (unstaked) B0x balanceOf, returning
 * only the ones with a non-zero balance. Mirrors the balance check
 * renderSuperDestroySection already does before offering to destroy a vault,
 * just without the dust bucketing — here any non-zero balance is enough to be
 * worth sweeping out via SuperWithdrawer's ERC20 path.
 */
async function findVaultsWithLooseB0xBalance(vaults) {
    if (vaults.length === 0) return [];

    const readProvider = await getTimelockProvider();
    const erc20Iface = new ethers.utils.Interface(ERC20_MINIMAL_ABI);
    const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL3_ABI, readProvider);

    const found = [];
    // Batch in the same page size loadUserVaults uses for its own multicalls
    // (VAULT_PAGE_SIZE), so a large pile of empty vaults can't force one
    // unbounded RPC call.
    for (let batchStart = 0; batchStart < vaults.length; batchStart += VAULT_PAGE_SIZE) {
        const batch = vaults.slice(batchStart, batchStart + VAULT_PAGE_SIZE);
        const calls = batch.map(v => ({
            target: tokenAddresses['B0x'],
            allowFailure: true,
            callData: erc20Iface.encodeFunctionData('balanceOf', [v.address])
        }));

        let results;
        try {
            results = await withRpcRetry(
                () => multicallContract.aggregate3(calls),
                `SuperWithdrawer loose B0x balanceOf multicall [${batchStart}, ${batchStart + batch.length})`
            );
        } catch (e) {
            console.warn(`[Timelock] SuperWithdrawer loose B0x balance check failed for batch [${batchStart}, ${batchStart + batch.length}):`, e);
            continue;
        }

        for (let i = 0; i < batch.length; i++) {
            const res = results[i];
            if (!res || !res.success || res.returnData === '0x') continue;
            const [rawBal] = erc20Iface.decodeFunctionResult('balanceOf', res.returnData);
            if (!rawBal.isZero()) found.push({ ...batch[i], looseB0xBalance: rawBal });
        }

        // Small breather between chunks so a big pile of empty vaults doesn't
        // hammer the RPC with back-to-back multicalls.
        if (batchStart + VAULT_PAGE_SIZE < vaults.length) await sleep(500);
    }

    // Largest loose B0x balance first — if the per-run vault cap ends up
    // truncating this list, the biggest balances are the ones that make it in.
    found.sort((a, b) => (a.looseB0xBalance.eq(b.looseB0xBalance) ? 0 : a.looseB0xBalance.gt(b.looseB0xBalance) ? -1 : 1));
    return found;
}

/**
 * Picks which unlocked vaults (and which of their staked NFTs) a SuperWithdrawer
 * call would cover right now. userVaults is already sorted most-B0x-staked-first
 * (see the sort in loadUserVaults), so this greedily fills the NFT cap from the
 * biggest stakers down, truncating rather than skipping the vault that would
 * push the total over the cap, and stops after SUPER_WITHDRAW_MAX_VAULTS_PER_RUN
 * vaults regardless of how much of the NFT cap is left.
 *
 * Once that NFT-driven portion is picked, and only while the batch is still
 * thin (under SUPER_WITHDRAW_LOOSE_SWEEP_NFT_THRESHOLD total NFTs) and there's
 * still room under the per-run vault cap, this also multicall-checks the
 * unlocked vaults with nothing staked for a loose B0x balance and folds in any
 * that have one — with an empty tokenIds entry, so the same transaction just
 * claims their B0x / 0xBTC / WETH reward balances alongside the NFT withdrawals.
 */
async function computeSuperWithdrawBatch() {
    const unlockedVaults = userVaults.filter(v => !v.isLocked);
    const emptyUnlockedVaults = unlockedVaults.filter(v => !v.stakedTokenIds || v.stakedTokenIds.length === 0);
    const stakedUnlockedVaults = unlockedVaults.filter(v => v.stakedTokenIds && v.stakedTokenIds.length > 0);

    const included = [];
    let remaining = SUPER_WITHDRAW_NFT_CAP;

    for (const vault of stakedUnlockedVaults) {
        if (remaining <= 0) break;
        if (included.length >= SUPER_WITHDRAW_MAX_VAULTS_PER_RUN) break;
        const take = vault.stakedTokenIds.slice(0, remaining);
        included.push({ address: vault.address, tokenIds: take, totalInVault: vault.stakedTokenIds.length });
        remaining -= take.length;
    }

    const totalNFTs = included.reduce((sum, v) => sum + v.tokenIds.length, 0);
    // Only vaults that actually have staked NFTs can be "left out by the cap" —
    // vaults with nothing staked were never candidates in the first place.
    const capSkippedCount = stakedUnlockedVaults.length - included.length;

    let sweptEmptyVaults = [];
    if (totalNFTs < SUPER_WITHDRAW_LOOSE_SWEEP_NFT_THRESHOLD && included.length < SUPER_WITHDRAW_MAX_VAULTS_PER_RUN && emptyUnlockedVaults.length > 0) {
        const withBalance = await findVaultsWithLooseB0xBalance(emptyUnlockedVaults);
        const roomForVaults = SUPER_WITHDRAW_MAX_VAULTS_PER_RUN - included.length;
        sweptEmptyVaults = withBalance.slice(0, roomForVaults);
        for (const vault of sweptEmptyVaults) {
            included.push({ address: vault.address, tokenIds: [], totalInVault: 0, looseSweepOnly: true });
        }
    }

    return { unlockedVaults, emptyUnlockedVaults, included, totalNFTs, capSkippedCount, sweptEmptyVaults };
}

/**
 * Shows/hides and populates the experimental Super Withdraw section based on
 * the current userVaults list. Called anywhere userVaults is (re)loaded.
 */
async function renderSuperWithdrawSection() {
    const section = document.getElementById('timelock-super-withdraw-section');
    const summaryEl = document.getElementById('timelock-super-withdraw-summary');
    if (!section || !summaryEl) return;

    const { unlockedVaults, emptyUnlockedVaults, included, totalNFTs, capSkippedCount, sweptEmptyVaults } = await computeSuperWithdrawBatch();

    if (unlockedVaults.length < SUPER_WITHDRAW_MIN_UNLOCKED_VAULTS || included.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    const listHtml = included.map(v => {
        const short = v.address.slice(0, 8) + '...' + v.address.slice(-6);
        const countLabel = v.looseSweepOnly
            ? 'reward tokens only (nothing staked)'
            : (v.tokenIds.length < v.totalInVault
                ? `${v.tokenIds.length} of ${v.totalInVault} NFTs`
                : `${v.tokenIds.length} NFT${v.tokenIds.length === 1 ? '' : 's'}`);
        return `<div class="timelock-vault-detail">${short} — ${countLabel}</div>`;
    }).join('');

    const notes = [];
    if (capSkippedCount > 0) {
        notes.push(`${capSkippedCount} more unlocked vault${capSkippedCount === 1 ? '' : 's'} with staked NFTs won't fit in this run (capped at ${SUPER_WITHDRAW_MAX_VAULTS_PER_RUN} vaults / ${SUPER_WITHDRAW_NFT_CAP} NFTs per transaction) — run it again afterward to pick up the rest.`);
    }
    if (sweptEmptyVaults.length > 0) {
        notes.push(`${sweptEmptyVaults.length} unlocked vault${sweptEmptyVaults.length === 1 ? '' : 's'} with nothing staked ${sweptEmptyVaults.length === 1 ? 'has' : 'have'} a loose B0x balance, so ${sweptEmptyVaults.length === 1 ? "it's" : "they're"} included too, just to claim B0x / 0xBTC / WETH rewards.`);
    }
    const stillEmpty = emptyUnlockedVaults.length - sweptEmptyVaults.length;
    if (stillEmpty > 0) {
        notes.push(`${stillEmpty} other unlocked vault${stillEmpty === 1 ? '' : 's'} ${stillEmpty === 1 ? 'has' : 'have'} nothing staked and no loose B0x, so ${stillEmpty === 1 ? "it isn't" : "they aren't"} part of this batch.`);
    }

    summaryEl.innerHTML =
        `<div style="margin-bottom:8px">This will withdraw <strong>${totalNFTs} NFT${totalNFTs === 1 ? '' : 's'}</strong> and claim B0x / 0xBTC / WETH rewards ` +
        `from <strong>${included.length}</strong> of your <strong>${unlockedVaults.length}</strong> unlocked vaults in one transaction, biggest stakers first.` +
        (notes.length > 0 ? ' ' + notes.join(' ') : '') +
        `</div>${listHtml}`;
}

/**
 * Fires the factory's experimental SuperWithdrawer across the vaults picked
 * by computeSuperWithdrawBatch() — one transaction, only touches vaults that
 * are currently unlocked, biggest-staked vaults first, capped at
 * SUPER_WITHDRAW_NFT_CAP total NFTs. Any individual vault that reverts inside
 * the factory call is skipped rather than failing the whole batch.
 */
export async function superWithdrawAll() {
    setButtonToastAnchor('timelockSuperWithdrawBtn');
    try {
        if (!window.walletConnected) await window.connectWallet();

        const { included, totalNFTs } = await computeSuperWithdrawBatch();
        if (included.length === 0) {
            showButtonToast('info', 'Nothing to Withdraw', 'No unlocked vaults with staked NFTs right now.');
            return;
        }

        disableBtn('timelockSuperWithdrawBtn');

        try {
            const rewardTokens = [
                tokenAddresses['B0x'],
                tokenAddresses['0xBTC'],
                tokenAddresses['WETH']
            ];
            const contractsToWithdrawFrom = included.map(v => v.address);
            const tokenIdsArg = included.map(v => v.tokenIds);
            const erc20sArg = included.map(() => rewardTokens);

            const withdrawMsg = totalNFTs > 0
                ? `Withdrawing ${totalNFTs} NFT(s) across ${included.length} vault(s). Confirm in your wallet.`
                : `Claiming B0x / 0xBTC / WETH rewards from ${included.length} vault(s). Confirm in your wallet.`;
            showButtonToast('info', 'Super Withdrawing', withdrawMsg);

            const factoryWriteContract = new ethers.Contract(TIMELOCK_FACTORY_ADDRESS, TIMELOCK_FACTORY_ABI, window.signer);
            const tx = await factoryWriteContract.SuperWithdrawer(contractsToWithdrawFrom, tokenIdsArg, erc20sArg);
            await tx.wait();

            showButtonToast('success', 'Super Withdrawal Complete!', `Withdrew from ${included.length} vault(s). Any vault that couldn't be processed was skipped automatically — re-run if some are still unlocked with NFTs staked.`);

            triggerRefresh();
            let waitedForScan = 0;
            while (!isSearchingLogs() && waitedForScan < 3000) {
                await sleep(100);
                waitedForScan += 100;
            }
            if (window.getTokenIDsOwnedByMetamask) await window.getTokenIDsOwnedByMetamask(true);
            renderAllowedNFTs();

            await loadUserVaults();
            if (selectedVaultAddress) {
                await selectVault(selectedVaultAddress);
                await loadVaultTokenBalances(selectedVaultAddress);
            }
        } catch (err) {
            console.error('superWithdrawAll error:', err);
            const msg = decodeVaultError(err);
            showButtonToast('error', 'Super Withdrawal Failed', msg);
        } finally {
            enableBtn('timelockSuperWithdrawBtn');
        }
    } finally { clearButtonToastAnchor(); }
}

// ============================================
// SUPER DESTROYER (EXPERIMENTAL — PERMANENT VAULT DESTRUCTION)
// ============================================

// Only worth offering once there are multiple vaults that are unlocked and
// have nothing staked — a single one isn't worth the RPC round trip below.
const SUPER_DESTROY_MIN_ZERO_STAKED_UNLOCKED_VAULTS = 2;

// Above this, a vault has real, non-dust B0x sitting loose in it (deposited
// but never staked) — not a candidate for this tool at all either way.
const SUPER_DESTROY_MAX_LOOSE_B0X_WEI = '2000000000000000000'; // 2.0 B0x, 18 decimals

// Cap on how many vaults get destroyed in one SuperDestroyer call — keeps a
// single tx from growing unbounded when someone has a large pile of empty
// vaults to clean up at once.
const SUPER_DESTROY_MAX_VAULTS_PER_RUN = 22;

/**
 * Vaults that are unlocked with exactly 0.0 B0x staked — the only vaults
 * SuperDestroyer ever bothers checking further. Cheap, in-memory filter over
 * data loadUserVaults already fetched; no RPC calls here.
 */
function findZeroStakedUnlockedVaults() {
    return userVaults.filter(v => !v.isLocked && (v.totalB0xStaked || 0) === 0);
}

/**
 * Shows/hides and populates the experimental Super Destroyer section. Unlike
 * the other Timelock sections this one is async: it only fetches each
 * candidate vault's loose (unstaked) B0x balanceOf — via one small multicall
 * — when there are multiple zero-staked unlocked vaults to justify it, since
 * that's the only signal that decides whether a vault is safe to destroy.
 * Sorts candidates into "destroyable" (0 loose B0x — safe) and
 * "needs withdraw first" (some loose B0x under the 2.0 dust cap — warn and
 * exclude from the batch so nothing gets destroyed out from under the user).
 * Vaults with 2.0+ loose B0x are left out of both lists entirely. The
 * destroyable list is further capped at SUPER_DESTROY_MAX_VAULTS_PER_RUN per
 * transaction — any extra just wait for a follow-up run.
 */
async function renderSuperDestroySection() {
    const section = document.getElementById('timelock-super-destroy-section');
    const summaryEl = document.getElementById('timelock-super-destroy-summary');
    if (!section || !summaryEl) return;

    // SuperDestroyer checks each vault's owner() against the connected
    // wallet itself, not the masquerade target — it has no way to act "as"
    // someone else the way withdraw/deposit do. Destroying vaults while
    // masquerading as another address would send a transaction that succeeds
    // but skips every single vault (ownerOfVault != msg.sender every time),
    // so there's no point offering this except when we're not masquerading,
    // or masquerading as our own connected address.
    const masqueradingAsSomeoneElse = !!masqueradeAddress &&
        (!window.userAddress || masqueradeAddress.toLowerCase() !== window.userAddress.toLowerCase());
    if (masqueradingAsSomeoneElse) {
        section.style.display = 'none';
        section.dataset.destroyableAddresses = '[]';
        return;
    }

    const candidates = findZeroStakedUnlockedVaults();

    if (candidates.length < SUPER_DESTROY_MIN_ZERO_STAKED_UNLOCKED_VAULTS) {
        section.style.display = 'none';
        section.dataset.destroyableAddresses = '[]';
        return;
    }

    section.style.display = 'block';
    summaryEl.innerHTML = '<p style="color:#aaa">Checking vault balances...</p>';

    const myGeneration = loadGeneration;
    const readProvider = await getTimelockProvider();
    const erc20Iface = new ethers.utils.Interface(ERC20_MINIMAL_ABI);
    const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL3_ABI, readProvider);

    const calls = candidates.map(v => ({
        target: tokenAddresses['B0x'],
        allowFailure: true,
        callData: erc20Iface.encodeFunctionData('balanceOf', [v.address])
    }));

    let results;
    try {
        results = await withRpcRetry(() => multicallContract.aggregate3(calls), 'SuperDestroyer B0x balanceOf multicall');
    } catch (e) {
        console.warn('[Timelock] SuperDestroyer balance multicall failed:', e);
        if (myGeneration !== loadGeneration) return;
        summaryEl.innerHTML = '<p style="color:#e55">Could not check vault balances. Try refreshing.</p>';
        section.dataset.destroyableAddresses = '[]';
        return;
    }
    if (myGeneration !== loadGeneration) return;

    const maxLoose = ethers.BigNumber.from(SUPER_DESTROY_MAX_LOOSE_B0X_WEI);
    const destroyable = [];
    const needsWithdrawFirst = [];

    for (let i = 0; i < candidates.length; i++) {
        const res = results[i];
        if (!res || !res.success || res.returnData === '0x') continue; // unknown balance — skip, don't guess
        const [rawBal] = erc20Iface.decodeFunctionResult('balanceOf', res.returnData);
        if (rawBal.isZero()) {
            destroyable.push(candidates[i]);
        } else if (rawBal.lt(maxLoose)) {
            needsWithdrawFirst.push({ vault: candidates[i], rawBal });
        }
        // else: 2.0+ loose B0x sitting in a "0 staked" vault — leave out of both lists.
    }

    if (destroyable.length === 0 && needsWithdrawFirst.length === 0) {
        section.style.display = 'none';
        section.dataset.destroyableAddresses = '[]';
        return;
    }

    // Cap how many actually go into this run's batch, even if more qualify —
    // the rest just get picked up on the next click once these clear.
    const destroyableThisRun = destroyable.slice(0, SUPER_DESTROY_MAX_VAULTS_PER_RUN);
    const destroyableRemaining = destroyable.length - destroyableThisRun.length;

    let html = '';
    if (destroyableThisRun.length > 0) {
        html += `<div style="margin-bottom:12px">Ready to destroy — <strong>${destroyableThisRun.length}</strong> unlocked vault${destroyableThisRun.length === 1 ? '' : 's'} with 0.0 B0x staked and nothing else in ${destroyableThisRun.length === 1 ? 'it' : 'them'} this run` +
            (destroyableRemaining > 0
                ? ` (capped at ${SUPER_DESTROY_MAX_VAULTS_PER_RUN} per transaction — ${destroyableRemaining} more empty vault${destroyableRemaining === 1 ? '' : 's'} found; run this again afterward to clear ${destroyableRemaining === 1 ? 'it' : 'them'} too)`
                : '') +
            `:</div>`;
        html += destroyableThisRun.map(v => {
            const short = v.address.slice(0, 8) + '...' + v.address.slice(-6);
            return `<div class="timelock-vault-detail">${short} — empty</div>`;
        }).join('');
    }
    if (needsWithdrawFirst.length > 0) {
        html += `<div style="margin:12px 0;color:#f0a500">⚠️ ${needsWithdrawFirst.length} vault${needsWithdrawFirst.length === 1 ? '' : 's'} still ${needsWithdrawFirst.length === 1 ? 'has' : 'have'} loose B0x sitting in ${needsWithdrawFirst.length === 1 ? 'it' : 'them'} (deposited but never staked) — <strong>withdraw that first</strong>. Destroying it first won't lose the funds (the vault contract still exists and you still own it), but it'll disappear from this site for good — you'd have to interact with it directly (e.g. via BaseScan) to get them out afterward:</div>`;
        html += needsWithdrawFirst.map(({ vault, rawBal }) => {
            const short = vault.address.slice(0, 8) + '...' + vault.address.slice(-6);
            const amt = parseFloat(ethers.utils.formatUnits(rawBal, 18));
            return `<div class="timelock-vault-detail" style="color:#f0a500">${short} — ${amt.toFixed(4)} B0x loose, not withdrawn</div>`;
        }).join('');
    }

    summaryEl.innerHTML = html;

    // Cache the destroy-ready address list on the section itself so the
    // button handler uses exactly what was just shown, rather than
    // re-deriving it (and risking a race with a newer in-flight balance check).
    section.dataset.destroyableAddresses = JSON.stringify(destroyableThisRun.map(v => v.address));

    if (destroyableThisRun.length === 0) {
        disableBtn('timelockSuperDestroyBtn', 'No Empty Vaults Ready');
    } else {
        enableBtn('timelockSuperDestroyBtn');
    }
}

/**
 * Fires the factory's experimental SuperDestroyer across the vaults
 * renderSuperDestroySection() most recently classified as safe to destroy —
 * unlocked, 0.0 B0x staked, 0 loose B0x. Permanent and irreversible, so this
 * requires an explicit confirm() on top of the button already being disabled
 * whenever nothing qualifies. Any vault the factory can't destroy (not
 * actually owned by the caller, or fails its own unlock check) is skipped
 * rather than failing the whole batch.
 */
export async function superDestroyEligibleVaults() {
    setButtonToastAnchor('timelockSuperDestroyBtn');
    try {
        if (!window.walletConnected) await window.connectWallet();

        // SuperDestroyer checks vault owner() against the connected wallet, not
        // the masquerade target — while masquerading as someone else this would
        // send a transaction that succeeds but destroys nothing.
        if (masqueradeAddress && (!window.userAddress || masqueradeAddress.toLowerCase() !== window.userAddress.toLowerCase())) {
            showButtonToast('error', 'Not Available While Masquerading', "SuperDestroyer only works on vaults owned by your connected wallet — it can't act on someone else's behalf. Clear masquerade mode first.");
            return;
        }

        const section = document.getElementById('timelock-super-destroy-section');
        let addrList = [];
        try {
            addrList = JSON.parse(section?.dataset.destroyableAddresses || '[]');
        } catch {
            addrList = [];
        }

        if (addrList.length === 0) {
            showButtonToast('info', 'Nothing to Destroy', 'No empty vaults are currently ready for destruction.');
            return;
        }

        const listText = addrList.map(a => `${a.slice(0, 8)}...${a.slice(-6)}`).join('\n');
        const confirmed = window.confirm(
            `⚠️ WARNING — Removing ${addrList.length === 1 ? 'This Vault' : 'These Vaults'} From This Site Forever\n\n` +
            `${addrList.length === 1 ? 'This vault' : 'These vault contracts'} will be destroyed and will NEVER be shown on this site again:\n\n${listText}\n\n` +
            `Each is unlocked with 0.0 B0x staked and 0 loose B0x, so nothing should be lost. The vault contract itself keeps existing on-chain and you keep full owner access to it — but only by interacting with it directly (e.g. via BaseScan's Read/Write Contract tabs). This site will never help you find or use it again after this.\n\n` +
            `Are you absolutely sure you want to proceed?`
        );
        if (!confirmed) return;

        disableBtn('timelockSuperDestroyBtn');

        try {
            showButtonToast('info', 'Destroying Vaults', `Destroying ${addrList.length} vault(s). Confirm in your wallet.`);

            const factoryWriteContract = new ethers.Contract(TIMELOCK_FACTORY_ADDRESS, TIMELOCK_FACTORY_ABI, window.signer);
            const tx = await factoryWriteContract.SuperDestroyer(addrList);
            await tx.wait();

            showButtonToast('success', 'Vaults Destroyed', `Processed ${addrList.length} vault(s). Any vault that wasn't actually owned by you or failed its own checks on-chain was skipped automatically.`);

            if (selectedVaultAddress && addrList.includes(selectedVaultAddress)) {
                resetVaultSelection();
            }
            await loadUserVaults();
        } catch (err) {
            console.error('superDestroyEligibleVaults error:', err);
            const msg = decodeVaultError(err);
            showButtonToast('error', 'Destruction Failed', msg);
        } finally {
            enableBtn('timelockSuperDestroyBtn');
        }
    } finally { clearButtonToastAnchor(); }
}

// ============================================
// TRANSFER OWNERSHIP
// ============================================

/**
 * Transfers vault ownership to a new address (only while vault is locked).
 */
export async function transferVaultOwnership() {
    setButtonToastAnchor('timelockTransferOwnerBtn');
    try {
    if (!window.walletConnected) await window.connectWallet();
    if (!selectedVaultAddress) {
        showButtonToast('error', 'No Vault Selected', 'Please select a vault first.');
        return;
    }

    const input = document.getElementById('timelock-new-owner-input');
    const newOwner = input?.value?.trim();

    if (!newOwner || !ethers.utils.isAddress(newOwner)) {
        showButtonToast('error', 'Invalid Address', 'Please enter a valid Ethereum address.');
        return;
    }

    // The factory charges an anti-spam fee (in B0x) for transferring ownership of
    // small/low-value vaults, to discourage spamming the vault registry with junk
    // transfers. queryFeeForVaultMetric already returns the fee pre-scaled to wei
    // (18 decimals) — approve it as-is, don't rescale.
    let requiredFeeAmount = ethers.BigNumber.from(0);
    try {
        const provider = await getTimelockProvider();
        const factoryContract = new ethers.Contract(TIMELOCK_FACTORY_ADDRESS, TIMELOCK_FACTORY_ABI, provider);
        const metric = await factoryContract.queryFeeForVaultMetric(selectedVaultAddress);
        requiredFeeAmount = ethers.BigNumber.from(metric);
    } catch (err) {
        console.error('queryFeeForVaultMetric error:', err);
        showButtonToast('error', 'Failed', 'Could not compute the anti-spam fee for this vault. Try again.');
        return;
    }

    const feeDisplay = ethers.utils.formatUnits(requiredFeeAmount, 18);
    const confirmed = window.confirm(
        `⚠️ WARNING — Permanent Transfer\n\n` +
        `This vault and ALL of its contents (NFTs, tokens, staking positions) will be permanently transferred to:\n\n` +
        `${newOwner}\n\n` +
        `You will have NO way to recover them unless you also control that address. Once confirmed on-chain this action cannot be undone.\n\n` +
        (requiredFeeAmount.gt(0)
            ? `This transfer requires approving ${feeDisplay} B0x to the TimeLock Factory as an anti-spam fee (to prevent spam transfers of small accounts).\n\n`
            : ``) +
        `Are you absolutely sure you want to proceed?`
    );
    if (!confirmed) return;

    disableBtn('timelockTransferOwnerBtn');

    try {
        if (requiredFeeAmount.gt(0)) {
            showButtonToast('info', 'Approving Fee', `Approving ${feeDisplay} B0x to the TimeLock Factory. Confirm in wallet.`);
            await approveIfNeeded(tokenAddresses['B0x'], TIMELOCK_FACTORY_ADDRESS, requiredFeeAmount);
        }

        const vaultContract = new ethers.Contract(selectedVaultAddress, TIMELOCK_VAULT_ABI, window.signer);
        showButtonToast('info', 'Transferring Ownership', `Transferring to ${newOwner}. Confirm in wallet.`);
        const tx = await vaultContract.transferOwnership(newOwner);
        await tx.wait();
        showButtonToast('success', 'Ownership Transferred!', `Vault is now owned by ${newOwner}.`);
        if (input) input.value = '';
        await loadUserVaults();
    } catch (err) {
        console.error('transferVaultOwnership error:', err);
        showButtonToast('error', 'Failed', err.reason || err.message || 'Transfer failed. Vault may be unlocked.');
    } finally {
        enableBtn('timelockTransferOwnerBtn');
    }
    } finally { clearButtonToastAnchor(); }
}

/**
 * Approves an ERC-20 spend allowance if the current allowance is insufficient.
 */
async function approveIfNeeded(tokenToApprove, spenderAddress, requiredAmount) {
    const tokenContract = new ethers.Contract(tokenToApprove, ERC20_MINIMAL_ABI, window.signer);
    const currentAllowance = await tokenContract.allowance(window.userAddress, spenderAddress);
    if (currentAllowance.lt(requiredAmount)) {
        const approveTx = await tokenContract.approve(spenderAddress, ethers.constants.MaxUint256);
        await approveTx.wait();
    }
}

// ============================================
// ERC-20 DEPOSIT
// ============================================

const ERC20_MINIMAL_ABI = [
    { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }
];

// Tokens shown in the deposit dropdown
const DEPOSIT_TOKENS = [
    { symbol: 'B0x',              key: 'B0x' },
    { symbol: '0xBTC',            key: '0xBTC' },
    { symbol: 'RightsTo0xBitcoin', key: 'RightsTo0xBTC' },
];

// Tokens available in the withdraw dropdown (broader set)
const WITHDRAW_TOKENS = [
    { symbol: 'B0x',          key: 'B0x' },
    { symbol: '0xBTC',        key: '0xBTC' },
    { symbol: 'WETH',         key: 'WETH' },
    { symbol: 'USDC',         key: 'USDC' },
    { symbol: 'RightsTo0xBitcoin', key: 'RightsTo0xBTC' },
];

/**
 * Transfer an ERC-20 token directly into the selected vault (timelocked until unlock).
 */
export async function depositTokenToVault() {
    setButtonToastAnchor('timelockDepositTokenBtn');
    try {
    if (!window.walletConnected) await window.connectWallet();
    if (!selectedVaultAddress) {
        showButtonToast('error', 'No Vault Selected', 'Please select a vault first.');
        return;
    }

    const customInput = document.getElementById('timelock-token-deposit-custom');
    const customAddr  = customInput?.value?.trim();
    const tokenSelect = document.getElementById('timelock-token-deposit-select');
    const amountInput = document.getElementById('timelock-token-deposit-amount');

    const tokenAddr = (customAddr && ethers.utils.isAddress(customAddr))
        ? ethers.utils.getAddress(customAddr)
        : tokenSelect?.value;

    if (!tokenAddr || !ethers.utils.isAddress(tokenAddr)) {
        showButtonToast('error', 'No Token', 'Please select a token or enter a valid custom ERC-20 address.');
        return;
    }

    const amountStr = amountInput?.value?.trim();
    if (!amountStr || isNaN(amountStr) || Number(amountStr) <= 0) {
        showButtonToast('error', 'Invalid Amount', 'Please enter a valid amount.');
        return;
    }

    // Fetch decimals and symbol before showing confirmation
    let decimals = 18;
    let symbol = tokenAddr.slice(0, 8) + '...';
    try {
        const readProvider = await getTimelockProvider();
        const tokenRead = new ethers.Contract(tokenAddr, ERC20_MINIMAL_ABI, readProvider);
        [decimals, symbol] = await Promise.all([
            withRpcRetry(() => tokenRead.decimals(), 'decimals'),
            withRpcRetry(() => tokenRead.symbol(), 'symbol')
        ]);
    } catch (e) {
        console.warn('[Timelock] Could not fetch token metadata:', e);
    }

    // Build unlock info for the popup
    const vaultInfo = userVaults.find(v => v.address === selectedVaultAddress);
    const vaultOwner = masqueradeAddress || window.userAddress;
    const daysLeft = vaultInfo && vaultInfo.secondsLeft > 0 ? Math.floor(vaultInfo.secondsLeft / 86400) : 0;
    const unlockStr = !vaultInfo || vaultInfo.secondsLeft <= 0
        ? 'already unlocked'
        : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} from now`;

    const isYou = vaultOwner && window.userAddress &&
        vaultOwner.toLowerCase() === window.userAddress.toLowerCase();
    const ownerLabel = isYou ? '(You)' : '(NOT You)';

    const confirmed = window.confirm(
        `You are about to deposit ${amountStr} ${symbol} into a Timelock Contract.\n\n` +
        `Token: ${symbol} (${tokenAddr})\n` +
        `Vault: ${selectedVaultAddress}\n` +
        `Vault Owner: ${vaultOwner || 'Unknown'} ${ownerLabel}\n\n` +
        `These tokens will be transferred directly to the vault contract and timelocked. Only the vault owner can withdraw them after the timelock expires (${unlockStr}).\n\n` +
        `This is a direct token transfer — it cannot be reversed until the timelock expires.\n\n` +
        `Are you sure you want to proceed?`
    );
    if (!confirmed) return;

    disableBtn('timelockDepositTokenBtn');

    try {
        const tokenContract = new ethers.Contract(tokenAddr, ERC20_MINIMAL_ABI, window.signer);
        const amount = ethers.utils.parseUnits(amountStr, decimals);

        showButtonToast('info', 'Transferring Token', `Sending ${amountStr} ${symbol} to vault. Confirm in your wallet.`);
        const tx = await tokenContract.transfer(selectedVaultAddress, amount);
        await tx.wait();

        showButtonToast('success', 'Token Deposited!', `${amountStr} ${symbol} is now locked in the vault until ${unlockStr}.`);
        if (amountInput) amountInput.value = '';
        if (customInput) customInput.value = '';
        await loadVaultTokenBalances(selectedVaultAddress);
        await loadWalletDepositBalances();
    } catch (err) {
        console.error('depositTokenToVault error:', err);
        showButtonToast('error', 'Deposit Failed', decodeVaultError(err));
    } finally {
        enableBtn('timelockDepositTokenBtn');
    }
    } finally { clearButtonToastAnchor(); }
}

// ============================================
// ERC-20 WITHDRAW
// ============================================

/**
 * Withdraw all of a given ERC-20 token from the vault to the owner (after unlock).
 */
export async function withdrawTokenFromVault() {
    setButtonToastAnchor('timelockWithdrawTokenBtn');
    try {
    if (!window.walletConnected) await window.connectWallet();
    if (!selectedVaultAddress) {
        showButtonToast('error', 'No Vault Selected', 'Please select a vault first.');
        return;
    }

    const customInput = document.getElementById('timelock-token-withdraw-custom');
    const customAddr = customInput?.value?.trim();
    const tokenSelect = document.getElementById('timelock-token-withdraw-select');
    const tokenAddr = (customAddr && ethers.utils.isAddress(customAddr))
        ? ethers.utils.getAddress(customAddr)
        : tokenSelect?.value;
    if (!tokenAddr || tokenAddr === '') {
        showButtonToast('error', 'No Token', 'Please select a token or enter a custom ERC-20 address.');
        return;
    }
    if (customAddr && !ethers.utils.isAddress(customAddr)) {
        showButtonToast('error', 'Invalid Address', 'The custom ERC-20 address is not valid.');
        return;
    }

    disableBtn('timelockWithdrawTokenBtn');

    try {
        const readProvider = await getTimelockProvider();
        const tokenContract = new ethers.Contract(tokenAddr, ERC20_MINIMAL_ABI, readProvider);
        const vaultRead = new ethers.Contract(selectedVaultAddress, TIMELOCK_VAULT_ABI, readProvider);

        // Pre-checks before sending the transaction
        const [vaultBal, isLocked] = await Promise.all([
            withRpcRetry(() => tokenContract.balanceOf(selectedVaultAddress), 'balanceOf'),
            withRpcRetry(() => vaultRead.isLocked(), 'isLocked')
        ]);
        if(tokenAddr != tokenAddresses['WETH']){
        if (vaultBal.isZero()) {
            showButtonToast('error', 'No Balance', 'No balance of that token in this vault.');
            enableBtn('timelockWithdrawTokenBtn');
            clearButtonToastAnchor();
            return;
        }
    }
        if (isLocked) {
            const secsLeft = await withRpcRetry(() => vaultRead.secondsUntilUnlock(), 'secondsUntilUnlock');
            showButtonToast('error', 'Still Locked', `Vault unlocks in ${formatCountdown(secsLeft.toNumber())}. Withdrawals are only allowed after unlock.`);
            enableBtn('timelockWithdrawTokenBtn');
            clearButtonToastAnchor();
            return;
        }

        const vaultContract = new ethers.Contract(selectedVaultAddress, TIMELOCK_VAULT_ABI, window.signer);
        showButtonToast('info', 'Withdrawing Token', 'Withdrawing all of this token to your wallet. Confirm in wallet.');
        const tx = await vaultContract.withdrawToken(tokenAddr);
        await tx.wait();
        showButtonToast('success', 'Token Withdrawn!', 'Token balance returned to your wallet.');
        await loadVaultTokenBalances(selectedVaultAddress);
    } catch (err) {
        console.error('withdrawTokenFromVault error:', err);
        showButtonToast('error', 'Withdrawal Failed', decodeVaultError(err));
    } finally {
        enableBtn('timelockWithdrawTokenBtn');
    }
    } finally { clearButtonToastAnchor(); }
}

// ============================================
// VAULT TOKEN BALANCES
// ============================================

/**
 * Loads ERC-20 balances held inside the vault and renders them.
 * Shows the actual balanceOf (total held) and the tokenBalances (deposited via depositToken).
 * Rewards sent directly to the vault appear in balanceOf but not tokenBalances.
 */
export async function loadVaultTokenBalances(vaultAddress) {
    const container = document.getElementById('timelock-token-balances');
    if (!container) return;

    const readProvider = await getTimelockProvider();
    const fmt = (n) => {
        if (n === 0) return '0';
        if (n < 0.000001) return n.toExponential(4);
        if (n < 0.001)    return n.toPrecision(4);
        return n.toPrecision(6).replace(/\.?0+$/, '');
    };

    // Known decimals — avoids extra calls
    const DECIMALS = { B0x: 18, '0xBTC': 8, WETH: 18, USDC: 6, RightsTo0xBTC: 18 };

    const validTokens = WITHDRAW_TOKENS.filter(
        t => tokenAddresses[t.key] && tokenAddresses[t.key] !== '0x0000000000000000000000000000000000000000'
    );

    const erc20Iface = new ethers.utils.Interface(ERC20_MINIMAL_ABI);
    const multicall  = new ethers.Contract(MULTICALL_ADDRESS, [
        {
            "inputs": [{"components": [{"name": "target","type": "address"},{"name": "allowFailure","type": "bool"},{"name": "callData","type": "bytes"}],"name": "calls","type": "tuple[]"}],
            "name": "aggregate3",
            "outputs": [{"components": [{"name": "success","type": "bool"},{"name": "returnData","type": "bytes"}],"type": "tuple[]"}],
            "stateMutability": "view",
            "type": "function"
        }
    ], readProvider);

    const calls = validTokens.map(tok => ({
        target: tokenAddresses[tok.key],
        allowFailure: true,
        callData: erc20Iface.encodeFunctionData('balanceOf', [vaultAddress])
    }));

    let results = [];
    try {
        results = await withRpcRetry(() => multicall.aggregate3(calls), 'multicall balanceOf');
    } catch (e) {
        console.warn('[Timelock] multicall balanceOf failed:', e);
    }

    let rows = '';
    for (let i = 0; i < validTokens.length; i++) {
        const tok = validTokens[i];
        const decimals = DECIMALS[tok.key] ?? 18;
        try {
            const res = results[i];
            if (!res || !res.success || res.returnData === '0x') {
                throw new Error('bad result');
            }
            const [rawBal] = erc20Iface.decodeFunctionResult('balanceOf', res.returnData);
            const display = parseFloat(ethers.utils.formatUnits(rawBal, decimals));
            rows += `<div class="timelock-token-bal-row ${rawBal.gt(0) ? 'has-balance' : ''}">
                <span class="timelock-token-sym">${tok.symbol}</span>
                <span class="timelock-token-amt">${fmt(display)}</span>
            </div>`;
        } catch {
            rows += `<div class="timelock-token-bal-row">
                <span class="timelock-token-sym">${tok.symbol}</span>
                <span class="timelock-token-amt" style="color:#888">—</span>
            </div>`;
        }
    }
    container.innerHTML = rows || '<p style="color:#aaa">No balances found.</p>';
}

// ============================================
// WALLET DEPOSIT BALANCES
// ============================================

const DECIMALS_MAP = { B0x: 18, '0xBTC': 8, WETH: 18, USDC: 6, RightsTo0xBTC: 18 };

/**
 * Loads the connected wallet's balances for the 3 deposit tokens and renders them
 * inside the deposit card so the user knows how much they can send.
 */
export async function loadWalletDepositBalances() {
    const container = document.getElementById('timelock-wallet-deposit-balances');
    if (!container) return;

    const walletAddr = window.userAddress;
    if (!walletAddr) {
        container.innerHTML = '<span style="color:#aaa">Connect wallet to see balances.</span>';
        return;
    }

    const readProvider = await getTimelockProvider();

    const fmt = (n) => {
        if (n === 0) return '0';
        if (n < 0.000001) return n.toExponential(4);
        if (n < 0.001)    return n.toPrecision(4);
        return n.toPrecision(6).replace(/\.?0+$/, '');
    };

    const validTokens = DEPOSIT_TOKENS.filter(
        t => tokenAddresses[t.key] && tokenAddresses[t.key] !== '0x0000000000000000000000000000000000000000'
    );

    const erc20Iface = new ethers.utils.Interface(ERC20_MINIMAL_ABI);
    const multicall  = new ethers.Contract(MULTICALL_ADDRESS, [
        {
            "inputs": [{"components": [{"name": "target","type": "address"},{"name": "allowFailure","type": "bool"},{"name": "callData","type": "bytes"}],"name": "calls","type": "tuple[]"}],
            "name": "aggregate3",
            "outputs": [{"components": [{"name": "success","type": "bool"},{"name": "returnData","type": "bytes"}],"type": "tuple[]"}],
            "stateMutability": "view",
            "type": "function"
        }
    ], readProvider);

    const calls = validTokens.map(tok => ({
        target: tokenAddresses[tok.key],
        allowFailure: true,
        callData: erc20Iface.encodeFunctionData('balanceOf', [walletAddr])
    }));

    let results = [];
    try {
        results = await withRpcRetry(() => multicall.aggregate3(calls), 'wallet multicall balanceOf');
    } catch (e) {
        console.warn('[Timelock] wallet multicall failed:', e);
    }

    let rows = '';
    for (let i = 0; i < validTokens.length; i++) {
        const tok = validTokens[i];
        const decimals = DECIMALS_MAP[tok.key] ?? 18;
        try {
            const res = results[i];
            if (!res || !res.success || res.returnData === '0x') throw new Error('bad');
            const [rawBal] = erc20Iface.decodeFunctionResult('balanceOf', res.returnData);
            const display = parseFloat(ethers.utils.formatUnits(rawBal, decimals));
            rows += `<div class="timelock-token-bal-row ${rawBal.gt(0) ? 'has-balance' : ''}">
                <span class="timelock-token-sym">${tok.symbol}</span>
                <span class="timelock-token-amt">${fmt(display)}</span>
            </div>`;
        } catch {
            rows += `<div class="timelock-token-bal-row">
                <span class="timelock-token-sym">${tok.symbol}</span>
                <span class="timelock-token-amt" style="color:#888">—</span>
            </div>`;
        }
    }
    container.innerHTML = rows || '<span style="color:#aaa">No balances found.</span>';
}

/**
 * Reads the selected/custom token's wallet balance and fills the amount input.
 */
export async function setMaxDepositAmount() {
    const customInput = document.getElementById('timelock-token-deposit-custom');
    const customAddr  = customInput?.value?.trim();
    const tokenSelect = document.getElementById('timelock-token-deposit-select');
    const amountInput = document.getElementById('timelock-token-deposit-amount');

    const tokenAddr = (customAddr && ethers.utils.isAddress(customAddr))
        ? ethers.utils.getAddress(customAddr)
        : tokenSelect?.value;

    if (!tokenAddr || !ethers.utils.isAddress(tokenAddr)) {
        showButtonToast('error', 'No Token', 'Select a token or enter a custom ERC-20 address first.');
        return;
    }
    if (!window.userAddress) {
        showButtonToast('error', 'Not Connected', 'Connect your wallet first.');
        return;
    }

    try {
        const readProvider = await getTimelockProvider();
        const tokenContract = new ethers.Contract(tokenAddr, ERC20_MINIMAL_ABI, readProvider);
        const [rawBal, decimals] = await Promise.all([
            withRpcRetry(() => tokenContract.balanceOf(window.userAddress), 'balanceOf'),
            withRpcRetry(() => tokenContract.decimals(), 'decimals')
        ]);
        const formatted = ethers.utils.formatUnits(rawBal, decimals);
        if (amountInput) amountInput.value = formatted;
    } catch (e) {
        console.error('[Timelock] setMaxDepositAmount error:', e);
        showButtonToast('error', 'Error', 'Could not fetch wallet balance for this token.');
    }
}

// ============================================
// DATETIME HELPER
// ============================================

/**
 * Updates the displayed unix timestamp from the datetime-local input.
 */
export function updateUnlockTimestamp() {
    const dtInput = document.getElementById('timelock-unlock-datetime');
    const tsEl = document.getElementById('timelock-unlock-ts');
    const distEl = document.getElementById('timelock-unlock-distance');
    if (!dtInput || !tsEl) return;
    if (!dtInput.value) {
        tsEl.value = '';
        if (distEl) distEl.textContent = '';
        return;
    }
    const ts = Math.floor(new Date(dtInput.value).getTime() / 1000);
    const nowTs = Math.floor(Date.now() / 1000);
    tsEl.value = `${ts}`;

    if (distEl) {
        const diff = ts - nowTs;
        if (diff <= 0) {
            distEl.textContent = 'That time is in the past — pick a future date.';
            distEl.style.color = '#e55';
        } else {
            const days  = Math.floor(diff / 86400);
            const hrs   = Math.floor((diff % 86400) / 3600);
            const mins  = Math.floor((diff % 3600) / 60);
            let parts = [];
            if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
            if (hrs  > 0) parts.push(`${hrs} hour${hrs !== 1 ? 's' : ''}`);
            if (mins > 0) parts.push(`${mins} minute${mins !== 1 ? 's' : ''}`);
            distEl.textContent = `Locks for ${parts.join(', ')} from now`;
            distEl.style.color = '#4caf50';
        }
    }
}
