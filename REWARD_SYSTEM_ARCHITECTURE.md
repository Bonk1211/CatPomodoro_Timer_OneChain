# Reward System Architecture

## Overview

Users receive 1 OCT from the Treasury after completing a 25-minute Pomodoro session.

---

## System Components

### 1. Smart Contract (Move)

**Package ID**: `0xaa248b205bb247b4cafb6d8243ffe29118721b97bcefd33c87b239b642768de3`

**File**: `packages/pomodoro_game/sources/pomodoro_game.move`

#### Treasury Object (Shared)
```move
public struct Treasury has key, store {
    id: UID,
    oct_balance: Balance<OCT>,           // Holds OCT for rewards
    admin_address: address,              // Admin can fund treasury
    total_rewards_paid: u64,             // Total OCT distributed
    total_users_rewarded: u64,           // Total transactions
}
```

**Treasury ID**: `0xc68322e94e54691ce03c3e37c85cb16e5c1fd87a94d3680651f38203e4436e76`

#### GameState Object (Shared)
```move
public struct GameState has key, store {
    id: UID,
    session_reward: u64,                 // 1_000_000_000 (1.0 OCT)
    daily_earnings: Table<address, DailyEarning>,
    daily_cap: u64,                      // 100_000_000_000 (100 OCT/day)
    daily_session_limit: u64,            // 100 sessions/day
}
```

**GameState ID**: `0xf49315984fdddeebabd6f29577c263a8475ef5ff80f622c46034a31f5d52baf6`

#### complete_session Function
```move
public entry fun complete_session(
    treasury: &mut Treasury,
    game_state: &mut GameState,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**What it does**:
1. Gets sender address from `ctx`
2. Checks daily cap (100 OCT max per day)
3. Checks session limit (100 sessions max per day)
4. Takes 1 OCT from Treasury balance
5. Transfers OCT to sender
6. Updates daily earnings tracking
7. Increments treasury stats

---

### 2. Frontend Hook

**File**: `src/hooks/useGameTransactions.js`

#### useCompleteSession Hook

**Purpose**: Build and sign the `complete_session` transaction

**Key Configuration**:
```javascript
tx.setGasBudget(10000000)  // 0.01 OCT

tx.moveCall({
  target: `${gamePackageId}::pomodoro_game::complete_session`,
  arguments: [
    tx.object(treasury),     // Treasury shared object
    tx.object(gameState),    // GameState shared object  
    tx.object(clock)         // Clock system object (0x6)
  ]
})
```

**Transaction Flow**:
1. User calls `completeSession()`
2. Hook builds transaction with `@mysten/sui/transactions`
3. Sets sender address
4. Sets gas budget (0.01 OCT)
5. Adds moveCall with 3 arguments
6. Signs transaction via `signAndExecuteTransaction`
7. Waits for confirmation
8. Returns success/error

---

### 3. Timer Component

**File**: `src/components/PomodoroTimer.jsx`

**Simple Flow**:
```javascript
const { completeSession } = useCompleteSession()

const handleComplete = () => {
  if (currentPhase.name === 'work') {
    incrementCompletedSessions()
    completeSession()  // ← Triggers reward transaction
  }
}
```

When timer reaches 0:
1. `handleComplete()` called
2. Checks if work session (25 min)
3. Calls `completeSession()`
4. Wallet popup appears
5. User signs transaction
6. Treasury sends 1 OCT

---

## Transaction Details

### Gas Configuration

**Gas Budget**: 10,000,000 MIST (0.01 OCT)
- **Why this amount?**: Original 0.002 OCT was too low, causing "insufficient gas" errors
- **Who pays?**: User's wallet pays gas fee
- **Net profit**: 1.0 OCT (reward) - 0.01 OCT (gas) = **0.99 OCT**

### Required Objects

| Object | Type | ID | Mutable |
|--------|------|----|---------| 
| Treasury | SharedObject | 0xc68322e94e54691ce03c3e37c85cb16e5c1fd87a... | Yes |
| GameState | SharedObject | 0xf49315984fdddeebabd6f29577c263a8475ef5ff... | Yes |
| Clock | SharedObject | 0x0000...0006 | No |

### Transaction Structure

```json
{
  "sender": "0xe66a2011...",
  "gasData": {
    "budget": "10000000",
    "price": "1000"
  },
  "commands": [
    {
      "MoveCall": {
        "package": "0xaa248b20...",
        "module": "pomodoro_game",
        "function": "complete_session",
        "arguments": [
          { "SharedObject": { "objectId": "0xc68322e9..." } }, // Treasury
          { "SharedObject": { "objectId": "0xf4931598..." } }, // GameState
          { "SharedObject": { "objectId": "0x0000...0006" } }  // Clock
        ]
      }
    }
  ]
}
```

---

## Daily Limits

**Per User Per Day**:
- Max earnings: 100 OCT
- Max sessions: 100

**Reset**: Midnight UTC

**Enforcement**: Smart contract checks before paying reward

---

## Treasury Management

### Admin Address
`0xbb22581dcb7fa55b16da44fdcff4e4434ae44da663d9533969a4729021f00c40`

### Funding Treasury

**Script**: `fund_treasury_simple.sh`

```bash
#!/bin/bash
one client switch --address 0xbb22581dcb7fa55b16da44fdcff4e4434ae44da663d9533969a4729021f00c40
one client call \
  --package 0xaa248b205bb247b4cafb6d8243ffe29118721b97bcefd33c87b239b642768de3 \
  --module pomodoro_game \
  --function fund_treasury \
  --args 0xc68322e94e54691ce03c3e37c85cb16e5c1fd87a94d3680651f38203e4436e76 <OCT_COIN_ID> \
  --gas-budget 10000000
