// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

/// @title MulDiv
/// @notice Full precision multiplication-division: computes floor(a * b / denominator)
///         without intermediate overflow, and reverts if the result doesn't fit in 256 bits
///         or if denominator is zero.
library MulDiv {
    /// @dev Calculates floor(x * y / denominator) with full precision.
    ///      Based on the well-known 512-bit mulDiv technique (Uniswap / OpenZeppelin style).
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

}

// ─────────────────────────────────────────────────────────────
//  Minimal interfaces
// ─────────────────────────────────────────────────────────────

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    
}

/// @dev Subset of the Uniswap V4 NonfungiblePositionManager we actually need.
interface INonfungiblePositionManager {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function approve(address to, uint256 tokenId) external;
}

/// @dev Subset of the factory contract we need
interface ITimeLockFactory {
    function recordOwnershipTransfer(
        address oldOwner,
        address newOwner,
        address vault
    ) external;
    
    
    function DestroyOwnership_TransferToDEADEND(
        address oldOwner,
        address newOwner,
        address vault
    ) external;
    
    function AmountWeOWE_PER_POSITION2() external view returns (uint256);
        
}

interface IWETH {
    function deposit() external payable;
}

/// @dev External LP staking pool that accepts delegated Uniswap V3 NFT stakes.
///      The vault approves this contract for the NFT then calls stakeUniswapV3NFT
///      so the pool tracks the position — rewards accrue to the vault address.
interface ILPPool {
    /// @notice Stakes a Uniswap V4 NFT position on behalf of the caller.
    /// @dev    The NFT must be approved for this contract before calling.
    function stakeUniswapV3NFT(uint256 tokenId) external;

    /// @notice Withdraws a staked NFT back to the caller.
    function withdraw(uint tokenId) external returns (bool);
    
    /// @notice Gets ALL Staked rewards.
    function getReward() external;
    
    /// @notice Gets ALL Staked rewards of ALL ERC20s supplied.
    function getRewardForTokens(IERC20[] memory rewardTokens) external;

    /// @notice Gets ALL Staked rewards and Exits ex. 0=StartIndex, 25=Count.
    function exit(uint256 startIndex, uint256 count) external;

    /// @dev This is a view function that returns current contract state without modifying anything
    function getContractTotals()
        external
        view
        returns (
            uint128 liquidityInStaking,
            uint256 total0xBTCStaked,
            uint256 totalB0xStaked
        );

    function balanceOf(address account) external view returns (uint256);

    /// @notice Mapping from user address to their total number of positions
    function userPositionCount(address account) external view returns (uint256);



}


interface IStakingGuess {
    function currentB0x(address forWhom) external view returns (uint256);
    function stake(uint256 amount) external;
    function withdraw(uint256 amount, uint256 maxLoss) external;
    function balanceOf(address account) external view returns (uint256);
    function penalty() external view returns (uint num);
}    


// ─────────────────────────────────────────────────────────────
//  TimeLockVault  (one per user, deployed by the factory)
// ─────────────────────────────────────────────────────────────

