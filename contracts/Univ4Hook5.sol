// B Zero X Token - B0x Token - Hook Miner and Hook Contract
// Website: https://bzerox.com/
// Website dAPP: https://bzerox.org/
// Documents about B0x - B Zero X: https://dev.bzerox.org/
// Github: https://github.com/B0x-Token/
// Discord: https://discord.gg/K89uF2C8vJ
// Twitter: https://x.com/B0x_Token/
//
//
// Distrubtion of B ZERO X Tokens - B0x Token is as follows:
//
// B0x Token is distributed to users by using Proof of work and is considered a Version 2 & Layer 2 of 0xBitcoin.  Our contract allows all 0xBitcoin to be converted to B0x Tokens.
// Computers solve a complicated problem to gain tokens!
// 100% of 0xBitcoin accepted for B0x Tokens
// 100% Of the Token is distributed to the users! No dev fee!
// Token Mining will take place on Base Blockchain, while having the token reside on Mainnet Ethereum.
//
// Symbol: B0x
// Decimals: 18
//
// Total supply: 31,165,100.000000000000000000
//   =
// 10,835,900 0xBitcoin Tokens able to transfered to B0x Tokens.
//   +
// 10,164,100 Mined over 100+ years using Bitcoins Distrubtion halvings every ~4 years. Uses Proof-oF-Work to distribute the tokens. Public Miner is available see https://bzerox.com/
//   +
// 10,164,100 sent to Liquidity Providers of the 0xBTC/B0x liquidity pool. Distributes 1 token to the Staking contract for every 1 token minted by Proof-of-Work miners
//  
//
// No dev cut, or advantage taken at launch. Public miner available at launch. 100% of the token is given away fairly over 100+ years using Bitcoins model!
// 
// Mint 2016 answers per challenge in this cost savings Bitcoin!! Less failed transactions as the challenge only changes every 2016 answers instead of every answer.
//
// Credits: 0xBitcoin, zkBitcoin
//
// startTime =  1762020000;  //Date and time (GMT): Saturday, November 1, 2025 6:00:00 PM (GMT TIMEZONE) then openMining functioncan then be called and mining will have rewards, until then all rewards will be 0.





// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
/// @title Library for reverting with custom errors efficiently
/// @notice Contains functions for reverting with custom errors with different argument types efficiently
/// @dev To use this library, declare `using CustomRevert for bytes4;` and replace `revert CustomError()` with
/// `CustomError.selector.revertWith()`
/// @dev The functions may tamper with the free memory pointer but it is fine since the call context is exited immediately
library CustomRevert {
    /// @dev ERC-7751 error for wrapping bubbled up reverts
    error WrappedError(address target, bytes4 selector, bytes reason, bytes details);

    /// @dev Reverts with the selector of a custom error in the scratch space
    function revertWith(bytes4 selector) internal pure {
        assembly ("memory-safe") {
            mstore(0, selector)
            revert(0, 0x04)
        }
    }

    /// @dev Reverts with a custom error with an address argument in the scratch space
    function revertWith(bytes4 selector, address addr) internal pure {
        assembly ("memory-safe") {
            mstore(0, selector)
            mstore(0x04, and(addr, 0xffffffffffffffffffffffffffffffffffffffff))
            revert(0, 0x24)
        }
    }

    /// @dev Reverts with a custom error with an int24 argument in the scratch space
    function revertWith(bytes4 selector, int24 value) internal pure {
        assembly ("memory-safe") {
            mstore(0, selector)
            mstore(0x04, signextend(2, value))
            revert(0, 0x24)
        }
    }

    /// @dev Reverts with a custom error with a uint160 argument in the scratch space
    function revertWith(bytes4 selector, uint160 value) internal pure {
        assembly ("memory-safe") {
            mstore(0, selector)
            mstore(0x04, and(value, 0xffffffffffffffffffffffffffffffffffffffff))
            revert(0, 0x24)
        }
    }

    /// @dev Reverts with a custom error with two int24 arguments
    function revertWith(bytes4 selector, int24 value1, int24 value2) internal pure {
        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(fmp, selector)
            mstore(add(fmp, 0x04), signextend(2, value1))
            mstore(add(fmp, 0x24), signextend(2, value2))
            revert(fmp, 0x44)
        }
    }

    /// @dev Reverts with a custom error with two uint160 arguments
    function revertWith(bytes4 selector, uint160 value1, uint160 value2) internal pure {
        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(fmp, selector)
            mstore(add(fmp, 0x04), and(value1, 0xffffffffffffffffffffffffffffffffffffffff))
            mstore(add(fmp, 0x24), and(value2, 0xffffffffffffffffffffffffffffffffffffffff))
            revert(fmp, 0x44)
        }
    }

    /// @dev Reverts with a custom error with two address arguments
    function revertWith(bytes4 selector, address value1, address value2) internal pure {
        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(fmp, selector)
            mstore(add(fmp, 0x04), and(value1, 0xffffffffffffffffffffffffffffffffffffffff))
            mstore(add(fmp, 0x24), and(value2, 0xffffffffffffffffffffffffffffffffffffffff))
            revert(fmp, 0x44)
        }
    }

    /// @notice bubble up the revert message returned by a call and revert with a wrapped ERC-7751 error
    /// @dev this method can be vulnerable to revert data bombs
    function bubbleUpAndRevertWith(
        address revertingContract,
        bytes4 revertingFunctionSelector,
        bytes4 additionalContext
    ) internal pure {
        bytes4 wrappedErrorSelector = WrappedError.selector;
        assembly ("memory-safe") {
            // Ensure the size of the revert data is a multiple of 32 bytes
            let encodedDataSize := mul(div(add(returndatasize(), 31), 32), 32)

            let fmp := mload(0x40)

            // Encode wrapped error selector, address, function selector, offset, additional context, size, revert reason
            mstore(fmp, wrappedErrorSelector)
            mstore(add(fmp, 0x04), and(revertingContract, 0xffffffffffffffffffffffffffffffffffffffff))
            mstore(
                add(fmp, 0x24),
                and(revertingFunctionSelector, 0xffffffff00000000000000000000000000000000000000000000000000000000)
            )
            // offset revert reason
            mstore(add(fmp, 0x44), 0x80)
            // offset additional context
            mstore(add(fmp, 0x64), add(0xa0, encodedDataSize))
            // size revert reason
            mstore(add(fmp, 0x84), returndatasize())
            // revert reason
            returndatacopy(add(fmp, 0xa4), 0, returndatasize())
            // size additional context
            mstore(add(fmp, add(0xa4, encodedDataSize)), 0x04)
            // additional context
            mstore(
                add(fmp, add(0xc4, encodedDataSize)),
                and(additionalContext, 0xffffffff00000000000000000000000000000000000000000000000000000000)
            )
            revert(fmp, add(0xe4, encodedDataSize))
        }
    }
}


/// @title Safe casting methods
/// @notice Contains methods for safely casting between types
library SafeCast {
    using CustomRevert for bytes4;

    error SafeCastOverflow();

    /// @notice Cast a uint256 to a uint160, revert on overflow
    /// @param x The uint256 to be downcasted
    /// @return y The downcasted integer, now type uint160
    function toUint160(uint256 x) internal pure returns (uint160 y) {
        y = uint160(x);
        if (y != x) SafeCastOverflow.selector.revertWith();
    }

    /// @notice Cast a uint256 to a uint128, revert on overflow
    /// @param x The uint256 to be downcasted
    /// @return y The downcasted integer, now type uint128
    function toUint128(uint256 x) internal pure returns (uint128 y) {
        y = uint128(x);
        if (x != y) SafeCastOverflow.selector.revertWith();
    }

    /// @notice Cast a int128 to a uint128, revert on overflow or underflow
    /// @param x The int128 to be casted
    /// @return y The casted integer, now type uint128
    function toUint128(int128 x) internal pure returns (uint128 y) {
        if (x < 0) SafeCastOverflow.selector.revertWith();
        y = uint128(x);
    }

    /// @notice Cast a int256 to a int128, revert on overflow or underflow
    /// @param x The int256 to be downcasted
    /// @return y The downcasted integer, now type int128
    function toInt128(int256 x) internal pure returns (int128 y) {
        y = int128(x);
        if (y != x) SafeCastOverflow.selector.revertWith();
    }

    /// @notice Cast a uint256 to a int256, revert on overflow
    /// @param x The uint256 to be casted
    /// @return y The casted integer, now type int256
    function toInt256(uint256 x) internal pure returns (int256 y) {
        y = int256(x);
        if (y < 0) SafeCastOverflow.selector.revertWith();
    }

    /// @notice Cast a uint256 to a int128, revert on overflow
    /// @param x The uint256 to be downcasted
    /// @return The downcasted integer, now type int128
    function toInt128(uint256 x) internal pure returns (int128) {
        if (x >= 1 << 127) SafeCastOverflow.selector.revertWith();
        return int128(int256(x));
    }
}
/// @dev Two `int128` values packed into a single `int256` where the upper 128 bits represent the amount0
/// and the lower 128 bits represent the amount1.
type BalanceDelta is int256;

