// SPDX-License-Identifier: MIT

// B0x Guess - Contract
//
// (Base Blockchain)
// See contracts below for explanations of functions/variables
//
pragma solidity ^0.8.19;

interface IStateView {
    /// @notice Reads the current slot0 state for a Uniswap v4 pool
    /// @dev Mirrors Uniswap v4's StateView periphery contract; pool state is
    ///      addressed by poolId since v4 pools are not individually deployed
    /// @param poolId The identifier of the pool, computed as keccak256(abi.encode(PoolKey))
    /// @return sqrtPriceX96 The pool's current sqrt price as a Q64.96 value
    /// @return tick The pool's current tick
    /// @return protocolFee The currently active protocol fee for the pool
    /// @return lpFee The currently active LP fee for the pool
    function getSlot0(bytes32 poolId)
        external
        view
        returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee);
}

interface IUniswapV3Pool {
    /// @notice Reads the current slot0 state for a Uniswap v3 pool
    /// @dev Standard Uniswap v3 core interface; unlike v4, each pool is its
    ///      own deployed contract, so slot0() is called directly on it
    /// @return sqrtPriceX96 The pool's current sqrt price as a Q64.96 value
    /// @return tick The pool's current tick
    /// @return observationIndex The index of the last written oracle observation
    /// @return observationCardinality The current maximum number of observations stored
    /// @return observationCardinalityNext The next maximum number of observations to store
    /// @return feeProtocol The protocol fee for both tokens of the pool
    /// @return unlocked Whether the pool is currently unlocked (reentrancy guard)
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );
}

// ============================================================
// Vendored, hand-written reimplementation of Chainlink's
// VRF v2.5 direct-funding interfaces + base contract.
// NOT the official audited package. Prefer `npm install
// @chainlink/contracts` if at all possible, especially for
// a contract handling real mainnet funds.
// ============================================================

interface LinkTokenInterface {
    /// @notice Returns the remaining allowance `spender` has to spend on behalf of `owner`
    /// @param owner The address that owns the tokens
    /// @param spender The address approved to spend on the owner's behalf
    /// @return remaining The remaining allowance
    function allowance(address owner, address spender) external view returns (uint256 remaining);

    /// @notice Approves `spender` to spend up to `value` tokens on the caller's behalf
    /// @param spender The address being approved
    /// @param value The amount approved
    /// @return success True if the approval succeeded
    function approve(address spender, uint256 value) external returns (bool success);

    /// @notice Returns the LINK balance of `owner`
    /// @param owner The address to query
    /// @return balance The token balance of `owner`
    function balanceOf(address owner) external view returns (uint256 balance);

    /// @notice Returns the number of decimals used by the token
    /// @return decimalPlaces The number of decimals
    function decimals() external view returns (uint8 decimalPlaces);

    /// @notice Returns the token name
    /// @return tokenName The name of the token
    function name() external view returns (string memory tokenName);

    /// @notice Returns the token symbol
    /// @return tokenSymbol The symbol of the token
    function symbol() external view returns (string memory tokenSymbol);

    /// @notice Returns the total token supply
    /// @return totalTokensIssued The total supply of the token
    function totalSupply() external view returns (uint256 totalTokensIssued);

    /// @notice Transfers `value` tokens to `to`
    /// @param to The recipient address
    /// @param value The amount to transfer
    /// @return success True if the transfer succeeded
    function transfer(address to, uint256 value) external returns (bool success);

    /// @notice Transfers `value` tokens to `to` and calls `to` with `data`
    /// @dev Used by the VRF wrapper flow to fund a request and pass request
    ///      parameters to the receiving contract in a single call
    /// @param to The recipient/receiving contract address
    /// @param value The amount to transfer
    /// @param data Calldata forwarded to `to` after the transfer
    /// @return success True if the transfer and call succeeded
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool success);

    /// @notice Transfers `value` tokens from `from` to `to`, using the caller's allowance
    /// @param from The address to debit
    /// @param to The address to credit
    /// @param value The amount to transfer
    /// @return success True if the transfer succeeded
    function transferFrom(address from, address to, uint256 value) external returns (bool success);
}

interface IVRFV2PlusWrapper {
    /// @notice Returns the request ID of the most recently made VRF request
    /// @return The last request ID
    function lastRequestId() external view returns (uint256);

    /// @notice Calculates the LINK price for a VRF request with the given callback settings
    /// @param _callbackGasLimit Gas limit for the fulfillRandomWords callback
    /// @param _numWords Number of random words requested
    /// @return The request price, denominated in LINK
    function calculateRequestPrice(uint32 _callbackGasLimit, uint32 _numWords) external view returns (uint256);

    /// @notice Calculates the native-token price for a VRF request with the given callback settings
    /// @param _callbackGasLimit Gas limit for the fulfillRandomWords callback
    /// @param _numWords Number of random words requested
    /// @return The request price, denominated in the chain's native token
    function calculateRequestPriceNative(uint32 _callbackGasLimit, uint32 _numWords) external view returns (uint256);

    /// @notice Requests random words, paying in the chain's native token
    /// @param _callbackGasLimit Gas limit for the fulfillRandomWords callback
    /// @param _requestConfirmations Number of block confirmations to wait before fulfillment
    /// @param _numWords Number of random words requested
    /// @param extraArgs ABI-encoded extra arguments (e.g. payment-in-native tag)
    /// @return requestId The ID of the newly created VRF request
    function requestRandomWordsInNative(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords,
        bytes calldata extraArgs
    ) external payable returns (uint256 requestId);

    /// @notice Returns the LINK token address used by this wrapper
    /// @return The LINK token contract address
    function link() external view returns (address);
}

library VRFV2PlusClient {
    /// @notice Selector-like tag identifying the ExtraArgsV1 encoding
    bytes4 public constant EXTRA_ARGS_V1_TAG = bytes4(keccak256("VRF ExtraArgsV1"));

    /// @notice Extra arguments accepted by VRF v2.5 requests
    /// @dev nativePayment selects payment in the chain's native token instead of LINK
    struct ExtraArgsV1 {
        bool nativePayment;
    }

    /// @notice ABI-encodes `extraArgs` with the ExtraArgsV1 tag prefix
    /// @dev Used to build the `extraArgs` bytes expected by requestRandomWordsInNative
    /// @param extraArgs The extra args struct to encode
    /// @return ABI-encoded bytes ready to pass as a VRF request's extraArgs
    function _argsToBytes(ExtraArgsV1 memory extraArgs) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(EXTRA_ARGS_V1_TAG, extraArgs);
    }
}

