/**
 * @module init
 * @description Application initialization and event listeners
 *
 * Handles:
 * - DApp initialization
 * - Event listener setup
 * - Tab management
 * - URL routing
 * - Farcaster Mini App SDK integration
 */

// Import all modules
import { initializeChart, fetchPriceData, pricesLoaded } from './charts.js';
import { checkWalletConnection, setupWalletListeners, connectWallet, disconnectWallet, suppressWalletEvents } from './wallet.js';
import {
    switchTab, switchTab2, switchTabForStats, switchMinerTab, showStatsPageDirect, updateLoadingStatus, showLoadingScreen, hideLoadingScreen,
    initNotificationWidget, updateTokenIcon, updateTokenIconETH, updateTokenSelection, updatePositionDropdown,
    displayWalletBalances, updatePositionInfoMAIN_UNSTAKING, initTokenIconListeners, initRichListEventListeners,
    showButtonToast, setButtonToastAnchor, filterTokenOptionsCreate
} from './ui.js';
import { initMiningCalcEventListeners } from './mining-calc.js';
import * as Settings from './settings.js';
import { mainRPCStarterForPositions, isLatestSearchComplete } from './data-loader.js';
import * as Staking from './staking.js';
import * as Positions from './positions.js';
import * as Swaps from './swaps.js';
import * as Convert from './convert.js';
import { renderContracts, displayNetworkStatus } from './contracts.js';
import { positionData, stakingPositionData, updatePositionInfo, updateTotalLiqIncrease, updateDecreasePositionInfo, updatePercentage, getIsInitialPositionLoad } from './positions.js';
import { updateStakingStats, populateStakingManagementData } from './staking.js';
import { startCountdown } from './countdown.js';
import { initializeMaxButtons } from './max-buttons.js';
// ============================================
// MAIN INITIALIZATION
// ============================================

/**
 * Initializes the B0x DApp
 * Main entry point called on page load
 * @async
 * @returns {Promise<void>}
 */