using {add as +, sub as -, eq as ==, neq as !=} for BalanceDelta global;
using BalanceDeltaLibrary for BalanceDelta global;
using SafeCast for int256;

function toBalanceDelta(int128 _amount0, int128 _amount1) pure returns (BalanceDelta balanceDelta) {
    assembly ("memory-safe") {
        balanceDelta := or(shl(128, _amount0), and(sub(shl(128, 1), 1), _amount1))
    }
}

function add(BalanceDelta a, BalanceDelta b) pure returns (BalanceDelta) {
    int256 res0;
    int256 res1;
    assembly ("memory-safe") {
        let a0 := sar(128, a)
        let a1 := signextend(15, a)
        let b0 := sar(128, b)
        let b1 := signextend(15, b)
        res0 := add(a0, b0)
        res1 := add(a1, b1)
    }
    return toBalanceDelta(res0.toInt128(), res1.toInt128());
}

function sub(BalanceDelta a, BalanceDelta b) pure returns (BalanceDelta) {
    int256 res0;
    int256 res1;
    assembly ("memory-safe") {
        let a0 := sar(128, a)
        let a1 := signextend(15, a)
        let b0 := sar(128, b)
        let b1 := signextend(15, b)
        res0 := sub(a0, b0)
        res1 := sub(a1, b1)
    }
    return toBalanceDelta(res0.toInt128(), res1.toInt128());
}

function eq(BalanceDelta a, BalanceDelta b) pure returns (bool) {
    return BalanceDelta.unwrap(a) == BalanceDelta.unwrap(b);
}

function neq(BalanceDelta a, BalanceDelta b) pure returns (bool) {
    return BalanceDelta.unwrap(a) != BalanceDelta.unwrap(b);
}

/// @notice Library for getting the amount0 and amount1 deltas from the BalanceDelta type
library BalanceDeltaLibrary {
    /// @notice A BalanceDelta of 0
    BalanceDelta public constant ZERO_DELTA = BalanceDelta.wrap(0);

    function amount0(BalanceDelta balanceDelta) internal pure returns (int128 _amount0) {
        assembly ("memory-safe") {
            _amount0 := sar(128, balanceDelta)
        }
    }

    function amount1(BalanceDelta balanceDelta) internal pure returns (int128 _amount1) {
        assembly ("memory-safe") {
            _amount1 := signextend(15, balanceDelta)
        }
    }
}
// -----------------------------------------------------------------------------
// Minimal Interfaces
// -----------------------------------------------------------------------------

/// @notice Defines the key parameters that uniquely identify a Uniswap V4 pool
/// @dev Used to specify which pool to interact with across various hook operations
struct PoolKey_Hook {
    /// @notice The first token in the pool pair (lexicographically smaller address)
    address currency0;
    /// @notice The second token in the pool pair (lexicographically larger address)  
    address currency1;
    /// @notice The fee tier for swaps in the pool, expressed in hundredths of a bip (e.g., 3000 = 0.3%)
    uint24 fee;
    /// @notice The tick spacing for the pool, determining price granularity and liquidity positions
    int24 tickSpacing;
    /// @notice Address of the hook contract associated with this pool
    address hooks;
}


/// @notice Interface for interacting with the Uniswap V4 Pool Manager for hook operations
/// @dev Provides essential functions needed by hook contracts to manage pool parameters
interface IPoolManager_Hook {
    /// @notice Updates the dynamic liquidity provider fee for a specific pool
    /// @dev Only callable by authorized hook contracts to adjust LP fees dynamically
    /// @param key The pool identifier containing currency pair and hook information
    /// @param newDynamicLPFee The new fee rate to set, expressed in hundredths of a bip (e.g., 3000 = 0.3%)
    function updateDynamicLPFee(PoolKey_Hook memory key, uint24 newDynamicLPFee) external;
}

