import { useEffect, useRef, useState } from 'react'
import type { PanelProps } from './TaskPanel'

const HOLD_MS = 3000
const STEP_MS = 50
const BAND_HALF = 0.075
const WOBBLE = 0.03

// Everything is simulated in a 0..1 range and mapped to display units.
const CHANNELS = [
  { id: 'o2', label: 'O₂ partial pressure', unit: 'kPa', lo: 14, hi: 28, target: 0.52, start: 0.2, speed: 1.3 },
  { id: 'co2', label: 'CO₂ scrubber flow', unit: 'L/min', lo: 20, hi: 60, target: 0.64, start: 0.9, speed: 0.9 },
  { id: 'cabin', label: 'Cabin pressure', unit: 'kPa', lo: 56, hi: 84, target: 0.4, start: 0.75, speed: 1.7 },
]

export function OxygenMix({ onComplete }: PanelProps) {
  const [valves, setValves] = useState(() => CHANNELS.map((c) => c.start))
  const [time, setTime] = useState(0)
  const [held, setHeld] = useState(0)
  const finished = useRef(false)

  const readings = CHANNELS.map((c, i) =>
    Math.max(0, Math.min(1, valves[i] + Math.sin(time * c.speed + i * 2) * WOBBLE)),
  )
  const inBand = CHANNELS.map((c, i) => Math.abs(readings[i] - c.target) <= BAND_HALF)
  const stable = inBand.every(Boolean)

  useEffect(() => {
    const id = setInterval(() => setTime((t) => t + STEP_MS / 1000), STEP_MS)
    return () => clearInterval(id)
  }, [])

  // Advance the hold timer once per simulation step, resetting if any reading drifts out.
  useEffect(() => {
    if (finished.current) return
    setHeld((h) => (stable ? Math.min(HOLD_MS, h + STEP_MS) : 0))
  }, [time, stable])

  useEffect(() => {
    if (held >= HOLD_MS && !finished.current) {
      finished.current = true
      onComplete()
    }
  }, [held, onComplete])

  return (
    <div className="mix">
      <div className="mix-gauges">
        {CHANNELS.map((c, i) => {
          const display = c.lo + readings[i] * (c.hi - c.lo)
          return (
            <div key={c.id} className="gauge" data-ok={inBand[i]}>
              <div className="gauge-label">{c.label}</div>
              <div className="gauge-column">
                <div
                  className="gauge-band"
                  style={{ bottom: `${(c.target - BAND_HALF) * 100}%`, height: `${BAND_HALF * 200}%` }}
                />
                <div className="gauge-needle" style={{ bottom: `${readings[i] * 100}%` }} />
              </div>
              <div className="gauge-reading">
                <span className="num">{display.toFixed(1)}</span> {c.unit}
              </div>
              <input
                type="range"
                className="plain-range"
                aria-label={`${c.label} valve`}
                min={0}
                max={1}
                step={0.005}
                value={valves[i]}
                onChange={(e) => setValves((v) => v.map((x, j) => (j === i ? Number(e.target.value) : x)))}
              />
            </div>
          )
        })}
      </div>

      <div className="task-footer">
        <div className="hold" data-active={stable}>
          <div className="hold-head">
            <span>{stable ? 'Holding mix' : 'Mix unstable'}</span>
            <span className="num">{(held / 1000).toFixed(1)} / {(HOLD_MS / 1000).toFixed(1)} s</span>
          </div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${(held / HOLD_MS) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
