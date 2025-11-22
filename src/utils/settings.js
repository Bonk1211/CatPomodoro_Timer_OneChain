// Settings management with localStorage persistence

const SETTINGS_KEY = 'pixelCatPomodoroSettings'

const DEFAULT_SETTINGS = {
  volume: 100, // 0-100
  bgm: 100, // 0-100
  bgmMuted: false, // Background music muted state
  graphics: 'high', // 'low', 'medium', 'high'
  theme: 'dark', // 'dark', 'light'
  developerMode: false,
  fastTimerMode: false // 200x speed for testing
}

export const getSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error loading settings:', error)
  }
  return DEFAULT_SETTINGS
}

export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Error saving settings:', error)
  }
}

export const updateSetting = (key, value) => {
  const settings = getSettings()
  settings[key] = value
  saveSettings(settings)
  return settings
}

