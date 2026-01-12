import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

/**
 * Props for WalletConnect component
 */
interface WalletConnectProps {
  onConnect: (address: string) => void;  // Callback when wallet connects
}

/**
 * WalletConnect Component
 * 
 * Responsibilities:
 * - Show "Connect MetaMask" button if not connected
 * - Show connected address if already connected
 * - Auto-detect if user is already connected (on page load)
 * - Call onConnect callback with user's address
 */
export function WalletConnect({ onConnect }: WalletConnectProps) {
  // State: user's wallet address (null if not connected)
  const [address, setAddress] = useState<string | null>(null);
  
  // State: is connection in progress?
  const [isConnecting, setIsConnecting] = useState(false);

  /**
   * Effect: Check if wallet is already connected on component mount
   * 
   * Why? If user already connected before, we want to auto-detect it
   * without making them click "Connect" again
   */
  useEffect(() => {
    checkConnection();
  }, []); // Empty array = run once on mount

  /**
   * Check if MetaMask is already connected
   * 
   * How it works:
   * 1. Check if window.ethereum exists (MetaMask installed?)
   * 2. Get list of accounts (without triggering popup)
   * 3. If accounts exist, user previously connected
   * 4. Auto-connect and call onConnect
   */
  const checkConnection = async () => {
    // No MetaMask? Skip
    if (!window.ethereum) return;

    try {
      // Create provider from MetaMask
      const provider = new BrowserProvider(window.ethereum);
      
      // Get accounts WITHOUT triggering MetaMask popup
      // This returns previously connected accounts
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        // User already connected before!
        const addr = accounts[0].address;
        setAddress(addr);
        onConnect(addr);  // Notify parent component
        console.log('✅ Auto-connected:', addr);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  /**
   * Connect to MetaMask (user clicked button)
   * 
   * How it works:
   * 1. Check MetaMask is installed
   * 2. Request account access (triggers MetaMask popup)
   * 3. Get signer and address
   * 4. Save address and call onConnect
   */
  const connect = async () => {
    // Check MetaMask is installed
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    try {
      setIsConnecting(true);  // Show loading state
      
      // Create provider from MetaMask
      const provider = new BrowserProvider(window.ethereum);
      
      // Request account access - THIS TRIGGERS THE METAMASK POPUP
      // If user rejects, this throws an error
      await provider.send('eth_requestAccounts', []);
      
      // Get signer (wallet that can sign transactions)
      const signer = await provider.getSigner();
      
      // Get address from signer
      const addr = await signer.getAddress();
      
      // Save to state
      setAddress(addr);
      
      // Notify parent component
      onConnect(addr);
      
      console.log('✅ Connected:', addr);
    } catch (error: any) {
      console.error('Connection error:', error);
      
      // User-friendly error message
      if (error.code === 4001) {
        alert('You rejected the connection request');
      } else {
        alert('Failed to connect wallet: ' + error.message);
      }
    } finally {
      setIsConnecting(false);  // Stop loading state
    }
  };

  /**
   * Render: If connected, show address
   */
  if (address) {
    return (
      <div style={{ 
        padding: '1rem', 
        background: '#f0f0f0', 
        borderRadius: '8px' 
      }}>
        <p style={{ margin: 0 }}>
          <strong>Connected:</strong>{' '}
          {/* Show shortened address: 0xABCD...1234 */}
          {address.slice(0, 6)}...{address.slice(-4)}
        </p>
      </div>
    );
  }

  /**
   * Render: If not connected, show connect button
   */
  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      style={{
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        background: '#5865F2',  // Discord-like purple
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: isConnecting ? 'not-allowed' : 'pointer',
        opacity: isConnecting ? 0.6 : 1,
      }}
    >
      {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
    </button>
  );
}