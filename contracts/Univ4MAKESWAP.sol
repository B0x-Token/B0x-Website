//Might want to change owner to cold storage address beofre mainnet although should never be used


// B ZERO X Token - Box Token - Uniswap v4 Swap Contract

// Website: https://bzerox.com/
// Website dAPP: https://bzerox.org/
// Website dAPP Swap: https://bzerox.org/?swap
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
// Total supply: 31,165,100.000000000000000000 B0x
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


interface IPoolManager {
    /// @notice Struct containing data about liquidity modificationf
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
    function decimals() external view returns (uint8);
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
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipientsoperator
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

    struct PathKey {
        Currency intermediateCurrency;
        uint24 fee;
        int24 tickSpacing;
        IHooks hooks;
        bytes hookData;
    }
    

    
    struct ExactInputParams {
        Currency currencyIn;
        PathKey[] path;
        uint128 amountIn;
        uint128 amountOutMinimum;
    }
    
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
}
interface IStateView {
type PoolId is bytes32;

function getPositionInfo(PoolId poolId, address owner, int24 tickLower, int24 tickUpper, bytes32 salt)    external  view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128);


    function getFeeGrowthInside(
        bytes32 poolId,
        int24 tickLower,
        int24 tickUpper
    ) external view returns (uint256 feeGrowthInside0X128, uint256 feeGrowthInside1X128);

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


