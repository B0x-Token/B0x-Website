/**
 * Main.js - Application Entry Point
 *
 * This module serves as the central coordinator for the B0x DApp.
 * It imports all modular components and exposes them globally for use
 * throughout the application.
 *
 * @module main
 */

// ============================================
// IMPORT ALL MODULES
// ============================================

// Configuration and constants
import * as Config from './config.js';

// Utility functions
import * as Utils from './utils.js';

// UI functions (notifications, widgets, formatting)
import * as UI from './ui.js';

// Wallet connection and management
import * as Wallet from './wallet.js';

// Charts and data visualization
import * as Charts from './charts.js';

// NEW MODULES - Migrated from script.js
import * as ABIs from './abis.js';
import * as Settings from './settings.js';
import * as Contracts from './contracts.js';
import * as DataLoader from './data-loader.js';
import * as Staking from './staking.js';
import * as Positions from './positions.js';
import * as PositionsRatio from './positions-ratio.js';  // NEW: Ratio calculations
import * as MaxButtons from './max-buttons.js';  // NEW: MAX button functionality
import * as Swaps from './swaps.js';
import * as Convert from './convert.js';  // NEW: Convert functionality
import * as MinerInfo from './miner-info.js';  // NEW: Mining stats and rich lists
import * as Admin from './admin.js';
import * as Init from './init.js';
import * as Whitepaper from './whitepaper.js';  // NEW: Whitepaper page functionality
import * as Pools from './pools.js';  // NEW: Pool fees functionality
import * as MiningCalc from './mining-calc.js';  // NEW: Mining calculator functionality
import * as Countdown from './countdown.js';  // NEW: Countdown timer and reload functionality

// ============================================
// EXPOSE MODULES GLOBALLY
// ============================================

// Expose to window object for backward compatibility with existing script.js
window.Config = Config;
window.Utils = Utils;
window.UI = UI;
window.Wallet = Wallet;
window.Charts = Charts;

// NEW MODULES
window.ABIs = ABIs;
window.Settings = Settings;
window.Contracts = Contracts;
window.DataLoader = DataLoader;
window.Staking = Staking;
window.Positions = Positions;
window.Swaps = Swaps;
window.Convert = Convert;
window.MinerInfo = MinerInfo;
window.Admin = Admin;
window.Init = Init;
window.Whitepaper = Whitepaper;

// ============================================
// EXPOSE KEY CONFIGURATION VARIABLES
// ============================================

// Contract addresses
window.UnsiwapV4PoolCreatorAddress = Config.UnsiwapV4PoolCreatorAddress;
window.USDCToken = Config.USDCToken;
window.positionManager_address = Config.positionManager_address;
window.contractAddress_PositionFinderPro = Config.contractAddress_PositionFinderPro;
window.contractAddress_Swapper = Config.contractAddress_Swapper;
window.contractAddressLPRewardsStaking = Config.contractAddressLPRewardsStaking;
window.hookAddress = Config.hookAddress;
window.ProofOfWorkAddresss = Config.ProofOfWorkAddresss;
window.MULTICALL_ADDRESS = Config.MULTICALL_ADDRESS;

// Token addresses and mappings
window.tokenAddresses = Config.tokenAddresses;
window.tokenAddressesETH = Config.tokenAddressesETH;
window.tokenMap = Config.tokenMap;
window.tokenIconsBase = Config.tokenIconsBase;
window.tokenIconsETH = Config.tokenIconsETH;

// Network configuration
window.defaultRPC_ETH = Config.defaultRPC_ETH;
window.defaultRPC_Base = Config.defaultRPC_Base;
window.chainConfig = Config.chainConfig;

// Data sources
window.defaultDataSource_Testnet = Config.defaultDataSource_Testnet;
window.defaultBACKUPDataSource_Testnet = Config.defaultBACKUPDataSource_Testnet;

// Settings
window.appSettings = Config.appSettings;
window.THROTTLE_DELAY = Config.THROTTLE_DELAY;
window.REWARD_STATS_COOLDOWN = Config.REWARD_STATS_COOLDOWN;

// Contracts list
window.contractsList = Config.contractsList;

// Initial state
window.initialWalletBalances = Config.initialWalletBalances;
window.initialWalletBalancesETH = Config.initialWalletBalancesETH;

