// OneChain Network Configuration
// Updated for Sui blockchain architecture

export const ONECHAIN_CONFIG = {
  // OneChain RPC endpoints (Sui RPC)
  // Priority: VITE_ONECHAIN_RPC_URL > VITE_ONECHAIN_CLI_ALIAS > VITE_SUI_RPC_URL > default
  // 
  // Option 1: Set VITE_ONECHAIN_RPC_URL in .env file to use custom OneChain RPC endpoint
  // Option 2: Set VITE_ONECHAIN_CLI_ALIAS to use OneChain CLI environment alias (e.g., 'testnet')
  // 
  // OneChain CLI testnet: https://rpc-testnet.onelabs.cc:443
  rpcUrl: import.meta.env.VITE_ONECHAIN_RPC_URL || 
          import.meta.env.VITE_ONECHAIN_CUSTOM_RPC || // Custom RPC endpoint
          import.meta.env.VITE_SUI_RPC_URL || 
          'https://rpc-testnet.onelabs.cc:443', // Default to OneChain testnet
  
  // Sui network configuration
  // OneChain uses Sui blockchain, so we use Sui network IDs
  network: import.meta.env.VITE_SUI_NETWORK || 'testnet', // 'mainnet', 'testnet', 'devnet', 'localnet'
  chainId: import.meta.env.VITE_SUI_NETWORK === 'mainnet' ? 'sui:mainnet' :
           import.meta.env.VITE_SUI_NETWORK === 'testnet' ? 'sui:testnet' :
           import.meta.env.VITE_SUI_NETWORK === 'devnet' ? 'sui:devnet' : 'sui:localnet',
  chainName: import.meta.env.VITE_SUI_NETWORK === 'mainnet' ? 'Sui Mainnet' :
             import.meta.env.VITE_SUI_NETWORK === 'testnet' ? 'Sui Testnet' :
             import.meta.env.VITE_SUI_NETWORK === 'devnet' ? 'Sui Devnet' : 'Sui Localnet',
  
  nativeCurrency: {
    name: 'OCT',
    symbol: 'OCT',
    decimals: 9, // OCT uses 9 decimals (same as SUI)
  },
  
  // Block explorer
  blockExplorerUrl: import.meta.env.VITE_ONECHAIN_EXPLORER_URL || 
                   import.meta.env.VITE_SUI_EXPLORER_URL ||
                   'https://suiexplorer.com',
  
  // Move Package ID (replaces contract addresses)
  // This is the package ID after deploying Move modules
  // UPDATED: Latest deployment with 100 OCT daily cap (Admin: 0xbb22...)
  suiPackageId: import.meta.env.VITE_SUI_GAME_PACKAGE_ID || '0xaa248b205bb247b4cafb6d8243ffe29118721b97bcefd33c87b239b642768de3',
  
  // Object IDs (Sui objects, not contract addresses)
  suiObjects: {
    // Game state shared object
    gameState: import.meta.env.VITE_SUI_GAME_STATE_ID || '0xf49315984fdddeebabd6f29577c263a8475ef5ff80f622c46034a31f5d52baf6',
    // OCT treasury (shared) - funded with 2 OCT
    treasury: import.meta.env.VITE_SUI_TREASURY_ID || '0xc68322e94e54691ce03c3e37c85cb16e5c1fd87a94d3680651f38203e4436e76',
    // Upgrade cap (owned by admin) - for package upgrades
    upgradeCap: import.meta.env.VITE_SUI_UPGRADE_CAP_ID || '0x9ba362fe41081d9b28dcf20804bba67c2dd9b5886abbe579419b2d49ff8ae440',
  },
  
  // Legacy EVM contract addresses (for backward compatibility)
  // These are not used with Sui wallet, but kept for reference
  contracts: {
    CATCoin: import.meta.env.VITE_CAT_COIN_ADDRESS || '',
    CatNFT: import.meta.env.VITE_CAT_NFT_ADDRESS || '',
    GameItem: import.meta.env.VITE_GAME_ITEM_ADDRESS || '',
    PomodoroGame: import.meta.env.VITE_GAME_CONTRACT_ADDRESS || '',
  },
  
  // OneWallet configuration (Sui wallet)
  oneWallet: {
    // Sui wallet detection
    suiWalletName: 'OneChain Wallet',
    // Supported networks
    supportedNetworks: ['sui:mainnet', 'sui:testnet', 'sui:devnet', 'sui:localnet'],
    // Default network
    defaultNetwork: 'sui:testnet',
  },
  
  // OneChain CLI configuration
  cli: {
    // Use OneChain CLI environment alias
    // Set VITE_ONECHAIN_CLI_ALIAS in .env (e.g., 'testnet')
    // This will use the RPC URL from: one client envs
    useCliAlias: import.meta.env.VITE_ONECHAIN_CLI_ALIAS || null,
    // Config directory path
    configPath: '~/.one/one_config',
  },
};

export default ONECHAIN_CONFIG;

