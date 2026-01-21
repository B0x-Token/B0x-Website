/**
 * @module max-buttons
 * @description MAX button functionality for all input fields
 *
 * Handles:
 * - Creating MAX buttons for input fields
 * - MAX button handlers for different sections (create, increase, stake-increase, swap, convert)
 * - Wallet balance retrieval and formatting
 * - Token-specific max amount calculations
 */

// Import dependencies
import { positionData, stakingPositionData } from './positions.js';
import { handleMaxButtonClick, handleMaxButtonClickStakeIncrease } from './positions-ratio.js';

// ============================================
// GLOBAL STATE ACCESS
// ============================================

// These need to be accessed from window object since they're set globally
const getWalletBalances = () => window.walletBalances || {};
const getWalletBalancesETH = () => window.walletBalancesETH || {};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get max amount for a token from the token list
 * @param {string} tokenSymbol - Token symbol
 * @returns {number} Maximum amount available
 */
function getMaxAmountForTokenList(tokenSymbol) {
    const walletBalances = getWalletBalances();
    return parseFloat(walletBalances[tokenSymbol] || 0);
}

/**
 * Get max amount for a token from the ETH token list
 * @param {string} tokenSymbol - Token symbol
 * @returns {number} Maximum amount available
 */
function getMaxAmountForTokenListETH(tokenSymbol) {
    const walletBalancesETH = getWalletBalancesETH();
    return parseFloat(walletBalancesETH[tokenSymbol] || 0);
}

/**
 * Get max amount for a specific token in a position
 * @param {Object} position - Position object
 * @param {string} tokenSymbol - Token symbol
 * @returns {number} Maximum amount
 */
function getMaxAmountForToken(position, tokenSymbol) {
    if (position.tokenA === tokenSymbol) {
        return parseFloat(position.currentTokenA || 0);
    } else if (position.tokenB === tokenSymbol) {
        return parseFloat(position.currentTokenB || 0);
    }
    return 0;
}

/**
 * Set max amount in input field
 * @param {HTMLElement} inputElement - Input element
 * @param {string} tokenSymbol - Token symbol
 * @param {number|string} maxAmount - Maximum amount
 * @returns {void}
 */
function setMaxAmount2(inputElement, tokenSymbol, maxAmount) {
    if (inputElement) {
        inputElement.value = maxAmount;
        console.log(`Set max amount for ${tokenSymbol}: ${maxAmount}`);

        // Trigger input event to update any listeners
        const event = new Event('input', { bubbles: true });
        inputElement.dispatchEvent(event);
    }
}

/**
 * Truncate decimals without rounding
 * @param {number} num - Number to truncate
 * @param {number} decimals - Number of decimal places
 * @returns {number} Truncated number
 */
function truncateDecimals(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.floor(num * factor) / factor;
}

// ============================================
// MAX BUTTON CREATION
// ============================================

/**
 * Add MAX button to an input field
 * Handles all sections: create, increase, stake-increase, swap, convert
 * @param {HTMLElement} inputElement - Input element to add button to
 * @param {string} tokenSymbol - Token symbol for the field
 * @returns {void}
 */
