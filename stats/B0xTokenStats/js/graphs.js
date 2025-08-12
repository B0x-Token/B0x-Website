
/*Helper class for loading historical data from ethereum contract variables.
  Initialize with an ethjs object, target contract address, and an integer 
  index that points to your desired variable in in the contract's storage area

  obj.addValueAtEthBlock(<block number>) starts a request to fetch
  and cache the value of your variable at that time. Note if you pass a
  non-integer block number it will be rounded.
  
  obj.areAllValuesLoaded() will return true once all fetches are complete

  obj.getValues returns all requested data
 */
//USE value 7979960 for everything
var ethblockstart = 25990908    //25990908
var adjustAverageRewardTimeGraph = 8
var searchPoints2 = 120
class contractValueOverTime {
  constructor(eth, contract_address, storage_index, descriptor) {
    /* how long to wait between sequential requests */
    this.WAIT_DELAY_FIXED_MS = 120;
    /* how long to wait before retrying after a timeout */
    this.WAIT_DELAY_ON_TIMEOUT_MS = 1500;

    this.eth = eth;
    this.contract_address = contract_address;
    this.storage_index = storage_index;
    this.descriptor = descriptor;
    this.sorted = false;
    this.states = [];
    /* since values are added asynchronously, we store the length we
    expect state to be once all values are pushed */
    this.expected_state_length = 0;
  }
  get getValues() {
    return this.states;
  }
  printValuesToLog() {
    this.states.forEach((value) => {
      log('block #', value[0], 'ts', value[2], 'value[1]:', (value[1]).toString(10));
    });
  }
  /* fetch query_count states between start_block_num and end_block_num */
  async addValuesInRange(start_block_num, end_block_num, query_count) {
    var stepsize = Math.floor((end_block_num-start_block_num) / query_count);
    log('stepsize', stepsize);
    log('query_count', query_count);

    // check localStorage to see if we have any cached data
   // var storage_data = null//JSON.parse(localStorage.getItem(this.descriptor));
	var storage_data = JSON.parse(localStorage.getItem(this.descriptor));

    var last_storage_block = null;   
    if (storage_data != null) {
      log('read in', storage_data.length, 'cached elements for', this.descriptor);
      last_storage_block = storage_data[storage_data.length - 1][0];
	 log("LAST BLOCK: ", last_storage_block, " for ", this.descriptor);
    }

    // get a data point for the current time (ie. end_block_num), then get remaining data points
    // at 24 hour intervals centered on midnight.
    this.addValueAtEthBlock(end_block_num);

    // estimate eth blocks since midnight
    var d = new Date();
    var secondsSinceMidnight = (d.getTime() - d.setHours(0,0,0,0)) / 1000;
    var blocksSinceMidnight = Math.floor(secondsSinceMidnight / _SECONDS_PER_ETH_BLOCK);
    end_block_num -= blocksSinceMidnight;

    // retrieve remaining data points
    var use_storage = false;
    for (var count = 0; count < query_count - 1; count += 1) {
      var block_num = end_block_num - (stepsize*count);
      if (Math.abs(block_num - last_storage_block) < 500) {
        use_storage = true;
      }
      if (use_storage) {
        let element = storage_data.pop();
		  if (element && element[0] !== undefined) {
    			this.states.push([element[0], new Eth.BN(element[1], 16), '']);
       			this.expected_state_length++;
			} else {
				console.error('element is undefined or does not contain the expected properties:', element,"  Block_num: ",block_num );
				this.addValueAtEthBlock(block_num);
			}

      } else { 
	log('block_num before addValueAtEthBlock', block_num);
     
        this.addValueAtEthBlock(block_num);
        await sleep(this.WAIT_DELAY_FIXED_MS);
      }
    }
  }

  _getSaveStateFunction(block_states, eth_block_num, retry_delay) {
    let cv_obj = this;
console.log("IS?23 : ",eth_block_num)
    if(retry_delay == null) {
      retry_delay = cv_obj.WAIT_DELAY_ON_TIMEOUT_MS;
    }

    return async function (value) {
      /* for some reason, this is how infura 'fails' to fetch a value */
      /* TODO: only re-try a certain number of times */
      if (value == '0x' || value == null) {
        log('cv_obj', cv_obj.storage_index.padStart(2), 'block', eth_block_num, ': got a bad value (', value, '), retrying in ', retry_delay, 'ms...');
        await sleep(retry_delay);
        /* 2nd param indicidates is_retry, 3rd is wait time (for exponential backoff) */
        cv_obj.addValueAtEthBlock(eth_block_num, true, retry_delay*2);
        return;
      } else {
        /* TODO: probably a way to convert w/o going through hex_str */
		console.log("FINDZKEEPERZ: ",value);
        var hex_str = value.substr(2, 64);
        var value_bn = new Eth.BN(hex_str, 16)
		var hexForUniswap = 
        // log('cv_obj', cv_obj.storage_index.padStart(2), 'block', eth_block_num, ': saving ', value);
        cv_obj.sorted = false;
		
		if (cv_obj.storage_index.slice(0, 2) == '0x' && cv_obj.storage_index == '0xd66bf39be2869094cf8d2d31edffab51dc8326eadf3c7611d397d156993996da') {
						// Get the length of the hex string
			var hexLength = hex_str.length;

			var slicedHexStr = hex_str.slice(hexLength - 40);
			console.log("SlicedHExStr: ",slicedHexStr);
			var sqrtPriceX96Hex =  new Eth.BN(slicedHexStr, 16);
			console.log("Extracted sqrtPriceX96:", sqrtPriceX96Hex.toString(10)); // 
			var fuckzinz = new Eth.BN('2').pow(new Eth.BN(96));  // 2^96 using BN
			var leftover =  new Eth.BN(fuckzinz.toString(), 10);
			console.log("leftovers: ",leftover.toString(10));
			var test = sqrtPriceX96Hex.div(leftover);
			console.log("Testyyyyyy : ", test.toString(10));
			var sqrz = test.mul(test);
			// Log the integer value
			console.log("sqrtPriceX96 as integer:", sqrz.toString());
			console.log("Final Price = ", sqrz.toString());
			var value_bn = sqrz;
			
			/* [block num, value @ block num, timestamp of block num] */
			var len = block_states.push([eth_block_num, value_bn, '']);
		}else if(cv_obj.storage_index.slice(0, 2) == '0x'){
			var hexLength = hex_str.length;

			var slicedHexStr = hex_str.slice(hexLength - 40);
			console.log("SlicedHExStr: ",slicedHexStr);
			var sqrtPriceX96Hex =  new Eth.BN(slicedHexStr, 16);
			console.log("Extracted sqrtPriceX96:", sqrtPriceX96Hex.toString(10)); // 
			
			
			var temp = parseInt(sqrtPriceX96Hex.toString(10))/2**96;
			console.log("parseInt(sqrtPriceX96Int)/2**96 = ", temp.toString());
				var final_price = ((parseInt(sqrtPriceX96Hex)/2**96)**2 ) * 10**12;
				console.log("Final Price = ", final_price);

			value_bn = final_price.toFixed(0);
			
			var value_bn = new Eth.BN(value_bn, 10)
			
			/* [block num, value @ block num, timestamp of block num] */
			var len = block_states.push([eth_block_num, value_bn, '']);
			
			
		}else{
			var len = block_states.push([eth_block_num, value_bn, '']);
		}

        /* TODO: uncomment this to use timestamps embedded in block */
        // eth.getBlockByNumber(eth_block_num, true).then(setValue((value)=>{block_states[len-1][2]=value.timestamp.toString(10)}))
      }
    }
  }
  addValueAtEthBlock(eth_block_num, is_retry, retry_delay=600) {
	if(eth_block_num < ethblockstart){

        log('eth_block_num' + eth_block_num);
	return;
}
    /* read value from contract @ specific block num, save to this.states

       detail: load eth provider with a request to load value from 
       block @ num. Callback is anonymous function which pushes the 
       value onto this.states */
    let cv_obj = this;
    if(is_retry == null) {
      this.expected_state_length += 1;
    }
    if(retry_delay == null) {
      retry_delay = this.WAIT_DELAY_ON_TIMEOUT_MS;
    }

    /* make sure we only request integer blocks */


    /* make sure we only request integer blocks */
    eth_block_num = Math.round(eth_block_num)
	console.log("IS? : ",eth_block_num)
    //log('requested', this.storage_index, '@ block', eth_block_num)
	var storageSlots = new Eth.BN(this.storage_index, 10);
	if (this.storage_index.slice(0, 2) == '0x') {
		storageSlots = new Eth.BN(this.storage_index.slice(2), 16);
	}
    this.eth.getStorageAt(this.contract_address, 
                          storageSlots,
                          eth_block_num.toString(10))
    .then(
      this._getSaveStateFunction(this.states, eth_block_num, retry_delay)
    ).catch(async (error) => {
      if(error.message && error.message.substr(error.message.length-4) == 'null') {
        log('got null from infura, retrying...');
      } else {
        //console.log(error);
        log('error reading block storage:', error);
      }
      await sleep(retry_delay);
      /* 2nd param indicidates is_retry, 3rd is wait time (for exponential backoff) */
      cv_obj.addValueAtEthBlock(eth_block_num, true, retry_delay*2);
      return;
    });

    // if(is_retry) {
    //   log('cv_obj', this.storage_index.padStart(2), 'block', eth_block_num, ': queued (retry, timeout:', retry_delay, ')');
    // } else {
    //   log('cv_obj', this.storage_index.padStart(2), 'block', eth_block_num, ': queued');
    // }

  }

