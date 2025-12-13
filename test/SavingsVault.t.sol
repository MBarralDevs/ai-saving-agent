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
}
