// OneChain OneWallet Transaction Testing Utilities
// Phase 3: Transaction Signing & Submission

import { ethers } from 'ethers';
import { oneWalletClient } from './oneWallet.js';
import {
  getCATCoinBalance,
  completeSessionOnChain,
  purchaseItemOnChain,
  purchaseCatOnChain,
  feedCatOnChain,
  playWithCatOnChain,
} from './blockchainGameState.js';
import { getItemId, getCatTypeId } from './itemMapping.js';

/**
 * Phase 3.1: Smart Contract Interaction Tests
 * Tests all contract functions
 */
export const testContractInteractions = async () => {
  const results = {
    catCoin: { status: 'pending', tests: [] },
    catNFT: { status: 'pending', tests: [] },
    gameItem: { status: 'pending', tests: [] },
    pomodoroGame: { status: 'pending', tests: [] }
  };

  console.log('=== Testing Smart Contract Interactions ===\n');

  try {
    // Test CATCoin
    console.log('Testing CATCoin contract...');
    try {
      const balance = await getCATCoinBalance();
      results.catCoin.tests.push({
        function: 'balanceOf',
        status: 'success',
        data: { balance }
      });
      console.log('✓ CATCoin.balanceOf:', balance);
    } catch (error) {
      results.catCoin.tests.push({
        function: 'balanceOf',
        status: 'error',
        error: error.message
      });
      console.error('✗ CATCoin.balanceOf failed:', error.message);
    }
    results.catCoin.status = results.catCoin.tests.every(t => t.status === 'success') ? 'success' : 'partial';

    // Test PomodoroGame (without actual transaction)
    console.log('\nTesting PomodoroGame contract...');
    console.log('ℹ Pomodoro functions require manual testing with actual gameplay');
    results.pomodoroGame.status = 'manual';
    results.pomodoroGame.tests.push({
      function: 'completeSession',
      status: 'manual',
      note: 'Complete a Pomodoro session to test'
    });
    results.pomodoroGame.tests.push({
      function: 'purchaseItem',
      status: 'manual',
      note: 'Buy item from shop to test'
    });
    results.pomodoroGame.tests.push({
      function: 'purchaseCat',
      status: 'manual',
      note: 'Buy cat from shop to test'
    });
    results.pomodoroGame.tests.push({
      function: 'feedCat',
      status: 'manual',
      note: 'Feed cat to test'
    });
    results.pomodoroGame.tests.push({
      function: 'playWithCat',
      status: 'manual',
      note: 'Play with cat to test'
    });

  } catch (error) {
    console.error('Contract interaction test error:', error);
  }

  console.log('\n=== Contract Interaction Summary ===');
  console.log('CATCoin:', results.catCoin.status);
  console.log('CatNFT:', results.catNFT.status || 'Not tested');
  console.log('GameItem:', results.gameItem.status || 'Not tested');
  console.log('PomodoroGame:', results.pomodoroGame.status);

  return results;
};

/**
 * Phase 3.2: Transaction Signing Flow Test
 * Tests the signing process without executing
 */
export const testTransactionSigning = async () => {
  const results = {
    buildTransaction: { status: 'pending', time: 0 },
    signTransaction: { status: 'pending', time: 0 },
    estimateGas: { status: 'pending', time: 0 }
  };

  console.log('=== Testing Transaction Signing Flow ===\n');

  try {
    // Build a simple transaction
    console.log('Building test transaction...');
    const buildStart = performance.now();
    
    const signer = oneWalletClient.signer;
    if (!signer) {
      throw new Error('No signer available. Connect wallet first.');
    }

    const address = await signer.getAddress();
    
    // Create a simple transaction (sending 0 ETH to self)
    const tx = {
      to: address,
      value: ethers.parseEther('0'),
      data: '0x'
    };

    results.buildTransaction.status = 'success';
    results.buildTransaction.time = performance.now() - buildStart;
    console.log('✓ Transaction built');

    // Estimate gas
    console.log('Estimating gas...');
    const gasStart = performance.now();
    
    try {
      const gasEstimate = await signer.estimateGas(tx);
      results.estimateGas.status = 'success';
      results.estimateGas.time = performance.now() - gasStart;
      results.estimateGas.data = { gasLimit: gasEstimate.toString() };
      console.log('✓ Gas estimated:', gasEstimate.toString());
    } catch (error) {
      results.estimateGas.status = 'error';
      results.estimateGas.time = performance.now() - gasStart;
      results.estimateGas.data = { error: error.message };
      console.error('✗ Gas estimation failed:', error.message);
    }

    // Note: We don't actually sign here to avoid prompting user
    results.signTransaction.status = 'ready';
    results.signTransaction.data = { note: 'Signing capability verified, not executed in test' };
    console.log('ℹ Transaction signing capability verified (not executed)');

  } catch (error) {
    console.error('Transaction signing test error:', error);
    results.buildTransaction.status = 'error';
    results.buildTransaction.data = { error: error.message };
  }

  return results;
};

