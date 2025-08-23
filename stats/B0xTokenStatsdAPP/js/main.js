function addToURL(value){
  if (history.pushState) {
    var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + value;
    window.history.pushState({path:newurl},'',newurl);
  }
}

const version = "v0.1.0";

log('B0x Stats', version);
el('#footerversion').innerHTML = version;


var ethblockstart = 24007014;
const ShowStats = true; //Removes my excessive stats
const API_zkBTC_Users_tx_transactions = "https://raw.githubusercontent.com/BasedWorkToken/Based-Work-Token-General/main/api/BWORK_statsPage_stats.html"
const Forge_Pool_efficeny = 150/32 + 1  //150 min solves and 32 min on Forge only
/* intrinsic values */
/* intrinsic values */
var _SECONDS_PER_ETH_BLOCK = 2;
const _ZERO_BN = new Eth.BN(0, 10);
/* contract constants */
/* todo: pull these from the contract */
/* todo: move these into some kind of contract helper class */
const _CONTRACT_NAME = "BZEROXToken";
const _CONTRACT_SYMBOL = "B0x";
const _CONTRACT_ADDRESS = "0x7aDf1927aa0c75Fd054804E9fc6574A56C211AbB"; // main Mining contract for Based Work Token Contract
const Main_CONTRACT_ADDRESS = "0xc57306DBd783f95713Ace082f685dB43B66252aF"; // main Based Work Token Contract


const _CONTRACT_USDCWETH_UNISWAP = "0xd0b53D9277642d899DF5C87A3966A349A798F224"; // main uniswap for USDC WETH on Uniswap v3 uses slot0
const _CONTRACT_BWORK_WETH_UNISWAP_v4_HELPER = "0x2eb2522Cbe2B7000981CE6cb89e0c91D7B325bc4"; // Helps with interface for Uniswap v4 Pool finding Helper


const _MAXIMUM_TARGET_STR_OLD = "27606985387162255149739023449108101809804435888681546220650096895197184";  // 2**234
const _MINT_TOPIC = "0xcf6fbb9dcea7d07263ab4f5c3a92f53af33dffc421d9d121e1c74b307e68189d";
const _MAXIMUM_TARGET_STR = "14474011154664524427946373126085988481658748083205070504932198000989141204992";  // 2**234 to 2**253  2**19 more
const _MINIMUM_TARGET = 2**16;
const _ETH_BLOCKS_PER_REWARD = 60 * 6 * 60 / 12 ;  //60 min * 6 hour * 60 sec / 12 sec per block = blocks per
const _HASHRATE_MULTIPLIER = 2**22; /* TODO: calculate this from max_target (https://en.bitcoin.it/wiki/Difficulty) */
/* contract variable storage locations */
const _LAST_DIFF_START_BLOCK_INDEX = '4'; //BLOCK OF DIFFICULTY START 
const _ERA_INDEX = '5'; //getEpoch
const _TOKENS_MINTED_INDEX = '11';
const _MINING_TARGET_INDEX = '6';

const BWORK_LAST_DIFF_START_BLOCK_INDEX = '4'; //BLOCK OF DIFFICULTY START 
const BWORK_ERA_INDEX = '5'; //getEpoch
const BWORK_TOKENS_MINTED_INDEX = '11';
const BWORK_MINING_TARGET_INDEX = '6';
const BWORK_CONTRACT_ADDRESS ="0x2f38B1a516239739CdCD2C228D1Eb96E29800975"
var BWORK_RPC = new Eth(new Eth.HttpProvider("https://base-mainnet.g.alchemy.com/v2/u6woRjFLe5-e3SfnCYFnfoTlgVUangV3"));

/* calculated contract values */
const _MAXIMUM_TARGET_BN = new Eth.BN(_MAXIMUM_TARGET_STR, 10);
const _MAXIMUM_TARGET_BN_OLD = new Eth.BN(_MAXIMUM_TARGET_STR_OLD, 10);
const _MINIMUM_TARGET_BN = new Eth.BN(_MINIMUM_TARGET);
const _IDEAL_BLOCK_TIME_SECONDS = 60 * 10  //_ETH_BLOCKS_PER_REWARD * _SECONDS_PER_ETH_BLOCK;

/* TODO: figure out why it doesn't work w metamask */
var eth = new Eth(new Eth.HttpProvider("https://base-sepolia.g.alchemy.com/v2/fTukefKxyH-72aDTEBUHqcad2_SK53CC"));
//var eth = new Eth(new Eth.HttpProvider("https://base-mainnet.g.alchemy.com/v2/u6woRjFLe5-e3SfnCYFnfoTlgVUangV3"));
//var eth = new Eth(new Eth.HttpProvider("https://base-sepolia.infura.io/v3/b8af241874c24ec78721b46e19c26c8a"));
// if (typeof window.web3 !== 'undefined' && typeof window.web3.currentProvider !== 'undefined') {
//   var eth = new Eth(window.web3.currentProvider);
// } else {
//   var eth = new Eth(new Eth.HttpProvider("https://mainnet.infura.io/MnFOXCPE2oOhWpOCyEBT"));
//   log("warning: no web3 provider found, using infura.io as backup provider")
// }

var _BLOCK_EXPLORER_ADDRESS_URL = 'https://sepolia.basescan.org/address/';
var _BLOCK_EXPLORER_TX_URL = 'https://sepolia.basescan.org/tx/';
var _BLOCK_EXPLORER_BLOCK_URL = 'https://sepolia.basescan.org/block/';

/* colors used by pool names. todo: move to css, still use them for chart.js */
var pool_colors = {
  orange      : "#C64500",
  purple      : "#4527A0", // note: purple looks a lot like blue
  blue        : "#0277BD",
  green       : "#2E7D32",
  yellow      : "#997500",
  darkpurple  : "#662354",
  darkred     : "hsl(356, 48%, 30%)",
  teal        : "#009688",
  red         : "#f44336",
  slate       : "#34495e",
  brightred   : "#C62828",
  royal       : "#0070bc",
  pink        : "#EC407A",
  grey        : "#78909c",

  /* colors below here are not assigned yet */
  lightpurple : "#9c27b0",
  lime        : "#cddc39",
  brown       : "#8d6e63",
}

var known_miners = {
  "0x49228d306754af5d16d477149ee50bef5ca286be" : [ "BWORK Mining Pool", "http://pool.basedworktoken.org/",     pool_colors.orange ], // mint helper contract (old)
  "0x98181a5f3b91117426331b54e2a47e8fa74f56b0" : [ "BWORK Mining Pool", "http://pool.basedworktoken.org/",     pool_colors.orange ], // mint helper contract (old)
  "0xce2e772f8bcf36901bacf31dfc67e38954e15754" : [ "Mineable Token Pool", "https://pool.0xmt.com/",     pool_colors.orange ], // mint helper contract (old)
  "0xeabe48908503b7efb090f35595fb8d1a4d55bd66" : [ "ABAS Mining Pool", "http://pool.abastoken.org/",     pool_colors.orange ], // mint helper contract
  "0x53ce57325c126145de454719b4931600a0bd6fc4" : [ "0xPool",            "http://0xPool.io",               pool_colors.purple ], // closed sometime 2018
  "0x98b155d9a42791ce475acc336ae348a72b2e8714" : [ "0xBTCpool",         "http://0xBTCpool.com",           pool_colors.blue ],
  "0x363b5534fb8b5f615583c7329c9ca8ce6edaf6e6" : [ "mike.rs pool",      "http://mike.rs",                 pool_colors.green ],
  "0x50212e78d96a183f415e1235e56e64416d972e93" : [ "mike.rs pool",      "http://mike.rs",                 pool_colors.green ], // mint helper contract
  "0x02c8832baf93380562b0c8ce18e2f709d6514c60" : [ "mike.rs pool B",    "http://b.mike.rs",               pool_colors.green ],
  "0x8dcee1c6302232c4cc5ce7b5ee8be16c1f9fd961" : [ "Mine0xBTC",         "http://mine0xbtc.eu",            pool_colors.darkpurple ],
  "0x20744acca6966c0f45a80aa7baf778f4517351a4" : [ "PoolOfD32th",       "http://0xbtc.poolofd32th.club",  pool_colors.darkred ],
  "0xd4ddfd51956c19f624e948abc8619e56e5dc3958" : [ "0xMiningPool",      "http://0xminingpool.com/",       pool_colors.teal ],
  "0x88c2952c9e9c56e8402d1b6ce6ab986747336b30" : [ "0xbtc.wolfpool.io", "http://wolfpool.io/",            pool_colors.red ],
  "0x540d752a388b4fc1c9deeb1cd3716a2b7875d8a6" : [ "tosti.ro",          "http://0xbtc.tosti.ro/",               pool_colors.slate ],
  "0xbbdf0402e51d12950bd8bbd50a25ed1aba5615ef" : [ "ExtremeHash",       "http://0xbtc.extremehash.io/",   pool_colors.brightred ],
  "0x7d28994733e6dbb93fc285c01d1639e3203b54e4" : [ "Wutime.com",        "http://wutime.com/",             pool_colors.royal ],
  "0x02e03db268488716c161721663501014fa031250" : [ "xb.veo.network",    "https://xb.veo.network:2096/",   pool_colors.pink ],
  "0xbf39de3c506f1e809b4e10e00dd22eb331abf334" : [ "xb.veo.network",    "https://xb.veo.network:2096/",   pool_colors.pink ],
  "0x5404bd6b428bb8e326880849a61f0e7443ef5381" : [ "666pool",           "http://0xbtc.666pool.cn/",       pool_colors.grey ],
  "0x7d3ebd2b56651d164fc36180050e9f6f7b890e9d" : [ "MVIS Mining Pool",  "http://mvis.ca",                 pool_colors.blue ],  // added 2020-02-23
  "0xd3e89550444b7c84e18077b9cbe3d4e3920f257d" : [ "0xPool",            "https://0xpool.me/", pool_colors.purple ], // added 2021-12-28, its a combo 0xBTC + BNBTC pool
  "0x6917035f1deecc51fa475be4a2dc5528b92fd6b0" : [ "PiZzA pool",        "http://gpu.PiZzA",               pool_colors.yellow ],
  "0x693d59285fefbd6e7be1b87be959eade2a4bf099" : [ "PiZzA pool",        "http://gpu.PiZzA",               pool_colors.yellow ],
  "0x697f698dd492d71734bcaec77fd5065fa7a95a63" : [ "PiZzA pool",        "http://gpu.PiZzA",               pool_colors.yellow ],
  "0x69ebd94944f0dba3e9416c609fbbe437b45d91ab" : [ "PiZzA pool",        "http://gpu.PiZzA",               pool_colors.yellow ],
  "0x69b85604799d16d938835852e497866a7b280323" : [ "PiZzA pool",        "http://gpu.PiZzA",               pool_colors.yellow ],
  "0x69ded73bd88a72bd9d9ddfce228eadd05601edd7" : [ "PiZzA pool",        "http://gpu.PiZzA",               pool_colors.yellow ],
}


