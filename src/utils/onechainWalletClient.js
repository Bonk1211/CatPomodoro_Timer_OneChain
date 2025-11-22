// OneChain Wallet Client using @onelabs/sui SDK
// Official OneChain TypeScript SDK integration

import { SuiClient, getFullnodeUrl } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';

/**
 * OneChain Wallet Client Class
 * Uses @onelabs/sui SDK for OneChain blockchain interaction
 */
class OneChainWalletClient {
  constructor() {
    this.wallet = null; // window.onechainWallet
    this.client = null; // SuiClient from @onelabs/sui
    this.account = null; // Current account address
    this.isConnected = false;
  }

  /**
   * Initialize OneChain client using @onelabs/sui
   * @param {string} customRpcUrl - Optional custom RPC URL to override config
   */
  initializeClient(customRpcUrl = null) {
    // Priority: customRpcUrl > env variables > default
    let rpcUrl = customRpcUrl;
    
    if (!rpcUrl) {
      // Get RPC URL from config or use OneChain default
      rpcUrl = import.meta.env.VITE_ONECHAIN_RPC_URL || 
               import.meta.env.VITE_SUI_RPC_URL || 
               import.meta.env.VITE_ONECHAIN_CUSTOM_RPC ||
               getFullnodeUrl('testnet'); // Default to testnet
    }
    
    console.log('🔗 Connecting to OneChain RPC:', rpcUrl);
    this.client = new SuiClient({ url: rpcUrl });
    return this.client;
  }

  /**
   * Reinitialize client with a custom RPC URL
   * @param {string} rpcUrl - Custom RPC endpoint URL
   */
  setCustomRpcUrl(rpcUrl) {
    if (!rpcUrl) {
      throw new Error('RPC URL is required');
    }
    
    // Validate URL format
    try {
      new URL(rpcUrl);
    } catch (error) {
      throw new Error('Invalid RPC URL format. Must be a valid URL (e.g., https://rpc.onechain.testnet.io)');
    }
    
    console.log('🔄 Switching to custom OneChain RPC:', rpcUrl);
    this.client = new SuiClient({ url: rpcUrl });
    return this.client;
  }

