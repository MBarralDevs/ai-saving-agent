import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

/**
 * Props for WalletConnect component
 */
interface WalletConnectProps {
  onConnect: (address: string) => void;  // Callback when wallet connects
}

/**
 * Enhanced WalletConnect Component
 * 
 * Features:
 * - Beautiful connect button with gradient
 * - Animated connection status
 * - Better error handling
 * - Disconnect functionality
 * - Auto-detect existing connection
 */
export function WalletConnect({ onConnect }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  /**
   * Check if wallet is already connected on mount
   */
  useEffect(() => {
    checkConnection();
    
    // Listen for account changes - only if ethereum exists and has the methods
    if (window.ethereum?.on) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    if (window.ethereum?.on) {
      window.ethereum.on('chainChanged', () => window.location.reload());
    }

    return () => {
      // Clean up listeners - only if ethereum exists and has the method
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  /**
   * Handle account changes from MetaMask
   */
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected
      setAddress(null);
    } else if (accounts[0] !== address) {
      // User switched accounts
      const newAddress = accounts[0];
      setAddress(newAddress);
      onConnect(newAddress);
    }
  };

  /**
   * Check if MetaMask is already connected
   */
  const checkConnection = async () => {
    if (!window.ethereum) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        const addr = accounts[0].address;
        setAddress(addr);
        onConnect(addr);
        console.log('✅ Auto-connected:', addr);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  /**
   * Connect to MetaMask
   */
  const connect = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask! Visit https://metamask.io to get started.');
      return;
    }

    try {
      setIsConnecting(true);
      
      const provider = new BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      
      setAddress(addr);
      onConnect(addr);
      
      console.log('✅ Connected:', addr);
    } catch (error: any) {
      console.error('Connection error:', error);
      
      if (error.code === 4001) {
        alert('Connection rejected. Please try again and approve the connection.');
      } else {
        alert('Failed to connect: ' + error.message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Disconnect wallet
   */
  const disconnect = () => {
    setAddress(null);
    // Note: MetaMask doesn't have a true "disconnect" - user must do it from extension
    alert('To fully disconnect, please disconnect from MetaMask extension.');
  };

  /**
   * Render: Connected state
   */
  if (address) {
    return (
      <div style={{
        padding: '1.25rem 1.5rem',
        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(69, 160, 73, 0.1) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(76, 175, 80, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            ✅
          </div>
          <div>
            <p style={{ 
              margin: 0, 
              fontSize: '0.85rem', 
              color: '#4CAF50',
              fontWeight: '600',
            }}>
              Connected
            </p>
            <p style={{ 
              margin: 0, 
              fontFamily: 'monospace',
              fontSize: '1rem',
              fontWeight: '700',
              color: '#1a1a1a',
            }}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
        </div>
        
        <button
          onClick={disconnect}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            background: 'transparent',
            color: '#4CAF50',
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#4CAF50';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#4CAF50';
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  /**
   * Render: Not connected state
   */
  return (
    <div style={{
      padding: '1.5rem',
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
      borderRadius: '12px',
      border: '1px solid rgba(102, 126, 234, 0.2)',
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '0.5rem',
          animation: 'float 3s ease-in-out infinite',
        }}>
          🦊
        </div>
        <p style={{ 
          margin: 0, 
          color: '#666',
          fontSize: '0.95rem',
          marginBottom: '0.5rem',
        }}>
          Connect your MetaMask wallet to get started
        </p>
        <p style={{ 
          margin: 0, 
          color: '#999',
          fontSize: '0.85rem',
        }}>
          Make sure you're on Cronos Testnet
        </p>
      </div>
      
      <button
        onClick={connect}
        disabled={isConnecting}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          fontWeight: '700',
          background: isConnecting
            ? '#cccccc'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: isConnecting ? 'wait' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
          position: 'relative',
          minWidth: '200px',
        }}
        onMouseEnter={(e) => {
          if (!isConnecting) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isConnecting) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
          }
        }}
      >
        {isConnecting ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span className="loading-spinner" style={{
              width: '20px',
              height: '20px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTop: '3px solid white',
              borderRadius: '50%',
            }} />
            Connecting...
          </span>
        ) : (
          '🔗 Connect MetaMask'
        )}
      </button>
    </div>
  );
}