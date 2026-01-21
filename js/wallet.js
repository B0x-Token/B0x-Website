// ============================================================================
// B0x Website Wallet Module
// ============================================================================
// This module handles all wallet connection, network switching, and wallet
// state management functionality for the B0x DApp.
// ============================================================================

import {
    defaultRPC_Base,
    defaultRPC_ETH,
} from './config.js';
import {totalStakedAmounts, resetTotalStakedAmounts} from './positions.js';
import {updateStakingValues} from './staking.js';
import { showErrorNotification } from './ui.js';
import {maybeRestoreDefaultAddressesfromContract} from './settings.js';
// ============================================================================
// WALLET STATE MANAGEMENT
// ============================================================================

/**
 * Global wallet connection state
 */
export let walletConnected = false;
export let userAddress = null;

/**
 * Provider and signer instances for Base network
 */
export let provider = "";
export let signer = "";

/**
 * Provider and signer instances for Ethereum network
 */
export let providerETH = "";
export let signerETH = "";

/**
 * Network RPC URLs
 */
export let customRPC = defaultRPC_Base;
export let customRPC_ETH = defaultRPC_ETH;

/**
 * Connection attempt tracking
 */
let attemptf2f21 = 0;
let timeoutFailures = 0;
let previousAct = "";

/**
 * Connection state for retry logic
 */
let connectionState = {
    lastStep: '',
    isRecovering: false
};

/**
 * Connection lock to prevent simultaneous connection attempts
 */
let isConnecting = false;



/**
 * Wait for wallet provider to be injected AND responsive
 * @param {number} maxWaitMs - Maximum time to wait for provider
 * @returns {Promise<boolean>} True if provider is ready
 */
async function waitForWalletReady(maxWaitMs = 5000) {
    const startTime = Date.now();

    // Listen for ethereum#initialized event (Rabby mobile)
    const initPromise = new Promise((resolve) => {
        if (window.ethereum) {
            resolve(true);
            return;
        }
        
        const handler = () => resolve(true);
        window.addEventListener('ethereum#initialized', handler, { once: true });
        
        setTimeout(() => {
            window.removeEventListener('ethereum#initialized', handler);
            resolve(false);
        }, maxWaitMs);
    });

    // Poll for wallet injection (fallback)
    const pollPromise = (async () => {
        while (Date.now() - startTime < maxWaitMs) {
            if (window.ethereum) {
                // Verify wallet provider responds (not user approval)
                try {
                    await Promise.race([
                        window.ethereum.request({ method: 'eth_chainId' }),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('timeout')), 500)
                        )
                    ]);
                    return true;
                } catch (e) {
                    // Provider not ready yet, continue polling
                }
            }
            await new Promise(r => setTimeout(r, 200));
        }
        return false;
    })();

    return Promise.race([initPromise, pollPromise]);
}
// ============================================================================
// WALLET STATE SETTERS
// ============================================================================

/**
 * Update wallet connection state
 * @param {boolean} connected - Connection status
 */
export function setWalletConnected(connected) {
    walletConnected = connected;
}

/**
 * Update user address
 * @param {string} address - User's wallet address
 */
export function setUserAddress(address) {
    userAddress = address;
}

/**
 * Update Base network provider and signer
 * @param {Object} newProvider - Ethers provider instance
 * @param {Object} newSigner - Ethers signer instance
 */
export function setProvider(newProvider, newSigner = null) {
    provider = newProvider;
    if (newSigner !== null) {
        signer = newSigner;
    }
}

/**
 * Update Ethereum network provider and signer
 * @param {Object} newProvider - Ethers provider instance
 * @param {Object} newSigner - Ethers signer instance
 */
export function setProviderETH(newProvider, newSigner = null) {
    providerETH = newProvider;
    if (newSigner !== null) {
        signerETH = newSigner;
    }
}

/**
 * Update signer only (for window.signer setter)
 * @param {Object} newSigner - Ethers signer instance
 */
export function setSigner(newSigner) {
    signer = newSigner;
}

/**
 * Update ETH signer only (for window.signerETH setter)
 * @param {Object} newSigner - Ethers signer instance
 */
export function setSignerETH(newSigner) {
    signerETH = newSigner;
}

/**
 * Update custom RPC URLs
 * @param {string} baseRPC - Base network RPC URL
 * @param {string} ethRPC - Ethereum network RPC URL
 */
