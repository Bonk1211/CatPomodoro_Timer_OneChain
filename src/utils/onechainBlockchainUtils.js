// OneChain Blockchain Utilities using @onelabs/sui SDK
// Updated to work with @onelabs/dapp-kit

import { getStringId } from './itemMapping.js';
import { getGameState, saveGameState } from './gameState.js';
import { ONECHAIN_CONFIG } from '../config/onechain.js';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// Lazy import Transaction to avoid errors if SDK not available
let Transaction = null;
async function getTransaction() {
  if (!Transaction) {
    try {
      // Try @onelabs/sui first (OneChain SDK)
      const module = await import('@onelabs/sui/transactions');
      Transaction = module.Transaction;
    } catch (error) {
      console.warn('Failed to load Transaction from @onelabs/sui, trying @mysten/sui:', error);
      try {
        // Fallback to @mysten/sui (generic Sui SDK)
        const fallbackModule = await import('@mysten/sui/transactions');
        Transaction = fallbackModule.Transaction;
      } catch (fallbackError) {
        console.error('Failed to load Transaction from both SDKs:', fallbackError);
        throw new Error('OneChain SDK not available');
      }
    }
  }
  return Transaction;
}

/**
 * OneChain Object IDs Configuration
 * These will be set after Move modules are deployed
 */
export const ONECHAIN_OBJECT_IDS = {
  // Game module package ID (deployed to testnet) - UPDATED with 100 OCT daily cap
  gamePackageId: ONECHAIN_CONFIG.suiPackageId || import.meta.env.VITE_SUI_GAME_PACKAGE_ID || '0xaa248b205bb247b4cafb6d8243ffe29118721b97bcefd33c87b239b642768de3',
  
  // Treasury object for automatic OCT reward distribution
  // Admin address: 0xbb22581dcb7fa55b16da44fdcff4e4434ae44da663d9533969a4729021f00c40 (deployer wallet)
  treasury: ONECHAIN_CONFIG.suiObjects?.treasury || import.meta.env.VITE_SUI_TREASURY_ID || '0xc68322e94e54691ce03c3e37c85cb16e5c1fd87a94d3680651f38203e4436e76',
  
  upgradeCap: ONECHAIN_CONFIG.suiObjects?.upgradeCap || import.meta.env.VITE_SUI_UPGRADE_CAP_ID || '0x7e52cfd55831574cdcf197fb19da53e5c3b76f1f0e49ef5b9fd44521e62bae2b',
  
  // Shared objects for game state - UPDATED with 100 OCT daily cap
  gameState: ONECHAIN_CONFIG.suiObjects?.gameState || import.meta.env.VITE_SUI_GAME_STATE_ID || '0xf49315984fdddeebabd6f29577c263a8475ef5ff80f622c46034a31f5d52baf6',
  
  // Clock object (standard Sui system object at 0x6)
  clock: '0x0000000000000000000000000000000000000000000000000000000000000006',
};

/**
 * Get SuiClient instance for RPC calls
 */
const getClient = () => {
  const rpcUrl = ONECHAIN_CONFIG.rpcUrl || 'https://rpc-testnet.onelabs.cc:443';
  return new SuiClient({ url: rpcUrl });
};

/**
 * Get wallet address from wallet object or account
 * Handles different wallet object structures from dApp Kit
 * @param {Object} wallet - Wallet object from useCurrentWallet
 * @param {Object} account - Optional account object from useCurrentAccount
 */
const getWalletAddress = (wallet, account = null) => {
  // First try account object if provided (most reliable)
  if (account?.address) {
    return account.address;
  }
  
  if (!wallet) return null;
  
  // Try different possible structures in wallet
  if (wallet.accounts?.[0]?.address) {
    return wallet.accounts[0].address;
  }
  if (wallet.currentAccount?.address) {
    return wallet.currentAccount.address;
  }
  if (wallet.account?.address) {
    return wallet.account.address;
  }
  if (typeof wallet.address === 'string') {
    return wallet.address;
  }
  
  return null;
};

/**
 * Helper to sign and execute transaction using dApp Kit wallet
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 * @param {Object} tx - Transaction object
 */
const signAndExecuteTransaction = async (wallet, tx) => {
  if (!wallet?.isConnected) {
    throw new Error('Wallet not connected');
  }
  
  // Try different wallet APIs for signing transactions
  // dApp Kit wallets may expose transaction signing in different ways
  
  // Method 1: Try wallet.features.sui.signAndExecuteTransaction (standard dApp Kit)
  if (wallet.features?.sui?.signAndExecuteTransaction) {
    const result = await wallet.features.sui.signAndExecuteTransaction({
      transaction: tx,
    });
    return result.digest;
  }
  
  // Method 2: Try wallet.signAndExecuteTransactionBlock (direct wallet API)
  if (wallet.signAndExecuteTransactionBlock) {
    const result = await wallet.signAndExecuteTransactionBlock({
      transactionBlock: tx,
    });
    return result.digest;
  }
  
  // Method 3: Try wallet.signAndExecuteTransaction (alternative API)
  if (wallet.signAndExecuteTransaction) {
    const result = await wallet.signAndExecuteTransaction({
      transaction: tx,
    });
    return result.digest || result;
  }
  
  // Method 4: Try wallet.account (if account has signing capability)
  if (wallet.account?.signAndExecuteTransaction) {
    const result = await wallet.account.signAndExecuteTransaction({
      transaction: tx,
    });
    return result.digest || result;
  }
  
  // If none of the methods work, throw a helpful error
  console.error('Wallet object structure:', {
    hasFeatures: !!wallet.features,
    hasSuiFeatures: !!wallet.features?.sui,
    hasSignAndExecuteTransactionBlock: !!wallet.signAndExecuteTransactionBlock,
    hasSignAndExecuteTransaction: !!wallet.signAndExecuteTransaction,
    hasAccount: !!wallet.account,
    walletKeys: Object.keys(wallet || {}),
  });
  
  throw new Error('Wallet does not support transaction signing. Please use the useSignAndExecuteTransaction hook from @onelabs/dapp-kit in React components, or ensure your wallet is properly connected.');
};

/**
 * Parse OneChain error and return user-friendly message
 */
export const parseOneChainError = (error) => {
  if (!error) return 'Unknown error';
  if (error.message) return error.message;
  if (typeof error === 'string') return error;
  return JSON.stringify(error);
};

/**
 * Get SUI coin balance (native token) using OneChain SDK
 * @param {Object} wallet - Wallet instance from dApp Kit (useCurrentWallet)
 */
export const getSUIBalance = async (wallet) => {
  try {
    if (!wallet?.isConnected) {
      return '0';
    }

    const client = getClient();
    const address = getWalletAddress(wallet);
    
    if (!address) {
      return '0';
    }
    
    const balance = await client.getBalance({
      owner: address,
      coinType: '0x2::sui::SUI'
    });

    // Convert to string (SUI has 9 decimals)
    return (Number(balance.totalBalance) / 1e9).toString();
  } catch (error) {
    console.error('Error getting SUI balance:', error);
    return '0';
  }
};

// Note: OCT balance is handled by CoinDisplay.jsx using useSuiClientQuery
// No separate function needed since OCT is a native token

/**
 * Complete Pomodoro session and earn OCT using OneChain SDK
 * In OneChain: Call Move module function to transfer OCT from treasury
 * 
 * @deprecated Consider using useCompleteSession hook from '../hooks/useGameTransactions' instead
 * The hook provides better React integration, loading states, and automatic effects reporting
 * 
 * @param {Object} wallet - Wallet instance from dApp Kit (useCurrentWallet)
 */
export const completeSessionOnChain = async (wallet) => {
  try {
    if (!wallet?.isConnected) {
      throw new Error('Wallet not connected');
    }

    const client = getClient();
    const address = getWalletAddress(wallet);
    
    if (!address) {
      throw new Error('Wallet address not available');
    }

    // Build transaction using OneChain SDK
    const TransactionClass = await getTransaction();
    const tx = new TransactionClass();
    
    // Call complete_session function in Move module
    // Updated signature: complete_session(game_state: &mut GameState, clock: &Clock, ctx: &mut TxContext)
    // No treasury needed - OCT cannot be minted, rewards are tracked only
    tx.moveCall({
      target: `${ONECHAIN_OBJECT_IDS.gamePackageId}::pomodoro_game::complete_session`,
      arguments: [
        tx.object(ONECHAIN_OBJECT_IDS.gameState), // Shared game state object (mutable)
        tx.object(ONECHAIN_OBJECT_IDS.clock), // Clock object (0x6)
      ],
    });

    // Sign and execute using dApp Kit wallet
    const result = await signAndExecuteTransaction(wallet, tx);

    // Wait for transaction
    await client.waitForTransaction({
      digest: result,
      options: {
        showEffects: true,
        showEvents: true,
      }
    });

    // Update local state
    const state = getGameState();
    state.coins += 1;
    state.completedSessions += 1;
    saveGameState(state);

    return result;
  } catch (error) {
    console.error('Error completing session on-chain:', error);
    const parsed = parseOneChainError(error);
    throw parsed;
  }
};