```

**When to fund**:
- Treasury balance drops below 10 OCT
- Before running out of rewards

**Check balance**:
```bash
one client object 0xc68322e94e54691ce03c3e37c85cb16e5c1fd87a94d3680651f38203e4436e76
```

---

## Error Handling

### Common Errors

| Error | Code | Cause | Solution |
|-------|------|-------|----------|
| Insufficient gas | - | Gas budget too low | Increased to 0.01 OCT |
| Daily cap reached | abort 1 | User earned 100 OCT today | Wait until tomorrow |
| Session limit reached | abort 2 | User completed 100 sessions | Wait until tomorrow |
| Treasury insufficient | abort 3 | Treasury balance < 1 OCT | Admin needs to fund treasury |

### User Wallet Requirements

**Minimum balance**: 0.01 OCT (for gas)
- If user has 0 OCT, transaction will fail
- Solution: Get testnet OCT via `one client gas`

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│ 1. User completes 25-minute Pomodoro timer          │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 2. Frontend calls completeSession()                 │
│    File: src/components/PomodoroTimer.jsx           │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 3. Hook builds transaction                          │
│    File: src/hooks/useGameTransactions.js           │
│    - Sets gas budget: 0.01 OCT                      │
│    - Adds moveCall to complete_session              │
│    - Includes Treasury, GameState, Clock objects    │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 4. Wallet popup appears                             │
│    - User reviews transaction                       │
│    - Network fee: ~0.01 OCT                         │
│    - Function: complete_session                     │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 5. User signs transaction                           │
│    - Transaction submitted to OneChain RPC          │
│    - Gas paid from user's wallet                    │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 6. Smart contract executes                          │
│    File: packages/pomodoro_game/sources/            │
│          pomodoro_game.move                         │
│    - Checks daily limits                            │
│    - Verifies treasury has balance                  │
│    - Takes 1 OCT from treasury.oct_balance          │
│    - Transfers to user                              │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 7. User receives reward                             │
│    - Balance: +1.0 OCT (reward)                     │
│    - Balance: -0.01 OCT (gas)                       │
│    - Net: +0.99 OCT                                 │
└─────────────────────────────────────────────────────┘
```

---

## Key Files Reference

### Smart Contract
- `packages/pomodoro_game/sources/pomodoro_game.move` - Core game logic

### Frontend
- `src/components/PomodoroTimer.jsx` - Timer component (calls hook)
- `src/hooks/useGameTransactions.js` - Transaction building & signing
- `src/utils/onechainBlockchainUtils.js` - Contract IDs configuration

### Scripts
- `fund_treasury_simple.sh` - Admin script to fund treasury

### Documentation
- `FUND_TREASURY_GUIDE.md` - Treasury funding instructions
- `REWARD_SYSTEM_ARCHITECTURE.md` - This file

---

## Configuration

All contract IDs are stored in:

**File**: `src/utils/onechainBlockchainUtils.js`

```javascript
export const ONECHAIN_OBJECT_IDS = {
  gamePackageId: '0xaa248b205bb247b4cafb6d8243ffe29118721b97bcefd33c87b239b642768de3',
  gameState: '0xf49315984fdddeebabd6f29577c263a8475ef5ff80f622c46034a31f5d52baf6',
  treasury: '0xc68322e94e54691ce03c3e37c85cb16e5c1fd87a94d3680651f38203e4436e76',
  upgradeCap: '0x7e52cfd55831574cdcf197fb19da53e5c3b76f1f0e49ef5b9fd44521e62bae2b',
  clock: '0x0000000000000000000000000000000000000000000000000000000000000006'
}
```

Also in `.env`:
```
VITE_SUI_GAME_PACKAGE_ID=0xaa248b205bb247b4cafb6d8243ffe29118721b97bcefd33c87b239b642768de3
VITE_SUI_GAME_STATE_ID=0xf49315984fdddeebabd6f29577c263a8475ef5ff80f622c46034a31f5d52baf6
VITE_SUI_TREASURY_ID=0xc68322e94e54691ce03c3e37c85cb16e5c1fd87a94d3680651f38203e4436e76
VITE_SUI_UPGRADE_CAP_ID=0x7e52cfd55831574cdcf197fb19da53e5c3b76f1f0e49ef5b9fd44521e62bae2b
```

---

## Summary

**Simple flow**: Timer finishes → `completeSession()` → Treasury pays 1 OCT → Done

**Key insight**: User pays small gas fee (0.01 OCT) but receives 1 OCT reward, netting 0.99 OCT profit per session.

**Critical setting**: Gas budget must be 10,000,000 MIST (0.01 OCT) - lower values cause "insufficient gas" errors.

**Maintenance**: Admin must keep treasury funded. Check balance regularly and refund when below 10 OCT.

