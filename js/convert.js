/**
 * @module convert
 * @description Token conversion between 0xBTC and B0x + RightsTo0xBitcoin
 *
 * Handles:
 * - Conversion calculations between V1 and V2 tokens
 * - Token deposits from V1 to V2 (0xBTC -> B0x + RightsTo0xBTC)
 * - Token withdrawals from V2 to V1 (B0x + RightsTo0xBTC -> 0xBTC)
 * - Transaction retry logic with exponential backoff
 */

// Import dependencies
import {
    tokenAddressesETH
} from './config.js';

import {
    tokenAddressesDecimals
} from './utils.js';

import {
    walletConnected,
    signerETH,
    connectWallet,
    switchToEthereum,
    switchToBase
} from './wallet.js';

import {
    fetchBalances,
    fetchBalancesETH
} from './utils.js';

import {
    showSuccessNotification,
    showInfoNotification
} from './ui.js';

// ============================================
// CONVERT CALCULATIONS
// ============================================

/**
 * Calculate and display conversion totals
 * @param {boolean} usemetamask - Whether to use MetaMask connection
 */
export async function getConvertTotal(usemetamask) {
    if (!walletConnected && usemetamask) {
        try {
            await connectWallet();
        } catch (error) {
            console.error(`Error connecting wallet on convertTotal:`, error);
        }
    }

    const fromSelect = document.querySelector('#convert .form-group:nth-child(4) select');
    const toSelect = document.querySelector('#convert .form-group:nth-child(7) select');

    // Get the currently selected value
    const selectedValue = fromSelect.value;
    const selectedValueTO = toSelect.value;
    console.log("Currently selected value:", selectedValue);

    // Or get the selected option element itself
    const selectedOption = fromSelect.options[fromSelect.selectedIndex];
    const TOOption = toSelect.options[toSelect.selectedIndex];
    console.log("Selected option text:", selectedOption.text);
    console.log("Selected option value:", selectedOption.value);
    console.log("Selected option text TOOption:", TOOption.text);
    console.log("Selected option value TOOption:", TOOption.value);

    var balanceOfInput0xBTC = window.walletBalancesETH?.['0xBTC'];
    var balanceOfInputB0x = window.walletBalancesETH?.['B0x'];
    var balanceOfInputRightsTo0xBTC = window.walletBalancesETH?.['RightsTo0xBTC'];

    const amountInput = document.querySelector('#convert .form-group:nth-child(5) input');
    // Get the currently selected value
    const selectedValue2 = amountInput.value;
    console.log("Currently amountInput value:", selectedValue2);

    var decimalsOfToken = tokenAddressesDecimals[selectedOption.value];
    var amountToSwap = ethers.utils.parseUnits(selectedValue2, decimalsOfToken);  // Correctly represents amount

    const tokenInputTwo = document.querySelector('#convert input[readonly]');

    var decimalsOfToken2 = tokenAddressesDecimals[TOOption.value];
    if (selectedOption.value == '0xBTC') {
        const formattedResult = ethers.utils.formatUnits(amountToSwap, 8);
        tokenInputTwo.value = `${formattedResult} B0x Tokens & ${formattedResult} RightsTo0xBitcoin Tokens`;
        if (true) {
            console.log("Check here: decimalsOfToken2: ", decimalsOfToken2, " vs balanceOfInputB0x: ", balanceOfInputB0x);
        }
    } else {
        console.log("amount to swap : ", amountToSwap);
        const formattedResult = ethers.utils.formatUnits(amountToSwap, 18);
        tokenInputTwo.value = `${formattedResult} 0xBitcoin Tokens`;
    }
}

// ============================================
// CONVERT EXECUTION
// ============================================

/**
 * Execute token conversion based on selected direction
 * Handles both V1->V2 and V2->V1 conversions
 */
export async function executeConvert() {
    // Disable button with spinner using window reference (function still in script.js)
    if (window.disableButtonWithSpinner) {
        window.disableButtonWithSpinner('executeSwapConvertBtn');
    }

    await switchToEthereum();

    const fromSelect = document.querySelector('#convert .form-group:nth-child(4) select');

    // Get the currently selected value
    const selectedValue = fromSelect.value;
    console.log("Currently selected value:", selectedValue);

    // Or get the selected option element itself
    const selectedOption = fromSelect.options[fromSelect.selectedIndex];

    if (selectedOption.value == 'B0x') {
        console.log("Withdrawing from V2 to V1");
        await withdrawFromV2toV1();
    }
    else {
        console.log("Depositing from V1 to V2");
        await depositFromV1toV2();
    }

    // Enable button using window reference (function still in script.js)
    if (window.enableButton) {
        window.enableButton('executeSwapConvertBtn');
    }

    await fetchBalancesETH();
    await switchToBase();
    await fetchBalances();
}

// ============================================
// V1 TO V2 CONVERSION
// ============================================

/**
 * Deposit 0xBTC to receive B0x + RightsTo0xBTC tokens
 */
