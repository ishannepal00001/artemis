import { useCallback, useEffect, useRef, useState } from 'react'
import type { PanelProps } from './TaskPanel'

const STAGES = [
  { width: 0.22, speed: 0.55 },
  { width: 0.16, speed: 0.75 },
  { width: 0.11, speed: 0.95 },
]

const randomCentre = (width: number) => width / 2 + 0.08 + Math.random() * (1 - width - 0.16)

export function DrillCalibration({ onComplete }: PanelProps) {
  const [stage, setStage] = useState(0)
  const [centre, setCentre] = useState(() => randomCentre(STAGES[0].width))
  const [miss, setMiss] = useState(0)
  const needle = useRef<HTMLDivElement>(null)
  const position = useRef(0)
  const direction = useRef(1)

  const done = stage >= STAGES.length
  const current = STAGES[Math.min(stage, STAGES.length - 1)]

  // The needle moves every frame, so it is positioned directly rather than through state.
  useEffect(() => {
    if (done) return
    let frame = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      position.current += direction.current * current.speed * dt
      if (position.current >= 1) {
        position.current = 1
        direction.current = -1
      } else if (position.current <= 0) {
        position.current = 0
        direction.current = 1
      }
      if (needle.current) needle.current.style.left = `${position.current * 100}%`
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [current.speed, done])

  const lock = useCallback(() => {
    if (done) return
    const hit = Math.abs(position.current - centre) <= current.width / 2
    if (!hit) {
      setMiss((m) => m + 1)
      return
    }
    const next = stage + 1
    setStage(next)
    if (next >= STAGES.length) onComplete()
    else setCentre(randomCentre(STAGES[next].width))
  }, [centre, current.width, done, onComplete, stage])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      e.preventDefault()
      lock()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lock])

  return (
    <div className="drill">
      <div className="drill-pips" aria-label={`${Math.min(stage, STAGES.length)} of ${STAGES.length} locks`}>
        {STAGES.map((_, i) => (
          <span key={i} data-done={i < stage} data-current={i === stage} />
        ))}
        <span className="drill-pips-label">
          Lock {Math.min(stage + 1, STAGES.length)} of {STAGES.length}
        </span>
      </div>

      {/* Remounting on a miss replays the shake animation. */}
      <div className="drill-track" key={miss} data-miss={miss > 0}>
        <div className="drill-scale" />
        <div
          className="drill-zone"
          style={{ left: `${(centre - current.width / 2) * 100}%`, width: `${current.width * 100}%` }}
        />
        <div className="drill-needle" ref={needle} />
      </div>
      <div className="drill-axis num">
        <span>0</span>
        <span>Torque, N·m</span>
        <span>400</span>
      </div>

      <div className="task-footer">
        <span className="task-hint">Press when the needle is inside the highlighted zone.</span>
        <button
          className="btn btn-primary"
          disabled={done}
          onClick={(e) => {
            // Drop focus so Space keeps going to the window handler only.
            e.currentTarget.blur()
            lock()
          }}
        >
          Lock <kbd>Space</kbd>
        </button>
      </div>
    </div>
  )
}
