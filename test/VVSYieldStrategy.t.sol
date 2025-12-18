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

        // Deploy mock VVS pair first
        usdcUsdtPair = new MockVVSPair(address(usdc), address(usdt));

        // Deploy mock VVS router
        vvsRouter = new MockVVSRouter(address(usdc), address(usdt));

        // Connect pair to router
        vvsRouter.setPair(address(usdcUsdtPair));

        // Deploy strategy
        strategy = new VVSYieldStrategy(address(vvsRouter), address(usdc), address(usdt), address(usdcUsdtPair));

        // Set vault
        strategy.setSavingsVault(vault);

        // Give vault some USDC
        usdc.mint(vault, 100000e6);

        // Give router some USDT for swaps
        usdt.mint(address(vvsRouter), 100000e6);

        // Give router some USDC for withdrawals (removeLiquidity needs to return USDC)
        usdc.mint(address(vvsRouter), 100000e6);
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

    function testCannotDepositZero() public {
        vm.startPrank(vault);

        vm.expectRevert(VVSYieldStrategy.VVSYieldStrategy__ZeroAmount.selector);
        strategy.deposit(alice, 0);

        vm.stopPrank();
    }

    function testCannotDepositAsNonVault() public {
        vm.startPrank(alice);

        vm.expectRevert(VVSYieldStrategy.VVSYieldStrategy__OnlyVault.selector);
        strategy.deposit(alice, 1000e6);

        vm.stopPrank();
    }

    // =============================================================
    //                   WITHDRAWAL TESTS
    // =============================================================

    function testWithdraw() public {
        vm.startPrank(vault);

        // Setup: deposit first
        usdc.approve(address(strategy), 1000e6);
        uint256 lpTokens = strategy.deposit(alice, 1000e6);

        uint256 vaultBalanceBefore = usdc.balanceOf(vault);

        // Withdraw
        uint256 usdcReceived = strategy.withdraw(alice, lpTokens);

        uint256 vaultBalanceAfter = usdc.balanceOf(vault);

        // Check USDC was returned (should be close to 1000e6, minus fees)
        assertGt(usdcReceived, 900e6); // Allow for some slippage
        assertEq(vaultBalanceAfter - vaultBalanceBefore, usdcReceived);
        assertEq(strategy.userLiquidityTokens(alice), 0);

        vm.stopPrank();
    }

    function testCannotWithdrawMoreThanBalance() public {
        vm.startPrank(vault);

        usdc.approve(address(strategy), 1000e6);
        uint256 lpTokens = strategy.deposit(alice, 1000e6);

        vm.expectRevert(VVSYieldStrategy.VVSYieldStrategy__InsufficientLiquidity.selector);
        strategy.withdraw(alice, lpTokens + 1);

        vm.stopPrank();
    }
}
