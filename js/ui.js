/**
 * UI Module - Pure UI functions for DOM manipulation and user interactions
 *
 * This module contains all UI-related functions extracted from script.js
 * Focuses on pure UI operations - rendering, display updates, formatting, etc.
 */

// Import dependencies
import { TOKEN_ORDER, TOKEN_ORDERETH } from './utils.js';
import { tokenIconsBase, tokenIconsETH, ProofOfWorkAddresss, tokenAddresses, contractAddress_Swapper, hookAddress } from './config.js';
import { positionData, stakingPositionData } from './positions.js';
import {functionCallCounter, incrementFunctionCallCounter, hasUserMadeSelection, customRPC, customDataSource, customBACKUPDataSource} from './settings.js'
import {firstRewardsAPYRun, totalLiquidityInStakingContract} from './staking.js';
import {
    setCurrentDifficulty, setNextDifficulty, setRewardPerSolve,
    setBlocksToGo, setAvgRewardTime, calculateMining
} from './mining-calc.js';
// =============================================================================
// NOTIFICATION WIDGET CLASS
// =============================================================================

const _BLOCK_EXPLORER_ADDRESS_URL = 'https://basescan.org/address/';
/**
 * Mobile-optimized notification widget for displaying toast messages
 */
class MobileNotificationWidget {
    constructor(position = 'bottom-right') {
        this.container = document.getElementById('notificationContainer');
        this.notifications = new Map();
        this.recentNotifications = new Map(); // Track recent notifications to prevent duplicates
        this.counter = 0;
        this.position = position;
        this.dedupeWindow = 1000; // 1 second deduplication window
        this.setPosition(position);
    }

    setPosition(position) {
        this.position = position;
        if (this.container) {
            this.container.className = `notification-container ${position}`;
        }
    }

    positionInContainer(containerSelector) {
        const targetContainer = document.querySelector(containerSelector);
        if (targetContainer && this.container) {
            targetContainer.style.position = 'relative';
            targetContainer.appendChild(this.container);
            this.container.style.position = 'absolute';
            this.container.style.bottom = '20px';
            this.container.style.right = '20px';
        }
    }

    resetToViewport() {
        if (this.container) {
            document.body.appendChild(this.container);
            this.container.style.position = 'fixed';
        }
    }

    show(type = 'info', title = '', message = '', duration = 10000) {
        if (!this.container) return null;

        // Deduplication: check if same notification was shown recently
        const notificationKey = `${type}:${title}:${message}`;
        const now = Date.now();
        const lastShown = this.recentNotifications.get(notificationKey);

        if (lastShown && (now - lastShown) < this.dedupeWindow) {
            console.log('Duplicate notification suppressed:', title);
            return null; // Skip duplicate
        }

        // Track this notification
        this.recentNotifications.set(notificationKey, now);

        // Clean up old entries (older than 5 seconds)
        for (const [key, timestamp] of this.recentNotifications) {
            if (now - timestamp > 5000) {
                this.recentNotifications.delete(key);
            }
        }

        const id = ++this.counter;
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('data-id', id);

        const icons = {
            success: '✓',
            error: '✕',
            warning: '!',
            info: 'i'
        };

        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => this.hide(id);

        notification.innerHTML = `
            <div class="notification-icon">${icons[type] || icons.info}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                ${message ? `<div class="notification-message">${message}</div>` : ''}
            </div>
            <div class="notification-progress"></div>
        `;

        // Insert close button before progress bar
        notification.insertBefore(closeBtn, notification.lastElementChild);

        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        setTimeout(() => {
            this.hide(id);
        }, duration);

        return id;
    }

    hide(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 400);
        }
    }

    success(title, message = '') {
        this.setPosition('bottom-right'); // Ensure bottom-right for regular notifications
        return this.show('success', title, message);
    }

    error(title, message = '') {
        this.setPosition('bottom-right'); // Ensure bottom-right for regular notifications
        return this.show('error', title, message);
    }

    warning(title, message = '') {
        this.setPosition('bottom-right'); // Ensure bottom-right for regular notifications
        return this.show('warning', title, message);
    }

    info(title, message = '') {
        this.setPosition('bottom-right'); // Ensure bottom-right for regular notifications
        return this.show('info', title, message);
    }

    // Show notification at middle-right of viewport (for mid-page buttons like deposit NFT)
    showCentered(type, title, message = '', duration = 10000) {
        this.setPosition('center');
        return this.show(type, title, message, duration);
    }

    errorCentered(title, message = '') {
        return this.showCentered('error', title, message);
    }

    successCentered(title, message = '') {
        return this.showCentered('success', title, message);
    }

    infoCentered(title, message = '') {
        return this.showCentered('info', title, message);
    }
}

// Initialize the notification widget (will be initialized after DOM is ready)
let notificationWidget = null;

/**
 * Initialize notification widget after DOM is loaded
 */
export function initNotificationWidget() {
    if (!notificationWidget) {
        notificationWidget = new MobileNotificationWidget('bottom-right');
    }
    return notificationWidget;
}

/**
 * Get or initialize the notification widget
 */
function getNotificationWidget() {
    if (!notificationWidget) {
        notificationWidget = initNotificationWidget();
    }
    return notificationWidget;
}

// =============================================================================
// NOTIFICATION FUNCTIONS
// =============================================================================

/**
 * Hide a notification by ID (used by notification close buttons)
 * @param {number} id - Notification ID
 */
export function hideNotification(id) {
    getNotificationWidget().hide(id);
}

/**
 * Shows success notification with optional transaction hash
 * @param {string} msg - Main message
 * @param {string} msg2 - Secondary message
 * @param {string} txHash - Optional transaction hash for explorer link
 * @param {string} network - Network for explorer link ('base' or 'ethereum')
 * @returns {string} Notification ID
 */
export function showSuccessNotification(msg = 'Swap Complete!', msg2 = 'Transaction confirmed on blockchain', txHash = null, network = 'base') {
    let enhancedMessage = msg2;
    let notificationId;

    if (txHash) {
        const explorerUrl = network === 'ethereum'
            ? `https://etherscan.io/tx/${txHash}`
            : `https://basescan.org/tx/${txHash}`;
        enhancedMessage = `${msg2} <br><a href="${explorerUrl}" target="_blank" style="color: #10b981; text-decoration: underline; font-weight: 600;">View on Explorer →</a>`;
    }

    // Show notification for 30 seconds (30000ms)
    notificationId = getNotificationWidget().show('success', msg, enhancedMessage, 30000);

    // If txHash is provided, make the notification 1.7x larger
    if (txHash) {
        setTimeout(() => {
            const notification = document.querySelector(`[data-id="${notificationId}"]`);
            if (notification) {
                notification.style.transform = 'scale(1.7)';
                notification.style.zIndex = '10001';
                notification.style.transformOrigin = 'bottom right';
            }
        }, 50);
    }

    return notificationId;
}

/**
 * Shows error notification
 * @param {string} msg - Main message
 * @param {string} msg2 - Secondary message
 */
export function showErrorNotification(msg = 'Transaction Failed', msg2 = 'Please check wallet and try again') {
    getNotificationWidget().error(msg, msg2);
}

/**
 * Shows warning notification
 * @param {string} msg - Main message
 * @param {string} msg2 - Secondary message
 */
export function showWarningNotification(msg = 'High Gas Fees', msg2 = 'Network congestion detected') {
    getNotificationWidget().warning(msg, msg2);
}

/**
 * Shows info notification
 * @param {string} msg - Main message
 * @param {string} msg2 - Secondary message
 */
export function showInfoNotification(msg = 'Processing...', msg2 = 'Please wait for confirmation') {
    getNotificationWidget().info(msg, msg2);
}

/**
 * Shows error notification centered on screen (for mid-page buttons)
 * @param {string} msg - Main message
 * @param {string} msg2 - Secondary message
 */
export function showErrorNotificationCentered(msg = 'Transaction Failed', msg2 = 'Please check wallet and try again') {
    getNotificationWidget().errorCentered(msg, msg2);
}

/**
 * Shows success notification centered on screen (for mid-page buttons)
 * @param {string} msg - Main message
 * @param {string} msg2 - Secondary message
 */
export function showSuccessNotificationCentered(msg = 'Success!', msg2 = '') {
    getNotificationWidget().successCentered(msg, msg2);
}

/**
 * Shows info notification centered on screen (for mid-page buttons)
 * @param {string} msg - Main message
 * @param {string} msg2 - Secondary message
 */
export function showInfoNotificationCentered(msg = 'Processing...', msg2 = 'Please wait for confirmation') {
    getNotificationWidget().infoCentered(msg, msg2);
}

/**
 * Shows success notification at top of screen (for buttons near top of page like claim rewards)
 * @param {string} msg - Main message
 * @param {string} msg2 - Secondary message
 * @param {string} txHash - Transaction hash for explorer link
 * @param {string} network - Network for explorer link ('base' or 'ethereum')
 * @returns {string} Notification ID
 */
export function showSuccessNotificationTop(msg = 'Success!', msg2 = '', txHash = null, network = 'base') {
    const widget = getNotificationWidget();
    widget.setPosition('top-right');

    let enhancedMessage = msg2;
    if (txHash) {
        const explorerUrl = network === 'ethereum'
            ? `https://etherscan.io/tx/${txHash}`
            : `https://basescan.org/tx/${txHash}`;
        enhancedMessage = `${msg2} <br><a href="${explorerUrl}" target="_blank" style="color: #10b981; text-decoration: underline; font-weight: 600;">View on Explorer →</a>`;
    }

    const notificationId = widget.show('success', msg, enhancedMessage, 30000);

    // Make the notification larger like other success notifications with txHash
    if (txHash) {
        setTimeout(() => {
            const notification = document.querySelector(`[data-id="${notificationId}"]`);
            if (notification) {
                notification.style.transform = 'scale(1.7)';
                notification.style.zIndex = '10001';
                notification.style.transformOrigin = 'top right';
            }
        }, 50);
    }

    return notificationId;
}

/**
 * Shows toast notification
 * @param {string} message - Message to display
 * @param {boolean} isError - Whether it's an error toast
 */
export function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = isError ? '#dc3545' : '#28a745';
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Shows alert notification
 * @param {string} message - Message to display
 * @param {string} type - Alert type (info, success, error)
 */
export function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    const settingsPage = document.getElementById('settings');
    settingsPage.insertBefore(alertDiv, settingsPage.firstChild);

    setTimeout(() => alertDiv.remove(), 5000);
}

/**
 * Shows success message temporarily
 * @param {string} elementId - Element ID to show
 */
export function showSuccessMessage(elementId) {
    const element = document.getElementById(elementId);
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 3000);
}

// =============================================================================
// LOADING WIDGET FUNCTIONS
// =============================================================================

/**
 * Shows loading widget
 * @param {string} message - Loading message
 * @param {string} title - Loading title
 */
export function showLoadingWidget(message = 'Loading...', title = 'Loading') {
    const widget = document.getElementById('loading-widget');
    const messageEl = document.getElementById('loading-widget-message');
    const titleEl = widget.querySelector('.loading-widget-title');

    widget.className = 'loading-widget';
    titleEl.textContent = title;
    messageEl.textContent = message;
    setLoadingProgress(0);

    setTimeout(() => widget.classList.add('show'), 10);
}

/**
 * Updates loading widget status
 * @param {string} message - Status message (HTML allowed)
 */
export function updateLoadingStatusWidget(message) {
    document.getElementById('loading-widget-message').innerHTML = message;
}

/**
 * Sets loading progress percentage
 * @param {number} percentage - Progress percentage (0-100)
 */
export function setLoadingProgress(percentage) {
    document.getElementById('loading-progress-bar').style.width = percentage + '%';
}

/**
 * Hides loading widget
 */
export function hideLoadingWidget() {
    document.getElementById('loading-widget').classList.remove('show');
}

/**
 * Updates loading status message
 * @param {string} message - Status message
 */
export function updateLoadingStatus(message) {
    document.getElementById('loading-status').textContent = message;
}

/**
 * Shows loading screen
 */
export function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingContent = loadingScreen.querySelector('.loading-content');
    const loadingSubtitle = loadingScreen.querySelector('.loading-status');

    loadingSubtitle.textContent = 'Now loading the data';
    const parent = loadingContent.parentNode;
    const newContent = loadingContent.cloneNode(true);
    parent.removeChild(loadingContent);
    parent.appendChild(newContent);

    loadingScreen.style.display = 'flex';
    document.getElementById('main-content').style.display = 'none';
}

/**
 * Hides loading screen
 */
export function hideLoadingScreen() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
}

// =============================================================================
// TAB SWITCHING FUNCTIONS
// =============================================================================

let PreviousTabName = "";
let statsDataLoadedAt = 0; // Timestamp of last stats load

/**
 * Switches main application tab
 * @param {string} tabName - Name of tab to switch to
 */
