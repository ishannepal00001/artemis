import { create } from 'zustand'
import type { RoomId } from '../data/base'
import { taskById, taskDefs, type ResourceId } from '../data/tasks'
import { releaseLock, requestLock } from './pointer'

export type Status = 'ok' | 'warn' | 'crit'
export type Mode = 'paused' | 'playing' | 'task'

export interface Resource {
  id: ResourceId
  label: string
  unit: string
  value: number
  capacity: number
  /** Change per tick (one tick is one mission minute). */
  rate: number
  /** Rate applied once the linked task is completed. */
  restoredRate: number
  /** Amount added immediately when the linked task is completed. */
  boost: number
  decimals: number
  history: number[]
}

export interface TaskState {
  id: string
  done: boolean
}

const HISTORY = 32
const WARN_AT = 0.3
const CRIT_AT = 0.15
const FLOOR = 0.08

const seedHistory = (value: number, rate: number) =>
  Array.from({ length: HISTORY }, (_, i) => value - rate * (HISTORY - 1 - i))

const makeResource = (r: Omit<Resource, 'history'>): Resource => ({ ...r, history: seedHistory(r.value, r.rate) })

const initialResources = (): Record<ResourceId, Resource> => ({
  o2: makeResource({
    id: 'o2', label: 'Oxygen', unit: 'kg', value: 228, capacity: 600,
    rate: -1.2, restoredRate: 1.6, boost: 150, decimals: 0,
  }),
  power: makeResource({
    id: 'power', label: 'Power', unit: 'kWh', value: 109, capacity: 320,
    rate: -1.3, restoredRate: 1.1, boost: 90, decimals: 0,
  }),
  water: makeResource({
    id: 'water', label: 'Water', unit: 'L', value: 1340, capacity: 2000,
    rate: -1.5, restoredRate: 2.4, boost: 220, decimals: 0,
  }),
  regolith: makeResource({
    id: 'regolith', label: 'Regolith output', unit: 't', value: 6.4, capacity: 10,
    rate: 0, restoredRate: 0.02, boost: 0.3, decimals: 2,
  }),
})

export const RESOURCE_ORDER: ResourceId[] = ['o2', 'power', 'water', 'regolith']

export function resourceStatus(r: Resource): Status {
  // Output is a quota that should be climbing, so a stalled drill is the warning.
  if (r.id === 'regolith') return r.rate <= 0 ? 'warn' : 'ok'
  const fraction = r.value / r.capacity
  if (fraction <= CRIT_AT) return 'crit'
  if (fraction <= WARN_AT) return 'warn'
  return 'ok'
}

interface GameState {
  mode: Mode
  started: boolean
  locked: boolean
  /** Mission minutes since the start of the sol. */
  clock: number
  room: RoomId
  nearbyConsoleId: string | null
  activeTaskId: string | null
  resources: Record<ResourceId, Resource>
  tasks: TaskState[]

  tick: () => void
  enter: () => void
  pause: () => void
  setLocked: (locked: boolean) => void
  setRoom: (room: RoomId) => void
  setNearby: (id: string | null) => void
  openTask: (id: string) => void
  closeTask: () => void
  completeTask: (id: string) => void
  reset: () => void
}

const initial = () => ({
  clock: 14 * 60 + 22,
  resources: initialResources(),
  tasks: taskDefs.map((t) => ({ id: t.id, done: false })),
})

export const useGame = create<GameState>((set, get) => ({
  mode: 'paused',
  started: false,
  locked: false,
  room: 'corridor',
  nearbyConsoleId: null,
  activeTaskId: null,
  ...initial(),

  tick: () =>
    set((s) => {
      const resources = { ...s.resources }
      for (const id of RESOURCE_ORDER) {
        const r = resources[id]
        const jitter = 1 + (Math.random() - 0.5) * 0.3
        const value = Math.min(r.capacity, Math.max(r.capacity * FLOOR, r.value + r.rate * jitter))
        resources[id] = { ...r, value, history: [...r.history.slice(1), value] }
      }
      return { resources, clock: s.clock + 1 }
    }),

  enter: () => {
    set({ mode: 'playing', started: true })
    requestLock()
  },

  pause: () => set({ mode: 'paused', nearbyConsoleId: null }),

  setLocked: (locked) => set({ locked }),
  setRoom: (room) => set({ room }),
  setNearby: (nearbyConsoleId) => set({ nearbyConsoleId }),

  openTask: (id) => {
    set({ mode: 'task', activeTaskId: id })
    releaseLock()
  },

  closeTask: () => {
    set({ mode: 'playing', activeTaskId: null })
    requestLock()
  },

  completeTask: (id) => {
    const def = taskById[id]
    set((s) => {
      const r = s.resources[def.resource]
      const value = Math.min(r.capacity, r.value + r.boost)
      return {
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: true } : t)),
        resources: { ...s.resources, [def.resource]: { ...r, value, rate: r.restoredRate } },
      }
    })
    get().closeTask()
  },

  reset: () => set({ ...initial(), nearbyConsoleId: null, activeTaskId: null }),
}))
