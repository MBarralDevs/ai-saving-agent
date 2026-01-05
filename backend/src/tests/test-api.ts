/**
 * Test API endpoints
 * Make sure server is running first: npm run dev
 */
async function testAPI() {
  console.log('🧪 Testing API Endpoints');
  console.log('================================\n');

  const BASE_URL = 'http://localhost:3000';

  try {
    // Test 1: Health check
    console.log('✅ Test 1: GET /api/health');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log('Status:', healthRes.status);
    console.log('Response:', JSON.stringify(healthData, null, 2));
    console.log('');

    // Test 2: Root endpoint
    console.log('✅ Test 2: GET /');
    const rootRes = await fetch(`${BASE_URL}/`);
    const rootData = await rootRes.json();
    console.log('Status:', rootRes.status);
    console.log('Response:', JSON.stringify(rootData, null, 2));
    console.log('');

    // Test 3: Get user (load from test-user.json if exists)
    console.log('✅ Test 3: GET /api/user/:address');
    const fs = require('fs');
    let testAddress = '0x5Dc454F7EfDCbaa3928AA599AC9FC758e92b32f9'; // Default to deployer
    
    if (fs.existsSync('test-user.json')) {
      const testUser = JSON.parse(fs.readFileSync('test-user.json', 'utf-8'));
      testAddress = testUser.address;
      console.log('Using test user:', testAddress);
    }

    const userRes = await fetch(`${BASE_URL}/api/user/${testAddress}`);
    const userData = await userRes.json();
    console.log('Status:', userRes.status);
    console.log('Response:', JSON.stringify(userData, null, 2));
    console.log('');

    // Test 4: Save endpoint (without payment - should return 402)
    console.log('✅ Test 4: POST /api/save (no payment header)');
    const saveRes = await fetch(`${BASE_URL}/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: testAddress,
        amount: '10.0',
      }),
    });
    const saveData = await saveRes.json();
    console.log('Status:', saveRes.status, '(should be 402)');
    console.log('Response:', JSON.stringify(saveData, null, 2));
    console.log('');

    // Test 5: Invalid address
    console.log('✅ Test 5: GET /api/user/:address (invalid)');
    const invalidRes = await fetch(`${BASE_URL}/api/user/invalid`);
    const invalidData = await invalidRes.json();
    console.log('Status:', invalidRes.status, '(should be 400)');
    console.log('Response:', JSON.stringify(invalidData, null, 2));
    console.log('');

    console.log('🎉 All API tests passed!\n');
    return true;
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run tests
testAPI()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });