import { useState, useEffect, useCallback } from 'react';
import { WalletConnect } from './components/WalletConnect';
import { Dashboard } from './components/Dashboard';
import { ApprovalButton } from './components/ApprovalButton';
import { AutoSaveButton } from './components/AutoSaveButton';
import { api } from './services/api';
import type { UserAccount } from './types';
import './App.css';

/**
 * Main App Component
 * 
 * This is the "orchestrator" that:
 * 1. Manages global state (wallet address, account data, approval status)
 * 2. Coordinates communication between components
 * 3. Handles data loading and refreshing
 * 
 * Component hierarchy:
 * App
 * ├── WalletConnect (connects wallet)
 * ├── Dashboard (displays account data in modern layout)
 * ├── ApprovalButton (approves USDC spending - NEW!)
 * └── AutoSaveButton (triggers save)
 */
function App() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  /**
   * User's wallet address
   * - null when not connected
   * - "0xABC123..." when connected
   */
  const [userAddress, setUserAddress] = useState<string | null>(null);
  
  /**
   * User's account data from backend
   * - null when not loaded
   * - { account: {...}, totalBalance: "...", ... } when loaded
   */
  const [account, setAccount] = useState<UserAccount | null>(null);
  
  /**
   * Is account data being loaded?
   * Used to show "Loading..." state
   */
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);

  /**
   * Has user approved vault to spend USDC?
   * - false initially / when not approved
   * - true after approval transaction confirms
   */
  const [isApproved, setIsApproved] = useState(false);

  // ============================================
  // DATA LOADING
  // ============================================
  
  /**
   * Load user account data from backend
   * 
   * Called when:
   * - User connects wallet (useEffect below)
   * - After successful save (AutoSaveButton callback)
   * 
   * @param address - User's wallet address
   */
  const loadAccount = useCallback(async (address: string) => {
    try {
      setIsLoadingAccount(true);
      
      console.log('📊 Loading account for:', address);
      
      // Call backend API: GET /api/user/:address
      const accountData = await api.getUserAccount(address);
      
      console.log('✅ Account loaded:', accountData);
      
      // Save to state
      setAccount(accountData);
    } catch (error) {
      console.error('❌ Failed to load account:', error);
      // Could show error message to user here
      alert('Failed to load account data');
    } finally {
      // Always stop loading, even if error
      setIsLoadingAccount(false);
    }
  }, []); // Empty dependency array - function never changes

  // ============================================
  // EFFECTS
  // ============================================
  
  /**
   * Effect: Load account when wallet connects
   * 
   * Watches userAddress - when it changes from null to "0xABC...",
   * automatically load the account data
   */
  useEffect(() => {
    if (userAddress) {
      console.log('👛 Wallet connected, loading account...');
      loadAccount(userAddress);
    }
  }, [userAddress, loadAccount]); 
  // ^ Re-run when userAddress or loadAccount changes

  // ============================================
  // EVENT HANDLERS
  // ============================================
  
  /**
   * Handle wallet connection
   * 
   * Called by WalletConnect component when user connects
   * 
   * @param address - User's wallet address
   */
  const handleWalletConnect = (address: string) => {
    console.log('🦊 Wallet connected:', address);
    setUserAddress(address);
    // Note: loadAccount will be called by useEffect above
  };

  /**
   * Handle successful save
   * 
   * Called by AutoSaveButton when save completes
   * Reloads account data to show updated balance
   */
  const handleSaveSuccess = () => {
    console.log('💰 Save successful, refreshing account...');
    
    // Reload account if we have an address
    if (userAddress) {
      loadAccount(userAddress);
    }
  };

  /**
   * Handle approval status change
   * 
   * Called by ApprovalButton when approval status changes
   * 
   * @param approved - Whether vault is approved to spend USDC
   */
  const handleApprovalChange = (approved: boolean) => {
    console.log('🔐 Approval status changed:', approved);
    setIsApproved(approved);
  };

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div style={{ 
      maxWidth: '1200px',      // Wider for dashboard layout
      margin: '0 auto',        // Center horizontally
      padding: '2rem'          // Space around edges
    }}>
      
      {/* ============================================
          HEADER
          ============================================ */}
      <h1>Pigment Finance</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Automated DeFi savings powered by Cronos x402 payments
      </p>

      {/* ============================================
          WALLET CONNECTION
          
          Shows:
          - "Connect MetaMask" button if not connected
          - "Connected: 0xABC...123" if connected
          
          When user connects, calls handleWalletConnect
          ============================================ */}
      <div style={{ marginBottom: '2rem' }}>
        <WalletConnect onConnect={handleWalletConnect} />
      </div>

      {/* ============================================
          MAIN CONTENT (Dashboard + Approval + Save Button)
          
          Layout: Vertical stack with spacing
          
          Flow:
          1. User connects wallet
          2. Dashboard loads
          3. User approves vault (if not already approved)
          4. User can save
          ============================================ */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem'  // Space between components
      }}>
        
        {/* 
          DASHBOARD DISPLAY
          
          Shows:
          - "Welcome" screen (if not connected)
          - "Loading your savings..." (if loading)
          - Full dashboard with metrics, progress, and details (if loaded)
        */}
        <Dashboard 
          account={account} 
          isLoading={isLoadingAccount} 
        />

        {/* 
          APPROVAL BUTTON
          
          Shows:
          - Nothing if wallet not connected
          - Loading spinner while checking approval
          - Green success card if already approved
          - Orange approval button if not approved
          
          This MUST be completed before user can save.
          Only appears after wallet is connected.
        */}
        <ApprovalButton 
          userAddress={userAddress}
          onApprovalChange={handleApprovalChange}
        />
        
        {/* 
          AUTO SAVE BUTTON
          
          The main action button that:
          - Triggers x402 payment flow
          - Shows status updates
          - Calls handleSaveSuccess when done
          
          Disabled when:
          - Wallet not connected (userAddress = null)
          - Vault not approved (isApproved = false) - NEW!
          - Rate limited (canAutoSave = false)
          
          Only show if:
          - Wallet is connected
          - Vault is approved
        */}
        {userAddress && isApproved && (
          <AutoSaveButton
            userAddress={userAddress}
            canAutoSave={account?.canAutoSave ?? false}
            onSuccess={handleSaveSuccess}
          />
        )}

        {/* 
          APPROVAL REMINDER
          
          If wallet connected but not approved, show a reminder
          below where the save button would be
        */}
        {userAddress && !isApproved && (
          <div style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(245, 124, 0, 0.1) 100%)',
            border: '1px solid rgba(255, 152, 0, 0.3)',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#F57C00',
            fontSize: '1rem',
          }}>
            <strong>⬆️ Please approve the vault above to enable saving</strong>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;