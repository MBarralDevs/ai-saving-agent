// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// =============================================================
//                          INTERFACES
// =============================================================

/// @notice Uniswap V2 Router interface (VVS uses same interface)
interface IVVSRouter {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

/// @notice Uniswap V2 Pair interface
interface IVVSPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function totalSupply() external view returns (uint256);
}

/**
 * @title VVSYieldStrategy
 * @notice Manages yield generation by depositing USDC into VVS Finance liquidity pools
 * @dev Integrates with VVS Router (Uniswap V2 style) to provide liquidity and earn trading fees
 */
contract VVSYieldStrategy is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // =============================================================
    //                       STATE VARIABLES
    // =============================================================

    /// @notice VVS Router contract
    IVVSRouter public immutable vvsRouter;

    /// @notice USDC token
    IERC20 public immutable usdc;

    /// @notice USDT token (pair with USDC)
    IERC20 public immutable usdt;

    /// @notice USDC-USDT liquidity pair
    IVVSPair public immutable usdcUsdtPair;

    /// @notice SavingsVault contract (only it can deposit/withdraw)
    address public savingsVault;

    /// @notice Track liquidity tokens per user
    mapping(address => uint256) public userLiquidityTokens;

    /// @notice Total liquidity tokens managed by this strategy
    uint256 public totalLiquidityTokens;

    /// @notice Slippage tolerance (in basis points, e.g., 50 = 0.5%)
    uint256 public slippageTolerance = 50; // 0.5%

    // =============================================================
    //                          EVENTS
    // =============================================================

    event Deposited(address indexed user, uint256 usdcAmount, uint256 liquidityTokens);
    event Withdrawn(address indexed user, uint256 liquidityTokens, uint256 usdcAmount);

    // =============================================================
    //                          ERRORS
    // =============================================================

    error VVSYieldStrategy__ZeroAddress();
    error VVSYieldStrategy__OnlyVault();
    error VVSYieldStrategy__ZeroAmount();
    error VVSYieldStrategy__InsufficientLiquidity();

    // =============================================================
    //                        MODIFIERS
    // =============================================================

    modifier onlyVault() {
        if (msg.sender != savingsVault) revert VVSYieldStrategy__OnlyVault();
        _;
    }

    // =============================================================
    //                        CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the yield strategy
     * @param _vvsRouter VVS Router address
     * @param _usdc USDC token address
     * @param _usdt USDT token address
     * @param _usdcUsdtPair USDC-USDT pair address
     */
    constructor(address _vvsRouter, address _usdc, address _usdt, address _usdcUsdtPair) Ownable(msg.sender) {
        if (_vvsRouter == address(0) || _usdc == address(0) || _usdt == address(0) || _usdcUsdtPair == address(0)) {
            revert VVSYieldStrategy__ZeroAddress();
        }

        vvsRouter = IVVSRouter(_vvsRouter);
        usdc = IERC20(_usdc);
        usdt = IERC20(_usdt);
        usdcUsdtPair = IVVSPair(_usdcUsdtPair);

        // Approve router to spend tokens (set to max for gas efficiency)
        usdc.approve(_vvsRouter, type(uint256).max);
        usdt.approve(_vvsRouter, type(uint256).max);
    }

    // =============================================================
    //                     VAULT FUNCTIONS
    // =============================================================

    /**
     * @notice Deposit USDC into VVS liquidity pool to earn yield
     * @param user Address of the user
     * @param amount Amount of USDC to deposit
     * @return liquidityTokens Amount of LP tokens received
     * @dev Only callable by SavingsVault
     */
    function deposit(address user, uint256 amount) external onlyVault nonReentrant returns (uint256 liquidityTokens) {
        if (amount == 0) revert VVSYieldStrategy__ZeroAmount();

        // Transfer USDC from vault to this contract
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Split USDC 50/50 to USDC/USDT
        // We need to swap half of USDC to USDT first
        uint256 halfAmount = amount / 2;
        uint256 usdtAmount = _swapUSDCToUSDT(halfAmount);

        // Add liquidity to VVS (USDC-USDT pool)
        uint256 usdcUsed;
        uint256 usdtUsed;
        (usdcUsed, usdtUsed, liquidityTokens) = _addLiquidity(halfAmount, usdtAmount);

        // Track LP tokens for user
        userLiquidityTokens[user] += liquidityTokens;
        totalLiquidityTokens += liquidityTokens;

        emit Deposited(user, amount, liquidityTokens);

        return liquidityTokens;
    }

    /**
     * @notice Withdraw USDC from VVS liquidity pool
     * @param user Address of the user
     * @param liquidityTokens Amount of LP tokens to withdraw
     * @return usdcAmount Amount of USDC returned to vault
     * @dev Only callable by SavingsVault
     */
    function withdraw(address user, uint256 liquidityTokens)
        external
        onlyVault
        nonReentrant
        returns (uint256 usdcAmount)
    {
        if (liquidityTokens == 0) revert VVSYieldStrategy__ZeroAmount();
        if (userLiquidityTokens[user] < liquidityTokens) {
            revert VVSYieldStrategy__InsufficientLiquidity();
        }

        // Remove liquidity from VVS
        (uint256 usdcReceived, uint256 usdtReceived) = _removeLiquidity(liquidityTokens);

        // Convert all USDT back to USDC
        uint256 usdcFromSwap = _swapUSDTToUSDC(usdtReceived);

        // Total USDC to return
        usdcAmount = usdcReceived + usdcFromSwap;

        // Update tracking
        userLiquidityTokens[user] -= liquidityTokens;
        totalLiquidityTokens -= liquidityTokens;

        // Transfer USDC back to vault
        usdc.safeTransfer(msg.sender, usdcAmount);

        emit Withdrawn(user, liquidityTokens, usdcAmount);

        return usdcAmount;
    }

    // =============================================================
    //                   INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @notice Swap USDC to USDT using VVS Router
     * @param usdcAmount Amount of USDC to swap
     * @return usdtAmount Amount of USDT received
     */
    function _swapUSDCToUSDT(uint256 usdcAmount) internal returns (uint256 usdtAmount) {
        address[] memory path = new address[](2);
        path[0] = address(usdc);
        path[1] = address(usdt);

        // Calculate minimum output with slippage tolerance
        uint256 minOutput = (usdcAmount * (10000 - slippageTolerance)) / 10000;

        uint256[] memory amounts = vvsRouter.swapExactTokensForTokens(
            usdcAmount, minOutput, path, address(this), block.timestamp + 15 minutes
        );

        return amounts[1]; // USDT amount received
    }

    /**
     * @notice Swap USDT to USDC using VVS Router
     * @param usdtAmount Amount of USDT to swap
     * @return usdcAmount Amount of USDC received
     */
    function _swapUSDTToUSDC(uint256 usdtAmount) internal returns (uint256 usdcAmount) {
        address[] memory path = new address[](2);
        path[0] = address(usdt);
        path[1] = address(usdc);

        uint256 minOutput = (usdtAmount * (10000 - slippageTolerance)) / 10000;

        uint256[] memory amounts = vvsRouter.swapExactTokensForTokens(
            usdtAmount, minOutput, path, address(this), block.timestamp + 15 minutes
        );

        return amounts[1]; // USDC amount received
    }

    /**
     * @notice Add liquidity to VVS USDC-USDT pool
     * @param usdcAmount Amount of USDC
     * @param usdtAmount Amount of USDT
     * @return usdcUsed Actual USDC used
     * @return usdtUsed Actual USDT used
     * @return liquidity LP tokens received
     */
    function _addLiquidity(uint256 usdcAmount, uint256 usdtAmount)
        internal
        returns (uint256 usdcUsed, uint256 usdtUsed, uint256 liquidity)
    {
        // Calculate minimum amounts with slippage tolerance
        uint256 usdcMin = (usdcAmount * (10000 - slippageTolerance)) / 10000;
        uint256 usdtMin = (usdtAmount * (10000 - slippageTolerance)) / 10000;

        (usdcUsed, usdtUsed, liquidity) = vvsRouter.addLiquidity(
            address(usdc),
            address(usdt),
            usdcAmount,
            usdtAmount,
            usdcMin,
            usdtMin,
            address(this),
            block.timestamp + 15 minutes
        );

        return (usdcUsed, usdtUsed, liquidity);
    }

    /**
     * @notice Remove liquidity from VVS USDC-USDT pool
     * @param liquidity Amount of LP tokens to burn
     * @return usdcAmount USDC received
     * @return usdtAmount USDT received
     */
    function _removeLiquidity(uint256 liquidity) internal returns (uint256 usdcAmount, uint256 usdtAmount) {
        // Approve pair tokens to router
        IERC20(address(usdcUsdtPair)).approve(address(vvsRouter), liquidity);

        // Calculate minimum amounts (set to 0 for simplicity, can be improved)
        (usdcAmount, usdtAmount) = vvsRouter.removeLiquidity(
            address(usdc),
            address(usdt),
            liquidity,
            0, // Accept any amount (can be improved with price oracle)
            0,
            address(this),
            block.timestamp + 15 minutes
        );

        return (usdcAmount, usdtAmount);
    }
}
