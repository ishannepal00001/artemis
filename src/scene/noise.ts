/** Small deterministic generator, so procedural content is identical on every load. */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function hash(ix: number, iy: number, seed: number) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed + 1, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const wrap = (i: number, period: number) => (period ? ((i % period) + period) % period : i)

/** Smooth value noise in 0..1. A non-zero period makes it tile every `period` units. */
export function valueNoise(x: number, y: number, seed = 0, period = 0) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const a = hash(wrap(ix, period), wrap(iy, period), seed)
  const b = hash(wrap(ix + 1, period), wrap(iy, period), seed)
  const c = hash(wrap(ix, period), wrap(iy + 1, period), seed)
  const d = hash(wrap(ix + 1, period), wrap(iy + 1, period), seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Fractal noise in 0..1. */
export function fbm(x: number, y: number, octaves: number, seed = 0, period = 0) {
  let amp = 0.5
  let freq = 1
  let sum = 0
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + o * 17, period * freq)
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
