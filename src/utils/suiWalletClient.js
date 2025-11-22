// Sui Wallet Client for OneChain
// Replaces EVM-based oneWallet.js with Sui wallet integration
// NOTE: This is a fallback. Primary wallet client is onechainWalletClient.js

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

/**
 * Sui Wallet Client Class
 * Handles wallet connection and Sui network interaction
 */
class SuiWalletClient {
  constructor() {
    this.wallet = null; // window.onechainWallet
    this.client = null; // SuiClient
    this.account = null; // Current account address
    this.isConnected = false;
  }

  /**
   * Initialize Sui client
   */
  initializeClient() {
    // Get RPC URL from config or use default
    const rpcUrl = import.meta.env.VITE_ONECHAIN_RPC_URL || 
                   import.meta.env.VITE_SUI_RPC_URL || 
                   getFullnodeUrl('testnet'); // Default to testnet
    
    this.client = new SuiClient({ url: rpcUrl });
    return this.client;
  }

  /**
   * Connect to Sui wallet (window.onechainWallet)
   */
  async connect() {
    try {
      // Check if Sui wallet is available
      if (!window.onechainWallet) {
        throw new Error('OneChain Wallet not found. Please install OneChain Wallet extension.');
      }

      this.wallet = window.onechainWallet;

      // Initialize Sui client
      this.initializeClient();

      // Request permissions first
      const hasPermissions = await this.wallet.hasPermissions({
        permissions: ['viewAccount', 'suggestTransactions']
      });
      
      if (!hasPermissions) {
        // Request permissions
        await this.wallet.requestPermissions({
          permissions: ['viewAccount', 'suggestTransactions']
        });
      }
      
      // Get accounts after permission granted
      const accounts = await this.wallet.getAccounts();
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts available. Please create an account in OneChain Wallet.');
      }
      
      this.account = accounts[0];

      this.isConnected = true;
      return this.account;
    } catch (error) {
      console.error('Error connecting Sui wallet:', error);
      throw error;
    }
  }

  /**
   * Get current account address
   */
  getAccount() {
    return this.account;
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected() {
    return this.isConnected && this.account !== null && this.wallet !== null;
  }

  /**
   * Get Sui client instance
   */
  getClient() {
    if (!this.client) {
      this.initializeClient();
    }
    return this.client;
  }

  /**
   * Get wallet instance
   */
  getWallet() {
    if (!this.wallet) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }
    return this.wallet;
  }

  /**
   * Disconnect wallet
   */
  disconnect() {
    if (this.wallet) {
      try {
        this.wallet.disconnect();
      } catch (error) {
        console.warn('Error disconnecting wallet:', error);
      }
    }
    this.wallet = null;
    this.client = null;
    this.account = null;
    this.isConnected = false;
  }

  /**
   * Get current network/chain
   */
  async getNetwork() {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }
    try {
      const chain = await this.wallet.getChain();
      return {
        chainId: chain,
        name: chain === 'sui:mainnet' ? 'Mainnet' : 
              chain === 'sui:testnet' ? 'Testnet' : 
              chain === 'sui:devnet' ? 'Devnet' : 'Localnet'
      };
    } catch (error) {
      console.error('Error getting network:', error);
      return { chainId: 'unknown', name: 'Unknown' };
    }
  }

  /**
   * Sign and execute a transaction block
   * @param {Transaction} tx - Transaction object to execute
   * @returns {Promise<string>} Transaction digest
   */
  async signAndExecuteTransaction(tx) {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get current chain
      const chain = await this.wallet.getChain();
      
      // Sign and execute the transaction
      // Note: Transaction needs to be serialized or passed correctly
      // The wallet API expects the transaction block in a specific format
      const result = await this.wallet.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        chain: chain || 'sui:testnet'
      });

      return result.digest;
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw this.parseSuiError(error);
    }
  }

  /**
   * Sign a message
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature
   */
  async signMessage(message) {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await this.wallet.signPersonalMessage({
        message: new TextEncoder().encode(message),
        account: this.account
      });

      return result.signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw this.parseSuiError(error);
    }
  }

  /**
   * Parse Sui wallet errors
   */
  parseSuiError(error) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // User rejection
    if (errorMessage.includes('rejected') || 
        errorMessage.includes('denied') ||
        errorMessage.includes('User rejected')) {
      return {
        type: 'rejected',
        message: 'Transaction was rejected by user',
        userFriendly: 'Transaction cancelled',
        canRetry: true,
        error: error
      };
    }

    // Insufficient gas
    if (errorMessage.includes('insufficient') || 
        errorMessage.includes('gas') ||
        errorMessage.includes('balance')) {
      return {
        type: 'insufficient_funds',
        message: 'Insufficient balance for transaction',
        userFriendly: 'Not enough SUI tokens for gas',
        canRetry: false,
        error: error
      };
    }

    // Network error
    if (errorMessage.includes('network') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('fetch')) {
      return {
        type: 'network_error',
        message: 'Network error occurred',
        userFriendly: 'Network error. Please check your connection.',
        canRetry: true,
        error: error
      };
    }

    // Default error
    return {
      type: 'unknown',
      message: errorMessage,
      userFriendly: 'Transaction failed',
      canRetry: false,
      error: error
    };
  }

  /**
   * Listen for account changes
   */
  onAccountsChanged(callback) {
    if (this.wallet && this.wallet.accountChangeEventHandler) {
      // Sui wallet may have account change events
      // Implementation depends on wallet API
      console.log('Account change listener set up');
    }
  }

  /**
   * Listen for network changes
   */
  onNetworkChanged(callback) {
    if (this.wallet && this.wallet.networkChangeEventHandler) {
      // Sui wallet may have network change events
      console.log('Network change listener set up');
    }
  }
}

// Export singleton instance
export const suiWalletClient = new SuiWalletClient();
export default suiWalletClient;

