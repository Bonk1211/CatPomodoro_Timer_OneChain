import '../styles/Timer.css'

function Controls({ isRunning, onStart, onPause, onReset }) {
  return (
    <div className="controls">
      {!isRunning ? (
        <button className="control-button start" onClick={onStart}>
          Start
        </button>
      ) : (
        <button className="control-button pause" onClick={onPause}>
          Pause
        </button>
      )}
      <button className="control-button reset" onClick={onReset}>
        Reset
      </button>
    </div>
  )
}

export default Controls