abstract contract VRFV2PlusWrapperConsumerBase {
    /// @notice The LINK token used to pay for VRF requests
    LinkTokenInterface internal immutable i_link;

    /// @notice The VRF v2.5 direct-funding wrapper contract
    IVRFV2PlusWrapper public immutable i_vrfV2PlusWrapper;

    /// @notice Sets the VRF wrapper and derives the LINK token address from it
    /// @param _vrfV2PlusWrapper Address of the VRF v2.5 direct-funding wrapper
    constructor(address _vrfV2PlusWrapper) {
        i_vrfV2PlusWrapper = IVRFV2PlusWrapper(_vrfV2PlusWrapper);
        i_link = LinkTokenInterface(i_vrfV2PlusWrapper.link());
    }

    /// @notice Requests randomness, paying the wrapper in the chain's native token
    /// @param _callbackGasLimit Gas limit for the fulfillRandomWords callback
    /// @param _requestConfirmations Number of block confirmations to wait before fulfillment
    /// @param _numWords Number of random words requested
    /// @param extraArgs ABI-encoded extra arguments for the request
    /// @return requestId The ID of the newly created VRF request
    /// @return requestPrice The native-token price paid for the request
    function requestRandomnessPayInNative(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords,
        bytes memory extraArgs
    ) internal returns (uint256 requestId, uint256 requestPrice) {
        requestPrice = i_vrfV2PlusWrapper.calculateRequestPriceNative(_callbackGasLimit, _numWords);
        requestId = i_vrfV2PlusWrapper.requestRandomWordsInNative{value: requestPrice}(
            _callbackGasLimit,
            _requestConfirmations,
            _numWords,
            extraArgs
        );
    }

    /// @notice Requests randomness, paying the wrapper in LINK via transferAndCall
    /// @param _callbackGasLimit Gas limit for the fulfillRandomWords callback
    /// @param _requestConfirmations Number of block confirmations to wait before fulfillment
    /// @param _numWords Number of random words requested
    /// @param extraArgs ABI-encoded extra arguments for the request
    /// @return requestId The ID of the newly created VRF request
    /// @return requestPrice The LINK price paid for the request
    function requestRandomness(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords,
        bytes memory extraArgs
    ) internal returns (uint256 requestId, uint256 requestPrice) {
        requestPrice = i_vrfV2PlusWrapper.calculateRequestPrice(_callbackGasLimit, _numWords);
        i_link.transferAndCall(
            address(i_vrfV2PlusWrapper),
            requestPrice,
            abi.encode(_callbackGasLimit, _requestConfirmations, _numWords, extraArgs)
        );
        requestId = i_vrfV2PlusWrapper.lastRequestId();
    }

    /// @notice Hook invoked with the fulfilled random words for a request
    /// @dev Must be implemented by the consuming contract; invoked internally
    ///      by rawFulfillRandomWords once the wrapper calls back
    /// @param _requestId The ID of the request being fulfilled
    /// @param _randomWords The random words returned by VRF
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal virtual;

    /// @notice External entrypoint called by the VRF wrapper to deliver randomness
    /// @dev Restricted to the configured wrapper address; forwards to fulfillRandomWords
    /// @param _requestId The ID of the request being fulfilled
    /// @param _randomWords The random words returned by VRF
    function rawFulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) external {
        require(msg.sender == address(i_vrfV2PlusWrapper), "only VRF V2 Plus wrapper can fulfill");
        fulfillRandomWords(_requestId, _randomWords);
    }
}

/// @title MulDiv
/// @notice Full precision multiplication-division: computes floor(a * b / denominator)
///         without intermediate overflow, and reverts if the result doesn't fit in 256 bits
///         or if denominator is zero.
library MulDiv {
    /// @dev Calculates floor(x * y / denominator) with full precision.
    ///      Based on the well-known 512-bit mulDiv technique (Uniswap / OpenZeppelin style).
    /// @param x The multiplicand
    /// @param y The multiplier
    /// @param denominator The divisor
    /// @return result The 256-bit result of floor(x * y / denominator)
    function mulDiv(uint256 x, uint256 y, uint256 denominator) internal pure returns (uint256 result) {
        unchecked {
            // 512-bit multiply [prod1 prod0] = x * y.
            // Compute the product mod 2**256 and mod 2**256 - 1
            // then use the Chinese Remainder Theorem to reconstruct
            // the 512 bit result. The result is stored in two 256
            // variables such that product = prod1 * 2**256 + prod0.
            uint256 prod0; // Least significant 256 bits of the product
            uint256 prod1; // Most significant 256 bits of the product
            assembly {
                let mm := mulmod(x, y, not(0))
                prod0 := mul(x, y)
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }

            // Handle non-overflow cases, 256 by 256 division.
            if (prod1 == 0) {
                require(denominator > 0, "MulDiv: division by zero");
                assembly {
                    result := div(prod0, denominator)
                }
                return result;
            }

            // Make sure the result is less than 2**256.
            // Also prevents denominator == 0.
            require(denominator > prod1, "MulDiv: overflow / division by zero");

            ///////////////////////////////////////////////
            // 512 by 256 division.
            ///////////////////////////////////////////////

            // Make division exact by subtracting the remainder from [prod1 prod0].
            uint256 remainder;
            assembly {
                // Compute remainder using mulmod.
                remainder := mulmod(x, y, denominator)

                // Subtract 256 bit number from 512 bit number.
                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }

            // Factor powers of two out of denominator and compute largest
            // power of two divisor of denominator. Always >= 1.
            uint256 twos = denominator & (~denominator + 1);
            assembly {
                // Divide denominator by twos.
                denominator := div(denominator, twos)

                // Divide [prod1 prod0] by twos.
                prod0 := div(prod0, twos)

                // Flip twos such that it is 2**256 / twos.
                // If twos is zero, then it becomes one.
                twos := add(div(sub(0, twos), twos), 1)
            }

            // Shift in bits from prod1 into prod0.
            prod0 |= prod1 * twos;

            // Invert denominator mod 2**256. Since denominator is now odd,
            // it has an inverse modulo 2**256 such that denominator * inv ≡ 1 mod 2**256.
            // Compute the inverse by starting with a seed that is correct for
            // four bits. That is, denominator * inv ≡ 1 mod 2**4.
            uint256 inverse = (3 * denominator) ^ 2;

            // Use the Newton-Raphson iteration to improve the precision.
            // Thanks to Hensel's lifting lemma, this also works in modular
            // arithmetic, doubling the correct bits in each step.
            inverse *= 2 - denominator * inverse; // inverse mod 2**8
            inverse *= 2 - denominator * inverse; // inverse mod 2**16
            inverse *= 2 - denominator * inverse; // inverse mod 2**32
            inverse *= 2 - denominator * inverse; // inverse mod 2**64
            inverse *= 2 - denominator * inverse; // inverse mod 2**128
            inverse *= 2 - denominator * inverse; // inverse mod 2**256

            // Because the division is now exact, we can divide by multiplying
            // with the modular inverse of denominator, and get the final result.
            result = prod0 * inverse;
            return result;
        }
    }

    /// @dev Same as {mulDiv}, but rounds the result up instead of down (ceiling division).
    /// @param x The multiplicand
    /// @param y The multiplier
    /// @param denominator The divisor
    /// @return result The 256-bit result of ceil(x * y / denominator)
    function mulDivRoundingUp(uint256 x, uint256 y, uint256 denominator) internal pure returns (uint256 result) {
        result = mulDiv(x, y, denominator);
        unchecked {
            if (mulmod(x, y, denominator) > 0) {
                require(result < type(uint256).max, "MulDiv: overflow on rounding up");
                result += 1;
            }
        }
    }
}

interface IERC20 {
    /// @notice Returns the total token supply
    /// @return The total supply
    function totalSupply() external view returns (uint256);

    /// @notice Returns the token balance of `account`
    /// @param account The address to query
    /// @return The token balance of `account`
    function balanceOf(address account) external view returns (uint256);