const PoolWETHUSDCtoken = eth.contract(poolAbiSlot0).at(_CONTRACT_USDCWETH_UNISWAP);
const PoolBWORKWETHtoken = eth.contract(poolAbiHELPER_Slot0).at(_CONTRACT_BWORK_WETH_UNISWAP_v4_HELPER);


const token = eth.contract(tokenABI).at(_CONTRACT_ADDRESS);

const MainToken = eth.contract(tokenABI).at(Main_CONTRACT_ADDRESS);

function goToURLAnchor() {
  /* kind of a hack, after charts are loaded move to correct anchor. For some
     reason the viewport is forced to the top when creating the charts */
  if (window.location.hash.search('#difficulty') != -1) {
    // this one isn't really necessary because diffigulty graph is at top of screen
    //var targetOffset = $('#row-difficulty').offset().top;
    //$('html, body').animate({scrollTop: targetOffset}, 500);
  } else if (window.location.hash.search('#reward-time') != -1) {
    var targetOffset = $('#row-reward-time').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 500);
  } else if (window.location.hash.search('#price-time') != -1) {
    var targetOffset = $('#row-price-time').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 500);
  } else if (window.location.hash.search('#rev-time') != -1) {
    var targetOffset = $('#row-avgRevenue-time').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 500);
  }else if (window.location.hash.search('#miners') != -1) {
    var targetOffset = $('#row-miners').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 500);
  }else if (window.location.hash.search('#blocks') != -1) {
    var targetOffset = $('#row-blocks').offset().top;
    $('html, body').animate({scrollTop: targetOffset}, 500);
  }else if (window.location.hash.search('#miningcalculator') != -1) {
    // not necessary; calc is at top of screen
    //var targetOffset = $('#row-miningcalculator').offset().top;
    //$('html, body').animate({scrollTop: targetOffset}, 500);
  }
}

function downloadTextAsFile(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}


function calculateNewMiningDifficulty(current_difficulty,
                                      eth_blocks_since_last_difficulty_period,
                                      epochs_mined) {
  var current_mining_target = _MAXIMUM_TARGET_BN.div(new Eth.BN(current_difficulty));
  var eth_blocks_since_last_difficulty_period = new Eth.BN(eth_blocks_since_last_difficulty_period);
  var epochs_mined = new Eth.BN(epochs_mined);

// MAY NEED TO FIX THIS 60 TO GET CORRECT TIMINGS
// 1300 for polygon 60 for goerli probably 5000 for ABAS
// FIX NewMiningDifficulty adjuster here
  var target_eth_blocks_since_last_difficulty_period = epochs_mined.mul(new Eth.BN(2222));

  if (target_eth_blocks_since_last_difficulty_period == 0) {
    return 0;
  }

  if(eth_blocks_since_last_difficulty_period.lt(target_eth_blocks_since_last_difficulty_period)) {
    //console.log('harder');
    var excess_block_pct = (target_eth_blocks_since_last_difficulty_period.mul(new Eth.BN(100))).div( eth_blocks_since_last_difficulty_period );
    var excess_block_pct_extra = excess_block_pct.sub(new Eth.BN(100));
    if (excess_block_pct_extra.gt(new Eth.BN(1000))) {
      excess_block_pct_extra = new Eth.BN(1000);
    }
    // If there were 5% more blocks mined than expected then this is 5.  If there were 100% more blocks mined than expected then this is 100.
    //make it harder
    var new_mining_target = current_mining_target.sub(current_mining_target.div(new Eth.BN(1000)).mul(excess_block_pct_extra));   //by up to 50 %
  }else{
    //console.log('easier');
    var shortage_block_pct = (eth_blocks_since_last_difficulty_period.mul(new Eth.BN(100))).div( target_eth_blocks_since_last_difficulty_period );
    var shortage_block_pct_extra = shortage_block_pct.sub(new Eth.BN(100));
    if (shortage_block_pct_extra.gt(new Eth.BN(1000))) {
      shortage_block_pct_extra = new Eth.BN(1000); //always between 0 and 1000
    }
    //make it easier
    var new_mining_target = current_mining_target.add(current_mining_target.div(new Eth.BN(500)).mul(shortage_block_pct_extra));   //by up to 50 %
  }

  /* never gunna happen, probably. */
  if(new_mining_target.lt(_MINIMUM_TARGET_BN)) //very difficult
  {
    //console.log('hit minimum');
    new_mining_target = _MINIMUM_TARGET_BN;
  }
  if(new_mining_target.gt(_MAXIMUM_TARGET_BN)) //very easy
  {
    //console.log('hit maximum');
    new_mining_target = _MAXIMUM_TARGET_BN;
  }

  /* return difficulty as an integer */
  return parseInt(_MAXIMUM_TARGET_BN.div(new_mining_target).toString(10));
}

/* move fetching/storing stats into a class, even just to wrap it */
stats = [
  /*Description                     promise which retuns, or null         units               multiplier  null: filled in later*/
['',                              null,                                 "",                 1,          null     ], /* */
['Price of 1 B ZERO X in USD',                null,                      "",                 1,          null     ], /* mining */


['Mining Difficulty',             token.getMiningDifficulty,            "",                 0.000001907,          null     ], /* mining difficulty */
 ['Mining Difficulty2',             token.reAdjustsToWhatDifficultyAVG,            "",                 0.000001907,          null     ], /* mining difficulty */
 ['Estimated Hashrate',            null,                                 "Mh/s",             1,          null     ], /* mining difficulty */
 	['Current Average Reward Time',   null,                                 "minutes",          1,          null     ], /* mining difficulty */
   ['Reward per Solve',   token.getMiningReward,                                _CONTRACT_SYMBOL,          0.000000000000000001,          null     ], /* mining difficulty */
['Rewards Until Readjustment',    token.blocksToReadjust,                                 "",                 1,          null     ], /* mining blocks per adjustment MUST KEEP MUST KEEP MUST */  
 ['Time Until Emergency Adjustment Activated if all rewards not solved',    token.seconds_Until_adjustmentSwitch,                                 "seconds",              1,          null     ], /* usage */

 ['Last Difficulty Start Block',   token.latestDifficultyPeriodStarted,  "",                 1,          null     ], /* mining difficulty */
  ['Last Difficulty Time',   token.latestDifficultyPeriodStarted2,  "",                 1,          null     ], /* mining difficulty */
  ['Target Time',   token.targetTime,  "",                 1,          null     ], /* mining difficulty */
  
  ['',                              null,                                 "",                 1,          null     ], /* */
['Tokens distributed via Mining',                 token.tokensMinted,                   _CONTRACT_SYMBOL,   0.0000000000000000010, null     ], /* supply */
 //adjust max supply as needed 0.00000000000344 is just guess
['Max Supply for Current Era',    token.maxSupplyForEra,                _CONTRACT_SYMBOL,   0.000000000000000001, null     ], /* mining */ 
  
['Total Supply',                  null,                                 "",                 1,          null     ], /* */
    
['',                              null,                                 "",                 1,          null     ], /* */
 
// ['Liquidity',                token4.balanceOf,                      "",                 0.000000000000000001,          null     ], /* mining */
 // ['Staking APY',                token4.getReserves,                      "",                 1	,          null     ], /* mining */
//change variable below to fix stakign APY when ready  

// ['Percent of Liquidity that is Staked',                token4.totalSupply,                      "",                 1,          null     ], /* mining */

['Current Reward Era',            null,                      "/ 59",             1,          null     ], /* mining */
['Current Mining Reward per 12 minute Solve',         token.getMiningReward,                _CONTRACT_SYMBOL,   0.000000000000000001, null     ], /* mining */
 ['Epoch Count',                   token.epochCount,                     "",                 1,          null     ], /* mining */
   ['Epoch Old',                   token.epochOld,                     "",                 1,          null     ], /* mining */
 
 ['Mined Supply Remaining in Era',       null,                                 _CONTRACT_SYMBOL,   0.000000000000000001, null     ], /* mining */
 
['Max Mined Supply for Current Era',    token.maxSupplyForEra,                _CONTRACT_SYMBOL,   0.000000000000000001, null     ], /* mining */
 ['',                              null,                                 "",                 1,          null     ], /* */
 
['Token Holders',                 null,                                 "holders",          1,          null     ], /* usage */
	
/*  ['Total USD Spent Minting Tokens',       null,                                 "txs",   1, null     ], */
  ['Token Transfers',               null,                                 "transfers",        1,          null     ], /* usage */
  ['Total Contract Operations',     null,                                 "txs",              1,          null     ], /* usage */
 ['Last Eth Block',                null,                      "",                 1,          null     ], /* mining */
 ['Last Base Block Number',                eth.blockNumber,                      "",                 1,          null     ], /* mining */
 ['u999',                PoolBWORKWETHtoken.getSlot0ForMyPool,                      "",                 1,          null     ], /* mining */
 ['u1010',                PoolWETHUSDCtoken.slot0,                      "",                 1,          null     ], /* mining */

]


//calculateSecondsUntilAdjustmentSwitch
//tokenABI2
//seconds_Until_adjustmentSwitch
var latest_eth_block = null;
eth.blockNumber().then((value)=>{
  latest_eth_block = parseInt(value.toString(10), 10);
  log('loaded latest_eth_block:', latest_eth_block);
});

var BWORK_latest_eth_block = null;
BWORK_RPC.blockNumber().then((value)=>{
  BWORK_latest_eth_block = parseInt(value.toString(10), 10);
  log('loaded BWORK_latest_eth_block:', BWORK_latest_eth_block);
});

function ethBlockNumberToDateStr(eth_block) {
  //log('converting', eth_block)
  //log('latest e', latest_eth_block)
  /* TODO: use web3 instead, its probably more accurate */
  /* blockDate = new Date(web3.eth.get bBlock(startBlock-i+1).timestamp*1000); */
  return new Date(Date.now() - ((latest_eth_block - eth_block)*_SECONDS_PER_ETH_BLOCK*1000)).toLocaleDateString()
}

function BWORKethBlockNumberToDateStr(eth_block) {
  //log('converting', eth_block)
  //log('latest e', latest_eth_block)
  /* TODO: use web3 instead, its probably more accurate */
  /* blockDate = new Date(web3.eth.get bBlock(startBlock-i+1).timestamp*1000); */
  return new Date(Date.now() - ((BWORK_latest_eth_block - eth_block)*_SECONDS_PER_ETH_BLOCK*1000)).toLocaleDateString()
}


function ethBlockNumberToTimestamp(eth_block) {
  //log('converting', eth_block)
  //log('latest e', latest_eth_block)
  /* TODO: use web3 instead, its probably more accurate */
  /* blockDate = new Date(web3.eth.getBlock(startBlock-i+1).timestamp*1000); */
  return new Date(Date.now() - ((latest_eth_block - eth_block)*_SECONDS_PER_ETH_BLOCK*1000)).toLocaleString()
}
function ethBlockNumberToTimestamp2(eth_block) {
  // Calculate the timestamp for the given Ethereum block number
  const date = new Date(Date.now() - ((latest_eth_block - eth_block) * _SECONDS_PER_ETH_BLOCK * 1000));
  
  // Return the date as a locale-specific string without the time component
  return date.toLocaleDateString();
}

