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