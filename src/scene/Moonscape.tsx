import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, IcosahedronGeometry, type InstancedMesh, Object3D, PlaneGeometry, type Points } from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { BOUNDS } from '../data/base'
import { Kit } from './kit'
import { NO_SHADOW, UV_TILE, getMaterials, type Mat } from './materials'
import { fbm, seeded, smoothstep } from './noise'
import { terrainHeight } from './terrain'
import { earthTexture } from './textures'
import { VISUALS } from './visuals'

const STAR_COUNT = 5000
const STAR_RADIUS = 600
const GROUND_SIZE = 520
const GROUND_SEGMENTS = 260

/** Sharp, unblinking stars: with no atmosphere there is nothing to soften or twinkle them. */
function Starfield() {
  const { positions, colors } = useMemo(() => {
    const rand = seeded(7)
    const positions = new Float32Array(STAR_COUNT * 3)
    const colors = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) {
      // Uniform over the upper sky.
      const y = rand()
      const angle = rand() * Math.PI * 2
      const r = Math.sqrt(1 - y * y)
      positions.set([Math.cos(angle) * r * STAR_RADIUS, y * STAR_RADIUS, Math.sin(angle) * r * STAR_RADIUS], i * 3)
      // Mostly faint, a few bright.
      const brightness = 0.25 + 0.75 * rand() ** 3
      colors.set([brightness, brightness, brightness], i * 3)
    }
    return { positions, colors }
  }, [])

  return (
    <points renderOrder={-1} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={1.8} sizeAttenuation={false} vertexColors depthWrite={false} />
    </points>
  )
}

function Ground() {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(GROUND_SIZE, GROUND_SIZE, GROUND_SEGMENTS, GROUND_SEGMENTS)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)))
    g.computeVertexNormals()
    return g
  }, [])
  return <mesh geometry={geometry} material={getMaterials().ground} receiveShadow />
}

/** One lumpy boulder, reused for every rock through instancing. */
function rockGeometry() {
  let g = new IcosahedronGeometry(1, 2)
  // Merge the per-face vertices so the lumps shade smoothly instead of faceted.
  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  g = mergeVertices(g) as IcosahedronGeometry
  const pos = g.attributes.position
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const k = 0.72 + fbm(x * 1.3 + 5, y * 1.3 + z * 1.7, 3, 3) * 0.6
    pos.setXYZ(i, x * k, y * k * 0.8, z * k)
    uv.set([Math.atan2(z, x) / Math.PI, y * 0.5 + 0.5], i * 2)
  }
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