/* convert seconds to a short readable string ("1.2 hours", "5.9 months") */
function secondsToReadableTime(seconds) {
  if(seconds <= 0) {
    return "0 seconds";
  }

  units = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'];
  divisors = [365.25*24*60*60, 30.4*24*60*60, 24*60*60, 60*60, 60, 1]
  for(idx in units) {
    var unit = units[idx];
    var divisor = divisors[idx];
    if(seconds > divisor) {
      return (seconds / divisor).toFixed(1) + ' ' + unit;
    }
  }
  return seconds.toFixed(1) + ' ' + 'seconds';
}

/* convert number to a short readable string ("244.5 K", "1.2 G") */
function toReadableThousands(num_value, should_add_b_tags) {
  units = ['', 'K', 'M', 'B'];
  var final_unit = 'T';
  for(idx in units) {
    var unit = units[idx];
    if(num_value < 1000) {
      final_unit = unit;
      break;
    } else {
      num_value /= 1000;
    }
  }
  var num_value_string = num_value.toFixed(2);

  if(num_value_string.endsWith('.00')) {
    num_value_string = num_value.toFixed(0);
  }

  if(should_add_b_tags) {
    num_value_string = '<b>' + num_value_string + '</b>';
  }
  return num_value_string + ' ' + final_unit;
}

/* convert number to a readable string ("244 Thousand", "3 Billion") */
function toReadableThousandsLong(num_value, should_add_b_tags) {
  units = ['', 'Thousand', 'Million', 'Billion'];
  var final_unit = 'Trillion';
  for(idx in units) {
    var unit = units[idx];
    if(num_value < 1000) {
      final_unit = unit;
      break;
    } else {
      num_value /= 1000;
    }
  }
  if(num_value < 10) {
    var num_value_string = num_value.toFixed(1); 
  } else {
    var num_value_string = num_value.toFixed(0); 
  }
  if(should_add_b_tags) {
    num_value_string = '<b>' + num_value_string + '</b>';
  }
  return num_value_string + ' ' + final_unit;
}

/* convert number to a readable hashrate string ("244.32 Gh/s", "3.05 Th/s") */
function toReadableHashrate(hashrate, should_add_b_tags) {
  units = ['H/s', 'Kh/s', 'Mh/s', 'Gh/s', 'Th/s', 'Ph/s'];
  var final_unit = 'Eh/s';
  for(idx in units) {
    var unit = units[idx];
    if(hashrate < 1000) {
      final_unit = unit;
      break;
    } else {
      hashrate /= 1000;
    }
  }
  var hashrate_string = hashrate.toFixed(2);

  if(hashrate_string.endsWith('.00')) {
    hashrate_string = hashrate.toFixed(0);
  }

  if(should_add_b_tags) {
    hashrate_string = '<b>' + hashrate_string + '</b>';
  }
  return hashrate_string + ' ' + final_unit;
}

function getValueFromStats(name, stats) {
  value = null
  stats.forEach(function(stat){
    if (stat[0] === name) {
      value = stat[4];
    }})
  return value
}

function setValueInStats(name, value, stats) {
  stats.forEach(function(stat){
    if (stat[0] === name) {
      stat[4] = value;
      return;
    }});
}

/* sleep for given number of milliseconds. note: must be called with 'await' */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateStatsThatHaveDependencies(stats) {
  /* estimated hashrate */
  difficulty = getValueFromStats('Mining Difficulty', stats)
  if(mining_calculator_app) {
    mining_calculator_app.setCurrentDifficulty(difficulty);
    mining_calculator_app.useCurrentDiff();
  }
  /* supply remaining in era */
  max_supply_for_era = getValueFromStats('Max Mined Supply for Current Era', stats)
  current_supply = getValueFromStats('Tokens distributed via Mining', stats)

  current_reward = getValueFromStats('Current Mining Reward per 12 minute Solve', stats)

  supply_remaining_in_era = max_supply_for_era - current_supply; /* TODO: probably need to round to current mining reward */

test5 = supply_remaining_in_era.toLocaleString().indexOf(".")
if(test5 != -1){
	supply_remaining_in_era2 = supply_remaining_in_era.toLocaleString().slice(0,test5)
	if(supply_remaining_in_era2.length < 3){
		
		test5 = supply_remaining_in_era.toLocaleString().indexOf(",")
		
		supply_remaining_in_era2 = supply_remaining_in_era.toLocaleString().slice(0,test5)
	}
}else{
	supply_remaining_in_era2 = supply_remaining_in_era.toLocaleString()
}

console.log("current supply_remaining_in_era", supply_remaining_in_era);
rewards_blocks_remaining_in_era2 = 0
console.log("current supply_remaining_in_era", supply_remaining_in_era);




  fixthis = 0.01

  el_safe('#MiningRewardat360minutesSolve').innerHTML = "<b> "+(2800).toLocaleString()+" </b> B0x";
  el_safe('#MiningRewardat12minutesSolve').innerHTML = "<b> "+(7).toLocaleString()+" </b> B0x";
  el_safe('#StakingAPY').innerHTML = "<b>" + (fixthis).toFixed(0) + " </b> %";

//DO MY STUFF FOR AUCTIONS


//DO MY STUFF FOR REST

	epoch_count = getValueFromStats('Epoch Count', stats)


	targetTimez = getValueFromStats('Target Time', stats)

 	 epoch_old = getValueFromStats('Epoch Old', stats)
	rewards_since_readjustment = epoch_count - epoch_old


  circl = getValueFromStats('Tokens distributed via Mining', stats)
  
console.log("circlcircl", circl);


test51 = circl.toLocaleString().indexOf(".")
if(test51 != -1){
	circl2 = circl.toLocaleString().slice(0,test51)	
	if(circl2.length < 3){
		
		test5 = circl.toLocaleString().indexOf(",")
		
		circl2 = circl.toLocaleString().slice(0,test5)
	}
}else{
	circl2 = circl.toLocaleString()
}



 var  auction_Total = getValueFromStats('Tokens distributed via Auctions', stats) - 32768


  el_safe('#TokensdistributedviaAuctions').innerHTML = "<b>" + auction_Total.toLocaleString() + " </b> B0x";
 var  mining_Total = parseInt(getValueFromStats('Tokens distributed via Mining', stats));


  el_safe('#TokensdistributedviaMining').innerHTML = "<b>" + mining_Total.toLocaleString() + " </b> B0x";

  var Staking_Total = mining_Total


  el_safe('#TokensdistributedviaStaking').innerHTML = "<b>" + Staking_Total.toLocaleString() + " </b> B0x";

	var totalCircl = parseInt(parseFloat(Staking_Total) + parseFloat(mining_Total) + parseFloat(auction_Total))

  el_safe('#TotalzkBitcoinCirculatingSupply').innerHTML = "<b>" + totalCircl.toLocaleString() +" </b> B0x";

console.log("totalCircl", totalCircl);


  /* time per reward block */
  current_eth_block = getValueFromStats('Last Base Block Number', stats)
  difficulty_start_eth_block = getValueFromStats('Last Difficulty Start Block', stats)


  /* Add timestamp to 'Last difficulty start block' stat */
//el_safe('#LastDifficultyStartBlock  ').innerHTML += "<span style='font-size:0.8em;'>(" + ethBlockNumberToTimestamp(difficulty_start_eth_block) + ")</span>";



/*Calculate  ZK Sync Era Block Length */
var current_eth_block2 = current_eth_block;
console.log("Current_eth_block2: ", current_eth_block2);
const now = new Date();
const unixTimestamp = Math.floor(now.getTime() / 1000);
const unixMinus12Hours = unixTimestamp - (60*60*36);
console.log(`Current Unix timestamp: ${unixTimestamp}`);
console.log(`Current Unix timestamp minus 36 hours: ${unixMinus12Hours}`);

  
/* time calculated using 15-second eth blocks */
  var eth_blocks_since_last_difficulty_period = current_eth_block - difficulty_start_eth_block;
console.log("current_eth_block", current_eth_block);
console.log("current_eth_blockdifficulty_start_eth_block", difficulty_start_eth_block);
  var seconds_since_readjustment = eth_blocks_since_last_difficulty_period * _SECONDS_PER_ETH_BLOCK;
  seconds_per_reward = seconds_since_readjustment / rewards_since_readjustment;

  tdiffTime = getValueFromStats('Last Difficulty Time', stats);

var currentTimeInSeconds = Math.floor(Date.now() / 1000);

console.log("Last Difficulty Current Time: ", currentTimeInSeconds);
console.log("Last Difficulty Time        :", tdiffTime);
console.log("Last Difficulty rewards_since_readjustment       :", rewards_since_readjustment);
var diffTimezzz = (currentTimeInSeconds - tdiffTime ) / rewards_since_readjustment;

  seconds_per_reward = diffTimezzz;
	console.log("Sec two:", seconds_per_reward);

var Sec_Per_reward = (currentTimeInSeconds - tdiffTime) / (current_eth_block - difficulty_start_eth_block);
	console.log("Sec twoTwo:", Sec_Per_reward);
_SECONDS_PER_ETH_BLOCK = Sec_Per_reward
  const milliseconds = tdiffTime * 1000;

  // Create a new Date object using the milliseconds
  const dateObject = new Date(milliseconds);

  // Extract the different components of the date
  const year = dateObject.getFullYear();
  const month = ("0" + (dateObject.getMonth() + 1)).slice(-2);
  const day = ("0" + dateObject.getDate()).slice(-2);
  const hours = ("0" + dateObject.getHours()).slice(-2);
  const minutes = ("0" + dateObject.getMinutes()).slice(-2);
  const seconds = ("0" + dateObject.getSeconds()).slice(-2);

  // Construct the nice date format
   const niceDateFormat = `${month}-${day}-${year} ${hours}:${minutes}:${seconds}`;

 //el_safe('#LastDifficultyTime').innerHTML += niceDateFormat;
 el_safe('#LastDifficultyStartBlock  ').innerHTML += "<span style='font-size:0.8em;'>(" + niceDateFormat + ")</span>";

  el_safe('#CurrentAverageRewardTime').innerHTML = "<b>" + (diffTimezzz / 60).toFixed(3) + "</b> minutes";
  /* add a time estimate to RewardsUntilReadjustment */
rewards_left = getValueFromStats('Rewards Until Readjustment', stats)

 hashy = getValueFromStats('Mining Difficulty', stats)*2;
  /* calculate next difficulty */
  targetTimez = getValueFromStats('Target Time', stats);

  epoch_old = getValueFromStats('Epoch Old', stats);
  newDifficulty = getValueFromStats('Mining Difficulty2', stats);









 var  secUntilBlocks = getValueFromStats('Time Until Emergency Adjustment Activated if all rewards not solved', stats)

var indaysTime = secUntilBlocks / (60 * 60 * 24);

var MaxNumber = getValueFromStats('Rewards Until Readjustment', stats) 
var eCountz = getValueFromStats('Epoch Count', stats) 
var eCountzOld = getValueFromStats('Epoch Old', stats)
 var NumberToGoLeft =  2048/32 - ((eCountz - eCountzOld) % (2048/32));

if(secUntilBlocks<1){
    el_safe('#TimeUntilEmergencyAdjustmentActivatedifallrewardsnotsolved').innerHTML =  "<b>Emergency Adjustment Activated "+NumberToGoLeft+" blocks left in adjustment period</b>"
  el_safe('#RewardsUntilReadjustment').innerHTML = "<b>"+NumberToGoLeft + "</b> blocks" + "<span style='font-size:0.8em;'>(~" + secondsToReadableTime(NumberToGoLeft*seconds_per_reward) + ")</span>";
  }else{
      el_safe('#TimeUntilEmergencyAdjustmentActivatedifallrewardsnotsolved').innerHTML =  "<b>"+secondsToReadableTime(secUntilBlocks) + "</b>";
  el_safe('#RewardsUntilReadjustment').innerHTML += "<span style='font-size:0.8em;'>(~" + secondsToReadableTime(rewards_left*seconds_per_reward) + ")</span>";
  
  
  }
 el_safe('#TotalSupply').innerHTML +="<b>"+ Number((21000000).toFixed(0)).toLocaleString()+"</b> B0x";
 
log("22diff", difficulty)
log("22rewards_since_readjustment", rewards_since_readjustment)
log("22eth_blocks_since_last_difficulty_period", eth_blocks_since_last_difficulty_period)

  el_safe('#MiningDifficulty').innerHTML += "  <span style='font-size:0.8em;'>(next: ~" + newDifficulty.toLocaleString() + ")</span>";
  if(mining_calculator_app) {
    mining_calculator_app.setNextDifficulty(newDifficulty);
  }

//GET THE FUCKING RATIO BABY
ratioz1 = seconds_per_reward / (60 * 48)
totalOwed1 = (61001200 * (ratioz1 ** 2 ) + (40861500 * ratioz1) ) / 100000000
console.log("CHECK CHECK ", totalOwed1)
  mine_Length2 = seconds_per_reward
totalOwed1 = totalOwed1 * 100 / seconds_per_reward
totalTest = 100 / _IDEAL_BLOCK_TIME_SECONDS 
rad = totalOwed1 / totalTest



log("mine_length", mine_Length2)
 /*Get Inflation % per year */
  last_Block = getValueFromStats('Last Base Block Number', stats)
  block_Then = getValueFromStats('Last Difficulty Start Block', stats) //block not seconds since
  blocks_Total = last_Block - block_Then
  seconds_Total = blocks_Total * _SECONDS_PER_ETH_BLOCK
  current_Reward = getValueFromStats('Current Mining Reward per 12 minute Solve', stats)
log("rew",seconds_Total) 
  epoch_From = getValueFromStats('Epoch Count', stats) - getValueFromStats('Epoch Old', stats)
log("EFrom2 : ", epoch_From)
  total_Minted = getValueFromStats('Tokens distributed via Mining', stats)
  year_Time = 60*60*24*365

current_Reward = current_Reward


/*


//Get Current Average reward
  x =  seconds_per_reward * 888 / targetTimez;
log("xlength2",x)

log("xlength3",x)
log("xlength4",x)
finalx=0
if(seconds_per_reward > (30 * targetTimez)){
 finalx = (24*x*5086060) / (888) + 3456750000;	
}else{
 finalx = (508606 * (15 * x ** 2 ))/(888 ** 2) + (9943920 * x)/(888);
}
log("xlengthfinalx", finalx / 100000000 )

log("xlength", mine_Length2/(48*60))

current_Reward = current_Reward * finalx/100000000

*/
 rewards_blocks_remaining_in_era = supply_remaining_in_era / current_Reward;
if(rewards_blocks_remaining_in_era == 0){
rewards_blocks_remaining_in_era = "Infinity"
}else{

rewards_blocks_remaining_in_era = rewards_blocks_remaining_in_era.toFixed(0)
}
 
//GET THE FUCKING RATIO BABY
  el_safe('#CurrentRewardEra').innerHTML += "<b>0</b> / 39  <span style='font-size:0.8em;'>(next era: ~" + secondsToReadableTime(rewards_blocks_remaining_in_era * seconds_per_reward) + "  @ "+secondsToReadableTime(seconds_per_reward)+" a mint)</div>";


el_safe('#RewardPerSolve').innerHTML = "<b> "+current_Reward.toFixed(0) + "</b> B0x per solve"


  if(mining_calculator_app) {
    mining_calculator_app.setBlockReward(current_Reward);
  }
   el_safe('#MinedSupplyRemaininginEra').innerHTML = "<b>" + supply_remaining_in_era2 + "</b> " + _CONTRACT_SYMBOL + " <span style='font-size:0.8em;'>(~" +rewards_blocks_remaining_in_era + " blocks)</span>";





el_safe('#TargetTime').innerHTML = "<b>"+targetTimez/60+"</b> minutes";
//inflation math below
  inflation = ((current_Reward * epoch_From) / seconds_Total ) * year_Time
  inflation = inflation
log("auction_LengthMinedTotal", (3 * (current_Reward * epoch_From) / seconds_Total ) * year_Time)
log("auction_Length2inflation",inflation) 
log("inflation",inflation) 
log("inflationCircl",circl) 
  inflation_Yearly = (inflation)/(circl+inflation) * 100
  inflation_Yearly = inflation_Yearly.toFixed(0)
//  el_safe('#InflationPercentagePerYear').innerHTML = "<b>" + inflation_Yearly + "</b> % per year";
//  el_safe('#InflationAmountPerYear').innerHTML = "<b>" + inflation.toLocaleString(undefined, {
//  minimumFractionDigits: 0,
//  maximumFractionDigits: 5
//}) + "</b> Forge per year";
  
  el_safe('#InflationPercentagePerYear').innerHTML = "<b>" + inflation_Yearly + "</b> % per year";
  el_safe('#InflationAmountPerYear').innerHTML = "<b>" + inflation.toLocaleString(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}) + "</b> B0x per year";