interface IHooks5 {

    /// @notice Hook function called after a pool has been successfully initialized
    /// @param sender Address that initiated the pool initialization
    /// @param key Pool parameters including currencies, fee, and tick spacing
    /// @param sqrtPriceX96 Initial price of the pool encoded as sqrt(price) * 2^96
    /// @param tick The initial tick corresponding to the starting price
    /// @param hookData Additional data passed to the hook for custom logic
    /// @return bytes4 Function selector to validate successful execution
    function afterInitialize(
        address sender,
        PoolKey_Hook calldata key,
        uint160 sqrtPriceX96,
        int24 tick,
        bytes calldata hookData
    ) external returns (bytes4);


    /// @notice Defines which hook functions a contract wants to implement and when they should be called
    /// @dev Used by the pool manager to determine which hooks to call during pool operations
    struct Permissions {
        /// @notice Whether to call beforeInitialize when a pool is being created
        bool beforeInitialize;
        /// @notice Whether to call afterInitialize after a pool is created
        bool afterInitialize;
        /// @notice Whether to call beforeAddLiquidity when liquidity is being added
        bool beforeAddLiquidity;
        /// @notice Whether to call afterAddLiquidity after liquidity is added
        bool afterAddLiquidity;
        /// @notice Whether to call beforeRemoveLiquidity when liquidity is being removed
        bool beforeRemoveLiquidity;
        /// @notice Whether to call afterRemoveLiquidity after liquidity is removed
        bool afterRemoveLiquidity;
        /// @notice Whether to call beforeSwap when a swap is being executed
        bool beforeSwap;
        /// @notice Whether to call afterSwap after a swap is executed
        bool afterSwap;
        /// @notice Whether to call beforeDonate when tokens are being donated to the pool
        bool beforeDonate;
        /// @notice Whether to call afterDonate after tokens are donated to the pool
        bool afterDonate;
        /// @notice Whether beforeSwap should return a delta value to modify swap behavior
        bool beforeSwapReturnDelta;
        /// @notice Whether afterSwap should return a delta value to modify swap results
        bool afterSwapReturnDelta;
        /// @notice Whether afterAddLiquidity should return a delta value to modify results
        bool afterAddLiquidityReturnDelta;
        /// @notice Whether afterRemoveLiquidity should return a delta value to modify results
        bool afterRemoveLiquidityReturnDelta;
    }
}


/// @notice Parameter struct for `ModifyLiquidity` pool operations
struct ModifyLiquidityParams {
    // the lower and upper tick of the position
    int24 tickLower;
    int24 tickUpper;
    // how to modify the liquidity
    int256 liquidityDelta;
    // a value to set if you want unique liquidity positions at the same range
    bytes32 salt;
}






/**
 * @title UniV4Hook
 * @notice Implementation of a Uniswap V4 hook contract that passes address validation
 */
