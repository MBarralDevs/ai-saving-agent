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
    //                          ERRORS
    // =============================================================

    error VVSYieldStrategy__ZeroAddress();

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
}