// ============================================
// EXPOSE WALLET STATE AND FUNCTIONS
// ============================================

// Wallet state (these will be reactive)
Object.defineProperty(window, 'walletConnected', {
    get: () => Wallet.walletConnected,
    set: (val) => Wallet.setWalletConnected(val)
});

Object.defineProperty(window, 'userAddress', {
    get: () => Wallet.userAddress,
    set: (val) => Wallet.setUserAddress(val)
});

Object.defineProperty(window, 'provider', {
    get: () => Wallet.provider,
    set: (val) => Wallet.setProvider(val)
});

Object.defineProperty(window, 'signer', {
    get: () => Wallet.signer,
    set: (val) => Wallet.setSigner(val)
});

Object.defineProperty(window, 'providerETH', {
    get: () => Wallet.providerETH,
    set: (val) => Wallet.setProviderETH(val)
});

Object.defineProperty(window, 'signerETH', {
    get: () => Wallet.signerETH,
    set: (val) => Wallet.setSignerETH(val)
});

// Wallet functions
window.connectWallet = Wallet.connectWallet;
window.disconnectWallet = Wallet.disconnectWallet;
window.switchToEthereum = Wallet.switchToEthereum;
window.switchToBase = Wallet.switchToBase;
window.checkWalletConnection = Wallet.checkWalletConnection;
window.setupWalletListeners = Wallet.setupWalletListeners;
window.updateWalletUI = Wallet.updateWalletUI;
window.quickconnectWallet = Wallet.quickconnectWallet;

// ============================================
// EXPOSE UTILITY FUNCTIONS
// ============================================

window.tokenAddressesDecimals = Utils.tokenAddressesDecimals;
window.tokenAddressesDecimalsETH = Utils.tokenAddressesDecimalsETH;
window.getTokenNameFromAddress = Utils.getTokenNameFromAddress;
window.getSymbolFromAddress = Utils.getSymbolFromAddress;
window.getSymbolFromAddressETH = Utils.getSymbolFromAddressETH;
window.formatBalanceExact = Utils.formatBalanceExact;
window.formatBalance = Utils.formatBalance;
window.formatExactNumber = Utils.formatExactNumber;
window.formatExactNumberWithCommas = Utils.formatExactNumberWithCommas;
window.formatNumber = Utils.formatNumber;
window.truncateAddress = Utils.truncateAddress;
window.isValidEthereumAddress = Utils.isValidEthereumAddress;
window.fetchTokenBalanceWithEthers = Utils.fetchTokenBalanceWithEthers;
window.fetchTokenBalanceWithEthersETH = Utils.fetchTokenBalanceWithEthersETH;
window.fetchBalances = Utils.fetchBalances;
window.fetchBalancesETH = Utils.fetchBalancesETH;

// ============================================
// EXPOSE UI FUNCTIONS
// ============================================

// Notifications
window.showSuccessNotification = UI.showSuccessNotification;
window.showErrorNotification = UI.showErrorNotification;
window.showWarningNotification = UI.showWarningNotification;
window.showInfoNotification = UI.showInfoNotification;
window.showToast = UI.showToast;
window.showAlert = UI.showAlert;

// Loading widgets
window.showLoadingWidget = UI.showLoadingWidget;
window.hideLoadingWidget = UI.hideLoadingWidget;
window.showLoadingBar = UI.showLoadingBar;
window.hideLoadingBar = UI.hideLoadingBar;
window.updateLoadingProgress = UI.updateLoadingProgress;
window.updateLoadingStatus = UI.updateLoadingStatus;
window.showLoadingScreen = UI.showLoadingScreen;

// Tab switching
window.switchTab = UI.switchTab;
window.switchTab2 = UI.switchTab2;
window.switchTabForStats = UI.switchTabForStats;

// Wallet UI
window.displayWalletBalances = UI.displayWalletBalances;
window.displayWalletBalancesETH = UI.displayWalletBalancesETH;
window.displayNetworkStatus = UI.displayNetworkStatus;

// Widget updates
window.updateWidget = UI.updateWidget;
window.handleWidgetVisibility = UI.handleWidgetVisibility;