export function setCustomRPC(baseRPC, ethRPC) {
    if (baseRPC) customRPC = baseRPC;
    if (ethRPC) customRPC_ETH = ethRPC;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep utility for delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// WALLET CONNECTION FUNCTIONS
// ============================================================================

/**
 * Check if wallet was previously connected and auto-connect
 * Does minimal setup quickly, data loading happens in background
 */
export async function checkWalletConnection() {
    console.log("Checking wallet connection");
    if (typeof window.ethereum !== 'undefined' && localStorage.getItem('walletConnected') === 'true') {
        try {
            // Add timeout to prevent hanging if wallet extension isn't fully loaded
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Wallet request timed out')), 2000)
            );

            const accounts = await Promise.race([
                window.ethereum.request({ method: 'eth_accounts' }),
                timeoutPromise
            ]);

            if (accounts.length > 0) {
                // Quick minimal setup - don't block on full connectWallet
                userAddress = accounts[0];
                window.userAddress = accounts[0]; // Set window.userAddress for global access
                walletConnected = true;
                window.walletConnected = true;
                provider = new ethers.providers.Web3Provider(window.ethereum);
                window.provider = provider;
                signer = provider.getSigner();
                window.signer = signer;

                // Update UI immediately
                await updateWalletUI(userAddress, true);

                // Show loading state in position selectors during auto-reconnect
                if (window.showPositionsLoadingState) {
                    console.log("SHowPositionLoadingright?");
                    window.showPositionsLoadingState();
                }

                // Fetch balances immediately (uses multicall - single RPC call)
                if (window.fetchBalances) {
                    window.fetchBalances().catch(e => console.warn('Initial fetchBalances:', e));
                }

                // Run full data loading in background (non-blocking)
                connectWallet().catch(e => console.warn('Background wallet data loading:', e));
            }
        } catch (error) {
            if (error.message === 'Wallet request timed out') {
                console.warn('Wallet auto-connect timed out - extension may still be loading. User can connect manually.');
            } else {
                console.error('Error checking wallet connection:', error);
            }
        }
    }
}

/**
 * Quick wallet connection (simplified flow)
 * @returns {Promise<string|null>} User address or null
 */
export async function quickconnectWallet() {
    console.log("Quick Connect Wallet");

    if (walletConnected) {
        console.log('Wallet already connected');
        return userAddress;
    }

    // Check if connection is already in progress
    if (isConnecting) {
        console.log('Connection already in progress, ignoring duplicate call');
        return null;
    }

    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask or Rabby wallet!');
        return null;
    }

    // Set connection lock
    isConnecting = true;

    try {
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (accounts.length > 0) {
            // Switch to Base network
            await switchToBase();
            userAddress = accounts[0];
            walletConnected = true;

            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', userAddress);

            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();

            updateWalletUI(userAddress, true);

            await switchToEthereum();

            // Set up event listeners for account changes
            setupWalletListeners();

            // Note: The following functions need to be called from the main app
            // They are imported there and called after quickconnectWallet completes:
            // - await fetchBalances();
            // - await fetchBalancesETH();
            // - getTokenIDsOwnedByMetamask();
            // - await checkAdminAccess();
            // - await loadPositionsIntoDappSelections();
            // - await throttledGetSqrtRtAndPriceRatio("ConnectWallet");
            // - await getRewardStats();

            // Release connection lock on success
            isConnecting = false;

            return userAddress;
        }
    } catch (error) {
        handleWalletError(error);

        // Release connection lock on error
        isConnecting = false;

        return null;
    }
}

/**
 * Wrap network-sensitive operations with retry logic
 * @param {Function} fn - Function to execute with retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {string} stepName - Name of the step for logging
 * @returns {Promise<any>} Result of the function
 */
async function withNetworkRetry(fn, maxRetries = 3, stepName = '') {
    for (let i = 0; i < maxRetries; i++) {
        try {
            connectionState.lastStep = stepName;
            return await fn();
        } catch (error) {
            if (error.code === 'NETWORK_ERROR' && i < maxRetries - 1) {
                console.log(`Network error at step "${stepName}", retrying... (${i + 1}/${maxRetries})`);
                await sleep(1000 * i);
                continue;
            }
            throw error;
        }
    }
}

