// OneChain Connection Utility
// Helper functions for connecting to OneChain with custom RPC endpoints

import { oneChainWalletClient } from './onechainWalletClient.js';
import { ONECHAIN_CONFIG } from '../config/onechain.js';
import { initializeFromCliAlias, getRpcUrlFromAlias, getRecommendedOneChainRpcEndpoints } from './onechainCliConfig.js';

/**
 * Connect to OneChain with custom RPC endpoint
 * @param {string} rpcUrl - Custom RPC endpoint URL
 * @param {Object} options - Connection options
 * @returns {Promise<string>} Connected wallet address
 */
export async function connectToOneChain(rpcUrl, options = {}) {
  try {
    // Validate RPC URL
    if (!rpcUrl) {
      throw new Error('RPC URL is required');
    }

    // Validate URL format
    try {
      new URL(rpcUrl);
    } catch (error) {
      throw new Error('Invalid RPC URL format. Must be a valid URL (e.g., https://rpc.onechain.testnet.io)');
    }

    // Set custom RPC URL
    oneChainWalletClient.setCustomRpcUrl(rpcUrl);

    // Connect wallet
    const address = await oneChainWalletClient.connect();

    console.log('✅ Connected to OneChain:', {
      address,
      rpcUrl,
      network: await oneChainWalletClient.getNetwork()
    });

    return address;
  } catch (error) {
    console.error('❌ Failed to connect to OneChain:', error);
    throw error;
  }
}

/**
 * Get current OneChain connection status
 * @returns {Object} Connection status
 */
export function getOneChainConnectionStatus() {
  const isConnected = oneChainWalletClient.isWalletConnected();
  const account = oneChainWalletClient.getAccount();
  const client = oneChainWalletClient.getClient();

  return {
    isConnected,
    account,
    rpcUrl: client?.transport?.url || ONECHAIN_CONFIG.rpcUrl,
    network: null // Will be populated if connected
  };
}

/**
 * Test OneChain RPC connection
 * @param {string} rpcUrl - RPC endpoint URL to test
 * @returns {Promise<Object>} Connection test result
 */
export async function testOneChainRpc(rpcUrl) {
  try {
    if (!rpcUrl) {
      throw new Error('RPC URL is required');
    }

    // Create a temporary client to test the connection
    const { SuiClient } = await import('@onelabs/sui/client');
    const testClient = new SuiClient({ url: rpcUrl });

    // Try to get the latest checkpoint (lightweight call)
    const checkpoint = await testClient.getLatestCheckpointSequenceNumber();

    return {
      success: true,
      rpcUrl,
      checkpoint,
      message: 'RPC endpoint is reachable and responding'
    };
  } catch (error) {
    return {
      success: false,
      rpcUrl,
      error: error.message,
      message: 'Failed to connect to RPC endpoint'
    };
  }
}

/**
 * Switch to a different OneChain RPC endpoint
 * @param {string} rpcUrl - New RPC endpoint URL
 * @returns {Promise<boolean>} Success status
 */
export async function switchOneChainRpc(rpcUrl) {
  try {
    const wasConnected = oneChainWalletClient.isWalletConnected();
    const previousAccount = oneChainWalletClient.getAccount();

    // Disconnect if currently connected
    if (wasConnected) {
      oneChainWalletClient.disconnect();
    }

    // Set new RPC URL
    oneChainWalletClient.setCustomRpcUrl(rpcUrl);

    // Reconnect if was previously connected
    if (wasConnected && previousAccount) {
      await oneChainWalletClient.connect();
    }

    console.log('✅ Switched to new OneChain RPC:', rpcUrl);
    return true;
  } catch (error) {
    console.error('❌ Failed to switch RPC:', error);
    throw error;
  }
}

// Re-export recommended endpoints from onechainCliConfig
// (getRecommendedOneChainRpcEndpoints is already imported above)

/**
 * Initialize OneChain connection from environment variables
 * Supports OneChain CLI aliases via VITE_ONECHAIN_CLI_ALIAS
 * @returns {Promise<string|null>} Connected address or null
 */
export async function initializeOneChainFromEnv() {
  try {
    let rpcUrl = ONECHAIN_CONFIG.rpcUrl;
    
    // Check if using OneChain CLI alias
    if (ONECHAIN_CONFIG.cli?.useCliAlias) {
      const alias = ONECHAIN_CONFIG.cli.useCliAlias;
      console.log(`🔧 Using OneChain CLI alias: ${alias}`);
      
      const cliRpcUrl = await initializeFromCliAlias(alias);
      if (cliRpcUrl) {
        rpcUrl = cliRpcUrl;
      } else {
        console.warn(`⚠️ CLI alias '${alias}' not found, using fallback RPC`);
      }
    }
    
    if (!rpcUrl || rpcUrl.includes('testnet.sui.io')) {
      console.warn('⚠️ Using default RPC. Set VITE_ONECHAIN_RPC_URL in .env for custom endpoint');
    }

    // Test connection first
    const testResult = await testOneChainRpc(rpcUrl);
    if (!testResult.success) {
      console.error('❌ RPC connection test failed:', testResult.error);
      return null;
    }

    console.log('✅ RPC connection test passed:', rpcUrl);

    // Connect if wallet is available
    if (window.onechainWallet) {
      return await connectToOneChain(rpcUrl);
    } else {
      console.log('ℹ️ OneChain wallet not detected. Set up RPC for when wallet connects.');
      // Still initialize client with RPC URL
      oneChainWalletClient.initializeClient(rpcUrl);
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to initialize OneChain:', error);
    return null;
  }
}

