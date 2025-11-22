// Blockchain Game State Management
// Updated to use Move contracts via OneChain SDK
// Uses onechainBlockchainUtils.js for Move contract interactions

import { 
  completeSessionOnChain as completeSessionMove,
  purchaseItemOnChain as purchaseItemMove,
  purchaseCatOnChain as purchaseCatMove,
  feedCatOnChain as feedCatMove,
  playWithCatOnChain as playWithCatMove,
  updateCatStatsOnChain as updateCatStatsMove,
  getCatStats as getCatStatsMove,
  getOwnedCatTokenIds as getOwnedCatTokenIdsMove,
  getCatTypeFromTokenId as getCatTypeFromTokenIdMove,
  getItemBalance as getItemBalanceMove,
  syncInventoryFromBlockchain as syncInventoryMove,
  syncBlockchainState as syncBlockchainStateMove,
  parseOneChainError
} from './onechainBlockchainUtils.js';
import { getAllFoodIds, getAllToyIds, getStringId } from './itemMapping.js';
import { getGameState, saveGameState, getAllCatTokenIds } from './gameState.js';

/**
 * Parse blockchain error and return user-friendly message
 * Wrapper around parseOneChainError for consistency
 */
const parseBlockchainError = (error) => {
  const parsed = parseOneChainError(error);
  
  // Enhanced error parsing for common Move/Sui errors
  const errorMessage = error?.message || parsed || 'Unknown error';
  
  // User rejected transaction
  if (errorMessage.includes('user rejected') || 
      errorMessage.includes('User denied') ||
      errorMessage.includes('rejected') ||
      errorMessage.includes('User rejected the request')) {
    return {
      type: 'rejected',
      message: 'Transaction was rejected. Please try again.',
      userFriendly: 'Transaction cancelled',
      canRetry: true
    };
  }
  
  // Wrong network
  if (errorMessage.includes('wrong network') ||
      errorMessage.includes('network mismatch') ||
      errorMessage.includes('unsupported chain')) {
    return {
      type: 'wrong_network',
      message: 'Wrong network detected. Please switch to OneChain network.',
      userFriendly: 'Wrong network',
      canRetry: false,
      requiresNetworkSwitch: true
    };
  }
  
  // Network disconnection
  if (errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('Failed to fetch')) {
    return {
      type: 'network_error',
      message: 'Network error. Please check your connection and try again.',
      userFriendly: 'Network error',
      canRetry: true
    };
  }
  
  // Insufficient gas
  if (errorMessage.includes('insufficient funds for gas') ||
      errorMessage.includes('gas required exceeds allowance') ||
      errorMessage.includes('gas price too low')) {
    return {
      type: 'insufficient_gas',
      message: 'Insufficient gas. Please ensure you have enough native tokens (OCT/SUI) for gas fees.',
      userFriendly: 'Insufficient gas',
      canRetry: false
    };
  }
  
  // Insufficient funds (CAT coins)
  if (errorMessage.includes('insufficient funds') ||
      errorMessage.includes('insufficient balance') ||
      errorMessage.includes('balance too low')) {
    return {
      type: 'insufficient_funds',
      message: 'Insufficient CAT coins. Complete more Pomodoro sessions to earn coins.',
      userFriendly: 'Not enough CAT coins',
      canRetry: false
    };
  }
  
  // Move-specific errors
  if (errorMessage.includes('Move abort')) {
    return {
      type: 'move_error',
      message: 'Transaction failed. Please check your inputs and try again.',
      userFriendly: 'Transaction failed',
      canRetry: true
    };
  }
  
  // Object not found
  if (errorMessage.includes('not found') ||
      errorMessage.includes('does not exist')) {
    return {
      type: 'object_not_found',
      message: 'Object not found. Please refresh and try again.',
      userFriendly: 'Object not found',
      canRetry: true
    };
  }
  
  // Default error
  return {
    type: 'unknown_error',
    message: errorMessage.length > 100 
      ? 'An unexpected error occurred. Please try again.' 
      : errorMessage,
    userFriendly: 'Transaction failed',
    canRetry: true
  };
};

