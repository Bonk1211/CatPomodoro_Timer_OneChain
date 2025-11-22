// Treasury Status Display Component
// Shows real-time treasury balance with visual indicators

import React, { useState, useEffect } from 'react'
import { useSuiClient } from '@onelabs/dapp-kit'
import { 
  getTreasuryBalance, 
  formatTreasuryStatus,
  getTreasuryStatusColor,
  estimateDepletionTime,
  createTreasuryMonitor 
} from '../utils/treasuryMonitor'
import '../styles/TreasuryStatus.css'

const TreasuryStatus = ({ compact = false, showDetails = true }) => {
  const client = useSuiClient()
  const [treasuryData, setTreasuryData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // Fetch treasury balance
  const fetchTreasuryBalance = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getTreasuryBalance(client)
      setTreasuryData(data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching treasury balance:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchTreasuryBalance()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchTreasuryBalance, 30000)
    
    // Listen for treasury updates
    const cleanup = createTreasuryMonitor((updatedData) => {
      setTreasuryData(updatedData)
    })
    
    return () => {
      clearInterval(interval)
      cleanup()
    }
  }, [client])

  if (loading && !treasuryData) {
    return (
      <div className={`treasury-status ${compact ? 'compact' : ''}`}>
        <div className="treasury-loading">Loading treasury...</div>
      </div>
    )
  }

  if (error || !treasuryData) {
    return (
      <div className={`treasury-status error ${compact ? 'compact' : ''}`}>
        <div className="treasury-error">
          ❌ {error || 'Failed to load treasury'}
        </div>
      </div>
    )
  }

  const statusColor = getTreasuryStatusColor(treasuryData.status)
  const depletion = estimateDepletionTime(treasuryData.balance, 1.0, 10)

  // Compact view - just balance and status indicator
  if (compact) {
    return (
      <div 
        className="treasury-status compact"
        onClick={() => setIsExpanded(!isExpanded)}
        title={formatTreasuryStatus(treasuryData)}
      >
        <div className="treasury-compact-content">
          <div 
            className="treasury-indicator"
            style={{ backgroundColor: statusColor }}
          />
          <span className="treasury-balance">
            {treasuryData.balance.toFixed(2)} OCT
          </span>
        </div>
        
        {isExpanded && (
          <div className="treasury-compact-details">
            <div>Can reward: {treasuryData.canReward} users</div>
            {depletion.urgent && (
              <div className="treasury-warning">{depletion.message}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Full view with details
  return (
    <div className="treasury-status full">
      <div className="treasury-header">
        <h3>Treasury Status</h3>
        <button 
          className="treasury-refresh-btn"
          onClick={fetchTreasuryBalance}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      <div className="treasury-main">
        <div 
          className="treasury-balance-display"
          style={{ borderColor: statusColor }}
        >
          <div className="balance-label">Current Balance</div>
          <div 
            className="balance-amount"
            style={{ color: statusColor }}
          >
            {treasuryData.balance.toFixed(2)} <span className="balance-unit">OCT</span>
          </div>
          <div className="balance-status">
            {formatTreasuryStatus(treasuryData)}
          </div>
        </div>

        {showDetails && (
          <>
            <div className="treasury-details">
              <div className="detail-item">
                <span className="detail-label">Can Reward:</span>
                <span className="detail-value">{treasuryData.canReward} users</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Sessions Remaining:</span>
                <span className="detail-value">{depletion.sessionsRemaining}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Estimated Time:</span>
                <span className="detail-value">
                  {depletion.daysRemaining > 1 
                    ? `~${depletion.daysRemaining} days` 
                    : `~${depletion.hoursRemaining} hours`}
                </span>
              </div>
              {treasuryData.totalUsersRewarded !== undefined && (
                <div className="detail-item">
                  <span className="detail-label">Total Users Rewarded:</span>
                  <span className="detail-value">{treasuryData.totalUsersRewarded}</span>
                </div>
              )}
            </div>

            {(treasuryData.status === 'low' || treasuryData.status === 'critical' || treasuryData.status === 'empty') && (
              <div className={`treasury-warning ${treasuryData.status}`}>
                <div className="warning-icon">⚠️</div>
                <div className="warning-message">
                  {depletion.message}
                  <div className="warning-action">
                    Please refill the treasury to continue rewarding users.
                  </div>
                </div>
              </div>
            )}

            {treasuryData.status === 'healthy' && (
              <div className="treasury-healthy-message">
                ✅ Treasury is well-funded and can handle rewards smoothly.
              </div>
            )}
          </>
        )}
      </div>

      <div className="treasury-footer">
        <small>Auto-refreshes every 30 seconds</small>
      </div>
    </div>
  )
}

export default TreasuryStatus


