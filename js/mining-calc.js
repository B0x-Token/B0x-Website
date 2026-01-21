/**
 * Mining Calculator Module
 *
 * Handles mining profitability calculations including:
 * - Average time per block based on hashrate and difficulty
 * - Daily earnings estimates
 * - Difficulty-based calculations
 */

// =============================================================================
// CONSTANTS
// =============================================================================
const POW_2_22 = Math.pow(2, 22); // 4,194,304
const SECONDS_PER_DAY = 86400;
const MIN_REWARD = 6.25; // tokens per block
const MAX_REWARD = 25; // tokens per block

// =============================================================================
// MODULE STATE
// =============================================================================
let CURRENT_DIFFICULTY = 0.24995304;
let NEXT_DIFFICULTY = 0.28234567;
let variablestatvaluerewardPerSolve = 0;
let blockstogostats = 0;
let avgrewardtimeneedstobesaved = 0;

// =============================================================================
// SETTERS FOR EXTERNAL UPDATES
// =============================================================================

/**
 * Set current difficulty from external source (e.g., miner-info)
 * @param {number} diff - Current mining difficulty
 */
export function setCurrentDifficulty(diff) {
    CURRENT_DIFFICULTY = parseFloat(diff) || CURRENT_DIFFICULTY;
    console.log('Mining calc: CURRENT_DIFFICULTY set to', CURRENT_DIFFICULTY);
}

/**
 * Set next difficulty from external source
 * @param {number} diff - Next mining difficulty after readjustment
 */
export function setNextDifficulty(diff) {
    NEXT_DIFFICULTY = parseFloat(diff) || NEXT_DIFFICULTY;
    console.log('Mining calc: NEXT_DIFFICULTY set to', NEXT_DIFFICULTY);
}

/**
 * Set reward per solve from external source
 * @param {number} reward - Current reward per solve
 */
export function setRewardPerSolve(reward) {
    variablestatvaluerewardPerSolve = parseFloat(reward) || 0;
}

/**
 * Set blocks to go until readjustment
 * @param {number} blocks - Blocks remaining until difficulty readjustment
 */
export function setBlocksToGo(blocks) {
    blockstogostats = parseInt(blocks) || 0;
}

/**
 * Set average reward time
 * @param {number} time - Average reward time value
 */
export function setAvgRewardTime(time) {
    avgrewardtimeneedstobesaved = parseFloat(time) || 0;
}

// =============================================================================
// GETTERS
// =============================================================================

export function getCurrentDifficulty() {
    return CURRENT_DIFFICULTY;
}

export function getNextDifficulty() {
    return NEXT_DIFFICULTY;
}

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

/**
 * Convert time unit to seconds based on the average reward time display
 * @returns {number} Time in seconds
 */
function convertToSeconds() {
    const element = document.querySelector('.stat-value-averageRewardTime');
    if (!element) return 0;

    const fullText = avgrewardtimeneedstobesaved;
    const unitElement = element.querySelector('.avgRewardUnit');
    if (!unitElement) return fullText * 60; // Default to minutes

    const unit = unitElement.textContent.trim().toLowerCase();
    const value = parseFloat(fullText);

    let rewardPerBlock;

    switch (unit) {
        case 'second':
        case 'seconds':
            rewardPerBlock = value;
            break;
        case 'minute':
        case 'minutes':
            rewardPerBlock = value * 60;
            break;
        case 'hour':
        case 'hours':
            rewardPerBlock = value * 3600;
            break;
        case 'day':
        case 'days':
            rewardPerBlock = value * 86400;
            break;
        case 'week':
        case 'weeks':
            rewardPerBlock = value * 604800;
            break;
        case 'month':
        case 'months':
            rewardPerBlock = value * 2592000;
            break;
        case 'year':
        case 'years':
            rewardPerBlock = value * 31536000;
            break;
        default:
            rewardPerBlock = value;
            console.warn(`Unknown time unit: ${unit}`);
    }
    console.log("REWARD PER BLOCK TIME: ", Math.round(rewardPerBlock));
    return Math.round(rewardPerBlock);
}

/**
 * Format time display from seconds to human readable format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTimeCalc(seconds) {
    if (seconds < 1) {
        return (seconds * 1000).toFixed(1) + 'ms';
    } else if (seconds < 60) {
        return seconds.toFixed(1) + 's';
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = (seconds % 60).toFixed(0);
        return `${minutes}m ${remainingSeconds}s`;
    } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    } else {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        return `${days}d ${hours}h`;
    }
}

/**
 * Calculate theoretical rewards over 24 hours with difficulty adjustments
 * @param {number} addINInputedAvergeMineInSeconds - User's average mine time in seconds
 * @param {number} currentAvgReward - Current average reward per block
 * @returns {number} Total theoretical rewards in 24 hours
 */