/* estimated hashrate */
  hashrate = difficulty * _HASHRATE_MULTIPLIER / _IDEAL_BLOCK_TIME_SECONDS;
  /* use current reward rate in hashrate calculation */
  hashrate *= (_IDEAL_BLOCK_TIME_SECONDS / seconds_per_reward);
  setValueInStats('Estimated Hashrate', hashrate, stats);
  el_safe('#EstimatedHashrate').innerHTML = toReadableHashrate(hashrate, true);



  var slot0_WETH_BWORK_POOL = getValueFromStats('u999', stats)
  var tokensUSDC_PoolWETHUSDCtoken = getValueFromStats('u1010', stats)

  console.log("GOT VALUE OF THIS: ",tokensUSDC_PoolWETHUSDCtoken);

  console.log("Slot 0 of WETH_BWORK: ", slot0_WETH_BWORK_POOL);
  var TOTAL_BWORK_WETH_PRICE = (slot0_WETH_BWORK_POOL/2**96)**2
console.log("ETH VALUE OF BWORK IS IS : ",TOTAL_BWORK_WETH_PRICE );
  var total_WETH_USD_Price= 1e12 * (tokensUSDC_PoolWETHUSDCtoken/2**96)**2
  console.log("GOT VALUE TOTAL1 IS : ",total_WETH_USD_Price );

var totalPriceof1Token = 1/TOTAL_BWORK_WETH_PRICE*total_WETH_USD_Price;
  el_safe('#Priceof1BZEROXinUSD').innerHTML = "<b>"+totalPriceof1Token.toFixed(5)+"</b> $";
	
	

  

//Stats for Lower part, price, circulating supply $, and market cap $ and LP liquidity

}


function updateLastUpdatedTime() {
  var time = new Date();
  current_time = time.toLocaleTimeString();
  el('#LastUpdatedTime').innerHTML = current_time;
}

function updateThirdPartyAPIs() {


  $.getJSON(API_zkBTC_Users_tx_transactions,
    function(data) {
      el('#TokenHolders').innerHTML = "<b>" + data["holdersCount"].toLocaleString(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}) + "</b> holders";
      el('#TokenTransfers').innerHTML = "<b>" + data["transfersCount"].toLocaleString(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}) + "</b> transfers";
el('#TotalContractOperations').innerHTML = "<b>" + data["countTxs"].toLocaleString(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}) + "</b> txs";
  });
}
async function fetchTransactionsData(miner_blk_cnt) {
    try {
        // Fetching the transactions data from the GitHub API
        const transactionsData = await $.getJSON('https://raw.githubusercontent.com/BasedWorkToken/Based-Work-Token-General/main/api/CostScript/saveFiles/BWORK_transaction_analysis_cost_summary.json');
        console.log("API DATA: ", transactionsData);
        const combinedData = combineWithMinerData(miner_blk_cnt, transactionsData);
        console.log("Combined Data: ", combinedData);
        return combinedData;
    } catch (error) {
        console.error("Error fetching transaction data: ", error);
        throw error; // Rethrow if you want to handle it elsewhere
    }
}
function combineWithMinerData(miner_blk_cnt, transactionsData) {
    // Prepare a new data structure to hold combined data
    var combinedData = [];
    console.log("Miner Block Count: ", miner_blk_cnt);
    console.log("Transactions Data: ", transactionsData);

    // Loop through the miner_blk_cnt array to find matches with transactions data
    for (const address of miner_blk_cnt) {
        // Convert the miner address to lowercase for comparison
        const lowerCaseAddress = address.toLowerCase();
        
        // Find corresponding transaction entry for the address
        const transactionEntry = transactionsData.find(entry => entry.from.toLowerCase() === lowerCaseAddress);
        
        if (transactionEntry) {
            combinedData.push({
                address: address,
                totalValue: transactionEntry.total_value,
                totalCost: transactionEntry.total_cost,
                transactionCount: transactionEntry.transaction_count
            });
        } else {
            // If no match found, still store the miner data with nulls for the transaction data
            combinedData.push({
                address: address,
               	 totalValue: null,
                totalCost: null,
                transactionCount: null
            });
        }
    }

    // Example of how to use the combined data
    console.log("Combined Data: ", combinedData);
    return combinedData;
}

