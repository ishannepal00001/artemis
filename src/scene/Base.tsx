import { Suspense, useMemo } from 'react'
import { Text } from '@react-three/drei'
import signFont from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff?url'
import {
  BOUNDS,
  DOOR_H,
  WALL_H,
  WALL_T,
  consoles,
  doors,
  props,
  roomAt,
  roomById,
  rooms,
  walls,
  type PropDef,
  type Wall,
} from '../data/base'
import { usePowerStatus } from '../state/sim'
import { Console } from './Console'
import { Kit, type Vec3 } from './kit'
import { EMERGENCY_COLOR, LAMP_COLOR, POWER_LEVEL } from './Lighting'
import { NO_SHADOW, UV_TILE, getMaterials, type Mat } from './materials'

type BaseKit = Kit<Mat>

const TRIM = 0.09
const SKIRTING_H = 0.14

/** Ceiling light strips, all running along x. */
const STRIPS: { x: number; z: number; length: number }[] = rooms.flatMap((r) => {
  const cx = (r.x0 + r.x1) / 2
  const cz = (r.z0 + r.z1) / 2
  return r.id === 'corridor'
    ? [-6.5, 0, 6.5].map((x) => ({ x, z: cz, length: 3.6 }))
    : [-1.8, 1.8].map((dz) => ({ x: cx, z: cz + dz, length: 5.4 }))
})

/** Cheap stable pseudo-random in 0..1, for varying details without a generator. */
const pick = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** Helpers for placing parts relative to a wall, on the side given by `side` (+1 or -1). */
function wallFrame(w: Wall, side: number) {
  const face = w.at + side * (WALL_T / 2)
  return {
    /** Position at distance u along the wall, height y, and `out` metres off the wall face. */
    at: (u: number, y: number, out: number): Vec3 => (w.axis === 'x' ? [u, y, face + side * out] : [face + side * out, y, u]),
    /** Box size from length along the wall, height, and depth off the wall. */
    size: (length: number, height: number, depth: number): Vec3 =>
      w.axis === 'x' ? [length, height, depth] : [depth, height, length],
    /** Rotation that lays a cylinder along the wall. */
    along: (w.axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]) as Vec3,
    /** Rotation that points a cylinder out of the wall. */
    outward: (w.axis === 'x' ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2]) as Vec3,
  }
}

type Frame = ReturnType<typeof wallFrame>

