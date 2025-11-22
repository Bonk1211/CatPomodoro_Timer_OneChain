import '../styles/Timer.css'

function PhaseIndicator({ phase }) {
  const phaseNames = {
    work: 'Work',
    shortBreak: 'Short Break',
    longBreak: 'Long Break'
  }

  return (
    <div className="phase-indicator">
      <span className="phase-label">{phaseNames[phase] || 'Custom'}</span>
    </div>
  )
}

export default PhaseIndicator

