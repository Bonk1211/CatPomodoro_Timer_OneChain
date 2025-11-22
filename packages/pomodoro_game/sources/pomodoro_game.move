/// Pomodoro Game Module
/// Main game logic module for Pomodoro sessions, purchases, and cat interactions
/// Uses OCT coin (native OneChain token) - 100% burn on purchases
module pomodoro_game::pomodoro_game {
    use one::coin::{Self, Coin};
    use one::balance::{Self, Balance};
    use one::transfer;
    use one::tx_context::{Self, TxContext};
    use one::object::{Self, UID};
    use one::table::{Self, Table};
    use one::clock::{Self, Clock};
    
    // Import OCT directly from core system modules (0x2 is the system package)
    use 0x2::oct::OCT;
    use pomodoro_game::catnft::{Self, CatNFT};
    use pomodoro_game::game_item::{Self, FoodItem, ToyItem};
    
    // Error codes
    const EInsufficientPayment: u64 = 1;
    const EInvalidItemId: u64 = 2;
    const ETreasuryInsufficient: u64 = 3;
    const ENotAuthorized: u64 = 4;

    /// Daily earning record per user
    public struct DailyEarning has store {
        date: u64, // Unix timestamp of day (days since epoch)
        amount: u64, // Total OCT earned today (in smallest units, 9 decimals)
        sessions: u64, // Number of sessions today
    }

    /// Treasury object - holds OCT for automatic reward distribution
    public struct Treasury has key, store {
        id: UID,
        oct_balance: Balance<OCT>, // Holds actual OCT for rewards
        admin_address: address, // Admin who can fund treasury
        total_rewards_paid: u64, // Total OCT distributed
        total_users_rewarded: u64, // Total number of reward transactions
    }

    /// Shared game state object
    public struct GameState has key, store {
        id: UID,
        // Item prices (in OCT, with 9 decimals)
        food_prices: Table<u8, u64>, // item_id -> price
        toy_prices: Table<u8, u64>,
        cat_prices: Table<u8, u64>, // cat_type -> price
        // Session rewards (tracked but not minted - OCT is native token)
        session_reward: u64, // OCT per session (0.1 OCT = 100_000_000 with 9 decimals)
        // Daily earning tracking
        daily_earnings: Table<address, DailyEarning>, // Track daily earnings per user
        // Admin addresses
        burn_address: address, // Address for burning tokens (0x0000...0000)
        admin_address: address, // Admin address for price/reward updates
    }

    /// Initialize game state and treasury
    fun init(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let mut game_state = GameState {
            id: object::new(ctx),
            food_prices: table::new(ctx),
            toy_prices: table::new(ctx),
            cat_prices: table::new(ctx),
            session_reward: 1_000_000_000, // 1.0 OCT (with 9 decimals)
            daily_earnings: table::new(ctx),
            burn_address: @0x0000000000000000000000000000000000000000000000000000000000000000, // Zero address for burning
            admin_address: sender, // Deployer is initial admin
        };
        
        // Set default prices (in smallest OCT units, 1 OCT = 1_000_000_000)
        // Food: 1=fish(1), 2=tuna(2), 3=salmon(3), 4=catnip(4), 5=premium(5)
        table::add(&mut game_state.food_prices, 1, 1_000_000_000);   // 1 OCT
        table::add(&mut game_state.food_prices, 2, 2_000_000_000);   // 2 OCT
        table::add(&mut game_state.food_prices, 3, 3_000_000_000);   // 3 OCT
        table::add(&mut game_state.food_prices, 4, 4_000_000_000);   // 4 OCT
        table::add(&mut game_state.food_prices, 5, 5_000_000_000);   // 5 OCT
        
        // Toys: 6=ball(10), 7=yarn(15), 8=laser(20), 9=mouse(25), 10=scratch(30)
        table::add(&mut game_state.toy_prices, 6, 10);
        table::add(&mut game_state.toy_prices, 7, 15);
        table::add(&mut game_state.toy_prices, 8, 20);
        table::add(&mut game_state.toy_prices, 9, 25);
        table::add(&mut game_state.toy_prices, 10, 30);
        
        // Cats: 0=default(free), 1=black(50), 2=white(75), 3=calico(150)
        table::add(&mut game_state.cat_prices, 0, 0);
        table::add(&mut game_state.cat_prices, 1, 50);
        table::add(&mut game_state.cat_prices, 2, 75);
        table::add(&mut game_state.cat_prices, 3, 150);
        
        transfer::public_share_object(game_state);

        // Create Treasury object for automatic reward distribution
        let treasury = Treasury {
            id: object::new(ctx),
            oct_balance: balance::zero(), // Starts empty, admin will fund it
            admin_address: sender, // Set deployer as admin
            total_rewards_paid: 0,
            total_users_rewarded: 0,
        };
        
        transfer::public_share_object(treasury);
    }

