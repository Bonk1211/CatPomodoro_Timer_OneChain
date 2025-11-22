// OneChain OneWallet Validation Utilities
import { ethers } from 'ethers';
import { ONECHAIN_CONFIG } from '../config/onechain.js';

/**
 * Phase 1.2: Network Configuration Validation
 * Validates OneChain RPC endpoint and network configuration
 */
export const validateNetworkConfig = async () => {
  const results = {
    rpcEndpoint: { status: 'pending', message: '', data: null },
    chainId: { status: 'pending', message: '', data: null },
    blockExplorer: { status: 'pending', message: '', data: null },
    contracts: { status: 'pending', message: '', data: null }
  };

  try {
    // Test 1: RPC Endpoint Connectivity
    console.log('Testing RPC endpoint:', ONECHAIN_CONFIG.rpcUrl);
    const provider = new ethers.JsonRpcProvider(ONECHAIN_CONFIG.rpcUrl);
    
    try {
      const network = await provider.getNetwork();
      results.rpcEndpoint.status = 'success';
      results.rpcEndpoint.message = 'RPC endpoint is responsive';
      results.rpcEndpoint.data = {
        url: ONECHAIN_CONFIG.rpcUrl,
        chainId: network.chainId.toString(),
        name: network.name
      };
      console.log('✓ RPC Connected:', results.rpcEndpoint.data);
    } catch (error) {
      results.rpcEndpoint.status = 'error';
      results.rpcEndpoint.message = `RPC connection failed: ${error.message}`;
      console.error('✗ RPC Error:', error.message);
    }

    // Test 2: Chain ID Validation
    const configuredChainId = ONECHAIN_CONFIG.chainId;
    if (results.rpcEndpoint.status === 'success') {
      const actualChainId = results.rpcEndpoint.data.chainId;
      if (configuredChainId.toString() === actualChainId) {
        results.chainId.status = 'success';
        results.chainId.message = 'Chain ID matches configuration';
        results.chainId.data = { configured: configuredChainId, actual: actualChainId };
        console.log('✓ Chain ID Validated:', configuredChainId);
      } else {
        results.chainId.status = 'warning';
        results.chainId.message = `Chain ID mismatch: configured ${configuredChainId}, actual ${actualChainId}`;
        results.chainId.data = { configured: configuredChainId, actual: actualChainId };
        console.warn('⚠ Chain ID Mismatch:', results.chainId.data);
      }
    } else {
      results.chainId.status = 'skipped';
      results.chainId.message = 'Skipped due to RPC connection failure';
    }

    // Test 3: Block Explorer URL
    const explorerUrl = ONECHAIN_CONFIG.blockExplorerUrl;
    if (explorerUrl && explorerUrl !== '') {
      results.blockExplorer.status = 'success';
      results.blockExplorer.message = 'Block explorer URL configured';
      results.blockExplorer.data = { url: explorerUrl };
      console.log('✓ Explorer URL:', explorerUrl);
    } else {
      results.blockExplorer.status = 'warning';
      results.blockExplorer.message = 'Block explorer URL not configured';
      console.warn('⚠ No explorer URL configured');
    }

    // Test 4: Contract Addresses
    const contracts = ONECHAIN_CONFIG.contracts;
    const missingContracts = [];
    const configuredContracts = [];
    
    for (const [name, address] of Object.entries(contracts)) {
      if (!address || address === '') {
        missingContracts.push(name);
      } else {
        configuredContracts.push({ name, address });
      }
    }

    if (missingContracts.length === 0) {
      results.contracts.status = 'success';
      results.contracts.message = 'All contract addresses configured';
      results.contracts.data = { configured: configuredContracts };
      console.log('✓ All contracts configured:', configuredContracts.length);
    } else {
      results.contracts.status = 'warning';
      results.contracts.message = `${missingContracts.length} contracts not configured: ${missingContracts.join(', ')}`;
      results.contracts.data = { 
        configured: configuredContracts,
        missing: missingContracts 
      };
      console.warn('⚠ Missing contracts:', missingContracts);
    }

  } catch (error) {
    console.error('Validation error:', error);
  }

  return results;
};