export async function switchTab(tabName) {
    console.log("called switchTab: ", tabName);
    // Store previous tab and update immediately to prevent race conditions
    const previousTab = PreviousTabName;
    PreviousTabName = tabName;

    var name = '#' + tabName;
    getNotificationWidget().positionInContainer(name);


    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
        page.style.display = '';
    });

    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Show selected page
    const selectedPage = document.getElementById(tabName);
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);

    if (selectedTab) selectedTab.classList.add('active');
    if (selectedPage) {
        selectedPage.classList.add('active');
    }
    
    if (tabName == 'stats') {

        // Always ensure stats-home is visible when switching to stats tab
        switchTab2('stats-home');

    }
        

    console.log("Switched to tab:", tabName);
    updateURL(tabName);



    if (!window.walletConnected) {
        console.log("Wallet not connected");
    }else{
        if(tabName != 'convert' && tabName != "settings" && tabName != "contract-info" && tabName != "whitepaper" && tabName != "miner"){

            await switchToBase();
        }

                    // Preload position data in background for any tab (with cache check)
            if(!window.positionsLoaded){
                try {
                    await window.getTokenIDsOwnedByMetamask(true);
                    console.log("SwitchTabA position Loaded");
                    window.positionsLoaded = true; 
                
                } catch (e) {
                    console.warn('Failed to preload getTokenIDsOwnedByMetamask(true):', e);
                    window.positionsLoaded = false; // Allow retry on failure
                }

            }else if(typeof window.getTokenIDsOwnedByMetamask === 'function') {
                try {
                    await window.getTokenIDsOwnedByMetamask();
                    console.log("SwitchTabf position Loaded");
                    window.positionsLoaded = true;
                } catch (e) {
                    console.warn('Failed to preload positions:', e);
                    window.positionsLoaded = false; // Allow retry on failure
                }
            }
                    
    }

    if (tabName == "staking") {
        tabName = "staking-main-page";
    }
    if (tabName == 'miner') {
        setTimeout(() => {
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        }, 100);
    }
    // Tab-specific data loading
    if (tabName == 'stats') {

        // Only load data if coming from a different tab or 3 minutes have passed
        const statsStale = (Date.now() - statsDataLoadedAt) > 180000; // 3 minutes
        if (previousTab != 'stats' && statsStale) {
            statsDataLoadedAt = Date.now();
            console.log("SwitchTab - Loading stats data");

            // First run SUPER COMBINED MULTICALL to populate window.cachedContractStats
            if (typeof window.getRewardStats === 'function') {
                console.log("Running SUPER COMBINED MULTICALL via getRewardStats...");
                await window.getRewardStats();
            }

            // Load stats data if functions are available
            if (typeof window.GetContractStatsWithMultiCall === 'function') {
                const stats = await window.GetContractStatsWithMultiCall();
                if (stats && typeof window.updateStatsDisplay === 'function') {
                    window.updateStatsDisplay(stats);
                }
            }
            if (typeof window.updateAllMinerInfoFirst === 'function') {
                await window.updateAllMinerInfoFirst();
            }
        }
    } else if (tabName === 'staking-management' || tabName === 'staking-main-page') {
        // Load staking data when switching to staking tabs
        if (window.walletConnected) {
            // Fetch reward stats (includes user's current rewards)
            if (typeof window.getRewardStats === 'function') {
                await window.getRewardStats();
            }
        }
        if (typeof window.updateStakingStats === 'function') {
            window.updateStakingStats();
        }
        // Update staking values from stored amounts
        if (typeof window.updateStakingValuesFromStored === 'function') {
            window.updateStakingValuesFromStored();
        }
    } else if (tabName === 'stake-increase' || tabName === 'stake-decrease') {
        // Load staking position data when switching to stake increase/decrease tabs
        if (window.walletConnected) {
            // Fetch wallet balances if not already loaded
            if (!window.walletBalances || !window.walletBalances['0xBTC']) {
                if (typeof window.fetchBalances === 'function') {
                    await window.fetchBalances(
                        window.userAddress,
                        window.tokenAddresses,
                        window.tokenAddressesDecimals,
                        window.fetchTokenBalanceWithEthers,
                        window.displayWalletBalances,
                        window.provider,
                        window.signer,
                        window.walletConnected,
                        window.connectWallet
                    );
                }
            }

            // Update the position info displays
            if (tabName === 'stake-increase' && typeof window.updateStakePositionInfo === 'function') {
                window.updateStakePositionInfo();
            }
            if (tabName === 'stake-decrease' && typeof window.updateStakeDecreasePositionInfo === 'function') {
                window.updateStakeDecreasePositionInfo();
            }
        }
    } else if (tabName === 'liquidity-positions') {
        // Wait for preloaded positions
    } else if (tabName === 'create' || tabName === 'increase' || tabName === 'decrease') {
        // Wait for preloaded positions

    } else if (tabName === 'side-pools') {
        // Load pool fees data
        if (typeof window.getAllFees === 'function') {
            await window.getAllFees();
        } else {
            console.warn('Pool fees function not available');
        }
    } else if (tabName === 'convert') {
        // Load ETH balances for convert tab
        if (window.walletConnected && window.userAddress) {
            // Check if ETH balances not already loaded
            if (!window.walletBalancesETH || !window.walletBalancesETH['0xBTC']) {
                console.log('Loading ETH balances for convert tab...');
                if (typeof window.switchToEthereum === 'function') {
                    await window.switchToEthereum();
                }
                if (typeof window.fetchBalancesETH === 'function') {
                    try {
                        await window.fetchBalancesETH(
                            window.userAddress,
                            window.tokenAddressesETH,
                            window.tokenAddressesDecimalsETH,
                            window.fetchTokenBalanceWithEthersETH,
                            window.displayWalletBalancesETH,
                            window.providerETH,
                            window.signerETH,
                            window.walletConnected,
                            window.connectWallet
                        );
                    } catch (e) {
                        console.warn('Failed to fetch ETH balances:', e);
                    }
                }
            }
        }
    } else if (tabName === 'create' || tabName === 'increase-liquidity' || tabName === 'decrease-liquidity') {
        // Load wallet balances for liquidity tabs (create, increase, decrease)
        if (window.walletConnected && window.userAddress) {
            // Check if wallet balances not already loaded
            if (!window.walletBalances || !window.walletBalances['0xBTC']) {
                console.log('Loading wallet balances for liquidity tab...');
                // Use getRewardStats which now includes token balances in the multicall
                if (typeof window.getRewardStats === 'function') {
                    try {
                        await window.getRewardStats();
                    } catch (e) {
                        console.warn('Failed to load wallet balances:', e);
                    }
                }
            }
        }
    } else {
        // Remove active class from all sub-tabs and sub-pages
        document.querySelectorAll('.nav-tab2').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.stats-page').forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });
    }
}

/**
 * Switches to stats tab
 */
export async function switchTabForStats() {
    var tabName = 'stats';
    // Store previous tab and update immediately to prevent race conditions
    const previousTab = PreviousTabName;
    PreviousTabName = tabName;

    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
        page.style.display = '';
    });

    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Show selected page
    const selectedPage = document.getElementById(tabName);
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);

    if (selectedTab) selectedTab.classList.add('active');
    if (selectedPage) {
        selectedPage.classList.add('active');
    }

    // Always ensure stats-home is visible when switching to stats tab
    switchTab2('stats-home');

    // Only load data if coming from a different tab
    if (previousTab != 'stats') {
        console.log("SwitchTab2 here - Loading stats data");
        await GetContractStatsWithMultiCall();
        await updateAllMinerInfoFirst();
    }

    console.log("previousTabName: ", PreviousTabName);
    if (tabName === 'stats') {
        document.querySelector('.content').style.padding = '0px';
    } else {
        document.querySelector('.content').style.padding = '40px';
    }
}

/**
 * Shows stats page and loads data WITHOUT switching to stats-home first
 * Used for direct URL navigation to stats sub-tabs to avoid jitter
 * @param {string} targetSubTab - The sub-tab to show after loading
 */
export async function showStatsPageDirect(targetSubTab) {
    var tabName = 'stats';
    // Store previous tab and update immediately to prevent race conditions
    const previousTab = PreviousTabName;
    PreviousTabName = tabName;

    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
        page.style.display = '';
    });

    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Show stats page
    const selectedPage = document.getElementById(tabName);
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);

    if (selectedTab) selectedTab.classList.add('active');
    if (selectedPage) {
        selectedPage.classList.add('active');
    }

    // Set padding for stats
    document.querySelector('.content').style.padding = '0px';

    // Show target sub-tab FIRST (before loading data to avoid jitter)
    switchTab2(targetSubTab);

    // Then load data in background
    if (previousTab != 'stats') {
        console.log("showStatsPageDirect - Loading stats data for:", targetSubTab);

        // First run SUPER COMBINED MULTICALL
        if (typeof window.getRewardStats === 'function') {
            await window.getRewardStats();
        }

        // Load stats data
        if (typeof window.GetContractStatsWithMultiCall === 'function') {
            const stats = await window.GetContractStatsWithMultiCall();
            if (stats && typeof window.updateStatsDisplay === 'function') {
                window.updateStatsDisplay(stats);
            }
        }
        if (typeof window.updateAllMinerInfoFirst === 'function') {
            await window.updateAllMinerInfoFirst();
        }
    }
}

import { initEthers2, updateGraphData } from "./charts.js";

/**
 * Switches stats sub-navigation tab
 * @param {string} tabName - Stats tab name
 */
export async function switchTab2(tabName) {
    updateURL(tabName);

    // Remove active class from all sub-tabs and sub-pages
    document.querySelectorAll('.nav-tab2').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.stats-page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });

    // Add active class to selected sub-tab and sub-page
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
    const selectedPage = document.getElementById(tabName);

    if (selectedTab) selectedTab.classList.add('active');
    if (selectedPage) {
        selectedPage.classList.add('active');
        selectedPage.style.display = 'block';
    }

    // Now load data AFTER the page is visible (so "loading..." text shows)
    if (tabName == 'stats-staking-rich-list') {
        loadData2();
    } else if (tabName == 'stats-rich-list') {
        loadData();
    } else if (tabName == 'rich-list') {
        loadData();
    } else if ((tabName == 'stats-home' || tabName == 'stats-mining-calc') && (Date.now() - statsDataLoadedAt) > 180000) {
        // Load stats data when switching to tabs that need it (with 3 min cache)
        statsDataLoadedAt = Date.now();
        if (typeof window.getRewardStats === 'function') {
            await window.getRewardStats();
        }
        if (typeof window.GetContractStatsWithMultiCall === 'function') {
            const stats = await window.GetContractStatsWithMultiCall();
            if (stats && typeof window.updateStatsDisplay === 'function') {
                window.updateStatsDisplay(stats);
            }
        }
        if (typeof window.updateAllMinerInfoFirst === 'function') {
            await window.updateAllMinerInfoFirst();
        }
    } else if (tabName == "stats-graphs") {
        await initEthers2();
        updateGraphData(30, 30);
    }
}

/**
 * Updates URL with tab parameter
 * @param {string} tabName - Tab name for URL
 */
export function updateURL(tabName) {
    if (tabName == "staking-main-page") {
        tabName = 'staking';
    }
    if (tabName == "stats-home") {
        tabName = 'stats';
    }
    if (tabName == "stats-staking-rich-list") {
        tabName = 'staking-rich-list';
    }
    if (tabName == "stats-rich-list") {
        tabName = 'rich-list';
    }
    if (tabName == "staking-main-page") {
        tabName = 'staking';
    }
    const baseUrl = window.location.origin + window.location.pathname;
    const newUrl = `${baseUrl}?${tabName}`;
    window.history.replaceState(null, '', newUrl);
}

// =============================================================================
// WALLET UI FUNCTIONS
// =============================================================================

/**
 * Updates wallet UI with connection info
 * @param {string} userAddress - User's wallet address
 * @param {string} walletName - Wallet name/type
 */
export function updateWalletUI(userAddress, walletName) {
    const connectBtn = document.getElementById('connectBtn');
    const walletInfo = document.getElementById('walletInfo');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const walletAddress = document.getElementById('walletAddress');
    const walletAddressSpan = document.querySelector('#walletInfo #walletAddress');

    if (userAddress) {
        const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        const baseScanUrl = `https://basescan.org/address/${userAddress}`;

        walletAddressSpan.style.display = 'block';
        walletAddressSpan.innerHTML = `<a href="${baseScanUrl}" target="_blank" rel="noopener noreferrer">${shortAddress}</a>`;

        walletInfo.style.display = 'block';
        disconnectBtn.style.display = 'block';

        connectBtn.textContent = `Connected (${walletName || 'Wallet'})`;
        connectBtn.classList.add('connected');

        walletAddressSpan.title = userAddress;
    } else {
        walletAddressSpan.style.display = 'none';
        walletInfo.style.display = 'none';
        connectBtn.textContent = 'Connect Wallet';
        connectBtn.classList.remove('connected');
        disconnectBtn.style.display = 'none';
    }
}

/**
 * Displays wallet balances for Base chain
 */
export function displayWalletBalances() {
    const containers = [
        document.getElementById('walletBalancesDisplay'),
        document.getElementById('walletBalancesDisplay2'),
        document.getElementById('walletBalancesDisplay3'),
        document.getElementById('walletBalancesDisplay4')
    ];

    if (!containers[0]) return;

    const walletBalances = window.walletBalances || {};
    let balancesHTML = '';

    // Use predefined order
    TOKEN_ORDER.forEach(token => {
        if (walletBalances[token] !== undefined) {
            const iconUrl = tokenIconsBase[token] || '';
            balancesHTML += `
                <div class="balance-item">
                    ${iconUrl ? `<img src="${iconUrl}" alt="${token}" class="token-icon222" onerror="this.style.display='none'">` : ''}
                    <span class="token-name">${token}</span>
                    <span class="token-amount">${formatExactNumber(walletBalances[token])}</span>
                </div>
            `;
        }
    });

    // Add any tokens not in predefined order
    for (const [token, balance] of Object.entries(walletBalances)) {
        if (!TOKEN_ORDER.includes(token)) {
            const iconUrl = tokenIconsBase[token] || '';
            console.log("TOKEN WWE NEED TO REMOVE = ",token);
            if(token == "RightsTo0xBTC"){
            console.log("TOKEN WWE NEED TO REMOVE = since were not using RightsTo0xBTCon base yet",token);
                continue;
            }
            balancesHTML += `
                <div class="balance-item">
                    ${iconUrl ? `<img src="${iconUrl}" alt="${token}" class="token-icon222" onerror="this.style.display='none'">` : ''}
                    <span class="token-name">${token}</span>
                    <span class="token-amount">${formatExactNumber(balance)}</span>
                </div>
            `;
        }
    }

    // Update all containers
    containers.forEach(container => {
        if (container) container.innerHTML = balancesHTML;
    });
}

/**
 * Displays wallet balances for ETH chain
 */
export function displayWalletBalancesETH() {
    const balancesContainer = document.getElementById('walletBalancesDisplay5');

    if (!balancesContainer) return;

    const walletBalancesETH = window.walletBalancesETH || {};
    let balancesHTML = '';

    TOKEN_ORDERETH.forEach(token => {
        if (walletBalancesETH[token] !== undefined) {
            const iconUrl = tokenIconsETH[token] || '';
            balancesHTML += `
                <div class="balance-item">
                    ${iconUrl ? `<img src="${iconUrl}" alt="${token}" class="token-icon222" onerror="this.style.display='none'">` : ''}
                    <span class="token-name">${token}</span>
                    <span class="token-amount">${formatExactNumber(walletBalancesETH[token])}</span>
                </div>
            `;
        }
    });

    // Add any tokens not in predefined order
    for (const [token, balance] of Object.entries(walletBalancesETH)) {
        if (!TOKEN_ORDERETH.includes(token)) {
            const iconUrl = tokenIconsETH[token] || '';
            balancesHTML += `
                <div class="balance-item">
                    ${iconUrl ? `<img src="${iconUrl}" alt="${token}" class="token-icon222" onerror="this.style.display='none'">` : ''}
                    <span class="token-name">${token}</span>
                    <span class="token-amount">${formatExactNumber(balance)}</span>
                </div>
            `;
        }
    }

    balancesContainer.innerHTML = balancesHTML;
}

// =============================================================================
// WIDGET UPDATE FUNCTIONS
// =============================================================================
let prevTimeInFunc2 = Date.now();

var firstthree = 0;

// Price state variables (stored on window for global access)
// These are set directly on window object to avoid module read-only issues
if (typeof window.ratioB0xTo0xBTC === 'undefined') window.ratioB0xTo0xBTC = 0;
if (typeof window.usdCostB0x === 'undefined') window.usdCostB0x = 0;

/**
 * Updates main widget with price and hashrate info
 */
export async function updateWidget() {
    const currentTime = Date.now();
    const timeDiff = currentTime - prevTimeInFunc2;

    if (timeDiff < 60000 && firstthree > 1 && firstRewardsAPYRun > 2) {
        console.log("repetive call not called updateWidget");
        return;
    } else {
        console.log("updateWidget run happened");
    }
    if (firstRewardsAPYRun <= 2) {
        console.log("First run because of RewardsAPYRun <=2");
    }
    firstthree = firstthree + 1;
    prevTimeInFunc2 = Date.now();

    // Set loading state
    const usdPriceEl = document.getElementById('usd-price');
    const btcPriceEl = document.getElementById('btc-price');
    const hashrateEl = document.getElementById('hashrate');

    if (usdPriceEl) usdPriceEl.textContent = 'Loading...';
    if (btcPriceEl) btcPriceEl.textContent = 'Loading...';
    if (hashrateEl) hashrateEl.textContent = 'Loading...';

    await calculateAndDisplayHashrate();

    // Fetch 0xBTC and WETH prices from CoinGecko first
    await fetchPriceData();

    // Now calculate B0x price (depends on oxbtcPriceUSD being set)
    // This function sets window.ratioB0xTo0xBTC and window.usdCostB0x directly
    const priceData = await calculateB0xPrice();

    setTimeout(() => {
        // Use the values that were set on window by calculateB0xPrice
        const usdPrice = window.usdCostB0x || 0;
        const btcPrice = window.ratioB0xTo0xBTC || 0;

        if (usdPriceEl) usdPriceEl.textContent = `$${usdPrice.toFixed(4)}`;
        if (btcPriceEl) btcPriceEl.textContent = btcPrice.toFixed(6);
        if (hashrateEl) hashrateEl.textContent = formattedHashrate;
    }, 1000);
}

/**
 * Handles widget visibility based on toggle
 */
export function handleWidgetVisibility() {
    const b0xwidget = document.getElementById('b0x-widget');
    const toggle = document.getElementById('toggle1');

    if (toggle && toggle.checked) {
        b0xwidget.style.display = "flex";
    } else {
        b0xwidget.style.display = "none";
    }
}

// =============================================================================
// TOKEN ICON UPDATE FUNCTIONS
// =============================================================================

/**
 * Core function to update token icon - unified handler for all contexts
 * @param {string} selectId - Select element ID
 * @param {string} iconId - Icon element ID
 * @param {Object} options - Configuration options
 * @param {string} options.context - 'swap' | 'swapETH' | 'create' (default: 'swap')
 * @param {boolean} options.clearAmount - Whether to clear amount input (default: true)
 */
