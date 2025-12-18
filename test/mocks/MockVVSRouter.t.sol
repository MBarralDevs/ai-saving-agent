// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockVVSRouter {
    address public usdc;
    address public usdt;

    constructor(address _usdc, address _usdt) {
        usdc = _usdc;
        usdt = _usdt;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256,
        uint256,
        address to,
        uint256
    ) external returns (uint256, uint256, uint256) {
        // Transfer tokens from sender
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountADesired);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountBDesired);

        // Return mock liquidity tokens (sum of both amounts for simplicity)
        uint256 liquidity = amountADesired + amountBDesired;

        return (amountADesired, amountBDesired, liquidity);
    }

    function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256, uint256, address to, uint256)
        external
        returns (uint256, uint256)
    {
        // Return half liquidity as each token
        uint256 amountA = liquidity / 2;
        uint256 amountB = liquidity / 2;

        IERC20(tokenA).transfer(to, amountA);
        IERC20(tokenB).transfer(to, amountB);

        return (amountA, amountB);
    }

    function swapExactTokensForTokens(uint256 amountIn, uint256, address[] calldata path, address to, uint256)
        external
        returns (uint256[] memory amounts)
    {
        // Simple 1:1 swap for testing
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[1]).transfer(to, amountIn);

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn;

        return amounts;
    }
}
