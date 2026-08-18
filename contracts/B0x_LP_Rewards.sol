// B ZERO X Token - B0x Token Uniswap v4 Staking Contract for 0xBTC/B0x
//
// Website: https://bzerox.com/
// Website dAPP: https://bzerox.org/
// Website dAPP Staking: https://bzerox.org/?staking
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
pragma solidity ^0.8.14;



/// @title Ownable
/// @notice Contract module which provides a basic access control mechanism
/// @dev Provides ownership functionality where there is an account (an owner) that can be granted exclusive access to specific functions
contract Ownable {
    /// @notice The current owner of the contract
    address public owner;
    
    /// @notice Emitted when ownership is transferred from one address to another
    /// @param previousOwner The address of the previous owner
    /// @param newOwner The address of the new owner
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    /// @notice Sets the deployer as the initial owner of the contract
    constructor() {
        owner = address(0x59AF082Ba6E3C59cda33d96190b4593C12d85D81);
    }
    
    /**
     * @dev Throws if called by any account other than the owner.
     */
    /// @notice Modifier that restricts function access to only the contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }
    

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    /// @notice Transfers ownership of the contract to a new account
    /// @param newOwner The address of the new owner
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }
    
    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     */
    /// @notice Internal function to transfer ownership with validation
    /// @param newOwner The address of the new owner
    /// @dev Validates that newOwner is not the zero address before transferring
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}


library SafeMath2 {
    function divRound(uint256 x, uint256 y) internal pure returns (uint256) {
        require(y != 0);
        uint256 r = x / y;
        if (x % y != 0) {
            r = r + 1;
        }
        
        return r;
    }
}


interface IB0x_Mining_Proof_of_Work {
    // Function to get the startTime value
    function startTime() external view returns (uint);
}


interface IWETH {
    // Main deposit function - converts ETH to WETH
    function deposit() external payable;
    
    
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

/// @title IStateView
/// @notice Interface for viewing pool state information in Uniswap V4
/// @dev Provides read-only access to pool liquidity and state data
interface IStateView {
    /// @notice Type alias for pool identifier as bytes32
    type PoolId is bytes32;
    
    /// @notice Gets the current liquidity amount for a specific pool
    /// @param poolId The unique identifier of the pool
    /// @return liquidity The current liquidity amount in the pool
    function getLiquidity(bytes32 poolId) external view returns (uint128 liquidity);

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

// Define the Currency type as a wrapped address
type Currency is address;

// Minimal interface for Hooks
interface IHooks2 {
     }
// Minimal representation of Uniswap V4 PoolKey
struct PoolKey {
    Currency currency0;
    Currency currency1;
    uint24 fee;
    int24 tickSpacing;
    IHooks2 hooks;
}



/// @title IPositionManager
/// @notice Interface for managing Uniswap V4 liquidity positions
/// @dev Provides functionality for position management, liquidity modifications, and NFT operations
interface IPositionManager {
    /// @notice Returns the owner of a specific position NFT
    /// @param id The token ID of the position NFT
    /// @return owner The address that owns the position NFT
    function ownerOf(uint256 id) external view returns (address owner);
    
    /// @notice Approves another address to transfer a specific position NFT
    /// @param to The address to approve for transfer
    /// @param tokenId The token ID of the position NFT to approve
    function approve(address to, uint256 tokenId) external;
    
    /// @notice Gets the current liquidity amount for a specific position
    /// @param tokenId The token ID of the position NFT
    /// @return liquidity The current liquidity amount in the position
    function getPositionLiquidity(uint256 tokenId) external view returns (uint128 liquidity);
    
    /// @notice Gets the pool key and position information for a specific position
    /// @param tokenId The token ID of the position NFT
    /// @return poolKey The pool key structure containing pool parameters
    /// @return info Additional position information
    function getPoolAndPositionInfo(uint256 tokenId) external view returns (PoolKey memory poolKey, uint info);
    
    /// @notice Returns the next token ID that will be minted
    /// @return uint256 The next available token ID
    function nextTokenId() external view returns (uint256);
    
    /**
     * @notice Modifies liquidities based on encoded actions in unlockData
     * @param unlockData Encoded data containing the actions to be executed
     * @param deadline Timestamp after which the transaction will revert
     * @dev Function is payable and includes isNotLocked and checkDeadline modifiers
     */
    /// @notice Modifies liquidity positions based on encoded action data
    /// @param unlockData Encoded bytes containing the actions and parameters to execute
    /// @param deadline Timestamp after which the transaction will revert
    /// @dev This is the main function for creating, modifying, and managing positions
    function modifyLiquidities(
        bytes calldata unlockData,
        uint256 deadline
    ) external payable;
    
    /// @notice Safely transfers a position NFT from one address to another
    /// @param from The current owner of the position NFT
    /// @param to The address to transfer the position NFT to
    /// @param tokenId The token ID of the position NFT to transfer
    /// @dev Includes safety checks to ensure the recipient can handle NFTs
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
}


//Recieve NFTs
/// @title IERC721Receiver
/// @notice Interface for contracts that can receive ERC721 tokens via safe transfers
/// @dev Implementation of this interface allows a contract to receive NFTs through safeTransferFrom
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
    /// @notice Handles the receipt of an NFT
    /// @param operator The address which initiated the transfer (may be the owner or approved address)
    /// @param from The address which previously owned the token
    /// @param tokenId The NFT identifier which is being transferred
    /// @param data Additional data with no specified format, sent in call to `to`
    /// @return bytes4 Must return `IERC721Receiver.onERC721Received.selector` to accept the transfer
    /// @dev This function is called whenever an ERC721 token is transferred to this contract via safeTransferFrom
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}


interface IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}


/// @title StakedTokenWrapper
/// @notice Base contract for managing staked token balances and total supply
/// @dev Provides internal staking and withdrawal functionality with balance tracking
contract StakedTokenWrapper {
    /// @notice Total amount of tokens currently staked across all users
    uint256 public totalSupply;
    
    /// @notice Mapping of user addresses to their staked token balances
    mapping(address => uint256) private _balances;
    
    /// @notice Emitted when a user stakes tokens
    /// @param user The address of the user who staked tokens
    /// @param amount The amount of tokens staked
    event Staked(address indexed user, uint256 amount);
    
    /// @notice Emitted when a user withdraws staked tokens
    /// @param user The address of the user who withdrew tokens
    /// @param amount The amount of tokens withdrawn
    event Withdrawn(address indexed user, uint256 amount);
    
    /// @notice Returns the staked token balance of a specific account
    /// @param account The address to query the balance for
    /// @return uint256 The staked token balance of the account
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
    
    /// @notice Error message for failed staked token transfers
    string constant _transferErrorMessage = "staked token transfer failed";
    
    /// @notice Internal function to stake tokens for a specific address
    /// @param forWhom The address to stake tokens for
    /// @param amount The amount of tokens to stake
    /// @dev Updates total supply and user balance, emits Staked event
    function stakeFor(address forWhom, uint128 amount) internal virtual {
        unchecked { 
            totalSupply += amount;
            _balances[forWhom] += amount;
        }
        
        emit Staked(forWhom, amount);
    }
    
    /// @notice Internal function to withdraw staked tokens for the caller
    /// @param amount The amount of tokens to withdraw
    /// @dev Requires sufficient balance, updates total supply and user balance, emits Withdrawn event
    function withdraw(uint128 amount) internal virtual {
        require(amount <= _balances[msg.sender], "withdraw: balance is lower");
        unchecked {
            _balances[msg.sender] -= amount;
            totalSupply = totalSupply-amount;
        }
        emit Withdrawn(msg.sender, amount);
    }
}


