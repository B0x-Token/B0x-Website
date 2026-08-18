//before mainnet maybe assign owner to trusted address instead of exposed key. even though should never be used.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


interface IPoolManager {

    /// @notice Initialize a new pool
    /// @param key The pool key defining the pool parameters
    /// @param sqrtPriceX96 The initial sqrt price of the pool as a Q64.96
    function initialize(PoolKey calldata key, uint160 sqrtPriceX96) external;
    
    /// @notice Get the pool ID for a given set of parameters
    /// @param key The PoolKey to get the ID for
    function getPoolId(PoolKey calldata key) external view returns (bytes32);

    /// @notice Struct containing data about liquidity modification
    struct ModifyLiquidityParams {
        // The lower tick of the position
        int24 tickLower;
        // The upper tick of the position
        int24 tickUpper;
        // The amount of liquidity to add or remove
        int256 liquidityDelta;

        bytes32 salt;
    }

    /// @notice Represents the balance changes of a transaction
    struct BalanceDelta {
        int128 amount0;
        int128 amount1;
    }

    /// @notice Struct containing pool key parameters
    struct PoolKey {
        // The first token of the pool, sorted by address
        Currency currency0;
        // The second token of the pool, sorted by address
        Currency currency1;
        // The fee tier of the pool
        uint24 fee;
        // The tickSpacing of the pool
        int24 tickSpacing;
        // The hooks of the pool
        address hooks;
    }

    /// @notice Modify the liquidity of a position in a pool
    /// @param key The pool key for the pool being modified
    /// @param params The parameters for modifying the position
    /// @param hookData Additional data to pass to the pool's hooks
    /// @return callerDelta The change in tokens owed to the caller
    /// @return feesAccrued The fees accrued as a result of the modification
    function modifyLiquidity(
        PoolKey memory key,
        ModifyLiquidityParams memory params,
        bytes calldata hookData
    ) external returns (BalanceDelta memory callerDelta, BalanceDelta memory feesAccrued);

    /// @notice Lock a pool for operations
    /// @param data Any data to pass along to the pool's hooks
    /// @return lockData Data to be passed to the pool's unlock function
    function lock(bytes calldata data) external returns (bytes memory lockData);

    /// @notice Unlock a pool after operations
    /// @param key The pool key for the pool being unlocked
    /// @param lockData Data returned from the lock function
    function unlock(PoolKey memory key, bytes memory lockData) external;
}
interface IUniswapV4Quoter {
    /**
     * @notice Struct containing parameters for quoting an exact input single swap
     * @param poolKey The pool key for the swap
     * @param zeroForOne Whether the swap is from token0 to token1 (true) or token1 to token0 (false)
     * @param amountIn The amount of input token to be swapped
     * @param sqrtPriceLimitX96 The price limit for the swap (0 for no limit)
     * @param hookData Additional data to be passed to the hook
     */


    struct QuoteExactSingleParams {
        PoolKey poolKey;
        bool zeroForOne;
        uint128 exactAmount;
        bytes hookData;
    }

    /**
     * @notice Quote an exact input single swap
     * @param params The parameters for the quote
     * @return amountOut The amount of output tokens that would be received
     * @return gasEstimate The estimated gas cost of the swap
     */
    function quoteExactInputSingle(QuoteExactSingleParams memory params)
        external
        returns (uint256 amountOut, uint256 gasEstimate);
}
// ============ Minimal Required Interfaces ============

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// Define the Currency type as a wrapped address
type Currency is address;

// Provide global operator overloads for the Currency type
using {equals as ==} for Currency global;

// Define the equals operator
function equals(Currency currency, Currency other) pure returns (bool) {
    return Currency.unwrap(currency) == Currency.unwrap(other);
}

// Library with helper functions for Currency
library CurrencyLibrary {
    // A constant to represent native ETH (address zero)
    Currency public constant ADDRESS_ZERO = Currency.wrap(address(0));
    
    // Check if a Currency is the native currency (ETH)
    function isAddressZero(Currency currency) internal pure returns (bool) {
        return Currency.unwrap(currency) == address(0);
    }
}


/// @dev Two `int128` values packed into a single `int256` where the upper 128 bits represent the amount0
/// and the lower 128 bits represent the amount1.
type BalanceDelta is int256;

// Minimal interface for Hooks
interface  IHooks{
    function beforeInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96, bytes calldata hookData) external returns (bytes4);
    function afterInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96, int24 tick, bytes calldata hookData) external returns (bytes4);
}

// Minimal representation of Uniswap V4 PoolKey
struct PoolKey {
    Currency currency0;
    Currency currency1;
    uint24 fee;
    int24 tickSpacing;
    IHooks hooks;
}


interface IUniswapV3NFTStaking {
    function getMaxWithdrawalPercentage(uint tokenID) external view returns (uint128 maxPercentage);

