import { useCurrentAccount, useSuiClientQuery } from '@onelabs/dapp-kit'
import { getGameState } from '../utils/gameState'
import '../styles/CoinDisplay.css'

function CoinDisplay() {
  const account = useCurrentAccount()
  
  // Get all balances using useSuiClientQuery hook (Method 1 from guide)
  const { data: allBalances, isPending, error } = useSuiClientQuery(
    'getAllBalances',
    {
      owner: account?.address || '',
    },
    {
      enabled: !!account,
      refetchInterval: 5000, // Refetch every 5 seconds
    }
  )

  // Debug: Log all coin types to help identify OCT
  if (account && allBalances) {
    console.log('All balances in wallet:', allBalances)
    console.log('All coin types:', allBalances.map(b => ({
      coinType: b.coinType,
      totalBalance: b.totalBalance,
      coinObjectCount: b.coinObjectCount
    })))
  }

  // Find OCT balance - try multiple strategies
  let octBalance = null
  let octCoinType = null
  
  if (allBalances && allBalances.length > 0) {
    // Strategy 1: Look for coin type containing "oct" (case insensitive)
    octBalance = allBalances.find((balance) => {
      const coinType = balance.coinType.toLowerCase()
      return coinType.includes('oct')
    })
    
    if (octBalance) {
      octCoinType = octBalance.coinType
      console.log('Found OCT balance (contains "oct"):', {
        coinType: octCoinType,
        totalBalance: octBalance.totalBalance,
        coinObjectCount: octBalance.coinObjectCount
      })
    } else {
      // Strategy 2: If no "oct" found, use the first non-SUI balance
      // (assuming OCT might be the first custom coin)
      const nonSuiBalance = allBalances.find(b => 
        b.coinType.toLowerCase() !== '0x2::sui::sui'
      )
      
      if (nonSuiBalance) {
        octBalance = nonSuiBalance
        octCoinType = nonSuiBalance.coinType
        console.log('Using first non-SUI balance as OCT:', {
          coinType: octCoinType,
          totalBalance: octBalance.totalBalance,
          coinObjectCount: octBalance.coinObjectCount
        })
      } else {
        // Strategy 3: Fallback to SUI if nothing else found
        const suiBalance = allBalances.find(b => 
          b.coinType.toLowerCase() === '0x2::sui::sui'
        )
        if (suiBalance) {
          octBalance = suiBalance
          octCoinType = suiBalance.coinType
          console.log('Using SUI balance as OCT (fallback):', {
            coinType: octCoinType,
            totalBalance: octBalance.totalBalance
          })
        }
      }
    }
  }

  // Calculate OCT balance
  let coins = 0
  const isBlockchainMode = !!account
  const isLoading = isPending

  if (account) {
    if (octBalance && octBalance.totalBalance) {
      // Convert from smallest unit to OCT (9 decimals)
      const balanceNumber = Number(octBalance.totalBalance) / 1e9
      coins = Math.floor(balanceNumber * 100) / 100 // Keep 2 decimal places
      console.log('OCT balance calculated:', {
        raw: octBalance.totalBalance,
        converted: balanceNumber,
        displayed: coins,
        coinType: octCoinType
      })
    } else {
      // Connected but no OCT found
      coins = 0
      if (allBalances && allBalances.length > 0) {
        console.warn('OCT balance not found. Available coin types:', 
          allBalances.map(b => b.coinType))
      }
    }
  } else {
    // Offline mode: Use localStorage
    const state = getGameState()
    coins = state.coins
  }

  return (
    <div className={`coin-display ${isBlockchainMode ? 'blockchain-mode' : 'offline-mode'}`}>
      <span className="coin-icon">🪙</span>
      <span className="coin-amount">
        {isLoading ? '...' : coins.toFixed(2)}
      </span>
      <span className="coin-label">OCT</span>
      {isBlockchainMode && (
        <img 
          src="/images/164-1648732_8-bit-mario-coin-mario-coin-pixel.png"
          alt="Blockchain balance"
          className="coin-mode-badge"
          title="Blockchain balance"
        />
      )}
      {error && (
        <span className="coin-error" title={error.message}>⚠️</span>
      )}
    </div>
  )
}

export default CoinDisplay
