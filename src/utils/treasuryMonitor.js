// Treasury Balance Monitoring and Stability Utilities
// Provides real-time treasury monitoring, balance checks, and warnings

import { ONECHAIN_OBJECT_IDS } from './onechainBlockchainUtils'

/**
 * Get current treasury balance
 * @param {Object} client - SuiClient instance from useSuiClient()
 * @returns {Promise<{balance: number, balanceRaw: string, canReward: number, status: string, error?: string}>}
 */
export const getTreasuryBalance = async (client) => {
  try {
    const treasuryObject = await client.getObject({
      id: ONECHAIN_OBJECT_IDS.treasury,
      options: {
        showContent: true,
        showType: true,
      }
    })

    if (treasuryObject.error) {
      return {
        balance: 0,
        balanceRaw: '0',
        canReward: 0,
        status: 'error',
        error: treasuryObject.error.message || 'Treasury not found'
      }
    }

    if (treasuryObject.data?.content?.fields) {
      const fields = treasuryObject.data.content.fields
      const octBalance = fields.oct_balance || '0'
      
      // Convert from nano-OCT (9 decimals) to OCT
      const balance = parseFloat(octBalance) / 1_000_000_000
      
      // Calculate how many users can be rewarded (1 OCT per session)
      const canReward = Math.floor(balance)
      
      // Determine status
      let status = 'healthy'
      if (balance < 10) status = 'low'
      if (balance < 5) status = 'critical'
      if (balance < 1) status = 'empty'
      
      return {
        balance,
        balanceRaw: octBalance,
        canReward,
        status,
        totalRewardsPaid: fields.total_rewards_paid || '0',
        totalUsersRewarded: fields.total_users_rewarded || '0',
      }
    }

    return {
      balance: 0,
      balanceRaw: '0',
      canReward: 0,
      status: 'error',
      error: 'Invalid treasury object structure'
    }
  } catch (error) {
    console.error('Error fetching treasury balance:', error)
    return {
      balance: 0,
      balanceRaw: '0',
      canReward: 0,
      status: 'error',
      error: error.message || 'Failed to fetch treasury balance'
    }
  }
}

/**
 * Check if treasury can handle a reward transaction
 * @param {Object} client - SuiClient instance
 * @param {number} rewardAmount - Amount to check (default 1 OCT)
 * @returns {Promise<{canProceed: boolean, balance: number, message: string}>}
 */
export const canTreasuryReward = async (client, rewardAmount = 1.0) => {
  const treasuryData = await getTreasuryBalance(client)
  
  if (treasuryData.error) {
    return {
      canProceed: false,
      balance: 0,
      message: `Treasury error: ${treasuryData.error}`,
      severity: 'error'
    }
  }
  
  if (treasuryData.balance < rewardAmount) {
    return {
      canProceed: false,
      balance: treasuryData.balance,
      message: `Treasury balance too low: ${treasuryData.balance.toFixed(2)} OCT (need ${rewardAmount} OCT)`,
      severity: 'error'
    }
  }
  
  if (treasuryData.balance < 5) {
    return {
      canProceed: true,
      balance: treasuryData.balance,
      message: `Treasury balance is low: ${treasuryData.balance.toFixed(2)} OCT. Please refill soon.`,
      severity: 'warning'
    }
  }
  
  return {
    canProceed: true,
    balance: treasuryData.balance,
    message: `Treasury healthy: ${treasuryData.balance.toFixed(2)} OCT available`,
    severity: 'success'
  }
}

/**
 * Pre-flight check before completing session
 * Verifies all conditions are met for successful transaction
 * @param {Object} client - SuiClient instance
 * @param {Object} wallet - Wallet object from useCurrentWallet()
 * @param {Object} account - Account object from useCurrentAccount()
 * @returns {Promise<{canProceed: boolean, checks: Object, errors: string[]}>}
 */
export const preflightCheckCompleteSession = async (client, wallet, account) => {
  const errors = []
  const checks = {
    walletConnected: false,
    accountValid: false,
    treasuryExists: false,
    treasuryFunded: false,
    gameStateExists: false,
  }
  
  // Check wallet connection
  if (!wallet?.isConnected) {
    errors.push('Wallet not connected')
  } else {
    checks.walletConnected = true
  }
  
  // Check account
  if (!account?.address) {
    errors.push('No account address')
  } else {
    checks.accountValid = true
  }
  
  // Check treasury
  try {
    const treasuryCheck = await canTreasuryReward(client, 1.0)
    if (treasuryCheck.canProceed) {
      checks.treasuryExists = true
      checks.treasuryFunded = true
    } else {
      checks.treasuryExists = true
      errors.push(treasuryCheck.message)
    }
  } catch (error) {
    errors.push(`Treasury check failed: ${error.message}`)
  }
  
  // Check game state
  try {
    const gameStateObject = await client.getObject({
      id: ONECHAIN_OBJECT_IDS.gameState,
      options: { showType: true }
    })
    
    if (gameStateObject.data) {
      checks.gameStateExists = true
    } else {
      errors.push('Game state object not found')
    }
  } catch (error) {
    errors.push(`Game state check failed: ${error.message}`)
  }
  
  return {
    canProceed: errors.length === 0,
    checks,
    errors,
    allChecks: Object.values(checks).every(v => v === true)
  }
}