/** Splits a wall into solid, glass and trim parts around its openings. */
function buildWall(kit: BaseKit, w: Wall) {
  const box = (mat: Mat, u0: number, u1: number, y0: number, y1: number, thickness: number) => {
    const u = (u0 + u1) / 2
    const y = (y0 + y1) / 2
    if (w.axis === 'x') kit.box(mat, [u1 - u0, y1 - y0, thickness], [u, y, w.at])
    else kit.box(mat, [thickness, y1 - y0, u1 - u0], [w.at, y, u])
  }
  const skirting = (u0: number, u1: number) => box('trim', u0, u1, 0, SKIRTING_H, WALL_T + 0.03)

  // Run past both ends by half a thickness so corners close up.
  let cursor = w.from - WALL_T / 2
  const end = w.to + WALL_T / 2
  const proud = WALL_T + 0.06

  for (const o of [...w.openings].sort((a, b) => a.at - b.at)) {
    const u0 = o.at - o.width / 2
    const u1 = o.at + o.width / 2
    const y0 = o.kind === 'door' ? 0 : (o.sill ?? 0.9)
    const y1 = o.kind === 'door' ? DOOR_H : (o.top ?? 2.3)

    if (u0 > cursor) {
      box('wall', cursor, u0, 0, WALL_H, WALL_T)
      skirting(cursor, u0)
    }
    if (y0 > 0) {
      box('wall', u0, u1, 0, y0, WALL_T)
      skirting(u0, u1)
    }
    box('wall', u0, u1, y1, WALL_H, WALL_T)

    box('trim', u0 - TRIM, u0, y0, y1, proud)
    box('trim', u1, u1 + TRIM, y0, y1, proud)
    box('trim', u0 - TRIM, u1 + TRIM, y1, y1 + TRIM, proud)

    if (o.kind === 'window') {
      box('glass', u0, u1, y0, y1, 0.04)
      box('trim', u0 - TRIM, u1 + TRIM, y0 - TRIM, y0, proud)
      // Mullions on the wide windows.
      if (o.width > 3) {
        for (const t of [1 / 3, 2 / 3]) box('trim', u0 + o.width * t - 0.03, u0 + o.width * t + 0.03, y0, y1, WALL_T + 0.02)
      }
      // A sill shelf on brackets, on the inside only.
      for (const side of [-1, 1]) {
        const f = wallFrame(w, side)
        const [px, , pz] = f.at(o.at, 1, 0.4)
        if (!roomAt(px, pz)) continue
        kit.box('paint', f.size(o.width + 0.24, 0.04, 0.22), f.at(o.at, y0 - TRIM - 0.02, 0.11))
        for (const du of [-o.width / 2 + 0.1, o.width / 2 - 0.1]) {
          kit.box('trim', f.size(0.05, 0.16, 0.18), f.at(o.at + du, y0 - TRIM - 0.12, 0.09))
        }
      }
    } else {
      // Status light over the door, on both faces.
      for (const side of [-1, 1]) {
        const f = wallFrame(w, side)
        kit.box('dark', f.size(0.62, 0.08, 0.02), f.at(o.at, DOOR_H + TRIM + 0.06, 0.02))
        kit.box('ledGreen', f.size(0.5, 0.03, 0.02), f.at(o.at, DOOR_H + TRIM + 0.06, 0.035))
      }
    }

    cursor = u1
  }
  if (end > cursor) {
    box('wall', cursor, end, 0, WALL_H, WALL_T)
    skirting(cursor, end)
  }
}

/** The full-height stretches of a wall, between and around its openings. */
function solidSpans(w: Wall): [number, number][] {
  const spans: [number, number][] = []
  let cursor = w.from
  for (const o of [...w.openings].sort((a, b) => a.at - b.at)) {
    spans.push([cursor, o.at - o.width / 2 - TRIM])
    cursor = o.at + o.width / 2 + TRIM
  }
  spans.push([cursor, w.to])
  return spans.filter(([a, b]) => b - a > 1.2)
}

/** Fits one of three kinds of wall-mounted equipment. */
function equipment(kit: BaseKit, f: Frame, u: number, variant: number, slim: boolean) {
  if (variant === 0) {
    // Control panel with a dark display, a label strip, status lights and knobs.
    kit.box('paint', f.size(0.72, 0.92, 0.06), f.at(u, 1.45, 0.03))
    kit.box('dark', f.size(0.5, 0.3, 0.02), f.at(u, 1.62, 0.065))
    kit.box('blue', f.size(0.5, 0.05, 0.015), f.at(u, 1.84, 0.065))
    for (let i = 0; i < 4; i++) {
      kit.box(i === 2 ? 'ledAmber' : 'ledGreen', f.size(0.03, 0.03, 0.015), f.at(u - 0.21 + i * 0.09, 1.32, 0.066))
    }
    for (let i = 0; i < 3; i++) kit.cyl('metal', 0.022, 0.022, 0.03, f.at(u - 0.15 + i * 0.15, 1.15, 0.07), f.outward, 10)
  } else if (variant === 1) {
    // Air vent high up, with a service locker below.
    kit.box('trim', f.size(0.9, 0.36, 0.05), f.at(u, 2.45, 0.025))
    for (let i = 0; i < 5; i++) kit.box('metal', f.size(0.8, 0.025, 0.03), f.at(u, 2.33 + i * 0.06, 0.06))
    kit.box('paint', f.size(0.8, 1.0, 0.1), f.at(u, 0.7, 0.05))
    kit.box('trim', f.size(0.8, 0.012, 0.105), f.at(u, 0.7, 0.05))
    kit.box('metal', f.size(0.03, 0.24, 0.03), f.at(u + 0.3, 0.95, 0.115))
    kit.box('orange', f.size(0.2, 0.06, 0.012), f.at(u - 0.22, 1.1, 0.102))
  } else {
    // Tall rack front with drawers.
    const depth = slim ? 0.08 : 0.14
    kit.box('paint', f.size(1.0, 2.0, depth), f.at(u, 1.14, depth / 2))
    for (let i = 0; i < 5; i++) {
      const y = 0.4 + i * 0.37
      kit.box('trim', f.size(0.96, 0.012, depth + 0.005), f.at(u, y - 0.18, depth / 2))
      kit.box('metal', f.size(0.3, 0.025, 0.03), f.at(u, y, depth + 0.015))
      kit.box(pick(u, i) > 0.75 ? 'ledAmber' : 'ledGreen', f.size(0.025, 0.025, 0.012), f.at(u + 0.4, y + 0.08, depth + 0.004))
    }
    kit.box('blue', f.size(0.96, 0.06, 0.012), f.at(u, 2.06, depth + 0.004))
  }
}

