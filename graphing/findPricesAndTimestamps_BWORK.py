from web3 import Web3
import time
import json
import os
from datetime import datetime

RPC_URL = "https://mainnet.base.org"
w3 = Web3(Web3.HTTPProvider(RPC_URL))
Q192 = 2 ** 192

# File to store the data
DATA_FILE = "price_data_bwork.json"
MAX_DATA_POINTS = 48 * 30  # 30 days worth of 30-minute intervals

def save_data(timestamps, blocks, prices):
    """Save the arrays to a JSON file"""
    data = {
        "timestamps": timestamps,
        "blocks": blocks,
        "prices": prices,
        "last_updated": time.time()
    }
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Data saved to {DATA_FILE}")

def load_data():
    """Load the arrays from JSON file, return empty arrays if file doesn't exist"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                data = json.load(f)
            timestamps = data.get("timestamps", [])
            blocks = data.get("blocks", [])
            prices = data.get("prices", [])
            last_updated = data.get("last_updated", 0)
            print(f"Loaded {len(timestamps)} data points from {DATA_FILE}")
            print(f"Last updated: {datetime.fromtimestamp(last_updated)}")
            return timestamps, blocks, prices
        except Exception as e:
            print(f"Error loading data file: {e}")
            return [], [], []
    else:
        print("No existing data file found, starting fresh")
        return [], [], []

def get_storage_with_retry(address, slot, block, retries=5, delay=2):
    attempt = 0
    while attempt < retries:
        try:
            data = w3.eth.get_storage_at(address, slot, block_identifier=block)
            print("Data: ", data)
            bytes32_hex = "0x" + data.hex().rjust(64, "0")  # pad to 32 bytes (64 hex chars)
            print("Data hex: ", bytes32_hex)
            return int.from_bytes(data, "big")
        except Exception as e:
            print(f"Retry {attempt+1}/{retries} failed: {e}")
            attempt += 1
            time.sleep(delay)
    raise RuntimeError(f"Failed to fetch storage slot {slot} after {retries} retries")

def unpack_slot0(packed):
    sqrtPriceX96 = packed & ((1 << 160) - 1)
    tick = (packed >> 160) & ((1 << 24) - 1)
    # Interpret int24 (signed)
    if tick & (1 << 23):  # negative
        tick -= (1 << 24)
    protocolFee = (packed >> 184) & ((1 << 24) - 1)
    lpFee = (packed >> 208) & ((1 << 24) - 1)
    return sqrtPriceX96, tick, protocolFee, lpFee

def sqrtPriceX96_to_price(sq):
    return (sq ** 2) / Q192

def getSlot0(block):
    print(f"\n--- Fetching data for block {block} ---")
    
    # BWORKWETH POOL
    pool_manager = "0x498581fF718922c3f8e6A244956aF099B2652b2b"
    pool_slot = '0xd66bf39be2869094cf8d2d31edffab51dc8326eadf3c7611d397d156993996da'
    
    packed = get_storage_with_retry(pool_manager, pool_slot, block)
    sqrtPriceX96, tick, protocolFee, lpFee = unpack_slot0(packed)
    price = sqrtPriceX96_to_price(sqrtPriceX96)
    print("BWORK/WETH - sqrtPriceX96:", sqrtPriceX96)
    print("BWORK/WETH - Price:", price)
    
    # WETHUSD POOL
    pool_slot = '0xe570f6e770bf85faa3d1dbee2fa168b56036a048a7939edbcd02d7ebddf3f948'
    
    packed = get_storage_with_retry(pool_manager, pool_slot, block)
    sqrtPriceX96, tick, protocolFee, lpFee = unpack_slot0(packed)
    price2 = sqrtPriceX96_to_price(sqrtPriceX96) * 10**12
    print("WETH/USD - Price2:", price2)
    
    actual_price = price2 * (1/price)
    print("Actual Price of BWORK:", actual_price)
    return actual_price

def get_current_block_and_timestamp():
    """Get the current block number and timestamp"""
    try:
        current_block = w3.eth.block_number
        block_data = w3.eth.get_block(current_block)
        current_timestamp = block_data["timestamp"]
        return current_block, current_timestamp
    except Exception as e:
        print(f"Error getting current block: {e}")
        return None, None

def estimate_block_from_timestamp(target_timestamp, current_block, current_timestamp):
    """Estimate block number from timestamp assuming ~2 seconds per block"""
    time_diff = current_timestamp - target_timestamp
    blocks_diff = int(time_diff / 2)  # Assuming 2 seconds per block
    estimated_block = current_block - blocks_diff
    return max(1, estimated_block)  # Ensure block number is at least 1

def collect_missing_historical_data(timestamps, blocks, prices, target_days=30):
    """Collect historical data if we don't have enough data points"""
    current_block, current_timestamp = get_current_block_and_timestamp()
    if current_block is None:
        return timestamps, blocks, prices
    
    target_data_points = 48 * target_days  # 48 intervals per day
    
    if len(timestamps) >= target_data_points:
        print(f"Already have {len(timestamps)} data points (target: {target_data_points})")
        return timestamps, blocks, prices
    
    missing_points = target_data_points - len(timestamps)
    print(f"Need to collect {missing_points} additional historical data points")
    
    # Find the oldest timestamp we have
    oldest_timestamp = timestamps[0] if timestamps else current_timestamp
    
    # Collect data points going backwards from oldest timestamp
    for i in range(missing_points):
        # Calculate target timestamp (30 minutes before the oldest we have)
        target_timestamp = oldest_timestamp - ((i + 1) * 30 * 60)
        
        # Don't go more than target_days back
        if target_timestamp < current_timestamp - (target_days * 24 * 60 * 60):
            break
            
        # Estimate block number for this timestamp
        estimated_block = estimate_block_from_timestamp(target_timestamp, current_block, current_timestamp)
        
        try:
            # Get actual block data to verify timestamp
            block_data = w3.eth.get_block(estimated_block)
            actual_timestamp = block_data["timestamp"]
            
            # Fine-tune block number if needed
            attempts = 0
            while abs(actual_timestamp - target_timestamp) > 300 and attempts < 10:
                if actual_timestamp < target_timestamp:
                    estimated_block += int((target_timestamp - actual_timestamp) / 2)
                else:
                    estimated_block -= int((actual_timestamp - target_timestamp) / 2)
                
                block_data = w3.eth.get_block(estimated_block)
                actual_timestamp = block_data["timestamp"]
                attempts += 1
            
            print(f"Collecting historical data {i+1}/{missing_points}: Block {estimated_block}, Time {datetime.fromtimestamp(actual_timestamp)}")
            
            # Get price for this block
            price = getSlot0(estimated_block)
            
            # Insert at beginning to maintain chronological order
            timestamps.insert(0, actual_timestamp)
            blocks.insert(0, estimated_block)
            prices.insert(0, price)
            
            # Save progress every 25 data points
            if (i + 1) % 25 == 0:
                save_data(timestamps, blocks, prices)
                print(f"Progress saved: {i+1}/{missing_points} historical points collected")
            
            # Small delay to avoid overwhelming the RPC
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Error collecting historical data point {i+1}: {e}")
            continue
    
    print("Historical data collection complete!")
    return timestamps, blocks, prices
    """Add a new data point and remove oldest if over limit"""
    timestamps.append(new_timestamp)
    blocks.append(new_block)
    prices.append(new_price)
    
    # Remove oldest data points if over limit
    while len(timestamps) > MAX_DATA_POINTS:
        timestamps.pop(0)
        blocks.pop(0)
        prices.pop(0)
    
    return timestamps, blocks, prices

