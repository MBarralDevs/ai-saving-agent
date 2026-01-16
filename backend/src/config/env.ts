import dotenv from 'dotenv';

// Load .env file into process.env
dotenv.config();

// Export a config object with all our settings
export const config = {
  // Server settings
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Cronos blockchain settings
  cronosRpcUrl: process.env.CRONOS_RPC_URL || 'https://evm-t3.cronos.org',
  cronosChainId: parseInt(process.env.CRONOS_CHAIN_ID || '338'),
  
  // Our deployed contract addresses
  savingsVaultAddress: process.env.SAVINGS_VAULT_ADDRESS || '',
  usdcAddress: process.env.USDC_ADDRESS || '',
  
  // VVS Yield Strategy
  vvsYieldStrategyAddress: process.env.VVS_YIELD_STRATEGY_ADDRESS || '',
  usdtAddress: process.env.USDT_ADDRESS || '',
  vvsRouterAddress: process.env.VVS_ROUTER_ADDRESS || '',
  usdcUsdtPairAddress: process.env.USDC_USDT_PAIR_ADDRESS || '',
  
  // Backend wallet private key
  backendPrivateKey: process.env.BACKEND_PRIVATE_KEY || '',
  
  // x402 (we'll use later)
  x402FacilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://x402-facilitator.cronos.org',
  
  // Security
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

// Function to check if all required env vars are present
export function validateConfig() {
  const required = [
    'CRONOS_RPC_URL',
    'SAVINGS_VAULT_ADDRESS',
    'USDC_ADDRESS',
    'BACKEND_PRIVATE_KEY',
  ];

  // Find missing variables
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}