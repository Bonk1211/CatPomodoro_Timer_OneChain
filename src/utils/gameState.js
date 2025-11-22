// Game state management with localStorage persistence

const STORAGE_KEY = 'pixelCatPomodoroGameState'

const DEFAULT_STATE = {
  coins: 0,
  inventory: {
    foods: {}, // { itemId: quantity }
    toys: {}, // { itemId: quantity }
    cats: ['default'] // Start with default cat
  },
  catTokenIds: {}, // { catId: tokenId }
  selectedCat: 'default',
  completedSessions: 0,
  roomItems: [], // Items placed in the room: [{ type: 'food'|'toy', id: 'itemId', position: {x, y} }]
  catStats: {
    hunger: 50, // 0-100 (0 = full, 100 = starving)
    happiness: 50, // 0-100 (0 = unhappy, 100 = very happy)
    isAlive: true, // Cat alive/dead status
    lastFedTime: Date.now(), // Timestamp of last feeding
    daysWithoutFeeding: 0 // Days without feeding (for death check)
  }
}

export const getGameState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const state = JSON.parse(stored)
      // Migrate old state format (arrays) to new format (objects)
      if (Array.isArray(state.inventory?.foods)) {
        const foodsObj = {}
        state.inventory.foods.forEach(foodId => {
          foodsObj[foodId] = (foodsObj[foodId] || 0) + 1
        })
        state.inventory.foods = foodsObj
      }
      if (Array.isArray(state.inventory?.toys)) {
        const toysObj = {}
        state.inventory.toys.forEach(toyId => {
          toysObj[toyId] = (toysObj[toyId] || 0) + 1
        })
        state.inventory.toys = toysObj
      }
      // Ensure roomItems exists
      if (!state.roomItems) {
        state.roomItems = []
      }
      // Ensure inventory structure exists
      if (!state.inventory) {
        state.inventory = DEFAULT_STATE.inventory
      }
      if (!state.inventory.foods) {
        state.inventory.foods = {}
      }
      if (!state.inventory.toys) {
        state.inventory.toys = {}
      }
      // Ensure catStats exists
      if (!state.catStats) {
        state.catStats = DEFAULT_STATE.catStats
      }
      // Ensure isAlive exists
      if (state.catStats.isAlive === undefined) {
        state.catStats.isAlive = true
      }
      // Ensure lastFedTime exists
      if (!state.catStats.lastFedTime) {
        state.catStats.lastFedTime = Date.now()
      }
      // Ensure daysWithoutFeeding exists
      if (state.catStats.daysWithoutFeeding === undefined) {
        state.catStats.daysWithoutFeeding = 0
      }

      if (!state.catTokenIds) {
        state.catTokenIds = {}
      }
      // Defer save to avoid blocking - only save if migration actually happened
      const needsSave = Array.isArray(state.inventory?.foods) || 
                       Array.isArray(state.inventory?.toys) ||
                       !state.roomItems ||
                       !state.inventory ||
                       !state.catStats ||
                       !state.catTokenIds
      if (needsSave) {
        // Defer save to next tick to avoid blocking UI
        setTimeout(() => saveGameState(state), 0)
      }
      return state
    }
  } catch (error) {
    console.error('Error loading game state:', error)
  }
  return DEFAULT_STATE
}

export const saveGameState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Error saving game state:', error)
  }
}

export const addCoins = (amount) => {
  const state = getGameState()
  state.coins += amount
  saveGameState(state)
  return state.coins
}

export const spendCoins = (amount) => {
  const state = getGameState()
  if (state.coins >= amount) {
    state.coins -= amount
    saveGameState(state)
    return true
  }
  return false
}

export const addToInventory = (type, itemId) => {
  const state = getGameState()
  if (type === 'cats') {
    // Cats are still stored as array
    if (!state.inventory.cats) {
      state.inventory.cats = ['default']
    }
    if (!state.inventory.cats.includes(itemId)) {
      state.inventory.cats.push(itemId)
      saveGameState(state)
    }
  } else {
    // Food and toys use quantity system
    if (!state.inventory[type]) {
      state.inventory[type] = {}
    }
    if (!state.inventory[type][itemId]) {
      state.inventory[type][itemId] = 0
    }
    state.inventory[type][itemId] += 1
    saveGameState(state)
  }
}

export const removeFromInventory = (type, itemId) => {
  const state = getGameState()
  if (state.inventory[type][itemId] && state.inventory[type][itemId] > 0) {
    state.inventory[type][itemId] -= 1
    if (state.inventory[type][itemId] === 0) {
      delete state.inventory[type][itemId]
    }
    saveGameState(state)
    return true
  }
  return false
}

export const getItemQuantity = (type, itemId) => {
  const state = getGameState()
  return state.inventory[type][itemId] || 0
}

export const addRoomItem = (type, itemId, position, dropHeight = 0) => {
  const state = getGameState()
  const newItem = {
    id: `${type}-${itemId}-${Date.now()}`,
    type,
    itemId,
    position,
    physics: {
      velocityY: 0, // Vertical velocity
      isFalling: type === 'toys' && dropHeight > 0, // Only toys have physics
      bounceCount: 0,
      dropHeight: dropHeight
    }
  }
  state.roomItems.push(newItem)
  saveGameState(state)
  return newItem
}

