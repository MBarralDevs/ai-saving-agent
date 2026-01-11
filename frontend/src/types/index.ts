import type { CronosNetwork, Contract } from '@crypto.com/facilitator-client';

/**
 * User account data from backend GET /api/user/:address
 * 
 * This matches exactly what our backend returns
 */
export interface UserAccount {
  address: string;
  account: {
    totalDeposited: string;      // e.g. "0.00"
    totalWithdrawn: string;       // e.g. "0.00"
    currentBalance: string;       // e.g. "0.00"
    weeklyGoal: string;           // e.g. "25.00"
    safetyBuffer: string;         // e.g. "100.00"
    lastSaveTimestamp: string;    // Unix timestamp as string
    isActive: boolean;            // Account active?
    trustMode: 'MANUAL' | 'AUTO'; // Trust mode
  };
  totalBalance: string;           // Wallet USDC balance e.g. "500.00"
  canAutoSave: boolean;           // Can save now? (rate limit check)
}

/**
 * Payment requirements from 402 response
 * 
 * This is what the backend sends when we try to save without payment
 */
export interface PaymentRequirements {
  scheme: 'exact';                // Payment scheme (always "exact")
  network: CronosNetwork;         // e.g. "cronos-testnet"
  payTo: string;                  // Vault address (receives payment)
  asset: Contract;                // USDC contract enum
  maxAmountRequired: string;      // Amount in smallest unit "25000000"
  maxTimeoutSeconds: number;      // How long user has to pay (300 = 5 min)
  description: string;            // Human-readable description
  resource: string;               // API endpoint URL
  mimeType: string;               // Response type "application/json"
  extra?: {
    paymentId?: string;           // Unique payment ID from backend
  };
}

/**
 * 402 Payment Challenge from backend
 * 
 * This is returned when POST /api/save without X-PAYMENT header
 */
export interface PaymentChallenge {
  success: false;
  error: 'payment_required';
  paymentId: string;              // We need to send this back
  paymentRequirements: PaymentRequirements;
}

/**
 * Successful save response from backend
 * 
 * This is returned when POST /api/save WITH valid payment
 */
export interface SaveSuccessResponse {
  success: true;
  data: {
    paymentId: string;            // Payment ID that was used
    paymentTxHash: string;        // x402 settlement transaction
    depositTxHash: string;        // Vault deposit transaction
    user: string;                 // User address
    amount: string;               // Amount saved "25.00"
    amountInSmallestUnit: string; // Amount in base units "25000000"
  };
}

/**
 * API Error response from backend
 */
export interface ApiErrorResponse {
  success: false;
  error: string;                  // Error message
  details?: unknown;              // Optional error details
}