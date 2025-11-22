import { createNetworkConfig } from "@onelabs/dapp-kit";

// Config options for the networks you want to connect to
// Use OneChain RPC endpoints instead of Sui default endpoints
const { networkConfig } = createNetworkConfig({
  testnet: {
    // Use OneChain testnet RPC endpoint
    // Fallback to Sui testnet if OneChain endpoint is not available
    url: import.meta.env.VITE_ONECHAIN_RPC_URL || 
         import.meta.env.VITE_SUI_RPC_URL || 
         'https://rpc-testnet.onelabs.cc:443', // OneChain testnet
  },
});

export { networkConfig };