    /// @notice Transfers `amount` tokens to `recipient`
    /// @param recipient The recipient address
    /// @param amount The amount to transfer
    /// @return True if the transfer succeeded
    function transfer(address recipient, uint256 amount) external returns (bool);

    /// @notice Returns the remaining allowance `spender` has to spend on behalf of `owner`
    /// @param owner The address that owns the tokens
    /// @param spender The address approved to spend on the owner's behalf
    /// @return The remaining allowance
    function allowance(address owner, address spender) external view returns (uint256);

    /// @notice Approves `spender` to spend up to `amount` tokens on the caller's behalf
    /// @param spender The address being approved
    /// @param amount The amount approved
    /// @return True if the approval succeeded
    function approve(address spender, uint256 amount) external returns (bool);

    /// @notice Transfers `amount` tokens from `sender` to `recipient`, using the caller's allowance
    /// @param sender The address to debit
    /// @param recipient The address to credit
    /// @param amount The amount to transfer
    /// @return True if the transfer succeeded
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /// @notice Emitted when `value` tokens are moved from `from` to `to`
    /// @param from The address tokens were moved from
    /// @param to The address tokens were moved to
    /// @param value The amount transferred
    event Transfer(address indexed from, address indexed to, uint256 value);

    /// @notice Emitted when `owner` approves `spender` to spend `value` tokens
    /// @param owner The address that owns the tokens
    /// @param spender The address approved to spend
    /// @param value The approved amount
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract B0xGuess is VRFV2PlusWrapperConsumerBase {
    // ---------------------------------------------------------------------
    // VRF v2.5 direct-funding config for Base Sepolia.
    // DOUBLE-CHECK these three values against docs.chain.link (VRF v2.5 ->
    // Supported Networks -> Base Sepolia) before deploying. If any address
    // or the key hash has an extra/missing hex digit, the file simply won't
    // compile, which is your safety net here.
    // ---------------------------------------------------------------------

    /// @notice VRF key hash ("lane") selecting the gas price tier for randomness requests
    /// @dev Set once in the constructor; see the config warning above before changing networks
    bytes32 internal keyHash;

    /// @notice Gas limit forwarded to the fulfillRandomWords callback
    /// @dev Tune to the actual gas used by fulfillRandomWords
    uint32 public callbackGasLimit = 200000;

    /// @notice Number of block confirmations the VRF wrapper waits before fulfilling a request
    /// @dev Network minimum is 0, maximum is 200
    uint16 public requestConfirmations = 3;

    /// @notice Number of random words requested per VRF call
    uint32 public numWords = 1;

    /// @notice Current LINK rebate amount subsidized per qualifying bet
    /// @dev Starting rebate amount in LINK (18 decimals); adjustable via setFreeBetLink(),
    ///      bounded below by FREE_BET_LINK_FLOOR
    uint256 public FreeBetLink = 0.001 * 10 ** 18;

    // ── Modifiers ──────────────────────────────────────────────

    // MUST CHANGE BACK TO 50 * 10 ** 18 for launch
    /// @notice Fixed per-position amount owed in B0x, used as the baseline before price-based adjustment
    /// @dev NOTE: currently set to a non-launch value per the warning above; verify before deploying
    uint256 private constant AmountWeOWE_PER_POSITION_Constant = (50 * 10 ** 18);

    /// @notice Currently committed per-position amount owed in B0x, updated via the checkpoint mechanism
    /// @dev Starts equal to AmountWeOWE_PER_POSITION_Constant; see setAmountWeOwePerPosition()
    uint256 public AmountWeOWE_PER_POSITION2 = (50 * 10 ** 18);

    /// @notice Address authorized to call owner-gated functions
    address public owner = 0x89dee55c9B849B7FB6526322714e7B0F1771D3E0;

    /// @notice Restricts a function to the current owner
    /// @dev Reverts with "Not owner of vault" if msg.sender is not owner
    modifier onlyOwner() {
        if (msg.sender != owner) require(false, "Not owner of vault");
        _;
    }

    /// @notice Transfers ownership of the contract to a new address
    /// @dev Callable only by the current owner
    /// @param newOwner The address to become the new owner; must not be the zero address
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }

    /// @notice The LINK token used to pay for VRF requests and rebates
    LinkTokenInterface internal immutable LINK;

    // ---------------------------------------------------------------------
    // Guess storage (unchanged from original)
    // ---------------------------------------------------------------------

    /// @notice ID of the oldest bet not yet resolved by a VRF callback
    uint256 public betid = 0;

    /// @notice ID that will be assigned to the next new bet placed
    uint256 public betidIN = 0;

    /// @notice Raw randomness result recorded for each bet ID (0-99 range stored in betResults)
    mapping(uint256 => uint256) public betResults;

    /// @notice Block number at which each bet ID was placed
    mapping(uint256 => uint256) public blockNumForBetID;

    /// @notice Amount wagered (in stakedToken) for each bet ID
    mapping(uint256 => uint256) public betAmt;

    /// @notice Guessed number (odds) for each bet ID
    mapping(uint256 => uint256) public betOdds;

    /// @notice Raw VRF random word delivered for each bet ID
    mapping(uint256 => uint256) public randomNumber;

    /// @notice Address that placed each bet ID
    mapping(uint256 => address) public betee;

    /// @notice Amount won (or the fallback minimum) for each bet ID
    mapping(uint256 => uint256) public winnings;

    /// @notice Running lifetime staking profit/loss per address, in stakedToken units
    mapping(address => int) public profitz;

    /// @notice Running lifetime guessing profit/loss per address, in stakedToken units
    mapping(address => int) public profitzGuess;

    /// @notice timestamp of deposit and amount
    mapping(address => uint256) public depositTimestamp;
    
    
    /// @notice Every bet ID placed by a given address, in the order they were placed.
    /// @dev Lets the frontend fetch "my bets" directly instead of scanning the
    ///      whole [0, betidIN) range or filtering event logs. Use
    ///      getUserBetCount()/getUserBetIds() below rather than reading the
    ///      whole array at once for addresses with a long history.
    mapping(address => uint256[]) public userBetIds;

    /// @notice Total stakedToken currently reserved against unresolved bets
    /// @dev Subtracted from the contract's stakedToken balance when computing bankroll
    uint256 public unreleased = 0;

    /// @notice Total supply of the internal staking-share accounting token
    /// @dev Starts at 1 * 10**18 ("1.0" share, in the same 18-decimal scale
    ///      stakeFor()/uOut() use for token amounts) rather than the raw
    ///      integer 1. A raw-integer start meant an early staker's minted
    ///      shares (toAdd = amount * totalSupply / poolBalance) could be a
    ///      tiny integer that displays as 0 under normal 18-decimal
    ///      formatting, even though the underlying value tracked correctly.
    uint256 public totalSupply = 1 * 10 ** 18;

    /// @notice Staking shares held by each address
    mapping(address => uint256) private _balances;

    /// @notice ERC20 token that is staked into and paid out of this contract's bankroll
    IERC20 public stakedToken;

    /// @notice Emitted when `user` stakes `amount` of stakedToken
    /// @param user The staking address
    /// @param amount The amount staked
    event Staked(address indexed user, uint256 amount);

    /// @notice Emitted when `user` withdraws `amount` of stakedToken
    /// @param user The withdrawing address
    /// @param amount The amount withdrawn
    event Withdrawn(address indexed user, uint256 amount);

