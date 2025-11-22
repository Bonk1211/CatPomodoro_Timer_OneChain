/// OCT Coin Module
/// References the built-in OCT token from OneChain core system modules
/// 
/// OCT is a core OneChain coin (like SUI is for Sui), located at 0x2::oct::OCT
/// This is part of the system package, not a user-deployed package
/// 
/// Note: OCT is imported directly in pomodoro_game.move from 0x2::oct::OCT
/// This module is kept for potential future helper functions
module pomodoro_game::octcoin {
    use one::coin::{Self, Coin};
    use one::balance::{Self, Balance};
    use 0x2::oct::OCT;
    
    /// Helper function to work with OCT coins
    /// This will be used by the game module
    public fun into_balance(coin: Coin<OCT>): Balance<OCT> {
        coin::into_balance(coin)
    }
}