export async function initializeDApp() {
    console.log('🚀 Initializing B0x DApp...');
        showLoadingScreen();
        updateLoadingStatus('Connecting to blockchain...');

    try {
        // Initialize notification widget
        initNotificationWidget();
        console.log('✓ Notification widget initialized');

        // Load settings from localStorage
        await Settings.loadSettings();
        console.log('✓ Settings loaded');

        // Initialize data source links in settings page
        if (typeof Settings.initDataSourceLinks === 'function') {
            Settings.initDataSourceLinks();
        }

        // Check for existing wallet connection. Not awaited: on mobile
        // browsers without an injected wallet (the common case — regular
        // Safari/Chrome, no extension), this polls for window.ethereum for
        // up to 10s (see wallet.js checkWalletConnection) before giving up.
        // Awaiting it here froze the loading screen on "Connecting to
        // blockchain..." for that whole 10s on every mobile reload, while
        // desktop (wallet extension injects window.ethereum instantly)
        // skipped the poll and felt instant. Nothing below this point
        // depends on wallet connection having finished — it already
        // reconnects and loads its own data in the background.
        checkWalletConnection().catch(e => console.warn('Wallet connection check failed:', e));

        updateLoadingStatus('Loading smart contracts...');



        // Initialize chart (with error handling)
        try {
            await initializeChart(Settings.loadSettings, Settings.customDataSource, Settings.customBACKUPDataSource);
            console.log('✓ Chart initialized');
        } catch (chartError) {
            console.warn('Chart initialization failed:', chartError);
        }

        updateLoadingStatus('Fetching data...');

        // Initialize staking stats UI
        Staking.updateStakingStats();

        // Start position monitoring (delayed to allow page to render)
        setTimeout(async () => {
            try {
                await mainRPCStarterForPositions();
                console.log('✓ Position monitoring started');
            } catch (posError) {
                console.warn('Position monitoring failed:', posError);
            }
        }, 500);

        updateLoadingStatus('Initializing interface...');
        // Display network status
        await displayNetworkStatus();

        console.log('✅ DApp initialized successfully');

        // Quick wait for essential data (max 3 seconds), then show UI
        // Data will continue loading in background
        let quickWaitCount = 0;
        const maxQuickWait = 6; // 3 seconds max (6 * 500ms)

        while (!pricesLoaded && !isLatestSearchComplete() && quickWaitCount < maxQuickWait) {
            quickWaitCount++;
            updateLoadingStatus('Loading data...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // If we have either prices OR blockchain data, we're good to show UI
        if (pricesLoaded || isLatestSearchComplete()) {
            updateLoadingStatus('Ready!');
        } else {
            updateLoadingStatus('Loading... (data will appear shortly)');
        }

        await new Promise(resolve => setTimeout(resolve, 200));
        hideLoadingScreen();

        // Signal to Farcaster Mini App SDK that app is ready
        try {
            const { sdk } = await import('https://cdn.jsdelivr.net/npm/@farcaster/miniapp-sdk/+esm');
            console.log('Farcaster SDK loaded, calling ready()...');
            await sdk.actions.ready();
            console.log('✓ Farcaster Mini App SDK ready');
        } catch (farcasterError) {
            // Not running in Farcaster context - this is expected for regular web access
            console.log('Farcaster SDK not available (normal for web access)', farcasterError);
        }

        // Continue loading remaining data in background (non-blocking)
        if (!pricesLoaded || !isLatestSearchComplete()) {
            console.log('Continuing to load data in background...');
        }

    } catch (error) {
        console.error('❌ DApp initialization error:', error);
    }
}

// ============================================
// EVENT LISTENER SETUP
// ============================================

/**
 * Sets up all event listeners for the application
 * @returns {void}
 */
export function setupEventListeners() {
    console.log('Setting up event listeners...');

    // Wallet connection buttons
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            // TEMPORARY DIAGNOSTIC — confirms the click itself is reaching
            // our JS before connectWallet() (and any ethers/wallet code) runs
            // at all. Remove once the mobile connect issue is resolved.
            console.log('[diag] Connect Wallet button clicked');
            setButtonToastAnchor('connectBtn');
            showButtonToast('info', 'Click Registered', 'Button click reached the app JS. Starting connectWallet()...');

            await connectWallet();
        });
    }

    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
            disconnectWallet();
        });
    }

    // Swap button
    const swapBtn = document.getElementById('swapBtn');
    if (swapBtn) {
        swapBtn.addEventListener('click', async () => {
            await Swaps.getSwapOfTwoTokens();
        });
    }

    // Get estimate button
    const estimateBtn = document.getElementById('getEstimateBtn');
    if (estimateBtn) {
        estimateBtn.addEventListener('click', async () => {
            await Swaps.getEstimate();
        });
    }

    // Convert section event listeners
    const convertInput = document.querySelector('#convert .form-group:nth-child(5) input');
    if (convertInput) {
        convertInput.addEventListener('input', async () => {
            await Convert.getConvertTotal(false);
        });
    }

    const convertFromSelect = document.querySelector('#convert .form-group:nth-child(4) select');
    if (convertFromSelect) {
        convertFromSelect.addEventListener('change', async () => {
            await Convert.getConvertTotal(false);
        });
    }

    const convertToSelect = document.querySelector('#convert .form-group:nth-child(7) select');
    if (convertToSelect) {
        convertToSelect.addEventListener('change', async () => {
            await Convert.getConvertTotal(false);
        });
    }

    // Position management buttons
    const increaseLiqBtn = document.getElementById('increaseLiquidityBtn');
    if (increaseLiqBtn) {
        increaseLiqBtn.addEventListener('click', async () => {
            await Positions.increaseLiquidity();
        });
    }

    const decreaseLiqBtn = document.getElementById('decreaseLiquidityBtn');
    if (decreaseLiqBtn) {
        decreaseLiqBtn.addEventListener('click', async () => {
            await Positions.decreaseLiquidity();
        });
    }

    // Staking buttons
    const depositNFTBtn = document.getElementById('depositNFTStakeBtn');
    if (depositNFTBtn) {
        depositNFTBtn.addEventListener('click', async () => {
            await Staking.depositNFTStake();
        });
    }

    // Note: Collect Rewards button is wired via inline onclick="collectRewards()"
    // in index.html, not here — an addEventListener('click') on this id would
    // now double-fire alongside it, since the button previously had no id
    // (this listener attachment was silently a no-op) but now does.

    // Load More Blocks button (stats page pagination)
    const loadMoreBlocksBtn = document.getElementById('blocks-load-more-btn');
    if (loadMoreBlocksBtn) {
        loadMoreBlocksBtn.addEventListener('click', () => {
            if (typeof window.loadMoreBlocks === 'function') {
                window.loadMoreBlocks();
            }
        });
    }

    console.log('✓ Event listeners set up');
}

// ============================================
// TAB MANAGEMENT
// ============================================