  areAllValuesLoaded() {
    //log('cv_obj', this.storage_index.padStart(2), ': values loaded: ', this.states.length, '/', this.expected_state_length);
	  log("Expected: ",this.expected_state_length ," vs cur Length: ", this.states.length);
	  log("searchPoints2: ", searchPoints2);
	  //try making it 120 values only
    return this.expected_state_length == this.states.length;
  }
  async waitUntilLoaded() {
    while (!this.areAllValuesLoaded()) {
      await sleep(500);
    }
  }
  // onAllValuesLoaded(callback) {
  //   this.on_all_values_loaded_callback = callback;
  // }
  sortValues() {
    log('sorting values..');
    this.states.sort((a, b) => {
      //log('a', a[0], 'b', b[0]);
      return a[0] - b[0];
    });
    this.sorted = true;
  }
  /* iterate through already loaded values. Wherever a state change is
  seen, queue another value load from the blockchain halfway between 
  state A and state B. Goal is to get closer to the actual eth block
  number where the state transition occurs. */
  increaseTransitionResolution() {
    if(!this.sorted) {
      this.sortValues();
    }

    var last_block_number = this.states[0][0];
    var last_value = this.states[0][1];
    for(var i = 0; i < this.states.length; i++) {
      var block_number = this.states[i][0];
      var value = this.states[i][1];
      if(last_value.cmp(value) != 0) {
        this.addValueAtEthBlock(((last_block_number + block_number)/2));
      }
      last_value = value;
      last_block_number = block_number;
    }
  }
  /* iterate through already loaded values. If 3 or more repeating
  values are detected, remove all middle values so only the first and
  last state with that value remain  */
  deduplicate() {
    if(!this.sorted) {
      this.sortValues();
    }
    /* we actually go backwards so we don't screw up array indexing
    as we remove values along the way */
    for(var i = this.states.length-1; i >= 2 ; i--) {
      var v1 = this.states[i][1];
      var v2 = this.states[i-1][1];
      var v3 = this.states[i-2][1];

      if (v1.cmp(v2) == 0
          && v2.cmp(v3) == 0) {
        /* remove one item at location i-1 (middle value) */
        this.states.splice(i-1, 1);
      }
    }
  }
  /* iterate through already loaded values. If 2 or more repeating values are
     detected, remove all but the first block where that value is seen. */
  removeExtraValuesForStepChart(allow_last_value) {
    if(allow_last_value == undefined) {
      allow_last_value = true;
    }
    if(allow_last_value) {
      var start_index = this.states.length-2;
    } else {
      var start_index = this.states.length-1;
    }
    if(!this.sorted) {
      this.sortValues();
    }
    /* we actually go backwards so we don't screw up array indexing
    as we remove values along the way */
    for(var i = start_index; i >= 1 ; i--) {
      var v1 = this.states[i][1];
      var v2 = this.states[i-1][1];

      if (v1.cmp(v2) == 0) {
        /* remove one item at location i (first value) */
        this.states.splice(i, 1);
        this.expected_state_length -= 1;
      }
    }
  }
  /* For some reason occasionally the last value loaded is zero. Running this
     function will remove it, if it is there */
  deleteLastPointIfZero() {
    if (this.states.length == 0) {
      return;
    }
    if (this.states[this.states.length-1][1].eq(new Eth.BN(0))) {
      log('warning: got a zero value at end of dataset');
      log('before - len', this.states.length);
      log(this.states);

      /* remove one item at location length-1 (last value) */
      this.states.splice(this.states.length-1, 1);

      log('after - len', this.states.length);
      log(this.states);
    }
  }

  saveToLocalStorage() {
    // the last item of the array is data from 'now', which we don't want.
    // we only keep data points representing the values at midnight.
    localStorage.setItem(this.descriptor, JSON.stringify(this.states.slice(0, -1)));
  }

}




