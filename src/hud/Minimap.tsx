import { useEffect, useRef } from 'react'
import { BOUNDS, consoles, doors, roomById, rooms } from '../data/base'
import { taskByConsole } from '../data/tasks'
import { pose } from '../state/pose'
import { useGame } from '../state/store'

const PAD = 0.8
const VIEW = [
  BOUNDS.x0 - PAD,
  BOUNDS.z0 - PAD,
  BOUNDS.x1 - BOUNDS.x0 + PAD * 2,
  BOUNDS.z1 - BOUNDS.z0 + PAD * 2,
].join(' ')

const SHORT: Record<string, string> = {
  command: 'CMD',
  life: 'LIFE',
  power: 'PWR',
  isru: 'ISRU',
}

export function Minimap() {
  const room = useGame((s) => s.room)
  const tasks = useGame((s) => s.tasks)
  const marker = useRef<SVGGElement>(null)

  // The pose changes every frame, so move the marker directly instead of re-rendering.
  useEffect(() => {
    let frame = 0
    const update = () => {
      const deg = (-pose.yaw * 180) / Math.PI
      marker.current?.setAttribute('transform', `translate(${pose.x} ${pose.z}) rotate(${deg})`)
      frame = requestAnimationFrame(update)
    }
    update()
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <section className="panel minimap" aria-label="Base map">
      <div className="minimap-head">
        <h2 className="panel-title">Base map</h2>
        <span className="minimap-room">{roomById[room].name}</span>
      </div>
      <svg viewBox={VIEW} role="img" aria-label={`You are in ${roomById[room].name}`}>
        {rooms.map((r) => (
          <rect
            key={r.id}
            className="map-room"
            data-current={r.id === room}
            x={r.x0}
            y={r.z0}
            width={r.x1 - r.x0}
            height={r.z1 - r.z0}
          />
        ))}
        {doors.map((d, i) => (
          <rect key={i} className="map-door" x={d.x - d.width / 2} y={d.z - 0.2} width={d.width} height={0.4} />
        ))}
        {rooms.map(
          (r) =>
            SHORT[r.id] && (
              <text key={r.id} className="map-label" x={(r.x0 + r.x1) / 2} y={(r.z0 + r.z1) / 2 + 0.4}>
                {SHORT[r.id]}
              </text>
            ),
        )}
        {consoles.map((c) => {
          const done = tasks.find((t) => t.id === taskByConsole[c.id].id)?.done
          return <circle key={c.id} className="map-task" data-done={done} cx={c.x} cy={c.z} r={0.55} />
        })}
        <g ref={marker}>
          <path className="map-cone" d="M0 0 -2.2 -3.6 A4.2 4.2 0 0 1 2.2 -3.6Z" />
          <path className="map-player" d="M0 -1 0.75 0.8 0 0.4 -0.75 0.8Z" />
        </g>
      </svg>
    </section>
  )
}