// Token icons
window.updateSwapTokenAIcon = UI.updateSwapTokenAIcon;
window.updateSwapTokenBIcon = UI.updateSwapTokenBIcon;
window.updateCreatePositionTokenIcons = UI.updateCreatePositionTokenIcons;
window.updateStakingTokenIcons = UI.updateStakingTokenIcons;

// Token filters
window.filterTokenOptionsCreate = UI.filterTokenOptionsCreate;
window.filterTokenOptionsSwap = UI.filterTokenOptionsSwap;
window.filterTokenOptionsSwapETH = UI.filterTokenOptionsSwapETH;

// Position info
window.updatePositionInfoStaking = UI.updatePositionInfoStaking;
window.updatePositionInfoUnstaking = UI.updatePositionInfoUnstaking;
window.updatePositionInfoIncreaseStaking = UI.updatePositionInfoIncreaseStaking;
window.updatePositionInfoDecreaseStaking = UI.updatePositionInfoDecreaseStaking;
window.updatePositionInfoIncrease = UI.updatePositionInfoIncrease;
window.updatePositionInfoDecrease = UI.updatePositionInfoDecrease;

// Staking stats
window.updateStakingStatsContainer = UI.updateStakingStatsContainer;
window.updateStakingValues = UI.updateStakingValues;

// Stats display
window.updateStatsDisplay = UI.updateStatsDisplay;

// Hashrate and mining stats
window.calculateAndDisplayHashrate = UI.calculateAndDisplayHashrate;
window.calculateHashrate = UI.calculateHashrate;
window.formatHashrate = UI.formatHashrate;

// Reactive access to formattedHashrate
Object.defineProperty(window, 'formattedHashrate', {
    get: () => UI.formattedHashrate
});

// Price and stats functions
window.fetchPriceData = UI.fetchPriceData;
window.calculateB0xPrice = UI.calculateB0xPrice;
window.getTokenStats = UI.getTokenStats;
window.getTarget = UI.getTarget;
window.getDifficulty = UI.getDifficulty;
window.getEpochCount = UI.getEpochCount;
window.getAvgRewardTime = UI.getAvgRewardTime;
window.getRewardPerSolve = UI.getRewardPerSolve;
window.getBlocksToReadjust = UI.getBlocksToReadjust;
window.getTimeEmergency = UI.getTimeEmergency;
window.getRewardEra = UI.getRewardEra;
window.getTokenHolders = UI.getTokenHolders;
window.updateAllMiningStats = UI.updateAllMiningStats;
window.updateMiningStatsDisplay = UI.updateMiningStatsDisplay;
window.getStatsUpdateCooldown = UI.getStatsUpdateCooldown;

// Miner info and rich list functions
window.updateAllMinerInfoFirst = MinerInfo.updateAllMinerInfoFirst;
window.updateAllMinerInfo = MinerInfo.updateAllMinerInfo;
window.fetchTransactionsData = MinerInfo.fetchTransactionsData;
window.showBlockDistributionPieChart = MinerInfo.showBlockDistributionPieChart;
window.showBlockDistributionPieChart2 = MinerInfo.showBlockDistributionPieChart2;
window.getMinerName = MinerInfo.getMinerName;
window.getMinerColor = MinerInfo.getMinerColor;
window.getMinerNameLinkHTML = MinerInfo.getMinerNameLinkHTML;
window.getMinerAddressFromTopic = MinerInfo.getMinerAddressFromTopic;
window.convertHashRateToReadable2 = MinerInfo.convertHashRateToReadable2;
window.loadMoreBlocks = MinerInfo.loadMoreBlocks;
window.pool_colors = MinerInfo.pool_colors;
window.setEstHashrate = MinerInfo.setEstHashrate;

// Rich list data loading
window.loadData2 = UI.loadData2;
window.loadData = UI.loadData;
window.renderTable2 = UI.renderTable2;
window.renderPagination2 = UI.renderPagination2;
window.renderTable = UI.renderTable;
window.renderPagination = UI.renderPagination;
window.changePage = UI.changePage;
window.changePage2 = UI.changePage2;
window.filterData = UI.filterData;
window.filterData2 = UI.filterData2;
window.initRichListEventListeners = UI.initRichListEventListeners;
window.known_miners = MinerInfo.known_miners;

