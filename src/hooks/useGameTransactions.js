// Game Transaction Hooks using @onelabs/dapp-kit
// Provides React hooks for all game-related blockchain transactions

import { useCallback, useState } from 'react'
import { 
  useSignAndExecuteTransaction, 
  useCurrentWallet,
  useCurrentAccount,
  useSuiClient 
} from '@onelabs/dapp-kit'
import { Transaction } from '@onelabs/sui/transactions'
import { getGameState, saveGameState } from '../utils/gameState'
import { getStringId } from '../utils/itemMapping'
import { ONECHAIN_OBJECT_IDS } from '../utils/onechainBlockchainUtils'
import { 
  preflightCheckCompleteSession, 
  getTreasuryBalance,
  emitTreasuryUpdate 
} from '../utils/treasuryMonitor'
import { executeWithRetry } from '../utils/edgeCaseHandler'
import { addTransaction, TX_TYPES } from '../utils/transactionHistory'

/**
 * Hook for completing a Pomodoro session and earning OCT
 * Enhanced with pre-flight checks, retry logic, and treasury monitoring
 * @returns {Object} { completeSession, isPending, error, isSuccess, preflightError, retryCount }
 */
export const useCompleteSession = () => {
  const wallet = useCurrentWallet()
  const account = useCurrentAccount()
  const client = useSuiClient()
  const { mutate: signAndExecuteTransaction, isPending, error, isSuccess } = useSignAndExecuteTransaction()
  const [preflightError, setPreflightError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  const completeSession = useCallback(async () => {
    setPreflightError(null)
    setRetryCount(0)
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎯 COMPLETING POMODORO SESSION')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Pre-flight checks
    console.log('🔍 Step 1: Running pre-flight checks...')
    const preflightResult = await preflightCheckCompleteSession(client, wallet, account)
    
    if (!preflightResult.canProceed) {
      const errorMsg = `Pre-flight check failed:\n${preflightResult.errors.join('\n')}`
      console.error('❌ Pre-flight failed:', preflightResult)
      setPreflightError(errorMsg)
      throw new Error(errorMsg)
    }
    
    console.log('✅ Pre-flight checks passed')
    
    // Check treasury balance before transaction
    console.log('💰 Step 2: Checking treasury balance...')
    const treasuryData = await getTreasuryBalance(client)
    console.log(`💰 Treasury balance: ${treasuryData.balance.toFixed(2)} OCT`)
    console.log(`📊 Reward to receive: 1 OCT`)
    console.log(`🏦 Treasury after reward: ${(treasuryData.balance - 1).toFixed(2)} OCT`)
    
    if (treasuryData.status === 'low' || treasuryData.status === 'critical') {
      console.warn(`⚠️ Treasury balance is ${treasuryData.status}:`, treasuryData.balance.toFixed(2), 'OCT')
    }

    if (!wallet?.isConnected || !account?.address) {
      throw new Error('Wallet not connected or no account address')
    }

    // Get current wallet balance
    try {
      const balances = await client.getAllBalances({ owner: account.address })
      const octBalance = balances.find(b => b.coinType.toLowerCase().includes('oct'))
      const currentBalance = octBalance ? Number(octBalance.totalBalance) / 1_000_000_000 : 0
      console.log(`💼 Step 3: Checking wallet balance...`)
      console.log(`💼 Current balance: ${currentBalance.toFixed(9)} OCT`)
      console.log(`📈 Expected after reward: ${(currentBalance + 1).toFixed(9)} OCT`)
    } catch (err) {
      console.log('⚠️ Could not fetch current balance, continuing...')
    }

    console.log('🔨 Step 4: Building transaction...')
    const tx = new Transaction()
    
    // Set sender explicitly to enable proper transaction building and gas calculation
    tx.setSender(account.address)
    console.log(`👤 Sender: ${account.address}`)
    
    // Set gas budget explicitly (10 million MIST = 0.01 OCT)
    tx.setGasBudget(10000000)
    console.log(`⛽ Gas budget: 10,000,000 MIST (0.01 OCT)`)
    
    // Call complete_session function in Move module
    // Updated signature: complete_session(treasury: &mut Treasury, game_state: &mut GameState, clock: &Clock, ctx: &mut TxContext)
    // Treasury automatically pays user 1 OCT from its balance
    console.log('📝 Adding move call: complete_session')
    console.log(`   📦 Package: ${ONECHAIN_OBJECT_IDS.gamePackageId}`)
    console.log(`   💰 Treasury: ${ONECHAIN_OBJECT_IDS.treasury}`)
    console.log(`   🎮 GameState: ${ONECHAIN_OBJECT_IDS.gameState}`)
    console.log(`   🕐 Clock: ${ONECHAIN_OBJECT_IDS.clock}`)
    
    tx.moveCall({
      target: `${ONECHAIN_OBJECT_IDS.gamePackageId}::pomodoro_game::complete_session`,
      arguments: [
        tx.object(ONECHAIN_OBJECT_IDS.treasury),   // Treasury pays reward
        tx.object(ONECHAIN_OBJECT_IDS.gameState),
        tx.object(ONECHAIN_OBJECT_IDS.clock),
      ],
    })

    // Build transaction explicitly to resolve all object references and validate
    // This ensures the dry run will succeed
    console.log('🔧 Step 5: Building and validating transaction...')
    try {
      await tx.build({ client })
      console.log('✅ Transaction built successfully, ready to sign')
    } catch (buildError) {
      console.error('❌ Failed to build transaction:', buildError)
      throw new Error(`Transaction build failed: ${buildError.message}`)
    }

    // Wrap transaction in retry logic
    console.log('✍️ Step 6: Signing transaction...')
    const executeTransaction = () => new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        { 
          transaction: tx,
          // Transaction is already built with gas budget and sender
        },
        {
          onSuccess: async (result) => {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.log('✅ Transaction submitted:', result.digest)
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            
            // Wait for transaction to be confirmed
            console.log('⏳ Waiting for transaction confirmation...')
            try {
              const txResult = await client.waitForTransaction({
                digest: result.digest,
                options: {
                  showEffects: true,
                  showEvents: true,
                }
              })

              console.log('✅ Transaction confirmed!')
              console.log('📊 Transaction status:', txResult.effects?.status?.status || 'success')

              // Update local state (OCT earned, not CAT)
              const state = getGameState()
              const previousCoins = state.coins
              state.coins += 1.0 // 1.0 OCT per session (paid by treasury)
              state.completedSessions += 1
              saveGameState(state)
              
              console.log('💰 Updated game state:')
              console.log(`   Previous OCT: ${previousCoins.toFixed(2)}`)
              console.log(`   Reward: +1.00 OCT`)
              console.log(`   New total: ${state.coins.toFixed(2)} OCT`)
              console.log(`   Total sessions: ${state.completedSessions}`)
              
              // Update treasury balance and emit event
              const updatedTreasury = await getTreasuryBalance(client)
              console.log(`🏦 Treasury updated: ${updatedTreasury.balance.toFixed(2)} OCT remaining`)
              emitTreasuryUpdate(updatedTreasury)
              
              // Get updated wallet balance
              try {
                const balances = await client.getAllBalances({ owner: account.address })
                const octBalance = balances.find(b => b.coinType.toLowerCase().includes('oct'))
                const newBalance = octBalance ? Number(octBalance.totalBalance) / 1_000_000_000 : 0
                console.log(`💼 Wallet balance updated: ${newBalance.toFixed(9)} OCT`)
              } catch (err) {
                console.log('⚠️ Could not fetch updated balance')
              }

              // Log transaction to history
              addTransaction({
                type: TX_TYPES.EARN_REWARD,
                amount: 1.0,
                itemName: 'Pomodoro Session Reward',
                metadata: {
                  duration: 25, // 25 minutes work session
                },
                txHash: result.digest,
                status: 'success',
              })
              
              // Trigger transaction history update
              window.dispatchEvent(new CustomEvent('transactionAdded'))
              
              console.log('📝 Transaction logged to history')

              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
              console.log('🎉 SESSION REWARD COMPLETE!')
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
              
              resolve(result)
            } catch (waitError) {
              console.error('❌ Error waiting for transaction:', waitError)
              reject(waitError)
            }
          },
          onError: (error) => {
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.error('❌ Error completing session:', error)
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            reject(error)
          },
        }
      )
    })
    
    // Execute with retry logic (max 2 retries)
    try {
      await executeWithRetry(
        executeTransaction,
        2, // maxRetries
        2000, // retryDelay (2 seconds)
        (attempt, maxRetries, error) => {
          setRetryCount(attempt)
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.log(`🔄 Retrying transaction (${attempt}/${maxRetries})...`)
          console.log('Error:', error.message)
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        }
      )
    } catch (finalError) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('❌ Transaction failed after retries:', finalError)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      throw finalError
    }
  }, [wallet, account, client, signAndExecuteTransaction])

  return {
    completeSession,
    isPending,
    error,
    isSuccess,
    preflightError,
    retryCount,
  }
}

