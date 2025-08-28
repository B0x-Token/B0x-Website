from web3 import Web3
import time
import json
import os
from datetime import datetime, timezone

RPC_URL = "https://mainnet.base.org"
w3 = Web3(Web3.HTTPProvider(RPC_URL))
Q192 = 2 ** 192

# File to store the data
DATA_FILE = "price_data_bwork.json"
MAX_DATA_POINTS = 4 * 30  # 30 days worth of 4 daily intervals

# Define the target times for data collection (in UTC)
TARGET_HOURS = [0, 6, 12, 18]  # Midnight, 6am, noon, 6pm

# File paths
LOCAL_DATA_FILE = "price_data_bwork.json"
WEB_DATA_FILE = "/var/www/html/data.bzerox.org/graph/price_data_bwork.json"

def save_data(timestamps, blocks, prices):
    """Save the arrays to JSON files in both local and web directories"""
    data = {
        "timestamps": timestamps,
        "blocks": blocks,
        "prices": prices,
        "last_updated": time.time()
    }
    
    # Save locally
    try:
        with open(LOCAL_DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Data saved locally to {LOCAL_DATA_FILE}")
    except Exception as e:
        print(f"Error saving local file: {e}")
    
    # Save to web directory
    try:
        # Create directory if it doesn't exist
        web_dir = os.path.dirname(WEB_DATA_FILE)
        os.makedirs(web_dir, exist_ok=True)
        
        with open(WEB_DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Data saved to web directory: {WEB_DATA_FILE}")
    except Exception as e:
        print(f"Error saving web file: {e}")
        print(f"Make sure you have write permissions to {web_dir}")

def load_data():
    """Load the arrays from JSON file, try local first, then web directory"""
    # Try local file first
    if os.path.exists(LOCAL_DATA_FILE):
        try:
            with open(LOCAL_DATA_FILE, 'r') as f:
                data = json.load(f)
            timestamps = data.get("timestamps", [])
            blocks = data.get("blocks", [])
            prices = data.get("prices", [])
            last_updated = data.get("last_updated", 0)
            print(f"Loaded {len(timestamps)} data points from {LOCAL_DATA_FILE}")
            if last_updated > 0:
                last_updated_dt = datetime.fromtimestamp(last_updated, tz=timezone.utc)
                print(f"Last updated: {last_updated_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}")
            return timestamps, blocks, prices
        except Exception as e:
            print(f"Error loading local data file: {e}")
    
    # Try web file if local doesn't exist
    elif os.path.exists(WEB_DATA_FILE):
        try:
            with open(WEB_DATA_FILE, 'r') as f:
                data = json.load(f)
            timestamps = data.get("timestamps", [])
            blocks = data.get("blocks", [])
            prices = data.get("prices", [])
            last_updated = data.get("last_updated", 0)
            print(f"Loaded {len(timestamps)} data points from {WEB_DATA_FILE}")
            if last_updated > 0:
                last_updated_dt = datetime.fromtimestamp(last_updated, tz=timezone.utc)
                print(f"Last updated: {last_updated_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}")
            return timestamps, blocks, prices
        except Exception as e:
            print(f"Error loading web data file: {e}")
    
    print("No existing data file found in either location, starting fresh")
    return [], [], []

def is_target_time(timestamp, tolerance_minutes=30):
    """Check if a timestamp is close to a target time (midnight, 6am, noon, 6pm)"""
    dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    hour = dt.hour
    minute = dt.minute
    
    # Check if it's within tolerance of any target hour
    for target_hour in TARGET_HOURS:
        # Calculate minutes from target hour
        minutes_from_target = abs((hour * 60 + minute) - (target_hour * 60))
        # Handle wrap-around (e.g., 23:45 is close to 00:00)
        minutes_from_target = min(minutes_from_target, 24 * 60 - minutes_from_target)
        
        if minutes_from_target <= tolerance_minutes:
            return True
    
    return False

def clean_data_keep_targets_and_current(timestamps, blocks, prices):
    """Keep only target time data points + optionally the most recent non-target point"""
    if not timestamps:
        return timestamps, blocks, prices
    
    print("Cleaning data to keep only 6-hour targets + current price...")
    
    # Separate target time data points from non-target ones
    target_data = []
    non_target_data = []
    
    for i in range(len(timestamps)):
        if is_target_time(timestamps[i]):
            target_data.append((timestamps[i], blocks[i], prices[i]))
        else:
            non_target_data.append((timestamps[i], blocks[i], prices[i]))
    
    print(f"Found {len(target_data)} target time data points")
    print(f"Found {len(non_target_data)} non-target time data points")
    
    # Start with all target data points
    cleaned_timestamps = [item[0] for item in target_data]
    cleaned_blocks = [item[1] for item in target_data]
    cleaned_prices = [item[2] for item in target_data]
    
    # Add only the most recent non-target data point if it exists
    if non_target_data:
        # Sort non-target data by timestamp and take the most recent
        non_target_data.sort(key=lambda x: x[0])
        most_recent = non_target_data[-1]
        
        # Insert in correct chronological position
        insert_pos = len(cleaned_timestamps)
        for i, ts in enumerate(cleaned_timestamps):
            if most_recent[0] < ts:
                insert_pos = i
                break
        
        cleaned_timestamps.insert(insert_pos, most_recent[0])
        cleaned_blocks.insert(insert_pos, most_recent[1])
        cleaned_prices.insert(insert_pos, most_recent[2])
        
        print(f"Kept most recent current price data point")
    
    print(f"Cleaned data: {len(cleaned_timestamps)} total points (targets + current)")
    return cleaned_timestamps, cleaned_blocks, cleaned_prices

def get_storage_with_retry(address, slot, block, retries=5, delay=2):
    attempt = 0
    while attempt < retries:
        try:
            data = w3.eth.getStorageAt(address, slot, block_identifier=block)
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
        current_block = w3.eth.blockNumber
        block_data = w3.eth.getBlock(current_block)
        current_timestamp = block_data["timestamp"]
        return current_block, current_timestamp
    except Exception as e:
        print(f"Error getting current block: {e}")
        return None, None

def estimate_block_from_timestamp(target_timestamp, current_block, current_timestamp):
    """Estimate block number from timestamp by calculating actual seconds per block"""
    try:
        # Estimate blocks for 24 hours ago (assuming ~2 seconds per block initially)
        blocks_24h_ago_estimate = int((24 * 60 * 60) / 2)  # ~43200 blocks
        sample_block_24h_ago = max(1, current_block - blocks_24h_ago_estimate)
        
        # Get the actual timestamp for that block
        sample_block_data = w3.eth.getBlock(sample_block_24h_ago)
        sample_timestamp_24h_ago = sample_block_data["timestamp"]
        
        # Calculate actual seconds per block over the 24 hour period
        actual_time_diff = current_timestamp - sample_timestamp_24h_ago
        actual_block_diff = current_block - sample_block_24h_ago
        
        if actual_block_diff > 0 and actual_time_diff > 0:
            seconds_per_block = actual_time_diff / actual_block_diff
            print(f"Calculated seconds per block: {seconds_per_block:.3f} (over {actual_block_diff} blocks, {actual_time_diff/3600:.1f} hours)")
        else:
            # Fallback to 2 seconds if calculation fails
            seconds_per_block = 2.0
            print("Using fallback: 2 seconds per block")
        
        # Now estimate the target block using actual seconds per block
        time_diff = current_timestamp - target_timestamp
        blocks_diff = int(time_diff / seconds_per_block)
        estimated_block = current_block - blocks_diff
        
        return max(1, estimated_block)  # Ensure block number is at least 1
        
    except Exception as e:
        print(f"Error calculating seconds per block: {e}")
        print("Using fallback estimation of 2 seconds per block")
        # Fallback to original method
        time_diff = current_timestamp - target_timestamp
        blocks_diff = int(time_diff / 2)  # Assuming 2 seconds per block
        estimated_block = current_block - blocks_diff
        return max(1, estimated_block)

def get_target_timestamps_for_day(day_timestamp):
    """Get the 4 target timestamps (midnight, 6am, noon, 6pm) for a given day"""
    dt = datetime.fromtimestamp(day_timestamp, tz=timezone.utc)
    # Get start of day (midnight UTC)
    start_of_day = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    
    target_timestamps = []
    for hour in TARGET_HOURS:
        target_dt = start_of_day.replace(hour=hour)
        target_timestamps.append(int(target_dt.timestamp()))
    
    return target_timestamps

def get_missing_timestamps(timestamps, current_timestamp, target_days=30):
    """Find all missing target timestamps for the past target_days"""
    # Convert existing timestamps to set for faster lookup
    existing_target_times = set()
    for ts in timestamps:
        if is_target_time(ts):
            existing_target_times.add(ts)
    
    missing_timestamps = []
    
    # Go back target_days from current time
    for days_back in range(target_days):
        day_timestamp = current_timestamp - (days_back * 24 * 60 * 60)
        target_timestamps = get_target_timestamps_for_day(day_timestamp)
        
        for target_ts in target_timestamps:
            # Only include timestamps that are in the past and not already collected
            if target_ts < current_timestamp and target_ts not in existing_target_times:
                # Allow some tolerance (within 30 minutes) for existing timestamps
                found_close = False
                for existing_ts in existing_target_times:
                    if abs(existing_ts - target_ts) < 30 * 60:  # 30 minutes tolerance
                        found_close = True
                        break
                
                if not found_close:
                    missing_timestamps.append(target_ts)
    
    # Sort in chronological order
    missing_timestamps.sort()
    return missing_timestamps

def collect_historical_data(timestamps, blocks, prices, target_days=30):
    """Collect historical data for missing target times"""
    current_block, current_timestamp = get_current_block_and_timestamp()
    if current_block is None:
        return timestamps, blocks, prices
    
    missing_timestamps = get_missing_timestamps(timestamps, current_timestamp, target_days)
    
    if not missing_timestamps:
        print("No missing historical data points found")
        return timestamps, blocks, prices
    
    print(f"Need to collect {len(missing_timestamps)} historical data points")
    
    for i, target_timestamp in enumerate(missing_timestamps):
        try:
            # Estimate block number for this timestamp
            estimated_block = estimate_block_from_timestamp(target_timestamp, current_block, current_timestamp)
            
            # Get actual block data to verify timestamp
            block_data = w3.eth.getBlock(estimated_block)
            actual_timestamp = block_data["timestamp"]
            
            # Fine-tune block number if needed
            attempts = 0
            while abs(actual_timestamp - target_timestamp) > 30 * 60 and attempts < 10:  # 30 minute tolerance
                if actual_timestamp < target_timestamp:
                    estimated_block += int((target_timestamp - actual_timestamp) / 2)
                else:
                    estimated_block -= int((actual_timestamp - target_timestamp) / 2)
                
                block_data = w3.eth.getBlock(estimated_block)
                actual_timestamp = block_data["timestamp"]
                attempts += 1
            
            target_dt = datetime.fromtimestamp(target_timestamp, tz=timezone.utc)
            actual_dt = datetime.fromtimestamp(actual_timestamp, tz=timezone.utc)
            
            print(f"Collecting historical data {i+1}/{len(missing_timestamps)}: Block {estimated_block}")
            print(f"  Target time: {target_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}")
            print(f"  Actual time: {actual_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}")
            
            # Get price for this block
            price = getSlot0(estimated_block)
            
            # Insert in correct chronological position
            insert_pos = 0
            for j, existing_ts in enumerate(timestamps):
                if actual_timestamp > existing_ts:
                    insert_pos = j + 1
                else:
                    break
            
            timestamps.insert(insert_pos, actual_timestamp)
            blocks.insert(insert_pos, estimated_block)
            prices.insert(insert_pos, price)
            
            # Save progress every 20 data points
            if (i + 1) % 20 == 0:
                save_data(timestamps, blocks, prices)
                print(f"Progress saved: {i+1}/{len(missing_timestamps)} historical points collected")
            
            # Small delay to avoid overwhelming the RPC
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Error collecting historical data point {i+1}: {e}")
            continue
    
    print("Historical data collection complete!")
    return timestamps, blocks, prices

def update_current_price(timestamps, blocks, prices, current_timestamp, current_block, current_price):
    """Update or add the current price data point, maintaining only targets + 1 current"""
    
    # Remove any existing non-target data points (keep only target times)
    target_timestamps = []
    target_blocks = []
    target_prices = []
    
    for i in range(len(timestamps)):
        if is_target_time(timestamps[i]):
            target_timestamps.append(timestamps[i])
            target_blocks.append(blocks[i])
            target_prices.append(prices[i])
    
    # Add the current price data point in the correct chronological position
    insert_pos = len(target_timestamps)
    for i, ts in enumerate(target_timestamps):
        if current_timestamp < ts:
            insert_pos = i
            break
    
    target_timestamps.insert(insert_pos, current_timestamp)
    target_blocks.insert(insert_pos, current_block)
    target_prices.insert(insert_pos, current_price)
    
    return target_timestamps, target_blocks, target_prices

def get_next_target_time(current_timestamp):
    """Get the next target time (midnight, 6am, noon, or 6pm)"""
    current_dt = datetime.fromtimestamp(current_timestamp, tz=timezone.utc)
    
    # Check today's remaining target times
    today_targets = get_target_timestamps_for_day(current_timestamp)
    for target_ts in today_targets:
        if target_ts > current_timestamp:
            return target_ts
    
    # If no more targets today, get midnight of next day
    next_day = current_timestamp + (24 * 60 * 60)
    next_day_targets = get_target_timestamps_for_day(next_day)
    return next_day_targets[0]  # Midnight of next day

def main():
    # Load existing data
    ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices = load_data()
    
    # Clean the loaded data first to remove any accumulated non-target data points
    ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices = clean_data_keep_targets_and_current(
        ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices
    )
    
    # Get current block and timestamp
    current_block, current_timestamp = get_current_block_and_timestamp()
    if current_block is None:
        print("Failed to get current block info, exiting")
        return
    
    print(f"Current block: {current_block}, Current timestamp: {current_timestamp}")
    current_dt = datetime.fromtimestamp(current_timestamp, tz=timezone.utc)
    print(f"Current time: {current_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    
    # Collect any missing historical data
    print("Checking for missing historical data...")
    ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices = collect_historical_data(
        ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices, target_days=30
    )
    
    # Save the updated data
    save_data(ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices)
    
    print(f"\nTotal data points: {len(ArrayOfTimestamps)}")
    if ArrayOfActualPrices:
        print("Most recent prices:", ArrayOfActualPrices[-5:] if len(ArrayOfActualPrices) >= 5 else ArrayOfActualPrices)
    
    # Now enter the monitoring loop
    print("\nEntering monitoring mode...")
    while True:
        try:
            # Get current block and timestamp for current price display
            current_block, current_timestamp = get_current_block_and_timestamp()
            if current_block is None:
                print("Failed to get current block, retrying in 5 minutes...")
                time.sleep(5 * 60)  # Wait 5 minutes before retrying
                continue
            
            # Get and display current price
            current_dt = datetime.fromtimestamp(current_timestamp, tz=timezone.utc)
            print(f"\n=== CURRENT PRICE UPDATE ===")
            print(f"Current time: {current_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}")
            current_price = getSlot0(current_block)
            print(f"CURRENT BWORK PRICE: ${current_price:.8f}")
            print(f"Block: {current_block}")
            
            # Check if we're at a target time
            is_current_target = is_target_time(current_timestamp, tolerance_minutes=30)
            
            if is_current_target:
                print("🎯 TARGET TIME REACHED! Adding permanent data point...")
                # Add as a permanent target time data point
                insert_pos = len(ArrayOfTimestamps)
                for i, ts in enumerate(ArrayOfTimestamps):
                    if current_timestamp < ts:
                        insert_pos = i
                        break
                
                ArrayOfTimestamps.insert(insert_pos, current_timestamp)
                ArrayOfBlocksSearched.insert(insert_pos, current_block)
                ArrayOfActualPrices.insert(insert_pos, current_price)
                
                # Remove oldest data points if over limit
                while len(ArrayOfTimestamps) > MAX_DATA_POINTS:
                    ArrayOfTimestamps.pop(0)
                    ArrayOfBlocksSearched.pop(0)
                    ArrayOfActualPrices.pop(0)
                
                save_data(ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices)
                print("✅ Target time data point saved permanently!")
            
            else:
                print("📈 Updating current price (temporary until next target time)...")
                # Update current price, keeping only targets + this current price
                ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices = update_current_price(
                    ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices,
                    current_timestamp, current_block, current_price
                )
                save_data(ArrayOfTimestamps, ArrayOfBlocksSearched, ArrayOfActualPrices)
                print("📱 Current price updated (will be replaced until target time)")
            
            # Show next target time info
            next_target_time = get_next_target_time(current_timestamp)
            next_target_dt = datetime.fromtimestamp(next_target_time, tz=timezone.utc)
            time_to_next_target = next_target_time - current_timestamp
            hours_to_next = time_to_next_target // 3600
            minutes_to_next = (time_to_next_target % 3600) // 60
            
            print(f"Next target time: {next_target_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}")
            print(f"Time until next target: {int(hours_to_next)}h {int(minutes_to_next)}m")
            print(f"Total stored data points: {len(ArrayOfTimestamps)}")
            
            # Count target vs current data points
            target_count = sum(1 for ts in ArrayOfTimestamps if is_target_time(ts))
            current_count = len(ArrayOfTimestamps) - target_count
            print(f"  - Target time points: {target_count}")
            print(f"  - Current price points: {current_count}")
            print("=" * 40)
                    
        except Exception as e:
            print(f"Error in monitoring loop: {e}")
            print("Continuing monitoring in 5 minutes...")
        
        # Wait 5 minutes before next check
        time.sleep(5 * 60)

if __name__ == "__main__":
    while True:
        try:
            main()
        except Exception as e:
            print("ERROR e: ",e)
            time.sleep(200)
