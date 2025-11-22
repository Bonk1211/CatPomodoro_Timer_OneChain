import { useState, useRef } from 'react'
import Timer from './Timer'
import { incrementCompletedSessions } from '../utils/gameState'
import { useCompleteSession } from '../hooks/useGameTransactions'
import { getSettings } from '../utils/settings'

const PHASES = {
  work: { duration: 25 * 60, name: 'work' },
  shortBreak: { duration: 5 * 60, name: 'shortBreak' },
  longBreak: { duration: 15 * 60, name: 'longBreak' }
}

const PHASE_SEQUENCE = [
  PHASES.work,        // 1. Work (25 min) → Earn 1 OCT
  PHASES.shortBreak,  // 2. Short Break (5 min)
  PHASES.work,        // 3. Work (25 min) → Earn 1 OCT
  PHASES.shortBreak,  // 4. Short Break (5 min)
  PHASES.work,        // 5. Work (25 min) → Earn 1 OCT
  PHASES.shortBreak,  // 6. Short Break (5 min)
  PHASES.work,        // 7. Work (25 min) → Earn 1 OCT
  PHASES.shortBreak,  // 8. Short Break (5 min)
  PHASES.work,        // 9. Work (25 min) → Earn 1 OCT
  PHASES.longBreak    // 10. Long Break (15 min)
]

function PomodoroTimer({ onWorkComplete }) {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [currentPhase, setCurrentPhase] = useState(PHASE_SEQUENCE[0])
  const [autoStart, setAutoStart] = useState(false)
  const { completeSession } = useCompleteSession()
  const meowAudioRef = useRef(null)

  const handleComplete = () => {
    // Play meow sound for ALL session completions (work, shortBreak, longBreak)
    // Acts as notification: timer ended, claim reward, or next phase starting
    if (meowAudioRef.current) {
      const settings = getSettings()
      meowAudioRef.current.volume = settings.volume / 100
      meowAudioRef.current.play().catch(err => {
        console.log('Meow sound play prevented:', err)
      })
    }
    
    if (currentPhase.name === 'work') {
      incrementCompletedSessions()
      
      if (onWorkComplete) {
        onWorkComplete()
      }
      
      // Get reward from treasury
      completeSession()
    }
    
    // Move to next phase
    const nextIndex = (phaseIndex + 1) % PHASE_SEQUENCE.length
    setPhaseIndex(nextIndex)
    setCurrentPhase(PHASE_SEQUENCE[nextIndex])
    setAutoStart(true)
  }

  return (
    <div className="pomodoro-timer-container">
      <Timer
        key={`${currentPhase.name}-${phaseIndex}`}
        initialSeconds={currentPhase.duration}
        phase={currentPhase.name}
        onComplete={handleComplete}
        autoStart={autoStart}
        onAutoStartComplete={() => setAutoStart(false)}
      />
      <audio
        ref={meowAudioRef}
        src="/audio/kitten-meow.mp3"
        preload="auto"
      />
    </div>
  )
}

export default PomodoroTimer
