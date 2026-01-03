import { 
  Facilitator, 
  CronosNetwork, 
  PaymentRequirements,
  VerifyRequest,
  X402VerifyResponse,
  X402SettleResponse,
  Scheme,
  Contract
} from '@crypto.com/facilitator-client';
import { config } from '../config/env';

/**
 * X402Service
 * 
 * Handles Cronos x402 Facilitator integration for gasless USDC payments.
 * 
 * Flow:
 * 1. User signs EIP-3009 authorization off-chain (free)
 * 2. Frontend sends signed payload in X-PAYMENT header
 * 3. Backend verifies signature via Facilitator
 * 4. Backend settles payment on-chain via Facilitator
 * 5. USDC transferred to vault, Facilitator pays gas
 * 
 * Based on Cronos x402 Hackathon examples:
 * https://github.com/cronos-labs/x402-examples
 */
export class X402Service {
  private facilitator: Facilitator;
  private network: CronosNetwork;
  private assetContract: Contract;

  constructor() {
    // Determine network from chain ID
    this.network = (config.cronosChainId === 338 
      ? CronosNetwork.CronosTestnet 
      : CronosNetwork.CronosMainnet) as CronosNetwork;

    // Determine asset contract based on network
    // Testnet uses DevUSDCe, Mainnet uses USDCe
    this.assetContract = this.network === CronosNetwork.CronosTestnet
      ? Contract.DevUSDCe
      : Contract.USDCe;

    // Initialize Facilitator SDK
    this.facilitator = new Facilitator({ 
      network: this.network 
    });

    console.log('✅ x402 service initialized');
    console.log('Network:', this.network);
    console.log('Asset:', this.assetContract);
  }

  /**
   * Verify and settle x402 payment
   * 
   * Two-step process:
   * 1. verifyPayment() - validates EIP-3009 signature
   * 2. settlePayment() - executes USDC transfer on-chain
   * 
   * @param paymentId - Unique payment identifier
   * @param paymentHeader - Base64-encoded payment payload from X-PAYMENT header
   * @param paymentRequirements - Requirements sent in 402 response
   */
  async verifyAndSettle(
    paymentId: string,
    paymentHeader: string,
    paymentRequirements: PaymentRequirements
  ): Promise<{ ok: boolean; txHash?: string; error?: string; details?: any }> {
    try {
      console.log('📝 Processing x402 payment:');
      console.log('  Payment ID:', paymentId);
      console.log('  Network:', this.network);

      // Build request body (required by Facilitator SDK)
      const body: VerifyRequest = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      };

      // Step 1: Verify signature
      const verify = (await this.facilitator.verifyPayment(body)) as X402VerifyResponse;
      
      if (!verify.isValid) {
        console.error('❌ Payment verification failed');
        return {
          ok: false,
          error: 'verify_failed',
          details: verify,
        };
      }

      console.log('✅ Payment signature verified');

      // Step 2: Settle on-chain
      const settle = (await this.facilitator.settlePayment(body)) as X402SettleResponse;
      
      if (settle.event !== 'payment.settled') {
        console.error('❌ Payment settlement failed:', settle.event);
        return {
          ok: false,
          error: 'settle_failed',
          details: settle,
        };
      }

      console.log('✅ Payment settled successfully');
      console.log('Transaction hash:', settle.txHash);

      return {
        ok: true,
        txHash: settle.txHash,
      };
    } catch (error: any) {
      console.error('❌ Error in x402 payment flow:', error);
      return {
        ok: false,
        error: error.message || 'Payment processing failed',
      };
    }
  }

  /**
   * Parse X-PAYMENT header
   * 
   * Decodes base64-encoded JSON payment payload.
   * 
   * Expected structure:
   * {
   *   scheme: "exact",
   *   network: "eip155:338",
   *   from: "0xUser...",
   *   to: "0xVault...",
   *   value: "25000000",
   *   validAfter: 0,
   *   validBefore: 1234567890,
   *   nonce: "0xRandomNonce...",
   *   v: 27,
   *   r: "0x...",
   *   s: "0x..."
   * }
   */
  parsePaymentHeader(headerValue: string): any | null {
    try {
      const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);

      // Validate required fields
      const required = [
        'scheme',
        'network',
        'from',
        'to',
        'value',
        'nonce',
        'v',
        'r',
        's',
      ];

      for (const field of required) {
        if (!payload[field]) {
          console.error(`Missing required field: ${field}`);
          return null;
        }
      }

      return payload;
    } catch (error) {
      console.error('❌ Error parsing payment header:', error);
      return null;
    }
  }

  /**
   * Create 402 Payment Required response
   * 
   * Returns payment requirements that tell frontend:
   * - What network to use
   * - Where to send payment
   * - How much to pay
   * - Payment deadline
   * 
   * Frontend uses this to generate EIP-3009 signature.
   */
  createPaymentRequirements(
    amount: string,
    paymentId: string
  ): PaymentRequirements {
    return {
      scheme: Scheme.Exact, // Use Scheme enum
      network: this.network,
      payTo: config.savingsVaultAddress,
      asset: this.assetContract, // Use Contract enum
      maxAmountRequired: amount,
      maxTimeoutSeconds: 300,
      description: 'AI Savings Agent - Auto-save deposit',
      resource: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/api/save`,
      mimeType: 'application/json',
      extra: { paymentId },
    };
  }

  /**
   * Get configured network
   */
  getNetwork(): CronosNetwork {
    return this.network;
  }

  /**
   * Get asset contract being used
   */
  getAssetContract(): Contract {
    return this.assetContract;
  }
}