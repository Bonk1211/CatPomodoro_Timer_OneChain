# Item ID Mapping Reference

This document explains the mapping between frontend string IDs and blockchain numeric IDs.

## Food Items (ItemId 1-5)

| Frontend ID    | Blockchain ID | Item Name     | Price |
|----------------|---------------|---------------|-------|
| `fish`         | 1             | Fish          | 5 CAT |
| `tuna`         | 2             | Tuna          | 10 CAT|
| `salmon`       | 3             | Salmon        | 15 CAT|
| `catnip`       | 4             | Catnip        | 20 CAT|
| `premium_food` | 5             | Premium Food  | 30 CAT|

## Toy Items (ItemId 6-10)

| Frontend ID     | Blockchain ID | Item Name       | Price |
|-----------------|---------------|-----------------|-------|
| `ball`          | 6             | Ball            | 8 CAT |
| `yarn`          | 7             | Yarn Ball       | 12 CAT|
| `laser`         | 8             | Laser Pointer   | 15 CAT|
| `mouse`         | 9             | Toy Mouse       | 20 CAT|
| `scratch_post`  | 10            | Scratch Post    | 35 CAT|

## Cat Types (CatTypeId 0-3)

| Frontend ID | Blockchain ID | Cat Name      | Price  |
|-------------|---------------|---------------|--------|
| `default`   | 0             | Orange Tabby  | 0 CAT  |
| `black`     | 1             | Black Cat     | 50 CAT |
| `white`     | 2             | White Cat     | 75 CAT |
| `calico`    | 3             | Calico Cat    | 150 CAT|

## Usage Examples

### Convert String to Numeric ID

```javascript
import { getItemId, getFoodId, getToyId, getCatTypeId } from './itemMapping.js';

// General conversion
const fishId = getItemId('fish'); // Returns 1
const ballId = getItemId('ball'); // Returns 6
const blackCatId = getItemId('black'); // Returns 1

// Specific type conversions
const tunaId = getFoodId('tuna'); // Returns 2
const yarnId = getToyId('yarn'); // Returns 7
const calicoId = getCatTypeId('calico'); // Returns 3
```

### Convert Numeric to String ID

```javascript
import { getStringId } from './itemMapping.js';

const stringId1 = getStringId(1); // Returns 'fish'
const stringId6 = getStringId(6); // Returns 'ball'
const stringId0 = getStringId(0); // Returns 'default'
```

### Type Checking

```javascript
import { isFoodItem, isToyItem, isCatType } from './itemMapping.js';

isFoodItem('fish'); // true
isToyItem('ball'); // true
isCatType('black'); // true
isFoodItem('ball'); // false
```

### Validation

```javascript
import { isValidStringId, isValidNumericId } from './itemMapping.js';

isValidStringId('fish'); // true
isValidStringId('invalid'); // false (prints warning)
isValidNumericId(1); // true
isValidNumericId(999); // false (prints warning)
```

## Integration with Smart Contracts

When calling smart contract functions, always convert frontend IDs to numeric IDs:

```javascript
import { getItemId } from './utils/itemMapping.js';
import { purchaseItemOnChain } from './utils/blockchainGameState.js';

// Frontend code
const itemId = 'fish';
const amount = 5;

// Convert to blockchain ID before calling contract
const numericItemId = getItemId(itemId); // 1
await purchaseItemOnChain(numericItemId, amount);
```

## Notes

- **Food items**: IDs 1-5
- **Toy items**: IDs 6-10
- **Cat types**: IDs 0-3
- Always validate IDs before sending to blockchain
- The mapping ensures consistency between frontend and smart contracts
- Invalid IDs return `null` and log a warning to console
