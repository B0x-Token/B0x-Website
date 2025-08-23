from web3 import Web3

# Connect to an Ethereum node (e.g., Infura, local node, etc.)
provider = "https://mainnet.base.org"
web3 = Web3(Web3.HTTPProvider(provider))

# Contract address
contract_address = "0x2f38B1a516239739CdCD2C228D1Eb96E29800975"

# Function to get storage at a specific slot
def get_storage_at(slot):
    value = web3.eth.get_storage_at(contract_address, slot)
    return value


# Retrieve first 30 storage slots and make them readable
for slot in range(30):
    storage_value = get_storage_at(slot)
    # Convert bytes to integer or hex
    int_value = int.from_bytes(storage_value, byteorder='big')
    hex_value = storage_value.hex()
    print(f"Slot {slot}:")
    print(f"  Bytes: {storage_value}")
    print(f"  Integer: {int_value}")
    print(f"  Hex: {hex_value}\n")