// Whitepaper page functions
window.initWhitepaper = Whitepaper.initWhitepaper;
window.initScrollProgress = Whitepaper.initScrollProgress;
window.initFadeInAnimations = Whitepaper.initFadeInAnimations;
window.initSmoothScrolling = Whitepaper.initSmoothScrolling;
window.initFeatureCardHoverEffects = Whitepaper.initFeatureCardHoverEffects;

// Price variables are now set directly on window object in ui.js
// No need for property descriptors since they're native window properties
// Initialize them if they don't exist
if (typeof window.ratioB0xTo0xBTC === 'undefined') window.ratioB0xTo0xBTC = 0;
if (typeof window.usdCostB0x === 'undefined') window.usdCostB0x = 0;

// APY variable is set in staking.js (GetRewardAPY function)
if (typeof window.APYFINAL === 'undefined') window.APYFINAL = 0;

// Formatting
window.formatNumberWithCommas = UI.formatNumberWithCommas;
window.formatTime = UI.formatTime;
window.formatDate = UI.formatDate;
window.formatDateTime = UI.formatDateTime;
window.formatDuration = UI.formatDuration;
window.formatAddress = UI.formatAddress;

// Dropdowns
window.loadPositionsIntoDappSelections = Positions.loadPositionsIntoDappSelections;
window.updateStakingDepositPositionInfo = Positions.updateStakingDepositPositionInfo;
window.updatePositionInfoMAIN_UNSTAKING = UI.updatePositionInfoMAIN_UNSTAKING;

// Table rendering
window.renderRichListTable = UI.renderRichListTable;
window.renderPaginationControls = UI.renderPaginationControls;
window.updateRichListTable = UI.updateRichListTable;
window.filterAndSortRichList = UI.filterAndSortRichList;
window.updateTokenIcon = UI.updateTokenIcon;
window.updateTokenIconETH = UI.updateTokenIconETH;
window.updateTokenIconCreate = UI.updateTokenIconCreate;
window.initTokenIconListeners = UI.initTokenIconListeners;

// Pool fees
window.getAllFees = Pools.getAllFees;
window.getAllPoolFees = Pools.getAllPoolFees;

// Mining calculator
window.calculateMining = MiningCalc.calculateMining;
window.useCurrentDiff = MiningCalc.useCurrentDiff;
window.useNextDiff = MiningCalc.useNextDiff;
window.setCurrentDifficulty = MiningCalc.setCurrentDifficulty;
window.setNextDifficulty = MiningCalc.setNextDifficulty;
window.setRewardPerSolve = MiningCalc.setRewardPerSolve;
window.setBlocksToGo = MiningCalc.setBlocksToGo;
window.setAvgRewardTime = MiningCalc.setAvgRewardTime;
window.initMiningCalcEventListeners = MiningCalc.initMiningCalcEventListeners;

// ============================================
// EXPOSE CHART FUNCTIONS
// ============================================

// Chart constants (including the best RPC for graphs/stats)
window.CHART_CONSTANTS = Charts.CHART_CONSTANTS;
window.BWORK_RPC = Charts.CHART_CONSTANTS.BWORK_RPC;
window.BWORK_CONTRACT_ADDRESS = Charts.CHART_CONSTANTS.BWORK_CONTRACT_ADDRESS;
window.BWORK_LAST_DIFF_START_BLOCK_INDEX = Charts.CHART_CONSTANTS.BWORK_LAST_DIFF_START_BLOCK_INDEX;
window.BWORK_ERA_INDEX = Charts.CHART_CONSTANTS.BWORK_ERA_INDEX;
window.BWORK_TOKENS_MINTED_INDEX = Charts.CHART_CONSTANTS.BWORK_TOKENS_MINTED_INDEX;
window.BWORK_MINING_TARGET_INDEX = Charts.CHART_CONSTANTS.BWORK_MINING_TARGET_INDEX;

