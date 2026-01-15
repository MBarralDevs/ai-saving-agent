import { ethers } from 'ethers';
import { config } from '../src/config/env';

async function checkAccount() {
  console.log('🔍 Checking Account Status\n');
  console.log('Wallet:', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  console.log('Vault:', config.savingsVaultAddress);
  console.log('USDC:', config.usdcAddress);
  console.log('');

  // Connect to Cronos testnet
  const provider = new ethers.JsonRpcProvider(config.cronosRpcUrl);

  // Connect to vault
  const vaultAbi = [
    'function getAccount(address user) view returns (tuple(uint256 totalDeposited, uint256 totalWithdrawn, uint256 currentBalance, uint256 weeklyGoal, uint256 safetyBuffer, uint256 lastSaveTimestamp, bool isActive, uint8 trustMode))',
  ];

  const vault = new ethers.Contract(
    config.savingsVaultAddress,
    vaultAbi,
    provider
  );

  try {
    const account = await vault.getAccount('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    
    console.log('📊 Account Found!\n');
    console.log('Total Deposited:', ethers.formatUnits(account[0], 6), 'USDC');
    console.log('Total Withdrawn:', ethers.formatUnits(account[1], 6), 'USDC');
    console.log('Current Balance:', ethers.formatUnits(account[2], 6), 'USDC');
    console.log('Weekly Goal:', ethers.formatUnits(account[3], 6), 'USDC');
    console.log('Safety Buffer:', ethers.formatUnits(account[4], 6), 'USDC');
    console.log('Is Active:', account[6]);
    console.log('Trust Mode:', account[7] === 0 ? 'MANUAL' : 'AUTO');
    console.log('');

    if (!account[6]) {
      console.log('⚠️  Account exists but is not active');
      console.log('   You need to create account with: npm run test:setup-user');
    } else {
      console.log('✅ Account is active and ready to use!');
    }

  } catch (error) {
    console.log('❌ No account found for this wallet');
    console.log('   Create one with: npm run test:setup-user');
  }

  // Check USDC balance
  console.log('\n💰 Checking USDC Balance...');
  const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
  const usdc = new ethers.Contract(config.usdcAddress, usdcAbi, provider);
  
  const balance = await usdc.balanceOf('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  console.log('USDC Balance:', ethers.formatUnits(balance, 6), 'USDC');
}

checkAccount().catch(console.error);