/// @notice Contract for executing swaps on Uniswap V4 on our B0x / 0xBitcoin liquidity pool
contract UniswapV4Swap {
   /// @notice Handles the receipt of an NFT
   /// @param operator The address which called `safeTransferFrom` function
   /// @param from The address which previously owned the token
   /// @param tokenId The NFT identifier which is being transferred
   /// @param data Additional data with no specified format
   /// @return bytes4 Returns the selector to confirm token transfer
   function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external pure returns (bytes4) {
       return IERC721Receiver.onERC721Received.selector;
   }

   event MultiRouteSwapExecuted(
    address indexed tokenIn,
    address indexed tokenOut,
    uint256 amountIn,
    uint256 amountOut,
    uint256 routeCount,
    address indexed recipient
);


   
   /// @notice Minimum tick value for Uniswap V4 pools
   int24 private constant MIN_TICK = -887220;
   /// @notice Maximum tick value for Uniswap V4 pools
   int24 private constant MAX_TICK = 887220;
   
   /// @notice Event emitted when a new liquidity position is created
   /// @param tokenId The unique identifier of the created position NFT
   event PositionCreated(uint256 indexed tokenId);
   
   /// @notice Constant identifier for V4 swap operations
   uint256 constant V4_SWAP = 0x10;
   /// @notice Minimum sqrt ratio (corresponds to minimum price)
   uint160 constant MIN_SQRT_RATIO = 4295128739;
   /// @notice Maximum sqrt ratio (corresponds to maximum price)
   uint160 constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;
                                     
   /// @notice Interface for Uniswap V4 price quoter contract
   IUniswapV4Quoter public immutable quoter = IUniswapV4Quoter(0x0d5e0F971ED27FBfF6c2837bf31316121532048D);
   /// @notice Interface for viewing pool state information
   IStateView public immutable stateView = IStateView(0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71);
   /// @notice Interface for managing liquidity positions
   IPositionManager public immutable positionManager = IPositionManager(0x7C5f5A4bBd8fD63184577525326123B519429bDc);
   /// @notice The Uniswap V4 pool manager contract
   IPoolManager public immutable poolManager = IPoolManager(0x498581fF718922c3f8e6A244956aF099B2652b2b);
   /// @notice Interface for Uniswap V4 router contract
   IV4Router public immutable IV4UniswapRouter= IV4Router(0x6fF5693b99212Da76ad316178A184AB56D299b43);
   /// @notice Interface for Wrapped Ether (WETH) contract
   IWETH public immutable WETH = IWETH(0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14);
   /// @notice Address of the Permit2 contract for token approvals
   address public permit2 = address(0x000000000022D473030F116dDEE9F6B43aC78BA3);
   
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
   modifier onlyOwner() 
   {
       require(msg.sender == owner,"Only Owner");
       _;
   }
   
   /// @notice Constructor to initialize the contract sets owner as msg.sender
   constructor()
   {
       /// @notice Set the deployer as the contract owner
       owner =  address(0x1B4C655c23D10d435B8d03a6bD84d6392deC0054);
   }

   /// @notice Withdraws an NFT position from the contract to the owner
   /// @param tokenID The unique identifier of the NFT position to withdraw
   /// @return bool Returns true if withdrawal is successful
   function withdrawNFT (uint tokenID) public onlyOwner returns (bool){
       positionManager.approve(address(this), tokenID);
       positionManager.safeTransferFrom(address(this), owner, tokenID);
       
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

 
   /// @notice Converts a PoolKey struct to a unique pool identifier
   /// @param poolKey The pool key structure containing pool parameters
   /// @return poolId The unique bytes32 identifier for the pool
   function toId(PoolKey memory poolKey) internal pure returns (bytes32 poolId) {
       assembly ("memory-safe") {
           // 0xa0 represents the total size of the poolKey struct (5 slots of 32 bytes)
           poolId := keccak256(poolKey, 0xa0)
       }
   }


struct RouteData {
    bool isSingleHop;
    address pool1TokenA;
    address pool1TokenB;
    address pool2TokenA;  // Only used for multi-hop
    address pool2TokenB;  // Only used for multi-hop
    address hookAddress;
    address hook2Address; // Only used for multi-hop
}

/**
 * @notice Execute a multi-route swap with optimized splits
 * @param routes Array of route configurations
 * @param amounts Array of input amounts per route (must sum to total input)
 * @param tokenIn Input token address
 * @param tokenOut Output token address
 * @param minTotalAmountOut Minimum total output (slippage protection)
 * @param recipient Address to receive output tokens
 */
function executeMultiRouteSwap(
    RouteData[] calldata routes,
    uint256[] calldata amounts,
    address tokenIn,
    address tokenOut,
    uint256 minTotalAmountOut,
    address recipient
) external payable returns (uint256 totalAmountOut) {
    require(routes.length == amounts.length, "Routes and amounts length mismatch");
    require(routes.length > 0, "No routes provided");
    
    uint256 totalInputUsed = 0;
    totalAmountOut = 0;
    
    // Calculate total input
    for (uint256 i = 0; i < amounts.length; i++) {
        totalInputUsed += amounts[i];
    }
    
    // Handle input token transfer
    if (tokenIn == address(0)) {
        require(msg.value == totalInputUsed, "ETH amount mismatch");
    } else {
        require(msg.value == 0, "Unexpected ETH sent");
        IERC20(tokenIn).transferFrom(msg.sender, address(this), totalInputUsed);
        IERC20(tokenIn).approve(address(permit2), type(uint256).max);
        IPermit2(permit2).approve(tokenIn, address(IV4UniswapRouter), type(uint160).max, uint48(block.timestamp)+3600);
    }
    
    uint256 balanceBefore = _getOutputBalance(tokenOut);
    
    // Execute each route
    for (uint256 i = 0; i < routes.length; i++) {
        if (amounts[i] == 0) continue;
        
        if (routes[i].isSingleHop) {
            _executeSingleHop(
                routes[i].pool1TokenA,
                routes[i].pool1TokenB,
                tokenIn,
                amounts[i],
                routes[i].hookAddress
            );
        } else {
            _executeMultiHop(
                routes[i].pool1TokenA,
                routes[i].pool1TokenB,
                routes[i].pool2TokenA,
                routes[i].pool2TokenB,
                tokenIn,
                amounts[i],
                routes[i].hookAddress,
                routes[i].hook2Address
            );
        }
    }
    
    uint256 balanceAfter = _getOutputBalance(tokenOut);
    totalAmountOut = balanceAfter - balanceBefore;
    
    require(totalAmountOut >= minTotalAmountOut, "Insufficient output amount");
    
    // Transfer output to recipient
    _transferOutput(tokenOut, totalAmountOut, recipient);
    
    // Refund any remaining input tokens
    _refundRemaining(tokenIn, tokenOut, recipient);
    
    emit MultiRouteSwapExecuted(tokenIn, tokenOut, totalInputUsed, totalAmountOut, routes.length, recipient);
}


function _executeSingleHop(
    address tokenA,
    address tokenB,
    address tokenIn,
    uint256 amountIn,
    address hookAddress
) internal {
    // Sort tokens for pool key
    (address token0, address token1) = tokenA < tokenB
        ? (tokenA, tokenB)
        : (tokenB, tokenA);
    
    // Create pool key
    PoolKey memory poolKey = PoolKey({
        currency0: Currency.wrap(token0),
        currency1: Currency.wrap(token1),
        fee: 0x800000,
        tickSpacing: 60,
        hooks: IHooks(hookAddress)
    });
    
    // Calculate swap direction
    bool zeroForOne = tokenIn == token0;
    
    // Actions for single-hop swap
    bytes memory actions = abi.encodePacked(
        uint8(0x06), // SWAP_EXACT_IN_SINGLE
        uint8(0x0c), // SETTLE_ALL
        uint8(0x0f)  // TAKE_ALL
    );
    
    // Swap parameters
    bytes memory swapParams = abi.encode(
        IV4Router.ExactInputSingleParams({
            poolKey: poolKey,
            zeroForOne: zeroForOne,
            amountIn: uint128(amountIn),
            amountOutMinimum: 0,
            hookData: bytes("")
        })
    );
    
    // Settle parameters
    Currency inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1;
    bytes memory settleParams = abi.encode(inputCurrency, amountIn);
    
    // Take parameters
    Currency outputCurrency = zeroForOne ? poolKey.currency1 : poolKey.currency0;
    bytes memory takeParams = abi.encode(outputCurrency, uint256(0));
    
    // Combine all params
    bytes[] memory allParams = new bytes[](3);
    allParams[0] = swapParams;
    allParams[1] = settleParams;
    allParams[2] = takeParams;
    
    // Command for V4_SWAP
    bytes memory commands = abi.encodePacked(uint8(0x10));
    bytes[] memory inputs = new bytes[](1);
    inputs[0] = abi.encode(actions, allParams);
    
    // Execute
    if (tokenIn == address(0)) {
        IV4UniswapRouter.execute{value: amountIn}(commands, inputs, block.timestamp + 60);
    } else {
        IV4UniswapRouter.execute(commands, inputs, block.timestamp + 60);
    }
}

function _executeMultiHop(
    address pool1TokenA,
    address pool1TokenB,
    address pool2TokenA,
    address pool2TokenB,
    address tokenIn,
    uint256 amountIn,
    address hook1Address,
    address hook2Address
) internal {
    // Sort tokens
    (address pool1Token0, address pool1Token1) = pool1TokenA < pool1TokenB
        ? (pool1TokenA, pool1TokenB)
        : (pool1TokenB, pool1TokenA);
    
    (address pool2Token0, address pool2Token1) = pool2TokenA < pool2TokenB
        ? (pool2TokenA, pool2TokenB)
        : (pool2TokenB, pool2TokenA);
    
    // Create pool keys
    PoolKey memory poolKey1 = PoolKey({
        currency0: Currency.wrap(pool1Token0),
        currency1: Currency.wrap(pool1Token1),
        fee: 0x800000,
        tickSpacing: 60,
        hooks: IHooks(hook1Address)
    });
    
    PoolKey memory poolKey2 = PoolKey({
        currency0: Currency.wrap(pool2Token0),
        currency1: Currency.wrap(pool2Token1),
        fee: 0x800000,
        tickSpacing: 60,
        hooks: IHooks(hook2Address)
    });
    
    // Determine swap directions and intermediate token
    bool zeroForOne1 = tokenIn == pool1Token0;
    
    address intermediateToken;
    if (pool1Token0 == pool2Token0 || pool1Token0 == pool2Token1) {
        intermediateToken = pool1Token0;
    } else if (pool1Token1 == pool2Token0 || pool1Token1 == pool2Token1) {
        intermediateToken = pool1Token1;
    } else {
        revert("No common token between pools");
    }
    
    bool zeroForOne2 = intermediateToken == pool2Token0;
    
    // Actions for multi-hop swap
    bytes memory actions = abi.encodePacked(
        uint8(0x06), // SWAP_EXACT_IN_SINGLE (first swap)
        uint8(0x0c), // SETTLE_ALL (settle first pool)
        uint8(0x06), // SWAP_EXACT_IN_SINGLE (second swap)
        uint8(0x0c), // SETTLE_ALL (settle second pool)
        uint8(0x0f)  // TAKE_ALL (take final output)
    );
    
    // First swap parameters
    bytes memory swap1Params = abi.encode(
        IV4Router.ExactInputSingleParams({
            poolKey: poolKey1,
            zeroForOne: zeroForOne1,
            amountIn: uint128(amountIn),
            amountOutMinimum: 0,
            hookData: bytes("")
        })
    );
    
    // First settle parameters
    Currency inputCurrency1 = zeroForOne1 ? poolKey1.currency0 : poolKey1.currency1;
    bytes memory settle1Params = abi.encode(inputCurrency1, amountIn);
    
    // Second swap parameters
    bytes memory swap2Params = abi.encode(
        IV4Router.ExactInputSingleParams({
            poolKey: poolKey2,
            zeroForOne: zeroForOne2,
            amountIn: uint128(0),
            amountOutMinimum: 0,
            hookData: bytes("")
        })
    );
    
    // Second settle parameters
    Currency inputCurrency2 = zeroForOne2 ? poolKey2.currency0 : poolKey2.currency1;
    bytes memory settle2Params = abi.encode(inputCurrency2, uint256(0));
    
    // Take all parameters
    Currency outputCurrency = zeroForOne2 ? poolKey2.currency1 : poolKey2.currency0;
    bytes memory takeAllParams = abi.encode(outputCurrency, uint256(0));
    
    // Combine all params
    bytes[] memory allParams = new bytes[](5);
    allParams[0] = swap1Params;
    allParams[1] = settle1Params;
    allParams[2] = swap2Params;
    allParams[3] = settle2Params;
    allParams[4] = takeAllParams;
    
    // Command for V4_SWAP
    bytes memory commands = abi.encodePacked(uint8(0x10));
    bytes[] memory inputs = new bytes[](1);
    inputs[0] = abi.encode(actions, allParams);
    
    // Execute
    if (tokenIn == address(0)) {
        IV4UniswapRouter.execute{value: amountIn}(commands, inputs, block.timestamp + 60);
    } else {
        IV4UniswapRouter.execute(commands, inputs, block.timestamp + 60);
    }
}



function _getOutputBalance(address token) internal view returns (uint256) {
    if (token == address(0)) {
        return address(this).balance - msg.value;
    }
    return IERC20(token).balanceOf(address(this));
}

function _transferOutput(address token, uint256 amount, address recipient) internal {
    if (token == address(0)) {
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "ETH transfer failed");
    } else {
        IERC20(token).transfer(recipient, amount);
    }
}

function _refundRemaining(address tokenIn, address tokenOut, address recipient) internal {
    if (tokenIn != address(0)) {
        uint256 remaining = IERC20(tokenIn).balanceOf(address(this));
        if (remaining > 0) {
            IERC20(tokenIn).transfer(recipient, remaining);
        }
    }
    if (tokenOut != address(0)) {
        uint256 remainingETH = address(this).balance;
        if (remainingETH > 0) {
            (bool success, ) = payable(recipient).call{value: remainingETH}("");
            require(success, "ETH refund failed");
        }
    }
}


   /**
 * @notice Performs a swap between two tokens with ETH support
 * @param tokenA First token address for pool identification
 * @param tokenB Second token address for pool identification
 * @param tokenIn Input token address (use address(0) for ETH)
 * @param tokenOut Output token address (use address(0) for ETH)
 * @param amountIn Amount of input token
 * @param minAmountOut Minimum output amount
 * @param hookAddress Hook address for the pool
 * @param WhereToSendFunds Address to receive the swapped tokens
 * @return bool Returns true if swap is successful
 */
function swapTokenTWOTOKENS(
    address tokenA,
    address tokenB,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    address hookAddress,
    address WhereToSendFunds
) external payable returns (bool) {  // Added payable
    
    address ETH_ADDRESS = address(0);
    
    // Handle ETH input validation
    if (tokenIn == ETH_ADDRESS) {
        require(msg.value == amountIn, "ETH amount mismatch");
    } else {
        require(msg.value == 0, "Unexpected ETH sent");
        
        // Handle ERC20 token input
        IERC20(tokenIn).approve(address(permit2), type(uint256).max);
        IPermit2(permit2).approve(tokenIn, address(IV4UniswapRouter), type(uint160).max, uint48(block.timestamp)+60*60*1);
        
        // Transfer tokens from sender
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
    }
    
    /// @notice Sorted token addresses (token0 must be < token1)
    (address token0, address token1) = tokenA < tokenB
        ? (tokenA, tokenB)
        : (tokenB, tokenA);
    
    // Command for V4_SWAP
    /// @notice Command bytes for V4 swap operation
    bytes memory commands = new bytes(1);
    commands = abi.encodePacked(uint8(0x10));
    
    // Actions
    /// @notice Action sequence for the swap operation
    bytes memory actions = new bytes(3);
    actions[0] = bytes1(0x06); // SWAP_EXACT_IN_SINGLE
    actions[1] = bytes1(0x0c); // SETTLE_ALL
    actions[2] = bytes1(0x0f); // TAKE_ALL
    
    // Create pool key
    /// @notice Pool key structure containing all pool parameters
    PoolKey memory poolKey = PoolKey({
        currency0: Currency.wrap(token0),
        currency1: Currency.wrap(token1),
        fee: 0x800000,
        tickSpacing: 60,
        hooks: IHooks(hookAddress)
    });
    
    // Calculate swap direction
    /// @notice Direction of the swap (true if swapping token0 for token1)
    bool zeroForOne = tokenIn == token0;
    
    // Encode swap parameters
    /// @notice Encoded parameters for the swap operation
    bytes memory swapParams = abi.encode(
        IV4Router.ExactInputSingleParams({
            poolKey: poolKey,
            zeroForOne: zeroForOne,
            amountIn: uint128(amountIn),
            amountOutMinimum: uint128(minAmountOut),
            hookData: bytes("")
        })
    );
    
    // Settle parameters
    /// @notice Input currency for settlement
    Currency inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1;
    /// @notice Encoded parameters for settling input currency
    bytes memory settleAllParams = abi.encode(inputCurrency, amountIn);
    
    // Take parameters
    /// @notice Output currency to take
    Currency outputCurrency = zeroForOne ? poolKey.currency1 : poolKey.currency0;
    /// @notice Encoded parameters for taking output currency
    bytes memory takeAllParams = abi.encode(outputCurrency, minAmountOut);
    
    // Combine all params
    /// @notice Array of all encoded parameters for the swap actions
    bytes[] memory allParams = new bytes[](3);
    allParams[0] = swapParams;
    allParams[1] = settleAllParams;
    allParams[2] = takeAllParams;
    
    // Encode all actions and params
    /// @notice Input data for router execution
    bytes[] memory inputs = new bytes[](1);
    inputs[0] = abi.encode(actions, allParams);
    
    // Execute the swap
    /// @notice Deadline for the swap transaction
    uint256 deadline = block.timestamp + 60;
    
    // Send ETH to router if input is ETH
    if (tokenIn == ETH_ADDRESS) {
        IV4UniswapRouter.execute{value: amountIn}(commands, inputs, deadline);
    } else {
        IV4UniswapRouter.execute(commands, inputs, deadline);
    }
    
    // Handle output distribution
    if (tokenOut == ETH_ADDRESS) {
        // Transfer ETH to recipient
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            payable(WhereToSendFunds).transfer(ethBalance);
        }
    } else {
        // Transfer ERC20 output tokens
        uint256 tokenOutValue = IERC20(tokenOut).balanceOf(address(this));
        if (tokenOutValue > 0) {
            IERC20(tokenOut).transfer(WhereToSendFunds, tokenOutValue);
        }
    }
    
    // Handle remaining input tokens (refunds)
    if (tokenIn != ETH_ADDRESS) {
        uint256 tokenInValue = IERC20(tokenIn).balanceOf(address(this));
        if (tokenInValue > 0) {
            IERC20(tokenIn).transfer(WhereToSendFunds, tokenInValue);
        }
    }
    // Note: Any remaining ETH stays in contract or is handled by router
    
    return true;
}

   /// @notice Gets the pool key for a token pair with specified hook
   /// @param tokenA First token address in the pair
   /// @param tokenB Second token address in the pair
   /// @param hookAddress Address of the hook contract for the pool
   /// @return PoolKey memory structure containing pool parameters
   function getPoolKey(address tokenA, address tokenB, address hookAddress) public view returns (PoolKey memory)
   {
       // Determine correct token ordering for the pool
       /// @notice Sorted token addresses (token0 must be < token1)
       (address token0, address token1) = tokenA < tokenB
           ? (tokenA, tokenB)
           : (tokenB, tokenA);
       
       // Create pool key with properly ordered tokens
       /// @notice Pool key structure with ordered tokens and parameters
       PoolKey memory poolKey = PoolKey({
           currency0: Currency.wrap(token0),
           currency1: Currency.wrap(token1),
           fee: 0x800000,
           tickSpacing: 60,
           hooks: IHooks(hookAddress)
       });
       
       return poolKey;
   }
   
   
   /// @notice Gets the expected output amount for a token swap
   /// @param tokenZeroxBTC Address of the 0xBTC token
   /// @param tokenBZeroX Address of the BZeroX token
   /// @param tokenIn Address of the input token
   /// @param hookAddress Address of the hook contract
   /// @param amountIn Amount of input tokens
   /// @return amountOut Expected amount of output tokens
   function getOutput(address tokenZeroxBTC, address tokenBZeroX, address tokenIn, address hookAddress, uint128 amountIn) public returns (uint amountOut)
   {
       /// @notice Pool key for the token pair
       PoolKey memory keyz = getPoolKey(tokenZeroxBTC, tokenBZeroX, hookAddress);
       
       // Determine swap direction based on token addresses
       /// @notice Direction of swap (true if swapping token0 for token1)
       bool zeroForOne = tokenIn == Currency.unwrap(keyz.currency0);
       
       // Create the QuoteExactSingleParams structure
       /// @notice Parameters for exact input quote calculation
       IUniswapV4Quoter.QuoteExactSingleParams memory params = IUniswapV4Quoter.QuoteExactSingleParams({
           poolKey: keyz,
           zeroForOne: zeroForOne,
           exactAmount: amountIn,
           hookData: bytes("") // Empty bytes for no hook data
       });
       
       // Call the quoter and get the amount out
       /// @notice Quote result with amount out and additional data
       (amountOut, ) = quoter.quoteExactInputSingle(params);
       return amountOut;
   }
   

    /// @notice A helper function to calculate the position key
    /// @param owner2 The address of the position owner
    /// @param tickLower the lower tick boundary of the position
    /// @param tickUpper the upper tick boundary of the position
    /// @param salt A unique value to differentiate between multiple positions in the same range, by the same owner. Passed in by the caller.
    function calculatePositionKey(address owner2, int24 tickLower, int24 tickUpper, bytes32 salt) internal pure returns (bytes32 positionKey)
    {
         //positionKey = keccak256(abi.encodePacked(owner2, tickLower, tickUpper, salt));
          assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(add(fmp, 0x26), salt) // [0x26, 0x46)
            mstore(add(fmp, 0x06), tickUpper) // [0x23, 0x26)
            mstore(add(fmp, 0x03), tickLower) // [0x20, 0x23)
            mstore(fmp, owner2) // [0x0c, 0x20)
            positionKey := keccak256(add(fmp, 0x0c), 0x3a) // len is 58 bytes

            // now clean the memory we used
            mstore(add(fmp, 0x40), 0) // fmp+0x40 held salt
            mstore(add(fmp, 0x20), 0) // fmp+0x20 held tickLower, tickUpper, salt
            mstore(fmp, 0) // fmp held owner
        }
    }