function calculateTheoreticalRewards(addINInputedAvergeMineInSeconds, currentAvgReward) {
    const currentAverageReward = currentAvgReward;
    const timeValue = avgrewardtimeneedstobesaved;
    const blkToGo = blockstogostats;
    const BlksToGo = blkToGo;

    const unitElement = document.querySelector('.avgRewardUnit');
    const timeUnit = unitElement ? unitElement.textContent.trim().toLowerCase() : 'minutes';

    const timeConversions = {
        'second': 1, 'seconds': 1,
        'minute': 60, 'minutes': 60,
        'hour': 3600, 'hours': 3600,
        'day': 86400, 'days': 86400,
        'week': 604800, 'weeks': 604800,
        'month': 2592000, 'months': 2592000,
        'year': 31536000, 'years': 31536000
    };

    let currentAverageRewardTime = addINInputedAvergeMineInSeconds * BlksToGo + (2016 - BlksToGo) * timeValue * (timeConversions[timeUnit] || 1);
    currentAverageRewardTime = currentAverageRewardTime / (2 * 2016);

    console.log(`Starting values:`);
    console.log(`Current Average Reward: ${currentAverageReward} B0x`);
    console.log(`Current Average Reward Time: ${currentAverageRewardTime} seconds (${currentAverageRewardTime / 60} minutes)`);

    const TARGET_TIME = 600; // 10 minutes in seconds
    const ONE_DAY = 86400;
    const BLOCKS_PER_ADJUSTMENT = 2016;
    let totalRewards = 0;
    let currentReward = currentAverageReward;
    let currentTime = currentAverageRewardTime;
    let adjustmentRound = 0;
    let difficultyMultiplier = 1;

    while (adjustmentRound < 100) {
        adjustmentRound++;

        let blocksPerDay = Math.floor(ONE_DAY / currentTime);
        let blocksThisPeriod = Math.min(BLOCKS_PER_ADJUSTMENT, blocksPerDay);

        let periodRewards = currentReward * blocksThisPeriod;
        totalRewards += periodRewards;

        console.log(`\n--- Adjustment Round ${adjustmentRound} ---`);
        console.log(`Current time per block: ${currentTime.toFixed(2)} seconds (${(currentTime / 60).toFixed(2)} minutes)`);
        console.log(`Current reward per block: ${currentReward} B0x`);
        console.log(`Blocks this period (capped by 1 day): ${blocksThisPeriod}`);
        console.log(`Rewards this period: ${periodRewards} B0x`);
        console.log(`Total rewards so far: ${totalRewards} B0x`);

        if (currentTime < TARGET_TIME) {
            difficultyMultiplier = currentTime / TARGET_TIME;

            if (difficultyMultiplier < 0.25) difficultyMultiplier = 0.25;
            if (difficultyMultiplier > 4) difficultyMultiplier = 4;

            console.log(`Time (${currentTime}s) < Target (${TARGET_TIME}s) - Difficulty adjustment`);
            console.log(`Difficulty multiplier: ${difficultyMultiplier.toFixed(4)}`);

            currentTime += currentTime / difficultyMultiplier;
            currentReward = currentReward * difficultyMultiplier;

            console.log(`New time after adjustment: ${currentTime.toFixed(2)} seconds (${(currentTime / 60).toFixed(2)} minutes)`);
        } else {
            console.log(`Time (${currentTime}s) >= Target (${TARGET_TIME}s) - Equilibrium reached`);
            break;
        }

        if (adjustmentRound * ONE_DAY >= ONE_DAY) {
            console.log(`Simulated one full day`);
            break;
        }
    }

    console.log(`\n=== Final Results ===`);
    console.log(`Total adjustment rounds: ${adjustmentRound}`);
    console.log(`Final time per block: ${currentTime.toFixed(2)} seconds (${(currentTime / 60).toFixed(2)} minutes)`);
    console.log(`Final reward per block: ${currentReward} B0x`);
    console.log(`Total theoretical rewards in 24h: ${totalRewards} B0x`);

    return totalRewards;
}

/**
 * Main mining calculation function
 * Calculates average block time, realistic block time, and daily earnings
 */
