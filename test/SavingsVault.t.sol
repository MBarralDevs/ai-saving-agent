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
}
