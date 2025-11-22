import { useState, useEffect } from 'react'
import '../styles/CoinNotification.css'

function CoinNotification({ show, amount, onComplete }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        if (onComplete) {
          setTimeout(onComplete, 300)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!visible) return null

  return (
    <div className="coin-notification">
      <div className="coin-notification-content">
        <span className="coin-notification-icon">🪙</span>
        <span className="coin-notification-text">+{amount} OCT!</span>
      </div>
    </div>
  )
}

export default CoinNotification

