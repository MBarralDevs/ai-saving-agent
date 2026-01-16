// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Script, console2} from "lib/forge-std/src/Script.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.t.sol";
import {MockVVSRouter} from "../test/mocks/MockVVSRouter.t.sol";
import {MockVVSPair} from "../test/mocks/MockVVSPair.t.sol";
import {VVSYieldStrategy} from "../src/VVSYieldStrategy.sol";
import {SavingsVault} from "../src/SavingsVault.sol";

/**
 * Deploy Mock VVS Contracts to Cronos Testnet
 *
 * This deploys a simplified VVS Finance clone for testing:
 * - Mock USDT token
 * - Mock VVS Router (for swaps)
 * - Mock USDC/USDT Pair (liquidity pool)
 * - VVSYieldStrategy (connects vault to VVS)
 */
contract DeployMockVVS is Script {
    function run() external {
        // Load config from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address usdc = vm.envAddress("USDC_ADDRESS");
        address vaultAddress = vm.envAddress("SAVINGS_VAULT_ADDRESS");

        console2.log("========================================");
        console2.log("Deploying Mock VVS to Cronos Testnet");
        console2.log("========================================");
        console2.log("");
        console2.log("Deployer:", deployer);
        console2.log("Balance:", deployer.balance);
        console2.log("USDC:", usdc);
        console2.log("Vault:", vaultAddress);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // ============================================
        // STEP 1: Deploy Mock USDT
        // ============================================
        console2.log("Step 1: Deploying Mock USDT...");
        MockUSDC usdt = new MockUSDC();
        console2.log("  USDT deployed at:", address(usdt));
        console2.log("");

        // ============================================
        // STEP 2: Deploy Mock VVS Pair (USDC/USDT)
        // ============================================
        console2.log("Step 2: Deploying USDC/USDT Liquidity Pair...");
        MockVVSPair pair = new MockVVSPair(usdc, address(usdt));
        console2.log("  Pair deployed at:", address(pair));
        console2.log("");

        // ============================================
        // STEP 3: Deploy Mock VVS Router
        // ============================================
        console2.log("Step 3: Deploying VVS Router...");
        MockVVSRouter router = new MockVVSRouter(usdc, address(usdt));
        console2.log("  Router deployed at:", address(router));
        console2.log("");

        // ============================================
        // STEP 4: Connect Pair to Router
        // ============================================
        console2.log("Step 4: Connecting Pair to Router...");
        router.setPair(address(pair));
        console2.log("  Pair connected");
        console2.log("");

        // ============================================
        // STEP 5: Fund Router with USDT
        // ============================================
        console2.log("Step 5: Funding Router with liquidity...");
        usdt.mint(address(router), 1_000_000e6); // 1M USDT
        console2.log("  Funded with 1,000,000 USDT");
        console2.log("");

        // ============================================
        // STEP 6: Deploy VVSYieldStrategy
        // ============================================
        console2.log("Step 6: Deploying VVSYieldStrategy...");
        VVSYieldStrategy strategy = new VVSYieldStrategy(address(router), usdc, address(usdt), address(pair));
        console2.log("  Strategy deployed at:", address(strategy));
        console2.log("");

        // ============================================
        // STEP 7: Connect Strategy to Vault
        // ============================================
        console2.log("Step 7: Connecting Strategy to Vault...");
        strategy.setSavingsVault(vaultAddress);
        console2.log("  Strategy connected to Vault");
        console2.log("");

        // ============================================
        // STEP 8: Set Strategy in Vault
        // ============================================
        console2.log("Step 8: Setting Strategy in Vault...");
        SavingsVault vault = SavingsVault(vaultAddress);
        vault.setYieldStrategy(address(strategy));
        console2.log("  Vault configured to use Strategy");
        console2.log("");

        vm.stopBroadcast();

        // ============================================
        // DEPLOYMENT SUMMARY
        // ============================================
        console2.log("========================================");
        console2.log("Deployment Complete!");
        console2.log("========================================");
        console2.log("");
        console2.log("Contract Addresses:");
        console2.log("-------------------");
        console2.log("USDT:              ", address(usdt));
        console2.log("VVS Router:        ", address(router));
        console2.log("USDC/USDT Pair:    ", address(pair));
        console2.log("VVSYieldStrategy:  ", address(strategy));
        console2.log("");
        console2.log("Add these to backend/.env:");
        console2.log("----------------------------");
        console2.log(string.concat("USDT_ADDRESS=", vm.toString(address(usdt))));
        console2.log(string.concat("VVS_ROUTER_ADDRESS=", vm.toString(address(router))));
        console2.log(string.concat("USDC_USDT_PAIR_ADDRESS=", vm.toString(address(pair))));
        console2.log(string.concat("VVS_YIELD_STRATEGY_ADDRESS=", vm.toString(address(strategy))));
        console2.log("");
        console2.log("Next Steps:");
        console2.log("-----------");
        console2.log("1. Update backend/.env with addresses above");
        console2.log("2. Restart backend server");
        console2.log("3. Test deposit - it will auto-route to VVS!");
        console2.log("4. Check getUserTotalBalance() to see yield");
        console2.log("");
    }
}
