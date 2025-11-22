import { useState, useEffect } from 'react'
import { useCurrentWallet } from '@onelabs/dapp-kit'
import { getOwnedCatTokenIds, getCatTypeFromTokenId } from '../utils/blockchainGameState'
import { getStringId as getCatStringId } from '../utils/itemMapping'
import { CAT_SPECIES } from '../data/shopItems'
import { getGameState } from '../utils/gameState'
import '../styles/NFTGallery.css'

function NFTGallery({ isOpen, onClose }) {
  const wallet = useCurrentWallet()
  const [ownedNFTs, setOwnedNFTs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedCard, setExpandedCard] = useState(null)

  useEffect(() => {
    if (isOpen && wallet?.isConnected) {
      loadOwnedNFTs()
    } else {
      setOwnedNFTs([])
    }
  }, [isOpen, wallet?.isConnected])

  const loadOwnedNFTs = async () => {
    if (!wallet?.isConnected || !wallet) {
      setOwnedNFTs([])
      return
    }

    setIsLoading(true)
    try {
      const tokenIds = await getOwnedCatTokenIds(wallet)
      
      if (!tokenIds || tokenIds.length === 0) {
        setOwnedNFTs([])
        setIsLoading(false)
        return
      }
      
      const nftData = []
      for (const tokenId of tokenIds) {
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
          
          const finalCatId = foundCatId || catId
          nftData.push({
            tokenId,
            catTypeId,
            catId: finalCatId
          })
        } catch (error) {
          console.warn(`Failed to get cat type for token ${tokenId}:`, error)
        }
      }
      
      setOwnedNFTs(nftData)
    } catch (error) {
      console.error('Failed to load owned NFTs:', error)
      setOwnedNFTs([])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCard = (catId) => {
    setExpandedCard(expandedCard === catId ? null : catId)
  }

  const isOwned = (catId) => {
    return ownedNFTs.some(nft => nft.catId === catId)
  }

  const getOwnedTokenId = (catId) => {
    const nft = ownedNFTs.find(nft => nft.catId === catId)
    return nft?.tokenId || null
  }

  if (!isOpen) return null

  return (
    <div className="nft-gallery-overlay" onClick={onClose}>
      <div className="nft-gallery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nft-gallery-header">
          <h2>🐱 Cat Collection</h2>
          <button className="nft-gallery-close" onClick={onClose}>✕</button>
        </div>

        {isLoading ? (
          <div className="nft-gallery-loading">Loading your cats...</div>
        ) : (
          <div className="nft-gallery-grid">
            {CAT_SPECIES.map((cat) => {
              const owned = isOwned(cat.id)
              const tokenId = getOwnedTokenId(cat.id)
              const isExpanded = expandedCard === cat.id
              
              return (
                <div
                  key={cat.id}
                  className={`nft-gallery-card ${owned ? 'owned' : 'unowned'} ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleCard(cat.id)}
                >
                  <div className="nft-card-header">
                    <div className="nft-card-emoji">{cat.emoji}</div>
                    <div className="nft-card-info">
                      <div className="nft-card-name">
                        {cat.name}
                        {owned && (
                          <span className="owned-badge" title="You own this NFT">
                            🪙
                          </span>
                        )}
                      </div>
                      <div className="nft-card-status">
                        {owned ? (
                          <span className="status-owned">✓ Owned</span>
                        ) : (
                          <span className="status-unowned">○ Not Owned</span>
                        )}
                      </div>
                      {owned && tokenId && (
                        <div className="nft-card-token">NFT #{tokenId.slice(0, 8)}...</div>
                      )}
                    </div>
                    <div className="nft-card-toggle">
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="nft-card-details">
                      <div className="nft-card-description">
                        <strong>Description:</strong>
                        <p>{cat.description}</p>
                      </div>
                      {cat.price !== undefined && (
                        <div className="nft-card-price">
                          <strong>Price:</strong> {cat.price === 0 ? 'Free' : `${cat.price} OCT`}
                        </div>
                      )}
                      {owned && tokenId && (
                        <div className="nft-card-token-full">
                          <strong>NFT Token ID:</strong> #{tokenId}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default NFTGallery

