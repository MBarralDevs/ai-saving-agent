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

    /// @notice Yield strategy contract (will be set after deployment)
    address public yieldStrategy;

    /// @notice x402 executor contract (authorized to trigger auto-saves)
    address public x402Executor;

    /// @notice Mapping of user address to their account
    mapping(address => UserAccount) public accounts;

    /// @notice Total value locked in the vault (excludes funds in yield strategy)
    uint256 public totalValueLocked;

    /// @notice Minimum deposit amount (prevents dust attacks)
    uint256 public constant MIN_DEPOSIT = 1e6; // 1 USDC

    /// @notice Maximum single save amount (security limit)
    uint256 public constant MAX_SAVE_AMOUNT = 10000e6; // 10,000 USDC

    /// @notice Minimum time between auto-saves per user (rate limiting)
    uint256 public constant MIN_SAVE_INTERVAL = 1 days;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event AccountCreated(address indexed user, uint256 weeklyGoal, uint256 safetyBuffer, TrustMode trustMode);

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);

    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance);

    event AutoSaveExecuted(address indexed user, uint256 amount, address triggeredBy);

    event GoalUpdated(address indexed user, uint256 newWeeklyGoal);

    event TrustModeUpdated(address indexed user, TrustMode newMode);

    event YieldStrategyUpdated(address indexed oldStrategy, address indexed newStrategy);

    event X402ExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);

    // =============================================================
    //                          ERRORS
    // =============================================================

    error SavingsVault__InvalidAmount();
    error SavingsVault__InsufficientBalance();
    error SavingsVault__AccountNotActive();
    error SavingsVault__UnauthorizedCaller();
    error SavingsVault__SaveIntervalNotMet();
    error SavingsVault__AmountExceedsLimit();
    error SavingsVault__ZeroAddress();
    error SavingsVault__GoalNotPositive();
    error SavingsVault__AccountAlreadyExists();
    error SavingsVault__EnforcedPause();

    // =============================================================
    //                        CONSTRUCTOR
    // =============================================================

    /// @notice Initialize the vault with USDC address
    /// @param _usdc Address of USDC token on Cronos
    constructor(address _usdc) Ownable(msg.sender) {
        if (_usdc == address(0)) revert SavingsVault__ZeroAddress();
        usdc = IERC20(_usdc);
    }

    // =============================================================
    //                     USER FUNCTIONS
    // =============================================================

    /**
     * @notice Create a new user account with savings goals
     * @param weeklyGoal Target amount to save per week (6 decimals)
     * @param safetyBuffer Minimum balance to keep in wallet (6 decimals)
     * @param trustMode Whether AI needs manual approval or can auto-execute
     */

    function createAccount(uint256 weeklyGoal, uint256 safetyBuffer, TrustMode trustMode) external {
        if (accounts[msg.sender].isActive) revert SavingsVault__AccountAlreadyExists();
        if (weeklyGoal <= 0) revert SavingsVault__GoalNotPositive();

        accounts[msg.sender] = UserAccount({
            totalDeposited: 0,
            totalWithdrawn: 0,
            currentBalance: 0,
            weeklyGoal: weeklyGoal,
            safetyBuffer: safetyBuffer,
            lastSaveTimestamp: 0,
            isActive: true,
            trustMode: trustMode
        });

        emit AccountCreated(msg.sender, weeklyGoal, safetyBuffer, trustMode);
    }

    /**
     * @notice Deposit USDC into the vault
     * @param amount Amount of USDC to deposit (6 decimals)
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount < MIN_DEPOSIT) revert SavingsVault__InvalidAmount();
        if (!accounts[msg.sender].isActive) revert SavingsVault__AccountNotActive();

        // Transfer USDC from user to vault
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update user account
        accounts[msg.sender].totalDeposited += amount;
        accounts[msg.sender].currentBalance += amount;
        totalValueLocked += amount;

        emit Deposited(msg.sender, amount, accounts[msg.sender].currentBalance);
    }

    /**
     * @notice Withdraw USDC from the vault
     * @param amount Amount of USDC to withdraw (6 decimals)
     * @dev For hackathon v1, we withdraw only from vault (not yield strategy yet)
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert SavingsVault__InvalidAmount();
        if (!accounts[msg.sender].isActive) revert SavingsVault__AccountNotActive();
        if (accounts[msg.sender].currentBalance < amount) revert SavingsVault__InsufficientBalance();

        // Update user account
        accounts[msg.sender].totalWithdrawn += amount;
        accounts[msg.sender].currentBalance -= amount;
        totalValueLocked -= amount;

        // Transfer USDC to user
        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, accounts[msg.sender].currentBalance);
    }
}
