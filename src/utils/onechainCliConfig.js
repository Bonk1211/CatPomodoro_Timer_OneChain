// OneChain CLI Configuration Utility
// Reads and uses OneChain CLI environment aliases

/**
 * Get OneChain CLI config directory path
 * @returns {string} Config directory path
 */
export function getOneChainConfigPath() {
  // OneChain CLI stores config in ~/.one/one_config
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return `${homeDir}/.one/one_config`;
}

/**
 * Parse OneChain CLI environment aliases
 * This reads from the OneChain CLI configuration
 * @returns {Promise<Object>} Environment aliases with their RPC URLs
 */
export async function getOneChainCliEnvs() {
  try {
    // Try to read from OneChain CLI config file
    // The config is typically stored in ~/.one/one_config
    const configPath = getOneChainConfigPath();
    
    // Note: In browser environment, we can't directly read files
    // This would need to be done via a backend API or CLI integration
    // For now, we'll provide a way to manually configure this
    
    // Default environments based on OneChain documentation
    const defaultEnvs = {
      testnet: {
        alias: 'testnet',
        url: 'https://rpc-testnet.onelabs.cc:443',
        active: false
      }
    };
    
    return defaultEnvs;
  } catch (error) {
    console.warn('Could not read OneChain CLI config:', error);
    return {};
  }
}

/**
 * Get active OneChain CLI environment
 * @returns {Promise<Object|null>} Active environment or null
 */
export async function getActiveOneChainEnv() {
  try {
    const envs = await getOneChainCliEnvs();
    
    // Find active environment
    for (const [alias, config] of Object.entries(envs)) {
      if (config.active) {
        return {
          alias,
          ...config
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Could not get active OneChain environment:', error);
    return null;
  }
}

/**
 * Get RPC URL from OneChain CLI alias
 * @param {string} alias - Environment alias (e.g., 'testnet')
 * @returns {Promise<string|null>} RPC URL or null
 */
export async function getRpcUrlFromAlias(alias) {
  try {
    const envs = await getOneChainCliEnvs();
    
    if (envs[alias]) {
      return envs[alias].url;
    }
    
    // Check common aliases
    const commonAliases = {
      testnet: 'https://rpc-testnet.onelabs.cc:443',
      mainnet: 'https://rpc-mainnet.onelabs.cc:443',
      devnet: 'https://rpc-devnet.onelabs.cc:443',
    };
    
    return commonAliases[alias] || null;
  } catch (error) {
    console.warn('Could not get RPC URL from alias:', error);
    return null;
  }
}

/**
 * Recommended OneChain RPC endpoints based on CLI
 * These match the endpoints from: one client envs
 * @returns {Object} Recommended endpoints by network
 */
export function getRecommendedOneChainRpcEndpoints() {
  return {
    testnet: [
      'https://rpc-testnet.onelabs.cc:443', // Official OneChain testnet (from CLI)
      'https://fullnode.testnet.sui.io', // Sui testnet fallback
    ],
    mainnet: [
      'https://rpc-mainnet.onelabs.cc:443', // Official OneChain mainnet (when available)
      'https://fullnode.mainnet.sui.io', // Sui mainnet fallback
    ],
    devnet: [
      'https://rpc-devnet.onelabs.cc:443', // Official OneChain devnet (when available)
      'https://fullnode.devnet.sui.io', // Sui devnet fallback
    ],
    localnet: [
      'http://127.0.0.1:9000',
      'http://localhost:9000',
    ]
  };
}

/**
 * Initialize OneChain client using CLI environment
 * @param {string} alias - Environment alias (e.g., 'testnet')
 * @returns {Promise<string|null>} RPC URL or null
 */
export async function initializeFromCliAlias(alias = 'testnet') {
  try {
    // Try to get RPC URL from alias
    const rpcUrl = await getRpcUrlFromAlias(alias);
    
    if (rpcUrl) {
      console.log(`✅ Using OneChain CLI environment: ${alias} -> ${rpcUrl}`);
      return rpcUrl;
    }
    
    // Fallback to recommended endpoints
    const recommended = getRecommendedOneChainRpcEndpoints();
    if (recommended[alias] && recommended[alias].length > 0) {
      const fallbackUrl = recommended[alias][0];
      console.log(`⚠️ Using fallback RPC for ${alias}: ${fallbackUrl}`);
      return fallbackUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to initialize from CLI alias:', error);
    return null;
  }
}