    /// @notice Emitted when a new guess/bet is placed
    /// @param UsersGuess The number guessed (odds threshold)
    /// @param amount The amount wagered
    /// @param user The address placing the bet
    /// @param betID The ID assigned to this bet
    event GuessNote(uint256 UsersGuess, uint256 amount, address indexed user, uint256 betID);

    /// @notice Emitted when a bet is resolved by a VRF callback
    /// @param UsersGuess The number that was guessed (odds threshold)
    /// @param Result The rolled result (randomness % 100)
    /// @param amountWagered The amount that was wagered
    /// @param betID The ID of the resolved bet
    /// @param AddressOfGuesser The address that placed the bet
    /// @param AmountWon The amount paid out (or the fallback minimum on a loss)
    /// @param chainlinkRandom The raw VRF random word used to resolve the bet
    event ShowAnswer(
        uint256 UsersGuess,
        uint256 Result,
        uint256 amountWagered,
        uint256 betID,
        address indexed AddressOfGuesser,
        uint256 AmountWon,
        uint256 chainlinkRandom
    );

    /// @notice Revert reason used when a stakedToken transfer fails during staking
    string constant _transferErrorMessage = "staked token transfer failed";

    /// @notice Returns the staking-share balance of `account`
    /// @param account The address to query
    /// @return The staking-share balance of `account`
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    // ── Internal bookkeeping ───────────────────────────────────

    /// @notice StateView periphery contract for reading Uniswap v4 pool state
    /// @dev Deployed address is Base-specific — confirm this matches the actual
    ///      StateView deployment for your target chain before relying on it
    IStateView private immutable stateView = IStateView(0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71);

    /// @notice PoolId for the B0x/ETH Uniswap v4 pool
    /// @dev Computed off-chain as keccak256(abi.encode(PoolKey)); cannot be reversed
    ///      back into currency0/currency1/fee/tickSpacing/hooks on-chain
    bytes32 private constant POOL_ID = 0x6d7608e5974f1aa1bc8ac9b33ae7fdd41a55b24f53007a7f5ed41ee5b15fb194;

    /// @notice USDC/ETH pool address on Base for price reference
    /// @dev Used for sqrtPriceX96 calculations, Uniswap V3 pool on Base mainnet.
    ///      token0 = WETH, token1 = USDC for this specific pool.
    address private constant POOL_ADDRESS = 0xd0b53D9277642d899DF5C87A3966A349A798F224;

    /// @notice Retrieves the current ETH price in USD with high precision
    /// @dev Uses Uniswap V3 slot0() on the ETH/USDC pool. Result scale is
    ///      empirically 1e12 relative to a real USD value (verified on-chain:
    ///      raw output 1924830398032519 corresponded to $1,924.83, i.e. raw/1e12 = USD).
    /// @return price ETH price in USD, scaled by ~1e12 (divide return value by 1e12 to get USD)
    function getETHUSDC_PricePrecise() public view returns (uint256 price) {
        //Fix return for now until mainnet then remove!
        IUniswapV3Pool pool = IUniswapV3Pool(POOL_ADDRESS);
        (uint160 sqrtPriceX96, , , , , , ) = pool.slot0();

        // Calculate price = (sqrtPriceX96)^2 * 10^22 / 2^192
        // Using mulDiv to handle large numbers safely

        if (sqrtPriceX96 <= type(uint128).max) {
            // Safe to square without overflow
            uint256 priceX192 = uint256(sqrtPriceX96) * sqrtPriceX96;
            return (priceX192 * 1e24) >> 192;
        } else {
            // Use FullMath.mulDiv for large numbers
            // You'll need to import @uniswap/v3-core/contracts/libraries/FullMath.sol
            uint256 priceX128 = MulDiv.mulDiv(sqrtPriceX96, sqrtPriceX96, 1 << 64);
            return MulDiv.mulDiv(priceX128, 1e24, 1 << 128);
        }
    }

    /// @notice Retrieves the raw B0x/ETH price ratio from the Uniswap v4 pool
    /// @dev Reads pool state via StateView.getSlot0() since v4 pools have no
    ///      individually deployed contract to call slot0() on directly.
    ///      Both B0x and ETH are assumed to have 18 decimals, so no decimal-gap
    ///      correction is applied (unlike getETHPricePrecise(), which needs a
    ///      1e12 correction for WETH's 18 vs USDC's 6 decimals). Output is
    ///      scaled directly by 1e18.
    /// @return price Raw price of currency0 in terms of currency1 for the B0x/ETH
    ///      pool, scaled by 1e18. Whether this represents "B0x per ETH" or
    ///      "ETH per B0x" depends on which token is currency0 vs currency1 —
    ///      verify via the pool's Initialize event before relying on the
    ///      division direction used downstream in getPriceOFB0xINUSD().
   function getETHB0x_PricePrecise() public view returns (uint256 price) {
        // v4 slot0 only exposes sqrtPriceX96, tick, protocolFee, lpFee — no observation index/cardinality fields
      
        (uint160 sqrtPriceX96, , , ) = stateView.getSlot0(POOL_ID);


        // Always route through mulDiv — avoids overflow regardless of how large
        // sqrtPriceX96 is, unlike the raw-multiply fast path which can overflow
        // once sqrtPriceX96 approaches 2^128.
        uint256 priceX128 = MulDiv.mulDiv(sqrtPriceX96, sqrtPriceX96, 1 << 64);
        //return MulDiv.mulDiv(priceX128, 1e24, 1 << 128);
        return MulDiv.mulDiv(priceX128, 1e18, 1 << 128); // 1e18, NOT 1e24
    }

    
    /// @notice Computes the current B0x price in USD by combining ETH/USDC and B0x/ETH pool data
    /// @dev Formula: ETH_USD * 1e18 / B0xEth_raw. This is only correct if
    ///      getETHB0x_PricePrecise() returns "B0x per 1 ETH" (i.e. currency0 = ETH,
    ///      currency1 = B0x in that pool). If the pool's token ordering is reversed,
    ///      this division should be a multiplication instead — UNVERIFIED, confirm
    ///      against the pool's actual currency0/currency1 before relying on this in production.
    /// @return PriceOf1B0x Price of 1 B0x token in USD, scaled by ~1e12 (same scale as getETHUSDC_PricePrecise())
    function getPriceOFB0xINUSD() public view returns (uint PriceOf1B0x) {
        uint256 ethPrec = getETHB0x_PricePrecise();
        uint256 denom = MulDiv.mulDiv(ethPrec, 1e10, 1e12);
        if (denom == 0) {
            denom = 1;
        }
        return MulDiv.mulDiv(getETHUSDC_PricePrecise(), 1e10, denom);
    }
    
    

    /// @notice Value most recently confirmed as pending, awaiting checkpoint confirmations for fee adjustment.
    uint256 public pendingFeeAmount;
    
    /// @notice Value most recently confirmed amount we are using
    uint256 public pendingConfirmsAmount;

    /// @notice Timestamp at which the current checkpoint sequence was first started for fee adjustment.
    uint256 public pendingFeeTimestamp;

    /// @notice Timestamp of the most recently passed checkpoint for fee adjustment.
    uint256 public lastFeeCheckpointTimestamp;

