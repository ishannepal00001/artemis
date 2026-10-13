import { roomById } from '../data/base'
import { taskById } from '../data/tasks'
import { useGame } from '../state/store'

export function TaskList() {
  const tasks = useGame((s) => s.tasks)
  const nearby = useGame((s) => s.nearbyConsoleId)
  const doneCount = tasks.filter((t) => t.done).length

  return (
    <section className="panel tasks" aria-label="Crew tasks">
      <div className="tasks-head">
        <h2 className="panel-title">Crew tasks</h2>
        <span className="num tasks-count">
          {doneCount}/{tasks.length}
        </span>
      </div>
      <div className="segments" aria-hidden="true">
        {tasks.map((t) => (
          <span key={t.id} data-done={t.done} />
        ))}
      </div>
      <ul>
        {tasks.map((t) => {
          const def = taskById[t.id]
          return (
            <li key={t.id} className="task" data-done={t.done} data-near={nearby === def.consoleId}>
              <span className="task-check" aria-hidden="true">
                {t.done && (
                  <svg viewBox="0 0 12 12">
                    <path d="m2.5 6.3 2.4 2.4 4.6-5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="task-title">{def.title}</span>
              <span className="task-room">{roomById[def.room].name}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
