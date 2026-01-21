/**
 * @module admin
 * @description Admin-only functions for contract management
 *
 * Handles:
 * - Admin access verification (uses cached owner data from getRewardStats multicall)
 * - Pool fee updates
 * - Staking contract token management
 */

// Import dependencies
import { hookAddress, contractAddressLPRewardsStaking, tokenAddresses } from './config.js';
import { showSuccessNotification, showErrorNotification, showInfoNotification } from './ui.js';
import { connectWallet } from './wallet.js';

// ============================================
// STATE VARIABLES
// ============================================

let isAdmin = false;
let isLPOwner = false;
let isHookOwner = false;

// ============================================
// ABIS
// ============================================

// ABI for Hook contract functions
const HOOK_ABI = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "address", "name": "currency0", "type": "address" },
                    { "internalType": "address", "name": "currency1", "type": "address" },
                    { "internalType": "uint24", "name": "fee", "type": "uint24" },
                    { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
                    { "internalType": "address", "name": "hooks", "type": "address" }
                ],
                "internalType": "struct PoolKey_Hook",
                "name": "key",
                "type": "tuple"
            },
            { "internalType": "uint24", "name": "newFee", "type": "uint24" }
        ],
        "name": "forceUpdateLPFee",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
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
        "outputs": [{ "name": "currentFee", "type": "uint24" }],
        "stateMutability": "view"
    }
];

