# 🐱 Pixel Cat Pomodoro Timer - User Guide

**Earn OCT tokens while staying focused!** Complete Pomodoro work sessions and receive blockchain rewards automatically.

---

## 🎯 What Is This?

A Pomodoro timer app that rewards you with **1 OCT token** for every 25-minute work session you complete. Built on OneChain blockchain with automatic reward distribution.

---

## 🚀 Quick Start

### Step 1: Connect Your Wallet

1. **Install OneWallet** browser extension
   - Download from [OneChain website](https://onelabs.cc)
   - Available for Chrome, Firefox, and Edge

2. **Open the App**
   - Navigate to the app URL
   - Click **"Connect Wallet"** button

3. **Approve Connection**
   - OneWallet popup will appear
   - Click **"Connect"** to link your wallet
   - Your wallet address will appear in the top-right corner

### Step 2: Get Testnet OCT (For Gas Fees)

**Important**: You need OCT in your wallet to pay transaction gas fees (~0.01 OCT per reward claim).

**Option A: Use Faucet (Recommended)**
```bash
# In terminal, run:
one client switch --address YOUR_WALLET_ADDRESS
one client gas
```

**Option B: Ask Admin**
- Contact the app administrator to receive testnet OCT

**Note**: You only need ~0.1 OCT to claim many rewards. Each reward gives you 1 OCT, so you'll quickly have enough for future transactions!

---

## ⏱️ How to Use the Pomodoro Timer

### Basic Usage

1. **Start Timer**
   - Click the **▶️ Play** button
   - Timer counts down from 25:00

2. **Work Session (25 minutes)**
   - Focus on your work
   - Timer displays remaining time
   - Cat sprite animates while you work

3. **Session Completes**
   - Timer reaches 00:00
   - Cat meows (audio notification)
   - **Wallet popup appears automatically**

4. **Claim Your Reward**
   - Review transaction in OneWallet popup:
     - **Network Fee**: ~0.01 OCT (you pay)
     - **Reward**: 1.0 OCT (you receive)
     - **Function**: `complete_session`
   - Click **"Sign"** to approve
   - Wait 5-10 seconds for confirmation

5. **Break Time (5 minutes)**
   - Timer automatically switches to 5-minute break
   - Use this time to rest and sign the transaction
   - Timer auto-starts the break

6. **Repeat**
   - After break, timer returns to 25-minute work
   - Complete another session to earn another 1 OCT!

### Pomodoro Cycle

The timer automatically cycles through:

```
1. Work (25 min) → Earn 1 OCT
2. Short Break (5 min)
3. Work (25 min) → Earn 1 OCT
4. Short Break (5 min)
5. Work (25 min) → Earn 1 OCT
6. Short Break (5 min)
7. Work (25 min) → Earn 1 OCT
8. Short Break (5 min)
9. Work (25 min) → Earn 1 OCT
10. Long Break (15 min)
...and repeats
```

**Note**: After 4 work sessions (with 4 short breaks), you get 1 long break.

---

## 💰 Earning Rewards

### How Rewards Work

- **Reward Amount**: 1.0 OCT per completed work session
- **Gas Fee**: ~0.01 OCT (paid from your wallet)
- **Net Profit**: 0.99 OCT per session
- **Daily Limit**: 100 OCT maximum per day
- **Session Limit**: 100 sessions maximum per day

### Transaction Flow

```
1. Complete 25-minute work session
2. Wallet popup appears automatically
3. Sign transaction (approve in OneWallet)
4. Treasury sends 1 OCT to your wallet
5. Transaction appears in history
6. Balance updates automatically
```

### Checking Your Balance

- **Top-right corner**: Shows your OCT balance
- **Transaction History**: View all earnings in Settings
- **OneWallet**: Check balance in wallet extension

---

## 🐱 Collecting Cat NFTs

### What Are Cat NFTs?

Cat NFTs are rare collectible tokens that represent different cat species. Each NFT is unique and stored on the OneChain blockchain. Some cats are extremely rare!

### How to Get Cat NFTs

**Important**: NFTs are rewarded randomly based on luck. There's no guaranteed way to get one!

1. **Build Your Streak**
   - Complete Pomodoro work sessions consistently
   - Maintain a streak of completed sessions
   - The longer your streak, the better your chances (but still random!)

2. **Random Rewards**
   - NFTs are awarded randomly after completing work sessions
   - You won't know when you'll receive one
   - It's all about luck and persistence!

3. **Check Your Collection**
   - Click **🐱 Collection** button in the header
   - View all available cat species
   - See which cats you own (✓ Owned) vs don't own (○ Not Owned)

### NFT Rarity Levels

Cat NFTs come in different rarity levels:

- **Most Common**: Domestic Shorthair / Moggy
- **Very Common**: British Shorthair, Persian Cat
- **Common**: Bengal Cat
- **Uncommon**: Turkish Van, Serengeti Cat
- **Rare**: Sokoke Cat, Andean Mountain Cat
- **Endangered**: Iberian Lynx (~1,000 left in real world)
- **Critically Rare**: Amur Leopard (<100 left in real world)

### Viewing Your NFTs

1. **Collection Gallery**
   - Click **🐱 Collection** button
   - Browse all cat species
   - See ownership status for each cat
   - Click any card to expand and see details

2. **My Cat Page**
   - Go to **🐱 My Cat** tab
   - View your currently selected cat
   - Switch between owned cats
   - See NFT token ID for blockchain verification

3. **NFT Features**
   - Each NFT has a unique token ID
   - NFTs are stored on-chain (permanent)
   - You truly own your cat NFTs
   - Trade or transfer them anytime

### Why NFTs Are Valuable

- **Rare**: Random drops make them hard to get
- **Unique**: Each NFT has a unique token ID
- **Permanent**: Stored on blockchain forever
- **Collectible**: Different species and rarities
- **Ownership**: You truly own them (not just in-game items)

### Tips for Collecting

1. **Stay Consistent**: Build your streak by completing sessions daily
2. **Be Patient**: NFTs are random - keep trying!
3. **Check Collection**: Regularly view your collection to see new additions
4. **Enjoy the Journey**: Focus on productivity, and NFTs are a bonus reward!

---

## 📊 Transaction History

### View History

1. Click **⚙️ Settings** button
2. Click **"View Transaction History"**
3. See all your rewards:
   - **🎉 Completed Pomodoro session**
   - Amount: +1.0 OCT
   - Timestamp
   - Transaction hash (click to view on explorer)

### Transaction Details

Each reward transaction shows:
- **Type**: Earn Reward
- **Amount**: 1.0 OCT
- **Status**: Success
- **Time**: When you completed the session
- **Hash**: Link to blockchain explorer

---

## ⚙️ Settings

### Access Settings

Click the **⚙️ Settings** button in the top-right corner.

### Available Settings

#### Theme
- **Dark Mode** (default)
- **Light Mode**

#### Volume
- Adjust notification sound volume (0-100%)
- Cat meow plays when timer completes

#### Treasury Monitor
- View treasury balance
- See how many rewards are available
- Check treasury status (healthy/low/critical)

#### Developer Mode
- **Fast Timer Mode (200x speed)**
  - For testing only
  - 25 minutes → 7.5 seconds
  - Enable in Developer Mode settings

---

## 🎮 Features

### Timer Controls

- **▶️ Play**: Start the timer
- **⏸️ Pause**: Pause the timer
- **⏹️ Reset**: Reset to full duration

### Phase Indicator

- **🔴 Work**: Red indicator during work sessions
- **🟢 Break**: Green indicator during breaks
- **🟡 Long Break**: Yellow indicator for long breaks

### Audio Notifications

- **Cat Meow**: Plays when timer completes
- **Volume Control**: Adjust in Settings
- **Mute**: Set volume to 0%

### NFT Collection

- **Collection Gallery**: View all available cat NFTs
- **Ownership Status**: See which cats you own
- **NFT Details**: View token IDs and cat information
- **Visual Indicators**: Owned cats have special glow effects

---

## ❓ Troubleshooting

### "Insufficient Gas" Error

**Problem**: Your wallet doesn't have enough OCT to pay gas fees.

**Solution**:
```bash
# Get free testnet OCT
one client switch --address YOUR_WALLET_ADDRESS
one client gas
```

**Note**: You only need ~0.1 OCT to claim many rewards!

---

### Wallet Not Connecting

**Problem**: "Connect Wallet" button doesn't work.

**Solutions**:
1. **Check OneWallet Extension**
   - Make sure OneWallet is installed
   - Refresh the page
   - Try a different browser

2. **Network Issues**
   - Ensure you're on OneChain Testnet
   - Check internet connection
   - Try refreshing the page

---

### Transaction Not Appearing

**Problem**: Completed session but no wallet popup.

**Solutions**:
1. **Check Wallet Connection**
   - Ensure wallet is connected (address shown in top-right)
   - Try disconnecting and reconnecting

2. **Check Browser Console**
   - Press F12 to open developer tools
   - Look for error messages
   - Check Network tab for failed requests

3. **Refresh Page**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Clear browser cache if needed

---

### "Daily Cap Reached" Error

**Problem**: Transaction fails with error code 1.

**Cause**: You've already earned 100 OCT today.

**Solution**: Wait until midnight UTC (daily reset) to continue earning.

**Note**: This is a safety limit to prevent abuse.

---

### "Session Limit Reached" Error

**Problem**: Transaction fails with error code 2.

**Cause**: You've completed 100 sessions today.

**Solution**: Wait until midnight UTC (daily reset) to continue.

---

### Treasury Empty

**Problem**: Transaction fails with "Treasury insufficient" error.

**Cause**: Treasury has run out of OCT.

**Solution**: Contact the app administrator to refill the treasury.

**Note**: This is rare and usually fixed quickly.

---

## 💡 Tips & Best Practices

### Maximize Your Earnings

1. **Stay Focused**: Complete full 25-minute sessions
2. **Use Breaks Wisely**: Sign transactions during 5-minute breaks
3. **Track Progress**: Check transaction history regularly
4. **Monitor Treasury**: Ensure treasury has funds before starting

### Build Your NFT Collection

1. **Maintain Streaks**: Complete sessions consistently to improve your chances
2. **Be Patient**: NFTs are random - don't get discouraged!
3. **Check Regularly**: View your collection to see if you got lucky
4. **Focus on Productivity**: NFTs are a bonus - the real reward is getting work done!

### Gas Fee Management

- **Keep ~0.1 OCT** in wallet for gas fees
- Each reward gives you 1 OCT, so you'll quickly accumulate more
- Gas fees are only ~0.01 OCT per transaction (very cheap!)

### Daily Limits

- **100 OCT per day** maximum
- **100 sessions per day** maximum
- Resets at **midnight UTC**
- Plan your sessions accordingly

---

## 🔗 Useful Links

- **OneChain Explorer**: [explorer-testnet.onelabs.cc](https://explorer-testnet.onelabs.cc)
- **OneChain Website**: [onelabs.cc](https://onelabs.cc)
- **OneWallet Download**: Check OneChain website

---

## 📞 Support

### Common Questions

**Q: Do I need to sign every transaction?**
A: Yes, for security. Each reward requires your approval in OneWallet.

**Q: Can I earn more than 1 OCT per session?**
A: No, each 25-minute work session rewards exactly 1 OCT.

**Q: What happens if I close the browser?**
A: Your progress is saved. Reconnect your wallet to continue.

**Q: Can I use multiple wallets?**
A: Yes, but each wallet has separate daily limits.

**Q: Is this on mainnet or testnet?**
A: Currently on OneChain Testnet. Rewards are testnet tokens.

**Q: How do I get cat NFTs?**
A: NFTs are rewarded randomly based on luck when you complete Pomodoro sessions. Build a streak and keep trying!

**Q: When will I get an NFT?**
A: It's completely random! We don't reveal the drop rates to keep it exciting and fair for everyone.

**Q: Can I buy NFTs?**
A: You can purchase some cat species from the Shop using OCT, but rare NFTs are only available through random drops.

**Q: Are NFTs valuable?**
A: Yes! They're rare, unique, permanently stored on blockchain, and represent real cat species with different rarity levels.

---

## 🎉 Getting Started Checklist

- [ ] Install OneWallet extension
- [ ] Connect wallet to app
- [ ] Get testnet OCT for gas fees (~0.1 OCT)
- [ ] Start your first 25-minute work session
- [ ] Sign transaction when timer completes
- [ ] Receive 1 OCT reward
- [ ] Enjoy your 5-minute break
- [ ] Check your Collection to see available cat NFTs
- [ ] Build a streak by completing sessions consistently
- [ ] Hope for lucky NFT drops!
- [ ] Repeat and build your OCT balance and NFT collection!

---

## 📝 Notes

- **Testnet Tokens**: All OCT rewards are testnet tokens (not real money)
- **Gas Fees**: Small fee (~0.01 OCT) required for each transaction
- **Daily Limits**: 100 OCT and 100 sessions per day maximum
- **Automatic**: Rewards are sent automatically after signing
- **Secure**: All transactions require your wallet approval
- **NFT Drops**: Random and luck-based - no guaranteed drops
- **NFT Rarity**: Some cats are extremely rare (like real-world endangered species)
- **Collection**: View all cats in the Collection gallery, even ones you don't own yet

---

**Happy focusing! 🐱⏱️💰**