/**
 * Hook for purchasing items (food or toys)
 * @returns {Object} { purchaseItem, isPending, error, isSuccess }
 */
export const usePurchaseItem = () => {
  const wallet = useCurrentWallet()
  const account = useCurrentAccount()
  const client = useSuiClient()
  const { mutate: signAndExecuteTransaction, isPending, error, isSuccess } = useSignAndExecuteTransaction()

  const purchaseItem = useCallback(async (itemId, amount = 1) => {
    if (!wallet?.isConnected || !account?.address) {
      throw new Error('Wallet not connected')
    }

    const address = account.address
    
    // Get price for item
    const prices = { 1: 10, 2: 15, 3: 20, 4: 25, 5: 50, 6: 10, 7: 15, 8: 20, 9: 25, 10: 30 };
    const price = prices[itemId] || 10;
    const totalCost = price * amount;

    // Get user's OCT coins
    const coins = await client.getCoins({
      owner: address,
      coinType: '0x2::oct::OCT',
    });

    if (!coins.data || coins.data.length === 0) {
      throw new Error('Insufficient OCT balance');
    }

    const tx = new Transaction()
    
    // Set sender explicitly
    tx.setSender(address)
    
    // Set gas budget (5 million MIST = 0.005 OCT, higher for item purchases)
    tx.setGasBudget(5000000)
    
    // Merge coins if multiple
    const [primaryCoin, ...mergeCoins] = coins.data;
    if (mergeCoins.length > 0) {
      tx.mergeCoins(tx.object(primaryCoin.coinObjectId), mergeCoins.map(c => tx.object(c.coinObjectId)));
    }
    
    // Split exact payment amount
    const paymentCoin = tx.splitCoins(tx.object(primaryCoin.coinObjectId), [totalCost]);
    
    // Call purchase_item function
    // Updated signature: purchase_item(game_state: &GameState, payment: Coin<OCT>, item_id: u8, amount: u64, ctx: &mut TxContext)
    // 100% burn - no treasury needed
    tx.moveCall({
      target: `${ONECHAIN_OBJECT_IDS.gamePackageId}::pomodoro_game::purchase_item`,
      arguments: [
        tx.object(ONECHAIN_OBJECT_IDS.gameState),
        paymentCoin, // Payment coin (100% burn)
        tx.pure.u8(itemId), // Item ID (u8 type) - method-based API
        tx.pure.u64(amount), // Amount (u64 type) - method-based API
      ],
    })

    // Build transaction explicitly to resolve all object references and validate
    try {
      await tx.build({ client })
      console.log('✅ Purchase transaction built successfully')
    } catch (buildError) {
      console.error('❌ Failed to build purchase transaction:', buildError)
      throw new Error(`Transaction build failed: ${buildError.message}`)
    }

    signAndExecuteTransaction(
      { 
        transaction: tx,
        // dApp Kit will:
        // 1. Use the built transaction (or build it if not already built)
        // 2. Calculate gas budget
        // 3. Select gas payment coins (from SUI/OCT balance)
        // 4. Set gas price
      },
      {
        onSuccess: async (result) => {
          console.log('✅ Item purchased, transaction digest:', result.digest)
          
          try {
            await client.waitForTransaction({
              digest: result.digest,
            })
          } catch (waitError) {
            console.error('Error waiting for transaction:', waitError)
          }
        },
        onError: (error) => {
          console.error('❌ Error purchasing item:', error)
        },
      }
    )
  }, [wallet, signAndExecuteTransaction, client])

  return {
    purchaseItem,
    isPending,
    error,
    isSuccess,
  }
}

// Treasury initialization removed - no treasury needed with OCT (native token, 100% burn)

/**
 * Hook for purchasing a cat NFT
 * @returns {Object} { purchaseCat, isPending, error, isSuccess }
 */
export const usePurchaseCat = () => {
  const wallet = useCurrentWallet()
  const account = useCurrentAccount()
  const client = useSuiClient()
  const { mutate: signAndExecuteTransaction, isPending, error, isSuccess } = useSignAndExecuteTransaction()

  const purchaseCat = useCallback(async (catTypeId) => {
    if (!wallet?.isConnected || !account?.address) {
      throw new Error('Wallet not connected')
    }

    const address = account.address
    
    // Get price for cat type
    const prices = { 0: 0, 1: 50, 2: 75, 3: 150 };
    const price = prices[catTypeId] || 0;

    const tx = new Transaction()
    
    // Set sender explicitly
    tx.setSender(address)
    
    // Set gas budget (10 million MIST = 0.01 OCT, higher for NFT minting)
    tx.setGasBudget(10000000)
    
    // Prepare payment coin if price > 0
    let paymentCoin = null;
    if (price > 0) {
      // Get user's OCT coins
      const coins = await client.getCoins({
        owner: address,
        coinType: '0x2::oct::OCT',
      });

      if (!coins.data || coins.data.length === 0) {
        throw new Error('Insufficient OCT balance');
      }

      // Merge coins if multiple
      const [primaryCoin, ...mergeCoins] = coins.data;
      if (mergeCoins.length > 0) {
        tx.mergeCoins(tx.object(primaryCoin.coinObjectId), mergeCoins.map(c => tx.object(c.coinObjectId)));
      }
      
      // Split exact payment amount
      paymentCoin = tx.splitCoins(tx.object(primaryCoin.coinObjectId), [price]);
    } else {
      // For free cats, we still need a coin (will be returned)
      const coins = await client.getCoins({
        owner: address,
        coinType: '0x2::oct::OCT',
      });
      if (coins.data && coins.data.length > 0) {
        const [primaryCoin] = coins.data;
        paymentCoin = tx.splitCoins(tx.object(primaryCoin.coinObjectId), [1]);
      }
    }
    
    // Call purchase_cat function
    // Updated signature: purchase_cat(game_state: &GameState, payment: Coin<OCT>, cat_type: u8, ctx: &mut TxContext)
    // 100% burn - no treasury needed
    tx.moveCall({
      target: `${ONECHAIN_OBJECT_IDS.gamePackageId}::pomodoro_game::purchase_cat`,
      arguments: [
        tx.object(ONECHAIN_OBJECT_IDS.gameState),
        paymentCoin, // Payment coin (100% burn)
        tx.pure.u8(catTypeId), // Cat type (u8 type) - method-based API
      ],
    })

    // Build transaction explicitly to resolve all object references and validate
    try {
      await tx.build({ client })
      console.log('✅ Cat purchase transaction built successfully')
    } catch (buildError) {
      console.error('❌ Failed to build cat purchase transaction:', buildError)
      throw new Error(`Transaction build failed: ${buildError.message}`)
    }

    signAndExecuteTransaction(
      { 
        transaction: tx,
        // dApp Kit will use the built transaction and calculate gas
      },
      {
        onSuccess: async (result) => {
          console.log('✅ Cat purchased, transaction digest:', result.digest)
          
          try {
            const txResult = await client.waitForTransaction({
              digest: result.digest,
              options: {
                showEffects: true,
                showEvents: true,
                showObjectChanges: true,
              }
            })

            // Extract NFT object ID from transaction result
            const createdObjects = txResult.objectChanges?.filter(
              change => change.type === 'created'
            ) || []

            const catNFT = createdObjects.find(obj => 
              obj.objectType?.includes('catnft::CatNFT')
            )

            if (catNFT && catNFT.objectId) {
              // Store NFT object ID
              const state = getGameState()
              const catId = getStringId(catTypeId) || `cat_${catTypeId}`
              if (!state.catTokenIds) {
                state.catTokenIds = {}
              }
              state.catTokenIds[catId] = catNFT.objectId
              saveGameState(state)
            }
          } catch (waitError) {
            console.error('Error waiting for transaction:', waitError)
          }
        },
        onError: (error) => {
          console.error('❌ Error purchasing cat:', error)
        },
      }
    )
  }, [wallet, signAndExecuteTransaction, client])

  return {
    purchaseCat,
    isPending,
    error,
    isSuccess,
  }
}

/**
 * Hook for feeding a cat
 * @returns {Object} { feedCat, isPending, error, isSuccess }
 */
export const useFeedCat = () => {
  const wallet = useCurrentWallet()
  const account = useCurrentAccount()
  const client = useSuiClient()
  const { mutate: signAndExecuteTransaction, isPending, error, isSuccess } = useSignAndExecuteTransaction()

  const feedCat = useCallback(async (catObjectId, foodId) => {
    if (!wallet?.isConnected || !account?.address) {
      throw new Error('Wallet not connected')
    }

    const address = account.address
    
    try {
      // Verify cat ownership first
      const catObject = await client.getObject({
        id: catObjectId,
        options: { showOwner: true }
      })

      if (!catObject.data || catObject.data.owner !== `AddressOwner(${address})`) {
        throw new Error('You do not own this cat')
      }

      // TODO: Need to get food item object ID from user's owned items
      // For now, this is a placeholder - you need to pass foodObjectId
      // The Move function signature is: feed_cat(cat: CatNFT, food: FoodItem, clock: &Clock, ctx: &mut TxContext)
      throw new Error('feed_cat requires food item object ID. Please update to pass foodObjectId parameter instead of foodId.');

      const tx = new Transaction()
      tx.moveCall({
        target: `${ONECHAIN_OBJECT_IDS.gamePackageId}::pomodoro_game::feed_cat`,
        arguments: [
          tx.object(catObjectId), // Cat NFT object
          tx.object(foodObjectId), // Food item object (needs to be passed in)
          tx.object('0x0000000000000000000000000000000000000000000000000000000000000006'), // Clock object
        ],
      })

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            console.log('✅ Cat fed, transaction digest:', result.digest)
            
            try {
              await client.waitForTransaction({
                digest: result.digest,
              })
            } catch (waitError) {
              console.error('Error waiting for transaction:', waitError)
            }
          },
          onError: (error) => {
            console.error('❌ Error feeding cat:', error)
          },
        }
      )
    } catch (error) {
      console.error('Error verifying cat ownership:', error)
      throw error
    }
  }, [wallet, signAndExecuteTransaction, client])

  return {
    feedCat,
    isPending,
    error,
    isSuccess,
  }
}

/**
 * Hook for playing with a cat
 * @returns {Object} { playWithCat, isPending, error, isSuccess }
 */
export const usePlayWithCat = () => {
  const wallet = useCurrentWallet()
  const account = useCurrentAccount()
  const client = useSuiClient()
  const { mutate: signAndExecuteTransaction, isPending, error, isSuccess } = useSignAndExecuteTransaction()

  const playWithCat = useCallback(async (catObjectId, toyId = 0) => {
    if (!wallet?.isConnected || !account?.address) {
      throw new Error('Wallet not connected')
    }

    const address = account.address
    
    try {
      // Verify cat ownership first
      const catObject = await client.getObject({
        id: catObjectId,
        options: { showOwner: true }
      })

      if (!catObject.data || catObject.data.owner !== `AddressOwner(${address})`) {
        throw new Error('You do not own this cat')
      }

      const tx = new Transaction()
      
      // If toyId is 0, use pet_cat (no toy needed)
      // Otherwise, use play_with_cat_toy (requires toy object)
      if (toyId === 0) {
        // Pet cat (no toy) - signature: pet_cat(cat: CatNFT, clock: &Clock, ctx: &mut TxContext)
        tx.moveCall({
          target: `${ONECHAIN_OBJECT_IDS.gamePackageId}::pomodoro_game::pet_cat`,
          arguments: [
            tx.object(catObjectId), // Cat NFT object
            tx.object('0x0000000000000000000000000000000000000000000000000000000000000006'), // Clock object
          ],
        })
      } else {
        // Play with toy - signature: play_with_cat_toy(cat: CatNFT, toy: ToyItem, clock: &Clock, ctx: &mut TxContext)
        // TODO: Need toy object ID - for now, throw error
        throw new Error('play_with_cat_toy requires toy item object ID. Please update to pass toyObjectId parameter instead of toyId.');
        
        // Unreachable code (for reference):
        // tx.moveCall({
        //   target: `${ONECHAIN_OBJECT_IDS.gamePackageId}::pomodoro_game::play_with_cat_toy`,
        //   arguments: [
        //     tx.object(catObjectId), // Cat NFT object
        //     tx.object(toyObjectId), // Toy item object (needs to be passed in)
        //     tx.object('0x0000000000000000000000000000000000000000000000000000000000000006'), // Clock object
        //   ],
        // })
      }

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            console.log('✅ Played with cat, transaction digest:', result.digest)
            
            try {
              await client.waitForTransaction({
                digest: result.digest,
              })
            } catch (waitError) {
              console.error('Error waiting for transaction:', waitError)
            }
          },
          onError: (error) => {
            console.error('❌ Error playing with cat:', error)
          },
        }
      )
    } catch (error) {
      console.error('Error verifying cat ownership:', error)
      throw error
    }
  }, [wallet, signAndExecuteTransaction, client])

  return {
    playWithCat,
    isPending,
    error,
    isSuccess,
  }
}