// Valid tab names for URL-based tab switching
const validTabs = [
    'swap',
    'create',
    'increase',
    'decrease',
    'staking-main-page',
    'staking',
    'stake-increase',
    'stake-decrease',
    'convert',
    'settings',
    'staking-management',
    'testnet-faucet',
    'contract-info',
    'stats',
    'socials',
    'stats-graphs',
    'staking-rich-list',
    'stats-mining-calc',
    'stats-home',
    'stats-staking-rich-list',
    'whitepaper',
    'side-pools',
    'stats-rich-list',
    'rich-list',
    'stats-guess-staking-rich-list',
    'guess-staking-rich-list',
    'miner',
    'miner-solo',
    'miner-pool',
    'miner-fpga',
    'Timelock',
    'bridge'
];

// Stats sub-tabs that require switchTabForStats() first
const statsSubTabs = [
    'staking-rich-list',
    'stats-graphs',
    'stats-home',
    'stats-mining-calc',
    'stats-staking-rich-list',
    'stats-rich-list',
    'stats-guess-staking-rich-list'
];

// Stats sub-tabs that need full stats data (difficulty, hashrate, etc.)
const needsStatsData = ['stats', 'stats-home', 'stats-mining-calc'];

/**
 * Helper function to handle tab switching with proper stats handling
 * @param {string} tabName - Tab name to switch to
 */
async function handleTabSwitch(tabName) {
    // Handle tab name aliases
    if (tabName === 'staking-rich-list') {
        tabName = 'stats-staking-rich-list';
    }
    if (tabName === 'rich-list') {
        tabName = 'stats-rich-list';
    }
    if (tabName === 'guess-staking-rich-list') {
        tabName = 'stats-guess-staking-rich-list';
    }
    if (tabName === 'staking') {
        tabName = 'staking-main-page';
    }

    // Handle miner sub-tabs (e.g. ?miner-pool, ?miner-fpga)
    if (tabName === 'miner-solo' || tabName === 'miner-pool' || tabName === 'miner-fpga') {
        const minerSubTab = tabName.replace('miner-', '');
        switchTab('miner');
        switchMinerTab(minerSubTab);
        return;
    }

    // Check if this is a stats sub-tab
    if (statsSubTabs.includes(tabName)) {
        console.log("Switching to stats sub-tab:", tabName);

        // Only load full stats data for tabs that need it
        if (needsStatsData.includes(tabName)) {
            // Use showStatsPageDirect to show target tab immediately, then load data
            // This avoids jitter from showing stats-home first
            await showStatsPageDirect(tabName);
        } else {
            // Just show stats page without waiting for mining data
            switchTabForStats();
            switchTab2(tabName);
        }
    } else {
        console.log("Switching to tab:", tabName);

        // Apply ?dir=/&asset= to the bridge state BEFORE switchTab() runs, so
        // that when switchTab's initBridgeTab() writes the URL it already has
        // the right direction/asset instead of the pre-deep-link defaults.
        if (tabName === 'bridge') {
            applyBridgeDeepLinkParams();
        }

        switchTab(tabName);
    }
}

/**
 * Applies ?dir= and ?asset= query params to the Bridge tab (e.g.
 * ?bridge&dir=toEthereum&asset=B0x) so a direction + asset combo can be
 * bookmarked or shared as a link.
 * @returns {void}
 */
function applyBridgeDeepLinkParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const dir = urlParams.get('dir');
    const asset = urlParams.get('asset');

    if ((dir === 'toBase' || dir === 'toEthereum') && typeof window.setBridgeDirection === 'function') {
        console.log('Applying bridge direction from URL:', dir);
        window.setBridgeDirection(dir);
    }

    if (asset) {
        const tokenSelect = document.getElementById('bridgeToken');
        const hasOption = tokenSelect && Array.from(tokenSelect.options).some(opt => opt.value === asset);
        if (hasOption) {
            console.log('Applying bridge asset from URL:', asset);
            tokenSelect.value = asset;
            if (typeof window.updateBridgeTokenIcon === 'function') {
                window.updateBridgeTokenIcon();
            }
        } else {
            console.warn(`Invalid bridge asset parameter: ${asset}`);
        }
    }
}

/**
 * Initializes tab from URL parameter (e.g., ?tab=convert)
 * @returns {Promise<void>}
 */
export async function initializeTabFromURL() {
    console.log("Checking for tab URL parameter...");
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');

    if (tabParam) {
        console.log('Found tab parameter:', tabParam);

        if (validTabs.includes(tabParam)) {
            await handleTabSwitch(tabParam);
        } else {
            console.warn(`Invalid tab parameter: ${tabParam}`);
            // Default to swap tab
            switchTab('swap');
        }
    }
}

/**
 * Initializes tab from direct parameter (e.g., ?stats-mining-calc)
 * @returns {Promise<void>}
 */
