import { useAutoSave } from '../hooks/useAutoSave';

/**
 * Props for AutoSaveButton component
 */
interface AutoSaveButtonProps {
  userAddress: string | null;       // User's wallet address
  canAutoSave: boolean;             // Can save? (rate limit check)
  onSuccess: () => void;            // Callback when save succeeds
}

/**
 * Enhanced AutoSaveButton Component
 * 
 * Beautiful action button with:
 * - Smooth animations and transitions
 * - Step-by-step status updates
 * - Transaction link on success
 * - Error handling with retry
 * - Disabled states with tooltips
 */
export function AutoSaveButton({ userAddress, canAutoSave, onSuccess }: AutoSaveButtonProps) {
  
  // ============================================
  // USE AUTOSAVE HOOK
  // ============================================
  const { status, isLoading: isProcessing, error, lastTxHash, executeSave } = useAutoSave();

  // ============================================
  // SAVE HANDLER
  // ============================================
  const handleSave = async () => {
    if (!userAddress) {
      alert('Please connect your wallet first');
      return;
    }

    if (!canAutoSave) {
      alert('You are rate limited. Please wait 24 hours between saves.');
      return;
    }

    try {
      // Execute the save with x402 flow
      await executeSave(userAddress, '5.00');
      
      // Success! Notify parent to refresh data
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (err: any) {
      console.error('Save error:', err);
      // Error is already handled by useAutoSave hook
    }
  };

  // ============================================
  // RENDER
  // ============================================
  const isDisabled = !userAddress || !canAutoSave || isProcessing;

  return (
    <div style={{
      background: 'white',
      padding: '2rem',
      borderRadius: '16px',
      border: '1px solid #e8e8e8',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>
        
        {/* Header */}
        <div>
          <h3 style={{ 
            margin: 0, 
            marginBottom: '0.5rem',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1a1a1a',
          }}>
            💰 Quick Save Action
          </h3>
          <p style={{ 
            margin: 0, 
            color: '#666',
            fontSize: '0.95rem',
          }}>
            Save $5 USDC to your vault instantly with x402 payments
          </p>
        </div>

        {/* Main Save Button */}
        <button
          onClick={handleSave}
          disabled={isDisabled}
          style={{
            padding: '1.25rem 2rem',
            fontSize: '1.2rem',
            fontWeight: '700',
            background: isDisabled 
              ? '#cccccc'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: isDisabled 
              ? 'none'
              : '0 4px 15px rgba(102, 126, 234, 0.4)',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }
          }}
        >
          {/* Processing spinner overlay */}
          {isProcessing && (
            <span style={{
              position: 'absolute',
              left: '1rem',
              animation: 'spin 1s linear infinite',
            }}>
              ⚡
            </span>
          )}
          
          {isProcessing ? 'Processing...' : '💎 Save $5.00 USDC'}
        </button>

        {/* Disabled reason tooltip */}
        {!userAddress && (
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(245, 124, 0, 0.1) 100%)',
            border: '1px solid rgba(255, 152, 0, 0.3)',
            borderRadius: '10px',
            color: '#F57C00',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span>⚠️</span>
            <span>Please connect your wallet to save</span>
          </div>
        )}

        {!canAutoSave && userAddress && (
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(211, 47, 47, 0.1) 100%)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: '10px',
            color: '#d32f2f',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span>⏱️</span>
            <span>Rate limited. Wait 24 hours between saves.</span>
          </div>
        )}

        {/* Status Display */}
        <div style={{
          padding: '1.25rem',
          background: '#f9f9f9',
          borderRadius: '10px',
          border: '1px solid #e8e8e8',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
          }}>
            <strong style={{ color: '#333', fontSize: '0.95rem' }}>Status:</strong>
          </div>
          
          <p style={{ 
            margin: '0.5rem 0',
            fontSize: '1.05rem',
            fontWeight: '600',
            color: error ? '#f44336' : '#667eea',
          }}>
            {status}
          </p>

          {/* Error Message */}
          {error && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(211, 47, 47, 0.1) 100%)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              borderRadius: '8px',
              color: '#d32f2f',
              fontSize: '0.9rem',
              lineHeight: '1.5',
            }}>
              <strong>Error Details:</strong><br />
              {error}
            </div>
          )}

          {/* Transaction Link */}
          {lastTxHash && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(69, 160, 73, 0.1) 100%)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: '8px',
            }}>
              <p style={{ margin: 0, marginBottom: '0.5rem', fontWeight: '600', color: '#4CAF50' }}>
                ✅ Transaction Confirmed!
              </p>
              <div style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
                <strong style={{ color: '#666' }}>TX Hash:</strong>{' '}
                <a
                  href={`https://explorer.cronos.org/testnet/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#667eea',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  View on Cronos Explorer →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div style={{
          padding: '1rem',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          borderRadius: '10px',
          border: '1px solid rgba(102, 126, 234, 0.1)',
          fontSize: '0.85rem',
          color: '#666',
          lineHeight: '1.6',
        }}>
          <strong style={{ color: '#667eea' }}>💡 How it works:</strong> When you click save, the x402 protocol 
          handles the payment automatically. MetaMask will ask you to sign the transaction, then your funds 
          are securely transferred to your savings vault where they earn yield through VVS Finance.
        </div>
      </div>
    </div>
  );
}