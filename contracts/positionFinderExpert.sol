// B ZERO X Token - B0x Token Position Finder Pro
// Finds information about positions of B0x/0xBTC easily
//
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
pragma solidity ^0.8.20;

/// @notice Interface for interacting with Uniswap V4 NFT staking contracts
/// @dev Provides functions for querying staked position information and counts
interface IUniswapV4NFTStaking {    

    /// @notice Calculates the withdrawal multiplier based on staking duration
    /// @param timeStakedAt The timestamp when the position was staked
    /// @return multiplier The multiplier percentage applied to withdrawals
    /// @dev Uses tiered system: starts at 200%, decreases to 30% over 15 days, then further reductions
    function calc_howMuchToRemove(uint timeStakedAt) external view returns (uint128 multiplier);

    /// @notice Structure to store details of a staked liquidity position
    /// @dev Contains NFT ID, liquidity amount, staking status and timing
    struct StakedPosition {
       uint256 tokenId;       // The NFT token ID
       uint128 liquidity;     // The liquidity amount
       bool isStaked;         // Whether the position is currently staked
       uint timeStakedAt;
       address ownerOfPosition;
    }
    
    /// @notice Gets staked position data for a user at a specific sequential ID
    /// @param user The address of the user
    /// @param sequentialId The sequential ID of the position
    /// @return tokenId The NFT token ID
    /// @return liquidity The liquidity amount in the position
    /// @return isStaked Whether the position is currently staked
    /// @return timeStakedAt Timestamp when the position was staked
    /// @return ownerOfPosition Address of the position owner
    function userPositions(address user, uint256 sequentialId) external view returns (
        uint256 tokenId,
        uint128 liquidity,
        bool isStaked,
        uint timeStakedAt,
        address ownerOfPosition
    );


    /// @notice Returns the total number of staked positions for a specific user
    /// @param user The address of the user to query
    /// @return uint256 Total count of positions staked by the user
    function userPositionCount(address user) external view returns (uint256);

 
}

/// @notice Type alias for token addresses in Uniswap V4
/// @dev Provides type safety and clarity when working with currency addresses
type Currency is address;

/// @notice Struct containing pool key parameters that uniquely identify a Uniswap V4 pool
/// @dev Used across the system to specify which pool operations should target
struct PoolKey {
    /// @notice The first token of the pool, sorted lexicographically by address
    Currency currency0;
    /// @notice The second token of the pool, sorted lexicographically by address
    Currency currency1;
    /// @notice The fee tier of the pool, expressed in hundredths of a bip (e.g., 3000 = 0.3%)
    uint24 fee;
    /// @notice The tick spacing of the pool, determining price granularity for liquidity positions
    int24 tickSpacing;
    /// @notice The address of the hooks contract associated with this pool
    address hooks;
}

/// @notice Interface for querying Uniswap V4 pool state and position information
/// @dev Provides read-only access to pool data, position details, and fee calculations
interface IStateView {
    /// @notice Type alias for pool identifiers used throughout the system
    /// @dev Pools are identified by their keccak256 hash as bytes32
    type PoolId is bytes32;

    /// @notice Retrieves detailed position information including liquidity and fee growth
    /// @param poolId The unique identifier of the pool containing the position
    /// @param owner The address that owns the position (typically the Position Manager)
    /// @param tickLower The lower tick boundary of the position's price range
    /// @param tickUpper The upper tick boundary of the position's price range
    /// @param salt Additional identifier for the position (often the NFT token ID)
    /// @return liquidity The amount of liquidity provided in this position
    /// @return feeGrowthInside0LastX128 Last recorded fee growth for token0 within the position's range
    /// @return feeGrowthInside1LastX128 Last recorded fee growth for token1 within the position's range
    function getPositionInfo(PoolId poolId, address owner, int24 tickLower, int24 tickUpper, bytes32 salt) 
        external view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128);

    /// @notice Gets the current accumulated fee growth within a specific tick range
    /// @param poolId The unique identifier of the pool to query
    /// @param tickLower The lower tick boundary of the range
    /// @param tickUpper The upper tick boundary of the range
    /// @return feeGrowthInside0X128 Current accumulated fee growth for token0 within the range
    /// @return feeGrowthInside1X128 Current accumulated fee growth for token1 within the range
    function getFeeGrowthInside(
        bytes32 poolId,
        int24 tickLower,
        int24 tickUpper
    ) external view returns (uint256 feeGrowthInside0X128, uint256 feeGrowthInside1X128);

    /// @notice Alternative method to retrieve position information using a position identifier
    /// @param poolId The unique identifier of the pool containing the position
    /// @param positionId The unique identifier of the specific position
    /// @return liquidity The amount of liquidity provided in this position
    /// @return feeGrowthInside0LastX128 Last recorded fee growth for token0 within the position's range
    /// @return feeGrowthInside1LastX128 Last recorded fee growth for token1 within the position's range
    function getPositionInfo(
        PoolId poolId,
        bytes32 positionId
    ) external view returns (
        uint128 liquidity,
        uint256 feeGrowthInside0LastX128,
        uint256 feeGrowthInside1LastX128
    );

    /// @notice Retrieves the Slot0 data for a specific pool
    /// @param poolId The unique identifier of the pool
    /// @return sqrtPriceX96 The current price of the pool as a sqrt(token1/token0) Q64.96 value
    /// @return tick The current tick of the pool
    /// @return protocolFee The current protocol fee setting of the pool
    /// @return lpFee The current LP fee setting of the pool
    function getSlot0(bytes32 poolId)
        external
        view
        returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee);
}

/// @notice Interface for managing Uniswap V4 position NFTs
/// @dev Provides essential functions for querying NFT ownership, liquidity, and position details
interface IPositionManager {
    /// @notice Returns the current owner of a specific NFT position token
    /// @param tokenId The unique identifier of the NFT position token
    /// @return address The address that currently owns the specified NFT
    function ownerOf(uint256 tokenId) external view returns (address);

    /// @notice Gets the amount of liquidity associated with a specific position NFT
    /// @param tokenId The unique identifier of the NFT position token
    /// @return liquidity The amount of liquidity provided in this position
    function getPositionLiquidity(uint256 tokenId) external view returns (uint128 liquidity);

    /// @notice Returns the next token ID that will be assigned to a newly minted NFT
    /// @return uint256 The next available token ID for minting
    function nextTokenId() external view returns (uint256);

    /// @notice Retrieves comprehensive pool and position information for a given NFT
    /// @param tokenId The unique identifier of the NFT position token to query
    /// @return poolKey The pool parameters (currencies, fee, tick spacing, hooks) for this position
    /// @return info Additional position-specific information and metadata
    function getPoolAndPositionInfo(uint256 tokenId) external view returns (PoolKey memory poolKey, uint info);
}

