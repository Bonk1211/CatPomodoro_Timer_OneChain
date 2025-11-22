#!/bin/bash
# Simple Treasury Funding Script

echo "💰 Treasury Funding Helper"
echo "=========================="
echo ""

# Treasury and Package IDs
TREASURY_ID="0xc68322e94e54691ce03c3e37c85cb16e5c1fd87a94d3680651f38203e4436e76"
PACKAGE_ID="0xaa248b205bb247b4cafb6d8243ffe29118721b97bcefd33c87b239b642768de3"
ADMIN_WALLET="0xbb22581dcb7fa55b16da44fdcff4e4434ae44da663d9533969a4729021f00c40"

# Step 1: Switch to admin wallet
echo "📝 Step 1: Switching to admin wallet..."
one client switch --address $ADMIN_WALLET

if [ $? -ne 0 ]; then
    echo "❌ Failed to switch wallet. Make sure you have imported the admin wallet."
    exit 1
fi

echo "✅ Switched to admin wallet"
echo ""

# Step 2: Get available coins
echo "📝 Step 2: Checking available coins..."
echo ""
one client gas
echo ""

# Step 3: Ask user for coin ID
echo "📝 Step 3: Enter a Coin ID from above (the long 0x... address):"
read -p "Coin ID: " COIN_ID

if [ -z "$COIN_ID" ]; then
    echo "❌ No coin ID provided. Exiting."
    exit 1
fi

echo ""
echo "💰 Funding treasury with coin: $COIN_ID"
echo ""

# Step 4: Fund treasury
one client call \
  --package $PACKAGE_ID \
  --module pomodoro_game \
  --function fund_treasury \
  --args $TREASURY_ID $COIN_ID \
  --gas-budget 10000000

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Treasury funded successfully!"
    echo ""
    
    # Ask if they want to fund more
    read -p "❓ Fund with another coin? (y/n): " CONTINUE
    
    if [ "$CONTINUE" = "y" ] || [ "$CONTINUE" = "Y" ]; then
        echo ""
        echo "📝 Available coins:"
        one client gas
        echo ""
        read -p "Coin ID: " COIN_ID2
        
        if [ ! -z "$COIN_ID2" ]; then
            echo ""
            echo "💰 Funding treasury with second coin: $COIN_ID2"
            echo ""
            
            one client call \
              --package $PACKAGE_ID \
              --module pomodoro_game \
              --function fund_treasury \
              --args $TREASURY_ID $COIN_ID2 \
              --gas-budget 10000000
            
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ Second funding successful!"
            fi
        fi
    fi
else
    echo ""
    echo "❌ Treasury funding failed!"
    exit 1
fi

echo ""
echo "📊 Checking treasury balance..."
one client object $TREASURY_ID | grep -A 5 "oct_balance" || echo "Could not parse balance"

echo ""
echo "✅ All done!"
echo ""
echo "🎯 Next steps:"
echo "1. Switch back to test wallet:"
echo "   one client switch --address 0xeb64a2b1ff0f63e7e917aa868a8a4a44182f8193db5e41ad7f677d38d164cb48"
echo ""
echo "2. Test in browser:"
echo "   - Go to http://localhost:5173/"
echo "   - Hard refresh (Cmd+Shift+R)"
echo "   - Complete a Pomodoro session"
echo "   - Receive 1 OCT reward! 🎉"
echo ""


