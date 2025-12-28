export interface UserAccount {
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  currentBalance: bigint;
  weeklyGoal: bigint;
  safetyBuffer: bigint;
  lastSaveTimestamp: bigint;
  isActive: boolean;
  trustMode: 0 | 1; // 0 = MANUAL, 1 = AUTO
}

export interface SaveRequest {
  user: string;
  amount: string; // USDC amount in human-readable format (e.g., "25.50")
}

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

export interface X402VerifyResponse {
  isValid: boolean;
  transactionHash?: string;
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}