export async function initializeTabFromDirectParam() {
    const urlParams = new URLSearchParams(window.location.search);

    // Check if any of the valid tab names exist as parameters
    for (const tab of validTabs) {
        if (urlParams.has(tab)) {
            console.log('Found direct tab parameter:', tab);
            await handleTabSwitch(tab);
            return; // Exit after first match to prevent multiple tab switches
        }
    }
}

/**
 * Updates URL with current tab
 * @param {string} tabName - Tab name
 * @returns {void}
 */
export function updateURL(tabName) {
    if (!tabName) return;

    const url = new URL(window.location);
    // Clear all existing tab-related params
    url.search = '';
    // Set the tab as a direct parameter (e.g., ?stats-mining-calc)
    url.searchParams.set(tabName, '');
    // Remove the = sign for cleaner URLs
    const cleanUrl = url.toString().replace('=&', '&').replace(/=$/, '');
    window.history.pushState({}, '', cleanUrl);
}

/**
 * Sets responsive padding
 * @returns {void}
 */
export function setPadding() {
    // Responsive layout adjustments
    const mainContent = document.querySelector('.main-content');
    if (mainContent && window.innerWidth < 768) {
        mainContent.style.paddingTop = '60px';
    }
}

// ============================================
// DOM LISTENERS SETUP
// ============================================

/**
 * Sets up all DOM event listeners for position management, sliders, and input fields
 * Includes debounced input handlers for create, increase, and stake-increase sections
 * @returns {void}
 */