export const removeRoomItem = (itemId) => {
  const state = getGameState()
  state.roomItems = state.roomItems.filter(item => item.id !== itemId)
  saveGameState(state)
}

export const updateRoomItemPosition = (itemId, position) => {
  const state = getGameState()
  const item = state.roomItems.find(item => item.id === itemId)
  if (item) {
    item.position = position
    saveGameState(state)
  }
}

export const selectCat = (catId) => {
  const state = getGameState()
  if (state.inventory.cats.includes(catId)) {
    state.selectedCat = catId
    saveGameState(state)
  }
}

/**
 * Select cat by tokenId (for NFT cats)
 * Finds the catId associated with the tokenId and selects it
 */
export const selectCatByTokenId = (tokenId) => {
  const state = getGameState()
  // Find catId that has this tokenId
  for (const [catId, storedTokenId] of Object.entries(state.catTokenIds || {})) {
    if (storedTokenId && storedTokenId.toString() === tokenId.toString()) {
      if (state.inventory.cats.includes(catId)) {
        state.selectedCat = catId
        saveGameState(state)
        return catId
      }
    }
  }
  return null
}

export const setCatTokenId = (catId, tokenId) => {
  const state = getGameState()
  if (!state.catTokenIds) {
    state.catTokenIds = {}
  }
  state.catTokenIds[catId] = tokenId
  saveGameState(state)
}

export const getCatTokenId = (catId) => {
  const state = getGameState()
  return state.catTokenIds?.[catId] || null
}

export const getAllCatTokenIds = () => {
  const state = getGameState()
  return state.catTokenIds || {}
}

export const incrementCompletedSessions = () => {
  const state = getGameState()
  state.completedSessions += 1
  saveGameState(state)
  return state.completedSessions
}

export const feedCat = (foodValue = 20) => {
  const state = getGameState()
  if (!state.catStats) {
    state.catStats = DEFAULT_STATE.catStats
  }
  // Only feed if cat is alive
  if (!state.catStats.isAlive) {
    return state.catStats
  }
  // Feeding reduces hunger (catStats.hunger decreases)
  state.catStats.hunger = Math.max(0, state.catStats.hunger - foodValue)
  state.catStats.happiness = Math.min(100, state.catStats.happiness + Math.floor(foodValue / 2))
  // Reset days without feeding when fed
  state.catStats.lastFedTime = Date.now()
  state.catStats.daysWithoutFeeding = 0
  saveGameState(state)
  return state.catStats
}

export const checkCatDeath = () => {
  const state = getGameState()
  if (!state.catStats || !state.catStats.isAlive) {
    return state.catStats
  }
  
  // Calculate days without feeding
  const now = Date.now()
  const lastFed = state.catStats.lastFedTime || now
  const millisecondsPerDay = 1000 * 60 * 60 * 24 // 24 hours in milliseconds
  const daysWithoutFeeding = Math.floor((now - lastFed) / millisecondsPerDay)
  state.catStats.daysWithoutFeeding = daysWithoutFeeding
  
  // Cat dies if 3 days pass without feeding
  if (daysWithoutFeeding >= 3) {
    state.catStats.isAlive = false
    // Defer save to avoid blocking UI
    setTimeout(() => saveGameState(state), 0)
  }
  
  return state.catStats
}

export const decayCatStats = () => {
  const state = getGameState()
  if (!state.catStats || !state.catStats.isAlive) {
    return state.catStats
  }
  
  // Hunger increases over time (cat gets hungrier)
  state.catStats.hunger = Math.min(100, state.catStats.hunger + 0.5) // Increase by 0.5 every decay cycle
  // Happiness decreases slowly over time, but slower when well-fed
  if (state.catStats.hunger > 70) {
    // Happiness decreases faster when hungry
    state.catStats.happiness = Math.max(0, state.catStats.happiness - 0.3)
  } else {
    // Happiness decreases slower when not hungry
    state.catStats.happiness = Math.max(0, state.catStats.happiness - 0.1)
  }
  
  // Check for death after decay (3 days without feeding)
  checkCatDeath()
  // Defer save to avoid blocking UI
  setTimeout(() => saveGameState(state), 0)
  return state.catStats
}

export const reviveCat = () => {
  const state = getGameState()
  if (state.catStats) {
    state.catStats.isAlive = true
    state.catStats.hunger = 50
    state.catStats.happiness = 50
    state.catStats.lastFedTime = Date.now()
    state.catStats.daysWithoutFeeding = 0
    saveGameState(state)
  }
  return state.catStats
}

export const playWithCat = (happinessValue = 15) => {
  const state = getGameState()
  if (!state.catStats) {
    state.catStats = DEFAULT_STATE.catStats
  }
  state.catStats.happiness = Math.min(100, state.catStats.happiness + happinessValue)
  saveGameState(state)
  return state.catStats
}

export const getCatStats = () => {
  const state = getGameState()
  return state.catStats || DEFAULT_STATE.catStats
}

