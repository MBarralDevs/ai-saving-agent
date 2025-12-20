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

    function testMultipleDeposits() public {
        vm.startPrank(vault);

        usdc.approve(address(strategy), 3000e6);

        // First deposit
        uint256 lpTokens1 = strategy.deposit(alice, 1000e6);
        assertEq(strategy.userLiquidityTokens(alice), lpTokens1);

        // Second deposit
        uint256 lpTokens2 = strategy.deposit(alice, 2000e6);
        assertEq(strategy.userLiquidityTokens(alice), lpTokens1 + lpTokens2);

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

    function testCannotWithdrawZero() public {
        vm.startPrank(vault);

        vm.expectRevert(VVSYieldStrategy.VVSYieldStrategy__ZeroAmount.selector);
        strategy.withdraw(alice, 0);

        vm.stopPrank();
    }

    function testPartialWithdraw() public {
        vm.startPrank(vault);

        // Deposit
        usdc.approve(address(strategy), 1000e6);
        uint256 lpTokens = strategy.deposit(alice, 1000e6);

        // Withdraw half
        uint256 halfLpTokens = lpTokens / 2;
        uint256 usdcReceived = strategy.withdraw(alice, halfLpTokens);

        // Check remaining LP tokens
        assertEq(strategy.userLiquidityTokens(alice), lpTokens - halfLpTokens);

        // Should have received roughly half the USDC
        assertGe(usdcReceived, 450e6);
        assertLe(usdcReceived, 550e6);

        vm.stopPrank();
    }

    // =============================================================
    //                   VIEW TESTS
    // =============================================================

    function testGetUserValue() public {
        vm.startPrank(vault);

        usdc.approve(address(strategy), 1000e6);
        uint256 lpTokens = strategy.deposit(alice, 1000e6);

        uint256 value = strategy.getUserValue(alice);

        //console2.log("Deposited:", 1000e6);
        console2.log("LP tokens received:", lpTokens);
        console2.log("Calculated value:", value);

        // Value should be approximately equal to deposit
        // Allow for rounding and small slippage (within 5%)
        uint256 minExpected = (1000e6 * 95) / 100; // 950 USDC
        uint256 maxExpected = (1000e6 * 105) / 100; // 1050 USDC

        assertGe(value, minExpected, "Value too low");
        assertLe(value, maxExpected, "Value too high");

        vm.stopPrank();
    }

    function testGetUserValueWithYieldGrowth() public {
        vm.startPrank(vault);

        // Alice deposits 1000 USDC
        usdc.approve(address(strategy), 1000e6);
        strategy.deposit(alice, 1000e6);

        uint256 initialValue = strategy.getUserValue(alice);
        console2.log("Initial value:", initialValue);

        vm.stopPrank();

        // Simulate yield growth by having someone else add liquidity
        // In a real pool, trading fees would grow reserves
        vm.startPrank(vault);
        usdc.approve(address(strategy), 1000e6);
        strategy.deposit(address(0x3), 1000e6); // Bob deposits
        vm.stopPrank();

        // Alice's value should stay roughly the same
        // (In real VVS, it would grow from fees, but our mock is simplified)
        uint256 laterValue = strategy.getUserValue(alice);
        console2.log("Later value:", laterValue);

        // For simplified mock, value should be similar
        assertApproxEqRel(laterValue, initialValue, 0.1e18); // Within 10%
    }

    function testGetUserValueWithNoDeposit() public view {
        uint256 value = strategy.getUserValue(alice);
        assertEq(value, 0);
    }

    function testCalculateYieldNoYield() public {
        vm.startPrank(vault);

        usdc.approve(address(strategy), 1000e6);
        strategy.deposit(alice, 1000e6);

        // For simplified mock, yield should be ~0
        uint256 yieldEarned = strategy.calculateYield(alice, 1000e6);

        // Allow small variance due to rounding
        assertLe(yieldEarned, 100e6); // Less than 10% variance

        vm.stopPrank();
    }

    // =============================================================
    //                   ADMIN TESTS
    // =============================================================

    function testSetSavingsVault() public {
        address newVault = address(0x999);
        strategy.setSavingsVault(newVault);
        assertEq(strategy.savingsVault(), newVault);
    }

    function testCannotSetSavingsVaultToZero() public {
        vm.expectRevert(VVSYieldStrategy.VVSYieldStrategy__ZeroAddress.selector);
        strategy.setSavingsVault(address(0));
    }

    function testSetSlippageTolerance() public {
        strategy.setSlippageTolerance(100); // 1%
        assertEq(strategy.slippageTolerance(), 100);
    }

    function testCannotSetSlippageTooHigh() public {
        vm.expectRevert(VVSYieldStrategy.VVSYieldStrategy__SlippageTooHigh.selector);
        strategy.setSlippageTolerance(501); // > 5%
    }

    function testOnlyOwnerCanSetSlippage() public {
        vm.startPrank(alice);

        vm.expectRevert();
        strategy.setSlippageTolerance(100);

        vm.stopPrank();
    }

    function testOnlyOwnerCanSetVault() public {
        vm.startPrank(alice);

        vm.expectRevert();
        strategy.setSavingsVault(address(0x999));

        vm.stopPrank();
    }

    // =============================================================
    //                   INTEGRATION TESTS
    // =============================================================

    function testMultipleUsersDeposit() public {
        address bob = address(0x3);

        vm.startPrank(vault);

        usdc.approve(address(strategy), 3000e6);

        // Alice deposits
        uint256 aliceLpTokens = strategy.deposit(alice, 1000e6);

        // Bob deposits
        uint256 bobLpTokens = strategy.deposit(bob, 2000e6);

        // Check individual balances
        assertEq(strategy.userLiquidityTokens(alice), aliceLpTokens);
        assertEq(strategy.userLiquidityTokens(bob), bobLpTokens);

        // Check total
        assertEq(strategy.totalLiquidityTokens(), aliceLpTokens + bobLpTokens);

        // Check values
        uint256 aliceValue = strategy.getUserValue(alice);
        uint256 bobValue = strategy.getUserValue(bob);

        // Bob should have roughly 2x Alice's value
        assertGe(bobValue, aliceValue * 19 / 10); // Allow 10% variance
        assertLe(bobValue, aliceValue * 21 / 10);

        vm.stopPrank();
    }

    function testDepositWithdrawRoundTrip() public {
        vm.startPrank(vault);

        uint256 initialBalance = usdc.balanceOf(vault);

        // Deposit
        usdc.approve(address(strategy), 1000e6);
        uint256 lpTokens = strategy.deposit(alice, 1000e6);

        // Withdraw immediately
        uint256 usdcReceived = strategy.withdraw(alice, lpTokens);

        uint256 finalBalance = usdc.balanceOf(vault);

        // Should get back approximately what we put in (allow for small slippage)
        assertGe(usdcReceived, 950e6, "Lost too much in round trip");
        assertLe(usdcReceived, 1050e6, "Gained too much in round trip");

        // Vault balance should be approximately restored
        assertGe(finalBalance, initialBalance - 50e6);

        vm.stopPrank();
    }
}
