import { useState, useEffect } from 'react'
import { useOwnedItems } from '../hooks/useOwnedItems'
import { getGameState } from '../utils/gameState'
import { FOOD_ITEMS, TOY_ITEMS } from '../data/shopItems'
import '../styles/Inventory.css'

function Inventory({ onItemDrag }) {
  const [activeTab, setActiveTab] = useState('food') // 'food' or 'toys'
  const [draggedItem, setDraggedItem] = useState(null)
  const [localFoods, setLocalFoods] = useState({})
  
  // Fetch toys from blockchain (toys are on-chain NFTs)
  const { toyItems, isLoading } = useOwnedItems()
  
  // Load food from localStorage (food is off-chain)
  useEffect(() => {
    const loadLocalFoods = () => {
      const gameState = getGameState()
      setLocalFoods(gameState.inventory?.foods || {})
    }
    
    loadLocalFoods()
    
    // Listen for inventory updates
    window.addEventListener('gameStateUpdate', loadLocalFoods)
    window.addEventListener('inventoryUpdate', loadLocalFoods)
    
    return () => {
      window.removeEventListener('gameStateUpdate', loadLocalFoods)
      window.removeEventListener('inventoryUpdate', loadLocalFoods)
    }
  }, [])

  const handleDragStart = (e, type, itemId) => {
    // Food is not draggable (off-chain), only toys are draggable (on-chain NFTs)
    const inventory = toyItems
    const itemIdMap = {
      'ball': 6, 'yarn': 7, 'laser': 8, 'mouse': 9, 'scratch_post': 10
    }
    const numericId = itemIdMap[itemId]
    const quantity = inventory[numericId]?.count || 0
    
    if (quantity > 0) {
      const item = { type, itemId }
      setDraggedItem(item)
      if (onItemDrag) {
        onItemDrag(item)
      }
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', '') // Required for some browsers
    } else {
      e.preventDefault()
    }
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    if (onItemDrag) {
      onItemDrag(null)
    }
  }

  const getItems = (type) => {
    if (type === 'food') {
      // Food is off-chain (localStorage)
      return FOOD_ITEMS
        .map(item => ({
          ...item,
          quantity: localFoods[item.id] || 0
        }))
        .filter(item => item.quantity > 0)
    } else {
      // Toys are on-chain (blockchain NFTs)
      const itemIdMap = {
        'ball': 6, 'yarn': 7, 'laser': 8, 'mouse': 9, 'scratch_post': 10
      }
      
      return TOY_ITEMS
        .map(item => {
          const numericId = itemIdMap[item.id]
          const count = toyItems[numericId]?.count || 0
          return {
            ...item,
            quantity: count,
            numericId
          }
        })
        .filter(item => item.quantity > 0)
    }
  }

  const renderInventoryItems = (type) => {
    if (isLoading) {
      return (
        <div className="inventory-empty">
          Loading inventory...
        </div>
      )
    }
    
    const items = getItems(type)
    
    if (items.length === 0) {
      return (
        <div className="inventory-empty">
          No {type === 'food' ? 'food' : 'toys'} in inventory
        </div>
      )
    }

    return items.map((item) => {
      const isDragging = draggedItem && draggedItem.type === type && draggedItem.itemId === item.id
      
      return (
        <div
          key={item.id}
          className={`inventory-item ${isDragging ? 'dragging' : ''} ${type === 'food' ? 'no-drag' : ''}`}
          draggable={type === 'toys' && item.quantity > 0}
          onDragStart={type === 'toys' ? (e) => handleDragStart(e, type, item.id) : undefined}
          onDragEnd={type === 'toys' ? handleDragEnd : undefined}
        >
          {(type === 'food' || type === 'toys') && item.image ? (
            <div className="inventory-item-image">
              <img 
                src={item.image} 
                alt={item.name}
                className="inventory-item-img"
              />
            </div>
          ) : (
            <div className="inventory-item-emoji">{item.emoji}</div>
          )}
          <div className="inventory-item-info">
            <div className="inventory-item-name">{item.name}</div>
            <div className="inventory-item-quantity">x{item.quantity}</div>
          </div>
        </div>
      )
    })
  }

  return (
    <div className="inventory-panel">
      <div className="inventory-header">
        <h3 className="inventory-title">📦 Inventory</h3>
      </div>
      
      <div className="inventory-tabs">
        <button 
          className={`inventory-tab ${activeTab === 'food' ? 'active' : ''}`}
          onClick={() => setActiveTab('food')}
        >
          Food
        </button>
        <button 
          className={`inventory-tab ${activeTab === 'toys' ? 'active' : ''}`}
          onClick={() => setActiveTab('toys')}
        >
          Toys
        </button>
      </div>

      <div className="inventory-content">
        {activeTab === 'food' && (
          <div className="inventory-items-grid">
            {renderInventoryItems('food')}
          </div>
        )}
        {activeTab === 'toys' && (
          <div className="inventory-items-grid">
            {renderInventoryItems('toys')}
          </div>
        )}
      </div>
      
      <div className="inventory-hint">
        {activeTab === 'food' 
          ? 'Use the FEED button to feed your cat!' 
          : 'Drag toys to the room for your cat to play!'}
      </div>
    </div>
  )
}

export default Inventory

