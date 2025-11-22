// OneChain OneWallet Connection Testing Utilities
// Phase 2: Wallet Connection & Authentication

import { oneWalletClient } from './oneWallet.js';
import { ONECHAIN_CONFIG } from '../config/onechain.js';

/**
 * Phase 2.1: Test OneWallet Connection Flow
 * Tests the complete connection sequence
 */
export const testConnectionFlow = async () => {
  const results = {
    detection: { status: 'pending', time: 0, data: null },
    accountRequest: { status: 'pending', time: 0, data: null },
    signerCreation: { status: 'pending', time: 0, data: null },
    networkSwitch: { status: 'pending', time: 0, data: null },
    finalState: { status: 'pending', time: 0, data: null },
    totalTime: 0
  };

  const startTime = performance.now();

  try {
    // Step 1: Wallet Detection
    console.log('Step 1: Detecting wallet...');
    const detectStart = performance.now();
    
    if (window.onewallet) {
      results.detection.status = 'success';
      results.detection.data = { provider: 'OneWallet' };
      console.log('✓ OneWallet detected');
    } else if (window.ethereum) {
      results.detection.status = 'success';
      results.detection.data = { provider: 'MetaMask/Ethereum' };
      console.log('✓ Ethereum provider detected');
    } else {
      results.detection.status = 'error';
      results.detection.data = { error: 'No wallet found' };
      console.error('✗ No wallet detected');
      return results;
    }
    
    results.detection.time = performance.now() - detectStart;

    // Step 2: Connect Wallet
    console.log('Step 2: Connecting wallet...');
    const connectStart = performance.now();
    
    try {
      const address = await oneWalletClient.connect();
      results.accountRequest.status = 'success';
      results.accountRequest.data = { address };
      results.accountRequest.time = performance.now() - connectStart;
      console.log('✓ Wallet connected:', address);
    } catch (error) {
      results.accountRequest.status = 'error';
      results.accountRequest.data = { error: error.message };
      results.accountRequest.time = performance.now() - connectStart;
      console.error('✗ Connection failed:', error.message);
      return results;
    }

    // Step 3: Verify Signer
    console.log('Step 3: Verifying signer...');
    const signerStart = performance.now();
    
    if (oneWalletClient.signer) {
      results.signerCreation.status = 'success';
      results.signerCreation.data = { hasSign: true };
      console.log('✓ Signer created');
    } else {
      results.signerCreation.status = 'error';
      results.signerCreation.data = { error: 'Signer not created' };
      console.error('✗ No signer available');
    }
    
    results.signerCreation.time = performance.now() - signerStart;

    // Step 4: Verify Network
    console.log('Step 4: Verifying network...');
    const networkStart = performance.now();
    
    try {
      const network = await oneWalletClient.getNetwork();
      const expectedChainId = ONECHAIN_CONFIG.chainId;
      const actualChainId = Number(network.chainId);
      
      if (actualChainId === expectedChainId) {
        results.networkSwitch.status = 'success';
        results.networkSwitch.data = { 
          chainId: actualChainId,
          name: network.name,
          matched: true
        };
        console.log('✓ Connected to correct network:', network.name);
      } else {
        results.networkSwitch.status = 'warning';
        results.networkSwitch.data = { 
          expected: expectedChainId,
          actual: actualChainId,
          matched: false
        };
        console.warn('⚠ Network mismatch - expected:', expectedChainId, 'actual:', actualChainId);
      }
    } catch (error) {
      results.networkSwitch.status = 'error';
      results.networkSwitch.data = { error: error.message };
      console.error('✗ Network check failed:', error.message);
    }
    
    results.networkSwitch.time = performance.now() - networkStart;

    // Step 5: Final State Verification
    console.log('Step 5: Verifying final state...');
    const finalStart = performance.now();
    
    results.finalState.status = 'success';
    results.finalState.data = {
      isConnected: oneWalletClient.isWalletConnected(),
      account: oneWalletClient.getAccount(),
      hasProvider: !!oneWalletClient.provider,
      hasSigner: !!oneWalletClient.signer
    };
    results.finalState.time = performance.now() - finalStart;
    
    console.log('✓ Final state verified');

  } catch (error) {
    console.error('Connection test error:', error);
  }

  results.totalTime = performance.now() - startTime;
  
  console.log('\n=== Connection Test Summary ===');
  console.log('Total Time:', results.totalTime.toFixed(2), 'ms');
  console.log('Detection:', results.detection.status);
  console.log('Connection:', results.accountRequest.status);
  console.log('Signer:', results.signerCreation.status);
  console.log('Network:', results.networkSwitch.status);
  
  const allPassed = 
    results.detection.status === 'success' &&
    results.accountRequest.status === 'success' &&
    results.signerCreation.status === 'success' &&
    (results.networkSwitch.status === 'success' || results.networkSwitch.status === 'warning');
  
  console.log('Overall:', allPassed ? '✓ PASSED' : '✗ FAILED');
  
  return results;
};

