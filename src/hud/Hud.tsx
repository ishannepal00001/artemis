import { useGame } from '../state/store'
import { AlertBanner, StatusBar } from './StatusBar'
import { Crosshair } from './Crosshair'
import { InteractPrompt } from './InteractPrompt'
import { Minimap } from './Minimap'
import { ResourceMeters } from './ResourceMeters'
import { TaskList } from './TaskList'

const CONTROLS: [string, string][] = [
  ['WASD', 'Move'],
  ['Shift', 'Sprint'],
  ['E', 'Use'],
  ['Esc', 'Pause'],
]

export function Hud() {
  const mode = useGame((s) => s.mode)
  const locked = useGame((s) => s.locked)
  const playing = mode === 'playing'

  return (
    <div className="hud" data-mode={mode}>
      <div className="hud-top-left">
        <StatusBar />
        <TaskList />
      </div>

      <div className="hud-top-center">
        <AlertBanner />
      </div>

      <div className="hud-top-right">
        <ResourceMeters />
      </div>

      <div className="hud-bottom-left">
        <ul className="controls">
          {CONTROLS.map(([key, label]) => (
            <li key={key}>
              <kbd>{key}</kbd>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="hud-bottom-center">
        {playing && <InteractPrompt />}
        {playing && !locked && <div className="capture-hint">Click to capture the mouse, or look with the arrow keys</div>}
      </div>

      <div className="hud-bottom-right">
        <Minimap />
      </div>

      {playing && <Crosshair />}
    </div>
  )
}
