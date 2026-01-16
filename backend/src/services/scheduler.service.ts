import cron from 'node-cron';
import { BlockchainService } from './blockchain.service';
import { DecisionEngine } from '../agent/decision-engine';
import { UserFinancialState, DecisionStrategy } from '../agent/types';
import { ethers } from 'ethers';

/**
 * SchedulerService
 * 
 * Runs automated checks for all AUTO mode accounts
 * Uses AI Decision Engine to determine when to save
 */
export class SchedulerService {
  private blockchainService: BlockchainService;
  private decisionEngine: DecisionEngine;
  private isRunning: boolean = false;

  constructor() {
    this.blockchainService = new BlockchainService();
    
    // Initialize decision engine with BALANCED strategy
    this.decisionEngine = new DecisionEngine({
      strategy: DecisionStrategy.BALANCED,
      minSaveAmount: BigInt(1_000_000), // 1 USDC minimum
      maxSavePercentage: 0.5, // Max 50% of available funds
    });
  }

  /**
   * Start the scheduler
   * Runs every hour to check if users should auto-save
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Scheduler already running');
      return;
    }

    console.log('🤖 Starting AI Savings Scheduler');
    console.log('   Checking accounts every hour');
    console.log('   Strategy: BALANCED');
    console.log('');

    // Run every hour: '0 * * * *'
    // For testing, run every 5 minutes: '*/5 * * * *'
    cron.schedule('*/5 * * * *', async () => {
      await this.checkAllAccounts();
    });

    this.isRunning = true;
    
    // Also run immediately on start for testing
    setTimeout(() => this.checkAllAccounts(), 5000);
  }

  /**
   * Check all active AUTO accounts and decide if they should save
   */
  private async checkAllAccounts() {
    console.log('\n🔄 Running scheduled check...');
    console.log('Time:', new Date().toISOString());
    console.log('================================\n');

    try {
      // For now, we'll check specific accounts
      // In production, you'd query all accounts from an indexer or database
      const accountsToCheck = await this.getActiveAutoAccounts();

      console.log(`Found ${accountsToCheck.length} AUTO accounts to check\n`);

      for (const userAddress of accountsToCheck) {
        await this.checkAndSaveForUser(userAddress);
      }

      console.log('\n✅ Scheduled check complete\n');
    } catch (error: any) {
      console.error('❌ Scheduler error:', error.message);
    }
  }

  /**
   * Get list of active AUTO accounts
   * 
   * TODO: In production, use:
   * - Event indexer (TheGraph, Goldsky)
   * - Database of registered users
   * - On-chain account registry
   * 
   * For now, we'll use a hardcoded list or check known accounts
   */
  private async getActiveAutoAccounts(): Promise<string[]> {
    // For hackathon demo, check your test account
    const knownAccounts = [
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Your test account
    ];

    // Filter to only AUTO and active accounts
    const activeAutoAccounts: string[] = [];

    for (const address of knownAccounts) {
      try {
        const account = await this.blockchainService.getUserAccount(address);
        
        // Check if active and in AUTO mode
        if (account.isActive && account.trustMode === 1n) {  // ✅ Compare BigInt to BigInt
          activeAutoAccounts.push(address);
        }
      } catch (error) {
        // Account doesn't exist, skip
        console.log(`⚠️  No account for ${address}`);
      }
    }

    return activeAutoAccounts;
  }

  /**
   * Check a single user and decide if they should save
   */
  private async checkAndSaveForUser(userAddress: string) {
    console.log(`👤 Checking: ${userAddress}`);

    try {
      // 1. Get user's financial state
      const financialState = await this.getUserFinancialState(userAddress);

      console.log(`   Wallet: ${this.formatUsdc(financialState.walletBalance)} USDC`);
      console.log(`   Safety Buffer: ${this.formatUsdc(financialState.safetyBuffer)} USDC`);
      console.log(`   Weekly Goal: ${this.formatUsdc(financialState.weeklyGoal)} USDC`);

      // 2. Let AI decide
      const decision = this.decisionEngine.decide(financialState);

      console.log(`   Decision: ${decision.shouldSave ? '💰 SAVE' : '⏸️  SKIP'}`);
      console.log(`   Reason: ${decision.reason}`);
      console.log(`   Confidence: ${(decision.confidence * 100).toFixed(0)}%`);

      // 3. Execute save if AI says yes
      if (decision.shouldSave && decision.amount > 0n) {
        console.log(`   Executing save of ${this.formatUsdc(decision.amount)} USDC...`);
        
        // This would trigger x402 payment flow
        // For automation, we'd need user to pre-approve or use different mechanism
        // For hackathon demo, log what would happen
        console.log('   ⚠️  Auto-save would require pre-approved spending');
        console.log('   📝 Logged decision for user dashboard');
        
        // TODO: Implement one of:
        // A) Pre-approved allowance system
        // B) Notification to user to approve
        // C) Smart contract automated pull
      } else {
        console.log('   No action needed');
      }

      console.log('');

    } catch (error: any) {
      console.error(`   ❌ Error checking ${userAddress}:`, error.message);
    }
  }

  /**
   * Get user's current financial state for decision making
   */
private async getUserFinancialState(userAddress: string): Promise<UserFinancialState> {
  const account = await this.blockchainService.getUserAccount(userAddress);
  const canSave = await this.blockchainService.canAutoSave(userAddress);
  const walletBalance = await this.blockchainService.getWalletUsdcBalance(userAddress);

  const now = Math.floor(Date.now() / 1000);
  const lastSave = Number(account.lastSaveTimestamp);
  const timeSinceLastSave = lastSave === 0 ? 0 : (now - lastSave) / 3600;

  return {
    walletBalance,
    currentSavings: account.currentBalance,
    weeklyGoal: account.weeklyGoal,
    safetyBuffer: account.safetyBuffer,
    lastSaveTimestamp: account.lastSaveTimestamp,
    trustMode: account.trustMode === 0n ? 'MANUAL' : 'AUTO',  // Fix: Use 0n
    isActive: account.isActive,
    canAutoSave: canSave,
    timeSinceLastSave,
  };
}

  /**
   * Format USDC amount for logging
   */
  private formatUsdc(amount: bigint): string {
    return (Number(amount) / 1_000_000).toFixed(2);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 Scheduler stopped');
  }

  /**
   * Check if scheduler is running
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      strategy: this.decisionEngine.getContext().strategy,
      lastCheck: new Date().toISOString(),
    };
  }
}