// OneWallet Integration Utility
// Updated to support OneChain wallet (window.onechainWallet) using @onelabs/sui SDK
import { ethers } from 'ethers';
import { ONECHAIN_CONFIG } from '../config/onechain.js';

// Lazy load wallet clients to avoid import errors on page load
let oneChainWalletClient = null;

// Lazy import function for OneChain wallet client
async function getOneChainWalletClient() {
  if (!oneChainWalletClient) {
    try {
      const module = await import('./onechainWalletClient.js');
      oneChainWalletClient = module.oneChainWalletClient;
    } catch (error) {
      console.warn('Failed to load OneChain wallet client:', error);
      return null;
    }
  }
  return oneChainWalletClient;
}

/**
 * OneWallet Client Class
 * Handles wallet connection and OneChain network interaction
 * Now supports Sui wallet (window.onechainWallet) for OneChain
 */
class OneWalletClient {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.contracts = {};
    this.isConnected = false;
    this.walletType = null; // 'sui' or 'evm'
  }

  /**
   * Initialize and connect to OneWallet
   * Prioritizes Sui wallet (window.onechainWallet) for OneChain
   * Falls back to EVM wallets (MetaMask/ethereum) for compatibility
   */
  async connect() {
    try {
      // Priority 1: Check for OneChain wallet (using @onelabs/sui SDK)
      if (window.onechainWallet) {
        console.log('Detected OneChain Wallet - Using @onelabs/sui SDK');
        this.walletType = 'onechain';
        
        // Lazy load and use OneChain wallet client (official SDK)
        const client = await getOneChainWalletClient();
        if (!client) {
          throw new Error('Failed to load OneChain wallet client');
        }
        this.account = await client.connect();
        this.isConnected = true;
        return this.account;
      }
      
      // Priority 2: Check for EVM OneWallet (legacy)
      if (window.onewallet) {
        console.log('Detected EVM OneWallet (legacy)');
        this.walletType = 'evm';
        this.provider = new ethers.BrowserProvider(window.onewallet);
      } 
      // Priority 3: Fallback to MetaMask/ethereum (EVM)
      else if (window.ethereum) {
        console.log('Detected MetaMask/Ethereum provider');
        this.walletType = 'evm';
        this.provider = new ethers.BrowserProvider(window.ethereum);
      } 
      else {
        throw new Error('No wallet found. Please install OneChain Wallet (Sui) or MetaMask.');
      }

      // EVM wallet connection flow
      if (this.walletType === 'evm') {
        // Request account access
        await this.provider.send('eth_requestAccounts', []);
        this.signer = await this.provider.getSigner();
        this.account = await this.signer.getAddress();
        
        // Switch to OneChain network (if EVM-compatible)
        await this.switchToOneChain();
        
        this.isConnected = true;
        return this.account;
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  /**
   * Switch to OneChain network
   */
  async switchToOneChain() {
    const chainIdHex = `0x${ONECHAIN_CONFIG.chainId.toString(16)}`;
    
    try {
      // Try to switch to OneChain
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: chainIdHex }
      ]);
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          // Add OneChain network
          await this.provider.send('wallet_addEthereumChain', [
            {
              chainId: chainIdHex,
              chainName: ONECHAIN_CONFIG.chainName,
              nativeCurrency: ONECHAIN_CONFIG.nativeCurrency,
              rpcUrls: [ONECHAIN_CONFIG.rpcUrl],
              blockExplorerUrls: [ONECHAIN_CONFIG.blockExplorerUrl],
            },
          ]);
        } catch (addError) {
          console.error('Error adding OneChain network:', addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  }

  /**
   * Get contract instance (EVM only)
   */
  getContract(contractName, abi) {

    if (!this.signer) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    const address = ONECHAIN_CONFIG.contracts[contractName];
    if (!address) {
      throw new Error(`Contract address not found for ${contractName}`);
    }

    // Cache contract instances
    const cacheKey = `${contractName}-${address}`;
    if (!this.contracts[cacheKey]) {
      this.contracts[cacheKey] = new ethers.Contract(address, abi, this.signer);
    }

    return this.contracts[cacheKey];
  }

  /**
   * Get wallet type
   */
  getWalletType() {
    return this.walletType;
  }

  /**
   * Check if using OneChain wallet (official SDK)
   */
  isOneChainWallet() {
    return this.walletType === 'onechain';
  }


  /**
   * Get current account address
   */
  getAccount() {
    if (this.walletType === 'onechain' && oneChainWalletClient) {
      return oneChainWalletClient.getAccount();
    }
    return this.account;
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected() {
    if (this.walletType === 'onechain' && oneChainWalletClient) {
      return oneChainWalletClient.isWalletConnected();
    }
    return this.isConnected && this.account !== null;
  }

  /**
   * Disconnect wallet
   */
  disconnect() {
    if (this.walletType === 'onechain' && oneChainWalletClient) {
      oneChainWalletClient.disconnect();
    }
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.contracts = {};
    this.isConnected = false;
    this.walletType = null;
  }

  /**
   * Get network information
   */
  async getNetwork() {
    if (this.walletType === 'onechain' && oneChainWalletClient) {
      return await oneChainWalletClient.getNetwork();
    }
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    return await this.provider.getNetwork();
  }

  /**
   * Listen for account changes
   */
  onAccountsChanged(callback) {
    if (this.walletType === 'onechain' && oneChainWalletClient) {
      oneChainWalletClient.onAccountsChanged(callback);
      return;
    }
    if (window.ethereum || window.onewallet) {
      const provider = window.onewallet || window.ethereum;
      provider.on('accountsChanged', callback);
    }
  }

  /**
   * Listen for chain changes
   */
  onChainChanged(callback) {
    if (this.walletType === 'onechain' && oneChainWalletClient) {
      oneChainWalletClient.onNetworkChanged(callback);
      return;
    }
    if (window.ethereum || window.onewallet) {
      const provider = window.onewallet || window.ethereum;
      provider.on('chainChanged', callback);
    }
  }
}

// Export singleton instance
export const oneWalletClient = new OneWalletClient();
export default oneWalletClient;

