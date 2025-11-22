import { useState, useEffect, useRef } from 'react'
import PhaseIndicator from './PhaseIndicator'
import Controls from './Controls'
import { getSettings } from '../utils/settings'
import '../styles/Timer.css'

function Timer({ initialSeconds, onComplete, phase = null, autoStart = false, onAutoStartComplete }) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    setSeconds(initialSeconds)
    if (autoStart) {
      setIsRunning(true)
      if (onAutoStartComplete) {
        onAutoStartComplete()
      }
    }
  }, [initialSeconds, autoStart, onAutoStartComplete])

  useEffect(() => {
    // Update audio volume when settings change
    if (audioRef.current) {
      const settings = getSettings()
      audioRef.current.volume = settings.volume / 100
    }
  }, [])

  useEffect(() => {
    if (isRunning && seconds > 0) {
      // Check if fast timer mode is enabled (200x speed)
      const settings = getSettings()
      const interval = settings.fastTimerMode ? 1000 / 200 : 1000 // 5ms for fast mode, 1000ms for normal
      
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            if (audioRef.current) {
              audioRef.current.play().catch(console.error)
            }
            if (onComplete) {
              setTimeout(() => onComplete(), 100)
            }
            return 0
          }
          return prev - 1
        })
      }, interval)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, seconds, onComplete])

  const handleStart = () => {
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setSeconds(initialSeconds)
  }

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="timer-container">
      <audio ref={audioRef} src="/audio/kitten-meow.mp3" preload="auto" />
      {phase && <PhaseIndicator phase={phase} />}
      <div className="timer-display">{formatTime(seconds)}</div>
      <Controls
        isRunning={isRunning}
        onStart={handleStart}
        onPause={handlePause}
        onReset={handleReset}
      />
    </div>
  )
}

export default Timer

