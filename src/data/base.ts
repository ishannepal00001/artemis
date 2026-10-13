// Single source of truth for the base layout. The 3D scene, the collision
// check and the minimap are all derived from this file.
// World axes: x runs west (-) to east (+), z runs north (-) to south (+).

export type RoomId = 'corridor' | 'command' | 'life' | 'power' | 'isru'

export interface Rect {
  x0: number
  x1: number
  z0: number
  z1: number
}

export interface Room extends Rect {
  id: RoomId
  name: string
}

export const WALL_H = 3.2
export const WALL_T = 0.2
export const DOOR_H = 2.3
export const DOOR_W = 1.8
export const EYE_HEIGHT = 1.65
export const PLAYER_RADIUS = 0.32

export const BOUNDS: Rect = { x0: -10, x1: 10, z0: -9.5, z1: 9.5 }

export const rooms: Room[] = [
  { id: 'corridor', name: 'Corridor A', x0: -10, x1: 10, z0: -1.5, z1: 1.5 },
  { id: 'command', name: 'Command', x0: -10, x1: -1, z0: -9.5, z1: -1.5 },
  { id: 'life', name: 'Life Support', x0: 1, x1: 10, z0: -9.5, z1: -1.5 },
  { id: 'power', name: 'Power Bay', x0: -10, x1: -1, z0: 1.5, z1: 9.5 },
  { id: 'isru', name: 'ISRU Plant', x0: 1, x1: 10, z0: 1.5, z1: 9.5 },
]

export const roomById = Object.fromEntries(rooms.map((r) => [r.id, r])) as Record<RoomId, Room>

export interface Opening {
  /** Centre of the opening along the wall's axis, in world units. */
  at: number
  width: number
  kind: 'door' | 'window'
  sill?: number
  top?: number
  /** For doors: the room this door leads into from the corridor. */
  leadsTo?: RoomId
}

export interface Wall {
  /** 'x' walls run east-west at a fixed z; 'z' walls run north-south at a fixed x. */
  axis: 'x' | 'z'
  at: number
  from: number
  to: number
  openings: Opening[]
}

const door = (at: number, leadsTo: RoomId): Opening => ({ at, width: DOOR_W, kind: 'door', leadsTo })

export const walls: Wall[] = [
  // North exterior
  { axis: 'x', at: -9.5, from: -10, to: -1, openings: [{ at: -5.5, width: 4.4, kind: 'window' }] },
  { axis: 'x', at: -9.5, from: 1, to: 10, openings: [] },
  // Corridor walls
  { axis: 'x', at: -1.5, from: -10, to: 10, openings: [door(-5.5, 'command'), door(5.5, 'life')] },
  { axis: 'x', at: 1.5, from: -10, to: 10, openings: [door(-5.5, 'power'), door(5.5, 'isru')] },
  // South exterior
  { axis: 'x', at: 9.5, from: -10, to: -1, openings: [] },
  { axis: 'x', at: 9.5, from: 1, to: 10, openings: [{ at: 5.5, width: 4.4, kind: 'window' }] },
  // West exterior, with the tall corridor viewport facing Earth
  { axis: 'z', at: -10, from: -9.5, to: 9.5, openings: [{ at: 0, width: 2.4, kind: 'window', sill: 0.6, top: 2.9 }] },
  // East exterior
  { axis: 'z', at: 10, from: -9.5, to: 9.5, openings: [] },
  // Inner walls of the four rooms
  { axis: 'z', at: -1, from: -9.5, to: -1.5, openings: [] },
  { axis: 'z', at: -1, from: 1.5, to: 9.5, openings: [] },
  { axis: 'z', at: 1, from: -9.5, to: -1.5, openings: [] },
  { axis: 'z', at: 1, from: 1.5, to: 9.5, openings: [] },
]

export interface Door {
  x: number
  z: number
  axis: 'x' | 'z'
  width: number
  leadsTo?: RoomId
}