// Chart functions
window.initializeChart = Charts.initializeChart;
window.fetchPriceData = Charts.fetchPriceData;
window.contractValueOverTime = Charts.contractValueOverTime;
window.generateHashrateAndBlocktimeGraph = Charts.generateHashrateAndBlocktimeGraph;
window.updateHashrateAndBlocktimeGraph = Charts.updateHashrateAndBlocktimeGraph;
window.updateGraphData = Charts.updateGraphData;
window.showBlockDistributionPieChart = Charts.showBlockDistributionPieChart;
window.showBlockDistributionPieChart2 = Charts.showBlockDistributionPieChart2;
window.toReadableThousands = Charts.toReadableThousands;
window.toReadableThousandsLong = Charts.toReadableThousandsLong;
window.toReadableHashrate = Charts.toReadableHashrate;
window.BWORKethBlockNumberToDateStr = Charts.BWORKethBlockNumberToDateStr;
window.getResponsiveFontSize = Charts.getResponsiveFontSize;
window.initializeChartConstants = Charts.initializeChartConstants;

// ============================================
// INITIALIZATION
// ============================================

// ============================================
// EXPOSE KEY FUNCTIONS FROM NEW MODULES
// ============================================

// Settings module
window.loadSettings = Settings.loadSettings;
window.saveCustomRPC_Base = Settings.saveCustomRPC_Base;
window.restoreDefaultRPC_Base = Settings.restoreDefaultRPC_Base;
window.saveCustomRPC_ETH = Settings.saveCustomRPC_ETH;
window.restoreDefaultRPC_ETH = Settings.restoreDefaultRPC_ETH;
window.saveCustomDataSource_Testnet = Settings.saveCustomDataSource_Testnet;
window.restoreDefaultCustomDataSource = Settings.restoreDefaultCustomDataSource;
window.saveAddresses = Settings.saveAddresses;
window.restoreDefaultAddresses = Settings.restoreDefaultAddresses;
window.restoreDefaultAddressesfromContract = Settings.restoreDefaultAddressesfromContract;
window.maybeRestoreDefaultAddressesfromContract = Settings.maybeRestoreDefaultAddressesfromContract;
window.restoreDefaultAddressesfromGithub = Settings.restoreDefaultAddressesfromGithub;
window.saveAutoFetchToggle = Settings.saveAutoFetchToggle;
window.loadAutoFetchToggle = Settings.loadAutoFetchToggle;
window.isRewardTokensCacheValid = Settings.isRewardTokensCacheValid;
window.clearRewardTokensCache = Settings.clearRewardTokensCache;
window.saveBACKUPCustomDataSource_Testnet = Settings.saveBACKUPCustomDataSource_Testnet;
window.restoreDefaultBACKUPCustomDataSource = Settings.restoreDefaultBACKUPCustomDataSource;
window.saveMinStaking = Settings.saveMinStaking;
window.saveMinUserHoldings = Settings.saveMinUserHoldings;
window.setupUserSelectionTracking = Settings.setupUserSelectionTracking;
window.initDataSourceLinks = Settings.initDataSourceLinks;
window.handleMinedBlocksUpload = Settings.handleMinedBlocksUpload;
window.handleUniswapDataUpload = Settings.handleUniswapDataUpload;
window.downloadMinedBlocksData = Settings.downloadMinedBlocksData;
window.downloadUniswapData = Settings.downloadUniswapData;
window.CONFIG = Settings.CONFIG;

// Expose settings variables (these get updated by loadSettings)
Object.defineProperty(window, 'customRPC', {
    get: () => Settings.customRPC
});
Object.defineProperty(window, 'customRPC_ETH', {
    get: () => Settings.customRPC_ETH
});
Object.defineProperty(window, 'customDataSource', {
    get: () => Settings.customDataSource
});
Object.defineProperty(window, 'customBACKUPDataSource', {
    get: () => Settings.customBACKUPDataSource
});
Object.defineProperty(window, 'currentSettingsAddresses', {
    get: () => Settings.currentSettingsAddresses
});

// Contracts module
window.checkAllowance = Contracts.checkAllowance;
window.approveToken = Contracts.approveToken;
window.approveTokensViaPermit2 = Contracts.approveTokensViaPermit2;
window.getSqrtRatioAtTick = Contracts.getSqrtRatioAtTick;
window.switchToChain = Contracts.switchToChain;
window.getCurrentChain = Contracts.getCurrentChain;
window.displayNetworkStatus = Contracts.displayNetworkStatus;
window.addToMetaMaskByIndex = Contracts.addToMetaMaskByIndex;
window.renderContracts = Contracts.renderContracts;
window.copyToClipboard = Contracts.copyToClipboard;
window.getExplorerUrl = Contracts.getExplorerUrl;
window.toBigNumber = Contracts.toBigNumber;

