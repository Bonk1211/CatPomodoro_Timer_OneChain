// Shop Component - Fresh Implementation
// Starting from scratch for food purchase mechanics

import { useState, useEffect } from 'react'
import { useCurrentWallet, useCurrentAccount, useSuiClient } from '@onelabs/dapp-kit'
import { Transaction } from '@onelabs/sui/transactions'
import { useSignAndExecuteTransaction } from '@onelabs/dapp-kit'
import { ONECHAIN_OBJECT_IDS } from '../utils/onechainBlockchainUtils'
import { FOOD_ITEMS } from '../data/shopItems'
import { runFullDiagnostic } from '../utils/diagnostics'
import { addTransaction, TX_TYPES } from '../utils/transactionHistory'
import '../styles/Shop.css'

function Shop({ onClose, onPurchase }) {
  const wallet = useCurrentWallet()
  const account = useCurrentAccount()
  const client = useSuiClient()
  
  // Use default dApp Kit execution to ensure proper object version handling
  const { mutate: signAndExecuteTransaction, isPending, error, isSuccess } = useSignAndExecuteTransaction()
  
  const [selectedFood, setSelectedFood] = useState(null)
  const [status, setStatus] = useState(null) // { type: 'info'|'success'|'error', message: string }
  const [diagnosticResults, setDiagnosticResults] = useState(null)
  
  // Run diagnostic on mount
  useEffect(() => {
    if (account?.address) {
      console.log('🔬 Running diagnostic...')
      runFullDiagnostic(account.address).then(results => {
        setDiagnosticResults(results)
        
        // Check for critical issues
        if (!results.rpc?.success) {
          setStatus({
            type: 'error',
            message: `RPC Connection Failed: ${results.rpc.error}. Cannot connect to OneChain testnet.`
          })
        } else if (!results.gameState?.exists) {
          setStatus({
            type: 'error',
            message: 'Game State object not found on blockchain. The game may not be properly deployed.'
          })
        } else if (!results.userCoins || results.userCoins.error) {
          setStatus({
            type: 'error',
            message: `Cannot fetch your coin balance: ${results.userCoins?.error || 'Unknown error'}`
          })
        }
      }).catch(err => {
        console.error('Diagnostic failed:', err)
        setStatus({
          type: 'error',
          message: `Diagnostic failed: ${err.message}`
        })
      })
    }
  }, [account?.address])

  // Food items with their Move contract IDs
  // Food IDs: 1=fish, 2=tuna, 3=salmon, 4=catnip, 5=premium_food
  const foodItems = FOOD_ITEMS.map(item => ({
    ...item,
    moveId: item.id === 'fish' ? 1 :
            item.id === 'tuna' ? 2 :
            item.id === 'salmon' ? 3 :
            item.id === 'catnip' ? 4 :
            item.id === 'premium_food' ? 5 : null
  })).filter(item => item.moveId !== null)

  const handleBuyFood = async (foodItem) => {
    // Step 1: Validate wallet connection
    if (!wallet?.isConnected || !account?.address) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' })
      return
    }

    // Treasury removed - no treasury needed with OCT (native token, 100% burn)
    setSelectedFood(foodItem)
    setStatus({ type: 'info', message: `Preparing to buy ${foodItem.name}...` })

    try {
      const address = account.address
      const itemId = foodItem.moveId
      const price = foodItem.price // Price in OCT (whole units, e.g., 10 OCT)
      
      // Step 3: Check user balance
      // Note: We use tx.gas, so the wallet handles ALL coin operations automatically
      console.log('📦 Checking balance...')
      const coins = await client.getCoins({
        owner: address,
        coinType: '0x2::oct::OCT',
      })

      if (!coins.data || coins.data.length === 0) {
        throw new Error('You have no OCT coins. Please get some OCT first.')
      }

      // Calculate total cost and check balance
      const totalCost = BigInt(price) * BigInt(1_000_000_000) // 9 decimals
      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0))
      const gasEstimate = BigInt(100_000_000) // ~0.1 OCT for gas
      
      console.log(`💰 Balance: ${Number(totalBalance) / 1e9} OCT | Need: ${price} OCT + ~0.1 gas`)
      
      if (totalBalance < totalCost + gasEstimate) {
        throw new Error(`Insufficient balance. You have ${Number(totalBalance) / 1e9} OCT, need ${price} OCT + ~0.1 for gas.`)
      }

      // Step 4: Fetch latest object version before building transaction
      // This ensures we have the correct version for shared objects
      console.log('🔍 Fetching latest game state object version...')
      const gameStateObject = await client.getObject({
        id: ONECHAIN_OBJECT_IDS.gameState,
        options: {
          showType: true,
          showOwner: true,
          showPreviousTransaction: false,
        }
      })

      if (!gameStateObject || gameStateObject.error) {
        throw new Error(`Game state object not found: ${gameStateObject?.error || 'Unknown error'}`)
      }

      console.log(`✅ Game state object found: ${gameStateObject.data?.objectId}`)

      // Step 5: Build transaction using tx.gas (recommended pattern)
      // The wallet will automatically handle coin selection and merging
      console.log('🔨 Building transaction using tx.gas...')
      const tx = new Transaction()
      
      // Set sender explicitly (wallet will override if needed, but this helps with building)
      tx.setSender(address)
      
      // Use tx.gas for automatic coin management
      // The wallet will:
      // 1. Select coins from your balance
      // 2. Merge them if needed
      // 3. Split the payment amount
      // 4. Use remaining for gas
      const [paymentCoin] = tx.splitCoins(
        tx.gas,
        [tx.pure.u64(totalCost)]
      )
      
      console.log(`✂️ Splitting ${price} OCT from tx.gas`)
      
      // Call purchase_item with the split coin
      // Use tx.object() which will automatically fetch the latest version when built
      tx.moveCall({
        target: `${ONECHAIN_OBJECT_IDS.gamePackageId}::pomodoro_game::purchase_item`,
        arguments: [
          tx.object(ONECHAIN_OBJECT_IDS.gameState),
          paymentCoin,
          tx.pure.u8(itemId),
          tx.pure.u64(1),
        ],
      })
      
      // Note: Don't call tx.build() - let the wallet handle it
      // The wallet will:
      // 1. Fetch latest object versions using the client
      // 2. Select and merge coins for gas
      // 3. Override sender if needed
      // 4. Set gas budget
      // 5. Build the transaction
      console.log('✅ Transaction prepared (wallet will build with latest object versions)')

      // Step 9: Sign and execute
      console.log('✍️ Signing transaction...')
      setStatus({ type: 'info', message: 'Please approve the transaction in your wallet...' })

      signAndExecuteTransaction(
        { 
          transaction: tx,
          options: {
            // Request full transaction details for better error messages
            showEffects: true,
            showEvents: true,
            showObjectChanges: true,
          }
        },
        {
          onSuccess: async (result) => {
            console.log('✅ Transaction submitted:', result.digest)
            setStatus({ type: 'info', message: 'Transaction submitted! Waiting for confirmation...' })
            
            try {
              // Wait for transaction to be confirmed
              await client.waitForTransaction({
                digest: result.digest,
                options: {
                  showEffects: true,
                  showEvents: true,
                  showObjectChanges: true,
                }
              })
              
              console.log('✅ Transaction confirmed!')
              setStatus({ type: 'success', message: `Successfully purchased ${foodItem.name}! 🎉` })
              
              // Add food to localStorage inventory (food is off-chain)
              const gameState = JSON.parse(localStorage.getItem('pixelCatPomodoroGameState') || '{}')
              if (!gameState.inventory) gameState.inventory = {}
              if (!gameState.inventory.foods) gameState.inventory.foods = {}
              gameState.inventory.foods[foodItem.id] = (gameState.inventory.foods[foodItem.id] || 0) + 1
              localStorage.setItem('pixelCatPomodoroGameState', JSON.stringify(gameState))
              console.log(`✅ Added ${foodItem.name} to localStorage inventory`)
              
              // Log transaction to history
              addTransaction({
                type: TX_TYPES.PURCHASE_FOOD,
                amount: -foodItem.price,
                itemName: foodItem.name,
                itemId: foodItem.id,
                txHash: result.digest || '',
                status: 'success',
              })
              
              // Trigger inventory refresh
              console.log('🔄 Triggering inventory update...')
              window.dispatchEvent(new CustomEvent('gameStateUpdate'))
              window.dispatchEvent(new CustomEvent('inventoryUpdate'))
              window.dispatchEvent(new CustomEvent('transactionAdded'))
              
              // Clear selection after 3 seconds
              setTimeout(() => {
                setSelectedFood(null)
                setStatus(null)
                if (onPurchase) onPurchase()
              }, 3000)
            } catch (waitError) {
              console.error('Error waiting for transaction:', waitError)
              setStatus({ type: 'error', message: 'Transaction submitted but confirmation failed. Check explorer.' })
            }
          },
          onError: (error) => {
            console.error('❌ Transaction failed:', error)
            const errorMessage = error?.message || error?.toString() || 'Transaction failed'
            setStatus({ type: 'error', message: `Purchase failed: ${errorMessage}` })
            setSelectedFood(null)
          },
        }
      )

    } catch (error) {
      console.error('❌ Error purchasing food:', error)
      setStatus({ type: 'error', message: error.message || 'Failed to purchase food' })
      setSelectedFood(null)
    }
  }

  return (
    <div className="shop-overlay" onClick={onClose}>
      <div className="shop-container" onClick={(e) => e.stopPropagation()}>
        <div className="shop-header">
          <h2 className="shop-title">🛒 Shop - Food</h2>
          <button className="shop-close-button" onClick={onClose}>✕</button>
        </div>

        {/* Status Message */}
        {status && (
          <div className={`shop-status ${status.type}`} style={{
            padding: '15px',
            margin: '15px',
            borderRadius: '8px',
            border: '2px solid',
            borderColor: status.type === 'success' ? '#4ecdc4' : 
                        status.type === 'error' ? '#ff6b6b' : '#ffd700',
            background: status.type === 'success' ? '#1a3a2a' : 
                       status.type === 'error' ? '#3a1a1a' : '#3a3a1a',
            color: status.type === 'success' ? '#4ecdc4' : 
                   status.type === 'error' ? '#ff6b6b' : '#ffd700',
            fontFamily: 'Press Start 2P, cursive',
            fontSize: '10px',
            textAlign: 'center'
          }}>
            {status.type === 'success' && '✅ '}
            {status.type === 'error' && '❌ '}
            {status.type === 'info' && 'ℹ️ '}
            {status.message}
          </div>
        )}

        {/* Food Items List */}
        <div className="shop-content">
          <div className="shop-items-list">
            {foodItems.map((item) => {
              const isProcessing = selectedFood?.id === item.id && isPending
              
              return (
                <div 
                  key={item.id} 
                  className="shop-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '15px',
                    border: '2px solid #000',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    background: isProcessing ? '#2a2a2a' : '#1a0f2e'
                  }}
                >
                  {/* Item Image */}
                  <div className="shop-item-image" style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <span style={{ fontSize: '40px' }}>{item.emoji}</span>
                    )}
                  </div>

                  {/* Item Info */}
                  <div className="shop-item-info" style={{ flex: 1 }}>
                    <div className="shop-item-name" style={{ 
                      fontFamily: 'Press Start 2P, cursive',
                      fontSize: '12px',
                      color: '#ffd700',
                      marginBottom: '5px'
                    }}>
                      {item.name}
                    </div>
                    <div className="shop-item-description" style={{
                      fontSize: '10px',
                      color: '#9e9e9e',
                      marginBottom: '10px'
                    }}>
                      {item.description}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: '#4ecdc4'
                    }}>
                      Move ID: {item.moveId} | Price: {item.price} OCT
                    </div>
                  </div>

                  {/* Buy Button */}
                  <button
                    className="shop-buy-button"
                    onClick={() => handleBuyFood(item)}
                    disabled={isProcessing || isPending}
                    style={{
                      padding: '10px 20px',
                      background: isProcessing ? '#666' : '#4ecdc4',
                      color: '#000',
                      border: '2px solid #000',
                      borderRadius: '4px',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      fontFamily: 'Press Start 2P, cursive',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}
                  >
                    {isProcessing ? 'Processing...' : 'Buy'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Debug Info (only in development) */}
        {import.meta.env.DEV && (
          <div style={{
            padding: '10px',
            margin: '15px',
            background: '#1a0f2e',
            border: '1px solid #000',
            borderRadius: '4px',
            fontSize: '8px',
            color: '#9e9e9e',
            fontFamily: 'monospace'
          }}>
            <div>Wallet: {wallet?.isConnected ? '✅ Connected' : '❌ Not Connected'}</div>
            <div>Account: {account?.address ? `${account.address.slice(0, 10)}...` : 'None'}</div>
            <div>GameState: {ONECHAIN_OBJECT_IDS.gameState ? '✅' : '❌'}</div>
            {/* Treasury removed - no treasury needed with OCT (native token, 100% burn) */}
            <div>Package: {ONECHAIN_OBJECT_IDS.gamePackageId.slice(0, 10)}...</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Shop
