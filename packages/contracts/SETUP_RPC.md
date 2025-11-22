# Setting Up OneChain RPC Endpoint

## Current Issue

The default RPC endpoint `rpc.onechain.pro` is not resolving. You need to:

1. **Get the correct OneChain RPC endpoint** from OneChain documentation
2. **Update your `.env` file** with the correct URL

## Quick Fix: Use Local Deployment

For now, use local deployment (recommended for testing):

```bash
# Terminal 1: Start Hardhat node
cd packages/contracts
npm run node

# Terminal 2: Deploy contracts
cd packages/contracts  
npm run deploy:local
```

## When You Have OneChain RPC URL

1. **Create `.env` file** in `packages/contracts/`:
```bash
cd packages/contracts
nano .env  # or use your preferred editor
```

2. **Add OneChain configuration**:
```env
ONECHAIN_RPC_URL=https://your-actual-onechain-rpc-url.com
ONECHAIN_CHAIN_ID=1234
PRIVATE_KEY=your_private_key_without_0x_prefix
```

3. **Deploy**:
```bash
npm run deploy:onechain
```

## Finding OneChain RPC Endpoint

Check these sources:
- OneChain official documentation
- OneChain Discord/Telegram
- OneChain GitHub repository
- OneChain block explorer (usually has RPC info)