export async function depositFromV1toV2() {
    try {
        const tokenInputAddress = tokenAddressesETH['0xBTC'];
        console.log("tokenInputAddress:", tokenInputAddress);

        const amountInput = document.querySelector('#convert .form-group:nth-child(5) input');
        // Get the currently selected value
        const selectedValue2 = amountInput.value;

        // Convert the input amount to the correct format (8 decimals for 0xBTC)
        const amountOf_0xBTC_ToGive = ethers.utils.parseUnits(selectedValue2.toString(), 8);

        // Contract ABI for the approveAndCall function
        const contractABI = [
            "function approveAndCall(address spender, uint tokens, bytes memory data) public returns (bool success)"
        ];

        // Create contract instance for the 0xBTC token
        const contract = new ethers.Contract(tokenInputAddress, contractABI, signerETH);

        // You need to specify the spender address (the V2 contract address)
        const spenderAddress = tokenAddressesETH['B0x'];

        // Call approveAndCall function
        console.log("Calling approveAndCall with amount:", amountOf_0xBTC_ToGive.toString());

        showInfoNotification('Depositing 0xBTC -> B0x + RightsTo0xBTC', 'Please confirm transaction in the wallet');
        const tx = await contract.approveAndCall(
            spenderAddress,           // address spender
            amountOf_0xBTC_ToGive,   // uint tokens
            "0x"                     // bytes data (empty data as hex)
        );

        showInfoNotification();

        console.log("Transaction sent:", tx.hash);

        // Wait for transaction confirmation with retry logic
        let receipt;
        let retries = 0;
        const maxRetries = 20;

        while (!receipt && retries < maxRetries) {
            try {
                receipt = await tx.wait();
                break;
            } catch (error) {
                if (error.code === -32000 && error.message.includes("indexing in progress")) {
                    console.log(`Transaction indexing in progress, retry ${retries + 1}/${maxRetries}...`);
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
                    retries++;
                } else {
                    throw error; // Re-throw other errors
                }
            }
        }

        if (receipt) {
            showSuccessNotification('Successfully converted!', 'Converted 0xBTC -> B0x + RightsTo0xBTC', tx.hash, 'ethereum');
            console.log("Transaction confirmed:", receipt.transactionHash);
        } else {
            // Still show success since transaction was sent
            showSuccessNotification('Transaction sent!', 'Transaction is being processed. Check status with hash: ' + tx.hash, tx.hash, 'ethereum');
        }

        return true;

    } catch (error) {
        console.error("Error in depositFromV1toV2:", error);
          showInfoNotification('Error in DepsoitFromV1toV2: User Declined Tx or Too Many Tokens selected for convert' ,'Please try again and select below the available balance.');
     
        return false;
    }
}

// ============================================
// V2 TO V1 CONVERSION
// ============================================

/**
 * Withdraw B0x + RightsTo0xBTC to receive 0xBTC tokens
 */
export async function withdrawFromV2toV1() {
    try {
        const tokenInputAddress = tokenAddressesETH['B0x'];
        console.log("tokenInputAddress:", tokenInputAddress);

        const amountInput = document.querySelector('#convert .form-group:nth-child(5) input');
        // Get the currently selected value
        const selectedValue2 = amountInput.value;

        // Convert the input amount to the correct format (8 decimals for 0xBTC)
        const amountOf_0xBTC_ToReceive = ethers.utils.parseUnits(selectedValue2.toString(), 8);

        // Contract ABI for the withdrawFromV2toV1 function
        const contractABI = [
            "function withdrawFromV2toV1(uint amountOf_0xBTC_ToRecieve) public"
        ];

        // Create contract instance
        const contract = new ethers.Contract(tokenInputAddress, contractABI, signerETH);

        // Call the withdraw function
        console.log("Calling withdrawFromV2toV1 with amount:", amountOf_0xBTC_ToReceive.toString());

        showInfoNotification('Depositing B0x + RightsTo0xBTC -> 0xBitcoin', 'Please confirm transaction in the wallet');
        const tx = await contract.withdrawFromV2toV1(amountOf_0xBTC_ToReceive);

        console.log("Transaction sent:", tx.hash);

        showInfoNotification();

        // Wait for transaction confirmation with retry logic
        let receipt;
        let retries = 0;
        const maxRetries = 20;

        while (!receipt && retries < maxRetries) {
            try {
                receipt = await tx.wait();
                break;
            } catch (error) {
                if (error.code === -32000 && error.message.includes("indexing in progress")) {
                    console.log(`Transaction indexing in progress, retry ${retries + 1}/${maxRetries}...`);
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
                    retries++;
                } else {
                    throw error; // Re-throw other errors
                }
            }
        }

        if (receipt) {
            showSuccessNotification('Successfully converted!', 'Converted RightsTo0xBTC + B0x -> 0xBitcoin', tx.hash, 'ethereum');
            console.log("Transaction confirmed:", receipt.transactionHash);
        } else {
            // Still show success since transaction was sent
            showSuccessNotification('Transaction sent!', 'Transaction is being processed. Check status with hash: ' + tx.hash, tx.hash, 'ethereum');
        }

        return true;

    } catch (error) {
        console.error("Error in withdrawFromV2toV1:", error);
                  showInfoNotification('Error in withdrawFromV2toV1: User Declined Tx or Too Many Tokens selected for convert' ,'Please try again and Please select below the available balance.');

        return false;
    }
}

// ============================================
// RETRY UTILITY
// ============================================

/**
 * Retry utility function with exponential backoff
 * @param {Function} fn - The function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000, maxDelay = 10000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on final attempt
            if (attempt === maxRetries) {
                break;
            }

            // Calculate exponential backoff with jitter
            const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
            const delay = exponentialDelay + jitter;

            console.log(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`, error.message);

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // If we get here, all retries failed
    throw lastError;
}

// Export all functions
export default {
    getConvertTotal,
    executeConvert,
    depositFromV1toV2,
    withdrawFromV2toV1,
    retryWithBackoff
};
