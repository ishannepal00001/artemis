import { resetPose } from '../state/pose'
import { useGame } from '../state/store'

const CONTROLS: [string, string][] = [
  ['W A S D', 'Move'],
  ['Mouse', 'Look'],
  ['Shift', 'Sprint'],
  ['E', 'Use console'],
  ['Esc', 'Pause'],
]

export function PauseOverlay() {
  const paused = useGame((s) => s.mode === 'paused')
  const started = useGame((s) => s.started)
  const enter = useGame((s) => s.enter)
  const reset = useGame((s) => s.reset)

  if (!paused) return null

  return (
    <div className="overlay">
      <div className="overlay-card">
        <div className="overlay-eyebrow">{started ? 'Paused' : 'Shift 3 · Sol 042'}</div>
        <h1>Artemis Base Camp</h1>
        <p className="overlay-lede">
          You are <strong>Crew</strong>, assigned as Engineer. Keep oxygen, power, water and regolith output on target
          before the shift ends.
        </p>
        <ul className="overlay-controls">
          {CONTROLS.map(([key, label]) => (
            <li key={key}>
              <kbd>{key}</kbd>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <div className="overlay-actions">
          <button className="btn btn-primary" onClick={enter} autoFocus>
            {started ? 'Resume' : 'Enter base'}
          </button>
          {started && (
            <button
              className="btn"
              onClick={() => {
                reset()
                resetPose()
              }}
            >
              Restart shift
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