function generateHashrateAndBlocktimeGraph(eth, target_cv_obj, era_cv_obj, price_cv_obj, price_cv_obj3, tokens_minted_cv_obj) {
  el('#difficultystats').innerHTML = '<canvas id="chart-hashrate-difficulty" width="4rem" height="2rem"></canvas>';
  el('#blocktimestats').innerHTML =  '<canvas id="chart-rewardtime" width="4rem" height="2rem"></canvas>';
  el('#priceOverTimestats').innerHTML =  '<canvas id="chart-pricetime" width="4rem" height="2rem"></canvas>';
  el('#avgRevenue').innerHTML =  '<canvas id="chart-AvgRevenue" width="4rem" height="2rem"></canvas>';
	
	
	
  var target_values = target_cv_obj.getValues;
		
	
	var target_values_all =  target_values;
	
	
	
	
	
	
  var era_values = era_cv_obj.getValues;
  var tokens_minted_values = tokens_minted_cv_obj.getValues;
  var tokens_price_values = price_cv_obj.getValues; //use this one BWORK WETH
  var tokens_price_values3 = price_cv_obj3.getValues; //use this one USDC WETH
  
		console.log("123FUCKTHIS: tokens_price_values3",tokens_price_values3);

  function convertValuesToChartData(values, value_mod_function) {
    var chart_data = []
    for (var i = 0; i < values.length; i++) {
      /* TODO: remove this if we expect some values to be zero */
      if(values[i][1].eq(_ZERO_BN)) {
        continue;
      }
      if(value_mod_function == undefined) {
        value_mod_function = function(v){return v};
      }
	if(values[i][0] > ethblockstart){
      chart_data.push({
        x: values[i][0],
        y: value_mod_function(values[i][1]),
      })
}	
      //console.log('log', values[i][0], value_mod_function(values[i][1]))
      //labels.push(values[i][0]);
      //chart_data.push(_MAXIMUM_TARGET_BN.div(values[i][1]));
    }
    return chart_data;
  }

  function getErasPerBlockFromEraData(era_values) {
    var chart_data = []
    for (var step = 1; step < era_values.length; step++) {

      var eth_blocks_passed = era_values[step][0] - era_values[step-1][0];
      var eras_passed = era_values[step][1] - era_values[step-1][1];

      if (eth_blocks_passed == 0) {
        continue;
      }

      var eras_per_eth_block = eras_passed / eth_blocks_passed * 7;

      chart_data.push({
        x: era_values[step][0],
        y: eras_per_eth_block,
      })
      //console.log('log', era_values[step][0], value_mod_function(era_values[step][1]))
      //labels.push(era_values[step][0]);
      //chart_data.push(_MAXIMUM_TARGET_BN.div(values[step][1]));
    }
    return chart_data;
  }

  function getHashrateDataFromDifficultyAndErasPerBlockData(difficulty_data, eras_per_block_data) {
    var expected_eras_per_block = 1/80; //76.5/* should be 40 times slower than ethereum (with 15-second eth blocks) */
    var difficulty_data_index = 0;
    var difficulty_change_block_num = 0;
    var chart_data = []
    for (var step = 0; step < eras_per_block_data.length; step++) {
      var current_eth_block = eras_per_block_data[step].x;
      var current_eras_per_block = eras_per_block_data[step].y;

      while(difficulty_data_index < difficulty_data.length - 1
            && difficulty_data[difficulty_data_index+1].x < current_eth_block) {
        difficulty_change_block_num = difficulty_data[difficulty_data_index+1].x;
        difficulty_data_index += 1;
      }

      //console.log('diff chg @', difficulty_change_block_num);
	var difficulty =0
	try{
      var difficulty = difficulty_data[difficulty_data_index].y.toNumber();
	}catch{
	}
      /* if difficulty change occurs within this step window */
      if (step != 0
          && difficulty_data_index != 0
          && eras_per_block_data[step].x > difficulty_change_block_num
          && eras_per_block_data[step-1].x < difficulty_change_block_num) {

        /* make a new half-way difficulty that takes the duration of each 
           seperate difficulty into accout  */

        var step_size_in_eth_blocks = eras_per_block_data[step].x - eras_per_block_data[step-1].x;
        var diff1_duration = eras_per_block_data[step].x - difficulty_change_block_num;
        var diff2_duration = difficulty_change_block_num - eras_per_block_data[step-1].x;
	var current_difficulty =0
	try{
        current_difficulty = difficulty_data[difficulty_data_index].y.toNumber();
	}catch{
	}
        /* NOTE: since the data is stored kind-of oddly (two values per
           difficulty: both the first and last known block at that value), we
           index difficulty_data as step-1 instead of step-2, skipping a
           value. */
        var last_difficulty = difficulty_data[difficulty_data_index-1].y.toNumber();
        difficulty = (current_difficulty * (diff1_duration/step_size_in_eth_blocks))
                     + (last_difficulty * (diff2_duration/step_size_in_eth_blocks));
        // console.log('step size', step_size_in_eth_blocks);
        // console.log('dif', difficulty);
        // console.log('d curr', eras_per_block_data[step].x, diff1_duration, current_difficulty);
        // console.log('d  old', eras_per_block_data[step-1].x, diff2_duration, last_difficulty);
        // console.log('d', difficulty);
      }

      var unadjusted_network_hashrate = difficulty * _HASHRATE_MULTIPLIER / _IDEAL_BLOCK_TIME_SECONDS;
      var network_hashrate = unadjusted_network_hashrate * (current_eras_per_block/expected_eras_per_block);
      //log('for block', current_eth_block, 'diff', difficulty.toFixed(1), 'uhr', unadjusted_network_hashrate, 'hr', network_hashrate)
	if(current_eth_block > ethblockstart){
      chart_data.push({
        x: current_eth_block,
        y: network_hashrate,
      })
}
      //console.log('log', era_values[step][0], value_mod_function(era_values[step][1]))
      //labels.push(era_values[step][0]);
      //chart_data.push(_MAXIMUM_TARGET_BN.div(values[step][1]));
    }
    return chart_data;
  }

  function getHashrateDataFromDifficultyAndErasPerBlockData2(difficulty_data, eras_per_block_data) {
  var expected_eras_per_block = 1/80; /* should be 40 times slower than ethereum (with 15-second eth blocks) */
    var difficulty_data_index = 0;
    var difficulty_change_block_num = 0;
    var chart_data = []
    for (var step = 0; step < eras_per_block_data.length; step++) {
      var current_eth_block = eras_per_block_data[step].x;
      var current_eras_per_block = eras_per_block_data[step].y;

      while(difficulty_data_index < difficulty_data.length - 1
            && difficulty_data[difficulty_data_index+1].x < current_eth_block) {
        difficulty_change_block_num = difficulty_data[difficulty_data_index+1].x;
        difficulty_data_index += 1;
      }

      //console.log('diff chg @', difficulty_change_block_num);
var difficulty =0
	try{
      var difficulty = difficulty_data[difficulty_data_index].y.toNumber();
	}catch{
	}
      /* if difficulty change occurs within this step window */
      if (step != 0
          && difficulty_data_index != 0
          && eras_per_block_data[step].x > difficulty_change_block_num
          && eras_per_block_data[step-1].x < difficulty_change_block_num) {

        /* make a new half-way difficulty that takes the duration of each 
           seperate difficulty into accout  */

        var step_size_in_eth_blocks = eras_per_block_data[step].x - eras_per_block_data[step-1].x;
        var diff1_duration = eras_per_block_data[step].x - difficulty_change_block_num;
        var diff2_duration = difficulty_change_block_num - eras_per_block_data[step-1].x;
	var current_difficulty =0
	try{
        current_difficulty = difficulty_data[difficulty_data_index].y.toNumber();
	}catch{
	}
	    /* NOTE: since the data is stored kind-of oddly (two values per
           difficulty: both the first and last known block at that value), we
           index difficulty_data as step-1 instead of step-2, skipping a
           value. */
        var last_difficulty = difficulty_data[difficulty_data_index-1].y.toNumber();
        difficulty = (current_difficulty * (diff1_duration/step_size_in_eth_blocks))
                     + (last_difficulty * (diff2_duration/step_size_in_eth_blocks));
        // console.log('step size', step_size_in_eth_blocks);
        // console.log('dif', difficulty);
        // console.log('d curr', eras_per_block_data[step].x, diff1_duration, current_difficulty);
        // console.log('d  old', eras_per_block_data[step-1].x, diff2_duration, last_difficulty);
        // console.log('d', difficulty);
      }

      var unadjusted_network_hashrate = difficulty * _HASHRATE_MULTIPLIER / _IDEAL_BLOCK_TIME_SECONDS * Forge_Pool_efficeny;
      var network_hashrate = unadjusted_network_hashrate * (current_eras_per_block/expected_eras_per_block) * 1;
      //log('for block', current_eth_block, 'diff', difficulty.toFixed(1), 'uhr', unadjusted_network_hashrate, 'hr', network_hashrate)
console.log("CB" , current_eth_block)
	if(ethblockstart < current_eth_block){
	
	
      chart_data.push({
        x: current_eth_block,
        y: network_hashrate,
      })
	}
      //console.log('log', era_values[step][0], value_mod_function(era_values[step][1]))
      //labels.push(era_values[step][0]);
      //chart_data.push(_MAXIMUM_TARGET_BN.div(values[step][1]));
    }
    return chart_data;
  }

  var difficulty_data = convertValuesToChartData(target_values, 
                                                 (x)=>{return _MAXIMUM_TARGET_BN_OLD.div(x)});
  var ALL_difficulty_data = convertValuesToChartData(target_values, 
                                                 (x)=>{return _MAXIMUM_TARGET_BN_OLD.div(x)});
  var era_data = convertValuesToChartData(era_values);

  var total_supply_data = convertValuesToChartData(tokens_minted_values, 
                                                   (x)=>{return x * 1 / 10**18});


  var total_price_data = convertValuesToChartData(tokens_price_values, 
                                                   (x)=>{return 1 / x });
                                                   
  var total_price_data3 = convertValuesToChartData(tokens_price_values3, 
                                                   (x)=>{return x });
		console.log("FUCKTHIS: tokens_price_values3",tokens_price_values3);
  console.log("TTTT TOTAL PRICE DATA (BWORKWETH): ", total_price_data);
console.log("TTTT TOTAL PRICE DATA3 (USDCWETH) : ", total_price_data3.map(item => ({
  x: item.x, 
  y: item.y.toString(10)  // Convert BN to string in base 10
})));
	
	  let resultffffff = [];
  let previousValue = null;

  for (let i = 0; i < difficulty_data.length; i++) {
    const currentValue = difficulty_data[i].y.toString();
    const nextValue = i + 1 < difficulty_data.length ? difficulty_data[i + 1].y.toString() : null;

    // Add the first occurrence
    if (previousValue !== currentValue) {
      resultffffff.push(difficulty_data[i]);
      previousValue = currentValue;
    }

    // Add the last occurrence
    if (currentValue !== nextValue && nextValue !== null) {
      resultffffff.push(difficulty_data[i]);
    }
  }

  // Always add the last element if it's not already included
  if (resultffffff[resultffffff.length - 1] !== difficulty_data[difficulty_data.length - 1]) {
    resultffffff.push(difficulty_data[difficulty_data.length - 1]);
  }
	console.log("resultffffff: ", resultffffff);
	
	
  let result = total_price_data3;
    
	  
	  
	  const scaleFactor = 10000000;

    let resultGraph = total_price_data.map((item, index) => {
        if (total_price_data[index].y === 0) {
            // Handle division by zero if necessary
            console.error("Division by zero at index " + index);
            return null; // or handle it another way, depending on your needs
        }
        return {
            x: item.x, // You can choose to retain the x value or modify this structure
            y:(item.y)*scaleFactor
        };
    });
	console.log("resultGraph: ",resultGraph);
      let result2 = total_price_data.map((item, index) => {
        if (total_price_data[index].y === 0) {
            // Handle division by zero if necessary
            console.error("Division by zero at index " + index);
            return null; // or handle it another way, depending on your needs
        }
        return {
            x: item.x, // You can choose to retain the x value or modify this structure
            y: item.y
        };
    });
    
      let avgPriceAtTime = result.map((item, index) => {
        if (result2[index].y === 0) {
            // Handle division by zero if necessary
            console.error("Division by zero at index " + index);
            return null; // or handle it another way, depending on your needs
        }
        return {
            x: item.x, // You can choose to retain the x value or modify this structure
            y: item.y * result2[index].y
        };
    });
	console.log("TESTING THIS AVG PRICE: ",avgPriceAtTime);
	  
	let avgRevenue = [];
let lengthDifference = Math.abs(avgPriceAtTime.length - ALL_difficulty_data.length);

// Starting from the end of both arrays
for (let i = 0; i < Math.min(avgPriceAtTime.length, ALL_difficulty_data.length); i++) {
    let avgPriceIndex = avgPriceAtTime.length - 1 - i;
    let difficultyIndex = ALL_difficulty_data.length - 1 - i;

    if (avgPriceAtTime[avgPriceIndex].y === 0) {
        // Handle division by zero if necessary
        console.error("Division by zero at index " + avgPriceIndex);
        avgRevenue.push(null); // or handle it another way, depending on your needs
    } else {
        avgRevenue.push({
            x: ALL_difficulty_data[difficultyIndex].x, // You can choose to retain the x value or modify this structure
            y: (31000000000 * 4320000 * 8 / (10 * ALL_difficulty_data[difficultyIndex].y * 2**22)) * avgPriceAtTime[avgPriceIndex].y
        });
    }
}

// Reverse the result array to match the original order if needed
avgRevenue.reverse();

console.log("avgRevenue TEST: ", avgRevenue);
  console.log("TTTT TOTAL PRICE DATA222 : ", result);
  console.log("TTTT TOTAL PRICE DATA3333 : ", result2);
  console.log("Actual Price in USD data : ", avgPriceAtTime);
	
console.log("Revenue difficulty data: ", ALL_difficulty_data);
console.log("Revenue price at time: ", avgPriceAtTime);
  var largest$Array = avgPriceAtTime.reduce((max, cur) => Math.max(max, cur.y), avgPriceAtTime[0].y);
  var largestETHArray = resultGraph.reduce((max, cur) => Math.max(max, cur.y), resultGraph[0].y);
  largest$Array = largest$Array * 1.05;
  largestETHArray = largestETHArray * 1.05;

  console.log("largest number: ", largest$Array);
  console.log("largest ETH number: ", largestETHArray);
  var eras_per_block_data = getErasPerBlockFromEraData(era_values);

  var hashrate_data = getHashrateDataFromDifficultyAndErasPerBlockData(difficulty_data, eras_per_block_data);

  var hashrate_data2 = getHashrateDataFromDifficultyAndErasPerBlockData2(difficulty_data, eras_per_block_data);

  var average_reward_time_data = [];
  for(var i = 0; i < eras_per_block_data.length; i += 1) {
    //console.log('calc avg reward time', eras_per_block_data[i].x, 1 / (eras_per_block_data[i].y * 4))
	console.log("eras_per_block_data[i].x, ", eras_per_block_data[i].x)
if(eras_per_block_data[i].x > ethblockstart){
    average_reward_time_data.push({
      x: eras_per_block_data[i].x,
      /* 1 / (eras per block * 4 eth blocks per minute) */
      y: 1 / (eras_per_block_data[i].y * adjustAverageRewardTimeGraph),
    })}
  }

  /* figure out how to scale chart: difficulty can be too high or too low */
  var max_difficulty_value = 0
  for (var i = 0; i < difficulty_data.length; i += 1) {
try{
    if (difficulty_data[i].y.toNumber() > max_difficulty_value) {
      max_difficulty_value = difficulty_data[i].y.toNumber();
    }
}catch{
}
  }
  var max_hashrate_value = 0

  for (var i = 0; i < hashrate_data.length; i += 1) {
	//console.log("max_hashrate_value22 ", hashrate_data[i].y)

    /* get max hashrate data, note - not a BN */
    if (hashrate_data[i].y > max_hashrate_value) {
console.log("max_hashrate_value ", hashrate_data[i].y)

      max_hashrate_value = hashrate_data[i].y;
    }
  }
	  // Check if the last value in hashrate_data is 0 and remove it if true
if (hashrate_data.length > 0 && hashrate_data[hashrate_data.length - 1].y === 0) {
    hashrate_data.pop();
}
	  
	    var max_rev = 0

  for (var i = 0; i < avgRevenue.length; i += 1) {
	//console.log("max_rev ", avgRevenue[i].y)

    /* get max hashrate data, note - not a BN */
    if (avgRevenue[i].y > max_rev) {
	console.log("max_rev value ", avgRevenue[i].y)

      max_rev = avgRevenue[i].y;
    }
  }
  console.log("difficulty_data: ", difficulty_data);
  var hashrate_based_on_difficulty = max_difficulty_value * _HASHRATE_MULTIPLIER / _IDEAL_BLOCK_TIME_SECONDS;
  var difficulty_based_on_hashrate = max_hashrate_value / ((_HASHRATE_MULTIPLIER) / _IDEAL_BLOCK_TIME_SECONDS);
  if (hashrate_based_on_difficulty > max_hashrate_value) {
    max_hashrate_value = hashrate_based_on_difficulty;
  } else {
    max_difficulty_value = difficulty_based_on_hashrate;
  }
  //log('max_hashrate_value', max_hashrate_value);
  //log('max_difficulty_value', max_difficulty_value);

  log('showing graph 1');

  /* Note: when changing color scheme we will need to modify this as well */
  Chart.defaults.global.defaultFontColor = '#f2f2f2';

  /* hashrate and difficulty chart */
  var hr_diff_chart = new Chart.Scatter(document.getElementById('chart-hashrate-difficulty').getContext('2d'), {
    type: 'line',

    data: {
        datasets: [{
            label: "Difficulty",
            showLine: true,
            steppedLine: 'before',
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgb(255, 99, 132)',
            data: resultffffff,
            fill: false,
            yAxisID: 'first-y-axis',

        },{
            label: "Based Work Token Hashrate",
            showLine: true,
            //steppedLine: 'before',
            backgroundColor: 'rgb(156, 204, 101)',
            borderColor: 'rgb(156, 204, 101)',
            data: hashrate_data,
            fill: false,
            yAxisID: 'second-y-axis',
            //fill: 'origin',

        } /*,{
            label: "abastoken.org Pool Hashrate",
            showLine: true,
            //steppedLine: 'before',(255,165,0)
            backgroundColor: 'rgb(255, 165, 0)',
            borderColor: 'rgb(255, 165, 0)',
            data: hashrate_data2,
            fill: false,
            yAxisID: 'second-y-axis',
            //fill: 'origin',

        }*/]
    },

    options: { 
	responsive: true, // Enable responsiveness
    maintainAspectRatio: true, // Disable maintaining aspect ratio
  
      tooltips: {
        callbacks: {
          label: function(tooltipItem, data) {
            var label = ''

			
			
			
			
			
			
			     const smallScreen5 = window.innerWidth < 868;

      // Conditionally set the tooltip label based on the screen size
      if (smallScreen5) {
		  console.log("Small screen tooltip");
            label += ' (' + ethBlockNumberToTimestamp2(tooltipItem.xLabel) + ') :  ';
        // Small screen-specific labels
            if (data.datasets[tooltipItem.datasetIndex].label == "Total Supply") {
            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label+" "
              label +=toReadableThousands(tooltipItem.yLabel)+" BWORK"
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Based Work Token Hashrate") {
            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label+" "
              label +=toReadableHashrate(tooltipItem.yLabel);
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Average Reward Time") {
            /* Note: might have issues here if you dont set dataset label */
            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label+" "
              label += (+tooltipItem.yLabel).toFixed(2) + ' Minutes';
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Total ETH Price of 1 BWORK") {
              label += "ETH Price of 1 BWORK: "+ (+tooltipItem.yLabel).toFixed(8) + ' ETH';
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Total USD $ Price of 1 BWORK") {
              label +=  "USD $ Price of 1 BWORK: "+ (+tooltipItem.yLabel).toFixed(4) + ' $';
            } else {
            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label+ " "
              label += Math.round(tooltipItem.yLabel * 100) / 100;
            }
		  
      } else {
		  
	
            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label
            
            label += " @ Eth block #" + tooltipItem.xLabel;
            label += ' (' + ethBlockNumberToTimestamp(tooltipItem.xLabel) + ') :  ';

            if (data.datasets[tooltipItem.datasetIndex].label == "Total Supply") {
              label +=toReadableThousands(tooltipItem.yLabel);
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Based Work Token Hashrate") {
              label +=toReadableHashrate(tooltipItem.yLabel);
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Average Reward Time") {
              label += (+tooltipItem.yLabel).toFixed(2) + ' Minutes';
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Total ETH Price of 1 BWORK") {
              label += (+tooltipItem.yLabel).toFixed(8) + ' ETH';
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Total USD $ Price of 1 BWORK") {
              label += (+tooltipItem.yLabel).toFixed(4) + ' $';
            } else {
              label += Math.round(tooltipItem.yLabel * 100) / 100;
            }
      }
			  
			  
			
			
            //console.log(tooltipItem, data)
            return label;
          }
        }
      },
      scales: {
        xAxes: [{
          gridLines: {
            color: 'rgb(97, 97, 97)',
            zeroLineColor: 'rgb(97, 97, 97)',
          },
          ticks: {
            callback: function(value, index, values) {
              return ethBlockNumberToDateStr(value);
            },
            //stepSize: 6*((24*60*60)/15),  // 6 days
          }
        }],
        yAxes: [{
          id: 'first-y-axis',
          type: 'linear',
          //type: 'logarithmic',  /* hard to read */
          scaleLabel: {
            display: true,
            labelString: 'Difficulty',
            fontColor: 'rgb(255, 99, 132)',
          },
          gridLines: {
            color: 'rgb(97, 97, 97)',
            zeroLineColor: 'rgb(97, 97, 97)',
          },
          ticks: {
            // Include a dollar sign in the ticks
            callback: function(value, index, values) {
              return toReadableThousandsLong(value);
            },
            //maxTicksLimit: 6,
            min: 0,
            autoSkip: true,
            suggestedMax: max_difficulty_value,
          },
        }, {
          id: 'second-y-axis',
          position: 'right',
          type: 'linear',
          //type: 'logarithmic',  /* hard to read */
          scaleLabel: {
            display: true,
            labelString: 'Network Hashrate',
            fontColor: 'rgb(156, 204, 101)',
          },
          gridLines: {
            color: 'rgb(97, 97, 97)',
            zeroLineColor: 'rgb(97, 97, 97)',
            drawOnChartArea: false, // only want the grid lines for one axis to show up
          },
          ticks: {
            // Include a dollar sign in the ticks
            callback: function(value, index, values) {
              return toReadableHashrate(value);
            },
            //maxTicksLimit: 6,
            min: 0,
            autoSkip: true,
            suggestedMax: max_hashrate_value,
            /*stepSize: 1000,*/
          }
        }]
      }
    },
    });


  /* make another dataset with only first and last points in the array */
  var datasetCopy = [
    average_reward_time_data.slice(0, 1)[0], 
    average_reward_time_data.slice(average_reward_time_data.length-1, average_reward_time_data.length)[0],
  ]
  /* make a copy of each array element so we don't modify 'real' data later */
  datasetCopy[0] = Object.assign({}, datasetCopy[0]);
  datasetCopy[1] = Object.assign({}, datasetCopy[1]);
  /* set y-values to ideal block time */
  datasetCopy[0].y = _IDEAL_BLOCK_TIME_SECONDS / 60;
  datasetCopy[1].y = _IDEAL_BLOCK_TIME_SECONDS / 60;
  //console.log('datasetCopy', datasetCopy);

  var datasetCopy2 = [
    average_reward_time_data.slice(0, 1)[0], 
    average_reward_time_data.slice(average_reward_time_data.length-1, average_reward_time_data.length)[0],
  ]
  /* make a copy of each array element so we don't modify 'real' data later */
  datasetCopy2[0] = Object.assign({}, datasetCopy2[0]);
  datasetCopy2[1] = Object.assign({}, datasetCopy2[1]);
  /* set y-values to ideal block time */
  datasetCopy2[0].y = _IDEAL_BLOCK_TIME_SECONDS / 60 * 30;
  datasetCopy2[1].y = _IDEAL_BLOCK_TIME_SECONDS / 60 * 30;
  //console.log('datasetCopy', datasetCopy);
  log('showing graph 2');
  /* block time chart */
	  
	  
	  
	  var avg_Revenue_chart = new Chart.Scatter(document.getElementById('chart-AvgRevenue').getContext('2d'), {
    type: 'line',

    data: {
        datasets: [{
            label: "24 Hour Revenue @ 31 Gh/s",
            showLine: true,
            //steppedLine: 'before',
            backgroundColor: 'rgb(50,205,50)',
            borderColor: 'rgb(50,205,50)',
            data: avgRevenue,
            fill: false,
            yAxisID: 'first-y-axis'

        }]
    },

    options: {
	responsive: true, // Enable responsiveness
    maintainAspectRatio: true, // Disable maintaining aspect ratio
      legend: {
        //display: false,
        labels: {
          /* hide value(s) from the legend */
          filter: function(legendItem, data) {
            
            return legendItem;
          },
        },
      },
      tooltips: {
        callbacks: {
          label: function(tooltipItem, data) {
            var label = ''

			
			
			
			     const smallScreen = window.innerWidth < 868;

      // Conditionally set the tooltip label based on the screen size
      if (smallScreen) {
		  console.log("Small screen tooltip");
            label += ' (' + ethBlockNumberToTimestamp2(tooltipItem.xLabel) + ') :  ';
        // Small screen-specific labels
        if (data.datasets[tooltipItem.datasetIndex].label == "Total Supply") {
          label += toReadableThousands(tooltipItem.yLabel);
        } else if (data.datasets[tooltipItem.datasetIndex].label == "Network Hashrate") {
          label += toReadableHashrate(tooltipItem.yLabel);
        } else if (data.datasets[tooltipItem.datasetIndex].label == "Average Reward Time") {
          label += (+tooltipItem.yLabel).toFixed(2) + ' Min';
        } else if (data.datasets[tooltipItem.datasetIndex].label == "24 Hour Revenue @ 31 Gh/s") {
          label += "Revenue 24 Hours 31 Gh/s: " + (+tooltipItem.yLabel).toFixed(2) + ' $';
        } else {
          label += Math.round(tooltipItem.yLabel * 10000) / 10000;
        }
      } else {
		  
		  console.log("Large screen tooltip");
			
            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label
            
            label += " @ Eth block #" + tooltipItem.xLabel;
            label += ' (' + ethBlockNumberToTimestamp(tooltipItem.xLabel) + ') :  ';
		  
        // Large screen-specific labels
        if (data.datasets[tooltipItem.datasetIndex].label == "Total Supply") {
          label += toReadableThousands(tooltipItem.yLabel);
        } else if (data.datasets[tooltipItem.datasetIndex].label == "Network Hashrate") {
          label += toReadableHashrate(tooltipItem.yLabel);
        } else if (data.datasets[tooltipItem.datasetIndex].label == "Average Reward Time") {
          label += (+tooltipItem.yLabel).toFixed(2) + ' Minutes';
        } else if (data.datasets[tooltipItem.datasetIndex].label == "24 Hour Revenue @ 31 Gh/s") {
          label += (+tooltipItem.yLabel).toFixed(2) + ' $';
        } else {
          label += Math.round(tooltipItem.yLabel * 10000) / 10000;
        }
      }
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
            //console.log(tooltipItem, data)
            return label;
          }
        }
      },
      scales: {
        xAxes: [{
          gridLines: {
            color: 'rgb(97, 97, 97)',
            zeroLineColor: 'rgb(97, 97, 97)',
          },
          ticks: {
            // Include a dollar sign in the ticks
            callback: function(value, index, values) {
              return ethBlockNumberToDateStr(value);
            },
            //stepSize: 6*((24*60*60)/15),  // 6 days
          }
        }],
        yAxes: [{
            id: 'first-y-axis',
            type: 'linear',
            //type: 'logarithmic',  /* hard to read */
            scaleLabel: {
              display: true,
              labelString: 'Average Revenue in USD $',
              fontColor: 'rgb(50,205,50)',
            },
            gridLines: {
              color: 'rgb(97, 97, 97)',
              zeroLineColor: 'rgb(97, 97, 97)',
            },
            ticks: {
              min: 0,
              //max: 20,
              suggestedMax: max_rev,
              callback: function(value, index, values) {
                //return value.toFixed(0) + " Minutes";  // correct but looks redundant
                return value.toFixed(3);
              },
            },
        }]
      }
    },
  });
	  
	  

	  
	  
	  
  var rewardtime_chart = new Chart.Scatter(document.getElementById('chart-pricetime').getContext('2d'), {
    type: 'line',

    data: {
        datasets: [{
            label: "Total USD $ Price of 1 BWORK",
            showLine: true,
            //steppedLine: 'before',
            backgroundColor: 'rgb(50,205,50)',
            borderColor: 'rgb(50,205,50)',
            data: avgPriceAtTime,
            fill: false,
            yAxisID: 'first-y-axisf'

        },{
            label: "Total ETH Price of 1 BWORK",
            showLine: true,
            //steppedLine: 'before',
            backgroundColor: 'rgb(158, 168, 219)',
            borderColor: 'rgb(158, 168, 219)',
            data: resultGraph,
            fill: false,
            yAxisID: 'second-y-axisf'

        }]
    },

    options: {
	responsive: true, // Enable responsiveness
    maintainAspectRatio: true, // Disable maintaining aspect ratio
      legend: {
        //display: false,
        labels: {
          /* hide value(s) from the legend */
          filter: function(legendItem, data) {
            
            return legendItem;
          },
        },
      },
      tooltips: {
        callbacks: {
          label: function(tooltipItem, data) {
            var label = ''

           
			
			     const smallScreen2 = window.innerWidth < 868;

      // Conditionally set the tooltip label based on the screen size
      if (smallScreen2) {
		  console.log("Small screen tooltip");
            label += ' (' + ethBlockNumberToTimestamp2(tooltipItem.xLabel) + ') :  ';
        // Small screen-specific labels
            if (data.datasets[tooltipItem.datasetIndex].label == "Total Supply") {
              label +=toReadableThousands(tooltipItem.yLabel);
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Network Hashrate") {
              label +=toReadableHashrate(tooltipItem.yLabel);
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Average Reward Time") {
              label += (+tooltipItem.yLabel).toFixed(2) + ' Minutes';
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Total ETH Price of 1 BWORK") {
              label += "ETH Price of 1 BWORK: "+ (tooltipItem.yLabel/scaleFactor).toFixed(8) + ' ETH';
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Total USD $ Price of 1 BWORK") {
              label +=  "USD $ Price of 1 BWORK: "+ (+tooltipItem.yLabel).toFixed(4) + ' $';
            } else {
              label += Math.round(tooltipItem.yLabel * 10000) / 10000;
            }
		  
      } else {
		  
	
            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label
            
            label += " @ Eth block #" + tooltipItem.xLabel;
            label += ' (' + ethBlockNumberToTimestamp(tooltipItem.xLabel) + ') :  ';

            if (data.datasets[tooltipItem.datasetIndex].label == "Total Supply") {
              label +=toReadableThousands(tooltipItem.yLabel);
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Network Hashrate") {
              label +=toReadableHashrate(tooltipItem.yLabel);
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Average Reward Time") {
              label += (+tooltipItem.yLabel).toFixed(2) + ' Minutes';
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Total ETH Price of 1 BWORK") {
              label += (+tooltipItem.yLabel/scaleFactor).toFixed(8) + ' ETH';
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Total USD $ Price of 1 BWORK") {
              label += (+tooltipItem.yLabel).toFixed(4) + ' $';
            } else {
              label += Math.round(tooltipItem.yLabel * 10000) / 10000;
            }
      }
			
            //console.log(tooltipItem, data)
            return label;
          }
        }
      },
      scales: {
        xAxes: [{
          gridLines: {
            color: 'rgb(97, 97, 97)',
            zeroLineColor: 'rgb(97, 97, 97)',
          },
          ticks: {
            // Include a dollar sign in the ticks
            callback: function(value, index, values) {
              return ethBlockNumberToDateStr(value);
            },
            //stepSize: 6*((24*60*60)/15),  // 6 days
          }
        }],
        yAxes: [{
            id: 'first-y-axisf',
          position: 'left',
            type: 'linear',
            //type: 'logarithmic',  /* hard to read */
            scaleLabel: {
              display: true,
              labelString: 'Average Price in USD $',
              fontColor: 'rgb(50,205,50)',
            },
            gridLines: {
              color: 'rgb(97, 97, 97)',
              zeroLineColor: 'rgb(97, 97, 97)',
            },
            ticks: {
              min: 0,
              //max: 20,
              suggestedMax: largest$Array,
              callback: function(value, index, values) {
                //return value.toFixed(0) + " Minutes";  // correct but looks redundant
                return value.toFixed(3);
              },
            },
        }, {
          id: 'second-y-axisf',
          position: 'right',
          type: 'linear',
          //type: 'logarithmic',  /* hard to read */
          scaleLabel: {
            display: true,
            labelString: 'Average Price in ETH',
            fontColor: 'rgb(158, 168, 219)',
          },
          gridLines: {
            color: 'rgb(97, 97, 97)',
            zeroLineColor: 'rgb(97, 97, 97)',
            drawOnChartArea: false, // only want the grid lines for one axis to show up
          },
          ticks: {
            // Include a dollar sign in the ticks
            
         suggestedMax: largestETHArray,
            callback: function(value, index, values) {
				console.log("Tick: ",value);
			return (value / scaleFactor).toFixed(8);
            },
            //maxTicksLimit: 6,
            min: 0,
            autoSkip: true,
            /*stepSize: 1000,*/
          }
        }]
      }
    },
  });
  var rewardtime_chart2 = new Chart.Scatter(document.getElementById('chart-rewardtime').getContext('2d'), {
    type: 'line',

    data: {
        datasets: [{
            label: "Average Reward Time",
            showLine: true,
            //steppedLine: 'before',
            backgroundColor: 'rgb(79, 195, 247)',
            borderColor: 'rgb(79, 195, 247)',
            data: average_reward_time_data,
            fill: false,
            yAxisID: 'first-y-axis'

        }, {
          label: 'Target Reward Time',
          showLine: true,
          fill: false,
          backgroundColor: 'rgb(0, 255, 0)',
          borderColor: 'rgb(0, 255, 0)',
          borderDash: [5, 15],
          pointRadius: 0,
          data: datasetCopy,
          yAxisID: 'first-y-axis',
        },{
            label: "Total Supply",
            showLine: true,
            //steppedLine: 'before',
            backgroundColor: 'rgb(255, 152, 0)',
            borderColor: 'rgb(255, 152, 0)',
            data: total_supply_data,
            fill: false,
            yAxisID: 'second-y-axis'

        }]
    },

    options: {
	responsive: true, // Enable responsiveness
    maintainAspectRatio: true, // Disable maintaining aspect ratio
      legend: {
        //display: false,
        labels: {
          /* hide value(s) from the legend */
          filter: function(legendItem, data) {
            
            return legendItem;
          },
        },
      },
      tooltips: {
        callbacks: {
          label: function(tooltipItem, data) {
            var label = ''

			
			
			
				
			     const smallScreen3 = window.innerWidth < 868;

      // Conditionally set the tooltip label based on the screen size
      if (smallScreen3) {
		  console.log("Small screen tooltip");
            label += ' (' + ethBlockNumberToTimestamp2(tooltipItem.xLabel) + ') :  ';
        // Small screen-specific labels
            if (data.datasets[tooltipItem.datasetIndex].label == "Total Supply") {
            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label+" "
              label +=toReadableThousands(tooltipItem.yLabel)+" BWORK"
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Network Hashrate") {
            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label+" "
              label +=toReadableHashrate(tooltipItem.yLabel);
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Average Reward Time") {
            /* Note: might have issues here if you dont set dataset label */
            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label+" "
              label += (+tooltipItem.yLabel).toFixed(2) + ' Minutes';
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Total ETH Price of 1 BWORK") {
              label += "ETH Price of 1 BWORK: "+ (+tooltipItem.yLabel).toFixed(8) + ' ETH';
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Total USD $ Price of 1 BWORK") {
              label +=  "USD $ Price of 1 BWORK: "+ (+tooltipItem.yLabel).toFixed(4) + ' $';
            } else {
              label += Math.round(tooltipItem.yLabel * 10000) / 10000;
            }
		  
      } else {
		  
	
            /* Note: might have issues here if you dont set dataset label */
            label += data.datasets[tooltipItem.datasetIndex].label
            
            label += " @ Eth block #" + tooltipItem.xLabel;
            label += ' (' + ethBlockNumberToTimestamp(tooltipItem.xLabel) + ') :  ';

            if (data.datasets[tooltipItem.datasetIndex].label == "Total Supply") {
              label +=toReadableThousands(tooltipItem.yLabel);
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Network Hashrate") {
              label +=toReadableHashrate(tooltipItem.yLabel);
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Average Reward Time") {
              label += (+tooltipItem.yLabel).toFixed(2) + ' Minutes';
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Total ETH Price of 1 BWORK") {
              label += (+tooltipItem.yLabel).toFixed(8) + ' ETH';
            }else if (data.datasets[tooltipItem.datasetIndex].label == "Total USD $ Price of 1 BWORK") {
              label += (+tooltipItem.yLabel).toFixed(4) + ' $';
            } else {
              label += Math.round(tooltipItem.yLabel * 10000) / 10000;
            }
      }
			  
			  
			  
			  
			  
			  
            //console.log(tooltipItem, data)
            return label;
          }
        }
      },
      scales: {
        xAxes: [{
          gridLines: {
            color: 'rgb(97, 97, 97)',
            zeroLineColor: 'rgb(97, 97, 97)',
          },
          ticks: {
            // Include a dollar sign in the ticks
            callback: function(value, index, values) {
              return ethBlockNumberToDateStr(value);
            },
            //stepSize: 6*((24*60*60)/15),  // 6 days
          }
        }],
        yAxes: [{
            id: 'first-y-axis',
            type: 'linear',
	    position: 'left',
            //type: 'logarithmic',  /* hard to read */
            scaleLabel: {
              display: true,
              labelString: 'Average Reward Time (Minutes)',
              fontColor: 'rgb(79, 195, 247)',
            },
            gridLines: {
              color: 'rgb(97, 97, 97)',
              zeroLineColor: 'rgb(97, 97, 97)',
            },
            ticks: {
              min: 0,
              //max: 20,
              suggestedMax: 20,
              callback: function(value, index, values) {
                //return value.toFixed(0) + " Minutes";  // correct but looks redundant
                return value.toFixed(0);
              },
            },
        }, {
            id: 'second-y-axis',
            position: 'right',
            type: 'linear',
            //type: 'logarithmic',  /* hard to read */
            scaleLabel: {
              display: true,
              labelString: 'Total Supply (' + _CONTRACT_NAME + ')',
              fontColor: 'rgb(255, 152, 0)',
            },
            gridLines: {
              color: 'rgb(97, 97, 97)',
              zeroLineColor: 'rgb(97, 97, 97)',
              drawOnChartArea: false, // only want the grid lines for one axis to show up
            },
            ticks: {
              // Include a dollar sign in the ticks
              callback: function(value, index, values) {
                return toReadableThousands(value);
              },
              /*stepSize: 1000,*/
            }
        }]
      }
    },
  });
  goToURLAnchor(); 
}