    /// @notice Number of consecutive checkpoints passed for the current pendingFeeAmount (0, 1, 2, or 3)
    uint256 public checkpointsPassed;

    /// @notice Number of confirmations required before a value commits
    uint256 public constant REQUIRED_CHECKPOINTS = 4;

    /// @notice Minimum time between each checkpoint confirmation
    uint256 public constant CHECKPOINT_DELAY = 46 hours;

    /// @notice Checks whether calling setAmountWeOwePerPosition() right now would
    ///         actually change state, or would just waste gas on a no-op / revert
    /// @dev Mirrors the exact branching logic of setAmountWeOwePerPosition():
    ///      - If the freshly computed amount matches the already-committed value,
    ///        this is only actionable if there's a stale in-progress sequence to
    ///        clear (checkpointsPassed != 0); otherwise there's nothing to do.
    ///      - If no sequence is active, the computed amount differs from what's
    ///        currently pending, or pendingConfirmsAmount has drifted from the
    ///        freshly computed confirms value, a call is always actionable
    ///        (starts/restarts the sequence regardless of timing).
    ///      - If the same value is still pending, a call is only actionable once
    ///        CHECKPOINT_DELAY has elapsed since the last checkpoint.
    ///      NOTE: this computes queryRequiredB0xAmount(), which reads live pool
    ///      state — free when called off-chain via eth_call, but a real gas cost
    ///      if invoked on-chain by another contract.
    /// @return actionable True if calling setAmountWeOwePerPosition() now would
    ///      change contract state; false if it would currently no-op
    function shouldWeCall_SetAmountWeOwePerPosition() public view returns (bool actionable) {
        (uint256 reqAmt, uint256 confirms) = queryRequiredB0xAmount();

        // Price at committed value — only actionable if there's a stale
        // sequence to clear; otherwise nothing would happen
        if (reqAmt == AmountWeOWE_PER_POSITION2) {
            if (checkpointsPassed != 0) {
                return true;
            } else {
                return false;
            }
        }

        // No sequence active, price changed mid-sequence, or the confirms
        // value drifted on its own — always actionable
        if (checkpointsPassed == 0 || pendingFeeAmount != reqAmt || pendingConfirmsAmount != confirms) {
            return true;
        }

        // Same value still pending — actionable only once the delay has passed
        if (block.timestamp >= lastFeeCheckpointTimestamp + CHECKPOINT_DELAY) {
            return true;
        } else {
            return false;
        }
    }

    /// @notice Three-checkpoint, time-gated update to AmountWeOWE_PER_POSITION2 and requestConfirmations
    /// @dev A newly computed (amount, confirms) pair must be confirmed 4 separate
    ///      times, each confirmation spaced at least 46 hours apart, all while both
    ///      values stay the same, before they commit. Any call where either value
    ///      changes mid-sequence, or the amount matches the already-committed value,
    ///      resets the checkpoint sequence entirely — a manipulated price must
    ///      be sustained across the full multi-checkpoint window (>= 96 hours
    ///      minimum, since 4 checkpoints require 3 full delays between them) with
    ///      no reversion at any checkpoint, or the whole sequence restarts from zero.
    ///      pendingConfirmsAmount should only ever change alongside pendingFeeAmount;
    ///      if it drifts on its own while pendingFeeAmount is unchanged, that's treated
    ///      as a mid-sequence change and restarts the sequence rather than committing.
    function setAmountWeOwePerPosition() external {
        (uint256 reqAmt, uint256 confirms) = queryRequiredB0xAmount();

        // No change needed — clear any in-progress checkpoint sequence so stale
        // progress can't be reused later to shortcut the confirmation process
        if (reqAmt == AmountWeOWE_PER_POSITION2) {
            if (checkpointsPassed != 0) {
                pendingFeeAmount = 0;
                pendingConfirmsAmount = 0;
                pendingFeeTimestamp = 0;
                lastFeeCheckpointTimestamp = 0;
                checkpointsPassed = 0;
                return;
            } else {
                require(false, "Check Points have not passed, must run this when queryRequiredB0xAmount() changes from AmountWeOWE_PER_POSITION2");
                return;
            }
        }

        // No sequence in progress, the value changed mid-sequence, or
        // pendingConfirmsAmount drifted on its own — start fresh
        if (checkpointsPassed == 0 || pendingFeeAmount != reqAmt || pendingConfirmsAmount != confirms) {
            pendingFeeAmount = reqAmt;
            pendingConfirmsAmount = confirms;
            pendingFeeTimestamp = block.timestamp;
            lastFeeCheckpointTimestamp = block.timestamp;
            checkpointsPassed = 1;
            return;
        }

        // Same value still pending — must wait the full delay to advance
        require(
            block.timestamp >= lastFeeCheckpointTimestamp + CHECKPOINT_DELAY,
            "Not enough time has passed between checkpoints, takes >46h since last checkpoint."
        );

        // Same value still pending — check if enough time has passed since the
        // last checkpoint to advance to the next one
        if (block.timestamp >= lastFeeCheckpointTimestamp + CHECKPOINT_DELAY) {
            checkpointsPassed += 1;
            lastFeeCheckpointTimestamp = block.timestamp;

            if (checkpointsPassed >= REQUIRED_CHECKPOINTS) {
                AmountWeOWE_PER_POSITION2 = reqAmt;
                requestConfirmations = uint16(confirms);
                pendingFeeAmount = 0;
                pendingConfirmsAmount = 0;
                pendingFeeTimestamp = 0;
                lastFeeCheckpointTimestamp = 0;
                checkpointsPassed = 0;
            }
        } else {
            require(false, "Not enough time has passed between checkpoints, takes >46h since last checkpoint.");
        }
    }

    /// @notice Computes the current required B0x amount and VRF confirmations, both via step schedules
    ///         that advance together as price rises.
    /// @dev Amount schedule: price <= 4000 -> 50, > 4000 -> 33.33, > 8000 -> 22.22,
    ///      > 16000 -> 14.81, > 32000 -> 9.88, etc. Each doubling of price
    ///      reduces the required amount by 1/3 (÷1.5), in discrete steps.
    ///      Capped at 50 halvings max, regardless of how high price goes.
    ///      Never returns less than 0.0000001 token (0.0000001e18).
    ///      Confirmations schedule: starts at 3 (tracked internally *100 for fixed-point
    ///      precision on the +5% step) and ramps up once per amount step — +5% per step
    ///      while below 10, then +1 per step once in [10, 20), clamped at a ceiling of 20
    ///      once reached. Since both values step together on every loop iteration, a lower
    ///      requiredAmount always pairs with a higher (or equally-capped) requiredConfirmations.
    /// @return requiredAmount The currently required B0x amount per position, in wei (18 decimals)
    /// @return requiredConfirmations The VRF block confirmations to require at the current price step (3-20)
    function queryRequiredB0xAmount() public view returns (uint256 requiredAmount, uint256 requiredConfirmations) {
        uint256 currentPrice = getPriceOFB0xINUSD();
        uint256 amount = AmountWeOWE_PER_POSITION_Constant;
        uint256 threshold = 4000;
        uint256 MIN_AMOUNT = 0.0000001 * 10 ** 18; // 0.0000001 token minimum floor
        uint256 confirmations = 3 * 100;  // in practice 300, but really 3 confirmations we start at.
        for (uint256 i = 0; i < 50; i++) {
            if (currentPrice <= threshold) {
                break;
            }

	    if (confirmations < 6 * 100) {
                confirmations = (confirmations * 105) / 100;
	    } else if (confirmations >= 9 * 100) {
                confirmations = 9 * 100;
            } else {
                confirmations = confirmations + 25;
            }
            
            amount = amount / 2; // divide by 2, integer-safe

            threshold = threshold * 2;
            if (amount <= MIN_AMOUNT) {
                return (MIN_AMOUNT, confirmations/100);
            }
        }

        return (amount < MIN_AMOUNT ? MIN_AMOUNT : amount, confirmations/100);
    }

