import type { RoomId } from './base'

export type ResourceId = 'o2' | 'power' | 'water' | 'regolith'
export type PanelType = 'shift-report' | 'oxygen-mix' | 'power-routing' | 'drill-calibration'

export interface TaskDef {
  id: string
  code: string
  title: string
  /** Short imperative shown in the interact prompt. */
  verb: string
  brief: string
  room: RoomId
  consoleId: string
  panel: PanelType
  /** The resource this task restores once completed. */
  resource: ResourceId
}

export const taskDefs: TaskDef[] = [
  {
    id: 'route-power',
    code: 'TSK-01',
    title: 'Route power',
    verb: 'Route power',
    brief: 'Bring every system inside its rated band without exceeding the array budget.',
    room: 'power',
    consoleId: 'console-power',
    panel: 'power-routing',
    resource: 'power',
  },
  {
    id: 'balance-oxygen',
    code: 'TSK-02',
    title: 'Balance cabin mix',
    verb: 'Balance cabin mix',
    brief: 'Set each valve so its reading holds inside the green band for three seconds.',
    room: 'life',
    consoleId: 'console-life',
    panel: 'oxygen-mix',
    resource: 'o2',
  },
  {
    id: 'calibrate-drill',
    code: 'TSK-03',
    title: 'Calibrate regolith drill',
    verb: 'Calibrate drill',
    brief: 'Lock the torque needle inside the target zone three times.',
    room: 'isru',
    consoleId: 'console-isru',
    panel: 'drill-calibration',
    resource: 'regolith',
  },
  {
    id: 'shift-report',
    code: 'TSK-04',
    title: 'Transmit shift report',
    verb: 'File shift report',
    brief: 'Acknowledge each subsystem reading, then transmit to Gateway.',
    room: 'command',
    consoleId: 'console-command',
    panel: 'shift-report',
    resource: 'water',
  },
]

export const taskByConsole = Object.fromEntries(taskDefs.map((t) => [t.consoleId, t])) as Record<string, TaskDef>
export const taskById = Object.fromEntries(taskDefs.map((t) => [t.id, t])) as Record<string, TaskDef>
