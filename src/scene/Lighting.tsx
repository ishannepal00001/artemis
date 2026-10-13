import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, PMREMGenerator, type PointLight } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { WALL_H, roomById, type RoomId } from '../data/base'
import { usePowerStatus } from '../state/sim'
import type { Status } from '../state/store'
import { VISUALS } from './visuals'

/** How bright the fixtures run for each state of the power reserve. */
export const POWER_LEVEL: Record<Status, number> = { ok: 1, warn: 0.7, crit: 0.4 }
export const EMERGENCY_COLOR = '#ff6a55'
/** Warm, low "evening" LED white used by every fixture. */
export const LAMP_COLOR = '#ffe8d0'

interface FixtureDef {
  x: number
  z: number
  color: string
  intensity: number
}

const centre = (id: RoomId) => {
  const r = roomById[id]
  return { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 }
}

// The fixtures run warm and low. The corridor is lit in pools with dimmer
// stretches between them, and the rooms sit a little brighter.
const FIXTURES: FixtureDef[] = [
  { x: -6.5, z: 0, color: LAMP_COLOR, intensity: 2.5 },
  { x: 0, z: 0, color: LAMP_COLOR, intensity: 2.5 },
  { x: 6.5, z: 0, color: LAMP_COLOR, intensity: 2.5 },
  { ...centre('command'), color: '#ffe9d4', intensity: 7 },
  { ...centre('life'), color: '#ffeedb', intensity: 7 },
  { ...centre('power'), color: '#ffe0bd', intensity: 7 },
  { ...centre('isru'), color: '#ffe4c6', intensity: 7 },
]

const emergency = new Color(EMERGENCY_COLOR)

/** A ceiling light that dims, and turns emergency red, with the power reserve. */
function Fixture({ def, power }: { def: FixtureDef; power: Status }) {
  const light = useRef<PointLight>(null)
  const normal = useMemo(() => new Color(def.color), [def.color])
  const full = def.intensity * VISUALS.lampLevel

  useFrame((_, dt) => {
    if (!light.current) return
    const k = Math.min(1, dt * 2.5)
    light.current.intensity += (full * POWER_LEVEL[power] - light.current.intensity) * k
    light.current.color.lerp(power === 'crit' ? emergency : normal, k)
  })

  return (
    <pointLight
      ref={light}
      position={[def.x, WALL_H - 0.45, def.z]}
      decay={1.5}
      distance={18}
      intensity={full}
      color={def.color}
      castShadow={VISUALS.interiorShadows}
      shadow-mapSize={[VISUALS.interiorShadowMapSize, VISUALS.interiorShadowMapSize]}
      shadow-bias={-0.003}
      shadow-normalBias={0.05}
    />
  )
}

/** Nothing that casts a shadow moves, so the shadow maps are rendered once and kept. */
function StaticShadows() {
  const gl = useThree((s) => s.gl)
  const frames = useRef(0)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    return () => {
      gl.shadowMap.autoUpdate = true
    }
  }, [gl])
  useFrame(() => {
    // A few frames of grace for everything to mount.
    if (frames.current < 20) {
      frames.current++
      gl.shadowMap.needsUpdate = true
    }
  })
  return null
}

/** A dim neutral environment map, so metal has something to reflect. */
function Environment() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = target.texture
    scene.environmentIntensity = VISUALS.environmentIntensity
    return () => {
      scene.environment = null
      target.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

export function Lighting() {
  const power = usePowerStatus()
  const day = VISUALS.timeOfDay === 'day'
  const { sun, earthshine, shadowExtent: e, shadowMapSize } = VISUALS

  // One directional key light casts the shadows: the Sun by day, Earthshine at night.
  const key = day
    ? { position: sun.position, color: sun.color, intensity: sun.intensity }
    : { position: earthshine.position, color: earthshine.color, intensity: earthshine.night }

  return (
    <>
      <StaticShadows />
      <Environment />

      <ambientLight intensity={VISUALS.ambient} color="#fff1e2" />
      {/* Stands in for light bounced off the floor onto ceilings and upper walls. */}
      <hemisphereLight args={['#46444a', '#8a8078', VISUALS.bounce]} />

      <directionalLight
        position={key.position}
        intensity={key.intensity}
        color={key.color}
        castShadow
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      >
        <orthographicCamera attach="shadow-camera" args={[-e, e, e, -e, 1, 260]} />
      </directionalLight>

      {/* By day, Earthshine becomes the faint blue fill from the opposite side. */}
      {day && <directionalLight position={earthshine.position} intensity={earthshine.day} color={earthshine.color} />}

      {FIXTURES.map((f, i) => (
        <Fixture key={i} def={f} power={power} />
      ))}
    </>
  )
}