export function updateTokenIconCore(selectId, iconId, options = {}) {
    const { context = 'swap', clearAmount = true } = options;

    const select = document.getElementById(selectId);
    if (!select) return;

    const token = select.value;
    const icon = document.getElementById(iconId);
    if (!icon) return;

    // Select icon source based on context
    const iconSource = context === 'swapETH' ? tokenIconsETH : tokenIconsBase;
    const iconURL = iconSource[token];

    if (iconURL) {
        icon.innerHTML = `<img src="${iconURL}" alt="${token}" class="token-icon222" onerror="this.parentElement.textContent='${token.charAt(0)}'">`;
    } else {
        icon.textContent = token.charAt(0);
    }

    // Clear the amount input field in the same form group
    if (clearAmount) {
        const formGroup = select.closest('.form-group')?.nextElementSibling;
        if (formGroup && formGroup.classList.contains('form-group')) {
            const amountInput = formGroup.querySelector('input[type="number"]');
            if (amountInput) {
                amountInput.value = '0.0';
            }
        }
    }

    // Call appropriate filter function based on context
    switch (context) {
        case 'swapETH':
            filterTokenOptionsSwapETH();
            break;
        case 'create':
            filterTokenOptionsCreate();
            break;
        case 'swap':
        default:
            filterTokenOptionsSwap();
            break;
    }
}

/**
 * Updates token icon (Base chain swap)
 * @param {string} selectId - Select element ID
 * @param {string} iconId - Icon element ID
 */
export function updateTokenIcon(selectId, iconId) {
    updateTokenIconCore(selectId, iconId, { context: 'swap', clearAmount: false });
}

/**
 * Updates token icon for ETH chain
 * @param {string} selectId - Select element ID
 * @param {string} iconId - Icon element ID
 */
export function updateTokenIconETH(selectId, iconId) {
    updateTokenIconCore(selectId, iconId, { context: 'swapETH' });
}

/**
 * Updates token icon for create position page
 * Handles multiple token selectors in the create form
 */
export function updateTokenIconCreate() {
    const formGroups = document.querySelectorAll('#create .form-group');

    formGroups.forEach(group => {
        const label = group.querySelector('label');
        const select = group.querySelector('select');
        const icon = group.querySelector('.token-icon');

        if (label && select && icon) {
            const labelText = label.textContent;
            if (labelText === 'Token A' || labelText === 'Token B') {
                const selectedValue = select.value;
                const iconURL = tokenIconsBase[selectedValue];

                if (iconURL) {
                    icon.innerHTML = `<img src="${iconURL}" alt="${selectedValue}" class="token-icon222" onerror="this.parentElement.textContent='${selectedValue.charAt(0)}'">`;
                } else {
                    icon.textContent = selectedValue.charAt(0);
                }
            }
        }
    });

    filterTokenOptionsCreate();
}

/**
 * Unified event listener setup for token selectors
 * Call this once on page load to set up all token icon update listeners
 */
export function initTokenIconListeners() {
    // Swap page listeners (Base chain) - uses fromToken22/toToken22
    const fromToken22 = document.getElementById('fromToken22');
    const toToken22 = document.getElementById('toToken22');

    if (fromToken22) {
        fromToken22.addEventListener('change', () => {
            updateTokenIcon('fromToken22', 'fromTokenIcon22');
        });
    }
    if (toToken22) {
        toToken22.addEventListener('change', () => {
            updateTokenIcon('toToken22', 'toTokenIcon11');
        });
    }

    // Convert page listeners (ETH chain) - uses fromToken/toToken
    const fromTokenETH = document.querySelector('#convert #fromToken');
    const toTokenETH = document.querySelector('#convert #toToken');

    if (fromTokenETH) {
        fromTokenETH.addEventListener('change', () => {
            updateTokenIconETH('fromToken', 'fromTokenIcon');
        });
    }
    if (toTokenETH) {
        toTokenETH.addEventListener('change', () => {
            updateTokenIconETH('toToken', 'toTokenIcon');
        });
    }

    // Create position page listeners
    const createSelects = document.querySelectorAll('#create .token-selector select');
    createSelects.forEach(select => {
        select.addEventListener('change', updateTokenIconCreate);
    });
}

/**
 * Updates token selection with icon
 * @param {string} selectId - Select element ID
 * @param {string} iconId - Icon element ID
 */
export function updateTokenSelection(selectId, iconId) {
    const select = document.getElementById(selectId);
    const icon = document.getElementById(iconId);
    const selectedValue = select.value;
    const iconURL = tokenIconsBase[selectedValue];

    const tokenIcons = {
        'ETH': 'E',
        'USDC': 'U',
        'DAI': 'D',
        'WBTC': 'W'
    };

    if (iconURL) {
        icon.innerHTML = `<img src="${iconURL}" alt="${selectedValue}" class="token-icon222" onerror="this.parentElement.textContent='${tokenIcons[selectedValue] || selectedValue.charAt(0)}'">`;
    } else {
        icon.textContent = tokenIcons[selectedValue] || selectedValue.charAt(0);
    }
}

// =============================================================================
// TOKEN FILTER FUNCTIONS
// =============================================================================

/**
 * Filter token options for create position to prevent selecting same token twice
 * Hides selected TokenA from TokenB dropdown
 */
export function filterTokenOptionsCreate() {
    const tokenA = document.getElementById('tokenA');
    const tokenB = document.getElementById('tokenB');

    if (!tokenA || !tokenB) return;

    const tokenAValue = tokenA.value;
    const tokenBValue = tokenB.value;

    // Reset all tokenB options to visible first
    Array.from(tokenB.options).forEach(option => {
        option.style.display = '';
        option.disabled = false;
    });

    // Hide the selected tokenA option in tokenB dropdown only
    Array.from(tokenB.options).forEach(option => {
        if (option.value === tokenAValue) {
            option.style.display = 'none';
            option.disabled = true;
        }
    });

    // If current tokenB selection matches tokenA, change it to first available option
    if (tokenBValue === tokenAValue) {
        const availableOptions = Array.from(tokenB.options).filter(option =>
            option.value !== tokenAValue && option.style.display !== 'none'
        );
        if (availableOptions.length > 0) {
            tokenB.value = availableOptions[0].value;
            updateTokenSelection('tokenB', 'tokenBIcon');
        }
    }
}

/**
 * Filter token options for swap to prevent selecting same token twice
 * Hides selected fromToken from toToken dropdown
 */
export function filterTokenOptionsSwap() {
    const fromToken = document.querySelector('#swap #fromToken22');
    const toToken = document.querySelector('#swap #toToken22');

    if (!fromToken || !toToken) return;

    const fromValue = fromToken.value;
    const toValue = toToken.value;

    // Reset all toToken options to visible first
    Array.from(toToken.options).forEach(option => {
        option.style.display = '';
        option.disabled = false;
    });

    // Hide the selected fromToken option in toToken dropdown only
    Array.from(toToken.options).forEach(option => {
        if (option.value === fromValue) {
            option.style.display = 'none';
            option.disabled = true;
        }
    });

    // If current toToken selection matches fromToken, change it to first available option
    if (toValue === fromValue) {
        const availableOptions = Array.from(toToken.options).filter(option =>
            option.value !== fromValue && option.style.display !== 'none'
        );
        if (availableOptions.length > 0) {
            toToken.value = availableOptions[0].value;
            updateTokenIcon('toToken22', 'toTokenIcon11');
        }
    }
}

/**
 * Filter token options for ETH convert to prevent selecting same token twice
 * Hides selected fromToken from toToken dropdown
 */
export function filterTokenOptionsSwapETH() {
    const fromToken = document.querySelector('#convert #fromToken');
    const toToken = document.querySelector('#convert #toToken');

    if (!fromToken || !toToken) return;

    const fromValue = fromToken.value;
    const toValue = toToken.value;

    // Reset all toToken options to visible first
    Array.from(toToken.options).forEach(option => {
        option.style.display = '';
        option.disabled = false;
    });

    // Hide the selected fromToken option in toToken dropdown only
    Array.from(toToken.options).forEach(option => {
        if (option.value === fromValue) {
            option.style.display = 'none';
            option.disabled = true;
        }
    });

    // If current toToken selection matches fromToken, change it to first available option
    if (toValue === fromValue) {
        const availableOptions = Array.from(toToken.options).filter(option =>
            option.value !== fromValue && option.style.display !== 'none'
        );
        if (availableOptions.length > 0) {
            toToken.value = availableOptions[0].value;
            updateTokenIcon('toToken', 'toTokenIcon');
        }
    }
}

// =============================================================================
// POSITION INFO UPDATE FUNCTIONS
// =============================================================================

/**
 * Updates position info for main staking page
 */
export function updatePositionInfoMAIN_STAKING() {
    const positionSelect = document.querySelector('#staking-deposit-select');
    const selectedPositionId = positionSelect.value;
    const position = positionData[selectedPositionId];

    if (!position) {
        // During initial load, keep loading message; otherwise show "create position" message
        if (window.getIsInitialPositionLoad && window.getIsInitialPositionLoad()) {
            console.log('updatePositionInfoMAIN_STAKING: No position, keeping loading message during initial load');
            return;
        }

        const infoCard = document.querySelector('#staking-main-page .info-card2');
        infoCard.innerHTML = `<h3>NFT Position Info</h3>
                                <p>Please Create a Position in order to Deposit the Uniswap v4 NFT into staking</p>`;
        document.getElementById('estimatedRewards').value = "0%";
        return;
    }

    var positionLiq = parseFloat(position.currentLiquidity);
    var percentOfStaking = positionLiq / (parseFloat(totalLiquidityInStakingContract.toString()) + positionLiq);
    document.getElementById('estimatedRewards').value = percentOfStaking.toFixed(6) * 100 + "%";
    console.log("percent stats: percentOfStaking = ",percentOfStaking);
    console.log("percent stats: percentotalLiquidityInStakingContracttOfStaking = ",totalLiquidityInStakingContract);
    console.log("percent stats: positionLiq = ",positionLiq);

    const infoCard = document.querySelector('#staking-main-page .info-card2');
    infoCard.innerHTML = `<h3>Current Selected Position</h3>
        <p><strong>Pool:</strong> ${position.pool} (${position.feeTier})</p>
        <p><strong>Current Liquidity:</strong> ${position.currentLiquidity.toFixed(2)}</p>
        <p><strong>Total Liquidity:</strong> ${parseFloat(position.currentTokenA).toFixed(4)} ${position.tokenA} & ${parseFloat(position.currentTokenB).toFixed(4)} ${position.tokenB}</p>
    `;
}

/**
 * Updates position info for unstaking
 */
export function updatePositionInfoMAIN_UNSTAKING() {
    const positionSelect = document.querySelector('#staking-main-page .form-group2 select');
    const selectedPositionId = positionSelect.value;
    const position = stakingPositionData[selectedPositionId];

    if (!position) {
        // During initial load, keep loading message; otherwise show "no positions" message
        if (window.getIsInitialPositionLoad && window.getIsInitialPositionLoad()) {
            console.log('updatePositionInfoMAIN_UNSTAKING: No position, keeping loading message during initial load');
            return;
        }

        const infoCard = document.querySelector('#staking-main-page .info-card');
        infoCard.innerHTML = `<h3>Token Withdrawing</h3>
                            <p>Deposit Position to Staking to Withdraw Position</p>
                            `;
        return;
    }

    const infoCard = document.querySelector('#staking-main-page .info-card');
    var parseFloatz = parseFloat(position.PenaltyForWithdraw).toFixed(3);
    infoCard.innerHTML = `<h3>Current Selected Position</h3>
        <p><strong>Pool:</strong> ${position.pool} (${position.feeTier})</p>
        <p><strong>Current Liquidity:</strong> ${position.currentLiquidity.toFixed(2)}</p>
        <p><strong>Total Liquidity:</strong> ${parseFloat(position.currentTokenA).toFixed(4)} ${position.tokenA} & ${parseFloat(position.currentTokenB).toFixed(4)} ${position.tokenB}</p>
        <p style="font-weight: bold; font-size: 2em; color: red;"><strong>Penalty for Early Stake Withdrawl:</strong> ${parseFloatz} %</p>
         <p>It is cheaper if you use Stake Decrease if you are only removing a portion of your funds from staking, cheaper than removing everthing and restaking.</p>
        `;
}

/**
 * Updates position info for increase liquidity page
 */
export function updatePositionInfo() {
    const positionSelect = document.querySelector('#increase select');
    const selectedPositionId = positionSelect.value;
    const position = positionData[selectedPositionId];

    if (!position) {
        const infoCard = document.querySelector('#increase .info-card:nth-child(5)');
        infoCard.innerHTML = `
            <h3>Increase Position Liquidity</h3>
             <p>Create Position to increase liquidity on it</p>`;
        return;
    }

    const infoCard = document.querySelector('#increase .info-card:nth-child(5)');
    infoCard.innerHTML = `
        <h3>Current Selected Position</h3>
        <p><strong>Pool:</strong> ${position.pool} (${position.feeTier})</p>
        <p><strong>Current Liquidity:</strong> ${position.currentLiquidity.toFixed(2)}</p>
        <p><strong>Total Liquidity:</strong> ${parseFloat(position.currentTokenA).toFixed(4)} ${position.tokenA} & ${parseFloat(position.currentTokenB).toFixed(4)} ${position.tokenB}</p>
        <p><strong>Unclaimed Fees:</strong> ${parseFloat(position.unclaimedFeesTokenA).toFixed(4)} ${position.tokenA} & ${parseFloat(position.unclaimedFeesTokenB).toFixed(4)} ${position.tokenB}</p>
    `;

    updateTotalLiqIncrease();
}

/**
 * Updates total liquidity for increase operation
 */
export function updateTotalLiqIncrease() {
    const positionSelect = document.querySelector('#increase select');
    const selectedPositionId = positionSelect.value;
    const position = positionData[selectedPositionId];
    if (!position) return;

    const tokenASpan = document.querySelector('#increase #tokenALabel');
    const tokenBSpan = document.querySelector('#increase #tokenBLabel');

    if (tokenASpan) {
        const iconURL = tokenIconsBase[position.tokenA];
        if (iconURL) {
            tokenASpan.innerHTML = `<img src="${iconURL}" alt="${position.tokenA}" class="token-icon222" style="margin-right: 8px;"> ${position.tokenA}`;
        } else {
            tokenASpan.textContent = position.tokenA;
        }
    }

    if (tokenBSpan) {
        const iconURL = tokenIconsBase[position.tokenB];
        if (iconURL) {
            tokenBSpan.innerHTML = `<img src="${iconURL}" alt="${position.tokenB}" class="token-icon222" style="margin-right: 8px;"> ${position.tokenB}`;
        } else {
            tokenBSpan.textContent = position.tokenB;
        }
    }

    let inputTokenA = 0;
    let inputTokenB = 0;

    const tokenAInput = document.querySelector('#increase #tokenAAmount');
    const tokenBInput = document.querySelector('#increase #tokenBAmount');

    if (tokenAInput) inputTokenA = tokenAInput.value || 0;
    if (tokenBInput) inputTokenB = tokenBInput.value || 0;

    var maxAmountA = addWithPrecision(position.currentTokenA, inputTokenA, tokenAddressesDecimals[position.tokenA]);
    var maxAmountB = addWithPrecision(position.currentTokenB, inputTokenB, tokenAddressesDecimals[position.tokenB]);

    const totalLiquidityInput = document.querySelector('#increase input[readonly]');
    if (totalLiquidityInput) {
        totalLiquidityInput.value = `${(maxAmountA).toString()} ${position.tokenA} & ${(maxAmountB).toString()} ${position.tokenB}`;
    }
}

/**
 * Updates percentage slider for decrease liquidity
 * @param {number} value - Percentage value
 */
