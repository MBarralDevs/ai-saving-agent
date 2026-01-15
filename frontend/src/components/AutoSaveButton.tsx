import { useAutoSave } from '../hooks/useAutoSave';

/**
 * Props for AutoSaveButton component
 */
interface AutoSaveButtonProps {
  userAddress: string | null;  // User's wallet address (null if not connected)
  canAutoSave: boolean;         // Can user save now? (from backend rate limit check)
  onSuccess: () => void;        // Callback when save succeeds (to refresh account data)
}

/**
 * AutoSaveButton Component
 * 
 * The "Save $25 to Vault" button that:
 * 1. Triggers the x402 payment flow
 * 2. Shows real-time status updates
 * 3. Displays transaction link when done
 * 4. Handles errors gracefully
 * 
 * This is where the useAutoSave hook gets used!
 */
export function AutoSaveButton({ userAddress, canAutoSave, onSuccess }: AutoSaveButtonProps) {
  // Get the x402 flow functions and state from our hook
  const { status, isLoading, error, lastTxHash, executeSave } = useAutoSave();

  /**
   * Handle button click
   * 
   * Flow:
   * 1. Check wallet is connected
   * 2. Check rate limit allows saving
   * 3. Execute save with x402 payment flow
   * 4. On success, call onSuccess to refresh account
   */
  const handleSave = async () => {
    // Safety check: wallet connected?
    if (!userAddress) {
      alert('Please connect wallet first');
      return;
    }

    // Safety check: rate limit OK?
    if (!canAutoSave) {
      alert('Rate limit exceeded. Wait 24 hours between saves.');
      return;
    }

    try {
      // Execute the save! This triggers the entire x402 flow:
      // 1. POST /api/save (get 402 challenge)
      // 2. Generate payment header (MetaMask signs)
      // 3. POST /api/save (with payment)
      // 4. Backend verifies + settles
      // 5. Success!
      await executeSave(userAddress, '5.00');  // Changed from '25.00'
      
      // Success! Refresh the account data in parent component
      onSuccess();
    } catch (err) {
      console.error('Save failed:', err);
      // Error is already handled by useAutoSave hook
      // It sets the error state which we display below
    }
  };

  /**
   * Determine if button should be disabled
   * 
   * Disabled when:
   * - Already processing (isLoading = true)
   * - No wallet connected (userAddress = null)
   * - Rate limited (canAutoSave = false)
   */
  const isDisabled = isLoading || !userAddress || !canAutoSave;

  return (
    <div style={{ 
      padding: '1.5rem', 
      background: '#fff', 
      border: '2px solid #5865F2',  // Purple border
      borderRadius: '8px' 
    }}>
      {/* ============================================
          TITLE
          ============================================ */}
      <h2 style={{ marginTop: 0 }}>Auto Save</h2>
      
      {/* ============================================
          THE MAIN BUTTON
          ============================================ */}
      <button
        onClick={handleSave}
        disabled={isDisabled}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.25rem',
          // Gray when disabled, purple when active
          background: isDisabled ? '#ccc' : '#5865F2',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          // Not-allowed cursor when disabled, pointer when active
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          width: '100%',  // Full width
          fontWeight: 'bold',
          transition: 'all 0.2s',  // Smooth color transitions
        }}
      >
        {/* 
          Button text changes based on state:
          - "Processing..." when isLoading = true
          - "Save $5 to Vault" when idle
        */}
        {isLoading ? 'Processing...' : 'Save $5 to Vault'} 
      </button>

      {/* ============================================
          STATUS & FEEDBACK SECTION
          ============================================ */}
      <div style={{ marginTop: '1rem' }}>
        
        {/* 
          STATUS MESSAGE
          Shows what's happening in real-time:
          - "Ready"
          - "Requesting save..."
          - "Payment required - preparing signature..."
          - "Requesting signature from MetaMask..."
          - "Submitting payment..."
          - "Save successful!"
          - "Error"
        */}
        <p style={{ margin: '0.5rem 0' }}>
          <strong>Status:</strong> {status}
        </p>

        {/* 
          ERROR MESSAGE (only shown if error exists)
          Red text to indicate failure
        */}
        {error && (
          <p style={{ 
            color: '#f44336',  // Red color
            margin: '0.5rem 0',
            fontWeight: 'bold',
          }}>
            <strong>Error:</strong> {error}
          </p>
        )}

        {/* 
          TRANSACTION LINK (only shown after success)
          Links to Cronos testnet block explorer
          User can click to see the transaction on-chain
        */}
        {lastTxHash && (
          <p style={{ 
            fontSize: '0.875rem',      // Smaller text
            wordBreak: 'break-all',     // Break long hash if needed
            margin: '0.5rem 0',
          }}>
            <strong>TX Hash:</strong>{' '}
            <a
              href={`https://explorer.cronos.org/testnet/tx/${lastTxHash}`}
              target="_blank"            // Open in new tab
              rel="noopener noreferrer"  // Security best practice
              style={{ color: '#5865F2' }}
            >
              {lastTxHash}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}