function Rocks() {
  const mesh = useRef<InstancedMesh>(null)
  const geometry = useMemo(rockGeometry, [])
  const count = VISUALS.rocks

  useLayoutEffect(() => {
    if (!mesh.current) return
    const rand = seeded(42)
    const dummy = new Object3D()
    let placed = 0
    while (placed < count) {
      // Denser close to the base, where they are actually seen.
      const dist = 12 + rand() ** 1.7 * 130
      const angle = rand() * Math.PI * 2
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      const inBase = x > BOUNDS.x0 - 2 && x < BOUNDS.x1 + 2 && z > BOUNDS.z0 - 2 && z < BOUNDS.z1 + 2
      if (inBase) continue
      // Mostly pebbles, a few boulders, and nothing large right outside the windows.
      const s = 0.08 + rand() ** 3 * (0.35 + 1.1 * smoothstep(18, 45, dist))
      dummy.position.set(x, terrainHeight(x, z) + s * 0.25, z)
      dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
      dummy.scale.set(s * (0.7 + rand() * 0.6), s * (0.5 + rand() * 0.5), s * (0.7 + rand() * 0.6))
      dummy.updateMatrix()
      mesh.current.setMatrixAt(placed++, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.computeBoundingSphere()
  }, [count])

  return <instancedMesh ref={mesh} args={[geometry, getMaterials().rock, count]} castShadow receiveShadow />
}

/** Earth sits low over the western horizon, as it does from the lunar south pole. */
function Earth() {
  // The sphere's u = 0.5 meridian faces the base; the offset puts the Sun off to one side.
  const texture = useMemo(() => earthTexture(Math.PI + 0.9), [])
  return (
    <group position={[-400, 28, 0]} rotation={[0, 0, 0.35]}>
      <mesh>
        <sphereGeometry args={[22, 64, 40]} />
        <meshStandardMaterial color="#000000" emissive="#ffffff" emissiveMap={texture} emissiveIntensity={1.7} roughness={1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[22.9, 48, 32]} />
        <meshStandardMaterial color="#000000" emissive="#5aa2ff" emissiveIntensity={0.5} transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Fine dust hanging just above the ground around the base, drifting very slowly. */
function Dust() {
  const points = useRef<Points>(null)
  const positions = useMemo(() => {
    const rand = seeded(99)
    const out = new Float32Array(VISUALS.dust.count * 3)
    for (let i = 0; i < VISUALS.dust.count; i++) {
      const dist = 11 + rand() * 34
      const angle = rand() * Math.PI * 2
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      out.set([x, Math.max(0, terrainHeight(x, z)) + 0.05 + rand() ** 2 * 1.8, z], i * 3)
    }
    return out
  }, [])

  useFrame(({ clock }, dt) => {
    if (!points.current) return
    points.current.rotation.y += dt * 0.006
    points.current.position.y = Math.sin(clock.elapsedTime * 0.15) * 0.06
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#aebbd6" transparent opacity={VISUALS.dust.opacity} depthWrite={false} />
    </points>
  )
}

/** Surface hardware placed where the windows look out. */
function buildOutpost() {
  const kit = new Kit<Mat>(UV_TILE)
  const y = (x: number, z: number) => terrainHeight(x, z)

  // Comms mast, seen from the corridor viewport.
  {
    const x = -27
    const z = 4.2
    const g = y(x, z)
    kit.box('trim', [1.2, 0.3, 1.2], [x, g + 0.15, z])
    kit.cyl('metal', 0.07, 0.12, 8, [x, g + 4.3, z], undefined, 10)
    for (const h of [2.2, 4.4, 6.6]) kit.box('metal', [0.9, 0.05, 0.05], [x, g + h, z], [0, h, 0])
    kit.sphere('paint', 1.1, [x + 0.25, g + 7.3, z], 0.75, [0, 0, -1.1])
    kit.cyl('metal', 0.02, 0.02, 1.0, [x + 0.75, g + 7.55, z], [0, 0, -1.1], 6)
    kit.cyl('metal', 0.015, 0.015, 1.6, [x, g + 9.1, z], undefined, 6)
    kit.sphere('ledRed', 0.07, [x, g + 9.95, z])
  }

  // Solar array north of Command.
  for (let i = 0; i < 4; i++) {
    const x = -11.5 + i * 3.6
    const z = -21
    const g = y(x, z)
    kit.cyl('metal', 0.06, 0.08, 1.7, [x, g + 0.85, z], undefined, 8)
    kit.box('trim', [0.4, 0.08, 0.4], [x, g + 0.04, z])
    kit.box('solar', [3.2, 0.05, 1.9], [x, g + 1.8, z], [0.6, 0, 0])
    kit.box('metal', [3.3, 0.04, 0.06], [x, g + 1.27, z + 0.78], [0.6, 0, 0])
    kit.box('metal', [3.3, 0.04, 0.06], [x, g + 2.33, z - 0.78], [0.6, 0, 0])
    kit.box('metal', [0.05, 0.03, 1.9], [x, g + 1.77, z], [0.6, 0, 0])
  }

  // Tank farm and a marked path south of the ISRU plant.
  for (let i = 0; i < 2; i++) {
    const x = 3.2 + i * 4.6
    const z = 20
    const g = y(x, z)
    kit.cyl('paint', 0.95, 0.95, 3.6, [x, g + 1.35, z], [Math.PI / 2, 0, 0], 24)
    kit.sphere('paint', 0.95, [x, g + 1.35, z + 1.8], Math.PI / 2, [Math.PI / 2, 0, 0])
    kit.sphere('paint', 0.95, [x, g + 1.35, z - 1.8], Math.PI / 2, [-Math.PI / 2, 0, 0])
    for (const dz of [-1.1, 1.1]) {
      kit.box('trim', [1.7, 0.5, 0.25], [x, g + 0.25, z + dz])
      kit.torus('metal', 0.97, 0.03, [x, g + 1.35, z + dz], [Math.PI / 2, 0, 0])
    }
    kit.cyl('orange', 0.06, 0.06, 4.6, [x + 2.3, g + 0.5, z - 1.6], [0, 0, Math.PI / 2], 8)
  }
  for (let i = 0; i < 5; i++) {
    for (const x of [4.3, 6.7]) {
      const z = 11.5 + i * 1.6
      const g = y(x, z)
      kit.cyl('trim', 0.03, 0.04, 0.4, [x, g + 0.2, z], undefined, 6)
      kit.box('ledAmber', [0.07, 0.05, 0.07], [x, g + 0.42, z])
    }
  }

  return kit.build()
}

function Outpost() {
  const parts = useMemo(buildOutpost, [])
  const { kit } = getMaterials()
  return (
    <>
      {parts.map(({ mat, geometry }) => (
        <mesh key={mat} geometry={geometry} material={kit[mat]} castShadow={!NO_SHADOW.has(mat)} receiveShadow />
      ))}
    </>
  )
}

export function Moonscape() {
  return (
    <group>
      <Starfield />
      <Ground />
      <Rocks />
      <Outpost />
      <Earth />
      <Dust />
    </group>
  )
}
