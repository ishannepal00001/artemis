import { useEffect, useState, type ComponentType } from 'react'
import { roomById } from '../data/base'
import { taskById, type PanelType } from '../data/tasks'
import { useGame } from '../state/store'
import { DrillCalibration } from './DrillCalibration'
import { OxygenMix } from './OxygenMix'
import { PowerRouting } from './PowerRouting'
import { ShiftReport } from './ShiftReport'

export interface PanelProps {
  onComplete: () => void
}

const PANELS: Record<PanelType, ComponentType<PanelProps>> = {
  'power-routing': PowerRouting,
  'oxygen-mix': OxygenMix,
  'drill-calibration': DrillCalibration,
  'shift-report': ShiftReport,
}

const COMPLETE_HOLD_MS = 1100

export function TaskPanel() {
  const activeId = useGame((s) => s.activeTaskId)
  if (!activeId) return null
  // Keyed so each opening starts from a fresh panel state.
  return <ActivePanel key={activeId} taskId={activeId} />
}

function ActivePanel({ taskId }: { taskId: string }) {
  const task = taskById[taskId]
  const closeTask = useGame((s) => s.closeTask)
  const completeTask = useGame((s) => s.completeTask)
  const [complete, setComplete] = useState(false)

  // Hold on the success state briefly before handing control back.
  useEffect(() => {
    if (!complete) return
    const id = setTimeout(() => completeTask(taskId), COMPLETE_HOLD_MS)
    return () => clearTimeout(id)
  }, [complete, completeTask, taskId])

  const Body = PANELS[task.panel]

  return (
    <div className="task-backdrop">
      <section className="task-panel" role="dialog" aria-modal="true" aria-labelledby="task-title" data-complete={complete}>
        <header className="task-header">
          <div>
            <div className="task-code">
              {task.code} · {roomById[task.room].name}
            </div>
            <h2 id="task-title">{task.title}</h2>
          </div>
          <button className="btn btn-ghost" onClick={closeTask} disabled={complete}>
            Close <kbd>Esc</kbd>
          </button>
        </header>
        <p className="task-brief">{task.brief}</p>
        <div className="task-body">
          <Body onComplete={() => setComplete(true)} />
        </div>
        {complete && (
          <div className="task-complete" role="status">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d="m14 24.5 7 7 13.5-15" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Task complete</span>
          </div>
        )}
      </section>
    </div>
  )
}
