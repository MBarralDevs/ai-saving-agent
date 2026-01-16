import { ethers } from 'ethers';
import { config } from '../src/config/env';

async function debug() {
  console.log('🔍 Debugging Scheduler Account Detection\n');

  const provider = new ethers.JsonRpcProvider(config.cronosRpcUrl);
  const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  const vaultAbi = [
    'function getAccount(address user) view returns (tuple(uint256 totalDeposited, uint256 totalWithdrawn, uint256 currentBalance, uint256 weeklyGoal, uint256 safetyBuffer, uint256 lastSaveTimestamp, bool isActive, uint8 trustMode))',
  ];

  const vault = new ethers.Contract(
    config.savingsVaultAddress,
    vaultAbi,
    provider
  );

  try {
    const account = await vault.getAccount(testAddress);
    
    console.log('Account found:');
    console.log('  Address:', testAddress);
    console.log('  Is Active:', account[6]);
    console.log('  Trust Mode (raw):', account[7]);
    console.log('  Trust Mode:', account[7] === 0 ? 'MANUAL (0)' : 'AUTO (1)');
    console.log('');
    
    if (account[6] && account[7] === 1) {
      console.log('✅ This account SHOULD be picked up by scheduler');
    } else if (!account[6]) {
      console.log('❌ Account is NOT ACTIVE');
    } else if (account[7] === 0) {
      console.log('❌ Account is in MANUAL mode (not AUTO)');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

debug().catch(console.error);