/**
 * Check if connected to correct network
 * @param {Object} wallet - Wallet from useCurrentWallet hook (optional, for backward compatibility)
 */
export const checkNetwork = async (wallet) => {
  // If wallet is provided, check it
  if (wallet) {
    if (!wallet?.isConnected) {
      return { correct: false, error: 'Wallet not connected' };
    }
    // Network check is handled by dApp Kit
    return { correct: true };
  }
  
  // If no wallet provided, check if window.ethereum or window.onewallet exists
  // (for backward compatibility with old code)
  if (typeof window !== 'undefined' && (window.ethereum || window.onewallet)) {
    try {
      // Network check is handled by dApp Kit
      return { correct: true };
    } catch (error) {
      console.error('Error checking network:', error);
      return { correct: false, error: error.message };
    }
  }
  
  return { correct: false, error: 'Wallet not available' };
};

/**
 * Switch to correct network
 * Note: With dApp Kit, network switching is handled automatically by the wallet
 * This function is kept for backward compatibility
 * @param {Object} wallet - Wallet from useCurrentWallet hook (optional)
 */
export const switchToCorrectNetwork = async (wallet) => {
  // With dApp Kit, network switching is handled by the wallet provider
  // This is a no-op for now, but kept for backward compatibility
  if (wallet?.isConnected) {
    return { success: true };
  }
  
  // Fallback for old code
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      // Try to switch network (this would need the chain ID)
      // For now, just return success as dApp Kit handles this
      return { success: true };
    } catch (error) {
      console.error('Error switching network:', error);
      return { success: false, error: error.message };
    }
  }
  
  return { success: false, error: 'Wallet not available' };
};

/**
 * Complete Pomodoro session on-chain using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 */
export const completeSessionOnChain = async (wallet) => {
  if (!wallet?.isConnected) {
    const error = new Error('Please connect your wallet first');
    error.userFriendly = 'Wallet not connected';
    error.errorType = 'wallet_disconnected';
    throw error;
  }

  try {
    const result = await completeSessionMove(wallet);
    return result;
  } catch (error) {
    console.error('Error completing session:', error);
    const parsedError = parseBlockchainError(error);
    // Create a new error object if the caught error is a string
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    errorObj.userFriendly = parsedError.userFriendly;
    errorObj.errorType = parsedError.type;
    errorObj.errorMessage = parsedError.message;
    errorObj.canRetry = parsedError.canRetry;
    errorObj.requiresNetworkSwitch = parsedError.requiresNetworkSwitch;
    errorObj.requiresReconnect = parsedError.requiresReconnect;
    throw errorObj;
  }
};

/**
 * Purchase item on-chain using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 * @param {number} itemId - Item ID
 * @param {number} amount - Amount to purchase
 * @param {Object} account - Optional account object from useCurrentAccount (recommended)
 */
export const purchaseItemOnChain = async (wallet, itemId, amount, account = null) => {
  if (!wallet?.isConnected) {
    const error = new Error('Please connect your wallet first');
    error.userFriendly = 'Wallet not connected';
    error.errorType = 'wallet_disconnected';
    throw error;
  }

  try {
    const result = await purchaseItemMove(wallet, itemId, amount, account);
    return result;
  } catch (error) {
    console.error('Error purchasing item:', error);
    const parsedError = parseBlockchainError(error);
    // Create a new error object if the caught error is a string
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    errorObj.userFriendly = parsedError.userFriendly;
    errorObj.errorType = parsedError.type;
    errorObj.errorMessage = parsedError.message;
    errorObj.canRetry = parsedError.canRetry;
    errorObj.requiresNetworkSwitch = parsedError.requiresNetworkSwitch;
    errorObj.requiresReconnect = parsedError.requiresReconnect;
    throw errorObj;
  }
};

/**
 * Purchase cat on-chain using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 * @param {number} catTypeId - Cat type ID
 * @param {Object} account - Optional account object from useCurrentAccount (recommended)
 */