def main():
    # Load existing data
    ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices = load_data()
    
    # Get current block and timestamp
    current_block, current_timestamp = get_current_block_and_timestamp()
    if current_block is None:
        print("Failed to get current block info, exiting")
        return
    
    print(f"Current block: {current_block}, Current timestamp: {current_timestamp}")
    print(f"Current time: {datetime.fromtimestamp(current_timestamp)}")
    
    # Check if we need to collect historical data (for new installations or insufficient data)
    if len(ArrayOfTimestamps) < 48 * 30:  # Less than 30 days of data
        print(f"Current data points: {len(ArrayOfTimestamps)}, collecting more historical data...")
        ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices = collect_missing_historical_data(
            ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices, target_days=30
        )
    
    # If we have existing data, check if we need to catch up
    if ArrayOfTimestamps:
        last_timestamp = ArrayOfTimestamps[-1]
        time_since_last = current_timestamp - last_timestamp
        minutes_since_last = time_since_last / 60
        
        print(f"Last data point was {minutes_since_last:.1f} minutes ago")
        
        # If more than 30 minutes have passed, catch up
        if time_since_last > 30 * 60:  # 30 minutes
            print("Catching up on missed data points...")
            
            # Calculate how many 30-minute intervals we missed
            intervals_missed = int(time_since_last / (30 * 60))
            print(f"Need to catch up {intervals_missed} intervals")
            
            for i in range(1, intervals_missed + 1):
                # Calculate target timestamp (30 minutes intervals)
                target_timestamp = last_timestamp + (i * 30 * 60)
                if target_timestamp > current_timestamp:
                    break
                    
                # Estimate block number for this timestamp
                estimated_block = estimate_block_from_timestamp(target_timestamp, current_block, current_timestamp)
                
                try:
                    # Get actual block data to verify timestamp
                    block_data = w3.eth.get_block(estimated_block)
                    actual_timestamp = block_data["timestamp"]
                    
                    # Fine-tune block number if needed (within reason)
                    attempts = 0
                    while abs(actual_timestamp - target_timestamp) > 300 and attempts < 10:  # 5 minute tolerance
                        if actual_timestamp < target_timestamp:
                            estimated_block += int((target_timestamp - actual_timestamp) / 2)
                        else:
                            estimated_block -= int((actual_timestamp - target_timestamp) / 2)
                        
                        block_data = w3.eth.get_block(estimated_block)
                        actual_timestamp = block_data["timestamp"]
                        attempts += 1
                    
                    print(f"Catching up interval {i}/{intervals_missed}: Block {estimated_block}, Time {datetime.fromtimestamp(actual_timestamp)}")
                    
                    # Get price for this block
                    price = getSlot0(estimated_block)
                    
                    # Add to arrays
                    ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices = add_data_point(
                        ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices,
                        actual_timestamp, estimated_block, price
                    )
                    
                    # Save progress periodically
                    if i % 5 == 0:
                        save_data(ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices)
                    
                    # Small delay to avoid overwhelming the RPC
                    time.sleep(1)
                    
                except Exception as e:
                    print(f"Error catching up interval {i}: {e}")
                    continue
            
            print("Catch-up complete!")
    else:
        # No existing data, collect 30 days of historical data
        print("No existing data found. Collecting 30 days of historical data...")
        
        # Calculate 30 days ago timestamp
        days_30_ago = current_timestamp - (30 * 24 * 60 * 60)  # 30 days in seconds
        
        # Collect data points every 30 minutes for 30 days
        intervals_to_collect = 48 * 30  # 48 intervals per day * 30 days
        
        print(f"Collecting {intervals_to_collect} data points (30 days of 30-minute intervals)")
        
        for i in range(intervals_to_collect):
            # Calculate target timestamp (working backwards from current time)
            target_timestamp = current_timestamp - (i * 30 * 60)  # 30 minutes intervals
            
            if target_timestamp < days_30_ago:
                break
                
            # Estimate block number for this timestamp
            estimated_block = estimate_block_from_timestamp(target_timestamp, current_block, current_timestamp)
            
            try:
                # Get actual block data to verify timestamp
                block_data = w3.eth.get_block(estimated_block)
                actual_timestamp = block_data["timestamp"]
                
                # Fine-tune block number if needed (within reason)
                attempts = 0
                while abs(actual_timestamp - target_timestamp) > 300 and attempts < 10:  # 5 minute tolerance
                    if actual_timestamp < target_timestamp:
                        estimated_block += int((target_timestamp - actual_timestamp) / 2)
                    else:
                        estimated_block -= int((actual_timestamp - target_timestamp) / 2)
                    
                    block_data = w3.eth.get_block(estimated_block)
                    actual_timestamp = block_data["timestamp"]
                    attempts += 1
                
                print(f"Collecting historical data {i+1}/{intervals_to_collect}: Block {estimated_block}, Time {datetime.fromtimestamp(actual_timestamp)}")
                
                # Get price for this block
                price = getSlot0(estimated_block)
                
                # Add to arrays (insert at beginning to maintain chronological order)
                ArrayOfTimestamps.insert(0, actual_timestamp)
                ArrayOfBlocksSearched.insert(0, estimated_block)
                ArrayOfActualPrices.insert(0, price)
                
                # Save progress every 50 data points
                if (i + 1) % 50 == 0:
                    save_data(ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices)
                    print(f"Progress saved: {i+1}/{intervals_to_collect} data points collected")
                
                # Small delay to avoid overwhelming the RPC
                time.sleep(0.5)
                
            except Exception as e:
                print(f"Error collecting historical data point {i+1}: {e}")
                continue
        
        print("Historical data collection complete!")
    
    # Save the updated data
    save_data(ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices)
    
    print(f"\nTotal data points: {len(ArrayOfTimestamps)}")
    print("Most recent prices:", ArrayOfActualPrices[-5:] if len(ArrayOfActualPrices) >= 5 else ArrayOfActualPrices)
    
    # Now enter the monitoring loop
    print("\nEntering monitoring mode...")
    while True:
        time.sleep(10 * 60)  # Wait 10 minutes
        
        try:
            # Get current block and timestamp
            current_block, current_timestamp = get_current_block_and_timestamp()
            if current_block is None:
                print("Failed to get current block, retrying in 10 minutes...")
                continue
            
            # Check if 30 minutes have passed since last data point
            last_timestamp = ArrayOfTimestamps[-1]
            if current_timestamp - last_timestamp >= 30 * 60:
                print(f"\n30+ minutes passed, collecting new data point...")
                print(f"Current time: {datetime.fromtimestamp(current_timestamp)}")
                
                # Get price for current block
                price = getSlot0(current_block)
                
                # Add to arrays
                ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices = add_data_point(
                    ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices,
                    current_timestamp, current_block, price
                )
                
                # Save data
                save_data(ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices)
                
                print(f"New data point added. Total points: {len(ArrayOfTimestamps)}")
                print(f"Latest price: {price}")
            else:
                minutes_remaining = 30 - ((current_timestamp - last_timestamp) / 60)
                print(f"Next data collection in {minutes_remaining:.1f} minutes")
                
        except Exception as e:
            print(f"Error in monitoring loop: {e}")
            print("Continuing monitoring...")

if __name__ == "__main__":
    main()