export function calculateMining() {
    // Get DOM elements
    const hashrateInput = document.getElementById('hashrate-input');
    const hashrateUnit = document.getElementById('hashrate-unit');
    const difficultyInput = document.getElementById('difficulty-input');
    const avgBlockTimeEl = document.getElementById('avg-block-time');
    const realisticBlockTimeEl = document.getElementById('realistic-block-time');
    const maxTokensEl = document.getElementById('max-tokens');

    if (!hashrateInput || !difficultyInput) {
        console.warn('Mining calculator elements not found');
        return;
    }

    // Get input values
    const hashrate = parseFloat(hashrateInput.value) || 0;
    const unitMultiplier = parseFloat(hashrateUnit?.value) || 1;
    console.log("unit Multiplier = ", unitMultiplier);
    const difficulty = parseFloat(difficultyInput.value) || 0.00000001;

    // Convert hashrate to H/s
    const hashrateHps = hashrate * unitMultiplier;

    if (hashrateHps <= 0) {
        // Reset display if no valid hashrate
        if (avgBlockTimeEl) avgBlockTimeEl.textContent = '∞';
        if (realisticBlockTimeEl) realisticBlockTimeEl.textContent = '∞';
        if (maxTokensEl) maxTokensEl.textContent = '0.00';
        return;
    }

    let EpochPerSeconds = convertToSeconds();

    // Calculate average time to solve a block (in seconds)
    // Formula: time = (2^22 × difficulty) / hashrate
    const avgBlockTime = (POW_2_22 * difficulty) / hashrateHps;

    // Calculate time for 10 blocks (more realistic estimate)
    const realistic10BlockTime = avgBlockTime * 10;

    // Calculate blocks per day
    const blocksPerDay = SECONDS_PER_DAY / avgBlockTime;

    let rewardPerBlock = variablestatvaluerewardPerSolve;
    var newRewardPerBlock = rewardPerBlock;
    if (rewardPerBlock == 0) {
        newRewardPerBlock = 25;
    }

    var MaxBoxPossibleInADay = calculateTheoreticalRewards(avgBlockTime, newRewardPerBlock);
    console.log("MaxBoxPossibleInADay: ", MaxBoxPossibleInADay);

    var newnewRewardPerBlock = newRewardPerBlock;
    if ((avgBlockTime + EpochPerSeconds) >= 600) {
        // Slow blocks: ≥10 minutes = fixed reward
    } else {
        // Fast blocks: reward inversely proportional to speed
        newnewRewardPerBlock = newRewardPerBlock * (600 / (avgBlockTime + EpochPerSeconds));
        if (newnewRewardPerBlock < newRewardPerBlock / 4) {
            newnewRewardPerBlock = newRewardPerBlock / 4;
        }
    }

    var tokensPerDayMax = blocksPerDay * newnewRewardPerBlock;

    if (tokensPerDayMax > MaxBoxPossibleInADay) {
        tokensPerDayMax = MaxBoxPossibleInADay;
    }

    console.log("Blocks Per Day: ", blocksPerDay);
    console.log("Blocks Per Day newnewRewardPerBlock : ", newnewRewardPerBlock);
    console.log("Blocks Per Day tokensPerDayMax: ", tokensPerDayMax);

    // Update the UI with calculated values
    if (maxTokensEl) maxTokensEl.textContent = tokensPerDayMax >= 100 ? tokensPerDayMax.toFixed(0) : tokensPerDayMax.toFixed(1);
    if (avgBlockTimeEl) avgBlockTimeEl.textContent = formatTimeCalc(avgBlockTime);
    if (realisticBlockTimeEl) realisticBlockTimeEl.textContent = formatTimeCalc(realistic10BlockTime);

    // Update additional display elements if they exist
    const displayHashrate = document.getElementById('display-hashrate');
    if (displayHashrate) {
        displayHashrate.textContent = hashrateHps.toLocaleString();
    }
    const displayDifficulty = document.getElementById('display-difficulty');
    if (displayDifficulty) {
        displayDifficulty.textContent = difficulty.toFixed(8);
    }
}

/**
 * Format difficulty value for input display
 * @param {number} diff - Difficulty value
 * @returns {string} Formatted difficulty
 */
function formatDifficultyInput(diff) {
    return diff >= 10 ? parseFloat(diff).toFixed(0) : parseFloat(diff).toFixed(2);
}

/**
 * Use current difficulty value
 */
export function useCurrentDiff() {
    const difficultyInput = document.getElementById('difficulty-input');
    if (difficultyInput) {
        difficultyInput.value = formatDifficultyInput(CURRENT_DIFFICULTY);
        calculateMining();
    }
}

/**
 * Use next difficulty value
 */
export function useNextDiff() {
    const difficultyInput = document.getElementById('difficulty-input');
    if (difficultyInput) {
        difficultyInput.value = formatDifficultyInput(NEXT_DIFFICULTY);
        calculateMining();
    }
}

// =============================================================================
// EVENT LISTENER INITIALIZATION
// =============================================================================

/**
 * Initialize event listeners for the mining calculator
 */
export function initMiningCalcEventListeners() {
    const hashrateInput = document.getElementById('hashrate-input');
    const hashrateUnit = document.getElementById('hashrate-unit');
    const difficultyInput = document.getElementById('difficulty-input');
    const currentDiffBtn = document.getElementById('current-diff-btn');
    const nextDiffBtn = document.getElementById('next-diff-btn');

    if (hashrateInput) {
        hashrateInput.addEventListener('input', calculateMining);
    }

    if (hashrateUnit) {
        hashrateUnit.addEventListener('change', calculateMining);
    }

    if (difficultyInput) {
        difficultyInput.addEventListener('input', calculateMining);
    }

    if (currentDiffBtn) {
        currentDiffBtn.addEventListener('click', useCurrentDiff);
    }

    if (nextDiffBtn) {
        nextDiffBtn.addEventListener('click', useNextDiff);
    }

    console.log('Mining calculator event listeners initialized');

    // Initial calculation
    calculateMining();
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    // Setters
    setCurrentDifficulty,
    setNextDifficulty,
    setRewardPerSolve,
    setBlocksToGo,
    setAvgRewardTime,

    // Getters
    getCurrentDifficulty,
    getNextDifficulty,

    // Calculation functions
    calculateMining,
    formatTimeCalc,

    // Difficulty buttons
    useCurrentDiff,
    useNextDiff,

    // Initialization
    initMiningCalcEventListeners
};