/**
 * Main wallet connection function with full initialization flow
 * Connects wallet and initializes all app data
 *
 * @param {string|null} resumeFromStep - Optional step to resume from on retry
 * @returns {Promise<string|null>} User address or null
 */
export async function connectWallet(resumeFromStep = null) {
    console.log("Connect Wallet", resumeFromStep ? `(resuming from: ${resumeFromStep})` : '');

    // Check if already connected
    if (walletConnected && !resumeFromStep) {
        console.log('Wallet already connected');
                // This ensures getRewardStats uses the correct addresses on first load
           console.log("LOGGGA");
            try {
                await maybeRestoreDefaultAddressesfromContract();
                console.log('✓ Reward token addresses loaded');
            } catch (e) {
                console.warn('restoreAddresses error:', e);
            }
        return userAddress;
    }

    // Check if connection is already in progress
    if (isConnecting && !resumeFromStep) {
        console.log('Connection already in progress, ignoring duplicate call');
        return null;
    }

    // Set connection lock
    isConnecting = true;

    // Wait for wallet extension to be fully ready (handles fresh Chrome instances)
    console.log('Waiting for wallet to be ready...');
    const isReady = await waitForWalletReady();
    

    if (!isReady) {
        alert('Wallet not detected. Please install a Web3 wallet.');
        return;
    }


    console.log('Wallet is ready');

    try {
        // Request accounts - wallet is ready so this should work
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (!accounts || accounts.length === 0) return null;

        attemptf2f21 = 0;
        userAddress = accounts[0];
        window.userAddress = userAddress;
        walletConnected = true;

        previousAct = userAddress;

        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', userAddress);

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        await updateWalletUI(userAddress, true);
        setupWalletListeners();
        await switchToBase();


        // PARALLEL GROUP 1: Fetch balances from both chains simultaneously
        console.log("Fetching balances in parallel...");
        const balancePromises = [];

        if (window.fetchBalances && userAddress) {
            balancePromises.push(
                switchToBase().then(() =>
                    withNetworkRetry(() => window.fetchBalances(
                        userAddress,
                        window.tokenAddresses,
                        window.tokenAddressesDecimals,
                        window.fetchTokenBalanceWithEthers,
                        window.displayWalletBalances,
                        provider,
                        signer,
                        walletConnected,
                        connectWallet
                    ), 2, 'fetchBalances')
                ).catch(e => console.warn('fetchBalances error:', e))
            );
        }

        // Note: ETH balances fetched separately due to network switching
        // Can be deferred or run after main content loads

        await Promise.all(balancePromises);
        await switchToBase();

        // FIRST: Restore reward token addresses from contract if needed (before getRewardStats)
        // This ensures getRewardStats uses the correct addresses on first load
        if (window.maybeRestoreDefaultAddressesfromContract) {
            try {
                await withNetworkRetry(() => window.maybeRestoreDefaultAddressesfromContract(), 2, 'restoreAddresses');
                console.log('✓ Reward token addresses loaded #2');
            } catch (e) {
                console.warn('restoreAddresses error:', e);
            }
        } else {
            console.log("NO window.maybeRestoreDefaultAddressesfromContract");
        }

        // PARALLEL GROUP 2: Run independent data fetches simultaneously
        console.log("Fetching wallet data in parallel...");
        const dataPromises = [];

        // Get reward stats (includes contract stats via multicall)
        if (window.getRewardStats) {
            dataPromises.push(
                withNetworkRetry(() => window.getRewardStats(), 2, 'getRewardStats')
                    .catch(e => console.warn('getRewardStats error:', e))
            );
        }

        // Check admin access (independent)
        if (window.checkAdminAccess) {
            dataPromises.push(
                withNetworkRetry(() => window.checkAdminAccess(), 2, 'checkAdmin')
                    .catch(e => console.warn('checkAdminAccess error:', e))
            );
        }

        // Get price ratio (independent)
        if (window.throttledGetSqrtRtAndPriceRatio) {
            dataPromises.push(
                withNetworkRetry(() => window.throttledGetSqrtRtAndPriceRatio("ConnectWallet"), 2, 'getPriceData')
                    .catch(e => console.warn('getPriceData error:', e))
            );
        }

        await Promise.all(dataPromises);

        // SEQUENTIAL: These depend on previous data
        // Show loading state in position selectors during initial load
        if (window.showPositionsLoadingState && window.getIsInitialPositionLoad && window.getIsInitialPositionLoad()) {
            window.showPositionsLoadingState();
        }

        // Get token IDs (needs position data from runContinuous)
        if (window.getTokenIDsOwnedByMetamask && !window.positionsLoaded) {
            try {
                
                    console.log("SwitchTab position Loaded2");
                await withNetworkRetry(() => window.getTokenIDsOwnedByMetamask(true), 2, 'getTokenIDs');
                window.positionsLoaded = true;
            } catch (e) {
                console.warn('getTokenIDs error:', e);
            }
        }

        // Clear initial load flag BEFORE loading positions into UI
        if (window.setIsInitialPositionLoad) {
            window.setIsInitialPositionLoad(false);
        }


        // Fetch ETH balances in background (non-blocking)
        if (window.fetchBalancesETH && userAddress) {
            switchToEthereum().then(() =>
                withNetworkRetry(() => window.fetchBalancesETH(
                    userAddress,
                    window.tokenAddressesETH,
                    window.tokenAddressesDecimalsETH,
                    window.fetchTokenBalanceWithEthersETH,
                    window.displayWalletBalancesETH,
                    providerETH,
                    signerETH,
                    walletConnected,
                    connectWallet
                ), 2, 'fetchBalancesETH')
            ).then(() => switchToBase())
            .catch(e => console.warn('fetchBalancesETH error:', e));
        }

        console.log('✓ Wallet connection complete');
        connectionState.isRecovering = false;
        connectionState.lastStep = 'completed';

        
            // Update all position info displays for the new account
            if (window.updatePositionInfo) {
                window.updatePositionInfo();
            }
            if (window.updateStakingDepositPositionInfo) {
                window.updateStakingDepositPositionInfo();
            }
            if (window.updatePositionInfoMAIN_UNSTAKING) {
                window.updatePositionInfoMAIN_UNSTAKING();
            }
            if (window.updateStakePositionInfo) {
                window.updateStakePositionInfo();
            }
            if (window.updatePositionInfoStaking) {
                window.updatePositionInfoStaking();
            }
            if (window.updatePositionInfoUnstaking) {
                window.updatePositionInfoUnstaking();
            }
            if (window.updatePositionInfoIncreaseStaking) {
                window.updatePositionInfoIncreaseStaking();
            }
            if (window.updatePositionInfoDecreaseStaking) {
                window.updatePositionInfoDecreaseStaking();
            }
            if (window.updatePositionInfoIncrease) {
                window.updatePositionInfoIncrease();
            }
            if (window.updatePositionInfoDecrease) {
                window.updatePositionInfoDecrease();
            }

        // Release connection lock on success
        isConnecting = false;
        attemptf2f21 = 0;

        return userAddress;

    } catch (error) {
        if (error.code === 'NETWORK_ERROR' && !connectionState.isRecovering) {
            console.log('Network error detected, attempting recovery...');
            connectionState.isRecovering = true;
            await sleep(2000);
            return connectWallet(connectionState.lastStep);
        }

        console.log("Error25: ", error);
        handleWalletError(error);
        connectionState.isRecovering = false;

        // Release connection lock on error
        isConnecting = false;

        return null;
    }
}

