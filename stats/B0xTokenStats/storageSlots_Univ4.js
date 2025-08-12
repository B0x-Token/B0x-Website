const { ethers } = require("ethers");

/**
 * Fetches the value at a specific storage slot in a contract
 * JavaScript equivalent of the Solidity extsload function
 * 
 * @param {string} contractAddress - The address of the contract
 * @param {string} slot - The storage slot to read (as a hex string)
 * @param {object} provider - An ethers.js provider
 * @returns {Promise<string>} - A promise resolving to the value at the storage slot
 */
async function extsload(contractAddress, slot, provider) {
    // Get the raw storage value at the specified slot
    const value = await provider.getStorage(contractAddress, slot);
    return value;
}

async function main() {
    // Example usage
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const contractAddress = '0x498581fF718922c3f8e6A244956aF099B2652b2b'; // Uniswap address
    
    // Calculate a slot (for example, to access pool data)
    const poolId = "0xa2b4f0322ae7f323ffc8b051c41689d4594d7892d75ce228f17213faec3ffe78";
    const mappingSlot = ethers.zeroPadValue(ethers.toBeHex(6), 32); // Slot for pools mapping
    
    // For a mapping with a bytes32 key, the storage slot is keccak256(key | slot)
    const poolIdPadded = ethers.zeroPadValue(poolId, 32);
    const slot = ethers.keccak256(ethers.concat([poolIdPadded, mappingSlot]));
    
    console.log("Computed Storage Slot:", slot);
    
    // Read the storage value
    const value = await extsload(contractAddress, slot, provider);
    console.log("Storage Value:", value);
    


        
        // Step 2: Convert the value to a BigInt
        const bigValue = BigInt(value.toString());

        // Step 3: Create the mask for the bottom 160 bits
        const mask = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");

        // Step 4: Apply the mask using bitwise AND to extract the last 160 bits
        const sqrtPriceX96Hex = bigValue & mask;  // AND operation

        // Step 5: Log the result (which is the last 160 bits)
        console.log("Extracted sqrtPriceX96:", sqrtPriceX96Hex.toString(16)); // Display as hex string
       // Convert the hex string to a BigInt (integer)
        const sqrtPriceX96Int = BigInt(sqrtPriceX96Hex);

        // Log the integer value
        console.log("sqrtPriceX96 as integer:", sqrtPriceX96Int.toString());
        var temp = parseInt(sqrtPriceX96Int)/2**96;
	console.log("parseInt(sqrtPriceX96Int)/2**96 = ", temp.toString());
        var final_price = (parseInt(sqrtPriceX96Int)/2**96)**2;
        console.log("Final Price = ", final_price);

    // If you know the structure, you can decode the value
    // For example, if it's a uint256:
    const decodedValue = ethers.toBigInt(value);
    console.log("Decoded Value:", decodedValue.toString());
}

main().catch(console.error)