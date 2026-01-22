import { ethers } from 'ethers';
import { config } from '../src/config/env';

/**
 * Diagnostic Script - Check USDC State
 * 
 * This checks:
 * 1. Which USDC is the vault using?
 * 2. Which USDC does the backend think it's using?
 * 3. USDC balances everywhere
 * 4. Approvals
 */

async function diagnose() {
  console.log('🔍 USDC Diagnostic Check\n');
  console.log('='.repeat(50));

  const provider = new ethers.JsonRpcProvider(config.cronosRpcUrl);
  const wallet = new ethers.Wallet(config.backendPrivateKey, provider);

  // USDC ABI
  const USDC_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ];

  // Vault ABI
  const VAULT_ABI = [
    'function i_USDC() view returns (address)',
    'function yieldStrategy() view returns (address)',
  ];

  console.log('\n📍 Addresses from .env:');
  console.log('  Backend Wallet:', wallet.address);
  console.log('  Vault:', config.savingsVaultAddress);
  console.log('  USDC (backend .env):', config.usdcAddress);
  console.log('  Yield Strategy:', config.vvsYieldStrategyAddress);

  // Check what USDC the vault thinks it's using
  console.log('\n🏦 Checking Vault Configuration:');
  const vault = new ethers.Contract(config.savingsVaultAddress, VAULT_ABI, provider);
  
  let vaultUsdc;
  try {
    vaultUsdc = await vault.i_USDC();
    console.log('  Vault\'s USDC address:', vaultUsdc);
    
    if (vaultUsdc.toLowerCase() === config.usdcAddress.toLowerCase()) {
      console.log('  ✅ Vault and backend use SAME USDC');
    } else {
      console.log('  ❌ MISMATCH! Vault uses different USDC than backend!');
      console.log('  ⚠️  Backend .env has:', config.usdcAddress);
      console.log('  ⚠️  Vault expects:', vaultUsdc);
    }
  } catch (e) {
    console.log('  ❌ Could not read vault USDC address');
  }

  // Check yield strategy
  let yieldStrategy;
  try {
    yieldStrategy = await vault.yieldStrategy();
    console.log('  Vault\'s Yield Strategy:', yieldStrategy);
    
    if (yieldStrategy === ethers.ZeroAddress) {
      console.log('  ⚠️  No yield strategy set!');
    } else if (yieldStrategy.toLowerCase() === config.vvsYieldStrategyAddress.toLowerCase()) {
      console.log('  ✅ Yield strategy matches .env');
    } else {
      console.log('  ❌ Yield strategy mismatch!');
    }
  } catch (e) {
    console.log('  ❌ Could not read yield strategy');
  }

  // Check balances with BACKEND's USDC
  console.log('\n💰 USDC Balances (using backend .env USDC):');
  const backendUsdc = new ethers.Contract(config.usdcAddress, USDC_ABI, provider);
  
  const userAddr = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // From your logs
  const userBalance = await backendUsdc.balanceOf(userAddr);
  const vaultBalance = await backendUsdc.balanceOf(config.savingsVaultAddress);
  const strategyBalance = await backendUsdc.balanceOf(config.vvsYieldStrategyAddress);
  
  console.log('  User:', ethers.formatUnits(userBalance, 6), 'USDC');
  console.log('  Vault:', ethers.formatUnits(vaultBalance, 6), 'USDC');
  console.log('  Strategy:', ethers.formatUnits(strategyBalance, 6), 'USDC');

  // If vault uses different USDC, check that too
  if (vaultUsdc && vaultUsdc.toLowerCase() !== config.usdcAddress.toLowerCase()) {
    console.log('\n💰 USDC Balances (using VAULT\'s USDC):');
    const vaultUsdc_contract = new ethers.Contract(vaultUsdc, USDC_ABI, provider);
    
    const userBalance2 = await vaultUsdc_contract.balanceOf(userAddr);
    const vaultBalance2 = await vaultUsdc_contract.balanceOf(config.savingsVaultAddress);
    const strategyBalance2 = await vaultUsdc_contract.balanceOf(config.vvsYieldStrategyAddress);
    
    console.log('  User:', ethers.formatUnits(userBalance2, 6), 'USDC');
    console.log('  Vault:', ethers.formatUnits(vaultBalance2, 6), 'USDC');
    console.log('  Strategy:', ethers.formatUnits(strategyBalance2, 6), 'USDC');
  }

  // Check approvals
  console.log('\n🔐 Approvals (using backend .env USDC):');
  const vaultToStrategy = await backendUsdc.allowance(
    config.savingsVaultAddress,
    config.vvsYieldStrategyAddress
  );
  console.log('  Vault → Strategy:', ethers.formatUnits(vaultToStrategy, 6), 'USDC');

  if (vaultUsdc && vaultUsdc.toLowerCase() !== config.usdcAddress.toLowerCase()) {
    console.log('\n🔐 Approvals (using VAULT\'s USDC):');
    const vaultUsdc_contract = new ethers.Contract(vaultUsdc, USDC_ABI, provider);
    const vaultToStrategy2 = await vaultUsdc_contract.allowance(
      config.savingsVaultAddress,
      config.vvsYieldStrategyAddress
    );
    console.log('  Vault → Strategy:', ethers.formatUnits(vaultToStrategy2, 6), 'USDC');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 DIAGNOSIS:');
  console.log('='.repeat(50));
  
  if (vaultUsdc && vaultUsdc.toLowerCase() !== config.usdcAddress.toLowerCase()) {
    console.log('\n❌ PROBLEM FOUND: USDC ADDRESS MISMATCH');
    console.log('\nThe vault was deployed with a different USDC than your backend is using.');
    console.log('\nFIX: Update backend/.env to use the vault\'s USDC:');
    console.log(`USDC_ADDRESS=${vaultUsdc}`);
    console.log('\nThen restart backend and try again.');
  } else if (yieldStrategy === ethers.ZeroAddress) {
    console.log('\n⚠️  PROBLEM: No yield strategy set in vault');
    console.log('\nThe vault has no yield strategy configured.');
    console.log('This means deposits won\'t earn yield.');
  } else if (vaultBalance > 0) {
    console.log('\n✅ Vault has USDC!');
    console.log('\nBut the transaction is still failing...');
    console.log('This means the approval is happening but something else is wrong.');
  } else {
    console.log('\n⚠️  Vault has 0 USDC');
    console.log('x402 payment might not have actually transferred the USDC.');
  }
}

diagnose()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
  });