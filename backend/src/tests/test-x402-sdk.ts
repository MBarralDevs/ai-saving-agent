import { Facilitator, CronosNetwork, Scheme, Contract } from '@crypto.com/facilitator-client';

async function testSDK() {
  console.log('🧪 Testing x402 Facilitator SDK directly\n');

  const facilitator = new Facilitator({
    network: CronosNetwork.CronosTestnet,
  });

  // Minimal payment requirements
  const paymentRequirements = {
    scheme: Scheme.Exact,
    network: CronosNetwork.CronosTestnet,
    payTo: '0x349bC1BD3BB0A0A82468a56EA4Df85Ca24f3869c',
    asset: Contract.DevUSDCe,
    maxAmountRequired: '1000000', // 1 USDC
    maxTimeoutSeconds: 300,
    description: 'Test payment',
    resource: 'http://localhost:3000/api/save',
    mimeType: 'application/json',
  };

  // Create a minimal valid payment header
  const paymentData = {
    scheme: 'exact',
    network: 'eip155:338',
    from: '0x7ecFe3EBCd86c30f78F2920063fE9F4e5aa7C831',
    to: '0x349bC1BD3BB0A0A82468a56EA4Df85Ca24f3869c',
    value: '1000000',
    validAfter: 0,
    validBefore: Math.floor(Date.now() / 1000) + 3600,
    nonce: '0x' + '1'.repeat(64),
    v: 27,
    r: '0x' + 'a'.repeat(64),
    s: '0x' + 'b'.repeat(64),
  };

  const paymentHeader = Buffer.from(JSON.stringify(paymentData)).toString('base64');

  console.log('📝 Payment header (base64):', paymentHeader.substring(0, 50) + '...');
  console.log('📝 Decoded:', JSON.stringify(paymentData, null, 2));

  try {
    console.log('\n🔍 Calling facilitator.verifyPayment()...\n');
    
    const result = await facilitator.verifyPayment({
      x402Version: 1,
      paymentHeader,
      paymentRequirements,
    });

    console.log('✅ SDK Response:', result);
  } catch (error: any) {
    console.error('❌ SDK Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSDK();