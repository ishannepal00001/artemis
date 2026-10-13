import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EYE_HEIGHT, canStand, consoles, roomAt } from '../data/base'
import { isLocked } from '../state/pointer'
import { pose } from '../state/pose'
import { useGame } from '../state/store'

const WALK_SPEED = 3.2
const SPRINT_SPEED = 5.2
const MOUSE_SENSITIVITY = 0.0022
const KEY_TURN_SPEED = 1.9
const MAX_PITCH = 1.25
const INTERACT_RANGE = 2.2

export function Player() {
  const camera = useThree((s) => s.camera)
  const keys = useRef(new Set<string>())
  const stride = useRef(0)

  useEffect(() => {
    camera.rotation.order = 'YXZ'

    const down = (e: KeyboardEvent) => keys.current.add(e.code)
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    const clear = () => keys.current.clear()
    const look = (e: MouseEvent) => {
      if (!isLocked()) return
      pose.yaw -= e.movementX * MOUSE_SENSITIVITY
      pose.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pose.pitch - e.movementY * MOUSE_SENSITIVITY))
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    document.addEventListener('mousemove', look)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      document.removeEventListener('mousemove', look)
    }
  }, [camera])

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    const game = useGame.getState()
    const k = keys.current
    let moving = false

    if (game.mode === 'playing') {
      // Arrow keys turn, so the base is walkable without pointer lock.
      const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0)
      pose.yaw += turn * KEY_TURN_SPEED * dt

      const forward = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
      const strafe = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0)

      if (forward !== 0 || strafe !== 0) {
        const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED
        const norm = 1 / Math.hypot(forward, strafe)
        const sin = Math.sin(pose.yaw)
        const cos = Math.cos(pose.yaw)
        const dx = (-sin * forward + cos * strafe) * norm * speed * dt
        const dz = (-cos * forward - sin * strafe) * norm * speed * dt

        // Resolve each axis on its own so the player slides along walls.
        if (canStand(pose.x + dx, pose.z)) pose.x += dx
        if (canStand(pose.x, pose.z + dz)) pose.z += dz

        moving = true
        stride.current += speed * dt * 2.2
      }

      const room = roomAt(pose.x, pose.z)
      if (room && room !== game.room) game.setRoom(room)

      const fx = -Math.sin(pose.yaw)
      const fz = -Math.cos(pose.yaw)
      let nearest: string | null = null
      let best = INTERACT_RANGE
      for (const c of consoles) {
        const cx = c.x - pose.x
        const cz = c.z - pose.z
        const dist = Math.hypot(cx, cz)
        if (dist < best && (cx * fx + cz * fz) / dist > 0.35) {
          best = dist
          nearest = c.id
        }
      }
      if (nearest !== game.nearbyConsoleId) game.setNearby(nearest)
    }

    const bob = moving ? Math.sin(stride.current) * 0.028 : 0
    camera.position.set(pose.x, EYE_HEIGHT + bob, pose.z)
    camera.rotation.set(pose.pitch, pose.yaw, 0)
  })

  return null
}