function showBlockDistributionPieChart(piechart_dataset, piechart_labels) {
  //console.log('dataset', piechart_dataset);
  el('#blockdistributionpiechart2').innerHTML = '<canvas id="chart-block-distribution" width="2rem" height="2rem"></canvas>';

  if(piechart_dataset.length == 0 || piechart_labels.length == 0) {
    return;
  }

  //Chart.defaults.global.elements.arc.backgroundColor = 'rgba(255,0,0,1)';
  Chart.defaults.global.elements.arc.borderColor = 'rgb(32, 34, 38)';
  Chart.defaults.global.elements.arc.borderWidth = 3;

  /* hashrate and difficulty chart */
  var hr_diff_chart = new Chart(document.getElementById('chart-block-distribution').getContext('2d'), {
    type: 'doughnut',

    data: {
        datasets: [piechart_dataset],
        labels: piechart_labels,
    },

    options: {
      legend: {
        display: false,
      },
    },
  });
}

function showBlockDistributionPieChart2(piechart_dataset, piechart_labels) {
  //console.log('dataset', piechart_dataset);
  el('#blockdistributionpiechart2').innerHTML = '<canvas id="chart-block-distribution2" width="2rem" height="2rem"></canvas>';

  if(piechart_dataset.length == 0 || piechart_labels.length == 0) {
    return;
  }

  //Chart.defaults.global.elements.arc.backgroundColor = 'rgba(255,0,0,1)';
  Chart.defaults.global.elements.arc.borderColor = 'rgb(32, 34, 38)';
  Chart.defaults.global.elements.arc.borderWidth = 3;

  /* hashrate and difficulty chart */
  var hr_diff_chart = new Chart(document.getElementById('chart-block-distribution2').getContext('2d'), {
    type: 'doughnut',

    data: {
        datasets: [piechart_dataset],
        labels: piechart_labels,
    },

    options: {
      legend: {
        display: false,
      },
    },
  });
}

function getMinerColor(address, known_miners) {
  function simpleHash(seed, string) {
    var h = seed;
    for (var i = 0; i < string.length; i++) {
      h = ((h << 5) - h) + string[i].codePointAt();
      h &= 0xFFFFFFFF;
    }
    return h;
  }

  if(known_miners[address] !== undefined) {
    var hexcolor = known_miners[address][2];
  } else {
	  var test = (simpleHash(2, address) % 360)
	  if((simpleHash(2, address) % 360) < 0){
		  test = (simpleHash(2, address) % 360) + 360
		  
	  }
    hexcolor = 'hsl(' + test + ', 48%, 30%)';
  }
	if(address == "0xfaf20e5ca7e39d43a3aabc450602b4147c3aa62e"){
	//console.log("hex color: ", hexcolor);
	}
  return hexcolor;
}

function getMinerName(address, known_miners) {
  if(known_miners[address] !== undefined) {
    return known_miners[address][0];
  } else {
    return address.substr(0, 14) + '...';
  }
}

function getMinerNameLinkHTML(address, known_miners) {
  var hexcolor = getMinerColor(address, known_miners);
	if(address == "0xfaf20e5ca7e39d43a3aabc450602b4147c3aa62e"){
	//console.log("Link HTML Color: ", hexcolor);
	}
  var poolstyle = '<span style="background-color: ' + hexcolor + ';" class="poolname">';

  if(known_miners[address] !== undefined) {
    var readable_name = known_miners[address][0];
    var address_url = known_miners[address][1];
  } else {
    var readable_name = address.substr(0, 14) + '...';
    var address_url = _BLOCK_EXPLORER_ADDRESS_URL + address;
  }

  return '<a href="' + address_url + '" target="_blank">' + poolstyle + readable_name + '</span></a>';
}

function getMinerAddressFromTopic(topic) {
  return '0x' + topic.substr(26, 41);
}