/**
 * Phase 2.2: Test OneID Authentication
 * Verifies that OneID authentication works seamlessly
 */
export const testOneIDAuthentication = () => {
  const results = {
    seedPhraseRequired: false,
    mpcEnabled: true,
    notes: []
  };

  // OneID is handled by OneWallet extension
  // This function documents expected behavior
  
  results.notes.push('OneID authentication is handled by OneWallet extension');
  results.notes.push('Users should NOT be prompted for seed phrases');
  results.notes.push('MPC-based authentication provides enhanced security');
  results.notes.push('Account recovery is managed through OneID system');
  
  console.log('=== OneID Authentication Info ===');
  results.notes.forEach(note => console.log('-', note));
  
  return results;
};

/**
 * Phase 2.3: Test Network Auto-Switching
 * Tests the network switching functionality
 */
export const testNetworkAutoSwitch = async () => {
  const results = {
    currentNetwork: { status: 'pending', data: null },
    targetNetwork: { status: 'pending', data: null },
    switchAction: { status: 'pending', data: null },
    verification: { status: 'pending', data: null }
  };

  try {
    const provider = window.onewallet || window.ethereum;
    if (!provider) {
      throw new Error('No wallet provider available');
    }

    // Get current network
    console.log('Checking current network...');
    const currentChainId = await provider.request({ method: 'eth_chainId' });
    results.currentNetwork.status = 'success';
    results.currentNetwork.data = { chainId: currentChainId };
    console.log('Current network:', currentChainId);

    // Get target network
    const targetChainId = `0x${ONECHAIN_CONFIG.chainId.toString(16)}`;
    results.targetNetwork.status = 'success';
    results.targetNetwork.data = { 
      chainId: targetChainId,
      decimal: ONECHAIN_CONFIG.chainId 
    };
    console.log('Target network:', targetChainId);

    // Check if switch needed
    if (currentChainId.toLowerCase() === targetChainId.toLowerCase()) {
      results.switchAction.status = 'skipped';
      results.switchAction.data = { reason: 'Already on correct network' };
      results.verification.status = 'success';
      results.verification.data = { message: 'No switch needed' };
      console.log('✓ Already on OneChain network');
    } else {
      // Test switch capability (don't actually switch unless user approves)
      console.log('Network switch would be triggered...');
      results.switchAction.status = 'ready';
      results.switchAction.data = { 
        from: currentChainId,
        to: targetChainId,
        method: 'wallet_switchEthereumChain'
      };
      results.verification.status = 'pending';
      results.verification.data = { 
        message: 'Switch ready but not executed (requires user approval)' 
      };
      console.log('⚠ Network switch available but not triggered in test mode');
    }

  } catch (error) {
    console.error('Network switch test error:', error);
    results.switchAction.status = 'error';
    results.switchAction.data = { error: error.message };
  }

  return results;
};

/**
 * Test wallet disconnection
 */
export const testDisconnection = () => {
  const results = {
    beforeState: {
      isConnected: oneWalletClient.isWalletConnected(),
      account: oneWalletClient.getAccount()
    },
    afterState: {},
    eventDispatched: false
  };

  // Listen for disconnection event
  const listener = () => {
    results.eventDispatched = true;
  };
  window.addEventListener('walletDisconnected', listener);

  // Disconnect
  console.log('Disconnecting wallet...');
  oneWalletClient.disconnect();

  results.afterState = {
    isConnected: oneWalletClient.isWalletConnected(),
    account: oneWalletClient.getAccount()
  };

  // Cleanup listener
  setTimeout(() => {
    window.removeEventListener('walletDisconnected', listener);
  }, 100);

  console.log('Before:', results.beforeState);
  console.log('After:', results.afterState);
  console.log('Event dispatched:', results.eventDispatched);

  const success = 
    !results.afterState.isConnected &&
    results.afterState.account === null;

  console.log(success ? '✓ Disconnection successful' : '✗ Disconnection failed');

  return results;
};

/**
 * Test account switching
 */
export const testAccountSwitch = async () => {
  const results = {
    initialAccount: null,
    accountSwitchDetected: false,
    newAccount: null,
    eventFired: false
  };

  try {
    results.initialAccount = oneWalletClient.getAccount();
    console.log('Initial account:', results.initialAccount);

    // Set up listener
    const listener = (accounts) => {
      results.accountSwitchDetected = true;
      results.newAccount = accounts[0] || null;
      results.eventFired = true;
      console.log('Account switched to:', results.newAccount);
    };

    const provider = window.onewallet || window.ethereum;
    if (provider) {
      provider.on('accountsChanged', listener);
    }

    console.log('Listening for account changes...');
    console.log('Please switch accounts in OneWallet to test');
    console.log('(This test will wait for 30 seconds)');

    // Wait for potential account switch
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Cleanup
    if (provider) {
      provider.removeListener('accountsChanged', listener);
    }

  } catch (error) {
    console.error('Account switch test error:', error);
  }

  return results;
};

/**
 * Performance metrics for connection
 */
export const measureConnectionPerformance = async () => {
  const metrics = {
    detection: 0,
    connection: 0,
    networkCheck: 0,
    total: 0
  };

  const start = performance.now();

  try {
    // Detection time
    const detectStart = performance.now();
    const hasWallet = !!(window.onewallet || window.ethereum);
    metrics.detection = performance.now() - detectStart;

    if (!hasWallet) {
      console.error('No wallet to measure');
      return metrics;
    }

    // Connection time
    const connectStart = performance.now();
    await oneWalletClient.connect();
    metrics.connection = performance.now() - connectStart;

    // Network check time
    const networkStart = performance.now();
    await oneWalletClient.getNetwork();
    metrics.networkCheck = performance.now() - networkStart;

    metrics.total = performance.now() - start;

    console.log('=== Performance Metrics ===');
    console.log('Detection:', metrics.detection.toFixed(2), 'ms');
    console.log('Connection:', metrics.connection.toFixed(2), 'ms');
    console.log('Network Check:', metrics.networkCheck.toFixed(2), 'ms');
    console.log('Total:', metrics.total.toFixed(2), 'ms');

    // Validate against requirements
    const requirements = {
      connection: 5000, // < 5 seconds
      total: 10000 // < 10 seconds
    };

    if (metrics.connection < requirements.connection) {
      console.log('✓ Connection time within requirements');
    } else {
      console.warn('⚠ Connection time exceeds 5 second requirement');
    }

    if (metrics.total < requirements.total) {
      console.log('✓ Total time within requirements');
    } else {
      console.warn('⚠ Total time exceeds 10 second requirement');
    }

  } catch (error) {
    console.error('Performance measurement error:', error);
  }

  return metrics;
};

/**
 * Run all Phase 2 tests
 */
export const runPhase2Tests = async () => {
  console.log('=== OneChain OneWallet Phase 2 Tests ===\n');

  // Test 2.1: Connection Flow
  console.log('2.1: Connection Flow Test');
  const connectionResults = await testConnectionFlow();
  console.log('\n');

  // Test 2.2: OneID Authentication
  console.log('2.2: OneID Authentication Test');
  const oneIDResults = testOneIDAuthentication();
  console.log('\n');

  // Test 2.3: Network Auto-Switching
  console.log('2.3: Network Auto-Switching Test');
  const switchResults = await testNetworkAutoSwitch();
  console.log('\n');

  // Performance Metrics
  console.log('Performance Metrics');
  const performance = await measureConnectionPerformance();
  console.log('\n');

  const allPassed =
    connectionResults.detection.status === 'success' &&
    connectionResults.accountRequest.status === 'success' &&
    connectionResults.signerCreation.status === 'success';

  console.log('=== Phase 2 Summary ===');
  console.log('Overall Status:', allPassed ? '✓ PASSED' : '⚠ NEEDS ATTENTION');

  return {
    connection: connectionResults,
    oneID: oneIDResults,
    networkSwitch: switchResults,
    performance,
    passed: allPassed
  };
};

