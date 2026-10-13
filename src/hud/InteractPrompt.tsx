import { roomById } from '../data/base'
import { taskByConsole } from '../data/tasks'
import { useGame } from '../state/store'

export function InteractPrompt() {
  const consoleId = useGame((s) => s.nearbyConsoleId)
  const tasks = useGame((s) => s.tasks)
  if (!consoleId) return null

  const task = taskByConsole[consoleId]
  const done = tasks.find((t) => t.id === task.id)?.done

  return (
    <div className="prompt" data-done={done}>
      {done ? <span className="prompt-done">Done</span> : <kbd>E</kbd>}
      <span className="prompt-verb">{task.verb}</span>
      <span className="prompt-meta">
        {task.code} · {roomById[task.room].name}
      </span>
    </div>
  )
}
