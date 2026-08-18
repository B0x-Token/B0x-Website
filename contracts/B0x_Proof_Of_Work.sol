// B ZERO X Token - B0x Token - Proof of Work Mining Contract
// Base BlockChain
//
// Website: https://bzerox.com/
// Website dAPP: https://bzerox.org/
// Website dAPP Miner Setup: https://bzerox.org/?miner
// Documents about B0x - B Zero X: https://dev.bzerox.org/
// Github: https://github.com/B0x-Token/
// Discord: https://discord.gg/K89uF2C8vJ
// Twitter: https://x.com/B0x_Token/
//
//
// Distrubtion of B ZERO X Tokens - B0x Token is as follows:
//
// B0x Token is distributed to users by using Proof of work and is considered a Version 2 of 0xBitcoin.  Our contract allows all 0xBitcoin to be converted to B0x Tokens.
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







pragma solidity ^0.8.11;

// File: contracts/utils/SafeMath.sol

library SafeMath2 {
    function add(uint256 x, uint256 y) internal pure returns (uint256) {
        uint256 z = x + y;
        require(z >= x);
        return z;
    }

    function sub(uint256 x, uint256 y) internal pure returns (uint256) {
        require(x >= y);
        return x - y;
    }

    function mult(uint256 x, uint256 y) internal pure returns (uint256) {
        if (x == 0) {
            return 0;
        }

        uint256 z = x * y;
        require(z / x == y);
        return z;
    }

    function div(uint256 x, uint256 y) internal pure returns (uint256) {
        require(y != 0);
        return x / y;
    }

    function divRound(uint256 x, uint256 y) internal pure returns (uint256) {
        require(y != 0);
        uint256 r = x / y;
        if (x % y != 0) {
            r = r + 1;
        }

        return r;
    }
}





interface IERC721 {
    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
     */
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables or disables (`approved`) `operator` to manage all of its assets.
     */
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /**
     * @dev Returns the number of tokens in ``owner``'s account.
     */
    function balanceOf(address owner) external view returns (uint256 balance);

    /**
     * @dev Returns the owner of the `tokenId` token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function ownerOf(uint256 tokenId) external view returns (address owner);

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external;

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC721 protocol to prevent tokens from being forever locked.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If the caller is not `from`, it must be have been allowed to move this token by either {approve} or {setApprovalForAll}.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    /**
     * @dev Transfers `tokenId` token from `from` to `to`.
     *
     * WARNING: Usage of this method is discouraged, use {safeTransferFrom} whenever possible.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    /**
     * @dev Gives permission to `to` to transfer `tokenId` token to another account.
     * The approval is cleared when the token is transferred.
     *
     * Only a single account can be approved at a time, so approving the zero address clears previous approvals.
     *
     * Requirements:
     *
     * - The caller must own the token or be an approved operator.
     * - `tokenId` must exist.
     *
     * Emits an {Approval} event.
     */
    function approve(address to, uint256 tokenId) external;

    /**
     * @dev Approve or remove `operator` as an operator for the caller.
     * Operators can call {transferFrom} or {safeTransferFrom} for any token owned by the caller.
     *
     * Requirements:
     *
     * - The `operator` cannot be the caller.
     *
     * Emits an {ApprovalForAll} event.
     */
    function setApprovalForAll(address operator, bool _approved) external;

    /**
     * @dev Returns the account approved for `tokenId` token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function getApproved(uint256 tokenId) external view returns (address operator);

    /**
     * @dev Returns if the `operator` is allowed to manage all of the assets of `owner`.
     *
     * See {setApprovalForAll}
     */
    function isApprovedForAll(address owner, address operator) external view returns (bool);
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
//Main contract


interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC1155 is IERC165 {
    /**
     * @dev Emitted when `value` tokens of token type `id` are transferred from `from` to `to` by `operator`.
     */
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);

    /**
     * @dev Equivalent to multiple {TransferSingle} events, where `operator`, `from` and `to` are the same for all
     * transfers.
     */
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );

    /**
     * @dev Emitted when `account` grants or revokes permission to `operator` to transfer their tokens, according to
     * `approved`.
     */
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);

    /**
     * @dev Emitted when the URI for token type `id` changes to `value`, if it is a non-programmatic URI.
     *
     * If an {URI} event was emitted for `id`, the standard
     * https://eips.ethereum.org/EIPS/eip-1155#metadata-extensions[guarantees] that `value` will equal the value
     * returned by {IERC
     5MetadataURI-uri}.
     */
    event URI(string value, uint256 indexed id);

    /**
     * @dev Returns the amount of tokens of token type `id` owned by `account`.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     */
    function balanceOf(address account, uint256 id) external view returns (uint256);

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] version of {balanceOf}.
     *
     * Requirements:
     *
     * - `accounts` and `ids` must have the same length.
     */
    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids)
        external
        view
        returns (uint256[] memory);

    /**
     * @dev Grants or revokes permission to `operator` to transfer the caller's tokens, according to `approved`,
     *
     * Emits an {ApprovalForAll} event.
     *
     * Requirements:
     *
     * - `operator` cannot be the caller.
     */
    function setApprovalForAll(address operator, bool approved) external;

    /**
     * @dev Returns true if `operator` is approved to transfer ``account``'s tokens.
     *
     * See {setApprovalForAll}.
     */
    function isApprovedForAll(address account, address operator) external view returns (bool);

    /**
     * @dev Transfers `amount` tokens of token type `id` from `from` to `to`.
     *
     * Emits a {TransferSingle} event.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - If the caller is not `from`, it must have been approved to spend ``from``'s tokens via {setApprovalForAll}.
     * - `from` must have a balance of tokens of type `id` of at least `amount`.
     * - If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155Received} and return the
     * acceptance magic value.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] version of {safeTransferFrom}.
     *
     * Emits a {TransferBatch} event.
     *
     * Requirements:
     *
     * - `ids` and `amounts` must have the same length.
     * - If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155BatchReceived} and return the
     * acceptance magic value.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external;
}
interface IERC1155Receiver is IERC165 {
    /**
     * @dev Handles the receipt of a single ERC1155 token type. This function is
     * called at the end of a `safeTransferFrom` after the balance has been updated.
     *
     * NOTE: To accept the transfer, this must return
     * `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`
     * (i.e. 0xf23a6e61, or its own function selector).
     *
     * @param operator The address which initiated the transfer (i.e. msg.sender)
     * @param from The address which previously owned the token
     * @param id The ID of the token being transferred
     * @param value The amount of tokens being transferred
     * @param data Additional data with no specified format
     * @return `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))` if transfer is allowed
     */
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);

    /**
     * @dev Handles the receipt of a multiple ERC1155 token types. This function
     * is called at the end of a `safeBatchTransferFrom` after the balances have
     * been updated.
     *
     * NOTE: To accept the transfer(s), this must return
     * `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`
     * (i.e. 0xbc197c81, or its own function selector).
     *
     * @param operator The address which initiated the batch transfer (i.e. msg.sender)
     * @param from The address which previously owned the token
     * @param ids An array containing ids of each token being transferred (order and length must match values array)
     * @param values An array containing amounts of each token being transferred (order and length must match ids array)
     * @param data Additional data with no specified format
     * @return `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))` if transfer is allowed
     */
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4);
}


interface IUniswapV3Pool {
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
interface IPoolFactory {
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);
}


interface IETHConverter {
    /**
     * @notice Convert ETH to WETH
     * @dev Converts all ETH sent with the transaction to WETH
     */
    function convertETHtoWETH() external payable;
    
}



// File: contracts/interfaces/IERC20.sol

interface IERC20 {
    function transfer(address _to, uint _value) external returns (bool success);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool success);
    function balanceOf(address _owner) external view returns (uint256 balance);
}




// File: contracts/B0x_Mining_Proof_Of_Work.sol


// B ZERO X Token - B0x Token Proof of Work Mining Contract.
//
// Website: https://bzerox.com/
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
// Token Mining will take place on Base Blockchain, while having the token reside on Mainnet Ethereum for maximum security.
//
// Symbol: B0x
// Decimals: 18
//
// Total supply: 31,165,100.000000000000000000
//   =
// 10,835,900 0xBitcoin Tokens able to transfered to B0x Tokens.
// +
// 10,164,100 Mined over 100+ years using Bitcoins Distrubtion halvings every ~4 years. Uses Proof-oF-Work to distribute the tokens. Public Miner is available see https://bzerox.com/
// +
// 10,164,100 sent to Liquidity Providers of the 0xBTC/B0x liquidity pool. Distributes 1 token to the Staking contract for every 1 token minted by Proof-of-Work miners
//  
//
// No dev cut, or advantage taken at launch. Public miner available at launch. 100% of the token is given away fairly over 100+ years using Bitcoins model!
// 
// Mint 2016 answers per challenge in this cost savings Bitcoin!! Less failed transactions as the challenge only changes every 2016 answers instead of every answer.
//
// Credits: 0xBitcoin
//
// startTime =  1738771200;  //Date and time (GMT): Wednesday, Feb 5, 2025 4:00:00 PM GMT then openMining functioncan then be called and mining will have rewards, until then all rewards will be 0.



