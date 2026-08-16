/**
 * @module bridge
 * @description Bridging L1 <-> L2 functionality for ETH, 0xBTC, RightsTo0xBTC, and B0x
 * between Ethereum (L1) and Base (L2).
 *
 * Uses Base's official, non-custodial canonical bridge contracts directly:
 *   - L1StandardBridge (on Ethereum)  — deposits (Ethereum -> Base)
 *   - L2StandardBridge (predeploy on Base) — withdrawal initiation (Base -> Ethereum)
 *   - OptimismPortal + dispute games (on Ethereum) — proving/finalizing withdrawals
 *
 * All four assets (ETH, 0xBTC, RightsTo0xBTC, B0x) were verified on-chain to be
 * registered OptimismMintableERC20 tokens on Base (their `bridge()` view returns the
 * L2StandardBridge predeploy and `l1Token()` matches the Ethereum mainnet address in
 * config.js), so the standard canonical bridge is the correct, safe mechanism for all
 * of them — no custom intermediary contract is used or needed.
 *
 * Deposits (Ethereum -> Base) are a single transaction and complete automatically in
 * a few minutes. Withdrawals (Base -> Ethereum) only *initiate* here; the underlying
 * OP Stack design requires a separate Prove step (after the L2 output root posts to
 * L1, ~1 hour) and a Finalize step (after Base's dispute-game challenge window
 * elapses) before funds actually arrive on Ethereum. Both steps are permissionless —
 * anyone can submit them for anyone else's withdrawal — but the funds always go to
 * whichever address the withdrawal message was originally made out to (the address
 * that called withdraw/bridgeETH on Base), never to whoever happens to click
 * Prove/Finalize. Pending withdrawals are tracked per-connected-wallet in
 * localStorage so users can come back later to finish them; a manual tx-hash tracker
 * is also provided for withdrawals initiated elsewhere.
 *
 * The Prove/Finalize flow reuses the same viem-based approach as
 * BridgeL2->L1/withdrawal-finalizer.html (dynamically imported from esm.sh, mirroring
 * how this codebase already loads the Farcaster SDK), since it needs OP Stack
 * withdrawal-proof helpers that ethers.js does not provide.
 */

import {
    tokenAddresses,
    tokenAddressesETH,
    tokenIconsBase,
    tokenIconsETH,
    MULTICALL_ADDRESS
} from './config.js';

import {
    tokenAddressesDecimals,
    getTokenNameFromAddress
} from './utils.js';

import {
    walletConnected,
    userAddress,
    signer,
    signerETH,
    connectWallet,
    switchToBase,
    switchToEthereum
} from './wallet.js';

import {
    customRPC,
    customRPC_ETH
} from './settings.js';

import {
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification
} from './ui.js';

// ============================================================================
// CONTRACT ADDRESSES (Base's official canonical bridge — verified on-chain)
// ============================================================================

// Base's L1StandardBridge proxy on Ethereum mainnet.
// Verified: OTHER_BRIDGE() == L2_STANDARD_BRIDGE_ADDRESS below.
export const L1_STANDARD_BRIDGE_ADDRESS = '0x3154Cf16ccdb4C6d922629664174b904d80F2C35';

// The L2StandardBridge predeploy — same address on every OP Stack chain, including Base.
export const L2_STANDARD_BRIDGE_ADDRESS = '0x4200000000000000000000000000000000000010';

// Base's OptimismPortal proxy on Ethereum mainnet (handles proving/finalizing withdrawals).
export const OPTIMISM_PORTAL_ADDRESS = '0x49048044D57e1C92A77f79988d21Fa8fAF74E97e';

// Base's DisputeGameFactory proxy on Ethereum mainnet.
const DISPUTE_GAME_FACTORY_ADDRESS = '0x43edB88C4B80fDD2AdFF2412A7BebF9dF42cB40e';

// Base's L1CrossDomainMessenger proxy on Ethereum mainnet.
// Verified: L1StandardBridge.MESSENGER() returns this address.
const L1_CROSS_DOMAIN_MESSENGER_ADDRESS = '0x866E82a600A1414e583f7F13623F1aC5d58b0Afa';

const DEFAULT_MIN_GAS_LIMIT = 200000;
const BASE_RPC = 'https://mainnet.base.org';
const ETH_RPC = 'https://ethereum-rpc.publicnode.com';

const BRIDGE_TOKENS = ['0xBTC', 'B0x', 'ETH', 'RightsTo0xBTC'];

// ============================================================================
// WITHDRAWAL DISCOVERY (event-log scanning) CONSTANTS
// ============================================================================

// topic0 for StandardBridge's ERC20BridgeInitiated(address indexed localToken,
// address indexed remoteToken, address indexed from, address to, uint256 amount,
// bytes extraData) and ETHBridgeInitiated(address indexed from, address indexed to,
// uint256 amount, bytes extraData) — verified on-chain against real Base withdrawal
// transactions (including a real B0x withdrawal) before relying on this topic layout.
const SIG_ERC20_BRIDGE_INITIATED = '0x7ff126db8024424bbfd9826e8ab82ff59136289ea440b04b39a0df1b03b9cabf';
const SIG_ETH_BRIDGE_INITIATED = '0x2849b43074093a05396b6f2a937dee8565b15a48a7b3d4bffb732a5017380af5';

// Base targets ~2s blocks. Used only to bound how far back a scan looks; an estimate
// here is fine since it just controls the search window, not correctness.
const BASE_BLOCK_TIME_SECONDS = 2;
const BLOCKS_PER_DAY = Math.floor(86400 / BASE_BLOCK_TIME_SECONDS);
const SCAN_WINDOW_DAYS = 60;
// Base's public RPC caps eth_getLogs at a 10,000 block range — verified empirically.
const SCAN_BLOCK_CHUNK = 9500;
const SCAN_REQUEST_DELAY_MS = 200;

// ============================================================================
// ABIs
// ============================================================================

const ERC20_MIN_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)'
];

// Minimal Multicall3 ABI (same canonical address on Ethereum and Base) — used to
// batch many OptimismPortal / dispute-game reads into a handful of RPC round trips
// instead of one round trip per withdrawal per field.
const MULTICALL3_ABI = [{
    inputs: [{
        components: [
            { internalType: 'address', name: 'target', type: 'address' },
            { internalType: 'bool', name: 'allowFailure', type: 'bool' },
            { internalType: 'bytes', name: 'callData', type: 'bytes' }
        ],
        internalType: 'struct Multicall3.Call3[]', name: 'calls', type: 'tuple[]'
    }],
    name: 'aggregate3',
    outputs: [{
        components: [
            { internalType: 'bool', name: 'success', type: 'bool' },
            { internalType: 'bytes', name: 'returnData', type: 'bytes' }
        ],
        internalType: 'struct Multicall3.Result[]', name: 'returnData', type: 'tuple[]'
    }],
    stateMutability: 'view',
    type: 'function'
}];

const L1_STANDARD_BRIDGE_ABI = [
    'function depositETH(uint32 _minGasLimit, bytes calldata _extraData) external payable',
    'function depositERC20(address _l1Token, address _l2Token, uint256 _amount, uint32 _minGasLimit, bytes calldata _extraData) external'
];

const L2_STANDARD_BRIDGE_ABI = [
    'function bridgeETH(uint32 _minGasLimit, bytes calldata _extraData) external payable',
    'function withdraw(address _l2Token, uint256 _amount, uint32 _minGasLimit, bytes calldata _extraData) external payable'
];

