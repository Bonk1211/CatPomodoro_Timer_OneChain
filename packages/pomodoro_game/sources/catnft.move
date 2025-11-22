/// Cat NFT Module
/// Implements Cat NFTs with stats (hunger, happiness, health)
module pomodoro_game::catnft {
    use one::object::{Self, UID};
    use one::transfer;
    use one::tx_context::{Self, TxContext};
    use one::clock::{Self, Clock};

    /// Cat NFT object
    public struct CatNFT has key, store {
        id: UID,
        cat_type: u8,
        hunger: u8,
        happiness: u8,
        health: u8,
        is_alive: bool,
        last_fed_time: u64,
        days_without_feeding: u8,
    }

    /// Mint a new Cat NFT
    public fun mint(
        cat_type: u8,
        _recipient: address,
        ctx: &mut TxContext
    ): CatNFT {
        CatNFT {
            id: object::new(ctx),
            cat_type,
            hunger: 50,
            happiness: 50,
            health: 100,
            is_alive: true,
            last_fed_time: 0,
            days_without_feeding: 0,
        }
    }

    /// Transfer Cat NFT to recipient
    public fun transfer(cat: CatNFT, recipient: address) {
        transfer::public_transfer(cat, recipient);
    }

    /// Get cat stats (view function)
    public fun get_stats(cat: &CatNFT): (u8, u8, u8, bool) {
        (cat.hunger, cat.happiness, cat.health, cat.is_alive)
    }

    /// Feed the cat (reduces hunger)
    public fun feed_cat(cat: &mut CatNFT, food_value: u8, clock: &Clock) {
        if (cat.hunger >= food_value) {
            cat.hunger = cat.hunger - food_value;
        } else {
            cat.hunger = 0;
        };
        cat.last_fed_time = clock::timestamp_ms(clock); // Store timestamp in milliseconds
        cat.days_without_feeding = 0;
    }

    /// Play with cat (increases happiness)
    public fun play_with_cat(cat: &mut CatNFT, happiness_boost: u8) {
        if (cat.happiness + happiness_boost <= 100) {
            cat.happiness = cat.happiness + happiness_boost;
        } else {
            cat.happiness = 100;
        };
    }

    /// Update cat stats (decay over time)
    public fun update_stats(cat: &mut CatNFT, clock: &Clock) {
        let current_time_ms = clock::timestamp_ms(clock);
        let last_fed_time_ms = cat.last_fed_time;
        // Calculate days passed (86400000 ms = 1 day)
        let days_passed_ms = if (current_time_ms > last_fed_time_ms) {
            current_time_ms - last_fed_time_ms
        } else {
            0
        };
        let days_passed = days_passed_ms / 86400000; // milliseconds in a day
        
        let days_without_feeding_u64 = (cat.days_without_feeding as u64);
        if (days_passed > days_without_feeding_u64) {
            let days_passed_u8 = (days_passed as u8);
            cat.days_without_feeding = days_passed_u8;
        };
        
        // Increase hunger over time
        if (cat.hunger < 100) {
            cat.hunger = cat.hunger + 1;
        };
        
        // Decrease happiness over time
        if (cat.happiness > 0) {
            cat.happiness = cat.happiness - 1;
        };
        
        // Health starts dropping when hunger > 70
        if (cat.hunger > 70) {
            if (cat.health > 0) {
                cat.health = cat.health - 1;
            };
        };
        
        // Cat dies if hunger = 100 and happiness = 0, or 3 days without feeding
        if ((cat.hunger >= 100 && cat.happiness == 0) || cat.days_without_feeding >= 3) {
            cat.is_alive = false;
            cat.health = 0;
        };
    }

    #[test]
    fun test_mint_cat() {
        let mut ctx = tx_context::dummy();
        let dummy_address = @0xCAFE;
        
        // Mint a cat NFT
        let cat = mint(1, dummy_address, &mut ctx);
        
        // Check initial stats
        let (hunger, happiness, health, is_alive) = get_stats(&cat);
        assert!(hunger == 50, 1);
        assert!(happiness == 50, 2);
        assert!(health == 100, 3);
        assert!(is_alive == true, 4);
        assert!(cat.cat_type == 1, 5);
        
        // Transfer to clean up
        transfer::public_transfer(cat, dummy_address);
    }

    #[test]
    fun test_play_with_cat() {
        let mut ctx = tx_context::dummy();
        let dummy_address = @0xCAFE;
        
        // Mint a cat
        let mut cat = mint(1, dummy_address, &mut ctx);
        
        // Play with cat (increase happiness)
        play_with_cat(&mut cat, 10);
        
        // Check happiness increased
        let (_, happiness, _, _) = get_stats(&cat);
        assert!(happiness == 60, 1);
        
        // Play again (should cap at 100)
        play_with_cat(&mut cat, 50);
        let (_, happiness2, _, _) = get_stats(&cat);
        assert!(happiness2 == 100, 2);
        
        // Transfer to clean up
        transfer::public_transfer(cat, dummy_address);
    }
}

