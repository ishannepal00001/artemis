import { useState } from 'react'
import type { PanelProps } from './TaskPanel'

const BUDGET = 100
const SLIDER_MAX = 60

const SYSTEMS = [
  { id: 'life', label: 'Life support', min: 28, max: 36, start: 12 },
  { id: 'isru', label: 'ISRU plant', min: 30, max: 40, start: 55 },
  { id: 'thermal', label: 'Thermal control', min: 14, max: 22, start: 30 },
  { id: 'comms', label: 'Comms & nav', min: 8, max: 14, start: 3 },
]

export function PowerRouting({ onComplete }: PanelProps) {
  const [values, setValues] = useState(() => SYSTEMS.map((s) => s.start))
  const total = values.reduce((a, b) => a + b, 0)
  const over = total > BUDGET
  const inBand = SYSTEMS.map((s, i) => values[i] >= s.min && values[i] <= s.max)
  const ready = !over && inBand.every(Boolean)

  return (
    <div className="routing">
      <ul className="routing-rows">
        {SYSTEMS.map((s, i) => (
          <li key={s.id} className="routing-row" data-ok={inBand[i]}>
            <label htmlFor={`route-${s.id}`}>{s.label}</label>
            <div className="slider">
              <div className="slider-track">
                <div className="slider-fill" style={{ width: `${(values[i] / SLIDER_MAX) * 100}%` }} />
                <div
                  className="slider-band"
                  style={{ left: `${(s.min / SLIDER_MAX) * 100}%`, width: `${((s.max - s.min) / SLIDER_MAX) * 100}%` }}
                />
              </div>
              <input
                id={`route-${s.id}`}
                type="range"
                min={0}
                max={SLIDER_MAX}
                value={values[i]}
                onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? Number(e.target.value) : x)))}
              />
            </div>
            <span className="num routing-value">{values[i]} kW</span>
            <span className="routing-band num">
              {s.min}–{s.max}
            </span>
          </li>
        ))}
      </ul>

      <div className="routing-total" data-over={over}>
        <div className="routing-total-head">
          <span>Array budget</span>
          <span className="num">
            {total} / {BUDGET} kW
          </span>
        </div>
        <div className="bar">
          <div className="bar-fill" style={{ width: `${Math.min(100, (total / BUDGET) * 100)}%` }} />
        </div>
      </div>

      <div className="task-footer">
        <span className="task-hint">
          {over ? 'Over budget. Shed load before committing.' : ready ? 'All systems within rated band.' : 'Move each slider into its shaded band.'}
        </span>
        <button className="btn btn-primary" disabled={!ready} onClick={onComplete}>
          Commit routing
        </button>
      </div>
    </div>
  )
}