/// @title  TimeLockVault
/// @notice Holds ERC-20 tokens and staked Uniswap V3 NFT positions for a single
///         owner until a predetermined unlock timestamp.
contract TimeLockVault {

    // ── Constants ──────────────────────────────────────────────
    
    /// @notice The Uniswap V4 NonfungiblePositionManager — source of truth for
    ///         NFT ownership. Used to pull NFTs in and return them on withdrawal.
    address public constant UNISWAP_V4_NFT_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc; // Uniswap V4 PositionManager (Base Mainnet)

    /// @notice External LP staking pool. The vault approves this address for each
    ///         NFT then delegates the actual stake call here so rewards accumulate
    ///         while the NFT remains time-locked in the vault's control.
    address public constant LP_POOL = 0x08f489C5017942d3b7c82C1c178877C80492c948;
    
    /// @notice External B0x staking pool. The vault allows individuals to lock up their
    ///         B0x in B0x Guess. They will pay 2.5% withdrawl fee at end to vault.
    address public constant B0xGuess = 0x57da35b42B97908255D5B1655DaC6ed936fc3668;

    /// @notice B Zero X Token Address on Base
    ///         This is a address which will not change
    address public BZEROX_ADDRESS = 0x6B19E31C1813cD00b0d47d798601414b79A3e8AD;

    // ── State ──────────────────────────────────────────────────

    /// @notice Uniswap V4 NFT Manager on Base
    INonfungiblePositionManager public nftManager = INonfungiblePositionManager(UNISWAP_V4_NFT_MANAGER);
            
    /// @notice Owner of contract and all assets inside
    address public owner;
    
    /// @notice Allowed to call B0xGuess Staking methods for the vault. Advanced. No withdrawability.
    address public GuessDepoCaller;
            
    /// @notice Unlock Time
    uint256 public immutable unlockTime;

    /// @dev NFT tokenId → true if staked in this vault
    mapping(uint256 => bool) public stakedNFTs;

    /// @dev Factory we use
    address public immutable factory; // set in constructor

    /// @dev Flat list of staked token IDs for enumeration
    uint256[] public _stakedTokenIds;

    /// @dev tokenId → (index in _stakedTokenIds + 1). 0 means "not present".
    ///      Storing index+1 lets us use 0 as a sentinel for "not in the set"
    ///      without colliding with a legitimate index of 0.
    mapping(uint256 => uint256) public _stakedTokenIndex;

    // ── Events ─────────────────────────────────────────────────

    event NFTStaked(uint256 indexed tokenId, address indexed from);
    event NFTWithdrawn(uint256 indexed tokenId, address indexed to);
    event NFTWithdrawnSpecial(uint256 indexed tokenId, address indexed to, address NFTManager, address LiquidityPool);
    event OwnershipTransferred(address oldOwner, address newOwner);
    

    // ── Modifiers ──────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) require(false, "Not owner of vault");
        _;
    }
    modifier onlyOwnerorFactory() {
        if (msg.sender != owner && msg.sender != factory) require(false, "Not owner of vault or Timelock Factory");
        _;
    }
    
    modifier onlyOwnerorGuessDepoCallerorFactory() {
        if (msg.sender != owner && msg.sender != GuessDepoCaller && msg.sender != factory) require(false, "Not owner of vault or Timelock Factory or GuessDepoCaller");
        _;
    }
    

    modifier afterUnlock() {
        if (block.timestamp < unlockTime)
            require(false, "Vault is still locked. Check unlockTime for exact release.");
        _;
    }
    
    
    /// @notice changes the GuessDepoCaller of the contract, to  allow a delegation of B0xGuess Staking power, no withdrawability on GuessDepoCaller
    /// @param  newGuessDepoCaller Thew new GuessDepoCaller
    function change_GuessDepoCaller(address newGuessDepoCaller) public {
    	GuessDepoCaller = newGuessDepoCaller;
    }

    // ── Constructor ────────────────────────────────────────────

    /// @param _owner      The wallet that controls this vault.
    /// @param _unlockTime Unix timestamp after which withdrawals are allowed.
    /// @param _factory Factory from which it is called.
    constructor(address _owner, uint256 _unlockTime, address _factory) {

        require(_owner != address(0), "zero owner");
        require(_unlockTime > block.timestamp, "unlock must be future");
        owner      = _owner;
        GuessDepoCaller = GuessDepoCaller;
        unlockTime = _unlockTime;
        factory = _factory;
        
    }

    // ── ERC-20 deposits / withdrawals ──────────────────────────
    
    // Mainnet WETH address
    address public constant WETH = 0x4200000000000000000000000000000000000006;

    /// @notice Wraps all ETH currently held by this contract into WETH. Anyone is able to call this on a function at anytime.
    function wrapETHtoWETH() public {
        uint256 balance = address(this).balance;
        if(balance > 0){
             IWETH(WETH).deposit{value: balance}();
        }
    }


    /// @notice Withdraw all of `token` to the owner after the lock expires.
    function withdrawToken(address token) external afterUnlock {
        if(token == WETH){
            wrapETHtoWETH();
        }
        uint amount = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(owner, amount);
    }

    // ── Uniswap V4 NFT staking ─────────────────────────────────

    /// @notice Stakes a Uniswap V4 NFT position for the caller.  Must be our B0x/0xBTC positions Full Range with Custom Hook for fee management
    /// @param  tokenId The ID of the NFT position to stake.
    /// @dev    Caller must approve this vault for `tokenId` on the position manager
    ///         before calling (or use setApprovalForAll).
    ///
    ///         Flow:
    ///           1. Pull NFT from caller → vault  (skipped if vault already holds it)
    ///           2. Approve LP_POOL for the tokenId
    ///           3. Delegate stake to LP_POOL.stakeUniswapV3NFT — rewards accrue
    ///              to this vault's address while the lock is active
    ///           4. Record stake internally
    function stakeUniswapV4NFT(uint256 tokenId) public {
    	
        if (stakedNFTs[tokenId]) require(false, "NFT Already Staked in Vaults Staking.");

        // Step 1 — pull the NFT into the vault only if we don't already hold it.
        if (nftManager.ownerOf(tokenId) != address(this)) {
            nftManager.transferFrom(msg.sender, address(this), tokenId);
        }

        // Step 2 — approve the LP pool so it can take custody for staking.
        nftManager.approve(LP_POOL, tokenId);
        // Step 3 —  AMOUNT WE OWE PER POSITION IS ENFORCED SINCE ITS NOT YOUR CONTRACT, must be 100 B0x min
        if(msg.sender != owner){
		
		
		
        	uint256 amountOwedPerPosition = ITimeLockFactory(factory).AmountWeOWE_PER_POSITION2();
		( , , uint256 totalB0xStakedBEFORE) = ILPPool(LP_POOL).getContractTotals();

		// Step 3 — delegate the actual stake; the pool tracks this vault as staker.
		ILPPool(LP_POOL).stakeUniswapV3NFT(tokenId);
		

		//Make them pay at least 100 B0x per staked Position

	   	( , , uint256 totalB0xStakedAFTER) = ILPPool(LP_POOL).getContractTotals();
		

		
		uint total = totalB0xStakedAFTER-totalB0xStakedBEFORE;
		
		uint256 AmountWeOWE = 0;
		if (total < amountOwedPerPosition) {
		    AmountWeOWE = amountOwedPerPosition - total;
		    IERC20(BZEROX_ADDRESS).transferFrom(msg.sender, address(this), AmountWeOWE);
		}
	}else{
	
	// Step 3 — delegate the actual stake; the pool tracks this vault as staker.
		ILPPool(LP_POOL).stakeUniswapV3NFT(tokenId);
		

	}
            
        // Step 4 — record internally, O(1).
        stakedNFTs[tokenId] = true;
        _stakedTokenIds.push(tokenId);
        _stakedTokenIndex[tokenId] = _stakedTokenIds.length; // length AFTER push = index+1

        emit NFTStaked(tokenId, msg.sender);
    }
    
    
    /// @notice Returns the current penalty rate applied to withdrawals from the B0x Guess staking contract.
    /// @dev Simple passthrough view call to `IStakingGuess(B0xGuess).penalty()`.
    /// @return penalty The current penalty value (units/percentage depend on the B0xGuess contract's implementation).
    function B0xGuessPenalty() public view returns (uint penalty) {
        return IStakingGuess(B0xGuess).penalty();
    }
    
    
    /// @notice Returns a given user's current B0x balance as tracked by the B0x Guess staking contract.
    /// @dev Passthrough view call to `IStakingGuess(B0xGuess).currentB0x(user)`.
    /// @param user The address to query the staked/current B0x balance for.
    /// @return currentB0x The user's current B0x amount as recorded in the B0xGuess contract.
    function BalOfB0xGuess(address user) public view returns (uint currentB0x) {
        return IStakingGuess(B0xGuess).currentB0x(user);
    }
    
    
    /// @notice Transfers B0x tokens from the caller into this contract and stakes them in the B0x Guess contract.
    /// @dev Pulls `amountOfB0x` from `msg.sender` via `transferFrom` (requires prior ERC20 approval by the caller),
    ///      approves the B0xGuess contract to spend the tokens, then stakes them. Reverts if the transferFrom fails.
    /// @param amountOfB0x The amount of B0x tokens to transfer from the caller and stake.
    function stakeB0xGuess(uint256 amountOfB0x) public {
        require(IERC20(BZEROX_ADDRESS).transferFrom(msg.sender, address(this), amountOfB0x), "Must transfer B0x to this contract to stake in B0x Guess for this contract");
        IERC20(BZEROX_ADDRESS).approve(B0xGuess, amountOfB0x);
        IStakingGuess(B0xGuess).stake(amountOfB0x);
    }
    
    
    
    /// @notice Gets B0x rewards from Staking then stakes this contract's entire current B0x token balance into the B0x Guess staking contract.
    /// @dev Gets B0x rewards from Staking contractReads this contract's own B0x balance and delegates to `stakeVaultB0xGuess`. Restricted to owner or factory.
    function stakeVaultMaxAndRewards() public onlyOwnerorGuessDepoCallerorFactory {
    
        IERC20[] memory b0x12 = new IERC20[](1);
        b0x12[0] = IERC20(BZEROX_ADDRESS);
        getRewardForTokensContract(b0x12);
        
        uint bal = IERC20(BZEROX_ADDRESS).balanceOf(address(this));
        stakeVaultB0xGuess(bal);
    }
    
    
    /// @notice Approves and stakes a specified amount of this contract's B0x tokens into the B0x Guess staking contract.
    /// @dev Approves the B0xGuess contract to spend `amountOfB0x` from this contract's balance, then calls `stake`. 
    ///      Restricted to owner or factory.
    /// @param amountOfB0x The amount of B0x tokens (already held by this contract) to stake.
    function stakeVaultB0xGuess(uint256 amountOfB0x) public onlyOwnerorGuessDepoCallerorFactory {
        IERC20(BZEROX_ADDRESS).approve(B0xGuess, amountOfB0x);
        IStakingGuess(B0xGuess).stake(amountOfB0x);
    }
    
    
    /// @notice Withdraws this contract's full staked balance from the B0x Guess contract with no penalty tolerance.
    /// @dev Only callable after the timelock unlock period. Passes a penalty ceiling of 0, meaning the withdrawal 
    ///      must incur zero penalty — protects against unexpected/undesired penalty deductions on outside withdrawals.
    ///      No-op if the staked balance is zero.
    function withdrawB0xGuess() external afterUnlock {
        uint256 balInGuess = IStakingGuess(B0xGuess).balanceOf(address(this));
        if(balInGuess != 0){
            IStakingGuess(B0xGuess).withdraw(balInGuess, 0);  //must be zero for outside withdraws , we dont want gamage
        }
    }
    
    
    /// @notice Owner-only withdrawal of this contract's full staked balance from the B0x Guess contract, 
    ///         allowing the owner to accept a penalty up to a specified maximum if needed.
    /// @dev Only callable after the timelock unlock period and only by the owner. Unlike `withdrawB0xGuess`, 
    ///      this allows a non-zero penalty ceiling, giving the owner flexibility to force a withdrawal 
    ///      even if it incurs a penalty (e.g. in urgent/exceptional circumstances).
    /// @param maxPenalty The maximum penalty the owner is willing to accept for this withdrawal.
    function withdrawB0xGuessOwner(uint256 maxPenalty) external afterUnlock onlyOwner {
        uint256 balInGuess = IStakingGuess(B0xGuess).balanceOf(address(this));
        IStakingGuess(B0xGuess).withdraw(balInGuess, maxPenalty);  //Owner allowed to sacrafice if needed.
    }
    
    
    
    /// @notice UNStakes NFTs, transfers them to owner, gets reward transfer that to owner also.  All in One.
    /// @param  tokenIds The IDs of the NFT position to unstake and withdraw.
    /// @param  ERC20sToGetRewardAndWithdraw The IERC20 addressees of all the rewards you wish to also claim
    function withdraw_Multiple_NFTs_And_ERC20s(uint256[] calldata tokenIds, IERC20[] calldata ERC20sToGetRewardAndWithdraw) external afterUnlock{
    	for(uint x=0; x<tokenIds.length; x++){
    	   try this.withdrawNFT(tokenIds[x]) {
            // success - nothing extra needed
           } catch Error(string memory reason) {
           }
	}
	wrapETHtoWETH();
	 try this.withdrawB0xGuess() {
            // success - nothing extra needed
        } catch Error(string memory reason) {
        }
	if(ERC20sToGetRewardAndWithdraw.length !=0){
	
		ILPPool(LP_POOL).getRewardForTokens(ERC20sToGetRewardAndWithdraw);
	}
	for(uint y=0; y<ERC20sToGetRewardAndWithdraw.length; y++){
		ERC20sToGetRewardAndWithdraw[y].transfer(owner, ERC20sToGetRewardAndWithdraw[y].balanceOf(address(this)));
	}
    }
    
    /// @notice UNStakes NFTs, Gets B0xGuess balance, transfers them to owner, gets reward transfer that to owner also.  All in One. only For Owners
    /// @param  tokenIds The IDs of the NFT position to unstake and withdraw.
    /// @param  ERC20sToGetRewardAndWithdraw The IERC20 addressees of all the rewards you wish to also claim
    /// @param  penaltyOfB0x The amount of b0x your willing to lose because bets are in action when you try to withdraw
    function withdraw_Multiple_NFTs_And_ERC20s_OWNERONLY(uint256[] calldata tokenIds, IERC20[] calldata ERC20sToGetRewardAndWithdraw, uint penaltyOfB0x) external afterUnlock onlyOwnerorFactory{
    	for(uint x=0; x<tokenIds.length; x++){
    	   try this.withdrawNFT(tokenIds[x]) {
            // success - nothing extra needed
           } catch Error(string memory reason) {
           }
	}
	
        uint256 balInGuess = IStakingGuess(B0xGuess).balanceOf(address(this));
	 try IStakingGuess(B0xGuess).withdraw(balInGuess, penaltyOfB0x) {
            // success - nothing extra needed
        } catch Error(string memory reason) {
        }
	if(ERC20sToGetRewardAndWithdraw.length !=0){
	
		ILPPool(LP_POOL).getRewardForTokens(ERC20sToGetRewardAndWithdraw);
	}
	for(uint y=0; y<ERC20sToGetRewardAndWithdraw.length; y++){
		ERC20sToGetRewardAndWithdraw[y].transfer(owner, ERC20sToGetRewardAndWithdraw[y].balanceOf(address(this)));
	}
    }

    /// @notice Withdraw a staked NFTs to the owner after the lock expires.
    /// @dev    Calls LP_POOL.unstakeUniswapV3NFT first to reclaim the NFT from
    ///         the pool back into the vault, then transfers it to the owner.
    function withdrawNFT(uint256 tokenId) external afterUnlock {
    
        if (nftManager.ownerOf(tokenId) != address(this)) {
            // Reclaim NFT from the LP pool back to this vault.
            bool success = ILPPool(LP_POOL).withdraw(tokenId);
            require(success, "LP_POOL withdraw failed");
        }

        // Transfer from vault to owner.
       if (nftManager.ownerOf(tokenId) == address(this)) {
        INonfungiblePositionManager(UNISWAP_V4_NFT_MANAGER)
            .safeTransferFrom(address(this), owner, tokenId);
        }

    }
    

    /// @notice Withdraw a staked NFT to the owner after the lock expires.
    /// @dev    Calls LP_POOL(poolz).unstakeUniswapV3NFT first to reclaim the NFT from
    ///         the pool back into the vault, then transfers it to the owner.
    ///         This is a extra safe function will not be used very often
    function withdrawNFT_Special(uint256 tokenId, address NFTManagerz, address poolz) external afterUnlock {
    require(poolz != LP_POOL, "Not Allowed to use withdrawNFT_Special on LP_Pool, Use WithdrawNFT function instead");
    require( NFTManagerz != UNISWAP_V4_NFT_MANAGER, "Not Allowed to use withdrawNFT_Special on nftManager, Use WithdrawNFT function instead");
    INonfungiblePositionManager nftManager2 =
            INonfungiblePositionManager(NFTManagerz);

        if (nftManager2.ownerOf(tokenId) != address(this)) {
            // Reclaim NFT from the LP pool back to this vault.
            bool success = ILPPool(poolz).withdraw(tokenId);
            require(success, "LP_POOL withdraw failed");
        }

        // Transfer from vault to owner.
        nftManager2.safeTransferFrom(address(this), owner, tokenId);

        emit NFTWithdrawnSpecial(tokenId, owner, NFTManagerz, poolz);
    }
    
    /// @notice Gets all Rewards for the Vault.
    /// @dev    Calls LP_POOL and gets the Rewards for the vault. All rewards.
    function getRewards() external {
	ILPPool(LP_POOL).getReward();
    }
    
    
    /// @notice Returns true if the vault is currently locked.
    function isLocked() public view returns (bool) {
        return block.timestamp < unlockTime;
    }
    
   /// @notice Permanently destroys this vault by transferring ownership to the
   ///         B0x Proof-of-Work burn address. This action cannot be undone.
   /// @dev    Requires the timelock to be unlocked and caller to be the owner.
   ///         Refuses to proceed if the vault has meaningful outstanding staking
   ///         value: computes a per-position B0x debt metric from the LP pool's
   ///         totals (liquidityInStaking, totalB0xStaked) and the vault's own
   ///         staking balance/position count, clamping positionCount to
   ///         [1, 30] to avoid divide-by-zero and unbounded gas, then requires
   ///         the resulting per-position debt to be under 12.5 B0x
   ///         (AmountWeOWE_PER_POSITION2 / 4). Also claims any outstanding BZRX
   ///         staking rewards into the vault and requires the resulting BZRX
   ///         balance to be under AmountWeOWE_PER_POSITION2 / 20 tokens (ex. Starts at 2.5 B0x)
   ///         to prevent griefing via a dust reward balance blocking destruction. 
   ///         Does NOT check that all staked NFTs have been withdrawn — callers must ensure
   ///         stakedTokenCount() == 0 before calling, or staked NFTs may become
   ///         unrecoverable once ownership passes to the burn address. Calls
   ///         ITimeLockFactory.DestroyOwnership_TransferToDEADEND to update the
   ///         factory's bookkeeping and finalize the ownership transfer.
   function DESTROY_VAULT_FOREVER() external afterUnlock onlyOwnerorFactory{
        uint256 stakingBalanceOfVault = ILPPool(LP_POOL).balanceOf(address(this));
        uint256 amountOwedPerPosition = ITimeLockFactory(factory).AmountWeOWE_PER_POSITION2();
        if (stakingBalanceOfVault != 0) {
            (uint128 liquidityInStaking, , uint256 totalB0xStaked) = ILPPool(LP_POOL).getContractTotals();
            uint256 positionCount = ILPPool(LP_POOL).userPositionCount(address(this));
            uint finali = MulDiv.mulDiv(uint256(stakingBalanceOfVault),totalB0xStaked, liquidityInStaking);
            
            if (positionCount == 0) { positionCount = 1; }
            if(positionCount > 20){
		positionCount = 20;
	     }
            require(finali / positionCount < amountOwedPerPosition / 4, "Must be less than 12.5 B0x or (AmountWeOWE_PER_POSITION2 / 4) per position left, exit them first");
        }
        
        IERC20[] memory tokens = new IERC20[](1);
	tokens[0] = IERC20(BZEROX_ADDRESS);
	ILPPool(LP_POOL).getRewardForTokens(tokens);
	require(IERC20(BZEROX_ADDRESS).balanceOf(address(this)) < amountOwedPerPosition / 20, "Can't have B Zero X Balance in vault. Claim your rewards then exit. Max allowed left when transfered is (AmountWeOWE_PER_POSITION2 / 20)");
	
	ITimeLockFactory(factory).DestroyOwnership_TransferToDEADEND(owner, 0xd44Ee7dAdbF50214cA7009a29D9F88BCcD0E9Ff4, address(this)); //Transfers vault to PoW Address
   }
   
   
   
    /// @notice Transfers ownership of this vault to `newOwner` while still locked.
    /// @dev    Only callable before unlock — once the timelock has expired the
    ///         intended path is withdrawToken/withdrawNFT, not a handoff, since
    ///         the owner can simply pull assets out directly at that point.
    ///         Reverts via bare `revert()` if the vault is already unlocked
    ///         (isLocked() == false); does not use isLocked()'s custom errors
    ///         from the `afterUnlock` modifier since this is the inverse check.
    ///         Notifies the factory via recordOwnershipTransfer, which updates
    ///         `_vaults` bookkeeping for both the old and new owner AND pulls a
    ///         computed BZRX debt amount from `oldOwner` via transferFrom before
    ///         this function completes — so `oldOwner` must have approved the
    ///         factory for at least that amount beforehand, or this call will
    ///         revert on the ERC20 allowance check inside recordOwnershipTransfer.
    ///         The event is emitted before the external call and before `owner`
    ///         is updated (using the pre-transfer `owner` value in the event),
    ///         though because emit itself does not call out, this does not
    ///         introduce a reentrancy concern by itself — the actual external
    ///         calls are recordOwnershipTransfer (factory) and, downstream of
    ///         that, transferFrom (BZRX token contract).
    /// @param  newOwner Address to become the new owner; must be non-zero.
    function transferOwnership(address newOwner) external onlyOwner {
        if (!isLocked()) revert();
        require(newOwner != address(0), "zero address");
        emit OwnershipTransferred(owner, newOwner);
	ITimeLockFactory(factory).recordOwnershipTransfer(owner, newOwner, address(this));

        owner = newOwner; // owner would need to be mutable (drop `immutable`)
        GuessDepoCaller = owner;
    }
    

   address public zeroXBitcoin = 0xc4D4FD4F4459730d176844c170F2bB323c87Eb3B;
   
   /// @notice Exits staked NFT positions in the LP pool and sweeps this vault's
    ///         balances of BZRX, 0xBTC, WETH, and any additional specified
    ///         ERC-20 tokens to the owner, all in one call.
    /// @dev    Only callable after unlock (afterUnlock modifier) — not
    ///         onlyOwner-restricted, so anyone can trigger this cleanup, but all
    ///         swept funds always go to `owner` regardless of caller. Delegates
    ///         the actual position exit to LP_POOL.exit(startIndex, count),
    ///         which per ILPPool claims all staked rewards and exits positions
    ///         in the given range; callers with more than one page of positions
    ///         may need multiple calls with different startIndex/count values.
    ///         This function does NOT update this vault's own `stakedNFTs` /
    ///         `_stakedTokenIds` bookkeeping — if the exited positions include
    ///         NFTs this vault tracked as staked, that internal state will be
    ///         stale afterward and should be reconciled separately (e.g. via
    ///         withdrawNFT for each affected tokenId). Each token sweep is an
    ///         unconditional transfer of the vault's full balance; if any
    ///         transfer target is not a standard-compliant ERC-20 (e.g. one that
    ///         returns false instead of reverting on failure, or has unusual
    ///         fee-on-transfer behavior). Passing a duplicate or malicious token address in
    ///         additionalERC20s will simply attempt a transfer of whatever
    ///         balance this vault holds for it — this can be used to sweep
    ///         arbitrary tokens the vault happens to hold, not just designated
    ///         reward tokens.
    /// @param  startIndex Starting index into the LP pool's internal position
    ///                     list to begin exiting from (passed through to
    ///                     LP_POOL.exit).
    /// @param  Count       Number of positions, starting at `startIndex`, to
    ///                     exit (passed through to LP_POOL.exit).
    /// @param  additionalERC20s Extra ERC-20 token addresses, beyond BZRX,
    ///                     0xBTC, and WETH, whose full balance in this vault
    ///                     should also be swept to `owner`.
    function exitAllTogether(uint startIndex, uint Count, address [] calldata additionalERC20s) external afterUnlock{
    	 try this.withdrawB0xGuess() {
            // success - nothing extra needed
        } catch Error(string memory reason) {
        }
        ILPPool(LP_POOL).exit(startIndex, Count);
        IERC20(BZEROX_ADDRESS).transfer(owner, IERC20(BZEROX_ADDRESS).balanceOf(address(this)));
        IERC20(zeroXBitcoin).transfer(owner, IERC20(zeroXBitcoin).balanceOf(address(this)));
        IERC20(WETH).transfer(owner, IERC20(WETH).balanceOf(address(this)));
        for(uint x =0; x<additionalERC20s.length; x++){
            IERC20(additionalERC20s[x]).transfer(owner, IERC20(additionalERC20s[x]).balanceOf(address(this)));
        }
        
    }
   

    /// @notice Claims rewards for specific reward tokens
    /// @param rewardTokensToGet Array of reward token addresses to claim rewards for
    /// @dev Updates rewards, calculates earned amounts, and transfers tokens to caller
    function getRewardForTokensContract(IERC20[] memory rewardTokensToGet) public {
	ILPPool(LP_POOL).getRewardForTokens(rewardTokensToGet);
    }
   

    // ── View helpers ───────────────────────────────────────────


    /// @notice Returns uint256 many seconds remain until unlock (0 if already unlocked).
    function secondsUntilUnlock() external view returns (uint256) {
        if (block.timestamp >= unlockTime) return 0;
        return unlockTime - block.timestamp;
    }


    /// @notice Returns the full list of staked NFT token IDs.
    function getStakedTokenIds() external view returns (uint256[] memory) {
        return _stakedTokenIds;
    }


    /// @notice Returns how many token IDs are currently staked.
    function stakedTokenCount() external view returns (uint256) {
        return _stakedTokenIds.length;
    }
    

    /// @notice Returns a single staked token ID by its position in the set.
    /// @dev Order is not stable across removals (swap-and-pop), so don't rely
    ///      on index meaning "the Nth token ever staked" — only "the Nth token
    ///      currently staked, as of this call."
    function stakedTokenIdAt(uint256 index) external view returns (uint256) {
        return _stakedTokenIds[index]; // reverts out-of-bounds by default
    }	
    

    /// @notice Returns a page of staked token IDs, starting at `offset`,
    ///         up to `limit` entries. Use this instead of getStakedTokenIds()
    ///         once the set could be large.
    /// @param offset Index to start reading from.
    /// @param limit  Max number of entries to return.
    function getStakedTokenIdsPaged(uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory page, uint256 total)
    {
        total = _stakedTokenIds.length;
        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) end = total;

        page = new uint256[](end - offset);
        for (uint256 i = offset; i < end; ) {
            page[i - offset] = _stakedTokenIds[i];
            unchecked { ++i; }
        }
    }

    
    
    // ── Internal helpers ───────────────────────────────────────


    /// @dev O(1) removal regardless of array size — no scanning.
    function _removeTokenId(uint256 tokenId) internal {
        uint256 idxPlusOne = _stakedTokenIndex[tokenId];
        if (idxPlusOne == 0) return; // not present, nothing to do

        uint256 idx = idxPlusOne - 1;
        uint256 lastIdx = _stakedTokenIds.length - 1;

        if (idx != lastIdx) {
            uint256 lastTokenId = _stakedTokenIds[lastIdx];
            _stakedTokenIds[idx] = lastTokenId;
            _stakedTokenIndex[lastTokenId] = idx + 1;
        }

        _stakedTokenIds.pop();
        delete _stakedTokenIndex[tokenId];
    }
    
    
    // ── ERC-721 receiver ───────────────────────────────────────

    /// @dev Required so safeTransferFrom into this contract does not revert. Transfers all NFTs from Staking Vault to Owner!
    //  @notice IF LP_Pool = B0x/0xBTC B0x Staking Contract and calling contract = UNISWAP_V4_NFT then it is special withdraw
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata /*data*/
    ) external returns (bytes4) {
        if (
            msg.sender == address(UNISWAP_V4_NFT_MANAGER) &&
            operator == LP_POOL &&
            from == LP_POOL
        ) {
        
            stakedNFTs[tokenId] = false;
            _removeTokenId(tokenId);
            INonfungiblePositionManager(msg.sender).safeTransferFrom(address(this), owner, tokenId);
            
            emit NFTWithdrawn(tokenId, owner);
        }

        return this.onERC721Received.selector;
    }


    /// @notice Lets the contract receive ETH directly
    receive() external payable {}
    
}

