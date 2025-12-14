// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VVSYieldStrategy
 * @notice Manages yield generation by depositing USDC into VVS Finance liquidity pools
 * @dev Integrates with VVS Router (Uniswap V2 style) to provide liquidity and earn trading fees
 */
contract VVSYieldStrategy is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
}