/** Conduit, rails and equipment along every interior wall face. */
function dressWalls(kit: BaseKit) {
  walls.forEach((w, wallIndex) => {
    for (const [u0, u1] of solidSpans(w)) {
      const length = u1 - u0
      const mid = (u0 + u1) / 2
      for (const side of [-1, 1]) {
        const f = wallFrame(w, side)
        const [px, , pz] = f.at(mid, 1, 0.4)
        const room = roomAt(px, pz)
        if (!room) continue
        const inCorridor = room === 'corridor'

        // Conduit runs under the ceiling, held by brackets.
        kit.cyl('metal', 0.045, 0.045, length, f.at(mid, 2.93, 0.09), f.along, 10)
        kit.cyl(inCorridor ? 'blue' : 'orange', 0.022, 0.022, length, f.at(mid, 2.8, 0.06), f.along, 8)
        for (let u = u0 + 0.5; u < u1; u += 1.6) kit.box('trim', f.size(0.05, 0.26, 0.15), f.at(u, 2.87, 0.075))

        if (inCorridor) {
          // Handrail on stand-offs.
          kit.cyl('metal', 0.022, 0.022, length - 0.3, f.at(mid, 0.95, 0.09), f.along, 10)
          for (let u = u0 + 0.35; u < u1 - 0.2; u += 1.25) kit.box('trim', f.size(0.03, 0.03, 0.09), f.at(u, 0.95, 0.045))
        }

        const count = Math.floor(length / 2.3)
        for (let i = 0; i < count; i++) {
          const u = u0 + ((i + 0.5) * length) / count
          const [ex, , ez] = f.at(u, 1, 0.2)
          // Leave the wall behind consoles and props clear.
          const blocked =
            consoles.some((c) => Math.hypot(c.x - ex, c.z - ez) < 1.5) || props.some((p) => Math.hypot(p.x - ex, p.z - ez) < 1.2)
          if (blocked) continue
          const roll = pick(wallIndex * 7 + side, i)
          const variant = inCorridor ? (roll > 0.5 ? 0 : 1) : Math.floor(roll * 3)
          equipment(kit, f, u, variant, inCorridor)
        }
      }
    }
  })
}