interface IVault {
    function DESTROY_VAULT_FOREVER() external;
    
    
    function owner() external view returns (address);
    
    
    function getRewardForTokensContract(IERC20[] calldata rewardTokensToGet) external;
    
    function stakeVaultB0xGuess(uint256 amountOfB0x) external;
        
    function withdraw_Multiple_NFTs_And_ERC20s(
        uint256[] calldata tokenIds,
        IERC20[] calldata ERC20sToGetRewardAndWithdraw
    ) external;
    
    function withdraw_Multiple_NFTs_And_ERC20s_OWNERONLY(
        uint256[] calldata tokenIds,
        IERC20[] calldata ERC20sToGetRewardAndWithdraw,
        uint256 penaltyOfB0x
    ) external;

}


interface IStateView {
    function getSlot0(bytes32 poolId)
        external
        view
        returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee);
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

// ─────────────────────────────────────────────────────────────
//  TimeLockFactory  (main entry-point)
// ─────────────────────────────────────────────────────────────

/// @title  TimeLockFactory
/// @notice Anyone can call `createVault` to deploy their own personal
///         TimeLockVault that unlocks at a future timestamp.
contract TimeLockFactory {

    // ── Events ─────────────────────────────────────────────────

    event VaultCreated(
        address indexed owner,
        address indexed vault,
        uint256 unlockTime
    );
    
    event VaultOwnershipTransfered(
        address indexed vault,
        address indexed oldOwner,
        address indexed newOwner
    );


    /// @notice B Zero X Token  Address on Base
    address public BZEROX_ADDRESS = 0x6B19E31C1813cD00b0d47d798601414b79A3e8AD;


    /// @notice External LP staking pool. The vault approves this address for each
    ///         NFT then delegates the actual stake call here so rewards accumulate
    ///         while the NFT remains time-locked in the vault's control.
    address public constant LP_POOLz = 0x08f489C5017942d3b7c82C1c178877C80492c948;

    /// @notice External B0x staking pool. The vault allows individuals to lock up their
    ///         B0x in B0x Guess. They will pay 2.5% withdrawl fee at end to vault.
    address public constant B0xGuess = 0x57da35b42B97908255D5B1655DaC6ed936fc3668;
    
    uint256 private constant AmountWeOWE_PER_POSITION_Constant = (50 * 10 ** 18); //50 tokens of B0x

    uint256 public AmountWeOWE_PER_POSITION2 = (50 * 10 ** 18); //100 tokens of B0x

    
    /// @notice Proof of Work Address for B Zero X Token  Address on Base
    address constant public Proof_OF_Work_B0x = 0xd44Ee7dAdbF50214cA7009a29D9F88BCcD0E9Ff4;
    
    // ── State ──────────────────────────────────────────────────
    
    /// @dev owner → array of vault addresses ever attributed to that owner.
    ///      Entries are added on creation (createVault) and on ownership
    ///      transfer (recordOwnershipTransfer). Length is attacker-influenceable:
    ///      anyone can grow another address's array via cheap vault + transfer
    ///      spam, so callers must never assume this is small. Removal is O(1)
    ///      via _removeVault; do not iterate or splice this array manually.
    mapping(address => address[]) public _vaults;

    /// @dev vault address → true if deployed by this factory. Used to gate
    ///      recordOwnershipTransfer so only genuine vaults (not arbitrary
    ///      callers) can rewrite _vaults bookkeeping.
    mapping(address => bool) public _isVault;

    /// @dev owner → vault → (index into _vaults[owner] + 1). Zero means
    ///      "not present for this owner." Storing index+1 rather than index
    ///      lets 0 double as a sentinel without an extra existence mapping.
    ///      Kept in sync with _vaults by _addVault/_removeVault only — never
    ///      mutate _vaults directly or this index will desync and future
    ///      removals will silently no-op (see _removeVault).
    mapping(address => mapping(address => uint256)) public _vaultIndex;

    /// @notice Maximum number of vault addresses returned by getVaults in a
    ///         single call, regardless of the caller-supplied `count`.
    /// @dev    Exists specifically to stop a caller (or an on-chain integrator)
    ///         from requesting an unbounded slice of a _vaults[user] array
    ///         that an attacker has inflated via spam — without this cap,
    ///         "give me everything" reads reintroduce the O(n) griefing cost
    ///         that pagination is meant to eliminate. Lower this if per-call
    ///         gas becomes a concern; raise with caution.
    uint256 public constant MAX_PAGE_SIZE = 100;

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
        IUniswapV3Pool pool = IUniswapV3Pool(POOL_ADDRESS);
        (uint160 sqrtPriceX96, , , , , , ) = pool.slot0();

            // price = sqrtPriceX96^2 * 1e24 / 2^192, computed via two chained mulDiv
        // calls so the intermediate never overflows regardless of sqrtPriceX96's size.
        uint256 priceX128 = MulDiv.mulDiv(sqrtPriceX96, sqrtPriceX96, 1 << 64);
        return MulDiv.mulDiv(priceX128, 1e24, 1 << 128);
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

    /// @notice Timestamp at which the current checkpoint sequence was first started for fee adjustment.
    uint256 public pendingFeeTimestamp;

    /// @notice Timestamp of the most recently passed checkpoint for fee adjustment.
    uint256 public lastFeeCheckpointTimestamp;

    /// @notice Number of consecutive checkpoints passed for the current pendingFeeAmount (0, 1, 2, or 3)
    uint256 private checkpointsPassed;

    /// @notice Number of confirmations required before a value commits
    uint256 private constant REQUIRED_CHECKPOINTS = 4;

    /// @notice Minimum time between each checkpoint confirmation
    uint256 private constant CHECKPOINT_DELAY = 46 hours;
    
    /// @notice Checks whether calling setAmountWeOwePerPosition() right now would
    ///         actually change state, or would just waste gas on a no-op / revert
    /// @dev Mirrors the exact branching logic of setAmountWeOwePerPosition():
    ///      - If the freshly computed amount matches the already-committed value,
    ///        this is only actionable if there's a stale in-progress sequence to
    ///        clear (checkpointsPassed != 0); otherwise there's nothing to do.
    ///      - If no sequence is active, or the computed amount differs from what's
    ///        currently pending, a call is always actionable (starts/restarts the
    ///        sequence regardless of timing).
    ///      - If the same value is still pending, a call is only actionable once
    ///        CHECKPOINT_DELAY has elapsed since the last checkpoint.
    ///      NOTE: this computes queryRequiredB0xAmount(), which reads live pool
    ///      state — free when called off-chain via eth_call, but a real gas cost
    ///      if invoked on-chain by another contract.
    /// @return actionable True if calling setAmountWeOwePerPosition() now would
    ///      change contract state; false if it would currently no-op
    function shouldWeCall_SetAmountWeOwePerPosition() public view returns (bool actionable) {
        uint256 reqAmt = queryRequiredB0xAmount();

        // Price at committed value — only actionable if there's a stale
        // sequence to clear; otherwise nothing would happen
        if (reqAmt == AmountWeOWE_PER_POSITION2) {
            if (checkpointsPassed != 0) {
                return true;
            } else {
                return false;
            }
        }

        // No sequence active, or price changed mid-sequence — always actionable
        if (checkpointsPassed == 0 || pendingFeeAmount != reqAmt) {
            return true;
        }

        // Same value still pending — actionable only once the delay has passed
        if (block.timestamp >= lastFeeCheckpointTimestamp + CHECKPOINT_DELAY) {
            return true;
        } else {
            return false;
        }
    }
    
    

    /// @notice Three-checkpoint, time-gated update to AmountWeOWE_PER_POSITION2
    /// @dev A newly computed amount must be confirmed 4 separate times, each
    ///      confirmation spaced at least 46 hours apart, all while the freshly
    ///      computed amount stays the same, before it commits. Any call where
    ///      the computed amount changes, or matches the already-committed value,
    ///      resets the checkpoint sequence entirely — a manipulated price must
    ///      be sustained across the full multi-checkpoint window (>= 96 hours
    ///      minimum, since 4 checkpoints require 3 full delays between them) with
    ///      no reversion at any checkpoint, or the whole sequence restarts from zero.
    function setAmountWeOwePerPosition() external {
        uint256 reqAmt = queryRequiredB0xAmount();

        // No change needed — clear any in-progress checkpoint sequence so stale
        // progress can't be reused later to shortcut the confirmation process
        if (reqAmt == AmountWeOWE_PER_POSITION2) {
            if (checkpointsPassed != 0) {
                pendingFeeAmount = 0;
                pendingFeeTimestamp = 0;
                lastFeeCheckpointTimestamp = 0;
                checkpointsPassed = 0;
                return;
            }else{
                require(false, "Check Points have not passed, must run this when queryRequiredB0xAmount() changes from AmountWeOWE_PER_POSITION2");
                return;
            }
        }


        // No sequence in progress, or the value changed mid-sequence — start fresh
        if (checkpointsPassed == 0 || pendingFeeAmount != reqAmt) {
            pendingFeeAmount = reqAmt;
            pendingFeeTimestamp = block.timestamp;
            lastFeeCheckpointTimestamp = block.timestamp;
            checkpointsPassed = 1;
            return;
        }



	// Same value still pending — must wait the full delay to advance
	require(block.timestamp >= lastFeeCheckpointTimestamp + CHECKPOINT_DELAY, "Not enough time has passed between checkpoints, takes >46h since last checkpoint.");
	    
    
        // Same value still pending — check if enough time has passed since the
        // last checkpoint to advance to the next one
        if (block.timestamp >= lastFeeCheckpointTimestamp + CHECKPOINT_DELAY) {
            checkpointsPassed += 1;
            lastFeeCheckpointTimestamp = block.timestamp;

            if (checkpointsPassed >= REQUIRED_CHECKPOINTS) {
                AmountWeOWE_PER_POSITION2 = reqAmt;
                pendingFeeAmount = 0;
                pendingFeeTimestamp = 0;
                lastFeeCheckpointTimestamp = 0;
                checkpointsPassed = 0;
            }
        }else{
	    require(false, "Not enough time has passed between checkpoints, takes >46h since last checkpoint.");
	}
        
    }
    
    
    /// @notice Computes the current required B0x amount using a step schedule.
    /// @dev Steps: price <= 4000 -> 50, > 4000 -> 33.33, > 8000 -> 22.22,
    ///      > 16000 -> 14.81, > 32000 -> 9.88, etc. Each doubling of price
    ///      reduces the required amount by 1/3 (÷1.5), in discrete steps.
    ///      Capped at 50 halvings max, regardless of how high price goes.
    ///      Never returns less than 0.0000001 token (0.0000001e18).
    function queryRequiredB0xAmount() public view returns (uint256 requiredAmount) {
        uint256 currentPrice = getPriceOFB0xINUSD();
        uint256 amount = AmountWeOWE_PER_POSITION_Constant;
        uint256 threshold = 4000;
        uint256 MIN_AMOUNT = 0.0000001 * 10 ** 18; // 0.0000001 token minimum floor
	uint256 EVEN_MIN_AMOUNT = 0.2 * 10 ** 18;
        for (uint256 i = 0; i < 50; i++) {
            if (currentPrice <= threshold) {
                break;
            }
            
            if(amount>EVEN_MIN_AMOUNT){
            	amount = (amount * 2) / 3; // divide by 1.5, integer-safe
            }else{
            	amount = amount / 2; // divide by 2, integer-safe
            }
            
            threshold = threshold * 2;
            if (amount <= MIN_AMOUNT) {
                return MIN_AMOUNT;
            }
        }

        return amount < MIN_AMOUNT ? MIN_AMOUNT : amount;
    }
    
    
    
    /// @dev Appends `vault` to `_vaults[owner_]` and records its index in
    ///      _vaultIndex for O(1) future removal.
    /// @notice INTERNAL ONLY. Callers (createVault, recordOwnershipTransfer)
    ///         must not push to `_vaults` directly — doing so bypasses
    ///         _vaultIndex and will corrupt bookkeeping, causing
    ///         _removeVault to silently no-op for that entry later.
    /// @param  owner_ Address the vault should be attributed to.
    /// @param  vault  Vault address being added.
    function _addVault(address owner_, address vault) internal {
        _vaults[owner_].push(vault);
        _vaultIndex[owner_][vault] = _vaults[owner_].length; // store index+1
    }

    /// @dev Removes `vault` from `_vaults[owner_]` in O(1) via swap-and-pop,
    ///      using _vaultIndex to locate it instead of scanning the array.
    ///      This is what makes vault removal safe even if `_vaults[owner_]`
    ///      has been inflated by spam — cost is independent of array length.
    /// @notice INTERNAL ONLY. If `vault` is not tracked under `owner_`
    ///         (idxPlusOne == 0 — e.g. stale/mismatched owner passed in),
    ///         this returns silently without reverting. That's a deliberate
    ///         tolerance choice, not a guarantee of correctness — a caller
    ///         passing the wrong `owner_` will not get an error signal here.
    /// @param  owner_ Address the vault is currently attributed to.
    /// @param  vault  Vault address being removed.
    function _removeVault(address owner_, address vault) internal {
        uint256 idxPlusOne = _vaultIndex[owner_][vault];
        if (idxPlusOne == 0) return; // not present, nothing to do
        uint256 idx = idxPlusOne - 1;
        address[] storage list = _vaults[owner_];
        uint256 lastIdx = list.length - 1;
        if (idx != lastIdx) {
            address lastVault = list[lastIdx];
            list[idx] = lastVault;
            _vaultIndex[owner_][lastVault] = idx + 1;
        }
        list.pop();
        delete _vaultIndex[owner_][vault];
    }


    // ── Called by vault on ownership transfer ───────────────────

    /// @notice Updates factory-level bookkeeping when a vault's ownership
    ///         changes, moving the vault from `oldOwner`'s list to `newOwner`'s.
    /// @dev    Callable only by a genuine vault contract reporting its own
    ///         transfer (see the two require checks) — this prevents an
    ///         arbitrary address from forging ownership-transfer records.
    ///         Both the removal and addition are O(1); this function's cost
    ///         does NOT scale with the size of either owner's existing vault
    ///         list, so it cannot be used to grief a victim's future transfers
    ///         (unlike a naive scan-based implementation would allow).
    /// @param  oldOwner Previous owner of `vault`, per the vault's own state.
    /// @param  newOwner New owner of `vault`, per the vault's own state.
    /// @param  vault    The vault contract reporting the transfer; must equal
    ///                  msg.sender and must be a factory-deployed vault.
    function recordOwnershipTransfer(address oldOwner, address newOwner, address vault) external {
        address payable vaultPay = payable(vault);
        require(_isVault[msg.sender], "not a vault");
        require(msg.sender == vault, "sender/vault mismatch");
        _removeVault(oldOwner, vault);   // O(1) now
        _addVault(newOwner, vault);       // O(1), and tracks index for future removal
        uint256 AmountWeOWE = queryFeeForVaultMetric(vaultPay);
	IERC20(BZEROX_ADDRESS).transferFrom(oldOwner,vault,AmountWeOWE);
	emit VaultOwnershipTransfered(vault, oldOwner, newOwner);
    }


    // ── Called by vault on ownership transfer ───────────────────

    /// @notice Finalizes a vault's permanent destruction by moving its factory
    ///         bookkeeping from `oldOwner` to the fixed B0x Proof-of-Work burn
    ///         address. This is a one-way, irreversible transfer — the resulting
    ///         vault owner has no known private key.
    /// @dev    Callable only by a genuine vault contract reporting its own
    ///         destruction (mirrors the access checks in recordOwnershipTransfer):
    ///         msg.sender must be a factory-deployed vault, and must equal
    ///         `vault`. Additionally requires `newOwner == Proof_OF_Work_B0x`,
    ///         so this entry point can only ever route to the designated burn
    ///         address, never an arbitrary destination. Removal from
    ///         `_vaults[oldOwner]` and addition to `_vaults[newOwner]` are both
    ///         O(1) via _removeVault/_addVault. Unlike recordOwnershipTransfer,
    ///         this does NOT call queryFeeForVaultMetric or pull any BZRX debt from
    ///         oldOwner — the calling vault (DESTROY_VAULT_FOREVER) is
    ///         responsible for verifying the vault is sufficiently debt-free
    ///         and empty of staked NFTs before invoking this function. If that
    ///         precondition is not enforced on the vault side, assets or debt
    ///         obligations may be left unresolved once ownership is burned.
    /// @param  oldOwner Current owner of `vault`, per the vault's own state.
    /// @param  newOwner Destination address; must equal Proof_OF_Work_B0x or
    ///                   this call reverts.
    /// @param  vault    The vault contract reporting its own destruction; must
    ///                   equal msg.sender and must be a factory-deployed vault.
    function DestroyOwnership_TransferToDEADEND(address oldOwner, address newOwner, address vault) external {
        require(_isVault[msg.sender], "not a vault");
        require(msg.sender == vault, "sender/vault mismatch");
        require(newOwner == Proof_OF_Work_B0x, "Must be the proof of work address for destroying ownership");
        _removeVault(oldOwner, vault);   // O(1) now
    }




    /// @notice Batch-withdraws NFTs and withdraws B0xGuess if penalty is 0 claims/withdraws ERC20 rewards from multiple vaults in a single call
    /// @dev Iterates over each vault and calls withdraw_Multiple_NFTs_And_ERC20s with the corresponding token IDs
    ///      and ERC20 list. Each call is wrapped in a try/catch so a failure in one vault (e.g. reverting, not
    ///      being a valid IVault, or the caller not being authorized on that vault) does not block processing of
    ///      the remaining vaults. The three input arrays must be the same length and are matched by index.
    /// @param contractsToWithdrawFrom Array of vault contract addresses to withdraw from
    /// @param tokenIds Array of arrays of NFT token IDs to withdraw, indexed to match contractsToWithdrawFrom
    /// @param ERC20sToGetRewardAndWithdraw Array of arrays of ERC20 token addresses to claim rewards for and
    ///        withdraw, indexed to match contractsToWithdrawFrom
    /// @param maxPenaltyOnB0xGuess to accept loss of in withdrawal incase of bets in action. See B0xGuessPenalty() in a vault for current penalty
    function SuperWithdrawer(
        address[] calldata contractsToWithdrawFrom,
        uint256[][] calldata tokenIds,
        IERC20[][] calldata ERC20sToGetRewardAndWithdraw,
        uint256 maxPenaltyOnB0xGuess
    ) external {
        require(
            contractsToWithdrawFrom.length == tokenIds.length &&
                contractsToWithdrawFrom.length == ERC20sToGetRewardAndWithdraw.length,
            "array length mismatch"
        );
        for (uint256 x = 0; x < contractsToWithdrawFrom.length; x++) {
            address vaultAddr = contractsToWithdrawFrom[x];
            uint256[] calldata vaultTokenIds = tokenIds[x];
            IERC20[] calldata vaultERC20s = ERC20sToGetRewardAndWithdraw[x];
            
            try IVault(vaultAddr).owner() returns (address ownerOfVault) {
                if (ownerOfVault != msg.sender) {
                    try IVault(vaultAddr).withdraw_Multiple_NFTs_And_ERC20s(vaultTokenIds, vaultERC20s) {
                    // success
                    } catch {
                        continue;
                    }
                    continue;
                }
            
                try IVault(vaultAddr).withdraw_Multiple_NFTs_And_ERC20s_OWNERONLY(vaultTokenIds, vaultERC20s, maxPenaltyOnB0xGuess) {
                     // success
                } catch {
                    continue;
                }
            } catch {
                continue;
            }
        }
        
    }
    
    
    /// @notice Permanently destroys multiple vaults owned by the caller in a single call
    /// @dev Iterates over each vault, checks that msg.sender is the vault's owner via a try/catch owner() call
    ///      (skipping the vault if the call fails or the sender isn't the owner), then attempts
    ///      DESTROY_VAULT_FOREVER() in a nested try/catch (skipping if destruction fails, e.g. an unlock
    ///      condition isn't satisfied). A failure on any single vault does not revert the whole batch or block
    ///      processing of the remaining vaults.
    /// @param contractsToDestroy Array of vault contract addresses to attempt to destroy
    function SuperDestroyer(address[] calldata contractsToDestroy) external {
        for (uint256 x = 0; x < contractsToDestroy.length; x++) {
            address vaultAddr = contractsToDestroy[x];
            try IVault(vaultAddr).owner() returns (address ownerOfVault) {
                if (ownerOfVault != msg.sender) {
                    continue;
                }
                try IVault(vaultAddr).DESTROY_VAULT_FOREVER() {
                    // success, continue loop
                } catch {
                    // destroy failed (e.g. afterUnlock not satisfied) — skip
                }
            } catch {
                // owner() call failed (e.g. not a valid IVault) — skip
            }
        }
    }
    
    
    /// @notice Iterates over a list of vault contracts owned by the caller, claims B0x rewards, 
    ///         and stakes a capped amount of B0x into each vault via SuperGuess staking.
    /// @dev For each address in `contractsToDestroy`, verifies caller is the vault's owner before acting.
    ///      Calls are wrapped in try/catch so a failure on one vault (ownership check, reward claim, 
    ///      or staking call) does not revert the entire batch — it simply skips to the next vault.
    ///      Reward claiming failures are silently ignored (no continue), but staking failures trigger 
    ///      a `continue` to the next iteration. The B0x balance staked per vault is capped at 
    ///      `maxDepositOfB0xPerVault` to limit exposure/risk per vault.
    /// @param contractsInvestBoxInGuess Array of vault contract addresses to process.  checked for ownership, reward-claimed, and staked into.
    /// @param maxDepositOfB0xPerVault Maximum amount of B0x token (in wei/base units) that will be 
    ///        staked into any single vault, even if the vault's actual B0x balance is higher.
    function SuperGuessDepositor( address[] calldata contractsInvestBoxInGuess, uint maxDepositOfB0xPerVault) external {
    
        for (uint256 x = 0; x < contractsInvestBoxInGuess.length; x++) {
            address vaultAddr = contractsInvestBoxInGuess[x];
            try IVault(vaultAddr).owner() returns (address ownerOfVault) {
                if (ownerOfVault != msg.sender) {
                    continue;
                }
                IERC20[] memory b0x12 = new IERC20[](1);
                b0x12[0] = IERC20(BZEROX_ADDRESS);
                try IVault(vaultAddr).getRewardForTokensContract(b0x12){
                
                } catch {
                }
                uint bal = IERC20(BZEROX_ADDRESS).balanceOf(vaultAddr);
                if(bal > maxDepositOfB0xPerVault){
    	   	    bal = maxDepositOfB0xPerVault;
                }
                try IVault(vaultAddr).stakeVaultB0xGuess(bal) {
                
                } catch {
                    continue;
                }
                
            } catch {
                continue;
	    }
        }
    }
    

    // ── External ───────────────────────────────────────────────

    /// @notice Deploy a new TimeLockVault for the caller.
    /// @dev    Anyone may call this with an arbitrarily near-future unlockTime,
    ///         making vault creation cheap. Combined with transferOwnership,
    ///         this is the entry point for the spam pattern _vaultIndex/
    ///         MAX_PAGE_SIZE are designed to make harmless — creation itself
    ///         is not rate-limited or fee-gated here.
    /// @param  unlockTime Unix timestamp (must be in the future) when funds unlock.
    /// @return vault      Address of the newly deployed vault.
    function createVault(uint256 unlockTime) external returns (address vault) {
        require(unlockTime > block.timestamp, "unlock must be future");
        TimeLockVault newVault = new TimeLockVault(msg.sender, unlockTime, address(this));
        vault = address(newVault);
        _isVault[vault] = true; // register it
        _addVault(msg.sender, vault);
        emit VaultOwnershipTransfered(vault, 0x0000000000000000000000000000000000000000, msg.sender);
    }



    // ── View helpers ───────────────────────────────────────────
    
    /// @notice Computes a per-position vault metric combining staking liquidity ratio and B0x balance
    /// @dev Pulls totals from the external staking contract, computes (liquidityInStaking / stakingBalanceOfVault) * totalB0xStaked,
    ///      adds the vault's raw B0x token balance, then divides by the vault's position count.
    ///      Falls back to positionCount = 1 if zero, and skips the staking ratio term if stakingBalanceOfVault is zero.
    function queryFeeForVaultMetric(address payable vault) public view returns (uint256) {
        (uint128 liquidityInStaking, , uint256 totalB0xStaked) = ILPPool(LP_POOLz).getContractTotals();
        uint256 stakingBalanceOfVault = ILPPool(LP_POOLz).balanceOf(vault);
        uint256 b0xBalanceOfVault = IERC20(BZEROX_ADDRESS).balanceOf(vault);
        uint256 b0xBalanceOfGuess = IStakingGuess(B0xGuess).currentB0x(vault);
        uint256 positionCount = ILPPool(LP_POOLz).userPositionCount(vault);
        if (positionCount == 0) {
            positionCount = 1;
        }
        uint stakedTokenCountz = TimeLockVault(vault).stakedTokenCount();
        if(stakedTokenCountz == 0){
            stakedTokenCountz = 1;
	}
       if(positionCount > 3*stakedTokenCountz){
            positionCount = 3*stakedTokenCountz;
	}else if(positionCount > 2*stakedTokenCountz){
            positionCount = 2*stakedTokenCountz;
	}	
        uint256 AmountWeOWE= AmountWeOWE_PER_POSITION2 * positionCount; //100 tokens of B0x * Positions
        
        
        uint256 result;
        
        if (stakingBalanceOfVault != 0) {
            uint finali = MulDiv.mulDiv(uint256(stakingBalanceOfVault),totalB0xStaked, liquidityInStaking);
            /*
            uint256 numerator = uint256(stakingBalanceOfVault) * totalB0xStaked;
            result = (numerator / liquidityInStaking) + b0xBalanceOfVault;
		*/
            result = finali + b0xBalanceOfVault + b0xBalanceOfGuess;
            result = AmountWeOWE > result ? AmountWeOWE - result : 0;
        } else {
            result = b0xBalanceOfVault + b0xBalanceOfGuess;
            result = AmountWeOWE > result ? AmountWeOWE - result : 0;
        }
        return result;
    }
    

    /// @notice Returns a paginated slice of vault addresses attributed to `user`.
    /// @dev    Always paginate rather than assume `_vaults[user]` is small —
    ///         its length is attacker-influenceable (see _vaults, _addVault).
    ///         `count` is silently clamped to MAX_PAGE_SIZE, so on-chain
    ///         integrators cannot request an unbounded slice and reintroduce
    ///         an O(n) read-based griefing cost. Declaring `all` as a storage
    ///         pointer is O(1) regardless of array length; only the loop over
    ///         [start, end) costs gas, bounded by the clamped `count`.
    /// @param  user  Address whose vault list is being read.
    /// @param  start Index to begin reading from (0-based).
    /// @param  count Requested number of entries; clamped to MAX_PAGE_SIZE
    ///               and further clamped to not read past the array end.
    /// @return result Up to `count` vault addresses starting at `start`. 
    function getVaults(address user, uint256 start, uint256 count) external view returns (address[] memory result) {
        if (count > MAX_PAGE_SIZE) count = MAX_PAGE_SIZE;
        address[] storage all = _vaults[user];
        uint256 len = all.length;
        if (start >= len) return new address[](0);
        uint256 end = start + count;
        if (end > len) end = len;
        result = new address[](end - start);
        for (uint256 i = start; i < end; ++i) {
            result[i - start] = all[i];   // ✅ write position is relative to `result`, read position is absolute into `all`
        }
    }

	
    /// @notice Paginated vault addresses + each vault's B0x-denominated share of staking.
    /// @dev    amount[i] = mulDiv(balanceOf(vault[i]), totalB0xStaked, liquidityInStaking)
    function getVaultsB0xShares(address user, uint256 start, uint256 count)
        external
        view
        returns (address[] memory vaults, uint256[] memory amounts)
    {
        if (count > MAX_PAGE_SIZE) count = MAX_PAGE_SIZE;
        address[] storage all = _vaults[user];
        uint256 len = all.length;
        if (start >= len) return (new address[](0), new uint256[](0));
        uint256 end = start + count;
        if (end > len) end = len;

        uint256 n = end - start;
        vaults = new address[](n);
        amounts = new uint256[](n);

        (uint128 liquidityInStaking, , uint256 totalB0xStaked) = ILPPool(LP_POOLz).getContractTotals();

        for (uint256 i = start; i < end; ++i) {
            address v = all[i];
            vaults[i - start] = v;
            if (liquidityInStaking == 0) {
                amounts[i - start] = 0; // avoid div-by-zero in mulDiv
                continue;
            }
            uint256 bal = ILPPool(LP_POOLz).balanceOf(v);
            amounts[i - start] = MulDiv.mulDiv(bal, totalB0xStaked, liquidityInStaking);
        }
    }
    

    /// @notice Paginated vault addresses + each vault's 0xBTC-denominated share of staking.
    /// @dev    amount[i] = mulDiv(balanceOf(vault[i]), total0xBTCStaked, liquidityInStaking)
    function getVaultsBTCShares(address user, uint256 start, uint256 count)
        external
        view
        returns (address[] memory vaults, uint256[] memory amounts)
    {
        if (count > MAX_PAGE_SIZE) count = MAX_PAGE_SIZE;
        address[] storage all = _vaults[user];
        uint256 len = all.length;
        if (start >= len) return (new address[](0), new uint256[](0));
        uint256 end = start + count;
        if (end > len) end = len;

        uint256 n = end - start;
        vaults = new address[](n);
        amounts = new uint256[](n);

        (uint128 liquidityInStaking, uint256 total0xBTCStaked, ) = ILPPool(LP_POOLz).getContractTotals();

        for (uint256 i = start; i < end; ++i) {
            address v = all[i];
            vaults[i - start] = v;
            if (liquidityInStaking == 0) {
                amounts[i - start] = 0;
                continue;
            }
            uint256 bal = ILPPool(LP_POOLz).balanceOf(v);
            amounts[i - start] = MulDiv.mulDiv(bal, total0xBTCStaked, liquidityInStaking);
        }
    }
    

    /// @notice Returns the number of vault addresses ever attributed to `user`.
    /// @dev    O(1) — reads only the array's length slot, not its contents.
    ///         Use this to compute pagination bounds for getVaults rather than
    ///         guessing a `count` or trying to read everything in one call.
    function getVaultCount(address user) public view returns (uint256) {
        return _vaults[user].length;
    }
    
    


}