/**
 * Phase 1.3: OneWallet Extension Detection
 * Checks if OneWallet or compatible wallet is available
 */
export const validateWalletDetection = () => {
  const results = {
    oneWallet: { status: 'pending', message: '', available: false },
    ethereum: { status: 'pending', message: '', available: false },
    recommendation: ''
  };

  // Check for OneWallet
  if (typeof window !== 'undefined' && window.onewallet) {
    results.oneWallet.status = 'success';
    results.oneWallet.message = 'OneWallet extension detected';
    results.oneWallet.available = true;
    results.recommendation = 'Use OneWallet for best OneChain integration';
    console.log('✓ OneWallet detected');
  } else {
    results.oneWallet.status = 'info';
    results.oneWallet.message = 'OneWallet extension not found';
    results.oneWallet.available = false;
    console.log('ℹ OneWallet not detected');
  }

  // Check for standard Ethereum provider (MetaMask fallback)
  if (typeof window !== 'undefined' && window.ethereum) {
    results.ethereum.status = 'success';
    results.ethereum.message = 'Ethereum provider detected (MetaMask or similar)';
    results.ethereum.available = true;
    if (!results.oneWallet.available) {
      results.recommendation = 'MetaMask detected. Will work but OneWallet is recommended for OneChain';
    }
    console.log('✓ Ethereum provider detected');
  } else {
    results.ethereum.status = 'info';
    results.ethereum.message = 'No Ethereum provider found';
    results.ethereum.available = false;
    console.log('ℹ No Ethereum provider detected');
  }

  // Final recommendation
  if (!results.oneWallet.available && !results.ethereum.available) {
    results.recommendation = 'ERROR: No wallet detected. Please install OneWallet or MetaMask extension';
    console.error('✗ No wallet available');
  }

  return results;
};

/**
 * Phase 2.3: Network Auto-Switching Test
 * Tests if the app can switch to OneChain network
 */
export const testNetworkSwitching = async (provider) => {
  const results = {
    currentNetwork: { status: 'pending', data: null },
    switchAttempt: { status: 'pending', message: '' },
    finalNetwork: { status: 'pending', data: null }
  };

  try {
    // Get current network
    const currentNetwork = await provider.send('eth_chainId', []);
    results.currentNetwork.status = 'success';
    results.currentNetwork.data = { chainId: currentNetwork };
    console.log('Current network chain ID:', currentNetwork);

    const targetChainIdHex = `0x${ONECHAIN_CONFIG.chainId.toString(16)}`;
    
    if (currentNetwork === targetChainIdHex) {
      results.switchAttempt.status = 'skipped';
      results.switchAttempt.message = 'Already on OneChain network';
      results.finalNetwork.status = 'success';
      results.finalNetwork.data = { chainId: currentNetwork };
      console.log('✓ Already on correct network');
    } else {
      // Attempt to switch
      try {
        await provider.send('wallet_switchEthereumChain', [
          { chainId: targetChainIdHex }
        ]);
        results.switchAttempt.status = 'success';
        results.switchAttempt.message = 'Successfully switched to OneChain';
        
        // Verify switch
        const newNetwork = await provider.send('eth_chainId', []);
        results.finalNetwork.status = 'success';
        results.finalNetwork.data = { chainId: newNetwork };
        console.log('✓ Switched to:', newNetwork);
      } catch (switchError) {
        if (switchError.code === 4902) {
          // Chain not added, need to add it
          results.switchAttempt.status = 'info';
          results.switchAttempt.message = 'OneChain network not added to wallet. Attempting to add...';
          
          try {
            await provider.send('wallet_addEthereumChain', [
              {
                chainId: targetChainIdHex,
                chainName: ONECHAIN_CONFIG.chainName,
                nativeCurrency: ONECHAIN_CONFIG.nativeCurrency,
                rpcUrls: [ONECHAIN_CONFIG.rpcUrl],
                blockExplorerUrls: [ONECHAIN_CONFIG.blockExplorerUrl],
              },
            ]);
            results.switchAttempt.status = 'success';
            results.switchAttempt.message = 'OneChain network added and switched';
            console.log('✓ Network added and switched');
          } catch (addError) {
            results.switchAttempt.status = 'error';
            results.switchAttempt.message = `Failed to add network: ${addError.message}`;
            console.error('✗ Failed to add network:', addError.message);
          }
        } else {
          results.switchAttempt.status = 'error';
          results.switchAttempt.message = `Network switch failed: ${switchError.message}`;
          console.error('✗ Switch failed:', switchError.message);
        }
      }
    }
  } catch (error) {
    results.currentNetwork.status = 'error';
    results.currentNetwork.data = { error: error.message };
    console.error('✗ Network test error:', error.message);
  }

  return results;
};