async function show_progress(value){
  log('updating progress.. (', value, ')');
  el('#difficultystats').innerHTML = '<div class="">Loading info from the blockchain... <span style="font-weight:600;">' + value + '</span></div>';
  el('#blocktimestats').innerHTML = '<div class="">Loading info from the blockchain... <span style="font-weight:600;">' + value + '</span></div>';
  el('#priceOverTimestats').innerHTML = '<div class="">Loading info from the blockchain... <span style="font-weight:600;">' + value + '</span></div>';
  el('#avgRevenue').innerHTML = '<div class="">Loading info from the blockchain... <span style="font-weight:600;">' + value + '</span></div>';
}


async function updateHashrateAndBlocktimeGraph(eth, start_eth_block, end_eth_block, num_search_points){
  /*
  note: this is implementation of diff. in contract:
      function getMiningDifficulty() public constant returns (uint) 
        return _MAXIMUM_TARGET.div(miningTarget);
  */

  // 'lastDifficultyPeriodStarted' is at location 6
  // NOTE: it is important to make sure the step size is small enough to
  //       capture all difficulty changes. For 0xBTC once/day is more than
  //       enough.
  var last_diff_start_blocks = new contractValueOverTime(eth, _CONTRACT_ADDRESS, _LAST_DIFF_START_BLOCK_INDEX, 'diffStartBlocks2');
	log("last diff ",last_diff_start_blocks)
  // 'reward era' is at location 7
  var era_values = new contractValueOverTime(eth, _CONTRACT_ADDRESS, _ERA_INDEX, 'eraValues2');
log("last era_values ",era_values)
  // 'tokens minted' is at location 20
  var tokens_minted_values = new contractValueOverTime(eth, _CONTRACT_ADDRESS, _TOKENS_MINTED_INDEX, 'tokensMinted2');

log("last tokens_minted_values ",tokens_minted_values)
  var tokens_price_values = new contractValueOverTime(eth, '0x498581fF718922c3f8e6A244956aF099B2652b2b', '0xd66bf39be2869094cf8d2d31edffab51dc8326eadf3c7611d397d156993996da', 'BWORKETHPrice');
 
//  var tokens_price_values =  new contractValueOverTime(eth, "0x7002d33c756f593ab41af4a236005766e80dc960", 9, 'tokensPrice');

log("last Price_values ",tokens_price_values.getValues)
 // var tokens_price_values2 = new contractValueOverTime(eth, _CONTRACT_ADDRESS, _TOKENS_MINTED_INDEX, 'tokensMinted2');
// new contractValueOverTime(eth, "0x7002d33c756f593ab41af4a236005766e80dc960", 10, 'tokensPrice2');
  
  
log("last tokens_minted_values ",tokens_minted_values)
  var tokens_price_values3 = new contractValueOverTime(eth, '0x498581fF718922c3f8e6A244956aF099B2652b2b', '0xe570f6e770bf85faa3d1dbee2fa168b56036a048a7939edbcd02d7ebddf3f948', 'USDCETHPrice');
// new contractValueOverTime(eth, "0x80115c708E12eDd42E504c1cD52Aea96C547c05c", 9, 'tokensPrice3');

		console.log("456FUCKTHIS: tokens_price_values3",tokens_price_values3);
log("last Price_values ",tokens_price_values.getValues)
 // var tokens_price_values4 = new contractValueOverTime(eth, _CONTRACT_ADDRESS, _TOKENS_MINTED_INDEX, 'tokensMinted2');
//IS? new contractValueOverTime(eth, "0x80115c708E12eDd42E504c1cD52Aea96C547c05c", 10, 'tokensPrice4');

log("last Price_values ",tokens_price_values.getValues)
log("last Price_values3 ",tokens_price_values3.getValues)
  // 'mining target' is at location 11
  var mining_target_values = new contractValueOverTime(eth, _CONTRACT_ADDRESS, _MINING_TARGET_INDEX, 'miningTargets2');
log("last mining_target_values ",mining_target_values.getValues)
log("last mining_target_values tokens_minted_values ",tokens_minted_values.getValues)
log("end_eth_block", end_eth_block)
log("start_eth_block", start_eth_block)
await tokens_price_values.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
await sleep(500);
console.log("THIS tokens_price_values: ", tokens_price_values);
tokens_price_values.printValuesToLog();
 show_progress('10% [42 / 420]');
//await tokens_price_values2.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
//await sleep(200);

await tokens_price_values3.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
await sleep(200);

 show_progress('20% [84 / 420]');
		console.log("7777FUCKTHIS: tokens_price_values3",tokens_price_values3);
//await tokens_price_values4.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
//await sleep(200);

await last_diff_start_blocks.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
await sleep(200);

let numerator = 0;
let denominator = 0;
numerator = tokens_price_values.states.length
        + tokens_price_values3.states.length
        + last_diff_start_blocks.states.length;

    denominator = tokens_price_values.expected_state_length
        + tokens_price_values3.expected_state_length
        + last_diff_start_blocks.expected_state_length;

    show_progress((50 * (numerator / denominator)).toFixed(0)
        + '% ['
        + (0.5 * numerator).toFixed(0)
        + ' / '
        + denominator.toFixed(0)
        + ']');

// wait on all pending eth log requests to finish (with progress)
while (!last_diff_start_blocks.areAllValuesLoaded() || !tokens_price_values.areAllValuesLoaded() || !tokens_price_values3.areAllValuesLoaded()) {
    numerator = tokens_price_values.states.length
        + tokens_price_values3.states.length
        + last_diff_start_blocks.states.length;

    denominator = tokens_price_values.expected_state_length
        + tokens_price_values3.expected_state_length
        + last_diff_start_blocks.expected_state_length;

    show_progress((50 * (numerator / denominator)).toFixed(0)
        + '% ['
        + (0.5 * numerator).toFixed(0)
        + ' / '
        + denominator.toFixed(0)
        + ']');

    await sleep(1000);
}

await sleep(3000);

await era_values.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
await sleep(500);

 show_progress('60% [250 / 420]');
await tokens_minted_values.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
await sleep(500);

 show_progress('70% [350 / 420]');
await mining_target_values.addValuesInRange(start_eth_block, end_eth_block, num_search_points);
    let numerator2 = mining_target_values.states.length
        + tokens_minted_values.states.length
        + era_values.states.length;

    let denominator2 = mining_target_values.expected_state_length
        + tokens_minted_values.expected_state_length
        + era_values.expected_state_length;

    show_progress((50 * (numerator2 / denominator2) + 50 * (numerator / denominator)).toFixed(0)
        + '% ['
        + (numerator + numerator2).toFixed(0)
        + ' / '
        + (denominator + denominator2).toFixed(0)
        + ']');

// wait on all pending eth log requests to finish (with progress)
while (!mining_target_values.areAllValuesLoaded() || !tokens_minted_values.areAllValuesLoaded() || !era_values.areAllValuesLoaded()) {
    let numerator2 = mining_target_values.states.length
        + tokens_minted_values.states.length
        + era_values.states.length;

    let denominator2 = mining_target_values.expected_state_length
        + tokens_minted_values.expected_state_length
        + era_values.expected_state_length;

    show_progress((50 * (numerator2 / denominator2) + 50 * (numerator / denominator)).toFixed(0)
        + '% ['
        + (numerator + numerator2).toFixed(0)
        + ' / '
        + (denominator + denominator2).toFixed(0)
        + ']');

    await sleep(1000);
}

  await last_diff_start_blocks.waitUntilLoaded();
  await mining_target_values.waitUntilLoaded();
  await tokens_minted_values.waitUntilLoaded();
  await tokens_minted_values.waitUntilLoaded();
  await era_values.waitUntilLoaded();
  await tokens_price_values3.waitUntilLoaded();
  await tokens_price_values.waitUntilLoaded();
  last_diff_start_blocks.sortValues();

  // Load 'mining target' at each eth block that indicated by the set of
  // latestDifficultyPeriodStarted values
  /*
  let diff_start_block_values3 = era_values.getValues;
  for (var i in diff_start_block_values3) {
    let block_num = diff_start_block_values3[i][0].toString(10);
log("start_eth_block block_num", block_num)
last_diff_start_blocks.addValueAtEthBlock(block_num);
    mining_target_values.addValueAtEthBlock(block_num);
    tokens_price_values.addValueAtEthBlock(block_num);
    await sleep(10)
    tokens_price_values2.addValueAtEthBlock(block_num);
    tokens_price_values3.addValueAtEthBlock(block_num);
    tokens_price_values4.addValueAtEthBlock(block_num);
    await sleep(10)
  }
last_diff_start_blocks.addValueAtEthBlock(end_eth_block);
  mining_target_values.addValueAtEthBlock(end_eth_block);
    tokens_price_values.addValueAtEthBlock(end_eth_block);
    tokens_price_values2.addValueAtEthBlock(end_eth_block);
    tokens_price_values3.addValueAtEthBlock(end_eth_block);
    tokens_price_values4.addValueAtEthBlock(end_eth_block);
  
  */

  //await mining_target_values.waitUntilLoaded();
  //await tokens_minted_values.waitUntilLoaded();
  //await era_values.waitUntilLoaded();

  mining_target_values.sortValues();
  era_values.sortValues();
  tokens_minted_values.sortValues();
  tokens_price_values.sortValues();
  tokens_price_values3.sortValues();
  // sort and archive before removing duplicates
  last_diff_start_blocks.sortValues();
	// Deep copy
	

	mining_target_values.saveToLocalStorage();
  // TODO: remove this when we are sure it is fixed
  //era_values.deleteLastPointIfZero();
  generateHashrateAndBlocktimeGraph(eth, mining_target_values, era_values, tokens_price_values, tokens_price_values3, tokens_minted_values);
 document.getElementById('topText').style.display = 'none';
	
 document.getElementById('topText2').style.display = 'none';
  era_values.saveToLocalStorage();
	
  last_diff_start_blocks.saveToLocalStorage();
  tokens_minted_values.saveToLocalStorage();
  tokens_price_values.saveToLocalStorage();
  tokens_price_values3.saveToLocalStorage();
  // don't bother with mining_target_values.  it's only a few data points which we can quickly 
  // read from the blockchain.

}