export function setupDOMListeners() {
    console.log('Setting up DOM listeners for positions and inputs...');

    // ========================================
    // POSITION SELECTORS
    // ========================================

    // Regular position increase selector
    const positionSelect = document.querySelector('#increase select');
    if (positionSelect) {
        // Only clear and populate if we have data OR initial load is complete
        if (Object.keys(positionData).length > 0 || !getIsInitialPositionLoad()) {
            positionSelect.innerHTML = '';
            Object.values(positionData).forEach(position => {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = `${position.pool} #${position.id.split('_')[1]} - ${position.feeTier} Position`;
                positionSelect.appendChild(option);
            });
        }

        positionSelect.addEventListener('change', updatePositionInfo);
        positionSelect.addEventListener('change', updateTotalLiqIncrease);
        updatePositionInfo();
    }

    // Regular position decrease selector
    const decreasePositionSelect = document.querySelector('#decrease select');
    if (decreasePositionSelect) {
        // Only clear and populate if we have data OR initial load is complete
        if (Object.keys(positionData).length > 0 || !getIsInitialPositionLoad()) {
            decreasePositionSelect.innerHTML = '';
            Object.values(positionData).forEach(position => {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = `${position.pool} #${position.id.split('_')[1]} - ${position.feeTier} Position`;
                decreasePositionSelect.appendChild(option);
            });
        }

        decreasePositionSelect.addEventListener('change', updateDecreasePositionInfo);
        updateDecreasePositionInfo();
    }

    // Staking main page withdraw NFT selector
    // Sorted by lowest withdrawal penalty first to guide users to withdraw from positions with lowest penalty
    const positionSelectMainPageWithdrawNFT = document.querySelector('#staking-main-page .form-group2 select');
    if (positionSelectMainPageWithdrawNFT) {
        // Only clear and populate if we have data OR initial load is complete
        if (Object.keys(stakingPositionData).length > 0 || !getIsInitialPositionLoad()) {
            positionSelectMainPageWithdrawNFT.innerHTML = '';
            Object.values(stakingPositionData).sort((a, b) => {
                const penaltyA = parseFloat(a.PenaltyForWithdraw.replace('%', ''));
                const penaltyB = parseFloat(b.PenaltyForWithdraw.replace('%', ''));
                return penaltyA - penaltyB; // Lowest penalty first
            }).forEach(position => {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = `${position.pool} #${position.id.split('_')[2]} Staked - ${position.feeTier} Position`;
                positionSelectMainPageWithdrawNFT.appendChild(option);
            });
        }

        positionSelectMainPageWithdrawNFT.addEventListener('change', updatePositionInfoMAIN_UNSTAKING);
        updatePositionInfoMAIN_UNSTAKING();
    }

    // Stake increase position selector
    // Sorted by highest withdrawal penalty first to guide users to reset penalties on positions with highest penalty
    const stakePositionSelect = document.querySelector('#stake-increase select');
    if (stakePositionSelect) {
        // Only clear and populate if we have data OR initial load is complete
        if (Object.keys(stakingPositionData).length > 0 || !getIsInitialPositionLoad()) {
            stakePositionSelect.innerHTML = '';
            Object.values(stakingPositionData).sort((a, b) => {
                const penaltyA = parseFloat(a.PenaltyForWithdraw.replace('%', ''));
                const penaltyB = parseFloat(b.PenaltyForWithdraw.replace('%', ''));
                return penaltyB - penaltyA; // Highest penalty first
            }).forEach(position => {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = `${position.pool} #${position.id.split('_')[2]} Staked - ${position.feeTier} Position`;
                stakePositionSelect.appendChild(option);
            });
        }

        if (typeof window.updateStakePositionInfo === 'function') {
            stakePositionSelect.addEventListener('change', window.updateStakePositionInfo);
            window.updateStakePositionInfo();
        }
    }

    // Stake decrease position selector
    // Sorted by lowest withdrawal penalty first to guide users to decrease from positions with lowest penalty
    const stakeDecreasePositionSelect = document.querySelector('#stake-decrease select');
    if (stakeDecreasePositionSelect) {
        // Only clear and populate if we have data OR initial load is complete
        if (Object.keys(stakingPositionData).length > 0 || !getIsInitialPositionLoad()) {
            stakeDecreasePositionSelect.innerHTML = '';
            Object.values(stakingPositionData).sort((a, b) => {
                const penaltyA = parseFloat(a.PenaltyForWithdraw.replace('%', ''));
                const penaltyB = parseFloat(b.PenaltyForWithdraw.replace('%', ''));
                return penaltyA - penaltyB; // Lowest penalty first
            }).forEach(position => {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = `${position.pool} #${position.id.split('_')[2]} Staked - ${position.feeTier} Position`;
                stakeDecreasePositionSelect.appendChild(option);
            });
        }

        if (typeof window.updateStakeDecreasePositionInfo === 'function') {
            stakeDecreasePositionSelect.addEventListener('change', window.updateStakeDecreasePositionInfo);
            window.updateStakeDecreasePositionInfo();
        }
    }

    // ========================================
    // SLIDERS
    // ========================================

    // Decrease section slider
    const decreaseSlider = document.querySelector('#decrease .slider');
    if (decreaseSlider) {
        decreaseSlider.addEventListener('input', function () {
            updatePercentage(this.value);
        });
        decreaseSlider.addEventListener('change', function () {
            updatePercentage(this.value);
        });
        decreaseSlider.addEventListener('mouseup', function () {
            updatePercentage(this.value);
        });
    }

    // Stake decrease slider
    const stakeDecreaseSlider = document.querySelector('#stake-decrease .slider');
    if (stakeDecreaseSlider) {
        if (typeof window.updateStakePercentage === 'function') {
            stakeDecreaseSlider.addEventListener('input', function () {
                window.updateStakePercentage(this.value);
            });
            stakeDecreaseSlider.addEventListener('change', function () {
                window.updateStakePercentage(this.value);
            });
            stakeDecreaseSlider.addEventListener('mouseup', function () {
                window.updateStakePercentage(this.value);
            });
        }
    }

    // ========================================
    // INPUT EVENT LISTENERS (REGULAR INCREASE)
    // ========================================

    const ethInput = document.querySelector('#increase .form-row .form-group:first-child input');
    const usdcInput = document.querySelector('#increase .form-row .form-group:last-child input');

    if (ethInput) {
        ethInput.addEventListener('input', updateTotalLiqIncrease);
        updateTotalLiqIncrease();
    }

    if (usdcInput) {
        usdcInput.addEventListener('input', updateTotalLiqIncrease);
    }

    // ========================================
    // STAKE INCREASE INPUT EVENT LISTENERS
    // ========================================

    const ethInput2 = document.querySelector('#stake-increase .form-row .form-group:first-child input');
    const usdcInput2 = document.querySelector('#stake-increase .form-row .form-group:last-child input');

    if (ethInput2 && typeof window.updateTotalLiqIncreaseSTAKING === 'function') {
        ethInput2.addEventListener('input', window.updateTotalLiqIncreaseSTAKING);
        window.updateTotalLiqIncreaseSTAKING();
    }

    if (usdcInput2 && typeof window.updateTotalLiqIncreaseSTAKING === 'function') {
        usdcInput2.addEventListener('input', window.updateTotalLiqIncreaseSTAKING);
    }

    // ========================================
    // DEBOUNCED INPUT LISTENERS - CREATE SECTION
    // ========================================

    const createSection = document.getElementById('create');
    if (createSection) {
        const numberInputs = createSection.querySelectorAll('input[type="number"]');
        const amountAInput = numberInputs[0]; // First input (Amount A)
        const amountBInput = numberInputs[1]; // Second input (Amount B)

        let isUpdating = false;
        let debounceTimerA;
        let debounceTimerB;

        if (amountAInput) {
            amountAInput.addEventListener('input', function () {
                if (isUpdating) return; // Prevent circular updates

                console.log('Create section - Amount A typing:', this.value);

                // Clear previous timer
                clearTimeout(debounceTimerA);

                // Set new timer - only call function after user stops typing for 1200ms
                debounceTimerA = setTimeout(() => {
                    console.log('Create section - Amount A final value:', this.value);
                    isUpdating = true;

                    if (typeof window.getRatioCreatePositiontokenA === 'function') {
                        window.getRatioCreatePositiontokenA();
                    } else {
                        console.log('getRatioCreatePositiontokenA function not available');
                    }

                    // Reset the updating flag after processing
                    setTimeout(() => {
                        isUpdating = false;
                    }, 50);
                }, 1200);
            });
        }

        if (amountBInput) {
            amountBInput.addEventListener('input', function () {
                if (isUpdating) return; // Prevent circular updates

                console.log('Create section - Amount B typing:', this.value);

                // Clear previous timer
                clearTimeout(debounceTimerB);

                // Set new timer - only call function after user stops typing for 1200ms
                debounceTimerB = setTimeout(() => {
                    console.log('Create section - Amount B final value:', this.value);
                    isUpdating = true;

                    if (typeof window.getRatioCreatePositiontokenB === 'function') {
                        window.getRatioCreatePositiontokenB();
                    } else {
                        console.log('getRatioCreatePositiontokenB function not available');
                    }

                    // Reset the updating flag after processing
                    setTimeout(() => {
                        isUpdating = false;
                    }, 50);
                }, 1200);
            });
        }
    }

    // ========================================
    // DEBOUNCED INPUT LISTENERS - INCREASE SECTION
    // ========================================

    let isProgrammaticUpdate = false;
    let isProgrammaticUpdateB = false;

    const increase = document.getElementById('increase');
    if (increase) {
        const numberInputs = increase.querySelectorAll('input[type="number"]');
        const amountAInput = numberInputs[0]; // First input (Amount A)
        const amountBInput = numberInputs[1]; // Second input (Amount B)

        let isUpdating = false;
        let debounceTimerA;
        let debounceTimerB;

        if (amountAInput) {
            amountAInput.addEventListener('input', function () {
                if (isUpdating) return; // Prevent circular updates
                if (isProgrammaticUpdate || isProgrammaticUpdateB) return;

                console.log('Increase section - Amount A typing:', this.value);

                // Clear previous timer
                clearTimeout(debounceTimerA);

                // Set new timer - only call function after user stops typing for 1001ms
                debounceTimerA = setTimeout(() => {
                    console.log('Increase section - Amount A final value:', this.value);
                    isUpdating = true;

                    if (typeof window.getRatioIncreasePositiontokenA === 'function') {
                        window.getRatioIncreasePositiontokenA();
                    } else {
                        console.log('getRatioIncreasePositiontokenA function not available');
                    }

                    // Reset the updating flag after processing
                    setTimeout(() => {
                        isUpdating = false;
                    }, 50);
                }, 1001);
            });
        }

        if (amountBInput) {
            amountBInput.addEventListener('input', function () {
                if (isUpdating) return; // Prevent circular updates
                if (isProgrammaticUpdate || isProgrammaticUpdateB) return;

                console.log('Increase section - Amount B typing:', this.value);

                // Clear previous timer
                clearTimeout(debounceTimerB);

                // Set new timer - only call function after user stops typing for 1001ms
                debounceTimerB = setTimeout(() => {
                    console.log('Increase section - Amount B final value:', this.value);
                    isUpdating = true;

                    if (typeof window.getRatioIncreasePositiontokenB === 'function') {
                        window.getRatioIncreasePositiontokenB();
                    } else {
                        console.log('getRatioIncreasePositiontokenB function not available');
                    }

                    // Reset the updating flag after processing
                    setTimeout(() => {
                        isUpdating = false;
                    }, 50);
                }, 1001);
            });
        }
    }

    // ========================================
    // DEBOUNCED INPUT LISTENERS - STAKE INCREASE SECTION
    // ========================================

    let isProgrammaticUpdateC = false;
    let isProgrammaticUpdateD = false;

    const increaseStaking = document.getElementById('stake-increase');
    if (increaseStaking) {
        const numberInputs = increaseStaking.querySelectorAll('input[type="number"]');
        const amountAInput = numberInputs[0]; // First input (Amount A)
        const amountBInput = numberInputs[1]; // Second input (Amount B)

        let isUpdating = false;
        let debounceTimerC;
        let debounceTimerD;

        if (amountAInput) {
            amountAInput.addEventListener('input', function () {
                if (isUpdating) return; // Prevent circular updates
                if (isProgrammaticUpdateC || isProgrammaticUpdateD) return;

                console.log('Stake-increase section - Amount A typing:', this.value);

                // Clear previous timer
                clearTimeout(debounceTimerC);

                // Set new timer - only call function after user stops typing for 1001ms
                debounceTimerC = setTimeout(() => {
                    console.log('Stake-increase section - Amount A final value:', this.value);
                    isUpdating = true;

                    if (typeof window.getRatioStakeIncreasePositiontokenA === 'function') {
                        window.getRatioStakeIncreasePositiontokenA();
                    } else {
                        console.log('getRatioStakeIncreasePositiontokenA function not available');
                    }

                    // Reset the updating flag after processing
                    setTimeout(() => {
                        isUpdating = false;
                    }, 50);
                }, 1001);
            });
        }

        if (amountBInput) {
            amountBInput.addEventListener('input', function () {
                if (isUpdating) return; // Prevent circular updates
                if (isProgrammaticUpdateC || isProgrammaticUpdateD) return;

                console.log('Stake-increase section - Amount B typing:', this.value);

                // Clear previous timer
                clearTimeout(debounceTimerD);

                // Set new timer - only call function after user stops typing for 1001ms
                debounceTimerD = setTimeout(() => {
                    console.log('Stake-increase section - Amount B final value:', this.value);
                    isUpdating = true;

                    if (typeof window.getRatioStakeIncreasePositiontokenB === 'function') {
                        window.getRatioStakeIncreasePositiontokenB();
                    } else {
                        console.log('getRatioStakeIncreasePositiontokenB function not available');
                    }

                    // Reset the updating flag after processing
                    setTimeout(() => {
                        isUpdating = false;
                    }, 50);
                }, 1001);
            });
        }
    }

    // ========================================
    // ADDITIONAL INITIALIZATIONS
    // ========================================

    // Update position dropdown
    updatePositionDropdown();

    // Populate staking management data
    populateStakingManagementData();

    // Display wallet balances
    displayWalletBalances();

    // Load settings (if needed)
    if (typeof window.loadSettings === 'function') {
        window.loadSettings();
    }

    // Filter token options for create
    if (typeof window.filterTokenOptionsCreate === 'function') {
        window.filterTokenOptionsCreate();
    }

    // Setup user selection tracking
    if (typeof window.setupUserSelectionTracking === 'function') {
        window.setupUserSelectionTracking();
    }

    // Update token icons and selections
    updateTokenIcon('toToken22', 'toTokenIcon11');
    updateTokenIcon('fromToken22', 'fromTokenIcon22');
    updateTokenSelection('tokenB', 'tokenBIcon');
    updateTokenSelection('tokenA', 'tokenAIcon');
    // Convert page icons default to the wrong token in the raw HTML
    // (mismatched from the <select>'s actual default value) — sync them to
    // the real selection on load, same as the other pages above.
    updateTokenIconETH('fromToken', 'fromTokenIcon');
    updateTokenIconETH('toToken', 'toTokenIcon');

    // Swap tokens convert
    if (typeof window.swapTokensConvert === 'function') {
        window.swapTokensConvert();
        window.swapTokensConvert();
    }

    console.log('✓ DOM listeners setup complete');
}

