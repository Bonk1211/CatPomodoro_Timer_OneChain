// Sui Blockchain Utilities for OneChain
// Replaces EVM-based blockchainGameState.js with Sui object-centric operations

import { suiWalletClient } from './suiWalletClient.js';
import { TransactionBlock } from '@mysten/sui/transactions';
import { getStringId } from './itemMapping.js';
import { getGameState, saveGameState } from './gameState.js';

/**
 * Sui Object IDs Configuration
 * These will be set after Move modules are deployed
 */
const SUI_OBJECT_IDS = {
  // Game module package ID (set after deployment)
  gamePackageId: import.meta.env.VITE_SUI_GAME_PACKAGE_ID || '',
  
  // Treasury/Admin objects
  treasury: import.meta.env.VITE_SUI_TREASURY_ID || '',
  
  // Shared objects for game state
  gameState: import.meta.env.VITE_SUI_GAME_STATE_ID || '',
};

/**
 * Parse Sui error and return user-friendly message
 */
export const parseSuiError = (error) => {
  return suiWalletClient.parseSuiError(error);
};

/**
 * Get SUI coin balance (native token)
 */
export const getSUIBalance = async () => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      return '0';
    }

    const client = suiWalletClient.getClient();
    const address = suiWalletClient.getAccount();
    
    const coins = await client.getCoins({
      owner: address,
      coinType: '0x2::sui::SUI'
    });

    // Sum all SUI coin balances
    const totalBalance = coins.data.reduce((sum, coin) => {
      return sum + BigInt(coin.balance);
    }, BigInt(0));

    // Convert to string (SUI has 9 decimals)
    return (Number(totalBalance) / 1e9).toString();
  } catch (error) {
    console.error('Error getting SUI balance:', error);
    return '0';
  }
};

/**
 * Get CAT coin balance (game token as object)
 * In Sui, tokens are objects, so we need to find owned CAT coin objects
 */
export const getCATCoinBalance = async () => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      // Fallback to localStorage
      const state = getGameState();
      return state.coins.toString();
    }

    const client = suiWalletClient.getClient();
    const address = suiWalletClient.getAccount();
    
    // CAT coin type (will be set after Move module deployment)
    const catCoinType = `${SUI_OBJECT_IDS.gamePackageId}::catcoin::CAT`;
    
    try {
      const coins = await client.getCoins({
        owner: address,
        coinType: catCoinType
      });

      // Sum all CAT coin balances
      const totalBalance = coins.data.reduce((sum, coin) => {
        return sum + BigInt(coin.balance);
      }, BigInt(0));

      return totalBalance.toString();
    } catch (error) {
      // If coin type doesn't exist yet, fallback to localStorage
      console.warn('CAT coin type not found, using localStorage:', error);
      const state = getGameState();
      return state.coins.toString();
    }
  } catch (error) {
    console.error('Error getting CAT coin balance:', error);
    const state = getGameState();
    return state.coins.toString();
  }
};

/**
 * Complete Pomodoro session and mint CAT coins
 * In Sui: Call Move module function to mint coins
 */
export const completeSessionOnChain = async () => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      throw new Error('Wallet not connected');
    }

    const client = suiWalletClient.getClient();
    const wallet = suiWalletClient.getWallet();
    const address = suiWalletClient.getAccount();

    // Build transaction block
    const txb = new TransactionBlock();
    
    // Call complete_session function in Move module
    // This will mint CAT coins to the user
    txb.moveCall({
      target: `${SUI_OBJECT_IDS.gamePackageId}::pomodoro_game::complete_session`,
      arguments: [
        txb.object(SUI_OBJECT_IDS.gameState), // Shared game state object
        txb.pure(address), // User address
      ],
    });

    // Set gas payment
    txb.setGasPayment([]); // Will use default gas

    // Sign and execute
    const result = await suiWalletClient.signAndExecuteTransaction(txb);

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
    const parsed = parseSuiError(error);
    throw parsed;
  }
};

/**
 * Purchase item (food or toy)
 * In Sui: Transfer item object or mint new item object
 */