// Data Loader module
window.GetContractStatsWithMultiCall = DataLoader.GetContractStatsWithMultiCall;
window.getContractStatsCooldown = DataLoader.getContractStatsCooldown;
window.fetchDataFromUrl = DataLoader.fetchDataFromUrl;
window.mainRPCStarterForPositions = DataLoader.mainRPCStarterForPositions;
window.getNFTOwners = DataLoader.getNFTOwners;
window.getValidPositions = DataLoader.getValidPositions;
window.triggerRefresh = DataLoader.triggerRefresh;

// Staking module
window.updateStakingStats = Staking.updateStakingStats;
window.updateStakingValues = Staking.updateStakingValues;
window.collectRewards = Staking.collectRewards;
window.depositNFTStake = Staking.depositNFTStake;
window.GetRewardAPY = Staking.GetRewardAPY;
window.getRewardStats = Staking.getRewardStats;
window.startRewardPeriod = Staking.startRewardPeriod;
window.addRewardToken = Staking.addRewardToken;
window.fetchAllUniswapFees = Staking.fetchAllUniswapFees;
window.decreaseLiquidityStaking = Staking.decreaseLiquidityStaking;
window.increaseLiquidityStaking = Staking.increaseLiquidityStaking;
window.populateStakingManagementData = Staking.populateStakingManagementData;

// Positions module
window.getTokenIDsOwnedByMetamask = Positions.getTokenIDsOwnedByMetamask;
window.updateStakingValuesFromStored = Positions.updateStakingValuesFromStored;
window.resetTotalStakedAmounts = Positions.resetTotalStakedAmounts;
window.getAllPositionsData = Positions.getAllPositionsData;
window.increaseLiquidity = Positions.increaseLiquidity;
window.decreaseLiquidity = Positions.decreaseLiquidity;
window.updatePositionInfo = Positions.updatePositionInfo;
window.updateStakingDepositPositionInfo = Positions.updateStakingDepositPositionInfo;
window.updateTotalLiqIncrease = Positions.updateTotalLiqIncrease;
window.updateDecreasePositionInfo = Positions.updateDecreasePositionInfo;
window.updatePercentage = Positions.updatePercentage;
window.loadPositionsIntoDappSelections = Positions.loadPositionsIntoDappSelections;
window.showPositionsLoadingState = Positions.showPositionsLoadingState;
window.setIsInitialPositionLoad = Positions.setIsInitialPositionLoad;
window.getIsInitialPositionLoad = Positions.getIsInitialPositionLoad;

// Positions Ratio module
window.getSqrtRtAndPriceRatio = PositionsRatio.getSqrtRtAndPriceRatio;
window.getMaxAmountsWithProperLimiting = PositionsRatio.getMaxAmountsWithProperLimiting;
window.ratioz = PositionsRatio.ratioz;
window.Current_getsqrtPricex96 = PositionsRatio.Current_getsqrtPricex96;
window.readableAmountOut = PositionsRatio.readableAmountOut;
window.ratioAsWei = PositionsRatio.ratioAsWei;

// Swaps module
window.getEstimate = Swaps.getEstimate;
window.findAllRoutes = Swaps.findAllRoutes;
window.getSwapOfTwoTokens = Swaps.getSwapOfTwoTokens;
window.executeSwapFromEstimate = Swaps.executeSwapFromEstimate;
window.executeOptimizedMultiRouteSwap = Swaps.executeOptimizedMultiRouteSwap;

// Convert module
window.getConvertTotal = Convert.getConvertTotal;
window.depositFromV1toV2 = Convert.depositFromV1toV2;
window.withdrawFromV2toV1 = Convert.withdrawFromV2toV1;
window.retryWithBackoff = Convert.retryWithBackoff;

