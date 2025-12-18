// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {VVSYieldStrategy} from "../src/VVSYieldStrategy.sol";
import {MockUSDC} from "./mocks/MockUSDC.t.sol";
import {MockVVSRouter} from "./mocks/MockVVSRouter.t.sol";
import {MockVVSPair} from "./mocks/MockVVSPair.t.sol";

contract VVSYieldStrategyTest is Test {
    VVSYieldStrategy public strategy;
    MockUSDC public usdc;
    MockUSDC public usdt; // Reuse MockUSDC for USDT
    MockVVSRouter public vvsRouter;
    MockVVSPair public usdcUsdtPair;

    address public owner = address(this);
    address public vault = address(0x1);
    address public alice = address(0x2);

    function setUp() public {
        // Deploy mock tokens
        usdc = new MockUSDC();
        usdt = new MockUSDC(); // Same implementation, different token

        // Deploy mock VVS contracts
        vvsRouter = new MockVVSRouter(address(usdc), address(usdt));
        usdcUsdtPair = new MockVVSPair(address(usdc), address(usdt));

        // Deploy strategy
        strategy = new VVSYieldStrategy(address(vvsRouter), address(usdc), address(usdt), address(usdcUsdtPair));

        // Set vault
        strategy.setSavingsVault(vault);

        // Give vault some USDC
        usdc.mint(vault, 100000e6);

        // Give router some USDT for swaps
        usdt.mint(address(vvsRouter), 100000e6);
    }

    // =============================================================
    //                   DEPOSIT TESTS
    // =============================================================

    function testDeposit() public {
        vm.startPrank(vault);

        // Approve strategy to spend USDC
        usdc.approve(address(strategy), 1000e6);

        // Deposit
        uint256 lpTokens = strategy.deposit(alice, 1000e6);

        // Check LP tokens were received
        assertGt(lpTokens, 0);
        assertEq(strategy.userLiquidityTokens(alice), lpTokens);
        assertEq(strategy.totalLiquidityTokens(), lpTokens);

        vm.stopPrank();
    }
}