export const purchaseItemOnChain = async (itemId, amount = 1) => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      throw new Error('Wallet not connected');
    }

    const client = suiWalletClient.getClient();
    const address = suiWalletClient.getAccount();

    // Get item price (from game state or Move module)
    // TODO: Fetch from Move module or shared object
    
    // Build transaction block
    const txb = new TransactionBlock();
    
    // Call purchase_item function
    txb.moveCall({
      target: `${SUI_OBJECT_IDS.gamePackageId}::pomodoro_game::purchase_item`,
      arguments: [
        txb.object(SUI_OBJECT_IDS.gameState),
        txb.object(SUI_OBJECT_IDS.treasury),
        txb.pure(itemId), // Item ID
        txb.pure(amount), // Amount
        txb.pure(address), // Recipient
      ],
    });

    // Sign and execute
    const result = await suiWalletClient.signAndExecuteTransaction(txb);
    
    // Wait for transaction
    await client.waitForTransaction({
      digest: result,
    });

    return result;
  } catch (error) {
    console.error('Error purchasing item on-chain:', error);
    const parsed = parseSuiError(error);
    throw parsed;
  }
};

/**
 * Purchase cat NFT
 * In Sui: Mint CatNFT object
 */
export const purchaseCatOnChain = async (catTypeId) => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      throw new Error('Wallet not connected');
    }

    const client = suiWalletClient.getClient();
    const address = suiWalletClient.getAccount();

    // Build transaction block
    const txb = new TransactionBlock();
    
    // Call purchase_cat function
    txb.moveCall({
      target: `${SUI_OBJECT_IDS.gamePackageId}::pomodoro_game::purchase_cat`,
      arguments: [
        txb.object(SUI_OBJECT_IDS.gameState),
        txb.object(SUI_OBJECT_IDS.treasury),
        txb.pure(catTypeId), // Cat type ID
        txb.pure(address), // Recipient
      ],
    });

    // Sign and execute
    const result = await suiWalletClient.signAndExecuteTransaction(txb);
    
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
    // In Sui, minted objects appear in objectChanges
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
    const parsed = parseSuiError(error);
    throw parsed;
  }
};

/**
 * Feed cat
 * In Sui: Update cat object stats and consume food object
 */
export const feedCatOnChain = async (catObjectId, foodId) => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      throw new Error('Wallet not connected');
    }

    const client = suiWalletClient.getClient();
    const address = suiWalletClient.getAccount();

    // Verify cat ownership
    const catObject = await client.getObject({
      id: catObjectId,
      options: { showOwner: true }
    });

    if (!catObject.data || catObject.data.owner !== `AddressOwner(${address})`) {
      throw new Error('You do not own this cat');
    }

    // Build transaction block
    const txb = new TransactionBlock();
    
    // Call feed_cat function
    txb.moveCall({
      target: `${SUI_OBJECT_IDS.gamePackageId}::pomodoro_game::feed_cat`,
      arguments: [
        txb.object(catObjectId), // Cat NFT object
        txb.object(SUI_OBJECT_IDS.gameState),
        txb.pure(foodId), // Food item ID
      ],
    });

    // Sign and execute
    const result = await suiWalletClient.signAndExecuteTransaction(txb);
    
    await client.waitForTransaction({
      digest: result,
    });

    return result;
  } catch (error) {
    console.error('Error feeding cat on-chain:', error);
    const parsed = parseSuiError(error);
    throw parsed;
  }
};

/**
 * Play with cat
 * In Sui: Update cat object stats
 */
