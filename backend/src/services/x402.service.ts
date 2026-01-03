import { Facilitator, CronosNetwork, PaymentRequirements } from '@crypto.com/facilitator-client';
import { config } from '../config/env';
import { X402PaymentPayload, X402VerifyResponse } from '../types';

/**
 * X402Service
 * 
 * Integrates with Cronos x402 Facilitator for gasless USDC payments.
 * 
 * Flow:
 * 1. User creates EIP-3009 signature off-chain (free)
 * 2. Frontend sends signature in X-PAYMENT header
 * 3. We verify and settle with Cronos Facilitator
 * 4. Facilitator executes USDC.transferWithAuthorization()
 * 5. USDC moves to vault, facilitator pays gas
 */
export class X402Service {
  private facilitator: Facilitator;
  private network: CronosNetwork;

  constructor() {
    // Determine network from config (cronos-testnet or cronos-mainnet)
    this.network = (config.cronosChainId === 338 
      ? 'cronos-testnet' 
      : 'cronos-mainnet') as CronosNetwork;

    // Initialize Facilitator SDK
    this.facilitator = new Facilitator({ 
      network: this.network 
    });

    console.log('✅ x402 service initialized');
    console.log('Network:', this.network);
  }}