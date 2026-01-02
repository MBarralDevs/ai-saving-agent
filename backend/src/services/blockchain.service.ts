import { ethers } from 'ethers';
import { config } from '../config/env';

// Minimal ABIs - only the functions we actually use
const SAVINGS_VAULT_ABI = [
  'function getAccount(address user) view returns (tuple(uint256 totalDeposited, uint256 totalWithdrawn, uint256 currentBalance, uint256 weeklyGoal, uint256 safetyBuffer, uint256 lastSaveTimestamp, bool isActive, uint8 trustMode))',
  'function depositFor(address user, uint256 amount)',
  'function canAutoSave(address user) view returns (bool)',
  'function getUserTotalBalance(address user) view returns (uint256)',
  'event Deposited(address indexed user, uint256 amount, uint256 newBalance)',
];

const USDC_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

/**
 * BlockchainService
 * Handles all interactions with Cronos blockchain and our smart contracts.
 * Provides typed wrappers around ethers.js for SavingsVault operations.
 */
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private backendWallet: ethers.Wallet;
  private savingsVault: ethers.Contract;
  private usdc: ethers.Contract;

  constructor() {
    // Connect to Cronos testnet
    this.provider = new ethers.JsonRpcProvider(config.cronosRpcUrl);

    // Initialize backend wallet (authorized to call depositFor)
    this.backendWallet = new ethers.Wallet(config.backendPrivateKey, this.provider);

    // Initialize contract instances
    this.savingsVault = new ethers.Contract(
      config.savingsVaultAddress,
      SAVINGS_VAULT_ABI,
      this.backendWallet
    );

    this.usdc = new ethers.Contract(
      config.usdcAddress,
      USDC_ABI,
      this.provider
    );

    console.log('✅ Blockchain service initialized');
    console.log('Backend wallet address:', this.backendWallet.address);
  }

  /**
   * Get user's account details from vault
   */
  async getUserAccount(userAddress: string) {
    try {
      const account = await this.savingsVault.getAccount(userAddress);
      
      // Convert tuple to named object
      return {
        totalDeposited: account[0],
        totalWithdrawn: account[1],
        currentBalance: account[2],
        weeklyGoal: account[3],
        safetyBuffer: account[4],
        lastSaveTimestamp: account[5],
        isActive: account[6],
        trustMode: account[7],
      };
    } catch (error) {
      console.error('Error getting user account:', error);
      throw error;
    }
  }

  /**
   * Check if user has passed rate limit (1 day between saves)
   */
  async canAutoSave(userAddress: string): Promise<boolean> {
    try {
      return await this.savingsVault.canAutoSave(userAddress);
    } catch (error) {
      console.error('Error checking canAutoSave:', error);
      return false;
    }
  }

  /**
   * Get user's total balance including yield from VVS
   */
  async getUserTotalBalance(userAddress: string): Promise<bigint> {
    try {
      return await this.savingsVault.getUserTotalBalance(userAddress);
    } catch (error) {
      console.error('Error getting user total balance:', error);
      throw error;
    }
  }

  /**
   * Deposit USDC to user's account after x402 payment verification
   * Only callable by authorized backend wallet
   */
  async depositFor(userAddress: string, amount: bigint) {
    try {
      console.log(`Calling depositFor: user=${userAddress}, amount=${amount.toString()}`);

      const tx = await this.savingsVault.depositFor(userAddress, amount);
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);

      return receipt;
    } catch (error) {
      console.error('Error calling depositFor:', error);
      throw error;
    }
  }

  /**
   * Convert human-readable USDC to wei (6 decimals)
   * Example: "25.50" -> 25500000
   */
  parseUsdcAmount(amount: string): bigint {
    return ethers.parseUnits(amount, 6);
  }

  /**
   * Convert wei to human-readable USDC
   * Example: 25500000 -> "25.5"
   */
  formatUsdcAmount(amount: bigint): string {
    return ethers.formatUnits(amount, 6);
  }

  getBackendAddress(): string {
    return this.backendWallet.address;
  }
}