/**
 * Purchase item (food or toy) using OneChain SDK
 * Updated to use OCT payment with burn mechanism
 * @param {Object} wallet - Wallet instance from dApp Kit (useCurrentWallet)
 * @param {number} itemId - Item ID (1-5 for food, 6-10 for toys)
 * @param {number} amount - Amount to purchase
 * @param {Object} account - Optional account object from useCurrentAccount (recommended)
 */
export const purchaseItemOnChain = async (wallet, itemId, amount = 1, account = null) => {
  try {
    if (!wallet?.isConnected) {
      throw new Error('Wallet not connected');
    }

    const client = getClient();
    const address = getWalletAddress(wallet, account);
    
    if (!address) {
      throw new Error('Wallet address not available. Please ensure your wallet is connected and has an active account.');
    }

    // Get price first (we need to know the cost to split payment)
    // For now, we'll use a helper to get price, or calculate it
    // Prices: food 1-5: 10, 15, 20, 25, 50 | toys 6-10: 10, 15, 20, 25, 30
    const prices = {
      1: 10, 2: 15, 3: 20, 4: 25, 5: 50, // Food
      6: 10, 7: 15, 8: 20, 9: 25, 10: 30  // Toys
    };
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

    // Build transaction using OneChain SDK
    const TransactionClass = await getTransaction();
    const tx = new TransactionClass();
    
    // Split and merge coins to get exact amount needed
    const [primaryCoin, ...mergeCoins] = coins.data;
    if (mergeCoins.length > 0) {
      tx.mergeCoins(tx.object(primaryCoin.coinObjectId), mergeCoins.map(c => tx.object(c.coinObjectId)));
    }
    
    // Split exact payment amount - this returns a transaction result that can be used directly
    const paymentCoin = tx.splitCoins(tx.object(primaryCoin.coinObjectId), [totalCost]);
    
    // Ensure itemId and amount are proper numbers
    const itemIdNum = Number(itemId);
    const amountNum = Number(amount);
    
    if (isNaN(itemIdNum) || isNaN(amountNum)) {
      throw new Error(`Invalid itemId or amount: itemId=${itemId}, amount=${amount}`);
    }
    
    // Call purchase_item function
    // Updated signature: purchase_item(game_state: &GameState, payment: Coin<OCT>, item_id: u8, amount: u64, ctx: &mut TxContext)
    // 100% burn - no treasury needed
    tx.moveCall({
      target: `${ONECHAIN_OBJECT_IDS.gamePackageId}::pomodoro_game::purchase_item`,
      arguments: [
        tx.object(ONECHAIN_OBJECT_IDS.gameState),
        paymentCoin, // Payment coin (100% burn)
        tx.pure.u8(itemIdNum), // Item ID (u8 type) - method-based API
        tx.pure.u64(amountNum), // Amount (u64 type) - method-based API
      ],
    });

    // Sign and execute
    const result = await signAndExecuteTransaction(wallet, tx);
    
    // Wait for transaction
    await client.waitForTransaction({
      digest: result,
    });

    return result;
  } catch (error) {
    console.error('Error purchasing item on-chain:', error);
    const parsed = parseOneChainError(error);
    throw parsed;
  }
};

/**
 * Purchase cat NFT using OneChain SDK
 * In OneChain: Mint CatNFT object
 * @param {Object} wallet - Wallet instance from dApp Kit (useCurrentWallet)
 * @param {number} catTypeId - Cat type ID
 * @param {Object} account - Optional account object from useCurrentAccount (recommended)
 */
export const purchaseCatOnChain = async (wallet, catTypeId, account = null) => {
  try {
    if (!wallet?.isConnected) {
      throw new Error('Wallet not connected');
    }

    const client = getClient();
    const address = getWalletAddress(wallet, account);
    
    if (!address) {
      throw new Error('Wallet address not available. Please ensure your wallet is connected and has an active account.');
    }

    // Get price for cat type
    const prices = { 0: 0, 1: 50, 2: 75, 3: 150 };
    const price = prices[catTypeId] || 0;

    // Build transaction using OneChain SDK
    const TransactionClass = await getTransaction();
    const tx = new TransactionClass();
    
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
    });

    // Sign and execute
    const result = await signAndExecuteTransaction(wallet, tx);
    
    // Wait for transaction and get created objects
    const txResult = await client.waitForTransaction({
      digest: result,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      }
    });

    // Extract NFT object ID from transaction result
    // In Sui/OneChain, minted objects appear in objectChanges
    const createdObjects = txResult.objectChanges?.filter(
      change => change.type === 'created'
    ) || [];

    // Find the CatNFT object
    const catNFT = createdObjects.find(obj => 
      obj.objectType?.includes('catnft::CatNFT')
    );

    if (catNFT && catNFT.objectId) {
      // Store NFT object ID
      const state = getGameState();
      const catId = getStringId(catTypeId) || `cat_${catTypeId}`;
      if (!state.catTokenIds) {
        state.catTokenIds = {};
      }
      state.catTokenIds[catId] = catNFT.objectId;
      saveGameState(state);

      return {
        txHash: result,
        objectId: catNFT.objectId,
        catTypeId: catTypeId
      };
    }

    return { txHash: result };
  } catch (error) {
    console.error('Error purchasing cat on-chain:', error);
    const parsed = parseOneChainError(error);
    throw parsed;
  }
};

/**
 * Feed cat using OneChain SDK
 * In OneChain: Update cat object stats and consume food object
 * @param {Object} wallet - Wallet instance from dApp Kit (useCurrentWallet)
 */
export const feedCatOnChain = async (wallet, account, catObjectId, foodObjectId) => {
  try {
    if (!wallet?.isConnected) {
      throw new Error('Wallet not connected');
    }

    const client = getClient();
    const address = account?.address || getWalletAddress(wallet, account);
    
    if (!address) {
      throw new Error('Wallet address not available');
    }

    console.log('🍖 Feeding cat on-chain...')
    console.log('Cat Object ID:', catObjectId)
    console.log('Food Object ID:', foodObjectId)

    // Verify cat ownership
    const catObject = await client.getObject({
      id: catObjectId,
      options: { showOwner: true, showContent: true }
    });

    if (!catObject.data) {
      throw new Error('Cat not found');
    }

    // Verify food ownership
    const foodObject = await client.getObject({
      id: foodObjectId,
      options: { showOwner: true, showContent: true }
    });

    if (!foodObject.data) {
      throw new Error('Food item not found');
    }

    // Build transaction using OneChain SDK
    const TransactionClass = await getTransaction();
    const tx = new TransactionClass();
    
    // Call feed_cat function
    // Signature: feed_cat(cat: CatNFT, food: FoodItem, clock: &Clock, ctx: &mut TxContext)
    tx.moveCall({
      target: `${ONECHAIN_OBJECT_IDS.gamePackageId}::pomodoro_game::feed_cat`,
      arguments: [
        tx.object(catObjectId),     // cat: CatNFT
        tx.object(foodObjectId),    // food: FoodItem (will be consumed)
        tx.object('0x6'),           // clock: &Clock (shared object)
      ],
    });

    console.log('✅ Transaction built, signing...')

    // Sign and execute
    const result = await signAndExecuteTransaction(wallet, tx);
    
    console.log('✅ Transaction signed:', result)
    
    // Wait for confirmation
    await client.waitForTransaction({
      digest: result,
      options: {
        showEffects: true,
        showEvents: true,
      }
    });

    console.log('✅ Cat fed successfully!')
    return result;
  } catch (error) {
    console.error('Error feeding cat on-chain:', error);
    const parsed = parseOneChainError(error);
    throw parsed;
  }
};

/**
 * Play with cat using OneChain SDK
 * In OneChain: Update cat object stats
 */
