// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {SavingsVault} from "../src/SavingsVault.sol";
import {VVSYieldStrategy} from "../src/VVSYieldStrategy.sol";
import {MockUSDC} from "./mocks/MockUSDC.t.sol";
import {MockVVSRouter} from "./mocks/MockVVSRouter.t.sol";
import {MockVVSPair} from "./mocks/MockVVSPair.t.sol";

contract IntegrationTest is Test {
    SavingsVault public vault;
    VVSYieldStrategy public strategy;
    MockUSDC public usdc;
    MockUSDC public usdt;
    MockVVSRouter public vvsRouter;
    MockVVSPair public usdcUsdtPair;

    address public owner = address(this);
    address public alice = address(0x1);
    address public bob = address(0x2);

    function setUp() public {
        // Deploy mock tokens
        usdc = new MockUSDC();
        usdt = new MockUSDC();

        // Deploy mock VVS
        usdcUsdtPair = new MockVVSPair(address(usdc), address(usdt));
        vvsRouter = new MockVVSRouter(address(usdc), address(usdt));
        vvsRouter.setPair(address(usdcUsdtPair));

        // Deploy vault
        vault = new SavingsVault(address(usdc));

        // Deploy strategy
        strategy = new VVSYieldStrategy(address(vvsRouter), address(usdc), address(usdt), address(usdcUsdtPair));

        // Connect them
        strategy.setSavingsVault(address(vault));
        vault.setYieldStrategy(address(strategy));

        // Fund router for swaps
        usdt.mint(address(vvsRouter), 100000e6);
        usdc.mint(address(vvsRouter), 100000e6);

        // Fund users
        usdc.mint(alice, 10000e6);
        usdc.mint(bob, 10000e6);
    }

    // =============================================================
    //                   INTEGRATION TESTS
    // =============================================================

    function testDepositAutoRoutesToYield() public {
        vm.startPrank(alice);

        // Create account
        vault.createAccount(100e6, 500e6, SavingsVault.TrustMode.MANUAL);

        // Approve and deposit
        usdc.approve(address(vault), 1000e6);
        vault.deposit(1000e6);

        // Check vault balance
        SavingsVault.UserAccount memory account = vault.getAccount(alice);
        assertEq(account.currentBalance, 1000e6);

        // Check strategy has LP tokens for alice
        uint256 lpTokens = strategy.userLiquidityTokens(alice);
        assertGt(lpTokens, 0, "Should have LP tokens in strategy");

        vm.stopPrank();
    }
}