    /// @notice Deploys the contract, wiring up the VRF wrapper, LINK token, key hash, and staked token
    /// @dev VRF wrapper, LINK token, and key hash are hardcoded for Base Mainnet — see the
    ///      config warning near keyHash before reusing this on another network
    /// @param _stakedToken The ERC20 token that will be staked into / paid out of the bankroll
    constructor(address _stakedToken)
        VRFV2PlusWrapperConsumerBase(0xb0407dbe851f8318bd31404A49e658143C982F23) // VRF Wrapper (Base Mainnet)
    {
        LINK = LinkTokenInterface(0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196); // LINK token (Base Mainnet)
        keyHash = 0xdc2f87677b01473c763cb0aee938ed3341512f6057324a584e5944e786144d70; // 30 gwei lane
        stakedToken = IERC20(_stakedToken);
    }

    /// @notice Live LINK cost of one VRF request at the current settings/gas price.
    /// @dev Replaces the old fixed `fee` constant.
    /// @return The current LINK price for a single VRF request
    function requestPrice() public view returns (uint256) {
        return i_vrfV2PlusWrapper.calculateRequestPrice(callbackGasLimit, numWords);
    }

    /// @notice Updates the LINK rebate amount given to qualifying bets
    /// @dev Owner-gated; Sets it to 450* requestPrice()
    function setFreeBetLink(uint256 guess, uint256 amt) public onlyOwner returns (uint256 requestId) {
    
        uint amountOfChainlink = 0;
        uint256 esT = estOUTPUT(amt, guess);
        require(amt < esT, "You will loose money everytime at these settings");
        require(amt >= AmountWeOWE_PER_POSITION2 / 50, "Min bet AmountWeOWE_PER_POSITION2/50 B0x");
        require(MaxINForGuess(guess) >= amt, "Bankroll too low for this bet, Please lower bet");
        require(guess < 98 && guess > 0, "Must guess between 1-98");
        require(stakedToken.transferFrom(msg.sender, address(this), amt), "Transfer must work");

        // Pull a quote, request, then refund whatever we didn't actually spend.
        uint256 quoted = requestPrice();

        uint256 subsidy = 0;
        if(guess<51){
		
            if (amt >= AmountWeOWE_PER_POSITION2 * 20) {
                subsidy = FreeBetLink > quoted ? quoted : FreeBetLink;
                uint256 contractBal = LINK.balanceOf(address(this));
                if (subsidy > contractBal) {
                    subsidy = contractBal; // never try to pay out more than we hold
                }
            }
	}else{
            if (esT-amt >= AmountWeOWE_PER_POSITION2 * 20) {
                subsidy = FreeBetLink > quoted ? quoted : FreeBetLink;
                uint256 contractBal = LINK.balanceOf(address(this));
                if (subsidy > contractBal) {
                    subsidy = contractBal; // never try to pay out more than we hold
                }
            }
	}

        uint256 userPortion = quoted - subsidy;
        if (userPortion > 0) {
            require(LINK.transferFrom(msg.sender, address(this), userPortion), "LINK transfer failed");
        }

        betOdds[betidIN] = guess;
        betAmt[betidIN] = amt;
        betee[betidIN] = msg.sender;
        winnings[betidIN] = esT;
        profitzGuess[msg.sender] -= int(amt);
        blockNumForBetID[betidIN] = block.number;
        userBetIds[msg.sender].push(betidIN);
        emit GuessNote(guess, amt, msg.sender, betidIN);
        betidIN++;
        unreleased += amt;

        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
        );

        uint256 actualPrice;
        (requestId, actualPrice) = requestRandomness(callbackGasLimit, requestConfirmations, numWords, extraArgs);

        amountOfChainlink = actualPrice;
        if (quoted > actualPrice) {
            amountOfChainlink = actualPrice;
            uint256 refund = quoted - actualPrice;
            LINK.transfer(msg.sender, refund);
        }
        