contract UniV4Hook {

    /// @notice Mapping to track current fee for each pool
    /// @dev Maps pool ID to current fee tier
    mapping(bytes32 => uint24) public poolCurrentFees;

    /// @notice The Uniswap Manager contract that allows us to update fees for our liquidity pool
    IPoolManager_Hook immutable public manager = IPoolManager_Hook(0x498581fF718922c3f8e6A244956aF099B2652b2b);

    /// @notice The owner of the Hook contract that is able to adjust the liquidity pool fee
    address public owner;

    /// @notice The last updated Fee for the liquidity pool that this hook manages
    uint24 public currentFee = 0;
    
    /// @notice Emitted when a new Fee Rate is updated.
    /// @param newFee The new fee that will be used in the liquidity pool.
    /// @param oldFee The old fee that was used in the liquidity pool
    event NewFeeRate(uint24 newFee, uint24 oldFee);

    /// @notice Emitted when ownership of the contract is transferred
    /// @param previousOwner The address of the previous owner
    /// @param newOwner The address of the new owner
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /* ============ Constructor ============ */

    /// @notice Constructs a new Hook.
    constructor() {
        owner = address(0x59AF082Ba6E3C59cda33d96190b4593C12d85D81);
    }
    
    /* ============ Modifiers ============ */

    /// @notice Modifier that throws error if sender is not owner of this contract
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }
    
    

    /// @notice Gets the current fee for a pool
    /// @param poolKey The pool key to check
    /// @return currentFeez The current fee tier on this Hook of the given poolKey
    function getCurrentPoolFee(PoolKey_Hook memory poolKey) public view returns (uint24 currentFeez) {
       bytes32 poolId = toId(poolKey);
       currentFeez = poolCurrentFees[poolId];
    }
    

    /// @notice Gets the current fee for a pool
    /// @param poolId The poolID in bytes32 to check
    /// @return currentFeez The current fee tier of this Hook of the given poolID
    function getCurrentPoolFeeByPoolID(bytes32 poolId) public view returns (uint24 currentFeez) {
       currentFeez = poolCurrentFees[poolId];
    }

    
    /// @notice Generates a unique pool ID from pool key parameters
    /// @param poolKey The pool key structure containing currency pairs, fee, tick spacing, and hooks
    /// @return poolId The unique bytes32 identifier for the pool
    /// @dev Uses keccak256 hash of the entire poolKey struct (5 slots * 32 bytes = 0xa0)
    function toId(PoolKey_Hook memory poolKey) internal pure returns (bytes32 poolId) {
       assembly ("memory-safe") {
          // 0xa0 represents the total size of the poolKey struct (5 slots of 32 bytes)
          poolId := keccak256(poolKey, 0xa0)
       }
    }











   /// @notice Transfers ownership of the contract to a new address
   /// @param newOwner The address of the new owner
   /// @dev Can only be called by the current owner, validates newOwner is not zero address
   function transferOwner(address newOwner)public onlyOwner{
      require(newOwner != address(0), "New owner cannot be zero address");
      emit OwnershipTransferred(owner, newOwner);
      owner = newOwner;
   }
    /**
     * @notice Returns the hook's permissions
     * @return Permissions struct with afterInitialize set to true
     */
    function getHookPermissions() public pure returns (IHooks5.Permissions memory) {
        return IHooks5.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    
    /**
     * @notice Hook called after pool initialization
     * @dev Must return the correct selector to validate the hook
     * @return IHooks.afterInitialize.selector Function selector
     */
    function afterInitialize(
        address sender,
        PoolKey_Hook calldata key,
        uint160 sqrtPriceX96,
        int24 tick
    ) external returns (bytes4) {
        // Only allow the PoolManager to call this function
        require(msg.sender == address(manager), "Only PoolManager can call");
            
        // Set a default fee when the pool is initialized
        uint24 INITIAL_FEE = 20000; //2%

        bytes32 poolId = toId(key);
        poolCurrentFees[poolId] = INITIAL_FEE;
        emit NewFeeRate(INITIAL_FEE, 0);

        manager.updateDynamicLPFee(key, INITIAL_FEE);
        
        // IMPORTANT: Must return this exact selector
        return this.afterInitialize.selector;
    }


    /**
     * @notice Manually update the LP fee
     * @param key The pool key for the pool to update
     * @param newFee The new fee to charge for the given key
     */
    function forceUpdateLPFee(PoolKey_Hook calldata key, uint24 newFee) external onlyOwner {
        require (newFee<=90 * 10000 && newFee > 100, "Max is 90% fee rate ");
        manager.updateDynamicLPFee(key, newFee);
        emit NewFeeRate(newFee, currentFee);
        currentFee = newFee;
        bytes32 poolId = toId(key);
        poolCurrentFees[poolId] = currentFee;

    }
    
    /// @notice Allows the contract to receive ETH payments directly
    /// @dev This function is called when ETH is sent to the contract without any function call data
    receive() external payable {}
}








/**
 * @title HookMiner
 * @notice Contract to find a valid salt for deploying Uniswap V4 hooks
 */
