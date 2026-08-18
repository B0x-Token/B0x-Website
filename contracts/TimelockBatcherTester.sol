// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal interface for the vault factory you already have deployed.
interface IVaultFactory {
    function createVault(uint256 unlockTime) external returns (address vault);
}

/// @notice Minimal interface for the vault contracts the factory produces.
interface IVault {
    // Only allow transfer while still locked — once unlocked the owner
    // should just withdraw, not hand it off
    function transferOwnership(address newOwner) external;
}

/**
 * @title VaultBatchCreator
 * @notice Creates a batch of vaults (each locked for 30 minutes from the
 *         moment of creation) and immediately transfers ownership of each
 *         one to a fixed target address.
 *
 * IMPORTANT ASSUMPTIONS (verify against your actual factory/vault code):
 *  1. `IVaultFactory.createVault` sets `msg.sender` (i.e. this contract)
 *     as the initial owner of the vault it creates. If ownership is set
 *     some other way, `transferOwnership` below will revert.
 *  2. `transferOwnership` is guarded by `onlyOwner` and only works while
 *     the vault is still locked, per the comment in your snippet.
 */
contract VaultBatchCreator {
    /// @notice The vault factory this contract calls into.
    address public immutable factory = 0x0D2ba9287a3E728e8f7530324106ed6299277b7A;

    /// @notice Address that will receive ownership of every vault created.
    address public constant NEW_OWNER = 0xEC50858c6a46fcbf7fEe2AC4fe8287708c038E4b;

    /// @notice Lock duration applied to every vault in the batch.
    uint256 public constant LOCK_DURATION = 30 minutes;

    /// @notice How many vaults to create per call to createAndTransferBatch().
    uint256 public BATCH_COUNT = 2;

    /// @notice All vault addresses created by this contract, in order.
    address[] public createdVaults;
    address public owner;
    event VaultCreated(uint256 indexed index, address indexed vault, uint256 unlockTime);
    event OwnershipTransferred(uint256 indexed index, address indexed vault, address indexed newOwner);

    constructor() {
        require(factory != address(0), "factory cannot be zero address");
        owner = msg.sender;
    }

    /**
     * @notice Changes BATCH_COUNT number
     */

    function changeBatch_Count(uint newBatchCount) public{

        require(msg.sender == owner,"NOT OWNER");
        BATCH_COUNT = newBatchCount;
    }

    /**
     * @notice Creates BATCH_COUNT (10) vaults, each unlocking 30 minutes
     *         from the time this function is called, and transfers
     *         ownership of each one to NEW_OWNER right after it's created.
     */

    function createAndTransferBatch() external {
        uint256 unlockTime = block.timestamp + LOCK_DURATION;

        for (uint256 i = 0; i < BATCH_COUNT; i++) {
            // 1) Create the vault
            address vault = IVaultFactory(factory).createVault(unlockTime+i);
            createdVaults.push(vault);
            emit VaultCreated(i, vault, unlockTime);

            // 2) Transfer its ownership to the target account
            IVault(vault).transferOwnership(NEW_OWNER);
            emit OwnershipTransferred(i, vault, NEW_OWNER);
        }
    }

    /// @notice Returns every vault address created by this contract so far.
    function getCreatedVaults() external view returns (address[] memory) {
        return createdVaults;
    }

    /// @notice Number of vaults created so far.
    function vaultCount() external view returns (uint256) {
        return createdVaults.length;
    }
}