// UI helper functions for swap/convert token selection toggling
window.swapTokens = function() {
    const formGroups = document.querySelectorAll('#swap .form-group');
    let fromSelect, toSelect;

    formGroups.forEach(group => {
        const label = group.querySelector('label');
        if (label && label.textContent === 'From Token') {
            fromSelect = group.querySelector('select');
        } else if (label && label.textContent === 'To Token') {
            toSelect = group.querySelector('select');
        }
    });

    if (fromSelect && toSelect) {
        const tempValue = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = tempValue;
        fromSelect.dispatchEvent(new Event('change', { bubbles: true }));
        toSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
};

window.swapTokensConvert = function() {
    const formGroups = document.querySelectorAll('#convert .form-group');
    let fromSelect, toSelect;

    formGroups.forEach(group => {
        const label = group.querySelector('label');
        if (label && label.textContent === 'From Token') {
            fromSelect = group.querySelector('select');
        } else if (label && label.textContent === 'To Token') {
            toSelect = group.querySelector('select');
        }
    });

    if (fromSelect && toSelect) {
        const tempValue = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = tempValue;
        fromSelect.dispatchEvent(new Event('change', { bubbles: true }));
        toSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
};

window.executeSwap = async function() {
    await Swaps.getSwapOfTwoTokens();
};

window.executeConvert = async function() {
    await Convert.executeConvert();
};

// Other UI helper functions
window.getCreatePosition = PositionsRatio.getCreatePosition;

window.depositNFTStake = Staking.depositNFTStake;
window.withdrawStake = Staking.withdrawNFTStake;
window.withdrawNFTStake = Staking.withdrawNFTStake;
window.collectRewards = Staking.collectRewards;

// Admin module
window.checkAdminAccess = Admin.checkAdminAccess;
window.updateAdminFeeForPool = Admin.updateAdminFeeForPool;
window.updateAdminFeeForPool0xBTCETH = Admin.updateAdminFeeForPool0xBTCETH;
window.updateAdminFeeForPoolB0xETH = Admin.updateAdminFeeForPoolB0xETH;
window.updateAdminFeeForPoolR0xBTC0xBTC = Admin.updateAdminFeeForPoolR0xBTC0xBTC;
window.addERC20ToStakingContract = Admin.addERC20ToStakingContract;
window.removeERC20FromStakingContract = Admin.removeERC20FromStakingContract;
window.showAdminTab = Admin.showAdminTab;
window.hideAdminTab = Admin.hideAdminTab;
window.getIsAdmin = Admin.getIsAdmin;
window.getIsLPOwner = Admin.getIsLPOwner;
window.getIsHookOwner = Admin.getIsHookOwner;
window.getCurrentPoolFee = Admin.getCurrentPoolFee;
window.getCurrentPoolFee0xBTCETH = Admin.getCurrentPoolFee0xBTCETH;
window.getCurrentPoolFeeB0xETH = Admin.getCurrentPoolFeeB0xETH;
window.getCurrentPoolFeeR0xBTC0xBTC = Admin.getCurrentPoolFeeR0xBTC0xBTC;

// Init module
window.initializeDApp = Init.initializeDApp;
window.setupEventListeners = Init.setupEventListeners;
window.initializeTabFromURL = Init.initializeTabFromURL;

// Countdown module
window.resetCountdown = Countdown.resetCountdown;
window.startCountdown = Countdown.startCountdown;
window.stopCountdown = Countdown.stopCountdown;
window.startChecker = Countdown.startChecker;
window.getCountdownElements = Countdown.getCountdownElements;
window.updateCountdownDisplay = Countdown.updateCountdownDisplay;
window.runReloadFunctions = Countdown.runReloadFunctions;
window.getCountdownValue = Countdown.getCountdownValue;
window.setCountdownValue = Countdown.setCountdownValue;
window.isCountdownRunning = Countdown.isCountdownRunning;

console.log('✅ All modules loaded successfully');
console.log('📦 Modules available:', Object.keys({
    Config, Utils, UI, Wallet, Charts, ABIs, Settings,
    Contracts, DataLoader, Staking, Positions, Swaps, Convert, Admin, Init, Whitepaper, Countdown
}));
console.log('🚀 B0x DApp ready for initialization');

// Initialize whitepaper page functionality
Whitepaper.initWhitepaper();

// Export for ES6 module usage
export {
    Config,
    Utils,
    UI,
    Wallet,
    Charts,
    ABIs,
    Settings,
    Contracts,
    DataLoader,
    Staking,
    Positions,
    PositionsRatio,
    Swaps,
    Convert,
    Admin,
    Init,
    Whitepaper,
    Countdown
};