/**
 * @notice Performs a multi-hop swap through two pools with ETH support
 * @param pool1TokenA First token of pool 1
 * @param pool1TokenB Second token of pool 1  
 * @param pool2TokenA First token of pool 2
 * @param pool2TokenB Second token of pool 2
 * @param tokenIn Input token address (use 0x0 for ETH)
 * @param tokenOut Output token address (use 0x0 for ETH)
 * @param amountIn Amount of input token
 * @param minAmountOut Minimum output amount
 * @param hook1Address Hook address for pool 1
 * @param hook2Address Hook address for pool 2
 * @param WhereToSendFunds Address to receive the swapped tokens
 * @return bool Returns true if swap is successful
 */
function swapTwoPoolsMultiHop(
    address pool1TokenA,
    address pool1TokenB,
    address pool2TokenA,
    address pool2TokenB,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    address hook1Address,
    address hook2Address,
    address WhereToSendFunds
) external payable returns (bool) {  // Added payable here
    
    // ETH handling
    address ETH_ADDRESS = address(0);
    
    // Validate ETH input
    if (tokenIn == ETH_ADDRESS) {
        require(msg.value == amountIn, "ETH amount mismatch");
    } else {
        require(msg.value == 0, "Unexpected ETH sent");
        // Transfer ERC20 tokens from sender
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve tokens for router
        IERC20(tokenIn).approve(address(permit2), type(uint256).max);
        IPermit2(permit2).approve(tokenIn, address(IV4UniswapRouter), type(uint160).max, uint48(block.timestamp)+60*60*1);
    }
    
    // Sort tokens for each pool
    (address pool1Token0, address pool1Token1) = pool1TokenA < pool1TokenB
        ? (pool1TokenA, pool1TokenB)
        : (pool1TokenB, pool1TokenA);
    
    (address pool2Token0, address pool2Token1) = pool2TokenA < pool2TokenB
        ? (pool2TokenA, pool2TokenB)
        : (pool2TokenB, pool2TokenA);
    
    // Command for V4_SWAP
    bytes memory commands = new bytes(1);
    commands = abi.encodePacked(uint8(0x10));
    
    // Actions for multi-hop swap
    bytes memory actions = new bytes(5);
    actions[0] = bytes1(0x06); // SWAP_EXACT_IN_SINGLE (first swap)
    actions[1] = bytes1(0x0c); // SETTLE_ALL (settle first pool)
    actions[2] = bytes1(0x06); // SWAP_EXACT_IN_SINGLE (second swap)
    actions[3] = bytes1(0x0c); // SETTLE_ALL (settle second pool)
    actions[4] = bytes1(0x0f); // TAKE_ALL (take final output)
    
    // Create pool keys
    PoolKey memory poolKey1 = PoolKey({
        currency0: Currency.wrap(pool1Token0),
        currency1: Currency.wrap(pool1Token1),
        fee: 0x800000,
        tickSpacing: 60,
        hooks: IHooks(hook1Address)
    });
    
    PoolKey memory poolKey2 = PoolKey({
        currency0: Currency.wrap(pool2Token0),
        currency1: Currency.wrap(pool2Token1),
        fee: 0x800000,
        tickSpacing: 60,
        hooks: IHooks(hook2Address)
    });
    
    // Determine swap directions and find intermediate token
    bool zeroForOne1 = tokenIn == pool1Token0;
    
    address intermediateToken;
    if (pool1Token0 == pool2Token0 || pool1Token0 == pool2Token1) {
        intermediateToken = pool1Token0;
    } else if (pool1Token1 == pool2Token0 || pool1Token1 == pool2Token1) {
        intermediateToken = pool1Token1;
    } else {
        revert("No common token between pools");
    }
    
    bool zeroForOne2 = intermediateToken == pool2Token0;
    
    // First swap parameters
    bytes memory swap1Params = abi.encode(
        IV4Router.ExactInputSingleParams({
            poolKey: poolKey1,
            zeroForOne: zeroForOne1,
            amountIn: uint128(amountIn),
            amountOutMinimum: 0,
            hookData: bytes("")
        })
    );
    
    // First settle parameters
    Currency inputCurrency1 = zeroForOne1 ? poolKey1.currency0 : poolKey1.currency1;
    bytes memory settle1Params = abi.encode(inputCurrency1, amountIn);
    
    // Second swap parameters
    bytes memory swap2Params = abi.encode(
        IV4Router.ExactInputSingleParams({
            poolKey: poolKey2,
            zeroForOne: zeroForOne2,
            amountIn: uint128(0), // Determined by router from previous swap
            amountOutMinimum: uint128(minAmountOut),
            hookData: bytes("")
        })
    );
    
    // Second settle parameters
    Currency inputCurrency2 = zeroForOne2 ? poolKey2.currency0 : poolKey2.currency1;
    bytes memory settle2Params = abi.encode(inputCurrency2, uint256(0));
    
    // Take all parameters
    Currency outputCurrency = zeroForOne2 ? poolKey2.currency1 : poolKey2.currency0;
    bytes memory takeAllParams = abi.encode(outputCurrency, minAmountOut);
    
    // Combine all params
    bytes[] memory allParams = new bytes[](5);
    allParams[0] = swap1Params;
    allParams[1] = settle1Params;
    allParams[2] = swap2Params;
    allParams[3] = settle2Params;
    allParams[4] = takeAllParams;
    
    // Encode all actions and params
    bytes[] memory inputs = new bytes[](1);
    inputs[0] = abi.encode(actions, allParams);
    
    // Execute the multi-hop swap
    uint256 deadline = block.timestamp + 60;
    
    // Send ETH value if input is ETH
    if (tokenIn == ETH_ADDRESS) {
        IV4UniswapRouter.execute{value: amountIn}(commands, inputs, deadline);
    } else {
        IV4UniswapRouter.execute(commands, inputs, deadline);
    }
    
    // Handle output transfers
    if (tokenOut == ETH_ADDRESS) {
        // Transfer ETH to recipient
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            payable(WhereToSendFunds).transfer(ethBalance);
        }
    } else {
        // Transfer ERC20 tokens to recipient
        uint256 tokenOutBalance = IERC20(tokenOut).balanceOf(address(this));
        if (tokenOutBalance > 0) {
            IERC20(tokenOut).transfer(WhereToSendFunds, tokenOutBalance);
        }
    }
    
    // Transfer any remaining input tokens
    if (tokenIn != ETH_ADDRESS) {
        uint256 tokenInBalance = IERC20(tokenIn).balanceOf(address(this));
        if (tokenInBalance > 0) {
            IERC20(tokenIn).transfer(WhereToSendFunds, tokenInBalance);
        }
    }
    
    return true;
}




