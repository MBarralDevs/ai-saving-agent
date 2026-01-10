import { ethers } from 'ethers';

/**
 * EIP-3009: Transfer With Authorization
 * 
 * Standard for gasless token transfers using signed authorizations.
 * Originally created by Circle for USDC.
 * 
 * Specification: https://eips.ethereum.org/EIPS/eip-3009
 */

/**
 * EIP-712 Domain for USDC contract
 * This identifies the contract and chain
 */
export interface EIP712Domain {
  name: string;           // Token name (e.g., "USD Coin")
  version: string;        // Version (usually "2")
  chainId: number;        // Chain ID (338 for Cronos testnet)
  verifyingContract: string; // USDC contract address
}

/**
 * TransferWithAuthorization parameters
 * This is what gets signed
 */
export interface TransferWithAuthorization {
  from: string;           // User's address (who's sending)
  to: string;             // Vault address (who's receiving)
  value: string;          // Amount in smallest unit (6 decimals)
  validAfter: string;     // Timestamp after which signature is valid
  validBefore: string;    // Timestamp before which signature is valid
  nonce: string;          // Unique nonce (prevents replay attacks)
}

/**
 * EIP-712 typed data structure
 * This is what ethers.signTypedData expects
 */
export interface EIP712TypedData {
  domain: EIP712Domain;
  types: {
    TransferWithAuthorization: Array<{ name: string; type: string }>;
  };
  primaryType: string;
  message: TransferWithAuthorization;
}

/**
 * EIP-3009 signature components
 */
export interface EIP3009Signature {
  v: number;              // Recovery parameter
  r: string;              // First 32 bytes of signature
  s: string;              // Second 32 bytes of signature
}

/**
 * Complete authorization with signature
 */
export interface SignedAuthorization extends TransferWithAuthorization, EIP3009Signature {}

/**
 * Get EIP-712 domain for USDC on Cronos
 */
export function getUSDCDomain(chainId: number, usdcAddress: string): EIP712Domain {
  return {
    name: chainId === 338 ? 'DevUSDCe' : 'USDCe', // Testnet vs Mainnet
    version: '2',
    chainId,
    verifyingContract: usdcAddress,
  };
}

/**
 * Get EIP-712 types for TransferWithAuthorization
 * This defines the structure of what we're signing
 */
export function getEIP712Types() {
  return {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };
}

/**
 * Generate a random nonce for authorization
 * Must be unique to prevent replay attacks
 */
export function generateNonce(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

/**
 * Create EIP-712 typed data for signing
 */
export function createTypedData(
  domain: EIP712Domain,
  authorization: TransferWithAuthorization
): EIP712TypedData {
  return {
    domain,
    types: getEIP712Types(),
    primaryType: 'TransferWithAuthorization',
    message: authorization,
  };
}

/**
 * Parse signature into v, r, s components
 */
export function parseSignature(signature: string): EIP3009Signature {
  const sig = ethers.Signature.from(signature);
  
  return {
    v: sig.v,
    r: sig.r,
    s: sig.s,
  };
}