function buildShell(kit: BaseKit) {
  const width = BOUNDS.x1 - BOUNDS.x0
  const depth = BOUNDS.z1 - BOUNDS.z0

  for (const r of rooms) kit.box('floor', [r.x1 - r.x0, 0.1, r.z1 - r.z0], [(r.x0 + r.x1) / 2, -0.05, (r.z0 + r.z1) / 2])
  kit.box('ceiling', [width + WALL_T, 0.1, depth + WALL_T], [0, WALL_H + 0.05, 0])

  // Wayfinding stripe down the corridor and hazard strips across each threshold.
  kit.box('glowBlue', [width - 1.2, 0.008, 0.12], [0, 0.004, 0])
  for (const d of doors) kit.box('glowOrange', [d.width, 0.008, 0.34], [d.x, 0.004, d.z])

  for (const w of walls) buildWall(kit, w)

  // Corridor ceiling: beams and a cable tray carrying two lines.
  for (const x of [-9.4, -3.25, 3.25, 9.4]) kit.box('trim', [0.14, 0.16, 3], [x, WALL_H - 0.08, 0])
  kit.box('metal', [width - 0.6, 0.03, 0.26], [0, WALL_H - 0.2, 1.05])
  for (let x = -9; x <= 9; x += 2) kit.box('trim', [0.03, 0.2, 0.03], [x, WALL_H - 0.1, 1.05])
  kit.cyl('dark', 0.035, 0.035, width - 0.6, [0, WALL_H - 0.15, 1.0], [0, 0, Math.PI / 2], 8)
  kit.cyl('dark', 0.025, 0.025, width - 0.6, [0, WALL_H - 0.16, 1.11], [0, 0, Math.PI / 2], 8)

  // Room ceilings: two cross beams and a spine.
  for (const r of rooms) {
    if (r.id === 'corridor') continue
    const cx = (r.x0 + r.x1) / 2
    const cz = (r.z0 + r.z1) / 2
    for (const dx of [-3.5, 3.5]) kit.box('trim', [0.16, 0.2, r.z1 - r.z0], [cx + dx, WALL_H - 0.1, cz])
    kit.box('trim', [r.x1 - r.x0, 0.12, 0.12], [cx, WALL_H - 0.06, cz])
  }

  // A housing around each light strip.
  for (const s of STRIPS) {
    kit.box('trim', [s.length + 0.12, 0.07, 0.36], [s.x, WALL_H - 0.035, s.z])
    for (const end of [-1, 1]) kit.box('metal', [0.04, 0.09, 0.4], [s.x + (end * (s.length + 0.12)) / 2, WALL_H - 0.045, s.z])
  }
}

/** Sealed hatch at the east end of the corridor. Decorative only. */
function buildAirlock(kit: BaseKit) {
  const x = BOUNDS.x1 - WALL_T / 2
  kit.box('trim', [0.1, DOOR_H + 0.2, 2.0], [x - 0.03, (DOOR_H + 0.2) / 2, 0])
  kit.box('metal', [0.1, DOOR_H, 1.7], [x - 0.07, DOOR_H / 2, 0])
  kit.box('dark', [0.02, DOOR_H - 0.3, 1.4], [x - 0.125, DOOR_H / 2, 0])
  for (const y of [0.45, 1.85]) kit.box('orange', [0.02, 0.12, 1.4], [x - 0.13, y, 0])
  // Locking wheel with spokes.
  kit.torus('metal', 0.24, 0.025, [x - 0.2, 1.2, 0], [0, 0, Math.PI / 2])
  kit.cyl('metal', 0.05, 0.05, 0.1, [x - 0.17, 1.2, 0], [0, 0, Math.PI / 2], 12)
  for (let i = 0; i < 3; i++) kit.box('metal', [0.02, 0.46, 0.025], [x - 0.2, 1.2, 0], [(i * Math.PI) / 3, 0, 0])
  // Bolts down both sides of the frame.
  for (let i = 0; i < 8; i++) {
    for (const z of [-0.93, 0.93]) kit.cyl('metal', 0.02, 0.02, 0.03, [x - 0.085, 0.2 + i * 0.3, z], [0, 0, Math.PI / 2], 6)
  }
  // Keypad.
  kit.box('dark', [0.04, 0.3, 0.2], [x - 0.02, 1.3, -1.25])
  kit.box('ledRed', [0.012, 0.03, 0.03], [x - 0.045, 1.4, -1.29])
  kit.box('ledGreen', [0.012, 0.03, 0.03], [x - 0.045, 1.4, -1.21])
}