/**
 * @notice Gets the expected output amount for a multi-hop swap through two pools
 * @param pool1TokenA First token of pool 1
 * @param pool1TokenB Second token of pool 1
 * @param pool2TokenA First token of pool 2
 * @param pool2TokenB Second token of pool 2
 * @param tokenIn Input token address
 * @param tokenOut Output token address
 * @param hook1Address Hook address for pool 1
 * @param hook2Address Hook address for pool 2
 * @param amountIn Amount of input tokens
 * @return amountOut Expected amount of output tokens after both swaps
 */
function getOutputMultiHop(
    address pool1TokenA,
    address pool1TokenB,
    address pool2TokenA,
    address pool2TokenB,
    address tokenIn,
    address tokenOut,
    address hook1Address,
    address hook2Address,
    uint128 amountIn
) public returns (uint amountOut) {
    // Get pool keys for both pools
    /// @notice Pool key for the first pool
    PoolKey memory poolKey1 = getPoolKey(pool1TokenA, pool1TokenB, hook1Address);
    /// @notice Pool key for the second pool
    PoolKey memory poolKey2 = getPoolKey(pool2TokenA, pool2TokenB, hook2Address);
    
    // Find intermediate token (common token between pools)
    address intermediateToken;
    if (Currency.unwrap(poolKey1.currency0) == Currency.unwrap(poolKey2.currency0) || 
        Currency.unwrap(poolKey1.currency0) == Currency.unwrap(poolKey2.currency1)) {
        intermediateToken = Currency.unwrap(poolKey1.currency0);
    } else if (Currency.unwrap(poolKey1.currency1) == Currency.unwrap(poolKey2.currency0) || 
               Currency.unwrap(poolKey1.currency1) == Currency.unwrap(poolKey2.currency1)) {
        intermediateToken = Currency.unwrap(poolKey1.currency1);
    } else {
        revert("No common token between pools");
    }
    
    // First swap: tokenIn -> intermediateToken
    /// @notice Direction of first swap
    bool zeroForOne1 = tokenIn == Currency.unwrap(poolKey1.currency0);
    
    /// @notice Parameters for first swap quote
    IUniswapV4Quoter.QuoteExactSingleParams memory params1 = IUniswapV4Quoter.QuoteExactSingleParams({
        poolKey: poolKey1,
        zeroForOne: zeroForOne1,
        exactAmount: amountIn,
        hookData: bytes("")
    });
    
    /// @notice Output amount from first swap (intermediate amount)
    (uint intermediateAmount, ) = quoter.quoteExactInputSingle(params1);
    
    // Second swap: intermediateToken -> tokenOut
    /// @notice Direction of second swap
    bool zeroForOne2 = intermediateToken == Currency.unwrap(poolKey2.currency0);
    
    /// @notice Parameters for second swap quote
    IUniswapV4Quoter.QuoteExactSingleParams memory params2 = IUniswapV4Quoter.QuoteExactSingleParams({
        poolKey: poolKey2,
        zeroForOne: zeroForOne2,
        exactAmount: uint128(intermediateAmount),
        hookData: bytes("")
    });
    
    /// @notice Final output amount from second swap
    (amountOut, ) = quoter.quoteExactInputSingle(params2);
    
    return amountOut;
}


    /// @notice Represents the balance changes of a transaction
    struct BalanceDelta {
        int128 amount0;
        int128 amount1;
    }
    