/* TODO use hours_into_past */
async function updateAllMinerInfo(eth, stats, hours_into_past){
  log('updateAllMinerInfo');

 var previousChallenge = "0x0";
var totalZKBTC_Mined = [];
  /* array of arrays of type [eth_block, txhash, miner_addr] */
  var mined_blocks = [];
var totalZKTC_Calculated = 0;
	var totalZKBTC_Mined_HASH = 0;
  /* dict where key=miner_addr and value=total_mined_block_count */
  var miner_block_count = {};
  var miner_block_count2 = {};
  var miner_block_countHASH = {};
  /* total number of blocks mined since last difficulty adjustment */
  var total_mint_count_HASH = {};
  var total_block_count = 0;
  var total_tx_count = 0;
  var last_imported_mint_block = 0;
var total_TOTAL_mint_count_HASH = 0;
  var last_reward_eth_block = getValueFromStats('Last Base Block Number', stats)
  var current_eth_block = getValueFromStats('Last Base Block Number', stats)
  var estimated_network_hashrate = getValueFromStats('Estimated Hashrate', stats)
  var last_difficulty_start_block = getValueFromStats('Last Difficulty Start Block', stats)

  // check to see if the browser has any data in localStorage we can use.
  // don't use the data, though, if it's from an old difficulty period
  try {
    var last_diff_block_storage = Number(localStorage.getItem('lastDifficultyStartBlock_EraBitcoin2_afbRAFFABC'));
    last_imported_mint_block = Number(localStorage.getItem('lastMintBlock_EraBitcoin2_afbRAFFABC'));
    previousChallenge = JSON.parse(localStorage.getItem('mintData_GreekWedding2'));
	  console.log("previous ended challenge is this, starting here");
    var mint_data = localStorage.getItem('mintData_EraBitcoin2_afbRAFFABC');

//FUCK THIS LINE    if (mint_data !== null && last_diff_block_storage == last_difficulty_start_block) {
      if (mint_data !== null) {
      mined_blocks = JSON.parse(mint_data);
      log('imported', mined_blocks.length, 'transactions from localStorage');
      mined_blocks.forEach(function(mintData) {
		if(mintData[3] == -1){return;}
		  
		 if(mintData[3] !=0 && mintData[0] > last_difficulty_start_block){
				if (miner_block_countHASH[mintData[2]] === undefined) {
				  miner_block_countHASH[mintData[2]] = mintData[3];
				} else {
				  miner_block_countHASH[mintData[2]]+= mintData[3];
				}
			if ( total_mint_count_HASH[mintData[2]] ===  undefined) {
			  total_mint_count_HASH[mintData[2]] =  1;

			} else {
			  total_mint_count_HASH[mintData[2]] +=  1;

			}
			 total_TOTAL_mint_count_HASH+=mintData[3]/25;
			 
			 totalZKBTC_Mined_HASH[mintData[2]] += mintData[3]/25;

			 
			 
		 }
		  
        if (miner_block_count[mintData[2]] === undefined) {
          miner_block_count[mintData[2]] =  mintData[3]/25;
	  if(miner_block_count2[mintData[2]]  === undefined &&  mintData[3] != 0) {
		  miner_block_count2[mintData[2]] =  1;
	  }else if(  mintData[3] != 0 ){
		miner_block_count2[mintData[2]] +=  1;
	  }
        } else {
          miner_block_count[mintData[2]]+=  mintData[3]/25;
	  if(miner_block_count2[mintData[2]]  === undefined &&  mintData[3] != 0) {
		  miner_block_count2[mintData[2]] =  1;
	  }else if(  mintData[3] != 0 ){
		miner_block_count2[mintData[2]] +=  1;
	  }
        }
	if(mintData[3] !=0){
	    total_tx_count+=1;
	}

        if (total_block_count == 0) {
          total_block_count =  mintData[3]/25;
		
        } else {
          total_block_count+=  mintData[3]/25;
		
        }

        if (totalZKBTC_Mined[mintData[2]] === undefined) {
          totalZKBTC_Mined[mintData[2]] = mintData[3];
	totalZKTC_Calculated += mintData[3];
        } else {
          totalZKBTC_Mined[mintData[2]]+=  mintData[3];
	totalZKTC_Calculated += mintData[3];
        }
      });
    }
  } catch (err) {
    log('error reading from localStorage:', err.message);
    last_imported_mint_block = 0;
    mined_blocks.length = 0;
  }

  var start_log_search_at = Math.max(last_difficulty_start_block +1, last_imported_mint_block + 1);
    last_reward_eth_block = last_reward_eth_block - 2

  log("searching lastlast_difficulty_start_block", last_difficulty_start_block, "blocks");
  log("searching last_imported_mint_block", last_imported_mint_block, "blocks");
  log("searching start_log_search_at", start_log_search_at, "blocks");
  log("searching last_reward_eth_block", last_reward_eth_block, "blocks");
  log("searching last", last_reward_eth_block - start_log_search_at, "blocks"); 
  var blocks_to_search = (current_eth_block - start_log_search_at)
  log('blocks to search', blocks_to_search);
  var stop_log_search_at_loop = 0
  var start_log_search_at_loop = start_log_search_at;
  var iterations = Math.ceil((blocks_to_search / 500));
  if (iterations <= 0) {
    iterations = 1
  }
 var firstRun = 1;
  log('do', iterations, 'runs');
  var run = 0
  var attempts = 0
  while (run < iterations) {
    log('run', run + 1);
    start_log_search_at_loop = start_log_search_at + (run * 500)
    run++;
    stop_log_search_at_loop = start_log_search_at_loop + 499
    log('searching from block', start_log_search_at_loop, 'to block', stop_log_search_at_loop);

     sleep(400)
    //
  /* get all mint() transactions in the last N blocks */
  /* more info: https://github.com/ethjs/ethjs/blob/master/docs/user-guide.md#ethgetlogs */
  /* and https://ethereum.stackexchange.com/questions/12950/what-are-event-topics/12951#12951 */
  await eth.getLogs({
    fromBlock: start_log_search_at_loop,
    toBlock: stop_log_search_at_loop,
    address: _CONTRACT_ADDRESS,
    topics: [_MINT_TOPIC],
  })
  .then((result) => {

    log("got filter results:", result.length, "transactions");
   // total_block_count += result.length;
// Output the result
	  attempts = 0
    result.forEach(function(transaction){
      var tx_hash = transaction['transactionHash'];
      var block_number = parseInt(transaction['blockNumber'].toString());
      var miner_address = getMinerAddressFromTopic(transaction['topics'][1].toString());
      var data3345345 = transaction['data'];
	//console.log("DATA32423, ", data3345345.substring(2, 66));
	var dataAmt = parseInt(data3345345.substring(2, 66), 16) / (10.0 ** 18);
	
//console.log("DATAAMT: ", dataAmt);
      // log('tx_hash=', tx_hash);
      // log('  block=', block_number);
      // log('  miner=', miner_address)
		
	var Challengerz = data3345345.substring(130, 194);
		if(previousChallenge != Challengerz){
			var previousChallenge2 = previousChallenge;
			console.log("Old challenge: ", previousChallenge, " new challenge: ", Challengerz);
			previousChallenge = Challengerz;
			if(previousChallenge2 !== undefined && previousChallenge2 !== null){
			
						var newBlock = [
							mined_blocks[0] && mined_blocks[0][0] !== undefined ? mined_blocks[0][0] : block_number,
							tx_hash,
							miner_address,
							-1
						];
					
					mined_blocks.unshift(newBlock);
			}
			
		}
		//one shift to define a challenge change then another for the actual amount mined after the chal change
      mined_blocks.unshift([block_number, tx_hash, miner_address, dataAmt])
		
		if(dataAmt !=0 && block_number > last_difficulty_start_block ){
			
			 total_TOTAL_mint_count_HASH+=dataAmt/25;
			 if(miner_block_countHASH[miner_address] === undefined) {
				miner_block_countHASH[miner_address] = dataAmt;
			  } else {
				  	//console.log("Before : ",miner_address ," CountHash: ",miner_block_countHASH[miner_address]," adding ", dataAmt);
				  	
				miner_block_countHASH[miner_address] += dataAmt;
				  	//console.log("after: ",miner_address ," CountHash: ",miner_block_countHASH[miner_address]);
			  }
			
			if ( total_mint_count_HASH[miner_address] ===  undefined) {
			  total_mint_count_HASH[miner_address] =  1;

			} else {
			  total_mint_count_HASH[miner_address]+=  1;

			}
			totalZKBTC_Mined_HASH[miner_address] += dataAmt/25;
			
		}
		
		
      if(miner_block_count[miner_address] === undefined) {
        miner_block_count[miner_address] = dataAmt/25;
	if(dataAmt !=0){
     		miner_block_count2[miner_address] = 1;
	}else{
     		miner_block_count2[miner_address] = 0;
	}
	totalZKBTC_Mined[miner_address] = dataAmt;
	totalZKTC_Calculated += dataAmt;
      } else {
        miner_block_count[miner_address] += dataAmt/25;
	if(dataAmt !=0){
        	miner_block_count2[miner_address] += 1;
	}
	totalZKBTC_Mined[miner_address] += dataAmt;
	totalZKTC_Calculated += dataAmt;
      }
        
	if(dataAmt !=0){
		total_tx_count+=1;
		total_block_count+=   dataAmt/25;
	}
    });
	
  
	
	})  
.catch((error) => {
    log('error filtering txs:', error);
     log('error filtering txs:', error);
     log('repeat run', run);
     run = run - 1
	 // if(attempts > 19){
	//	  run = run +1
	//  }
	  attempts = attempts + 1;
     sleep(500)
  });
  
  }
    if (run > 0) {
      localStorage.setItem('mintData_EraBitcoin2_afbRAFFABC', JSON.stringify(mined_blocks));
      localStorage.setItem('mintData_GreekWedding2', JSON.stringify(previousChallenge));
		if (mined_blocks[0] !== undefined) {
			localStorage.setItem('lastMintBlock_EraBitcoin2_afbRAFFABC', mined_blocks[0][0]);
		}
      localStorage.setItem('lastDifficultyStartBlock_EraBitcoin2_afbRAFFABC', last_difficulty_start_block.toString());
    }

    log("processed blocks:",
      Object.keys(miner_block_count).length,
      "unique miners");
	var gotthis ={};
	//console.log("miner_block_count123: ",miner_block_count);
// Get the addresses as an array
const addresses = Object.keys(miner_block_count);
var combinedAddresses = await fetchTransactionsData(addresses);
	//console.log("miner_block_count123 addresses: ",addresses);
	//console.log("My Addresses: ", combinedAddresses);

// Call the function with your tettttt array
//combineKnownMiners(tettttt);
// Logging the result
console.log("Combined Known Miners: ", combinedAddresses);
	// Assuming miner_block_count, miner_block_count2, and totalZKBTC_Mined are all initialized properly

	
	// Assuming combinedAddresses is an array of objects
for (var m1 = 0; m1 < combinedAddresses.length; m1++) {
    const addressData1 = combinedAddresses[m1].address;
 
	//	console.log("fsdfsdfsdf: ",combinedAddresses[m1].address);
	//	console.log("address 1 known miner: ",known_miners[combinedAddresses[m1].address]);
    // Skip if m1 is not a known miner
    if (known_miners[combinedAddresses[m1].address] === undefined) continue; 

    for (var m2 = m1; m2 < combinedAddresses.length; m2++) {
        if (m1 === m2) continue; // Skip self-comparison
		
		//console.log("address 2222 known miner: ",known_miners[combinedAddresses[m2].address]);
		
        const addressData2 = combinedAddresses[m2].address;
		//console.log("addysss : ",addressData2);
        // Skip if m2 is not a known miner
        if (known_miners[combinedAddresses[m2].address] === undefined) continue; 
//console.log("address 1 known miner: ",known_miners[combinedAddresses[m1].address]);
	//	console.log("address 2 known miner: ",known_miners[combinedAddresses[m2].address]);
//console.log("address 1 known miner00000: ",known_miners[combinedAddresses[m1].address][0]);
	//	console.log("address 2 known miner0000: ",known_miners[combinedAddresses[m2].address][0]);
        // Check if the miners are in the same group
        if (known_miners[combinedAddresses[m1].address][0] === known_miners[combinedAddresses[m2].address][0]) {
            // Combine values
			console.log("known miner match");
            combinedAddresses[m2].totalValue += combinedAddresses[m1].totalValue; // Sum totalValue
            combinedAddresses[m2].totalCost += combinedAddresses[m1].totalCost; // Sum totalValue
            combinedAddresses[m2].transactionCount += combinedAddresses[m1].transactionCount; // Sum totalValue

		console.log("combining  : ",addressData1, addressData2);
            // Reset m2's values to indicate it's been combined
            combinedAddresses[m1].totalValue = 0
            combinedAddresses[m1].totalCost = 0
            combinedAddresses[m1].transactionCount = 0
		 }
    }
}

// Optionally, filter out the combined entries (where totalCost is 0)
combinedAddresses = combinedAddresses.filter(addressData => addressData.totalCost > 0);

// Logging the result
console.log("Combined Addresses: ", combinedAddresses);
	
	
    /* collapse miner_block_count using known_miners who have multiple
       address into a single address */
    for(var m1 in miner_block_count) {
      for(var m2 in miner_block_count) {
        if(m1 === m2) {
          continue;
        }
        if(known_miners[m1] !== undefined
           && known_miners[m2] !== undefined
           && known_miners[m1][0] == known_miners[m2][0]) {
          miner_block_count[m1] += miner_block_count[m2];
          miner_block_count2[m1] += miner_block_count2[m2];
          miner_block_count[m2] = 0;
          miner_block_count2[m2] = 0;
          totalZKBTC_Mined[m1] += totalZKBTC_Mined[m2];
          totalZKBTC_Mined[m2] = 0;
        }
      }
    }

    /* delete miners with zero blocks (due to collapse op above) */
    Object.keys(miner_block_count).forEach((miner_addr) => {
      if(miner_block_count[miner_addr] == 0) {
        delete miner_block_count[miner_addr]
      }
    });
	
	log("processed Recent miner blocks:",
      Object.keys(miner_block_countHASH).length,
      "unique miners");

    /* collapse miner_block_count using known_miners who have multiple
       address into a single address */
    for(var m1 in miner_block_countHASH) {
      for(var m2 in miner_block_countHASH) {
        if(m1 === m2) {
          continue;
        }
        if(known_miners[m1] !== undefined
           && known_miners[m2] !== undefined
           && known_miners[m1][0] == known_miners[m2][0]) {
          miner_block_countHASH[m1] += miner_block_countHASH[m2];
			total_mint_count_HASH[m1] += total_mint_count_HASH[m2];
			total_mint_count_HASH[m2]=0;
          miner_block_countHASH[m2] = 0;
        }
      }
    }

    /* delete miners with zero blocks (due to collapse op above) */
    Object.keys(miner_block_countHASH).forEach((miner_addr) => {
      if(miner_block_countHASH[miner_addr] == 0) {
        delete miner_block_countHASH[miner_addr]
      }
    });
    /* delete miners with zero blocks (due to collapse op above) */
    Object.keys(total_mint_count_HASH).forEach((miner_addr) => {
      if(total_mint_count_HASH[miner_addr] == 0) {
        delete total_mint_count_HASH[miner_addr]
      }
    });
	
	
	
	
	
	
	
	/* delete miners with zero blocks (due to collapse op above) */
    Object.keys(miner_block_count2).forEach((miner_addr) => {
      if(miner_block_count2[miner_addr] == 0) {
        delete miner_block_count2[miner_addr]
      }
    });
    /* delete miners with zero blocks (due to collapse op above) */
    Object.keys(totalZKBTC_Mined).forEach((miner_addr) => {
      if(totalZKBTC_Mined[miner_addr] == 0) {
        delete totalZKBTC_Mined[miner_addr]
      }
    });

    /* create sorted list of RECENT miners */
    sorted_miner_block_count_recent_hash = []
    for(var m in miner_block_countHASH) {
      sorted_miner_block_count_recent_hash.push([m, miner_block_countHASH[m]/25, miner_block_countHASH[m], total_mint_count_HASH[m]]);
    }
    /* descending */
    sorted_miner_block_count_recent_hash.sort((a, b) => {return b[1] - a[1];});

    log('done sorting Recent miner info');
	
	var totalBlockszzz =0;
	var a_formattedNumberfffff2 = 0;
	var totalblockz = 0;
	 /* fill in miner info */
    var piechart_labels2 = [];
    var piechart_dataset2 = {
      data: [],
      backgroundColor: [],
      label: 'miner-data2'
    };
	
	
  var tokensETH_Pool1f = getValueFromStats('u77', stats)
  var tokensZKBTC_Pool1f = getValueFromStats('u88', stats)
  var slot0_WETH_BWORK_POOL = getValueFromStats('u999', stats)
  var tokensUSDC_PoolWETHUSDCtoken = getValueFromStats('u1010', stats)

  console.log("GOT VALUE OF THIS: ",tokensUSDC_PoolWETHUSDCtoken);

  console.log("Slot 0 of WETH_BWORK: ", slot0_WETH_BWORK_POOL);
  var TOTAL_BWORK_WETH_PRICE = (slot0_WETH_BWORK_POOL/2**96)**2
console.log("ETH VALUE OF BWORK IS IS : ",TOTAL_BWORK_WETH_PRICE );
  var total_WETH_USD_Price= 1e12 * (tokensUSDC_PoolWETHUSDCtoken/2**96)**2
  console.log("GOT VALUE TOTAL1 IS : ",total_WETH_USD_Price );

var totalPriceof1Token = 1/TOTAL_BWORK_WETH_PRICE*total_WETH_USD_Price;
  //el_safe('#Priceof1BasedWorkTokeninUSD').innerHTML = "<b>"+totalPriceof1Token.toFixed(5)+"</b> $";
	
	
    var innerhtml_buffer2 = '<tr><th>Miner</th><th>Recent Epochs Minted Count</th>'
      + '<th>% of Minted</th><th>Recent Miner Hashrate</th><th>Transaction Count</th><th>Recent BWORK Mined By User</th></tr>';
    sorted_miner_block_count_recent_hash.forEach(function(miner_info) {
      var addr = miner_info[0];
      var blocks = miner_info[1];
	//console.log("miner info: ", miner_info);
	var RewardAmount = miner_info[2].toFixed(0);
	var TotalBlocksPerReward = miner_info[3].toFixed(0);
      var miner_name_link = getMinerNameLinkHTML(addr, known_miners);
      var percent_of_total_blocks = blocks/total_TOTAL_mint_count_HASH;
	var test= getMinerColor(addr, known_miners);
      piechart_dataset2.data.push(blocks);
		//console.log("Miner color: ",test, " miner ", addr);
      piechart_dataset2.backgroundColor.push(test)
      piechart_labels2.push(getMinerName(addr, known_miners))
	totalBlockszzz+=parseFloat(TotalBlocksPerReward);
		totalblockz+=parseFloat(blocks);
		a_formattedNumberfffff2+=parseFloat(RewardAmount);
const formattedNumberfffff2 = new Intl.NumberFormat(navigator.language).format(RewardAmount);
      innerhtml_buffer2 += '<tr><td>'
        + miner_name_link + '</td><td>'
        + blocks + '</td><td>'
        + (100*percent_of_total_blocks).toFixed(2) + '%' + '</td><td style="white-space: nowrap;">'+ toReadableHashrate(percent_of_total_blocks*estimated_network_hashrate, false)+ '</td><td>'+TotalBlocksPerReward+'</td><th>'+formattedNumberfffff2+' B0x</th></tr>';
    });
	
const formattedNumberfffff2FFFF = new Intl.NumberFormat(navigator.language).format(a_formattedNumberfffff2);
	      
	
      innerhtml_buffer2 += '<tr><td style="border-bottom: 0rem;">TOTAL:'
		+ '</td><td style="border-bottom: 0rem;">'
        + totalblockz + '</td><td style="border-bottom: 0rem;">'
        + '100%' + '</td><td style="border-bottom: 0rem;">'+ toReadableHashrate(estimated_network_hashrate, false)+ '</td><td style="border-bottom: 0rem;">'+totalBlockszzz+'</td><td style="border-bottom: 0rem;">'+formattedNumberfffff2FFFF+' B0x</td></tr>';
	
	
//	el('#minerstats2').innerHTML = innerhtml_buffer2;
    log('done populating RECENT miner stats');
    // $(window).hide().show(0);
    // $(window).trigger('resize');

    showBlockDistributionPieChart2(piechart_dataset2, piechart_labels2);

	
	
	
    /* create sorted list of ALL MINTS of miners */
    sorted_miner_block_count = []
    for(var m in miner_block_count) {
      sorted_miner_block_count.push([m, miner_block_count[m], totalZKBTC_Mined[m], miner_block_count2[m]]);
    }
    /* descending */
    sorted_miner_block_count.sort((a, b) => {return b[1] - a[1];});

    log('done sorting miner info');

    /* fill in miner info */
    var piechart_labels = [];
    var piechart_dataset = {
      data: [],
      backgroundColor: [],
      label: 'miner-data'
    };
	var totalSpentINUSD = 0;
    var innerhtml_buffer = '<tr><th>Miner</th><th>Total Epochs Minted Count</th>'
      + '<th>% of Minted</th><th>Transaction Count</th><th>TOTAL B0x Mined</th></tr>';
    sorted_miner_block_count.forEach(function(miner_info) {
      var addr = miner_info[0];
// Find the matching address in combinedAddresses
const matchingAddressData = combinedAddresses.find(addressData => addressData.address === addr);
var totalCostForUser = 0;
if (matchingAddressData) {
    // If a match is found, retrieve the totalCost
    const totalCost = matchingAddressData.totalCost;
    //console.log("Total Cost for address", addr, ":", totalCost);
	totalCostForUser = totalCost / 1e18;
	
} else {
   // console.log("Address", addr, "not found in combinedAddresses.");
}
		totalCostForUser = totalCostForUser * total_WETH_USD_Price;
		totalSpentINUSD+=totalCostForUser;
      var blocks = miner_info[1];
	var RewardAmount = miner_info[2].toFixed(0);
	var TotalBlocksPerReward = miner_info[3].toFixed(0);
      var miner_name_link = getMinerNameLinkHTML(addr, known_miners);
      var percent_of_total_blocks = blocks/total_block_count;
	
      piechart_dataset.data.push(blocks);
      piechart_dataset.backgroundColor.push(getMinerColor(addr, known_miners))
      piechart_labels.push(getMinerName(addr, known_miners))

const formattedNumberfffff2 = new Intl.NumberFormat(navigator.language).format(RewardAmount);
      innerhtml_buffer += '<tr><td>'
        + miner_name_link + '</td><td>'
        + blocks + '</td><td>'
        + (100*percent_of_total_blocks).toFixed(2) + '%' + '</td><td>'+TotalBlocksPerReward+'</td><th style="white-space: nowrap">'+formattedNumberfffff2+' B0x</th></tr>';
    });
const formattedNumberfffff23 = new Intl.NumberFormat(navigator.language).format(totalZKTC_Calculated.toFixed(0));

	
	/* el_safe('#TotalUSDSpentMintingTokens').innerHTML = "<b>" + totalSpentINUSD.toLocaleString(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
}) + "</b> $";
	*/
  el_safe('#SuccessfulMintTransactions').innerHTML = "<b> "+(total_tx_count).toLocaleString()+" </b> txs";
    /* add the last row (totals) */
    innerhtml_buffer += '<tr><td style="border-bottom: 0rem;">TOTAL:</td><td style="border-bottom: 0rem;">'
      + total_block_count + '</td><td style="border-bottom: 0rem;">100%</td><td style="border-bottom: 0rem;">' + total_tx_count + '</td><td style="border-bottom: 0rem;">'+formattedNumberfffff23+' B0x</td></tr>';
    el('#minerstats').innerHTML = innerhtml_buffer;
    log('done populating miner stats');
    // $(window).hide().show(0);
    // $(window).trigger('resize');

    showBlockDistributionPieChart(piechart_dataset, piechart_labels);



    var blocks_since_last_reward = current_eth_block - last_reward_eth_block;
    var date_now = new Date();
    var date_of_last_mint = new Date(date_now.getTime() - blocks_since_last_reward*_SECONDS_PER_ETH_BLOCK*1000)

    function get_date_from_eth_block(eth_block) {
      /* TODO: use web3 instead, its probably more accurate */
      /* blockDate = new Date(web3.eth.getBlock(startBlock-i+1).timestamp*1000); */
	const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true, milliseconds: false };

      return new Date(date_of_last_mint.getTime() - ((last_reward_eth_block - eth_block)*_SECONDS_PER_ETH_BLOCK*1000)).toLocaleString('en-US', options);
    }
	var totalzkBTCMinted = 1.0000;
    /* fill in block info */
    var dt = new Date();
    var innerhtml_buffer = '<tr><th>Time (Approx)</th><th>zkSync Era Block #</th>'
      + '<th>Transaction Hash</th><th>Miner</th><th>Reward Amount</th></tr>';
    mined_blocks.forEach(function(block_info) {
      var eth_block = parseInt(block_info[0]);
      var tx_hash = block_info[1];
      var addr = block_info[2];
	var dataF = block_info[3].toFixed(4);
		
			 totalzkBTCMinted += parseFloat(dataF);
const formattedNumberfffff = new Intl.NumberFormat(navigator.language).format(dataF);
const formattedNumbertotalzkBTCMinted = new Intl.NumberFormat(navigator.language).format(totalzkBTCMinted);
      var miner_name_link = getMinerNameLinkHTML(addr, known_miners);

      var transaction_url = _BLOCK_EXPLORER_TX_URL + tx_hash;
      var block_url = _BLOCK_EXPLORER_BLOCK_URL + eth_block;

      //log('hexcolor:', hexcolor, address_url);
		if(formattedNumberfffff == -1 ){
			
				
				

			var parzedint = parseInt(totalzkBTCMinted/25);
const formattedNumberparzedint = new Intl.NumberFormat(navigator.language).format(parzedint);


				var finalstr="";
				// The substring to find and the replacement value
				const searchString = "PeriodNumberperiod";
			str = innerhtml_buffer;
			  const lastIndex = str.lastIndexOf(searchString);
			  if (lastIndex === -1) {
				finalstr = str;
			  }else{

				  const before = str.substring(0, lastIndex);
				  const after = str.substring(lastIndex + searchString.length);
				  finalstr = before + formattedNumberparzedint + after;
			  }
				  innerhtml_buffer = finalstr;

					if(eth_block > 25990908){

								 innerhtml_buffer  += '<tr><td align="right" style="text-overflow:ellipsis;white-space: nowrap;overflow: hidden;">'
								+ get_date_from_eth_block(eth_block) + '</td><td>'
								+ '<b>New difficulty period</b>' + '</td><td>'
								+ '<b>New Challenge</b>'
								+ '</td><td><b> Previous Period had</b></td><td><b>PeriodNumberperiod Mints</b></td></tr>';
								//+ '</a></td></tr>';
								 totalzkBTCMinted = 1.0;
			}else{
				 				innerhtml_buffer  += '<tr><td align="right" style="text-overflow:ellipsis;white-space: nowrap;overflow: hidden;">'
								+ get_date_from_eth_block(eth_block) + '</td><td>'
								+ '<b>New difficulty period</b>' + '</td><td>'
								+ '<b>New Challenge</b>'
								+ '</td><td><b> Previous Period had</b></td><td><b>0 Mints</b></td></tr>';
								//+ '</a></td></tr>';
								 totalzkBTCMinted = 1.0;
				
			}
		}else
		{
			
		  innerhtml_buffer  += '<tr><td align="right" style="text-overflow:ellipsis;white-space: nowrap;overflow: hidden;">'
			+ get_date_from_eth_block(eth_block) + '</td><td>'
			+ '<a href="' + block_url + '" target="_blank">' + eth_block + '</td><td>'
			+ '<a href="' + transaction_url + '" title="' + tx_hash + '" target="_blank">'
			+ tx_hash.substr(0, 16) + '...</a></td><td align="right" style="text-overflow:ellipsis;white-space: nowrap;overflow: hidden;">'
			+ miner_name_link + '</td><td>'	+ formattedNumberfffff +" B0x</td></tr>";
			//+ '</a></td></tr>';
			
		}
    });
    el('#blockstats').innerHTML = innerhtml_buffer;
    log('done populating block stats');

    goToURLAnchor();
 


}