export const purchaseCatOnChain = async (wallet, catTypeId, account = null) => {
  if (!wallet?.isConnected) {
    const error = new Error('Please connect your wallet first');
    error.userFriendly = 'Wallet not connected';
    error.errorType = 'wallet_disconnected';
    throw error;
  }

  try {
    const result = await purchaseCatMove(wallet, catTypeId, account);
    
    // Store object ID in localStorage
    if (result.objectId) {
      const state = getGameState();
      const catId = getStringId(catTypeId) || `cat_${catTypeId}`;
      if (!state.catTokenIds) {
        state.catTokenIds = {};
      }
      state.catTokenIds[catId] = result.objectId;
      saveGameState(state);
    }
    
    return {
      txHash: result.txHash || result,
      tokenId: result.objectId,
      catTypeId: catTypeId
    };
  } catch (error) {
    console.error('Error purchasing cat:', error);
    const parsedError = parseBlockchainError(error);
    // Create a new error object if the caught error is a string
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    errorObj.userFriendly = parsedError.userFriendly;
    errorObj.errorType = parsedError.type;
    errorObj.errorMessage = parsedError.message;
    errorObj.canRetry = parsedError.canRetry;
    errorObj.requiresNetworkSwitch = parsedError.requiresNetworkSwitch;
    errorObj.requiresReconnect = parsedError.requiresReconnect;
    throw errorObj;
  }
};

/**
 * Feed cat on-chain using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 * @param {string} catObjectId - Cat NFT object ID
 * @param {number} foodId - Food item ID
 */
export const feedCatOnChain = async (wallet, account, catObjectId, foodObjectId) => {
  if (!wallet?.isConnected) {
    const error = new Error('Please connect your wallet first');
    error.userFriendly = 'Wallet not connected';
    error.errorType = 'wallet_disconnected';
    throw error;
  }

  try {
    const result = await feedCatMove(wallet, account, catObjectId, foodObjectId);
    return result;
  } catch (error) {
    console.error('Error feeding cat:', error);
    const parsedError = parseBlockchainError(error);
    // Create a new error object if the caught error is a string
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    errorObj.userFriendly = parsedError.userFriendly;
    errorObj.errorType = parsedError.type;
    errorObj.errorMessage = parsedError.message;
    errorObj.canRetry = parsedError.canRetry;
    errorObj.requiresNetworkSwitch = parsedError.requiresNetworkSwitch;
    errorObj.requiresReconnect = parsedError.requiresReconnect;
    throw errorObj;
  }
};

/**
 * Play with cat on-chain using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 * @param {string} catObjectId - Cat NFT object ID
 * @param {number} toyId - Toy item ID (0 for pet, >0 for toy)
 */
export const playWithCatOnChain = async (wallet, catObjectId, toyId) => {
  if (!wallet?.isConnected) {
    const error = new Error('Please connect your wallet first');
    error.userFriendly = 'Wallet not connected';
    error.errorType = 'wallet_disconnected';
    throw error;
  }

  try {
    const result = await playWithCatMove(wallet, catObjectId, toyId);
    return result;
  } catch (error) {
    console.error('Error playing with cat:', error);
    const parsedError = parseBlockchainError(error);
    // Create a new error object if the caught error is a string
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    errorObj.userFriendly = parsedError.userFriendly;
    errorObj.errorType = parsedError.type;
    errorObj.errorMessage = parsedError.message;
    errorObj.canRetry = parsedError.canRetry;
    errorObj.requiresNetworkSwitch = parsedError.requiresNetworkSwitch;
    errorObj.requiresReconnect = parsedError.requiresReconnect;
    throw errorObj;
  }
};

/**
 * Update cat stats on-chain using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 * @param {string} catObjectId - Cat NFT object ID
 */
