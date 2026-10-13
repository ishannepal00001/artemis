import { RESOURCE_ORDER, resourceStatus, useGame, type Resource } from '../state/store'

const SPARK_W = 72
const SPARK_H = 20

function Sparkline({ values, capacity }: { values: number[]; capacity: number }) {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  // Keep a minimum span so a flat line does not get stretched into noise.
  const span = Math.max(hi - lo, capacity * 0.04)
  const mid = (hi + lo) / 2
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * SPARK_W
      const y = SPARK_H / 2 - ((v - mid) / span) * (SPARK_H - 4)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function Meter({ r }: { r: Resource }) {
  const status = resourceStatus(r)
  const fraction = r.value / r.capacity
  const trend = r.rate > 0 ? 'up' : r.rate < 0 ? 'down' : 'flat'
  const rate = Math.abs(r.rate).toFixed(r.decimals === 0 ? 1 : 2)

  return (
    <li className="meter" data-status={status}>
      <div className="meter-head">
        <span className="meter-label">{r.label}</span>
        <span className="meter-rate" data-trend={trend}>
          {trend === 'flat' ? 'Stalled' : `${trend === 'up' ? '+' : '−'}${rate} ${r.unit}/min`}
        </span>
      </div>
      <div className="meter-body">
        <div className="meter-value">
          <span className="num">{r.value.toFixed(r.decimals)}</span>
          <span className="meter-cap">
            / {r.capacity} {r.unit}
          </span>
        </div>
        <Sparkline values={r.history} capacity={r.capacity} />
      </div>
      <div
        className="bar"
        role="meter"
        aria-label={r.label}
        aria-valuemin={0}
        aria-valuemax={r.capacity}
        aria-valuenow={Math.round(r.value)}
      >
        <div className="bar-fill" style={{ width: `${fraction * 100}%` }} />
        {r.id !== 'regolith' && <div className="bar-mark" style={{ left: '30%' }} />}
      </div>
    </li>
  )
}

export function ResourceMeters() {
  const resources = useGame((s) => s.resources)
  return (
    <section className="panel meters" aria-label="Base resources">
      <h2 className="panel-title">Base resources</h2>
      <ul>
        {RESOURCE_ORDER.map((id) => (
          <Meter key={id} r={resources[id]} />
        ))}
      </ul>
    </section>
  )
}