// ============================================================================
// NETWORK SWITCHING FUNCTIONS
// ============================================================================

/**
 * Switch to Ethereum mainnet
 * @param {number} retryCount - Current retry attempt
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<void>}
 */
export async function switchToEthereum(retryCount = 0, maxRetries = 5) {
    const EthereumConfig = {
        chainId: '0x1', // 1 in hex
        chainName: 'Ethereum',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        rpcUrls: [customRPC_ETH],
        blockExplorerUrls: ['https://etherscan.io/']
    };

    // Check if already on Ethereum
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId === EthereumConfig.chainId) {
        console.log('Already on Ethereum network');
        providerETH = new ethers.providers.Web3Provider(window.ethereum);
        signerETH = providerETH.getSigner();
        return;
    }

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: EthereumConfig.chainId }]
        });
        console.log('Switched to Ethereum network');
        providerETH = new ethers.providers.Web3Provider(window.ethereum);
        signerETH = providerETH.getSigner();
    } catch (switchError) {
        // Chain not added yet
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [EthereumConfig]
                });
                console.log('Ethereum network added and switched');
                providerETH = new ethers.providers.Web3Provider(window.ethereum);
                signerETH = providerETH.getSigner();
            } catch (addError) {
                throw new Error(`Failed to add Ethereum network: ${addError.message}`);
            }
        }
        // User rejected
        else if (switchError.code === 4001) {
            throw new Error('User rejected the network switch request');
        }
        // Network changed during request or pending request
        else if (switchError.code === -32002 ||
                 switchError.message.includes('change in selected network') ||
                 switchError.message.includes('request already pending')) {

            if (retryCount >= maxRetries) {
                throw new Error('Maximum retry attempts reached. Please manually switch to Ethereum network.');
            }

            console.log(`Network switch interrupted, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Recursive retry
            return await switchToEthereum(retryCount + 1, maxRetries);
        }
        else {
            throw new Error(`Failed to switch to Ethereum network: ${switchError.message}`);
        }
    }
}

/**
 * Switch to Base network
 * @param {number} retryCount - Current retry attempt
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<void>}
 */
export async function switchToBase(retryCount = 0, maxRetries = 5) {
    const baseConfig = {
        chainId: '0x2105', // 8453 in hex for Base Mainnet
        chainName: 'Base',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        rpcUrls: [customRPC],
        blockExplorerUrls: ['https://basescan.org/']
    };

    // Check if already on Base
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId === baseConfig.chainId) {
        console.log('Already on Base network');
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        return;
    }

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: baseConfig.chainId }]
        });
        console.log('Switched to Base network');
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
    } catch (switchError) {
        // Chain not added yet
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [baseConfig]
                });
                console.log('Base network added and switched');
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
            } catch (addError) {
                throw new Error(`Failed to add Base network: ${addError.message}`);
            }
        }
        // User rejected
        else if (switchError.code === 4001) {
            throw new Error('User rejected the network switch request');
        }
        // Network changed during request or pending request
        else if (switchError.code === -32002 ||
                 switchError.message.includes('change in selected network') ||
                 switchError.message.includes('request already pending')) {

            if (retryCount >= maxRetries) {
                throw new Error('Maximum retry attempts reached. Please manually switch to Base network.');
            }

            console.log(`Network switch interrupted, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Recursive retry
            return await switchToBase(retryCount + 1, maxRetries);
        }
        else {
            throw new Error(`Failed to switch to Base network: ${switchError.message}`);
        }
    }
}

