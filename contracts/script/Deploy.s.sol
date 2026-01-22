// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Script, console2} from "lib/forge-std/src/Script.sol";
import {SavingsVault} from "../src/SavingsVault.sol";

/**
 * Deploy SavingsVault with Real Testnet USDC
 *
 * This script deploys the SavingsVault using the real Cronos testnet USDC.
 * The USDC address should be set in your .env file.
 *
 * Usage:
 * forge script script/Deploy.s.sol --rpc-url $CRONOS_RPC_URL --broadcast
 */
contract DeployScript is Script {
    function run() external {
        // Read from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Deploying SavingsVault");
        console2.log("========================================");
        console2.log("");
        console2.log("Deployer:", deployer);
        console2.log("Balance:", deployer.balance / 1e18, "CRO");
        console2.log("Using USDC:", usdc);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy SavingsVault with real USDC
        console2.log("Deploying SavingsVault...");
        SavingsVault vault = new SavingsVault(usdc);
        console2.log("SavingsVault deployed at:", address(vault));

        vm.stopBroadcast();

        // Verify deployment
        console2.log("");
        console2.log("========================================");
        console2.log("Deployment Complete!");
        console2.log("========================================");
        console2.log("");
        console2.log("Contract Addresses:");
        console2.log("-------------------");
        console2.log("USDC:", usdc);
        console2.log("SavingsVault:", address(vault));
        console2.log("");
        console2.log("Verification:");
        console2.log("-------------");
        console2.log("Vault Owner:", vault.owner());
        console2.log("Vault USDC:", address(vault.i_USDC()));
        console2.log("");
        console2.log("Next Steps:");
        console2.log("-----------");
        console2.log("1. Update backend/.env:");
        console2.log("   SAVINGS_VAULT_ADDRESS=", address(vault));
        console2.log("   USDC_ADDRESS=", usdc);
        console2.log("");
        console2.log("2. Set backend server in vault:");
        console2.log("   cast send", address(vault), '"setBackendServer(address)" <BACKEND_WALLET_ADDRESS>');
        console2.log("");
        console2.log("3. Deploy VVS mocks:");
        console2.log("   forge script script/DeployMockVVS.s.sol --rpc-url $CRONOS_RPC_URL --broadcast");
        console2.log("");
    }
}
