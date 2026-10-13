import { useEffect } from 'react'
import { roomById } from '../data/base'
import { taskDefs } from '../data/tasks'
import { RESOURCE_ORDER, resourceStatus, useGame, type Status } from './store'

const TICK_MS = 1000

/** Drives the fake simulation while the player is in the base. */
export function useSimulation() {
  const running = useGame((s) => s.mode !== 'paused')
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => useGame.getState().tick(), TICK_MS)
    return () => clearInterval(id)
  }, [running])
}

/** State of the power reserve, which the base lighting follows. */
export function usePowerStatus(): Status {
  return useGame((s) => resourceStatus(s.resources.power))
}

export interface Alert {
  status: Exclude<Status, 'ok'>
  title: string
  action: string
}

/** The single most urgent problem, or null when every system is nominal. */
export function useAlert(): Alert | null {
  const resources = useGame((s) => s.resources)
  let worst: Alert | null = null
  for (const id of RESOURCE_ORDER) {
    const r = resources[id]
    const status = resourceStatus(r)
    if (status === 'ok') continue
    if (worst && !(status === 'crit' && worst.status === 'warn')) continue
    const task = taskDefs.find((t) => t.resource === id)!
    worst = {
      status,
      title: id === 'regolith' ? 'Regolith output stalled' : `${r.label} reserve ${status === 'crit' ? 'critical' : 'low'}`,
      action: `${task.verb} in ${roomById[task.room].name}`,
    }
  }
  return worst
}
