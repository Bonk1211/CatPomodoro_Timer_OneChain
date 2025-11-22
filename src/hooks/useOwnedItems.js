import { useEffect } from 'react'
import { useSuiClientQuery, useCurrentAccount } from '@onelabs/dapp-kit'
import { ONECHAIN_OBJECT_IDS } from '../utils/onechainBlockchainUtils'

/**
 * Hook to fetch user's owned FoodItem and ToyItem objects from blockchain
 */
export function useOwnedItems() {
  const account = useCurrentAccount()
  const address = account?.address

  // Fetch FoodItem objects
  const { data: foodItems, isLoading: loadingFood, refetch: refetchFood } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: address,
      filter: {
        StructType: `${ONECHAIN_OBJECT_IDS.gamePackageId}::game_item::FoodItem`,
      },
      options: {
        showContent: true,
        showType: true,
      },
    },
    {
      enabled: !!address,
      refetchInterval: 5000, // Refetch every 5 seconds
      gcTime: 0, // Don't cache - always fresh data
    }
  )

  // Fetch ToyItem objects
  const { data: toyItems, isLoading: loadingToys, refetch: refetchToys } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: address,
      filter: {
        StructType: `${ONECHAIN_OBJECT_IDS.gamePackageId}::game_item::ToyItem`,
      },
      options: {
        showContent: true,
        showType: true,
      },
    },
    {
      enabled: !!address,
      refetchInterval: 5000, // Refetch every 5 seconds
      gcTime: 0, // Don't cache
    }
  )
  
  // Listen for inventory update events (AFTER both refetch functions are defined)
  useEffect(() => {
    const handleInventoryUpdate = () => {
      console.log('🔄 Inventory update event received, refetching...')
      refetchFood()
      refetchToys()
    }
    
    window.addEventListener('inventoryUpdate', handleInventoryUpdate)
    return () => window.removeEventListener('inventoryUpdate', handleInventoryUpdate)
  }, [refetchFood, refetchToys])

  // Process food items to group by item_id
  const foodInventory = {}
  if (foodItems?.data) {
    foodItems.data.forEach((obj) => {
      if (obj.data?.content?.fields) {
        const itemId = obj.data.content.fields.item_id
        const objectId = obj.data.objectId
        
        if (!foodInventory[itemId]) {
          foodInventory[itemId] = {
            count: 0,
            objects: []
          }
        }
        foodInventory[itemId].count++
        foodInventory[itemId].objects.push({
          objectId,
          itemId,
          hungerValue: obj.data.content.fields.hunger_value,
          version: obj.data.version,
          digest: obj.data.digest,
        })
      }
    })
  }

  // Process toy items to group by item_id
  const toyInventory = {}
  if (toyItems?.data) {
    toyItems.data.forEach((obj) => {
      if (obj.data?.content?.fields) {
        const itemId = obj.data.content.fields.item_id
        const objectId = obj.data.objectId
        
        if (!toyInventory[itemId]) {
          toyInventory[itemId] = {
            count: 0,
            objects: []
          }
        }
        toyInventory[itemId].count++
        toyInventory[itemId].objects.push({
          objectId,
          itemId,
          happinessValue: obj.data.content.fields.happiness_value,
          version: obj.data.version,
          digest: obj.data.digest,
        })
      }
    })
  }

  return {
    foodItems: foodInventory,
    toyItems: toyInventory,
    isLoading: loadingFood || loadingToys,
    refetch: () => {
      refetchFood()
      refetchToys()
    },
    rawFood: foodItems?.data || [],
    rawToys: toyItems?.data || [],
  }
}

