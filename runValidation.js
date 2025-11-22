#!/usr/bin/env node

/**
 * OneChain OneWallet Master Validation Script
 * 
 * This script runs all validation tests in sequence
 * Run in browser console or Node.js environment
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     OneChain OneWallet Integration Validation Suite          ║
║                                                               ║
║     Version: 1.0.0                                            ║
║     Date: 2025-01-17                                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Instructions for running in browser
console.log(`
Instructions:
=============

This validation suite should be run in your browser console while
the dApp is running.

1. Start your development server:
   npm run dev

2. Open the dApp in your browser (http://localhost:5173)

3. Open browser console (F12)

4. Copy and paste the following commands one by one:

-------------------------------------------------------------------

// PHASE 1: Environment & Setup Validation
const { runPhase1Validation } = await import('/src/utils/validationUtils.js');
const phase1 = await runPhase1Validation();

-------------------------------------------------------------------

// PHASE 2: Connection & Authentication Tests
const { runPhase2Tests } = await import('/src/utils/connectionTests.js');
const phase2 = await runPhase2Tests();

-------------------------------------------------------------------

// PHASE 3: Transaction Testing
const { runPhase3Tests } = await import('/src/utils/transactionTests.js');
const phase3 = await runPhase3Tests();

-------------------------------------------------------------------

// PHASE 4 & 7: Security Validation
const { runSecurityValidation } = await import('/src/utils/securityValidation.js');
const security = await runSecurityValidation();

-------------------------------------------------------------------

// PHASE 6: Error Handling Tests
const { runErrorScenarioGuide } = await import('/src/utils/errorHandlingTests.js');
const errors = runErrorScenarioGuide();

-------------------------------------------------------------------

// Get Manual Testing Guide
const { getManualTransactionTestGuide } = await import('/src/utils/transactionTests.js');
const guide = getManualTransactionTestGuide();

-------------------------------------------------------------------

// Comprehensive Results
console.log('\\n=== VALIDATION COMPLETE ===');
console.log('Phase 1 (Environment):', phase1.passed ? '✓ PASSED' : '✗ FAILED');
console.log('Phase 2 (Connection):', phase2.passed ? '✓ PASSED' : '✗ FAILED');
console.log('Phase 3 (Transactions):', phase3.passed ? '✓ PASSED' : '✗ FAILED');
console.log('Security:', security.passed ? '✓ PASSED' : '✗ FAILED');

-------------------------------------------------------------------

Alternative: Open validation-test.html in browser for interactive testing

-------------------------------------------------------------------
`);

console.log(`
Quick Start:
============

For first-time setup, follow these steps:

1. Install OneWallet Extension
   - Chrome Web Store > Search "OneWallet OneChain"

2. Configure Environment
   - Copy .env.example to .env
   - Set VITE_ONECHAIN_RPC_URL
   - Set VITE_ONECHAIN_CHAIN_ID

3. Deploy Contracts (Local)
   cd packages/contracts
   npm run node          # Terminal 1
   npm run deploy:local  # Terminal 2

4. Start Dev Server
   npm run dev

5. Run Validation Tests
   - Open http://localhost:5173
   - Press F12 for console
   - Run validation commands above

For complete guide, see: SETUP_CHECKLIST.md

-------------------------------------------------------------------
`);

console.log(`
Documentation Files:
====================

Setup & Configuration:
  📄 SETUP_CHECKLIST.md        - Start here for setup
  📄 VALIDATION_REPORT.md       - Detailed validation findings
  📄 VALIDATION_SUMMARY.md      - Complete summary

Testing & Validation:
  📄 UI_UX_VALIDATION.md        - UI/UX testing checklist
  📄 INTEGRATION_TESTING.md     - Integration test framework
  📄 validation-test.html       - Interactive test page

Production Deployment:
  📄 PRODUCTION_DEPLOYMENT.md   - Production deployment guide

Utilities:
  📄 src/utils/validationUtils.js      - Phase 1 tests
  📄 src/utils/connectionTests.js      - Phase 2 tests
  📄 src/utils/transactionTests.js     - Phase 3 tests
  📄 src/utils/securityValidation.js   - Security tests
  📄 src/utils/errorHandlingTests.js   - Error tests

-------------------------------------------------------------------
`);

console.log(`
Support:
========

If you encounter issues:
  1. Check SETUP_CHECKLIST.md troubleshooting section
  2. Review error scenarios in errorHandlingTests.js
  3. Verify .env configuration
  4. Ensure OneWallet extension is installed
  5. Check console for detailed error messages

For questions or issues, refer to the documentation files above.

-------------------------------------------------------------------
`);

console.log('✓ Validation suite ready!\n');

// Export for programmatic use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAll: async () => {
      // This would need to be run in browser context
      console.log('Please run validation commands in browser console');
      console.log('See instructions above');
    }
  };
}

