import { useState, useEffect } from 'react'
import { getGameState } from '../utils/gameState'
import '../styles/CatSprite.css'

function CatSprite() {
  const [selectedCat, setSelectedCat] = useState('default')
  const [currentFrame, setCurrentFrame] = useState(1)

  useEffect(() => {
    const state = getGameState()
    setSelectedCat(state.selectedCat)
    
    // Listen for cat selection changes
    const interval = setInterval(() => {
      const currentState = getGameState()
      setSelectedCat(currentState.selectedCat)
    }, 100)

    return () => clearInterval(interval)
  }, [])

  // Animate through frames 1-10 with 150ms delay
  useEffect(() => {
    const frameInterval = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= 10) return 1
        return prev + 1
      })
    }, 150)

    return () => clearInterval(frameInterval)
  }, [])

  return (
    <div className="cat-sprite-container">
      <img 
        src={`/Animation/Cat_animation/${currentFrame}.png`}
        alt="Cat animation"
        className="cat-sprite"
        data-cat={selectedCat}
      />
    </div>
  )
}

export default CatSprite

