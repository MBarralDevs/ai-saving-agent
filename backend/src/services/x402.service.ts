import { 
  CronosNetwork, 
  PaymentRequirements,
  Scheme,
  Contract
} from '@crypto.com/facilitator-client';
import { config } from '../config/env';
import axios from 'axios';

export class X402Service {
  private network: CronosNetwork;
  private assetContract: Contract;
  private facilitatorApiUrl: string;

  constructor() {
    this.network = (config.cronosChainId === 338 
      ? CronosNetwork.CronosTestnet 
      : CronosNetwork.CronosMainnet) as CronosNetwork;

    this.assetContract = this.network === CronosNetwork.CronosTestnet
      ? Contract.DevUSDCe
      : Contract.USDCe;

    // ✅ CORRECT API URL
    this.facilitatorApiUrl = 'https://facilitator.cronoslabs.org';

    console.log('✅ x402 service initialized (Direct API)');
    console.log('Network:', this.network);
    console.log('Asset:', this.assetContract);
    console.log('API URL:', this.facilitatorApiUrl);
  }

  /**
   * Verify and settle x402 payment using direct API calls
   */
  async verifyAndSettle(
    paymentId: string,
    paymentHeader: string,
    paymentRequirements: PaymentRequirements
  ): Promise<{ ok: boolean; txHash?: string; error?: string; details?: any }> {
    try {
      console.log('📝 Processing x402 payment (Direct API):');
      console.log('  Payment ID:', paymentId);
      console.log('  API:', this.facilitatorApiUrl);

      // Parse header for logging
      const parsed = this.parsePaymentHeader(paymentHeader);
      if (parsed) {
        console.log('  From:', parsed.from);
        console.log('  To:', parsed.to);
        console.log('  Value:', (parseInt(parsed.value) / 1_000_000).toFixed(2), 'USDC');
      }

      const requestBody = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      };

      // Step 1: Verify
      console.log('🔍 Verifying payment via API...');
      const verifyResponse = await axios.post(
        `${this.facilitatorApiUrl}/v1/payments/verify`,
        requestBody,
        {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true, // Don't throw on non-2xx
        }
      );

      console.log('Verify response status:', verifyResponse.status);
      console.log('Verify response data:', JSON.stringify(verifyResponse.data, null, 2));

      if (verifyResponse.status !== 200 || !verifyResponse.data.isValid) {
        return {
          ok: false,
          error: 'verify_failed',
          details: verifyResponse.data,
        };
      }

      console.log('✅ Payment verified');

      // Step 2: Settle
      console.log('⛓️  Settling payment via API...');
      const settleResponse = await axios.post(
        `${this.facilitatorApiUrl}/v1/payments/settle`,
        requestBody,
        {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true,
        }
      );

      console.log('Settle response status:', settleResponse.status);
      console.log('Settle response data:', JSON.stringify(settleResponse.data, null, 2));

      if (settleResponse.status !== 200 || settleResponse.data.event !== 'payment.settled') {
        return {
          ok: false,
          error: 'settle_failed',
          details: settleResponse.data,
        };
      }

      console.log('✅ Payment settled');
      console.log('TX Hash:', settleResponse.data.txHash);

      return {
        ok: true,
        txHash: settleResponse.data.txHash,
      };
    } catch (error: any) {
      console.error('❌ Error in x402 payment flow:', error);
      return {
        ok: false,
        error: error.message || 'Payment processing failed',
        details: { 
          message: error.message,
          response: error.response?.data,
        },
      };
    }
  }

  parsePaymentHeader(headerValue: string): any | null {
    try {
      const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);
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