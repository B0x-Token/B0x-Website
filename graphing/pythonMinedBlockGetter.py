import json
import os
import time
import threading
from datetime import datetime
from web3 import Web3
from typing import List, Dict, Any, Optional

class EthereumBlockFetcher:
    def __init__(self, rpc_url: str = "https://base-sepolia.g.alchemy.com/v2/fTukefKxyH-72aDTEBUHqcad2_SK53CC"):
        """
        Initialize the Ethereum block fetcher
        
        Args:
            rpc_url: Ethereum RPC endpoint URL
        """
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.eth_block_start = 30111966
        self.bwork_contract_address = "0x7aDf1927aa0c75Fd054804E9fc6574A56C211AbB"
        self.mint_topic = "0xcf6fbb9dcea7d07263ab4f5c3a92f53af33dffc421d9d121e1c74b307e68189d"
        self.mined_blocks = []
        self.previous_challenge = None
        self.last_processed_block_file = "last_processed_block.json"
        self.running = False
        self.scheduler_thread = None
        
    def load_last_processed_block(self) -> int:
        """Load the last processed block from file, or return default start block"""
        if os.path.exists(self.last_processed_block_file):
            try:
                with open(self.last_processed_block_file, 'r') as f:
                    data = json.load(f)
                    return data.get('last_block', self.eth_block_start)
            except (json.JSONDecodeError, KeyError):
                print(f"Error reading {self.last_processed_block_file}, using default start block")
                return self.eth_block_start
        return self.eth_block_start
    
    def save_last_processed_block(self, block_number: int):
        """Save the last processed block to file"""
        data = {'last_block': block_number}
        with open(self.last_processed_block_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def get_miner_address_from_topic(self, topic: str) -> str:
        """Extract miner address from topic (assuming it's in the topic)"""
        # Remove '0x' prefix and take the last 40 characters (20 bytes = address)
        if topic.startswith('0x'):
            topic = topic[2:]
        # Ethereum addresses are 20 bytes, so last 40 hex characters
        if len(topic) >= 40:
            return '0x' + topic[-40:]
        return topic
    
    def fetch_logs(self, start_block: int, end_block: int) -> List[Dict[str, Any]]:
        """
        Fetch logs from Ethereum blockchain
        
        Args:
            start_block: Starting block number
            end_block: Ending block number
            
        Returns:
            List of log entries
        """
        try:
            logs = self.w3.eth.get_logs({
                'fromBlock': start_block,
                'toBlock': end_block,
                'address': self.bwork_contract_address,
                'topics': [self.mint_topic]
            })
            
            print(f"Got filter results: {len(logs)} transactions")
            return logs
            
        except Exception as e:
            print(f"Error fetching logs: {e}")
            return []
    
    def process_transaction(self, transaction: Dict[str, Any]):
        """Process a single transaction and update mined_blocks"""
        tx_hash = transaction['transactionHash'].hex()
        block_number = int(transaction['blockNumber'])
        
        # Get miner address from topics[1]
        miner_address = self.get_miner_address_from_topic(transaction['topics'][1].hex())
        
        # Process transaction data
        data = transaction['data'].hex()
        
        # Extract amount (first 64 hex characters after '0x')
        if len(data) >= 66:  # '0x' + 64 characters
            data_amt_hex = data[2:66]  # Remove '0x' and take first 64 chars
            data_amt = int(data_amt_hex, 16) / (10 ** 18)  # Convert to ETH
        else:
            data_amt = 0
        
        # Extract challenger (characters 130-194)
        if len(data) >= 194:
            challenger = data[130:194]
            
            if self.previous_challenge != challenger:
                previous_challenge2 = self.previous_challenge
                print(f"Old challenge: {self.previous_challenge}, new challenge: {challenger}")
                self.previous_challenge = challenger
                
                if previous_challenge2 is not None:
                    # Create new block entry for challenge change
                    first_block_num = self.mined_blocks[0][0] if self.mined_blocks else block_number
                    new_block = [first_block_num, tx_hash, miner_address, -1]
                    self.mined_blocks.insert(0, new_block)
        
        # Add the actual mined block
        self.mined_blocks.insert(0, [block_number, tx_hash, miner_address, data_amt])
    
    def save_mined_blocks_to_file(self, filename: str = "mined_blocks.json"):
        """Save mined blocks to a JSON file that can be easily read by JavaScript"""
        latest_block = self.w3.eth.get_block('latest')
        output_data = {
            'mined_blocks': self.mined_blocks,
            'total_blocks': len(self.mined_blocks),
            'last_updated': latest_block['timestamp'],
            'latest_block_number': latest_block['number'],
            'contract_address': self.bwork_contract_address,
            'mint_topic': self.mint_topic,
            'previous_challenge': self.previous_challenge
        }
        if(len(self.mined_blocks)>0):
            with open(filename, 'w') as f:
                json.dump(output_data, f, indent=2)
        
            print(f"Saved {len(self.mined_blocks)} mined blocks to {filename}")
        
        # Also save as a simple JavaScript-compatible format
        js_filename = filename.replace('.json', '.js')
        with open(js_filename, 'w') as f:
            f.write(f"const minedBlocksData = {json.dumps(output_data, indent=2)};\n")
            f.write("module.exports = minedBlocksData;\n")
        
        print(f"Saved JavaScript-compatible file: {js_filename}")
    
    def run_once(self, batch_size: int = 499):
        """
        Run the fetcher once
        
        Args:
            batch_size: Number of blocks to process in each batch
        """
        try:
            print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting block fetch...")
            
            # Load the last processed block
            start_block = self.load_last_processed_block()
            current_block = self.w3.eth.get_block('latest')['number']
            
            print(f"Starting from block: {start_block}")
            print(f"Current block: {current_block}")
            
            if start_block > current_block:
                print("Already up to date!")
                return
            
            # Process blocks in batches
            current_start = start_block
            
            while current_start <= current_block:
                current_end = min(current_start + batch_size - 1, current_block)
                
                print(f"Processing blocks {current_start} to {current_end}")
                
                # Fetch logs for this batch
                logs = self.fetch_logs(current_start, current_end)
                
                # Process each transaction
                for transaction in logs:
                    self.process_transaction(transaction)
                
                # Save progress
                self.save_last_processed_block(current_end)
                
                # Move to next batch
                current_start = current_end + 1
            
            # Save final results
            self.save_mined_blocks_to_file()
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Processing complete!")
            
        except Exception as e:
            print(f"Error during fetch: {e}")
    
    def scheduler_loop(self, interval_minutes: int = 3, batch_size: int = 499):
        """
        Main scheduler loop that runs every interval_minutes
        
        Args:
            interval_minutes: How often to run in minutes
            batch_size: Number of blocks to process in each batch
        """
        interval_seconds = interval_minutes * 60
        
        while self.running:
            # Run the fetcher
            self.run_once(batch_size)
            
            # Wait for the next interval or until stopped
            for _ in range(interval_seconds):
                if not self.running:
                    break
                time.sleep(1)
    
    def start_scheduler(self, interval_minutes: int = 3, batch_size: int = 499):
        """
        Start the scheduler in a separate thread
        
        Args:
            interval_minutes: How often to run in minutes (default: 3)
            batch_size: Number of blocks to process in each batch
        """
        if self.running:
            print("Scheduler is already running!")
            return
        
        self.running = True
        self.scheduler_thread = threading.Thread(
            target=self.scheduler_loop,
            args=(interval_minutes, batch_size),
            daemon=True
        )
        self.scheduler_thread.start()
        
        print(f"Started scheduler! Will run every {interval_minutes} minutes.")
        print("Press Ctrl+C to stop the scheduler.")
    
    def stop_scheduler(self):
        """Stop the scheduler"""
        self.running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        print("Scheduler stopped.")
    
    def run_continuously(self, interval_minutes: int = 3, batch_size: int = 499):
        """
        Run the fetcher continuously every interval_minutes
        
        Args:
            interval_minutes: How often to run in minutes (default: 3)
            batch_size: Number of blocks to process in each batch
        """
        self.start_scheduler(interval_minutes, batch_size)
        
        try:
            # Keep the main thread alive
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nReceived interrupt signal...")
            self.stop_scheduler()

# Usage examples
if __name__ == "__main__":
    while True:
        try:
        
            # Initialize with your Ethereum RPC URL
            RPC_URL = "https://base-sepolia.g.alchemy.com/v2/fTukefKxyH-72aDTEBUHqcad2_SK53CC"
    
            fetcher = EthereumBlockFetcher(RPC_URL)
    
            # Option 1: Run once manually
            # fetcher.run_once(batch_size=499)
    
            # Option 2: Run continuously every 3 minutes (recommended)
            fetcher.run_continuously(interval_minutes=3, batch_size=499)
    
            # Option 3: Start scheduler in background and do other things
            # fetcher.start_scheduler(interval_minutes=3, batch_size=499)
            # # Do other things here...
            # # fetcher.stop_scheduler()  # Call this when you want to stop
        
        except Exception as e:
            print(f"Error during main execution: {e}")
            time.sleep(175)