export function updatePercentage(value) {
    const percentageDisplay = document.getElementById('percentageDisplay');
    percentageDisplay.textContent = value + '%';

    const positionSelect = document.querySelector('#decrease select');
    const selectedPositionId = positionSelect.value;
    const position = positionData[selectedPositionId];

    const slider = document.querySelector('#decrease .slider');
    slider.style.setProperty('--value', value + '%');

    if (!position) return;

    const percentage = parseFloat(value) / 100;
    const removeAmount = percentage;

    const tokenAAmount = position.currentTokenA * removeAmount;
    const tokenBAmount = position.currentTokenB * removeAmount;

    var tokenaDecimals = tokenAddressesDecimals[position.tokenA];
    var tokenBDecimals = tokenAddressesDecimals[position.tokenB];

    const tokenInputs = document.querySelectorAll('#decrease .form-row input');
    if (tokenInputs.length >= 2) {
        tokenInputs[0].value = `${(tokenAAmount).toFixed(tokenaDecimals)} ${position.tokenA}`;
        tokenInputs[1].value = `${(tokenBAmount).toFixed(tokenBDecimals)} ${position.tokenB}`;
    }
}

/**
 * Updates staking percentage slider
 * @param {number} value - Percentage value
 */
export function updateStakePercentage(value) {
    const percentageDisplay = document.getElementById('stakePercentageDisplay');
    if (percentageDisplay) {
        percentageDisplay.textContent = value + '%';
    }

    const slider = document.querySelector('#stake-decrease .slider');
    slider.style.setProperty('--value', value + '%');

    const positionSelect = document.querySelector('#stake-decrease select');
    if (!positionSelect) return;

    const selectedPositionId = positionSelect.value;
    const position = stakingPositionData[selectedPositionId];

    if (!position) return;

    const percentage = parseFloat(value) / 100;
    const removeAmount = percentage;

    const tokenAAmount = position.currentTokenA * removeAmount;
    const tokenBAmount = position.currentTokenB * removeAmount;

    var tokenaDecimals = tokenAddressesDecimals[position.tokenA];
    var tokenBDecimals = tokenAddressesDecimals[position.tokenB];

    const tokenInputs = document.querySelectorAll('#stake-decrease .form-row input');
    if (tokenInputs.length >= 2) {
        var penaltyAsNumber = parseFloat(position.PenaltyForWithdraw.replace('%', ''));
        tokenInputs[0].value = `${(((tokenAAmount * (100 - penaltyAsNumber)) / 100)).toFixed(tokenaDecimals)} ${position.tokenA}`;
        tokenInputs[1].value = `${(((tokenBAmount * (100 - penaltyAsNumber)) / 100)).toFixed(tokenBDecimals)} ${position.tokenB}`;
    }
}

// =============================================================================
// STAKING STATS FUNCTIONS
// =============================================================================

/**
 * Updates staking stats display
 */
export function updateStakingStats() {
    const container = document.querySelector('#staking-main-page #stakingStatsContainer');
    if (!container) return;

    var tokencheck = Address_ZEROXBTC_TESTNETCONTRACT;
    var tokencheck2 = tokenAddresses['B0x'];

    let currency0, currency1;
    if (tokencheck.toLowerCase() < tokencheck2.toLowerCase()) {
        currency0 = tokencheck;
        currency1 = tokencheck2;
    } else {
        currency0 = tokencheck2;
        currency1 = tokencheck;
    }

    let statsHTML = '';

    statsHTML += `
        <div class="stat-card">
    `;

    const token0Name = getTokenNameFromAddress(currency0);
    const token1Name = getTokenNameFromAddress(currency1);

    statsHTML += `<div class="stat-value" id="totalStaked0">0 ${token0Name}</div>`;
    statsHTML += `<div class="stat-value" id="totalStaked1">0 ${token1Name}</div>`;

    statsHTML += `
            <div class="stat-label">Your Total Staked</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="APYPercentage">0%</div>
            <div class="stat-label">Your Current APY</div>
        </div>
    `;

    container.innerHTML = statsHTML;
}

/**
 * Updates staking values
 * @param {Array} stakedAmounts - Array of staked amounts
 * @param {string} apy - APY percentage
 */
export function updateStakingValues(stakedAmounts, apy) {
    let rawString = currentSettingsAddresses.contractAddresses;

    try {
        rawString = rawString.replace(/^"/, '').replace(/"$/, '');
        rawString = rawString.replace(/\\"/g, '"');
        var tokenAddresses1;
        tokenAddresses1 = JSON.parse(rawString);
    } catch (error) {
        console.log("Still can't parse (not big deal): ", error);
        tokenAddresses1 = rawString;
    }

    var tokencheck = Address_ZEROXBTC_TESTNETCONTRACT;
    var tokencheck2 = tokenAddresses['B0x'];

    let currency0, currency1;
    if (tokencheck.toLowerCase() < tokencheck2.toLowerCase()) {
        currency0 = tokencheck;
        currency1 = tokencheck2;
    } else {
        currency0 = tokencheck2;
        currency1 = tokencheck;
    }

    const element0 = document.getElementById(`totalStaked0`);
    if (element0) {
        const tokenName = getTokenNameFromAddress(currency0);
        element0.textContent = `${stakedAmounts[0] || '0'} ${tokenName}`;
    }

    const element1 = document.getElementById(`totalStaked1`);
    if (element1) {
        const tokenName = getTokenNameFromAddress(currency1);
        element1.textContent = `${stakedAmounts[1] || '0'} ${tokenName}`;
    }

    const apyElement = document.getElementById('APYPercentage');
    if (apyElement) {
        console.log("WINDOW APY FINAL IS: ",window.APYFINAL);
        apyElement.textContent = `${window.APYFINAL}%`;
    }
}

// =============================================================================
// FORMAT FUNCTIONS
// =============================================================================

/**
 * Formats exact number without rounding
 * @param {*} value - Value to format
 * @returns {string} Formatted number
 */
export function formatExactNumber(value) {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'bigint') {
        return value.toString();
    }

    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            return value.toFixed(0);
        }
        return value.toString();
    }

    return value.toString();
}

/**
 * Formats exact number with commas
 * @param {*} value - Value to format
 * @returns {string} Formatted number with commas
 */
export function formatExactNumberWithCommas(value) {
    const exactValue = formatExactNumber(value);
    return exactValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formats large numbers with K/M/B suffixes
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString();
}

/**
 * Formats balance with decimals
 * @param {number} balance - Balance to format
 * @returns {string} Formatted balance
 */
export function formatBalance(balance) {
    return (balance / 1e18).toFixed(4);
}

/**
 * Truncates address for display
 * @param {string} address - Address to truncate
 * @returns {string} Truncated address
 */
export function truncateAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formats time in seconds to readable format
 * @param {number} seconds - Seconds to format
 * @returns {string} Formatted time
 */
export function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

// =============================================================================
// DROPDOWN UPDATE FUNCTIONS
// =============================================================================

/**
 * Updates position dropdown for staking
 */
export function updatePositionDropdown() {
    const positionSelect2 = document.querySelector('#staking-deposit-select');
    if (!positionSelect2) return;

   // functionCallCounter++;
    incrementFunctionCallCounter();

    let selectionToPreserve;
    if (hasUserMadeSelection && userSelectedPosition && userSelectedPosition.startsWith('position_')) {
        selectionToPreserve = userSelectedPosition;
    } else {
        const currentValue = positionSelect2.value;
        if (currentValue && currentValue.startsWith('position_')) {
            selectionToPreserve = currentValue;
        } else {
            selectionToPreserve = null;
        }
    }

    // Only clear select if we have data OR initial load is complete
    if (Object.keys(positionData).length > 0 || !(window.getIsInitialPositionLoad && window.getIsInitialPositionLoad())) {
        positionSelect2.innerHTML = '';
    }

    Object.values(positionData).forEach(position => {
        const option = document.createElement('option');
        option.value = position.id;
        option.textContent = `${position.pool} #${position.id.split('_')[1]} - ${position.feeTier} Position`;
        positionSelect2.appendChild(option);
    });

    // Restore selection or default to first
    if (selectionToPreserve && positionSelect2.querySelector(`option[value="${selectionToPreserve}"]`)) {
        positionSelect2.value = selectionToPreserve;
    } else if (positionSelect2.options.length > 0) {
        positionSelect2.selectedIndex = 0;
    }

    updatePositionInfoMAIN_STAKING();
}

// =============================================================================
// RICH LIST DATA LOADING
// =============================================================================

// State variables for staking rich list (loadData2)
let stakingData = null;
let allStakingData = []; // Original full array for filtering
let filteredData = [];
let currentPage = 1;
let pageSize = 25;

// State variables for B0x rich list (loadData)
let baseData = [];
let ethData = [];
let combinedData = [];
let filteredData2 = [];
let currentPage2 = 1;
let pageSize2 = 25;
let currentSort = 'b0x';
let sortByB0xBaseChain = true;

/**
 * Loads staking rich list data from primary or backup sources
 * @async
 */
export async function loadData2() {
    const primaryUrl = customDataSource + 'B0x_Staking_Rich_List_logs_mainnet.json';
    const backupUrl = customBACKUPDataSource + 'B0x_Staking_Rich_List_logs_mainnet.json';

    try {
        document.getElementById('tableContent55').innerHTML = '<div class="loading55">Loading staking data...</div>';

        console.log('Fetching staking data from primary source...');
        const response = await fetch(primaryUrl);
        console.log("RESPONSE URL: ", primaryUrl);

        if (!response.ok) {
            throw new Error(`Primary source failed with status: ${response.status}`);
        }

        stakingData = await response.json();
        console.log("RESPONSE: ", stakingData);
        console.log('✅ Primary source successful for staking data');

        // Update stats
        updateStats55();

        // Convert users object to array for easier handling
        allStakingData = Object.entries(stakingData.users).map(([address, data]) => ({
            address,
            ...data
        }));
        filteredData = [...allStakingData];

        // Initial render
        currentPage = 1;
        renderTable2();
        renderPagination2();

    } catch (primaryError) {
        console.warn('⚠️ Primary source failed for staking data:', primaryError.message);
        console.log('🔄 Falling back to GitHub backup for staking data...');

        try {
            document.getElementById('tableContent55').innerHTML = '<div class="loading55">Loading staking data from backup...</div>';

            const backupResponse = await fetch(backupUrl);

            if (!backupResponse.ok) {
                throw new Error(`Backup source failed with status: ${backupResponse.status}`);
            }

            stakingData = await backupResponse.json();
            console.log('✅ Backup source successful for staking data');
            console.log("THIS THIS: ", stakingData);

            // Update stats
            updateStats55();

            // Convert users object to array for easier handling
            allStakingData = Object.entries(stakingData.users).map(([address, data]) => ({
                address,
                ...data
            }));
            filteredData = [...allStakingData];

            // Initial render
            currentPage = 1;
            renderTable2();
            renderPagination2();

            // Optional: Show user that backup data is being used
            const tableHeader = document.querySelector('#tableContent55');
            if (tableHeader) {
                const backupNotice = document.createElement('div');
                backupNotice.className = 'backup-notice';
                backupNotice.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 8px; margin-bottom: 10px; border-radius: 4px; font-size: 12px;';
                backupNotice.innerHTML = '⚠️ Using backup data source - some data may be slightly delayed';
                tableHeader.insertBefore(backupNotice, tableHeader.firstChild);
            }

        } catch (backupError) {
            console.error('❌ Both primary and backup sources failed for staking data!');
            console.error('Primary error:', primaryError.message);
            console.error('Backup error:', backupError.message);

            document.getElementById('tableContent55').innerHTML =
                '<div class="error">Failed to load data from all sources. Please check your connection and try again.</div>';
        }
    }
}

/**
 * Updates statistics for staking rich list
 */
function updateStats55() {
    document.getElementById('lastBlock').textContent = stakingData.last_block;
    document.getElementById('totalUsers').textContent = formatNumber(stakingData.user_addresses.length);

    // Calculate totals
    const users = Object.values(stakingData.users);
    const totalB0xStaked = users.reduce((sum, user) => sum + user.B0xStaked, 0);
    const total0xBTCStaked = users.reduce((sum, user) => sum + user['0xBTCStaked'], 0);

    document.getElementById('totalB0xStaked').textContent = formatNumber(totalB0xStaked / 1e18);
    document.getElementById('total0xBTCStaked').textContent = formatNumber(total0xBTCStaked / 1e8);
}

/**
 * Loads B0x rich list data from primary or backup sources
 * @async
 */
export async function loadData() {
    const primaryUrls = {
        base: customDataSource + 'RichList_B0x_mainnet.json',
        eth: customDataSource + 'RichList__Mainnet_ETH_holders.json'
    };

    const backupUrls = {
        base: customBACKUPDataSource + 'RichList_B0x_mainnet.json',
        eth: customBACKUPDataSource + 'RichList__Mainnet_ETH_holders.json'
    };

    try {
        console.log("Load data called");
        document.getElementById('tableContent').innerHTML = '<div class="loading-rich">Loading rich list data...</div>';

        console.log('Fetching rich list data from primary sources...');

        // Try primary sources first
        const [baseResponse, ethResponse] = await Promise.all([
            fetch(primaryUrls.base),
            fetch(primaryUrls.eth)
        ]);

        if (!baseResponse.ok || !ethResponse.ok) {
            throw new Error(`Primary sources failed - Base: ${baseResponse.status}, ETH: ${ethResponse.status}`);
        }

        baseData = await baseResponse.json();
        ethData = await ethResponse.json();

        console.log('✅ Primary sources successful for rich list data');

        combineData();
        updateStats();
        renderTable();

    } catch (primaryError) {
        console.warn('⚠️ Primary sources failed for rich list data:', primaryError.message);
        console.log('🔄 Falling back to GitHub backup for rich list data...');

        try {
            document.getElementById('tableContent').innerHTML = '<div class="loading-rich">Loading rich list data from backup...</div>';

            // Try backup sources
            const [baseBackupResponse, ethBackupResponse] = await Promise.all([
                fetch(backupUrls.base),
                fetch(backupUrls.eth)
            ]);

            if (!baseBackupResponse.ok || !ethBackupResponse.ok) {
                throw new Error(`Backup sources failed - Base: ${baseBackupResponse.status}, ETH: ${ethBackupResponse.status}`);
            }

            baseData = await baseBackupResponse.json();
            ethData = await ethBackupResponse.json();

            console.log('✅ Backup sources successful for rich list data');

            combineData();
            updateStats();
            renderTable();

            // Optional: Show user that backup data is being used
            const tableContainer = document.querySelector('#tableContent');
            if (tableContainer) {
                const backupNotice = document.createElement('div');
                backupNotice.className = 'backup-notice-rich';
                backupNotice.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 8px; margin-bottom: 10px; border-radius: 4px; font-size: 12px;';
                backupNotice.innerHTML = '⚠️ Using backup data source - data may be slightly delayed';
                tableContainer.insertBefore(backupNotice, tableContainer.firstChild);
            }

        } catch (backupError) {
            console.error('❌ Both primary and backup sources failed for rich list data!');
            console.error('Primary error:', primaryError.message);
            console.error('Backup error:', backupError.message);

            document.getElementById('tableContent').innerHTML = '<div class="error-rich">Error loading data from all sources. Please try again.</div>';
        }
    }
}

/**
 * Combines Base and ETH rich list data
 */
function combineData() {
    const addressMap = new Map();

    // Process Base data
    baseData.holders.forEach(holder => {
        addressMap.set(holder.address, {
            address: holder.address,
            b0xBalance: parseFloat(holder.balanceFormatted) || 0,
            b0xBalanceRaw: holder.balance,
            ethB0xBalance: 0,
            ethB0xBalanceRaw: '0'
        });
    });

    // Process ETH data
    ethData.holders.forEach(holder => {
        const existing = addressMap.get(holder.address);
        if (existing) {
            existing.ethB0xBalance = parseFloat(holder.balanceFormatted) || 0;
            existing.ethB0xBalanceRaw = holder.balance;
        } else {
            addressMap.set(holder.address, {
                address: holder.address,
                b0xBalance: 0,
                b0xBalanceRaw: '0',
                ethB0xBalance: parseFloat(holder.balanceFormatted) || 0,
                ethB0xBalanceRaw: holder.balance
            });
        }
    });

    combinedData = Array.from(addressMap.values());

    // Filter out addresses with zero balances for both tokens
    combinedData = combinedData.filter(holder =>
        holder.b0xBalance > 0 || holder.ethB0xBalance > 0
    );

    // Assign ranks AFTER filtering
    assignRanks();
    sortData();
    filteredData2 = [...combinedData];
}