export const doors: Door[] = walls.flatMap((w) =>
  w.openings
    .filter((o) => o.kind === 'door')
    .map((o) => ({
      axis: w.axis,
      width: o.width,
      leadsTo: o.leadsTo,
      x: w.axis === 'x' ? o.at : w.at,
      z: w.axis === 'x' ? w.at : o.at,
    })),
)

export interface ConsoleDef {
  id: string
  room: RoomId
  x: number
  z: number
  /** Unit vector (x, z) the screen faces, i.e. where the operator stands. */
  facing: [number, number]
}

export const consoles: ConsoleDef[] = [
  { id: 'console-command', room: 'command', x: -1.6, z: -5.5, facing: [-1, 0] },
  { id: 'console-life', room: 'life', x: 5.5, z: -8.9, facing: [0, 1] },
  { id: 'console-power', room: 'power', x: -5.5, z: 8.9, facing: [0, -1] },
  { id: 'console-isru', room: 'isru', x: 9.4, z: 5.5, facing: [-1, 0] },
]

export const CONSOLE_W = 1.3
export const CONSOLE_D = 0.6

export type PropKind = 'table' | 'tank' | 'battery' | 'hopper'

export interface PropDef {
  kind: PropKind
  x: number
  z: number
  /** Half-extents of the footprint used for collision. */
  hx: number
  hz: number
}

export const props: PropDef[] = [
  { kind: 'table', x: -5.5, z: -5.6, hx: 1.0, hz: 1.0 },
  { kind: 'tank', x: 9.2, z: -7.4, hx: 0.5, hz: 0.5 },
  { kind: 'tank', x: 9.2, z: -5.9, hx: 0.5, hz: 0.5 },
  { kind: 'tank', x: 9.2, z: -4.4, hx: 0.5, hz: 0.5 },
  { kind: 'battery', x: -9.4, z: 4.2, hx: 0.4, hz: 0.6 },
  { kind: 'battery', x: -9.4, z: 5.7, hx: 0.4, hz: 0.6 },
  { kind: 'battery', x: -9.4, z: 7.2, hx: 0.4, hz: 0.6 },
  { kind: 'hopper', x: 3.6, z: 7.2, hx: 1.0, hz: 1.0 },
]

// Doors reach a metre into the rooms on both sides so that, once every rect
// is shrunk by the player radius, the walkable areas still overlap.
const doorRects: Rect[] = doors.map((d) =>
  d.axis === 'x'
    ? { x0: d.x - d.width / 2, x1: d.x + d.width / 2, z0: d.z - 1, z1: d.z + 1 }
    : { x0: d.x - 1, x1: d.x + 1, z0: d.z - d.width / 2, z1: d.z + d.width / 2 },
)

const walkable: Rect[] = [...rooms, ...doorRects]

const obstacles: Rect[] = [
  ...consoles.map((c) => {
    const alongX = c.facing[0] === 0
    const hx = (alongX ? CONSOLE_W : CONSOLE_D) / 2
    const hz = (alongX ? CONSOLE_D : CONSOLE_W) / 2
    return { x0: c.x - hx, x1: c.x + hx, z0: c.z - hz, z1: c.z + hz }
  }),
  ...props.map((p) => ({ x0: p.x - p.hx, x1: p.x + p.hx, z0: p.z - p.hz, z1: p.z + p.hz })),
]

export function canStand(x: number, z: number, r = PLAYER_RADIUS): boolean {
  const inside = walkable.some((w) => x >= w.x0 + r && x <= w.x1 - r && z >= w.z0 + r && z <= w.z1 - r)
  if (!inside) return false
  return !obstacles.some((o) => x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r)
}

export function roomAt(x: number, z: number): RoomId | null {
  // Rooms first so standing in a doorway resolves to the corridor last.
  for (const r of rooms) {
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.id
  }
  return null
}