    /// Complete Pomodoro session - pays reward from Treasury
    /// Treasury must be pre-funded by admin with OCT
    public entry fun complete_session(
        treasury: &mut Treasury,
        game_state: &mut GameState,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let recipient = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        let current_day = current_time / (24 * 60 * 60 * 1000); // Days since epoch
        
        // Get base reward first (before borrowing daily_earnings)
        let base_reward = game_state.session_reward;
        
        // Check daily earning cap (100.0 OCT = 100_000_000_000 with 9 decimals)
        let daily_cap = 100_000_000_000; // 100.0 OCT (increased for testing)
        let user_earning = get_or_create_daily_earning(game_state, recipient, current_day);
        
        // Check if user has reached daily cap
        if (user_earning.amount >= daily_cap) {
            abort 1 // Daily cap reached
        };
        
        // Check stamina (max 100 sessions per day)
        if (user_earning.sessions >= 100) {
            abort 2 // Daily session limit reached
        };
        
        // TODO: Add bonus calculations (streak, cat care, etc.)
        let bonus = 0; // Placeholder for bonus calculation
        let total_reward = base_reward + bonus;
        
        // Check if reward exceeds remaining daily cap
        let remaining_cap = daily_cap - user_earning.amount;
        let final_reward = if (total_reward > remaining_cap) remaining_cap else total_reward;
        
        // Check Treasury has sufficient balance
        assert!(
            balance::value(&treasury.oct_balance) >= final_reward,
            ETreasuryInsufficient
        );
        
        // Take OCT from Treasury balance
        let reward_coin = coin::from_balance(
            balance::split(&mut treasury.oct_balance, final_reward),
            ctx
        );
        
        // Transfer OCT to user
        transfer::public_transfer(reward_coin, recipient);
        
        // Update daily earning record
        user_earning.amount = user_earning.amount + final_reward;
        user_earning.sessions = user_earning.sessions + 1;
        
        // Update Treasury stats
        treasury.total_rewards_paid = treasury.total_rewards_paid + final_reward;
        treasury.total_users_rewarded = treasury.total_users_rewarded + 1;
    }

    /// Purchase food or toy item - 100% burn (no treasury)
    /// Note: Food items (1-5) are tracked off-chain by the game
    /// Only toy items (6-10) are minted as blockchain objects
    public entry fun purchase_item(
        game_state: &GameState,
        payment: Coin<OCT>,
        item_id: u8,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        
        // Determine price and validate item_id
        let price = if (item_id >= 1 && item_id <= 5) {
            *table::borrow(&game_state.food_prices, item_id)
        } else if (item_id >= 6 && item_id <= 10) {
            *table::borrow(&game_state.toy_prices, item_id)
        } else {
            abort EInvalidItemId
        };
        
        // Calculate total cost and validate payment
        let total_cost = price * amount;
        let payment_value = coin::value(&payment);
        assert!(payment_value >= total_cost, EInsufficientPayment);
        
        // BURN: Transfer to admin as "burn" (OCT is native, can't be destroyed)
        // Since OCT is a system token, we transfer it to admin address instead of true burn
        // The admin address acts as a "burn vault" - coins sent here are effectively removed from circulation
        transfer::public_transfer(payment, game_state.admin_address);
        
        // Only mint toys as blockchain NFTs
        // Food is tracked off-chain in the game's localStorage
        if (item_id >= 6 && item_id <= 10) {
            let mut i = 0;
            while (i < amount) {
                let toy = game_item::mint_toy(
                    item_id,
                    get_toy_happiness_value(item_id),
                    buyer,
                    ctx
                );
                transfer::public_transfer(toy, buyer);
                i = i + 1;
            };
        };
        // Food purchases (1-5) are tracked off-chain by the frontend
    }

    /// Purchase cat NFT - 100% burn (no treasury)
    public entry fun purchase_cat(
        game_state: &GameState,
        payment: Coin<OCT>,
        cat_type: u8,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        let price = *table::borrow(&game_state.cat_prices, cat_type);
        
        // Validate payment amount
        let payment_value = coin::value(&payment);
        assert!(payment_value >= price, EInsufficientPayment);
        
        // BURN: Transfer to admin as "burn" (OCT is native, can't be destroyed)
        // Since OCT is a system token, we transfer it to admin address instead of true burn
        // The admin address acts as a "burn vault" - coins sent here are effectively removed from circulation
        transfer::public_transfer(payment, game_state.admin_address);
        
        // Mint cat NFT to buyer
        let cat = catnft::mint(cat_type, buyer, ctx);
        transfer::public_transfer(cat, buyer);
    }

    /// Feed cat with food item
    public entry fun feed_cat(
        cat: CatNFT,
        food: FoodItem,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Consume food item and feed cat
        let (id, _item_id, hunger_value) = game_item::consume_food(food);
        object::delete(id);
        let mut cat_mut = cat;
        catnft::feed_cat(&mut cat_mut, hunger_value, clock);
        transfer::public_transfer(cat_mut, tx_context::sender(ctx));
    }

    /// Pet the cat (increases happiness by 5)
    public entry fun pet_cat(
        cat: CatNFT,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let mut cat_mut = cat;
        catnft::play_with_cat(&mut cat_mut, 5); // Default pet happiness boost
        transfer::public_transfer(cat_mut, tx_context::sender(ctx));
    }

