import type { UserAccount } from '../types';

interface DashboardProps {
  account: UserAccount | null;
  isLoading: boolean;
}

/**
 * Enhanced Dashboard Component
 * 
 * Professional dashboard with:
 * - Animated loading states
 * - AI decision insights
 * - Beautiful progress visualization
 * - Yield earnings highlights
 * - Mobile responsive design
 * - Modern glassmorphism effects
 */
export function Dashboard({ account, isLoading }: DashboardProps) {
  
  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
        borderRadius: '16px',
        minHeight: '500px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}>
        <div className="loading-spinner" style={{
          width: '64px',
          height: '64px',
          border: '6px solid rgba(88, 101, 242, 0.1)',
          borderTop: '6px solid #5865F2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1.5rem',
        }} />
        <p style={{ 
          color: '#667eea', 
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
        }}>
          Loading your savings...
        </p>
        <p style={{ 
          color: '#999', 
          fontSize: '0.95rem',
        }}>
          Analyzing your financial data with AI 🤖
        </p>
      </div>
    );
  }

  // ============================================
  // NO ACCOUNT STATE
  // ============================================
  if (!account) {
    return (
      <div style={{
        padding: '4rem 2rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        color: 'white',
        boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated background circles */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: 'float 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '150px',
          height: '150px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite reverse',
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '1rem',
            animation: 'bounce 2s ease-in-out infinite',
          }}>
            🤖💰
          </div>
          <h2 style={{ 
            marginTop: 0, 
            fontSize: '2.5rem',
            fontWeight: '700',
            marginBottom: '1rem',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)',
          }}>
            Welcome to AI Savings Agent
          </h2>
          <p style={{ 
            fontSize: '1.2rem', 
            opacity: 0.95,
            maxWidth: '600px',
            margin: '0 auto 1.5rem',
            lineHeight: '1.6',
          }}>
            Connect your wallet to start saving automatically with AI-powered decisions. 
            Your personal financial assistant powered by Cronos blockchain.
          </p>
          <div style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center',
            marginTop: '2rem',
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚡</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Instant Payments</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Smart Goals</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📈</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Earn Yield</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // CALCULATE METRICS
  // ============================================
  const walletBalance = parseFloat(account.walletBalance);
  const vaultBalance = parseFloat(account.account.currentBalance);
  const totalBalance = parseFloat(account.totalBalance);
  const weeklyGoal = parseFloat(account.account.weeklyGoal);
  const safetyBuffer = parseFloat(account.account.safetyBuffer);
  const yieldEarned = totalBalance - vaultBalance;
  const goalProgress = Math.min((vaultBalance / weeklyGoal) * 100, 100);
  
  // AI Insight generation
  const availableToSave = Math.max(0, walletBalance - safetyBuffer);
  const daysUntilGoal = weeklyGoal > 0 ? Math.ceil((weeklyGoal - vaultBalance) / (weeklyGoal / 7)) : 0;
  const savingsRate = totalBalance > 0 ? (vaultBalance / totalBalance * 100) : 0;

  // ============================================
  // MAIN DASHBOARD RENDER
  // ============================================
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    }}>
      
      {/* ===========================================
          HERO CARD - Total Balance with Gradient
          =========================================== */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2.5rem',
        borderRadius: '20px',
        color: 'white',
        boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '150px',
          height: '150px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '120px',
          height: '120px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ 
            margin: 0, 
            opacity: 0.9, 
            fontSize: '0.95rem', 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            fontWeight: '600',
          }}>
            💎 Total Balance
          </p>
          <h1 style={{ 
            margin: '1rem 0', 
            fontSize: '4rem', 
            fontWeight: '800',
            textShadow: '0 4px 20px rgba(0,0,0,0.2)',
            letterSpacing: '-2px',
          }}>
            ${totalBalance.toFixed(2)}
          </h1>
          <div style={{ 
            display: 'flex', 
            gap: '2rem', 
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            {yieldEarned > 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span style={{ fontSize: '1.5rem' }}>📈</span>
                <div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Yield Earned</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                    +${yieldEarned.toFixed(4)}
                  </div>
                </div>
              </div>
            )}
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Savings Rate</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                  {savingsRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===========================================
          AI INSIGHTS CARD
          =========================================== */}
      <div style={{
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        padding: '1.5rem',
        borderRadius: '16px',
        color: 'white',
        boxShadow: '0 10px 30px rgba(240, 147, 251, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '2rem' }}>🤖</span>
          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>
            AI Decision Engine
          </h3>
        </div>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          padding: '1.25rem',
          borderRadius: '12px',
          fontSize: '1.05rem',
          lineHeight: '1.6',
        }}>
          {account.account.trustMode === 'AUTO' ? (
            <>
              <strong>🎯 Smart Analysis:</strong> You have <strong>${availableToSave.toFixed(2)} USDC</strong> available 
              to save (after maintaining your ${safetyBuffer.toFixed(2)} safety buffer).
              {daysUntilGoal > 0 && daysUntilGoal <= 7 && (
                <> Projected to reach your weekly goal in <strong>{daysUntilGoal} days</strong>!</>
              )}
              {goalProgress >= 100 && (
                <> 🎉 <strong>Congratulations!</strong> You've reached your weekly goal!</>
              )}
            </>
          ) : (
            <>
              <strong>⚙️ Manual Mode:</strong> You're in control! The AI agent is ready to assist when you 
              enable AUTO mode. Switch to AUTO to let AI make smart saving decisions for you.
            </>
          )}
        </div>
      </div>

      {/* ===========================================
          STATS GRID - Three Key Metrics
          =========================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
      }}>
        {/* Wallet Balance */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid #e8e8e8',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
        }}
        className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2.5rem' }}>💳</span>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Wallet
            </div>
          </div>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Available Balance
          </p>
          <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: '800', color: '#1a1a1a', letterSpacing: '-1px' }}>
            ${walletBalance.toFixed(2)}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#999' }}>USDC</p>
        </div>

        {/* Vault Balance */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid #e8e8e8',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
        }}
        className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2.5rem' }}>🏦</span>
            <div style={{
              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
              color: 'white',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Vault
            </div>
          </div>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Saved Amount
          </p>
          <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: '800', color: '#1a1a1a', letterSpacing: '-1px' }}>
            ${vaultBalance.toFixed(2)}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#999' }}>USDC in vault</p>
        </div>

        {/* Weekly Goal */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid #e8e8e8',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
        }}
        className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2.5rem' }}>🎯</span>
            <div style={{
              background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
              color: 'white',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Goal
            </div>
          </div>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Weekly Target
          </p>
          <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: '800', color: '#1a1a1a', letterSpacing: '-1px' }}>
            ${weeklyGoal.toFixed(2)}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#999' }}>USDC per week</p>
        </div>
      </div>

      {/* ===========================================
          PROGRESS BAR - Animated Weekly Goal
          =========================================== */}
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '16px',
        border: '1px solid #e8e8e8',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#1a1a1a' }}>
            📊 Weekly Goal Progress
          </h3>
          <div style={{
            background: goalProgress >= 100 
              ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            fontWeight: '800',
            fontSize: '1.5rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
          }}>
            {goalProgress.toFixed(0)}%
          </div>
        </div>
        
        {/* Animated progress bar */}
        <div style={{
          background: '#f0f0f0',
          height: '20px',
          borderRadius: '10px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            background: goalProgress >= 100 
              ? 'linear-gradient(90deg, #4CAF50 0%, #45a049 100%)'
              : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            height: '100%',
            width: `${goalProgress}%`,
            transition: 'width 0.5s ease-out',
            borderRadius: '10px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Animated shine effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shine 2s infinite',
            }} />
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '1rem',
          fontSize: '1rem',
          color: '#666',
        }}>
          <span>
            <strong style={{ color: '#1a1a1a' }}>${vaultBalance.toFixed(2)}</strong> saved
          </span>
          <span>
            Target: <strong style={{ color: '#1a1a1a' }}>${weeklyGoal.toFixed(2)}</strong>
          </span>
        </div>
        
        {goalProgress >= 100 && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            color: 'white',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '1.1rem',
            fontWeight: '600',
            animation: 'bounce 1s ease-in-out',
          }}>
            🎉 Congratulations! You've reached your weekly goal!
          </div>
        )}
      </div>

      {/* ===========================================
          ACCOUNT SETTINGS CARD
          =========================================== */}
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '16px',
        border: '1px solid #e8e8e8',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ 
          marginTop: 0, 
          marginBottom: '1.5rem', 
          fontSize: '1.3rem',
          fontWeight: '700',
          color: '#1a1a1a',
        }}>
          ⚙️ Account Settings
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
        }}>
          {/* Safety Buffer */}
          <div style={{
            padding: '1.25rem',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(102, 126, 234, 0.1)',
          }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#666', fontWeight: '600', marginBottom: '0.5rem' }}>
              🛡️ Safety Buffer
            </p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: '#667eea' }}>
              ${safetyBuffer.toFixed(2)}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#999' }}>
              Minimum wallet balance
            </p>
          </div>
          
          {/* Trust Mode */}
          <div style={{
            padding: '1.25rem',
            background: account.account.trustMode === 'AUTO' 
              ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(69, 160, 73, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(245, 124, 0, 0.05) 100%)',
            borderRadius: '12px',
            border: `1px solid ${account.account.trustMode === 'AUTO' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)'}`,
          }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#666', fontWeight: '600', marginBottom: '0.75rem' }}>
              {account.account.trustMode === 'AUTO' ? '🤖' : '👤'} Trust Mode
            </p>
            <span style={{
              padding: '0.5rem 1rem',
              background: account.account.trustMode === 'AUTO' 
                ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
                : 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
              color: 'white',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '700',
              display: 'inline-block',
            }}>
              {account.account.trustMode}
            </span>
          </div>
          
          {/* Can Auto Save Status */}
          <div style={{
            padding: '1.25rem',
            background: account.canAutoSave
              ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(69, 160, 73, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(244, 67, 54, 0.05) 0%, rgba(211, 47, 47, 0.05) 100%)',
            borderRadius: '12px',
            border: `1px solid ${account.canAutoSave ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'}`,
          }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#666', fontWeight: '600', marginBottom: '0.75rem' }}>
              {account.canAutoSave ? '✅' : '⏱️'} Rate Limit Status
            </p>
            <span style={{
              padding: '0.5rem 1rem',
              background: account.canAutoSave
                ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
                : 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
              color: 'white',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '700',
              display: 'inline-block',
            }}>
              {account.canAutoSave ? 'Ready to Save' : 'Rate Limited'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}