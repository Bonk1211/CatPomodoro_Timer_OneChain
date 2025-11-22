/// Game Item Module
/// Implements food and toy items for the Pomodoro game
module pomodoro_game::game_item {
    use one::object::{Self, UID};
    use one::transfer;
    use one::tx_context::{Self, TxContext};

    /// Food item object
    public struct FoodItem has key, store {
        id: UID,
        item_id: u8, // 1=fish, 2=tuna, 3=salmon, 4=catnip, 5=premium_food
        hunger_value: u8, // How much hunger this reduces
    }

    /// Toy item object
    public struct ToyItem has key, store {
        id: UID,
        item_id: u8, // 6=ball, 7=yarn, 8=laser, 9=mouse, 10=scratch_post
        happiness_value: u8, // How much happiness this increases
    }

    /// Mint food item
    public fun mint_food(
        item_id: u8,
        hunger_value: u8,
        recipient: address,
        ctx: &mut TxContext
    ): FoodItem {
        FoodItem {
            id: object::new(ctx),
            item_id,
            hunger_value,
        }
    }

    /// Mint toy item
    public fun mint_toy(
        item_id: u8,
        happiness_value: u8,
        recipient: address,
        ctx: &mut TxContext
    ): ToyItem {
        ToyItem {
            id: object::new(ctx),
            item_id,
            happiness_value,
        }
    }

    /// Transfer food item
    public fun transfer_food(food: FoodItem, recipient: address) {
        transfer::transfer(food, recipient);
    }

    /// Transfer toy item
    public fun transfer_toy(toy: ToyItem, recipient: address) {
        transfer::transfer(toy, recipient);
    }

    /// Extract food item fields (for consumption)
    public fun consume_food(food: FoodItem): (UID, u8, u8) {
        let FoodItem { id, item_id, hunger_value } = food;
        (id, item_id, hunger_value)
    }

    /// Extract toy item fields (for consumption)
    public fun consume_toy(toy: ToyItem): (UID, u8, u8) {
        let ToyItem { id, item_id, happiness_value } = toy;
        (id, item_id, happiness_value)
    }

    #[test]
    fun test_mint_food() {
        let mut ctx = tx_context::dummy();
        let dummy_address = @0xCAFE;
        
        // Mint a food item
        let food = mint_food(1, 20, dummy_address, &mut ctx);
        
        // Check food properties
        let (id, item_id, hunger_value) = consume_food(food);
        assert!(item_id == 1, 1);
        assert!(hunger_value == 20, 2);
        
        // Clean up (id is consumed in consume_food)
        object::delete(id);
    }

    #[test]
    fun test_mint_toy() {
        let mut ctx = tx_context::dummy();
        let dummy_address = @0xCAFE;
        
        // Mint a toy item
        let toy = mint_toy(6, 15, dummy_address, &mut ctx);
        
        // Check toy properties
        let (id, item_id, happiness_value) = consume_toy(toy);
        assert!(item_id == 6, 1);
        assert!(happiness_value == 15, 2);
        
        // Clean up (id is consumed in consume_toy)
        object::delete(id);
    }
}