        FreeBetLink = (amountOfChainlink*3)/2;
    }

    /// @notice Places a guess/bet and requests VRF randomness to resolve it
    /// @dev Requests randomness, paid for in LINK by the caller. extraLINK keeps its
    ///      original meaning: extra "units" of the current request price pulled from
    ///      the user to top up the contract's LINK buffer. Large bets (>= 20x
    ///      AmountWeOWE_PER_POSITION2) may receive a LINK subsidy toward the request
    ///      price, capped by FreeBetLink and by the contract's own LINK balance.
    /// @param guess The number guessed, must be strictly between 0 and 98
    /// @param amt The amount of stakedToken wagered
    /// @return requestId The ID of the VRF request created to resolve this bet
    function getRandomNumber(uint256 guess, uint256 amt) public returns (uint256 requestId) {
        uint256 esT = estOUTPUT(amt, guess);
        require(amt < esT, "You will loose money everytime at these settings");
        require(amt >= AmountWeOWE_PER_POSITION2 / 50, "Min bet AmountWeOWE_PER_POSITION2/50 B0x");
        require(MaxINForGuess(guess) >= amt, "Bankroll too low for this bet, Please lower bet");
        require(guess < 98 && guess > 0, "Must guess between 1-98");
        require(stakedToken.transferFrom(msg.sender, address(this), amt), "Transfer must work");

        // Pull a quote, request, then refund whatever we didn't actually spend.
        uint256 quoted = requestPrice();

        uint256 subsidy = 0;
        if(guess<51){
		
            if (amt >= AmountWeOWE_PER_POSITION2 * 20) {
                subsidy = FreeBetLink > quoted ? quoted : FreeBetLink;
                uint256 contractBal = LINK.balanceOf(address(this));
                if (subsidy > contractBal) {
                    subsidy = contractBal; // never try to pay out more than we hold
                }
            }
	}else{
            if (esT-amt >= AmountWeOWE_PER_POSITION2 * 20) {
                subsidy = FreeBetLink > quoted ? quoted : FreeBetLink;
                uint256 contractBal = LINK.balanceOf(address(this));
                if (subsidy > contractBal) {
                    subsidy = contractBal; // never try to pay out more than we hold
                }
            }
	}

        uint256 userPortion = quoted - subsidy;
        if (userPortion > 0) {
            require(LINK.transferFrom(msg.sender, address(this), userPortion), "LINK transfer failed");
        }

        betOdds[betidIN] = guess;
        betAmt[betidIN] = amt;
        betee[betidIN] = msg.sender;
        winnings[betidIN] = esT;
        profitzGuess[msg.sender] -= int(amt);
        blockNumForBetID[betidIN] = block.number;
        userBetIds[msg.sender].push(betidIN);
        emit GuessNote(guess, amt, msg.sender, betidIN);
        betidIN++;
        unreleased += amt;

        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
        );

        uint256 actualPrice;
        (requestId, actualPrice) = requestRandomness(callbackGasLimit, requestConfirmations, numWords, extraArgs);

        if (quoted > actualPrice) {
            uint256 refund = quoted - actualPrice;
            LINK.transfer(msg.sender, refund);
        }
    }

    /// @notice Returns the block number of the oldest unresolved bet, or the current block if none are pending
    /// @return The block number at which the oldest unresolved bet was placed, or block.number if fully caught up
    function lastBlockFilled() public view returns (uint256) {
        if (betid == betidIN) {
            return block.number;
        }
        return blockNumForBetID[betid];
    }

    /// @notice Total number of bets ever placed by `user`.
    /// @dev Needed because the auto-generated getter for userBetIds only
    ///      supports indexing (userBetIds(user, i)), not reading .length.
    /// @param user The address to query
    /// @return The number of bets `user` has ever placed
    function getUserBetCount(address user) public view returns (uint256) {
        return userBetIds[user].length;
    }

    /// @notice A page of `user`'s bet IDs, in the order they were placed.
    /// @dev Bounded/paginated on purpose — reading the whole array in one
    ///      call would grow unboundedly for a very active bettor. Pass
    ///      offset=0 to start from their first bet; call getUserBetCount()
    ///      first to know how many pages you need.
    /// @param user The address whose bet IDs to page through
    /// @param offset Index into the user's bet history to start from.
    /// @param limit Max number of IDs to return.
    /// @return ids Up to `limit` bet IDs starting at `offset`; shorter if
    ///      fewer remain, empty if `offset` is past the end.
    function getUserBetIds(address user, uint256 offset, uint256 limit) public view returns (uint256[] memory ids) {
        uint256[] storage allIds = userBetIds[user];
        uint256 total = allIds.length;
        if (offset >= total) {
            return new uint256[](0);
        }

        uint256 remaining = total - offset;
        uint256 count = remaining < limit ? remaining : limit;
        ids = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = allIds[offset + i];
        }
    }

    /// @notice Maximum amount that can be wagered on a given guess, based on available bankroll
    /// @param guess The number guessed
    /// @return The maximum amount of stakedToken that can be wagered on `guess`
    function MaxINForGuess(uint256 guess) public view returns (uint256) {
        uint256 ret = ((IERC20(address(stakedToken)).balanceOf(address(this)) - unreleased) * guess) / (50 * 21);
        return ret;
    }

    /// @notice Sum of winnings owed across all currently unresolved bets
    /// @return num Total stakedToken owed to unresolved bets in the [betid, betidIN) range
    function penalty() public view returns (uint num) {
        uint tot = 0;
        for (uint x = betid; x < betidIN; x++) {
            tot += winnings[x];
        }
        return tot;
    }



    /// @notice Last Person to call Blank get this, shouldnt be used often at all.
    address private blanker = address(0);


    /// @notice Requests an extra "blank" VRF request, in case Chainlink fulfillment failed to keep up
    /// @dev Incase of Chainlink failure -- pay for an extra "blank" VRF request
    /// @return requestId The ID of the newly created VRF request
    function getBlank() public returns (uint256 requestId) {
   
               blanker = msg.sender;
          // Pull a quote, request, then refund whatever we didn't actually spend.
        uint256 quoted = requestPrice();

        uint256 userPortion = quoted;
        if (userPortion > 0) {
            require(LINK.transferFrom(msg.sender, address(this), userPortion), "LINK transfer failed");
        }
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
        );

        uint256 actualPrice;
        (requestId, actualPrice) = requestRandomness(callbackGasLimit, requestConfirmations, numWords, extraArgs);

        if (quoted > actualPrice) {
            uint256 refund = quoted - actualPrice;
            LINK.transfer(msg.sender, refund);
        }
        
    }

    /// @notice VRF v2.5 callback resolving the oldest unresolved bet with fresh randomness
    /// @dev Replaces fulfillRandomness(bytes32, uint256). requestId is unused here because
    ///      bets are processed as a FIFO queue (betid/betidIN), same as the original contract.
    /// @param randomWords The random words returned by VRF; only randomWords[0] is used
    function fulfillRandomWords(uint256 /* requestId */, uint256[] memory randomWords) internal override {
        if (betid >= betidIN) {
            stakedToken.transfer(blanker, 1);
            return;
        }
        

        uint256 randomness = randomWords[0];

        randomNumber[betid] = randomness;
        betResults[betid] = randomness % 100;
        address Guesser = betee[betid];
        uint256 odds = betOdds[betid];
        uint256 betAmount = betAmt[betid];
        uint256 esT = winnings[betid];
        if (randomness % 100 < odds) {
            profitzGuess[Guesser] += int(esT);
            stakedToken.transfer(Guesser, esT);
        } else {
            stakedToken.transfer(Guesser, 1);
            profitzGuess[Guesser] += int(1);
            winnings[betid] = 1;
        }
        unreleased -= betAmount;
        emit ShowAnswer(odds, randomness % 100, betAmount, betid, Guesser, winnings[betid], randomness);
        betid++;
    }
    
    
    /// @notice Stakes `amount` of stakedToken on behalf of `msg.sender`, minting staking shares
    /// @dev Stake and become the house
    /// @param amount The amount of stakedToken to stake
    function stake(uint256 amount) public virtual {
    	stakeForSomeoneElse(msg.sender, amount);
    }

    /// @notice Stakes `amount` of stakedToken on behalf of `forWhom`, minting staking shares
    /// @dev Stake and become the house
    /// @param forWhom The address to credit with the newly minted staking shares
    /// @param amount The amount of stakedToken to stake
    function stakeForSomeoneElse(address forWhom, uint256 amount) public virtual {
        IERC20 st = stakedToken;
        require(amount > 0, "Cannot stake 0");

        // mulDiv computes floor(amount * totalSupply / poolBalance) safely even
        // if amount * totalSupply alone would overflow uint256 (see MulDiv
        // library above). This used to run inside `unchecked`, so an overflow
        // there would have silently wrapped to a wrong share count instead of
        // reverting — checked arithmetic below for the +=/-= is the safer
        // default now that the multiply/divide no longer needs it.
        uint256 poolBalance = IERC20(address(stakedToken)).balanceOf(address(this)) - unreleased;
        uint256 toAdd = MulDiv.mulDiv(amount, totalSupply, poolBalance);
        
        
        
        uint256 oldShares = _balances[forWhom];
        if (oldShares == 0) {
            depositTimestamp[forWhom] = block.timestamp;
        } else {
            // weighted average, weighted by shares
            depositTimestamp[forWhom] =
                (depositTimestamp[forWhom] * oldShares + block.timestamp * toAdd) / (oldShares + toAdd);
        }



        _balances[forWhom] += toAdd;
        totalSupply += toAdd;
        profitz[forWhom] -= int(amount);

        require(st.transferFrom(msg.sender, address(this), amount), _transferErrorMessage);

        emit Staked(forWhom, amount);
    }


    /// @notice Computes the withdrawal fee, in basis points, currently applicable to `user`
    /// @dev Fee decreases in six discrete steps as time elapses since `user`'s
    ///      recorded deposit timestamp (see `depositTimestamp`, set/updated in
    ///      `stakeForSomeoneElse`). Because `depositTimestamp` is a single
    ///      weighted-average value per address rather than per-deposit, multiple
    ///      stakes to the same address blend into one effective age — this
    ///      function does not distinguish principal by when it was actually
    ///      deposited. Schedule (age -> fee):
    ///        < 30 days  -> 2.50%
    ///        < 60 days  -> 2.00%
    ///        < 91 days  -> 1.50%
    ///        < 120 days -> 1.00%
    ///        < 175 days -> 0.50%
    ///        < 358 days -> 0.25%
    ///        else       -> 0.00%
    ///      Basis points are out of 100,000 (not the usual 10,000) to allow the
    ///      0.25% tier to be expressed as an exact integer (250).
    /// @param user The address whose deposit age is used to determine the fee tier
    /// @return The withdrawal fee for `user`, in basis points out of 100,000
    function withdrawFeeBps(address user) public view returns (uint256) {
            uint256 age = block.timestamp - depositTimestamp[user];
            if (age < 30 days)  return 2500; // 2.5%
            if (age < 60 days)  return 2000; // 1.5%
            if (age < 91 days) return 1500;  // 1%
            if (age < 120 days) return 1000;  // 1%
            if (age < 175 days) return 500;  // 0.5%  //under ~1/2 year
            if (age < 358 days) return 250;  // 0.25%  //under ~1 year
        return 0;
    }


    
    /// @notice Finds the largest guess (1-97) for which `amt` can still be profitably wagered
    /// @param amt The amount to wager; may be capped downward internally if the bankroll can't support it
    /// @return The highest guess value that is affordable and profitable for the (possibly capped) amount
    function maxGuessPerInput(uint amt) public view returns (uint) {
        for (uint256 guess = 97; guess > 0; guess--) {
            if (MaxINForGuess(guess) < amt) {
                amt = MaxINForGuess(guess);
            }
            if (amt > 0 && estOUTPUT(amt, guess) > amt) {
                return guess;
            }
        }
        return 0; // no guess in [1,97] is affordable/profitable for any amount down to 0
    }

    /// @notice Estimates the payout for a given bet amount and guessed odds
    /// @dev Output amount of payout based on odds and bet. The payout multiplier
    ///      scales with the bankroll-to-bet ratio (`ratioz`) — thinner bankrolls
    ///      relative to the bet pay out a smaller fraction of the theoretical odds.
    /// @param betAmount The amount wagered
    /// @param odds The guessed number (odds threshold)
    /// @return The estimated payout for this bet
    function estOUTPUT(uint256 betAmount, uint256 odds) public view returns (uint256) {
        uint256 ratioz = (IERC20(address(stakedToken)).balanceOf(address(this)) - unreleased) * 50 / (betAmount * odds);
        uint256 estOutput = 0;
        if (ratioz < 30) {
            estOutput = (100 * 90 * betAmount) / (odds * 100);
        } else if (ratioz < 50) {
            estOutput = (100 * 93 * betAmount) / (odds * 100);
        } else if (ratioz < 100) {
            estOutput = (100 * 96 * betAmount) / (odds * 100);
        } else if (ratioz < 200) {
            estOutput = (100 * 98 * betAmount) / (odds * 100);
        } else if (ratioz < 400) {
            estOutput = (100 * 99 * betAmount) / (odds * 100);
        } else if (ratioz < 1000) {
            estOutput = (100 * 995 * betAmount) / (odds * 1000);
        } else {
            estOutput = (100 * 99 * betAmount) / (odds * 100);
        }

        return estOutput;
    }

    /// @notice Estimates the net stakedToken received for withdrawing `amountOut` shares, after the 2.5% fee
    /// @dev Withdrawal estimator
    /// @param amountOut The amount of staking shares to estimate a withdrawal for
    /// @return The estimated stakedToken received after fees
    function withEstimator(uint256 amountOut, address forWhom) public view returns (uint256) {
        uint256 feeBps = withdrawFeeBps(forWhom); // or forWhom
        uint256 v = ((100000 - feeBps) * uOut(amountOut)) / 100000;
        return v;
    }


    /// @notice Estimates the net stakedToken `forWhom` could withdraw right now, after the 2.5% fee
    /// @dev Withdrawal estimator
    /// @param forWhom The address whose full share balance to estimate a withdrawal for
    /// @return The estimated stakedToken received after fees
    function currentB0x(address forWhom) public view returns (uint256) {
        uint256 feeBps = withdrawFeeBps(forWhom);
        uint256 v = ((100000 - feeBps) * uOut(balanceOf(forWhom))) / 100000;
        return v;
    }


    /// @notice Withdraws the caller's entire staking-share balance, subject to a max acceptable penalty
    /// @dev Prevents you from withdrawing if large bets are in play
    /// @param maxLoss The maximum outstanding bet penalty the caller is willing to tolerate
    function perfectWithdraw(uint maxLoss) public {
        withdraw(balanceOf(msg.sender), maxLoss);
    }
    

    /// @notice Converts a staking-share amount into stakedToken, net of outstanding bet penalty
    /// @param amount The staking-share amount to convert
    /// @return tot The stakedToken value of `amount` shares, after subtracting the pro-rata bet penalty
    function uOut(uint amount) public view returns (uint256 tot) {
        uint256 stakeMinusUnreleased = (IERC20(address(stakedToken)).balanceOf(address(this)) - unreleased);
        uint256 amt = MulDiv.mulDiv(amount, stakeMinusUnreleased, totalSupply);
        tot = amt - MulDiv.mulDiv(amt, penalty(), stakeMinusUnreleased);
        return tot;
    }
    

    /// @notice Burns `amount` staking shares and pays out the underlying stakedToken, minus a 2.5% fee
    /// @dev 2.5% fee on withdrawals back to holders. No-op if `maxLoss` is below the current outstanding penalty.
    /// @param amount The amount of staking shares to burn
    /// @param maxLoss The maximum outstanding bet penalty the caller is willing to tolerate
    function withdraw(uint256 amount, uint256 maxLoss) public virtual {
        if (maxLoss < penalty()) {
            return;
        }

        require(amount <= _balances[msg.sender], "withdraw: balance is lower");

        uint OutEst = uOut(amount);
        uint256 feeBps = withdrawFeeBps(msg.sender);
        uint256 feeAmt = (OutEst * feeBps) / 100000;
        uint256 netAmt = OutEst - feeAmt;
        

        unchecked {
            _balances[msg.sender] -= amount;
            totalSupply = totalSupply - amount;
            profitz[msg.sender] += int(netAmt);
        }

        require(stakedToken.transfer(address(this), feeAmt));
        require(stakedToken.transfer(msg.sender, netAmt));

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Total lifetime profit/loss for `user`, combining realized profitz with currently withdrawable value
    /// @param user The address to query
    /// @return The combined realized-plus-withdrawable profit/loss for `user`
    function Profit(address user) public view returns (int) {
        uint256 withdrawable = withEstimator(balanceOf(user), user);
        int profit = profitz[user] + int(withdrawable);
        return profit;
    }

    /// @notice Returns the current block number
    /// @return The current block number
    function blockNumber() public view returns (uint) {
        return block.number;
    }
}