/**
 * Assigns ranks for both Base and ETH B0x holdings
 */
function assignRanks() {
    // Sort by Base B0x and assign ranks
    const baseSort = [...combinedData].sort((a, b) => b.b0xBalance - a.b0xBalance);
    baseSort.forEach((holder, index) => {
        holder.rankBaseB0x = index + 1;
    });

    // Sort by ETH B0x and assign ranks
    const ethSort = [...combinedData].sort((a, b) => b.ethB0xBalance - a.ethB0xBalance);
    ethSort.forEach((holder, index) => {
        holder.rankETHb0x = index + 1;
    });
}

/**
 * Sorts combined data based on current sort criteria
 */
function sortData() {
    if (currentSort === 'b0x') {
        sortByB0xBaseChain = true;
        // Sort by Base B0x balance, highest first
        combinedData.sort((a, b) => b.b0xBalance - a.b0xBalance);
    } else {
        sortByB0xBaseChain = false;
        // Sort by ETH B0x balance, highest first
        combinedData.sort((a, b) => b.ethB0xBalance - a.ethB0xBalance);
    }
}

/**
 * Updates statistics for B0x rich list
 */
function updateStats() {
    const totalHolders = combinedData.length;
    const totalBaseB0x = combinedData.reduce((sum, holder) => sum + holder.b0xBalance, 0);
    const totalETHB0x = combinedData.reduce((sum, holder) => sum + holder.ethB0xBalance, 0);

    console.log("TOTAL ETH B0x: ", totalETHB0x);
    const lastUpdated = new Date(baseData.lastUpdated).toLocaleString();

    document.getElementById('totalHolders').textContent = totalHolders.toLocaleString();
    document.getElementById('totalBaseB0x').textContent = totalBaseB0x.toLocaleString(undefined, { maximumFractionDigits: 2 });
    document.getElementById('totalETHB0x').textContent = totalETHB0x.toLocaleString(undefined, { maximumFractionDigits: 2 });
    document.getElementById('lastUpdated').textContent = lastUpdated;
}

/**
 * Changes page for B0x rich list pagination
 * @param {number} page - Page number to navigate to
 */
export function changePage(page) {
    currentPage2 = page;
    renderTable();
}

/**
 * Filters rich list data based on search input
 */
export function filterData2() {
    const searchBox = document.getElementById('searchBox2');
    const searchTerm = searchBox ? searchBox.value.toLowerCase() : '';

    if (searchTerm === '') {
        filteredData2 = [...combinedData];
    } else {
        filteredData2 = combinedData.filter(holder =>
            holder.address.toLowerCase().includes(searchTerm)
        );
    }

    currentPage2 = 1;
    renderTable();
}

/**
 * Changes page for staking rich list pagination
 * @param {number} page - Page number to navigate to
 */
export function changePage2(page) {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable2();
    renderPagination2();
}

/**
 * Filters staking rich list data based on search input
 */
export function filterData() {
    const searchBox = document.getElementById('searchBox');
    const searchTerm = searchBox ? searchBox.value.toLowerCase() : '';

    if (searchTerm === '' || allStakingData.length === 0) {
        filteredData = [...allStakingData];
    } else {
        filteredData = allStakingData.filter(user =>
            user.address.toLowerCase().includes(searchTerm)
        );
    }

    currentPage = 1;
    renderTable2();
    renderPagination2();
}

/**
 * Initializes event listeners for rich list controls (sorting, page size, search)
 */
export function initRichListEventListeners() {
    // Search box event listener
    const searchBox2 = document.getElementById('searchBox2');
    if (searchBox2) {
        searchBox2.addEventListener('input', filterData2);
    }

    // Page size dropdown event listener
    const pageSize2El = document.getElementById('pageSize2');
    if (pageSize2El) {
        pageSize2El.addEventListener('change', function () {
            pageSize2 = parseInt(this.value);
            currentPage2 = 1;
            renderTable();
        });
    }

    // Sort by Base B0x button
    const sortB0xBtn = document.getElementById('sortB0x');
    if (sortB0xBtn) {
        sortB0xBtn.addEventListener('click', function () {
            if (currentSort !== 'b0x') {
                currentSort = 'b0x';
                document.getElementById('sortB0x').classList.add('active');
                document.getElementById('sort0xBTC').classList.remove('active');
                sortData();
                filteredData2 = [...combinedData];
                renderTable();
            }
        });
    }

    // Sort by ETH B0x button
    const sort0xBTCBtn = document.getElementById('sort0xBTC');
    if (sort0xBTCBtn) {
        sort0xBTCBtn.addEventListener('click', function () {
            if (currentSort !== 'ethb0x') {
                currentSort = 'ethb0x';
                document.getElementById('sort0xBTC').classList.add('active');
                document.getElementById('sortB0x').classList.remove('active');
                sortData();
                filteredData2 = [...combinedData];
                renderTable();
            }
        });
    }

    // Staking rich list - Search box event listener
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.addEventListener('input', filterData);
    }

    // Staking rich list - Page size dropdown event listener
    const pageSizeEl = document.getElementById('pageSize');
    if (pageSizeEl) {
        pageSizeEl.addEventListener('change', function () {
            pageSize = parseInt(this.value);
            currentPage = 1;
            renderTable2();
            renderPagination2();
        });
    }

    console.log('Rich list event listeners initialized');
}

// =============================================================================
// TABLE RENDERING FUNCTIONS
// =============================================================================

/**
 * Adjusts table styling based on screen size for staking rich list
 */
function adjustTableForScreenSize() {
    const activeTab = document.querySelector('.nav-tab2.active');
    if (!activeTab) return; // Exit silently if no active tab

    const activeTab2 = activeTab.getAttribute('data-tab');

    if (activeTab2 == 'stats-staking-rich-list') {
        const table = document.querySelector('#tableContent55 table');
        if (!table) return;

        const screenWidth = window.innerWidth;

        if (screenWidth <= 768) {
            // Mobile styles - shrink to content with overflow
            table.style.fontSize = '0.8rem';
            table.style.width = 'auto';
            table.style.minWidth = '415px';
            table.style.tableLayout = 'auto';

            const tableParent = table.parentElement;
            if (tableParent) {
                tableParent.style.overflowX = 'auto';
                tableParent.style.maxWidth = '100%';
            }

            const headers = table.querySelectorAll('th');
            const cells = table.querySelectorAll('td');

            headers.forEach(header => {
                header.style.whiteSpace = 'nowrap';
                header.style.width = '1%';

                if (header.textContent === 'Rank') {
                    header.style.fontSize = '0.8em';
                    header.style.padding = '2px 3px';
                } else {
                    header.style.fontSize = '1em';
                    header.style.padding = '8px 10px';
                }
            });

            cells.forEach(cell => {
                cell.style.padding = '8px 6px';
                cell.style.whiteSpace = 'nowrap';
                cell.style.width = '1%';
                cell.style.overflow = 'hidden';
            });

        } else if (screenWidth <= 1024) {
            // Tablet styles
            table.style.fontSize = '0.9rem';
            table.style.width = '100%';
            table.style.tableLayout = '';

            const headers = table.querySelectorAll('th');

            headers.forEach(header => {
                header.style.width = '';
                header.style.whiteSpace = '';

                if (header.textContent === 'Rank') {
                    header.style.fontSize = '0.9em';
                    header.style.padding = '3px 4px';
                } else {
                    header.style.fontSize = '2.2em';
                    header.style.padding = '10px 14px';
                }
            });

            const cells = table.querySelectorAll('td');
            cells.forEach(cell => {
                cell.style.width = '';
                cell.style.whiteSpace = '';
            });
        } else {
            console.log("not in the staking rich list for stats");
        }
    }
}

// Listen for window resize
window.addEventListener('resize', adjustTableForScreenSize);

/**
 * Adjusts table styling based on screen size for holder rich list
 */
function fixsize() {
    const activeTab = document.querySelector('.nav-tab2.active');
    if (!activeTab) return; // Exit silently if no active tab

    if (activeTab.textContent.trim().includes('Rich List') || activeTab.id === 'stats-rich-list' || activeTab.classList.contains('stats-rich-list')) {
        console.log('Active tab:', activeTab.textContent.trim());

        setTimeout(() => {
            const table = document.querySelector('#tableContent .table-rich');
            console.log("Table found:", !!table);

            if (table) {
                console.log("Processing table with class:", table.className);
                const screenWidth = window.innerWidth;

                if (screenWidth <= 650) {
                    // Extra small screens - aggressive compression
                    table.style.fontSize = '0.5rem';
                    table.style.width = 'auto';
                    table.style.minWidth = '415px';
                    table.style.tableLayout = 'auto';

                    const headers = table.querySelectorAll('th');
                    const cells = table.querySelectorAll('td');

                    const tableParent = table.parentElement;
                    if (tableParent) {
                        tableParent.style.overflowX = 'auto';
                        tableParent.style.maxWidth = '100%';
                    }

                    headers.forEach(header => {
                        if (header.classList.contains('balance-th-rank')) {
                            header.style.fontSize = '0.8em';
                            header.style.padding = '1px';
                            header.style.width = '1%';
                            header.style.whiteSpace = 'nowrap';
                            header.textContent = 'Rank';
                        } else if (header.classList.contains('balance-th')) {
                            header.style.fontSize = '1.5em';
                            header.style.padding = '2px';
                            header.style.width = '1%';
                            header.style.whiteSpace = 'nowrap';
                            header.textContent = 'Addr';
                        } else if (header.classList.contains('balance-th-balance')) {
                            header.style.fontSize = '1.5em';
                            header.style.whiteSpace = 'nowrap';
                            header.style.width = '1%';
                            header.style.padding = '2px';
                            if (header.textContent.includes('ETH B0x')) {
                                header.textContent = 'ETH B0x';
                            } else if (header.textContent.includes('Base B0x')) {
                                header.textContent = 'Base B0x';
                            }
                        }
                    });

                    cells.forEach(cell => {
                        cell.style.padding = '2px 1px';
                        cell.style.overflow = 'hidden';

                        if (cell.classList.contains('balance-rich')) {
                            cell.style.fontSize = '1.5em';
                            cell.style.whiteSpace = 'nowrap';
                            cell.style.width = '1%';
                        }

                        if (cell.classList.contains('address-rich')) {
                            cell.style.fontSize = '1.7em';
                            cell.style.overflow = 'hidden';
                            cell.style.whiteSpace = 'nowrap';
                            cell.style.width = '1%';

                            const link = cell.querySelector('a');
                            if (link) {
                                link.style.display = 'inline-block';
                                link.style.whiteSpace = 'nowrap';

                                const address = link.textContent;
                                if (address.length > 14 && !address.includes('...')) {
                                    link.textContent = address.slice(0, 4) + '...' + address.slice(-4);
                                }
                            }
                        }
                    });

                } else if (screenWidth <= 875) {
                    table.style.fontSize = '0.6rem';
                    table.style.tableLayout = 'auto';

                    const headers = table.querySelectorAll('th');
                    const cells = table.querySelectorAll('td');

                    headers.forEach(header => {
                        if (header.classList.contains('balance-th-rank')) {
                            header.style.fontSize = '1.5em';
                            header.style.padding = '2px 2px';
                            header.style.width = 'auto';
                        } else if (header.classList.contains('balance-th')) {
                            header.style.fontSize = '0.9em';
                            header.style.padding = '4px 6px';
                            header.style.width = 'auto';
                            header.textContent = 'Address';
                        } else if (header.classList.contains('balance-th-balance')) {
                            header.style.fontSize = '0.8em';
                            header.style.padding = '4px 4px';
                            header.style.width = 'auto';
                        }
                    });

                    cells.forEach(cell => {
                        cell.style.padding = '4px 2px';
                        cell.style.wordBreak = 'normal';
                        cell.style.overflow = 'visible';

                        if (cell.classList.contains('balance-rich')) {
                            cell.style.fontSize = '2em';
                        }
                        if (cell.classList.contains('address-rich')) {
                            cell.style.fontSize = '0.75em';
                            const link = cell.querySelector('a');
                            if (link) {
                                const fullAddress = cell.getAttribute('data-full-address') || link.textContent;
                                if (fullAddress.length > 30 && !fullAddress.includes('...')) {
                                    link.textContent = fullAddress.slice(0, 10) + '...' + fullAddress.slice(-10);
                                }
                            }
                        }
                    });

                } else if (screenWidth <= 1024) {
                    table.style.fontSize = '0.9rem';
                    table.style.tableLayout = 'auto';

                    const cells = table.querySelectorAll('td');
                    const headers = table.querySelectorAll('th');

                    headers.forEach(header => {
                        if (header.classList.contains('balance-th-rank')) {
                            header.style.fontSize = '0.9em';
                            header.style.padding = '3px 4px';
                        } else if (header.classList.contains('balance-th')) {
                            header.style.fontSize = '2.2em';
                            header.style.padding = '10px 14px';
                        } else if (header.classList.contains('balance-th-balance')) {
                            header.style.fontSize = '2.2em';
                            header.style.padding = '10px 14px';
                        }
                    });

                    cells.forEach(cell => {
                        cell.style.padding = '4px 2px';
                        if (cell.classList.contains('balance-rich')) {
                            cell.style.fontSize = '2.3em';
                        }
                        if (cell.classList.contains('address-rich')) {
                            cell.style.fontSize = '0.85em';
                            const link = cell.querySelector('a');
                            if (link) {
                                const fullAddress = cell.getAttribute('data-full-address');
                                if (fullAddress) {
                                    link.textContent = fullAddress.slice(0, 12) + '...' + fullAddress.slice(-12);
                                }
                            }
                        }
                    });

                } else {
                    table.style.fontSize = '1rem';
                    table.style.tableLayout = 'auto';

                    const cells = table.querySelectorAll('td');
                    const headers = table.querySelectorAll('th');

                    headers.forEach(header => {
                        if (header.classList.contains('balance-th-rank')) {
                            header.style.fontSize = '1em';
                            header.style.padding = '3px 4px';
                        } else if (header.classList.contains('balance-th')) {
                            header.style.fontSize = '2.5em';
                            header.style.padding = '12px 16px';
                        } else if (header.classList.contains('balance-th-balance')) {
                            header.style.fontSize = '2.5em';
                            header.style.padding = '12px 16px';
                        }
                    });

                    cells.forEach(cell => {
                        cell.style.padding = '4px 2px';
                        if (cell.classList.contains('balance-rich')) {
                            cell.style.fontSize = '2.753em';
                        }
                        if (cell.classList.contains('address-rich')) {
                            cell.style.fontSize = '1em';
                            const link = cell.querySelector('a');
                            if (link) {
                                const fullAddress = cell.getAttribute('data-full-address');
                                if (fullAddress && link.textContent.includes('...')) {
                                    link.textContent = fullAddress;
                                }
                            }
                        }
                    });
                }
            } else {
                console.log("Table not found. Available elements:");
                console.log("tableContent:", document.getElementById('tableContent'));
                console.log("All tables:", document.querySelectorAll('table'));
            }
        }, 100);
    }
}

// Listen for window resize
window.addEventListener('resize', fixsize);

/**
 * Renders table for staking rich list
 */