// ============================================
// DOM CONTENT LOADED
// ============================================

/**
 * Main event handler for DOMContentLoaded
 * Sets up the entire application
 */
document.addEventListener('DOMContentLoaded', async function () {
    console.log('DOM Content Loaded - Starting initialization...');

    // Set up event listeners (Connect Wallet, swap, etc.), DOM listeners
    // (icon sync, sliders), token icon listeners, and the countdown timer
    // FIRST, before the async initializeDApp() chain below. None of these
    // need anything initializeDApp() loads — they're pure DOM/UI setup —
    // and initializeDApp() includes several sequential network calls (chart
    // data, a remote Farcaster SDK import with no timeout, etc.) that can
    // take a while, especially on mobile. Gating UI setup behind that whole
    // chain is why the countdown used to visibly start late, and why token
    // icons could sit unsynced for several seconds after page load.
    //
    // setupDOMListeners() itself is NOT called here (only later, at its
    // original spot below) — it has ~20 addEventListener calls with no
    // dedup guard, and its position-selector population intentionally needs
    // to re-run once wallet/position data has loaded. Calling it twice would
    // double-register those listeners. The icon syncing below duplicates
    // just its icon-sync lines, which are plain function calls (idempotent,
    // safe to run twice) rather than listener registrations.
    setupEventListeners();
    // Token A and Token B on Create Position both natively default to the
    // same option (0xBTC) in the raw HTML — filter first so Token B gets
    // auto-switched to the next available option (B0x) before syncing
    // icons, same order setupDOMListeners() below uses.
    filterTokenOptionsCreate();
    updateTokenIcon('toToken22', 'toTokenIcon11');
    updateTokenIcon('fromToken22', 'fromTokenIcon22');
    updateTokenSelection('tokenB', 'tokenBIcon');
    updateTokenSelection('tokenA', 'tokenAIcon');
    updateTokenIconETH('fromToken', 'fromTokenIcon');
    updateTokenIconETH('toToken', 'toTokenIcon');
    initTokenIconListeners();
    // Pure DOM manipulation (creates the button, wires its click handler) —
    // the handler only reads wallet/position state later, at click time, not
    // here. Internally guarded against double-adding to the same input, so
    // it's safe regardless. Was previously gated behind the full
    // initializeDApp() chain, which is why Create/Stake Increase — tabs a
    // user might switch to quickly — could appear to be missing MAX buttons
    // if that chain hadn't finished yet.
    initializeMaxButtons();
    startCountdown();

    // Initialize the DApp
    await initializeDApp();

    // Setup wallet listeners
    await setupWalletListeners();

    // Initialize tab from URL or default to swap
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlTab = urlParams.get('tab') || validTabs.some(tab => urlParams.has(tab));

    if (hasUrlTab) {
        await initializeTabFromURL();
        await initializeTabFromDirectParam();
    } else {
        // No URL parameter, default to swap
        switchTab('swap');
    }

    // Render contracts display
    renderContracts();

    // Setup DOM listeners (positions, inputs, sliders) — re-run now that
    // wallet/position data has had a chance to load (its position-selector
    // population depends on that). initTokenIconListeners() is NOT called
    // again here — it was already registered in the early setup above and
    // has no data dependency, so calling it again would double-register
    // those change listeners.
    setupDOMListeners();

    // Initialize rich list event listeners (sorting, paging, search)
    initRichListEventListeners();

    // Initialize mining calculator event listeners
    initMiningCalcEventListeners();

    // Set responsive padding
    setPadding();
    window.addEventListener('resize', setPadding);

    console.log('✅ Application fully initialized and ready');
});

