import { fbm, seeded, smoothstep } from './noise'

interface Crater {
  x: number
  z: number
  r: number
}

const CRATERS: Crater[] = (() => {
  const rand = seeded(1234)
  const list: Crater[] = []
  while (list.length < 46) {
    const angle = rand() * Math.PI * 2
    const dist = 24 + rand() ** 1.3 * 200
    list.push({ x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, r: 1.5 + rand() ** 2.5 * 16 })
  }
  return list
})()

/** Ground height at a world position. Flat under and around the base, rougher with distance. */
export function terrainHeight(x: number, z: number) {
  const dist = Math.hypot(x, z)

  // Rolling ground plus fine lumps.
  let h = (fbm(x * 0.05, z * 0.05, 4, 5) - 0.5) * 1.6 + (fbm(x * 0.4, z * 0.4, 2, 9) - 0.5) * 0.12

  // Distant ridgeline, kept low to the west so it does not hide the Earth.
  const west = dist > 0 ? smoothstep(0.55, 0.95, -x / dist) : 0
  h += smoothstep(70, 230, dist) * fbm(x * 0.012, z * 0.012, 4, 77) * 26 * (1 - 0.85 * west)

  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r
    if (d > 1.7) continue
    if (d < 1) h -= (1 - d * d) * c.r * 0.16
    h += c.r * 0.05 * Math.exp(-(((d - 1) / 0.22) ** 2))
  }

  return h * smoothstep(15, 30, dist) - 0.06
}