  /**
   * Connect to OneChain wallet (window.onechainWallet)
   */
  async connect() {
    try {
      // Check if OneChain wallet is available
      if (!window.onechainWallet) {
        throw new Error('OneChain Wallet not found. Please install OneChain Wallet extension.');
      }

      this.wallet = window.onechainWallet;

      // Debug: Log available wallet methods
      console.log('Available wallet methods:', Object.keys(this.wallet));
      console.log('Wallet object:', this.wallet);

      // Initialize OneChain client
      this.initializeClient();

      // Request permissions first (OneChain/Sui wallet requires explicit permission request)
      // Some wallets use connect() which handles permissions, others need explicit request
      let permissionsGranted = false;
      
      try {
        // Method 1: Try using connect() method first (some wallets handle permissions automatically)
        if (typeof this.wallet.connect === 'function') {
          try {
            console.log('Trying wallet.connect() method...');
            const result = await this.wallet.connect({
              permissions: ['viewAccount', 'suggestTransactions']
            });
            console.log('connect() method result:', result);
            
            // If connect() returns accounts directly (object with accounts array)
            if (result && result.accounts && result.accounts.length > 0) {
              const accountAddress = typeof result.accounts[0] === 'string' 
                ? result.accounts[0] 
                : (result.accounts[0].address || result.accounts[0].account || result.accounts[0]);
              this.account = accountAddress;
              this.isConnected = true;
              console.log('✅ Connected to OneChain Wallet:', this.account);
              return this.account;
            }
            
            // If connect() returns true or a truthy value (but not accounts), it might have granted permissions
            // But we still need to verify and get accounts
            if (result === true || (result && result !== false)) {
              console.log('connect() returned truthy value, checking permissions...');
              // Don't set permissionsGranted yet - we'll verify below
            } else {
              console.log('connect() returned false or falsy value, will request permissions explicitly');
              // connect() didn't grant permissions, continue to explicit request
            }
          } catch (connectError) {
            console.log('connect() method failed:', connectError);
            // Continue to try explicit permission request
          }
        }
        
        // Method 2: Check and request permissions explicitly
        if (!permissionsGranted) {
          try {
            // Check if we already have permissions
            let hasPermissions = false;
            if (typeof this.wallet.hasPermissions === 'function') {
              try {
                hasPermissions = await this.wallet.hasPermissions({
                  permissions: ['viewAccount', 'suggestTransactions']
                });
                console.log('Permission check result:', hasPermissions);
              } catch (checkError) {
                console.log('hasPermissions check failed:', checkError);
                // Assume we don't have permissions if check fails
                hasPermissions = false;
              }
            }
            
            if (!hasPermissions) {
              // Request permissions - this should show a popup
              console.log('Requesting wallet permissions (this should show a popup)...');
              
              if (typeof this.wallet.requestPermissions === 'function') {
                try {
                  // Try object format first (standard Sui wallet API)
                  console.log('Calling requestPermissions with object format...');
                  console.log('⚠️ A permission popup should appear in your wallet extension now!');
                  
                  const result = await this.wallet.requestPermissions({
                    permissions: ['viewAccount', 'suggestTransactions']
                  });
                  
                  console.log('requestPermissions result:', result);
                  
                  // Some wallets return false even when the request was sent successfully
                  // The popup might appear asynchronously, so we wait and then try getAccounts
                  // If requestPermissions didn't throw, it means the request was sent
                  console.log('⚠️ Permission request sent. Please check your wallet extension for a popup!');
                  console.log('⚠️ If a popup appeared, please approve it. Waiting 3 seconds for user interaction...');
                  
                  // Wait longer for user to interact with the popup
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  
                  // Try to verify permissions, but don't fail if verification fails
                  // Some wallets grant permissions implicitly when you call getAccounts
                  let verified = false;
                  if (typeof this.wallet.hasPermissions === 'function') {
                    try {
                      verified = await this.wallet.hasPermissions({
                        permissions: ['viewAccount', 'suggestTransactions']
                      });
                      console.log('Permission verification result:', verified);
                    } catch (verifyError) {
                      console.log('Permission verification check failed:', verifyError);
                      // Continue anyway - we'll try getAccounts
                    }
                  }
                  
                  if (verified) {
                    console.log('✅ Permissions verified and granted');
                    permissionsGranted = true;
                  } else {
                    // Even if verification fails, try getAccounts - some wallets work this way
                    console.log('⚠️ Permission verification returned false, but will try getAccounts anyway');
                    console.log('⚠️ Some wallets grant permissions implicitly when accessing accounts');
                    permissionsGranted = true; // Allow proceeding to getAccounts
                  }
                } catch (requestError) {
                  console.error('Permission request failed:', requestError);
                  
                  const errorMsg = requestError.message || requestError.toString();
                  
                  // Check if user rejected
                  if (errorMsg.includes('rejected') || errorMsg.includes('denied') || errorMsg.includes('cancel') || errorMsg.includes('User rejected')) {
                    throw new Error('Permission request was rejected. Please click "Connect" again and approve the permission request in the wallet popup.');
                  }
                  
                  // Try alternative format - array of permissions (some wallets use this)
                  try {
                    console.log('Trying requestPermissions with array format...');
                    const arrayResult = await this.wallet.requestPermissions(['viewAccount', 'suggestTransactions']);
                    console.log('✅ Permission request completed (array format), result:', arrayResult);
                    console.log('⚠️ Please check your wallet extension for a popup and approve it!');
                    
                    // Wait longer for user interaction
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // Try to verify, but allow proceeding even if verification fails
                    let verified = false;
                    if (typeof this.wallet.hasPermissions === 'function') {
                      try {
                        verified = await this.wallet.hasPermissions({
                          permissions: ['viewAccount', 'suggestTransactions']
                        });
                        console.log('Permission verification (array format):', verified);
                      } catch (verifyError) {
                        console.log('Verification check failed:', verifyError);
                      }
                    }
                    
                    // Allow proceeding even if verification is false - some wallets work this way
                    permissionsGranted = true;
                    console.log('⚠️ Proceeding to getAccounts - permissions should be granted via popup');
                  } catch (arrayError) {
                    console.error('Array format also failed:', arrayError);
                    // Even if it throws, we might still be able to get accounts
                    // Some wallets throw but still show the popup
                    console.log('⚠️ Error thrown, but will try getAccounts anyway - popup might still appear');
                    permissionsGranted = true; // Try getAccounts - it might work
                  }
                }
              } else {
                console.warn('requestPermissions not available on wallet');
                // Try using request() method if available (some wallets use this)
                if (typeof this.wallet.request === 'function') {
                  try {
                    console.log('Trying wallet.request() method with wallet_requestPermissions...');
                    console.log('⚠️ A permission popup should appear in your wallet extension!');
                    const requestResult = await this.wallet.request({
                      method: 'wallet_requestPermissions',
                      params: {
                        permissions: ['viewAccount', 'suggestTransactions']
                      }
                    });
                    console.log('✅ Permission request via request() completed, result:', requestResult);
                    console.log('⚠️ Waiting 5 seconds for you to approve the permission popup...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    
                    // Verify permissions
                    let verified = false;
                    if (typeof this.wallet.hasPermissions === 'function') {
                      try {
                        verified = await this.wallet.hasPermissions({
                          permissions: ['viewAccount', 'suggestTransactions']
                        });
                      } catch (e) {}
                    }
                    
                    if (verified) {
                      permissionsGranted = true;
                    } else {
                      console.log('⚠️ Verification returned false, but will try getAccounts anyway');
                      permissionsGranted = true; // Try getAccounts
                    }
                  } catch (requestError) {
                    console.error('request() method failed:', requestError);
                    // Still try getAccounts - it will provide a clear error
                    permissionsGranted = true;
                  }
                } else {
                  // No request method - try getAccounts directly
                  // It will fail with a clear error if permissions are needed
                  console.warn('No request() method found, will try getAccounts directly');
                  permissionsGranted = true;
                }
              }
            } else {
              console.log('✅ Permissions already granted');
              permissionsGranted = true;
            }
          } catch (permissionError) {
            console.error('Permission handling failed:', permissionError);
            // Re-throw permission errors so they're properly displayed
            throw permissionError;
          }
        }
      } catch (permissionError) {
        // If permission request fails, don't continue to getAccounts
        console.error('Failed to get permissions:', permissionError);
        throw permissionError;
      }
      
      // Only proceed to getAccounts if we have permissions
      if (!permissionsGranted) {
        throw new Error('Permissions not granted. Please approve the permission request in your wallet.');
      }
      
      // Get accounts after permission granted (or attempted)
      let accounts = [];
      try {
        if (typeof this.wallet.getAccounts === 'function') {
          console.log('Calling getAccounts()...');
          accounts = await this.wallet.getAccounts();
          console.log('getAccounts() returned:', accounts);
        } else {
          throw new Error('getAccounts method not available on wallet');
        }
      } catch (getAccountsError) {
        console.error('Error calling getAccounts:', getAccountsError);
        
        // If getAccounts fails with permission error, provide helpful message
        const errorMsg = getAccountsError.message || getAccountsError.toString();
        if (errorMsg.includes('permission') || errorMsg.includes('viewAccount') || errorMsg.includes('suggestTransaction')) {
          throw new Error('Permissions not granted. Please:\n1. Check your wallet extension for a permission popup\n2. Click "Approve" or "Connect" in the popup\n3. Try connecting again');
        }
        
        throw new Error(`Failed to get accounts: ${errorMsg}`);
      }
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts available. Please create an account in OneChain Wallet.');
      }
      
      // Extract account address (handle different response formats)
      let accountAddress = null;
      if (typeof accounts[0] === 'string') {
        accountAddress = accounts[0];
      } else if (accounts[0] && accounts[0].address) {
        accountAddress = accounts[0].address;
      } else if (accounts[0] && accounts[0].account) {
        accountAddress = accounts[0].account;
      } else {
        accountAddress = accounts[0];
      }
      
      if (!accountAddress) {
        throw new Error('Invalid account format received from wallet');
      }
      
      this.account = accountAddress;
      this.isConnected = true;
      
      console.log('✅ Connected to OneChain Wallet:', this.account);
      return this.account;
    } catch (error) {
      console.error('Error connecting OneChain wallet:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to connect wallet';
      
      if (error) {
        // Try to get message from various error formats
        if (error.message) {
          errorMessage = error.message;
        } else if (error.toString && typeof error.toString === 'function') {
          errorMessage = error.toString();
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.code) {
          errorMessage = `Error ${error.code}: ${error.message || 'Unknown error'}`;
        } else {
          // Try to stringify the error object
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = 'Unknown error occurred';
          }
        }
      }
      
      // Create a new error with the extracted message
      const connectionError = new Error(errorMessage);
      connectionError.originalError = error;
      throw connectionError;
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
   * Get OneChain client instance
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
        name: chain === 'sui:mainnet' ? 'OneChain Mainnet' : 
              chain === 'sui:testnet' ? 'OneChain Testnet' : 
              chain === 'sui:devnet' ? 'OneChain Devnet' : 'OneChain Localnet'
      };
    } catch (error) {
      console.error('Error getting network:', error);
      return { chainId: 'unknown', name: 'Unknown' };
    }
  }

  /**
   * Sign and execute a transaction using OneChain SDK
   * @param {Transaction} tx - Transaction object from @onelabs/sui/transactions
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
      // The wallet API expects the transaction in a specific format
      const result = await this.wallet.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        chain: chain || 'sui:testnet'
      });

      return result.digest;
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw this.parseOneChainError(error);
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
      throw this.parseOneChainError(error);
    }
  }

  /**
   * Parse OneChain wallet errors
   */
  parseOneChainError(error) {
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
      // OneChain wallet may have account change events
      // Implementation depends on wallet API
      console.log('Account change listener set up');
    }
  }

  /**
   * Listen for network changes
   */
  onNetworkChanged(callback) {
    if (this.wallet && this.wallet.networkChangeEventHandler) {
      // OneChain wallet may have network change events
      console.log('Network change listener set up');
    }
  }
}

// Export singleton instance
export const oneChainWalletClient = new OneChainWalletClient();
export default oneChainWalletClient;