/**
 * Format treasury status message for display
 * @param {Object} treasuryData - Result from getTreasuryBalance()
 * @returns {string} - Formatted message with emoji
 */
export const formatTreasuryStatus = (treasuryData) => {
  if (treasuryData.error) {
    return `❌ ${treasuryData.error}`
  }
  
  const balance = treasuryData.balance.toFixed(2)
  const canReward = treasuryData.canReward
  
  switch (treasuryData.status) {
    case 'healthy':
      return `✅ Treasury: ${balance} OCT (can reward ${canReward} users)`
    case 'low':
      return `⚠️ Treasury Low: ${balance} OCT (can reward ${canReward} users)`
    case 'critical':
      return `🚨 Treasury Critical: ${balance} OCT (can reward ${canReward} users only!)`
    case 'empty':
      return `❌ Treasury Empty: ${balance} OCT (cannot reward users!)`
    default:
      return `Treasury: ${balance} OCT`
  }
}

/**
 * Get color code for treasury status
 * @param {string} status - Status from getTreasuryBalance()
 * @returns {string} - CSS color code
 */
export const getTreasuryStatusColor = (status) => {
  switch (status) {
    case 'healthy':
      return '#00ff88' // Green
    case 'low':
      return '#ffaa00' // Orange
    case 'critical':
      return '#ff6600' // Red-orange
    case 'empty':
    case 'error':
      return '#ff0000' // Red
    default:
      return '#888888' // Gray
  }
}

/**
 * Create event listeners for treasury monitoring
 * @param {Function} callback - Called when treasury balance changes
 * @returns {Function} - Cleanup function
 */
export const createTreasuryMonitor = (callback) => {
  // Listen for custom events
  const handleTreasuryUpdate = (event) => {
    if (callback) {
      callback(event.detail)
    }
  }
  
  window.addEventListener('treasuryUpdated', handleTreasuryUpdate)
  
  return () => {
    window.removeEventListener('treasuryUpdated', handleTreasuryUpdate)
  }
}

/**
 * Emit treasury update event
 * @param {Object} treasuryData - Treasury data to broadcast
 */
export const emitTreasuryUpdate = (treasuryData) => {
  window.dispatchEvent(new CustomEvent('treasuryUpdated', {
    detail: treasuryData
  }))
}

/**
 * Calculate estimated time until treasury is empty
 * @param {number} currentBalance - Current treasury balance in OCT
 * @param {number} rewardRate - OCT per session (default 1.0)
 * @param {number} sessionsPerDay - Estimated sessions per day
 * @returns {Object} - Time estimation
 */
export const estimateDepletionTime = (currentBalance, rewardRate = 1.0, sessionsPerDay = 10) => {
  if (currentBalance <= 0) {
    return {
      daysRemaining: 0,
      hoursRemaining: 0,
      message: 'Treasury is empty!',
      urgent: true
    }
  }
  
  const totalSessions = currentBalance / rewardRate
  const daysRemaining = totalSessions / sessionsPerDay
  const hoursRemaining = daysRemaining * 24
  
  let message = ''
  let urgent = false
  
  if (daysRemaining < 1) {
    message = `⚠️ Treasury will be empty in ~${Math.ceil(hoursRemaining)} hours at current rate`
    urgent = true
  } else if (daysRemaining < 3) {
    message = `⚠️ Treasury will be empty in ~${Math.ceil(daysRemaining)} days at current rate`
    urgent = true
  } else if (daysRemaining < 7) {
    message = `Treasury will last ~${Math.ceil(daysRemaining)} days at current rate`
    urgent = false
  } else {
    message = `Treasury is healthy (${Math.ceil(daysRemaining)} days at current rate)`
    urgent = false
  }
  
  return {
    daysRemaining: Math.ceil(daysRemaining),
    hoursRemaining: Math.ceil(hoursRemaining),
    sessionsRemaining: Math.floor(totalSessions),
    message,
    urgent
  }
}