/** Props keep inside the collision footprints set in data/base.ts. */
function buildProp(kit: BaseKit, p: PropDef) {
  const { x, z } = p
  switch (p.kind) {
    case 'table':
      kit.cyl('trim', 0.6, 0.62, 0.04, [x, 0.02, z], undefined, 32)
      kit.cyl('trim', 0.3, 0.44, 0.82, [x, 0.45, z], undefined, 24)
      kit.cyl('paint', 1, 1, 0.07, [x, 0.89, z], undefined, 48)
      kit.torus('metal', 1.0, 0.03, [x, 0.89, z])
      kit.cyl('dark', 0.74, 0.74, 0.012, [x, 0.93, z], undefined, 48)
      kit.cyl('glowBlue', 0.7, 0.7, 0.012, [x, 0.936, z], undefined, 48)
      // Four operator stations around the rim.
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4
        kit.box('dark', [0.3, 0.025, 0.18], [x + Math.cos(a) * 0.84, 0.94, z + Math.sin(a) * 0.84], [0, -a + Math.PI / 2, 0])
        kit.box(i === 1 ? 'ledAmber' : 'ledGreen', [0.03, 0.03, 0.03], [x + Math.cos(a) * 0.95, 0.94, z + Math.sin(a) * 0.95])
      }
      break
    case 'tank':
      kit.cyl('trim', 0.47, 0.48, 0.12, [x, 0.06, z], undefined, 28)
      kit.cyl('paint', 0.42, 0.42, 2.08, [x, 1.16, z], undefined, 28)
      kit.sphere('paint', 0.42, [x, 2.2, z], Math.PI / 2)
      kit.cyl('blue', 0.425, 0.425, 0.22, [x, 1.5, z], undefined, 28)
      for (const y of [0.45, 1.95]) kit.torus('metal', 0.43, 0.02, [x, y, z])
      // Valve and feed line up to the ceiling.
      kit.cyl('metal', 0.06, 0.06, 0.2, [x, 2.68, z], undefined, 10)
      kit.torus('orange', 0.09, 0.015, [x, 2.8, z])
      kit.cyl('metal', 0.03, 0.03, WALL_H - 2.75, [x, (WALL_H + 2.75) / 2, z], undefined, 8)
      // Gauge facing the room.
      kit.box('dark', [0.05, 0.2, 0.16], [x - 0.435, 1.2, z])
      kit.box('ledAmber', [0.012, 0.03, 0.1], [x - 0.462, 1.24, z])
      break
    case 'battery':
      for (const dz of [-0.4, 0.4]) kit.box('trim', [0.7, 0.06, 0.12], [x, 0.03, z + dz])
      kit.box('dark', [0.7, 1.86, 1.1], [x, 0.99, z])
      kit.box('trim', [0.72, 0.04, 1.12], [x, 1.94, z])
      for (let i = 0; i < 5; i++) kit.box('metal', [0.02, 0.025, 0.8], [x + 0.355, 1.56 + i * 0.06, z])
      for (const y of [0.45, 0.85, 1.25]) kit.box('ledGreen', [0.012, 0.045, 0.8], [x + 0.356, y, z])
      for (const dz of [-0.48, 0.48]) kit.cyl('metal', 0.015, 0.015, 0.5, [x + 0.37, 1.0, z + dz], undefined, 6)
      kit.cyl('metal', 0.05, 0.05, WALL_H - 1.96, [x - 0.15, (WALL_H + 1.96) / 2, z], undefined, 10)
      kit.box('orange', [0.012, 0.1, 0.3], [x + 0.356, 0.15, z])
      break
    case 'hopper':
      // Drum on legs, feeding a cone and an exhaust stack.
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4
        kit.box('trim', [0.09, 0.45, 0.09], [x + Math.cos(a) * 0.72, 0.225, z + Math.sin(a) * 0.72])
      }
      kit.torus('trim', 0.72, 0.035, [x, 0.06, z])
      kit.cyl('metal', 0.85, 0.5, 0.25, [x, 0.33, z], undefined, 32)
      kit.cyl('metal', 0.85, 0.85, 0.9, [x, 0.9, z], undefined, 32)
      kit.cyl('orange', 0.86, 0.86, 0.14, [x, 1.1, z], undefined, 32)
      for (const y of [0.5, 1.33]) kit.torus('trim', 0.86, 0.025, [x, y, z])
      kit.cyl('metal', 0.26, 0.85, 0.9, [x, 1.8, z], undefined, 32)
      kit.cyl('trim', 0.2, 0.2, WALL_H - 2.25, [x, (WALL_H + 2.25) / 2, z], undefined, 20)
      for (const y of [2.28, 3.05]) kit.cyl('metal', 0.29, 0.29, 0.05, [x, y, z], undefined, 20)
      // Control box facing the door.
      kit.box('paint', [0.3, 0.36, 0.08], [x, 0.95, z - 0.88])
      kit.box('ledAmber', [0.04, 0.04, 0.012], [x - 0.08, 1.03, z - 0.925])
      kit.box('ledGreen', [0.04, 0.04, 0.012], [x + 0.02, 1.03, z - 0.925])
      break
  }
}

