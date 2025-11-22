# Pomodoro Game Smart Contracts

Smart contracts for the Pixel Cat Pomodoro game on OneChain blockchain.

## Contracts

### CATCoin.sol
ERC-20 token for in-game currency (CAT coins).
- Players earn CAT coins by completing Pomodoro sessions
- Used to purchase items and cats in the shop

### CatNFT.sol
ERC-721 NFT contract for cat species.
- Each cat species is a unique NFT
- Players can collect different cat species

### GameItem.sol
ERC-1155 contract for food and toy items.
- Food items: Used to feed cats (reduce hunger)
- Toy items: Used to play with cats (increase happiness)

### PomodoroGame.sol
Main game contract that handles:
- Completing Pomodoro sessions (earning CAT coins)
- Purchasing items and cats
- Feeding and playing with cats
- Cat stats management (hunger, happiness, health)
- Staking CAT coins for rewards

## Security Features

- ✅ Reentrancy protection (ReentrancyGuard)
- ✅ Access control (Ownable pattern)
- ✅ Overflow/underflow protection (Solidity 0.8+)
- ✅ Unauthorized transfer prevention
- ✅ Emergency pause functionality (Pausable)
- ✅ Input validation
- ✅ Safe math operations

See [SECURITY.md](./SECURITY.md) for detailed security audit checklist.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Compile contracts:
```bash
npm run compile
```

3. Run tests:
```bash
npm run test
```

## Deployment

### Local Development

1. Start a local Hardhat node:
```bash
npm run node
```

2. Deploy to local network:
```bash
npm run deploy:local
```

### OneChain Testnet/Mainnet

1. Create `.env` file:
```env
ONECHAIN_RPC_URL=https://rpc.onechain.pro
ONECHAIN_CHAIN_ID=1234
PRIVATE_KEY=your_private_key_here
```

2. Deploy to OneChain:
```bash
npm run deploy:onechain
```

3. Copy contract addresses from deployment output to frontend `.env` file:
```env
VITE_CAT_COIN_ADDRESS=0x...
VITE_CAT_NFT_ADDRESS=0x...
VITE_GAME_ITEM_ADDRESS=0x...
VITE_GAME_CONTRACT_ADDRESS=0x...
```

## Contract Addresses

After deployment, contract addresses will be:
- CATCoin: [Address]
- CatNFT: [Address]
- GameItem: [Address]
- PomodoroGame: [Address]

## Functions

### PomodoroGame.sol

#### Player Functions
- `completeSession()` - Complete a Pomodoro session and earn CAT coins
- `purchaseItem(uint256 itemId, uint256 amount)` - Purchase food or toy items
- `purchaseCat(uint256 catTypeId)` - Purchase a cat NFT
- `feedCat(uint256 catTokenId, uint256 foodId)` - Feed a cat
- `playWithCat(uint256 catTokenId, uint256 toyId)` - Play with a cat
- `updateCatStats(uint256 catTokenId)` - Update cat stats (hunger, happiness)
- `stake(uint256 amount)` - Stake CAT coins to earn rewards
- `unstake()` - Unstake CAT coins and claim rewards

#### View Functions
- `getCatStats(address user, uint256 catTokenId)` - Get cat stats
- `getStakingReward(address user)` - Get staking reward for a user
- `completedSessions(address user)` - Get number of completed sessions
- `stakes(address user)` - Get staking info for a user

#### Owner Functions
- `setStakingRewardRate(uint256 newRate)` - Set staking reward rate
- `pause()` - Pause the contract
- `unpause()` - Unpause the contract
- `emergencyWithdraw()` - Emergency withdraw (owner only)

## Game Mechanics

### Earning CAT Coins
- Complete a 25-minute Pomodoro work session
- Earn 1 CAT coin per completed session
- Coins are minted directly to player's wallet

### Item IDs
- **Food**: 1=fish, 2=tuna, 3=salmon, 4=catnip, 5=premium_food
- **Toys**: 6=football, 7=yarn, 8=laser, 9=mouse, 10=scratch

### Cat Types
- 0=default (free), 1=black (50 CAT), 2=white (75 CAT), 3=ginger (150 CAT)

### Staking
- Stake CAT coins to earn 10% APY
- Minimum staking duration: 1 day
- Maximum staking duration: 365 days
- Rewards are calculated linearly

## Testing

```bash
npm run test
```

## License

MIT