// Minimal ABI fragment for the OptimismPortal's "external proof" finalize variant,
// which lets any wallet finalize on behalf of whichever address actually ran
// proveWithdrawal — finalize is permissionless and always pays out to the fixed
// recipient baked into the withdrawal message, regardless of the caller.
const portalAbi = [
    {
        type: 'function', name: 'finalizeWithdrawalTransactionExternalProof', stateMutability: 'nonpayable',
        inputs: [
            {
                name: '_tx', type: 'tuple', components: [
                    { name: 'nonce', type: 'uint256' },
                    { name: 'sender', type: 'address' },
                    { name: 'target', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'gasLimit', type: 'uint256' },
                    { name: 'data', type: 'bytes' }
                ]
            },
            { name: '_proofSubmitter', type: 'address' }
        ],
        outputs: []
    },
    { type: 'function', name: 'numProofSubmitters', stateMutability: 'view', inputs: [{ name: '_withdrawalHash', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
    { type: 'function', name: 'proofSubmitters', stateMutability: 'view', inputs: [{ name: '_withdrawalHash', type: 'bytes32' }, { name: '_index', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
    { type: 'function', name: 'finalizedWithdrawals', stateMutability: 'view', inputs: [{ name: '', type: 'bytes32' }], outputs: [{ name: '', type: 'bool' }] },
    { type: 'function', name: 'provenWithdrawals', stateMutability: 'view', inputs: [{ name: '', type: 'bytes32' }, { name: '', type: 'address' }], outputs: [{ name: 'disputeGameProxy', type: 'address' }, { name: 'timestamp', type: 'uint64' }] },
    { type: 'function', name: 'proofMaturityDelaySeconds', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
    { type: 'function', name: 'disputeGameFinalityDelaySeconds', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
    { type: 'function', name: 'disputeGameBlacklist', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
    { type: 'function', name: 'respectedGameType', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint32' }] },
    { type: 'function', name: 'paused', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] }
];

// Minimal ABI for reading a fault dispute game proxy's resolution state.
const disputeGameAbi = [
    { type: 'function', name: 'status', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
    { type: 'function', name: 'createdAt', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint64' }] },
    { type: 'function', name: 'resolvedAt', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint64' }] },
    { type: 'function', name: 'gameType', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint32' }] },
    { type: 'function', name: 'wasRespectedGameTypeWhenCreated', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
    // Base's current game type resolves via one of two windows measured from the
    // game's own createdAt: FAST (needs both a TEE and a ZK proof corroborating the
    // claim) or SLOW (the conservative fallback). Each game also requires its parent
    // in the chain to already be resolved, so resolution effectively can't outpace
    // the SLOW window in practice.
    { type: 'function', name: 'FAST_FINALIZATION_DELAY', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint64' }] },
    { type: 'function', name: 'SLOW_FINALIZATION_DELAY', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint64' }] },
    { type: 'function', name: 'zkProver', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] }
];

// ============================================================================
// STATE
// ============================================================================

let bridgeDirection = 'toBase'; // 'toBase' (deposit, Ethereum -> Base) | 'toEthereum' (withdraw, Base -> Ethereum)
let lastBalancesETH = {};
let lastBalancesBase = {};

export function getBridgeDirection() {
    return bridgeDirection;
}

function getDecimals(symbol) {
    return parseInt(tokenAddressesDecimals[symbol] ?? 18, 10);
}

// ============================================================================
// BUTTON SPINNER HELPERS
// ============================================================================

function disableBridgeButton(id, msg = '<span class="spinner"></span> Processing...') {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.6';
    btn.innerHTML = msg;
    btn.classList.add('btn-disabled-spinner');
}

function enableBridgeButton(id, originalText = null) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = false;
    btn.style.pointerEvents = '';
    btn.style.opacity = '';
    if (originalText) {
        btn.innerHTML = originalText;
    } else if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
    }
    btn.classList.remove('btn-disabled-spinner');
}

// ============================================================================
// UI: DIRECTION / TOKEN SELECTION
// ============================================================================

export function updateBridgeTokenIcon() {
    const select = document.getElementById('bridgeToken');
    const icon = document.getElementById('bridgeTokenIcon');
    const iconTo = document.getElementById('bridgeTokenIconTo');
    if (!select || !icon) return;

    const symbol = select.value;
    const iconsFrom = bridgeDirection === 'toBase' ? tokenIconsETH : tokenIconsBase;
    const iconsTo = bridgeDirection === 'toBase' ? tokenIconsBase : tokenIconsETH;

    icon.innerHTML = iconsFrom[symbol]
        ? `<img src="${iconsFrom[symbol]}" style="width:100%;height:100%;border-radius:50%;" onerror="this.style.display='none'">`
        : symbol.slice(0, 1);

    if (iconTo) {
        iconTo.innerHTML = iconsTo[symbol]
            ? `<img src="${iconsTo[symbol]}" style="width:100%;height:100%;border-radius:50%;" onerror="this.style.display='none'">`
            : symbol.slice(0, 1);
    }

    updateBridgeBalanceHint();
    syncBridgeURLParams();
}

// ============================================================================
// DEEP LINKING (?bridge&dir=toBase|toEthereum&asset=ETH|0xBTC|B0x|RightsTo0xBTC)
// ============================================================================
//
// Keeps the URL in sync with the current direction + selected asset (called
// whenever either changes, via updateBridgeTokenIcon) so the Bridge tab's state
// can be bookmarked or shared as a link. Only touches the URL while the Bridge
// tab is actually the one showing, so it doesn't clobber another tab's URL.
export function syncBridgeURLParams() {
    const bridgePage = document.getElementById('bridge');
    if (!bridgePage || !bridgePage.classList.contains('active')) return;

    try {
        const url = new URL(window.location.href);
        url.search = '';
        url.searchParams.set('bridge', '');
        url.searchParams.set('dir', bridgeDirection);
        const select = document.getElementById('bridgeToken');
        if (select && select.value) {
            url.searchParams.set('asset', select.value);
        }
        const cleanUrl = url.toString().replace('=&', '&').replace(/=$/, '');
        window.history.replaceState({}, '', cleanUrl);
    } catch (e) {
        console.warn('Bridge: failed to sync URL params:', e.message);
    }
}

function updateBridgeBalanceHint() {
    const select = document.getElementById('bridgeToken');
    const hint = document.getElementById('bridgeBalanceHint');
    if (!select || !hint) return;

    const symbol = select.value;
    const balances = bridgeDirection === 'toBase' ? lastBalancesETH : lastBalancesBase;
    const bal = balances ? balances[symbol] : undefined;
    const chainLabel = bridgeDirection === 'toBase' ? 'Ethereum' : 'Base';
    hint.textContent = bal !== undefined ? `Available: ${bal} ${symbol} on ${chainLabel}` : '';
}

export function setBridgeDirection(direction) {
    bridgeDirection = direction === 'toEthereum' ? 'toEthereum' : 'toBase';

    const toBaseBtn = document.getElementById('bridgeDirBtnToBase');
    const toEthBtn = document.getElementById('bridgeDirBtnToEthereum');
    const fromLabel = document.getElementById('bridgeFromLabel');
    const toLabel = document.getElementById('bridgeToLabel');
    const etaText = document.getElementById('bridgeEtaText');
    const execBtn = document.getElementById('executeBridgeBtn');
    const withdrawalsPanel = document.getElementById('bridgeWithdrawalsPanel');

    if (bridgeDirection === 'toBase') {
        if (toBaseBtn) toBaseBtn.classList.add('active');
        if (toEthBtn) toEthBtn.classList.remove('active');
        if (fromLabel) fromLabel.textContent = 'From: Ethereum';
        if (toLabel) toLabel.textContent = 'To: Base';
        if (etaText) etaText.textContent = '~1-3 minutes after your deposit confirms on Ethereum';
        if (execBtn) execBtn.textContent = 'Bridge to Base';
        if (withdrawalsPanel) withdrawalsPanel.style.display = 'none';
    } else {
        if (toEthBtn) toEthBtn.classList.add('active');
        if (toBaseBtn) toBaseBtn.classList.remove('active');
        if (fromLabel) fromLabel.textContent = 'From: Base';
        if (toLabel) toLabel.textContent = 'To: Ethereum';
        if (etaText) etaText.textContent = "If you Prove the withdrawal 1-2 hours after the withdraw transaction confirms, it takes about 5 more days after that before you can Finalize and receive the asset on Ethereum Mainnet";
        if (execBtn) execBtn.textContent = 'Withdraw from Base';
        if (withdrawalsPanel) withdrawalsPanel.style.display = '';
        renderTrackedWithdrawals();
    }

    updateBridgeTokenIcon();
    refreshBridgeBalances();
}

export function flipBridgeDirection() {
    setBridgeDirection(bridgeDirection === 'toBase' ? 'toEthereum' : 'toBase');
}

export function setMaxBridgeAmount() {
    const select = document.getElementById('bridgeToken');
    const amountInput = document.getElementById('bridgeAmount');
    if (!select || !amountInput) return;

    const symbol = select.value;
    const balances = bridgeDirection === 'toBase' ? lastBalancesETH : lastBalancesBase;
    const bal = balances ? balances[symbol] : undefined;
    if (bal !== undefined) amountInput.value = bal;
}

// ============================================================================
// READ-ONLY PROVIDER HELPERS (shared by balances, scanning, and multicall status checks)
// ============================================================================
//
// These deliberately do NOT use the wallet's own injected provider (`signer`'s
// underlying Web3Provider from wallet.js). That provider tracks whatever chain the
// user's wallet is currently connected to — and switching chains mid-operation
// (e.g. clicking Finalize, which switches the wallet to Ethereum, while a Base scan
// or balance read is still in flight) makes ethers throw a NETWORK_ERROR and abort
// whatever was using it. Reads here are independent of wallet state entirely, using
// the same pattern as utils.js's fetchBalances: a plain JsonRpcProvider pointed at
// the user's configured RPC (falling back to the public default).

let cachedEthReadProvider = null;
let cachedBaseReadProvider = null;

function getEthReadProvider() {
    if (!cachedEthReadProvider) {
        cachedEthReadProvider = new ethers.providers.JsonRpcProvider(customRPC_ETH || ETH_RPC);
    }
    return cachedEthReadProvider;
}

function getBaseReadProvider() {
    if (!cachedBaseReadProvider) {
        cachedBaseReadProvider = new ethers.providers.JsonRpcProvider(customRPC || BASE_RPC);
    }
    return cachedBaseReadProvider;
}

// ============================================================================
// BALANCES
// ============================================================================

async function fetchBridgeBalanceSet(addr, tokenAddrMap, roProvider) {
    const result = {};
    await Promise.all(BRIDGE_TOKENS.map(async (symbol) => {
        try {
            if (symbol === 'ETH') {
                const bal = await roProvider.getBalance(addr);
                result.ETH = ethers.utils.formatUnits(bal, 18);
            } else {
                const tokenAddr = tokenAddrMap[symbol];
                if (!tokenAddr) return;
                const c = new ethers.Contract(tokenAddr, ERC20_MIN_ABI, roProvider);
                const bal = await c.balanceOf(addr);
                result[symbol] = ethers.utils.formatUnits(bal, getDecimals(symbol));
            }
        } catch (e) {
            console.warn(`Bridge: failed to fetch ${symbol} balance:`, e.message);
        }
    }));
    return result;
}

function renderBridgeBalances(container, balances, iconsMap) {
    if (!container) return;
    let html = '';
    BRIDGE_TOKENS.forEach((symbol) => {
        if (balances[symbol] === undefined) return;
        const iconUrl = iconsMap[symbol] || '';
        const displayValue = window.formatExactNumber ? window.formatExactNumber(balances[symbol]) : balances[symbol];
        html += `
            <div class="balance-item">
                ${iconUrl ? `<img src="${iconUrl}" alt="${symbol}" class="token-icon222" onerror="this.style.display='none'">` : ''}
                <span class="token-name">${symbol}</span>
                <span class="token-amount">${displayValue}</span>
            </div>`;
    });
    container.innerHTML = html || '<p style="color: #6c757d; font-style: italic;">No balances found.</p>';
}

export async function refreshBridgeBalances() {
    const addr = userAddress || window.userAddress;
    const containerETH = document.getElementById('bridgeBalancesETH');
    const containerBase = document.getElementById('bridgeBalancesBase');
    if (!addr) return;

    try {
        const [ethBalances, baseBalances] = await Promise.all([
            fetchBridgeBalanceSet(addr, tokenAddressesETH, getEthReadProvider()),
            fetchBridgeBalanceSet(addr, tokenAddresses, getBaseReadProvider())
        ]);

        lastBalancesETH = ethBalances;
        lastBalancesBase = baseBalances;

        renderBridgeBalances(containerETH, ethBalances, tokenIconsETH);
        renderBridgeBalances(containerBase, baseBalances, tokenIconsBase);
        updateBridgeBalanceHint();
    } catch (err) {
        console.error('Error refreshing bridge balances:', err);
    }
}

// ============================================================================
// DEPOSIT: Ethereum -> Base
// ============================================================================

const LOW_PRIORITY_FEE_GWEI = '0.001';

// MetaMask's default priority-fee suggestion (often ~0.1-0.2 gwei) is meant for
// transactions that benefit from fast inclusion. An ERC20 approve() isn't
// time-sensitive — there's no reason to tip validators for speed — so request a
// much lower priority fee while keeping the wallet/network's current maxFeePerGas
// so the transaction still stays valid (EIP-1559 requires maxFeePerGas >=
// maxPriorityFeePerGas) and doesn't get stuck as base fee moves.
async function getLowPriorityFeeOverrides(signerForFees) {
    try {
        const feeData = await signerForFees.provider.getFeeData();
        if (!feeData.maxFeePerGas) return {}; // legacy (non-EIP-1559) network — leave wallet defaults
        return {
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: ethers.utils.parseUnits(LOW_PRIORITY_FEE_GWEI, 'gwei')
        };
    } catch (e) {
        console.warn('Bridge: failed to fetch fee data for low-priority override, using wallet defaults:', e.message);
        return {};
    }
}

async function depositToBase() {
    const btnId = 'executeBridgeBtn';
    try {
        if (!walletConnected && !window.walletConnected) {
            await connectWallet();
        }
        await switchToEthereum();

        const symbol = document.getElementById('bridgeToken').value;
        const amountStr = document.getElementById('bridgeAmount').value;
        const amount = parseFloat(amountStr);
        if (!amountStr || isNaN(amount) || amount <= 0) {
            showErrorNotification('Invalid amount', 'Enter an amount greater than 0');
            return false;
        }

        const decimals = getDecimals(symbol);
        const amountWei = ethers.utils.parseUnits(amountStr, decimals);
        const activeSigner = signerETH || window.signerETH;

        disableBridgeButton(btnId);

        const l1Bridge = new ethers.Contract(L1_STANDARD_BRIDGE_ADDRESS, L1_STANDARD_BRIDGE_ABI, activeSigner);

        let tx;
        if (symbol === 'ETH') {
            showInfoNotification('Depositing ETH to Base', 'Please confirm the transaction in your wallet');
            tx = await l1Bridge.depositETH(DEFAULT_MIN_GAS_LIMIT, '0x', { value: amountWei });
        } else {
            const l1Token = tokenAddressesETH[symbol];
            const l2Token = tokenAddresses[symbol];
            const owner = await activeSigner.getAddress();
            const erc20 = new ethers.Contract(l1Token, ERC20_MIN_ABI, activeSigner);

            const currentAllowance = await erc20.allowance(owner, L1_STANDARD_BRIDGE_ADDRESS);
            if (currentAllowance.lt(amountWei)) {
                showInfoNotification(`Approving ${symbol}`, 'Please confirm the approval in your wallet');
                const feeOverrides = await getLowPriorityFeeOverrides(activeSigner);
                const approveTx = await erc20.approve(L1_STANDARD_BRIDGE_ADDRESS, amountWei, feeOverrides);
                await approveTx.wait();
            }

            showInfoNotification(`Depositing ${symbol} to Base`, 'Please confirm the transaction in your wallet');
            tx = await l1Bridge.depositERC20(l1Token, l2Token, amountWei, DEFAULT_MIN_GAS_LIMIT, '0x');
        }

        showInfoNotification();
        await tx.wait();
        showSuccessNotification(
            'Deposit sent!',
            `${symbol} is on its way to Base and should arrive in a few minutes.`,
            tx.hash,
            'ethereum'
        );

        await refreshBridgeBalances();
        return true;
    } catch (err) {
        console.error('Error depositing to Base:', err);
        showErrorNotification('Deposit failed', err.reason || err.message || 'Please check your wallet and try again');
        return false;
    } finally {
        enableBridgeButton(btnId, 'Bridge to Base');
    }
}

// ============================================================================
// WITHDRAW: Base -> Ethereum (initiation only — see Prove/Finalize below)
// ============================================================================

async function withdrawFromBase() {
    const btnId = 'executeBridgeBtn';
    try {
        if (!walletConnected && !window.walletConnected) {
            await connectWallet();
        }
        await switchToBase();

        const symbol = document.getElementById('bridgeToken').value;
        const amountStr = document.getElementById('bridgeAmount').value;
        const amount = parseFloat(amountStr);
        if (!amountStr || isNaN(amount) || amount <= 0) {
            showErrorNotification('Invalid amount', 'Enter an amount greater than 0');
            return false;
        }

        const decimals = getDecimals(symbol);
        const amountWei = ethers.utils.parseUnits(amountStr, decimals);
        const activeSigner = signer || window.signer;
        const owner = await activeSigner.getAddress();

        disableBridgeButton(btnId);

        const l2Bridge = new ethers.Contract(L2_STANDARD_BRIDGE_ADDRESS, L2_STANDARD_BRIDGE_ABI, activeSigner);

        let tx;
        if (symbol === 'ETH') {
            showInfoNotification('Withdrawing ETH from Base', 'Please confirm the transaction in your wallet');
            tx = await l2Bridge.bridgeETH(DEFAULT_MIN_GAS_LIMIT, '0x', { value: amountWei });
        } else {
            const l2Token = tokenAddresses[symbol];
            const erc20 = new ethers.Contract(l2Token, ERC20_MIN_ABI, activeSigner);

            const currentAllowance = await erc20.allowance(owner, L2_STANDARD_BRIDGE_ADDRESS);
            if (currentAllowance.lt(amountWei)) {
                showInfoNotification(`Approving ${symbol}`, 'Please confirm the approval in your wallet');
                const approveTx = await erc20.approve(L2_STANDARD_BRIDGE_ADDRESS, amountWei);
                await approveTx.wait();
            }

            showInfoNotification(`Withdrawing ${symbol} from Base`, 'Please confirm the transaction in your wallet');
            tx = await l2Bridge.withdraw(l2Token, amountWei, DEFAULT_MIN_GAS_LIMIT, '0x');
        }

        showInfoNotification();
        await tx.wait();

        saveTrackedWithdrawal({
            hash: tx.hash,
            symbol,
            amount: amountStr,
            owner,
            timestamp: Date.now(),
            source: 'self'
        });

        showSuccessNotification(
            'Withdrawal initiated!',
            `${symbol} withdrawal started on Base. Once the challenge period passes, use Prove then Finalize below to receive it on Ethereum.`,
            tx.hash,
            'base'
        );

        await refreshBridgeBalances();
        renderTrackedWithdrawals();
        return true;
    } catch (err) {
        console.error('Error withdrawing from Base:', err);
        showErrorNotification('Withdrawal failed', err.reason || err.message || 'Please check your wallet and try again');
        return false;
    } finally {
        enableBridgeButton(btnId, 'Withdraw from Base');
    }
}

export async function executeBridge() {
    if (bridgeDirection === 'toBase') {
        return depositToBase();
    }
    return withdrawFromBase();
}

// ============================================================================
// PENDING WITHDRAWAL TRACKING (localStorage, per connected wallet)
// ============================================================================

const STORAGE_KEY_PREFIX = 'b0xBridgeWithdrawals_';

function getStorageKey() {
    const addr = (userAddress || window.userAddress || '').toLowerCase();
    return STORAGE_KEY_PREFIX + (addr || 'anonymous');
}

function loadTrackedWithdrawals() {
    try {
        const raw = localStorage.getItem(getStorageKey());
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveTrackedWithdrawals(list) {
    try {
        localStorage.setItem(getStorageKey(), JSON.stringify(list));
    } catch (e) {
        console.warn('Bridge: failed to save tracked withdrawals:', e);
    }
}

// Returns true if the entry was newly added, false if it was already tracked.
function saveTrackedWithdrawal(entry) {
    const list = loadTrackedWithdrawals();
    if (list.some((w) => w.hash.toLowerCase() === entry.hash.toLowerCase())) {
        return false;
    }
    list.unshift(entry);
    saveTrackedWithdrawals(list);
    return true;
}

export function trackBridgeWithdrawalByHash() {
    const input = document.getElementById('bridgeManualTxHash');
    const hash = input ? input.value.trim() : '';
    if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
        showErrorNotification('Invalid transaction hash', 'Paste a full Base transaction hash starting with 0x');
        return;
    }
    saveTrackedWithdrawal({ hash, symbol: null, amount: null, owner: null, timestamp: Date.now(), source: 'manual' });
    if (input) input.value = '';
    renderTrackedWithdrawals();
    batchCheckWithdrawalStatuses([hash]);
}

export function removeBridgeWithdrawal(hash) {
    const list = loadTrackedWithdrawals().filter((w) => w.hash.toLowerCase() !== hash.toLowerCase());
    saveTrackedWithdrawals(list);
    renderTrackedWithdrawals();
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

export function renderTrackedWithdrawals() {
    const container = document.getElementById('bridgeWithdrawalsList');
    if (!container) return;

    const list = loadTrackedWithdrawals();
    if (list.length === 0) {
        container.innerHTML = '<p style="color: #6c757d; font-style: italic;">No tracked withdrawals yet.</p>';
        return;
    }

    container.innerHTML = list.map((w) => {
        const hash = escapeHtml(w.hash);
        const label = w.symbol ? escapeHtml(`${w.amount ?? ''} ${w.symbol}`.trim()) : 'Tracked withdrawal';
        const dateStr = w.timestamp ? new Date(w.timestamp).toLocaleString() : '';
        const sourceTag = w.source === 'search' ? ' &middot; found by search' : (w.source === 'manual' ? ' &middot; tracked manually' : '');
        return `
            <div class="bridge-withdrawal-card" data-hash="${hash}">
                <div class="bridge-withdrawal-card-header">
                    <span class="bridge-withdrawal-title">${label}</span>
                    <span class="bridge-status-badge pending" id="bridge-badge-${hash}">Unknown</span>
                </div>
                <div class="bridge-withdrawal-hash">${hash}${dateStr ? ' &middot; ' + escapeHtml(dateStr) : ''}${sourceTag}</div>
                <div class="bridge-withdrawal-status" id="bridge-status-${hash}">Click "Check Status" to look up this withdrawal.</div>
                <div class="bridge-withdrawal-actions">
                    <button class="btn-secondary" type="button" onclick="checkBridgeWithdrawalStatus('${hash}')">Check Status</button>
                    <button class="btn-secondary" type="button" id="bridge-prove-${hash}" onclick="proveBridgeWithdrawal('${hash}')">Prove</button>
                    <button class="btn-primary" type="button" id="bridge-finalize-${hash}" onclick="finalizeBridgeWithdrawal('${hash}')">Finalize</button>
                    <button class="btn-secondary" type="button" onclick="removeBridgeWithdrawal('${hash}')" title="Remove from this list only — does not affect the withdrawal itself">Remove</button>
                </div>
            </div>`;
    }).join('');
}

function setWithdrawalStatusText(hash, text) {
    const el = document.getElementById(`bridge-status-${hash}`);
    if (el) el.textContent = text;
}

function setWithdrawalBadge(hash, cls, text) {
    const el = document.getElementById(`bridge-badge-${hash}`);
    if (el) {
        el.className = `bridge-status-badge ${cls}`;
        el.textContent = text;
    }
}

function setActionButtonsDisabled(hash, { prove, finalize }) {
    const proveBtn = document.getElementById(`bridge-prove-${hash}`);
    const finalizeBtn = document.getElementById(`bridge-finalize-${hash}`);
    if (proveBtn) proveBtn.disabled = !!prove;
    if (finalizeBtn) finalizeBtn.disabled = !!finalize;
}

// Toggles which action makes sense right now for a withdrawal, based on its
// latest known status — "what we can do and when". Only "not proven yet" and
// "needs re-proving" states allow Prove; only "ready" allows Finalize.
function updateActionAvailability(hash, badgeClass, badgeText) {
    const canProve = badgeText === 'Not proven' || (badgeClass === 'error' && badgeText === 'Re-prove needed');
    const canFinalize = badgeClass === 'ready';
    setActionButtonsDisabled(hash, { prove: !canProve, finalize: !canFinalize });
}

// Applies a {text, badgeClass, badgeText} status result to a card's text, badge,
// and action-button availability all at once.
function applyWithdrawalStatus(hash, status) {
    setWithdrawalStatusText(hash, status.text);
    setWithdrawalBadge(hash, status.badgeClass, status.badgeText);
    updateActionAvailability(hash, status.badgeClass, status.badgeText);
}

// ============================================================================
// PROVE / FINALIZE (viem, dynamically imported from esm.sh — same approach as
// BridgeL2->L1/withdrawal-finalizer.html)
// ============================================================================

let viemModulesPromise = null;
function loadViemModules() {
    if (!viemModulesPromise) {
        viemModulesPromise = (async () => {
            const core = await import('https://esm.sh/viem@2.21.0');
            const chains = await import('https://esm.sh/viem@2.21.0/chains');
            const opStack = await import('https://esm.sh/viem@2.21.0/op-stack');
            return { core, chains, opStack };
        })();
    }
    return viemModulesPromise;
}

// Base moved off shared OP Stack / Superchain governance and now runs its own proof
// system (TEE attestations + SP1 ZK proofs via a contract called AggregateVerifier)
// at addresses viem's bundled `base` chain definition may not know about — override
// the relevant L1 contract addresses here with Base's current official ones (same
// overrides as the reference withdrawal-finalizer.html, verified on-chain above).
function buildBaseChainOverride(baseBuiltin, mainnet) {
    return {
        ...baseBuiltin,
        contracts: {
            ...baseBuiltin.contracts,
            portal: { [mainnet.id]: { address: OPTIMISM_PORTAL_ADDRESS } },
            disputeGameFactory: { [mainnet.id]: { address: DISPUTE_GAME_FACTORY_ADDRESS } },
            l1StandardBridge: { [mainnet.id]: { address: L1_STANDARD_BRIDGE_ADDRESS } },
            l1CrossDomainMessenger: { [mainnet.id]: { address: L1_CROSS_DOMAIN_MESSENGER_ADDRESS } }
        }
    };
}

// Read-only clients — used for Check Status so it doesn't require a wallet popup.
async function getReadClients() {
    const { core, chains, opStack } = await loadViemModules();
    const { createPublicClient, http } = core;
    const { mainnet, base: baseBuiltin } = chains;
    const { publicActionsL2 } = opStack;
    const base = buildBaseChainOverride(baseBuiltin, mainnet);

    const publicClientL1 = createPublicClient({ chain: mainnet, transport: http(ETH_RPC) });
    const publicClientL2 = createPublicClient({ chain: base, transport: http(BASE_RPC) }).extend(publicActionsL2());
    return { publicClientL1, publicClientL2, base };
}

// Wallet-connected clients — used for Prove/Finalize (writes).
async function getWalletClients() {
    const { core, chains, opStack } = await loadViemModules();
    const { createWalletClient, createPublicClient, custom, http, publicActions } = core;
    const { mainnet, base: baseBuiltin } = chains;
    const { publicActionsL1, walletActionsL1, publicActionsL2 } = opStack;
    const base = buildBaseChainOverride(baseBuiltin, mainnet);

    if (!window.ethereum) {
        throw new Error('No browser wallet found. Install MetaMask or a similar extension.');
    }
    const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });

    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== '0x1') {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] });
    }

    const walletClientL1 = createWalletClient({ account, chain: mainnet, transport: custom(window.ethereum) })
        .extend(publicActions)
        .extend(publicActionsL1())
        .extend(walletActionsL1());

    const publicClientL2 = createPublicClient({ chain: base, transport: http(BASE_RPC) }).extend(publicActionsL2());

    return { walletClientL1, publicClientL2, base, account };
}

function readPortal(client, functionName, args = []) {
    return client.readContract({ address: OPTIMISM_PORTAL_ADDRESS, abi: portalAbi, functionName, args });
}

function readGame(client, gameAddress, functionName, args = []) {
    return client.readContract({ address: gameAddress, abi: disputeGameAbi, functionName, args });
}

function formatDuration(seconds) {
    const s = Number(seconds);
    if (s <= 0) return '0m';
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (!days && minutes) parts.push(`${minutes}m`);
    return parts.join(' ') || '<1m';
}

async function getProofSubmitters(client, withdrawalHash) {
    const count = await readPortal(client, 'numProofSubmitters', [withdrawalHash]);
    if (count === 0n) return [];
    return Promise.all(
        Array.from({ length: Number(count) }, (_, i) => readPortal(client, 'proofSubmitters', [withdrawalHash, BigInt(i)]))
    );
}

async function findProofSubmitter(client, withdrawalHash) {
    const submitters = await getProofSubmitters(client, withdrawalHash);
    if (submitters.length === 0) {
        throw new Error('No proof found on L1 for this withdrawal yet — run Prove first.');
    }
    return submitters[submitters.length - 1];
}

// Determine the withdrawal's real status by walking the same checks the portal
// itself makes, instead of relying on a generic status helper that doesn't
// recognize Base's custom proof-contract reverts.
async function getDetailedStatus(client, withdrawalHash) {
    const finalized = await readPortal(client, 'finalizedWithdrawals', [withdrawalHash]);
    if (finalized) {
        return { text: 'Finalized — funds have already been delivered to the recipient.', badgeClass: 'done', badgeText: 'Finalized' };
    }

    const submitters = await getProofSubmitters(client, withdrawalHash);
    if (submitters.length === 0) {
        return {
            text: "Not proven yet. Click Prove (requires the L2 output root to have posted to L1, usually ~1 hour after the withdrawal tx).",
            badgeClass: 'pending', badgeText: 'Not proven'
        };
    }

    const submitter = submitters[submitters.length - 1];

    const [paused, [disputeGameProxy, provenTimestamp], proofMaturityDelay, gameFinalityDelay, respectedGameType] = await Promise.all([
        readPortal(client, 'paused'),
        readPortal(client, 'provenWithdrawals', [withdrawalHash, submitter]),
        readPortal(client, 'proofMaturityDelaySeconds'),
        readPortal(client, 'disputeGameFinalityDelaySeconds'),
        readPortal(client, 'respectedGameType')
    ]);

    if (paused) {
        return { text: 'Portal withdrawals are currently paused.', badgeClass: 'pending', badgeText: 'Paused' };
    }

    const blacklisted = await readPortal(client, 'disputeGameBlacklist', [disputeGameProxy]);
    if (blacklisted) {
        return { text: 'The dispute game backing this proof was blacklisted — re-prove to get a valid game.', badgeClass: 'error', badgeText: 'Re-prove needed' };
    }

    const [gameStatus, gameType, resolvedAt, wasRespected] = await Promise.all([
        readGame(client, disputeGameProxy, 'status'),
        readGame(client, disputeGameProxy, 'gameType'),
        readGame(client, disputeGameProxy, 'resolvedAt'),
        readGame(client, disputeGameProxy, 'wasRespectedGameTypeWhenCreated')
    ]);

    if (!wasRespected && gameType !== respectedGameType) {
        return { text: 'The dispute game type used for this proof is no longer respected — re-prove to get a valid game.', badgeClass: 'error', badgeText: 'Re-prove needed' };
    }

    // status() is uint8 — viem decodes int/uint types <= 48 bits as plain JS
    // numbers (not bigint), so compare against 0/1 here, not 0n/1n.
    if (gameStatus === 0) {
        const [gameCreatedAt, fastDelay, slowDelay, zkProver] = await Promise.all([
            readGame(client, disputeGameProxy, 'createdAt'),
            readGame(client, disputeGameProxy, 'FAST_FINALIZATION_DELAY'),
            readGame(client, disputeGameProxy, 'SLOW_FINALIZATION_DELAY'),
            readGame(client, disputeGameProxy, 'zkProver')
        ]);
        const hasZkProof = zkProver !== '0x0000000000000000000000000000000000000000';
        const delay = hasZkProof ? fastDelay : slowDelay;
        const now = BigInt(Math.floor(Date.now() / 1000));
        const eta = gameCreatedAt + delay;
        const etaText = now < eta ? `~${formatDuration(eta - now)}` : 'any time now';
        return {
            text: `Proven, dispute game not resolved yet — ${hasZkProof ? 'fast path (ZK proof present)' : 'slow path (no ZK proof yet)'}. Estimated: ${etaText}.`,
            badgeClass: 'pending', badgeText: 'Proven, waiting'
        };
    }
    if (gameStatus === 1) {
        return { text: 'Proven, but the dispute game resolved against this proof (challenger won) — re-prove.', badgeClass: 'error', badgeText: 'Re-prove needed' };
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    const maturesAt = provenTimestamp + proofMaturityDelay;
    if (now < maturesAt) {
        return {
            text: `Proven and the dispute game resolved successfully, but the proof maturity delay hasn't elapsed yet. Ready to finalize in ~${formatDuration(maturesAt - now)}.`,
            badgeClass: 'pending', badgeText: 'Maturing'
        };
    }

    const finalizesAt = resolvedAt + gameFinalityDelay;
    if (now < finalizesAt) {
        return {
            text: `Proven and matured, but waiting on the dispute-game finality delay. Ready to finalize in ~${formatDuration(finalizesAt - now)}.`,
            badgeClass: 'pending', badgeText: 'Waiting'
        };
    }

    return { text: 'Ready to finalize!', badgeClass: 'ready', badgeText: 'Ready' };
}

// Cache of {receipt, withdrawal} per tx hash — this data is immutable once mined, so
// it's safe to reuse across repeated status checks / batch multicall passes instead
// of re-fetching the L2 receipt and re-decoding the withdrawal message every time.
const withdrawalDataCache = new Map();

async function loadWithdrawalData(hash, publicClientL2) {
    const cached = withdrawalDataCache.get(hash.toLowerCase());
    if (cached) return cached;

    const receipt = await publicClientL2.getTransactionReceipt({ hash });
    const { getWithdrawals } = (await loadViemModules()).opStack;
    const [withdrawal] = getWithdrawals(receipt);
    if (!withdrawal) {
        throw new Error('No withdrawal message found in that transaction — wrong hash?');
    }
    const data = { receipt, withdrawal };
    withdrawalDataCache.set(hash.toLowerCase(), data);
    return data;
}

// Loads withdrawal data for many hashes at once with a small concurrency cap, so a
// batch of e.g. 20 discovered withdrawals doesn't fire 20 simultaneous requests at
// the public Base RPC.
async function loadWithdrawalDataBatch(hashes, concurrency = 5) {
    const results = new Map();
    let idx = 0;
    const { publicClientL2 } = await getReadClients();

    async function worker() {
        while (idx < hashes.length) {
            const hash = hashes[idx++];
            try {
                results.set(hash, await loadWithdrawalData(hash, publicClientL2));
            } catch (err) {
                console.warn(`Bridge: failed to load withdrawal data for ${hash}:`, err.message || err);
                results.set(hash, null);
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, hashes.length) }, worker));
    return results;
}

async function getEip1559Fees(walletClientL1) {
    const { maxFeePerGas, maxPriorityFeePerGas } = await walletClientL1.estimateFeesPerGas();
    return { type: 'eip1559', maxFeePerGas, maxPriorityFeePerGas };
}

export async function checkBridgeWithdrawalStatus(hash) {
    setWithdrawalBadge(hash, 'pending', 'Checking...');
    setWithdrawalStatusText(hash, 'Fetching withdrawal status...');
    try {
        const { publicClientL1, publicClientL2 } = await getReadClients();
        const { withdrawal } = await loadWithdrawalData(hash, publicClientL2);
        const status = await getDetailedStatus(publicClientL1, withdrawal.withdrawalHash);
        applyWithdrawalStatus(hash, status);
    } catch (err) {
        console.error('Error checking withdrawal status:', err);
        setWithdrawalStatusText(hash, `Error: ${err.shortMessage || err.message || err}`);
        setWithdrawalBadge(hash, 'error', 'Error');
    }
}

export async function proveBridgeWithdrawal(hash) {
    setWithdrawalStatusText(hash, 'Connecting wallet and building proof...');
    try {
        const { walletClientL1, publicClientL2, base, account } = await getWalletClients();
        const { receipt, withdrawal } = await loadWithdrawalData(hash, publicClientL2);

        setWithdrawalStatusText(hash, 'Building proof from Base output root...');
        const output = await walletClientL1.getL2Output({ l2BlockNumber: receipt.blockNumber, targetChain: base });
        const args = await publicClientL2.buildProveWithdrawal({ account, output, withdrawal });

        const fees = await getEip1559Fees(walletClientL1);

        setWithdrawalStatusText(hash, 'Sending proveWithdrawalTransaction — confirm in your wallet...');
        const txHash = await walletClientL1.proveWithdrawal({ ...args, ...fees });
        setWithdrawalStatusText(hash, `Prove transaction sent: ${txHash}. Waiting for confirmation...`);
        await walletClientL1.waitForTransactionReceipt({ hash: txHash });

        setWithdrawalStatusText(hash, 'Proved! Click "Check Status" to see how long until you can finalize.');
        setWithdrawalBadge(hash, 'pending', 'Proven');
        setActionButtonsDisabled(hash, { prove: true, finalize: true });
    } catch (err) {
        console.error('Error proving withdrawal:', err);
        setWithdrawalStatusText(
            hash,
            `Error: ${err.shortMessage || err.message || err}. If this mentions a missing output root, the ` +
            'output root for this block likely has not posted to L1 yet (usually ~1 hour after the withdrawal tx) — wait and try again.'
        );
        setWithdrawalBadge(hash, 'error', 'Error');
    }
}

export async function finalizeBridgeWithdrawal(hash) {
    setWithdrawalStatusText(hash, 'Connecting wallet...');
    try {
        const { walletClientL1, publicClientL2 } = await getWalletClients();
        const { withdrawal } = await loadWithdrawalData(hash, publicClientL2);

        const proofSubmitter = await findProofSubmitter(walletClientL1, withdrawal.withdrawalHash);
        setWithdrawalStatusText(hash, `Finalizing on behalf of proof submitter: ${proofSubmitter}...`);

        const fees = await getEip1559Fees(walletClientL1);
        const { nonce, sender, target, value, gasLimit, data } = withdrawal;

        setWithdrawalStatusText(hash, 'Sending finalizeWithdrawalTransactionExternalProof — confirm in your wallet...');
        const txHash = await walletClientL1.writeContract({
            address: OPTIMISM_PORTAL_ADDRESS,
            abi: portalAbi,
            functionName: 'finalizeWithdrawalTransactionExternalProof',
            args: [{ nonce, sender, target, value, gasLimit, data }, proofSubmitter],
            ...fees
        });
        setWithdrawalStatusText(hash, `Finalize transaction sent: ${txHash}. Waiting for confirmation...`);
        await walletClientL1.waitForTransactionReceipt({ hash: txHash });

        setWithdrawalStatusText(hash, 'Finalized! Funds have been delivered to the recipient address.');
        setWithdrawalBadge(hash, 'done', 'Finalized');
        setActionButtonsDisabled(hash, { prove: true, finalize: true });
        showSuccessNotification('Withdrawal finalized!', 'Funds have been delivered on Ethereum.', txHash, 'ethereum');
        await refreshBridgeBalances();
    } catch (err) {
        console.error('Error finalizing withdrawal:', err);
        setWithdrawalStatusText(hash, `Error: ${err.shortMessage || err.message || err}`);
        setWithdrawalBadge(hash, 'error', 'Error');
    }
}

// ============================================================================
// BATCH STATUS CHECKING (Multicall3) — checks many withdrawals' portal/dispute-game
// state in a handful of RPC round trips instead of one chain of reads per item.
// ============================================================================

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function getMulticall3(providerOrSigner) {
    return new ethers.Contract(MULTICALL_ADDRESS, MULTICALL3_ABI, providerOrSigner);
}

// Runs a batch of {target, fn, args, iface} reads through Multicall3.aggregate3 and
// decodes each result (or marks it failed) — `defaultIface` is used for calls that
// don't specify their own `iface`.
async function runMulticall(multicall, calls, defaultIface) {
    if (calls.length === 0) return [];
    const call3s = calls.map((c) => ({
        target: c.target,
        allowFailure: true,
        callData: (c.iface || defaultIface).encodeFunctionData(c.fn, c.args || [])
    }));
    const results = await multicall.aggregate3(call3s);
    return results.map((r, i) => {
        if (!r.success) return { success: false, value: null };
        const iface = calls[i].iface || defaultIface;
        try {
            const decoded = iface.decodeFunctionResult(calls[i].fn, r.returnData);
            return { success: true, value: decoded.length === 1 ? decoded[0] : decoded };
        } catch (e) {
            return { success: false, value: null };
        }
    });
}

/**
 * Checks the OptimismPortal/dispute-game status of many withdrawals at once,
 * batching all the underlying reads through Multicall3 rather than doing a separate
 * chain of RPC calls per withdrawal ("big multicall" instead of one-by-one). Updates
 * each card's status text, badge, and Prove/Finalize button availability directly.
 */
export async function batchCheckWithdrawalStatuses(hashes) {
    const uniqueHashes = [...new Set(hashes || [])];
    if (uniqueHashes.length === 0) return;

    uniqueHashes.forEach((h) => setWithdrawalBadge(h, 'pending', 'Checking...'));

    const dataMap = await loadWithdrawalDataBatch(uniqueHashes);
    const items = uniqueHashes
        .map((hash) => ({ hash, data: dataMap.get(hash) }))
        .filter((i) => {
            if (!i.data) {
                setWithdrawalStatusText(i.hash, 'Could not load this withdrawal — check the transaction hash is a Base withdrawal transaction.');
                setWithdrawalBadge(i.hash, 'error', 'Error');
            }
            return !!i.data;
        });
    if (items.length === 0) return;

    const multicall = getMulticall3(getEthReadProvider());
    const portalIface = new ethers.utils.Interface(portalAbi);
    const gameIface = new ethers.utils.Interface(disputeGameAbi);

    // Phase 1: per-item finalized flag + proof count, plus the handful of global
    // portal parameters (fetched once, not once per item).
    const phase1Calls = [];
    items.forEach((item) => {
        phase1Calls.push({ target: OPTIMISM_PORTAL_ADDRESS, fn: 'finalizedWithdrawals', args: [item.data.withdrawal.withdrawalHash] });
        phase1Calls.push({ target: OPTIMISM_PORTAL_ADDRESS, fn: 'numProofSubmitters', args: [item.data.withdrawal.withdrawalHash] });
    });
    ['proofMaturityDelaySeconds', 'disputeGameFinalityDelaySeconds', 'respectedGameType', 'paused'].forEach((fn) => {
        phase1Calls.push({ target: OPTIMISM_PORTAL_ADDRESS, fn, args: [] });
    });

    let phase1Results;
    try {
        phase1Results = await runMulticall(multicall, phase1Calls, portalIface);
    } catch (err) {
        console.error('Bridge: batch status multicall (phase 1) failed:', err);
        items.forEach((item) => {
            setWithdrawalStatusText(item.hash, `Error checking status: ${err.message || err}`);
            setWithdrawalBadge(item.hash, 'error', 'Error');
        });
        return;
    }

    const globalBase = phase1Results.length - 4;
    const proofMaturityDelay = phase1Results[globalBase].value;
    const gameFinalityDelay = phase1Results[globalBase + 1].value;
    const respectedGameType = phase1Results[globalBase + 2].value;
    const paused = phase1Results[globalBase + 3].value;

    const remaining = [];
    items.forEach((item, idx) => {
        item.finalized = phase1Results[idx * 2].value;
        item.numSubmitters = phase1Results[idx * 2 + 1].value;

        if (!phase1Results[idx * 2].success) {
            applyWithdrawalStatus(item.hash, { text: 'Could not read portal status for this withdrawal.', badgeClass: 'error', badgeText: 'Error' });
        } else if (item.finalized) {
            applyWithdrawalStatus(item.hash, { text: 'Finalized — funds have already been delivered to the recipient.', badgeClass: 'done', badgeText: 'Finalized' });
        } else if (!item.numSubmitters || item.numSubmitters.eq(0)) {
            applyWithdrawalStatus(item.hash, {
                text: "Not proven yet. Click Prove (requires the L2 output root to have posted to L1, usually ~1 hour after the withdrawal tx).",
                badgeClass: 'pending', badgeText: 'Not proven'
            });
        } else if (paused) {
            applyWithdrawalStatus(item.hash, { text: 'Portal withdrawals are currently paused.', badgeClass: 'pending', badgeText: 'Paused' });
        } else {
            remaining.push(item);
        }
    });
    if (remaining.length === 0) return;

    // Phase 2: latest proof submitter per remaining item.
    const phase2Calls = remaining.map((item) => ({
        target: OPTIMISM_PORTAL_ADDRESS, fn: 'proofSubmitters',
        args: [item.data.withdrawal.withdrawalHash, item.numSubmitters.sub(1)]
    }));
    const phase2Results = await runMulticall(multicall, phase2Calls, portalIface);
    remaining.forEach((item, idx) => { item.submitter = phase2Results[idx].value; });

    // Phase 3: provenWithdrawals per item -> disputeGameProxy + provenTimestamp.
    const phase3Calls = remaining.map((item) => ({
        target: OPTIMISM_PORTAL_ADDRESS, fn: 'provenWithdrawals',
        args: [item.data.withdrawal.withdrawalHash, item.submitter]
    }));
    const phase3Results = await runMulticall(multicall, phase3Calls, portalIface);
    remaining.forEach((item, idx) => {
        const value = phase3Results[idx].value;
        item.disputeGameProxy = value ? value[0] : null;
        item.provenTimestamp = value ? value[1] : null;
    });

    // Phase 4: blacklist check (portal) + dispute-game state (per-game contract) —
    // mixed target contracts in the same aggregate3 batch.
    const withGame = remaining.filter((item) => item.disputeGameProxy && item.disputeGameProxy !== ZERO_ADDRESS);
    remaining
        .filter((item) => !item.disputeGameProxy || item.disputeGameProxy === ZERO_ADDRESS)
        .forEach((item) => {
            applyWithdrawalStatus(item.hash, { text: 'Could not read the dispute game for this proof — try Check Status again shortly.', badgeClass: 'error', badgeText: 'Error' });
        });
    if (withGame.length === 0) return;

    const phase4Calls = [];
    withGame.forEach((item) => phase4Calls.push({ target: OPTIMISM_PORTAL_ADDRESS, fn: 'disputeGameBlacklist', args: [item.disputeGameProxy] }));
    withGame.forEach((item) => {
        phase4Calls.push({ target: item.disputeGameProxy, fn: 'status', iface: gameIface });
        phase4Calls.push({ target: item.disputeGameProxy, fn: 'gameType', iface: gameIface });
        phase4Calls.push({ target: item.disputeGameProxy, fn: 'resolvedAt', iface: gameIface });
        phase4Calls.push({ target: item.disputeGameProxy, fn: 'wasRespectedGameTypeWhenCreated', iface: gameIface });
    });
    const phase4Results = await runMulticall(multicall, phase4Calls, portalIface);

    const gameBase = withGame.length;
    const now = BigInt(Math.floor(Date.now() / 1000));
    const stillNeedingGame = [];

    withGame.forEach((item, idx) => {
        item.blacklisted = phase4Results[idx].value;
        const off = gameBase + idx * 4;
        item.gameStatus = phase4Results[off].value;
        item.gameType = phase4Results[off + 1].value;
        item.resolvedAt = phase4Results[off + 2].value;
        item.wasRespected = phase4Results[off + 3].value;

        if (item.blacklisted) {
            applyWithdrawalStatus(item.hash, { text: 'The dispute game backing this proof was blacklisted — re-prove to get a valid game.', badgeClass: 'error', badgeText: 'Re-prove needed' });
            return;
        }
        // gameStatus/gameType are uint8/uint32 — ethers v5 decodes these as plain JS
        // numbers (not BigNumber, unlike uint64/uint256 elsewhere in this function),
        // and gameStatus === 0 ("in progress") is a legitimate value, not a missing
        // one, so check for null/undefined explicitly rather than truthiness.
        if (typeof item.gameType === 'number' && !item.wasRespected && item.gameType !== respectedGameType) {
            applyWithdrawalStatus(item.hash, { text: 'The dispute game type used for this proof is no longer respected — re-prove to get a valid game.', badgeClass: 'error', badgeText: 'Re-prove needed' });
            return;
        }
        if (item.gameStatus === 1) {
            applyWithdrawalStatus(item.hash, { text: 'Proven, but the dispute game resolved against this proof (challenger won) — re-prove.', badgeClass: 'error', badgeText: 'Re-prove needed' });
            return;
        }
        if (item.gameStatus === 0) {
            stillNeedingGame.push(item);
            return;
        }
        if (typeof item.gameStatus !== 'number') {
            applyWithdrawalStatus(item.hash, { text: 'Could not read the dispute game status for this proof — try Check Status again shortly.', badgeClass: 'error', badgeText: 'Error' });
            return;
        }

        // gameStatus === 2 (resolved in this proof's favor)
        const maturesAt = BigInt(item.provenTimestamp.toString()) + BigInt(proofMaturityDelay.toString());
        if (now < maturesAt) {
            applyWithdrawalStatus(item.hash, {
                text: `Proven and the dispute game resolved successfully, but the proof maturity delay hasn't elapsed yet. Ready to finalize in ~${formatDuration(maturesAt - now)}.`,
                badgeClass: 'pending', badgeText: 'Maturing'
            });
            return;
        }
        const finalizesAt = BigInt(item.resolvedAt.toString()) + BigInt(gameFinalityDelay.toString());
        if (now < finalizesAt) {
            applyWithdrawalStatus(item.hash, {
                text: `Proven and matured, but waiting on the dispute-game finality delay. Ready to finalize in ~${formatDuration(finalizesAt - now)}.`,
                badgeClass: 'pending', badgeText: 'Waiting'
            });
            return;
        }
        applyWithdrawalStatus(item.hash, { text: 'Ready to finalize!', badgeClass: 'ready', badgeText: 'Ready' });
    });

    if (stillNeedingGame.length === 0) return;

    // Phase 5: extra timing data, only for dispute games still in progress.
    const phase5Calls = [];
    stillNeedingGame.forEach((item) => {
        phase5Calls.push({ target: item.disputeGameProxy, fn: 'createdAt', iface: gameIface });
        phase5Calls.push({ target: item.disputeGameProxy, fn: 'FAST_FINALIZATION_DELAY', iface: gameIface });
        phase5Calls.push({ target: item.disputeGameProxy, fn: 'SLOW_FINALIZATION_DELAY', iface: gameIface });
        phase5Calls.push({ target: item.disputeGameProxy, fn: 'zkProver', iface: gameIface });
    });
    const phase5Results = await runMulticall(multicall, phase5Calls, portalIface);
    stillNeedingGame.forEach((item, idx) => {
        const off = idx * 4;
        const gameCreatedAt = phase5Results[off].value;
        const fastDelay = phase5Results[off + 1].value;
        const slowDelay = phase5Results[off + 2].value;
        const zkProver = phase5Results[off + 3].value;

        const hasZkProof = zkProver && zkProver.toLowerCase() !== ZERO_ADDRESS;
        const delay = hasZkProof ? fastDelay : slowDelay;
        const eta = BigInt(gameCreatedAt.toString()) + BigInt(delay.toString());
        const etaText = now < eta ? `~${formatDuration(eta - now)}` : 'any time now';
        applyWithdrawalStatus(item.hash, {
            text: `Proven, dispute game not resolved yet — ${hasZkProof ? 'fast path (ZK proof present)' : 'slow path (no ZK proof yet)'}. Estimated: ${etaText}.`,
            badgeClass: 'pending', badgeText: 'Proven, waiting'
        });
    });
}

/** Batch-refreshes the status of every currently tracked withdrawal at once. */
export async function refreshAllTrackedWithdrawalStatuses() {
    const hashes = loadTrackedWithdrawals().map((w) => w.hash);
    await batchCheckWithdrawalStatuses(hashes);
}

// ============================================================================
// WITHDRAWAL DISCOVERY — finds withdrawals the connected wallet initiated on Base,
// including ones started outside this dApp (bridge.base.org, Basescan, another
// tool, etc.), by scanning L2StandardBridge withdrawal-initiated events.
// ============================================================================

let scanState = null; // { address, nextToBlock, active }

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetries(fn, maxRetries = 4, baseDelay = 800) {
    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (attempt === maxRetries) break;
            await sleep(baseDelay * Math.pow(2, attempt));
        }
    }
    throw lastErr;
}

function addressFromTopic(topic) {
    return ethers.utils.getAddress('0x' + topic.slice(26));
}

function getSymbolForBaseToken(addr) {
    const lower = addr.toLowerCase();
    for (const sym of BRIDGE_TOKENS) {
        if (sym === 'ETH') continue;
        if ((tokenAddresses[sym] || '').toLowerCase() === lower) return sym;
    }
    return null;
}

// Decodes an ERC20BridgeInitiated or ETHBridgeInitiated log into
// { from, symbol, amountRaw, tokenAddress }. `symbol` is null when the token isn't
// one of the four this tab tracks (e.g. a withdrawal made elsewhere, for some other
// token entirely) — still discoverable and provable/finalizable, just not decoded
// into a friendly amount.
function decodeBridgeInitiatedLog(log) {
    const sig = log.topics[0];
    if (sig === SIG_ERC20_BRIDGE_INITIATED) {
        const localToken = addressFromTopic(log.topics[1]); // Base-side token
        const from = addressFromTopic(log.topics[3]);
        const [, amount] = ethers.utils.defaultAbiCoder.decode(['address', 'uint256', 'bytes'], log.data);
        return { from, symbol: getSymbolForBaseToken(localToken), amountRaw: amount, tokenAddress: localToken };
    }
    if (sig === SIG_ETH_BRIDGE_INITIATED) {
        const from = addressFromTopic(log.topics[1]);
        const [amount] = ethers.utils.defaultAbiCoder.decode(['uint256', 'bytes'], log.data);
        return { from, symbol: 'ETH', amountRaw: amount, tokenAddress: null };
    }
    return null;
}

async function fetchInitiatedLogsChunk(baseProvider, fromBlock, toBlock) {
    return withRetries(() => baseProvider.getLogs({
        address: L2_STANDARD_BRIDGE_ADDRESS,
        fromBlock,
        toBlock,
        topics: [[SIG_ERC20_BRIDGE_INITIATED, SIG_ETH_BRIDGE_INITIATED]]
    }));
}

function setFindButtonState({ label, disabled, visible } = {}) {
    const btn = document.getElementById('bridgeFindWithdrawalsBtn');
    if (!btn) return;
    if (label !== undefined) btn.textContent = label;
    if (disabled !== undefined) btn.disabled = disabled;
    if (visible !== undefined) btn.style.display = visible ? '' : 'none';
}

function setStopButtonVisible(visible) {
    const btn = document.getElementById('bridgeStopScanBtn');
    if (btn) btn.style.display = visible ? '' : 'none';
}

export function stopBridgeWithdrawalScan() {
    if (scanState) scanState.stopRequested = true;
}

function setScanProgress(text) {
    const el = document.getElementById('bridgeScanProgress');
    if (el) el.textContent = text;
}

/**
 * Scans the most recent Base blocks first (so hits show up quickly), walks back a
 * total of ~60 days, then stops. Calling this again (e.g. via the "Search Older"
 * button, which reuses this same function) resumes another ~60 days further back.
 */
export async function findMyBridgeWithdrawals() {
    const addr = userAddress || window.userAddress;
    if (!addr) {
        showErrorNotification('Connect your wallet', 'Connect your wallet first to search for your withdrawals.');
        return;
    }

    const baseProvider = getBaseReadProvider();

    if (!scanState || scanState.address.toLowerCase() !== addr.toLowerCase()) {
        const latest = await baseProvider.getBlockNumber();
        scanState = { address: addr, nextToBlock: latest, active: false, stopRequested: false };
    }
    if (scanState.active) return;
    scanState.active = true;
    scanState.stopRequested = false;
    setFindButtonState({ disabled: true });
    setStopButtonVisible(true);

    const startBlock = scanState.nextToBlock;
    const hardStop = Math.max(startBlock - SCAN_WINDOW_DAYS * BLOCKS_PER_DAY, 0);
    let cursor = startBlock;
    let stopped = false;
    const foundThisRound = [];

    try {
        while (cursor > hardStop) {
            if (scanState.stopRequested) {
                stopped = true;
                break;
            }
            const chunkTo = cursor;
            const chunkFrom = Math.max(chunkTo - SCAN_BLOCK_CHUNK + 1, hardStop);

            const daysBack = Math.round((startBlock - chunkFrom) / BLOCKS_PER_DAY);
            setScanProgress(`Scanning Base blocks ${chunkFrom.toLocaleString()}–${chunkTo.toLocaleString()} (~${daysBack} of ${SCAN_WINDOW_DAYS} days back)… found ${foundThisRound.length} so far.`);

            const logs = await fetchInitiatedLogsChunk(baseProvider, chunkFrom, chunkTo);
            let addedInChunk = false;
            for (const log of logs) {
                const decoded = decodeBridgeInitiatedLog(log);
                if (!decoded || decoded.from.toLowerCase() !== addr.toLowerCase()) continue;

                const isKnown = !!decoded.symbol;
                const entry = {
                    hash: log.transactionHash,
                    symbol: isKnown ? decoded.symbol : (decoded.tokenAddress ? getTokenNameFromAddress(decoded.tokenAddress) : 'ETH'),
                    amount: isKnown ? ethers.utils.formatUnits(decoded.amountRaw, getDecimals(decoded.symbol)) : null,
                    owner: addr,
                    timestamp: null,
                    source: 'search'
                };
                if (saveTrackedWithdrawal(entry)) {
                    foundThisRound.push(entry.hash);
                    addedInChunk = true;
                }
            }
            if (addedInChunk) renderTrackedWithdrawals();

            cursor = chunkFrom - 1;
            if (chunkFrom <= hardStop) break;
            await sleep(SCAN_REQUEST_DELAY_MS);
        }

        if (stopped) {
            scanState.nextToBlock = cursor;
            setScanProgress(
                foundThisRound.length > 0
                    ? `Search stopped. Found ${foundThisRound.length} withdrawal(s) so far.`
                    : 'Search stopped. No withdrawals found yet.'
            );
        } else {
            scanState.nextToBlock = hardStop;
            setScanProgress(
                foundThisRound.length > 0
                    ? `Found ${foundThisRound.length} withdrawal(s) in this ~${SCAN_WINDOW_DAYS}-day search.`
                    : `No withdrawals found in this ~${SCAN_WINDOW_DAYS}-day search.`
            );
        }
    } catch (err) {
        console.error('Error scanning for withdrawals:', err);
        setScanProgress(`Search stopped early: ${err.message || err}. You can try again, or paste the transaction hash manually above.`);
    } finally {
        scanState.active = false;
        scanState.stopRequested = false;
        setStopButtonVisible(false);
        const canGoOlder = scanState.nextToBlock > 0;
        setFindButtonState({
            label: canGoOlder ? `Search Older (+${SCAN_WINDOW_DAYS} more days)` : 'No older Base history to search',
            disabled: !canGoOlder,
            visible: true
        });
    }

    if (foundThisRound.length > 0) {
        await batchCheckWithdrawalStatuses(foundThisRound);
    }
}

// ============================================================================
// TAB INITIALIZATION
// ============================================================================

let lastBridgeTabAddress = null;

export function initBridgeTab() {
    const addr = userAddress || window.userAddress;
    if (addr && addr.toLowerCase() !== lastBridgeTabAddress) {
        lastBridgeTabAddress = addr.toLowerCase();
        scanState = null;
        setFindButtonState({ label: 'Find My Withdrawals', disabled: false, visible: true });
        setStopButtonVisible(false);
        setScanProgress('');
    }

    updateBridgeTokenIcon();
    renderTrackedWithdrawals();
    if (walletConnected || window.walletConnected) {
        refreshBridgeBalances();
    }
}

export default {
    getBridgeDirection,
    setBridgeDirection,
    flipBridgeDirection,
    updateBridgeTokenIcon,
    setMaxBridgeAmount,
    refreshBridgeBalances,
    executeBridge,
    trackBridgeWithdrawalByHash,
    removeBridgeWithdrawal,
    renderTrackedWithdrawals,
    checkBridgeWithdrawalStatus,
    proveBridgeWithdrawal,
    finalizeBridgeWithdrawal,
    batchCheckWithdrawalStatuses,
    refreshAllTrackedWithdrawalStatuses,
    findMyBridgeWithdrawals,
    stopBridgeWithdrawalScan,
    initBridgeTab
};