function buildBase() {
  const kit = new Kit<Mat>(UV_TILE)
  buildShell(kit)
  dressWalls(kit)
  buildAirlock(kit)
  for (const p of props) buildProp(kit, p)
  return kit.build()
}

/** The emissive strips sit outside the merged shell, because they follow the power reserve. */
function LightStrips() {
  const power = usePowerStatus()
  return (
    <group>
      {STRIPS.map((s, i) => (
        <mesh key={i} position={[s.x, WALL_H - 0.075, s.z]}>
          <boxGeometry args={[s.length, 0.02, 0.22]} />
          <meshStandardMaterial
            color="#000000"
            emissive={power === 'crit' ? EMERGENCY_COLOR : LAMP_COLOR}
            emissiveIntensity={2.6 * POWER_LEVEL[power]}
          />
        </mesh>
      ))}
    </group>
  )
}

function Sign({ position, rotationY, label }: { position: Vec3; rotationY: number; label: string }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, -0.005]} material={getMaterials().kit.trim}>
        <boxGeometry args={[2.18, 0.48, 0.03]} />
      </mesh>
      <mesh>
        <boxGeometry args={[2.1, 0.4, 0.03]} />
        <meshStandardMaterial color="#0b3d91" emissive="#0b3d91" emissiveIntensity={0.9} roughness={0.6} />
      </mesh>
      <Text font={signFont} fontSize={0.19} letterSpacing={0.12} color="#ffffff" position={[0, 0, 0.02]} anchorY="middle">
        {label}
      </Text>
    </group>
  )
}

function Signage() {
  return (
    <Suspense fallback={null}>
      {doors.map((door, i) => {
        if (!door.leadsTo) return null
        // Doors sit in the corridor walls, so the corridor is towards z = 0.
        const dir = door.z < 0 ? 1 : -1
        return (
          <Sign
            key={i}
            label={roomById[door.leadsTo].name.toUpperCase()}
            position={[door.x, DOOR_H + 0.5, door.z + dir * (WALL_T / 2 + 0.02)]}
            rotationY={dir > 0 ? 0 : Math.PI}
          />
        )
      })}
      <Sign label="AIRLOCK 01" position={[BOUNDS.x1 - WALL_T / 2 - 0.1, DOOR_H + 0.5, 0]} rotationY={-Math.PI / 2} />
    </Suspense>
  )
}

/** Wireframe globe hovering over the Command table. */
function Hologram() {
  const table = props.find((p) => p.kind === 'table')
  if (!table) return null
  return (
    <mesh position={[table.x, 1.42, table.z]}>
      <sphereGeometry args={[0.32, 20, 14]} />
      <meshStandardMaterial color="#000000" emissive="#7fb4ff" emissiveIntensity={1.3} wireframe transparent opacity={0.6} />
    </mesh>
  )
}

export function Base() {
  const parts = useMemo(buildBase, [])
  const { kit } = getMaterials()
  return (
    <group>
      {parts.map(({ mat, geometry }) => (
        <mesh key={mat} geometry={geometry} material={kit[mat]} castShadow={!NO_SHADOW.has(mat)} receiveShadow />
      ))}
      <LightStrips />
      <Signage />
      <Hologram />
      {consoles.map((c) => (
        <Console key={c.id} def={c} />
      ))}
    </group>
  )
}
