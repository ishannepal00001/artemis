import { useEffect } from 'react'
import { taskByConsole } from './data/tasks'
import { Hud } from './hud/Hud'
import { PauseOverlay } from './hud/PauseOverlay'
import { Scene } from './scene/Scene'
import { isLocked, requestLock } from './state/pointer'
import { useSimulation } from './state/sim'
import { useGame } from './state/store'
import { TaskPanel } from './tasks/TaskPanel'

function useGlobalControls() {
  useEffect(() => {
    let wasLocked = false

    const onLockChange = () => {
      const locked = isLocked()
      const game = useGame.getState()
      game.setLocked(locked)
      // Esc is swallowed by the browser while locked, so losing the lock is the pause signal.
      if (!locked && wasLocked && game.mode === 'playing') game.pause()
      wasLocked = locked
    }

    const onKey = (e: KeyboardEvent) => {
      const game = useGame.getState()
      if (e.code === 'KeyE' && game.mode === 'playing' && game.nearbyConsoleId) {
        const task = taskByConsole[game.nearbyConsoleId]
        const done = game.tasks.find((t) => t.id === task.id)?.done
        if (!done) game.openTask(task.id)
      } else if (e.code === 'Escape') {
        if (game.mode === 'task') game.closeTask()
        else if (game.mode === 'playing') game.pause()
      }
    }

    document.addEventListener('pointerlockchange', onLockChange)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange)
      window.removeEventListener('keydown', onKey)
    }
  }, [])
}

export default function App() {
  useSimulation()
  useGlobalControls()

  return (
    <div
      className="app"
      onPointerDown={() => {
        if (useGame.getState().mode === 'playing') requestLock()
      }}
    >
      <Scene />
      <Hud />
      <TaskPanel />
      <PauseOverlay />
    </div>
  )
}
