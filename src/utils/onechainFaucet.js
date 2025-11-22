// OneChain Faucet Utility
// Helper functions for requesting test tokens via OneChain CLI

/**
 * Get instructions for requesting test tokens via OneChain CLI
 * @param {string} address - Wallet address to request tokens for
 * @returns {Object} Instructions and command
 */
export function getFaucetInstructions(address = null) {
  const commands = {
    // Check active environment
    checkEnv: 'one client envs',
    
    // Switch to testnet (if not already)
    switchToTestnet: 'one client switch --env testnet',
    
    // Request tokens
    requestTokens: address 
      ? `one client faucet --address ${address}`
      : 'one client faucet',
    
    // Verify balance (address is positional argument)
    checkBalance: address
      ? `one client balance ${address}`
      : 'one client balance',
  };

  return {
    instructions: [
      '1. Open terminal',
      '2. Make sure testnet is active: one client switch --env testnet',
      address 
        ? `3. Request tokens: one client faucet --address ${address}`
        : '3. Request tokens: one client faucet (uses active address)',
      '4. Verify tokens received in wallet extension',
    ],
    commands,
    example: address
      ? `one client faucet --address ${address}`
      : 'one client faucet',
  };
}

/**
 * Generate faucet command for copy-paste
 * @param {string} address - Wallet address
 * @param {string} faucetUrl - Optional custom faucet URL
 * @returns {string} Command to run
 */
export function generateFaucetCommand(address, faucetUrl = null) {
  if (!address) {
    return 'one client faucet';
  }

  let command = `one client faucet --address ${address}`;
  
  if (faucetUrl) {
    command += ` --url ${faucetUrl}`;
  }

  return command;
}

/**
 * Get recommended faucet endpoints
 * @returns {Object} Faucet endpoints by network
 */
export function getRecommendedFaucetEndpoints() {
  return {
    testnet: [
      'https://faucet.onechain.testnet.io',
      'https://faucet.testnet.sui.io',
    ],
    devnet: [
      'https://faucet.onechain.devnet.io',
      'https://faucet.devnet.sui.io',
    ],
    localnet: [
      'http://127.0.0.1:9123/gas', // Local faucet endpoint
    ],
  };
}

/**
 * Display faucet instructions in console
 * @param {string} address - Optional wallet address
 */
export function displayFaucetInstructions(address = null) {
  const instructions = getFaucetInstructions(address);
  
  console.log('🚰 OneChain Testnet Faucet Instructions');
  console.log('=====================================\n');
  
  console.log('📋 Steps:');
  instructions.instructions.forEach((step, index) => {
    console.log(`   ${step}`);
  });
  
  console.log('\n💻 Commands:');
  console.log(`   Check environment: ${instructions.commands.checkEnv}`);
  console.log(`   Switch to testnet: ${instructions.commands.switchToTestnet}`);
  console.log(`   Request tokens: ${instructions.commands.requestTokens}`);
  console.log(`   Check balance: ${instructions.commands.checkBalance}`);
  
  console.log('\n📝 Example:');
  console.log(`   $ ${instructions.example}`);
  
  console.log('\n✅ After requesting tokens:');
  console.log('   1. Wait a few seconds for transaction to process');
  console.log('   2. Check your wallet balance');
  console.log('   3. Verify on explorer: https://suiexplorer.com/?network=testnet');
}

/**
 * Get wallet address from connected wallet
 * @returns {Promise<string|null>} Wallet address or null
 */
export async function getWalletAddress() {
  try {
    if (window.onechainWallet) {
      const accounts = await window.onechainWallet.getAccounts();
      if (accounts && accounts.length > 0) {
        return accounts[0];
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting wallet address:', error);
    return null;
  }
}

/**
 * Generate complete faucet workflow
 * @returns {Promise<Object>} Complete workflow with address
 */
export async function generateFaucetWorkflow() {
  const address = await getWalletAddress();
  const instructions = getFaucetInstructions(address);
  
  return {
    address,
    hasAddress: !!address,
    instructions: instructions.instructions,
    commands: instructions.commands,
    command: instructions.example,
    message: address
      ? `✅ Wallet address detected. Use the command below to request tokens:`
      : `⚠️ No wallet connected. Connect your wallet first, or use the command with --address option.`,
  };
}