export function addMaxButtonToField(inputElement, tokenSymbol) {
    // Create MAX button
    const maxButton = document.createElement('button');
    maxButton.type = 'button';
    maxButton.textContent = 'MAX';
    maxButton.className = 'max-button';
    maxButton.style.cssText = `
        position: absolute;
        right: 2px;
        top: 2px;
        bottom: 2px;
        background: #007bff;
        color: white;
        border: none;
        padding: 0 12px;
        border-radius: 0 2px 2px 0;
        font-size: 12px;
        cursor: pointer;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    // Add hover effect
    maxButton.addEventListener('mouseenter', () => {
        maxButton.style.background = '#0056b3';
    });
    maxButton.addEventListener('mouseleave', () => {
        maxButton.style.background = '#007bff';
    });

    // ========================================
    // HANDLER: STAKE INCREASE SECTION
    // ========================================
    maxButton.addEventListener('click', function () {
        const swapSection = document.getElementById('stake-increase');
        if (!swapSection || !swapSection.contains(inputElement)) {
            return;
        }

        const positionSelect = document.querySelector('#stake-increase select');
        const selectedPositionId = positionSelect?.value;
        const position = stakingPositionData[selectedPositionId];

        if (!position) {
            console.log("No position selected in stake-increase");
            return;
        }

        // Determine which token we're working with
        const label = inputElement.closest('.form-group')?.querySelector('label');
        let currentTokenSymbol = tokenSymbol;

        if (label && label.textContent.includes(position.tokenA)) {
            currentTokenSymbol = position.tokenA;
            handleMaxButtonClickStakeIncrease(currentTokenSymbol, inputElement);
        } else if (label && label.textContent.includes(position.tokenB)) {
            currentTokenSymbol = position.tokenB;
            handleMaxButtonClickStakeIncrease(currentTokenSymbol, inputElement);
        } else {
            const maxAmount = getMaxAmountForToken(position, currentTokenSymbol);
            setMaxAmount2(inputElement, currentTokenSymbol, maxAmount);
        }
    });

    // ========================================
    // HANDLER: INCREASE SECTION
    // ========================================
    maxButton.addEventListener('click', function () {
        const swapSection = document.getElementById('increase');
        if (!swapSection || !swapSection.contains(inputElement)) {
            return;
        }

        const positionSelect = document.querySelector('#increase select');
        const selectedPositionId = positionSelect?.value;
        const position = positionData[selectedPositionId];

        if (!position) {
            console.log("No position selected in increase");
            return;
        }

        // Determine which token we're working with
        const label = inputElement.closest('.form-group')?.querySelector('label');
        let currentTokenSymbol = tokenSymbol;

        if (label && label.textContent.includes(position.tokenA)) {
            currentTokenSymbol = position.tokenA;
            handleMaxButtonClick(currentTokenSymbol, inputElement);
        } else if (label && label.textContent.includes(position.tokenB)) {
            currentTokenSymbol = position.tokenB;
            handleMaxButtonClick(currentTokenSymbol, inputElement);
        } else {
            const maxAmount = getMaxAmountForToken(position, currentTokenSymbol);
            setMaxAmount2(inputElement, currentTokenSymbol, maxAmount);
            console.log("tokenC max selected:", maxAmount);
        }
    });

    // ========================================
    // HANDLER: SWAP SECTION
    // ========================================
    maxButton.addEventListener('click', function () {
        const swapSection = document.getElementById('swap');
        if (!swapSection || !swapSection.contains(inputElement)) {
            return;
        }

        console.log("MAX clicked in swap section");

        // Get the currently selected token from the dropdown
        const fromTokenSelect = document.getElementById('fromToken22');
        const tokenSelected = fromTokenSelect?.value;

        if (!tokenSelected) {
            console.log("No token selected in swap");
            return;
        }

        // Get the wallet balance for the selected token
        const maxAmount = getMaxAmountForTokenList(tokenSelected);

        // Set the max amount in the input field
        setMaxAmount2(inputElement, tokenSelected, maxAmount);

        console.log("Swap max amount:", maxAmount);
    });

    // ========================================
    // HANDLER: CREATE SECTION - AMOUNT A
    // ========================================
    maxButton.addEventListener('click', function () {
        const createSection = document.getElementById('create');
        if (!createSection || !createSection.contains(inputElement)) {
            return;
        }

        const label = inputElement.closest('.form-group')?.querySelector('label');

        if (label && label.textContent.trim() === 'Amount A') {
            console.log("Amount A MAX activated!");

            // Call global function if available
            if (typeof window.getMaxCreatePosition === 'function') {
                window.getMaxCreatePosition();
            } else {
                console.error('getMaxCreatePosition function not available');
            }
        }
    });

    // ========================================
    // HANDLER: CREATE SECTION - AMOUNT B
    // ========================================
    maxButton.addEventListener('click', function () {
        const createSection = document.getElementById('create');
        if (!createSection || !createSection.contains(inputElement)) {
            return;
        }

        const label = inputElement.closest('.form-group')?.querySelector('label');

        if (label && label.textContent.trim() === 'Amount B') {
            console.log("Amount B MAX activated!");

            // Call global function if available
            if (typeof window.getMaxCreatePosition === 'function') {
                window.getMaxCreatePosition();
            } else {
                console.error('getMaxCreatePosition function not available');
            }
        }
    });

    // ========================================
    // HANDLER: CONVERT SECTION
    // ========================================
    maxButton.addEventListener('click', function () {
        const convertSection = document.getElementById('convert');
        if (!convertSection || !convertSection.contains(inputElement)) {
            return;
        }

        console.log("MAX clicked in convert section");

        const inputElement3 = document.querySelector('#convert .input-class');
        const fromTokenSelect = document.querySelector('#convert #fromToken');

        if (!fromTokenSelect) {
            console.log("No token select found in convert");
            return;
        }

        const selectedToken = fromTokenSelect.value.split(' - ')[0]; // Gets "ETH" from "ETH - Ethereum"
        const walletBalancesETH = getWalletBalancesETH();
        let maxAmount = 0;

        if (selectedToken === 'B0x') {
            const maxAmount2 = getMaxAmountForTokenListETH('RightsTo0xBTC');
            const maxAmount1 = getMaxAmountForTokenListETH('B0x');

            console.log("RightsTo0xBTC Max:", maxAmount2);
            console.log("B0x Max:", maxAmount1);

            if (maxAmount2 > maxAmount1) {
                console.log("max is B0x");
                maxAmount = maxAmount1;
            } else {
                console.log("max is RightsTo0xBTC");
                maxAmount = maxAmount2;
            }
        } else {
            console.log("0xBTC max");
            maxAmount = getMaxAmountForTokenListETH(selectedToken);
            console.log("0xBTC max:", maxAmount);
        }

        // Format based on token type
        const decimals = ['ETH', 'WBTC'].includes(selectedToken) ? 6 : 3;
        const formattedValue = truncateDecimals(parseFloat(maxAmount), decimals).toFixed(decimals);

        console.log("Calling setMaxAmount2");

        // Set the max amount in the input field
        if (inputElement3) {
            setMaxAmount2(inputElement3, selectedToken, formattedValue);
        }

        // Call getConvertTotal if available
     //   if (typeof window.getConvertTotal === 'function') {
      //      window.getConvertTotal(false);
     //   }
    });

    // ========================================
    // SETUP WRAPPER AND STYLING
    // ========================================

    // Make input element relative positioned
    inputElement.style.position = 'relative';

    // Create wrapper just for input and button
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; display: inline-block; width: 100%;';

    // Insert wrapper before input
    inputElement.parentNode.insertBefore(wrapper, inputElement);

    // Move input into wrapper
    wrapper.appendChild(inputElement);

    // Add padding to input to make room for button and remove input's border radius on right
    inputElement.style.paddingRight = '60px';
    inputElement.style.borderTopRightRadius = '0';
    inputElement.style.borderBottomRightRadius = '0';

    // Append button to wrapper (not the form-group container)
    wrapper.appendChild(maxButton);

    console.log(`MAX button added to field for token: ${tokenSymbol}`);
}

/**
 * Initialize MAX buttons for all input fields
 * Call this after DOM is loaded
 * @returns {void}
 */
export function initializeMaxButtons() {
    console.log('Initializing MAX buttons...');

    // Create section
    const createInputs = document.querySelectorAll('#create input[type="number"]');
    createInputs.forEach(input => {
        if (!input.parentElement.querySelector('.max-button')) {
            addMaxButtonToField(input, 'AUTO');
        }
    });

    // Increase section
    const increaseInputs = document.querySelectorAll('#increase input[type="number"]');
    increaseInputs.forEach(input => {
        if (!input.parentElement.querySelector('.max-button')) {
            addMaxButtonToField(input, 'AUTO');
        }
    });

    // Stake increase section
    const stakeIncreaseInputs = document.querySelectorAll('#stake-increase input[type="number"]');
    stakeIncreaseInputs.forEach(input => {
        if (!input.parentElement.querySelector('.max-button')) {
            addMaxButtonToField(input, 'AUTO');
        }
    });

    // Swap section
    const swapInputs = document.querySelectorAll('#swap input[type="number"]');
    swapInputs.forEach(input => {
        if (!input.parentElement.querySelector('.max-button')) {
            addMaxButtonToField(input, 'AUTO');
        }
    });

    // Convert section
    const convertInputs = document.querySelectorAll('#convert input[type="number"]');
    convertInputs.forEach(input => {
        if (!input.parentElement.querySelector('.max-button')) {
            addMaxButtonToField(input, 'AUTO');
        }
    });

    console.log('✓ MAX buttons initialized');
}

// ============================================
// WINDOW EXPORTS (for compatibility)
// ============================================

window.addMaxButtonToField = addMaxButtonToField;
window.initializeMaxButtons = initializeMaxButtons;

// ============================================
// EXPORTS
// ============================================

export {
    getMaxAmountForTokenList,
    getMaxAmountForTokenListETH,
    getMaxAmountForToken,
    setMaxAmount2,
    truncateDecimals
};

console.log('Max-buttons module loaded');
