import { useEffect, useState } from 'react'
import { RESOURCE_ORDER, resourceStatus, useGame } from '../state/store'
import type { PanelProps } from './TaskPanel'

const TRANSMIT_MS = 1400
const STATUS_LABEL = { ok: 'Nominal', warn: 'Caution', crit: 'Critical' }

export function ShiftReport({ onComplete }: PanelProps) {
  const resources = useGame((s) => s.resources)
  const [acked, setAcked] = useState<Record<string, boolean>>({})
  const [sending, setSending] = useState(false)
  const ready = RESOURCE_ORDER.every((id) => acked[id])

  useEffect(() => {
    if (!sending) return
    const id = setTimeout(onComplete, TRANSMIT_MS)
    return () => clearTimeout(id)
  }, [sending, onComplete])

  return (
    <div className="report">
      <table className="report-table">
        <thead>
          <tr>
            <th>Subsystem</th>
            <th>Reading</th>
            <th>State</th>
            <th>Acknowledge</th>
          </tr>
        </thead>
        <tbody>
          {RESOURCE_ORDER.map((id) => {
            const r = resources[id]
            const status = resourceStatus(r)
            return (
              <tr key={id} data-status={status}>
                <td>{r.label}</td>
                <td className="num">
                  {r.value.toFixed(r.decimals)} {r.unit}
                </td>
                <td>
                  <span className="state-tag">{STATUS_LABEL[status]}</span>
                </td>
                <td>
                  <label className="ack">
                    <input
                      type="checkbox"
                      checked={!!acked[id]}
                      disabled={sending}
                      onChange={(e) => setAcked((a) => ({ ...a, [id]: e.target.checked }))}
                    />
                    <span>{acked[id] ? 'Logged' : 'Confirm'}</span>
                  </label>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="task-footer">
        {sending ? (
          <div className="hold" data-active="true">
            <div className="hold-head">
              <span>Transmitting to Gateway</span>
            </div>
            <div className="bar">
              <div className="bar-fill bar-fill-sweep" style={{ animationDuration: `${TRANSMIT_MS}ms` }} />
            </div>
          </div>
        ) : (
          <>
            <span className="task-hint">
              {ready ? 'All readings acknowledged.' : 'Confirm each reading before transmitting.'}
            </span>
            <button className="btn btn-primary" disabled={!ready} onClick={() => setSending(true)}>
              Transmit report
            </button>
          </>
        )}
      </div>
    </div>
  )
}