/**
 * Run all Phase 1 validations
 */
export const runPhase1Validation = async () => {
  console.log('=== OneChain OneWallet Phase 1 Validation ===\n');
  
  // 1.2: Network Configuration
  console.log('1.2: Network Configuration Validation');
  const networkResults = await validateNetworkConfig();
  console.log('\n');
  
  // 1.3: Wallet Detection
  console.log('1.3: OneWallet Extension Detection');
  const walletResults = validateWalletDetection();
  console.log('\n');
  
  // Summary
  const allPassed = 
    networkResults.rpcEndpoint.status === 'success' &&
    networkResults.chainId.status === 'success' &&
    (walletResults.oneWallet.available || walletResults.ethereum.available);
    
  console.log('=== Phase 1 Summary ===');
  console.log('RPC Endpoint:', networkResults.rpcEndpoint.status);
  console.log('Chain ID:', networkResults.chainId.status);
  console.log('Block Explorer:', networkResults.blockExplorer.status);
  console.log('Contracts:', networkResults.contracts.status);
  console.log('Wallet Detection:', walletResults.recommendation);
  console.log('\nOverall Status:', allPassed ? '✓ PASSED' : '⚠ NEEDS ATTENTION');
  
  return {
    network: networkResults,
    wallet: walletResults,
    passed: allPassed
  };
};

/**
 * Format validation results for display
 */
export const formatValidationResults = (results) => {
  const lines = [];
  lines.push('OneChain OneWallet Validation Results');
  lines.push('='.repeat(50));
  lines.push('');
  
  // Network Results
  lines.push('Network Configuration:');
  lines.push(`  RPC: ${results.network.rpcEndpoint.status.toUpperCase()} - ${results.network.rpcEndpoint.message}`);
  lines.push(`  Chain ID: ${results.network.chainId.status.toUpperCase()} - ${results.network.chainId.message}`);
  lines.push(`  Explorer: ${results.network.blockExplorer.status.toUpperCase()} - ${results.network.blockExplorer.message}`);
  lines.push(`  Contracts: ${results.network.contracts.status.toUpperCase()} - ${results.network.contracts.message}`);
  lines.push('');
  
  // Wallet Results
  lines.push('Wallet Detection:');
  lines.push(`  OneWallet: ${results.wallet.oneWallet.available ? 'AVAILABLE' : 'NOT FOUND'}`);
  lines.push(`  Ethereum Provider: ${results.wallet.ethereum.available ? 'AVAILABLE' : 'NOT FOUND'}`);
  lines.push(`  Recommendation: ${results.wallet.recommendation}`);
  lines.push('');
  
  lines.push('='.repeat(50));
  lines.push(`Overall: ${results.passed ? '✓ PASSED' : '⚠ NEEDS ATTENTION'}`);
  
  return lines.join('\n');
};