/* get last hours_into_past worth of mined 0xbtc blocks, save to a CSV file */
function getMinerInfoCSV(eth, stats, hours_into_past){
  log('getMinerInfoCSV...')
  var last_reward_eth_block = getValueFromStats('Last Base Block Number', stats)
  var current_eth_block = getValueFromStats('Last Base Block Number', stats)
  var last_difficulty_start_block = getValueFromStats('Last Difficulty Start Block', stats)

  if (hours_into_past == undefined) {
    hours_into_past = 48;
  }

  var num_eth_blocks_to_search = hours_into_past * 60 * 60 / 15;
  //var num_eth_blocks_to_search = last_reward_eth_block - last_difficulty_start_block;
  log("searching last", num_eth_blocks_to_search, "blocks");

  /* get all mint() transactions in the last N blocks */
  /* more info: https://github.com/ethjs/ethjs/blob/master/docs/user-guide.md#ethgetlogs */
  /* and https://ethereum.stackexchange.com/questions/12950/what-are-event-topics/12951#12951 */
  eth.getLogs({
    fromBlock: last_reward_eth_block - num_eth_blocks_to_search,
    toBlock: last_reward_eth_block,
    address: _CONTRACT_ADDRESS,
    topics: [_MINT_TOPIC],
  })
  .then((result) => {
    /* array of arrays of type [eth_block, txhash, miner_addr] */
    var mined_blocks = [];

    log("got filter results:", result.length, "transactions");

    result.forEach(function(transaction){
      var tx_hash = transaction['transactionHash'];
      var block_number = parseInt(transaction['blockNumber'].toString());
      var miner_address = getMinerAddressFromTopic(transaction['topics'][1].toString());

      mined_blocks.push([block_number, tx_hash, miner_address])
    });


    /* we will eventually show newest blocks first, so reverse the list */
    mined_blocks.reverse();

    var blocks_since_last_reward = current_eth_block - last_reward_eth_block;
    var date_now = new Date();
    var date_of_last_mint = new Date(date_now.getTime() - blocks_since_last_reward*_SECONDS_PER_ETH_BLOCK*1000)

    function get_date_from_eth_block(eth_block) {
      /* TODO: use web3 instead, its probably more accurate */
      /* blockDate = new Date(web3.eth.getBlock(startBlock-i+1).timestamp*1000); */
      return new Date(date_of_last_mint.getTime() - ((last_reward_eth_block - eth_block)*_SECONDS_PER_ETH_BLOCK*1000)).toLocaleString()
    }

    /* fill in block info */
    var dt = new Date();
    var csv_text = 'Time (Approx), Eth Block #, '
      + 'Transaction Hash, Miner Name, Erh Address\n';
    mined_blocks.forEach(function(block_info) {
      var eth_block = parseInt(block_info[0]);
      var tx_hash = block_info[1];
      var addr = block_info[2];

      if(known_miners[addr] !== undefined) {
        var miner_name = known_miners[addr][0];
      } else {
        var miner_name = '';
      }

      csv_text  += ''
        + '"' + get_date_from_eth_block(eth_block) + '"' + ', '
        + eth_block + ', '
        + tx_hash + ', '
        + miner_name + ', '
        + addr + '\n';

    });
    //el('#blockstats').innerHTML = csv_text;
    log('done');
    // Start file download.
    downloadTextAsFile("zkBitcoin-blocks" + date_now.toLocaleTimeString() + ".csv",
                       csv_text);

    goToURLAnchor();
  })
  .catch((error) => {
    log('error filtering txs:', error);
  });
}

