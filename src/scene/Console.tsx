import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshStandardMaterial } from 'three'
import { CONSOLE_D, CONSOLE_W, type ConsoleDef } from '../data/base'
import { taskByConsole } from '../data/tasks'
import { resourceStatus, useGame } from '../state/store'
import { getMaterials } from './materials'

const STATE_COLOR = {
  done: '#3fd39a',
  idle: '#4d9fff',
  warn: '#ff8a2a',
  crit: '#ff5449',
}

export function Console({ def }: { def: ConsoleDef }) {
  const task = taskByConsole[def.id]
  const done = useGame((s) => s.tasks.find((t) => t.id === task.id)?.done ?? false)
  const status = useGame((s) => resourceStatus(s.resources[task.resource]))
  const inRange = useGame((s) => s.nearbyConsoleId === def.id)

  const color = done ? STATE_COLOR.done : status === 'ok' ? STATE_COLOR.idle : STATE_COLOR[status]

  const screen = useRef<MeshStandardMaterial>(null)
  const marker = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (screen.current) {
      const pulse = done ? 0 : 0.08 * Math.sin(t * 3)
      screen.current.emissiveIntensity = (inRange ? 1.5 : 1.15) + pulse
    }
    if (marker.current) {
      marker.current.rotation.y = t * 1.4
      marker.current.position.y = 2.35 + Math.sin(t * 2) * 0.06
    }
  })

  // The model is built facing +z, then turned towards the operator.
  const rotationY = Math.atan2(def.facing[0], def.facing[1])

  const { kit } = getMaterials()

  return (
    <group position={[def.x, 0, def.z]} rotation={[0, rotationY, 0]}>
      {/* Plinth and cabinet */}
      <mesh position={[0, 0.06, 0]} material={kit.trim} castShadow receiveShadow>
        <boxGeometry args={[CONSOLE_W, 0.12, CONSOLE_D]} />
      </mesh>
      <mesh position={[0, 0.5, -0.02]} material={kit.paint} castShadow receiveShadow>
        <boxGeometry args={[CONSOLE_W - 0.06, 0.78, CONSOLE_D - 0.08]} />
      </mesh>
      {/* Service door with a vent and a handle */}
      <mesh position={[0, 0.5, CONSOLE_D / 2 - 0.055]} material={kit.trim}>
        <boxGeometry args={[CONSOLE_W - 0.3, 0.6, 0.012]} />
      </mesh>
      {[0.3, 0.36, 0.42].map((y) => (
        <mesh key={y} position={[0, y, CONSOLE_D / 2 - 0.045]} material={kit.metal}>
          <boxGeometry args={[CONSOLE_W - 0.5, 0.02, 0.012]} />
        </mesh>
      ))}
      <mesh position={[0.38, 0.62, CONSOLE_D / 2 - 0.035]} material={kit.metal}>
        <boxGeometry args={[0.03, 0.18, 0.03]} />
      </mesh>
      {/* Side cheeks carrying the control deck */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (CONSOLE_W / 2 - 0.02), 0.98, -0.02]} material={kit.trim} castShadow>
          <boxGeometry args={[0.04, 0.34, CONSOLE_D + 0.1]} />
        </mesh>
      ))}
      {/* Slanted control deck with a glowing keyboard strip and status lights */}
      <mesh position={[0, 0.98, 0.06]} rotation={[-0.5, 0, 0]} material={kit.dark} castShadow>
        <boxGeometry args={[CONSOLE_W - 0.08, 0.06, 0.62]} />
      </mesh>
      <mesh position={[0, 1.015, 0.075]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[CONSOLE_W - 0.3, 0.01, 0.4]} />
        <meshStandardMaterial color="#05080e" emissive={color} emissiveIntensity={0.45} roughness={0.3} />
      </mesh>
      {[-0.45, -0.38, 0.38, 0.45].map((x, i) => (
        <mesh key={x} position={[x, 1.075, -0.04]} rotation={[-0.5, 0, 0]} material={i === 1 ? kit.ledAmber : kit.ledGreen}>
          <boxGeometry args={[0.03, 0.012, 0.03]} />
        </mesh>
      ))}
      {/* Upright display on a neck */}
      <mesh position={[0, 1.2, -0.22]} material={kit.trim}>
        <boxGeometry args={[0.2, 0.3, 0.05]} />
      </mesh>
      <mesh position={[0, 1.62, -0.2]} material={kit.dark} castShadow>
        <boxGeometry args={[CONSOLE_W, 0.78, 0.06]} />
      </mesh>
      <mesh position={[0, 1.62, -0.165]}>
        <boxGeometry args={[CONSOLE_W - 0.12, 0.66, 0.01]} />
        <meshStandardMaterial ref={screen} color="#05080e" emissive={color} emissiveIntensity={1.2} roughness={0.25} />
      </mesh>
      {/* The screen lights the operator's side in its state colour. */}
      <pointLight position={[0, 1.5, 0.6]} color={color} intensity={inRange ? 3.2 : 2.2} distance={5.5} decay={2} />
      {!done && (
        <mesh ref={marker} position={[0, 2.35, 0]}>
          <octahedronGeometry args={[0.13]} />
          <meshStandardMaterial color="#000000" emissive={color} emissiveIntensity={1.6} />
        </mesh>
      )}
      {inRange && (
        <mesh position={[0, 0.012, 0.95]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.48, 40]} />
          <meshStandardMaterial color="#000000" emissive={color} emissiveIntensity={1.4} />
        </mesh>
      )}
    </group>
  )
}
