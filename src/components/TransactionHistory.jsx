import { useState, useEffect } from 'react'
import { 
  getTransactionHistory, 
  getTxIcon, 
  getTxDescription,
  formatRelativeTime,
  formatAbsoluteTime,
  TX_TYPES
} from '../utils/transactionHistory'
import '../styles/TransactionHistory.css'

function TransactionHistory({ onClose }) {
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('all') // 'all', 'purchases', 'earnings', 'activities', 'food', 'toys', 'cats'
  const [showAbsoluteTime, setShowAbsoluteTime] = useState(false)

  useEffect(() => {
    loadTransactions()
    
    // Refresh when new transactions are added
    const handleUpdate = () => loadTransactions()
    window.addEventListener('transactionAdded', handleUpdate)
    
    return () => window.removeEventListener('transactionAdded', handleUpdate)
  }, [])

  const loadTransactions = () => {
    const history = getTransactionHistory()
    setTransactions(history)
  }

  const getFilteredTransactions = () => {
    if (filter === 'all') return transactions

    // Category filters
    if (filter === 'purchases') {
      return transactions.filter(tx => 
        [TX_TYPES.PURCHASE_FOOD, TX_TYPES.PURCHASE_TOY, TX_TYPES.PURCHASE_CAT].includes(tx.type)
      )
    }
    if (filter === 'earnings') {
      return transactions.filter(tx => tx.type === TX_TYPES.EARN_REWARD)
    }
    if (filter === 'activities') {
      return transactions.filter(tx => 
        [TX_TYPES.FEED_CAT, TX_TYPES.PLAY_CAT, TX_TYPES.POMODORO_SESSION].includes(tx.type)
      )
    }

    // Item type filters
    if (filter === 'food') {
      return transactions.filter(tx => 
        tx.type === TX_TYPES.PURCHASE_FOOD || tx.type === TX_TYPES.FEED_CAT
      )
    }
    if (filter === 'toys') {
      return transactions.filter(tx => 
        tx.type === TX_TYPES.PURCHASE_TOY || tx.type === TX_TYPES.PLAY_CAT
      )
    }
    if (filter === 'cats') {
      return transactions.filter(tx => 
        tx.type === TX_TYPES.PURCHASE_CAT || 
        tx.type === TX_TYPES.CAT_DEATH || 
        tx.type === TX_TYPES.CAT_REVIVAL
      )
    }

    return transactions
  }

  const filteredTransactions = getFilteredTransactions()

  const renderTransaction = (tx) => {
    const isOnChain = tx.txHash && tx.txHash !== ''
    const isNegative = tx.amount && tx.amount < 0
    const isPositive = tx.amount && tx.amount > 0

    return (
      <div key={tx.id} className="tx-item">
        <div className="tx-icon">{getTxIcon(tx.type)}</div>
        
        <div className="tx-content">
          <div className="tx-header">
            <span className="tx-description">{getTxDescription(tx)}</span>
            {tx.amount && (
              <span className={`tx-amount ${isNegative ? 'negative' : 'positive'}`}>
                {isPositive ? '+' : ''}{tx.amount.toFixed(2)} OCT
              </span>
            )}
          </div>
          
          <div className="tx-details">
            <span className="tx-time" onClick={() => setShowAbsoluteTime(!showAbsoluteTime)}>
              {showAbsoluteTime ? formatAbsoluteTime(tx.timestamp) : formatRelativeTime(tx.timestamp)}
            </span>
            
            {isOnChain && (
              <a 
                href={`https://testnet.suivision.xyz/txblock/${tx.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-hash"
                onClick={(e) => e.stopPropagation()}
              >
                TxHash: {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)} ↗
              </a>
            )}
            
            {!isOnChain && (
              <span className="tx-offchain">Off-chain activity</span>
            )}
          </div>

          {tx.metadata && (
            <div className="tx-metadata">
              {tx.metadata.hungerReduction && (
                <span className="tx-meta-item">-{tx.metadata.hungerReduction} hunger</span>
              )}
              {tx.metadata.happinessIncrease && (
                <span className="tx-meta-item">+{tx.metadata.happinessIncrease} happiness</span>
              )}
              {tx.metadata.duration && (
                <span className="tx-meta-item">{tx.metadata.duration}min session</span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="tx-history-overlay" onClick={onClose}>
      <div className="tx-history-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tx-history-header">
          <button className="tx-back-button" onClick={onClose}>← Back</button>
          <h2 className="tx-history-title">📜 Transaction History</h2>
          <div style={{ width: '60px' }} /> {/* Spacer for centering */}
        </div>

        {/* Filters */}
        <div className="tx-filters">
          <div className="tx-filter-row">
            <button 
              className={`tx-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`tx-filter-btn ${filter === 'purchases' ? 'active' : ''}`}
              onClick={() => setFilter('purchases')}
            >
              Purchases
            </button>
            <button 
              className={`tx-filter-btn ${filter === 'earnings' ? 'active' : ''}`}
              onClick={() => setFilter('earnings')}
            >
              Earnings
            </button>
            <button 
              className={`tx-filter-btn ${filter === 'activities' ? 'active' : ''}`}
              onClick={() => setFilter('activities')}
            >
              Activities
            </button>
          </div>
          
          <div className="tx-filter-row">
            <button 
              className={`tx-filter-btn ${filter === 'food' ? 'active' : ''}`}
              onClick={() => setFilter('food')}
            >
              🍖 Food
            </button>
            <button 
              className={`tx-filter-btn ${filter === 'toys' ? 'active' : ''}`}
              onClick={() => setFilter('toys')}
            >
              🧸 Toys
            </button>
            <button 
              className={`tx-filter-btn ${filter === 'cats' ? 'active' : ''}`}
              onClick={() => setFilter('cats')}
            >
              🐱 Cats
            </button>
          </div>
        </div>

        {/* Transaction List */}
        <div className="tx-list">
          {filteredTransactions.length === 0 ? (
            <div className="tx-empty">
              <div className="tx-empty-icon">📭</div>
              <p className="tx-empty-text">
                {filter === 'all' 
                  ? 'No transactions yet. Start playing to see your history!'
                  : `No ${filter} transactions found.`
                }
              </p>
            </div>
          ) : (
            filteredTransactions.map(renderTransaction)
          )}
        </div>

        {/* Footer Info */}
        <div className="tx-footer">
          <div className="tx-footer-text">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransactionHistory

