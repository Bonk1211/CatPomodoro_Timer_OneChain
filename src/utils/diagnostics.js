/**
 * Diagnostic utilities to debug transaction failures
 */

import { SuiClient } from '@onelabs/sui/client'

/**
 * Get client instance
 */
function getClient() {
  const rpcUrl = import.meta.env.VITE_ONECHAIN_RPC_URL || 
                 import.meta.env.VITE_SUI_RPC_URL || 
                 'https://rpc-testnet.onelabs.cc:443'
  return new SuiClient({ url: rpcUrl })
}

/**
 * Test RPC connectivity
 */
export async function testRPCConnection() {
  try {
    console.log('🔍 Testing RPC connection...')
    const client = getClient()
    
    // Test 1: Get latest checkpoint
    try {
      const checkpoint = await client.getLatestCheckpointSequenceNumber()
      console.log('✅ RPC Test 1: Latest checkpoint:', checkpoint)
    } catch (error) {
      console.error('❌ RPC Test 1 failed:', error.message)
      return { success: false, error: 'Cannot get latest checkpoint', details: error }
    }
    
    // Test 2: Get chain identifier
    try {
      const chainId = await client.getChainIdentifier()
      console.log('✅ RPC Test 2: Chain ID:', chainId)
    } catch (error) {
      console.error('⚠️ RPC Test 2 failed:', error.message)
    }
    
    console.log('✅ RPC connection is working')
    return { success: true }
  } catch (error) {
    console.error('❌ RPC connection test failed:', error)
    return { success: false, error: error.message, details: error }
  }
}

/**
 * Verify an object exists on chain
 */
export async function verifyObjectExists(objectId, objectName = 'Object') {
  try {
    const client = getClient()
    console.log(`🔍 Verifying ${objectName}: ${objectId}`)
    
    const obj = await client.getObject({
      id: objectId,
      options: { showType: true, showOwner: true, showContent: true }
    })
    
    if (obj.error) {
      console.error(`❌ ${objectName} error:`, obj.error)
      return { exists: false, error: obj.error }
    }
    
    console.log(`✅ ${objectName} exists:`, obj.data)
    return { exists: true, data: obj.data }
  } catch (error) {
    console.error(`❌ Error verifying ${objectName}:`, error)
    return { exists: false, error: error.message }
  }
}

/**
 * Verify all coins exist and are valid
 */
export async function verifyCoins(coinObjects) {
  console.log('🔍 Verifying coin objects...')
  const results = []
  
  for (const coin of coinObjects) {
    const result = await verifyObjectExists(coin.coinObjectId, `Coin ${coin.coinObjectId.slice(0, 10)}...`)
    results.push({ coinObjectId: coin.coinObjectId, balance: coin.balance, ...result })
  }
  
  const allValid = results.every(r => r.exists)
  console.log(allValid ? '✅ All coins are valid' : '❌ Some coins are invalid', results)
  
  return { allValid, results }
}

/**
 * Run full diagnostic
 */
export async function runFullDiagnostic(address) {
  console.log('🔬 === RUNNING FULL DIAGNOSTIC ===')
  
  const results = {
    timestamp: new Date().toISOString(),
    address: address
  }
  
  // Test 1: RPC Connection
  results.rpc = await testRPCConnection()
  
  // Test 2: Game State
  const { ONECHAIN_OBJECT_IDS } = await import('./onechainBlockchainUtils')
  results.gameState = await verifyObjectExists(
    ONECHAIN_OBJECT_IDS.gameState,
    'GameState'
  )
  
  // Test 3: Get user's coins
  try {
    const client = getClient()
    const coins = await client.getCoins({
      owner: address,
      coinType: '0x2::oct::OCT'
    })
    
    console.log(`✅ User has ${coins.data.length} OCT coin object(s)`)
    results.userCoins = {
      count: coins.data.length,
      totalBalance: coins.data.reduce((sum, c) => sum + BigInt(c.balance), BigInt(0)).toString(),
      coins: coins.data
    }
    
    // Test 4: Verify each coin
    if (coins.data.length > 0) {
      results.coinVerification = await verifyCoins(coins.data)
    }
  } catch (error) {
    console.error('❌ Error fetching user coins:', error)
    results.userCoins = { error: error.message }
  }
  
  console.log('🔬 === DIAGNOSTIC COMPLETE ===')
  console.log('Results:', JSON.stringify(results, null, 2))
  
  return results
}