// ============================================
// WINDOW EVENT LISTENERS
// ============================================

// Track if window-level listeners are set up
let windowListenersSetup = false;

// Listen for network changes (if MetaMask is available)
// Only set up listeners if user has previously connected their wallet to this dApp
// This prevents Rabby's "blocked from automatically opening external application" warning
if (window.ethereum && !windowListenersSetup && localStorage.getItem('walletConnected')) {
    window.ethereum.on('chainChanged', (chainId) => {
        console.log('Chain changed to:', chainId);
        // Our own connectWallet() calls can fire this event itself (e.g.
        // switching to Base) — ignore it while that's already in progress.
        if (suppressWalletEvents) {
            console.log('Suppressing chainChanged — own connect flow in progress');
            return;
        }
        // Don't make requests if page is hidden (prevents warning when closing Rabby browser)
        if (window.isPageVisible === false) {
            console.log('Page hidden, skipping network status update');
            return;
        }
        // Only update network status if user has connected their wallet to this dApp
        if (!localStorage.getItem('walletConnected')) {
            console.log('Wallet not connected to dApp, skipping network status update');
            return;
        }
        // Also check if wallet provider is still connected
        if (typeof window.ethereum.isConnected === 'function' && !window.ethereum.isConnected()) {
            console.log('Wallet provider disconnected, skipping network status update');
            return;
        }
        displayNetworkStatus();
        // Optionally reload the page
        // window.location.reload();
    });

    windowListenersSetup = true;
    console.log('✓ Window-level Ethereum listeners set up');
}

// Note: accountsChanged is handled in wallet.js setupWalletListeners to avoid duplicates

// Track page visibility to prevent ethereum requests when page is hidden
// This prevents the "external application" warning when closing Rabby's browser
window.isPageVisible = true;
document.addEventListener('visibilitychange', () => {
    window.isPageVisible = !document.hidden;
    if (document.hidden) {
        console.log('Page hidden - pausing ethereum requests');
    } else {
        console.log('Page visible - resuming ethereum requests');
    }
});

console.log('Init module loaded');