/// @title Position Finder Pro
/// @notice Advanced utility contract for discovering and analyzing Uniswap V4 positions
/// @dev Provides tools for finding user positions, calculating liquidity amounts, and analyzing fees
contract positionFinderPro {
    /// @notice Reference to the Uniswap V4 Position Manager contract
    /// @dev Immutable reference for gas efficiency, points to the canonical position manager
    IPositionManager public immutable positionManager = IPositionManager(0x7C5f5A4bBd8fD63184577525326123B519429bDc);

    /// @notice Returns the maximum possible Uniswap NFT ID that could currently exist
    /// @dev Queries the position manager's next token ID to determine the upper bound
    /// @return uint The highest token ID that could be valid (nextTokenId - 1)
    function getMaxUniswapIDPossible() public view returns (uint) {
        return positionManager.nextTokenId();
    }


    /// @notice Minimum tick value representing the lowest possible price in Uniswap V4
    /// @dev Corresponds to a price ratio of approximately 1.0001^(-887220) ≈ 2.7×10^(-39)
    int24 private constant MIN_TICK = -887220;
    
    /// @notice Maximum tick value representing the highest possible price in Uniswap V4  
    /// @dev Corresponds to a price ratio of approximately 1.0001^(887220) ≈ 3.7×10^(38)
    int24 private constant MAX_TICK = 887220;



    /// @notice Reference to the Uniswap V4 NFT staking contract for querying staked positions
    /// @dev Used to interact with staking functionality and retrieve staked position data
    IUniswapV4NFTStaking public NFTStakingContract;
    
    /// @notice Initializes the contract with a reference to the NFT staking contract
    /// @dev Sets up the staking contract interface and assigns ownership to the deployer
    /// @param UniV4StakingForOurToken Address of the Uniswap V4 NFT staking contract to interact with
    constructor(address UniV4StakingForOurToken) {
        NFTStakingContract = IUniswapV4NFTStaking(UniV4StakingForOurToken);
    }

    /// @notice Converts a tick value to its corresponding sqrt price ratio
    /// @dev Uses bit manipulation and pre-computed constants for gas-efficient calculation
    /// @dev Implements the mathematical formula: sqrt(1.0001^tick) * 2^96
    /// @param tick The tick value to convert (-887220 to 887220)
    /// @return uint160 The sqrt price ratio encoded as a Q64.96 fixed point number
    function getSqrtRatioAtTick(int24 tick) internal pure returns (uint160) {
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        require(absTick <= uint256(int256(MAX_TICK)), "TICK_OUT_OF_RANGE");
        uint256 ratio = absTick & 0x1 != 0 
            ? 0xfffcb933bd6fad37aa2d162d1a594001 
            : 0x100000000000000000000000000000000;
        if (absTick & 0x2 != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4 != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8 != 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0) >> 128;
        if (absTick & 0x10 != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0) >> 128;
        if (absTick & 0x40 != 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861) >> 128;
        if (absTick & 0x80 != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4) >> 128;
        if (absTick & 0x200 != 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54) >> 128;
        if (absTick & 0x400 != 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3) >> 128;
        if (absTick & 0x800 != 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9) >> 128;
        if (absTick & 0x1000 != 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825) >> 128;
        if (absTick & 0x2000 != 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5) >> 128;
        if (absTick & 0x4000 != 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7) >> 128;
        if (absTick & 0x8000 != 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6) >> 128;
        if (absTick & 0x10000 != 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9) >> 128;
        if (absTick & 0x20000 != 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604) >> 128;
        if (absTick & 0x40000 != 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98) >> 128;
        if (absTick & 0x80000 != 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2) >> 128;
        if (tick > 0) ratio = type(uint256).max / ratio;
        // This divides by 1<<32 rounding up to go from a Q128.128 to a Q96.64
        uint256 sqrtPriceX96 = uint256((ratio >> 32) + (ratio % (1 << 32) == 0 ? 0 : 1));
        
        return uint160(sqrtPriceX96);
    }

    /// @notice Converts a PoolKey struct to its unique pool identifier hash
    /// @dev Uses inline assembly for gas-efficient keccak256 hashing of the entire struct
    /// @param poolKey The pool parameters to hash (currency0, currency1, fee, tickSpacing, hooks)
    /// @return poolId The unique bytes32 identifier for the pool
    function toId(PoolKey memory poolKey) internal pure returns (bytes32 poolId) {
        assembly ("memory-safe") {
            // 0xa0 represents the total size of the poolKey struct (5 slots of 32 bytes)
            poolId := keccak256(poolKey, 0xa0)
        }
    }

    /// @notice Reference to the Uniswap V4 State View contract for querying pool and position data
    /// @dev Immutable reference for gas efficiency, provides read-only access to pool state
    IStateView public immutable stateView = IStateView(0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71);

    /// @notice Represents the balance changes of a transaction for both tokens in a pool
    /// @dev Used to track positive or negative changes in token amounts during operations
    struct BalanceDelta {
        /// @notice Change in amount of token0 (positive = received, negative = spent)
        int128 amount0;
        /// @notice Change in amount of token1 (positive = received, negative = spent)
        int128 amount1;
    }

    /// @notice Calculates the fees accrued to a position across the full tick range
    /// @dev Queries position info and current fee growth to compute owed fees for testing purposes
    /// @param poolId The unique identifier of the pool containing the position
    /// @param tokenId The NFT token ID representing the position (used as salt)
    /// @return feesOwed The calculated fee amounts owed for both tokens
    function getFeesOwed(IStateView.PoolId poolId, uint256 tokenId)
        internal
        view
        returns (BalanceDelta memory feesOwed)
    {
        // getPositionInfo(poolId, owner, tL, tU, salt)
        // owner is the position manager
        // salt is the tokenId
        (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128) =
            stateView.getPositionInfo(poolId, address(positionManager), MIN_TICK, MAX_TICK, bytes32(tokenId));
        (uint256 feeGrowthInside0X128, uint256 feeGrowthInside1X128) =
            stateView.getFeeGrowthInside(IStateView.PoolId.unwrap(poolId), MIN_TICK, MAX_TICK);
        feesOwed = getFeesOwed2(
            feeGrowthInside0X128, feeGrowthInside1X128, feeGrowthInside0LastX128, feeGrowthInside1LastX128, liquidity
        );
    }

    /// @notice Fixed-point constant representing 2^128 for precise mathematical calculations
    /// @dev Used in fee calculations and other fixed-point arithmetic operations
    uint public constant Q128 = 340282366920938463463374607431768211456;

    /// @notice Computes fees owed by comparing current and last recorded fee growth
    /// @dev Helper function that calculates the difference in fee growth and applies it to liquidity
    /// @param feeGrowthInside0X128 Current accumulated fee growth for token0 within the position range
    /// @param feeGrowthInside1X128 Current accumulated fee growth for token1 within the position range
    /// @param feeGrowthInside0LastX128 Last recorded fee growth for token0 when position was updated
    /// @param feeGrowthInside1LastX128 Last recorded fee growth for token1 when position was updated
    /// @param liquidity The amount of liquidity in the position
    /// @return feesOwed The calculated fees owed for both tokens as a BalanceDelta
    function getFeesOwed2(
        uint256 feeGrowthInside0X128,
        uint256 feeGrowthInside1X128,
        uint256 feeGrowthInside0LastX128,
        uint256 feeGrowthInside1LastX128,
        uint256 liquidity
    ) internal pure returns (BalanceDelta memory feesOwed) {
        uint128 token0Owed = getFeeOwed(feeGrowthInside0X128, feeGrowthInside0LastX128, liquidity);
        uint128 token1Owed = getFeeOwed(feeGrowthInside1X128, feeGrowthInside1LastX128, liquidity);
        feesOwed = BalanceDelta(int128(int256(uint256(token0Owed))), int128(int256(uint256(token1Owed))));
    }


    /// @notice Calculates floor(a×b÷denominator) with full precision. Throws if result overflows a uint256 or denominator == 0
    /// @param a The multiplicand
    /// @param b The multiplier
    /// @param denominator The divisor
    /// @return result The 256-bit result
    /// @dev Credit to Remco Bloemen under MIT license https://xn--2-umb.com/21/muldiv
    function mulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result) {
        unchecked {
            // 512-bit multiply [prod1 prod0] = a * b
            // Compute the product mod 2**256 and mod 2**256 - 1
            // then use the Chinese Remainder Theorem to reconstruct
            // the 512 bit result. The result is stored in two 256
            // variables such that product = prod1 * 2**256 + prod0
            uint256 prod0 = a * b; // Least significant 256 bits of the product
            uint256 prod1; // Most significant 256 bits of the product
            assembly ("memory-safe") {
                let mm := mulmod(a, b, not(0))
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }

            // Make sure the result is less than 2**256.
            // Also prevents denominator == 0
            require(denominator > prod1);

            // Handle non-overflow cases, 256 by 256 division
            if (prod1 == 0) {
                assembly ("memory-safe") {
                    result := div(prod0, denominator)
                }
                return result;
            }

            ///////////////////////////////////////////////
            // 512 by 256 division.
            ///////////////////////////////////////////////

            // Make division exact by subtracting the remainder from [prod1 prod0]
            // Compute remainder using mulmod
            uint256 remainder;
            assembly ("memory-safe") {
                remainder := mulmod(a, b, denominator)
            }
            // Subtract 256 bit number from 512 bit number
            assembly ("memory-safe") {
                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }

            // Factor powers of two out of denominator
            // Compute largest power of two divisor of denominator.
            // Always >= 1.
            uint256 twos = (0 - denominator) & denominator;
            // Divide denominator by power of two
            assembly ("memory-safe") {
                denominator := div(denominator, twos)
            }

            // Divide [prod1 prod0] by the factors of two
            assembly ("memory-safe") {
                prod0 := div(prod0, twos)
            }
            // Shift in bits from prod1 into prod0. For this we need
            // to flip `twos` such that it is 2**256 / twos.
            // If twos is zero, then it becomes one
            assembly ("memory-safe") {
                twos := add(div(sub(0, twos), twos), 1)
            }
            prod0 |= prod1 * twos;

            // Invert denominator mod 2**256
            // Now that denominator is an odd number, it has an inverse
            // modulo 2**256 such that denominator * inv = 1 mod 2**256.
            // Compute the inverse by starting with a seed that is correct
            // correct for four bits. That is, denominator * inv = 1 mod 2**4
            uint256 inv = (3 * denominator) ^ 2;
            // Now use Newton-Raphson iteration to improve the precision.
            // Thanks to Hensel's lifting lemma, this also works in modular
            // arithmetic, doubling the correct bits in each step.
            inv *= 2 - denominator * inv; // inverse mod 2**8
            inv *= 2 - denominator * inv; // inverse mod 2**16
            inv *= 2 - denominator * inv; // inverse mod 2**32
            inv *= 2 - denominator * inv; // inverse mod 2**64
            inv *= 2 - denominator * inv; // inverse mod 2**128
            inv *= 2 - denominator * inv; // inverse mod 2**256

            // Because the division is now exact we can divide by multiplying
            // with the modular inverse of denominator. This will give us the
            // correct result modulo 2**256. Since the preconditions guarantee
            // that the outcome is less than 2**256, this is the final result.
            // We don't need to compute the high bits of the result and prod1
            // is no longer required.
            result = prod0 * inv;
            return result;
        }
    }
    
    /// @notice Fixed-point constant representing 2^96 for price calculations
    /// @dev Used in sqrt price computations and liquidity amount calculations
    uint256 constant Q96 = 0x1000000000000000000000000;

    /// @notice Calculates the fee amount owed for a single token based on fee growth difference
    /// @dev Multiplies the fee growth delta by liquidity and scales down by Q128
    /// @param feeGrowthInsideX128 Current accumulated fee growth within the position range
    /// @param feeGrowthInsideLastX128 Last recorded fee growth when position was updated
    /// @param liquidity The amount of liquidity in the position
    /// @return tokenOwed The amount of fees owed for this token
    function getFeeOwed(uint256 feeGrowthInsideX128, uint256 feeGrowthInsideLastX128, uint256 liquidity)
        internal
        pure
        returns (uint128 tokenOwed)
    {
        tokenOwed = uint128(mulDiv(feeGrowthInsideX128 - feeGrowthInsideLastX128, liquidity, Q128));
    }

    /// @notice Bit resolution constant for liquidity calculations
    /// @dev Used for bit shifting operations in amount calculations (2^96)
    uint8 internal constant RESOLUTION = 96;

    /// @notice Calculates the amount of token0 that corresponds to a given liquidity amount
    /// @dev Uses the formula: liquidity * (sqrtPriceB - sqrtPriceA) / (sqrtPriceA * sqrtPriceB)
    /// @param sqrtPriceAX96 The lower sqrt price boundary encoded as Q64.96
    /// @param sqrtPriceBX96 The upper sqrt price boundary encoded as Q64.96
    /// @param liquidity The amount of liquidity to convert
    /// @return uint The amount of token0 corresponding to the liquidity
    function getAmount0ForLiquidity(uint160 sqrtPriceAX96, uint160 sqrtPriceBX96, uint128 liquidity) public view returns (uint) {
        if (sqrtPriceAX96 > sqrtPriceBX96) (sqrtPriceAX96, sqrtPriceBX96) = (sqrtPriceBX96, sqrtPriceAX96);
        return mulDiv(
            uint256(liquidity) << RESOLUTION, sqrtPriceBX96 - sqrtPriceAX96, sqrtPriceBX96
        ) / sqrtPriceAX96;
    }

    /// @notice Calculates the amount of token1 that corresponds to a given liquidity amount
    /// @dev Uses the formula: liquidity * (sqrtPriceB - sqrtPriceA) / 2^96
    /// @param sqrtPriceAX96 The lower sqrt price boundary encoded as Q64.96
    /// @param sqrtPriceBX96 The upper sqrt price boundary encoded as Q64.96
    /// @param liquidity The amount of liquidity to convert
    /// @return amount1 The amount of token1 corresponding to the liquidity
    function getAmount1ForLiquidity(uint160 sqrtPriceAX96, uint160 sqrtPriceBX96, uint128 liquidity)
        public
        pure
        returns (uint256 amount1)
    {
        if (sqrtPriceAX96 > sqrtPriceBX96) (sqrtPriceAX96, sqrtPriceBX96) = (sqrtPriceBX96, sqrtPriceAX96);
        return mulDiv(liquidity, sqrtPriceBX96 - sqrtPriceAX96, Q96);
    }

    /// @notice Finds all NFT positions owned by a user that meet a minimum token amount threshold
    /// @dev Filters user positions by minimum tokenA amount and returns comprehensive position data
    /// @param user The address of the user whose positions to search
    /// @param startId The starting NFT token ID for the search range (inclusive)
    /// @param endId The ending NFT token ID for the search range (inclusive)
    /// @param Token0 The first token address in the target pool pair
    /// @param Token1 The second token address in the target pool pair
    /// @param HookAddress The hook contract address associated with the target pool
    /// @param minTokenA The minimum amount of tokenA required for a position to be included
    /// @return ownedTokens Array of NFT token IDs owned by the user that meet the criteria
    /// @return amountTokenA Array of tokenA amounts for each qualifying position
    /// @return amountTokenB Array of tokenB amounts for each qualifying position
    /// @return positionLiquidity Array of liquidity amounts for each qualifying position
    /// @return feesOwedTokenA Array of unclaimed fees in tokenA for each position
    /// @return feesOwedTokenB Array of unclaimed fees in tokenB for each position
    /// @return poolKeyz Array of pool keys associated with each qualifying position
    /// @return poolInfo Array of additional pool information for each position
    function findUserTokenIdswithMinimum(
        address user, 
        uint256 startId, 
        uint256 endId,
        address Token0,
        address Token1,
        address HookAddress,
        uint minTokenA
    ) public view returns (uint256[] memory ownedTokens , uint256[] memory amountTokenA, uint256[] memory amountTokenB, uint128[] memory positionLiquidity, int128[] memory feesOwedTokenA, int128[] memory feesOwedTokenB, PoolKey[] memory poolKeyz, uint256[] memory poolInfo) {
  

        // Get initial data
        (uint256[] memory tempOwnedTokens, 
        uint256[] memory tempAmountTokenA,
        uint256[] memory tempAmountTokenB, 
        uint128[] memory tempPositionLiquidity,
        int128[] memory tempFeesOwedTokenA,
        int128[] memory tempFeesOwedTokenB, 
        PoolKey[] memory tempPoolKeyz, 
        uint256[] memory tempPoolInfo) = findUserTokenIds(user, startId, endId, Token0, Token1, HookAddress);
        
        // First pass: count valid entries (non-zero addresses)
        uint256 validCount = 0;
        for(uint i = 0; i < tempOwnedTokens.length; i++) {
            uint tokenAamt = tempAmountTokenA[i];
            if(tokenAamt >= minTokenA ) {
                validCount++;
            }
        }
        
        // Initialize arrays with correct size
        ownedTokens = new uint256[](validCount);
        amountTokenA = new uint256[](validCount);
        amountTokenB = new uint256[](validCount);
        positionLiquidity = new uint128[](validCount);
        feesOwedTokenA = new int128[](validCount);
        feesOwedTokenB = new int128[](validCount);
        poolKeyz = new PoolKey[](validCount);
        poolInfo = new uint256[](validCount);
        
        // Second pass: populate arrays with valid entries only
        uint256 validIndex = 0;
        for(uint i = 0; i < tempOwnedTokens.length; i++) {
            uint tokenAamt = tempAmountTokenA[i];
            if(tokenAamt >= minTokenA ) {
                amountTokenA[validIndex]= tempAmountTokenA[i];
                amountTokenB[validIndex]= tempAmountTokenB[i];
                ownedTokens[validIndex]=tempOwnedTokens[i];
                positionLiquidity[validIndex] = tempPositionLiquidity[i];
                feesOwedTokenA[validIndex]= tempFeesOwedTokenA[i];
                feesOwedTokenB[validIndex]= tempFeesOwedTokenB[i];
                poolKeyz[validIndex] = tempPoolKeyz[i];
                poolInfo[validIndex] = tempPoolInfo[i];
                validIndex++;
            }
        }
        

    }











    /// @notice Finds all NFT positions owned by a user that meet a minimum token amount threshold
    /// @dev Filters user positions by minimum tokenA amount and returns comprehensive position data
    /// @param user The address of the user whose positions to search
    /// @param tokenIds tokenIds you wish to search of
    /// @param Token0 The first token address in the target pool pair
    /// @param Token1 The second token address in the target pool pair
    /// @param HookAddress The hook contract address associated with the target pool
    /// @param minTokenA The minimum amount of tokenA required for a position to be included
    /// @return ownedTokens Array of NFT token IDs owned by the user that meet the criteria
    /// @return amountTokenA Array of tokenA amounts for each qualifying position
    /// @return amountTokenB Array of tokenB amounts for each qualifying position
    /// @return positionLiquidity Array of liquidity amounts for each qualifying position
    /// @return feesOwedTokenA Array of unclaimed fees in tokenA for each position
    /// @return feesOwedTokenB Array of unclaimed fees in tokenB for each position
    /// @return poolKeyz Array of pool keys associated with each qualifying position
    /// @return poolInfo Array of additional pool information for each position
    function findUserTokenIdswithMinimumIndividual(
        address user, 
        uint256[] memory tokenIds,
        address Token0,
        address Token1,
        address HookAddress,
        uint minTokenA
    ) public view returns (uint256[] memory ownedTokens , uint256[] memory amountTokenA, uint256[] memory amountTokenB, uint128[] memory positionLiquidity, int128[] memory feesOwedTokenA, int128[] memory feesOwedTokenB, PoolKey[] memory poolKeyz, uint256[] memory poolInfo) {
  

        // Get initial data
        (uint256[] memory tempOwnedTokens, 
        uint256[] memory tempAmountTokenA,
        uint256[] memory tempAmountTokenB, 
        uint128[] memory tempPositionLiquidity,
        int128[] memory tempFeesOwedTokenA,
        int128[] memory tempFeesOwedTokenB, 
        PoolKey[] memory tempPoolKeyz, 
        uint256[] memory tempPoolInfo) = findUserTokenIdsIndividual(user, tokenIds, Token0, Token1, HookAddress);
        
        // First pass: count valid entries (non-zero addresses)
        uint256 validCount = 0;
        for(uint i = 0; i < tempOwnedTokens.length; i++) {
            uint tokenAamt = tempAmountTokenA[i];
            if(tokenAamt >= minTokenA ) {
                validCount++;
            }
        }
        
        // Initialize arrays with correct size
        ownedTokens = new uint256[](validCount);
        amountTokenA = new uint256[](validCount);
        amountTokenB = new uint256[](validCount);
        positionLiquidity = new uint128[](validCount);
        feesOwedTokenA = new int128[](validCount);
        feesOwedTokenB = new int128[](validCount);
        poolKeyz = new PoolKey[](validCount);
        poolInfo = new uint256[](validCount);
        
        // Second pass: populate arrays with valid entries only
        uint256 validIndex = 0;
        for(uint i = 0; i < tempOwnedTokens.length; i++) {
            uint tokenAamt = tempAmountTokenA[i];
            if(tokenAamt >= minTokenA ) {
                amountTokenA[validIndex]= tempAmountTokenA[i];
                amountTokenB[validIndex]= tempAmountTokenB[i];
                ownedTokens[validIndex]=tempOwnedTokens[i];
                positionLiquidity[validIndex] = tempPositionLiquidity[i];
                feesOwedTokenA[validIndex]= tempFeesOwedTokenA[i];
                feesOwedTokenB[validIndex]= tempFeesOwedTokenB[i];
                poolKeyz[validIndex] = tempPoolKeyz[i];
                poolInfo[validIndex] = tempPoolInfo[i];
                validIndex++;
            }
        }
        

    }