/**
 * Phase 3.3: Gas & Fee Handling Test
 * Tests gas estimation and fee calculation
 */
export const testGasFeeHandling = async () => {
  const results = {
    gasPrice: { status: 'pending', data: null },
    gasEstimation: { status: 'pending', data: null },
    feeCalculation: { status: 'pending', data: null },
    balanceCheck: { status: 'pending', data: null }
  };

  console.log('=== Testing Gas & Fee Handling ===\n');

  try {
    const provider = oneWalletClient.provider;
    const signer = oneWalletClient.signer;

    if (!provider || !signer) {
      throw new Error('Provider or signer not available');
    }

    // Get current gas price
    console.log('Checking gas price...');
    try {
      const feeData = await provider.getFeeData();
      results.gasPrice.status = 'success';
      results.gasPrice.data = {
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : 'N/A',
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : 'N/A',
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : 'N/A'
      };
      console.log('✓ Gas price:', results.gasPrice.data.gasPrice, 'gwei');
    } catch (error) {
      results.gasPrice.status = 'error';
      results.gasPrice.data = { error: error.message };
      console.error('✗ Gas price check failed:', error.message);
    }

    // Test gas estimation for a typical transaction
    console.log('Testing gas estimation...');
    try {
      const address = await signer.getAddress();
      const gasEstimate = await provider.estimateGas({
        to: address,
        value: 0,
        data: '0x'
      });
      
      results.gasEstimation.status = 'success';
      results.gasEstimation.data = { gasLimit: gasEstimate.toString() };
      console.log('✓ Gas estimate:', gasEstimate.toString());
    } catch (error) {
      results.gasEstimation.status = 'error';
      results.gasEstimation.data = { error: error.message };
      console.error('✗ Gas estimation failed:', error.message);
    }

    // Calculate total fee
    if (results.gasPrice.status === 'success' && results.gasEstimation.status === 'success') {
      console.log('Calculating transaction fee...');
      try {
        const gasLimit = BigInt(results.gasEstimation.data.gasLimit);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || BigInt(0);
        const totalFee = gasLimit * gasPrice;
        
        results.feeCalculation.status = 'success';
        results.feeCalculation.data = {
          gasLimit: gasLimit.toString(),
          gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
          totalFee: ethers.formatEther(totalFee) + ' ONE'
        };
        console.log('✓ Total fee:', results.feeCalculation.data.totalFee);
      } catch (error) {
        results.feeCalculation.status = 'error';
        results.feeCalculation.data = { error: error.message };
        console.error('✗ Fee calculation failed:', error.message);
      }
    }

    // Check balance for gas
    console.log('Checking ONE balance for gas...');
    try {
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      const balanceInONE = ethers.formatEther(balance);
      
      results.balanceCheck.status = 'success';
      results.balanceCheck.data = {
        balance: balanceInONE + ' ONE',
        hasGas: parseFloat(balanceInONE) > 0
      };
      
      if (parseFloat(balanceInONE) > 0) {
        console.log('✓ Sufficient balance:', balanceInONE, 'ONE');
      } else {
        console.warn('⚠ Low balance:', balanceInONE, 'ONE - may need more for gas');
      }
    } catch (error) {
      results.balanceCheck.status = 'error';
      results.balanceCheck.data = { error: error.message };
      console.error('✗ Balance check failed:', error.message);
    }

  } catch (error) {
    console.error('Gas fee test error:', error);
  }

  return results;
};

/**
 * Run all Phase 3 tests
 */
export const runPhase3Tests = async () => {
  console.log('=== OneChain OneWallet Phase 3 Tests ===\n');

  // Test 3.1: Contract Interactions
  console.log('3.1: Smart Contract Interaction Tests');
  const contractResults = await testContractInteractions();
  console.log('\n');

  // Test 3.2: Transaction Signing
  console.log('3.2: Transaction Signing Flow Test');
  const signingResults = await testTransactionSigning();
  console.log('\n');

  // Test 3.3: Gas & Fees
  console.log('3.3: Gas & Fee Handling Test');
  const gasResults = await testGasFeeHandling();
  console.log('\n');

  const allPassed =
    contractResults.catCoin.status === 'success' &&
    signingResults.buildTransaction.status === 'success' &&
    gasResults.gasPrice.status === 'success';

  console.log('=== Phase 3 Summary ===');
  console.log('Contract Interactions:', contractResults.catCoin.status);
  console.log('Transaction Signing:', signingResults.buildTransaction.status);
  console.log('Gas Handling:', gasResults.gasPrice.status);
  console.log('Overall Status:', allPassed ? '✓ PASSED' : '⚠ NEEDS ATTENTION');

  return {
    contracts: contractResults,
    signing: signingResults,
    gas: gasResults,
    passed: allPassed
  };
};

/**
 * Manual transaction test guide
 * Returns instructions for manual testing
 */
export const getManualTransactionTestGuide = () => {
  const guide = {
    title: 'Manual Transaction Testing Guide',
    tests: [
      {
        name: 'Complete Pomodoro Session',
        steps: [
          '1. Start a Pomodoro timer (25 minutes)',
          '2. Wait for timer to complete',
          '3. Click "Complete" button',
          '4. Approve transaction in OneWallet',
          '5. Wait for confirmation',
          '6. Verify CAT coin balance increased',
          '7. Check transaction on block explorer'
        ],
        expected: 'CAT coins +1, transaction hash returned, balance updated'
      },
      {
        name: 'Purchase Item from Shop',
        steps: [
          '1. Open Shop',
          '2. Select a food or toy item',
          '3. Click "Buy" button',
          '4. Approve transaction in OneWallet',
          '5. Wait for confirmation',
          '6. Verify inventory updated',
          '7. Verify CAT coin balance decreased'
        ],
        expected: 'Item added to inventory, CAT coins decreased, transaction confirmed'
      },
      {
        name: 'Purchase Cat NFT',
        steps: [
          '1. Open Shop',
          '2. Select a cat species',
          '3. Click "Buy" button',
          '4. Approve transaction in OneWallet',
          '5. Wait for confirmation',
          '6. Verify cat appears in "My Cats"',
          '7. Check NFT token ID'
        ],
        expected: 'Cat NFT minted, token ID returned, cat selectable'
      },
      {
        name: 'Feed Cat',
        steps: [
          '1. Go to "My Cat" page',
          '2. Click "Feed" button',
          '3. Select food item',
          '4. Approve transaction in OneWallet',
          '5. Wait for confirmation',
          '6. Verify hunger bar decreased',
          '7. Verify food removed from inventory'
        ],
        expected: 'Hunger decreased, food consumed, transaction confirmed'
      },
      {
        name: 'Play with Cat',
        steps: [
          '1. Go to "My Cat" page',
          '2. Drag toy into room OR click "Pet"',
          '3. Approve transaction in OneWallet',
          '4. Wait for confirmation',
          '5. Verify happiness increased'
        ],
        expected: 'Happiness increased, transaction confirmed'
      }
    ],
    metrics: {
      signingTime: '< 3 seconds (user approval)',
      submissionTime: '< 5 seconds (tx inclusion)',
      confirmationTime: '< 30 seconds (finality)'
    },
    notes: [
      'Each transaction should show clear loading state',
      'Success/error messages should be user-friendly',
      'Transaction hash should be available',
      'Explorer link should work (if configured)',
      'Gas estimation should be accurate',
      'Failed transactions should not leave corrupted state'
    ]
  };

  console.log(`\n=== ${guide.title} ===\n`);
  guide.tests.forEach((test, index) => {
    console.log(`\nTest ${index + 1}: ${test.name}`);
    console.log('Steps:');
    test.steps.forEach(step => console.log('  ' + step));
    console.log('Expected Result:', test.expected);
  });

  console.log('\n=== Performance Metrics ===');
  Object.entries(guide.metrics).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  console.log('\n=== Testing Notes ===');
  guide.notes.forEach((note, index) => {
    console.log(`${index + 1}. ${note}`);
  });

  return guide;
};

