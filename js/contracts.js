/**
 * @module contracts
 * @description Contract interaction utilities and helpers
 *
 * This module provides functions for:
 * - Token allowance checking and approvals
 * - Network switching and chain management
 * - MetaMask integration
 * - Block explorer URL generation
 * - Tick math for Uniswap V4
 */

// Import dependencies
import { ERC20_ABI } from './abis.js';
import {
    chainConfig,
    contractsList,
    tokenIconsBase,
    tokenIconsETH,
    tokenAddresses,
    USDCToken
} from './config.js';
import {
    showSuccessNotification,
    showInfoNotification,
    showErrorNotification,
    showToast
} from './ui.js';
import { getSymbolFromAddress } from './utils.js';

// ============================================
// CONSTANTS
// ============================================

const MAX_TICK = 887220;
const MAX_UINT160 = ethers.BigNumber.from(2).pow(160).sub(1);
const MAX_UINT256 = (1n << 256n) - 1n;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Converts various value types to ethers.BigNumber
 * Handles scientific notation, strings, numbers, and existing BigNumbers
 * @param {number|string|ethers.BigNumber} value - Value to convert
 * @returns {ethers.BigNumber} Converted BigNumber
 */
export function toBigNumber(value) {
    if (ethers.BigNumber.isBigNumber(value)) {
        return value;
    }

    if (typeof value === 'number') {
        // Convert scientific notation to proper integer string
        if (value >= 1e20 || value <= -1e20) {
            const str = value.toPrecision().replace('.', '').replace(/e.*$/, '');
            return ethers.BigNumber.from(str);
        }
        return ethers.BigNumber.from(Math.floor(value).toString());
    }

    if (typeof value === 'string') {
        if (value.includes('e') || value.includes('E')) {
            const num = parseFloat(value);
            return toBigNumber(num);
        }
        return ethers.BigNumber.from(value.split('.')[0]);
    }

    return ethers.BigNumber.from(value.toString().split('.')[0]);
}

/**
 * Helper function for retry with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise<any>} - Result of the function
 */
