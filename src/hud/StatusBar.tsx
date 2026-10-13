import { roomById } from '../data/base'
import { useAlert } from '../state/sim'
import { useGame } from '../state/store'

const SOL = 42

export function formatClock(minutes: number) {
  const m = Math.floor(minutes) % (24 * 60)
  const hh = String(Math.floor(m / 60)).padStart(2, '0')
  const mm = String(m % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export function StatusBar() {
  const clock = useGame((s) => s.clock)
  const room = useGame((s) => s.room)

  return (
    <header className="panel status">
      <div className="status-patch" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 23 16 8l7 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M5 20c7-6 15-8 23-7" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <div className="status-main">
        <div className="status-title">Artemis Base Camp</div>
        <div className="status-clock">
          <span>SOL {String(SOL).padStart(3, '0')}</span>
          <span className="sep" />
          <span>{formatClock(clock)} LST</span>
        </div>
      </div>
      <div className="status-chips">
        <span className="chip chip-role">Crew · Engineer</span>
        <span className="chip">{roomById[room].name}</span>
      </div>
    </header>
  )
}

export function AlertBanner() {
  const alert = useAlert()
  const allDone = useGame((s) => s.tasks.every((t) => t.done))

  if (!alert) {
    if (!allDone) return null
    return (
      <div className="alert" data-status="ok" role="status">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m4 10.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div className="alert-title">All systems nominal</div>
          <div className="alert-action">Shift tasks complete</div>
        </div>
      </div>
    )
  }

  return (
    <div className="alert" data-status={alert.status} role="alert">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 2.5 18.5 17h-17Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10 8v4.2M10 14.4v.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
      <div>
        <div className="alert-title">{alert.title}</div>
        <div className="alert-action">{alert.action}</div>
      </div>
    </div>
  )
}