// ============================================================================
// WALLET MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Handle wallet connection errors
 * @param {Error} error - Error object from wallet connection
 */
export function handleWalletError(error) {
    console.error('Wallet connection error:', error);

    switch (error.code) {
        case 4001:
            alert('Please approve the connection request in your wallet');
            attemptf2f21 = 0;
            break;
        case -32002:
            alert('Connection request is already pending. Please check your wallet');
            attemptf2f21 = 0;
            break;
        default:
            alert('Failed to connect wallet: ' + error.message);
            attemptf2f21 = 0;
    }
}

/**
 * Disconnect wallet and clear all state
 */
export function disconnectWallet() {
    walletConnected = false;
    userAddress = null;
window.positionsLoaded = false;
        isConnecting = false;
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');

    // Reset UI
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.textContent = 'Connect Wallet';
        connectBtn.classList.remove('connected');
    }
    updateWalletUI("", true);
}

// Track if listeners have been set up
let listenersSetup = false;

/**
 * Set up wallet event listeners for account and network changes
 */
export async function setupWalletListeners() {
    if (!window.ethereum) return;

    // Prevent duplicate listener attachment
    if (listenersSetup) {
        console.log('Wallet listeners already set up, skipping...');
        return;
    }

    console.log('Setting up wallet event listeners...');

    // Handle account changes
    window.ethereum.on('accountsChanged', async (accounts) => {
        console.log('Account changed event:', accounts);
            window.positionsLoaded = false;
        if (accounts.length === 0) {
            disconnectWallet();
        } else {
            const olduserAddy = userAddress;
            if(userAddress == accounts[0]){
                return;
            }
            
            userAddress = accounts[0];
            window.userAddress = userAddress;

            // Clear manual selections when switching accounts
            if (typeof window.userManualSelection !== 'undefined') window.userManualSelection = null;
            if (typeof window.userManualSelectionIncrease !== 'undefined') window.userManualSelectionIncrease = null;
            if (typeof window.userManualSelectionDecrease !== 'undefined') window.userManualSelectionDecrease = null;
            if (typeof window.userManualSelectionStakeIncrease !== 'undefined') window.userManualSelectionStakeIncrease = null;
            if (typeof window.userManualSelectionStakeDecrease !== 'undefined') window.userManualSelectionStakeDecrease = null;
            if (typeof window.userManualSelectionWithdraw !== 'undefined') window.userManualSelectionWithdraw = null;

            // Update localStorage
            localStorage.setItem('walletAddress', userAddress);

            updateWalletUI(userAddress, true);

            // Call connect2 if available on window
            if (window.connect2) {
                await window.connect2();
            }

            if (window.resetPositionSearch) {
                window.resetPositionSearch();
            }

            // Reset staked amounts and show loading state
            resetTotalStakedAmounts();
            if (window.updateStakingStats) {
                window.updateStakingStats(); // This will show "Loading..."
            }

            // Fetch balances for new account
            await switchToBase();
            if (window.fetchBalances && userAddress) {
                try {
                    await window.fetchBalances(
                        userAddress,
                        window.tokenAddresses,
                        window.tokenAddressesDecimals,
                        window.fetchTokenBalanceWithEthers,
                        window.displayWalletBalances,
                        provider,
                        signer,
                        walletConnected,
                        connectWallet
                    );
                } catch (e) {
                    console.warn('Failed to fetch balances on account change:', e);
                }
            }

            // Get reward stats and staking data
            if (window.getRewardStats) {
                try {
                    await window.getRewardStats();
                } catch (e) {
                    console.warn('Failed to get reward stats on account change:', e);
                }
            }

            // Trigger data refresh for new account
            if (window.triggerRefresh) {
                window.triggerRefresh();
            }

            // Show loading state for position selectors during account change
            if (window.setIsInitialPositionLoad) {
                window.setIsInitialPositionLoad(true);
            }
            if (window.showPositionsLoadingState) {
                window.showPositionsLoadingState();
            }

            // Get token IDs owned by new account (force refresh)
            if (window.getTokenIDsOwnedByMetamask && !window.positionsLoaded && !isConnecting) {
                try {
                    console.log("Call to getTokenIDsOwnedByMetamask(true)  from wallet.js setupWalletListener")
                    await window.getTokenIDsOwnedByMetamask(true); // Force refresh for new account
                    window.positionsLoaded = true;
                } catch (e) {
                    console.warn('Failed to get token IDs on account change: getTokenIDsOwnedByMetamask(true): ', e);
                    window.positionsLoaded = false;
                }
            }else if(window.getTokenIDsOwnedByMetamask) {
                try {
                    console.log("Call to getTokenIDsOwnedByMetamask()  from wallet.js setupWalletListener")
                    await window.getTokenIDsOwnedByMetamask(); // Force refresh for new account
                   // window.positionsLoaded = true;
                } catch (e) {
                    console.warn('Failed to get token IDs on account change:', e);
                    window.positionsLoaded = false;
                }
            }
            // Clear initial load flag BEFORE loading positions into UI
            if (window.setIsInitialPositionLoad) {
                window.setIsInitialPositionLoad(false);
            }


            // Update staking stats
            if (window.updateStakingStats) {
                window.updateStakingStats();
            }

            // Update staking values
            updateStakingValues([totalStakedAmounts.token0, totalStakedAmounts.token1], window.APYFINAL);

            // Update all position info displays for the new account
            if (window.updatePositionInfo) {
                window.updatePositionInfo();
            }
            if (window.updateStakingDepositPositionInfo) {
                window.updateStakingDepositPositionInfo();
            }
            if (window.updatePositionInfoMAIN_UNSTAKING) {
                window.updatePositionInfoMAIN_UNSTAKING();
            }
            if (window.updateStakePositionInfo) {
                window.updateStakePositionInfo();
            }
            if (window.updatePositionInfoStaking) {
                window.updatePositionInfoStaking();
            }
            if (window.updatePositionInfoUnstaking) {
                window.updatePositionInfoUnstaking();
            }
            if (window.updatePositionInfoIncreaseStaking) {
                window.updatePositionInfoIncreaseStaking();
            }
            if (window.updatePositionInfoDecreaseStaking) {
                window.updatePositionInfoDecreaseStaking();
            }
            if (window.updatePositionInfoIncrease) {
                window.updatePositionInfoIncrease();
            }
            if (window.updatePositionInfoDecrease) {
                window.updatePositionInfoDecrease();
            }

            // Update widget
            if (window.updateWidget) {
                await window.updateWidget();
            }

            console.log('✓ Account change data refresh complete');
        }
    });

    // Note: chainChanged listener is set up in init.js to avoid duplicates

    listenersSetup = true;
    console.log('✓ Wallet listeners set up');
}

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================