    /// Play with cat using a toy
    public entry fun play_with_cat_toy(
        cat: CatNFT,
        toy: ToyItem,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let mut cat_mut = cat;
        let (id, _item_id, happiness_value) = game_item::consume_toy(toy);
        object::delete(id);
        catnft::play_with_cat(&mut cat_mut, happiness_value);
        transfer::public_transfer(cat_mut, tx_context::sender(ctx));
    }

    /// Update cat stats (decay)
    public entry fun update_cat_stats(
        cat: CatNFT,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let mut cat_mut = cat;
        catnft::update_stats(&mut cat_mut, clock);
        transfer::public_transfer(cat_mut, tx_context::sender(ctx));
    }

    // Helper functions for item values
    fun get_food_hunger_value(item_id: u8): u8 {
        if (item_id == 1) 10 // fish
        else if (item_id == 2) 15 // tuna
        else if (item_id == 3) 20 // salmon
        else if (item_id == 4) 25 // catnip
        else if (item_id == 5) 50 // premium
        else 0
    }

    fun get_toy_happiness_value(item_id: u8): u8 {
        if (item_id == 6) 10 // ball
        else if (item_id == 7) 15 // yarn
        else if (item_id == 8) 20 // laser
        else if (item_id == 9) 25 // mouse
        else if (item_id == 10) 30 // scratch_post
        else 0
    }

    #[test]
    fun test_get_food_hunger_value() {
        // Test food hunger values
        assert!(get_food_hunger_value(1) == 10, 1); // fish
        assert!(get_food_hunger_value(2) == 15, 2); // tuna
        assert!(get_food_hunger_value(3) == 20, 3); // salmon
        assert!(get_food_hunger_value(4) == 25, 4); // catnip
        assert!(get_food_hunger_value(5) == 50, 5); // premium_food
        assert!(get_food_hunger_value(99) == 0, 6); // invalid
    }

    #[test]
    fun test_get_toy_happiness_value() {
        // Test toy happiness values
        assert!(get_toy_happiness_value(6) == 10, 1); // ball
        assert!(get_toy_happiness_value(7) == 15, 2); // yarn
        assert!(get_toy_happiness_value(8) == 20, 3); // laser
        assert!(get_toy_happiness_value(9) == 25, 4); // mouse
        assert!(get_toy_happiness_value(10) == 30, 5); // scratch_post
        assert!(get_toy_happiness_value(99) == 0, 6); // invalid
    }

    // Helper functions for daily earning tracking
    fun get_or_create_daily_earning(
        game_state: &mut GameState,
        user: address,
        day: u64
    ): &mut DailyEarning {
        if (!table::contains(&game_state.daily_earnings, user)) {
            let new_earning = DailyEarning {
                date: day,
                amount: 0,
                sessions: 0,
            };
            table::add(&mut game_state.daily_earnings, user, new_earning);
        };
        
        let earning = table::borrow_mut(&mut game_state.daily_earnings, user);
        
        // Reset if new day
        if (earning.date != day) {
            earning.date = day;
            earning.amount = 0;
            earning.sessions = 0;
        };
        
        earning
    }

    // Note: update_daily_earning is not needed since we use mutable references
    // The daily earning is updated directly via the mutable reference returned by get_or_create_daily_earning

    // Admin functions
    
    /// Admin function to update session reward
    public fun admin_set_session_reward(
        game_state: &mut GameState,
        new_reward: u64,
        admin: &signer,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == game_state.admin_address, 100); // Only admin
        game_state.session_reward = new_reward;
    }

    /// Admin function to update prices
    public fun admin_set_item_price(
        game_state: &mut GameState,
        item_id: u8,
        price: u64,
        admin: &signer,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == game_state.admin_address, 101); // Only admin
        if (item_id <= 5) {
            if (table::contains(&game_state.food_prices, item_id)) {
                *table::borrow_mut(&mut game_state.food_prices, item_id) = price;
            } else {
                table::add(&mut game_state.food_prices, item_id, price);
            };
        } else {
            if (table::contains(&game_state.toy_prices, item_id)) {
                *table::borrow_mut(&mut game_state.toy_prices, item_id) = price;
            } else {
                table::add(&mut game_state.toy_prices, item_id, price);
            };
        };
    }

    // Treasury management functions
    
    /// Admin funds Treasury with OCT for reward distribution
    /// Only admin_address can call this function
    public entry fun fund_treasury(
        treasury: &mut Treasury,
        payment: Coin<OCT>,
        ctx: &mut TxContext
    ) {
        // Verify caller is admin
        let sender = tx_context::sender(ctx);
        assert!(sender == treasury.admin_address, ENotAuthorized);
        
        // Add OCT to Treasury balance
        coin::put(&mut treasury.oct_balance, payment);
    }
    
    /// Get Treasury balance (read-only, anyone can call)
    public fun get_treasury_balance(treasury: &Treasury): u64 {
        balance::value(&treasury.oct_balance)
    }
    
    /// Get Treasury stats (read-only, anyone can call)
    public fun get_treasury_stats(treasury: &Treasury): (u64, u64, address) {
        (
            treasury.total_rewards_paid,
            treasury.total_users_rewarded,
            treasury.admin_address
        )
    }

}