export function renderTable2() {
    const sortedData = [...filteredData].sort((a, b) => {
        return parseFloat(b.B0xStaked) - parseFloat(a.B0xStaked);
    });

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = sortedData.slice(start, end);

    let tableHTML = `
        <style>
            .address-link {
                color: white !important;
                text-decoration: none;
            }
            .address-link:visited,
            .address-link:hover,
            .address-link:active {
                color: white !important;
            }
            .address-link:hover {
                text-decoration: underline;
            }
        </style>
        <table>
            <thead>
                <tr>
                <th style="font-size: 1em; padding: 3px 4px;">Rank</th>
                <th style="font-size: 3em; padding: 12px 16px;">Address</th>
                <th style="font-size: 3em; padding: 12px 16px;">B0x Staked</th>
                <th style="font-size: 3em; padding: 12px 16px;">0xBTC Staked</th>
                </tr>
            </thead>
            <tbody>
    `;

    const globalStart = (currentPage - 1) * pageSize;
    pageData.forEach((user, index) => {
        const rank = globalStart + index + 1;

        var b0xStakedFormatted = 0;
        if (user.B0xStaked / 1e18 > 999.999) {
            b0xStakedFormatted = parseFloat(user.B0xStaked / 1e18).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        } else if (user.B0xStaked / 1e18 > 19.999) {
            b0xStakedFormatted = parseFloat(user.B0xStaked / 1e18).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 1
            });
        } else if (user.B0xStaked / 1e18 > 1.999) {
            b0xStakedFormatted = parseFloat(user.B0xStaked / 1e18).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });
        } else {
            b0xStakedFormatted = parseFloat(user.B0xStaked / 1e18).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 3
            });
        }

        var btcStakedFormatted = 0;
        if (user['0xBTCStaked'] / 1e8 > 99.999) {
            btcStakedFormatted = (user['0xBTCStaked'] / 1e8).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            });
        } else if (user['0xBTCStaked'] / 1e8 > 9.999) {
            btcStakedFormatted = (user['0xBTCStaked'] / 1e8).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 1,
            });
        } else if (user['0xBTCStaked'] / 1e8 > 1.999) {
            btcStakedFormatted = (user['0xBTCStaked'] / 1e8).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            });
        } else {
            btcStakedFormatted = (user['0xBTCStaked'] / 1e8).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 3,
            });
        }

        tableHTML += `
            <tr>
                <td class="rank55">${rank}</td>
                <td>
                    <a href="https://basescan.org/address/${user.address}"
                       target="_blank"
                       class="address55 address-link"
                       title="${user.address}">
                        ${user.address}
                    </a>
                </td>
                <td class="balance55">${b0xStakedFormatted}</td>
                <td class="balance55">${btcStakedFormatted}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    document.getElementById('tableContent55').innerHTML = tableHTML;

    adjustTableForScreenSize();
}

/**
 * Renders pagination for staking rich list
 */
export function renderPagination2() {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const pagination = document.getElementById('pagination55');

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';

    let paginationHTML = `
        <button onclick="changePage2(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            Previous
        </button>
    `;

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage2(${i})" class="${i === currentPage ? 'active' : ''}">
                ${i}
            </button>
        `;
    }

    paginationHTML += `
        <button onclick="changePage2(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Next
        </button>
        <span class="pagination55-info">
            Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredData.length)}
            of ${filteredData.length} users
        </span>
    `;

    pagination.innerHTML = paginationHTML;
}

/**
 * Renders table for holder rich list
 */