export const playWithCatOnChain = async (catObjectId, toyId = 0) => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      throw new Error('Wallet not connected');
    }

    const client = suiWalletClient.getClient();
    const address = suiWalletClient.getAccount();

    // Verify cat ownership
    const catObject = await client.getObject({
      id: catObjectId,
      options: { showOwner: true }
    });

    if (!catObject.data || catObject.data.owner !== `AddressOwner(${address})`) {
      throw new Error('You do not own this cat');
    }

    // Build transaction block
    const txb = new TransactionBlock();
    
    // Call play_with_cat function
    txb.moveCall({
      target: `${SUI_OBJECT_IDS.gamePackageId}::pomodoro_game::play_with_cat`,
      arguments: [
        txb.object(catObjectId), // Cat NFT object
        txb.object(SUI_OBJECT_IDS.gameState),
        txb.pure(toyId), // Toy ID (0 for pet, >0 for toy)
      ],
    });

    // Sign and execute
    const result = await suiWalletClient.signAndExecuteTransaction(txb);
    
    await client.waitForTransaction({
      digest: result,
    });

    return result;
  } catch (error) {
    console.error('Error playing with cat on-chain:', error);
    const parsed = parseSuiError(error);
    throw parsed;
  }
};

/**
 * Get cat stats from object
 * In Sui: Read cat object fields
 */
export const getCatStats = async (catObjectId) => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      return null;
    }

    const client = suiWalletClient.getClient();
    
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
 * Get owned cat NFTs
 * In Sui: Query objects owned by address with CatNFT type
 */
export const getOwnedCatTokenIds = async () => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      return [];
    }

    const client = suiWalletClient.getClient();
    const address = suiWalletClient.getAccount();
    
    const catNFTType = `${SUI_OBJECT_IDS.gamePackageId}::catnft::CatNFT`;
    
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
 * Get item balance (food or toy)
 * In Sui: Count owned item objects
 */
export const getItemBalance = async (itemId) => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      return 0;
    }

    const client = suiWalletClient.getClient();
    const address = suiWalletClient.getAccount();
    
    // Item type depends on itemId
    // Food items: game_item::FoodItem
    // Toy items: game_item::ToyItem
    const itemType = itemId <= 5 
      ? `${SUI_OBJECT_IDS.gamePackageId}::game_item::FoodItem`
      : `${SUI_OBJECT_IDS.gamePackageId}::game_item::ToyItem`;
    
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
 * Sync inventory from blockchain
 * In Sui: Query all owned item objects
 */
export const syncInventoryFromBlockchain = async () => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      return null;
    }

    const client = suiWalletClient.getClient();
    const address = suiWalletClient.getAccount();
    
    // Get all food items
    const foodType = `${SUI_OBJECT_IDS.gamePackageId}::game_item::FoodItem`;
    const foodObjects = await client.getOwnedObjects({
      owner: address,
      filter: { StructType: foodType },
      options: { showContent: true }
    });

    // Get all toy items
    const toyType = `${SUI_OBJECT_IDS.gamePackageId}::game_item::ToyItem`;
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
 * Update cat stats on-chain
 * In Sui: Update cat object fields
 */
export const updateCatStatsOnChain = async (catObjectId) => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      return null;
    }

    const client = suiWalletClient.getClient();
    
    // Build transaction to update stats (decay hunger, etc.)
    const txb = new TransactionBlock();
    
    txb.moveCall({
      target: `${SUI_OBJECT_IDS.gamePackageId}::pomodoro_game::update_cat_stats`,
      arguments: [
        txb.object(catObjectId),
        txb.object(SUI_OBJECT_IDS.gameState),
      ],
    });

    const result = await suiWalletClient.signAndExecuteTransaction(txb);
    await client.waitForTransaction({ digest: result });
    
    return result;
  } catch (error) {
    console.error('Error updating cat stats:', error);
    return null;
  }
};

/**
 * Sync blockchain state (general sync)
 */
export const syncBlockchainState = async () => {
  try {
    if (!suiWalletClient.isWalletConnected()) {
      return null;
    }

    // Sync inventory
    await syncInventoryFromBlockchain();
    
    // Sync CAT coin balance
    const balance = await getCATCoinBalance();
    
    // Update local state
    const state = getGameState();
    state.coins = parseInt(balance) || state.coins;
    saveGameState(state);

    return {
      coins: state.coins,
      inventory: state.inventory
    };
  } catch (error) {
    console.error('Error syncing blockchain state:', error);
    return null;
  }
};

