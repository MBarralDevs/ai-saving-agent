import { Router, Request, Response } from 'express';
import { BlockchainService } from '../services/blockchain.service';
import { DecisionEngine } from '../agent/decision-engine';
import { DecisionStrategy } from '../agent/types';

const router = Router();
const blockchainService = new BlockchainService();

/**
 * GET /api/ai/analyze/:address
 * 
 * Get AI analysis for a user without executing save
 * Shows what the AI would decide
 */
router.get('/analyze/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address',
      });
    }

    // Get user's financial state
    const account = await blockchainService.getUserAccount(address);
    const canSave = await blockchainService.canAutoSave(address);
    const walletBalance = await blockchainService.getWalletUsdcBalance(address);

    const now = Math.floor(Date.now() / 1000);
    const lastSave = Number(account.lastSaveTimestamp);
    const timeSinceLastSave = lastSave === 0 ? 0 : (now - lastSave) / 3600;

    const financialState = {
      walletBalance,
      currentSavings: account.currentBalance,
      weeklyGoal: account.weeklyGoal,
      safetyBuffer: account.safetyBuffer,
      lastSaveTimestamp: account.lastSaveTimestamp,
      trustMode: account.trustMode === 0n ? 'MANUAL' as const : 'AUTO' as const,  // Fix: Use 0n
      isActive: account.isActive,
      canAutoSave: canSave,
      timeSinceLastSave,
    };

    // Get AI decision
    const decisionEngine = new DecisionEngine({
      strategy: DecisionStrategy.BALANCED,
    });

    const decision = decisionEngine.decide(financialState);

    // Format response
    res.json({
      success: true,
      data: {
        address,
        financialState: {
          walletBalance: blockchainService.formatUsdcAmount(walletBalance),
          currentSavings: blockchainService.formatUsdcAmount(account.currentBalance),
          weeklyGoal: blockchainService.formatUsdcAmount(account.weeklyGoal),
          safetyBuffer: blockchainService.formatUsdcAmount(account.safetyBuffer),
          timeSinceLastSave: timeSinceLastSave.toFixed(1) + ' hours',
          canAutoSave: canSave,
        },
        aiDecision: {
          shouldSave: decision.shouldSave,
          amount: blockchainService.formatUsdcAmount(decision.amount),
          reason: decision.reason,
          confidence: (decision.confidence * 100).toFixed(0) + '%',
          urgency: decision.urgency,
        },
        strategy: DecisionStrategy.BALANCED,
      },
    });

  } catch (error: any) {
    console.error('Error analyzing account:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze account',
    });
  }
});

export default router;