async function retryWithBackoff(fn, maxRetries = 5, baseDelay = 2000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isRateLimit = error.message?.includes('rate limit') ||
                                error.code === -32005 ||
                                error.message?.includes('-32005') ||
                                error.data?.httpStatus === 429;

            if (isRateLimit && attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
                console.log(`Rate limited, retrying in ${(delay/1000).toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

// ============================================
// ALLOWANCE CHECKING
// ============================================

/**
 * Checks token allowance for a specific spender (legacy version)
 * @async
 * @param {string} tokenToCheck - Token contract address to check
 * @param {string} spenderAddress - Address that will spend the tokens
 * @param {string|number|ethers.BigNumber} requiredAmount - Required allowance amount
 * @returns {Promise<boolean>} True if allowance is sufficient, false otherwise
 */
export async function checkAllowance(tokenToCheck, spenderAddress, requiredAmount) {
    if (!window.walletConnected) {
        if (window.connectWallet) {
            await window.connectWallet();
        } else {
            throw new Error('Wallet not connected');
        }
    }

    try {
        let tokenContract;
        let tokenName;

        // Determine which token to check
        if (tokenToCheck === tokenAddresses['B0x']) {
            tokenContract = new ethers.Contract(tokenToCheck, ERC20_ABI, window.signer);
            tokenName = "B0x";
        } else if (tokenToCheck === tokenAddresses['0xBTC']) {
            tokenContract = new ethers.Contract(tokenToCheck, ERC20_ABI, window.signer);
            tokenName = "0xBTC";
        } else if (tokenToCheck === USDCToken) {
            tokenContract = new ethers.Contract(USDCToken, ERC20_ABI, window.signer);
            tokenName = "USDC";
        } else {
            // Generic token check
            tokenContract = new ethers.Contract(tokenToCheck, ERC20_ABI, window.signer);
            tokenName = getSymbolFromAddress(tokenToCheck) || "Token";
        }

        requiredAmount = toBigNumber(requiredAmount);

        const userAddress = await retryWithBackoff(async () => {
            return await window.signer.getAddress();
        });

        const currentAllowance = await retryWithBackoff(async () => {
            return await tokenContract.allowance(userAddress, spenderAddress);
        });

        console.log(`Current ${tokenName} allowance:`, ethers.utils.formatEther(currentAllowance));

        if (tokenName === "0xBTC") {
            console.log(`Required ${tokenName} amount:`, ethers.utils.formatUnits(requiredAmount, 8));
        } else {
            console.log(`Required ${tokenName} amount:`, ethers.utils.formatEther(requiredAmount));
        }

        if (currentAllowance.gte(requiredAmount)) {
            console.log(`${tokenName} allowance is sufficient. No approval needed.`);
            return true;
        } else {
            console.log(`${tokenName} allowance is insufficient. Approval needed.`);
            return false;
        }

    } catch (error) {
        console.error('Error checking allowance:', error);
        throw error;
    }
}

/**
 * Approve token for spending
 * @async
 * @param {string} tokenToApprove - Token contract address to approve
 * @param {string} spenderAddress - Address that will spend the tokens
 * @param {string|number|ethers.BigNumber} amount - Amount to approve
 * @returns {Promise<boolean>} True if approval succeeded, false otherwise
 */
export async function approveToken(tokenToApprove, spenderAddress, amount) {
    if (!window.walletConnected) {
        if (window.connectWallet) {
            await window.connectWallet();
        } else {
            throw new Error('Wallet not connected');
        }
    }

    try {
        alert(`Approving ${tokenToApprove} token...`);

        let tokenContract;

        // Determine which token to approve
        if (tokenToApprove === tokenAddresses['B0x']) {
            // B0x token
            tokenContract = new ethers.Contract(tokenAddresses['B0x'], ERC20_ABI, window.signer);
            alert("Approving B0x token for spending...");
        } else if (tokenToApprove === tokenAddresses['0xBTC']) {
            // 0xBTC token
            tokenContract = new ethers.Contract(tokenAddresses['0xBTC'], ERC20_ABI, window.signer);
            alert("Approving 0xBTC token for spending...");
        } else if (tokenToApprove === USDCToken) {
            tokenContract = new ethers.Contract(USDCToken, ERC20_ABI, window.signer);
            alert("Approving USDC token for spending");
        } else {
            // Generic token approval
            tokenContract = new ethers.Contract(tokenToApprove, ERC20_ABI, window.signer);
            const tokenSymbol = getSymbolFromAddress(tokenToApprove) || "Token";
            alert(`Approving ${tokenSymbol} token for spending...`);
        }

        // Send approval transaction with retry for rate limiting
        const approveTx = await retryWithBackoff(async () => {
            return await tokenContract.approve(spenderAddress, amount);
        });
        alert("Approval transaction sent! Waiting for confirmation...");

        // Wait for confirmation
        await approveTx.wait();
        alert("Token approval confirmed!");

        return true;

    } catch (error) {
        console.error("Approval failed:", error);
        alert(`Approval failed: ${error.message}`);
        return false;
    }
}

/**
 * Checks allowance for Permit2 contract
 * @async
 * @param {ethers.Contract} permit2Contract - Permit2 contract instance
 * @param {string} userAddress - User's wallet address
 * @param {string} tokenAddress - Token contract address
 * @param {string} spenderAddress - Spender contract address
 * @returns {Promise<Object>} Allowance data with amount, expiration, nonce, and isExpired flag
 */
export async function checkAllowance2(permit2Contract, userAddress, tokenAddress, spenderAddress) {
    const allowanceData = await retryWithBackoff(async () => {
        return await permit2Contract.allowance(userAddress, tokenAddress, spenderAddress);
    });
    return {
        amount: allowanceData.amount,
        expiration: allowanceData.expiration,
        nonce: allowanceData.nonce,
        isExpired: allowanceData.expiration < Math.floor(Date.now() / 1000)
    };
}

/**
 * Approve token if needed (with USDC support)
 * @async
 * @param {string} tokenToApprove - Token address to approve
 * @param {string} spenderAddress - Spender contract address
 * @param {number|string} requiredAmount - Required approval amount
 * @returns {Promise<boolean|Object>} True if already approved, or transaction receipt
 */
export async function approveIfNeededUSDC(tokenToApprove, spenderAddress, requiredAmount) {
    try {
        const allowanceSufficient = await checkAllowance(tokenToApprove, spenderAddress, requiredAmount);

        if (allowanceSufficient) {
            console.log("Approval not needed - sufficient allowance exists");
            return true;
        }

        showInfoNotification('Approve Token', 'Requesting approval for unlimited amount to avoid future approvals...');
        const txResponse = await approveToken(tokenToApprove, spenderAddress, requiredAmount);

        let txReceipt;
        if (txResponse.wait) {
            txReceipt = await txResponse.wait();
        } else {
            txReceipt = txResponse;
        }

        showSuccessNotification(
            'Approved Tokens!',
            'Tokens have been approved on the contract successfully',
            txReceipt.transactionHash
        );

        return txReceipt;

    } catch (error) {
        console.error("Approve if needed failed:", error);
        alert(`Approval process failed: ${error.message}`);
        return false;
    }
}

/**
 * Checks if token approval is needed for Permit2
 * @async
 * @param {ethers.Contract} permit2Contract - Permit2 contract instance
 * @param {string} userAddress - User's wallet address
 * @param {string} tokenAddress - Token contract address
 * @param {string} spenderAddress - Spender contract address
 * @param {string|number|ethers.BigNumber} requiredAmount - Required allowance amount
 * @returns {Promise<boolean>} True if approval is needed, false otherwise
 */
export async function needsApproval(permit2Contract, userAddress, tokenAddress, spenderAddress, requiredAmount) {
    const allowance = await checkAllowance2(permit2Contract, userAddress, tokenAddress, spenderAddress);

    requiredAmount = toBigNumber(requiredAmount);

    const sufficientAmount = allowance.amount.gte(requiredAmount);
    const notExpired = !allowance.isExpired;

    return !(sufficientAmount && notExpired);
}




/**
 * Approves tokens via Permit2 contract for Uniswap V4
 * @async
 * @param {ethers.Signer} signer - Wallet signer
 * @param {string} permit2Address - Permit2 contract address
 * @param {string} token0 - First token address
 * @param {string} token1 - Second token address
 * @param {string} positionManagerAddress - Position manager address
 * @param {string|number|ethers.BigNumber} requiredAmount0 - Required amount for token0
 * @param {string|number|ethers.BigNumber} requiredAmount1 - Required amount for token1
 * @returns {Promise<void>}
 */
export async function approveTokensViaPermit2(signer, permit2Address, token0, token1, positionManagerAddress, requiredAmount0, requiredAmount1) {
    const permit2Abi = [
        {
            "name": "approve",
            "type": "function",
            "stateMutability": "nonpayable",
            "inputs": [
                { "name": "token", "type": "address" },
                { "name": "spender", "type": "address" },
                { "name": "amount", "type": "uint160" },
                { "name": "expiration", "type": "uint48" }
            ],
            "outputs": []
        },
        {
            "name": "allowance",
            "type": "function",
            "stateMutability": "view",
            "inputs": [
                { "name": "user", "type": "address" },
                { "name": "token", "type": "address" },
                { "name": "spender", "type": "address" }
            ],
            "outputs": [
                { "name": "amount", "type": "uint160" },
                { "name": "expiration", "type": "uint48" },
                { "name": "nonce", "type": "uint48" }
            ]
        }
    ];

    const permit2Contract = new ethers.Contract(permit2Address, permit2Abi, signer);
    const userAddress = await retryWithBackoff(async () => {
        return await signer.getAddress();
    });

    const currentTime = Math.floor(Date.now() / 1000);
    const expiration = currentTime + (3600 * 24 * 90); // 90 days,  2 rewardCycles

    try {
        // Check if token0 needs approval
        const needsToken0Approval = await needsApproval(
            permit2Contract,
            userAddress,
            token0,
            positionManagerAddress,
            requiredAmount0 || MAX_UINT160
        );

        if (needsToken0Approval) {
            const sym = getSymbolFromAddress(token0);
            showInfoNotification('Approve ' + sym + ' Tokens', 'Requesting approval of ' + sym + ' tokens for Uniswap Contract...');
            console.log('Token0 needs permit approval, approving...');

            const tx1 = await retryWithBackoff(async () => {
                return await permit2Contract.approve(
                    token0,
                    positionManagerAddress,
                    MAX_UINT160,
                    expiration
                );
            });

            console.log(sym + ' approval transaction hash:', tx1.hash);
            await tx1.wait();

            showSuccessNotification(sym + ' Approved!', sym + ' Tokens have been approved on the contract successfully');
        } else {
            const sym = getSymbolFromAddress(token0);
            console.log(sym + ' already has sufficient allowance');
        }

        // Check if token1 needs approval
        const needsToken1Approval = await needsApproval(
            permit2Contract,
            userAddress,
            token1,
            positionManagerAddress,
            requiredAmount1 || MAX_UINT160
        );

        if (needsToken1Approval) {
            const sym = getSymbolFromAddress(token1);
            showInfoNotification('Approve ' + sym + ' Tokens', 'Requesting approval of ' + sym + ' tokens for Uniswap Contract...');
            console.log('Token1 needs approval, approving...');

            const tx2 = await retryWithBackoff(async () => {
                return await permit2Contract.approve(
                    token1,
                    positionManagerAddress,
                    MAX_UINT160,
                    expiration
                );
            });

            console.log(sym + ' approval transaction hash:', tx2.hash);
            await tx2.wait();

            showSuccessNotification(sym + ' Approved!', sym + ' Tokens have been approved on the contract successfully');
        } else {
            const sym = getSymbolFromAddress(token1);
            console.log(sym + ' already has sufficient allowance');
        }

        console.log('Approval check and setup completed');

    } catch (error) {
        console.error('Error checking/approving tokens:', error);
        throw error;
    }
}

// ============================================
// TICK MATH (Uniswap V4)
// ============================================

/**
 * Converts a tick value to sqrtPriceX96 for Uniswap V4
 * Based on Uniswap's tick math implementation
 * @param {number} tick - The tick value
 * @returns {bigint} The sqrt ratio as a 160-bit unsigned integer
 */
export function getSqrtRatioAtTick(tick) {
    const absTick = tick < 0 ? -tick : tick;

    if (absTick > MAX_TICK) {
        throw new Error("TICK_OUT_OF_RANGE");
    }

    let ratio = (absTick & 0x1) !== 0
        ? 0xfffcb933bd6fad37aa2d162d1a594001n
        : 0x100000000000000000000000000000000n;

    if ((absTick & 0x2) !== 0) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
    if ((absTick & 0x4) !== 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
    if ((absTick & 0x8) !== 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
    if ((absTick & 0x10) !== 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
    if ((absTick & 0x20) !== 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
    if ((absTick & 0x40) !== 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
    if ((absTick & 0x80) !== 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
    if ((absTick & 0x100) !== 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
    if ((absTick & 0x200) !== 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
    if ((absTick & 0x400) !== 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
    if ((absTick & 0x800) !== 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
    if ((absTick & 0x1000) !== 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
    if ((absTick & 0x2000) !== 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
    if ((absTick & 0x4000) !== 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
    if ((absTick & 0x8000) !== 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
    if ((absTick & 0x10000) !== 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
    if ((absTick & 0x20000) !== 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
    if ((absTick & 0x40000) !== 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
    if ((absTick & 0x80000) !== 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

    if (tick > 0) {
        ratio = MAX_UINT256 / ratio;
    }

    // This divides by 1<<32 rounding up to go from a Q128.128 to a Q96.64
    const sqrtPriceX96 = (ratio >> 32n) + (ratio % (1n << 32n) === 0n ? 0n : 1n);

    return sqrtPriceX96;
}

// ============================================
// NETWORK/CHAIN MANAGEMENT
// ============================================

/**
 * Gets block explorer URL for a contract
 * @param {Object} contractData - Contract data object with chain and address
 * @returns {string} Block explorer URL
 */
export function getExplorerUrl(contractData) {
    const chain = chainConfig[contractData.chain];
    return `${chain.explorerUrl}${contractData.address}`;
}

/**
 * Switches MetaMask to a specific blockchain network
 * @async
 * @param {string} chainKey - Chain identifier (e.g., 'base', 'ethereum')
 * @returns {Promise<boolean>} True if switch was successful, false otherwise
 */
export async function switchToChain(chainKey) {
    if (!window.ethereum) {
        showToast("MetaMask not detected. Please install MetaMask.", true);
        return false;
    }

    const chainData = chainConfig[chainKey];
    if (!chainData) {
        showToast(`Unknown chain: ${chainKey}`, true);
        return false;
    }

    const chainIdHex = `0x${chainData.chainId.toString(16)}`;

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
        });

        showToast(`Switched to ${chainData.name}`);
        return true;
    } catch (switchError) {
        // Chain not added to MetaMask yet
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: chainIdHex,
                        chainName: chainData.name,
                        nativeCurrency: chainData.nativeCurrency,
                        rpcUrls: [chainData.rpcUrl],
                        blockExplorerUrls: [chainData.explorerUrl.replace('/address/', '')]
                    }],
                });

                showToast(`Added and switched to ${chainData.name}`);
                return true;
            } catch (addError) {
                console.error('Failed to add chain:', addError);
                showToast(`Failed to add ${chainData.name} network`, true);
                return false;
            }
        } else if (switchError.code === 4001) {
            showToast("Chain switch cancelled by user", true);
            return false;
        } else {
            console.error('Failed to switch chain:', switchError);
            showToast(`Failed to switch to ${chainData.name}`, true);
            return false;
        }
    }
}

/**
 * Gets the current blockchain network from MetaMask
 * @async
 * @returns {Promise<string|null>} Chain key or null if not found
 */
export async function getCurrentChain() {
    if (!window.ethereum) return null;

    try {
        // Add timeout to prevent hanging if wallet extension isn't fully loaded
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Chain request timed out')), 2000)
        );

        const chainId = await Promise.race([
            window.ethereum.request({ method: 'eth_chainId' }),
            timeoutPromise
        ]);
        const chainIdDecimal = parseInt(chainId, 16);

        // Find matching chain in our config
        for (const [key, config] of Object.entries(chainConfig)) {
            if (config.chainId === chainIdDecimal) {
                return key;
            }
        }
        return null;
    } catch (error) {
        if (error.message === 'Chain request timed out') {
            console.warn('Chain detection timed out - wallet extension may still be loading');
        } else {
            console.error('Error getting current chain:', error);
        }
        return null;
    }
}

/**
 * Displays current network status in the UI
 * @async
 * @returns {Promise<void>}
 */
export async function displayNetworkStatus() {
    const currentChain = await getCurrentChain();
    const statusElement = document.getElementById('network-status');

    if (statusElement) {
        if (currentChain) {
            const chainData = chainConfig[currentChain];
            statusElement.innerHTML = `
                <span class="network-indicator connected">
                    ● Connected to ${chainData.name}
                </span>
            `;
        } else {
            statusElement.innerHTML = `
                <span class="network-indicator disconnected">
                    ● Unknown network or disconnected
                </span>
            `;
        }
    }
}

// ============================================
// METAMASK INTEGRATION
// ============================================

/**
 * Adds a token to MetaMask by index in contractsList
 * @async
 * @param {number} index - Index in contractsList array
 * @param {HTMLElement} button - Button element (for UI feedback)
 * @returns {Promise<void>}
 */
export async function addToMetaMaskByIndex(index, button) {
    if (!window.ethereum) {
        showToast("MetaMask not detected. Please install MetaMask.", true);
        return;
    }

    const contractData = contractsList[index];
    if (!contractData || !contractData.isToken) {
        showToast("Invalid token data", true);
        return;
    }

    if (!window.walletConnected) {
        if (window.quickconnectWallet) {
            await window.quickconnectWallet();
        }
    }

    const originalText = button.innerHTML;

    try {
        button.innerHTML = '⏳ Switching chain...';
        button.disabled = true;

        // First, switch to the correct chain
        const chainSwitched = await switchToChain(contractData.chain);

        if (!chainSwitched) {
            button.innerHTML = originalText;
            button.disabled = false;
            return;
        }

        // Now add the token
        button.innerHTML = '⏳ Adding token...';

        const iconURL = contractData.chain === "ethereum"
            ? tokenIconsETH[contractData.imageSymbol]
            : tokenIconsBase[contractData.imageSymbol];

        console.log("iconURL for add:", iconURL);

        const wasAdded = await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: contractData.address,
                    symbol: contractData.symbol,
                    decimals: contractData.decimals,
                    image: iconURL,
                },
            },
        });

        if (wasAdded) {
            const chainName = chainConfig[contractData.chain].name;
            showToast(`${contractData.symbol} added to MetaMask on ${chainName}!`);
            button.innerHTML = '✓ Added';
            button.classList.add('copied');
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('copied');
                button.disabled = false;
            }, 3000);
        } else {
            showToast("Token addition was cancelled", true);
            button.innerHTML = originalText;
            button.disabled = false;
        }
    } catch (error) {
        console.error('Error adding token to MetaMask:', error);
        showToast("Failed to add token to MetaMask", true);
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

/**
 * Renders contract information to the UI
 * @returns {void}
 */
export function renderContracts() {
    const container = document.getElementById('contracts-container');
    if (!container) return;

    container.innerHTML = '';

    contractsList.forEach((contractData, index) => {
        const contractDiv = document.createElement('div');
        contractDiv.className = 'contract-item';

        const iconURL = contractData.chain === "ethereum"
            ? tokenIconsETH[contractData.imageSymbol]
            : tokenIconsBase[contractData.imageSymbol];

        const chain = chainConfig[contractData.chain];
        const explorerUrl = getExplorerUrl(contractData);

        const metaMaskButton = contractData.isToken
            ? `<button class="btn btn-metamask" onclick="window.Contracts.addToMetaMaskByIndex(${index}, this)">
                🦊 Add to MetaMask or Rabby
                </button>`
            : '';

        contractDiv.innerHTML = `
            <div class="contract-name">
                ${contractData.name}
                <span class="chain-badge chain-${contractData.chain}">
                    ${iconURL ? `<img src="${iconURL}" alt="${contractData.imageSymbol}" class="chain-icon"> ` : ''}
                     on ${chain.name}
                </span>
            </div>
            <div class="address-row">
                <textarea class="address" readonly>${contractData.address}</textarea>
                <button class="btn btn-copy" onclick="window.copyToClipboard('${contractData.address}', this)">
                    📋 Copy
                </button>
                <a href="${explorerUrl}" target="_blank" class="btn" style="display: flex; justify-content: center; align-items: center; text-align: center;">
                    🔍 View on ${chain.name === 'Ethereum' ? 'Etherscan' : 'BaseScan'}
                </a>
                ${metaMaskButton}
            </div>
        `;

        container.appendChild(contractDiv);
    });
}

/**
 * Copies text to clipboard
 * @param {string} text - Text to copy
 * @param {HTMLElement} button - Button element (for UI feedback)
 * @returns {void}
 */
export function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Address copied to clipboard!");

        const originalText = button.innerHTML;
        button.innerHTML = '✓ Copied';
        button.classList.add('copied');

        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast("Failed to copy address", true);
    });
}