export const playWithCatOnChain = async (wallet, catObjectId, toyId = 0) => {
  try {
    if (!wallet?.isConnected) {
      throw new Error('Wallet not connected');
    }

    const client = getClient();
    const address = getWalletAddress(wallet);
    
    if (!address) {
      throw new Error('Wallet address not available');
    }

    // Verify cat ownership
    const catObject = await client.getObject({
      id: catObjectId,
      options: { showOwner: true }
    });

    if (!catObject.data || catObject.data.owner !== `AddressOwner(${address})`) {
      throw new Error('You do not own this cat');
    }

    // Build transaction using OneChain SDK
    const TransactionClass = await getTransaction();
    const tx = new TransactionClass();
    
    // Call play_with_cat function
    tx.moveCall({
      target: `${ONECHAIN_OBJECT_IDS.gamePackageId}::pomodoro_game::play_with_cat`,
      arguments: [
        tx.object(catObjectId), // Cat NFT object
        tx.object(ONECHAIN_OBJECT_IDS.gameState),
        tx.pure.u8(toyId), // Toy ID (0 for pet, >0 for toy) - u8 type (method-based API)
      ],
    });

    // Sign and execute
    const result = await signAndExecuteTransaction(wallet, tx);
    
    await client.waitForTransaction({
      digest: result,
    });

    return result;
  } catch (error) {
    console.error('Error playing with cat on-chain:', error);
    const parsed = parseOneChainError(error);
    throw parsed;
  }
};

/**
 * Get cat stats from object using OneChain SDK
 * In OneChain: Read cat object fields
 */
export const getCatStats = async (wallet, catObjectId) => {
  try {
    if (!wallet?.isConnected) {
      return null;
    }

    const client = getClient();
    
    const catObject = await client.getObject({
      id: catObjectId,
      options: {
        showContent: true,
        showOwner: true
      }
    });

    if (!catObject.data || !catObject.data.content) {
      return null;
    }

    // Extract stats from object fields
    // Structure depends on Move module definition
    const fields = catObject.data.content.fields;
    
    return {
      hunger: fields.hunger || 50,
      happiness: fields.happiness || 50,
      isAlive: fields.is_alive !== undefined ? fields.is_alive : true,
      lastFedTime: fields.last_fed_time || Date.now(),
      daysWithoutFeeding: fields.days_without_feeding || 0
    };
  } catch (error) {
    console.error('Error getting cat stats:', error);
    return null;
  }
};

/**
 * Get owned cat NFTs using OneChain SDK
 * In OneChain: Query objects owned by address with CatNFT type
 */
export const getOwnedCatTokenIds = async (wallet) => {
  try {
    if (!wallet?.isConnected) {
      return [];
    }

    const client = getClient();
    const address = getWalletAddress(wallet);
    
    if (!address) {
      return [];
    }
    
    const catNFTType = `${ONECHAIN_OBJECT_IDS.gamePackageId}::catnft::CatNFT`;
    
    // Get all objects of type CatNFT owned by address
    const objects = await client.getOwnedObjects({
      owner: address,
      filter: {
        StructType: catNFTType
      },
      options: {
        showContent: true,
        showType: true
      }
    });

    return objects.data.map(obj => obj.data.objectId);
  } catch (error) {
    console.error('Error getting owned cat NFTs:', error);
    return [];
  }
};

/**
 * Get cat type ID from object ID using OneChain SDK
 * In OneChain: Query object fields to get cat_type
 */
export const getCatTypeFromTokenId = async (wallet, objectId) => {
  try {
    if (!wallet?.isConnected) {
      return null;
    }

    const client = getClient();
    
    // Get object data
    const object = await client.getObject({
      id: objectId,
      options: {
        showContent: true,
        showType: true
      }
    });

    // Extract cat_type from object fields
    if (object.data?.content && 'fields' in object.data.content) {
      const fields = object.data.content.fields;
      return fields.cat_type || null;
    }

    return null;
  } catch (error) {
    console.error('Error getting cat type from object ID:', error);
    return null;
  }
};

/**
 * Get item balance (food or toy) using OneChain SDK
 * In OneChain: Count owned item objects
 */
