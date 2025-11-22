// Item ID Mapping - Bridge between frontend string IDs and blockchain numeric IDs
// This ensures consistency between the frontend data and smart contract item IDs

// ============================================================================
// FOOD ITEMS MAPPING (ItemId 1-5)
// ============================================================================
export const FOOD_ID_MAP = {
  'fish': 1,
  'tuna': 2,
  'salmon': 3,
  'catnip': 4,
  'premium_food': 5
};

// ============================================================================
// TOY ITEMS MAPPING (ItemId 6-10)
// ============================================================================
export const TOY_ID_MAP = {
  'ball': 6,
  'yarn': 7,
  'laser': 8,
  'mouse': 9,
  'scratch_post': 10
};

// ============================================================================
// CAT SPECIES MAPPING (CatTypeId 0-3)
// ============================================================================
export const CAT_TYPE_MAP = {
  'default': 0,
  'black': 1,
  'white': 2,
  'calico': 3
};

// ============================================================================
// COMBINED ITEM MAPPING (All items)
// ============================================================================
export const ITEM_ID_MAP = {
  ...FOOD_ID_MAP,
  ...TOY_ID_MAP
};

// ============================================================================
// REVERSE MAPPINGS (Numeric ID → String ID)
// ============================================================================
export const REVERSE_FOOD_MAP = Object.fromEntries(
  Object.entries(FOOD_ID_MAP).map(([key, value]) => [value, key])
);

export const REVERSE_TOY_MAP = Object.fromEntries(
  Object.entries(TOY_ID_MAP).map(([key, value]) => [value, key])
);

export const REVERSE_CAT_MAP = Object.fromEntries(
  Object.entries(CAT_TYPE_MAP).map(([key, value]) => [value, key])
);

export const REVERSE_ITEM_MAP = Object.fromEntries(
  Object.entries(ITEM_ID_MAP).map(([key, value]) => [value, key])
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert frontend string ID to blockchain numeric ID
 * @param {string} stringId - Frontend item ID (e.g., 'fish', 'ball', 'black')
 * @returns {number|null} Blockchain numeric ID or null if not found
 */
export const getItemId = (stringId) => {
  // Try food/toy items first
  if (ITEM_ID_MAP[stringId] !== undefined) {
    return ITEM_ID_MAP[stringId];
  }
  
  // Try cat types
  if (CAT_TYPE_MAP[stringId] !== undefined) {
    return CAT_TYPE_MAP[stringId];
  }
  
  console.warn(`Unknown item string ID: ${stringId}`);
  return null;
};

/**
 * Convert blockchain numeric ID to frontend string ID
 * @param {number} numericId - Blockchain item ID
 * @returns {string|null} Frontend string ID or null if not found
 */
export const getStringId = (numericId) => {
  // Try food/toy items first (1-10)
  if (REVERSE_ITEM_MAP[numericId] !== undefined) {
    return REVERSE_ITEM_MAP[numericId];
  }
  
  // Try cat types (0-3)
  if (REVERSE_CAT_MAP[numericId] !== undefined) {
    return REVERSE_CAT_MAP[numericId];
  }
  
  console.warn(`Unknown item numeric ID: ${numericId}`);
  return null;
};

/**
 * Get food item numeric ID
 * @param {string} foodId - Frontend food ID (e.g., 'fish')
 * @returns {number|null} Blockchain food item ID (1-5) or null
 */
export const getFoodId = (foodId) => {
  return FOOD_ID_MAP[foodId] ?? null;
};

/**
 * Get toy item numeric ID
 * @param {string} toyId - Frontend toy ID (e.g., 'ball')
 * @returns {number|null} Blockchain toy item ID (6-10) or null
 */
export const getToyId = (toyId) => {
  return TOY_ID_MAP[toyId] ?? null;
};

/**
 * Get cat type numeric ID
 * @param {string} catId - Frontend cat ID (e.g., 'black')
 * @returns {number|null} Blockchain cat type ID (0-3) or null
 */
export const getCatTypeId = (catId) => {
  return CAT_TYPE_MAP[catId] ?? null;
};

/**
 * Check if string ID is a food item
 * @param {string} stringId - Frontend item ID
 * @returns {boolean} True if food item
 */
export const isFoodItem = (stringId) => {
  return FOOD_ID_MAP[stringId] !== undefined;
};

/**
 * Check if string ID is a toy item
 * @param {string} stringId - Frontend item ID
 * @returns {boolean} True if toy item
 */
export const isToyItem = (stringId) => {
  return TOY_ID_MAP[stringId] !== undefined;
};

/**
 * Check if string ID is a cat type
 * @param {string} stringId - Frontend cat ID
 * @returns {boolean} True if cat type
 */
export const isCatType = (stringId) => {
  return CAT_TYPE_MAP[stringId] !== undefined;
};

/**
 * Check if numeric ID is a food item (1-5)
 * @param {number} numericId - Blockchain item ID
 * @returns {boolean} True if food item
 */
export const isFoodItemNumeric = (numericId) => {
  return numericId >= 1 && numericId <= 5;
};

/**
 * Check if numeric ID is a toy item (6-10)
 * @param {number} numericId - Blockchain item ID
 * @returns {boolean} True if toy item
 */
export const isToyItemNumeric = (numericId) => {
  return numericId >= 6 && numericId <= 10;
};

/**
 * Check if numeric ID is a cat type (0-3)
 * @param {number} numericId - Blockchain cat type ID
 * @returns {boolean} True if cat type
 */
export const isCatTypeNumeric = (numericId) => {
  return numericId >= 0 && numericId <= 3;
};

/**
 * Get all food string IDs
 * @returns {string[]} Array of food string IDs
 */
export const getAllFoodIds = () => {
  return Object.keys(FOOD_ID_MAP);
};

/**
 * Get all toy string IDs
 * @returns {string[]} Array of toy string IDs
 */
export const getAllToyIds = () => {
  return Object.keys(TOY_ID_MAP);
};

/**
 * Get all cat type string IDs
 * @returns {string[]} Array of cat type string IDs
 */
export const getAllCatTypeIds = () => {
  return Object.keys(CAT_TYPE_MAP);
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that a string ID exists in the mapping
 * @param {string} stringId - Frontend item/cat ID
 * @returns {boolean} True if valid
 */
export const isValidStringId = (stringId) => {
  return getItemId(stringId) !== null;
};

/**
 * Validate that a numeric ID exists in the mapping
 * @param {number} numericId - Blockchain item/cat ID
 * @returns {boolean} True if valid
 */
export const isValidNumericId = (numericId) => {
  return getStringId(numericId) !== null;
};

// ============================================================================
// EXPORTS SUMMARY
// ============================================================================
// Constants: FOOD_ID_MAP, TOY_ID_MAP, CAT_TYPE_MAP, ITEM_ID_MAP
// Reverse Maps: REVERSE_FOOD_MAP, REVERSE_TOY_MAP, REVERSE_CAT_MAP, REVERSE_ITEM_MAP
// Core Functions: getItemId(stringId), getStringId(numericId)
// Specific Getters: getFoodId, getToyId, getCatTypeId
// Type Checkers: isFoodItem, isToyItem, isCatType, isFoodItemNumeric, isToyItemNumeric, isCatTypeNumeric
// List Getters: getAllFoodIds, getAllToyIds, getAllCatTypeIds
// Validators: isValidStringId, isValidNumericId