/// @title B0x Mining Proof of Work
/// @notice Proof of Work mining contract for B0x tokens on Base network
/// @dev Implements Bitcoin-style mining with difficulty adjustments and reward halvings
contract B0x_Mining_Proof_of_Work {

    ////
    // Based Work Token Mining Initializations 
    ////
    
    /// @notice Address of the B0x token contract on Base network
    /// @dev Should be made immutable for mainnet deployment to prevent changes
    address immutable public B0x_Mining_TOKEN_ADDRESS;

    /// @notice USDC/ETH pool address on Base for price reference
    /// @dev Used for sqrtPricex96 calculations, Uniswap V3 pool on Base mainnet
    address constant POOL_ADDRESS = 0xd0b53D9277642d899DF5C87A3966A349A798F224;

    /// @notice Target time between blocks in seconds (10 minutes)
    /// @dev Used for difficulty adjustments to maintain consistent block times
    uint public targetTime = 60 * 10;
    
    /// @notice Immutable start time for mining operations
    /// @dev Set to 2 days before deployment for initial calculations
    uint public immutable startTime = 1762020000;  //Date and time (GMT): Saturday, November 1, 2025 6:00:00 PM (GMT TIMEZONE)



    using SafeMath2 for uint256;

    /// @notice Emitted when a standard mining reward is claimed
    /// @param from Address of the miner who found the solution
    /// @param reward_amount Amount of tokens minted as reward
    /// @param epochCount Current epoch number when mined
    /// @param newChallengeNumber The new challenge for the next block
    event Mint(address indexed from, uint reward_amount, uint epochCount, bytes32 newChallengeNumber);
    
    /// @notice Emitted when a mega mining reward is claimed with multiplier
    /// @param from Address of the miner who found the solution
    /// @param epochCount Current epoch number when mined
    /// @param newChallengeNumber The new challenge for the next block
    /// @param NumberOfTokensMinted Total number of tokens minted
    /// @param TokenMultipler Multiplier applied to the base reward
    event MegaMint(address indexed from, uint epochCount, bytes32 newChallengeNumber, uint NumberOfTokensMinted, uint256 TokenMultipler);

    /// @notice Prevents reuse of challenge-digest combinations
    /// @dev Maps challenge hash to digest hash to boolean (used/unused)
    mapping(bytes32 => mapping(bytes32 => bool)) public usedCombinations;

    /// @notice Prevents the same challenge from being used multiple times
    /// @dev Maps challenge hash to boolean (used/unused)
    mapping(bytes32 => bool) public usedChallenges;
    
    /// @notice Maps used challenges to their sequential number
    /// @dev Tracks the order in which challenges were used
    mapping(bytes32 => uint) public usedChallengesNumber;

    /// @notice Number of blocks between difficulty adjustments (Bitcoin-style)
    /// @dev Should be 2016 blocks to align with Bitcoin's adjustment period
    uint public constant _BLOCKS_PER_READJUSTMENT = 2016;
    
    /// @notice Maximum mining target to prevent difficulty from becoming too easy
    /// @dev Large number at least 5x smaller than max to prevent overflow (max 4x increases)
    uint public constant _MAXIMUM_TARGET = 2**253;

    /// @notice Minimum mining target to prevent difficulty from becoming impossible
    /// @dev Small number ensuring mining remains feasible
    uint public constant _MINIMUM_TARGET = 2**16;

    /// @notice Current mining target for difficulty calculation
    /// @dev Normalized to 0xBitcoin's starting difficulty (2**234)
    uint public miningTarget = 2**234;

    /// @notice Maximum total supply of tokens (21 million, Bitcoin-style)
    /// @dev Hard cap on total token creation
    uint public constant _maxTotalSupply = 21000000000000000000000000;

    /// @notice Timestamp of the last difficulty adjustment
    /// @dev Used for calculating time-based difficulty adjustments
    uint public latestDifficultyPeriodStarted2 = block.timestamp;
    
    /// @notice Block number of the last difficulty adjustment
    /// @dev Used for block-based difficulty adjustments
    uint public latestDifficultyPeriodStarted = block.number;
    
    /// @notice Number of blocks mined (epochs completed)
    /// @dev Incremented with each successful mine
    uint public epochCount = 0;

    /// @notice Current challenge that miners must solve
    /// @dev Based on previous block hash, changes with each successful mine
    bytes32 public challengeNumber = blockhash(block.number - 1);

    /// @notice Current reward era for halving calculations
    /// @dev Determines the current reward amount based on total supply
    uint public rewardEra = 1;
    
    /// @notice Maximum supply allowed for the current reward era
    /// @dev Calculated based on reward era for halving mechanics
    uint public maxSupplyForEra = (_maxTotalSupply - _maxTotalSupply.div(2**(rewardEra + 1)));
    
    /// @notice Current reward amount per successful mine
    /// @dev Calculated based on current era and supply
    uint public reward_amount = 0;
    
    /// @notice Minimum ETH amount for price calculations
    /// @dev 0.0000005 ETH * $4500/ETH = $0.00225 minimum price per token
    uint constant minAmountETH = 0.0000005 ether;

    /// @notice Total tokens minted so far
    /// @dev Starts at 10,835,900 tokens (matching 0xBitcoin's mined amount)
    uint public tokensMinted = 10_835_900 * 10**18;
    
    /// @notice Total ETH distributed to miners
    /// @dev Tracks cumulative ETH rewards paid out
    uint public totalETH_MintedToMiners = 0;
    
    /// @notice Last recorded token count for calculations
    /// @dev Used in reward distribution calculations
    uint lastRunB0x = tokensMinted;
    
    /// @notice Last recorded ETH amount for calculations
    /// @dev Used in reward distribution calculations
    uint lastRunETH = 0;
    
    /// @notice Epoch count at the last readjustment
    /// @dev Used for tracking adjustment periods
    uint public epochOld = 0;
    
    /// @notice Startup lock to prevent premature operations
    /// @dev Security mechanism for controlled contract initialization
    bool public locked = false;

    /// @notice Handles safe receipt of ERC721 tokens
    /// @dev Required for receiving NFTs sent to this contract
    /// @return bytes4 The function selector to confirm receipt
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
    
    /// @notice Handles safe receipt of ERC1155 tokens
    /// @dev Required for receiving ERC1155 tokens sent to this contract
    /// @return bytes4 The function selector to confirm receipt
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }
    
    /// @notice Handles safe batch receipt of ERC1155 tokens
    /// @dev Required for receiving batch ERC1155 transfers
    /// @return bytes4 The function selector to confirm receipt
    function onERC1155BatchReceived(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    // SUPPORTING CONTRACTS
    /// @notice Address of the LP reward distribution contract
    /// @dev Contract responsible for distributing rewards to liquidity providers
    address immutable public AddressLPReward;

    /// @notice Total B0x tokens sent to LP reward pool
    /// @dev Tracks cumulative tokens allocated to liquidity providers
    uint public sentToLP = 0;

    /// @notice Multiplier based on held Ethereum amount
    /// @dev Higher ETH holdings reduce the percentage distributed (inverse relationship)
    uint public multipler = 0;
    
    /// @notice Previous epoch count for reward calculations
    /// @dev Used in ArewardSender function for tracking changes
    uint public oldecount = 0;
    
    /// @notice Previous block timestamp for time calculations
    /// @dev Used for measuring time intervals between operations
    uint public previousBlockTime = block.timestamp;
    
    /// @notice Amount of ETH distributed per mint operation
    /// @dev Tracks ETH distribution rate per successful mine
    uint public Token2Per = 0;
    
    /// @notice Number of slow blocks (taking 12+ minutes to mine)
    /// @dev Tracks mining performance and difficulty appropriateness
    uint public slowBlocks = 0;
    
    /// @notice Amount of 0x tokens to give (legacy reference)
    /// @dev May be related to 0xBitcoin compatibility or rewards
    uint public give0x = 0;
    
    /// @notice Timestamp of the last function execution
    /// @dev Used for rate limiting and timing calculations
    uint256 public lastrun = block.timestamp;




    /// @notice Initializes the B0x mining contract with token and LP reward addresses
    /// @dev Sets up initial mining parameters and marks the first challenge as used
    /// @param token Address of the B0x token contract to be mined
    /// @param lp Address of the LP reward distribution contract
    constructor(address token, address lp) {
        B0x_Mining_TOKEN_ADDRESS = token;
        AddressLPReward = lp;
        latestDifficultyPeriodStarted2 = block.timestamp;
        latestDifficultyPeriodStarted = block.number;	
        challengeNumber = blockhash(block.number - 1); //generate a new one so we can start with a fresh
        usedChallenges[blockhash(block.number - 1)] = true;
    }
    
    
	
    /// @notice Activates mining operations with initial parameters and safety checks
    /// @dev Can only be called once within a 7-day window after startTime, requires proper token funding
    /// @dev Initializes mining with Feb 5th 2025 @ 4PM GMT target launch (epochTime = 1738771200)
    /// @return success True if mining was successfully activated
    /// @custom:timing Must be called between startTime and startTime + 7 days
    /// @custom:funding Requires contract to hold at least 20,328,200 B0x tokens (2*10,164,100)
    function openMining() public returns (bool success) {
        require(tokensMinted <= 10_835_900 * 10**18, "Cant mint tokens before launch");
        require(IERC20(B0x_Mining_TOKEN_ADDRESS).balanceOf(address(this)) >= 2*10_164_100 * 10 ** 18, "Must supply 2*10_164_100 min tokens");
        require(reward_amount == 0, "reward must be zero");
        require(!locked, "Only allowed to run once");
        locked = true;
        require(block.timestamp >= startTime && block.timestamp <= startTime + 60* 60 * 24* 7, "7 Day window to activate StartTime");
        challengeNumber = blockhash(block.number - 1); //generate a new one so we can start fresh
        reward_amount = (50 * 10**18) / (2**(rewardEra));
        maxSupplyForEra = (_maxTotalSupply - _maxTotalSupply.div(2**(rewardEra + 1)));
        miningTarget = (2**234);  //0xBTCs starting difficulty of 1 //change it to 2**234 for launch please
        latestDifficultyPeriodStarted2 = block.timestamp;
        latestDifficultyPeriodStarted = block.number;	
        epochOld = 0;
        epochCount = 0;//number of 'blocks' mined
        require(usedChallenges[challengeNumber] == false);
        usedChallenges[challengeNumber] = true;
        return true;
    }



    /// @notice Calculates Token2Per_return given a multiplier
    /// @dev Returns Token2Per_return to scale base reward amounts
    /// @dev Higher multipliers progressively reduce ETH distribution rewards
    /// @param multiplier The multiplier value to determine scaling tier
    /// @return Token2Per_return The amount of Token to be distributed
    /// @custom:scaling-tiers
    function getToken2Per(uint multiplier) internal pure returns (uint Token2Per_return) {
        if (multiplier < 200) {
            Token2Per_return = 0.00000180 ether * multiplier / 200; 
        } else if (multiplier < 400) {
            Token2Per_return = 0.00000300 ether * multiplier / 400; 
        } else if (multiplier < 800) {
            Token2Per_return = 0.00000500 ether * multiplier / 800; 
        } else if (multiplier < 1600) {
            Token2Per_return = 0.00000800 ether * multiplier / 1600; 
        } else if (multiplier < 3000) {
            Token2Per_return = 0.00001200 ether * multiplier / 3000; 
        } else if (multiplier < 5000) {
            Token2Per_return = 0.00001500 ether * multiplier / 5000; 
        } else if (multiplier < 10000) {
            Token2Per_return = 0.00002000 ether * multiplier / 10000; 
        } else if (multiplier < 20000) {
            Token2Per_return = 0.00003000 ether * multiplier / 20000; 
        } else if (multiplier < 40000) {
            Token2Per_return = 0.00005000 ether * multiplier / 40000; 
        } else if (multiplier < 100000) {
            Token2Per_return = 0.00010000 ether * multiplier / 100000; 
        } else if (multiplier < 200000) {
            Token2Per_return = 0.00015000 ether * multiplier / 200000; 
        } else if (multiplier < 500000) {
            Token2Per_return = 0.00025000 ether * multiplier / 500000; 
        } else if (multiplier < 1000000) {
            Token2Per_return = 0.00050000 ether * multiplier / 1000000; 
        } else {
        	Token2Per_return = mulDiv(0.00050000 ether, multiplier, 1000000);
    	    return Token2Per_return;                  // dynamic multiplier for extreme difficulties
       
        }
    	return Token2Per_return;                  // dynamic multiplier for extreme difficulties
    }



    /// @notice Distributes accumulated rewards to liquidity providers when adjustment threshold is met
    /// @dev Executes every BLOCKS_PER_READJUSTMENT / 4 blocks to manage LP reward distribution
    /// @dev Calculates multiplier based on contract balance vs 0.15 ETH adjustment threshold
    /// @dev Determines scaling factor for Token2Per using the calculated multiplier
    /// @dev Transfers accumulated B0x tokens to LP reward address
    /// @dev Conditionally sends ETH to LP reward address if balance is sufficient
    /// @dev Updates tracking variables for next execution cycle
    /// @custom:requirements Contract must have sufficient balance for ETH transfers
    /// @custom:requirements B0x mining token contract must be valid and have sufficient balance
    /// @custom:requirements LP reward address must be set and valid
    /// @custom:state-changes Updates multipler, Token2Per, sentToLP, give0x flag, lastRunB0x, lastRunETH
    function ARewardSender() public {
        //runs every _BLOCKS_PER_READJUSTMENT / 4
	uint local_blocks_per = _BLOCKS_PER_READJUSTMENT;
        if(rewardEra > 48){
		if(IERC20(B0x_Mining_TOKEN_ADDRESS).balanceOf(address(this)) < (reward_amount*((local_blocks_per*2)+88))) {
       		reward_amount = 0;
       	}else{
			reward_amount = (50 * 10**18) / (2**(rewardEra));
		}
	}
	
        //runs every _BLOCKS_PER_READJUSTMENT / 4
        uint256 ADJUSTMENT_THRESHOLD = 0.1499999999999 ether;
        multipler = (address(this).balance*100).divRound(ADJUSTMENT_THRESHOLD);     //Adjust every 0.15 eth or 700$

        
        // Use a more compact approach to determine the scaling factor
        Token2Per = getToken2Per(multipler);
        
        
        uint B0x_To_LPERS = tokensMinted - lastRunB0x;
        uint ETH_To_LPERs = totalETH_MintedToMiners - lastRunETH;

        IERC20(B0x_Mining_TOKEN_ADDRESS).transfer(AddressLPReward, B0x_To_LPERS);

        sentToLP = sentToLP.add(B0x_To_LPERS);

        if(address(this).balance > (80 * (Token2Per * local_blocks_per/2))) {  // at least enough blocks to rerun this function for both LPRewards and Users
            address payable to = payable(AddressLPReward);
            (bool success, ) = to.call{value: ETH_To_LPERs}("");
            require(success, "ETH transfer failed");

            give0x = 1;
            IETHConverter(AddressLPReward).convertETHtoWETH();
        } else { 
            give0x = 0;
        }
        
        lastRunB0x = tokensMinted;
        lastRunETH = totalETH_MintedToMiners;
    }


    ///
    // Based Work Token Minting
    ///  
    
    /// @notice Legacy compatibility function for single nonce mining operations
    /// @dev Wrapper that converts single nonce to array format for multi_MintTo function
    /// @dev Maintains backward compatibility with standard mining interfaces
    /// @param nonce The nonce value that solves the current mining challenge
    /// @param challenge_digest The digest parameter (unused but kept for interface compatibility)
    /// @return success True if mining operation resulted in token reward (> 0 tokens minted)
    /// @custom:compatibility Provides standard mining function interface for miners
    /// @custom:delegation Internally delegates to multi_MintTo with single-element nonce array
    function mint(uint256 nonce, bytes32 challenge_digest) public returns (bool success) {
        uint256[] memory nonceArray = new uint256[](1);
        nonceArray[0] = nonce;
        return multi_MintTo(msg.sender, nonceArray, _BLOCKS_PER_READJUSTMENT, 0) > 0;
    }
    
    
    /// @notice Advanced mining function that processes multiple solutions in a single transaction
    /// @dev Allows miners to submit multiple valid nonces at once for improved efficiency and gas optimization
    /// @dev Supports batch mining with configurable limits and timing requirements
    /// @param mintToAddress The address that will receive the mined tokens (can be different from msg.sender)
    /// @param nonce Array of nonce values that solve the current mining challenge
    /// @param maxAnswers Maximum number of solutions to process from the nonce array
    /// @param minPreviousBlockTimeDifference Minimum time difference required from previous block (timing constraint)
    /// @return NumberOfMintsDone The actual number of successful mining operations completed
    /// @custom:efficiency Processes multiple solutions in one transaction to reduce gas costs
    /// @custom:flexibility Supports delegation by allowing different mint recipient address
    /// @custom:batching Can process up to maxAnswers solutions or entire array if maxAnswers is 0
    /// @custom:timing May include timing constraints via minPreviousBlockTimeDifference parameter
    function multi_MintTo(address mintToAddress, uint256[] memory nonce, uint maxAnswers, uint minPreviousBlockTimeDifference) public payable returns (uint NumberOfMintsDone) {
        uint blocktimestampsLocal = block.timestamp;
        uint NextEpochCount = blocksToReadjust();
        uint xLoop = 0;
        uint GoodLoops = 0;
        uint prevBlockTime = previousBlockTime;
        uint targetTimez = targetTime;
        bytes32 localChallengeNumber = challengeNumber;
        uint localMiningTarget = miningTarget;
        uint miningTargetCloseToAdjustment = localMiningTarget;
        
        for (xLoop = 0; xLoop < nonce.length; xLoop++) {
            bytes32 digest = keccak256(abi.encodePacked(localChallengeNumber, msg.sender, nonce[xLoop]));
            uint localDigestINT = uint(digest);
            uint multiplier_local = localMiningTarget / localDigestINT;
            uint compensation = calculateCompensation(multiplier_local);

            if(GoodLoops + compensation > maxAnswers) {
                compensation = maxAnswers - GoodLoops;
            }

            if(GoodLoops + compensation >= NextEpochCount) {
                compensation = NextEpochCount - GoodLoops;
                uint SecPer1Compensation = (blocktimestampsLocal - prevBlockTime) / (NextEpochCount);
                
                if(targetTimez < SecPer1Compensation) {
                    uint timeMultiplier = SecPer1Compensation / (targetTimez / 2);
                    uint targetDivisor = targetTimez / (targetTimez / 2);
                    
                    // First check if result would exceed 2^253
                    uint MAX_SAFE_VALUE = 1 << 253; // 2^253

                    // Check if miningTarget * timeMultiplier would overflow
                    if (timeMultiplier > MAX_SAFE_VALUE / miningTarget) {
                        // Would overflow, use maximum safe value
                        miningTargetCloseToAdjustment = MAX_SAFE_VALUE / targetDivisor;
                    } else {
                        // Safe to calculate
                        uint256 product = miningTarget * timeMultiplier;
                        miningTargetCloseToAdjustment = product / targetDivisor;
                    }

                    if(usedCombinations[localChallengeNumber][digest] || localDigestINT >= miningTargetCloseToAdjustment) {
                        continue;
                    }
                } else if (usedCombinations[localChallengeNumber][digest] || localDigestINT >= localMiningTarget) {
                    continue;
                }
            } else if (usedCombinations[localChallengeNumber][digest] || localDigestINT >= localMiningTarget) {
                continue;
            }
            
            GoodLoops = GoodLoops.add(compensation);
            usedCombinations[localChallengeNumber][digest] = true;
            
            if(GoodLoops >= maxAnswers) {
                GoodLoops = maxAnswers;
                break;
            }
            if (GoodLoops >= NextEpochCount) {
                GoodLoops = NextEpochCount;
                break;
            }
        }

        require(GoodLoops > 0, "Must have valid solve in the answers");
        
        uint dif = (blocktimestampsLocal - prevBlockTime) / GoodLoops;
        require(minPreviousBlockTimeDifference <= dif, "Not enough Difference in prevBlockTime / GoodLoops, compared to minPreviousBlockTimeDifference function variable");


        uint256 x = ((blocktimestampsLocal - prevBlockTime) / GoodLoops * 888) / targetTimez;
        uint ratio = x * 100 / 888;
        if(ratio > 100) {
            slowBlocks = slowBlocks.add(GoodLoops);
        }
        
        ( uint B0x_To_Send_User, uint totalETH_To_Send_User, uint totalETH_For_Contract ) = TotalForContract(GoodLoops, NextEpochCount);
        
        
        totalETH_MintedToMiners = totalETH_MintedToMiners + totalETH_To_Send_User;
        
	if (totalETH_To_Send_User >= totalETH_For_Contract) {
	    // Case 1: User is net receiving ETH
	    uint payout = totalETH_To_Send_User - totalETH_For_Contract;
	    // User gets payout, contract keeps nothing extra
	    totalETH_To_Send_User = msg.value + payout; // if msg.value > 0, it's just extra refund

	} else {
	    // Case 2: User must contribute ETH
	    uint required = totalETH_For_Contract - totalETH_To_Send_User;

	    if (msg.value < required) {
		revert(
		    string(
		        abi.encodePacked(
		            "Need to send required ETH. Required: ",
		            toString(required),
		            " wei, Sent: ",
		            toString(msg.value),
		            " wei"
		        )
		    )
		);
	    }

	    // Contract is satisfied, user might still receive excess if msg.value > required
	    totalETH_To_Send_User = msg.value - required; 
	}


		
				
		        
        _startNewMiningEpoch(NextEpochCount, GoodLoops);


        // If max supply for the era will be exceeded next reward round then enter the new era before that happens
        // 59 is the final reward era, almost all tokens minted, will continue minting at 55s Eras reward_amount until all B0x Tokens are gone from contract basically
        if(tokensMinted.add(B0x_To_Send_User) > maxSupplyForEra && rewardEra < 55) {
            rewardEra = rewardEra + 1;
            maxSupplyForEra = _maxTotalSupply - _maxTotalSupply.div(2**(rewardEra + 1));
            reward_amount = (50 * 10**18) / (2**(rewardEra));
            B0x_To_Send_User = B0x_To_Send_User.div(2);
        }
        
        IERC20(B0x_Mining_TOKEN_ADDRESS).transfer(mintToAddress, B0x_To_Send_User);
        tokensMinted = tokensMinted.add(B0x_To_Send_User);
        previousBlockTime = blocktimestampsLocal;
                    
                    
        address payable to = payable(mintToAddress);
        to.call{value: totalETH_To_Send_User}("");

        emit Mint(msg.sender, B0x_To_Send_User, epochCount, localChallengeNumber);
        return GoodLoops;
    }
    
    

	
	//Remember we are special not like Bitcoin or 0xBitcoin we use 2**253 so it may seem large divide by 2**19 to fix
	//Also this only works on last block of the challenge/2016 blocks.
	function calcReduceDifficulty(uint prevBlockTime, uint NumberOfCompensation)public view returns (uint miningDifficultyReduced){

		uint miningTargetz = calcReduceTarget(prevBlockTime, NumberOfCompensation);
		miningDifficultyReduced = _MAXIMUM_TARGET.div(miningTargetz);
		return miningDifficultyReduced;        

	}



	//Remember we are special not like Bitcoin or 0xBitcoin we use 2**253 so it may seem large divide by 2**19 to fix
	//Also this only works on last block of the challenge/2016 blocks.
	function calcReduceTarget(uint prevBlockTime, uint NumberOfCompensation)public view returns (uint miningTargetReduced){

	    uint targetTimez=targetTime;
	    uint blockTimestampz = block.timestamp;
	    uint SecPer1Compensation = (blockTimestampz - prevBlockTime)/(NumberOfCompensation);
	    if(targetTimez < SecPer1Compensation){
	    	uint timeMultiplier = SecPer1Compensation/(targetTimez/2);
            uint targetDivisor = targetTime/(targetTimez/2);
                        
            uint MAX_SAFE_VALUE = 1 << 253; // 2^255


                // Check if miningTarget * timeMultiplier would overflow
            if (timeMultiplier > MAX_SAFE_VALUE / miningTarget) {
                // Would overflow, use maximum safe value
                return  MAX_SAFE_VALUE;
            } 

                // Safe to calculate
                uint256 product = miningTarget * timeMultiplier;
               return product / targetDivisor;
            

                        
					
	    }
    }


    ///
    ///// NFT Minting ////
    ///
    
    
    /// @notice Mints B0x tokens through standard mining while also transferring NFTs as bonus rewards
    /// @dev Performs normal multi_MintTo mining operation and additionally transfers specific NFTs to the miner
    /// @dev Can only be called during specific network conditions: near difficulty adjustment with slow block performance
    /// @param nftAddresses Array of NFT contract addresses that this contract holds
    /// @param nftNumbers Array of specific token IDs that this contract owns and will transfer
    /// @param nonces Array of nonce values that solve the current mining challenge
    /// @param maxNumberOfAnswersInMint Maximum number of solutions to process in this transaction
    /// @return success True if both mining and NFT transfer operations completed successfully
    /// @custom:timing-requirements Only available when blocksToReadjust() == 1 (near adjustment)
    /// @custom:performance-gate Requires blocksFromReadjust() < 5 and significant slow blocks
    /// @custom:slow-block-threshold Needs slowBlocks > _BLOCKS_PER_READJUSTMENT / 8 (poor network performance)
    /// @custom:dual-rewards Provides both B0x token mining rewards and NFT bonus rewards
    /// @custom:array-validation Requires nftAddresses and nftNumbers arrays to have matching lengths
    /// @custom:mining-validation Must successfully complete multi_MintTo operation before NFT transfer
    function mintNFT(
        address[] memory nftAddresses, 
        uint[] memory nftNumbers, 
        uint256[] memory nonces, 
        uint maxNumberOfAnswersInMint
    ) public payable returns (bool success) {
        require(blocksToReadjust() == 1 && blocksFromReadjust() < 5 && slowBlocks > _BLOCKS_PER_READJUSTMENT / 8, "NFT Adjust Bad");
        require(nftAddresses.length == nftNumbers.length, "Array length mismatch");
        
        require(multi_MintTo(msg.sender, nonces, maxNumberOfAnswersInMint, 0) > 0, "mintfailed nft");
        
        // Try each NFT until one succeeds
        for (uint i = 0; i < nftAddresses.length; i++) {
            address nftaddy = nftAddresses[i];
            uint nftNumber = nftNumbers[i];
            
            try IERC165(nftaddy).supportsInterface(0xd9b67a26) returns (bool isERC1155) {
                if (isERC1155) {
                    // Try ERC-1155 transfer
                    try IERC1155(nftaddy).safeTransferFrom(address(this), msg.sender, nftNumber, 1, "") {
                        slowBlocks = 0;
                        return true; // Success!
                    } catch {
                        // Continue to next NFT
                        continue;
                    }
                }
            } catch {
                // Interface check failed, continue
            }
            
            try IERC165(nftaddy).supportsInterface(0x80ac58cd) returns (bool isERC721) {
                if (isERC721) {
                    // Try ERC-721 transfer
                    try IERC721(nftaddy).safeTransferFrom(address(this), msg.sender, nftNumber, "") {
                        slowBlocks = 0;
                        return true; // Success!
                    } catch {
                        // Continue to next NFT
                        continue;
                    }
                }
            } catch {
                // Interface check failed, continue
            }
        }
        //Allow bad NFT users
        return true;
    }



    
    /// @notice Calculates the base-2 logarithm of a given number
    /// @dev Simple bit-shifting implementation for logarithm calculation
    /// @dev Used in compensation calculations for mining difficulty scaling
    /// @param x The input value to calculate log2 for
    /// @return uint256 The floor of log2(x), returns 0 for x <= 1
    function log2(uint256 x) public pure returns (uint256) {
        uint256 n = 0;
        while (x > 1) {
            x >>= 1;
            n++;
        }
        return n;
    }

    /// @notice Calculates mining compensation based on solution difficulty multiplier
    /// @dev Higher multipliers (better solutions) receive exponentially more compensation
    /// @dev Uses logarithmic scaling to reward significantly better solutions
    /// @param multiplier The difficulty multiplier from the mining solution quality
    /// @return uint256 The compensation amount (number of blocks/solutions this counts as)
    /// @custom:scaling Returns 1 for multiplier < 4, then log2(multiplier/2) + 1 for higher values
    /// @custom:example multiplier=8 gives log2(4)+1=3, multiplier=16 gives log2(8)+1=4
    function calculateCompensation(uint256 multiplier) public pure returns (uint256) {
        if(multiplier < 4) {
            return 1;
        }
        return log2(multiplier/2) + 1;
    }
    
    /// @notice Returns the total amount owed based on current time since last mint
    /// @dev Convenience wrapper that calculates owed amount using current block timestamp
    /// @return totalOwed The total amount owed based on time elapsed since previousBlockTime
    function totalOwedAtCurrentTime() public view returns (uint totalOwed) {
        return totalOwedAtTime(block.timestamp - previousBlockTime);
    }

    /// @notice Calculates total amount owed based on time elapsed since previous mint
    /// @dev Uses piecewise function with different formulas for different time ratios
    /// @dev Optimized for ratio around 3000 where totalOwed/100000000 ≈ 71.6
    /// @param secondsFromPreviousMint Time in seconds since the last successful mint operation
    /// @return totalOwed The calculated total amount owed based on elapsed time
    /// @custom:formula-low For ratio < 3000: quadratic formula (508606*(15*x²)/888² + 9943920*x/888)
    /// @custom:formula-high For ratio >= 3000: linear formula (24*x*5086060/888 + 3456750000)
    /// @custom:scaling Uses 888 as scaling factor related to targetTime normalization
    function totalOwedAtTime(uint secondsFromPreviousMint) public view returns (uint totalOwed) {
        totalOwed = 0;
        uint256 x = ((secondsFromPreviousMint) * 888) / targetTime;
        uint ratio = x * 100 / 888;
    
        //best @ 3000 ratio totalOwed / 100000000 = 71.6
        if(ratio < 3000) {
            totalOwed = (508606*(15*x**2)).div(888 ** 2) + (9943920 * (x)).div(888);
        } else {
            totalOwed = (24*x*5086060).div(888) + 3456750000;
        }
        
        return totalOwed;
    }


    /// @notice Returns the ETH amount to send to user based on current time since last mint
    /// @dev Convenience wrapper that calculates ETH distribution using current block timestamp
    /// @return totalETHToSendToUser The ETH amount to distribute based on elapsed time since previousBlockTime
    function totalETHtoSendUserAtCurrentTime() public view returns (uint totalETHToSendToUser) {
        return totalETHtoSendUserAtTime(block.timestamp - previousBlockTime);
    }


    /// @notice Calculates ETH distribution amount based on time elapsed and system state
    /// @dev Uses piecewise calculation similar to totalOwedAtTime with additional ETH-specific scaling
    /// @dev ETH distribution depends on give0x flag and uses Token2Per as scaling factor
    /// @param secondsFromPreviousMint Time in seconds since the last successful mint operation
    /// @return totalETHToSendToUser The calculated ETH amount to distribute to the user
    /// @custom:gating Only distributes ETH when give0x > 0 (sufficient contract reserves)
    /// @custom:ratio-scaling Different formulas for ratio < 2000 vs >= 2000 (more conservative at high ratios)
    /// @custom:scaling-factors Uses Token2Per and totalOwed/100000000 for amount calculations
    /// @custom:reserve-dependent Distribution amount scales with give0x multiplier for reserve management
    function totalETHtoSendUserAtTime(uint secondsFromPreviousMint) public view returns (uint totalETHToSendToUser) {
        uint totalOwed = 0;
        uint totalETHtoSendUser = 0;
        uint256 x = ((secondsFromPreviousMint) * 888) / targetTime;
        uint ratio = x * 100 / 888;
    
        //best @ 3000 ratio totalOwed / 100000000 = 71.6
        if(ratio < 3000) {
            totalOwed = (508606*(15*x**2)).div(888 ** 2) + (9943920 * (x)).div(888);
        } else {
            totalOwed = (24*x*5086060).div(888) + 3456750000;
        }
        
        if(give0x > 0) {
            if(ratio < 2000) {
                totalETHtoSendUser = ((totalOwed * Token2Per * give0x).div(100000000));
            } else {
                totalETHtoSendUser = ((320 * Token2Per * give0x).div(10));
            }
        }
        
        return totalETHtoSendUser;
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



    /// @notice Retrieves the current ETH price with maximum precision using FullMath library
    /// @dev Most precise method for ETH price calculation, recommended for accurate price feeds
    /// @dev Uses Uniswap V3 pool data to calculate current ETH/USDC price with full precision
    /// @return price ETH price multiplied by 10^22 for maximum precision (10^12 for USDC decimals + 10^10 for precision)
    /// @custom:precision Returns price scaled by 10^22 to maintain full decimal precision
    /// @custom:decimals Accounts for USDC's 6 decimal places with additional 10^16 scaling for precision
    /// @custom:library Uses FullMath library for overflow-safe arithmetic operations
    /// @custom:source Queries live Uniswap V3 ETH/USDC pool for real-time pricing data
    function getETHPricePrecise() public view returns (uint256 price) {
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
            uint256 priceX128 = mulDiv(sqrtPriceX96, sqrtPriceX96, 1 << 64);
            return mulDiv(priceX128, 1e24, 1 << 128);
        }
    }


    /// @notice Calculates comprehensive mining results including B0x tokens, ETH flows, and current ETH price
    /// @dev Simulates mining operation results without executing the actual mining transaction, at current previousblockTime
    /// @dev Handles both regular mining and difficulty adjustment scenarios with different calculations
    /// @param compensation The mining compensation multiplier based on solution quality
    /// @return B0xYouGet Amount of B0x tokens the miner would receive
    /// @return ETHYouGet Amount of ETH the miner would receive (if any)
    /// @return ETHyouSpend Amount of ETH the miner would need to send (if any)
    /// @return ETHPrice Current ETH price with maximum precision (scaled by 10^22)
    /// @return secondsFromPreviousMintreturn Time elapsed since last mint operation
    /// @custom:simulation Provides preview of mining results without state changes
    /// @custom:difficulty-aware Adjusts calculations based on proximity to difficulty adjustment
    /// @custom:price-floor Enforces minimum ETH price per token (minAmountETH)
    /// @custom:overflow-safe Uses safe arithmetic to prevent overflow in difficulty calculations
    function TotalTotalsAndETHpriceAndCurrentMintTime(uint compensation) 
        public 
        view
        returns (
            uint B0xYouGet, 
            uint ETHYouGet, 
            uint ETHyouSpend, 
            uint ETHPrice, 
            uint secondsFromPreviousMintreturn
        ) {
        uint secondsFromPreviousMint = block.timestamp - previousBlockTime; 
        secondsFromPreviousMintreturn = secondsFromPreviousMint;
        ETHPrice = getETHPricePrecise();
        ( B0xYouGet, ETHYouGet, ETHyouSpend) = TotalForContract(compensation, blocksToReadjust());
    }
    
    
    
    /// @notice Calculates comprehensive mining results including B0x tokens, ETH flows, and current ETH price
    /// @dev Simulates mining operation results without executing the actual mining transaction, at current previousblockTime
    /// @dev Handles both regular mining and difficulty adjustment scenarios with different calculations
    /// @param compensation The mining compensation multiplier based on solution quality
    /// @param blocksToReadjustMENT BlocksToReadjustment
    /// @return B0xYouGet Amount of B0x tokens the miner would receive
    /// @return ETHYouGet Amount of ETH the miner would receive (if any)
    /// @return ETHyouSpend Amount of ETH the miner would need to send (if any)
    /// @custom:simulation Provides preview of mining results without state changes
    /// @custom:difficulty-aware Adjusts calculations based on proximity to difficulty adjustment
    /// @custom:price-floor Enforces minimum ETH price per token (minAmountETH)
    /// @custom:overflow-safe Uses safe arithmetic to prevent overflow in difficulty calculations
    function TotalForContract(uint compensation, uint blocksToReadjustMENT) 
        public 
        view
        returns (
            uint B0xYouGet, 
            uint ETHYouGet, 
            uint ETHyouSpend
        ) {
        uint miningDiffz = getMiningDifficulty();
        uint blkzToAdjustment = blocksToReadjustMENT;
        uint secondsFromPreviousMint = block.timestamp - previousBlockTime;


        // Prevent division by zero
        require(compensation > 0, "Compensation must be greater than 0");
        
        uint miningTargetCloseToAdjustment = miningTarget;
        
        if (compensation >= blkzToAdjustment) {
            uint SecPer1Compensation = (block.timestamp - previousBlockTime) / (blkzToAdjustment);
            
            if(targetTime < SecPer1Compensation) {
                uint timeMultiplier = SecPer1Compensation / (targetTime / 2);
                uint targetDivisor = targetTime / (targetTime / 2);
                
                // First check if result would exceed 2^253
                uint MAX_SAFE_VALUE = 1 << 253; // 2^253
                miningTargetCloseToAdjustment = 0;
                
                // Check if miningTarget * timeMultiplier would overflow
                if (timeMultiplier > MAX_SAFE_VALUE / miningTarget) {
                    // Would overflow, use maximum safe value
                    miningTargetCloseToAdjustment = MAX_SAFE_VALUE;
                } else {
                    // Safe to calculate
                    uint256 product = miningTarget * timeMultiplier;
                    miningTargetCloseToAdjustment = product / targetDivisor;
                }
            }

            uint miningDiffForAdjustment = _MAXIMUM_TARGET.div(miningTargetCloseToAdjustment);

            B0xYouGet = totalB0xToSendAtTime(secondsFromPreviousMint / blkzToAdjustment, 1);
            ETHyouSpend = totalETHowedAtTime(secondsFromPreviousMint / blkzToAdjustment, miningDiffForAdjustment, 1);

            B0xYouGet = B0xYouGet + (blkzToAdjustment - 1) * totalB0xToSendAtTime(secondsFromPreviousMint / blkzToAdjustment, blkzToAdjustment);
            ETHyouSpend = ETHyouSpend + (blkzToAdjustment - 1) * totalETHowedAtTime(secondsFromPreviousMint / blkzToAdjustment, miningDiffz, blkzToAdjustment);
            
            if (B0xYouGet != 0) {
                uint local_minAmountETH = (ETHyouSpend * 1e18) / B0xYouGet;
                if (local_minAmountETH < minAmountETH) {
                    ETHyouSpend = (minAmountETH * B0xYouGet) / 1e18;
                }
            }
        
        } else {
            B0xYouGet = compensation * totalB0xToSendAtTime(secondsFromPreviousMint / compensation, compensation);
            ETHYouGet = compensation * totalETHtoSendUserAtTime(secondsFromPreviousMint / compensation);
            ETHyouSpend = compensation * totalETHowedAtTime(secondsFromPreviousMint / compensation, miningDiffz, compensation);

            if (B0xYouGet != 0) {
                uint local_minAmountETH = (ETHyouSpend * 1e18) / B0xYouGet;
                if (local_minAmountETH < minAmountETH) {
                    ETHyouSpend = (minAmountETH * B0xYouGet) / 1e18;
                }
            }
        }
        
    }
    
    
    
    
    /// @notice Calculates the total B0x tokens to reward a miner based on timing and adjustment context
    /// @dev Determines token reward amount using current reward era and timing-based scaling
    /// @dev Provides the core token reward calculation for successful mining operations
    /// @param secondsFromPreviousMint Time elapsed since last mining operation in seconds
    /// @param blocksToAdjust Number of blocks remaining until next difficulty adjustment
    /// @return totalB0xToSendToUser The amount of B0x tokens to reward the miner
    /// @custom:reward-era Uses current rewardEra to determine base reward amount (50 / 2^rewardEra)
    /// @custom:timing-based Reward amount may scale based on time elapsed since previous mint
    /// @custom:adjustment-context Uses blocksToAdjust for reward calculation context
    /// @custom:halving-compatible Works with Bitcoin-style reward halving mechanism
    function totalB0xToSendAtTime(uint secondsFromPreviousMint, uint blocksToAdjust) public view returns (uint totalB0xToSendToUser) {
        totalB0xToSendToUser = reward_amount;
        // Calculate adjustment factor (using 1000 as fixed point multiplier)
        uint256 adjustmentFactor = (secondsFromPreviousMint * 1000) / targetTime;
        
        if  (blocksToAdjust != 1 && adjustmentFactor > 1000) {
            adjustmentFactor = 1000;  // Cap at at 1x normal fees 
        }else if (adjustmentFactor < 250){
            adjustmentFactor = 250;
        }else if ( blocksToAdjust == 1 && adjustmentFactor > 2000){ //max 2x unless targertTimezMulti =>4 then up to 16x
            uint TimeSinceLastDifficultyPeriod2 = block.timestamp - latestDifficultyPeriodStarted2 + 1;
        	uint epochTotal = (epochCount) - epochOld; //calculated after startNewMiningEpoch
        	if(epochTotal == 0){
        		epochTotal = epochTotal + 1;
        	}
        	uint totalTimePerEpoch = TimeSinceLastDifficultyPeriod2 / epochTotal;
        	uint targetTimezMulti = totalTimePerEpoch / targetTime;
        	
        	if(targetTimezMulti < 4){
	      	    adjustmentFactor = 2000;
         	}else if(adjustmentFactor > 4000 && targetTimezMulti >= 4){
	     	    adjustmentFactor = 4000;
		}
        }
        totalB0xToSendToUser = (totalB0xToSendToUser*adjustmentFactor )/ 1000;

    }





    
	
    /// @notice Adjusts ETH payment required from miners based on mining difficulty
    /// @dev Uses 0xBTC difficulty standards with 524,288 normalization factor
    /// @dev Implements anti-FPGA measures by requiring higher ETH payments at higher difficulties
    /// @dev OPTIMIZED: Slowest increase in 500k-10M range for hobby miners
    /// @param baseContractFee The base ETH payment amount that needs adjustment
    /// @param difficulty The current mining difficulty (0xBTC standard)
    /// @return uint256 The adjusted ETH amount that miners must send
    /// @custom:scaling Uses bit shifting for gas-efficient multiplication/division operations
    /// @custom:anti-fpga Higher ETH payments required at higher difficulties to discourage FPGA farming
    /// @custom:hobby-optimized Gentlest scaling in 500k-10M difficulty range for hobby miners
    /// @custom:economic-barrier Progressive scaling with hobby-friendly sweet spot
    function adjustETHtoSendByDifficulty(uint256 baseContractFee, uint256 difficulty) internal pure returns (uint256) {
        // 524_288 divide by this because we are using 0xBTC difficulty standards
        // 3.2 Million = 31 Gh/s
        // 3 million = 1 FPGA so make it best since we dont want FPGA make this the best era
        // HOBBY MINING SWEET SPOT: 500k - 10M difficulty gets the gentlest scaling
        
        if (difficulty < 1) return baseContractFee >> 13;                                               // divide by 8192 (much less payment required)
        if (difficulty < 1000) return ((baseContractFee >> 7) * difficulty * 2) / 999;                  // divide by 128 with fractional scaling
        if (difficulty < 5000) return ((baseContractFee >> 6) * difficulty * 2) / 4999;                 // divide by 64 with fractional scaling
        if (difficulty < 10_000) return ((baseContractFee >> 5) * difficulty * 2) / 9999;               // divide by 32 with fractional scaling
        if (difficulty < 25_000) return ((baseContractFee >> 4) * difficulty * 2) / 24_999;             // divide by 16 with fractional scaling
        if (difficulty < 50_000) return ((baseContractFee >> 3) * difficulty * 2) / 49_999;             // divide by 8 with fractional scaling
        if (difficulty < 100_000) return ((baseContractFee >> 2) * difficulty * 2) / 100_000;           // divide by 4 with fractional scaling
        if (difficulty < 250_000) return ((baseContractFee >> 1) * difficulty * 2) / 250_000;           // divide by 2 with fractional scaling
        
        // HOBBY MINING OPTIMIZATION ZONE: 500k - 10M difficulty
        // Extended lower-fee zones and gentler transitions for hobby miners
        if (difficulty < 500_000) return (((baseContractFee * 2) / 3) * difficulty * 2) / 500_000;      // multiply by 2/3 with fractional scaling
        if (difficulty < 750_000) return (((baseContractFee * 3) / 4) * difficulty * 2) / 750_000;      // multiply by 3/4 - gentle increase
        if (difficulty < 1_500_000) return (((baseContractFee * 7) / 8) * difficulty * 2) / 1_500_000;  // multiply by 7/8 - very gentle
        if (difficulty < 3_000_000) return (baseContractFee * difficulty * 2) / 3_000_000;              // base payment - extended range
        if (difficulty < 6_000_000) return (((baseContractFee * 9) / 8) * difficulty * 2) / 6_000_000;  // multiply by 9/8 - minimal increase
        if (difficulty < 10_000_000) return (((baseContractFee * 5) / 4) * difficulty * 2) / 10_000_000;// multiply by 5/4 - gentle ramp up
        
        // FPGA DETERRENT ZONE: Aggressive scaling beyond hobby mining range
        if (difficulty < 20_000_000) return ((baseContractFee << 1) * difficulty * 2) / 20_000_000;     // multiply by 2 - sharp increase
        if (difficulty < 50_000_000) return ((baseContractFee << 2) * difficulty * 2) / 50_000_000;     // multiply by 4 with fractional scaling
        if (difficulty < 100_000_000) return ((baseContractFee << 3) * difficulty * 2) / 100_000_000;   // multiply by 8 with fractional scaling
        if (difficulty < 250_000_000) return ((baseContractFee << 4) * difficulty * 2) / 250_000_000;   // multiply by 16 with fractional scaling
        if (difficulty < 500_000_000) return ((baseContractFee << 5) * difficulty * 2) / 500_000_000;   // multiply by 32 with fractional scaling
        if (difficulty < 1_000_000_000) return ((baseContractFee << 6) * difficulty * 2) / 1_000_000_000; // multiply by 64 with fractional scaling
        if (difficulty < 2_000_000_000) return ((baseContractFee << 7) * difficulty * 2) / 2_000_000_000; // multiply by 128 with fractional scaling
        if (difficulty < 3_000_000_000) return ((baseContractFee << 8) * difficulty * 2) / 3_000_000_000; // multiply by 256 with fractional scaling
        if (difficulty < 5_000_000_000) return ((baseContractFee << 9) * difficulty * 2) / 5_000_000_000; // multiply by 512 with fractional scaling

        return mulDiv((baseContractFee << 9), difficulty * 2, 5_000_000_000);                             // dynamic multiplier for extreme difficulties
    }



    /// @notice Calculates the total ETH amount a miner must send based on mining parameters
    /// @dev Combines time-based calculation with difficulty-based adjustment to determine ETH payment
    /// @dev Uses both timing penalties and difficulty scaling to calculate required ETH payment
    /// @param secondsFromPreviousMint Time elapsed since last mining operation in seconds
    /// @param miningDiff Current mining difficulty (0xBTC standard, ~difficulty/524,288)
    /// @param blocksToAdjust Number of blocks remaining until next difficulty adjustment
    /// @return totalETHNeeded The total ETH amount the miner must send with their transaction
    /// @custom:time-based Uses secondsFromPreviousMint to calculate base ETH amount owed
    /// @custom:difficulty-scaling Applies adjustETHtoSendByDifficulty() to scale payment by mining difficulty
    /// @custom:economic-balance Higher difficulty = higher payment, longer time = higher payment
    /// @custom:anti-fpga Higher difficulties require exponentially more ETH to discourage industrial mining
    function totalETHowedAtTime(uint secondsFromPreviousMint, uint miningDiff, uint blocksToAdjust) public view returns (uint totalETHNeeded) {
        uint ETHtoSendContract = 0.00001 ether; //0.00001 ETH = 0.045$ the avg expected cost of Layer 2 tx in the future.

        //524_288 difference between uint public  MAXIMUMTARGET = 2**234; and my new maximum target is uint public constant _MAXIMUM_TARGET = 2**253; 2^19 = 524288
        uint ETHuserMUSTsendContract = adjustETHtoSendByDifficulty(ETHtoSendContract, miningDiff / 524_288);

        
        // Calculate adjustment factor (using 1000 as fixed point multiplier)
        uint256   adjustmentFactor = 4000;  
        if(secondsFromPreviousMint != 0){

                adjustmentFactor = (targetTime * 1000) / secondsFromPreviousMint;  
        }
        
        if (adjustmentFactor > 4000 ) {
            adjustmentFactor = 4000;  // Cap at 4x as much ETH
        }

        //zkBTC terms of difficulty must adjust by dividing by 524_288
        if(adjustmentFactor < 1000 && blocksToAdjust != 1) {
            adjustmentFactor = 1000;   // Cap at 4x less eth (1000/4 = 250)
        }else if( blocksToAdjust == 1 && adjustmentFactor < 500){// cap at 2x unless Target Time >= 4x
            uint TimeSinceLastDifficultyPeriod2 = block.timestamp - latestDifficultyPeriodStarted2 + 1;
        	uint epochTotal = epochCount - epochOld;
        	if(epochTotal == 0){
        		epochTotal = 1;
        	}
        
        
        	uint totalTimePerEpoch = TimeSinceLastDifficultyPeriod2 / epochTotal;
        	uint targetTimezMulti = totalTimePerEpoch / targetTime;
                
            if(targetTimezMulti < 4 && adjustmentFactor < 500){
                adjustmentFactor = 500; // 1000/2= 125   so 8x less ETH needed max if not adjustment factored
            }else if(adjustmentFactor < 250 && targetTimezMulti >= 4){
                adjustmentFactor = 250; // 1000/33.30= 30   so 33.3x less ETH needed max
            }
        }
        
        //If Its 4x Faster charge 4x More, if its 4x Slower charge 4x less
        totalETHNeeded = (ETHuserMUSTsendContract * adjustmentFactor) / 1000;
        return totalETHNeeded;

    }


    /// @notice Advanced mining function that distributes multiple token types based on epoch-based unlock system
    /// @dev Performs standard mining while also distributing accumulated tokens from contract's inventory
    /// @dev Uses epoch-based power-of-2 unlocking system (epoch 2=1 token, epoch 4=2 tokens, epoch 8=3 tokens, etc.)
    /// @param nonce Array of valid nonces for mining solutions
    /// @param ExtraFunds Array of token contract addresses to distribute (must not include main B0x token)
    /// @param MintTo Array of recipient addresses (length must be ExtraFunds.length + 1, first is for main rewards)
    /// @param maxNumberOfSolutions Maximum number of mining solutions to process
    /// @param minBlockTimeDifferencePerSolve Minimum time difference required per solution
    /// @return owed The total amount owed based on mining time calculations
    /// @custom:epoch-unlocking Tokens unlock based on epoch count divisibility by powers of 2
    /// @custom:distribution-logic epoch % 2^(n+1) == 0 determines which tokens get distributed
    /// @custom:array-relationship MintTo.length must equal ExtraFunds.length + 1 (first address gets main rewards)
    /// @custom:token-validation Prevents minting of the main B0x token through ExtraFunds array
    /// @custom:batch-transfers Accumulates all transfers and executes them at once for gas efficiency
    function mintTokensArrayTo(
        uint256[] memory nonce, 
        address[] memory ExtraFunds, 
        address[] memory MintTo, 
        uint maxNumberOfSolutions,  
        uint minBlockTimeDifferencePerSolve
    ) public payable returns (uint256 owed) {
        // MintTo is 1+ExtraFunds.length so always 1 more than ExtraFunds is MintTo, because first mintTo is for the main rewards.
        // Nonce is an array of uint256 nonces that are valid, it will try all
        
        uint prevBlockTimez = previousBlockTime;
        uint NumberofMints = multi_MintTo(MintTo[0], nonce, maxNumberOfSolutions, minBlockTimeDifferencePerSolve);
        uint totalOd = totalOwedAtTime(((block.timestamp - prevBlockTimez) / NumberofMints));
        uint local_epochCount = epochCount;
        uint MAXmaxMax = 0;
        
        if(totalOd == 0) {
            return 0;
        }
        
        require(MintTo.length == ExtraFunds.length + 1, "MintTo has to have an extra address compared to ExtraFunds");
        
        address B0x = B0x_Mining_TOKEN_ADDRESS;
        uint xy = 0;
        uint256[] memory balances = new uint256[](ExtraFunds.length);
        
        // Validate that ExtraFunds doesn't contain the main B0x token
        for(uint z = 0; z < ExtraFunds.length; z++) {
            require(ExtraFunds[z] != B0x, "Not allowed to ERC20 mint Main Token");
        }
        
        // Process each mint and calculate token distributions
        for(uint xzzzz = 0; xzzzz < NumberofMints; xzzzz++) {
            // Determine how many tokens are unlocked for this epoch
            for(xy = 0; xy < ExtraFunds.length; xy++) {
                if(local_epochCount % (2**(xy + 1)) != 0) {
                    break;
                }
                // Validate no duplicate tokens in the array
                for(uint y = xy + 1; y < ExtraFunds.length; y++) {
                    require(ExtraFunds[y] != ExtraFunds[xy], "No printing The same tokens");
                }
            }
            
            if(xy == 0) {
                continue;
            }
            
            if(MAXmaxMax < xy) {
                MAXmaxMax = xy;
            }
            
            uint256 totalOwed = 0;
            uint256 TotalOwned = 0;
            
            // Calculate and accumulate token distributions
            for(uint x = 0; x < xy && x < ExtraFunds.length; x++) {
                // Epoch count must be evenly divisible by 2^n in order to get extra mints
                // ex. epoch 2 = 1 extramint, epoch 4 = 2 extra, epoch 8 = 3 extra mints, ..., epoch 32 = 5 extra mints
                if(local_epochCount % (2**(x + 1)) == 0) {
                    address tokenAddress = ExtraFunds[x];
                    
                    // Use low-level call to get token balance
                    (bool success, bytes memory data) = tokenAddress.staticcall(
                        abi.encodeWithSignature("balanceOf(address)", address(this))
                    );
                    
                    if (success && data.length >= 32) {
                        TotalOwned = abi.decode(data, (uint256));
                    } else {
                        TotalOwned = 0;
                    }
                    
                    if(TotalOwned != 0) {
                        // Special rounding for certain conditions
                        if(x % 3 == 0 && x != 0 && totalOd > 17600000) {
                            totalOwed = (TotalOwned * totalOd).divRound(2**x * 100000000 * 20000);
                        } else {
                            totalOwed = (TotalOwned * totalOd).div(2**x * 100000000 * 20000);
                        }
                        balances[x] = balances[x] + totalOwed;
                    }
                }
            }
            
            local_epochCount = local_epochCount - 1;
        }
        
        // Execute all accumulated transfers at once
        for(uint i = 0; i < MAXmaxMax && i < ExtraFunds.length; i++) {
            address tokenAddress = ExtraFunds[i];
            uint256 amount = balances[i];
            
            if(amount > 0) {
                IERC20(tokenAddress).transfer(AddressLPReward, amount);
                IERC20(tokenAddress).transfer(MintTo[i + 1], amount);
            }
        }
        
        emit MegaMint(msg.sender, epochCount, challengeNumber, MAXmaxMax, totalOd);
        return totalOd;
    }
    
    
    /// @notice Convenience wrapper for mintTokensArrayTo that sends all tokens to the same recipient
    /// @dev Creates an array of identical addresses and delegates to mintTokensArrayTo for processing
    /// @dev Simplifies multi-token mining when all rewards should go to a single address
    /// @param nonce Array of valid nonces for mining solutions
    /// @param ExtraFunds Array of token contract addresses to distribute (including main B0x token)
    /// @param MintTo Single recipient address that will receive all token rewards
    /// @param MaxAnswersInOneSubmit Maximum number of mining solutions to process
    /// @param minBlockTimeDifferencePerSolve Minimum time difference required per solution
    /// @return success Always returns true if the operation completes without reverting
    /// @custom:convenience-wrapper Eliminates need to manually create recipient address arrays
    /// @custom:single-recipient All token rewards (main + extra) go to the same address
    /// @custom:array-creation Dynamically creates MintTo array with length ExtraFunds.length + 1
    /// @custom:delegation Forwards all actual processing to mintTokensArrayTo function
    function mintTokensSameAddress(
        uint256[] memory nonce, 
        address[] memory ExtraFunds, 
        address MintTo, 
        uint MaxAnswersInOneSubmit, 
        uint minBlockTimeDifferencePerSolve
    ) public payable returns (bool success) {
        // MintTo is 1+ExtraFunds.length so always 1 more than ExtraFunds is MintTo, because first mintTo is for the main rewards.
        
        address[] memory dd = new address[](ExtraFunds.length + 1); 
        
        for(uint x = 0; x < (ExtraFunds.length + 1); x++) {
            dd[x] = MintTo;
        }
        
        mintTokensArrayTo(nonce, ExtraFunds, dd, MaxAnswersInOneSubmit, minBlockTimeDifferencePerSolve);
        return true;
    }


    /// @notice Returns the time elapsed since the last successful mining operation
    /// @dev Simple utility function for calculating time differences in mining operations
    /// @return time Time in seconds since previousBlockTime
    function timeFromLastSolve() public view returns (uint256 time) {
        time = block.timestamp - previousBlockTime;
        return time;
    }


    function rewardAtTimeERC20(uint256 timeDifference, address[] memory tokens, uint epochCountStart, uint epochCountEnd) public view returns (uint256[] memory) {
        uint numberOfMints = epochCountEnd - epochCountStart;
        uint totalOwed = totalOwedAtTime(((timeDifference) / numberOfMints));
        
        uint256 TotalOwned;
        uint256[] memory balances = new uint256[](tokens.length);
                    // Validate no duplicate tokens

        for(uint xy =0; xy< tokens.length; xy++){
            
            for(uint y = xy + 1; y < tokens.length; y++) {
                require(tokens[y] != tokens[xy], "No same tokens");
            }
        }
        // Process each mint operation
        for(uint f = 0; f < numberOfMints; f++) {
            for(uint z = 0; z < tokens.length; z++) {
                uint totalToSend = 0;
                
                // Epoch count must be evenly divisible by 2^n in order to get extra mints
                // ex. epoch 2 = 1 extramint, epoch 4 = 2 extra, epoch 8 = 3 extra mints, epoch 16 = 4 extra mints
                if((epochCountEnd - f) % (2**(z + 1)) == 0) {
                    TotalOwned = IERC20(tokens[z]).balanceOf(address(this));
                    
                    if(TotalOwned != 0) {
                        // Special rounding for certain conditions (every 3rd token with high totalOwed)
                        if(z % 3 == 0 && z != 0 && totalOwed > 17600000) {
                            totalToSend = ((2** rewardEra) * TotalOwned * totalOwed).divRound(2**z * 100000000 * 20000);
                        } else {
                            totalToSend = ((2** rewardEra) * TotalOwned * totalOwed).div(2**z * 100000000 * 20000);
                        }
                        
                        balances[z] = balances[z] + totalToSend;
                    }
                }
            }
        }
        
        return balances;
    }

    
    /// @notice Returns the number of blocks mined since the last difficulty adjustment
    /// @dev Simple calculation of blocks completed in current difficulty period
    /// @return blocks Number of epochs mined since last difficulty readjustment
    function blocksFromReadjust() public view returns (uint256 blocks) {
        blocks = (epochCount - epochOld);
        return blocks;
    }
    
    /// @notice Calculates how many blocks remain until the next difficulty adjustment
    /// @dev Complex logic that can trigger early adjustments based on timing and block count conditions
    /// @dev Uses multiple factors: time elapsed, blocks mined, and performance thresholds
    /// @return blocks Number of blocks remaining until difficulty adjustment (1 if conditions met for immediate adjustment)
    /// @custom:early-adjustment Can return 1 block when timing/performance conditions are met
    /// @custom:timing-based Uses 4x target time threshold and minimum block count for early adjustment
    /// @custom:performance-gate Requires at least _BLOCKS_PER_READJUSTMENT/8 blocks for early adjustment
    /// @custom:standard-calculation Returns normal remainder calculation when early conditions not met
    function blocksToReadjust() public view returns (uint blocks) {
        uint256 blktimestamp = block.timestamp;
        uint local_BLOCKS_PER_READJUSTMENT = _BLOCKS_PER_READJUSTMENT;
        uint localEpochCount = epochCount;
        uint localEpochOld = epochOld;
        
        uint TimeSinceLastDifficultyPeriod2 = blktimestamp - latestDifficultyPeriodStarted2;
        uint adjusDiffTargetTime = targetTime * (localEpochCount - localEpochOld);
        uint adjusDiffTime = targetTime * local_BLOCKS_PER_READJUSTMENT;
        uint adjustFinal = 4 * adjusDiffTargetTime;
        uint epochCOUNTS = localEpochCount - localEpochOld;
        
        // If we are 256 blocks (2016/(4*2) = 256) AND at least average 1.5x slowtime on blocks adjust 
        // OR if we are past our Difficulty period (aka slow mining)
        if((TimeSinceLastDifficultyPeriod2 > adjustFinal && epochCOUNTS > local_BLOCKS_PER_READJUSTMENT / (8)) || 
           (adjusDiffTime < TimeSinceLastDifficultyPeriod2)) {
            // Complicated math not needed if only moving 1 block
            blocks = 1;
            return (blocks);
        } else {
            blocks = local_BLOCKS_PER_READJUSTMENT - ((localEpochCount - localEpochOld) % local_BLOCKS_PER_READJUSTMENT);
            return (blocks);
        }
    }

    
    /// @notice Calculates the time in seconds until difficulty adjustment conditions will be met
    /// @dev Mirrors the logic from blocksToReadjust() to determine when adjustment switch will occur
    /// @dev Returns 0 if adjustment conditions are already met (blocksToReadjust() would return 1)
    /// @return secs Time in seconds until adjustment conditions trigger, or 0 if already triggered
    /// @custom:condition-matching Exactly mirrors the dual condition logic from blocksbToReadjust()
    /// @custom:timing-prediction Calculates when either slow mining or 4x time conditions will be met
    /// @custom:block-threshold Considers minimum block requirement (252 blocks) for timing-based adjustment
    /// @custom:immediate-check Returns 0 if adjustment conditions are already satisfied
    function seconds_Until_adjustmentSwitch() public view returns (uint secs) {
        uint256 blktimestamp = block.timestamp;
        uint256 local_BLOCKS_PER_READJUSTMENT = _BLOCKS_PER_READJUSTMENT;
        uint256 localEpochCount = epochCount;
        uint256 localEpochOld = epochOld;
        uint256 TimeSinceLastDifficultyPeriod2 = blktimestamp - latestDifficultyPeriodStarted2;
        uint256 epochCOUNTS = localEpochCount - localEpochOld;
        uint256 adjusDiffTime = targetTime * local_BLOCKS_PER_READJUSTMENT;
        uint256 minBlocksRequired = local_BLOCKS_PER_READJUSTMENT / 8;
        
        // Check if we're already in adjustment mode
        uint256 adjusDiffTargetTime = targetTime * epochCOUNTS;
        uint256 adjustFinal = 4 * adjusDiffTargetTime;
        
        if ((TimeSinceLastDifficultyPeriod2 > adjustFinal && epochCOUNTS > minBlocksRequired) ||
            (adjusDiffTime < TimeSinceLastDifficultyPeriod2)) {
            return 0;
        }
        
        // Time until slow mining condition (fixed period)
        int timeUntilSlowCondition = int(latestDifficultyPeriodStarted2 + adjusDiffTime) - int(blktimestamp);
        
        // Time until 4x condition (dynamic, grows with each block)
        // This can only trigger once we have enough blocks
        int timeUntil4xCondition;
        if (epochCOUNTS >= minBlocksRequired) {
            // Already have enough blocks, check current 4x threshold
            timeUntil4xCondition = int(latestDifficultyPeriodStarted2 + adjustFinal) - int(blktimestamp);
        } else {
            // Don't have enough blocks yet - this condition cannot trigger until we do
            timeUntil4xCondition = type(int256).max;
        }
        
        // Return the minimum positive time
        int minTime = timeUntilSlowCondition;
        if (timeUntil4xCondition > 0 && timeUntil4xCondition < minTime) {
            minTime = timeUntil4xCondition;
        }
        
        return minTime > 0 ? uint(minTime) : 0;
    }
    
    
    

    /// @notice Initiates a new mining epoch and handles difficulty adjustments when conditions are met
    /// @dev Internal function that manages epoch transitions, reward distribution, and challenge generation
    /// @dev Triggers difficulty adjustment and reward distribution when full epoch completed
    /// @param blocksToAdjust Number of blocks remaining until next difficulty adjustment
    /// @param blocksMined Number of blocks successfully mined in this operation
    /// @custom:epoch-completion Triggers full adjustment cycle when blocksMined >= blocksToAdjust
    /// @custom:quarter-milestones Sends rewards to Liquidity Providers at 25%, 50%, and 75% completion points of difficulty period
    /// @custom:challenge-generation Creates new challenges using previous block hash and current challenge
    /// @custom:usage-limits Prevents challenge reuse with maximum 3 uses per base challenge
    function _startNewMiningEpoch(uint blocksToAdjust, uint blocksMined) internal {
        uint local_BLOCKS_PER_READJUSTMENT = _BLOCKS_PER_READJUSTMENT;
        uint nextEpoch = blocksToAdjust;
        uint epochsz = blocksMined;
        uint localEpochCount = epochCount;
        uint blocksToReadjust_local = nextEpoch;
        
        if(epochsz >= blocksToReadjust_local) {
            epochsz = blocksToReadjust_local;
            epochCount = localEpochCount.add(epochsz);
            
            
            ARewardSender();
            _reAdjustDifficulty();
            
            bytes32 localChallenge2 = blockhash(block.number - 1);
            bytes32 localChallenge_advanced = bytes32(keccak256(abi.encodePacked(localChallenge2, challengeNumber)));
            require(usedChallenges[localChallenge_advanced] == false, "used Chal before");
            usedChallenges[localChallenge_advanced] = true;
            challengeNumber = localChallenge_advanced;

            uint maxAmountOfChallengeUses = usedChallengesNumber[localChallenge2] + 1;
            usedChallengesNumber[localChallenge2] = maxAmountOfChallengeUses;
            require(maxAmountOfChallengeUses <= 3, "Max 3 times");
        } else {
        
            // Check if we've crossed a quarter milestone
            // Calculate how many blocks we've mined so far in this readjustment period
            uint blocksSoFar = local_BLOCKS_PER_READJUSTMENT - blocksToReadjust_local + epochsz;
            
            // Calculate quarter milestones
            uint quarter1 = local_BLOCKS_PER_READJUSTMENT / 4;
            uint quarter2 = local_BLOCKS_PER_READJUSTMENT / 2;
            uint quarter3 = (local_BLOCKS_PER_READJUSTMENT * 3) / 4;
            
            // Check if we've just crossed a quarter milestone
            uint blocksBeforeThisMining = blocksSoFar - epochsz;
            
            epochCount = localEpochCount.add(epochsz);

            if ((blocksBeforeThisMining < quarter1 && blocksSoFar >= quarter1) ||
                (blocksBeforeThisMining < quarter2 && blocksSoFar >= quarter2) ||
                (blocksBeforeThisMining < quarter3 && blocksSoFar >= quarter3)) {
                ARewardSender();
            }
        }
    }

    /// @notice Adjusts mining difficulty based on time taken to mine recent blocks
    /// @dev Internal function that implements Bitcoin-style difficulty adjustment with 4x caps
    /// @dev Uses actual time elapsed vs target time to calculate adjustment factor
    /// @custom:bitcoin-style Implements 4x maximum adjustment in either direction per period
    /// @custom:time-based Uses elapsed time vs target time to determine if mining is too fast/slow
    /// @custom:overflow-protection Uses mulDiv for safe arithmetic and prevents target overflow
    /// @custom:bounds-enforcement Ensures mining target stays within _MINIMUM_TARGET and _MAXIMUM_TARGET
    function _reAdjustDifficulty() internal {
        uint256 blktimestamp = block.timestamp;
        uint TimeSinceLastDifficultyPeriod2 = blktimestamp - latestDifficultyPeriodStarted2+1;
        uint epochTotal = epochCount - epochOld;
        uint adjusDiffTargetTime = targetTime * epochTotal; 
        epochOld = epochCount;
        
        // Calculate adjustment factor (using 1000 as fixed point multiplier)
        uint256 adjustmentFactor = (TimeSinceLastDifficultyPeriod2 * 1000) / adjusDiffTargetTime;
        
        // Apply Bitcoin's 4x cap in both directions
        if (adjustmentFactor > 4000) {
            adjustmentFactor = 4000;  // Cap at 4x easier
        }
        if (adjustmentFactor < 250) {
            adjustmentFactor = 250;   // Cap at 4x harder (1000/4 = 250)
        }

        // Check if the result would exceed uint256 max
        // Rearrange: (miningTarget * adjustmentFactor) / 1000 <= type(uint256).max
        // To: miningTarget * adjustmentFactor <= type(uint256).max * 1000
        // To: miningTarget <= (type(uint256).max * 1000) / adjustmentFactor
        uint256 maxAllowedMiningTarget = mulDiv(_MAXIMUM_TARGET, 1000, adjustmentFactor);

        if (miningTarget > maxAllowedMiningTarget) {
            miningTarget = _MAXIMUM_TARGET; // Handle overflow by using maximum target
        } else {
            miningTarget = mulDiv(miningTarget, adjustmentFactor, 1000);
        }
        
        // Apply the adjustment to the target
        // If blocks are coming in 4x slower (adjustmentFactor = 4000), make it 4x easier
        // If blocks are coming in 4x faster (adjustmentFactor = 250), make it 4x harder
        
        require(latestDifficultyPeriodStarted2 != blktimestamp, "No same block");
        latestDifficultyPeriodStarted2 = blktimestamp;
        latestDifficultyPeriodStarted = block.number;
        
        if(miningTarget < _MINIMUM_TARGET) { // Very difficult
            miningTarget = _MINIMUM_TARGET;
        }
        if(miningTarget > _MAXIMUM_TARGET) { // Very easy
            miningTarget = _MAXIMUM_TARGET;
        }
    }
    
    /// @notice Calculates what the mining difficulty would be after the next adjustment
    /// @dev Simulates the difficulty adjustment calculation without actually changing state
    /// @dev Uses current time + 1 second and epochCount + 1 to predict next adjustment
    /// @return newDifficulty The predicted difficulty value after next adjustment
    /// @custom:prediction-logic Simulates _reAdjustDifficulty() calculation with incremented values
    /// @custom:bitcoin-caps Applies same 4x maximum adjustment limits as actual adjustment
    /// @custom:time-simulation Adds 1 second to current time and 1 to epoch count for prediction
    /// @custom:bounds-checking Enforces same minimum and maximum target limits
    function readjustsToWhatDifficulty() public view returns (uint newDifficulty) {
        uint256 blktimestamp = block.timestamp;
        uint TimeSinceLastDifficultyPeriod2 = blktimestamp - latestDifficultyPeriodStarted2 + 1;
        uint epochTotal = epochCount - epochOld;
        if(epochTotal == 0){
        	epochTotal = 1;
        }
        uint adjusDiffTargetTime = targetTime * epochTotal; 
        
        // Calculate adjustment factor (using 1000 as fixed point multiplier)
        uint256 adjustmentFactor = (TimeSinceLastDifficultyPeriod2 * 1000) / adjusDiffTargetTime;
        uint miningTarget2 = miningTarget;
        
        // Apply Bitcoin's 4x cap in both directions
        if (adjustmentFactor > 4000) {
            adjustmentFactor = 4000;  // Cap at 4x easier
        }
        if (adjustmentFactor < 250) {
            adjustmentFactor = 250;   // Cap at 4x harder (1000/4 = 250)
        }

         // Check if the result would exceed uint256 max
        // Rearrange: (miningTarget * adjustmentFactor) / 1000 <= type(uint256).max
        // To: miningTarget * adjustmentFactor <= type(uint256).max * 1000
        // To: miningTarget <= (type(uint256).max * 1000) / adjustmentFactor
        uint256 maxAllowedMiningTarget = mulDiv(_MAXIMUM_TARGET, 1000, adjustmentFactor);

        if (miningTarget2 > maxAllowedMiningTarget) {
            miningTarget2 = _MAXIMUM_TARGET; // Handle overflow by using maximum target
        } else {
            miningTarget2 = mulDiv(miningTarget, adjustmentFactor, 1000);
        }
        
        
        if(miningTarget2 < _MINIMUM_TARGET) { // Very difficult
            miningTarget2 = _MINIMUM_TARGET;
        }
        if(miningTarget2 > _MAXIMUM_TARGET) { // Very easy
            miningTarget2 = _MAXIMUM_TARGET;
        }
        
        return _MAXIMUM_TARGET.div(miningTarget2);
    }


    /// @notice Returns comprehensive block and adjustment timing information for easy one call in miner
    /// @dev Convenience function that aggregates key mining statistics in one call
    /// @return slowBlockz Number of blocks that took longer than expected to mine
    /// @return secondsUntilAdjustmentz Time in seconds until next difficulty adjustment
    /// @return blocksFromReadjustz Number of blocks mined since last difficulty adjustment
    /// @return blocksToReadjustz Number of blocks remaining until next difficulty adjustment
    /// @custom:aggregation Combines multiple view functions for efficient data retrieval
    /// @custom:monitoring Provides complete picture of current mining performance and timing
    /// @custom:ui-friendly Single call returns all key metrics for dashboard displays
    function getBlockInfo() public view returns (
        uint slowBlockz,  
        uint secondsUntilAdjustmentz, 
        uint blocksFromReadjustz, 
        uint blocksToReadjustz
    ) {
        return (
            slowBlocks, 
            seconds_Until_adjustmentSwitch(), 
            blocksFromReadjust(), 
            blocksToReadjust()
        );
    }
    
    
    ///
    // Statistical Analysis Functions
    ///
    
    /// @notice Calculates current mining inflation metrics based on recent performance
    /// @dev Analyzes recent mining data to project yearly inflation and mining statistics
    /// @dev Returns zero values if no blocks have been mined since last adjustment
    /// @return YearlyInflation Projected total B0x tokens to be mined per year at current rate
    /// @return EpochsPerYear Projected number of epochs that would be mined in one year
    /// @return RewardsAtTime Current reward amount per epoch at current mining speed
    /// @return TimePerEpoch Average time in seconds per epoch based on recent performance
    /// @custom:performance-based Uses actual mining time data for realistic projections
    /// @custom:zero-division-safe Returns zeros if no progress made since last adjustment
    /// @custom:yearly-projection Extrapolates current performance to annual estimates
    function inflationMined() public view returns (
        uint YearlyInflation, 
        uint EpochsPerYear, 
        uint RewardsAtTime, 
        uint TimePerEpoch
    ) {
        if(epochCount - epochOld == 0) {
            return (0, 0, 0, 0);
        }
        
        uint256 blktimestamp = block.timestamp;
        uint TimeSinceLastDifficultyPeriod2 = blktimestamp - latestDifficultyPeriodStarted2;
        
        TimePerEpoch = (TimeSinceLastDifficultyPeriod2 / blocksFromReadjust()); 
        if(TimePerEpoch ==0){
            TimePerEpoch = TimePerEpoch + 1;

        }
        RewardsAtTime = totalB0xToSendAtTime(TimePerEpoch, 2); 
        
        uint year = 365 * 24 * 60 * 60;
        EpochsPerYear = year / TimePerEpoch;
        YearlyInflation = RewardsAtTime * EpochsPerYear;
        
        return (YearlyInflation, EpochsPerYear, RewardsAtTime, TimePerEpoch);
    }
    
    
    /// @notice Calculates time remaining until next reward era and daily mining metrics
    /// @dev Uses current inflation rate to project when supply cap for current era will be reached
    /// @dev Returns zero values if daily mining amount is zero (no active mining)
    /// @return daysToNextEra Number of days until current reward era ends
    /// @return maxSupplyForEraTotal Maximum token supply allowed for current reward era
    /// @return tokensMintedTotal Total tokens mined so far across all eras
    /// @return amtDaily Projected daily token mining amount at current rate
    /// @custom:era-progression Tracks progress toward reward halving events
    /// @custom:supply-cap-tracking Uses maxSupplyForEra to determine era transition timing
    /// @custom:daily-projection Converts yearly inflation to daily mining estimates
    function toNextEraDays() public view returns (
        uint daysToNextEra, 
        uint maxSupplyForEraTotal, 
        uint tokensMintedTotal, 
        uint amtDaily
    ) {
        (uint totalamt,,,) = inflationMined();
        (amtDaily) = totalamt / 365;
        
        if(amtDaily == 0) {
            return(0, 0, 0, 0);
        }
        maxSupplyForEraTotal = maxSupplyForEra;
        tokensMintedTotal = tokensMinted;
        daysToNextEra = (maxSupplyForEraTotal - tokensMintedTotal) / amtDaily;
        return (daysToNextEra, maxSupplyForEraTotal, tokensMintedTotal, amtDaily);
    }
    
    
    /// @notice Calculates epochs remaining until next reward era based on current mining performance
    /// @dev Converts daily era progression into epoch-based timeline using current epoch duration
    /// @dev Returns zero values if no mining progress has been made
    /// @return epochs Number of epochs remaining until next reward era
    /// @return epochTime Average time per epoch in seconds based on recent performance
    /// @return daysToNextEra Number of days until next reward era (from toNextEraDays)
    /// @custom:epoch-timeline Provides epoch-based perspective on era progression
    /// @custom:time-conversion Converts days to epochs using current mining performance
    /// @custom:performance-dependent Calculations based on actual recent mining speed
    function toNextEraEpochs() public view returns (
        uint epochs, 
        uint epochTime, 
        uint daysToNextEra
    ) {
        if(blocksFromReadjust() == 0) {
            return (0, 0, 0);
        }
        
        uint256 blktimestamp = block.timestamp;
        uint TimeSinceLastDifficultyPeriod2 = blktimestamp - latestDifficultyPeriodStarted2;
        uint timePerEpoch = TimeSinceLastDifficultyPeriod2 / blocksFromReadjust();
        (uint daysz,,,) = toNextEraDays();
        if(timePerEpoch ==0){
            timePerEpoch = timePerEpoch + 1;
        }
        uint amt = daysz * (60 * 60 * 24) / timePerEpoch;
        
        return (amt, timePerEpoch, daysz);
    }
    
    
    /// @notice Validates a mining solution for debugging mining software
    /// @dev Checks if provided nonce and digest are valid for the given challenge and target
    /// @param nonce The nonce value to test
    /// @param challenge_digest The expected digest result
    /// @param challenge_number The challenge to solve
    /// @param testTarget The difficulty target to test against
    /// @return success True if the digest matches and meets the target difficulty
    /// @custom:debugging Helps miners verify their solutions before submitting transactions
    /// @custom:validation Performs same hash calculation as actual mining functions
    function checkMintSolution(uint256 nonce, bytes32 challenge_digest, bytes32 challenge_number, uint testTarget) public view returns (bool success) {
        bytes32 digest = bytes32(keccak256(abi.encodePacked(challenge_number, msg.sender, nonce)));
        if(uint256(digest) > testTarget) revert();
        
        return (digest == challenge_digest);
    }
    

    /// @notice Advanced mining solution validator for debugging with custom sender address
    /// @dev Pure function that validates solutions for any sender address, useful for testing
    /// @param nonce The nonce value to test
    /// @param challenge_digest The expected digest result
    /// @param challenge_number The challenge to solve
    /// @param testTarget The difficulty target to test against
    /// @param senda The sender address to use in hash calculation
    /// @return bytes32 The computed digest for verification
    /// @custom:debugging Advanced debugging tool for mining software development
    /// @custom:pure-function No state dependencies, can test any combination of parameters
    function checkMintSolution2(uint256 nonce, bytes32 challenge_digest, bytes32 challenge_number, uint testTarget, address senda) public pure returns (bytes32) {
        bytes32 digest = bytes32(keccak256(abi.encodePacked(challenge_number, senda, nonce)));
        if(uint256(digest) > testTarget) revert();
        
        return digest;
    }


    /// @notice Returns the current mining challenge that needs to be solved
    /// @dev The challenge changes with each successful mining operation
    /// @return bytes32 Current challenge number based on recent Ethereum block hash
    function getChallengeNumber() public view returns (bytes32) {
        return challengeNumber;
    }


    /// @notice Returns the current mining difficulty (number of leading zeros required)
    /// @dev Automatically adjusts based on mining performance to maintain target block times
    /// @return uint Current difficulty calculated as _MAXIMUM_TARGET / current mining target
    function getMiningDifficulty() public view returns (uint) {
        return _MAXIMUM_TARGET.div(getMiningTarget());
    }


    /// @notice Returns the current mining target, adjusted for timing if near difficulty adjustment
    /// @dev Implements dynamic target adjustment when blocks are taking too long
    /// @return uint Current mining target (lower target = higher difficulty)
    /// @custom:dynamic-adjustment Temporarily reduces difficulty if current block is very slow
    /// @custom:timing-based Activates when blocksToReadjust() == 1 and block time exceeds target
    /// @custom:overflow-protection Uses safe arithmetic to prevent overflow in calculations
    function getMiningTarget() public view returns (uint) {
        if(blocksToReadjust() == 1) {
            uint targetTimez = targetTime;
            uint blockTimestampz = block.timestamp;
            uint previousBlkTimez = previousBlockTime;
            
            if(targetTimez < (blockTimestampz - previousBlkTimez)) {
                uint timeMultiplier = (blockTimestampz - previousBlkTimez) / (targetTimez / 2);
                uint targetDivisor = targetTimez / (targetTimez / 2);
                
                // First check if result would exceed 2^253
                uint MAX_SAFE_VALUE = 1 << 253; // 2^253
                
                // Check if miningTarget * timeMultiplier would overflow
                if (timeMultiplier > MAX_SAFE_VALUE / miningTarget) {
                    // Would overflow, use maximum safe value
                    return MAX_SAFE_VALUE;
                }

                // Safe to calculate
                uint256 product = miningTarget * timeMultiplier;
                return product / targetDivisor;
            }
        }
        
        return miningTarget;
    }


    /// @notice Returns the total number of tokens mined so far
    /// @dev Tracks cumulative token creation across all mining operations
    /// @return uint Total tokens minted since contract deployment
    function getMiningMinted() public view returns (uint) {
        return tokensMinted;
    }


    /// @notice Returns the total circulating supply of tokens
    /// @dev Currently equivalent to total mined tokens (no burns or locks)
    /// @return uint Total tokens in circulation
    function getCirculatingSupply() public view returns (uint) {
        return (tokensMinted + sentToLP);
    }


    /// @notice Returns the current mining reward per successful block
    /// @dev Implements Bitcoin-style reward halving based on current reward era
    /// @return uint Current reward amount (50 tokens / 2^rewardEra)
    /// @custom:halving-mechanism Reward halves every era as total supply increases
    /// @custom:bitcoin-inspired Starts at 50 tokens and halves periodically
    function getMiningReward() public view returns (uint) {
        // Once we get half way thru the coins, only get 25 per block
        // Every reward era, the reward amount halves.
        return (50 * 10**18) / (2**(rewardEra));
    }


    /// @notice Returns the current epoch count (total blocks mined)
    /// @dev Increments with each successful mining operation
    /// @return uint Current epoch number
    function getEpoch() public view returns (uint) {
        return epochCount;
    }


    /// @notice Generates the mining digest for debugging purposes
    /// @dev Computes the same hash that would be used in actual mining validation
    /// @param nonce The nonce value to test
    /// @param challenge_digest The expected digest (unused but kept for interface compatibility)
    /// @param challenge_number The challenge (unused, uses current challengeNumber)
    /// @return digesttest The computed digest for the current challenge, sender, and nonce
    /// @custom:debugging Helps miners verify their hash calculations
    /// @custom:current-state Uses actual current challenge and msg.sender
    function getMintDigest(uint256 nonce, bytes32 challenge_digest, bytes32 challenge_number) public view returns (bytes32 digesttest) {
        bytes32 digest = keccak256(abi.encodePacked(challengeNumber, msg.sender, nonce));
        return digest;
    }


    /// @notice Converts a uint256 value to its string representation
    /// @dev Pure function that handles digit-by-digit conversion without external dependencies
    /// @dev Used for creating human-readable error messages with numeric values
    /// @param value The unsigned integer to convert to string format
    /// @return memory String representation of the input value
    /// @custom:efficiency Calculates digit count first, then builds string in reverse order
    /// @custom:usage Primarily used in revert messages to display required vs sent ETH amounts
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    
    /// @notice Handles calls to non-existent functions with optional data
    /// @dev Fallback function that accepts ETH payments and arbitrary call data
    fallback() external payable {
    }


    /// @notice Allows the contract to receive ETH payments directly
    /// @dev Called when ETH is sent without function call data
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
