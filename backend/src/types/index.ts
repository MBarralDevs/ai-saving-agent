// This represents a user's account from the smart contract
export interface UserAccount {
  totalDeposited: bigint;      // Total USDC they've ever deposited
  totalWithdrawn: bigint;      // Total USDC they've withdrawn
  currentBalance: bigint;      // Current balance (deposits - withdrawals)
  weeklyGoal: bigint;          // How much they want to save per week
  safetyBuffer: bigint;        // Minimum balance to keep in their wallet
  lastSaveTimestamp: bigint;   // When they last saved (for rate limiting)
  isActive: boolean;           // Is the account active?
  trustMode: 0 | 1;            // 0 = MANUAL, 1 = AUTO
}

// API request to save money
export interface SaveRequest {
  user: string;                // Ethereum address of user
  amount: string;              // USDC amount like "25.50"
}

// Generic API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;            // Did it work?
  data?: T;                    // The actual data (if success)
  error?: string;              // Error message (if failed)
}

// x402 payment payload (we'll implement this later)
export interface X402PaymentPayload {
  scheme: string;
  network: string;
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  v: number;
  r: string;
  s: string;
}

// x402 verification response (we'll implement this later)
export interface X402VerifyResponse {
  isValid: boolean;
  transactionHash?: string;
  error?: string;
}