import { useEffect, useState } from 'react';
import { BrowserProvider } from 'ethers';

interface WalletConnectProps {
  onConnect: (address: string) => void;
}

/**
 * WalletConnect Component - Pigment
 * 
 * Handles MetaMask wallet connection with beautiful UI
 */
export function WalletConnect({ onConnect }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-connect if already authorized
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) return;

      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();

      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        onConnect(address);
      }
    } catch (err) {
      console.error('Error checking wallet:', err);
    }
  };

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!window.ethereum) {
        setError('Please install MetaMask to use Pigment');
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      console.log('✅ Connected:', address);
      onConnect(address);
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        onConnect(accounts[0]);
      }
    };

    window.ethereum.on?.('accountsChanged', handleAccountsChanged);

    return () => {
  // ✅ Check if window.ethereum exists first
  if (window.ethereum) {
    window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
  }
};
  }, [onConnect]);

  return (
    <div className="welcome-container">
      {/* Animated Background Elements */}
      <div className="decorative-circle circle-1"></div>
      <div className="decorative-circle circle-2"></div>
      
      {/* Floating Emojis */}
      <div className="floating-emoji emoji-1">🎨</div>
      <div className="floating-emoji emoji-2">💰</div>
      
      {/* Main Content */}
      <div className="welcome-content">
        <h1 className="welcome-title">
          Welcome to <span className="gradient-text">Pigment</span>
        </h1>
        
        <p className="welcome-subtitle">
          Drop by drop, build your financial masterpiece
        </p>

        {/* Feature Cards */}
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Payments</h3>
            <p>Gasless USDC transfers with x402</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Smart Goals</h3>
            <p>AI-powered savings automation</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Earn Yield</h3>
            <p>Automated DeFi optimization</p>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="wallet-connect-section">
          <div className="metamask-fox">🦊</div>
          
          <p className="connect-description">
            Connect your MetaMask wallet to get started
          </p>

          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="connect-button"
          >
            {isConnecting ? (
              <>
                <span className="loading-spinner"></span>
                Connecting...
              </>
            ) : (
              <>
                🔗 Connect MetaMask
              </>
            )}
          </button>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <p className="connect-footnote">
            New to MetaMask? <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">Install here</a>
          </p>
        </div>
      </div>
    </div>
  );
}