/**
 * Update wallet UI with connected address or disconnected state
 * @param {string} userAddress - User's wallet address
 * @param {boolean|string} walletName - Wallet name or true for default
 */
export function updateWalletUI(userAddress, walletName) {
    // Get the elements
    const connectBtn = document.getElementById('connectBtn');
    const walletInfo = document.getElementById('walletInfo');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const walletAddress = document.getElementById('walletAddress');
    const walletAddressSpan = document.querySelector('#walletInfo #walletAddress');

    if (userAddress) {
        // Shorten the address for display (first 6 + last 4 characters)
        const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;

        // Create the BaseScan URL
        const baseScanUrl = `https://basescan.org/address/${userAddress}`;

        walletAddressSpan.style.display = 'block';
        // Update the span with a clickable link that fills the entire button
        walletAddressSpan.innerHTML = `<a href="${baseScanUrl}" target="_blank" rel="noopener noreferrer">${shortAddress}</a>`;

        // Show the wallet info div
        walletInfo.style.display = 'block';
        disconnectBtn.style.display = 'block';

        // Update connect button
        connectBtn.textContent = `Connected (${walletName || 'Wallet'})`;
        connectBtn.classList.add('connected');

        // Optional: Add title attribute for full address on hover
        walletAddressSpan.title = userAddress;
    } else {
        // Hide wallet info if no address
        console.log("Disconnected");
        walletAddressSpan.style.display = 'none';
        walletInfo.style.display = 'none';
        connectBtn.textContent = 'Connect Wallet';
        connectBtn.classList.remove('connected');
        disconnectBtn.style.display = 'none';
    }
}