    function increaseLiquidityOfPosition(address forWho, uint amountIn, uint tokenID) external payable returns (bool);

    function decreaseLiquidityOfPosition(
        uint tokenID, 
        uint128 percentageToRemoveOutOf10000000000000
    ) external returns (bool);


        function exit() external;

        function getReward() external;

    /**
     * @dev Stakes a Uniswap V3 position NFT from the caller's address.
     * @param tokenId The ID of the NFT position token to stake.
     */
    function stakeUniswapV3NFT(uint256 tokenId) external;
    /**
     * @dev Stakes a Uniswap V3 position NFT from the caller's address.
     * @param tokenId The ID of the NFT position token to stake.
     */
    function withdraw(uint256 tokenId) external returns (bool);

    /**
     * @dev Stakes a Uniswap V3 position NFT on behalf of a specified address.
     * @param owner The address that owns the NFT and will receive staking benefits.
     * @param tokenId The ID of the NFT position token to stake.
     */
    function stakeFORUniswapV3NFT(address owner, uint256 tokenId) external;

    function createPositionWithETHANDDEPOSIT(
        address token,
        uint256 amountIn,
        address hookAddress,
        address toSendNFTto
    ) external payable returns (uint256 YourUniswapNFTID);
    
}


interface IPositionManager {