/* example if u need help increase or decrease
   /// @notice Increases liquidity for an existing position with two tokens
   /// @param tokenA Address of the first token
   /// @param tokenB Address of the second token
   /// @param hookAddress Address of the hook contract for the pool
   /// @param amountA Amount of tokenA to add
   /// @param amountB Amount of tokenB to add
   /// @param tokenID ID of the existing position to increase liquidity for
   /// @param fees0 Amount of fees for token0 to use from position
   /// @param fees1 Amount of fees for token1 to use from position
   /// @return bool Returns true if liquidity increase is successful
   function increaseLiqTwoTokens(address tokenA, address tokenB, address hookAddress, uint amountA, uint amountB, uint tokenID, uint fees0, uint fees1) public payable returns (bool)
   {
      
      //modifyLiquidity
      
      /// @notice Sorted token addresses (token0 must be < token1)
      (address token0, address token1) = tokenA < tokenB
         ? (tokenA, tokenB)
         : (tokenB, tokenA);
      
      /// @notice Sorted token amounts based on token ordering
      (uint256 amount0, uint256 amount1) = tokenA < tokenB
         ? (amountA, amountB)
         : (amountB, amountA);
      
      /// @notice Sorted fee amounts based on token ordering
      (uint fees0a, uint fees1a) = tokenA < tokenB
         ? (fees0, fees1)
         : (fees1, fees0);

      /// @notice Approve permit2 for maximum allowance
      IERC20(token0).approve(address(permit2), type(uint256).max);
      IERC20(token1).approve(address(permit2), type(uint256).max);
      IPermit2(permit2).approve(token0, address(positionManager), type(uint160).max, uint48(block.timestamp)+60*60*1);
      IPermit2(permit2).approve(token1, address(positionManager), type(uint160).max, uint48(block.timestamp)+60*60*1);
      
      // Transfer tokens from sender only if amount > fees
      if(amount0 > fees0a) {
         IERC20(token0).transferFrom(msg.sender, address(this), amount0-fees0a);
      }

      if(amount1 > fees1a) {
         IERC20(token1).transferFrom(msg.sender, address(this), amount1-fees1a);
      }

      /// @notice Pool key structure for the token pair
      PoolKey memory poolKey = PoolKey(Currency.wrap(address(token0)), Currency.wrap(token1), 0x800000, 60, IHooks(hookAddress));
      /// @notice Pool ID derived from pool key
      bytes32 idz = toId(poolKey);
      
      /// @notice Current sqrt price from pool state
      (uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);
      // Convert ticks to sqrtPriceX96 values
      // Convert specific ticks to sqrtPriceX96 values
      /// @notice Lower tick for full range position
      int24 tickLower = -887220; // Your desired lower tick
      /// @notice Upper tick for full range position
      int24 tickUpper = 887220;  // Your desired upper tick

      // Convert ticks to sqrtPriceX96 values
      /// @notice Sqrt ratio at lower tick
      uint160 sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
      /// @notice Sqrt ratio at upper tick
      uint160 sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);

      /// @notice Calculated liquidity delta for the given amounts
      uint liquidityDelta = getLiquidityForAmounts(
         sqrtPricex96,
         sqrtRatioAX96,
         sqrtRatioBX96,
         amount0,
         amount1
      );
      
      
      /// @notice Parameters for position manager actions
      bytes[] memory params = new bytes[](2); // new bytes[](3) for ETH liquidity positions

      params[0] = abi.encode(tokenID, liquidityDelta, amount0, amount1, bytes(""));

      /// @notice Currency wrapper for token0
      Currency currency0 = Currency.wrap(token0); // tokenAddress1 = 0 for native ETH
      /// @notice Currency wrapper for token1
      Currency currency1 = Currency.wrap(token1);

      params[1] = abi.encode(currency0, currency1); //settle pair
      /// @notice Actions to perform: increase liquidity and settle pair
      bytes memory actions = abi.encodePacked(uint8(0x00), uint8(0x0d));
      // Cap remaining fees to avoid claiming more than available
      /// @notice Remaining fees for token0 after liquidity increase
      uint256 remainingFees0 = fees0a > amount0 ? fees0a - amount0 : 0;
      /// @notice Remaining fees for token1 after liquidity increase
      uint256 remainingFees1 = fees1a > amount1 ? fees1a - amount1 : 0;

      // Only use TAKE_PAIR if there are actually remaining fees to claim
      if((remainingFees0 > 0 || remainingFees1 > 0)){
         params = new bytes[](3); 
         //need to take pair not settle pair
         /// @notice Updated actions for closing currencies when fees remain
         actions = abi.encodePacked(
            uint8(0x00),  // INCREASE_LIQUIDITY
            uint8(0x12),  // CLOSE_CURRENCY
            uint8(0x12)   // CLOSE_CURRENCY
         );
         params[0] = abi.encode(tokenID, liquidityDelta, amount0, amount1, bytes(""));
         params[1] = abi.encode(Currency.wrap(token0));  // Close token0
         params[2] = abi.encode(Currency.wrap(token1));  // Close token1
      }

      /// @notice Transaction deadline
      uint256 deadline = block.timestamp + 160;

      /// @notice ETH value to pass to position manager
      uint256 valueToPass = msg.value;

      positionManager.modifyLiquidities{value: valueToPass}(
         abi.encode(actions, params),
         deadline
      );

      /// @notice Return any remaining token0 balance to sender
      uint token0Balance = IERC20(token0).balanceOf(address(this));
      /// @notice Return any remaining token1 balance to sender
      uint token1Balance = IERC20(token1).balanceOf(address(this));
      if(token0Balance>0){
         IERC20(token0).transfer(msg.sender, token0Balance);
      }
      if(token1Balance>0){
         IERC20(token1).transfer(msg.sender, token1Balance);
      }
      //  emit PositionCreated(nextID);
      return true;
   }
   
   
   /// @notice Decreases liquidity from an existing position by a specified percentage
   /// @param percentagedivby10000 Percentage to remove divided by 10000 (e.g., 2500 = 25%)
   /// @param tokenA Address of the first token in the pair
   /// @param tokenB Address of the second token in the pair
   /// @param hookAddress Address of the hook contract for the pool
   /// @param amount0_min Minimum amount of token0 to receive
   /// @param amount1_min Minimum amount of token1 to receive
   /// @param tokenID ID of the position to decrease liquidity from
   /// @return bool Returns true if liquidity decrease is successful
   function decreaseLiqTwoTokens(uint percentagedivby10000, address tokenA, address tokenB, address hookAddress, uint256 amount0_min, uint amount1_min, uint tokenID) public returns (bool){
      // Check if NFT is full-range
      /// @notice Current liquidity amount in the position
      ( uint128 liquidity ) = 
         positionManager.getPositionLiquidity(tokenID);
      /// @notice Amount of liquidity to remove based on percentage
      uint liqtoRemove = liquidity * percentagedivby10000 / 10000;

      //modifyLiquidity
      /// @notice Sorted token addresses (token0 must be < token1)
      (address token0, address token1) = tokenA < tokenB
         ? (tokenA, tokenB)
         : (tokenB, tokenA);
      
      /// @notice Sorted minimum amounts based on token ordering
      (uint amountA_min, uint amountB_min) = tokenA < tokenB
         ? (amount0_min, amount1_min)
         : (amount1_min, amount0_min);

      //bytes memory actions = abi.encodePacked(uint8(Actions.DECREASE_LIQUIDITY), uint8(Actions.TAKE_PAIR));
      //DECREASE_LIQUIDITY = 0x01,
      // TAKE_PAIR = 0x11,
      /// @notice Actions to perform: decrease liquidity and take pair
      bytes memory actions = abi.encodePacked(uint8(0x01), uint8(0x11));
      /// @notice Parameters for position manager actions
      bytes[] memory params = new bytes[](2); //for take pair
      //bytes[] memory params = new bytes[](3); // new bytes[](3) for ETH liquidity positions
      params[0] = abi.encode(tokenID, liqtoRemove, amountA_min, amountB_min, bytes(""));
      /// @notice Currency wrapper for token0
      Currency currency0 = Currency.wrap(token0); // tokenAddress1 = 0 for native ETH
      /// @notice Currency wrapper for token1
      Currency currency1 = Currency.wrap(token1);
      params[1] = abi.encode(currency0, currency1, msg.sender); //take pair
      //For ETH see 2 tokens @ https://docs.uniswap.org/contracts/v4/quickstart/manage-liquidity/increase-liquidity
      //_toCurrency params[2] = abi.encode(currency0, address(this)); //sweep
      /// @notice Transaction deadline
      uint256 deadline = block.timestamp + 160;



      positionManager.modifyLiquidities{value: 0}(
         abi.encode(actions, params),
         deadline
      );
      //  emit PositionCreated(nextID);
      return true;
   }

   */
   
  
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
    function toUint128(int128 x) internal pure returns (uint128 y)
    {
        if (x < 0) revert("under 0");
        y = uint128(x);
    }

    /// @notice Cast a uint256 to a uint128, revert on overflow
    /// @param x The uint256 to be downcasted
    /// @return y The downcasted integer, now type uint128
    function toUint128(uint256 x) internal pure returns (uint128 y)
    {
        y = uint128(x);
        if (x != y) revert("not equal");
    }


    /// @notice Computes the amount of liquidity received for a given amount of token0 and price range
    /// @dev Calculates amount0 * (sqrt(upper) * sqrt(lower)) / (sqrt(upper) - sqrt(lower))
    /// @param sqrtPriceAX96 A sqrt price representing the first tick boundary
    /// @param sqrtPriceBX96 A sqrt price representing the second tick boundary
    /// @param amount0 The amount0 being sent in
    /// @return liquidity The amount of returned liquidity
    function getLiquidityForAmount0(uint160 sqrtPriceAX96, uint160 sqrtPriceBX96, uint256 amount0) internal pure returns (uint128 liquidity)
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
    function getLiquidityForAmount1(uint160 sqrtPriceAX96, uint160 sqrtPriceBX96, uint256 amount1) internal pure returns (uint128 liquidity)
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
    function getLiquidityForAmounts(uint160 sqrtPriceX96, uint160 sqrtPriceAX96, uint160 sqrtPriceBX96, uint256 amount0, uint256 amount1) public pure returns (uint128 liquidity)
    {
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

   /// @notice Returns the next available token ID from the position manager
   /// @return uint256 The next token ID that will be minted
   function nextIDis() public view returns (uint256){
      return positionManager.nextTokenId();
   }

   /// @notice Calculates the price ratio from sqrtPriceX96 with specified decimal precision
   /// @dev Clean implementation using MulDiv for overflow-safe calculations
   /// @param sqrtPriceX96 The sqrt price in X96 format from Uniswap V4
   /// @param decimals Number of decimal places for the returned price ratio
   /// @return priceRatio The price ratio scaled by 10^decimals
   function getPriceRatioWithDecimals(uint160 sqrtPriceX96, uint8 decimals) public pure returns (uint256 priceRatio) {
      if (sqrtPriceX96 == 0) return 0;
      
      /// @notice Convert sqrtPriceX96 to uint256 for calculations
      uint256 sqrtPrice = uint256(sqrtPriceX96);
      /// @notice Decimal multiplier for final price scaling
      uint256 multiplier = 10 ** decimals;
      
      // Calculate price = (sqrtPriceX96^2 * 10^decimals) / 2^192
      // Using MulDiv for safe high-precision arithmetic
      
      // First: sqrtPrice^2
      /// @notice Price in X192 format (sqrtPrice squared)
      uint256 priceX192 = sqrtPrice * sqrtPrice; // This is safe with your corrected values
      
      // Second: MulDiv(priceX192, multiplier, 2^192)
      /// @notice Q192 constant representing 2^192 for price conversion
      uint256 Q192 = 1 << 192;
      /// @notice Final price ratio calculation using safe math
      priceRatio = mulDiv(priceX192, multiplier, Q192);
      
      return priceRatio;
   }


   /// @notice Gets the price ratio and token information for a token pair
   /// @param token Address of the first token
   /// @param token2 Address of the second token
   /// @param hookAddress Address of the hook contract for the pool
   /// @return ratio Price ratio scaled to 18 decimals
   /// @return token0z Address of token0 (lower address)
   /// @return token1z Address of token1 (higher address)
   /// @return token0decimals Decimal places of token0
   /// @return token1decimals Decimal places of token1
   function getPriceRatio(address token, address token2, address hookAddress) public view returns (uint ratio, address token0z, address token1z, uint8 token0decimals, uint8 token1decimals) {
      
      // Determine correct token ordering for the pool
      /// @notice Sorted token addresses (token0 must be < token1)
      (address token0, address token1) = token < token2
         ? (token, token2)
         : (token2, token);
      
      /// @notice Pool key structure for the token pair
      PoolKey memory poolKey = PoolKey(Currency.wrap(token0), Currency.wrap(token1), 0x800000, 60, IHooks(hookAddress));
      /// @notice Pool ID derived from pool key
      bytes32 idz = toId(poolKey);
      
      /// @notice Current sqrt price from pool state
      (uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);
      /// @notice Price ratio scaled to 18 decimal places
      uint priceRatiox18decimals2 = getPriceRatioWithDecimals(sqrtPricex96, 18);
      /// @notice Decimal places of token0
      token0decimals = IERC20(token0).decimals();
      /// @notice Decimal places of token1
      token1decimals = IERC20(token1).decimals();
      token0z=token0;
      token1z=token1;
      return (priceRatiox18decimals2, token0, token1, token0decimals, token1decimals);
   }
   
   
   /// @notice Gets the current sqrt price in X96 format for a token pair
   /// @param token Address of the first token
   /// @param token2 Address of the second token
   /// @param hookAddress Address of the hook contract for the pool
   /// @return uint160 The sqrt price in X96 format
   function getsqrtPricex96(address token, address token2, address hookAddress)public view returns(uint160)
   {
      // Determine correct token ordering for the pool
      /// @notice Sorted token addresses (token0 must be < token1)
      (address token0, address token1) = token < token2
         ? (token, token2)
         : (token2, token);
      // Create PoolKey with correctly ordered tokens
      /// @notice Pool key structure with ordered tokens and parameters
      PoolKey memory poolKey = PoolKey(
         Currency.wrap(token0), 
         Currency.wrap(token1), 
         0x800000, 
         60, 
         IHooks(hookAddress)
      );
      
      /// @notice Pool ID derived from pool key
      bytes32 idz = toId(poolKey);
      
      /// @notice Current sqrt price from pool state in X96 format
      (uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);
      return sqrtPricex96;
   }


   /// @notice Creates a new liquidity position with two tokens
   /// @param token Address of the first token
   /// @param token2 Address of the second token
   /// @param amountIn Amount of first token to deposit
   /// @param amountIn2 Amount of second token to deposit
   /// @param currentx96 Expected sqrtPriceX96 when user initiated transaction
   /// @param slippage Slippage tolerance in basis points (e.g., 100 = 1%)
   /// @param hookAddress Address of the hook contract for the pool
   /// @param toSendNFTto Address to receive the NFT representing the position
   /// @return bool Returns true if position creation is successful
   function createPositionWith2Tokens(address token, address token2, uint256 amountIn, uint256 amountIn2, uint currentx96, uint256 slippage, address hookAddress, address toSendNFTto) public payable returns (bool)
   {

      // Determine correct token ordering for the pool
      /// @notice Sorted token addresses (token0 must be < token1)
      (address token0, address token1) = token < token2
         ? (token, token2)
         : (token2, token);
      
      // Reorder amounts to match token ordering
      /// @notice Sorted token amounts based on token ordering
      (uint256 amount0, uint256 amount1) = token < token2
         ? (amountIn, amountIn2)
         : (amountIn2, amountIn);

      /*     For when using two tokens do this
         (address token0, address token1) = tokenA < tokenB
               ? (tokenA, tokenB)
               : (tokenB, tokenA);
         
         (amountA, amountB) = tokenA < tokenB
               ? (amountA, amountB)
               : (amountB, amountA);
         */

      // Transfer tokens from sender
      IERC20(token0).transferFrom(msg.sender, address(this), amount0);
      
      // Transfer tokens from sender
      IERC20(token1).transferFrom(msg.sender, address(this), amount1);
      

      // Step 1: Your contract approves Permit2 to spend the tokens (standard ERC20 approve)
      IERC20(token0).approve(permit2, amount0);
      IERC20(token1).approve(permit2, amount1);

      IPermit2(permit2).approve(token0, address(positionManager), type(uint160).max, uint48(block.timestamp)+60*60*1);
      IPermit2(permit2).approve(token1, address(positionManager), type(uint160).max, uint48(block.timestamp)+60*60*1);
      
      // Create PoolKey with correctly ordered tokens
      /// @notice Pool key structure with ordered tokens and parameters
      PoolKey memory poolKey = PoolKey(
         Currency.wrap(token0), 
         Currency.wrap(token1), 
         0x800000, 
         60, 
         IHooks(hookAddress)
      );
      
      /// @notice Pool ID derived from pool key
      bytes32 idz = toId(poolKey);
      
      /// @notice Current sqrt price from pool state
      (uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);

      // SLIPPAGE PROTECTION: Check if price has moved too much
      /// @notice Maximum allowed slippage in basis points
      uint256 maxSlippageBps = slippage; // e.g., 100 = 1%, 500 = 5%
      /// @notice Expected price when transaction was initiated
      uint256 expectedPrice = uint256(currentx96);
      /// @notice Current actual price from the pool
      uint256 actualPrice = uint256(sqrtPricex96);
      
      // Calculate acceptable price range
      /// @notice Minimum acceptable price considering slippage
      uint256 minAcceptablePrice = (expectedPrice * (10000 - maxSlippageBps)) / 10000;
      /// @notice Maximum acceptable price considering slippage
      uint256 maxAcceptablePrice = (expectedPrice * (10000 + maxSlippageBps)) / 10000;
      
      require(
         actualPrice >= minAcceptablePrice && actualPrice <= maxAcceptablePrice,
         "Price moved beyond slippage tolerance"
      );

      // Convert ticks to sqrtPriceX96 values
      // Convert specific ticks to sqrtPriceX96 values
      /// @notice Lower tick for full range position
      int24 tickLower = -887220; // Your desired lower tick
      /// @notice Upper tick for full range position
      int24 tickUpper = 887220;  // Your desired upper tick

      // Convert ticks to sqrtPriceX96 values
      /// @notice Sqrt ratio at lower tick
      uint160 sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
      /// @notice Sqrt ratio at upper tick
      uint160 sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);

      /// @notice Calculated liquidity delta for the given amounts
      uint liquidityDelta = getLiquidityForAmounts(
         sqrtPricex96,
         sqrtRatioAX96,
         sqrtRatioBX96,
         amount0,
         amount1
      );
   
      // For ETH liquidity positions
         
      // Actions
      // MINT_POSITION = 0x02,
      // SETTLE_PAIR = 0x0d,
      //SWEEP = 0x14,
      /// @notice Actions to perform: mint position and settle pair
      bytes memory actions = new bytes(2);
      actions[0] = bytes1(0x02); // MINT_POSITION
      actions[1] = bytes1(0x0d);    // SETTLE_PAIR = 0x0d,
      //  actions[2] = bytes1(0x14); // SWEEP NO ETH NO SWEEP
      //actions[3] = bytes1(0x16); // UNWRAP

      /// @notice Parameters for position manager actions
      bytes[] memory params = new bytes[](2); // new bytes[](3) for ETH liquidity positions
      params[0] = abi.encode(poolKey, MIN_TICK, MAX_TICK, liquidityDelta-1, amount0, amount1, toSendNFTto, bytes(""));
      params[1] = abi.encode(token0, token1);
      //  params[2] = abi.encode(address(0), msg.sender); // NO ETH NO SWEEP

      /// @notice Transaction deadline
      uint256 deadline = block.timestamp + 160;

      /// @notice ETH value to pass (0 for ERC20 tokens)
      uint256 valueToPass = 0;

      /// @notice Next token ID that will be minted
      uint nextID = nextIDis();
      positionManager.modifyLiquidities{value: 0}(
         abi.encode(actions, params),
         deadline
      );

      emit PositionCreated(nextID);


       uint token0Value = IERC20(token0).balanceOf(address(this));
       /// @notice Balance of output token in contract
       uint token1Value = IERC20(token1).balanceOf(address(this));
       if(token0Value >0){
           IERC20(token0).transfer(toSendNFTto, token0Value);
       }
       if(token1Value >0)
       {
           IERC20(token1).transfer(toSendNFTto, token1Value);
       }


      return true;
   }


   /// @notice Collects accumulated fees from a Uniswap V4 position
   /// @param tokenId The ID of the position to collect fees from
   /// @param token Address of the ERC20 token in the ETH/token pair
   /// @param feesGoToWho Address to receive the collected fees
   /// @return bool Returns true if fee collection is successful
   function getUnsiwapv4Fees(uint tokenId, address token, address feesGoToWho) public payable returns (bool)
   {
      // For ETH liquidity positions
         
      // Actions
      // MINT_POSITION = 0x02,
      // SETTLE_PAIR = 0x0d,
      //SWEEP = 0x14,
      /// @notice Currency wrapper for native ETH
      Currency currency0 = Currency.wrap(address(0)); // tokenAddress1 = 0 for native ETH
      /// @notice Currency wrapper for the ERC20 token
      Currency currency1 = Currency.wrap(token);
      /// @notice Parameters for position manager actions
      bytes[] memory params = new bytes[](2);
      /// @notice Actions to perform: decrease liquidity (0) and take pair
      bytes memory actions = abi.encodePacked(uint8(0x01), uint8(0x11));/// @dev collecting fees is achieved with liquidity=0, the second parameter
      params[0] = abi.encode(tokenId, 0, 0, 0, bytes(""));
      params[1] = abi.encode(currency0, currency1, feesGoToWho);
      /// @notice Transaction deadline
      uint256 deadline = block.timestamp + 160;
      /// @notice Next token ID that will be minted
      
      positionManager.modifyLiquidities{value: 0}(
         abi.encode(actions, params),
         deadline
      );
      return true;
   }


   /// @notice Mask for extracting 32-bit offset or length values from encoded data
   uint256 constant OFFSET_OR_LENGTH_MASK = 0xffffffff;
   /// @notice Mask for word-aligned offset or length values (32-byte aligned)
   uint256 constant OFFSET_OR_LENGTH_MASK_AND_WORD_ALIGN = 0xffffffe0;
   /// @notice equivalent to SliceOutOfBounds.selector, stored in least-significant bits
   uint256 constant SLICE_ERROR_SELECTOR = 0x3b99b53d;
   
   /// @notice Decode the `_arg`-th element in `_bytes` as `bytes`
   /// @param _bytes The input bytes string to extract a bytes string from
   /// @param _arg The index of the argument to extract
   /// @return res The extracted bytes string as calldata
   function toBytes(bytes calldata _bytes, uint256 _arg) internal pure returns (bytes calldata res)
   {
      uint256 length;
      assembly ("memory-safe") {
         // The offset of the `_arg`-th element is `32 * arg`, which stores the offset of the length pointer.
         // shl(5, x) is equivalent to mul(32, x)
         let lengthPtr :=
            add(_bytes.offset, and(calldataload(add(_bytes.offset, shl(5, _arg))), OFFSET_OR_LENGTH_MASK))
         // the number of bytes in the bytes string
         length := and(calldataload(lengthPtr), OFFSET_OR_LENGTH_MASK)
         // the offset where the bytes string begins
         let offset := add(lengthPtr, 0x20)
         // assign the return parameters
         res.length := length
         res.offset := offset
         // if the provided bytes string isnt as long as the encoding says, revert
         if lt(add(_bytes.length, _bytes.offset), add(length, offset)) {
            mstore(0, SLICE_ERROR_SELECTOR)
            revert(0x1c, 4)
         }
      }
   }
   
   /// @notice Decodes mint position parameters from encoded bytes
   /// @dev equivalent to: abi.decode(params, (PoolKey, int24, int24, uint256, uint128, uint128, address, bytes)) in calldata
   /// @param params The encoded parameters as calldata bytes
   /// @return poolKey The pool key structure
   /// @return tickLower The lower tick boundary
   /// @return tickUpper The upper tick boundary
   /// @return liquidity The amount of liquidity
   /// @return amount0Max Maximum amount of token0
   /// @return amount1Max Maximum amount of token1
   /// @return owner The position owner address
   /// @return hookData Additional hook data as bytes
   function decodeMintParams(bytes calldata params) internal pure returns (
         PoolKey calldata poolKey,
         int24 tickLower,
         int24 tickUpper,
         uint256 liquidity,
         uint128 amount0Max,
         uint128 amount1Max,
         address owner,
         bytes calldata hookData
      )
   {
      // no length check performed, as there is a length check in `toBytes`
      assembly ("memory-safe") {
         poolKey := params.offset
         tickLower := calldataload(add(params.offset, 0xa0))
         tickUpper := calldataload(add(params.offset, 0xc0))
         liquidity := calldataload(add(params.offset, 0xe0))
         amount0Max := calldataload(add(params.offset, 0x100))
         amount1Max := calldataload(add(params.offset, 0x120))
         owner := calldataload(add(params.offset, 0x140))
      }
      hookData = toBytes(params, 11); // Changed from params.toBytes(11) to toBytes(params, 11)
   }


   /// @notice Calculates token amounts for a percentage of liquidity in a position
   /// @param token Address of the first token in the pair
   /// @param token2 Address of the second token in the pair
   /// @param percentagedivby10000 Percentage of liquidity divided by 10000 (e.g., 2500 = 25%)
   /// @param tokenID ID of the position to calculate amounts for
   /// @param HookAddress Address of the hook contract for the pool
   /// @return amount0 Amount of token0 for the specified liquidity percentage
   /// @return amount1 Amount of token1 for the specified liquidity percentage
   function getAmount0andAmount1forLiquidityPercentage(address token, address token2, uint128 percentagedivby10000, uint tokenID, address HookAddress) public view returns (uint amount0, uint amount1)
   {
      // Determine correct token ordering for the pool
      /// @notice Sorted token addresses (token0 must be < token1)
      (address token0, address token1) = token < token2
         ? (token, token2)
         : (token2, token);
      
      /// @notice Lower tick for full range position
      int24 tickLower = -887220; // Your desired lower tick
      /// @notice Upper tick for full range position
      int24 tickUpper = 887220;  // Your desired upper tick
      // Convert ticks to sqrtPriceX96 values
      /// @notice Sqrt ratio at lower tick
      uint160 sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
      /// @notice Sqrt ratio at upper tick
      uint160 sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);
      /// @notice Pool key structure for the token pair
      PoolKey memory poolKey = PoolKey(
         Currency.wrap(address(token0)), 
         Currency.wrap(address(token1)), 
         0x800000, 
         60, 
         IHooks(HookAddress)
      );
      /// @notice Pool ID derived from pool key
      bytes32 idz = toId(poolKey);
      
      /// @notice Current sqrt price from pool state
      (uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);
      // Check if NFT is full-range
      /// @notice Current liquidity amount in the position
      ( uint128 liquidity ) = 
         positionManager.getPositionLiquidity(tokenID);
      /// @notice Amount of liquidity for the specified percentage
      uint128 liqtoRemove = liquidity * percentagedivby10000 / 10000;
      amount0 = getAmount0ForLiquidity(sqrtPricex96,sqrtRatioBX96,  liqtoRemove);
      amount1 = getAmount1ForLiquidity(sqrtRatioAX96,sqrtPricex96,  liqtoRemove);
   }
   
   
   /// @notice Resolution constant for price calculations (96 bits for X96 format)
   uint8 internal constant RESOLUTION = 96;

   /// @notice Calculates the amount of token0 for a given liquidity amount
   /// @param sqrtPriceAX96 Sqrt price at the lower bound in X96 format
   /// @param sqrtPriceBX96 Sqrt price at the upper bound in X96 format
   /// @param liquidity Amount of liquidity to calculate token0 amount for
   /// @return uint Amount of token0 corresponding to the liquidity
   function getAmount0ForLiquidity(uint160 sqrtPriceAX96, uint160 sqrtPriceBX96, uint128 liquidity) public pure returns (uint)
   {
      if (sqrtPriceAX96 > sqrtPriceBX96) (sqrtPriceAX96, sqrtPriceBX96) = (sqrtPriceBX96, sqrtPriceAX96);
      return mulDiv(
         uint256(liquidity) << RESOLUTION, sqrtPriceBX96 - sqrtPriceAX96, sqrtPriceBX96
      ) / sqrtPriceAX96;
   }
   
   
   /// @notice Calculates the amount of token1 for a given liquidity amount
   /// @param sqrtPriceAX96 Sqrt price at the lower bound in X96 format
   /// @param sqrtPriceBX96 Sqrt price at the upper bound in X96 format
   /// @param liquidity Amount of liquidity to calculate token1 amount for
   /// @return amount1 Amount of token1 corresponding to the liquidity
   function getAmount1ForLiquidity(uint160 sqrtPriceAX96, uint160 sqrtPriceBX96, uint128 liquidity)public pure returns (uint256 amount1)
   {
      if (sqrtPriceAX96 > sqrtPriceBX96) (sqrtPriceAX96, sqrtPriceBX96) = (sqrtPriceBX96, sqrtPriceAX96);
      return mulDiv(liquidity, sqrtPriceBX96 - sqrtPriceAX96, Q96);
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





    fallback() external payable {
        // Optional: handle unexpected data
    }

    receive() external payable {
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

