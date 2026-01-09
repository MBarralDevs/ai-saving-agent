/**
 * Types for AI Agent decision making
 */

/**
 * User's financial state for decision making
 */
export interface UserFinancialState {
  // Wallet balance
  walletBalance: bigint;         // USDC in user's wallet
  
  // Account data from vault
  currentSavings: bigint;        // Already saved in vault
  weeklyGoal: bigint;            // Target to save per week
  safetyBuffer: bigint;          // Minimum to keep in wallet
  lastSaveTimestamp: bigint;     // Last time they saved
  trustMode: 'MANUAL' | 'AUTO';  // Requires approval or auto?
  isActive: boolean;             // Is account active?
  
  // Calculated fields
  canAutoSave: boolean;          // Passed rate limit?
  timeSinceLastSave: number;     // Hours since last save
}

/**
 * AI's decision output
 */
export interface SaveDecision {
  shouldSave: boolean;           // Should we save now?
  amount: bigint;                // How much to save (0 if shouldn't)
  reason: string;                // Why this decision?
  confidence: number;            // 0-1 confidence score
  urgency: 'low' | 'medium' | 'high';  // How urgent is this save?
}

/**
 * Decision strategy
 */
export enum DecisionStrategy {
  CONSERVATIVE = 'conservative',   // Only save when well above buffer
  BALANCED = 'balanced',           // Standard approach
  AGGRESSIVE = 'aggressive',       // Save as much as possible
}

/**
 * Decision context
 */
export interface DecisionContext {
  strategy: DecisionStrategy;
  minSaveAmount: bigint;          // Minimum worth saving (e.g., 1 USDC)
  maxSavePercentage: number;      // Max % of available funds (e.g., 0.5 = 50%)
}