import { useState } from 'react'
import Timer from './Timer'

function CustomTimer() {
  const [minutes, setMinutes] = useState(25)
  const [startTimer, setStartTimer] = useState(false)
  const [key, setKey] = useState(0)

  const handleStart = () => {
    if (minutes > 0) {
      setStartTimer(true)
      setKey((prev) => prev + 1)
    }
  }

  const handleInputChange = (e) => {
    const value = parseInt(e.target.value) || 0
    if (value >= 0 && value <= 999) {
      setMinutes(value)
      setStartTimer(false)
    }
  }

  const handleComplete = () => {
    setStartTimer(false)
  }

  return (
    <div className="custom-timer-container">
      {!startTimer ? (
        <div className="custom-timer-setup">
          <label className="custom-timer-label">Minutes:</label>
          <input
            type="number"
            className="custom-timer-input"
            value={minutes}
            onChange={handleInputChange}
            min="1"
            max="999"
          />
          <button className="control-button start" onClick={handleStart}>
            Start Timer
          </button>
        </div>
      ) : (
        <Timer
          key={key}
          initialSeconds={minutes * 60}
          onComplete={handleComplete}
        />
      )}
    </div>
  )
}

export default CustomTimer

