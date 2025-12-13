// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {SavingsVault} from "../src/SavingsVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MockUSDC} from "./mocks/MockUSDC.t.sol";

contract SavingsVaultTest is Test {
    SavingsVault public vault;
    MockUSDC public usdc;

    address public owner = address(this);
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public x402Executor = address(0x3);

    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();

        // Deploy vault
        vault = new SavingsVault(address(usdc));

        // Set x402 executor
        vault.setX402Executor(x402Executor);

        // Give Alice and Bob some USDC
        usdc.mint(alice, 10000e6); // 10k USDC
        usdc.mint(bob, 10000e6);
    }

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
        vm.warp(block.timestamp + 1 days); // Advance time by 1 day to be sure to allow saving

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
        vm.warp(block.timestamp + 1 days); // Advance time by 1 day to be sure to allow saving

        vm.stopPrank();

        // x402 executor triggers save
        vm.startPrank(x402Executor);

        vault.autoSave(alice, 100e6);

        SavingsVault.UserAccount memory account = vault.getAccount(alice);
        assertEq(account.currentBalance, 100e6);

        vm.stopPrank();
    }
}
