import { useState, useEffect, useRef } from 'react'
import { ConnectButton, useAutoConnectWallet, useCurrentWallet, useWallets } from '@onelabs/dapp-kit'
import PomodoroTimer from './components/PomodoroTimer'
import CustomTimer from './components/CustomTimer'
import InteractiveCat from './components/InteractiveCat'
import CoinDisplay from './components/CoinDisplay'
import Shop from './components/Shop'
import NFTGallery from './components/NFTGallery'
import CoinNotification from './components/CoinNotification'
import Settings from './components/Settings'
import TreasuryStatus from './components/TreasuryStatus'
// TreasuryInitializer removed - no treasury needed with OCT (native token, 100% burn)
import { getGameState } from './utils/gameState'
import { ONECHAIN_OBJECT_IDS } from './utils/onechainBlockchainUtils'
import { getSettings, updateSetting } from './utils/settings'
import { setupMultiTabSync, setupNetworkListener } from './utils/edgeCaseHandler'
import './styles/App.css'

function App() {
  // Get auto-connection status and wallet info
  const autoConnectionStatus = useAutoConnectWallet()
  const wallet = useCurrentWallet()
  const wallets = useWallets()
  
  const [page, setPage] = useState('timer') // 'timer' or 'cat'
  const [mode, setMode] = useState('pomodoro') // 'pomodoro' or 'custom'
  const [showShop, setShowShop] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [gameState, setGameState] = useState(getGameState())
  const [showCoinNotification, setShowCoinNotification] = useState(false)
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false)
  
  // Background music
  const bgmRef = useRef(null)
  const [bgmMuted, setBgmMuted] = useState(getSettings().bgmMuted || false)

  useEffect(() => {
    // Initialize game state
    const state = getGameState()
    setGameState(state)
    
    // Initialize settings and apply volume
    const settings = getSettings()
    const audioElements = document.querySelectorAll('audio')
    audioElements.forEach(audio => {
      audio.volume = settings.volume / 100
    })
    
    // Initialize background music
    if (bgmRef.current) {
      bgmRef.current.volume = settings.bgm / 100
      bgmRef.current.loop = true
      if (!settings.bgmMuted) {
        bgmRef.current.play().catch(err => {
          console.log('Background music autoplay prevented:', err)
          // User interaction required - will play when they click mute/unmute
        })
      }
    }
    
    // Setup multi-tab sync
    const cleanupMultiTab = setupMultiTabSync()
    
    // Setup network change listener
    const cleanupNetwork = setupNetworkListener(async (networkCheck) => {
      if (!networkCheck.correct) {
        console.warn('Wrong network detected')
      }
    })
    
    return () => {
      cleanupMultiTab()
      cleanupNetwork()
    }
  }, [])
  
  // Update background music volume when settings change
  useEffect(() => {
    const settings = getSettings()
    if (bgmRef.current) {
      bgmRef.current.volume = settings.bgm / 100
    }
    
    // Listen for BGM volume changes from Settings
    const handleBgmVolumeChange = (event) => {
      if (bgmRef.current) {
        bgmRef.current.volume = event.detail.volume / 100
      }
    }
    
    window.addEventListener('bgmVolumeChanged', handleBgmVolumeChange)
    
    return () => {
      window.removeEventListener('bgmVolumeChanged', handleBgmVolumeChange)
    }
  }, [])
  
  // Handle mute/unmute toggle
  const handleBgmToggle = () => {
    const newMutedState = !bgmMuted
    setBgmMuted(newMutedState)
    updateSetting('bgmMuted', newMutedState)
    
    if (bgmRef.current) {
      if (newMutedState) {
        bgmRef.current.pause()
      } else {
        bgmRef.current.play().catch(err => {
          console.log('Error playing background music:', err)
        })
      }
    }
  }

  // Auto-connect logic: Try to connect when wallet is available but not connected
  useEffect(() => {
    // Wait for auto-connect to complete
    if (autoConnectionStatus === 'idle') {
      return // Still attempting auto-connect
    }

    // If auto-connect has been attempted and we haven't tried manual connect yet
    if (autoConnectionStatus === 'attempted' && !hasAttemptedAutoConnect) {
      setHasAttemptedAutoConnect(true)
      
      // Check if wallet is not connected but wallets are available
      if (!wallet?.isConnected && wallets.length > 0) {
        // Find the first available wallet that's installed (not already connected)
        const availableWallet = wallets.find(w => w.installed)
        
        if (availableWallet) {
          console.log('🔄 Auto-connecting to wallet:', availableWallet.name)
          
          // Try to connect using the wallet's connect method
          // This will trigger the wallet extension popup for user approval
          const connectWallet = async () => {
            try {
              // Try different connection methods based on wallet API
              if (availableWallet.features && 'standard:connect' in availableWallet.features) {
                await availableWallet.features['standard:connect'].connect()
                console.log('✅ Wallet connection initiated via standard:connect')
              } else if (typeof availableWallet.connect === 'function') {
                await availableWallet.connect()
                console.log('✅ Wallet connection initiated via connect()')
              } else {
                console.log('⚠️ Wallet connect method not available, user needs to click ConnectButton')
              }
            } catch (error) {
              console.log('⚠️ Auto-connect failed (user may need to click ConnectButton):', error.message)
              // This is expected if:
              // 1. User hasn't granted permissions before
              // 2. Wallet requires user interaction
              // 3. Connection was rejected
            }
          }
          
          // Small delay to ensure wallet is ready and auto-connect has fully completed
          setTimeout(connectWallet, 1000)
        }
      }
    }
  }, [autoConnectionStatus, wallet?.isConnected, wallets, hasAttemptedAutoConnect])

  const handleWorkComplete = () => {
    // Show coin notification
    setShowCoinNotification(true)
    // Refresh game state when work session completes
    setGameState(getGameState())
  }

  const handleShopPurchase = () => {
    // Refresh game state after purchase
    setGameState(getGameState())
  }

  return (
    <div className="app">
      <div className="app-container">
        <div className="app-header">
          <h1 className="app-title">Pixel Cat Pomodoro</h1>
          <div className="header-controls">
            <div className="wallet-connection-wrapper">
              <ConnectButton />
              {autoConnectionStatus === 'idle' && (
                <div className="auto-connect-status idle" title="Auto-connecting wallet...">
                  <span className="status-icon">⏳</span>
                  <span className="status-text">Connecting...</span>
                </div>
              )}
              {autoConnectionStatus === 'attempted' && !wallet?.isConnected && wallets.some(w => w.installed) && (
                <div className="auto-connect-status prompt" title="Click ConnectButton to connect your wallet">
                  <span className="status-icon">👆</span>
                  <span className="status-text">Click to Connect</span>
                </div>
              )}
              {autoConnectionStatus === 'attempted' && wallet?.isConnected && (
                <div className="auto-connect-status attempted" title="Wallet connected">
                  <span className="status-icon">✓</span>
                </div>
              )}
            </div>
            <CoinDisplay />
            <TreasuryStatus compact={true} showDetails={false} />
            <button 
              className="bgm-toggle-button"
              onClick={handleBgmToggle}
              title={bgmMuted ? "Unmute background music" : "Mute background music"}
            >
              <img 
                src={bgmMuted 
                  ? "/images/pngtree-pixel-art-wooden-mute-sound-button-icon-graphic-design-vector-png-image_16294889.png"
                  : "/images/pngtree-pixel-art-wooden-turn-on-sound-button-icon-graphic-design-vector-png-image_16294875.png"
                }
                alt={bgmMuted ? "Unmute" : "Mute"}
                className="bgm-icon"
              />
            </button>
            <button 
              className="shop-button"
              onClick={() => setShowShop(true)}
            >
              🛒 Shop
            </button>
            <button 
              className="gallery-button"
              onClick={() => setShowGallery(true)}
            >
              🐱 Collection
            </button>
            <button 
              className="settings-button"
              onClick={() => setShowSettings(true)}
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
        
        <div className="page-navigation">
          <button
            className={`nav-button ${page === 'timer' ? 'active' : ''}`}
            onClick={() => setPage('timer')}
          >
            ⏱️ Timer
          </button>
          <button
            className={`nav-button ${page === 'cat' ? 'active' : ''}`}
            onClick={() => setPage('cat')}
          >
            🐱 My Cat
          </button>
        </div>

        {page === 'timer' && (
          <>
            <div className="mode-switcher">
              <button
                className={`mode-button ${mode === 'pomodoro' ? 'active' : ''}`}
                onClick={() => setMode('pomodoro')}
              >
                Pomodoro
              </button>
              <button
                className={`mode-button ${mode === 'custom' ? 'active' : ''}`}
                onClick={() => setMode('custom')}
              >
                Custom
              </button>
            </div>

            <div className="game-area">
              {mode === 'pomodoro' ? (
                <PomodoroTimer onWorkComplete={handleWorkComplete} />
              ) : (
                <CustomTimer />
              )}
            </div>
          </>
        )}

        {page === 'cat' && (
          <div className="cat-page-area">
            <InteractiveCat />
          </div>
        )}

        {/* Treasury removed - no treasury needed with OCT (native token, 100% burn) */}
      </div>
      
      {showShop && (
        <Shop 
          onClose={() => setShowShop(false)} 
          onPurchase={handleShopPurchase}
        />
      )}
      
      {showGallery && (
        <NFTGallery 
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
        />
      )}
      
      <CoinNotification 
        show={showCoinNotification}
        amount={1}
        onComplete={() => setShowCoinNotification(false)}
      />
      
      {showSettings && (
        <Settings 
          onClose={() => setShowSettings(false)} 
        />
      )}
      
      {/* Background Music */}
      <audio
        ref={bgmRef}
        src="/Music/Study with Me in Minecraft  Rainy Cottage  25_5 Pomodoro Timer [2hr] [4K] - Ambient Horizons.mp3"
        loop
        preload="auto"
      />
    </div>
  )
}

export default App