    function getPositionLiquidity(uint256 tokenId) external view returns (uint128 liquidity);


    
      /**
     * @dev Gives permission to `to` to transfer `tokenId` token to another account.
     * The approval is cleared when the token is transferred.
     *
     * Only a single account can be approved at a time, so approving the zero address clears previous approvals.
     *
     * Requirements:
     * - The caller must own the token or be an approved operator.
     * - `tokenId` must exist.
     *
     * Emits an {Approval} event.
     */
    function approve(address to, uint256 tokenId) external;

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC721 protocol to prevent tokens from being forever locked.
     *
     * Requirements:
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If the caller is not `from`, it must be have been approved to move this token by either {approve} or {setApprovalForAll}.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) external;

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`.
     * 
     * Requirements:
     * - Same as {safeTransferFrom}.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     *
     * Additionally passes `data` to the destination contract. 
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;

    function nextTokenId() external view returns (uint256);

        function getPoolAndPositionInfo(uint256 tokenId) external view returns (PoolKey memory poolKey, uint info);
    /**
     * @notice Modifies liquidities based on encoded actions in unlockData
     * @param unlockData Encoded data containing the actions to be executed
     * @param deadline Timestamp after which the transaction will revert
     * @dev Function is payable and includes isNotLocked and checkDeadline modifiers
     */
    function modifyLiquidities(
        bytes calldata unlockData,
        uint256 deadline
    ) external payable;
}


// Uniswap V4 Router interface (only what we need)
interface IV4Router {

    /**
     * @notice Executes commands with associated inputs validated against a deadline
     * @param commands A set of concatenated commands, each 1 byte in length
     * @param inputs The inputs associated with the commands
     * @param deadline The deadline by which the transaction must be executed
     * @dev Reverts if the current timestamp exceeds the deadline
     */
    function execute(
        bytes calldata commands,
        bytes[] calldata inputs,
        uint256 deadline
    ) external payable;


    struct ExactInputSingleParams {
        PoolKey poolKey;
        bool zeroForOne;
        uint128 amountIn;
        uint128 amountOutMinimum;
        bytes hookData;
    }
}



// WETH interface for wrapping/unwrapping ETH
interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

/* Actions based on the enum you provided
    INCREASE_LIQUIDITY = 0x00;
    DECREASE_LIQUIDITY = 0x01,
    MINT_POSITION = 0x02,
    BURN_POSITION = 0x03,
    INCREASE_LIQUIDITY_FROM_DELTAS = 0x04,
    MINT_POSITION_FROM_DELTAS = 0x05,
    SWAP_EXACT_IN_SINGLE = 0x06,
    SWAP_EXACT_IN = 0x07,
    SWAP_EXACT_OUT_SINGLE = 0x08,
    SWAP_EXACT_OUT = 0x09,
    // DONATE = 0x0a,
    SETTLE = 0x0b,
    SETTLE_ALL = 0x0c,
    // SETTLE_PAIR = 0x0d,
    TAKE = 0x0e,
    TAKE_ALL = 0x0f,
    TAKE_PORTION = 0x10,
    // TAKE_PAIR = 0x11,
    CLOSE_CURRENCY = 0x12,
    // CLEAR_OR_TAKE = 0x13,
    SWEEP = 0x14,
    WRAP = 0x15,
    UNWRAP = 0x16
    // MINT_6909 = 0x17,
    // BURN_6909 = 0x18
}
/**
 * @title Uniswap V4 Swap Contract with ETH Support
 * @notice Implementation for swapping with Uniswap V4 pools with native ETH support
 */
 /**
 * @title IPermit2
 * @dev Interface for the Permit2 contract which handles token approvals with signatures
 */
interface IPermit2 {
    /**
     * @notice Approves the spender to use up to amount of the owner's token until the expiration timestamp
     * @param token The token address to approve
     * @param spender The address to approve for spending
     * @param amount The amount of tokens approved as a uint160
     * @param expiration The timestamp at which the approval expires (uint48)
     */
    function approve(
        address token,
        address spender,
        uint160 amount,
        uint48 expiration
    ) external;
}
//Recieve NFTs
interface IERC721Receiver {
    /**
     * @dev Whenever an {IERC721} `tokenId` token is transferred to this contract via {IERC721-safeTransferFrom}
     * by `operator` from `from`, this function is called.
     *
     * It must return its Solidity selector to confirm the token transfer.
     * If any other value is returned or the interface is not implemented by the recipient, the transfer will be reverted.
     *
     * The selector can be obtained in Solidity with `IERC721Receiver.onERC721Received.selector`.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}/// @notice Interface for viewing state information from Uniswap V4 pools
interface IStateView {
   /// @notice Custom type representing a unique pool identifier
   type PoolId is bytes32;
   
   /// @notice Gets position information for a specific liquidity position
   /// @param poolId The unique identifier of the pool
   /// @param owner The address that owns the position
   /// @param tickLower The lower tick boundary of the position
   /// @param tickUpper The upper tick boundary of the position
   /// @param salt Additional data for position identification
   /// @return liquidity The amount of liquidity in the position
   /// @return feeGrowthInside0LastX128 Last recorded fee growth for token0 inside the position range
   /// @return feeGrowthInside1LastX128 Last recorded fee growth for token1 inside the position range
   function getPositionInfo(PoolId poolId, address owner, int24 tickLower, int24 tickUpper, bytes32 salt) external view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128);
   
   /// @notice Gets the fee growth inside a specific tick range
   /// @param poolId The unique identifier of the pool
   /// @param tickLower The lower tick boundary of the range
   /// @param tickUpper The upper tick boundary of the range
   /// @return feeGrowthInside0X128 Fee growth for token0 inside the tick range
   /// @return feeGrowthInside1X128 Fee growth for token1 inside the tick range
   function getFeeGrowthInside(
       bytes32 poolId,
       int24 tickLower,
       int24 tickUpper
   ) external view returns (uint256 feeGrowthInside0X128, uint256 feeGrowthInside1X128);
   
   /// @notice Gets position information using a position ID
   /// @param poolId The unique identifier of the pool
   /// @param positionId The unique identifier of the position
   /// @return liquidity The amount of liquidity in the position
   /// @return feeGrowthInside0LastX128 Last recorded fee growth for token0 inside the position range
   /// @return feeGrowthInside1LastX128 Last recorded fee growth for token1 inside the position range
   function getPositionInfo(
       PoolId poolId,
       bytes32 positionId
   ) external view returns (
       uint128 liquidity,
       uint256 feeGrowthInside0LastX128,
       uint256 feeGrowthInside1LastX128
   );




   /**
     * @notice Retrieves the Slot0 data for a specific pool
     * @param poolId The unique identifier of the pool
     * @return sqrtPriceX96 The current price of the pool as a sqrt(token1/token0) Q64.96 value
     * @return tick The current tick of the pool
     * @return protocolFee The current protocol fee setting of the pool
     * @return lpFee The current LP fee setting of the pool
   */
   function getSlot0(bytes32 poolId)
       external
       view
       returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee);
}




/// @notice Contract for executing swaps on Uniswap V4 mainnet for B0x Token
contract UniswapV4Swap_mainnet {
   /// @notice Handles the receipt of an NFT
   /// @param operator The address which called `safeTransferFrom` function
   /// @param from The address which previously owned the token
   /// @param tokenId The NFT identifier which is being transferred
   /// @param data Additional data with no specified format
   /// @return bytes4 Returns the selector to confirm token transfer
   function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external pure returns (bytes4) {
       return IERC721Receiver.onERC721Received.selector;
   }
   
   /// @notice Minimum tick value for Uniswap V4 pools
   int24 private constant MIN_TICK = -887220;
   /// @notice Maximum tick value for Uniswap V4 pools
   int24 private constant MAX_TICK = 887220;
   
   /// @notice Event emitted when a new liquidity position is created
   /// @param tokenId The unique identifier of the created position NFT
   event PositionCreated(uint256 indexed tokenId);
   
   /// @notice Address of token B for trading pairs
   address tokenB;
   
   /// @notice Interface for viewing pool state information
   IStateView public immutable stateView = IStateView(0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71);
   /// @notice The Uniswap V4 pool manager contract
   IPoolManager public immutable poolManager = IPoolManager(0x498581fF718922c3f8e6A244956aF099B2652b2b);
   /// @notice Address of the Permit2 contract for token approvals
   address public permit2 = address(0x000000000022D473030F116dDEE9F6B43aC78BA3);
   /// @notice Interface for managing liquidity positions
   IPositionManager public immutable positionManager = IPositionManager(0x7C5f5A4bBd8fD63184577525326123B519429bDc);
   
   /// @notice Event emitted when a swap is executed
   /// @param tokenIn The address of the input token
   /// @param tokenOut The address of the output token
   /// @param amountIn The amount of input tokens
   /// @param amountOut The amount of output tokens received
   /// @param sender The address that initiated the swap
   event SwapExecuted(
       address indexed tokenIn,
       address indexed tokenOut,
       uint256 amountIn,
       uint256 amountOut,
       address indexed sender
   );
   
   /// @notice Address of the contract owner
   address owner;
   
   /// @notice Modifier to restrict access to owner only
   modifier onlyOwner() {
       require(msg.sender == owner,"Only Owner");
       _;
   }
   
   /// @notice Constructor to initialize the contract
   /// @param tokenAddress The address of token B for trading pairs
   constructor(address tokenAddress){
       /// @notice Set the deployer as the contract owner
       owner =  address(0x1B4C655c23D10d435B8d03a6bD84d6392deC0054);
       /// @notice Set the token B address for trading pairs
       tokenB = tokenAddress;
   }



   /// @notice Withdraws an NFT position from the contract to the owner
  /// @param tokenID The unique identifier of the NFT position to withdraw
  /// @return bool Returns true if withdrawal is successful
  function withdrawNFT (uint tokenID) public onlyOwner returns (bool){
      positionManager.approve(address(this), tokenID);
      positionManager.safeTransferFrom(address(this), owner, tokenID);
      return true;
  }

  /// @notice Withdraws all tokens of a specific type from the contract to the owner
  /// @param token The address of the token contract to withdraw
  /// @return bool Returns true if withdrawal is successful
  function withdrawTokens (address token) public onlyOwner returns (bool){
      /// @notice Current balance of the specified token in this contract
      uint balancezzz = IERC20(token).balanceOf(address(this));
      IERC20(token).transfer(owner, balancezzz);
      return true;
  }

  /// @notice Withdraws all ETH from the contract to the owner
  /// @return bool Returns true if withdrawal is successful
  function withdrawETH() public onlyOwner returns (bool) {
      /// @notice Current ETH balance of this contract
      uint256 balance = address(this).balance;
      /// @notice Success status of the ETH transfer
      (bool success,) = payable(owner).call{value: balance}("");
      require(success, "Transfer failed");
      return true;
  }

    

    uint8 constant TICK_LOWER_OFFSET = 8;
    uint8 constant TICK_UPPER_OFFSET = 32;
    function TOtickLower(uint info) internal pure returns (int24 _tickLower) {
        assembly ("memory-safe") {
            _tickLower := signextend(2, shr(TICK_LOWER_OFFSET, info))
        }
    }

    function TOtickUpper(uint info) internal pure returns (int24 _tickUpper) {
        assembly ("memory-safe") {
            _tickUpper := signextend(2, shr(TICK_UPPER_OFFSET, info))
        }
    }

    function decodePositionTicks(uint256 tokenId) external view returns (int24 tickLower, int24 tickUpper) {
        // Get encoded position info
        (, uint info) = positionManager.getPoolAndPositionInfo(tokenId);
        
        // Extract ticks from the encoded info
        // The ticks are packed in the info uint256
        // Typically, tickLower is in bits 64-87 and tickUpper in bits 88-111
        // This can vary based on exact implementation, but this is common
        
        // Extract tickLower (mask and shift based on V4 implementation)
        tickLower = TOtickLower(info);
        
        // Extract tickUpper
        tickUpper = TOtickUpper(info);
        return (tickLower, tickUpper);
    }


    function toId(PoolKey memory poolKey) internal pure returns (bytes32 poolId) {
        assembly ("memory-safe") {
            // 0xa0 represents the total size of the poolKey struct (5 slots of 32 bytes)
            poolId := keccak256(poolKey, 0xa0)
        }
    }
    /**
     * @notice Helper to convert address to Currency
     * @param token Address of token (address(0) for ETH)
     * @return Currency representation
     */
    function _toCurrency(address token) internal pure returns (Currency) {
       if (token == address(0)) {
            // Explicitly convert 0 to uint256 first
            return Currency.wrap(0x0000000000000000000000000000000000000000);
        } else {
            return Currency.wrap(token);
        }
    }








    function createNewPool(
        address tokenA,
        address tokenC,       // Your hook address (address(0) if no hook)
        uint160 sqrtPriceX96       // Initial sqrt price (e.g., 79228162514264337593543950336 for 1:1)
    ) public  {
        // Sort tokens (required by Uniswap)
        (address token0, address token1) = tokenA < tokenC
            ? (tokenA, tokenC) 
            : (tokenC, tokenA);

        // Create PoolKey
        IPoolManager.PoolKey memory key = IPoolManager.PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: 1000, // Add dynamic flag if needed
            tickSpacing: 60,
            hooks: address(0)
        });
        // Initialize the pool
        poolManager.initialize(key, sqrtPriceX96);
    }

    function encodeDynamicFee() public pure returns (uint24) {
        // For dynamic fees, just return the flag - don't combine with a base fee
        return 0x800000; // DYNAMIC_FEE_FLAG
    }

    // Helper to calculate sqrtPriceX96 for a given price ratio
    function sqrtPriceX96FromPriceRatio(
        uint256 priceRatio,  // token1/token0 in 1e18 precision
        uint8 token0Decimals,
        uint8 token1Decimals
    ) public pure returns (uint160) {
        uint256 adjustedRatio = priceRatio * 10**token0Decimals / 10**token1Decimals;
        uint256 sqrtRatio = sqrt(adjustedRatio * 2**192);
        return uint160(sqrtRatio);
    }

    // Babylonian square root implementation
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












    function createPositionWithETH(
        uint256 amountIn,
        uint256 minAmountOut) public payable returns (bool)
            {
               address token = tokenB;

            address toSendNFTto = address(this);
/*     For when using two tokens do this
       (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        
        (amountA, amountB) = tokenA < tokenB
            ? (amountA, amountB)
            : (amountB, amountA);
        */
        require(msg.value > 0,"MUST SEND ETH! REVERTED!");

        IERC20(token).approve(address(permit2), type(uint256).max);
        
        IPermit2(permit2).approve(token, address(positionManager), type(uint160).max, uint48(block.timestamp)+60*60*1);
        //most important ^^^
      
        // Transfer tokens from sender
        IERC20(token).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router
        IERC20(token).approve(address(positionManager), amountIn);
        PoolKey memory poolKey = PoolKey(Currency.wrap(address(0)), Currency.wrap(token), 1000, 60, IHooks(address(0)));
        bytes32 idz = toId(poolKey);
        
(uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);
// Convert ticks to sqrtPriceX96 values
// Convert specific ticks to sqrtPriceX96 values
int24 tickLower = -887220; // Your desired lower tick
int24 tickUpper = 887220;  // Your desired upper tick

// Convert ticks to sqrtPriceX96 values
uint160 sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
uint160 sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);

     uint liquidityDelta =   getLiquidityForAmounts(
        sqrtPricex96,
        sqrtRatioAX96,
        sqrtRatioBX96,
        msg.value,
        amountIn
    );
    
// For ETH liquidity positions
        
        // Actions
   // MINT_POSITION = 0x02,
    // SETTLE_PAIR = 0x0d,
    //SWEEP = 0x14,
        bytes memory actions = new bytes(3);
        actions[0] = bytes1(0x02); // MINT_POSITION
        actions[1] = bytes1(0x0d);    // SETTLE_PAIR = 0x0d,
        actions[2] = bytes1(0x14); // SWEEP
        //actions[3] = bytes1(0x16); // UNWRAP

        bytes[] memory params = new bytes[](3); // new bytes[](3) for ETH liquidity positions
        params[0] = abi.encode(poolKey, MIN_TICK, MAX_TICK, liquidityDelta-1, msg.value, amountIn, toSendNFTto, bytes(""));
        params[1] = abi.encode(address(0), token);
        params[2] = abi.encode(address(0), msg.sender);

        uint256 deadline = block.timestamp + 160;

        uint256 valueToPass = msg.value;
        /*
         bytes memory test = hex"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000056f2192f6c509e78c69adbe483f96aa1677d73a00000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000003c00000000000000000000000093cbf1d665cc6268bf8f9f1510858076368a5000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff2761800000000000000000000000000000000000000000000000000000000000d89e800000000000000000000000000000000000000000000000000000000a16f3ca5000000000000000000000000000000000000000000000000000000000756b5b30000000000000000000000000000000000000000000000000000001c32c8e5c70000000000000000000000007e2b7f161c0376f69c62bffd345da07843a7b73300000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000000";
     
            (PoolKey memory pool2, int24 tickLower2, int24 tickUpper2, uint256 liquidity2, uint128 amount0Max2,  uint128 amount1Max2 , address owner2 , bytes memory hookData2) = 
        abi.decode(test, (PoolKey, int24, int24, uint256, uint128, uint128, address, bytes));
            v_poolKey21 = pool2;
            v_tickLower = tickLower2;
            v_tickUpper = tickUpper2;
            v_liquidity = liquidity2;
            v_amount0Max = amount0Max2;
            v_amount1Max = amount1Max2;
            v_owner = owner2;
            v_hookData = hookData2;
            */

        uint nextID = nextIDis();
        positionManager.modifyLiquidities{value: valueToPass}(
            abi.encode(actions, params),
            deadline
        );

         emit PositionCreated(nextID);
        return true;



    }





    function nextIDis() public view returns (uint256){
        return positionManager.nextTokenId();
    }





function DecreaseLIq(uint percentagedivby10000,  uint tokenID) public returns (bool){


        // Check if NFT is full-range
        ( uint128 liquidity ) = 
            positionManager.getPositionLiquidity(tokenID);


               uint liqtoRemove = liquidity * percentagedivby10000 / 10000;
    
        address tokenA = address(0);
//modifyLiquidity
 // For when using two tokens do this

    /*
        bytes memory actions = new bytes(3);
        actions[0] = bytes1(0x02); // MINT_POSITION
        actions[1] = bytes1(0x0d);    // SETTLE_PAIR = 0x0d,
        actions[2] = bytes1(0x14); // SWEEP
        //actions[3] = bytes1(0x16); // UNWRAP

        bytes[] memory params = new bytes[](3); // new bytes[](3) for ETH liquidity positions
        params[0] = abi.encode(poolKey, MIN_TICK, MAX_TICK, liquidityDelta, msg.value, amountIn, toSendNFTto, bytes(""));
        params[1] = abi.encode(address(0), token);
        params[2] = abi.encode(address(0), msg.sender);
*/

//bytes memory actions = abi.encodePacked(uint8(Actions.DECREASE_LIQUIDITY), uint8(Actions.TAKE_PAIR));
//DECREASE_LIQUIDITY = 0x01,
// TAKE_PAIR = 0x11,

        bytes memory actions = abi.encodePacked(uint8(0x01), uint8(0x11));
        bytes[] memory params = new bytes[](2); //for take pair
        //bytes[] memory params = new bytes[](3); // new bytes[](3) for ETH liquidity positions
        params[0] = abi.encode(tokenID, liqtoRemove, 0, 0, bytes(""));


        Currency currency0 = Currency.wrap(tokenA); // tokenAddress1 = 0 for native ETH
        Currency currency1 = Currency.wrap(tokenB);

        params[1] = abi.encode(currency0, currency1, msg.sender); //take pair
        //For ETH see 2 tokens @ https://docs.uniswap.org/contracts/v4/quickstart/manage-liquidity/increase-liquidity
       //_toCurrency params[2] = abi.encode(currency0, address(this)); //sweep
        uint256 deadline = block.timestamp + 160;

        /*
         bytes memory test = hex"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000056f2192f6c509e78c69adbe483f96aa1677d73a00000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000003c00000000000000000000000093cbf1d665cc6268bf8f9f1510858076368a5000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff2761800000000000000000000000000000000000000000000000000000000000d89e800000000000000000000000000000000000000000000000000000000a16f3ca5000000000000000000000000000000000000000000000000000000000756b5b30000000000000000000000000000000000000000000000000000001c32c8e5c70000000000000000000000007e2b7f161c0376f69c62bffd345da07843a7b73300000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000000";
     
            (PoolKey memory pool2, int24 tickLower2, int24 tickUpper2, uint256 liquidity2, uint128 amount0Max2,  uint128 amount1Max2 , address owner2 , bytes memory hookData2) = 
        abi.decode(test, (PoolKey, int24, int24, uint256, uint128, uint128, address, bytes));
            v_poolKey21 = pool2;
            v_tickLower = tickLower2;
            v_tickUpper = tickUpper2;
            v_liquidity = liquidity2;
            v_amount0Max = amount0Max2;
            v_amount1Max = amount1Max2;
            v_owner = owner2;
            v_hookData = hookData2;
            */




        positionManager.modifyLiquidities{value: 0}(
            abi.encode(actions, params),
            deadline
        );


       //  emit PositionCreated(nextID);
        return true;


    }

















function increaseLIq(uint128 amountIn, uint tokenID) public payable returns (bool){


                address token = tokenB;
    
//modifyLiquidity
/*     For when using two tokens do this
       (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        
        (amountA, amountB) = tokenA < tokenB
            ? (amountA, amountB)
            : (amountB, amountA);
        */
        require(msg.value > 0,"MUST SEND ETH! REVERTED!");
        IERC20(token).approve(address(permit2), type(uint256).max);
        IPermit2(permit2).approve(address(0), address(positionManager), type(uint160).max, uint48(block.timestamp)+60*60*1);
        IPermit2(permit2).approve(token, address(positionManager), type(uint160).max, uint48(block.timestamp)+60*60*1);
        
        // Transfer tokens from sender
        IERC20(token).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router
        IERC20(token).approve(address(positionManager), amountIn);
        PoolKey memory poolKey = PoolKey(Currency.wrap(address(0)), Currency.wrap(tokenB), 1000, 60, IHooks(address(0)));
        bytes32 idz = toId(poolKey);
        
(uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);
// Convert ticks to sqrtPriceX96 values
// Convert specific ticks to sqrtPriceX96 values
int24 tickLower = -887220; // Your desired lower tick
int24 tickUpper = 887220;  // Your desired upper tick

// Convert ticks to sqrtPriceX96 values
uint160 sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
uint160 sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);

     uint liquidityDelta =   getLiquidityForAmounts(
        sqrtPricex96,
        sqrtRatioAX96,
        sqrtRatioBX96,
        msg.value,
        amountIn
    );
    
    /*
        bytes memory actions = new bytes(3);
        actions[0] = bytes1(0x02); // MINT_POSITION
        actions[1] = bytes1(0x0d);    // SETTLE_PAIR = 0x0d,
        actions[2] = bytes1(0x14); // SWEEP
        //actions[3] = bytes1(0x16); // UNWRAP

        bytes[] memory params = new bytes[](3); // new bytes[](3) for ETH liquidity positions
        params[0] = abi.encode(poolKey, MIN_TICK, MAX_TICK, liquidityDelta, msg.value, amountIn, toSendNFTto, bytes(""));
        params[1] = abi.encode(address(0), token);
        params[2] = abi.encode(address(0), msg.sender);
*/


// For ETH liquidity positions
        bytes memory actions = abi.encodePacked(uint8(0x00), uint8(0x0d), uint8(0x14));
        // Actions
   // INCREASE_LIQUIDITY = 0x00,
    // SETTLE_PAIR = 0x0d,
    //SWEEP = 0x14,
        bytes[] memory params = new bytes[](3); // new bytes[](3) for ETH liquidity positions
        params[0] = abi.encode(tokenID, liquidityDelta, msg.value, amountIn, bytes(""));


        Currency currency0 = Currency.wrap(address(0)); // tokenAddress1 = 0 for native ETH
        Currency currency1 = Currency.wrap(token);

        params[1] = abi.encode(currency0, currency1); //settle pair
        //For ETH see 2 tokens @ https://docs.uniswap.org/contracts/v4/quickstart/manage-liquidity/increase-liquidity
        params[2] = abi.encode(currency0, address(this)); //sweep
        uint256 deadline = block.timestamp + 160;

        uint256 valueToPass = msg.value;
        /*
         bytes memory test = hex"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000056f2192f6c509e78c69adbe483f96aa1677d73a00000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000003c00000000000000000000000093cbf1d665cc6268bf8f9f1510858076368a5000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff2761800000000000000000000000000000000000000000000000000000000000d89e800000000000000000000000000000000000000000000000000000000a16f3ca5000000000000000000000000000000000000000000000000000000000756b5b30000000000000000000000000000000000000000000000000000001c32c8e5c70000000000000000000000007e2b7f161c0376f69c62bffd345da07843a7b73300000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000000";
     
            (PoolKey memory pool2, int24 tickLower2, int24 tickUpper2, uint256 liquidity2, uint128 amount0Max2,  uint128 amount1Max2 , address owner2 , bytes memory hookData2) = 
        abi.decode(test, (PoolKey, int24, int24, uint256, uint128, uint128, address, bytes));
            v_poolKey21 = pool2;
            v_tickLower = tickLower2;
            v_tickUpper = tickUpper2;
            v_liquidity = liquidity2;
            v_amount0Max = amount0Max2;
            v_amount1Max = amount1Max2;
            v_owner = owner2;
            v_hookData = hookData2;
            */




        positionManager.modifyLiquidities{value: valueToPass}(
            abi.encode(actions, params),
            deadline
        );


       //  emit PositionCreated(nextID);
        return true;

    }

    fallback() external payable {
        // Optional: handle unexpected data
    }

    receive() external payable {
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

    uint256 constant Q96 = 0x1000000000000000000000000;


    error SafeCastOverflow();

    /// @notice Cast a int128 to a uint128, revert on overflow or underflow
    /// @param x The int128 to be casted
    /// @return y The casted integer, now type uint128
    function toUint128(int128 x) internal pure returns (uint128 y) {
        if (x < 0) revert("under 0");
        y = uint128(x);
    }

    /// @notice Cast a uint256 to a uint128, revert on overflow
    /// @param x The uint256 to be downcasted
    /// @return y The downcasted integer, now type uint128
    function toUint128(uint256 x) internal pure returns (uint128 y) {
        y = uint128(x);
        if (x != y) revert("not equal");
    }


    /// @notice Computes the amount of liquidity received for a given amount of token0 and price range
    /// @dev Calculates amount0 * (sqrt(upper) * sqrt(lower)) / (sqrt(upper) - sqrt(lower))
    /// @param sqrtPriceAX96 A sqrt price representing the first tick boundary
    /// @param sqrtPriceBX96 A sqrt price representing the second tick boundary
    /// @param amount0 The amount0 being sent in
    /// @return liquidity The amount of returned liquidity
    function getLiquidityForAmount0(uint160 sqrtPriceAX96, uint160 sqrtPriceBX96, uint256 amount0)
        internal
        pure
        returns (uint128 liquidity)
    {
        unchecked {
            if (sqrtPriceAX96 > sqrtPriceBX96) (sqrtPriceAX96, sqrtPriceBX96) = (sqrtPriceBX96, sqrtPriceAX96);
            uint256 intermediate = mulDiv(sqrtPriceAX96, sqrtPriceBX96, Q96);
            return toUint128(mulDiv(amount0, intermediate, sqrtPriceBX96 - sqrtPriceAX96));
        }
    }

    /// @notice Computes the amount of liquidity received for a given amount of token1 and price range
    /// @dev Calculates amount1 / (sqrt(upper) - sqrt(lower)).
    /// @param sqrtPriceAX96 A sqrt price representing the first tick boundary
    /// @param sqrtPriceBX96 A sqrt price representing the second tick boundary
    /// @param amount1 The amount1 being sent in
    /// @return liquidity The amount of returned liquidity
    function getLiquidityForAmount1(uint160 sqrtPriceAX96, uint160 sqrtPriceBX96, uint256 amount1)
        internal
        pure
        returns (uint128 liquidity)
    {
        unchecked {
            if (sqrtPriceAX96 > sqrtPriceBX96) (sqrtPriceAX96, sqrtPriceBX96) = (sqrtPriceBX96, sqrtPriceAX96);
            return toUint128(mulDiv(amount1, Q96, sqrtPriceBX96 - sqrtPriceAX96));
        }
    }

    /// @notice Computes the maximum amount of liquidity received for a given amount of token0, token1, the current
    /// pool prices and the prices at the tick boundaries
    /// @param sqrtPriceX96 A sqrt price representing the current pool prices
    /// @param sqrtPriceAX96 A sqrt price representing the first tick boundary
    /// @param sqrtPriceBX96 A sqrt price representing the second tick boundary
    /// @param amount0 The amount of token0 being sent in
    /// @param amount1 The amount of token1 being sent in
    /// @return liquidity The maximum amount of liquidity received
    function getLiquidityForAmounts(
        uint160 sqrtPriceX96,
        uint160 sqrtPriceAX96,
        uint160 sqrtPriceBX96,
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (uint128 liquidity) {
        if (sqrtPriceAX96 > sqrtPriceBX96) (sqrtPriceAX96, sqrtPriceBX96) = (sqrtPriceBX96, sqrtPriceAX96);

        if (sqrtPriceX96 <= sqrtPriceAX96) {
            liquidity = getLiquidityForAmount0(sqrtPriceAX96, sqrtPriceBX96, amount0);
        } else if (sqrtPriceX96 < sqrtPriceBX96) {
            uint128 liquidity0 = getLiquidityForAmount0(sqrtPriceX96, sqrtPriceBX96, amount0);
            uint128 liquidity1 = getLiquidityForAmount1(sqrtPriceAX96, sqrtPriceX96, amount1);

            liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
        } else {
            liquidity = getLiquidityForAmount1(sqrtPriceAX96, sqrtPriceBX96, amount1);
        }
    }



// Convert tick to sqrtPriceX96
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















function getPriceRatioWithDecimals(uint160 sqrtPriceX96, uint8 decimals) public pure returns (uint256 priceRatio) {
    // Calculate price = (sqrtPriceX96 / 2^96) ^ 2
    // Need higher precision for intermediate calculations
    uint256 priceX192 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
    uint256 Q192 = 1 << 192; // 2^192
    uint256 multiplier = 10 ** decimals;
    
    // Use higher precision math to preserve decimal places
    // Add extra precision during calculation
    uint256 extraPrecision = 10 ** 10; // Add extra 10 digits of precision
    
    if (priceX192 >= Q192) {
        // First multiply by extra precision, then by multiplier to preserve decimal places
        priceRatio = ((priceX192 * extraPrecision) / Q192 * multiplier) / extraPrecision;
    } else {
        // Multiply by both factors first to avoid losing precision
        priceRatio = (priceX192 * multiplier * extraPrecision) / (Q192 * extraPrecision);
    }
    
    return priceRatio;
}


uint priceRatiox18decimals=0;

function getPriceRatio () public view returns (uint ratio){

        PoolKey memory poolKey = PoolKey(Currency.wrap(address(0)), Currency.wrap(address(tokenB)), 1000, 60, IHooks(address(0)));
        bytes32 idz = toId(poolKey);
        
        (uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);
        uint priceRatiox18decimals2 = getPriceRatioWithDecimals(sqrtPricex96, 18);
        return priceRatiox18decimals2;

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


