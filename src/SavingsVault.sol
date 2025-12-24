// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Interface for VVSYieldStrategy
interface IVVSYieldStrategy {
    function deposit(address user, uint256 amount) external returns (uint256 liquidityTokens);
    function withdraw(address user, uint256 liquidityTokens) external returns (uint256 usdcAmount);
    function getUserValue(address user) external view returns (uint256 usdcValue);
    function userLiquidityTokens(address user) external view returns (uint256);
}

/**
 * @title SavingsVault
 * @notice Core vault contract that holds user deposits and manages savings goals
 * @dev Users deposit USDC, set goals, and funds are routed to yield strategies
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
    //                    IMMUTABLE VARIABLES
    // =============================================================

    /// @notice USDC token
    IERC20 public immutable i_USDC;

    // =============================================================
    //                       STATE VARIABLES
    // =============================================================

    /// @notice Yield strategy contract
    IVVSYieldStrategy public s_yieldStrategy;

    /// @notice Backend server address (authorized to call depositFor after x402 payment)
    address public s_backendServer;

    /// @notice Mapping of user address to their account
    mapping(address => UserAccount) public s_accounts;

    /// @notice Total value locked in vault only (excludes funds in yield strategy)
    uint256 public s_totalValueLocked;

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
    event DepositedToYield(address indexed user, uint256 amount, uint256 liquidityTokens);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance);
    event WithdrawnFromYield(address indexed user, uint256 liquidityTokens, uint256 usdcAmount);
    event AutoSaveExecuted(address indexed user, uint256 amount, address triggeredBy);
    event GoalUpdated(address indexed user, uint256 newWeeklyGoal);
    event TrustModeUpdated(address indexed user, TrustMode newMode);
    event YieldStrategyUpdated(address indexed oldStrategy, address indexed newStrategy);
    event BackendServerUpdated(address indexed oldServer, address indexed newServer);

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

    // =============================================================
    //                        CONSTRUCTOR
    // =============================================================

    /// @notice Initialize the vault with USDC address
    /// @param _usdc Address of USDC token on Cronos
    constructor(address _usdc) Ownable(msg.sender) {
        if (_usdc == address(0)) revert SavingsVault__ZeroAddress();
        i_USDC = IERC20(_usdc);
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
        if (s_accounts[msg.sender].isActive) revert SavingsVault__AccountAlreadyExists();
        if (weeklyGoal == 0) revert SavingsVault__GoalNotPositive();

        s_accounts[msg.sender] = UserAccount({
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
     * @notice Deposit USDC into the vault and route to yield strategy
     * @param amount Amount of USDC to deposit (6 decimals)
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount < MIN_DEPOSIT) revert SavingsVault__InvalidAmount();
        if (!s_accounts[msg.sender].isActive) revert SavingsVault__AccountNotActive();

        // Transfer USDC from user to vault
        i_USDC.safeTransferFrom(msg.sender, address(this), amount);

        // Update user account
        s_accounts[msg.sender].totalDeposited += amount;
        s_accounts[msg.sender].currentBalance += amount;
        s_totalValueLocked += amount;

        emit Deposited(msg.sender, amount, s_accounts[msg.sender].currentBalance);

        // Route to yield strategy if set
        if (address(s_yieldStrategy) != address(0)) {
            _depositToYield(msg.sender, amount);
        }
    }

    /**
     * @notice Deposit USDC on behalf of a user (called by backend after x402 payment verification)
     * @param user User address to credit
     * @param amount Amount of USDC to deposit
     * @dev Only callable by authorized backend server
     * @dev USDC should already be in vault (transferred via EIP-3009)
     */
    function depositFor(address user, uint256 amount) external nonReentrant whenNotPaused {
        if (msg.sender != s_backendServer) revert SavingsVault__UnauthorizedCaller();
        if (amount < MIN_DEPOSIT) revert SavingsVault__InvalidAmount();
        if (!s_accounts[user].isActive) revert SavingsVault__AccountNotActive();

        // USDC should already be in vault (transferred via x402/EIP-3009)
        // Just update accounting

        s_accounts[user].totalDeposited += amount;
        s_accounts[user].currentBalance += amount;
        s_totalValueLocked += amount;

        emit Deposited(user, amount, s_accounts[user].currentBalance);

        // Route to yield strategy if set
        if (address(s_yieldStrategy) != address(0)) {
            _depositToYield(user, amount);
        }
    }

    /**
     * @notice Execute an auto-save with rate limiting and trust mode checks
     * @param user Address of user to save for
     * @param amount Amount to save
     * @dev Can be called by:
     *      - Backend server (after x402 payment) in AUTO mode
     *      - User themselves in MANUAL mode (after frontend approval)
     */
    function autoSave(address user, uint256 amount) external nonReentrant whenNotPaused {
        UserAccount storage account = s_accounts[user];

        if (!account.isActive) revert SavingsVault__AccountNotActive();
        if (amount == 0 || amount > MAX_SAVE_AMOUNT) revert SavingsVault__AmountExceedsLimit();

        // Authorization check based on trust mode
        if (account.trustMode == TrustMode.AUTO) {
            // Only backend server can trigger in AUTO mode
            if (msg.sender != s_backendServer) revert SavingsVault__UnauthorizedCaller();
        } else {
            // In MANUAL mode, only user can trigger (after approving in frontend)
            if (msg.sender != user) revert SavingsVault__UnauthorizedCaller();
        }

        // Rate limiting: prevent saves more frequent than MIN_SAVE_INTERVAL
        // Skip check if this is the first save (lastSaveTimestamp == 0)
        if (account.lastSaveTimestamp != 0 && block.timestamp < account.lastSaveTimestamp + MIN_SAVE_INTERVAL) {
            revert SavingsVault__SaveIntervalNotMet();
        }

        // Transfer USDC from user's wallet to vault
        i_USDC.safeTransferFrom(user, address(this), amount);

        // Update account
        account.totalDeposited += amount;
        account.currentBalance += amount;
        account.lastSaveTimestamp = block.timestamp;
        s_totalValueLocked += amount;

        emit AutoSaveExecuted(user, amount, msg.sender);

        // Route to yield strategy if set
        if (address(s_yieldStrategy) != address(0)) {
            _depositToYield(user, amount);
        }
    }

    /**
     * @notice Withdraw USDC from the vault (and yield strategy if needed)
     * @param amount Amount of USDC to withdraw (6 decimals)
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert SavingsVault__InvalidAmount();
        if (!s_accounts[msg.sender].isActive) revert SavingsVault__AccountNotActive();
        if (s_accounts[msg.sender].currentBalance < amount) revert SavingsVault__InsufficientBalance();

        // Check vault balance first
        uint256 vaultBalance = i_USDC.balanceOf(address(this));

        // If vault doesn't have enough, withdraw from yield strategy
        if (vaultBalance < amount && address(s_yieldStrategy) != address(0)) {
            uint256 needed = amount - vaultBalance;
            _withdrawFromYield(msg.sender, needed);
        }

        // Update user account
        s_accounts[msg.sender].totalWithdrawn += amount;
        s_accounts[msg.sender].currentBalance -= amount;
        s_totalValueLocked -= amount;

        // Transfer USDC to user
        i_USDC.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, s_accounts[msg.sender].currentBalance);
    }

    /**
     * @notice Update weekly savings goal
     * @param newWeeklyGoal New target amount per week
     */
    function updateGoal(uint256 newWeeklyGoal) external {
        if (!s_accounts[msg.sender].isActive) revert SavingsVault__AccountNotActive();
        if (newWeeklyGoal == 0) revert SavingsVault__GoalNotPositive();

        s_accounts[msg.sender].weeklyGoal = newWeeklyGoal;
        emit GoalUpdated(msg.sender, newWeeklyGoal);
    }

    /**
     * @notice Update trust mode (manual vs auto)
     * @param newMode New trust mode
     */
    function updateTrustMode(TrustMode newMode) external {
        if (!s_accounts[msg.sender].isActive) revert SavingsVault__AccountNotActive();

        s_accounts[msg.sender].trustMode = newMode;
        emit TrustModeUpdated(msg.sender, newMode);
    }

    // =============================================================
    //                   INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @notice Deposit funds to yield strategy
     * @param user User address
     * @param amount USDC amount to deposit
     */
    function _depositToYield(address user, uint256 amount) internal {
        // Approve yield strategy to spend USDC
        i_USDC.approve(address(s_yieldStrategy), amount);

        // Deposit to yield strategy
        uint256 liquidityTokens = s_yieldStrategy.deposit(user, amount);

        emit DepositedToYield(user, amount, liquidityTokens);
    }

    /**
     * @notice Withdraw funds from yield strategy
     * @param user User address
     * @param usdcNeeded USDC amount needed
     * @return usdcReceived Actual USDC received
     */
    function _withdrawFromYield(address user, uint256 usdcNeeded) internal returns (uint256 usdcReceived) {
        // Get user's LP tokens in strategy
        uint256 userLpTokens = s_yieldStrategy.userLiquidityTokens(user);
        if (userLpTokens == 0) return 0;

        // Get user's total value in strategy
        uint256 userValueInStrategy = s_yieldStrategy.getUserValue(user);

        // Calculate how many LP tokens to withdraw
        uint256 lpToWithdraw;
        if (usdcNeeded >= userValueInStrategy) {
            // Withdraw everything
            lpToWithdraw = userLpTokens;
        } else {
            // Withdraw proportionally
            lpToWithdraw = (userLpTokens * usdcNeeded) / userValueInStrategy;
        }

        // Withdraw from strategy
        usdcReceived = s_yieldStrategy.withdraw(user, lpToWithdraw);

        emit WithdrawnFromYield(user, lpToWithdraw, usdcReceived);

        return usdcReceived;
    }

    // =============================================================
    //                     VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get user account details
     * @param user Address of user
     * @return User's account struct
     */
    function getAccount(address user) external view returns (UserAccount memory) {
        return s_accounts[user];
    }

    /**
     * @notice Get user's total balance including yield
     * @param user Address of user
     * @return Total balance (vault + yield strategy)
     */
    function getUserTotalBalance(address user) external view returns (uint256) {
        uint256 accountBalance = s_accounts[user].currentBalance;

        // Add value from yield strategy if it exists
        if (address(s_yieldStrategy) != address(0)) {
            uint256 yieldValue = s_yieldStrategy.getUserValue(user);
            return yieldValue;
        }

        return accountBalance;
    }

    /**
     * @notice Check if user can be auto-saved (passed rate limit)
     * @param user Address of user
     * @return bool Whether save is allowed
     */
    function canAutoSave(address user) external view returns (bool) {
        UserAccount memory account = s_accounts[user];
        if (!account.isActive) return false;
        if (account.lastSaveTimestamp == 0) return true; // First save always allowed
        return block.timestamp >= account.lastSaveTimestamp + MIN_SAVE_INTERVAL;
    }

    /**
     * @notice Get total value locked
     * @return Total USDC in vault
     */
    function totalValueLocked() external view returns (uint256) {
        return s_totalValueLocked;
    }

    /**
     * @notice Get yield strategy address
     * @return Yield strategy contract address
     */
    function yieldStrategy() external view returns (address) {
        return address(s_yieldStrategy);
    }

    /**
     * @notice Get backend server address
     * @return Backend server address
     */
    function backendServer() external view returns (address) {
        return s_backendServer;
    }

    // =============================================================
    //                     ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Set the yield strategy contract address
     * @param _yieldStrategy Address of VVSYieldStrategy contract
     * @dev Only owner (deployer) can call. Used after deploying yield strategy.
     */
    function setYieldStrategy(address _yieldStrategy) external onlyOwner {
        if (_yieldStrategy == address(0)) revert SavingsVault__ZeroAddress();
        address oldStrategy = address(s_yieldStrategy);
        s_yieldStrategy = IVVSYieldStrategy(_yieldStrategy);
        emit YieldStrategyUpdated(oldStrategy, _yieldStrategy);
    }

    /**
     * @notice Set the backend server address
     * @param _backendServer Address of backend server
     * @dev Only owner can call. This server can call depositFor and autoSave after x402 payment verification.
     */
    function setBackendServer(address _backendServer) external onlyOwner {
        if (_backendServer == address(0)) revert SavingsVault__ZeroAddress();
        address oldServer = s_backendServer;
        s_backendServer = _backendServer;
        emit BackendServerUpdated(oldServer, _backendServer);
    }

    /**
     * @notice Pause the contract (emergency stop)
     * @dev Only owner can call
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     * @dev Only owner can call
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