export const updateCatStatsOnChain = async (wallet, catObjectId) => {
  if (!wallet?.isConnected) {
    throw new Error('Please connect your wallet first');
  }

  try {
    const result = await updateCatStatsMove(wallet, catObjectId);
    return result;
  } catch (error) {
    console.error('Error updating cat stats:', error);
    throw error;
  }
};

/**
 * Get coin balance (OCT) - returns localStorage balance
 * Note: OCT balance is handled by CoinDisplay.jsx using useSuiClientQuery
 * This function is kept for backward compatibility
 * @param {Object} wallet - Wallet from useCurrentWallet hook (unused, kept for compatibility)
 */
export const getCATCoinBalance = async (wallet) => {
  // Return localStorage balance (OCT is native token, balance shown in CoinDisplay)
  const state = getGameState();
  return state.coins.toString();
};

/**
 * Get cat NFT balance using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 */
export const getCatNFTBalance = async (wallet) => {
  if (!wallet?.isConnected) {
    return 0;
  }

  try {
    const tokenIds = await getOwnedCatTokenIdsMove(wallet);
    return tokenIds.length;
  } catch (error) {
    console.error('Error getting cat balance:', error);
    return 0;
  }
};

/**
 * Get all owned cat NFT tokenIds using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 */
export const getOwnedCatTokenIds = async (wallet) => {
  if (!wallet?.isConnected) {
    return [];
  }

  try {
    const objectIds = await getOwnedCatTokenIdsMove(wallet);
    
    // Merge with localStorage
    const storedTokenIds = getAllCatTokenIds();
    const allIds = [...new Set([...objectIds, ...Object.values(storedTokenIds)])];
    
    return allIds;
  } catch (error) {
    console.error('Error getting owned cat tokenIds:', error);
    // Fallback to localStorage
    const storedTokenIds = getAllCatTokenIds();
    return Object.values(storedTokenIds).filter(id => id !== null && id !== undefined);
  }
};

/**
 * Get cat type ID from object ID using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 * @param {string} objectId - Cat NFT object ID
 */
export const getCatTypeFromTokenId = async (wallet, objectId) => {
  if (!wallet?.isConnected) {
    return null;
  }

  try {
    const catType = await getCatTypeFromTokenIdMove(wallet, objectId);
    return catType ? parseInt(catType) : null;
  } catch (error) {
    console.error('Error getting cat type from tokenId:', error);
    return null;
  }
};

/**
 * Get item balance using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 * @param {number} itemId - Item ID
 */
export const getItemBalance = async (wallet, itemId) => {
  if (!wallet?.isConnected) {
    return 0;
  }

  try {
    const balance = await getItemBalanceMove(wallet, itemId);
    return balance;
  } catch (error) {
    console.error('Error getting item balance:', error);
    return 0;
  }
};

/**
 * Get cat stats using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 * @param {string} catObjectId - Cat NFT object ID
 */
export const getCatStats = async (wallet, catObjectId) => {
  if (!wallet?.isConnected) {
    return null;
  }

  try {
    const stats = await getCatStatsMove(wallet, catObjectId);
    return stats;
  } catch (error) {
    console.error('Error getting cat stats:', error);
    return null;
  }
};

/**
 * Sync inventory from blockchain using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 */
export const syncInventoryFromBlockchain = async (wallet) => {
  if (!wallet?.isConnected) {
    console.log('Wallet not connected, skipping inventory sync');
    return null;
  }

  try {
    const result = await syncInventoryMove(wallet);
    return result;
  } catch (error) {
    console.error('Error syncing inventory from blockchain:', error);
    return null;
  }
};

/**
 * Sync blockchain state (general sync) using Move contracts
 * @param {Object} wallet - Wallet from useCurrentWallet hook
 */
export const syncBlockchainState = async (wallet) => {
  if (!wallet?.isConnected) {
    return null;
  }

  try {
    const result = await syncBlockchainStateMove(wallet);
    return result;
  } catch (error) {
    console.error('Error syncing blockchain state:', error);
    return null;
  }
};

// Note: Staking functions are not yet implemented in Move contracts
// These will be added when staking is implemented in the Move modules
