// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SavingsVault
 * @notice Core vault contract that holds user deposits and manages savings goals
 * @dev Users deposit USDC, set goals, and funds are later routed to yield strategies
 */
contract SavingsVault is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          STRUCTS
    // =============================================================

    /// @notice User's savings configuration and balance
    struct UserAccount {
        uint256 totalDeposited; // Total USDC deposited by user
        uint256 totalWithdrawn; // Total USDC withdrawn by user
        uint256 currentBalance; // Current balance in vault + yield strategy
        uint256 weeklyGoal; // Target savings per week (in USDC, 6 decimals)
        uint256 safetyBuffer; // Minimum balance to maintain in wallet
        uint256 lastSaveTimestamp; // Last time AI triggered a save
        bool isActive; // Whether user account is active
        TrustMode trustMode; // Manual approval or auto-pilot
    }

    /// @notice Trust mode for AI automation
    enum TrustMode {
        MANUAL, // AI suggests, user approves each save
        AUTO // AI executes automatically
    }

    // =============================================================
    //                       STATE VARIABLES
    // =============================================================

    /// @notice USDC token (we'll use Cronos testnet USDC)
    IERC20 public immutable usdc;
    error SavingsVault__ZeroAddress();

    // =============================================================
    //                        CONSTRUCTOR
    // =============================================================

    /// @notice Initialize the vault with USDC address
    /// @param _usdc Address of USDC token on Cronos
    constructor(address _usdc) Ownable(msg.sender) {
        if (_usdc == address(0)) revert SavingsVault__ZeroAddress();
        usdc = IERC20(_usdc);
    }
}