export const getItemBalance = async (wallet, itemId) => {
  try {
    if (!wallet?.isConnected) {
      return 0;
    }

    const client = getClient();
    const address = getWalletAddress(wallet);
    
    if (!address) {
      return 0;
    }
    
    // Item type depends on itemId
    // Food items: game_item::FoodItem
    // Toy items: game_item::ToyItem
    const itemType = itemId <= 5 
      ? `${ONECHAIN_OBJECT_IDS.gamePackageId}::game_item::FoodItem`
      : `${ONECHAIN_OBJECT_IDS.gamePackageId}::game_item::ToyItem`;
    
    const objects = await client.getOwnedObjects({
      owner: address,
      filter: {
        StructType: itemType
      },
      options: {
        showContent: true
      }
    });

    // Count items matching the itemId
    return objects.data.filter(obj => {
      const fields = obj.data?.content?.fields;
      return fields && fields.item_id === itemId.toString();
    }).length;
  } catch (error) {
    console.error('Error getting item balance:', error);
    return 0;
  }
};

/**
 * Sync inventory from blockchain using OneChain SDK
 * In OneChain: Query all owned item objects
 */
export const syncInventoryFromBlockchain = async (wallet) => {
  try {
    if (!wallet?.isConnected) {
      return null;
    }

    const client = getClient();
    const address = getWalletAddress(wallet);
    
    if (!address) {
      return null;
    }
    
    // Get all food items
    const foodType = `${ONECHAIN_OBJECT_IDS.gamePackageId}::game_item::FoodItem`;
    const foodObjects = await client.getOwnedObjects({
      owner: address,
      filter: { StructType: foodType },
      options: { showContent: true }
    });

    // Get all toy items
    const toyType = `${ONECHAIN_OBJECT_IDS.gamePackageId}::game_item::ToyItem`;
    const toyObjects = await client.getOwnedObjects({
      owner: address,
      filter: { StructType: toyType },
      options: { showContent: true }
    });

    // Count items by ID
    const foodCounts = {};
    const toyCounts = {};

    foodObjects.data.forEach(obj => {
      const itemId = obj.data?.content?.fields?.item_id;
      if (itemId) {
        const stringId = getStringId(parseInt(itemId));
        if (stringId) {
          foodCounts[stringId] = (foodCounts[stringId] || 0) + 1;
        }
      }
    });

    toyObjects.data.forEach(obj => {
      const itemId = obj.data?.content?.fields?.item_id;
      if (itemId) {
        const stringId = getStringId(parseInt(itemId));
        if (stringId) {
          toyCounts[stringId] = (toyCounts[stringId] || 0) + 1;
        }
      }
    });

    // Merge with localStorage
    const state = getGameState();
    state.inventory.foods = { ...state.inventory.foods, ...foodCounts };
    state.inventory.toys = { ...state.inventory.toys, ...toyCounts };
    saveGameState(state);

    return {
      foods: state.inventory.foods,
      toys: state.inventory.toys
    };
  } catch (error) {
    console.error('Error syncing inventory:', error);
    return null;
  }
};

/**
 * Update cat stats on-chain using OneChain SDK
 * In OneChain: Update cat object fields
 */
export const updateCatStatsOnChain = async (wallet, catObjectId) => {
  try {
    if (!wallet?.isConnected) {
      return null;
    }

    const client = getClient();
    
    // Build transaction to update stats (decay hunger, etc.)
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${ONECHAIN_OBJECT_IDS.gamePackageId}::pomodoro_game::update_cat_stats`,
      arguments: [
        tx.object(catObjectId),
        tx.object(ONECHAIN_OBJECT_IDS.gameState),
      ],
    });

    const result = await signAndExecuteTransaction(wallet, tx);
    await client.waitForTransaction({ digest: result });
    
    return result;
  } catch (error) {
    console.error('Error updating cat stats:', error);
    return null;
  }
};

/**
 * Sync blockchain state (general sync) using OneChain SDK
 */
export const syncBlockchainState = async (wallet) => {
  try {
    if (!wallet?.isConnected || !wallet?.accounts?.[0]?.address) {
      return null;
    }

    // Sync inventory
    await syncInventoryFromBlockchain(wallet);
    
    // Note: OCT balance is handled by CoinDisplay.jsx using useSuiClientQuery
    // No need to sync balance here - it's already displayed in real-time

    return {
      coins: state.coins,
      inventory: state.inventory
    };
  } catch (error) {
    console.error('Error syncing blockchain state:', error);
    return null;
  }
};

