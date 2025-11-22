// Transaction History Utility
// Tracks all game transactions (on-chain and off-chain)

const STORAGE_KEY = 'pixelCatTransactionHistory'
const MAX_TRANSACTIONS = 500 // Limit to prevent localStorage overflow

// Transaction types
export const TX_TYPES = {
  PURCHASE_FOOD: 'purchase_food',
  PURCHASE_TOY: 'purchase_toy',
  PURCHASE_CAT: 'purchase_cat',
  EARN_REWARD: 'earn_reward',
  FEED_CAT: 'feed_cat',
  PLAY_CAT: 'play_cat',
  POMODORO_SESSION: 'pomodoro_session',
  CAT_DEATH: 'cat_death',
  CAT_REVIVAL: 'cat_revival',
}

// Get transaction icon/emoji
export const getTxIcon = (type) => {
  const icons = {
    [TX_TYPES.PURCHASE_FOOD]: '🛒',
    [TX_TYPES.PURCHASE_TOY]: '🧸',
    [TX_TYPES.PURCHASE_CAT]: '🐱',
    [TX_TYPES.EARN_REWARD]: '🎉',
    [TX_TYPES.FEED_CAT]: '🍖',
    [TX_TYPES.PLAY_CAT]: '🎮',
    [TX_TYPES.POMODORO_SESSION]: '⏱️',
    [TX_TYPES.CAT_DEATH]: '💀',
    [TX_TYPES.CAT_REVIVAL]: '💖',
  }
  return icons[type] || '📝'
}

// Get transaction description
export const getTxDescription = (tx) => {
  switch (tx.type) {
    case TX_TYPES.PURCHASE_FOOD:
      return `Purchased ${tx.itemName || 'food'}`
    case TX_TYPES.PURCHASE_TOY:
      return `Purchased ${tx.itemName || 'toy'}`
    case TX_TYPES.PURCHASE_CAT:
      return `Adopted ${tx.itemName || 'cat'}`
    case TX_TYPES.EARN_REWARD:
      return 'Completed Pomodoro session'
    case TX_TYPES.FEED_CAT:
      return `Fed ${tx.metadata?.catName || 'cat'} with ${tx.itemName}`
    case TX_TYPES.PLAY_CAT:
      return `Played with ${tx.metadata?.catName || 'cat'} using ${tx.itemName}`
    case TX_TYPES.POMODORO_SESSION:
      return `Completed ${tx.metadata?.duration || 25}min session`
    case TX_TYPES.CAT_DEATH:
      return `${tx.metadata?.catName || 'Cat'} died`
    case TX_TYPES.CAT_REVIVAL:
      return `Revived ${tx.metadata?.catName || 'cat'}`
    default:
      return 'Unknown transaction'
  }
}

// Get all transactions
export const getTransactionHistory = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const history = JSON.parse(stored)
    // Sort by timestamp (newest first)
    return history.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error('Error loading transaction history:', error)
    return []
  }
}

// Add a new transaction
export const addTransaction = (transaction) => {
  try {
    const history = getTransactionHistory()
    
    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      status: 'success',
      ...transaction,
    }
    
    // Add to beginning (newest first)
    history.unshift(newTx)
    
    // Limit total transactions
    const limitedHistory = history.slice(0, MAX_TRANSACTIONS)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory))
    
    console.log('📝 Transaction logged:', newTx)
    return newTx
  } catch (error) {
    console.error('Error adding transaction:', error)
    return null
  }
}

// Clear all transactions
export const clearTransactionHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('🗑️ Transaction history cleared')
    return true
  } catch (error) {
    console.error('Error clearing transaction history:', error)
    return false
  }
}

// Get transactions by type
export const getTransactionsByType = (type) => {
  const history = getTransactionHistory()
  return history.filter(tx => tx.type === type)
}

// Get transactions by category
export const getTransactionsByCategory = (category) => {
  const history = getTransactionHistory()
  
  const categories = {
    purchases: [TX_TYPES.PURCHASE_FOOD, TX_TYPES.PURCHASE_TOY, TX_TYPES.PURCHASE_CAT],
    earnings: [TX_TYPES.EARN_REWARD],
    activities: [TX_TYPES.FEED_CAT, TX_TYPES.PLAY_CAT, TX_TYPES.POMODORO_SESSION],
    events: [TX_TYPES.CAT_DEATH, TX_TYPES.CAT_REVIVAL],
  }
  
  const typeList = categories[category] || []
  return history.filter(tx => typeList.includes(tx.type))
}

// Get OCT statistics
export const getOCTStatistics = () => {
  const history = getTransactionHistory()
  
  let totalSpent = 0
  let totalEarned = 0
  
  history.forEach(tx => {
    if (tx.amount) {
      if (tx.amount < 0) {
        totalSpent += Math.abs(tx.amount)
      } else if (tx.amount > 0) {
        totalEarned += tx.amount
      }
    }
  })
  
  return {
    totalSpent: totalSpent.toFixed(2),
    totalEarned: totalEarned.toFixed(2),
    netBalance: (totalEarned - totalSpent).toFixed(2),
    transactionCount: history.length,
  }
}

// Format timestamp to relative time
export const formatRelativeTime = (timestamp) => {
  const now = Date.now()
  const diff = now - timestamp
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  
  return new Date(timestamp).toLocaleDateString()
}

// Format absolute time
export const formatAbsoluteTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

