
from web3 import Web3
import time

RPC_URL = "https://mainnet.base.org"
w3 = Web3(Web3.HTTPProvider(RPC_URL))

Q192 = 2 ** 192

def get_storage_with_retry(address, slot, block, retries=5, delay=2):
    attempt = 0
    while attempt < retries:
        try:
            data = w3.eth.get_storage_at(address, slot, block_identifier=block)
            print("Data: ",data)
            bytes32_hex = "0x" + data.hex().rjust(64, "0")  # pad to 32 bytes (64 hex chars)
            print("Data hex: ",bytes32_hex)
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
    #BWORKWETH POOL
    pool_manager = "0x498581fF718922c3f8e6A244956aF099B2652b2b"
    pool_slot = '0xd66bf39be2869094cf8d2d31edffab51dc8326eadf3c7611d397d156993996da'
    block = block
    packed = get_storage_with_retry(pool_manager, pool_slot, block)
    sqrtPriceX96, tick, protocolFee, lpFee = unpack_slot0(packed)

    price = sqrtPriceX96_to_price(sqrtPriceX96)
    print("sqrtPriceX96:", sqrtPriceX96)
    print("Decoded tick:", tick)
    print("Protocol fee:", protocolFee)
    print("LP fee:", lpFee)
    print("Price:", price)


    #WETHUSD POOL
    pool_manager = "0x498581fF718922c3f8e6A244956aF099B2652b2b"
    pool_slot = '0xe570f6e770bf85faa3d1dbee2fa168b56036a048a7939edbcd02d7ebddf3f948'
    block = block
    packed = get_storage_with_retry(pool_manager, pool_slot, block)
    sqrtPriceX96, tick, protocolFee, lpFee = unpack_slot0(packed)

    price2 = sqrtPriceX96_to_price(sqrtPriceX96) * 10**12
    print("sqrtPriceX96:", sqrtPriceX96)
    print("Decoded tick:", tick)
    print("Protocol fee:", protocolFee)
    print("LP fee:", lpFee)
    print("ETH price2:", price2)
    print("Actual Price of BWORK", price2 * 1/price)
    actualprice = price2 * 1/price
    return actualprice
    
    
if __name__ == "__main__":
    startBlock = 34582182
    blocksPer30Min = 60 * 15  # assuming ~2 block/sec; adjust for real block time
    max_iterations = 48 * 30  # two days max
    x = 0
    ArrayOfActualPrices = []
    ArrayOfBlocksSearched = []
    ArrayOfTimestamps = []

    while True:
        targetBlock = startBlock - blocksPer30Min * x
        price = getSlot0(targetBlock)
        ArrayOfActualPrices.append(price)
        ArrayOfBlocksSearched.append(targetBlock)
        
        # Fetch timestamp for the block
        block_data = w3.eth.get_block(targetBlock)
        timestamp = block_data["timestamp"]
        ArrayOfTimestamps.append(timestamp)
        

        x += 1
        if x > max_iterations:
            break

    print("All prices collected:")
    print(ArrayOfActualPrices)
    print(ArrayOfBlocksSearched)
    print(ArrayOfTimestamps)
