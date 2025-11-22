/**
 * Dynamic Config Loader
 * Fetches contract IDs from public/config.json to prevent caching
 */

let cachedConfig = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch config from server with cache busting
 * @param {boolean} forceRefresh - Force fetch even if cached
 * @returns {Promise<Object>} Config object
 */
export async function loadConfig(forceRefresh = false) {
  const now = Date.now();
  
  // Return cached config if still valid and not forcing refresh
  if (!forceRefresh && cachedConfig && (now - lastFetchTime < CACHE_DURATION)) {
    console.log('📦 Using cached config');
    return cachedConfig;
  }
  
  try {
    console.log('🔄 Fetching fresh config from server...');
    
    // Add timestamp to prevent browser caching
    const timestamp = new Date().getTime();
    const response = await fetch(`/config.json?t=${timestamp}`, {
      cache: 'no-store', // Don't use browser cache
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.status}`);
    }
    
    const config = await response.json();
    
    // Validate config structure
    if (!config.contractIds || !config.contractIds.gamePackageId) {
      throw new Error('Invalid config structure');
    }
    
    cachedConfig = config;
    lastFetchTime = now;
    
    console.log('✅ Config loaded:', {
      version: config.version,
      package: config.contractIds.gamePackageId.substring(0, 10) + '...',
      lastUpdated: config.lastUpdated
    });
    
    return config;
  } catch (error) {
    console.error('❌ Failed to load config:', error);
    
    // Fallback to environment variables if config fetch fails
    console.warn('⚠️ Using fallback environment variables');
    return {
      version: 'fallback',
      contractIds: {
        gamePackageId: import.meta.env.VITE_SUI_GAME_PACKAGE_ID,
        gameState: import.meta.env.VITE_SUI_GAME_STATE_ID,
        treasury: import.meta.env.VITE_SUI_TREASURY_ID,
        upgradeCap: import.meta.env.VITE_SUI_UPGRADE_CAP_ID,
        clock: '0x0000000000000000000000000000000000000000000000000000000000000006'
      },
      network: {
        rpcUrl: import.meta.env.VITE_ONECHAIN_RPC_URL || 'https://rpc-testnet.onelabs.cc:443',
        chainId: parseInt(import.meta.env.VITE_ONECHAIN_CHAIN_ID || '1337'),
        explorerUrl: import.meta.env.VITE_ONECHAIN_EXPLORER_URL || 'https://explorer-testnet.onelabs.cc'
      }
    };
  }
}

/**
 * Get contract IDs (shorthand)
 */
export async function getContractIds() {
  const config = await loadConfig();
  return config.contractIds;
}

/**
 * Force refresh config (call when deploying new contracts)
 */
export async function refreshConfig() {
  console.log('🔄 Force refreshing config...');
  return await loadConfig(true);
}

/**
 * Check if config version changed
 */
export async function checkConfigVersion() {
  const localVersion = localStorage.getItem('config_version');
  const config = await loadConfig();
  
  if (localVersion && localVersion !== config.version) {
    console.log('🆕 New config version detected:', {
      old: localVersion,
      new: config.version
    });
    
    // Clear any cached data
    localStorage.setItem('config_version', config.version);
    
    // Optionally reload the page
    if (confirm('New contract version available. Reload page to update?')) {
      window.location.reload();
    }
  } else {
    localStorage.setItem('config_version', config.version);
  }
}