contract HookMiner {
    /// @notice Bitmask containing all possible hook flags from the Uniswap V4 Hooks library
    /// @dev Used to validate that only valid hook flags are set in hook addresses
    uint160 constant ALL_HOOK_MASK = uint160((1 << 14) - 1); // Mask for all possible hook flags
    
    //uint160 constant BEFORE_INITIALIZE_FLAG = 1 << 13;
    uint160 constant AFTER_INITIALIZE_FLAG = 1 << 12;
    //uint160 constant BEFORE_ADD_LIQUIDITY_FLAG = 1 << 11;
    //uint160 constant AFTER_ADD_LIQUIDITY_FLAG = 1 << 10;
    //uint160 constant BEFORE_REMOVE_LIQUIDITY_FLAG = 1 << 9;
    //uint160 constant AFTER_REMOVE_LIQUIDITY_FLAG = 1 << 8;
    //uint160 constant BEFORE_SWAP_FLAG = 1 << 7;
    //uint160 constant AFTER_SWAP_FLAG = 1 << 6;
    //uint160 constant BEFORE_DONATE_FLAG = 1 << 5;
    //uint160 constant AFTER_DONATE_FLAG = 1 << 4;
    //uint160 constant BEFORE_SWAP_RETURNS_DELTA_FLAG = 1 << 3;
    //uint160 constant AFTER_SWAP_RETURNS_DELTA_FLAG = 1 << 2;
    //uint160 constant AFTER_ADD_LIQUIDITY_RETURNS_DELTA_FLAG = 1 << 1;
    //uint160 constant AFTER_REMOVE_LIQUIDITY_RETURNS_DELTA_FLAG = 1 << 0;
    // Define only the flags you want to be TRUE
    // For example, if we only want AFTER_INITIALIZE_FLAG to be true:
    uint160 public constant DESIRED_FLAGS = AFTER_INITIALIZE_FLAG;
    

    /// @notice Initializes the HookMiner contract and sets the admin for future hook deployments
    /// @dev Sets ADMINOFHOOK to the deployer's address, which will be used as owner in deployed hooks
    constructor() {
    }


    /**
     * @notice Check if a hook address has exactly the desired flags
     * @param hook The hook address to check
     * @return True if the address has exactly the desired flags
     */
    function isValidHookAddress(address hook) public pure returns (bool) {
        // Convert to uint160 to work with the entire value
        uint160 hookInt = uint160(hook);
        
        // Check that:
        // 1. All DESIRED_FLAGS are set
        // 2. No other flags within ALL_HOOK_MASK are set
        return (hookInt & ALL_HOOK_MASK) == DESIRED_FLAGS;
    }
    
    /**
     * @notice Mine for a valid hook address
     * @param salt The starting salt value
     * @param deployer The deployer address
     * @param initCodeHash The init code hash of the hook contract
     * @param iterations Max number of iterations to try
     * @return The valid hook address and the successful salt
     */

    /**
     * @notice Find a salt value that will produce a valid hook address
     * @param startSalt The starting salt to search from
     * @param maxAttempts Maximum number of attempts to try
     * @return The valid salt value
     */
    function findValidSalt(uint256 startSalt, uint256 maxAttempts) public view returns (uint256, address) {
        // Get the bytecode and constructor args for the contract
        bytes memory bytecode = type(UniV4Hook).creationCode;
        bytes memory args = abi.encode();
        
        // Try different salt values until we find a valid one
        for (uint256 i = 0; i < maxAttempts; i++) {
            uint256 salt = startSalt + i;
            address predictedAddress = computeAddress(salt, bytecode, args);
            
            if (isValidHookAddress(predictedAddress)) {
                return (salt, predictedAddress);
            }
        }
        
        revert("No valid salt found in range");
    }
    
    /**
     * @notice Compute the address a contract will be deployed to using CREATE2
     * @param salt The salt value
     * @param bytecode The contract bytecode
     * @param args The constructor arguments
     * @return The predicted contract address
     */
    function computeAddress(uint256 salt, bytes memory bytecode, bytes memory args) public view returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(abi.encodePacked(bytecode, args))
        )))));
    }
    
    /**
     * @notice Deploy the hook with a valid address
     * @param salt The salt value to use (must be pre-validated)
     * @return The deployed hook address
     */
    function deployHook(uint256 salt) public returns (address) {
        // Create the combined bytecode with constructor arguments
        bytes memory bytecode = type(UniV4Hook).creationCode;
        bytes memory args = abi.encode();
        bytes memory combined = abi.encodePacked(bytecode, args);
        
        // Deploy using CREATE2
        address payable hook;
        assembly {
            hook := create2(0, add(combined, 32), mload(combined), salt)
            if iszero(extcodesize(hook)) { revert(0, 0) }
        }
        
        // Verify the hook address is valid
        require(isValidHookAddress(hook), "Deployed hook address is not valid");
        
        return hook;
    }
}



/*
*
* MIT License
* ===========
*
* Copyright (c) 2025 B0x Token (B0x)
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.   
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
*/

