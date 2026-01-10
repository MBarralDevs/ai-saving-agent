import { DecisionEngine } from '../agent/decision-engine';
import { UserFinancialState, DecisionStrategy } from '../agent/types';

/**
 * Test decision engine with various scenarios
 */
function testDecisionEngine() {
  console.log('🧪 Testing Decision Engine');
  console.log('================================\n');

  const engine = new DecisionEngine();

  // Test Case 1: Comfortable balance
  console.log('Test Case 1: Comfortable Balance');
  const state1: UserFinancialState = {
    walletBalance: BigInt(1000_000_000), // 1000 USDC
    currentSavings: BigInt(100_000_000),  // 100 USDC saved
    weeklyGoal: BigInt(25_000_000),       // 25 USDC goal
    safetyBuffer: BigInt(100_000_000),    // 100 USDC buffer
    lastSaveTimestamp: BigInt(0),
    trustMode: 'AUTO',
    isActive: true,
    canAutoSave: true,
    timeSinceLastSave: 48, // 2 days
  };
  const decision1 = engine.decide(state1);

  // Test Case 2: Low balance
  console.log('Test Case 2: Low Balance');
  const state2: UserFinancialState = {
    ...state1,
    walletBalance: BigInt(110_000_000), // 110 USDC
  };
  const decision2 = engine.decide(state2);

  // Test Case 3: Manual mode
  console.log('Test Case 3: Manual Mode (Should Skip)');
  const state3: UserFinancialState = {
    ...state1,
    trustMode: 'MANUAL',
  };
  const decision3 = engine.decide(state3);

  // Test Case 4: Rate limited
  console.log('Test Case 4: Rate Limited (Should Skip)');
  const state4: UserFinancialState = {
    ...state1,
    canAutoSave: false,
  };
  const decision4 = engine.decide(state4);

  // Test Case 5-7: Strategy Comparison with HIGH weekly goal
  console.log('═══════════════════════════════════════');
  console.log('Strategy Comparison (High Weekly Goal)');
  console.log('═══════════════════════════════════════\n');

  const highGoalState: UserFinancialState = {
    walletBalance: BigInt(1000_000_000), // 1000 USDC
    currentSavings: BigInt(100_000_000),  // 100 USDC saved
    weeklyGoal: BigInt(500_000_000),      // 500 USDC goal (HIGH!)
    safetyBuffer: BigInt(100_000_000),    // 100 USDC buffer
    lastSaveTimestamp: BigInt(0),
    trustMode: 'AUTO',
    isActive: true,
    canAutoSave: true,
    timeSinceLastSave: 48,
  };

  console.log('Test Case 5: Conservative Strategy');
  engine.setContext({ strategy: DecisionStrategy.CONSERVATIVE });
  const decision5 = engine.decide(highGoalState);
  console.log(`→ Will save: ${(Number(decision5.amount) / 1_000_000).toFixed(2)} USDC\n`);

  console.log('Test Case 6: Balanced Strategy');
  engine.setContext({ strategy: DecisionStrategy.BALANCED });
  const decision6 = engine.decide(highGoalState);
  console.log(`→ Will save: ${(Number(decision6.amount) / 1_000_000).toFixed(2)} USDC\n`);

  console.log('Test Case 7: Aggressive Strategy');
  engine.setContext({ strategy: DecisionStrategy.AGGRESSIVE });
  const decision7 = engine.decide(highGoalState);
  console.log(`→ Will save: ${(Number(decision7.amount) / 1_000_000).toFixed(2)} USDC\n`);

  // Test Case 8: Very low balance (should skip)
  console.log('Test Case 8: Very Low Balance (Below Buffer)');
  const state8: UserFinancialState = {
    ...state1,
    walletBalance: BigInt(50_000_000), // 50 USDC (below buffer!)
  };
  const decision8 = engine.decide(state8);

  // Test Case 9: Urgent save (hasn't saved in a week)
  console.log('Test Case 9: Urgent Save (No save in 8 days)');
  const state9: UserFinancialState = {
    ...state1,
    timeSinceLastSave: 192, // 8 days (192 hours)
  };
  const decision9 = engine.decide(state9);

  console.log('═══════════════════════════════════════');
  console.log('📊 Summary of Results');
  console.log('═══════════════════════════════════════');
  console.log(`Case 1 (Comfortable): ${decision1.shouldSave ? 'SAVE' : 'SKIP'} ${(Number(decision1.amount) / 1_000_000).toFixed(2)} USDC`);
  console.log(`Case 2 (Low balance): ${decision2.shouldSave ? 'SAVE' : 'SKIP'} ${(Number(decision2.amount) / 1_000_000).toFixed(2)} USDC`);
  console.log(`Case 3 (Manual mode): ${decision3.shouldSave ? 'SAVE' : 'SKIP'} - ${decision3.reason}`);
  console.log(`Case 4 (Rate limit): ${decision4.shouldSave ? 'SAVE' : 'SKIP'} - ${decision4.reason}`);
  console.log(`Case 5 (Conservative): ${decision5.shouldSave ? 'SAVE' : 'SKIP'} ${(Number(decision5.amount) / 1_000_000).toFixed(2)} USDC`);
  console.log(`Case 6 (Balanced): ${decision6.shouldSave ? 'SAVE' : 'SKIP'} ${(Number(decision6.amount) / 1_000_000).toFixed(2)} USDC`);
  console.log(`Case 7 (Aggressive): ${decision7.shouldSave ? 'SAVE' : 'SKIP'} ${(Number(decision7.amount) / 1_000_000).toFixed(2)} USDC`);
  console.log(`Case 8 (Below buffer): ${decision8.shouldSave ? 'SAVE' : 'SKIP'} ${(Number(decision8.amount) / 1_000_000).toFixed(2)} USDC`);
  console.log(`Case 9 (Urgent): ${decision9.shouldSave ? 'SAVE' : 'SKIP'} ${(Number(decision9.amount) / 1_000_000).toFixed(2)} USDC - Urgency: ${decision9.urgency}`);

  console.log('\n🎉 All decision engine tests completed!\n');
}

// Run tests
testDecisionEngine();