// ABI for add/remove reward token
const REWARD_TOKEN_ABI = [
    {
        "inputs": [{ "internalType": "contract IERC20", "name": "token", "type": "address" }],
        "name": "addRewardToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "contract IERC20", "name": "token", "type": "address" }],
        "name": "removeRewardToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// ============================================
// ADMIN ACCESS
// ============================================

/**
 * Checks if connected wallet has admin access
 * Uses cached owner addresses from getRewardStats multicall (no additional RPC calls)
 * @async
 * @returns {Promise<boolean>} True if user is admin
 */
export async function checkAdminAccess() {
    if (!window.walletConnected || !window.userAddress) {
        isAdmin = false;
        isLPOwner = false;
        isHookOwner = false;
        hideAdminTab();
        return false;
    }

    try {
        console.log("Checking admin access for:", window.userAddress);

        // Use cached admin addresses from getRewardStats multicall
        if (window.cachedAdminAddresses) {
            const userAddr = window.userAddress.toLowerCase();

            // Check LP Rewards Staking contract ownership
            isLPOwner = window.cachedAdminAddresses.lpRewardsOwner?.toLowerCase() === userAddr;
            console.log("LP Rewards owner:", window.cachedAdminAddresses.lpRewardsOwner);
            console.log("Is LP owner:", isLPOwner);

            // Check Hook contract ownership
            isHookOwner = window.cachedAdminAddresses.hookOwner?.toLowerCase() === userAddr;
            console.log("Hook owner:", window.cachedAdminAddresses.hookOwner);
            console.log("Is Hook owner:", isHookOwner);

            // User is admin if they own either contract
            isAdmin = isLPOwner || isHookOwner;
        } else {
            console.log("Admin addresses not cached yet, waiting for getRewardStats...");
            isAdmin = false;
            isLPOwner = false;
            isHookOwner = false;
        }

        // Show/hide admin tab based on status
        if (isAdmin) {
            showAdminTab();
            console.log("User has admin access");
        } else {
            hideAdminTab();
            console.log("User does not have admin access");
        }

        return isAdmin;

    } catch (error) {
        console.error("Error checking admin access:", error);
        isAdmin = false;
        isLPOwner = false;
        isHookOwner = false;
        hideAdminTab();
        return false;
    }
}

/**
 * Gets admin status
 * @returns {boolean} Admin status
 */
export function getIsAdmin() {
    return isAdmin;
}

/**
 * Gets LP owner status
 * @returns {boolean} LP owner status
 */
export function getIsLPOwner() {
    return isLPOwner;
}

/**
 * Gets Hook owner status
 * @returns {boolean} Hook owner status
 */
export function getIsHookOwner() {
    return isHookOwner;
}

// ============================================
// ADMIN TAB UI
// ============================================

/**
 * Shows the admin tab in the navigation
 */
export function showAdminTab() {
    let adminTab = document.getElementById('admin-tab');
    if (!adminTab) {
        // Create the admin tab if it doesn't exist
        const navTabs = document.querySelector('.nav-tabs');
        if (navTabs) {
            adminTab = document.createElement('button');
            adminTab.id = 'admin-tab';
            adminTab.className = 'nav-tab';
            adminTab.onclick = () => {
                if (window.switchTab) {
                    window.switchTab('admin-functions');
                }
            };
            adminTab.textContent = 'Admin Functions';
            navTabs.appendChild(adminTab);
        }
    }
    if (adminTab) {
        adminTab.style.display = 'inline-block';
    }
}

/**
 * Hides the admin tab from the navigation
 */
export function hideAdminTab() {
    const adminTab = document.getElementById('admin-tab');
    if (adminTab) {
        adminTab.style.display = 'none';
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sorts two token addresses to determine currency0 and currency1
 * @param {string} tokenA - First token address
 * @param {string} tokenB - Second token address
 * @returns {Object} Object with currency0 and currency1
 */
function sortTokenAddresses(tokenA, tokenB) {
    if (tokenA.toLowerCase() < tokenB.toLowerCase()) {
        return { currency0: tokenA, currency1: tokenB };
    } else {
        return { currency0: tokenB, currency1: tokenA };
    }
}

/**
 * Creates a PoolKey struct for pool operations
 * @param {string} currency0 - First currency address
 * @param {string} currency1 - Second currency address
 * @returns {Object} PoolKey struct
 */
function createPoolKey(currency0, currency1) {
    return {
        currency0: currency0,
        currency1: currency1,
        fee: 0x800000,      // uint24 - dynamic fee flag
        tickSpacing: 60,    // int24
        hooks: hookAddress
    };
}

// ============================================
// POOL FEE MANAGEMENT
// ============================================

/**
 * Updates admin fee for main B0x/0xBTC pool
 * @async
 * @returns {Promise<void>}
 */
export async function updateAdminFeeForPool() {
    if (!window.walletConnected) {
        await connectWallet();
    }

    try {
        alert("UPDATING MAIN POOL FEE");

        const feeInput = document.getElementById('UpdateAdminFee');
        if (!feeInput || !feeInput.value) {
            showErrorNotification('Invalid Input', 'Please enter a fee value');
            return;
        }

        let feeValue = Math.floor(parseFloat(feeInput.value) * 10000);
        console.log("Fee value (basis points * 100):", feeValue);

        // Sort token addresses
        const { currency0, currency1 } = sortTokenAddresses(
            tokenAddresses['0xBTC'],
            tokenAddresses['B0x']
        );
        console.log("currency0:", currency0);
        console.log("currency1:", currency1);

        // Create pool key
        const poolKey = createPoolKey(currency0, currency1);

        // Create contract instance
        const hookContract = new ethers.Contract(hookAddress, HOOK_ABI, window.signer);

        showInfoNotification('Updating Fee', 'Please confirm the transaction in your wallet');

        const tx = await hookContract.forceUpdateLPFee(poolKey, feeValue);
        console.log("forceUpdateLPFee transaction sent:", tx.hash);
        console.log("Waiting for transaction confirmation...");

        await tx.wait();
        console.log("Confirmed forceUpdateLPFee");

        showSuccessNotification('Fee Updated', 'Main pool fee updated successfully', tx.hash);

    } catch (error) {
        console.error("Error updating pool fee:", error);
        showErrorNotification('Update Failed', error.message || 'Failed to update pool fee');
    }
}

/**
 * Updates admin fee for 0xBTC/ETH pool
 * @async
 * @returns {Promise<void>}
 */
export async function updateAdminFeeForPool0xBTCETH() {
    if (!window.walletConnected) {
        await connectWallet();
    }

    try {
        const feeInput = document.getElementById('UpdateAdminFee');
        if (!feeInput || !feeInput.value) {
            showErrorNotification('Invalid Input', 'Please enter a fee value');
            return;
        }

        let feeValue = Math.floor(parseFloat(feeInput.value) * 10000);
        console.log("Fee value (basis points * 100):", feeValue);

        // Sort token addresses
        const { currency0, currency1 } = sortTokenAddresses(
            tokenAddresses['0xBTC'],
            tokenAddresses['ETH']
        );
        console.log("currency0:", currency0);
        console.log("currency1:", currency1);

        // Create pool key
        const poolKey = createPoolKey(currency0, currency1);

        // Create contract instance
        const hookContract = new ethers.Contract(hookAddress, HOOK_ABI, window.signer);

        showInfoNotification('Updating Fee', 'Please confirm the transaction in your wallet');

        const tx = await hookContract.forceUpdateLPFee(poolKey, feeValue);
        console.log("forceUpdateLPFee transaction sent:", tx.hash);
        console.log("Waiting for transaction confirmation...");

        await tx.wait();
        console.log("Confirmed forceUpdateLPFee");

        showSuccessNotification('Fee Updated', '0xBTC/ETH pool fee updated successfully', tx.hash);

    } catch (error) {
        console.error("Error updating pool fee:", error);
        showErrorNotification('Update Failed', error.message || 'Failed to update pool fee');
    }
}

/**
 * Updates admin fee for B0x/ETH pool
 * @async
 * @returns {Promise<void>}
 */
export async function updateAdminFeeForPoolB0xETH() {
    if (!window.walletConnected) {
        await connectWallet();
    }

    try {
        const feeInput = document.getElementById('UpdateAdminFee');
        if (!feeInput || !feeInput.value) {
            showErrorNotification('Invalid Input', 'Please enter a fee value');
            return;
        }

        let feeValue = Math.floor(parseFloat(feeInput.value) * 10000);
        console.log("Fee value (basis points * 100):", feeValue);

        // Sort token addresses
        const { currency0, currency1 } = sortTokenAddresses(
            tokenAddresses['B0x'],
            tokenAddresses['ETH']
        );
        console.log("currency0:", currency0);
        console.log("currency1:", currency1);

        // Create pool key
        const poolKey = createPoolKey(currency0, currency1);

        // Create contract instance
        const hookContract = new ethers.Contract(hookAddress, HOOK_ABI, window.signer);

        showInfoNotification('Updating Fee', 'Please confirm the transaction in your wallet');

        const tx = await hookContract.forceUpdateLPFee(poolKey, feeValue);
        console.log("forceUpdateLPFee transaction sent:", tx.hash);
        console.log("Waiting for transaction confirmation...");

        await tx.wait();
        console.log("Confirmed forceUpdateLPFee");

        showSuccessNotification('Fee Updated', 'B0x/ETH pool fee updated successfully', tx.hash);

    } catch (error) {
        console.error("Error updating pool fee:", error);
        showErrorNotification('Update Failed', error.message || 'Failed to update pool fee');
    }
}

/**
 * Updates admin fee for R0xBTC/0xBTC pool
 * @async
 * @returns {Promise<void>}
 */
export async function updateAdminFeeForPoolR0xBTC0xBTC() {
    if (!window.walletConnected) {
        await connectWallet();
    }

    try {
        const feeInput = document.getElementById('UpdateAdminFee');
        if (!feeInput || !feeInput.value) {
            showErrorNotification('Invalid Input', 'Please enter a fee value');
            return;
        }

        let feeValue = Math.floor(parseFloat(feeInput.value) * 10000);
        console.log("Fee value (basis points * 100):", feeValue);

        // Sort token addresses
        const { currency0, currency1 } = sortTokenAddresses(
            tokenAddresses['0xBTC'],
            tokenAddresses['RightsTo0xBTC']
        );
        console.log("currency0:", currency0);
        console.log("currency1:", currency1);

        // Create pool key
        const poolKey = createPoolKey(currency0, currency1);

        // Create contract instance
        const hookContract = new ethers.Contract(hookAddress, HOOK_ABI, window.signer);

        showInfoNotification('Updating Fee', 'Please confirm the transaction in your wallet');

        const tx = await hookContract.forceUpdateLPFee(poolKey, feeValue);
        console.log("forceUpdateLPFee transaction sent:", tx.hash);
        console.log("Waiting for transaction confirmation...");

        await tx.wait();
        console.log("Confirmed forceUpdateLPFee");

        showSuccessNotification('Fee Updated', 'R0xBTC/0xBTC pool fee updated successfully', tx.hash);

    } catch (error) {
        console.error("Error updating pool fee:", error);
        showErrorNotification('Update Failed', error.message || 'Failed to update pool fee');
    }
}

// ============================================
// STAKING CONTRACT TOKEN MANAGEMENT
// ============================================

/**
 * Adds ERC20 token to staking contract rewards
 * @async
 * @returns {Promise<void>}
 */
export async function addERC20ToStakingContract() {
    if (!window.walletConnected) {
        await connectWallet();
    }

    try {
        const addressInput = document.getElementById('basic-address-add');
        if (!addressInput || !addressInput.value) {
            showErrorNotification('Invalid Input', 'Please enter a token address');
            return;
        }

        const tokenAddress = addressInput.value.trim();
        console.log("Adding reward token:", tokenAddress);

        // Validate address format
        if (!ethers.utils.isAddress(tokenAddress)) {
            showErrorNotification('Invalid Address', 'Please enter a valid Ethereum address');
            return;
        }

        // Create contract instance
        const lpRewardsContract = new ethers.Contract(
            contractAddressLPRewardsStaking,
            REWARD_TOKEN_ABI,
            window.signer
        );

        showInfoNotification('Adding Token', 'Please confirm the transaction in your wallet');

        const tx = await lpRewardsContract.addRewardToken(tokenAddress);
        console.log("addRewardToken transaction sent:", tx.hash);
        console.log("Waiting for transaction confirmation...");

        await tx.wait();
        console.log("Confirmed addRewardToken");

        showSuccessNotification('Token Added', 'Reward token added to staking contract', tx.hash);

        // Refresh reward stats to show new token
        if (window.getRewardStats) {
            await window.getRewardStats();
        }

        // Clear the input field
        addressInput.value = '';

    } catch (error) {
        console.error("Error adding token:", error);
        showErrorNotification('Operation Failed', error.message || 'Failed to add reward token');
    }
}

/**
 * Removes ERC20 token from staking contract rewards
 * @async
 * @returns {Promise<void>}
 */
export async function removeERC20FromStakingContract() {
    if (!window.walletConnected) {
        await connectWallet();
    }

    try {
        const addressInput = document.getElementById('basic-address-remove');
        if (!addressInput || !addressInput.value) {
            showErrorNotification('Invalid Input', 'Please enter a token address');
            return;
        }

        const tokenAddress = addressInput.value.trim();
        console.log("Removing reward token:", tokenAddress);

        // Validate address format
        if (!ethers.utils.isAddress(tokenAddress)) {
            showErrorNotification('Invalid Address', 'Please enter a valid Ethereum address');
            return;
        }

        // Create contract instance
        const lpRewardsContract = new ethers.Contract(
            contractAddressLPRewardsStaking,
            REWARD_TOKEN_ABI,
            window.signer
        );

        showInfoNotification('Removing Token', 'Please confirm the transaction in your wallet');

        const tx = await lpRewardsContract.removeRewardToken(tokenAddress);
        console.log("removeRewardToken transaction sent:", tx.hash);
        console.log("Waiting for transaction confirmation...");

        await tx.wait();
        console.log("Confirmed removeRewardToken");

        showSuccessNotification('Token Removed', 'Reward token removed from staking contract', tx.hash);

        // Refresh reward stats
        if (window.getRewardStats) {
            await window.getRewardStats();
        }

        // Clear the input field
        addressInput.value = '';

    } catch (error) {
        console.error("Error removing token:", error);
        showErrorNotification('Operation Failed', error.message || 'Failed to remove reward token');
    }
}

// ============================================
// GET CURRENT POOL FEES
// ============================================

/**
 * Gets current pool fee for B0x/0xBTC pool (main pool)
 * @async
 * @returns {Promise<number>} Current fee
 */
export async function getCurrentPoolFee() {
    if (!window.walletConnected) {
        await connectWallet();
    }

    try {
        // Sort token addresses
        const { currency0, currency1 } = sortTokenAddresses(
            tokenAddresses['0xBTC'],
            tokenAddresses['B0x']
        );
        console.log("getCurrentPoolFee - currency0:", currency0);
        console.log("getCurrentPoolFee - currency1:", currency1);

        // Create pool key
        const poolKey = createPoolKey(currency0, currency1);

        // Create contract instance (use provider for view function)
        const hookContract = new ethers.Contract(hookAddress, HOOK_ABI, window.signer || window.provider);

        const result = await hookContract.getCurrentPoolFee(poolKey);

        const infoCard = document.querySelector('#admin-functions .info-card2');
        if (infoCard) {
            infoCard.innerHTML = `
                <h3>B0x / 0xBTC Pool</h3>
                <p>Current Fee: ${result / 10000} %</p>
            `;
        }

        return result;

    } catch (error) {
        console.error('Error fetching current fee:', error);
        const infoCard = document.querySelector('#admin-functions .info-card2');
        if (infoCard) {
            infoCard.innerHTML = `
                <h3>B0x / 0xBTC Pool</h3>
                <p>Error loading fee data</p>
            `;
        }
        return 0;
    }
}

/**
 * Gets current pool fee for 0xBTC/ETH pool
 * @async
 * @returns {Promise<number>} Current fee
 */
export async function getCurrentPoolFee0xBTCETH() {
    if (!window.walletConnected) {
        await connectWallet();
    }

    try {
        // Sort token addresses
        const { currency0, currency1 } = sortTokenAddresses(
            tokenAddresses['0xBTC'],
            tokenAddresses['ETH']
        );
        console.log("getCurrentPoolFee0xBTCETH - currency0:", currency0);
        console.log("getCurrentPoolFee0xBTCETH - currency1:", currency1);

        // Create pool key
        const poolKey = createPoolKey(currency0, currency1);

        // Create contract instance
        const hookContract = new ethers.Contract(hookAddress, HOOK_ABI, window.signer || window.provider);

        const result = await hookContract.getCurrentPoolFee(poolKey);

        const infoCard = document.querySelector('#admin-functions .info-card2');
        if (infoCard) {
            infoCard.innerHTML = `
                <h3>0xBTC / ETH Pool</h3>
                <p>Current Fee: ${result / 10000} %</p>
            `;
        }

        return result;

    } catch (error) {
        console.error('Error fetching current fee:', error);
        const infoCard = document.querySelector('#admin-functions .info-card2');
        if (infoCard) {
            infoCard.innerHTML = `
                <h3>0xBTC / ETH Pool</h3>
                <p>Error loading fee data</p>
            `;
        }
        return 0;
    }
}

/**
 * Gets current pool fee for B0x/ETH pool
 * @async
 * @returns {Promise<number>} Current fee
 */
export async function getCurrentPoolFeeB0xETH() {
    if (!window.walletConnected) {
        await connectWallet();
    }

    try {
        // Sort token addresses
        const { currency0, currency1 } = sortTokenAddresses(
            tokenAddresses['B0x'],
            tokenAddresses['ETH']
        );
        console.log("getCurrentPoolFeeB0xETH - currency0:", currency0);
        console.log("getCurrentPoolFeeB0xETH - currency1:", currency1);

        // Create pool key
        const poolKey = createPoolKey(currency0, currency1);

        // Create contract instance
        const hookContract = new ethers.Contract(hookAddress, HOOK_ABI, window.signer || window.provider);

        const result = await hookContract.getCurrentPoolFee(poolKey);

        const infoCard = document.querySelector('#admin-functions .info-card2');
        if (infoCard) {
            infoCard.innerHTML = `
                <h3>B0x / ETH Pool</h3>
                <p>Current Fee: ${result / 10000} %</p>
            `;
        }

        return result;

    } catch (error) {
        console.error('Error fetching current fee:', error);
        const infoCard = document.querySelector('#admin-functions .info-card2');
        if (infoCard) {
            infoCard.innerHTML = `
                <h3>B0x / ETH Pool</h3>
                <p>Error loading fee data</p>
            `;
        }
        return 0;
    }
}

/**
 * Gets current pool fee for R0xBTC/0xBTC pool
 * @async
 * @returns {Promise<number>} Current fee
 */
export async function getCurrentPoolFeeR0xBTC0xBTC() {
    if (!window.walletConnected) {
        await connectWallet();
    }

    try {
        // Sort token addresses
        const { currency0, currency1 } = sortTokenAddresses(
            tokenAddresses['0xBTC'],
            tokenAddresses['RightsTo0xBTC']
        );
        console.log("getCurrentPoolFeeR0xBTC0xBTC - currency0:", currency0);
        console.log("getCurrentPoolFeeR0xBTC0xBTC - currency1:", currency1);

        // Create pool key
        const poolKey = createPoolKey(currency0, currency1);

        // Create contract instance
        const hookContract = new ethers.Contract(hookAddress, HOOK_ABI, window.signer || window.provider);

        const result = await hookContract.getCurrentPoolFee(poolKey);

        const infoCard = document.querySelector('#admin-functions .info-card2');
        if (infoCard) {
            infoCard.innerHTML = `
                <h3>RightsTo0xBTC / 0xBTC Pool</h3>
                <p>Current Fee: ${result / 10000} %</p>
            `;
        }

        return result;

    } catch (error) {
        console.error('Error fetching current fee:', error);
        const infoCard = document.querySelector('#admin-functions .info-card2');
        if (infoCard) {
            infoCard.innerHTML = `
                <h3>RightsTo0xBTC / 0xBTC Pool</h3>
                <p>Error loading fee data</p>
            `;
        }
        return 0;
    }
}

console.log('Admin module initialized');
