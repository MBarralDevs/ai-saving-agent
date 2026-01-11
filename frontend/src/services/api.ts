import type {
  UserAccount,
  PaymentChallenge,
  SaveSuccessResponse,
  ApiErrorResponse,
} from '../types';

// Get API URL from environment variable, fallback to localhost
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Backend API client
 * 
 * This is our "bridge" to the backend Express server
 * All HTTP requests go through these functions
 */
export const api = {
  /**
   * Get user account info
   * 
   * Calls: GET /api/user/:address
   * Returns: Account balance, goals, trust mode, etc.
   * 
   * Example:
   *   const account = await api.getUserAccount('0xABC123...');
   *   console.log(account.account.currentBalance); // "25.00"
   */
  async getUserAccount(address: string): Promise<UserAccount> {
    const res = await fetch(`${API_BASE}/api/user/${address}`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch user account: ${res.statusText}`);
    }
    
    const data = await res.json();
    // Backend wraps response in { success: true, data: {...} }
    return data.data;
  },

  /**
   * Trigger save (with optional payment)
   * 
   * Calls: POST /api/save
   * 
   * Flow:
   * 1. First call (no payment) -> Returns 402 PaymentChallenge
   * 2. User signs payment in MetaMask
   * 3. Second call (with payment) -> Returns SaveSuccessResponse
   * 
   * @param user - User's wallet address
   * @param amount - Amount to save (e.g. "25.00")
   * @param paymentHeader - Optional: Base64 payment header from SDK
   * @param paymentId - Optional: Payment ID from 402 challenge
   */
  async triggerSave(
    user: string,
    amount: string,
    paymentHeader?: string,
    paymentId?: string
  ): Promise<PaymentChallenge | SaveSuccessResponse | ApiErrorResponse> {
    // Build headers object
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // If we have a payment header, add it
    // This tells backend: "I'm paying!"
    if (paymentHeader) {
      headers['X-PAYMENT'] = paymentHeader;
    }
    
    // If we have a payment ID, add it
    // This tells backend: "This is the payment you asked for"
    if (paymentId) {
      headers['X-PAYMENT-ID'] = paymentId;
    }

    const res = await fetch(`${API_BASE}/api/save`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user, amount }),
    });

    // Parse response (could be 402 challenge, success, or error)
    return res.json();
  },

  /**
   * Health check
   * 
   * Calls: GET /api/health
   * Returns: Service status, network info, etc.
   * 
   * Useful for checking if backend is running
   */
  async healthCheck() {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.json();
  },
};