export function renderTable() {
    const start = (currentPage2 - 1) * pageSize2;
    const end = start + pageSize2;
    const pageData = filteredData2.slice(start, end);

    let tableHTML = `
        <table class="table-rich">
            <thead>
                <tr>
                    <th class="balance-th-rank">Rank</th>
                    <th class="balance-th">Address</th>
                    <th class="balance-th-balance">Base B0x</th>
                    <th class="balance-th-balance">ETH B0x</th>
                </tr>
            </thead>
            <tbody>
    `;

    const screenWidth = window.innerWidth;
    const maxDecimals = screenWidth <= 650 ? 1 : 6;

    pageData.forEach((holder, index) => {
        var rank = "";
        if (sortByB0xBaseChain) {
            rank = holder.rankBaseB0x;
        } else {
            rank = holder.rankETHb0x;
        }
        tableHTML += `
            <tr>
                <td class="spot-rich">${rank}</td>
                <td class="address-rich" data-full-address="${holder.address}">
                    <a href="${_BLOCK_EXPLORER_ADDRESS_URL}${holder.address}" target="_blank">${holder.address}</a>
                </td>
                <td class="balance-rich">${holder.b0xBalance.toLocaleString(undefined, { maximumFractionDigits: maxDecimals })}</td>
                <td class="balance-rich">${holder.ethB0xBalance.toLocaleString(undefined, { maximumFractionDigits: maxDecimals })}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    document.getElementById('tableContent').innerHTML = tableHTML;

    setTimeout(fixsize, 50);
    renderPagination();
}

/**
 * Renders pagination for holder rich list
 */
export function renderPagination() {
    const totalPages = Math.ceil(filteredData2.length / pageSize2);
    const pagination = document.getElementById('pagination');

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';

    let paginationHTML = `
        <button ${currentPage2 === 1 ? 'disabled' : ''} onclick="changePage(${currentPage2 - 1})">Previous</button>
    `;

    const startPage = Math.max(1, currentPage2 - 2);
    const endPage = Math.min(totalPages, currentPage2 + 2);

    if (startPage > 1) {
        paginationHTML += '<button onclick="changePage(1)">1</button>';
        if (startPage > 2) paginationHTML += '<span>...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button ${i === currentPage2 ? 'class="active"' : ''} onclick="changePage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) paginationHTML += '<span>...</span>';
        paginationHTML += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
    }

    paginationHTML += `
        <button ${currentPage2 === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage2 + 1})">Next</button>
        <div class="pagination-info-rich">
            Showing ${((currentPage2 - 1) * pageSize2) + 1}-${Math.min(currentPage2 * pageSize2, filteredData2.length)} of ${filteredData2.length}
        </div>
    `;

    pagination.innerHTML = paginationHTML;
}

// =============================================================================
// STATS DISPLAY FUNCTIONS
// =============================================================================

/**
 * Update stats display in stats-home section with data from GetContractStatsWithMultiCall
 * @param {Object} stats - Stats object returned from GetContractStatsWithMultiCall
 */
export async function updateStatsDisplay(stats) {
    if (!stats) {
        console.warn('No stats data provided to updateStatsDisplay');
        return;
    }

    console.log('Updating stats display with:', stats);

    try {
        // Update Epoch Count (adding 24420 from previous contract)
        const epochCountEl = document.querySelector('.stat-value-epochCount');
        if (epochCountEl && stats.epochCount) {
            epochCountEl.textContent = (parseInt(stats.epochCount) + 24420).toLocaleString();
        }

        // Update Current Reward Era
        const currentEraEl = document.querySelector('.stat-value-currentEra');
        if (currentEraEl && stats.rewardEra) {
            const era = parseInt(stats.rewardEra);

            // Calculate time to next era using same logic as Remaining Supply
            let nextEraTime = 'calculating...';
            if (stats.maxSupplyForEra && stats.tokensMinted) {
                const maxSupply = parseFloat(stats.maxSupplyForEra) / 1e18;
                const minted = parseFloat(stats.tokensMinted) / 1e18;
                const remaining = maxSupply - minted;

                const currentReward = stats.inflationMined?.rewardsAtTime
                    ? parseFloat(stats.inflationMined.rewardsAtTime) / 1e18
                    : 50;
                const blocksRemaining = Math.floor(remaining / currentReward);

                const avgRewardTimeSeconds = stats.inflationMined?.timePerEpoch
                    ? parseFloat(stats.inflationMined.timePerEpoch)
                    : 600;
                const avgRewardTimeMinutes = avgRewardTimeSeconds / 60;

                const totalMinutes = blocksRemaining * avgRewardTimeMinutes;
                const totalHours = totalMinutes / 60;
                const totalDays = totalHours / 24;
                const totalMonths = totalDays / 30.44;
                const totalYears = totalDays / 365.25;

                if (totalYears >= 1.5) {
                    nextEraTime = `~${totalYears.toFixed(1)} years`;
                } else if (totalMonths >= 3) {
                    nextEraTime = `~${totalMonths.toFixed(1)} months`;
                } else if (totalDays >= 5) {
                    nextEraTime = `~${totalDays.toFixed(1)} days`;
                } else if (totalHours >= 12) {
                    nextEraTime = `~${totalHours.toFixed(1)} hours`;
                } else {
                    nextEraTime = `~${totalMinutes.toFixed(1)} minutes`;
                }
            }

            currentEraEl.innerHTML = `${era.toLocaleString()} <span class="detail">/ 55 (next era: ${nextEraTime})</span>`;
        }

        // Update Mining Difficulty (will be calculated by updateAllMinerInfo)
        // This is complex and requires additional calculations from updateAllMinerInfo

        // Update Blocks to Readjust
        const blocksToGoEl = document.querySelector('.stat-value-blocksToGo');
        if (blocksToGoEl && stats.blocksToReadjust) {
            const blocksToGo = parseInt(stats.blocksToReadjust);
            // Use actual average reward time from contract stats (timePerEpoch in seconds)
            const avgRewardTimeSeconds = stats.inflationMined?.timePerEpoch
                ? parseFloat(stats.inflationMined.timePerEpoch)
                : 12; // Fallback to 12 seconds if not available
            const secondsUntilAdjust = blocksToGo * avgRewardTimeSeconds;
            const minutesUntilAdjust = secondsUntilAdjust / 60;
            const hoursUntilAdjust = minutesUntilAdjust / 60;

            let timeDisplay = '';
            let timeUnit = '';

            if (hoursUntilAdjust > 24) {
                const days = hoursUntilAdjust / 24;
                timeDisplay = days.toFixed(1);
                timeUnit = 'days';
            } else if (hoursUntilAdjust >= 1) {
                timeDisplay = hoursUntilAdjust.toFixed(1);
                timeUnit = 'hours';
            } else if (minutesUntilAdjust >= 1) {
                timeDisplay = minutesUntilAdjust.toFixed(1);
                timeUnit = 'minutes';
            } else {
                timeDisplay = secondsUntilAdjust.toFixed(0);
                timeUnit = 'seconds';
            }

            blocksToGoEl.innerHTML = `${blocksToGo.toLocaleString()} <span class="detail blocksToGoUnit">(~${timeDisplay} ${timeUnit})</span>`;
        }

        // Update Emergency Adjustment Time
        const emergencyEl = document.querySelector('.stat-value-emergency');
        if (emergencyEl && stats.secondsUntilSwitch) {
            const seconds = parseInt(stats.secondsUntilSwitch);
            const days = seconds / 86400;
            const hours = seconds / 3600;

            let timeDisplay = '';
            let timeUnit = '';

            if (days > 1) {
                timeDisplay = days.toFixed(1);
                timeUnit = 'days';
            } else {
                timeDisplay = hours.toFixed(1);
                timeUnit = 'hours';
            }

            emergencyEl.innerHTML = `${timeDisplay} <span class="detail emergencyUnit">${timeUnit}</span>`;
        }

        // Update Last Difficulty Start Block
        const lastDiffBlockEl = document.querySelector('.stat-value-lastDiffBlock');
        if (lastDiffBlockEl && stats.latestDiffPeriod) {
            const blockNum = parseInt(stats.latestDiffPeriod);
            lastDiffBlockEl.innerHTML = `${blockNum} <span class="detail lastDiffBlockDetail">(Base block)</span>`;
        }

        // Update Last Difficulty Time
        const lastDiffTimeEl = document.querySelector('.stat-value-lastDiffTime');
        if (lastDiffTimeEl && stats.latestDiffPeriod2) {
            const timestamp = parseInt(stats.latestDiffPeriod2);
            const date = new Date(timestamp * 1000);
            const timeAgo = getTimeAgo(timestamp);
            lastDiffTimeEl.innerHTML = `${date.toLocaleString()} <span class="detail lastDiffBlockDetail2">(${timeAgo})</span>`;
        }

        // Update Tokens Minted
        const distMiningEl = document.querySelector('.stat-value-distMining');
        if (distMiningEl && stats.tokensMinted) {
            const minted = parseFloat(stats.tokensMinted) / 1e18;
            distMiningEl.innerHTML = `${minted.toLocaleString(undefined, {maximumFractionDigits: 0})} <span class="unit">B0x</span>`;
        }

        // Update Max Supply for Era
        const maxSupplyEl = document.querySelector('.stat-value-MAxSupply');
        if (maxSupplyEl && stats.maxSupplyForEra) {
            const maxSupply = parseFloat(stats.maxSupplyForEra) / 1e18;
            maxSupplyEl.innerHTML = `${maxSupply.toLocaleString(undefined, {maximumFractionDigits: 0})} <span class="unit">B0x</span>`;
        }

        // Update Remaining Supply
        const remainingSupplyEl = document.querySelector('.stat-value-remainingSupply');
        if (remainingSupplyEl && stats.maxSupplyForEra && stats.tokensMinted) {
            const maxSupply = parseFloat(stats.maxSupplyForEra) / 1e18;
            const minted = parseFloat(stats.tokensMinted) / 1e18;
            const remaining = maxSupply - minted;

            // Use actual current reward from inflationMined
            const currentReward = stats.inflationMined?.rewardsAtTime
                ? parseFloat(stats.inflationMined.rewardsAtTime) / 1e18
                : 50; // Fallback
            const blocksRemaining = Math.floor(remaining / currentReward);

            // Get actual average reward time in minutes
            const avgRewardTimeSeconds = stats.inflationMined?.timePerEpoch
                ? parseFloat(stats.inflationMined.timePerEpoch)
                : 600; // Fallback to 10 minutes
            const avgRewardTimeMinutes = avgRewardTimeSeconds / 60;

            // Calculate total time in minutes
            const totalMinutes = blocksRemaining * avgRewardTimeMinutes;
            const totalHours = totalMinutes / 60;
            const totalDays = totalHours / 24;
            const totalMonths = totalDays / 30.44; // Average days per month
            const totalYears = totalDays / 365.25;

            // Format time display based on duration
            let timeDisplay = '';
            if (totalYears >= 1.5) {
                timeDisplay = `~${totalYears.toFixed(1)} years`;
            } else if (totalMonths >= 3) {
                timeDisplay = `~${totalMonths.toFixed(1)} months`;
            } else if (totalDays >= 5) {
                timeDisplay = `~${totalDays.toFixed(1)} days`;
            } else if (totalHours >= 12) {
                timeDisplay = `~${totalHours.toFixed(1)} hours`;
            } else {
                timeDisplay = `~${totalMinutes.toFixed(1)} minutes`;
            }

            // Format avgRewardTimeMinutes for display
            const avgTimeDisplay = avgRewardTimeMinutes >= 1
                ? avgRewardTimeMinutes.toFixed(2)
                : (avgRewardTimeSeconds).toFixed(1) + ' sec';
            const avgTimeUnit = avgRewardTimeMinutes >= 1 ? 'min' : '';

            remainingSupplyEl.innerHTML = `${remaining.toLocaleString(undefined, {maximumFractionDigits: 0})} <span class="unit">B0x <span class="detail">(~${blocksRemaining.toLocaleString()} blocks @ ${avgTimeDisplay} ${avgTimeUnit} per block = ${timeDisplay})</span></span>`;
        }

        // Update Mining Target (for reference, though not displayed in HTML)
        if (stats.miningTarget) {
            window.CURRENT_MINING_TARGET = stats.miningTarget;
        }

        // Update Last Base Block Number
        const lastBaseBlockEl = document.querySelector('.stat-value-lastBaseBlock');
        if (lastBaseBlockEl && stats.blockNumber) {
            lastBaseBlockEl.textContent = parseInt(stats.blockNumber);
        }

        // Update Absolute Max Supply (fixed value: 31,165,100 B0x)
        const absoluteMaxSupplyEl = document.querySelector('.stat-value-AbsoluteMaxSupply');
        if (absoluteMaxSupplyEl) {
            absoluteMaxSupplyEl.innerHTML = `${(31165100).toLocaleString()} <span class="unit">B0x</span>`;
        }

        // Update all mining and price stats
        try {
            await updateAllMiningStats();
            console.log('✓ All mining stats calculated and displayed');
        } catch (statsError) {
            console.warn('Failed to calculate all mining stats:', statsError);
            // Fallback to just hashrate if comprehensive update fails
            try {
                await calculateAndDisplayHashrate();
            } catch (hashrateError) {
                console.warn('Failed to calculate hashrate:', hashrateError);
            }
        }

        console.log('✓ Stats display updated successfully');

    } catch (error) {
        console.error('Error updating stats display:', error);
    }
}

/**
 * Helper function to get time ago from timestamp
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Human-readable time ago string
 */
function getTimeAgo(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const secondsAgo = now - timestamp;

    if (secondsAgo < 60) {
        return `${secondsAgo} seconds ago`;
    } else if (secondsAgo < 3600) {
        const minutes = Math.floor(secondsAgo / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (secondsAgo < 86400) {
        const hours = Math.floor(secondsAgo / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(secondsAgo / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

// =============================================================================
// HASHRATE AND MINING STATS FUNCTIONS
// =============================================================================

/**
 * Mining stats functions extracted from script.js
 *
 * These functions handle:
 * - Hashrate calculation from mining difficulty and time per epoch
 * - Formatting hashrate with appropriate units (H/s, KH/s, MH/s, etc.)
 * - Fetching mining data from contracts via multicall
 * - Updating DOM elements with calculated values
 *
 * Note: updateAllMinerInfo() from script.js is a large, complex function that:
 * - Fetches mined block data from remote sources and localStorage
 * - Processes mining transactions and calculates miner statistics
 * - Updates rich lists and distribution charts
 * - Can be integrated here if needed for stats display
 * Currently it remains in script.js due to its complexity and many dependencies
 */

// State variables for hashrate calculation
let prevHashrate = 0;
let prevTimeInFunc = Date.now();
export let formattedHashrate = '0 H/s';

/**
 * Sleep utility for async delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format hashrate with appropriate unit (H/s, KH/s, MH/s, etc.)
 * @param {number} hashrate - Hashrate in H/s
 * @returns {string} Formatted hashrate string with unit
 */
export function formatHashrate(hashrate) {
    const units = [
        { suffix: 'EH/s', divisor: 1e18 },
        { suffix: 'PH/s', divisor: 1e15 },
        { suffix: 'TH/s', divisor: 1e12 },
        { suffix: 'GH/s', divisor: 1e9 },
        { suffix: 'MH/s', divisor: 1e6 },
        { suffix: 'KH/s', divisor: 1e3 },
        { suffix: 'H/s', divisor: 1 }
    ];

    // Format value based on magnitude: >50 = 0 decimals, >10 = 1 decimal, <10 = 2 decimals
    const formatValue = (value) => {
        if (value > 50) return value.toFixed(0);
        if (value > 10) return value.toFixed(1);
        return value.toFixed(2);
    };

    for (const unit of units) {
        if (hashrate >= unit.divisor) {
            const value = hashrate / unit.divisor;
            return `${formatValue(value)} ${unit.suffix}`;
        }
    }

    return `${formatValue(hashrate)} H/s`;
}

/**
 * Calculate hashrate from mining parameters
 * Formula: hashrate = 2^22 * difficulty / time
 * @param {number} timePerEpoch - Average time in seconds per epoch
 * @param {number} miningDifficulty - Current mining difficulty
 * @returns {number} Calculated hashrate in H/s
 */
export function calculateHashrate(timePerEpoch, miningDifficulty) {
    console.log("calculateHashrate inputs - timePerEpoch:", timePerEpoch, "miningDifficulty:", miningDifficulty);

    // Constants
    const POWER_OF_22 = Math.pow(2, 22); // 2^22 = 4,194,304
    const DIVISOR = 524_288; // Given divisor

    // Validate inputs
    if (timePerEpoch <= 0) {
        throw new Error("TimePerEpoch must be greater than 0");
    }

    if (miningDifficulty <= 0) {
        throw new Error("Mining difficulty must be greater than 0");
    }

    // Adjust difficulty
    const adjustedDifficulty = miningDifficulty / DIVISOR;

    // Calculate hashrate: (2^22 * adjusted_difficulty) / time_per_epoch
    const hashrate = (POWER_OF_22 * adjustedDifficulty) / timePerEpoch;

    console.log("Calculated hashrate:", hashrate, "H/s");
    return hashrate;
}

/**
 * Calculate and display current network hashrate
 * Uses data from SUPER COMBINED MULTICALL (window.rewardStatsCache)
 * Updates formattedHashrate export variable
 * @returns {Promise<number|null>} Calculated hashrate or null on error
 */
export async function calculateAndDisplayHashrate() {
    const currentTime = Date.now();
    const timeDiff = currentTime - prevTimeInFunc;
    console.log("prevHashrate:", prevHashrate);

    // Throttle: Only run once every 120 seconds
    if (timeDiff < 120000 && prevHashrate != 0) {
        console.log("Throttled: calculateAndDisplayHashrate not called (ran recently)");
        return prevHashrate;
    }

    if (prevHashrate == 0) {
        console.log("First run: Previous hashrate = 0");
    }

    console.log("Running calculateAndDisplayHashrate");

    // Update the timestamp after execution
    prevTimeInFunc = Date.now();

    try {
        await sleep(500);

        // Get data from SUPER COMBINED MULTICALL cache (window.cachedContractStats)
        if (!window.cachedContractStats) {
            console.error("cachedContractStats not populated yet, cannot calculate hashrate");
            return null;
        }

        const cachedContractStats = window.cachedContractStats;

        // Validate required data is present
        if (!cachedContractStats.inflationMined || !cachedContractStats.miningDifficulty) {
            console.error("Missing required data in cachedContractStats");
            return null;
        }

        console.log("Using data from SUPER COMBINED MULTICALL (no separate RPC call needed)");

        const timePerEpoch = cachedContractStats.inflationMined.timePerEpoch;
        const miningDifficulty = cachedContractStats.miningDifficulty;

        console.log("TimePerEpoch:", timePerEpoch);
        console.log("getMiningDifficulty:", miningDifficulty);

        // Calculate and display hashrate
        const hashrate = calculateHashrate(timePerEpoch, miningDifficulty);

        console.log("=== Hashrate Calculation ===");
        console.log(`Time Per Epoch: ${timePerEpoch} seconds`);
        console.log(`Mining Difficulty: ${miningDifficulty}`);
        console.log(`Adjusted Difficulty: ${miningDifficulty / 524_288}`);
        console.log(`Calculated Hashrate: ${hashrate.toLocaleString()} H/s`);

        formattedHashrate = formatHashrate(hashrate);

        console.log("\n=== Formatted Hashrate ===");
        console.log(formattedHashrate);

        prevHashrate = hashrate;

        // Set estHashrate for miner-info calculations
        if (typeof window.setEstHashrate === 'function') {
            window.setEstHashrate(hashrate);
        }

        // Update DOM element if it exists
        const hashrateEl = document.getElementById('hashrate');
        if (hashrateEl) {
            hashrateEl.textContent = formattedHashrate;
        }

        return hashrate;

    } catch (error) {
        console.error("Error calculating hashrate:", error.message);
        await sleep(3500);
        return null;
    }
}

// =============================================================================
// ADDITIONAL MINING STATS FUNCTIONS
// =============================================================================

/**
 * Fetch price data from CoinGecko API with 5-minute cache
 * Updates global price variables
 * @returns {Promise<{wethPriceUSD: number, oxbtcPriceUSD: number}>}
 */
export async function fetchPriceData() {
    try {
        // Use cached price fetcher from utils.js
        const { getCoinGeckoPrices } = await import('./utils.js');
        const priceData = await getCoinGeckoPrices();

        const wethPrice = priceData.wethPriceUSD;
        const oxbtcPrice = priceData.oxbtcPriceUSD;

        console.log("WETH price USD:", wethPrice);
        console.log("0xBTC price USD:", oxbtcPrice);

        // Update window variables for backwards compatibility
        window.wethPriceUSD = wethPrice;
        window.oxbtcPriceUSD = oxbtcPrice;

        return { wethPriceUSD: wethPrice, oxbtcPriceUSD: oxbtcPrice };
    } catch (error) {
        console.error("Error fetching CoinGecko prices:", error);
        return { wethPriceUSD: 3000, oxbtcPriceUSD: 0.0 };
    }
}

/**
 * Fetches token statistics (holders and transfers) from RichList JSON
 * Uses primary URL with automatic fallback to backup URL
 * @returns {Promise<{TokenHolders: number|string, Transfers: number|string}>}
 */
export async function getTokenStats() {
    const primaryUrl = customDataSource + 'RichList_B0x_mainnet.json';
    const backupUrl = customBACKUPDataSource + 'RichList_B0x_mainnet.json';

    try {
        let response;
        try {
            // Try primary URL first
            response = await fetch(primaryUrl);
            // If primary fails, try backup URL
            if (!response.ok) {
                console.warn('Primary URL failed, trying backup...');
                response = await fetch(backupUrl);
            }
        } catch (error) {
            console.log("First failed to fetch primaryUrl in getTokenStats going to backup url");
            response = await fetch(backupUrl);
        }

        // If backup also fails, throw error
        if (!response.ok) {
            throw new Error('Both primary and backup URLs failed');
        }

        const data = await response.json();

        const TokenHolders = data.totalHolders;
        const Transfers = data.totalTransfers - data.totalMints;

        return {
            TokenHolders,
            Transfers
        };

    } catch (error) {
        console.error('Error fetching token stats from both URLs:', error);
        // Fallback to error message if both URLs fail
        return {
            TokenHolders: "Unable To Load",
            Transfers: "Unable To Load"
        };
    }
}

// Cache for B0x price calculations (5 minute TTL, persisted to localStorage)
const B0X_PRICE_CACHE_KEY = 'b0xPriceCache';
const B0X_PRICE_CACHE_TTL = 150000; // 2.5 minutes (150 seconds)

// Load cache from localStorage on module load
let b0xPriceCache = (() => {
    try {
        const stored = localStorage.getItem(B0X_PRICE_CACHE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Validate the cached data has required fields
            if (parsed.timestamp && parsed.ratioB0xTo0xBTC) {
                console.log("Loaded B0x price from localStorage");
                return parsed;
            }
        }
    } catch (e) {
        console.warn("Failed to load B0x price cache from localStorage:", e);
    }
    return { timestamp: 0, ratioB0xTo0xBTC: 0, usdCostB0x: 0 };
})();

/**
 * Save B0x price cache to localStorage
 * @param {Object} cache - Cache object to save
 */
function saveB0xPriceCache(cache) {
    try {
        localStorage.setItem(B0X_PRICE_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn("Failed to save B0x price cache to localStorage:", e);
    }
}

/**
 * Calculate B0x to 0xBTC ratio and USD price
 * Uses cached data from SUPER COMBINED MULTICALL when available
 * Falls back to direct RPC call if needed
 * Caches results for 5 minutes (persisted to localStorage)
 * @param {boolean} forceUpdate - Force a fresh calculation ignoring cache
 * @returns {Promise<{ratioB0xTo0xBTC: number, usdCostB0x: number}>}
 */
export async function calculateB0xPrice(forceUpdate = false) {
    try {
        const now = Date.now();
        const cacheAge = now - b0xPriceCache.timestamp;

        // Return cached values if cache is still valid and not forcing update
        if (!forceUpdate && b0xPriceCache.timestamp > 0 && cacheAge < B0X_PRICE_CACHE_TTL) {
            const remainingSeconds = Math.ceil((B0X_PRICE_CACHE_TTL - cacheAge) / 1000);
            console.log(`Using cached B0x price (refreshes in ${remainingSeconds}s)`);

            // Update USD price with current 0xBTC price (might have changed)
            const oxbtcPrice = window.oxbtcPriceUSD || 0;
            window.ratioB0xTo0xBTC = b0xPriceCache.ratioB0xTo0xBTC;
            window.usdCostB0x = b0xPriceCache.ratioB0xTo0xBTC * oxbtcPrice;

            return { ratioB0xTo0xBTC: window.ratioB0xTo0xBTC, usdCostB0x: window.usdCostB0x };
        }

        let swapResult = null;

        // First, try to use cached data from SUPER COMBINED MULTICALL (getRewardStats)
        if (window.rewardStatsCache &&
            window.rewardStatsCache.data &&
            window.rewardStatsCache.data.tokenSwapperResult &&
            (now - window.rewardStatsCache.timestamp) < B0X_PRICE_CACHE_TTL) {

            console.log("Using tokenSwapper result from SUPER COMBINED MULTICALL");
            swapResult = window.rewardStatsCache.data.tokenSwapperResult;
        }

        // If no cached multicall data, make direct RPC call
        if (!swapResult) {
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

            const provider = new ethers.providers.JsonRpcProvider(customRPC);
            const tokenSwapperContract = new ethers.Contract(
                contractAddress_Swapper,
                tokenSwapperABI,
                provider
            );

            const tokenInputAddress = tokenAddresses['B0x'];
            const amountToSwap = BigInt(10 ** 18);

            swapResult = await tokenSwapperContract.callStatic.getOutput(
                tokenAddresses['0xBTC'],
                tokenAddresses['B0x'],
                tokenInputAddress,
                hookAddress,
                amountToSwap
            );
        }

        // Convert to proper numbers
        const amountOutNumber = Number(swapResult) / (10 ** 8); // 0xBTC has 8 decimals
        const amountToSwapNumber = 1; // We're calculating for 1 B0x (10^18 / 10^18)
        const exchangeRate = amountOutNumber / amountToSwapNumber; // 0xBTC per B0x

        // Get current 0xBTC price
        const oxbtcPrice = window.oxbtcPriceUSD || 0;

        // Set values directly on window object for global access
        window.ratioB0xTo0xBTC = exchangeRate;
        window.usdCostB0x = exchangeRate * oxbtcPrice;

        // Update cache and persist to localStorage
        b0xPriceCache = {
            timestamp: now,
            ratioB0xTo0xBTC: exchangeRate,
            usdCostB0x: window.usdCostB0x
        };
        saveB0xPriceCache(b0xPriceCache);

        console.log("B0x to 0xBTC ratio:", window.ratioB0xTo0xBTC);
        console.log("USD cost of B0x:", window.usdCostB0x);

        if (oxbtcPrice === 0) {
            console.warn("Warning: 0xBTC price is 0, USD cost will be 0");
        }

        return { ratioB0xTo0xBTC: window.ratioB0xTo0xBTC, usdCostB0x: window.usdCostB0x };
    } catch (error) {
        console.error("Error calculating B0x price:", error);
        // Try to return cached values on error
        if (b0xPriceCache.ratioB0xTo0xBTC > 0) {
            console.log("Returning stale cached B0x price due to error");
            const oxbtcPrice = window.oxbtcPriceUSD || 0;
            window.ratioB0xTo0xBTC = b0xPriceCache.ratioB0xTo0xBTC;
            window.usdCostB0x = b0xPriceCache.ratioB0xTo0xBTC * oxbtcPrice;
            return { ratioB0xTo0xBTC: window.ratioB0xTo0xBTC, usdCostB0x: window.usdCostB0x };
        }
        return { ratioB0xTo0xBTC: 0, usdCostB0x: 0 };
    }
}

/**
 * Get mining target from contract
 * @param {Object} provider - Ethers provider
 * @returns {Promise<string>} Mining target as string
 */
export async function getTarget(provider) {
    const contractABI = [{
        "inputs": [],
        "name": "miningTarget",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }];

    const contract = new ethers.Contract(ProofOfWorkAddresss, contractABI, provider);
    const miningTarget = await contract.miningTarget();
    return miningTarget.toString();
}

/**
 * Get mining difficulty from target
 * Formula: difficulty = (2^253 / target) / 524,288
 * @param {Object} provider - Ethers provider
 * @returns {Promise<string>} Difficulty as string
 */
export async function getDifficulty(provider) {
    const target = parseFloat(await getTarget(provider));
    const difficulty = ((2 ** 253) / target) / 524_288;

    // Update DOM if element exists
    const difficultyInput = document.getElementById("difficulty-input");
    if (difficultyInput) {
        difficultyInput.value = difficulty;
    }

    return difficulty.toString();
}

/**
 * Get epoch count from contract
 * @param {Object} provider - Ethers provider
 * @returns {Promise<string>} Epoch count as string
 */
export async function getEpochCount(provider) {
    const contractABI = [{
        "inputs": [],
        "name": "epochCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }];

    const contract = new ethers.Contract(ProofOfWorkAddresss, contractABI, provider);
    const epochCount = await contract.epochCount();
    console.log("epochCount:", epochCount);
    return epochCount.toString();
}

/**
 * Get average reward time and inflation data from contract
 * @param {Object} provider - Ethers provider
 * @returns {Promise<Object>} Inflation data object
 */
export async function getAvgRewardTime(provider) {
    const contractABI = [{
        "inputs": [],
        "name": "inflationMined",
        "outputs": [
            { "internalType": "uint256", "name": "YearlyInflation", "type": "uint256" },
            { "internalType": "uint256", "name": "EpochsPerYear", "type": "uint256" },
            { "internalType": "uint256", "name": "RewardsAtTime", "type": "uint256" },
            { "internalType": "uint256", "name": "TimePerEpoch", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }];

    const contract = new ethers.Contract(ProofOfWorkAddresss, contractABI, provider);
    const result = await contract.inflationMined();

    return {
        YearlyInflation: result[0].toString(),
        EpochsPerYear: result[1].toString(),
        RewardsAtTime: result[2].toString(),
        TimePerEpoch: result[3].toString()
    };
}

/**
 * Get reward per solve
 * @returns {Promise<number>} Reward per solve (currently uses inflationMined data)
 */
export async function getRewardPerSolve(provider) {
    try {
        const inflationData = await getAvgRewardTime(provider);
        // RewardsAtTime is the current reward per solve
        const rewardPerSolve = parseFloat(inflationData.RewardsAtTime) / 1e18;
        return rewardPerSolve;
    } catch (error) {
        console.error("Error getting reward per solve:", error);
        return 50; // Fallback value
    }
}

/**
 * Get blocks to readjust from contract
 * @param {Object} provider - Ethers provider
 * @returns {Promise<string>} Blocks to readjust as string
 */
export async function getBlocksToReadjust(provider) {
    const contractABI = [{
        "inputs": [],
        "name": "blocksToReadjust",
        "outputs": [{ "internalType": "uint256", "name": "blocks", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }];

    const contract = new ethers.Contract(ProofOfWorkAddresss, contractABI, provider);
    const blocks = await contract.blocksToReadjust();
    return blocks.toString();
}

/**
 * Get time until emergency adjustment
 * @param {Object} provider - Ethers provider
 * @returns {Promise<string>} Seconds until emergency adjustment
 */
export async function getTimeEmergency(provider) {
    const contractABI = [{
        "inputs": [],
        "name": "seconds_Until_adjustmentSwitch",
        "outputs": [{ "internalType": "uint256", "name": "secs", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }];

    const contract = new ethers.Contract(ProofOfWorkAddresss, contractABI, provider);
    const secs = await contract.seconds_Until_adjustmentSwitch();
    return secs.toString();
}

/**
 * Get reward era from contract
 * @param {Object} provider - Ethers provider
 * @returns {Promise<string>} Reward era as string
 */
export async function getRewardEra(provider) {
    const contractABI = [{
        "inputs": [],
        "name": "rewardEra",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }];

    const contract = new ethers.Contract(ProofOfWorkAddresss, contractABI, provider);
    const rewardEra = await contract.rewardEra();
    return rewardEra.toString();
}

/**
 * Get token holders count
 * @returns {Promise<number>} Token holders count (placeholder - needs API integration)
 */
export async function getTokenHolders() {
    // TODO: Integrate with token holder API
    // This is a placeholder that should be replaced with actual API call
    return await getTokenStats();
}


// Rate limiting for stats updates
let lastStatsUpdate = 0;
let cachedStats = null;
const STATS_UPDATE_COOLDOWN = 180000; // 180 seconds in milliseconds

/**
 * Get time remaining until next stats update is allowed
 * @returns {number} Seconds remaining (0 if update is available)
 */
export function getStatsUpdateCooldown() {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastStatsUpdate;
    const remainingTime = Math.max(0, STATS_UPDATE_COOLDOWN - timeSinceLastUpdate);
    return Math.ceil(remainingTime / 1000);
}

/**
 * Comprehensive stats update function
 * Fetches all mining and price stats and updates the display
 * Rate limited to once every 180 seconds to reduce RPC load
 * @param {boolean} forceUpdate - Force update even if cooldown hasn't passed
 * @returns {Promise<Object>} Object containing all stats
 */
export async function updateAllMiningStats(forceUpdate = false) {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastStatsUpdate;

    // Return cached stats if cooldown hasn't passed and not forcing update
    if (!forceUpdate && cachedStats && timeSinceLastUpdate < STATS_UPDATE_COOLDOWN) {
        const remainingTime = Math.ceil((STATS_UPDATE_COOLDOWN - timeSinceLastUpdate) / 1000);
        console.log(`Using cached stats (updates again in ${remainingTime}s)`);

        // Still update the display with cached data
        updateMiningStatsDisplay(cachedStats);
        return cachedStats;
    }

    console.log('Updating all mining stats...');

    try {
        // Ensure APY is calculated by calling getRewardStats
        // This calls GetRewardAPY internally which sets window.APYFINAL
        if (window.getRewardStats) {
            try {
                await window.getRewardStats();
                console.log('✓ APY calculated:', window.APYFINAL);
            } catch (apyError) {
                console.warn('Failed to calculate APY:', apyError);
            }
        }

        // Use multicall to fetch contract stats efficiently (single RPC call)
        const [
            contractStats,
            priceData,
            tokenHolders
        ] = await Promise.all([
            window.GetContractStatsWithMultiCall ? window.GetContractStatsWithMultiCall() : null,
            fetchPriceData(),
            getTokenHolders()
        ]);

        if (!contractStats) {
            console.error('Failed to fetch contract stats via multicall');
            return null;
        }

        // Calculate B0x price after we have 0xBTC price
        const b0xPriceData = await calculateB0xPrice();

        // Calculate hashrate
        await calculateAndDisplayHashrate();

        // Extract values from multicall result
        const rewardPerSolve = parseFloat(contractStats.inflationMined.rewardsAtTime) / 1e18;
        const avgRewardTime = parseFloat(contractStats.inflationMined.timePerEpoch);
        // miningDifficulty from contract needs to be divided by 524288
        const difficulty = parseFloat(contractStats.miningDifficulty) / 524288;

        const stats = {
            price: b0xPriceData.usdCostB0x,
            wethPriceUSD: priceData.wethPriceUSD,
            oxbtcPriceUSD: priceData.oxbtcPriceUSD,
            ratioB0xTo0xBTC: b0xPriceData.ratioB0xTo0xBTC,
            apy: window.APYFINAL || 0,
            difficulty: difficulty,
            hashrate: formattedHashrate,
            avgRewardTime: avgRewardTime,
            rewardPerSolve: rewardPerSolve,
            epochCount: parseInt(contractStats.epochCount),
            blocksToReadjust: parseInt(contractStats.blocksToReadjust),
            timeEmergency: parseInt(contractStats.secondsUntilSwitch),
            rewardEra: parseInt(contractStats.rewardEra),
            tokenHolders: tokenHolders.TokenHolders,
            tokenTransfers: tokenHolders.Transfers,
            // Additional multicall data
            blockNumber: contractStats.blockNumber,
            miningTarget: contractStats.miningTarget,
            tokensMinted: contractStats.tokensMinted,
            maxSupplyForEra: contractStats.maxSupplyForEra,
            latestDiffPeriod: contractStats.latestDiffPeriod,
            latestDiffPeriod2: contractStats.latestDiffPeriod2,
            readjustDifficulty: contractStats.readjustDifficulty
        };

        // Update DOM elements
        updateMiningStatsDisplay(stats);

        // Cache the stats and update timestamp
        cachedStats = stats;
        lastStatsUpdate = now;

        console.log('✓ All mining stats updated successfully using multicall (cached for 180s)');
        return stats;

    } catch (error) {
        console.error('Error updating all mining stats:', error);
        // Return cached stats if available, even on error
        if (cachedStats) {
            console.log('Returning cached stats due to error');
            return cachedStats;
        }
        return null;
    }
}

/**
 * Update DOM elements with mining stats
 * @param {Object} stats - Stats object from updateAllMiningStats
 */
export function updateMiningStatsDisplay(stats) {
    if (!stats) return;

    try {
        // Update price
        const priceEl = document.querySelector('.stat-value-price');
        if (priceEl && stats.price) {
            priceEl.innerHTML = `${stats.price.toFixed(4)} <span class="unit">$</span>`;
        }

        // Update APY
        const apyEl = document.querySelector('.stat-value-stakeAPY');
        if (apyEl && stats.apy !== undefined && stats.apy !== null) {
            apyEl.innerHTML = `${stats.apy.toFixed(2)} <span class="unit">%</span>`;
        }

        // Update difficulty
        const difficultyEl = document.querySelector('.stat-value-difficulty');
        if (difficultyEl && stats.difficulty) {
            difficultyEl.innerHTML = `${stats.difficulty.toLocaleString(undefined, {maximumFractionDigits: 2})} <span class="detail">(mining difficulty)</span>`;
        }

        // Update hashrate
        const hashrateEl = document.querySelector('.stat-value-hashrate');
        if (hashrateEl && stats.hashrate) {
            hashrateEl.innerHTML = `${stats.hashrate} <span class="detail">(network hashrate)</span>`;
        }

        // Update average reward time
        const avgRewardEl = document.querySelector('.stat-value-averageRewardTime');
        if (avgRewardEl && stats.avgRewardTime) {
            avgRewardEl.innerHTML = `${stats.avgRewardTime.toFixed(1)} <span class="detail">seconds</span>`;
        }

        // Update reward per solve
        const rewardPerSolveEl = document.querySelector('.stat-value-rewardPerSolve');
        if (rewardPerSolveEl && stats.rewardPerSolve) {
            rewardPerSolveEl.innerHTML = `${stats.rewardPerSolve.toFixed(2)} <span class="detail">B0x per solve</span>`;
        }

        // Update token holders (if element exists)
        const holdersEl = document.querySelector('.stat-value-tokenHolders');
        console.log("HOLDERS: ",stats.tokenHolders);
        if (holdersEl && stats.tokenHolders) {
            holdersEl.innerHTML = `${stats.tokenHolders.toLocaleString()} <span class="unit">holders</span>`;
        }
        // Update token transfers (if element exists)
        const txsEl = document.querySelector('.stat-value-tokenTransfers');
        if (txsEl && stats.tokenTransfers) {
            txsEl.innerHTML = `${stats.tokenTransfers.toLocaleString()} <span class="unit">transfers</span>`;
        }

        // Update Mining Calculator values
        // Calculate difficulty from miningTarget: difficulty = (2^253 / miningTarget) / 524288
        let currentDiff = stats.difficulty;
        if (stats.miningTarget && !currentDiff) {
            const miningTargetBig = BigInt(stats.miningTarget);
            if (miningTargetBig > 0n) {
                const twoPow253 = BigInt(2) ** BigInt(253);
                currentDiff = Number(twoPow253 / miningTargetBig) / 524288;
            }
        }

        // Calculate next difficulty from readjustDifficulty (raw value / 524288)
        let nextDiff = 0;
        if (stats.readjustDifficulty) {
            nextDiff = parseFloat(stats.readjustDifficulty) / 524288;
        }

        // Update difficulty display with next diff info
        const difficultyEl2 = document.querySelector('.stat-value-difficulty');
        if (difficultyEl2 && currentDiff) {
            // Format: toFixed(0) if >= 100, toFixed(3) if < 100, then toLocaleString
            const formatDiff = (diff) => {
                if (diff >= 100) {
                    return parseFloat(diff).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                } else {
                    return parseFloat(diff).toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                }
            };
            difficultyEl2.innerHTML = `${formatDiff(currentDiff)} <span class="detail">(next: ${formatDiff(nextDiff)})</span>`;
        }

        // Update average reward time display with unit
        const avgRewardEl2 = document.querySelector('.stat-value-averageRewardTime');
        if (avgRewardEl2 && stats.avgRewardTime) {
            // Convert to human readable time
            const avgTime = stats.avgRewardTime;
            let displayValue, displayUnit;
            if (avgTime < 60) {
                displayValue = avgTime.toFixed(1);
                displayUnit = 'seconds';
            } else if (avgTime < 3600) {
                displayValue = (avgTime / 60).toFixed(2);
                displayUnit = 'minutes';
            } else {
                displayValue = (avgTime / 3600).toFixed(2);
                displayUnit = 'hours';
            }
            avgRewardEl2.innerHTML = `${displayValue} <span class="detail avgRewardUnit">${displayUnit}</span>`;
        }

        // Set mining calculator values
        if (currentDiff) {
            setCurrentDifficulty(currentDiff);
        }
        if (nextDiff) {
            setNextDifficulty(nextDiff);
        }
        if (stats.rewardPerSolve) {
            setRewardPerSolve(stats.rewardPerSolve);
        }
        if (stats.blocksToReadjust) {
            setBlocksToGo(stats.blocksToReadjust);
        }
        if (stats.avgRewardTime) {
            // Store the raw value for calculations
            setAvgRewardTime(stats.avgRewardTime < 60 ? stats.avgRewardTime : stats.avgRewardTime / 60);
        }

        // Update difficulty input and trigger calculation
        const difficultyInput = document.getElementById('difficulty-input');
        if (difficultyInput && currentDiff) {
            // Format: toFixed(0) if >= 10, toFixed(2) if < 10
            difficultyInput.value = currentDiff >= 10 ? parseFloat(currentDiff).toFixed(0) : parseFloat(currentDiff).toFixed(2);
        }

        // Trigger mining calculator recalculation
        try {
            calculateMining();
        } catch (calcError) {
            console.warn('Mining calculator recalculation failed:', calcError);
        }

        console.log('✓ Mining stats display updated');

    } catch (error) {
        console.error('Error updating mining stats display:', error);
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    // Notifications
    hideNotification,
    showSuccessNotification,
    showSuccessNotificationTop,
    showErrorNotification,
    showWarningNotification,
    showInfoNotification,
    showToast,
    showAlert,
    showSuccessMessage,

    // Loading widgets
    showLoadingWidget,
    updateLoadingStatusWidget,
    setLoadingProgress,
    hideLoadingWidget,
    updateLoadingStatus,
    showLoadingScreen,
    hideLoadingScreen,

    // Tab switching
    switchTab,
    switchTabForStats,
    showStatsPageDirect,
    switchTab2,
    updateURL,

    // Wallet UI
    updateWalletUI,
    displayWalletBalances,
    displayWalletBalancesETH,

    // Widget updates
    updateWidget,
    handleWidgetVisibility,

    // Token icons
    updateTokenIconCore,
    updateTokenIcon,
    updateTokenIconETH,
    updateTokenIconCreate,
    updateTokenSelection,
    initTokenIconListeners,

    // Token filters
    filterTokenOptionsCreate,
    filterTokenOptionsSwap,
    filterTokenOptionsSwapETH,

    // Position info
    updatePositionInfoMAIN_STAKING,
    updatePositionInfoMAIN_UNSTAKING,
    updatePositionInfo,
    updateTotalLiqIncrease,
    updatePercentage,
    updateStakePercentage,

    // Staking stats
    updateStakingStats,
    updateStakingValues,

    // Stats display
    updateStatsDisplay,
    getTokenStats,
    fetchPriceData,
    calculateB0xPrice,

    // Formatting
    formatExactNumber,
    formatExactNumberWithCommas,
    formatNumber,
    formatBalance,
    truncateAddress,
    formatTime,

    // Dropdowns
    updatePositionDropdown,

    // Tables
    renderTable2,
    renderPagination2,
    renderTable,
    renderPagination,

    // Rich List Data Loading
    loadData2,
    loadData,

    // Rich List Controls
    changePage,
    changePage2,
    filterData,
    filterData2,
    initRichListEventListeners
};