/// @notice Finds all NFT positions owned by a user within a specified token ID range for a specific pool
    /// @dev Scans through token IDs and returns comprehensive data for matching user positions
    /// @param user The address of the user whose positions to search for
    /// @param tokenIds tokenIDs to search of
    /// @param Token0 The first token address in the target pool pair
    /// @param Token1 The second token address in the target pool pair
    /// @param HookAddress The hook contract address associated with the target pool
    /// @return ownedTokens Array of NFT token IDs owned by the user in the specified pool
    /// @return LiquidityTokenA Array of tokenA amounts represented by the liquidity in each position
    /// @return LiquidityTokenB Array of tokenB amounts represented by the liquidity in each position
    /// @return positionLiquidity Array of raw liquidity amounts for each position
    /// @return feesOwedTokenA Array of unclaimed fees in tokenA for each position
    /// @return feesOwedTokenB Array of unclaimed fees in tokenB for each position
    /// @return poolKeyz Array of pool keys associated with each found position
    /// @return poolInfo Array of additional pool information and metadata for each position
    function findUserTokenIdsIndividual(
        address user, 
        uint256[] memory tokenIds,
        address Token0,
        address Token1,
        address HookAddress
    ) public view returns (uint256[] memory ownedTokens , uint256[] memory LiquidityTokenA, uint256[] memory LiquidityTokenB, uint128[] memory positionLiquidity, int128[] memory feesOwedTokenA, int128[] memory feesOwedTokenB, PoolKey[] memory poolKeyz, uint256[] memory poolInfo) {

        uint256[] memory tempTokens = new uint256[](tokenIds.length);
                uint256 count = 0;


                (address poolToken0, address poolToken1) = Token0 < Token1 ? (Token0, Token1) : (Token1, Token0);
                PoolKey memory poolKeyz1 = PoolKey(Currency.wrap(address(poolToken0)), Currency.wrap(address(poolToken1)), 0x800000, 60, HookAddress);

                for (uint256 i = 0; i < tokenIds.length; i++) {
                    (PoolKey memory forPKID,) = positionManager.getPoolAndPositionInfo(tokenIds[i]);
                    try positionManager.ownerOf(tokenIds[i]) returns (address ownerOfNFt) {
                        if (ownerOfNFt == user && keccak256(abi.encode(forPKID)) == keccak256(abi.encode(poolKeyz1))) {
                            tempTokens[count] = tokenIds[i];
                            count++;
                        }
                    } catch {
                        // Token doesn't exist, skip
                        continue;
                    }
                }
                
                int24 tickLower = -887220; // Your desired lower tick
                int24 tickUpper = 887220;  // Your desired upper tick

                // Convert ticks to sqrtPriceX96 values
                uint160 sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
                uint160 sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);


                PoolKey memory poolKey = PoolKey(Currency.wrap(address(poolToken0)), Currency.wrap(address(poolToken1)), 0x800000, 60, HookAddress);
                bytes32 idz = toId(poolKey);
                
                (uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);
                // Resize array to actual count
                ownedTokens = new uint256[](count);
                LiquidityTokenA = new uint256[](count);
                LiquidityTokenB = new uint256[](count);
                positionLiquidity = new uint128[](count);

                feesOwedTokenA = new int128[](count);
                feesOwedTokenB = new int128[](count);
                
                poolKeyz = new PoolKey[](count);
                poolInfo = new uint256[](count);

                for (uint256 i = 0; i < count; i++) {
                    ownedTokens[i] = tempTokens[i];
                    (poolKeyz[i],poolInfo[i]) = positionManager.getPoolAndPositionInfo(tempTokens[i]);

                    BalanceDelta memory test = getFeesOwed(IStateView.PoolId.wrap(idz), tempTokens[i]);

                    feesOwedTokenA[i] = test.amount0;
                    feesOwedTokenB[i] = test.amount1;
                    
                    positionLiquidity[i] =  positionManager.getPositionLiquidity(tempTokens[i]);

                    LiquidityTokenA[i]= getAmount0ForLiquidity(sqrtPricex96, sqrtRatioBX96,uint128(positionLiquidity[i]) );
                    LiquidityTokenB[i]= getAmount1ForLiquidity(sqrtRatioAX96, sqrtPricex96,uint128(positionLiquidity[i]) );
                


            }
    }







