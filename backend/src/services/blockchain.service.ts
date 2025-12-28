import { ethers } from 'ethers';
import { config } from '../config/env';

// ABIs (Application Binary Interface) - tells ethers.js how to interact with contracts
// We only include the functions we actually use (not the entire ABI)
const SAVINGS_VAULT_ABI = [
  // View function - reads user account data (doesn't cost gas)
  'function getAccount(address user) view returns (tuple(uint256 totalDeposited, uint256 totalWithdrawn, uint256 currentBalance, uint256 weeklyGoal, uint256 safetyBuffer, uint256 lastSaveTimestamp, bool isActive, uint8 trustMode))',
  
  // State-changing function - deposits on behalf of user (costs gas)
  'function depositFor(address user, uint256 amount)',
  
  // View function - checks if user can save (rate limit)
  'function canAutoSave(address user) view returns (bool)',
  
  // View function - gets total balance including yield
  'function getUserTotalBalance(address user) view returns (uint256)',
  
  // Event - emitted when deposit happens (we can listen to this)
  'event Deposited(address indexed user, uint256 amount, uint256 newBalance)',
];

const USDC_ABI = [
  // Standard ERC20 functions we need
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];


export class BlockchainService {
  // Private properties - only accessible within this class
  private provider: ethers.JsonRpcProvider;  // Connection to blockchain
  private backendWallet: ethers.Wallet;      // Our wallet (can sign txs)
  private savingsVault: ethers.Contract;     // SavingsVault contract instance
  private usdc: ethers.Contract;             // USDC contract instance

  constructor() {
    // 1. Initialize provider (connection to Cronos)
    this.provider = new ethers.JsonRpcProvider(config.cronosRpcUrl);
    
    // 2. Initialize backend wallet
    // Wallet = private key + provider = can sign transactions
    this.backendWallet = new ethers.Wallet(
      config.backendPrivateKey,  // Your private key from .env
      this.provider              // Connected to Cronos
    );

    // 3. Initialize SavingsVault contract
    this.savingsVault = new ethers.Contract(
      config.savingsVaultAddress,  // Where the contract lives
      SAVINGS_VAULT_ABI,            // How to talk to it
      this.backendWallet            // Who's calling it (for state changes)
    );

    // 4. Initialize USDC contract (read-only, no wallet needed)
    this.usdc = new ethers.Contract(
      config.usdcAddress,
      USDC_ABI,
      this.provider  // Just provider, not wallet (we only read)
    );

    console.log('✅ Blockchain service initialized');
    console.log('Backend wallet address:', this.backendWallet.address);
  }}