/// @title B0x_LP_Rewards
/// @notice Liquidity provider rewards contract for Uniswap V4 positions with multi-token rewards
/// @dev Extends StakedTokenWrapper and Ownable to provide staking functionality for LP NFTs
contract B0x_LP_Rewards is StakedTokenWrapper, Ownable {
   /// @notice Main token contract interface for B0x Token on Base
   IERC20 public immutable MainTokenAddress;
   
   /// @notice Address of the 0xBTC token (must be updated for each chain)
   address immutable public zeroXBTC = address(0);
   
   /// @notice Address of WETH token on the current chain
   address immutable public addressWETH = address(0x4200000000000000000000000000000000000006);
   
   /// @notice Address of USDC token on the current chain
   address immutable public addressUSDC = address(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
   
   /* MUST UPDATE addressWETH & zeroxBTC FOR EACH CHAIN */
   /* MUST UPDATE ADDRSES WETH & zeroxBTC FOR EACH CHAIN */
   /* MUST UPDATE ADDRSES WETH FOR EACH CHAIN */
   /* MUST UPDATE ADDRSES WETH FOR EACH CHAIN */
   /* MUST UPDATE ADDRSES WETH FOR EACH CHAIN */
   
   /// @notice Array of all reward tokens supported by this contract
   IERC20 [] public rewardTokens_Map;
   
   /// @notice Mapping to check if a token is already added as a reward token
   mapping(IERC20 => bool) public isRewardToken;
   
   /// @notice Duration of reward distribution period in seconds
   uint64 public duration_of_rewards = 60*60*24*45; //60 sec * 60 min * 24 hours * 45 days
   
   using SafeMath2 for uint256;

   /// @notice Structure containing reward distribution data for each token
   /// @dev Tracks reward rates, timing, and cumulative rewards
   struct RewardData {
      uint256 rewardRate;
      uint256 periodFinish;
      uint256 lastUpdateTime;
      uint256 rewardPerTokenStored;
      uint256 totalRewarded;
   }
   
   /// @notice Structure containing user-specific reward tracking data
   /// @dev Tracks user's reward calculations and pending rewards
   struct UserRewards {
      uint256 userRewardPerTokenPaid;
      uint256 rewards;
   }
   
   /// @notice Mapping from token address to its reward distribution data
   mapping(IERC20 => RewardData) public rewardData;
   
   /// @notice Mapping from user address to token address to user's reward data
   mapping(address => mapping(IERC20 => UserRewards)) public userRewards;
   
   /// @notice Structure to store details of a staked liquidity position
   /// @dev Contains NFT ID, liquidity amount, staking status and timing
   struct StakedPosition {
      uint256 tokenId;       // The NFT token ID
      uint128 liquidity;     // The liquidity amount
      bool isStaked;         // Whether the position is currently staked
      uint timeStakedAt;
      address ownerOfPosition;
   }

   /// @notice Emitted when rewards are added for a specific token
   /// @param token The reward token address
   /// @param reward The amount of rewards added
   event RewardAdded(IERC20 indexed token, uint256 reward);
   
   /// @notice Emitted when a reward token is removed from the system
   /// @param token The reward token address that was removed
   event RewardTokenRemoved(IERC20 indexed token);
   
   /// @notice Emitted when a user claims rewards
   /// @param user The address of the user claiming rewards
   /// @param token The reward token address
   /// @param reward The amount of rewards claimed
   event RewardPaid(address indexed user, IERC20 indexed token, uint256 reward);
   
   /// @notice Emitted when a reward transfer fails
   /// @param user The address of the user
   /// @param rewardToken The reward token that failed to transfer
   /// @param amount The amount that failed to transfer
   event RewardTransferFailed(address indexed user, IERC20 indexed rewardToken, uint256 amount);
   
   /// @notice Emitted when liquidity is increased for a position
   /// @param holderOfNFT The address of the NFT holder
   /// @param tokenID The NFT token ID
   /// @param amountOfLiqIncreased The amount of liquidity added
   event increaseLiquidity(address holderOfNFT, uint tokenID, uint amountOfLiqIncreased);
   
   /// @notice Emitted when liquidity is decreased for a position
   /// @param holderOfNFT The address of the NFT holder
   /// @param tokenID The NFT token ID
   /// @param amountOfLiqDecreased The amount of liquidity removed
   event decreaseLiquidity(address holderOfNFT, uint tokenID, uint amountOfLiqDecreased);
   
   /// @notice Mapping from user address to sequential ID to staked position data
   mapping(address => mapping(uint256 => StakedPosition)) public userPositions;
   
   /// @notice Mapping from user address to their total number of positions
   mapping(address => uint256) public userPositionCount;
   
   /// @notice Mapping from NFT token ID to sequential ID for efficient lookups
   mapping(uint256 => uint256) public tokenIdToSequentialId;
   
   /// @notice Mapping to track if an NFT is currently staked
   mapping(uint256 => bool) public isNFTStaked;
   
   /// @notice Mapping to track which user owns which NFT
   mapping(uint256 => address) public nftOwner;

   /// @notice Uniswap V4 state view contract for reading pool data
   IStateView public immutable stateView = IStateView(0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71);
   
   /// @notice Permit2 contract address for token approvals
   address public immutable permit2 = address(0x000000000022D473030F116dDEE9F6B43aC78BA3);

   /// @notice Uniswap V4 position manager contract interface
   IPositionManager public immutable uniswapv4PositionManager; // INonfungiblePositionManager (0xC364...)
   
   /// @notice Maximum tick value for full range positions
   int24 public MAX_TICK = 887220;
   
   /// @notice Minimum tick value for full range positions
   int24 public MIN_TICK = -887220;
   
   /// @notice Proof of Work contract interface for B0x Token
   IB0x_Mining_Proof_of_Work public _PoW_Contract;

   /// @notice Hook contract interface for Uniswap V4
   IHooks2 public immutable HookContract;
   
   /// @notice Address of token0 in the pair (lower address)
   address token0;
   
   /// @notice Address of token1 in the pair (higher address)
   address token1;
   
   
   /// @notice Address of the important hook contract for the pool
   address public immutable HookAddress_Important;
   
   /// @notice Timestamp to allow only setting Proof of Work first 120 days. Backup case.
    uint stopNow = block.timestamp;
   
   /// @notice Bool to represent if we have set the Proof Of Work Contract, to prevent it being set again.  Backup case.
    bool setOnce = false;
   
    
   /// @notice Constructor to initialize the rewards contract
   /// @param _MainTokenAddress Address of the main token contract for B0x Token on base
   /// @param _zeroXBTC Address of the 0xBitconi token on base
   /// @param _HookAddress Address of the Uniswap V4 hook contract
   /// @dev Sets up token ordering and initializes contract interfaces
   constructor(address _MainTokenAddress, address _zeroXBTC, address _HookAddress) 
   {
      zeroXBTC = _zeroXBTC;
      HookAddress_Important = _HookAddress;
      HookContract = IHooks2(_HookAddress);
      MainTokenAddress = IERC20(_MainTokenAddress);
      uniswapv4PositionManager = IPositionManager(0x7C5f5A4bBd8fD63184577525326123B519429bDc);

      token0 = address(zeroXBTC) < address(MainTokenAddress) ? address(zeroXBTC) : address(MainTokenAddress);
      token1 = address(zeroXBTC) < address(MainTokenAddress) ? address(MainTokenAddress) : address(zeroXBTC);
   }


   /// @notice Sets the Proof of Work contract address (can only be set once)
   /// @param pow Address of the Proof of Work contract
   /// @return bool Returns true if successfully set
   /// @dev Can only be called by owner within first 120 days and only once
   function setPOW_Contract(address pow)public returns (bool)
   {
      require(msg.sender == address(0xb2530077F267b4fd1D520aF8a63019216666458F), "Must be our account");
      require(setOnce == false, " Set once true");
      setOnce = true;
      require(stopNow + 24*60*60*120 > block.timestamp, "Only avail first 120 days");
      if(address(_PoW_Contract) == address(0)){
         _PoW_Contract = IB0x_Mining_Proof_of_Work(pow);
      }

      address prevOwner = owner;
      owner = msg.sender;

        addRewardToken(IERC20(addressUSDC));
        addRewardToken(IERC20(MainTokenAddress));
        addRewardToken(IERC20(zeroXBTC));
        addRewardToken(IERC20(addressWETH));

      owner = prevOwner;
   

      return true;
   }
   
   
   /// @notice Handles receipt of ERC721 tokens (NFTs)
   /// @return bytes4 The selector confirming successful receipt
   /// @dev Required to receive NFTs via safeTransferFrom
   function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
      return IERC721Receiver.onERC721Received.selector;
   }
   
   
   /// @notice Adds a new reward token to the system
   /// @param token The ERC20 token to add as a reward token
   /// @dev Non-owners must pay USDC fee based on number of existing reward tokens
   function addRewardToken(IERC20 token) public  
   {
      if(owner != msg.sender){
         uint multipler = rewardTokens_Map.length / 20;
         multipler = multipler + 1;
         uint usdcDecimals = IERC20(addressUSDC).decimals();
         require(
            IERC20(addressUSDC).transferFrom(msg.sender, address(this), multipler * 20 * 10**(usdcDecimals)),
            "USDC transfer failed"
         );
      }
      require(!isRewardToken[token], "Token already added");
      rewardTokens_Map.push(token);
      isRewardToken[token] = true;
      RewardData storage rd = rewardData[token];
                  
      rd.rewardPerTokenStored = rewardPerToken(token);
      
      rd.rewardRate = 0;
      rd.lastUpdateTime = 0;
      uint startTime = (_PoW_Contract.startTime());
      rd.periodFinish = startTime + 1*24*60*60;
   }
   

   /// @notice Removes a reward token from the system
   /// @param token The ERC20 token to remove
   /// @dev Can only be called by the contract owner
   function removeRewardToken(IERC20 token) public onlyOwner 
   {
      removeRewardTokenInternal(token);
   }


   /// @notice Internal function to remove a reward token from the system
   /// @param token The ERC20 token to remove from rewards
   /// @dev Prevents removal of core tokens (WETH, 0xBTC, B0x, USDC) and cleans up data structures
   function removeRewardTokenInternal(IERC20 token) internal 
   {
      require(isRewardToken[token], "Token not in reward list");
      require(address(token) != addressWETH, "not allowed to remove WETH");
      require(address(token) != zeroXBTC, "not allowed to remove 0xBTC");
      require(address(token) != address(MainTokenAddress), "not allowed to remove B0x token");
      require(address(token) != addressUSDC, "not allowed to remove usdc token");
      
      // Remove from rewardTokens array
      for (uint i = 0; i < rewardTokens_Map.length; i++) {
         if (rewardTokens_Map[i] == token) {
            // Swap with last element and pop (more gas efficient)
            rewardTokens_Map[i] = rewardTokens_Map[rewardTokens_Map.length - 1];
            rewardTokens_Map.pop();
            break;
         }
      }
      
      // Update mapping
      isRewardToken[token] = false;
      
      // Clear reward data (optional - you might want to keep historical data)
      delete rewardData[token];
      
      emit RewardTokenRemoved(token);
   }
   
   
   /// @notice Modifier to update reward calculations before function execution
   /// @param account The user account to update rewards for
   /// @param token The reward token to update calculations for
   /// @dev Updates reward per token stored and user's earned rewards before function execution
   modifier updateReward(address account, IERC20 token) 
   {
      RewardData storage rd = rewardData[token];
      uint256 _rewardPerTokenStored = rewardPerToken(token);
      rd.lastUpdateTime = lastTimeRewardApplicable(token);
      rd.rewardPerTokenStored = _rewardPerTokenStored;
      userRewards[account][token].rewards = earned(account, token);
      userRewards[account][token].userRewardPerTokenPaid = _rewardPerTokenStored;
      _;
   }
   
   
   /// @notice Returns the last time rewards are applicable for a token
   /// @param token The reward token to check
   /// @return uint256 The timestamp of last applicable reward time
   /// @dev Returns current block timestamp or period finish time, whichever is earlier
   function lastTimeRewardApplicable(IERC20 token) public view returns (uint256) 
   {
      RewardData storage rd = rewardData[token];
      uint256 blockTimestamp = uint256(block.timestamp);
      return blockTimestamp < rd.periodFinish ? blockTimestamp : rd.periodFinish;
   }
   
   
   /// @notice Calculates the current reward per token for a specific reward token
   /// @param token The reward token to calculate rewards per token for
   /// @return uint256 The current reward per token amount
   /// @dev Uses high precision math to prevent overflow and ensure accurate calculations
   function rewardPerToken(IERC20 token) public view returns (uint256) 
   {
      RewardData storage rd = rewardData[token];
      uint256 totalStakedSupply = totalSupply;
      if (totalStakedSupply == 0) {
         return rd.rewardPerTokenStored;
      }
      //  unchecked {
         //   uint256 rewardDuration = lastTimeRewardApplicable(token) - rd.lastUpdateTime;
          //  return uint256(rd.rewardPerTokenStored + rewardDuration * rd.rewardRate * 1e18 / totalStakedSupply);
      //  }
      uint256 rewardDuration = lastTimeRewardApplicable(token) - rd.lastUpdateTime;
      uint returnAmt = mulDiv(
         rewardDuration * 1e9, //  1e9 leaves alot of space
         rd.rewardRate * 1e9,
         totalStakedSupply
      ) + rd.rewardPerTokenStored;
      return returnAmt;
   }
   
 
   /// @notice Calculates the total earned rewards for an account for a specific token
   /// @param account The address of the account to calculate rewards for
   /// @param token The reward token to calculate earnings for
   /// @return uint256 The total amount of rewards earned by the account
   /// @dev Uses high precision math to calculate rewards based on staked balance and reward rate difference
   function earned(address account, IERC20 token) public view returns (uint256) 
   {
      return mulDiv(
         balanceOf(account),
         rewardPerToken(token) - userRewards[account][token].userRewardPerTokenPaid,
         1e18
      ) + userRewards[account][token].rewards;
   }


   /// @notice Collects accumulated fees from a Uniswap V4 NFT position to this contract
   /// @param tokenID The ID of the NFT position to collect fees from
   /// @return bool Returns true if fee collection is successful
   /// @dev Calls internal getUnsiwapv4Fees function with this contract as recipient
   function collectFeesForNFT(uint tokenID)public returns (bool)
   {
      getUnsiwapv4Fees(tokenID, address(this));
      return true;
   }
   
   
   /// @notice Internal function to collect fees from a Uniswap V4 position
   /// @param tokenId The ID of the NFT position to collect fees from
   /// @param FeeForWho The address to receive the collected fees
   /// @return bool Returns true if fee collection is successful
   /// @dev Uses decrease liquidity with 0 amount to collect fees, then takes the pair
   function getUnsiwapv4Fees(uint tokenId, address FeeForWho) internal returns (bool)
   {
      Currency currency0 = Currency.wrap(address(token0)); // tokenAddress1 = 0 for native ETH
      Currency currency1 = Currency.wrap(address(token1));

      bytes memory actions = abi.encodePacked(uint8(0x01), uint8(0x11));
      
      bytes[] memory params = new bytes[](2);
      params[0] = abi.encode(tokenId, 0, 0, 0, bytes(""));

      params[1] = abi.encode(currency0, currency1, FeeForWho);

      uint256 deadline = block.timestamp + 160;

      uniswapv4PositionManager.modifyLiquidities{value: 0}(
         abi.encode(actions, params),
         deadline
      );
      return true;
   }


   /// @notice Stakes a Uniswap V4 NFT position for the caller
   /// @param tokenId The ID of the NFT position to stake
   /// @dev Transfers NFT to contract and delegates to stakeFORUniswapV3NFT
   function stakeUniswapV3NFT(uint256 tokenId) public 
   {
      stakeFORUniswapV3NFT(msg.sender, tokenId);
   }


   /// @notice Stakes a Uniswap V4 NFT position for a specific address
   /// @param forWhom The address to stake the position for
   /// @param tokenId The ID of the NFT position to stake
   /// @dev Validates position parameters, updates rewards, manages position tracking, and collects fees
   function stakeFORUniswapV3NFT(address forWhom, uint256 tokenId) public 
   {
      address msgSender = msg.sender;
      uniswapv4PositionManager.safeTransferFrom(msgSender, address(this), tokenId);
      (PoolKey memory key, uint info) = uniswapv4PositionManager.getPoolAndPositionInfo(tokenId);
      require(uniswapv4PositionManager.ownerOf(tokenId) == address(this),"Incorrectly staked token");

      // Validate pool parameters
      require(Currency.unwrap(key.currency0) == address(token0), "currency0 must be ETH");
      require(Currency.unwrap(key.currency1) == address(token1), "currency1 must be main token");
      require(key.tickSpacing == 60, "incorrect tick spacing");
      require(key.hooks == IHooks2(address(HookAddress_Important)), "incorrect hook address");
      // Extract ticks
      int24 tickLower = TOtickLower(info);
      int24 tickUpper = TOtickUpper(info);
      
      // Check if NFT is full-range
      (uint128 liquidity) = uniswapv4PositionManager.getPositionLiquidity(tokenId);
      require(tickLower == MIN_TICK && tickUpper == MAX_TICK, "Must be full-range");
      
      // Update rewards for all supported tokens before staking
      IERC20[] memory tokens = getRewardTokens();
      for (uint i = 0; i < tokens.length; i++) {
         _updateReward(forWhom, tokens[i]);
      }
      
      StakedPosition memory post = StakedPosition(tokenId, liquidity, true, block.timestamp, forWhom);
      
      // Check if this tokenId was previously owned by the same user
      if (tokenIdToSequentialId[tokenId] != 0 && nftOwner[tokenId] == forWhom) {
         // Reuse the same sequential ID if it's the same owner
         uint sequentialId = tokenIdToSequentialId[tokenId];
         userPositions[forWhom][sequentialId] = post;
      } 
      // Check if this tokenId was previously owned by someone else
      else if (tokenIdToSequentialId[tokenId] != 0 && nftOwner[tokenId] != forWhom) {
         // If there was a previous owner, reset the mapping and assign new ID
         delete tokenIdToSequentialId[tokenId];
         uint userPosCount = userPositionCount[forWhom]+1;
         userPositions[forWhom][userPosCount] = post;
         tokenIdToSequentialId[tokenId] = userPosCount;
         userPositionCount[forWhom] = userPosCount;
      }
      // First time staking this token ID
      else {
         uint userPosCount = userPositionCount[forWhom]+1;
         userPositions[forWhom][userPosCount] = post;
         tokenIdToSequentialId[tokenId] = userPosCount;
         userPositionCount[forWhom] = userPosCount;
      }
      
      nftOwner[tokenId] = forWhom;
      getUnsiwapv4Fees(tokenId, msgSender);
      
      emit increaseLiquidity(forWhom, tokenId, liquidity);
      // Proceed with the original staking logic
      super.stakeFor(forWhom, liquidity);
   }                           


   /// @notice Gets the current timelock multiplier for a staked NFT position
   /// @param TokenID The ID of the staked NFT position
   /// @param ownerOfNFT The address of the NFT owner
   /// @return multi The current multiplier based on staking duration
   /// @dev Retrieves position data and calculates multiplier based on time staked
   function CurrentMultiplierTimelock(uint TokenID, address ownerOfNFT)public view returns (uint128 multi)
   {
      
      uint sequen = tokenIdToSequentialId[TokenID];
      StakedPosition memory post = userPositions[ownerOfNFT][sequen];
      require(post.timeStakedAt != 0,"Not a NFT that is currently staked!");
      return calc_howMuchToRemove(post.timeStakedAt);
   }

   
   /// @notice Calculates the withdrawal multiplier based on staking duration
   /// @param timeStakedAt The timestamp when the position was staked
   /// @return multiplier The multiplier percentage applied to withdrawals
   /// @dev Uses tiered system: starts at 200%, decreases to 30% over 15 days, then further reductions
   function calc_howMuchToRemove(uint timeStakedAt) public view returns (uint128 multiplier)
   {
      
      //CALCULATE HOW MUCH TO REMOVE
      // Calculate the multiplier based on elapsed time
      uint256 startMultiplier = 200;
      uint256 endMultiplier = 30;
      uint256 totalDays = 15;
      // Get the current time and the start time
      uint256 currentTime = block.timestamp;
      // Calculate elapsed days (using seconds in a day = 86400)
      uint256 elapsedDays = (currentTime - timeStakedAt) / 86400;
      // Calculate the current multiplier using linear interpolation
      if (elapsedDays >= totalDays) {
         
         if(elapsedDays < totalDays * 2){
            multiplier = 20;
         }else if(elapsedDays < totalDays * 3){
            multiplier = 15;
         }else if(elapsedDays < totalDays * 4){
            multiplier = 10;
         }else if(elapsedDays < totalDays * 5){
            multiplier = 7;
         }else if(elapsedDays < totalDays * 10){
            multiplier = 5;
         }else{
            multiplier = 1;
         }
      } else {
         // Linear decrease from startMultiplier to endMultiplier
         multiplier = uint128(startMultiplier - ((startMultiplier - endMultiplier) * elapsedDays / totalDays));
      }
   }


   /// @notice Gets the maximum redeemable token amounts for a staked NFT position
   /// @param tokenID The ID of the staked NFT position
   /// @param ownerOfNFT The address of the NFT owner
   /// @return amount0fees Amount of token0 that would be taken as fees
   /// @return amount1fees Amount of token1 that would be taken as fees
   /// @return amount0 Amount of token0 the user would receive
   /// @return amount1 Amount of token1 the user would receive
   /// @dev Calculates amounts for 100% withdrawal of the position
   function getMaxRedeemableTokens(uint tokenID, address ownerOfNFT)public view returns  (uint amount0fees, uint amount1fees, uint amount0, uint amount1){
      uint128 maxPercentageToRem = 10000000000000;
      
      (amount0fees, amount1fees,amount0,amount1) = getTokenAmountForPercentageLiquidity(tokenID, maxPercentageToRem, ownerOfNFT);
   }
   
   /// @notice Calculates token amounts for a percentage-based liquidity withdrawal
   /// @param tokenID The ID of the staked NFT position
   /// @param percentageToRemoveOutOf10000000000000 Percentage to withdraw (out of 10^13)
   /// @param ownerOfNFT The address of the NFT owner
   /// @return amount0fees Amount of token0 that would be taken as fees
   /// @return amount1fees Amount of token1 that would be taken as fees
   /// @return amount0 Amount of token0 the user would receive after fees
   /// @return amount1 Amount of token1 the user would receive after fees
   /// @dev Applies timelock multiplier penalties and calculates exact token amounts using current pool price
   function getTokenAmountForPercentageLiquidity(uint tokenID, uint128 percentageToRemoveOutOf10000000000000, address ownerOfNFT)public view returns (uint amount0fees, uint amount1fees, uint amount0, uint amount1){
      ( uint128 liquidity ) = 
         uniswapv4PositionManager.getPositionLiquidity(tokenID);
      uint128 multiplier = CurrentMultiplierTimelock(tokenID, ownerOfNFT);
      // (liquidity*multiplier/1000* percentageToRemoveOutOf10000000000000)/10000000000000
      uint128 baseAmount = uint128(
         (uint256(liquidity) * uint256(percentageToRemoveOutOf10000000000000))/10000000000000
      );
      uint128 fees = uint128(
         (uint256(baseAmount) * uint256(multiplier)).divRound(1000)
      );
      uint128 userGets = baseAmount - fees;
      if((uint256(liquidity) * uint256(multiplier) * uint256(percentageToRemoveOutOf10000000000000)) % (10000000000000 * 1000) != 0 && userGets > 0){
         userGets = userGets - 1;
      }
      int24 tickLower = -887220; // Your desired lower tick
      int24 tickUpper = 887220;  // Your desired upper tick
      // Convert ticks to sqrtPriceX96 values
      uint160 sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
      uint160 sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);
      PoolKey memory poolKey = PoolKey(Currency.wrap(token0), Currency.wrap(token1), 0x800000, 60, IHooks2(HookAddress_Important));
      bytes32 idz = toId(poolKey);
      
      (uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);
      amount0= getAmount0ForLiquidity(sqrtPricex96, sqrtRatioBX96,userGets );
      amount1= getAmount1ForLiquidity(sqrtRatioAX96, sqrtPricex96,userGets );
      amount0fees= getAmount0ForLiquidity(sqrtPricex96, sqrtRatioBX96,fees );
      amount1fees= getAmount1ForLiquidity(sqrtRatioAX96, sqrtPricex96,fees );
   }

   /// @notice Retrieves the current totals for various contract metrics
   /// @return liquidityInStaking Total amount of liquidity currently staked in the contract
   /// @return total0xBTCStaked Total amount of 0xBTC tokens currently staked
   /// @return totalB0xStaked Total amount of B0x tokens currently staked
   /// @dev This is a view function that returns current contract state without modifying anything
   function getContractTotals() public view returns (uint128 liquidityInStaking, uint total0xBTCStaked, uint totalB0xStaked) {

        int24 tickLower = -887220;
        int24 tickUpper = 887220;

        uint160 sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
        uint160 sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);


        PoolKey memory poolKey = PoolKey(Currency.wrap(token0), Currency.wrap(token1), 0x800000, 60, IHooks2(HookAddress_Important));
        bytes32 idz = toId(poolKey);
        
        (uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);
        
        liquidityInStaking = uint128(totalSupply);

        // Calculate amounts based on pool's token ordering
        uint amount0 = getAmount0ForLiquidity(sqrtPricex96, sqrtRatioBX96, liquidityInStaking);
        uint amount1 = getAmount1ForLiquidity(sqrtRatioAX96, sqrtPricex96, liquidityInStaking);

        // Now assign based on which token is which in the pool
        if (token0 == address(zeroXBTC)) {  // zeroXBTC is token0
            total0xBTCStaked = amount0;  // zeroXBTC amount
            totalB0xStaked = amount1;    // MainToken amount
        } else {  // MainToken is token0
            total0xBTCStaked = amount1;  // zeroXBTC amount  
            totalB0xStaked = amount0;    // MainToken amount
        }
    }



   /// @notice Resolution constant for price calculations (96 bits for X96 format)
   uint8 internal constant RESOLUTION = 96;
   
   /// @notice Calculates the amount of token0 for a given liquidity amount
   /// @param sqrtPriceAX96 Sqrt price at the lower bound in X96 format
   /// @param sqrtPriceBX96 Sqrt price at the upper bound in X96 format
   /// @param liquidity Amount of liquidity to calculate token0 amount for
   /// @return uint Amount of token0 corresponding to the liquidity
   /// @dev Uses bit shifting and high precision math to prevent overflow in calculations
   function getAmount0ForLiquidity(uint160 sqrtPriceAX96, uint160 sqrtPriceBX96, uint128 liquidity) public pure returns (uint){
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
   /// @dev Uses Q96 constant for fixed-point arithmetic in token1 calculations
   function getAmount1ForLiquidity(uint160 sqrtPriceAX96, uint160 sqrtPriceBX96, uint128 liquidity) public pure returns (uint256 amount1)
   {
      if (sqrtPriceAX96 > sqrtPriceBX96) (sqrtPriceAX96, sqrtPriceBX96) = (sqrtPriceBX96, sqrtPriceAX96);
      return mulDiv(liquidity, sqrtPriceBX96 - sqrtPriceAX96, Q96);
   }
   
   
   
   /// @notice Decreases liquidity from a staked position with timelock penalties
   /// @param tokenID The ID of the NFT position to decrease liquidity from
   /// @param percentageToRemoveOutOf10000000000000 Percentage of liquidity to remove (out of 10^13)
   /// @param minAmount0 Minimum amount of token0 to receive (slippage protection)
   /// @param minAmount1 Minimum amount of token1 to receive (slippage protection)
   /// @return bool Returns true if liquidity decrease is successful
   /// @dev Applies timelock penalties, collects fees, updates rewards, and executes two separate withdrawals
   function decreaseLiquidityOfPosition(uint tokenID, uint128 percentageToRemoveOutOf10000000000000, uint minAmount0, uint minAmount1)public returns (bool){
      address msgSender = msg.sender;
      uint128 getMaxPercentageToRem = 10000000000000;
      if(getMaxPercentageToRem<percentageToRemoveOutOf10000000000000){
         percentageToRemoveOutOf10000000000000 = getMaxPercentageToRem;
      }
      StakedPosition storage post = userPositions[msgSender][tokenIdToSequentialId[tokenID]];
      uint Id = post.tokenId;
      uint preCallLiquidity = post.liquidity;
      require(tokenID == Id,"You must have control of NFT");

      require(msgSender == post.ownerOfPosition, "Must own this position");
      bool isStaked = post.isStaked;  
      require(isStaked == true,"Must have actively staked position to remove it");
      getUnsiwapv4Fees(tokenID, address(this));
      uint128 multiplier = CurrentMultiplierTimelock(tokenID, msgSender);
      // Update rewards for all supported tokens
      IERC20[] memory rewardTokens = getRewardTokens();
      for (uint i = 0; i < rewardTokens.length; i++) {
         _updateReward(msg.sender, rewardTokens[i]);
      }
      
      ( uint128 liquidity ) = 
         uniswapv4PositionManager.getPositionLiquidity(tokenID);
      Currency currency0 = Currency.wrap(address(token0)); // tokenAddress1 = 0 for native ETH
      Currency currency1 = Currency.wrap(address(token1));
      bytes[] memory params = new bytes[](2); // new bytes[](3) for ETH liquidity positions
      uint128 baseAmount = uint128(
         (uint256(liquidity) * uint256(percentageToRemoveOutOf10000000000000))/10000000000000
      );
      uint128 fees = uint128(
         (uint256(baseAmount) * uint256(multiplier)) / 1000
      );
      uint128 userLiq = baseAmount - fees;
      if(getMaxPercentageToRem == percentageToRemoveOutOf10000000000000){
         uint128 difference = liquidity - fees;
         userLiq = difference-1; //leave 1 liquidity always
      }
      uint128 totalLiqremoved = fees + userLiq;
      require(liquidity>=totalLiqremoved,"invalid liquidity removal");
      params[0] = abi.encode(tokenID, fees, minAmount0*multiplier/1000, minAmount1*multiplier/1000, bytes(""));
      params[1] = abi.encode(currency0, currency1, address(this));
      bytes memory actions = abi.encodePacked(uint8(0x01), uint8(0x11));
      uint256 deadline = block.timestamp + 160;
      uniswapv4PositionManager.modifyLiquidities{value: 0}(
         abi.encode(actions, params),
         deadline
      );
      bytes[] memory params2 = new bytes[](2); // new bytes[](3) for ETH liquidity positions
      params2[0] = abi.encode(tokenID, userLiq, minAmount0, minAmount1, bytes(""));
      params2[1] = abi.encode(currency0, currency1, msgSender);
      bytes memory actions2 = abi.encodePacked(uint8(0x01), uint8(0x11));
      uint256 deadline2 = block.timestamp + 160;
      uniswapv4PositionManager.modifyLiquidities{value: 0}(
         abi.encode(actions2, params2),
         deadline2
      );

      uint256 afterCallLiquidity = preCallLiquidity - totalLiqremoved;
      super.withdraw(totalLiqremoved);
      post.liquidity = uint128(afterCallLiquidity);
      emit decreaseLiquidity(msgSender, tokenID, totalLiqremoved);
      return true;
   }
   
   
   /// @notice Increases liquidity for an existing staked position with slippage protection
   /// @param forWho The address that owns the position to increase liquidity for
   /// @param amount0In Amount of token0 to add to the position
   /// @param amount1In Amount of token1 to add to the position
   /// @param tokenID The ID of the NFT position to increase liquidity for
   /// @param expectedSqrtPricex96 Expected sqrt price when transaction was initiated
   /// @param slippageBps Slippage tolerance in basis points (e.g., 50 = 0.5%)
   /// @return bool Returns true if liquidity increase is successful
   /// @dev Validates ownership, applies slippage protection, updates rewards, resets timelock timer
   function increaseLiquidityOfPosition(address forWho, uint256 amount0In, uint amount1In, uint tokenID, uint160 expectedSqrtPricex96, uint160 slippageBps) public returns (bool){
      //we are going to want to pass liquidity delta when its time to really use

      StakedPosition memory post = userPositions[forWho][tokenIdToSequentialId[tokenID]];

      uint Id = post.tokenId;

      require(tokenID == Id,"forWho must have control of NFT");

      require(forWho == post.ownerOfPosition, "forWho must be ownerOfPosition");

      bool isStaked = post.isStaked;  
      require(isStaked == true,"Must be actively staked position to increase it");
                     
      getUnsiwapv4Fees(tokenID, address(this));

      // Update rewards for all supported tokens
      IERC20[] memory rewardTokens = getRewardTokens();
      for (uint i = 0; i < rewardTokens.length; i++) {
         _updateReward(forWho, rewardTokens[i]);
      }


      // Get initial balances BEFORE receiving tokens from user
      uint256 contractBalance0Initial = IERC20(token0).balanceOf(address(this));
      uint256 contractBalance1Initial = IERC20(token1).balanceOf(address(this));
    

      IERC20(token0).approve(address(permit2), type(uint256).max);
      IERC20(token1).approve(address(permit2), type(uint256).max);
      IPermit2(permit2).approve(address(token0), address(uniswapv4PositionManager), type(uint160).max, uint48(block.timestamp)+60*60*1);
      IPermit2(permit2).approve(address(token1), address(uniswapv4PositionManager), type(uint160).max, uint48(block.timestamp)+60*60*1);
      
      IERC20(token0).approve(address(uniswapv4PositionManager), type(uint256).max);
      IERC20(token1).approve(address(uniswapv4PositionManager), type(uint256).max);
      // Transfer tokens from sender
      IERC20(token0).transferFrom(msg.sender, address(this), amount0In);
      
      // Transfer tokens from sender
      IERC20(token1).transferFrom(msg.sender, address(this), amount1In);
      
      PoolKey memory poolKey = PoolKey(Currency.wrap(token0), Currency.wrap(token1), 0x800000, 60, IHooks2(HookAddress_Important));
      bytes32 idz = toId(poolKey);
      
      (uint160 sqrtPricex96,,,) = stateView.getSlot0(idz);
      // Get min and max acceptable sqrt prices
      (uint160 minSqrtPrice, uint160 maxSqrtPrice) = getSqrtPriceRangeForSlippage(
         expectedSqrtPricex96, 
         slippageBps
      );
      
      // Verify price hasn't moved beyond slippage tolerance
      require(
         sqrtPricex96 >= minSqrtPrice && 
         sqrtPricex96 <= maxSqrtPrice,
         "Price moved too much"
      );
      
      // Convert ticks to sqrtPriceX96 values
      // Convert specific ticks to sqrtPriceX96 values
      int24 tickLower = -887220; // Your desired lower tick
      int24 tickUpper = 887220;  // Your desired upper tick

      // Convert ticks to sqrtPriceX96 values
      uint160 sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
      uint160 sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);

      uint liquidityDelta = getLiquidityForAmounts(
         sqrtPricex96,
         sqrtRatioAX96,
         sqrtRatioBX96,
         amount0In,
         amount1In
      );

      bytes memory actions = abi.encodePacked(uint8(0x00), uint8(0x0d));
      bytes[] memory params = new bytes[](2); // new bytes[](3) for ETH liquidity positions

      // Position has liquidity - use INCREASE_LIQUIDITY action  
      actions = abi.encodePacked(uint8(0x00), uint8(0x0d)); // INCREASE_LIQUIDITY + SETTLE_PAIR
      
      // Use increase parameters
      params[0] = abi.encode(tokenID, liquidityDelta, amount0In, amount1In, bytes(""));

      Currency currency0 = Currency.wrap(token0); // tokenAddress1 = 0 for native ETH
      Currency currency1 = Currency.wrap(token1);

      params[1] = abi.encode(currency0, currency1); //settle pair
      //For ETH see 2 tokens @ https://docs.uniswap.org/contracts/v4/quickstart/manage-liquidity/increase-liquidity
      uint256 deadline = block.timestamp + 160;

      uint256 valueToPass = 0;




      uniswapv4PositionManager.modifyLiquidities{value: valueToPass}(
         abi.encode(actions, params),
         deadline
      );


      // Get balances AFTER liquidity operation
      uint256 contractBalance0After = IERC20(token0).balanceOf(address(this));
      uint256 contractBalance1After = IERC20(token1).balanceOf(address(this));

      // Calculate what should be refunded to user
      // This accounts for any tokens that weren't used in the liquidity operation
      uint256 refund0 = contractBalance0After - contractBalance0Initial;
      uint256 refund1 = contractBalance1After - contractBalance1Initial;

      // Refund unused tokens
      if (refund0 > 0) {
         IERC20(token0).transfer(msg.sender, refund0);
      }
      if (refund1 > 0) {
         IERC20(token1).transfer(msg.sender, refund1);
      }

      ( uint128 liquidity ) = 
         uniswapv4PositionManager.getPositionLiquidity(tokenID);

      //Reset timer for withdrawal if adding to NFT

      StakedPosition storage test = userPositions[forWho][tokenIdToSequentialId[tokenID]];
      test.timeStakedAt = block.timestamp;

      uint liqDifference = liquidity - test.liquidity;
      stakeFor(forWho, uint128(liqDifference));

      test.liquidity = liquidity;

      
      emit increaseLiquidity(forWho, tokenID, liqDifference);

      return true;
   }


   /// @notice Withdraws a staked NFT position completely with timelock penalties applied
   /// @param tokenId The ID of the NFT position to withdraw
   /// @return bool Returns true if withdrawal is successful
   /// @dev Updates rewards, applies penalties, transfers NFT back to user, and updates position tracking
   function withdraw(uint tokenId) public returns (bool) {

      // Update rewards for all supported tokens before staking
      IERC20[] memory tokens = getRewardTokens();
      for (uint i = 0; i < tokens.length; i++) {
         _updateReward(msg.sender, tokens[i]);
      }
      
      uint sequen = tokenIdToSequentialId[tokenId];

      StakedPosition memory post = userPositions[msg.sender][sequen];

      require(msg.sender == post.ownerOfPosition, "Must own this position");
      uint Id = post.tokenId;
      uint128 liquidity = post.liquidity;   // The liquidity amount
      bool isStaked = post.isStaked;  
      require(isStaked == true,"Must have actively staked position to remove it");
      // Store the NFT ID and its liquidity

      getUnsiwapv4Fees(tokenId, address(this));
      RemovePenaltyFromNFTforWithdrawl(tokenId);
      StakedPosition memory post2 = StakedPosition(Id, 0, false, block.timestamp, address(0));
      userPositions[msg.sender][sequen] = post2;

      uniswapv4PositionManager.approve(address(this), Id);
      uniswapv4PositionManager.safeTransferFrom(address(this), msg.sender, Id);

      super.withdraw(liquidity);

      emit decreaseLiquidity(msg.sender, tokenId, liquidity);
      return true;
   }


   /// @notice Internal function to withdraw all liquidity from a staked position
   /// @param tokenId The ID of the NFT position to withdraw completely
   /// @dev Similar to withdraw() but internal - applies penalties and transfers NFT back to user
   function withdrawALL(uint tokenId) internal {

      uint sequen = tokenIdToSequentialId[tokenId];

      StakedPosition memory post = userPositions[msg.sender][sequen];

      uint Id = post.tokenId;
      uint128 liquidity = post.liquidity;   // The liquidity amount
      bool isStaked = post.isStaked;  
      require(isStaked == true,"Must have actively staked position to remove it");
      require(msg.sender == post.ownerOfPosition, "Must own this position");
      // Store the NFT ID and its liquidity

      getUnsiwapv4Fees(tokenId, address(this));
      RemovePenaltyFromNFTforWithdrawl(tokenId);

      StakedPosition memory post2 = StakedPosition(Id, 0, false, block.timestamp, address(0));
      userPositions[msg.sender][sequen] = post2;

      uniswapv4PositionManager.approve(address(this), Id);
      uniswapv4PositionManager.safeTransferFrom(address(this), msg.sender, Id);
      super.withdraw(liquidity);

      emit decreaseLiquidity(msg.sender, tokenId, liquidity);
   }

   /// @notice Exits multiple staked positions and claims all rewards
   /// @param startIndex The starting index in the user's position array
   /// @param count The number of positions to exit from the starting index
   /// @dev Claims rewards first, then withdraws all specified positions
   function exit(uint256 startIndex, uint256 count) public {
      if (startIndex + count > userPositionCount[msg.sender]){
         count = userPositionCount[msg.sender] - startIndex;
      }
      getReward();
      /* Get reward does it for us Update rewards for all supported tokens
      IERC20[] memory rewardTokens = getRewardTokens();
      for (uint i = 0; i < rewardTokens.length; i++) {
         _updateReward(msg.sender, rewardTokens[i]);
      }
      */
      uint256[] memory iDs = this.getStakedTokenIds(msg.sender, startIndex, count);
      for(uint x=0; x<iDs.length; x++){
         withdrawALL(iDs[x]);
      }
   }


   /// @notice Internal function to remove penalty liquidity from NFT during withdrawal
   /// @param tokenID The ID of the NFT position to apply penalties to
   /// @return bool Returns true if penalty removal is successful
   /// @dev Calculates timelock penalty based on staking duration and removes penalty liquidity to contract
   function RemovePenaltyFromNFTforWithdrawl(uint tokenID) internal returns (bool)
   {
      uint multiplier = CurrentMultiplierTimelock(tokenID, msg.sender);
      // Check if NFT is full-range
      ( uint128 liquidity ) = 
         uniswapv4PositionManager.getPositionLiquidity(tokenID);

      Currency currency0 = Currency.wrap(token0);
      Currency currency1 = Currency.wrap(token1);

      bytes[] memory params = new bytes[](2);

      params[0] = abi.encode(tokenID, (liquidity*multiplier).divRound(1000), 0, 0, bytes(""));

      params[1] = abi.encode(currency0, currency1, address(this));
      bytes memory actions = abi.encodePacked(uint8(0x01), uint8(0x11));

      uint256 deadline = block.timestamp + 160;

      uint256 valueToPass = msg.value;
      
      uniswapv4PositionManager.modifyLiquidities{value: valueToPass}(
         abi.encode(actions, params),
         deadline
      );

      return true;
   }


   /// @notice Gets the token IDs of staked positions for a user within a specified range
   /// @param user The address of the user to query positions for
   /// @param startIndex The starting index in the user's position array
   /// @param count The maximum number of token IDs to return
   /// @return tokenIds Array of staked NFT token IDs
   /// @dev Efficient function for getting just the token IDs without additional metadata
   function getStakedTokenIds(address user, uint startIndex, uint count) external view returns (uint256[] memory tokenIds) {

      if (startIndex + count > userPositionCount[user]){
         count = userPositionCount[user] - startIndex;
      }
      // First, count how many active staked positions the user has
      uint256 stakedCount = 0;
      for (uint256 i = startIndex; i <= userPositionCount[user]; i++) {
         StakedPosition memory position = userPositions[user][i];
         if (position.isStaked) {
            stakedCount++;
         }
         if(stakedCount > count){
            break;
         }
      }
      
      // Initialize array with the correct size
      uint256[] memory stakedTokenIds = new uint256[](stakedCount);
      
      // Fill the array with token IDs of staked positions
      uint256 index = 0;
      for (uint256 i = 1; i <= userPositionCount[user]; i++) {
         StakedPosition memory position = userPositions[user][i];
         if (position.isStaked) {
            stakedTokenIds[index] = position.tokenId;
            index++;
         }
      }
      
      return (stakedTokenIds);
   }


   /// @notice Claims all available rewards for the caller across all reward tokens
   /// @dev Updates rewards and transfers all earned tokens to the caller
   function getReward() public {
      IERC20[] memory rewardTokens = getRewardTokens();
      getRewardForTokens(rewardTokens);
   }


   /// @notice Claims rewards for specific reward tokens
   /// @param rewardTokens Array of reward token addresses to claim rewards for
   /// @dev Updates rewards, calculates earned amounts, and transfers tokens to caller
   function getRewardForTokens(IERC20[] memory rewardTokens) public {

      for (uint i = 0; i < rewardTokens.length; i++) {
         _updateReward(msg.sender, rewardTokens[i]);
         uint256 reward = earned(msg.sender, rewardTokens[i]);
         if (reward > 0) {

            RewardData storage rd = rewardData[rewardTokens[i]];
            rd.totalRewarded = rd.totalRewarded - reward;
            userRewards[msg.sender][rewardTokens[i]].rewards = 0;
            rewardTokens[i].transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, rewardTokens[i], reward);
         }
      }
   }


   /// @notice Gets comprehensive reward statistics for all reward tokens
   /// @return rewardTokenAddresses Array of reward token contract addresses
   /// @return rewardsOwed Array of rewards owed to the caller for each token
   /// @return tokenSymbols Array of token symbols (with fallback to "?" if not available)
   /// @return tokenNames Array of token names (with fallback to "?" if not available)
   /// @return tokenDecimals Array of token decimal places (with fallback to 1 if not available)
   /// @return tokenRewardRates Array of current reward rates for each token
   /// @return tokenPeriodEndsAt Array of timestamps when reward periods end for each token
   /// @dev Provides complete reward system overview with safe fallbacks for token metadata
   function getRewardOwedStats() public view returns(address[] memory rewardTokenAddresses, uint256[] memory rewardsOwed, string[] memory tokenSymbols, string[] memory tokenNames, uint8[] memory tokenDecimals, uint[] memory tokenRewardRates, uint[] memory tokenPeriodEndsAt) {
      IERC20[] memory rewardTokens = getRewardTokens();
      rewardTokenAddresses = new address[](rewardTokens.length);
      tokenSymbols = new string[](rewardTokens.length);
      tokenNames = new string[](rewardTokens.length);
      tokenDecimals = new uint8[](rewardTokens.length);
      tokenRewardRates = new uint[](rewardTokens.length);
      tokenPeriodEndsAt = new uint[](rewardTokens.length);
      for(uint x=0; x<rewardTokens.length; x++){
         rewardTokenAddresses[x]=address(rewardTokens[x]);
         // Handle symbol
         try rewardTokens[x].symbol() returns (string memory symbol) {
            tokenSymbols[x] = symbol;
         } catch {
            tokenSymbols[x] = "?"; // Default fallback for symbol
         }
         // Handle name  
         try rewardTokens[x].name() returns (string memory name) {
            tokenNames[x] = name;
         } catch {
            tokenNames[x] = "?"; // Default fallback for name
         }
         // Handle decimals
         try rewardTokens[x].decimals() returns (uint8 decimals) {
            tokenDecimals[x] = decimals;
         } catch {
            tokenDecimals[x] = 1; // Default fallback for decimals
         }
         RewardData memory rd = rewardData[IERC20(rewardTokens[x])]; 
         tokenRewardRates[x]= rd.rewardRate;
         tokenPeriodEndsAt[x]= rd.periodFinish;
      }
      rewardsOwed = getRewardForTokensOwed(rewardTokens);
   }
   
   
   /// @notice Calculates the amount of rewards owed to the caller for specific reward tokens
   /// @param rewardTokens Array of reward token addresses to calculate owed rewards for
   /// @return rewardsOwed Array of reward amounts owed to the caller for each token
   /// @dev View function that calculates earned rewards without updating state
   function getRewardForTokensOwed(IERC20[] memory rewardTokens) public view returns (uint[] memory rewardsOwed){
      rewardsOwed = new uint[](rewardTokens.length);
      for (uint i = 0; i < rewardTokens.length; i++) {
         uint256 reward = earned(msg.sender, rewardTokens[i]);
         rewardsOwed[i] = reward;
      }
   }


   /// @notice Number of USDC distribution periods that have occurred
   uint public periodsDistributedUSDC;

   /// @notice Sets reward distribution parameters for a specific token
   /// @param token The reward token to set parameters for
   /// @dev Calculates reward rates, handles special USDC tiered distribution, validates token transfers
   function setRewardParams(IERC20 token) public  {
      uint64 duration = duration_of_rewards;
      unchecked {
         RewardData storage rd = rewardData[token];
         
         rd.rewardPerTokenStored = rewardPerToken(token);

         uint256 blockTimestamp = uint256(block.timestamp);
         
         uint256 maxRewardSupply = token.balanceOf(address(this)) - rd.totalRewarded;

         require(maxRewardSupply > 0, "Reward must be positive");
         uint totalReward = ( maxRewardSupply * 4 ) / 10;// 4/10ths every distribution phase
         if(address(token) == addressUSDC){
            uint256 periodsElapsed = periodsDistributedUSDC;
            
            uint256 periodRate;
            
            if(periodsElapsed < 8) {
               periodRate = 125; // 10% / 8 periods = 1.25% per period
            } else if(periodsElapsed < 16) {
               periodRate = 125; // 10% / 8 periods = 1.25% per period  
            } else if(periodsElapsed < 24) {
               periodRate = 250; // 20% / 8 periods = 2.5% per period
            } else if(periodsElapsed < 32) {
               periodRate = 250; // 20% / 8 periods = 2.5% per period
            }else if(periodsElapsed < 40) {
               periodRate = 375; // 30% / 8 periods = 3.75% per period
            } else {
               periodRate = 375; // 30% / 8 periods = 3.75% per period
            }
            
            // Use original total supply as base (store this in constructor)
            totalReward = (maxRewardSupply * periodRate) / 10000; // basis points
            periodsDistributedUSDC++;
         }

         uint rewardBefore = IERC20(token).balanceOf(address(this));
         // Test token transferability with the actual amount we plan to use
         try token.transfer(address(this), totalReward) {
         } catch {
            removeRewardTokenInternal(token);
            return;
         }
         uint rewardAfter =  IERC20(token).balanceOf(address(this));
         maxRewardSupply = rewardAfter;
         totalReward = totalReward - (rewardBefore - rewardAfter);

         if(rd.periodFinish > block.timestamp){
            revert("No good PeriodFinish must be behind block.timestamp");
         }else{
            totalReward = totalReward / duration;
         }
         
         require(totalReward <= maxRewardSupply, "not enough tokens");

         require(totalReward < 1e38, "Reward rate too high");

         rd.rewardRate = totalReward;
         rd.totalRewarded = (totalReward*duration) + rd.totalRewarded;
         rd.lastUpdateTime = blockTimestamp;
         rd.periodFinish = blockTimestamp + duration;
         emit RewardAdded(token, (totalReward*duration));
      }
   }


   /// @notice Gets all reward tokens currently supported by the contract
   /// @return IERC20[] Array of all reward token contracts
   /// @dev Returns the complete list of reward tokens from the mapping
   function getRewardTokens() public view returns (IERC20[] memory) {
      return rewardTokens_Map;
      // This would need to track which tokens have active rewards
      // Implementation depends on how you want to track active reward tokens
      // Could maintain an array or use events to track
      //revert("Not implemented - need to track active reward tokens");
   }


   /// @notice Internal function to update reward calculations for a user and token
   /// @param account The user address to update rewards for
   /// @param token The reward token to update calculations for
   /// @dev Updates reward per token stored and user's earned rewards without using modifier
   function _updateReward(address account, IERC20 token) internal {
      RewardData storage rd = rewardData[token];
      uint256 _rewardPerTokenStored = rewardPerToken(token);
      rd.lastUpdateTime = lastTimeRewardApplicable(token);
      rd.rewardPerTokenStored = _rewardPerTokenStored;
      userRewards[account][token].rewards = earned(account, token);
      userRewards[account][token].userRewardPerTokenPaid = _rewardPerTokenStored;
   }


   /// @notice Converts all ETH held by the contract to WETH
   /// @dev Deposits the entire ETH balance into the WETH contract
   function convertETHtoWETH()public {
      // Get the ETH balance of this contract
      uint256 ethBalance = address(this).balance;

      // Deposit all ETH into WETH
      IWETH(addressWETH).deposit{value: ethBalance}();
   }


   /// @notice Generates a unique pool ID from pool key parameters
   /// @param poolKey The pool key structure containing currency pairs, fee, tick spacing, and hooks
   /// @return poolId The unique bytes32 identifier for the pool
   /// @dev Uses keccak256 hash of the entire poolKey struct (5 slots * 32 bytes = 0xa0)
   function toId(PoolKey memory poolKey) internal pure returns (bytes32 poolId) {
      assembly ("memory-safe") {
         // 0xa0 represents the total size of the poolKey struct (5 slots of 32 bytes)
         poolId := keccak256(poolKey, 0xa0)
      }
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
   
   
   
   /// @notice Q96 constant for fixed-point arithmetic (2^96)
   uint256 constant Q96 = 0x1000000000000000000000000;



   /// @notice Converts a tick value to its corresponding sqrt price in X96 format
   /// @param tick The tick value to convert (must be within valid range)
   /// @return uint160 The sqrt price in X96 format
   /// @dev Uses bit manipulation and precomputed constants for efficient tick-to-price conversion
   function getSqrtRatioAtTick(int24 tick) internal pure returns (uint160) {
      uint MAX_TICKz = 887220;
      uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
      require(absTick <= uint256(int256(MAX_TICKz)), "TICK_OUT_OF_RANGE");

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
   

   /// @notice Calculates liquidity for a given amount of token0
   /// @param sqrtRatioAX96 Sqrt price at the lower tick boundary in X96 format
   /// @param sqrtRatioBX96 Sqrt price at the upper tick boundary in X96 format
   /// @param amount0 Amount of token0 to provide
   /// @return liquidity The calculated liquidity amount
   /// @dev Helper function for token0-based liquidity calculations
   function getLiquidityForAmount0(uint160 sqrtRatioAX96, uint160 sqrtRatioBX96, uint256 amount0) internal pure returns (uint128 liquidity)
   {
      if (sqrtRatioAX96 > sqrtRatioBX96) (sqrtRatioAX96, sqrtRatioBX96) = (sqrtRatioBX96, sqrtRatioAX96);
      uint256 intermediate = mulDiv(sqrtRatioAX96, sqrtRatioBX96, Q96);
      return uint128(mulDiv(amount0, intermediate, sqrtRatioBX96 - sqrtRatioAX96));
   }
   

   /// @notice Calculates liquidity for a given amount of token1
   /// @param sqrtRatioAX96 Sqrt price at the lower tick boundary in X96 format
   /// @param sqrtRatioBX96 Sqrt price at the upper tick boundary in X96 format
   /// @param amount1 Amount of token1 to provide
   /// @return liquidity The calculated liquidity amount
   /// @dev Helper function for token1-based liquidity calculations
   function getLiquidityForAmount1(uint160 sqrtRatioAX96, uint160 sqrtRatioBX96, uint256 amount1) internal pure returns (uint128 liquidity)
   {
      if (sqrtRatioAX96 > sqrtRatioBX96) (sqrtRatioAX96, sqrtRatioBX96) = (sqrtRatioBX96, sqrtRatioAX96);
      return uint128(mulDiv(amount1, Q96, sqrtRatioBX96 - sqrtRatioAX96));
   }
   
   /// @notice Calculates the liquidity amount for given token amounts and price range
   /// @param sqrtPriceX96 Current sqrt price in X96 format
   /// @param sqrtPriceAX96 Sqrt price at the lower tick boundary in X96 format
   /// @param sqrtPriceBX96 Sqrt price at the upper tick boundary in X96 format
   /// @param amount0 Amount of token0 available
   /// @param amount1 Amount of token1 available
   /// @return liquidity The calculated liquidity amount (minimum of token0 and token1 constraints)
   /// @dev Main function for calculating liquidity based on current price position and token amounts
   function getLiquidityForAmounts(uint160 sqrtPriceX96, uint160 sqrtPriceAX96, uint160 sqrtPriceBX96, uint256 amount0, uint256 amount1) public pure returns (uint128 liquidity)
   {
      require(sqrtPriceAX96 < sqrtPriceBX96, "PRICE_ORDER");
      
      if (sqrtPriceX96 <= sqrtPriceAX96) {
         liquidity = getLiquidityForAmount0(sqrtPriceAX96, sqrtPriceBX96, amount0);
      } else if (sqrtPriceX96 >= sqrtPriceBX96) {
         liquidity = getLiquidityForAmount1(sqrtPriceAX96, sqrtPriceBX96, amount1);
      } else {
         uint128 liquidity0 = getLiquidityForAmount0(sqrtPriceX96, sqrtPriceBX96, amount0);
         uint128 liquidity1 = getLiquidityForAmount1(sqrtPriceAX96, sqrtPriceX96, amount1);
         liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
      }
   }
   
   
   /// @notice Converts basis points slippage to sqrt price bounds for slippage protection
   /// @param expectedSqrtPricex96 The expected sqrt price when transaction was initiated
   /// @param slippageBps Slippage tolerance in basis points (e.g., 50 = 0.5%)
   /// @return minSqrtPrice Minimum acceptable sqrt price
   /// @return maxSqrtPrice Maximum acceptable sqrt price
   /// @dev Uses square root approximation for efficient slippage calculation
   function getSqrtPriceRangeForSlippage(
      uint160 expectedSqrtPricex96,
      uint slippageBps // in basis points (e.g., 50 = 0.5%)
   ) internal pure returns (uint160 minSqrtPrice, uint160 maxSqrtPrice) {
      // For slippage of s basis points (s/10000 as a decimal):
      // Price change factor is (1 ± s/10000)
      // SqrtPrice change factor is √(1 ± s/10000)
      
      // For small values of s, √(1 + s/10000) ≈ 1 + (s/10000)/2 = 1 + s/20000
      
      // Calculate the adjustment factor (s/20000 in our fixed-point representation)
      uint adjustmentFactor = slippageBps / 2; // Divide by 2 for the sqrt approximation
      
      // Calculate the minimum and maximum sqrt prices (multiply by 10000 for fixed-point division)
      minSqrtPrice = uint160((uint256(expectedSqrtPricex96) * (10000 - adjustmentFactor)) / 10000);
      maxSqrtPrice = uint160((uint256(expectedSqrtPricex96) * (10000 + adjustmentFactor)) / 10000);
      
      return (minSqrtPrice, maxSqrtPrice);
   }


   /// @notice Gets the current sqrt price for the main token pair
   /// @return sqrtPricex96 The current sqrt price in X96 format
   /// @dev Retrieves current price from the pool state for the main token pair
   function getExpectedSqrtPricex96()public view returns (uint160 sqrtPricex96){

      PoolKey memory poolKey = PoolKey(Currency.wrap(address(token0)), Currency.wrap(address(token1)), 0x800000, 60, IHooks2(HookAddress_Important));
      bytes32 idz = toId(poolKey);
      
      (sqrtPricex96,,,) = stateView.getSlot0(idz);
   }


   /// @notice Bit offset for extracting tick lower value from packed info
   uint8 internal constant TICK_LOWER_OFFSET = 8;
   
   /// @notice Bit offset for extracting tick upper value from packed info
   uint8 internal constant TICK_UPPER_OFFSET = 32;
   
   /// @notice Extracts the lower tick value from packed position info
   /// @param info The packed position information containing tick data
   /// @return _tickLower The lower tick boundary of the position
   /// @dev Uses assembly to extract and sign-extend the tick value from packed data
   function TOtickLower(uint info) public pure returns (int24 _tickLower) {
      assembly ("memory-safe") {
         _tickLower := signextend(2, shr(TICK_LOWER_OFFSET, info))
      }
   }
   
   
   /// @notice Extracts the upper tick value from packed position info
   /// @param info The packed position information containing tick data
   /// @return _tickUpper The upper tick boundary of the position
   /// @dev Uses assembly to extract and sign-extend the tick value from packed data
   function TOtickUpper(uint info) public pure returns (int24 _tickUpper) {
      assembly ("memory-safe") {
         _tickUpper := signextend(2, shr(TICK_UPPER_OFFSET, info))
      }
   }
   

   /// @notice Fallback function to handle unexpected function calls
   /// @dev Accepts ether but performs no operations
   fallback() external payable {
      // Optional: handle unexpected data
   }


   /// @notice Receive function to accept plain ether transfers
   /// @dev Allows the contract to receive ETH without data
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