// ============================================================================
// RECONNECTION HELPER
// ============================================================================

/**
 * Reconnect wallet and refresh all data (used on account change)
 * This is exported to be called from the main app when needed
 */
export async function connect2() {
    // Clear position data and UI immediately when connecting/switching accounts
    if (window.positionData) window.positionData = {};
    if (window.stakingPositionData) window.stakingPositionData = {};

    // Clear all position dropdowns immediately
    const selectors = [
        '#increase select',
        '#decrease select',
        '#staking-deposit-select',
        '#staking-main-page .form-group2 select',
        '#stake-increase select'
    ];
    selectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML = '';
            element.value = '';
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    console.log("Cleared all position data and UI for account switch");

    if (previousAct != userAddress) {
        if (window.resetPositionSearch) {
            window.resetPositionSearch();
        }
    }
    previousAct = userAddress;

    await switchToEthereum();
    if (window.fetchBalancesETH && userAddress) {
        await window.fetchBalancesETH(
            userAddress,
            window.tokenAddressesETH,
            window.tokenAddressesDecimalsETH,
            window.fetchTokenBalanceWithEthersETH,
            window.displayWalletBalancesETH,
            providerETH,
            signerETH,
            walletConnected,
            connectWallet
        );
    }

    await switchToBase();
    if (window.fetchBalances && userAddress) {
        await window.fetchBalances(
            userAddress,
            window.tokenAddresses,
            window.tokenAddressesDecimals,
            window.fetchTokenBalanceWithEthers,
            window.displayWalletBalances,
            provider,
            signer,
            walletConnected,
            connectWallet
        );
    }

    if (window.getRewardStats) await window.getRewardStats();
    if (window.getTokenIDsOwnedByMetamask) await window.getTokenIDsOwnedByMetamask();
    if (window.checkAdminAccess) await window.checkAdminAccess();
    if (window.loadPositionsIntoDappSelections) await window.loadPositionsIntoDappSelections();
    if (window.throttledGetSqrtRtAndPriceRatio) window.throttledGetSqrtRtAndPriceRatio("ConnectWallet");
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize wallet module on DOMContentLoaded
 */
export function initWalletModule() {
    document.addEventListener('DOMContentLoaded', function () {
        // Optional: Auto-check wallet connection on page load
        // Uncomment if you want automatic reconnection
        // checkWalletConnection();
    });
}
