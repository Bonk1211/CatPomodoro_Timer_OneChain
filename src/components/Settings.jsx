import { useState, useEffect } from 'react'
import { getSettings, updateSetting } from '../utils/settings'
import TransactionHistory from './TransactionHistory'
import TreasuryStatus from './TreasuryStatus'
import '../styles/Settings.css'

function Settings({ onClose }) {
  const [settings, setSettings] = useState(getSettings())
  const [showTransactionHistory, setShowTransactionHistory] = useState(false)

  useEffect(() => {
    // Apply theme on mount and when theme changes
    const root = document.documentElement
    if (settings.theme === 'light') {
      root.classList.add('light-theme')
    } else {
      root.classList.remove('light-theme')
    }
  }, [settings.theme])

  const handleSettingChange = (key, value) => {
    const newSettings = updateSetting(key, value)
    setSettings(newSettings)
  }

  const handleVolumeChange = (e) => {
    const value = parseInt(e.target.value)
    handleSettingChange('volume', value)
    // Update audio volume immediately
    const audioElements = document.querySelectorAll('audio')
    audioElements.forEach(audio => {
      audio.volume = value / 100
    })
  }


  const handleBGMChange = (e) => {
    const value = parseInt(e.target.value)
    handleSettingChange('bgm', value)
    // Dispatch event to update background music volume
    window.dispatchEvent(new CustomEvent('bgmVolumeChanged', { detail: { volume: value } }))
  }

  const handleDeveloperModeToggle = () => {
    const newValue = !settings.developerMode
    handleSettingChange('developerMode', newValue)
  }


  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-container" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">⚙️ Settings</h2>
          <button className="settings-close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="settings-content">
          {/* Volume */}
          <div className="settings-section">
            <label className="settings-label">Volume</label>
            <div className="settings-control">
              <input
                type="range"
                min="0"
                max="100"
                value={settings.volume}
                onChange={handleVolumeChange}
                className="settings-slider"
              />
              <span className="settings-value">{settings.volume}%</span>
            </div>
          </div>

          {/* BGM */}
          <div className="settings-section">
            <label className="settings-label">Background Music</label>
            <div className="settings-control">
              <input
                type="range"
                min="0"
                max="100"
                value={settings.bgm}
                onChange={handleBGMChange}
                className="settings-slider"
              />
              <span className="settings-value">{settings.bgm}%</span>
            </div>
          </div>

          {/* Graphics */}
          <div className="settings-section">
            <label className="settings-label">Graphics Quality</label>
            <div className="settings-radio-group">
              <label className="settings-radio">
                <input
                  type="radio"
                  name="graphics"
                  value="low"
                  checked={settings.graphics === 'low'}
                  onChange={(e) => handleSettingChange('graphics', e.target.value)}
                />
                Low
              </label>
              <label className="settings-radio">
                <input
                  type="radio"
                  name="graphics"
                  value="medium"
                  checked={settings.graphics === 'medium'}
                  onChange={(e) => handleSettingChange('graphics', e.target.value)}
                />
                Medium
              </label>
              <label className="settings-radio">
                <input
                  type="radio"
                  name="graphics"
                  value="high"
                  checked={settings.graphics === 'high'}
                  onChange={(e) => handleSettingChange('graphics', e.target.value)}
                />
                High
              </label>
            </div>
          </div>

          {/* Theme */}
          <div className="settings-section">
            <label className="settings-label">Theme</label>
            <div className="settings-radio-group">
              <label className="settings-radio">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={settings.theme === 'dark'}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                />
                Dark
              </label>
              <label className="settings-radio">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={settings.theme === 'light'}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                />
                Light
              </label>
            </div>
          </div>

          {/* Transaction History */}
          <div className="settings-section">
            <button 
              className="settings-action-button"
              onClick={() => setShowTransactionHistory(true)}
            >
              📜 Transaction History
            </button>
          </div>

          {/* Treasury Status Monitor */}
          <div className="settings-section">
            <label className="settings-label">Treasury Monitor</label>
            <TreasuryStatus showDetails={true} />
          </div>

          {/* Developer Mode */}
          <div className="settings-section">
            <div className="settings-toggle-group">
              <label className="settings-label">Developer Mode</label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.developerMode}
                  onChange={handleDeveloperModeToggle}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            {settings.developerMode && (
              <div className="dev-mode-panel">
                {/* Fast Timer Mode Toggle */}
                <div className="dev-option">
                  <label className="dev-option-label">
                    <input
                      type="checkbox"
                      checked={settings.fastTimerMode}
                      onChange={(e) => handleSettingChange('fastTimerMode', e.target.checked)}
                      className="dev-checkbox"
                    />
                    <span>Fast Timer Mode (200x)</span>
                  </label>
                  <div className="dev-hint">
                    25 min → 7.5 sec
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction History Modal */}
      {showTransactionHistory && (
        <TransactionHistory onClose={() => setShowTransactionHistory(false)} />
      )}
    </div>
  )
}

export default Settings