/// @notice Finds all NFT positions owned by a user within a specified token ID range for a specific pool
    /// @dev Scans through token IDs and returns comprehensive data for matching user positions
    /// @param user The address of the user whose positions to search for
    /// @param startId The starting NFT token ID for the search range (inclusive)
    /// @param endId The ending NFT token ID for the search range (inclusive)
    /// @param Token0 The first token address in the target pool pair
    /// @param Token1 The second token address in the target pool pair
    /// @param HookAddress The hook contract address associated with the target pool
    /// @return ownedTokens Array of NFT token IDs owned by the user in the specified pool
    /// @return LiquidityTokenA Array of tokenA amounts represented by the liquidity in each position
    /// @return LiquidityTokenB Array of tokenB amounts represented by the liquidity in each position
    /// @return positionLiquidity Array of raw liquidity amounts for each position
    /// @return feesOwedTokenA Array of unclaimed fees in tokenA for each position
    /// @return feesOwedTokenB Array of unclaimed fees in tokenB for each position
    /// @return poolKeyz Array of pool keys associated with each found position
    /// @return poolInfo Array of additional pool information and metadata for each position
    function findUserTokenIds(
        address user, 
        uint256 startId, 
        uint256 endId,
        address Token0,
        address Token1,
        address HookAddress
    ) public view returns (uint256[] memory ownedTokens , uint256[] memory LiquidityTokenA, uint256[] memory LiquidityTokenB, uint128[] memory positionLiquidity, int128[] memory feesOwedTokenA, int128[] memory feesOwedTokenB, PoolKey[] memory poolKeyz, uint256[] memory poolInfo) {

        uint256[] memory tempTokens = new uint256[](endId - startId + 1);
        uint256 count = 0;


        (address poolToken0, address poolToken1) = Token0 < Token1 ? (Token0, Token1) : (Token1, Token0);
        PoolKey memory poolKeyz1 = PoolKey(Currency.wrap(address(poolToken0)), Currency.wrap(address(poolToken1)), 0x800000, 60, HookAddress);

        for (uint256 i = startId; i <= endId; i++) {
            (PoolKey memory forPKID,) = positionManager.getPoolAndPositionInfo(i);
            try positionManager.ownerOf(i) returns (address ownerOfNFt) {
                if (ownerOfNFt == user && keccak256(abi.encode(forPKID)) == keccak256(abi.encode(poolKeyz1))) {
                    tempTokens[count] = i;
                    count++;
                }
            } catch {
                // Token doesn't exist, skip
                continue;
            }
        }
        
        int24 tickLower = -887220; // Your desired lower tick
        int24 tickUpper = 887220;  // Your desired upper tick

        // Convert ticks to sqrtPriceX96 values
        uint160 sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
        uint160 sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);


        PoolKey memory poolKey = PoolKey(Currency.wrap(address(poolToken0)), Currency.wrap(address(poolToken1)), 0x800000, 60, HookAddress);
        bytes32 idz = toId(poolKey);
        
        (uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);
        // Resize array to actual count
        ownedTokens = new uint256[](count);
        LiquidityTokenA = new uint256[](count);
        LiquidityTokenB = new uint256[](count);
        positionLiquidity = new uint128[](count);

        feesOwedTokenA = new int128[](count);
        feesOwedTokenB = new int128[](count);
        
        poolKeyz = new PoolKey[](count);
        poolInfo = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            ownedTokens[i] = tempTokens[i];
            (poolKeyz[i],poolInfo[i]) = positionManager.getPoolAndPositionInfo(tempTokens[i]);

            BalanceDelta memory test = getFeesOwed(IStateView.PoolId.wrap(idz), tempTokens[i]);

            feesOwedTokenA[i] = test.amount0;
            feesOwedTokenB[i] = test.amount1;
            
            positionLiquidity[i] =  positionManager.getPositionLiquidity(tempTokens[i]);

            LiquidityTokenA[i]= getAmount0ForLiquidity(sqrtPricex96, sqrtRatioBX96,uint128(positionLiquidity[i]) );
            LiquidityTokenB[i]= getAmount1ForLiquidity(sqrtRatioAX96, sqrtPricex96,uint128(positionLiquidity[i]) );
        }
        
    }


    /// @notice Finds all staked NFT positions within a token ID range that meet minimum token requirements
    /// @dev Searches the staking contract for positions matching the specified pool and token thresholdf
    /// @param startId The starting NFT token ID for the search range (inclusive)
    /// @param endId The ending NFT token ID for the search range (inclusive)
    /// @param Token0 The first token address in the target pool pair
    /// @param Token1 The second token address in the target pool pair
    /// @param HookAddress The hook contract address associated with the target pool
    /// @param minTokenA The minimum amount of tokenA required for a position to be included
    /// @return ownedTokens Array of NFT token IDs that are staked and meet the criteria
    /// @return amountTokenA Array of tokenA amounts for each qualifying staked position
    /// @return amountTokenB Array of tokenB amounts for each qualifying staked position
    /// @return positionLiquidity Array of liquidity amounts for each qualifying staked position
    /// @return feesOwedTokenA Array of unclaimed fees in tokenA for each staked position
    /// @return feesOwedTokenB Array of unclaimed fees in tokenB for each staked position
    /// @return poolKeyz Array of pool keys associated with each qualifying staked position
    /// @return poolInfo Array of additional pool information for each staked position
    /// @return OwnerOfStakingNFT Array of original owner addresses for each staked NFT
    function findAllUsersTokenIDSinStaking( 
        uint256 startId, 
        uint256 endId,
        address Token0,
        address Token1,
        address HookAddress,
        uint minTokenA
    )
    external view returns (
        uint256[] memory ownedTokens, 
        uint256[] memory amountTokenA, 
        uint256[] memory amountTokenB, 
        uint128[] memory positionLiquidity, 
        int128[] memory feesOwedTokenA, 
        int128[] memory feesOwedTokenB, 
        PoolKey[] memory poolKeyz, 
        uint256[] memory poolInfo, 
        address[] memory OwnerOfStakingNFT
    ) {

	       (address token0, address token1) = Token0 < Token1
		    ? (Token0, Token1)
		    : (Token1, Token0);
		
	       // Get initial data
	       (uint256[] memory tempOwnedTokens, 
	       uint256[] memory tempAmountTokenA,
	       uint256[] memory tempAmountTokenB, 
	       uint128[] memory tempPositionLiquidity,
	       int128[] memory tempFeesOwedTokenA,
	       int128[] memory tempFeesOwedTokenB, 
	       PoolKey[] memory tempPoolKeyz, 
	       uint256[] memory tempPoolInfo) = findUserTokenIds(address(NFTStakingContract), startId, endId, token0, token1, HookAddress);
	    
	       // First pass: count valid entries (non-zero addresses)
	       uint256 validCount = 0;
	       for(uint i = 0; i < tempOwnedTokens.length; i++) {
		    uint tokenAamt = tempAmountTokenA[i];
		    if(tokenAamt >= minTokenA ) {
		        validCount++;
		    }
	       }
	    
	    // Initialize arrays with correct size
	    ownedTokens = new uint256[](validCount);
	    amountTokenA = new uint256[](validCount);
	    amountTokenB = new uint256[](validCount);
	    positionLiquidity = new uint128[](validCount);
	    feesOwedTokenA = new int128[](validCount);
	    feesOwedTokenB = new int128[](validCount);
	    poolKeyz = new PoolKey[](validCount);
	    poolInfo = new uint256[](validCount);
	    OwnerOfStakingNFT = new address[](validCount);
	    
	    // Second pass: populate arrays with valid entries only
	    uint256 validIndex = 0;
	    for(uint i = 0; i < tempOwnedTokens.length; i++) {
		uint tokenAamt = tempAmountTokenA[i];
		if(tokenAamt >= minTokenA ) {
		    ownedTokens[validIndex] = tempOwnedTokens[i];
		    
		    (amountTokenA[validIndex], amountTokenB[validIndex]) = Token0 < Token1
		       ? (tempAmountTokenA[i], tempAmountTokenB[i])
		       : (tempAmountTokenB[i], tempAmountTokenA[i]);
		


		    positionLiquidity[validIndex] = tempPositionLiquidity[i];
		    /*
		    feesOwedTokenA[validIndex] = tempFeesOwedTokenA[i];
		    feesOwedTokenB[validIndex] = tempFeesOwedTokenB[i];
		    */

		    (feesOwedTokenA[validIndex], feesOwedTokenB[validIndex] ) = Token0 < Token1
		        ? (tempFeesOwedTokenA[i], tempFeesOwedTokenB[i])
		        : (tempFeesOwedTokenB[i], tempFeesOwedTokenA[i]);
		
		    poolKeyz[validIndex] = tempPoolKeyz[i];
		    poolInfo[validIndex] = tempPoolInfo[i];
		    OwnerOfStakingNFT[validIndex] = address(NFTStakingContract);
		    validIndex++;
		}
		
	    }
	    
    }


    /// @notice Returns the total number of staked positions for a specific user
    /// @dev Simple wrapper around the staking contract's userPositionCount function
    /// @param user The address of the user to query
    /// @return uint The total count of positions staked by the user
    function getMaxStakedIDforUser(address user) public view returns (uint) {
        return NFTStakingContract.userPositionCount(user);
    }

    /// @notice Retrieves staked positions for a user that meet minimum token amount requirements
    /// @dev Filters user's staked positions by minimum token0 amount and returns comprehensive staking data
    /// @param user The address of the user whose staked positions to query
    /// @param Token0 The first token address in the target pool pair
    /// @param Token1 The second token address in the target pool pair
    /// @param minAmount0 The minimum amount of token0 required for a position to be included
    /// @param startIndex The starting index in the user's staked positions list (0-based)
    /// @param count The maximum number of positions to retrieve from the starting index
    /// @param HookAddress The hook contract address associated with the target pool
    /// @return ids Array of staked NFT token IDs that meet the minimum requirements
    /// @return LiquidityTokenA Array of token0 amounts represented by the liquidity in each position
    /// @return LiquidityTokenB Array of token1 amounts represented by the liquidity in each position
    /// @return positionLiquidity Array of raw liquidity amounts for each qualifying position
    /// @return timeStakedAt Array of timestamps when each position was staked
    /// @return multiplierPenalty Array of penalty multipliers applied for early withdrawal
    /// @return currency0 Array of token0 addresses for each position (for verification)
    /// @return currency1 Array of token1 addresses for each position (for verification)
    /// @return poolInfo Array of additional pool information and metadata for each position
    /// @return startCountAt int of where to start the count at next search to save time

    function getIDSofStakedTokensForUserwithMinimum(
        address user,
        address Token0,
        address Token1,
        uint256 minAmount0,
        uint256 startIndex,
        uint256 count,
        address HookAddress
    ) public view returns (
        uint256[] memory ids, 
        uint256[] memory LiquidityTokenA, 
        uint256[] memory LiquidityTokenB, 
        uint128[] memory positionLiquidity, 
        uint256[] memory timeStakedAt, 
        uint256[] memory multiplierPenalty,
        address[] memory currency0,
        address[] memory currency1,
        uint256[] memory poolInfo,
        int128 startCountAt
    ) {



       (address token0, address token1) = Token0 < Token1
            ? (Token0, Token1)
            : (Token1, Token0);

       // Get initial data from staking contract
       (uint256[] memory allIds, uint256[] memory allTimeStakedAt, uint256[] memory allMultiplierPenalty, address[] memory allCurrency0, address[] memory allCurrency1, uint256[] memory allpoolInfo, uint256[] memory positionCountSpot) = 
       this.getStakedTokenIdsAllInfoRange(user, startIndex, count);
       int24 tickLower = -887220; // Your desired lower tick
       int24 tickUpper = 887220;  // Your desired upper tick

       // Convert ticks to sqrtPriceX96 values
       uint160 sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
       uint160 sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);

        PoolKey memory poolKey = PoolKey(Currency.wrap(address(token0)), Currency.wrap(address(token1)), 0x800000, 60, HookAddress);
        bytes32 idz = toId(poolKey);
    
       (uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);

       // Temporary arrays to store filtered results
       uint256[] memory tempIds = new uint256[](allIds.length);
       uint256[] memory tempLiquidityTokenA = new uint256[](allIds.length);
       uint256[] memory tempLiquidityTokenB = new uint256[](allIds.length);
       uint128[] memory tempPositionLiquidity = new uint128[](allIds.length);
       uint256[] memory tempTimeStakedAt = new uint256[](allIds.length);
       uint256[] memory tempMultiplierPenalty = new uint256[](allIds.length);
       uint256[] memory tempAllpoolInfo = new uint256[](allIds.length);
       address[] memory tempAllCurrency0 = new address[](allIds.length);
       address[] memory tempAllCurrency1 = new address[](allIds.length);
    
       uint256 validCount = 0;
        startCountAt = -1;
       // Filter positions based on minAmount0
       for(uint256 i = 0; i < allIds.length; i++) {
           uint128 liquidity = positionManager.getPositionLiquidity(allIds[i]);
           uint256 amount0 = getAmount0ForLiquidity(sqrtPricex96, sqrtRatioBX96, liquidity);
        
           // Only include positions that meet the minimum amount0 requirement
           if(amount0 >= minAmount0) {
                if(startCountAt == -1){
                    startCountAt = int128(int(positionCountSpot[i]));
                }
                tempIds[validCount] = allIds[i];
            
                tempLiquidityTokenA[validCount] = amount0;
                tempLiquidityTokenB[validCount] = getAmount1ForLiquidity(sqrtRatioAX96, sqrtPricex96, liquidity);
                tempPositionLiquidity[validCount] = liquidity;
                tempTimeStakedAt[validCount] = allTimeStakedAt[i];
                tempMultiplierPenalty[validCount] = allMultiplierPenalty[i];
                tempAllpoolInfo[validCount] = allpoolInfo[i];
                tempAllCurrency0[validCount]=allCurrency0[i];
                tempAllCurrency1[validCount]=allCurrency1[i];
                validCount++;
           }
       }

       // Create final arrays with correct size
       ids = new uint256[](validCount);
       LiquidityTokenA = new uint256[](validCount);
       LiquidityTokenB = new uint256[](validCount);
       positionLiquidity = new uint128[](validCount);
       timeStakedAt = new uint256[](validCount);
       multiplierPenalty = new uint256[](validCount);
       poolInfo = new uint256[](validCount);
       currency0 = new address[](validCount);
       currency1 = new address[](validCount);

       // Copy valid entries to final arrays
       for(uint256 i = 0; i < validCount; i++) {
           ids[i] = tempIds[i];
           LiquidityTokenA[i] = tempLiquidityTokenA[i];
           LiquidityTokenB[i] = tempLiquidityTokenB[i];
           positionLiquidity[i] = tempPositionLiquidity[i];
           timeStakedAt[i] = tempTimeStakedAt[i];
           multiplierPenalty[i] = tempMultiplierPenalty[i];
           poolInfo[i] = tempAllpoolInfo[i];
           currency0[i]= tempAllCurrency0[i];
           currency1[i]= tempAllCurrency1[i];
       }


   }





   /// @notice Structure to store details of a staked liquidity position
   /// @dev Contains NFT ID, liquidity amount, staking status and timing
   struct StakedPosition {
      uint256 tokenId;       // The NFT token ID
      uint128 liquidity;     // The liquidity amount
      bool isStaked;         // Whether the position is currently staked
      uint timeStakedAt;
      address ownerOfPosition;
   }



   /// @notice Gets comprehensive information about staked positions within a specified range
   /// @param user The address of the user to query positions for
   /// @param startIndex The starting index in the user's position array
   /// @param count The maximum number of positions to return
   /// @return tokenIds Array of staked NFT token IDs
   /// @return tokenTimeStakedAt Array of timestamps when positions were staked
   /// @return MultiplierPenalty Array of current withdrawal penalty multipliers
   /// @return Currency0 Array of token0 addresses for each position
   /// @return Currency1 Array of token1 addresses for each position
   /// @return poolInfozf Array of pool information for each position
   /// @return ArraySpot Array of Spots of each StakedID to help ease future searches.
   /// @dev Returns detailed information for batch processing and UI display
   function getStakedTokenIdsAllInfoRange(address user, uint256 startIndex, uint256 count) 
      external view returns (
         uint256[] memory tokenIds, 
         uint256[] memory tokenTimeStakedAt, 
         uint256[] memory MultiplierPenalty,
         address[] memory Currency0, 
         address[] memory Currency1, 
         uint256[] memory poolInfozf,
         uint256[] memory ArraySpot
      ) {
   
      require(count > 0, "Count must be greater than 0");

      if (startIndex + count > NFTStakingContract.userPositionCount(user)){
         count = NFTStakingContract.userPositionCount(user) - startIndex;
      }
      // Initialize arrays with the requested count size
      uint256[] memory stakedTokenIds = new uint256[](count);
      uint256[] memory positionAge = new uint256[](count);
      uint256[] memory withdrawPenalty = new uint256[](count);
      uint256[] memory poolInfo = new uint256[](count);
      address[] memory zCurrency0 = new address[](count);
      address[] memory zCurrency1 = new address[](count);
      uint[] memory arraySpot = new uint[](count);
   
      uint256 arrayIndex = 0;
      uint256 endIndex = startIndex + count;
   
      // Only iterate through the specified range
      for (uint256 i = startIndex + 1; i <= endIndex && i <= NFTStakingContract.userPositionCount(user); i++) {
         // This is the correct way:
        (uint256 tokenId, , bool isStaked, uint timeStakedAt,) = 
            NFTStakingContract.userPositions(user, i);

         if (isStaked) {
            stakedTokenIds[arrayIndex] = tokenId;
            positionAge[arrayIndex] = timeStakedAt;
            withdrawPenalty[arrayIndex] = NFTStakingContract.calc_howMuchToRemove(timeStakedAt);
            PoolKey memory temp;
            (temp,poolInfo[arrayIndex]) = positionManager.getPoolAndPositionInfo(tokenId);
            zCurrency0[arrayIndex]=Currency.unwrap(temp.currency0);
            zCurrency1[arrayIndex]=Currency.unwrap(temp.currency1);
            arraySpot[arrayIndex]=i;
            arrayIndex++;
         }
      }
   
      // Resize arrays to actual found count if needed
      if (arrayIndex < count) {
         uint256[] memory actualTokenIds = new uint256[](arrayIndex);
         uint256[] memory actualPositionAge = new uint256[](arrayIndex);
         uint256[] memory actualWithdrawPenalty = new uint256[](arrayIndex);
         uint256[] memory actualpoolInfozf = new uint256[](arrayIndex);
         address[] memory actualCurrency0 = new address[](arrayIndex);
         address[] memory actualCurrency1 = new address[](arrayIndex);
         uint[] memory actualSpot = new uint[](arrayIndex);
      
         for (uint256 j = 0; j < arrayIndex; j++) {
            actualTokenIds[j] = stakedTokenIds[j];
            actualPositionAge[j] = positionAge[j];
            actualWithdrawPenalty[j] = withdrawPenalty[j];
            actualpoolInfozf[j]=poolInfo[j];
            actualCurrency0[j]=zCurrency0[j];
            actualCurrency1[j]=zCurrency1[j];
            actualSpot[j]=arraySpot[j];
         }
      
         return (actualTokenIds, actualPositionAge, actualWithdrawPenalty, actualCurrency0, actualCurrency1, actualpoolInfozf, actualSpot);
      }
   
      return (stakedTokenIds, positionAge, withdrawPenalty, zCurrency0, zCurrency1, poolInfo, arraySpot);
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