function updateGraphData(history_days, num_search_points) {
  show_progress('0% [0 / 0]');


  setTimeout(async ()=>{
    /* loaded in main.js */
    while(latest_eth_block == null) {
      log('waiting for latest_eth_block...');
      await sleep(300);
    }

    const eth_blocks_per_day = 24*60*(60/_SECONDS_PER_ETH_BLOCK);
  log("_SECONDS_PER_ETH_BLOCK..."+eth_blocks_per_day);
  
    let max_blocks = history_days*eth_blocks_per_day;
    //var num_search_points = num_search_points; /* in some crazy world where readjustments happen every day, this will catch all changes */
    if (max_blocks / num_search_points > eth_blocks_per_day) {
      log("WARNING: search points are greater than 1 day apart. Make sure you know what you are doing...");
    }

    // ignore value passed in, since we assume 24 hour data intervals in other parts of this code
    num_search_points = history_days;   
	searchPoints2 = num_search_points
    let start_eth_block = (latest_eth_block-max_blocks);
	  if(start_eth_block<25990908){
			  start_eth_block = 25990908;  //25990908
	  }
	  
  log("latest_eth_block..."+latest_eth_block);
  log("latest_eth_block max_blocks..."+max_blocks);
  log("latest_eth_block...="+(latest_eth_block-max_blocks));
  log("latest_eth_block max_blocks..."+start_eth_block);
    let end_eth_block = latest_eth_block-8;
    updateHashrateAndBlocktimeGraph(eth, start_eth_block, end_eth_block, num_search_points);
  }, 0); 
}
