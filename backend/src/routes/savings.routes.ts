import { Router } from 'express';
import { Request, Response } from 'express';
import { BlockchainService } from '../services/blockchain.service';
import { X402Service } from '../services/x402.service';
import { ApiResponse } from '../types';
import crypto from 'crypto';

const router = Router();

// Initialize services
const blockchainService = new BlockchainService();
const x402Service = new X402Service();

// In-memory payment tracking
// In production, use Redis or database
const pendingPayments = new Map<string, { settled: boolean; txHash?: string; at: number }>();

/**
 * GET /api/health
 * 
 * Health check endpoint
 * Returns service status and configuration
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'healthy',
        service: 'AI Savings Agent Backend',
        version: '1.0.0',
        network: x402Service.getNetwork(),
        backendWallet: blockchainService.getBackendAddress(),
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Health check failed',
    });
  }
});

/**
 * GET /api/user/:address
 * 
 * Get user account details from smart contract
 * Includes balance, goals, trust mode, etc.
 */
router.get('/user/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address',
      });
    }

    // Get account from blockchain
    const account = await blockchainService.getUserAccount(address);
    const totalBalance = await blockchainService.getUserTotalBalance(address);
    const canSave = await blockchainService.canAutoSave(address);

    // Format amounts for display
    const response: ApiResponse = {
      success: true,
      data: {
        address,
        account: {
          totalDeposited: blockchainService.formatUsdcAmount(account.totalDeposited),
          totalWithdrawn: blockchainService.formatUsdcAmount(account.totalWithdrawn),
          currentBalance: blockchainService.formatUsdcAmount(account.currentBalance),
          weeklyGoal: blockchainService.formatUsdcAmount(account.weeklyGoal),
          safetyBuffer: blockchainService.formatUsdcAmount(account.safetyBuffer),
          lastSaveTimestamp: account.lastSaveTimestamp.toString(),
          isActive: account.isActive,
          trustMode: account.trustMode === 0 ? 'MANUAL' : 'AUTO',
        },
        totalBalance: blockchainService.formatUsdcAmount(totalBalance),
        canAutoSave: canSave,
      },
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching user account:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user account',
    });
  }
});

/**
 * POST /api/save
 * 
 * Main endpoint for x402 payment flow
 * 
 * Flow:
 * 1. Check if X-PAYMENT header present
 * 2. If not, return 402 with payment requirements
 * 3. If yes, verify and settle payment
 * 4. Credit user's account via depositFor()
 */
router.post('/api/save', async (req: Request, res: Response) => {
  try {
    const { user, amount } = req.body;

    // Validate request body
    if (!user || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user, amount',
      });
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user address',
      });
    }

    // Validate amount is positive number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
      });
    }

    // Check if user can auto-save (rate limit)
    const canSave = await blockchainService.canAutoSave(user);
    if (!canSave) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please wait 24 hours between saves.',
      });
    }

    // Convert amount to smallest unit (6 decimals)
    const amountInSmallestUnit = blockchainService.parseUsdcAmount(amount).toString();

    // Check for X-PAYMENT header
    const paymentHeader = req.header('X-PAYMENT');
    const paymentId = req.header('X-PAYMENT-ID') || `pay_${crypto.randomUUID()}`;

    // If no payment header, return 402 with requirements
    if (!paymentHeader) {
      console.log('💳 No payment header, returning 402');
      
      const paymentRequirements = x402Service.createPaymentRequirements(
        amountInSmallestUnit,
        paymentId
      );

      return res.status(402).json({
        success: false,
        error: 'payment_required',
        paymentId,
        paymentRequirements,
      });
    }

    // Payment header present - verify and settle
    console.log('💰 Payment header received, processing...');

    // Check if payment already settled
    const existingPayment = pendingPayments.get(paymentId);
    if (existingPayment?.settled) {
      return res.status(400).json({
        success: false,
        error: 'Payment already processed',
        txHash: existingPayment.txHash,
      });
    }

    // Create payment requirements (what we expect)
    const paymentRequirements = x402Service.createPaymentRequirements(
      amountInSmallestUnit,
      paymentId
    );

    // Verify and settle payment via x402 Facilitator
    const paymentResult = await x402Service.verifyAndSettle(
      paymentId,
      paymentHeader,
      paymentRequirements
    );

    if (!paymentResult.ok) {
      console.error('❌ Payment failed:', paymentResult.error);
      return res.status(400).json({
        success: false,
        error: paymentResult.error,
        details: paymentResult.details,
      });
    }

    console.log('✅ Payment settled:', paymentResult.txHash);

    // Mark payment as settled
    pendingPayments.set(paymentId, {
      settled: true,
      txHash: paymentResult.txHash,
      at: Date.now(),
    });

    // Credit user's account in vault
    // USDC is already in vault (transferred via x402)
    // We just need to update accounting
    const depositReceipt = await blockchainService.depositFor(
      user,
      BigInt(amountInSmallestUnit)
    );

    console.log('✅ Account credited:', depositReceipt.hash);

    // Return success response
    const response: ApiResponse = {
      success: true,
      data: {
        paymentId,
        paymentTxHash: paymentResult.txHash,
        depositTxHash: depositReceipt.hash,
        user,
        amount,
        amountInSmallestUnit,
      },
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ Error in /api/save:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process save request',
    });
  }
});

export default router;