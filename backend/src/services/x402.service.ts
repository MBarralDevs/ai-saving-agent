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

export class X402Service {
  private facilitator: Facilitator;
  private network: CronosNetwork;
  private assetContract: Contract;

  constructor() {
    this.network = (config.cronosChainId === 338 
      ? CronosNetwork.CronosTestnet 
      : CronosNetwork.CronosMainnet) as CronosNetwork;

    this.assetContract = this.network === CronosNetwork.CronosTestnet
      ? Contract.DevUSDCe
      : Contract.USDCe;

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
   * ✅ CORRECT: Keep paymentHeader as base64 string
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

      // Parse header for logging only (don't send parsed version)
      const parsed = this.parsePaymentHeader(paymentHeader);
      if (parsed) {
        console.log('  From:', parsed.from);
        console.log('  To:', parsed.to);
        console.log('  Value:', (parseInt(parsed.value) / 1_000_000).toFixed(2), 'USDC');
      }

      // Build request body - keep paymentHeader as base64 string
      const body: VerifyRequest = {
        x402Version: 1,
        paymentHeader,  // ✅ Keep as base64 string
        paymentRequirements,
      };

      // Step 1: Verify signature
      console.log('🔍 Verifying payment signature...');
      const verify = (await this.facilitator.verifyPayment(body)) as X402VerifyResponse;
      
      if (!verify.isValid) {
        console.error('❌ Payment verification failed');
        console.error('Reason:', verify.invalidReason);
        return {
          ok: false,
          error: 'verify_failed',
          details: verify,
        };
      }

      console.log('✅ Payment signature verified');

      // Step 2: Settle on-chain
      console.log('⛓️  Settling payment on-chain...');
      const settle = (await this.facilitator.settlePayment(body)) as X402SettleResponse;
      
      if (settle.event !== 'payment.settled') {
        console.error('❌ Payment settlement failed');
        console.error('Event:', settle.event);
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
        details: { 
          message: error.message,
          stack: error.stack 
        },
      };
    }
  }

  /**
   * Parse X-PAYMENT header for logging/validation
   */
  parsePaymentHeader(headerValue: string): any | null {
    try {
      const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);

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

      const missing = required.filter(field => !payload[field]);
      
      if (missing.length > 0) {
        console.error(`❌ Missing required fields: ${missing.join(', ')}`);
        return null;
      }

      return payload;
    } catch (error) {
      console.error('❌ Error parsing payment header:', error);
      return null;
    }
  }

  createPaymentRequirements(
    amount: string,
    paymentId: string
  ): PaymentRequirements {
    return {
      scheme: Scheme.Exact,
      network: this.network,
      payTo: config.savingsVaultAddress,
      asset: this.assetContract,
      maxAmountRequired: amount,
      maxTimeoutSeconds: 300,
      description: 'AI Savings Agent - Auto-save deposit',
      resource: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/api/save`,
      mimeType: 'application/json',
      extra: { paymentId },
    };
  }

  getNetwork(): CronosNetwork {
    return this.network;
  }

  getAssetContract(): Contract {
    return this.assetContract;
  }
}