function createStatsTable(){
  stats.forEach(function(stat){
    stat_name = stat[0]
    stat_function = stat[1]
    stat_unit = stat[2]
    stat_multiplier = stat[3]
var goodStat = true

if(stat[0]=='Total Supply Staking Contract' || stat[0] =='Total Supply in all Sushiswap Pool'  || stat[0] =='RewardRate Pool 1'  || stat[0] =='RewardRate3 Pool 1'  || stat[0] =='Pool 1 Num1 Token'  || stat[0] =='Pool 1 Num2 Token'  || stat[0] =='Epoch Old'   || stat[0] =='SecondsPerDay Auction Contract' || stat[0] == 'Mining Difficulty2' ){
	goodStat = false;
	if(!ShowStats){
		goodStat = true;
		}
} 

if(stat[0]=='Total Supply in all Balancer Pool 2' || stat[0] =='TotalSupply Staking Contract Pool 2'  || stat[0] =='RewardRate Pool 2'  || stat[0] =='RewardRate3 Pool 2'  || stat[0] =='Pool 2 Num1 Token'  || stat[0] =='Pool 2 Num2 Token' || stat[0] =='Pool 2 Num3 Token'  || stat[0] =='POOL TWO POOL TWO POOL TWO UNDER'  || stat[0] =='POOL 1 POOL 1 POOL 1 UNDER' ){
	goodStat = false;
	if(!ShowStats){
		goodStat = true;
		}
} 
/*
  ['POOL 1 POOL 1 POOL 1 UNDER',                              null,                                 "",                 1,          null     ], 
  ['',                              null,                                 "",                 1,          null     ], 
 ['Total Supply in all Balancer Pool 1',               token4.totalSupply,                      "",                 0.000000000000000001,          null     ], 
   ['TotalSupply Staking Contract Pool 1',   token3.totalSupply,  "",                 0.000000000000000001,          null     ], 
   ['RewardRate Pool 1',   token3
https://github.com/MetaMask/metamask-extension/issues/22533.rewardRate,  "",                 1,          null     ], 
   ['RewardRate3 Pool 1',   token3.rewardRate3,  "",                 1,          null     ],
  ['Pool 1 Num1 Token',                token5.pool1Stats,                      "ABAS",                 0.000000000000000001,          null     ],
    ['Pool 1 Num2 Token',                token5.pool1Stats,                      "ETH",                 0.000000000000000001,          null     ],
      ['APY Pool 1',                token4.totalSupply,                      "ETH",                 0.000000000000000001,          null     ],
        ['Pool 1 Total Liquidity',               null,                      "",                 1,          null     ], 
       ['Pool 1 Percent Of Liquidity In Staking',               null,                      "",                 1,          null     ], 

 ['',                              null,                                 "",                 1,          null     ],
  ['POOL TWO POOL TWO POOL TWO UNDER',                              null,                                 "",                 1,          null     ],
  ['',                              null,                                 "",                 1,          null     ],
 
 ['Total Supply in all Balancer Pool 2',               token7.totalSupply,                      "",                 0.000000000000000001,          null     ],
   ['TotalSupply Staking Contract Pool 2',   token6.totalSupply,  "",                 0.000000000000000001,          null     ],
   ['RewardRate Pool 2',   token6.rewardRate,  "",                 1,          null     ], 
   ['RewardRate3 Pool 2',   token6.rewardRate3,  "",                 1,          null     ], 
   ['Pool 2 Num1 Token',                              token5.poolTWOStats,                                 "0xBTC",              0.00000001,          null     ], 
   ['Pool 2 Num2 Token',                              token5.poolTWOStats,                                 "ABAS",                 0.000000000000000001,          null     ], 
    ['Pool 2 Num3 Token',                              token5.poolTWOStats,                                 "bForge",                 0.000000000000000001,          null     ], 
       ['APY Pool 2',                token7.totalSupply,                      "ETH",                 0.000000000000000001,          null     ], 
       ['Pool 2 Total Liquidity',               null,                      "",                 1,          null     ], 
       ['Pool 2 Percent Of Liquidity In Staking',               null,                      "",                 1,          null     ], 


*/

var stustu = stat_name + "doMore2";
if(goodStat && stat[0]!='Tokens distributed via Mining2' && stat[0]!='u2' && stat[0] != 'Current Mining Reward per 12 minute Solve' && stat[0] != 'u4' && stat[0] != 'u5' && stat[0] != 'u6' && stat[0] != 'u7' && stat[0] != 'Last Eth Block' && stat[0] != 'u8' && stat[0] != 'u9' && stat[0] != 'u77' && stat[0] != 'u88' && stat[0] != 'u99' && stat[0] != 'u999' && stat[0] != 'u1010'){
   

    el('#statistics').innerHTML += '<tr><td id="'+stustu.replace(/ /g,"")+'">'
      + stat_name + '</td><td id="'
      + stat_name.replace(/ /g,"") + '"></td></tr>';
}
  });
}

function areAllBlockchainStatsLoaded(stats) {
  all_loaded = true;

  stats.forEach(function(stat){
    stat_name = stat[0]
    stat_function = stat[1]
    stat_unit = stat[2]
    stat_multiplier = stat[3]
    stat_value = stat[4]
    /* if there is a function without an associated value, we are still waiting */
    if(stat_function !== null && stat_value === null) {
      all_loaded = false;
    }
  })

  if(all_loaded) {
    return true;
  } else {
    return false;
  }
}

function updateStatsTable(stats){
  stats.forEach(function(stat){
    stat_name = stat[0]
    stat_function = stat[1]
    stat_unit = stat[2]
    stat_multiplier = stat[3]



    set_value = function(stats, stat_name, stat_unit, stat_multiplier, save_fn) {
      return function(result) {
        try {
	
	if(stat_name=="u77" || stat_name=="u99" || stat_name=="Pool 3 Num2 Token"){
		xx = 1

	}else if(stat_name=="Pool 2 Num2 Token"){
		xx = 1


	}else if(stat_name=="FIXMULTIESHERE"){
		xx=3

		
	}else{
		xx=0
	}
          result = result[xx].toString(10)
        } catch (err) {
          result = result.toString(10)
        }
if(stat_name =="u3"){






}


        result = result.toString(10)*stat_multiplier
        save_fn(result)

        /* modify some of the values on display */
        if(stat_name == "Total Supply") {
          result = result.toLocaleString();
        } else if(stat_name == "Mining Difficulty"
               || stat_name == "Tokens Minted"
               || stat_name == "Max Supply for Current Era"
               || stat_name == "Max Mined Supply for Current Era"
               || stat_name == "Mined Supply Remaining in Era"
               || stat_name == "Token Transfers"
               || stat_name == "Total Contract Operations") {
          result = result.toLocaleString()
        }

        el_safe('#' + stat_name.replace(/ /g,"")).innerHTML = "<b>" + result + "</b> " + stat_unit;

        /* once we have grabbed all stats, update the calculated ones */
        if(areAllBlockchainStatsLoaded(stats)) {
          updateStatsThatHaveDependencies(stats);
          /* hack: check if miner table exists - if it doesn't then skip loading blocks */
          if(el('#minerstats')) {
            setTimeout(()=>{updateAllMinerInfo(eth, stats, 24)}, 0);

          }
        }
      }
    }
    /* run promises that store stat values */
    if(stat_function !== null && stat_name ==='Mining Difficulty2' ) {
      stat_function(1).then(set_value(stats, stat_name, stat_unit, stat_multiplier, (value) => {stat[4]=value}));
    } else if(stat_function !== null)
    {
      stat_function().then(set_value(stats, stat_name, stat_unit, stat_multiplier, (value) => {stat[4]=value}));
    }
  });

  /* hack: check if stat table exists - if it doesn't then skip api updates */
  if(el('#TokenHolders')) {
    updateThirdPartyAPIs();
  }
}

function loadAllStats() {
  updateStatsTable(stats);
}

function updateAndDisplayAllStats() {
  createStatsTable();
  loadAllStats();
}

