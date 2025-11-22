import { useState, useEffect, useRef } from 'react'
import { useCurrentWallet } from '@onelabs/dapp-kit'
import { getGameState, addRoomItem, removeRoomItem, updateRoomItemPosition, removeFromInventory, feedCat, playWithCat, getCatStats, checkCatDeath, decayCatStats, reviveCat, getCatTokenId, selectCatByTokenId, selectCat } from '../utils/gameState'
import { FOOD_ITEMS, TOY_ITEMS, CAT_SPECIES } from '../data/shopItems'
import { feedCatOnChain, playWithCatOnChain, getCatStats as getCatStatsFromChain, updateCatStatsOnChain, getOwnedCatTokenIds, getCatTypeFromTokenId } from '../utils/blockchainGameState'
import { getFoodId, getToyId, getStringId as getCatStringId } from '../utils/itemMapping'
import { handleWalletDisconnection, isDefaultCat } from '../utils/edgeCaseHandler'
import { addTransaction, TX_TYPES } from '../utils/transactionHistory'
import Inventory from './Inventory'
import '../styles/InteractiveCat.css'

function InteractiveCat() {
  const wallet = useCurrentWallet()
  const [selectedCat, setSelectedCat] = useState('default')
  const [catMood, setCatMood] = useState('idle') // 'idle', 'happy', 'excited'
  const [catPosition, setCatPosition] = useState({ x: 50, y: 80 }) // Percentage positions (y fixed at floor level)
  const [isDragging, setIsDragging] = useState(false)
  const [wasDragging, setWasDragging] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(1)
  const [boxFrame, setBoxFrame] = useState(1)
  // Use default state initially to avoid blocking render
  const [gameState, setGameState] = useState(() => {
    try {
      return getGameState()
    } catch (error) {
      console.error('Error loading initial state:', error)
      return { inventory: { foods: {}, toys: {}, cats: ['default'] }, selectedCat: 'default', roomItems: [] }
    }
  })
  const [draggedInventoryItem, setDraggedInventoryItem] = useState(null)
  const [draggingRoomItem, setDraggingRoomItem] = useState(null)
  const [wasDraggingRoomItem, setWasDraggingRoomItem] = useState(false)
  // Use default stats initially to avoid blocking render
  const [catStats, setCatStats] = useState(() => {
    try {
      return getCatStats()
    } catch (error) {
      console.error('Error loading initial stats:', error)
      return { hunger: 50, happiness: 50, isAlive: true, lastFedTime: Date.now(), daysWithoutFeeding: 0 }
    }
  })
  const [showLoveEffect, setShowLoveEffect] = useState(false)
  const [itemPhysics, setItemPhysics] = useState({}) // Track physics state for each item
  const [showFoodSelection, setShowFoodSelection] = useState(false)
  const [isProcessingTx, setIsProcessingTx] = useState(false)
  const [txStatus, setTxStatus] = useState(null) // 'success' | 'error' | null
  const [txMessage, setTxMessage] = useState('')
  const [isSyncingStats, setIsSyncingStats] = useState(false)
  const [ownedNFTs, setOwnedNFTs] = useState([]) // [{ tokenId, catTypeId, catId }]
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false)
  const [showCatSelector, setShowCatSelector] = useState(false)

  // Load owned cat NFTs (optimized to avoid blocking)
  const loadOwnedNFTs = async () => {
    const isConnected = wallet?.isConnected
    if (!isConnected || !wallet) {
      setOwnedNFTs([])
      return
    }

    setIsLoadingNFTs(true)
    try {
      // Fetch token IDs (this can be slow, so we do it first)
      const tokenIds = await getOwnedCatTokenIds(wallet)
      
      // If no tokens, return early
      if (!tokenIds || tokenIds.length === 0) {
        setOwnedNFTs([])
        setIsLoadingNFTs(false)
        return
      }
      
      // Process NFTs in batches to avoid blocking UI
      const nftData = []
      const batchSize = 3 // Process 3 at a time
      
      for (let i = 0; i < tokenIds.length; i += batchSize) {
        const batch = tokenIds.slice(i, i + batchSize)
        
        // Process batch in parallel
        const batchPromises = batch.map(async (tokenId) => {
          try {
            const catTypeId = await getCatTypeFromTokenId(wallet, tokenId)
            const catId = getCatStringId(catTypeId) || 'default'
            
            // Find catId that has this tokenId
            const state = getGameState()
            let foundCatId = null
            for (const [storedCatId, storedTokenId] of Object.entries(state.catTokenIds || {})) {
              if (storedTokenId && storedTokenId.toString() === tokenId.toString()) {
                foundCatId = storedCatId
                break
              }
            }
            
            // Use found catId or fallback to catId from type
            const finalCatId = foundCatId || catId
            
            return {
              tokenId,
              catTypeId,
              catId: finalCatId
            }
          } catch (error) {
            console.warn(`Failed to get cat type for token ${tokenId}:`, error)
            return null
          }
        })
        
        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises)
        nftData.push(...batchResults.filter(result => result !== null))
        
        // Update state incrementally to show progress
        if (nftData.length > 0) {
          setOwnedNFTs([...nftData])
        }
        
        // Small delay between batches to prevent blocking
        if (i + batchSize < tokenIds.length) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
      
      setOwnedNFTs(nftData)
    } catch (error) {
      console.error('Failed to load owned NFTs:', error)
      setOwnedNFTs([])
    } finally {
      setIsLoadingNFTs(false)
    }
  }

  // Handle cat selection
  const handleSelectCat = (catId, tokenId = null) => {
    if (tokenId) {
      // Select by tokenId (NFT cat)
      const foundCatId = selectCatByTokenId(tokenId)
      if (foundCatId) {
        setSelectedCat(foundCatId)
        setGameState(getGameState())
        window.dispatchEvent(new CustomEvent('gameStateUpdate'))
      }
    } else {
      // Select by catId (default cat or local cat)
      selectCat(catId)
      setSelectedCat(catId)
      setGameState(getGameState())
      window.dispatchEvent(new CustomEvent('gameStateUpdate'))
    }
    setShowCatSelector(false)
  }

  // Sync cat stats from blockchain
  const syncCatStatsFromBlockchain = async () => {
    const state = getGameState()
    const isConnected = wallet?.isConnected
    const catTokenId = getCatTokenId(state.selectedCat)
    
    // Only sync if wallet connected and cat has tokenId (is minted NFT)
    // Default cat (not minted) uses localStorage only
    if (!isConnected || !wallet || !catTokenId) {
      return
    }
    
    setIsSyncingStats(true)
    try {
      // Update stats on-chain first to ensure latest state
      await updateCatStatsOnChain(wallet, catTokenId)
      
      // Fetch updated stats from blockchain
      const blockchainStats = await getCatStatsFromChain(wallet, catTokenId)
      
      if (blockchainStats) {
        console.log('Synced cat stats from blockchain:', blockchainStats)
        // Note: We don't overwrite localStorage here as it handles offline progress
        // The blockchain stats are shown for information/verification
        // In a full implementation, you might want to merge or reconcile the two
      }
    } catch (error) {
      console.error('Failed to sync cat stats from blockchain:', error)
    } finally {
      setIsSyncingStats(false)
    }
  }

  useEffect(() => {
    // Lightweight state update (no death check, no saves)
    const updateStateLight = () => {
      try {
        const state = getGameState()
        setSelectedCat(state.selectedCat)
        setGameState(state)
        const stats = getCatStats()
        setCatStats(stats)
      } catch (error) {
        console.error('Error updating state:', error)
      }
    }
    
    // Full state update with death check (deferred)
    const updateStateFull = () => {
      try {
        const state = getGameState()
        setSelectedCat(state.selectedCat)
        setGameState(state)
        const stats = getCatStats()
        setCatStats(stats)
        // Check for death when state updates (deferred to avoid blocking)
        setTimeout(() => {
          try {
            checkCatDeath()
            // Update state again after death check
            const updatedState = getGameState()
            setGameState(updatedState)
            setCatStats(updatedState.catStats || getCatStats())
          } catch (error) {
            console.error('Error checking cat death:', error)
          }
        }, 0)
      } catch (error) {
        console.error('Error updating state:', error)
      }
    }
    
    // Initial state update (lightweight, no death check)
    // Use requestAnimationFrame to ensure it doesn't block rendering
    requestAnimationFrame(() => {
      updateStateLight()
    })
    
    // Listen for cat selection and state changes (lightweight updates)
    const interval = setInterval(updateStateLight, 2000) // Reduced from 100ms

    // Listen for game state update events (lightweight)
    window.addEventListener('gameStateUpdate', updateStateLight)

    // Decay cat stats every 10 seconds (hunger increases, happiness decreases)
    const decayInterval = setInterval(() => {
      // Decay is async, so we can do it without blocking
      setTimeout(() => {
        decayCatStats()
        updateStateLight()
      }, 0)
    }, 10000) // Every 10 seconds

    // Sync cat stats from blockchain every 30 seconds (when wallet connected)
    const syncInterval = setInterval(() => {
      syncCatStatsFromBlockchain()
    }, 30000) // Every 30 seconds

    // Defer heavy blockchain operations to avoid blocking initial render
    // Use setTimeout to run after component has mounted and rendered
    const blockchainTimeout = setTimeout(() => {
      // Initial sync on mount if wallet connected (non-blocking)
      syncCatStatsFromBlockchain().catch(err => {
        console.warn('Initial stats sync failed:', err)
      })
      
      // Load owned NFTs on mount and when wallet connects (non-blocking)
      loadOwnedNFTs().catch(err => {
        console.warn('Initial NFT load failed:', err)
      })
    }, 100) // Small delay to let UI render first
    
    // Listen for wallet connection to reload NFTs
    const handleWalletConnected = () => {
      // Defer NFT loading to avoid blocking
      setTimeout(() => {
        loadOwnedNFTs().catch(err => {
          console.warn('NFT reload after wallet connect failed:', err)
        })
      }, 100)
    }
    
    window.addEventListener('walletConnected', handleWalletConnected)
    window.addEventListener('gameStateUpdate', () => {
      // Defer to avoid blocking
      setTimeout(() => {
        loadOwnedNFTs().catch(err => {
          console.warn('NFT reload after state update failed:', err)
        })
      }, 100)
    })

    return () => {
      clearInterval(interval)
      clearInterval(decayInterval)
      clearInterval(syncInterval)
      clearTimeout(blockchainTimeout)
      window.removeEventListener('gameStateUpdate', updateStateLight)
      window.removeEventListener('walletConnected', handleWalletConnected)
      window.removeEventListener('gameStateUpdate', loadOwnedNFTs)
    }
  }, [])

  const handleFeedClick = () => {
    // Don't feed if cat is dead
    if (!catStats.isAlive) {
      return
    }
    
    // Use localStorage inventory (food is off-chain)
    const state = getGameState()
    const foods = state.inventory.foods || {}
    const availableFoods = Object.keys(foods).filter(id => foods[id] > 0)
    
    if (availableFoods.length === 0) {
      console.log('No food in localStorage inventory')
      return
    }
    
    // If only one food type available, feed directly
    if (availableFoods.length === 1) {
      handleFeed(availableFoods[0])
    } else {
      // Show food selection modal
      setShowFoodSelection(true)
    }
  }

  const handleFeed = (foodId) => {
    // Don't feed if cat is dead
    if (!catStats.isAlive) {
      return
    }
    
    const state = getGameState()
    const foods = state.inventory.foods || {}
    
    // Check if food is available
    if (!foods[foodId] || foods[foodId] <= 0) {
      return
    }
    
    // Determine food value based on item (cheaper = less hunger reduction, expensive = more)
    // Hunger reduction is based on price: higher price = more hunger reduction
    let foodValue = 10 // Default (fish - cheapest)
    if (foodId === 'fish') {
      foodValue = 10 // Price: 5 - reduces 10 hunger
    } else if (foodId === 'tuna') {
      foodValue = 15 // Price: 10 - reduces 15 hunger
    } else if (foodId === 'salmon') {
      foodValue = 20 // Price: 15 - reduces 20 hunger
    } else if (foodId === 'catnip') {
      foodValue = 12 // Price: 20 - reduces 12 hunger but increases happiness more
      // Catnip increases happiness more
      playWithCat(20)
    } else if (foodId === 'premium_food') {
      foodValue = 30 // Price: 30 - reduces 30 hunger (best value)
    }
    
    // Food is off-chain - just use localStorage
    console.log(`Feeding cat with ${foodId} (hunger reduction: ${foodValue})`)
    
    if (removeFromInventory('foods', foodId)) {
      feedCat(foodValue)
      setCatStats(getCatStats())
      setGameState(getGameState())
      window.dispatchEvent(new CustomEvent('gameStateUpdate'))
      
      // Log transaction to history
      const foodItem = FOOD_ITEMS.find(f => f.id === foodId)
      addTransaction({
        type: TX_TYPES.FEED_CAT,
        itemName: foodItem?.name || foodId,
        itemId: foodId,
        metadata: {
          catName: state.selectedCat,
          hungerReduction: foodValue,
        },
      })
      window.dispatchEvent(new CustomEvent('transactionAdded'))
      
      // Show love effect
      setShowLoveEffect(true)
      setCatMood('excited')
      setTimeout(() => {
        setShowLoveEffect(false)
        setCatMood('idle')
      }, 2000)
      
      console.log('✅ Cat fed successfully!')
    } else {
      console.log('Failed to remove food from inventory')
    }
    
    // Close selection modal
    setShowFoodSelection(false)
  }

  // Animate through frames 1-10 with 150ms delay (cat idle animation)
  useEffect(() => {
    const frameInterval = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= 10) return 1
        return prev + 1
      })
    }, 150)

    return () => clearInterval(frameInterval)
  }, [])

  // Animate box frames 1-4 when cat is being dragged
  useEffect(() => {
    if (isDragging) {
      const boxFrameInterval = setInterval(() => {
        setBoxFrame((prev) => {
          if (prev >= 4) return 1
          return prev + 1
        })
      }, 150) // Same timing as cat animation

      return () => clearInterval(boxFrameInterval)
    } else {
      // Reset to frame 1 when not dragging
      setBoxFrame(1)
    }
  }, [isDragging])

  // Physics simulation for toy items (optimized to reduce CPU usage)
  useEffect(() => {
    // Only run physics if there are items that need physics
    const hasFallingItems = Object.values(itemPhysics).some(physics => physics?.isFalling)
    if (!hasFallingItems && Object.keys(itemPhysics).length === 0) {
      return // No physics needed
    }

    // Use requestAnimationFrame for smoother, more efficient updates
    let animationFrameId
    let lastTime = performance.now()
    
    const updatePhysics = (currentTime) => {
      const deltaTime = Math.min((currentTime - lastTime) / 16, 2) // Cap delta to prevent large jumps
      lastTime = currentTime
      
      const state = getGameState()
      const updatedPhysics = { ...itemPhysics }
      let hasChanges = false
      const floorY = 75 // Floor level

      state.roomItems.forEach((item) => {
        // Only apply physics to toys
        if (item.type === 'toys') {
          const physics = itemPhysics[item.id]
          
          // Initialize physics if item is above floor and not already falling
          if (!physics && item.position.y < floorY - 0.5) {
            // Item is above floor, start falling
            updatedPhysics[item.id] = {
              velocityY: 0,
              isFalling: true,
              bounceCount: 0,
              position: { ...item.position }
            }
            hasChanges = true
          }
          
          // Update physics if item is falling
          if (physics && physics.isFalling) {
            const gravity = 0.25 * deltaTime // Scale by delta time
            const bounceDamping = 0.7 // Bounce energy loss (70% energy retained)
            const minVelocity = 0.2 // Minimum velocity to continue bouncing
            const maxBounces = 5 // Maximum number of bounces
            
            // Apply gravity (increases downward velocity)
            let newVelocityY = physics.velocityY + gravity
            let newY = physics.position.y + newVelocityY
            let newBounceCount = physics.bounceCount
            
            // Check if hit floor
            if (newY >= floorY) {
              newY = floorY
              
              // Bounce if velocity is significant and haven't exceeded max bounces
              if (newVelocityY > minVelocity && newBounceCount < maxBounces) {
                // Reverse velocity (bounce up) and apply damping
                newVelocityY = -newVelocityY * bounceDamping
                newBounceCount = newBounceCount + 1
                
                updatedPhysics[item.id] = {
                  ...physics,
                  velocityY: newVelocityY,
                  bounceCount: newBounceCount,
                  position: { ...physics.position, y: newY }
                }
                
                // Update item position
                updateRoomItemPosition(item.id, { x: physics.position.x, y: newY })
                hasChanges = true
              } else {
                // Settled on floor
                updatedPhysics[item.id] = {
                  ...physics,
                  velocityY: 0,
                  isFalling: false,
                  bounceCount: newBounceCount,
                  position: { ...physics.position, y: floorY }
                }
                
                // Update item position
                updateRoomItemPosition(item.id, { x: physics.position.x, y: floorY })
                hasChanges = true
              }
            } else if (newY < floorY) {
              // Still falling/bouncing (above floor)
              updatedPhysics[item.id] = {
                ...physics,
                velocityY: newVelocityY,
                position: { ...physics.position, y: newY }
              }
              
              // Update item position
              updateRoomItemPosition(item.id, { x: physics.position.x, y: newY })
              hasChanges = true
            }
          }
        }
      })

      if (hasChanges) {
        setItemPhysics(updatedPhysics)
        setGameState(getGameState())
      }
      
      // Continue animation loop if there are still falling items
      const stillHasFalling = Object.values(updatedPhysics).some(physics => physics?.isFalling)
      if (stillHasFalling) {
        animationFrameId = requestAnimationFrame(updatePhysics)
      }
    }
    
    animationFrameId = requestAnimationFrame(updatePhysics)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [itemPhysics])


  const handleCatClick = () => {
    // Only trigger click if not dragging
    if (!wasDragging) {
      // Change cat mood when clicked
      setCatMood('happy')
      setTimeout(() => {
        setCatMood('idle')
      }, 1000)
    }
    setWasDragging(false)
  }

  const handlePet = async () => {
    // Don't pet if cat is dead
    if (!catStats.isAlive) {
      return
    }
    
    const state = getGameState()
    const isWalletConnected = wallet?.isConnected
    const catTokenId = getCatTokenId(state.selectedCat)
    
    if (isWalletConnected && wallet && catTokenId) {
      // Blockchain mode: Play with cat on-chain
      setIsProcessingTx(true)
      setTxStatus(null)
      setTxMessage('Playing with cat on OneChain...')
      
      try {
        // Use toyId 0 for "pet" action (special case)
        const txHash = await playWithCatOnChain(wallet, catTokenId, 0)
        console.log('Played with cat on-chain:', txHash)
        
        // Update local state
        playWithCat(10)
        setCatStats(getCatStats())
        window.dispatchEvent(new CustomEvent('gameStateUpdate'))
        
        // Try to sync stats from blockchain
        try {
          const blockchainStats = await getCatStatsFromChain(wallet, catTokenId)
          if (blockchainStats) {
            console.log('Synced cat stats from blockchain:', blockchainStats)
          }
        } catch (syncError) {
          console.warn('Could not sync stats from blockchain:', syncError)
        }
        
        setTxStatus('success')
        setTxMessage('Cat played with on OneChain!')
        
        setCatMood('excited')
        setTimeout(() => {
          setCatMood('idle')
          setTxStatus(null)
        }, 2000)
      } catch (error) {
        console.error('Failed to play with cat on-chain:', error)
        setTxStatus('error')
        // Use user-friendly error message from parsed error
        const errorMessage = error?.errorMessage || error?.userFriendly || error?.message || 'Transaction failed. Using offline mode.'
        setTxMessage(errorMessage)
        
        // Fallback to local state
        playWithCat(10)
        setCatStats(getCatStats())
        window.dispatchEvent(new CustomEvent('gameStateUpdate'))
        
        setCatMood('excited')
        setTimeout(() => {
          setCatMood('idle')
          setTxStatus(null)
        }, 2000)
      } finally {
        setIsProcessingTx(false)
      }
    } else {
      // Offline mode
      playWithCat(10)
      setCatStats(getCatStats())
      window.dispatchEvent(new CustomEvent('gameStateUpdate'))
      setCatMood('excited')
      setTimeout(() => {
        setCatMood('idle')
      }, 1500)
    }
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setWasDragging(false)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setWasDragging(true)
        const container = document.querySelector('.cat-room')
        if (container) {
          const rect = container.getBoundingClientRect()
          const x = ((e.clientX - rect.left) / rect.width) * 100
          
          // Keep cat within horizontal bounds, but fixed on floor (bottom area)
          const clampedX = Math.max(10, Math.min(90, x))
          const floorY = 80 // Fixed Y position for floor level
          
          setCatPosition({ x: clampedX, y: floorY })
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  const handleRoomDrop = async (e) => {
    e.preventDefault()
    const container = document.querySelector('.cat-room')
    if (container) {
      container.classList.remove('drag-over')
    }
    
    if (draggedInventoryItem && draggedInventoryItem.type === 'toys') {
      // Only allow toys to be dropped in room, not food
      if (container) {
        const rect = container.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const dropY = ((e.clientY - rect.top) / rect.height) * 100 // Actual drop Y position
        
        // Keep within bounds
        const clampedX = Math.max(10, Math.min(90, x))
        const floorY = 75 // Floor level
        const dropHeight = Math.max(0, floorY - dropY) // Calculate drop height (higher = more distance to fall)
        
        const state = getGameState()
        const isWalletConnected = wallet?.isConnected
        const catTokenId = getCatTokenId(state.selectedCat)
        
        // Remove from inventory and add to room with physics
        if (removeFromInventory('toys', draggedInventoryItem.itemId)) {
          const newItem = addRoomItem('toys', draggedInventoryItem.itemId, { x: clampedX, y: dropY }, dropHeight)
          setGameState(getGameState())
          
          // Initialize physics for the new item if dropped from height (above floor)
          // If dropped above floor, start physics immediately
          if (dropY < floorY - 1) {
            setItemPhysics(prev => ({
              ...prev,
              [newItem.id]: {
                velocityY: 0,
                isFalling: true,
                bounceCount: 0,
                position: { x: clampedX, y: dropY }
              }
            }))
          }
          
          window.dispatchEvent(new CustomEvent('gameStateUpdate'))
          
          // Play with cat (blockchain or local)
          if (isWalletConnected && wallet && catTokenId) {
            // Blockchain mode
            setIsProcessingTx(true)
            setTxStatus(null)
            setTxMessage('Playing with toy on OneChain...')
            
            try {
              const toyNumericId = getToyId(draggedInventoryItem.itemId)
              if (!toyNumericId) {
                throw new Error('Unknown toy item')
              }
              
              const txHash = await playWithCatOnChain(wallet, catTokenId, toyNumericId)
              console.log('Played with toy on-chain:', txHash)
              
              // Update local state
              playWithCat(10)
              setCatStats(getCatStats())
              
              // Try to sync stats from blockchain
              try {
                const blockchainStats = await getCatStatsFromChain(wallet, catTokenId)
                if (blockchainStats) {
                  console.log('Synced cat stats from blockchain:', blockchainStats)
                }
              } catch (syncError) {
                console.warn('Could not sync stats from blockchain:', syncError)
              }
              
              setTxStatus('success')
              setTxMessage('Cat played with toy on OneChain!')
              
              setShowLoveEffect(true)
              setCatMood('excited')
              setTimeout(() => {
                setShowLoveEffect(false)
                setCatMood('idle')
                setTxStatus(null)
              }, 3000)
            } catch (error) {
              console.error('Failed to play with toy on-chain:', error)
              setTxStatus('error')
              // Use user-friendly error message from parsed error
              const errorMessage = error?.errorMessage || error?.userFriendly || error?.message || 'Transaction failed. Using offline mode.'
              setTxMessage(errorMessage)
              
              // Fallback to local state
              playWithCat(10)
              setCatStats(getCatStats())
              
              setShowLoveEffect(true)
              setCatMood('excited')
              setTimeout(() => {
                setShowLoveEffect(false)
                setCatMood('idle')
                setTxStatus(null)
              }, 3000)
            } finally {
              setIsProcessingTx(false)
            }
          } else {
            // Offline mode
            playWithCat(10)
            setCatStats(getCatStats())
            setShowLoveEffect(true)
            setCatMood('excited')
            setTimeout(() => {
              setShowLoveEffect(false)
              setCatMood('idle')
            }, 2000)
          }
        }
      }
    }
    setDraggedInventoryItem(null)
  }

  const handleRoomDragOver = (e) => {
    e.preventDefault()
    const container = document.querySelector('.cat-room')
    // Only allow toys to be dragged over
    if (container && draggedInventoryItem && draggedInventoryItem.type === 'toys') {
      e.dataTransfer.dropEffect = 'move'
      container.classList.add('drag-over')
    } else {
      e.dataTransfer.dropEffect = 'none'
    }
  }

  const handleRoomDragLeave = (e) => {
    const container = document.querySelector('.cat-room')
    if (container && !container.contains(e.relatedTarget)) {
      container.classList.remove('drag-over')
    }
  }

  const handleRoomItemMouseDown = (item, e) => {
    e.stopPropagation()
    e.preventDefault()
    setDraggingRoomItem(item)
    // Stop physics when manually dragging
    if (itemPhysics[item.id]) {
      setItemPhysics(prev => {
        const updated = { ...prev }
        if (updated[item.id]) {
          updated[item.id].isFalling = false
        }
        return updated
      })
    }
  }

  useEffect(() => {
    const handleRoomItemMouseMove = (e) => {
      if (draggingRoomItem) {
        setWasDraggingRoomItem(true)
        const container = document.querySelector('.cat-room')
        if (container) {
          const rect = container.getBoundingClientRect()
          const x = ((e.clientX - rect.left) / rect.width) * 100
          const y = ((e.clientY - rect.top) / rect.height) * 100
          
          const clampedX = Math.max(10, Math.min(90, x))
          const clampedY = Math.max(10, Math.min(90, y)) // Allow vertical movement during drag
          
          updateRoomItemPosition(draggingRoomItem.id, { x: clampedX, y: clampedY })
          setGameState(getGameState())
          
          // Update physics state position and stop physics while dragging
          setItemPhysics(prev => {
            const updated = { ...prev }
            if (updated[draggingRoomItem.id]) {
              updated[draggingRoomItem.id].position = { x: clampedX, y: clampedY }
              updated[draggingRoomItem.id].isFalling = false
              updated[draggingRoomItem.id].velocityY = 0
            }
            return updated
          })
        }
      }
    }

    const handleRoomItemMouseUp = (e) => {
      if (draggingRoomItem) {
        const container = document.querySelector('.cat-room')
        if (container) {
          const rect = container.getBoundingClientRect()
          const dropY = ((e.clientY - rect.top) / rect.height) * 100
          const floorY = 75
          const dropHeight = Math.max(0, floorY - dropY)
          
          // Get current position
          const currentItem = gameState.roomItems.find(item => item.id === draggingRoomItem.id)
          const currentPosition = currentItem ? currentItem.position : { x: 50, y: dropY }
          
          // If dropped from height and it's a toy, start physics
          if (draggingRoomItem.type === 'toys' && dropHeight > 2) {
            setItemPhysics(prev => ({
              ...prev,
              [draggingRoomItem.id]: {
                velocityY: 0,
                isFalling: true,
                bounceCount: 0,
                position: { x: currentPosition.x, y: dropY }
              }
            }))
          } else if (draggingRoomItem.type === 'toys') {
            // If dropped near floor, stop physics
            setItemPhysics(prev => {
              const updated = { ...prev }
              if (updated[draggingRoomItem.id]) {
                updated[draggingRoomItem.id].isFalling = false
                updated[draggingRoomItem.id].velocityY = 0
              }
              return updated
            })
          }
        }
      }
      setDraggingRoomItem(null)
      setTimeout(() => setWasDraggingRoomItem(false), 100)
    }

    if (draggingRoomItem) {
      document.addEventListener('mousemove', handleRoomItemMouseMove)
      document.addEventListener('mouseup', handleRoomItemMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleRoomItemMouseMove)
        document.removeEventListener('mouseup', handleRoomItemMouseUp)
      }
    }
  }, [draggingRoomItem, gameState.roomItems])

  const handleRemoveRoomItem = (itemId) => {
    removeRoomItem(itemId)
    setGameState(getGameState())
    window.dispatchEvent(new CustomEvent('gameStateUpdate'))
  }

  const getItemData = (type, itemId) => {
    const items = type === 'food' ? FOOD_ITEMS : TOY_ITEMS
    return items.find(item => item.id === itemId)
  }

  return (
    <div className="interactive-cat-page">
      <div 
        className="cat-room"
        onDrop={handleRoomDrop}
        onDragOver={handleRoomDragOver}
        onDragLeave={handleRoomDragLeave}
      >
        {/* Room items - Only toys */}
        {gameState.roomItems && gameState.roomItems
          .filter(item => item.type === 'toys') // Only show toys, not food
          .map((item) => {
            const itemData = getItemData(item.type, item.itemId)
            if (!itemData) return null
            
            // Use physics position if item is falling, otherwise use saved position
            const physicsState = itemPhysics[item.id]
            const isFalling = physicsState && physicsState.isFalling
            const displayPosition = isFalling && physicsState
              ? physicsState.position
              : item.position
            
            return (
              <div
                key={item.id}
                className={`room-item ${isFalling ? 'falling' : ''}`}
                style={{
                  left: `${displayPosition.x}%`,
                  top: `${displayPosition.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                onMouseDown={(e) => handleRoomItemMouseDown(item, e)}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!wasDraggingRoomItem) {
                    handleRemoveRoomItem(item.id)
                    // Clean up physics state
                    setItemPhysics(prev => {
                      const updated = { ...prev }
                      delete updated[item.id]
                      return updated
                    })
                  }
                  setWasDraggingRoomItem(false)
                }}
              title="Click to remove, drag to move"
            >
              {itemData.image ? (
                <img 
                  src={itemData.image} 
                  alt={itemData.name}
                  className="room-item-img"
                />
              ) : (
                <div className="room-item-emoji">{itemData.emoji}</div>
              )}
            </div>
            )
          })}
        
        {/* Cat */}
        {catStats.isAlive ? (
          <div 
            className={`interactive-cat-container ${catMood} ${getCatTokenId(gameState.selectedCat) ? 'nft-cat' : ''}`}
            style={{
              left: `${catPosition.x}%`,
              top: `${catPosition.y}%`,
              transform: 'translate(-50%, -50%)',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
            onClick={handleCatClick}
            onMouseDown={handleMouseDown}
          >
            {getCatTokenId(gameState.selectedCat) && (
              <div className="nft-cat-frame"></div>
            )}
          {isDragging ? (
            <img 
              src={`/Animation/Box_animation/box${boxFrame}.png`}
              alt="Box animation"
              className="cat-sprite box-sprite"
            />
          ) : (
            <img 
              src={`/Animation/Cat_animation/${currentFrame}.png`}
              alt="Cat animation"
              className="cat-sprite"
              data-cat={selectedCat}
            />
          )}
          {catMood === 'happy' && (
            <div className="cat-effect happy-effect">😊</div>
          )}
          {catMood === 'excited' && (
            <div className="cat-effect excited-effect">✨</div>
          )}
          {showLoveEffect && (
            <div className="cat-effect love-effect">
              <img 
                src="/images/love_heart.png" 
                alt="Love heart" 
                className="love-heart-image"
              />
            </div>
          )}
          </div>
        ) : (
          <div 
            className="cat-death-message"
            style={{
              left: `${catPosition.x}%`,
              top: `${catPosition.y}%`,
              transform: 'translate(-50%, -50%)',
              position: 'absolute',
              zIndex: 10
            }}
          >
            <div className="death-message-box">
              <div className="death-icon">💀</div>
              <div className="death-text">Cat has passed away</div>
              <div className="death-hint">Buy a new cat from the shop</div>
            </div>
          </div>
        )}
      </div>
      
      <div className="cat-controls">
        {/* Transaction Status Messages */}
        {isProcessingTx && (
          <div className="tx-status processing">
            <span className="tx-spinner">⏳</span>
            {txMessage}
          </div>
        )}
        
        {txStatus === 'success' && (
          <div className="tx-status success">
            <span className="tx-icon">✅</span>
            {txMessage}
          </div>
        )}
        
        {txStatus === 'error' && (
          <div className="tx-status error">
            <span className="tx-icon">⚠️</span>
            {txMessage}
          </div>
        )}
        
        <div className="cat-controls-top">
          <div className="cat-action-buttons">
            <button 
              className="cat-action-button" 
              onClick={handlePet}
              disabled={isProcessingTx || !catStats.isAlive}
            >
              🐾 Pet
            </button>
            <button 
              className="cat-action-button feed-button" 
              onClick={handleFeedClick}
              disabled={isProcessingTx || !catStats.isAlive || !Object.values(gameState.inventory.foods || {}).some(qty => qty > 0)}
            >
              🍖 Feed
            </button>
          </div>
          <div className="cat-info">
            <div className="cat-name">
              {gameState.selectedCat || 'Default Cat'}
              {getCatTokenId(gameState.selectedCat) && (
                <span className="cat-token-badge nft-visual-badge" title={`NFT Token #${getCatTokenId(gameState.selectedCat)}`}>
                  <img 
                    src="/images/164-1648732_8-bit-mario-coin-mario-coin-pixel.png"
                    alt="NFT"
                    className="nft-badge-image"
                  />
                  <span className="nft-badge-text">NFT #{getCatTokenId(gameState.selectedCat).slice(0, 8)}...</span>
                </span>
              )}
            </div>
            <div className="cat-status">{catMood}</div>
            {((ownedNFTs?.length > 0) || (gameState.inventory?.cats?.length > 1)) && (
              <button 
                className="cat-selector-button"
                onClick={() => setShowCatSelector(!showCatSelector)}
                title="Switch cat"
              >
                🐱 Switch Cat
              </button>
            )}
          </div>
        </div>
        
        {/* Cat Selector */}
        {showCatSelector && (
          <div className="cat-selector">
            <div className="cat-selector-header">
              <h3>Select Your Cat</h3>
              <button 
                className="cat-selector-close"
                onClick={() => setShowCatSelector(false)}
              >
                ✕
              </button>
            </div>
            <div className="cat-selector-list">
              {isLoadingNFTs ? (
                <div className="cat-selector-loading">Loading NFTs...</div>
              ) : (
                <>
                  {/* Default cat (if owned) */}
                  {gameState.inventory.cats.includes('default') && (
                    <div 
                      className={`cat-selector-item ${gameState.selectedCat === 'default' ? 'selected' : ''}`}
                      onClick={() => handleSelectCat('default')}
                    >
                      <div className="cat-selector-emoji">{CAT_SPECIES.find(c => c.id === 'default')?.emoji || '🐱'}</div>
                      <div className="cat-selector-info">
                        <div className="cat-selector-name">Default Cat</div>
                        <div className="cat-selector-type">Local Cat</div>
                      </div>
                      {gameState.selectedCat === 'default' && (
                        <div className="cat-selector-check">✓</div>
                      )}
                    </div>
                  )}
                  
                  {/* NFT Cats */}
                  {ownedNFTs?.map((nft) => {
                    const catData = CAT_SPECIES.find(c => c.id === nft.catId)
                    const isSelected = gameState.selectedCat === nft.catId
                    return (
                      <div 
                        key={nft.tokenId}
                        className={`cat-selector-item nft ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectCat(nft.catId, nft.tokenId)}
                      >
                        <div className="cat-selector-emoji nft-emoji">{catData?.emoji || '🐱'}</div>
                        <div className="cat-selector-info">
                          <div className="cat-selector-name">
                            {catData?.name || nft.catId}
                            <span className="nft-badge-icon" title="Blockchain NFT">🪙</span>
                          </div>
                          <div className="cat-selector-token">
                            <span className="nft-label">NFT</span> #{nft.tokenId.slice(0, 8)}...
                          </div>
                        </div>
                        <div className="nft-glow-indicator"></div>
                        {isSelected && (
                          <div className="cat-selector-check">✓</div>
                        )}
                      </div>
                    )
                  })}
                  
                  {/* Local cats (non-NFT) */}
                  {gameState.inventory?.cats
                    ?.filter(catId => catId !== 'default' && !ownedNFTs?.some(nft => nft.catId === catId))
                    .map(catId => {
                      const catData = CAT_SPECIES.find(c => c.id === catId)
                      const isSelected = gameState.selectedCat === catId
                      return (
                        <div 
                          key={catId}
                          className={`cat-selector-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectCat(catId)}
                        >
                          <div className="cat-selector-emoji">{catData?.emoji || '🐱'}</div>
                          <div className="cat-selector-info">
                            <div className="cat-selector-name">{catData?.name || catId}</div>
                            <div className="cat-selector-type">Local Cat</div>
                          </div>
                          {isSelected && (
                            <div className="cat-selector-check">✓</div>
                          )}
                        </div>
                      )
                    })}
                  
                  {(ownedNFTs?.length === 0) && (gameState.inventory?.cats?.length <= 1) && (
                    <div className="cat-selector-empty">
                      No cats owned. Buy one from the shop!
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        <div className="cat-stats">
          <div className="stat-bar">
            <div className="stat-label">🍖</div>
            <div className="stat-bar-wrapper">
              <div className="stat-bar-name">Hunger</div>
              <div className="stat-bar-container">
                <div 
                  className="stat-bar-fill hunger-bar"
                  style={{ width: `${catStats.hunger}%` }}
                ></div>
                <div className="stat-bar-text">{catStats.hunger}%</div>
              </div>
            </div>
          </div>
          <div className="stat-bar">
            <div className="stat-label">😊</div>
            <div className="stat-bar-wrapper">
              <div className="stat-bar-name">Happiness</div>
              <div className="stat-bar-container">
                <div 
                  className="stat-bar-fill happiness-bar"
                  style={{ width: `${catStats.happiness}%` }}
                ></div>
                <div className="stat-bar-text">{catStats.happiness}%</div>
              </div>
            </div>
          </div>
          <div className="stat-bar">
            <div className="stat-label">❤️</div>
            <div className="stat-bar-wrapper">
              <div className="stat-bar-name">Health</div>
              <div className="stat-bar-container">
                <div 
                  className={`stat-bar-fill health-bar ${!catStats.isAlive ? 'dead' : catStats.hunger > 70 && catStats.daysWithoutFeeding >= 2 ? 'critical' : ''}`}
                  style={{ 
                    width: `${catStats.isAlive 
                      ? (catStats.hunger > 70 
                        ? Math.max(0, 100 - ((catStats.hunger - 70) * 3.33) - (catStats.daysWithoutFeeding * 10)) 
                        : 100)
                      : 0}%` 
                  }}
                ></div>
                <div className="stat-bar-text">
                  {catStats.isAlive 
                    ? (catStats.hunger > 70 
                      ? `${Math.max(0, Math.min(100, Math.round(100 - ((catStats.hunger - 70) * 3.33) - (catStats.daysWithoutFeeding * 10))))}%`
                      : '100%')
                    : 'DEAD'}
                </div>
              </div>
              {catStats.isAlive && catStats.hunger > 70 && (
                <div className="health-warning">
                  ⚠️ Health dropping! {catStats.daysWithoutFeeding >= 2 ? `${3 - catStats.daysWithoutFeeding} day(s) left!` : 'Feed your cat!'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Food Selection Modal */}
      {showFoodSelection && (
        <div className="food-selection-overlay" onClick={() => setShowFoodSelection(false)}>
          <div className="food-selection-modal" onClick={(e) => e.stopPropagation()}>
            <div className="food-selection-header">
              <h3 className="food-selection-title">Select Food to Feed</h3>
              <button 
                className="food-selection-close"
                onClick={() => setShowFoodSelection(false)}
              >
                ✕
              </button>
            </div>
            <div className="food-selection-list">
              {FOOD_ITEMS.map((food) => {
                // Food is tracked in localStorage (off-chain)
                const quantity = gameState.inventory.foods[food.id] || 0
                if (quantity <= 0) return null
                
                // Calculate hunger reduction based on price
                let hungerReduction = 10
                if (food.id === 'fish') hungerReduction = 10
                else if (food.id === 'tuna') hungerReduction = 15
                else if (food.id === 'salmon') hungerReduction = 20
                else if (food.id === 'catnip') hungerReduction = 12
                else if (food.id === 'premium_food') hungerReduction = 30
                
                return (
                  <div
                    key={food.id}
                    className="food-selection-item"
                    onClick={() => handleFeed(food.id)}
                  >
                    {food.image ? (
                      <div className="food-selection-image">
                        <img 
                          src={food.image} 
                          alt={food.name}
                          className="food-selection-img"
                        />
                      </div>
                    ) : (
                      <div className="food-selection-emoji">{food.emoji}</div>
                    )}
                    <div className="food-selection-info">
                      <div className="food-selection-name">{food.name}</div>
                      <div className="food-selection-stats">
                        Reduces {hungerReduction}% hunger
                      </div>
                      <div className="food-selection-quantity">Owned: {quantity}x</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      
      <Inventory onItemDrag={setDraggedInventoryItem} />
    </div>
  )
}

export default InteractiveCat

