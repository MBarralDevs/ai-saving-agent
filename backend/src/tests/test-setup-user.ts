import { ethers } from 'ethers';
import { config } from '../config/env';
import * as fs from 'fs';

/**
 * Complete user setup on-chain
 * Calls createAccount() on SavingsVault
 */
async function setupUser() {
  console.log('🧪 Setting Up Test User Account');
  console.log('================================\n');

  try {
    // Load test user
    if (!fs.existsSync('test-user.json')) {
      console.error('❌ test-user.json not found. Run test-create-user.ts first.');
      return false;
    }

    const testUserData = JSON.parse(fs.readFileSync('test-user.json', 'utf-8'));
    console.log('✅ Loaded test user:', testUserData.address);

    // Connect wallet
    const provider = new ethers.JsonRpcProvider(config.cronosRpcUrl);
    const wallet = new ethers.Wallet(testUserData.privateKey, provider);

    // Check balances
    const croBalance = await provider.getBalance(wallet.address);
    console.log('CRO Balance:', ethers.formatEther(croBalance), 'CRO');

    if (croBalance === 0n) {
      console.error('❌ No CRO balance. Please fund from faucet first.');
      return false;
    }

    // Connect to vault
    const VAULT_ABI = [
      'function createAccount(uint256 weeklyGoal, uint256 safetyBuffer, uint8 trustMode)',
      'function getAccount(address user) view returns (tuple(uint256 totalDeposited, uint256 totalWithdrawn, uint256 currentBalance, uint256 weeklyGoal, uint256 safetyBuffer, uint256 lastSaveTimestamp, bool isActive, uint8 trustMode))',
    ];

    const vault = new ethers.Contract(
      config.savingsVaultAddress,
      VAULT_ABI,
      wallet
    );

    // Check if account already exists
    console.log('\n📝 Checking existing account...');
    try {
      const existingAccount = await vault.getAccount(wallet.address);
      if (existingAccount.isActive) {
        console.log('✅ Account already exists!');
        console.log('Weekly Goal:', ethers.formatUnits(existingAccount.weeklyGoal, 6), 'USDC');
        console.log('Safety Buffer:', ethers.formatUnits(existingAccount.safetyBuffer, 6), 'USDC');
        console.log('Trust Mode:', existingAccount.trustMode === 0 ? 'MANUAL' : 'AUTO');
        return true;
      }
    } catch (error) {
      // Account doesn't exist, continue to create
    }

    // Create account
    console.log('\n📝 Creating account on-chain...');
    const weeklyGoal = ethers.parseUnits('25', 6); // 25 USDC per week
    const safetyBuffer = ethers.parseUnits('100', 6); // Keep 100 USDC minimum
    const trustMode = 1; // AUTO mode

    const tx = await vault.createAccount(weeklyGoal, safetyBuffer, trustMode);
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed!');
    console.log('Block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());

    // Verify account created
    const account = await vault.getAccount(wallet.address);
    console.log('\n✅ Account Created Successfully!');
    console.log('Address:', wallet.address);
    console.log('Weekly Goal:', ethers.formatUnits(account.weeklyGoal, 6), 'USDC');
    console.log('Safety Buffer:', ethers.formatUnits(account.safetyBuffer, 6), 'USDC');
    console.log('Trust Mode:', account.trustMode === 0 ? 'MANUAL' : 'AUTO');
    console.log('Is Active:', account.isActive);

    return true;
  } catch (error: any) {
    console.error('❌ Failed to setup user:', error.message);
    if (error.message.includes('AccountAlreadyExists')) {
      console.log('ℹ️  Account already exists, which is fine!');
      return true;
    }
    return false;
  }
}

// Run
setupUser()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });