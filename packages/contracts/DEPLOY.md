# Contract Deployment Guide

## Prerequisites

1. Make sure you're in the `packages/contracts` directory:
```bash
cd packages/contracts
```

2. Install dependencies (if not already done):
```bash
npm install
```

3. Compile contracts:
```bash
npm run compile
```

## Deployment Options

### Option 1: Deploy to Local Hardhat Node (Recommended for Testing)

This is the easiest way to test your contracts without needing OneChain network access.

1. **Start a local Hardhat node** (in a separate terminal):
```bash
cd packages/contracts
npm run node
```

This will start a local blockchain at `http://127.0.0.1:8545` with 20 pre-funded accounts.

2. **In another terminal, deploy contracts**:
```bash
cd packages/contracts
npm run deploy:local
```

3. **Copy contract addresses** from the deployment output to your frontend `.env` file:
```env
VITE_CAT_COIN_ADDRESS=0x...
VITE_CAT_NFT_ADDRESS=0x...
VITE_GAME_ITEM_ADDRESS=0x...
VITE_GAME_CONTRACT_ADDRESS=0x...
```

### Option 2: Deploy to OneChain Testnet/Mainnet

⚠️ **Before deploying to OneChain**, you need the correct RPC endpoint from OneChain documentation.

1. **Get OneChain RPC endpoint**:
   - Check OneChain official documentation
   - Look for testnet/mainnet RPC URLs
   - Common formats: `https://rpc.onechain.network` or similar

2. **Create `.env` file** in `packages/contracts/` directory:
```env
# OneChain Network Configuration
ONECHAIN_RPC_URL=https://your-actual-onechain-rpc-url.com
ONECHAIN_CHAIN_ID=1234
PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

⚠️ **Important**: 
- Never commit your `.env` file to version control!
- Make sure your private key doesn't have the `0x` prefix
- Use a test account private key for testing

3. **Deploy to OneChain**:
```bash
cd packages/contracts
npm run deploy:onechain
```

4. **Copy contract addresses** from the deployment output to your frontend `.env` file

## Common Issues

### Issue 1: "getaddrinfo ENOTFOUND rpc.onechain.pro"

**Cause**: The RPC endpoint URL is incorrect or OneChain network details aren't available yet

**Solution**: 
1. **For testing**: Use local deployment instead:
```bash
# Terminal 1
cd packages/contracts
npm run node

# Terminal 2
cd packages/contracts
npm run deploy:local
```

2. **For OneChain**: Get the correct RPC endpoint from OneChain documentation and update `.env`:
```env
ONECHAIN_RPC_URL=https://correct-onechain-rpc-url.com
```

### Issue 2: "Missing script: deploy:local"

**Cause**: Running command from wrong directory

**Solution**: Make sure you're in the `packages/contracts` directory:
```bash
cd packages/contracts
npm run deploy:local
```

### Issue 3: "Cannot connect to network"

**Cause**: Hardhat node not running for localhost deployment

**Solution**: 
1. Start Hardhat node in one terminal:
```bash
cd packages/contracts
npm run node
```

2. Then deploy in another terminal:
```bash
cd packages/contracts
npm run deploy:local
```

### Issue 4: "Insufficient funds" or "Account balance too low"

**Cause**: Account doesn't have enough funds for gas fees

**Solution**: 
- For local Hardhat node: Use one of the accounts that Hardhat provides (they come pre-funded)
- For OneChain: Make sure your account has enough ONE tokens for gas fees

### Issue 5: "Invalid private key"

**Cause**: `.env` file not set up correctly

**Solution**: 
1. Make sure `.env` file exists in `packages/contracts/` directory
2. Make sure `PRIVATE_KEY` is set correctly (without `0x` prefix)
3. Make sure there are no extra spaces or quotes around the private key

## Local Development Workflow (Recommended)

For development and testing, use local deployment:

```bash
# Terminal 1: Start Hardhat node
cd packages/contracts
npm run node

# Terminal 2: Deploy contracts
cd packages/contracts
npm run deploy:local

# Copy contract addresses to frontend .env
# Then start frontend
cd ../..
npm run dev
```

## Verification

After deployment, you should see output like:

```
=== Deployment Summary ===
CATCoin: 0x5FbDB2315678afecb367f032d93F642f64180aa3
CatNFT: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
GameItem: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
PomodoroGame: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

=== Copy these addresses to your .env file ===
VITE_CAT_COIN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_CAT_NFT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_GAME_ITEM_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
VITE_GAME_CONTRACT_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

## Next Steps

1. **Copy contract addresses** to your frontend `.env` file in the root directory
2. **Copy contract ABIs** from `packages/contracts/artifacts/contracts/` to `src/abis/` (if needed)
3. **Update frontend** configuration to use the deployed contract addresses
4. **Test the integration** by connecting OneWallet and interacting with contracts

## Quick Deployment Commands

```bash
# Navigate to contracts directory
cd packages/contracts

# Compile contracts
npm run compile

# For local testing:
# Terminal 1: Start Hardhat node
npm run node

# Terminal 2: Deploy to local
npm run deploy:local

# For OneChain deployment (after getting correct RPC URL):
# Update .env file with correct ONECHAIN_RPC_URL
npm run deploy:onechain
```

## Finding OneChain RPC Endpoint

If you need the actual OneChain RPC endpoint:

1. Check OneChain official documentation: https://docs.onechain.pro
2. Look for network configuration section
3. Common RPC formats:
   - Testnet: `https://testnet-rpc.onechain.network`
   - Mainnet: `https://mainnet-rpc.onechain.network`
   - Or check OneChain explorer for RPC info

## Local Testing is Recommended

Until you have the correct OneChain RPC endpoint, **local deployment is the best option** for:
- ✅ Testing contract functionality
- ✅ Developing frontend integration
- ✅ Debugging issues
- ✅ No need for test tokens

You can switch to OneChain deployment later once you have the correct network details.
