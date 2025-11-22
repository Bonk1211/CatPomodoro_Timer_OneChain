// Edge Case Handling Utilities
// Updated to work with dApp Kit (no direct wallet client dependency)
import { checkNetwork, switchToCorrectNetwork } from './blockchainGameState.js';

/**
 * Handle wallet disconnection during transaction
 * @param {Error} error - The error object
 * @param {Function} onDisconnect - Callback when disconnected
 * @param {Object} wallet - Optional wallet object from useCurrentWallet hook
 */
export const handleWalletDisconnection = (error, onDisconnect, wallet = null) => {
  // Check if error indicates disconnection
  const isDisconnected = error?.errorType === 'wallet_disconnected' || 
      error?.requiresReconnect ||
      (wallet && !wallet?.isConnected) ||
      (!wallet && typeof window !== 'undefined' && !window.ethereum && !window.onewallet);
  
  if (isDisconnected) {
    console.warn('Wallet disconnected during transaction');
    
    // Dispatch event for components to handle
    window.dispatchEvent(new CustomEvent('walletDisconnected', {
      detail: { duringTransaction: true, error }
    }));
    
    if (onDisconnect) {
      onDisconnect(error);
    }
    
    return true;
  }
  return false;
};

/**
 * Handle network switch during gameplay
 * @param {Function} onSwitch - Callback when network changes
 * @param {Object} wallet - Optional wallet object from useCurrentWallet hook
 */
export const handleNetworkSwitch = async (onSwitch, wallet = null) => {
  try {
    const networkCheck = await checkNetwork(wallet);
    
    if (!networkCheck.correct) {
      console.warn('Wrong network detected:', networkCheck);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('networkChanged', {
        detail: { 
          correct: false,
          currentChainId: networkCheck.currentChainId,
          expectedChainId: networkCheck.expectedChainId
        }
      }));
      
      if (onSwitch) {
        onSwitch(networkCheck);
      }
      
      return networkCheck;
    }
    
    return { correct: true };
  } catch (error) {
    console.error('Error checking network:', error);
    return { correct: false, error: error.message };
  }
};

/**
 * Setup network change listener
 */
export const setupNetworkListener = (onNetworkChange) => {
  if (window.ethereum || window.onewallet) {
    const provider = window.onewallet || window.ethereum;
    
    const handleChainChanged = async (chainId) => {
      console.log('Chain changed:', chainId);
      // Reload page on chain change to reset state
      // Or handle gracefully
      const networkCheck = await handleNetworkSwitch(onNetworkChange);
      
      if (!networkCheck.correct && onNetworkChange) {
        onNetworkChange(networkCheck);
      }
    };
    
    provider.on('chainChanged', handleChainChanged);
    
    return () => {
      provider.removeListener('chainChanged', handleChainChanged);
    };
  }
  
  return () => {}; // No-op cleanup
};

/**
 * Handle multiple tabs/windows state sync
 */
export const setupMultiTabSync = () => {
  // Listen for storage changes (from other tabs)
  const handleStorageChange = (e) => {
    if (e.key === 'pixelCatPomodoroGameState') {
      // Game state changed in another tab
      console.log('Game state changed in another tab');
      window.dispatchEvent(new CustomEvent('gameStateUpdate'));
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  // Broadcast state changes to other tabs
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    
    if (key === 'pixelCatPomodoroGameState') {
      // Trigger storage event for other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key,
        newValue: value,
        storageArea: localStorage
      }));
    }
  };
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    localStorage.setItem = originalSetItem;
  };
};

/**
 * Handle default cat (not minted yet)
 * Returns true if cat should use localStorage, false if it's an NFT
 */
export const isDefaultCat = (catId, catTokenId) => {
  // Default cat has no tokenId
  if (catId === 'default') {
    return true;
  }
  
  // If cat has no tokenId, treat as default/local
  if (!catTokenId) {
    return true;
  }
  
  return false;
};

/**
 * Check if transaction should be retried
 */
export const shouldRetryTransaction = (error) => {
  if (!error) return false;
  
  // Check canRetry flag
  if (error.canRetry === false) {
    return false;
  }
  
  // Don't retry user rejections
  if (error.errorType === 'rejected') {
    return false;
  }
  
  // Don't retry insufficient funds/gas
  if (error.errorType === 'insufficient_funds' || 
      error.errorType === 'insufficient_gas') {
    return false;
  }
  
  // Retry network errors, timeouts, etc.
  if (error.errorType === 'network_error' ||
      error.errorType === 'timeout' ||
      error.errorType === 'gas_error') {
    return true;
  }
  
  // Default to canRetry flag
  return error.canRetry !== false;
};

/**
 * Handle transaction with retry logic
 */
export const executeWithRetry = async (
  transactionFn,
  maxRetries = 3,
  retryDelay = 1000,
  onRetry = null
) => {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await transactionFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if shouldn't
      if (!shouldRetryTransaction(error)) {
        throw error;
      }
      
      // If not last attempt, wait and retry
      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt + 1, maxRetries, error);
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }
    }
  }
  
  throw lastError;
};

/**
 * Monitor wallet connection status
 * Note: With dApp Kit, wallet connection is handled by the provider
 * This function is kept for backward compatibility but may not work as expected
 * @param {Function} onDisconnect - Callback when disconnected
 * @param {Function} onReconnect - Callback when reconnected
 * @param {Object} wallet - Optional wallet object from useCurrentWallet hook
 */
export const setupWalletMonitor = (onDisconnect, onReconnect, wallet = null) => {
  // With dApp Kit, wallet connection is managed by the provider
  // We can still listen to events if window.ethereum exists
  let isConnected = wallet?.isConnected || 
    (typeof window !== 'undefined' && (window.ethereum || window.onewallet));
  
  const checkConnection = () => {
    const currentlyConnected = wallet?.isConnected || 
      (typeof window !== 'undefined' && (window.ethereum || window.onewallet));
    
    if (isConnected && !currentlyConnected) {
      // Wallet disconnected
      isConnected = false;
      if (onDisconnect) {
        onDisconnect();
      }
      window.dispatchEvent(new CustomEvent('walletDisconnected'));
    } else if (!isConnected && currentlyConnected) {
      // Wallet reconnected
      isConnected = true;
      if (onReconnect) {
        onReconnect();
      }
      window.dispatchEvent(new CustomEvent('walletConnected'));
    }
  };
  
  // Check periodically (only if wallet is provided)
  let interval = null;
  if (wallet) {
    interval = setInterval(checkConnection, 2000);
  }
  
  // Also listen to events if available
  if (typeof window !== 'undefined' && (window.ethereum || window.onewallet)) {
    const provider = window.onewallet || window.ethereum;
    
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // Disconnected
        isConnected = false;
        if (onDisconnect) {
          onDisconnect();
        }
      } else {
        // Connected or account changed
        isConnected = true;
        if (onReconnect) {
          onReconnect();
        }
      }
      checkConnection();
    };
    
    provider.on('accountsChanged', handleAccountsChanged);
    
    return () => {
      if (interval) clearInterval(interval);
      provider.removeListener('accountsChanged', handleAccountsChanged);
    };
  }
  
  return () => {
    if (interval) clearInterval(interval);
  };
};

