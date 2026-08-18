// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

interface IPoolManager {
    struct PoolKey {
        Currency2 currency0;
        Currency2 currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    /// @notice Initialize a new pool
    /// @param key The pool key defining the pool parameters
    /// @param sqrtPriceX96 The initial sqrt price of the pool as a Q64.96
    function initialize(PoolKey calldata key, uint160 sqrtPriceX96) external;
}

interface IERC20 {
    function decimals() external view returns (uint8);
}

// Currency type definition
type Currency2 is address;

/**
 * @title UniswapV4PoolCreator
 * @notice Creates Uniswap V4 pools with specific B0x token pricing
 * @dev Sets initial price ratio of 20 B0x = 1 other token
 */
contract UniswapV4PoolCreator {
   /// @notice The Uniswap V4 pool manager contract interface
   IPoolManager public immutable poolManager;
   /// @notice The address of the B0x token contract
   address public immutable b0xToken;
   
   // Events
   /// @notice Event emitted when a new pool is created
   event PoolCreated(
        address indexed token0,
        address indexed token1,
        address indexed hookContract,
        uint160 sqrtPriceX96
    );
    
    // Errors
    error InvalidTokenAddress();
    error InvalidHookContract();
    error IdenticalTokens();
    error ZeroAddress();


    /// @notice Initializes the B0x token for properlly setting up the 0xBTC/B0x pool
    /// @dev Sets B0x Token address for creating pool
    /// @param _b0x Address of the B0x token contract to be mined
    constructor(address _b0x) {
        if (_b0x == address(0)) revert ZeroAddress();
        
        b0xToken = _b0x;
        // Note: Verify this address for your target network
        poolManager = IPoolManager(0x498581fF718922c3f8e6A244956aF099B2652b2b);
    }

    /**
     * @notice Creates a new Uniswap V4 pool for b0x & 0xBTC
     * @param tokenA First token address
     * @param tokenB Second token address  
     * @param hookContract Hook contract address (use address(0) for no hooks)
     */
    function createNewPool(
        address tokenA,
        address tokenB,
        address hookContract
    ) public {
        // Input validation
        if (tokenA == tokenB) revert IdenticalTokens();
        
        // Sort tokens (required by Uniswap)
        (address token0, address token1) = tokenA < tokenB 
            ? (tokenA, tokenB) 
            : (tokenB, tokenA);

        uint8 decimals0 = 18;
        // Get token decimals
        if(token0 !=address(0)){
        
        uint8 decimals0 = IERC20(token0).decimals();
        }
        
        uint8 decimals1 = 18;
        // Get token decimals
        if(token1 !=address(0)){
        
        uint8 decimals1 = IERC20(token1).decimals();
        }
        
        
        // Calculate decimal-adjusted price ratio
        uint256 priceRatio = calculateDecimalAdjustedPrice(
            token0, 
            token1, 
            decimals0, 
            decimals1
        );
        
        uint160 sqrtPriceX96 = sqrtPriceX96FromCalculatedRatio(
            priceRatio, 
            token0, 
            token1
        );

        // Create PoolKey
        IPoolManager.PoolKey memory key = IPoolManager.PoolKey({
            currency0: Currency2.wrap(token0),
            currency1: Currency2.wrap(token1),
            fee: encodeDynamicFee(),
            tickSpacing: 60,
            hooks: hookContract
        });
        
        // Initialize the pool
        poolManager.initialize(key, sqrtPriceX96);
        
        emit PoolCreated(token0, token1, hookContract, sqrtPriceX96);
    }

    /**
     * @notice Calculates decimal-adjusted price ratio
     * @dev Economic ratio: 20 B0x = 1 other token (price = 1/20 = 0.05)
     * @param token0 Sorted token0 address
     * @param token1 Sorted token1 address
     * @param decimals0 Token0 decimals
     * @param decimals1 Token1 decimals
     * @return priceRatio Price ratio in 18-decimal format
     */
    function calculateDecimalAdjustedPrice(
        address token0,
        address token1, 
        uint8 decimals0,
        uint8 decimals1
    ) internal view returns (uint256 priceRatio) {
        if (token0 == b0xToken) {
            // token0 is B0x, token1 is other token
            // Uniswap price = token1/token0 = other/B0x = 0.05
            uint256 numerator = 10**decimals1 * 1e18;
            uint256 denominator = 20 * 10**decimals0;
            priceRatio = numerator / denominator;
        } else {
            // token1 is B0x, token0 is other token  
            // Uniswap price = token1/token0 = B0x/other = 20
            uint256 numerator = 20 * 10**decimals1 * 1e18;
            uint256 denominator = 1 * 10**decimals0;
            priceRatio = numerator / denominator;
        }
        
        return priceRatio;
    }

    /**
     * @notice Converts price ratio to sqrtPriceX96 format
     * @param priceRatio18Decimal Price ratio in 18-decimal format
     * @return sqrtPriceX96 Square root price in X96 format
     */
    function sqrtPriceX96FromPriceRatio(
        uint256 priceRatio18Decimal
    ) public pure returns (uint160) {
        if (priceRatio18Decimal == 0) return 0;
        
        // Calculate sqrt(priceRatio) * 2^96
        uint256 sqrtPrice = sqrt(priceRatio18Decimal);
        
        // Convert to X96 format
        return uint160((sqrtPrice * (2 ** 96)) / 1e9);
    }

    /**
     * @notice Wrapper function for calculated ratio conversion
     * @param priceRatio Price ratio from calculateDecimalAdjustedPrice
     * @param token0 Token0 address (unused but kept for interface consistency)
     * @param token1 Token1 address (unused but kept for interface consistency) 
     * @return sqrtPriceX96 Square root price in X96 format
     */
    function sqrtPriceX96FromCalculatedRatio(
        uint256 priceRatio,
        address token0,
        address token1
    ) public pure returns (uint160) {
        return sqrtPriceX96FromPriceRatio(priceRatio);
    }

    /**
     * @notice Debug function to understand decimal-adjusted prices
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return token0 Sorted token0 address
     * @return token1 Sorted token1 address
     * @return decimals0 Token0 decimals
     * @return decimals1 Token1 decimals
     * @return calculatedPriceRatio Calculated price ratio
     * @return explanation Price calculation explanation
     */
    function debugDecimalAdjustedPrice(
        address tokenA,
        address tokenB
    ) external view returns (
        address token0,
        address token1,
        uint8 decimals0,
        uint8 decimals1,
        uint256 calculatedPriceRatio,
        string memory explanation
    ) {
        (token0, token1) = tokenA < tokenB 
            ? (tokenA, tokenB) 
            : (tokenB, tokenA);
        
        decimals0 = IERC20(token0).decimals();
        decimals1 = IERC20(token1).decimals();
        
        calculatedPriceRatio = calculateDecimalAdjustedPrice(
            token0, 
            token1, 
            decimals0, 
            decimals1
        );
        
        if (token0 == b0xToken) {
            explanation = "token0=B0x, price=other/B0x=0.05, 18-decimal format";
        } else {
            explanation = "token1=B0x, price=B0x/other=20, 18-decimal format";
        }
        
        return (
            token0, 
            token1, 
            decimals0, 
            decimals1, 
            calculatedPriceRatio, 
            explanation
        );
    }

    /**
     * @notice Debug function to verify price calculations
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return scenario Price calculation scenario
     * @return numerator Calculation numerator
     * @return denominator Calculation denominator
     * @return priceRatio Final price ratio
     * @return expectedSqrtPriceX96 Expected sqrt price in X96 format
     */
    function debugPriceCalculation(
        address tokenA,
        address tokenB
    ) external view returns (
        string memory scenario,
        uint256 numerator,
        uint256 denominator,
        uint256 priceRatio,
        uint256 expectedSqrtPriceX96
    ) {
        (address token0, address token1) = tokenA < tokenB 
            ? (tokenA, tokenB) 
            : (tokenB, tokenA);
            
        uint8 decimals0 = IERC20(token0).decimals();
        uint8 decimals1 = IERC20(token1).decimals();
        
        if (token0 == b0xToken) {
            scenario = "B0x is token0, other is token1, price = other/B0x = 0.05";
            numerator = 10**decimals1 * 1e18;
            denominator = 20 * 10**decimals0;
        } else {
            scenario = "Other is token0, B0x is token1, price = B0x/other = 20";
            numerator = 20 * 10**decimals1 * 1e18;
            denominator = 1 * 10**decimals0;
        }
        
        priceRatio = numerator / denominator;
        expectedSqrtPriceX96 = uint256(sqrtPriceX96FromPriceRatio(priceRatio));
        
        return (
            scenario, 
            numerator, 
            denominator, 
            priceRatio, 
            expectedSqrtPriceX96
        );
    }

    /**
     * @notice Encodes dynamic fee flag
     * @return Dynamic fee flag (0x800000)
     */
    function encodeDynamicFee() public pure returns (uint24) {
        return 0x800000; // DYNAMIC_FEE_FLAG
    }

    /**
     * @notice Babylonian square root implementation
     * @param x Input value
     * @return Square root of x
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        
        return y;
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

