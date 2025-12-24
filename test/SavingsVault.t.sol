// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {SavingsVault} from "../src/SavingsVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MockUSDC} from "./mocks/MockUSDC.t.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract SavingsVaultTest is Test {
    SavingsVault public vault;
    MockUSDC public usdc;

    address public owner = address(this);
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public x402Executor = address(0x3);

    // Line 20 - change from setX402Executor to setBackendServer
    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();

        // Deploy vault
        vault = new SavingsVault(address(usdc));

        // Set backend server (changed from setX402Executor)
        vault.setBackendServer(backendServer);

        // Give Alice and Bob some USDC
        usdc.mint(alice, 10000e6); // 10k USDC
        usdc.mint(bob, 10000e6);
    }

    // Line 19 - rename variable
    address public backendServer = address(0x3);

    // =============================================================
    //                   ACCOUNT CREATION TESTS
    // =============================================================

    function testCreateAccount() public {
        vm.startPrank(alice);

        vault.createAccount(
            100e6, // 100 USDC weekly goal
            500e6, // 500 USDC safety buffer
            SavingsVault.TrustMode.MANUAL
        );
        SavingsVault.UserAccount memory account = vault.getAccount(alice);

        assertEq(account.weeklyGoal, 100e6);
        assertEq(account.safetyBuffer, 500e6);
        assertEq(account.isActive, true);
        assertTrue(account.trustMode == SavingsVault.TrustMode.MANUAL);

        vm.stopPrank();
    }

    function testCannotCreateDuplicateAccount() public {
        vm.startPrank(alice);

        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);

        vm.expectRevert(SavingsVault.SavingsVault__AccountAlreadyExists.selector);
        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);

        vm.stopPrank();
    }

    // =============================================================
    //                     DEPOSIT TESTS
    // =============================================================

    function testDeposit() public {
        vm.startPrank(alice);

        // Create account
        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);

        // Approve vault to spend USDC
        usdc.approve(address(vault), 1000e6);

        // Deposit
        vault.deposit(1000e6);

        SavingsVault.UserAccount memory account = vault.getAccount(alice);
        assertEq(account.currentBalance, 1000e6);
        assertEq(account.totalDeposited, 1000e6);
        assertEq(vault.totalValueLocked(), 1000e6);

        vm.stopPrank();
    }

    function testCannotDepositBelowMinimum() public {
        vm.startPrank(alice);

        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);
        usdc.approve(address(vault), 1e6);

        vm.expectRevert(SavingsVault.SavingsVault__InvalidAmount.selector);
        vault.deposit(0.5e6); // 0.5 USDC (below 1 USDC minimum)

        vm.stopPrank();
    }

    function testCannotDepositWithoutAccount() public {
        vm.startPrank(alice);

        usdc.approve(address(vault), 1000e6);

        vm.expectRevert(SavingsVault.SavingsVault__AccountNotActive.selector);
        vault.deposit(1000e6);

        vm.stopPrank();
    }

    // =============================================================
    //                     WITHDRAWAL TESTS
    // =============================================================

    function testWithdraw() public {
        vm.startPrank(alice);

        // Setup: create account and deposit
        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);
        usdc.approve(address(vault), 1000e6);
        vault.deposit(1000e6);

        uint256 balanceBefore = usdc.balanceOf(alice);

        // Withdraw
        vault.withdraw(400e6);

        uint256 balanceAfter = usdc.balanceOf(alice);

        assertEq(balanceAfter - balanceBefore, 400e6);

        SavingsVault.UserAccount memory account = vault.getAccount(alice);
        assertEq(account.currentBalance, 600e6);
        assertEq(account.totalWithdrawn, 400e6);

        vm.stopPrank();
    }

    function testCannotWithdrawMoreThanBalance() public {
        vm.startPrank(alice);

        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);
        usdc.approve(address(vault), 1000e6);
        vault.deposit(1000e6);

        vm.expectRevert(SavingsVault.SavingsVault__InsufficientBalance.selector);
        vault.withdraw(1001e6);

        vm.stopPrank();
    }

    // =============================================================
    //                   AUTO-SAVE TESTS
    // =============================================================

    function testAutoSaveManualMode() public {
        vm.startPrank(alice);

        // Create account in MANUAL mode
        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);

        // Approve vault to spend USDC for auto-save
        usdc.approve(address(vault), 100e6);

        uint256 balanceBefore = usdc.balanceOf(alice);

        // Alice triggers save herself (manual mode)
        vault.autoSave(alice, 100e6);

        uint256 balanceAfter = usdc.balanceOf(alice);

        assertEq(balanceBefore - balanceAfter, 100e6);

        SavingsVault.UserAccount memory account = vault.getAccount(alice);
        assertEq(account.currentBalance, 100e6);
        assertTrue(account.lastSaveTimestamp > 0);

        vm.stopPrank();
    }

    function testAutoSaveAutoMode() public {
        vm.startPrank(alice);

        // Create account in AUTO mode
        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.AUTO);

        // Approve vault to spend USDC
        usdc.approve(address(vault), 100e6);

        vm.stopPrank();

        // Backend server triggers save (changed from x402Executor)
        vm.startPrank(backendServer);

        vault.autoSave(alice, 100e6);

        SavingsVault.UserAccount memory account = vault.getAccount(alice);
        assertEq(account.currentBalance, 100e6);

        vm.stopPrank();
    }

    function testCannotAutoSaveInAutoModeAsUser() public {
        vm.startPrank(alice);

        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.AUTO);
        usdc.approve(address(vault), 100e6);

        // Alice tries to trigger save herself (should fail in AUTO mode)
        vm.expectRevert(SavingsVault.SavingsVault__UnauthorizedCaller.selector);
        vault.autoSave(alice, 100e6);

        vm.stopPrank();
    }

    function testRateLimitingOnAutoSave() public {
        vm.startPrank(alice);

        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);
        usdc.approve(address(vault), 200e6);

        // First save
        vault.autoSave(alice, 100e6);

        // Try to save again immediately (should fail)
        vm.expectRevert(SavingsVault.SavingsVault__SaveIntervalNotMet.selector);
        vault.autoSave(alice, 100e6);

        vm.stopPrank();

        // Fast forward 1 day + 1 second
        vm.warp(block.timestamp + 1 days + 1);

        vm.startPrank(alice);

        // Now it should work
        vault.autoSave(alice, 100e6);

        SavingsVault.UserAccount memory account = vault.getAccount(alice);
        assertEq(account.currentBalance, 200e6);

        vm.stopPrank();
    }

    function testCannotAutoSaveAboveMaxLimit() public {
        vm.startPrank(alice);

        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);
        usdc.approve(address(vault), 20000e6);

        vm.expectRevert(SavingsVault.SavingsVault__AmountExceedsLimit.selector);
        vault.autoSave(alice, 15000e6); // Above 10k limit

        vm.stopPrank();
    }

    function testFirstSaveIgnoresRateLimit() public {
        vm.startPrank(alice);

        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);
        usdc.approve(address(vault), 100e6);

        // First save should work immediately (no rate limit)
        vault.autoSave(alice, 100e6);

        SavingsVault.UserAccount memory account = vault.getAccount(alice);
        assertEq(account.currentBalance, 100e6);
        assertEq(account.lastSaveTimestamp, block.timestamp);

        vm.stopPrank();
    }

    // =============================================================
    //                   UPDATE TESTS
    // =============================================================

    function testUpdateGoal() public {
        vm.startPrank(alice);

        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);

        vault.updateGoal(200e6);

        SavingsVault.UserAccount memory account = vault.getAccount(alice);
        assertEq(account.weeklyGoal, 200e6);

        vm.stopPrank();
    }

    function testUpdateTrustMode() public {
        vm.startPrank(alice);

        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);

        vault.updateTrustMode(SavingsVault.TrustMode.AUTO);

        SavingsVault.UserAccount memory account = vault.getAccount(alice);
        assertTrue(account.trustMode == SavingsVault.TrustMode.AUTO);

        vm.stopPrank();
    }

    // =============================================================
    //                   ADMIN TESTS
    // =============================================================

    function testSetYieldStrategy() public {
        address newStrategy = address(0x999);
        vault.setYieldStrategy(newStrategy);
        assertEq(vault.yieldStrategy(), newStrategy);
    }

    function testPauseAndUnpause() public {
        vault.pause();

        vm.startPrank(alice);
        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);
        usdc.approve(address(vault), 1000e6);

        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.deposit(1000e6);

        vm.stopPrank();

        vault.unpause();

        vm.startPrank(alice);
        vault.deposit(1000e6); // Should work now
        vm.stopPrank();
    }
}
