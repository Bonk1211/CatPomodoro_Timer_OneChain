#!/bin/bash
# Automated Treasury Funding Script
# Runs 10 iterations, uses faucet + existing coins

set -e  # Stop on first error

# Configuration
TREASURY_ID="0xc68322e94e54691ce03c3e37c85cb16e5c1fd87a94d3680651f38203e4436e76"
PACKAGE_ID="0xaa248b205bb247b4cafb6d8243ffe29118721b97bcefd33c87b239b642768de3"
ADMIN_WALLET="0xbb22581dcb7fa55b16da44fdcff4e4434ae44da663d9533969a4729021f00c40"
MAX_ITERATIONS=10

echo "🤖 Automated Treasury Funding"
echo "=============================="
echo "Target: $MAX_ITERATIONS iterations"
echo ""

# Step 1: Switch to admin wallet
echo "📝 Switching to admin wallet..."
one client switch --address $ADMIN_WALLET || {
    echo "❌ Failed to switch wallet"
    exit 1
}
echo "✅ Switched to admin: $ADMIN_WALLET"
echo ""

# Main loop
for i in $(seq 1 $MAX_ITERATIONS); do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 Iteration $i of $MAX_ITERATIONS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Try to get new OCT from faucet
    echo "💰 Requesting OCT from faucet..."
    if one client gas 2>&1 | tee /tmp/faucet_output.txt; then
        echo "✅ Faucet request successful"
        sleep 3  # Wait for transaction to confirm
    else
        echo "⚠️  Faucet failed (likely rate limit), will use existing coins"
    fi
    echo ""
    
    # Get all available OCT coins
    echo "🔍 Finding available OCT coins..."
    COIN_IDS=$(one client gas 2>/dev/null | \
               grep "^│ 0x" | \
               awk '{print $2}' | \
               grep "^0x")
    
    if [ -z "$COIN_IDS" ]; then
        echo "❌ No OCT coins found in wallet"
        echo "💡 Please fund the admin wallet manually first"
        exit 1
    fi
    
    COIN_COUNT=$(echo "$COIN_IDS" | wc -l | xargs)
    echo "✅ Found $COIN_COUNT OCT coin(s)"
    echo ""
    
    # Fund treasury with each coin
    FUNDED_COUNT=0
    for COIN_ID in $COIN_IDS; do
        echo "   💸 Funding with coin: $COIN_ID"
        
        if one client call \
            --package $PACKAGE_ID \
            --module pomodoro_game \
            --function fund_treasury \
            --args $TREASURY_ID $COIN_ID \
            --gas-budget 10000000 2>&1; then
            
            FUNDED_COUNT=$((FUNDED_COUNT + 1))
            echo "   ✅ Funded successfully ($FUNDED_COUNT coin(s) used this iteration)"
        else
            echo "   ❌ Funding failed for coin $COIN_ID"
            echo "   🛑 Stopping due to error (as requested)"
            exit 1
        fi
        
        echo ""
        sleep 2  # Brief pause between transactions
    done
    
    echo "✅ Iteration $i complete: Used $FUNDED_COUNT coin(s)"
    echo ""
    
    # Check treasury balance after this iteration
    echo "📊 Current treasury balance:"
    one client object $TREASURY_ID 2>/dev/null | grep -A 5 "oct_balance" || echo "   (Could not parse balance)"
    echo ""
    
    # Pause between iterations (except last one)
    if [ $i -lt $MAX_ITERATIONS ]; then
        echo "⏸️  Waiting 5 seconds before next iteration..."
        sleep 5
        echo ""
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 All $MAX_ITERATIONS iterations complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Final balance check
echo "📊 Final Treasury Balance:"
one client object $TREASURY_ID 2>/dev/null | grep -A 10 "oct_balance"
echo ""

echo "✅ Automated funding complete!"
echo ""
echo "💡 Next steps:"
echo "   1. Test the reward system in your app"
echo "   2. Monitor treasury balance over time"
echo "   3. Re-run this script when balance gets low"
echo ""

