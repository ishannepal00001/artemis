import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { fbm, smoothstep, valueNoise } from './noise'

// Procedural surface textures. Each surface is described by a tileable height
// function; the normal, ambient-occlusion and albedo-shading maps are derived
// from it, so grooves and rivets catch the light consistently.

export interface SurfaceMaps {
  /** Greyscale shading multiplied into the material colour. */
  map: Texture
  normalMap: Texture
  /** Packed the way three.js reads them: R = occlusion, G = roughness, B = metalness. */
  ormMap: Texture
}

interface SurfaceSpec {
  size: number
  normalStrength: number
  metalness: number
  /** Height in 0..1 for tile coordinates u, v in 0..1. Must tile. */
  height: (u: number, v: number) => number
  roughness: (u: number, v: number, h: number) => number
}

function toTexture(size: number, data: Uint8ClampedArray, srgb: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  image.data.set(data)
  ctx.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
  texture.anisotropy = 8
  return texture
}

function buildSurface(spec: SurfaceSpec): SurfaceMaps {
  const { size } = spec
  const heights = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) heights[y * size + x] = spec.height(x / size, y / size)
  }
  const h = (x: number, y: number) => heights[((y + size) % size) * size + ((x + size) % size)]

  const normal = new Uint8ClampedArray(size * size * 4)
  const orm = new Uint8ClampedArray(size * size * 4)
  const shade = new Uint8ClampedArray(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const here = h(x, y)

      // Canvas rows run downwards while v runs upwards, hence the flipped y term.
      const dx = (h(x + 1, y) - h(x - 1, y)) * spec.normalStrength
      const dy = (h(x, y + 1) - h(x, y - 1)) * spec.normalStrength
      const len = Math.hypot(dx, dy, 1)
      normal[i] = (-dx / len) * 127.5 + 127.5
      normal[i + 1] = (dy / len) * 127.5 + 127.5
      normal[i + 2] = (1 / len) * 127.5 + 127.5
      normal[i + 3] = 255

      // Occlusion: how far this texel sits below its surroundings.
      const r = 4
      const around =
        (h(x + r, y) + h(x - r, y) + h(x, y + r) + h(x, y - r) + h(x + r, y + r) + h(x - r, y - r) + h(x + r, y - r) + h(x - r, y + r)) / 8
      const ao = 1 - Math.min(1, Math.max(0, (around - here) * 2.2))

      orm[i] = ao * 255
      orm[i + 1] = Math.min(1, Math.max(0.04, spec.roughness(x / size, y / size, here))) * 255
      orm[i + 2] = spec.metalness * 255
      orm[i + 3] = 255

      const tone = (0.45 + 0.55 * ao) * 255
      shade[i] = shade[i + 1] = shade[i + 2] = tone
      shade[i + 3] = 255
    }
  }

  return { map: toTexture(size, shade, true), normalMap: toTexture(size, normal, false), ormMap: toTexture(size, orm, false) }
}

/** 1 inside a band of half-width w around c (with wrap-around at the tile edge), soft at the sides. */
const band = (x: number, c: number, w: number) => {
  const d = Math.abs(((x - c + 1.5) % 1) - 0.5)
  return 1 - smoothstep(w * 0.6, w, d)
}

/** Painted wall panels: a 2 m tile holding two 1 m panels, with seams and fastener rows. */
export function wallSurface() {
  return buildSurface({
    size: 512,
    normalStrength: 5,
    metalness: 0.15,
    height: (u, v) => {
      const seams = Math.max(band(u, 0, 0.007), band(u, 0.5, 0.007), band(v, 0, 0.007), band(v, 0.5, 0.004))
      // Fasteners sit in rows just inside the vertical seams.
      const nearSeam = Math.max(band(u, 0.035, 0.012), band(u, 0.465, 0.012), band(u, 0.535, 0.012), band(u, 0.965, 0.012))
      const fasteners = nearSeam * (1 - smoothstep(0.004, 0.008, Math.abs(((v * 8) % 1) - 0.5) / 8))
      return 0.6 - seams * 0.6 + fasteners * 0.25 + (fbm(u * 6, v * 6, 3, 3, 6) - 0.5) * 0.05
    },
    roughness: (u, v, h) => 0.58 + (fbm(u * 5, v * 14, 3, 9, 5) - 0.5) * 0.3 + (h < 0.3 ? 0.3 : 0),
  })
}

/** Deck plating: 1 m plates with a raised tread pattern. */
export function floorSurface() {
  return buildSurface({
    size: 512,
    normalStrength: 4,
    metalness: 0.55,
    height: (u, v) => {
      const seams = Math.max(band(u, 0, 0.008), band(v, 0, 0.008))
      const tread = Math.max(0, Math.sin(u * Math.PI * 24) * Math.sin(v * Math.PI * 24)) ** 0.6
      return 0.5 - seams * 0.5 + tread * 0.22 * (1 - seams) + (fbm(u * 8, v * 8, 3, 21, 8) - 0.5) * 0.06
    },
    roughness: (u, v, h) => 0.62 - h * 0.18 + (fbm(u * 3, v * 3, 4, 5, 3) - 0.5) * 0.35,
  })
}

/** Bare and painted metal parts: fine brushing along one axis. */
export function metalSurface() {
  return buildSurface({
    size: 256,
    normalStrength: 6,
    metalness: 1,
    // Kept shallow: the brushing should catch highlights, not read as stripes of shadow.
    height: (u, v) => 0.5 + (valueNoise(u * 6, v * 180, 2, 0) - 0.5) * 0.06 + (valueNoise(u * 3, v * 40, 4, 0) - 0.5) * 0.05,
    roughness: (u, v) => 0.42 + (fbm(u * 4, v * 4, 3, 31, 4) - 0.5) * 0.3,
  })
}

/** Regolith: fine powder with pocking, for the ground and the rocks. */
export function regolithSurface() {
  return buildSurface({
    size: 512,
    normalStrength: 7,
    metalness: 0,
    height: (u, v) => {
      const coarse = fbm(u * 6, v * 6, 5, 40, 6)
      const grit = valueNoise(u * 90, v * 90, 77, 90)
      // Scattered small pits.
      const pits = smoothstep(0.72, 0.8, valueNoise(u * 22, v * 22, 55, 22))
      return coarse * 0.75 + grit * 0.2 - pits * 0.25 + 0.1
    },
    roughness: (u, v) => 0.92 + valueNoise(u * 30, v * 30, 8, 30) * 0.08,
  })
}

/** Equirectangular Earth with a baked day side, used as both colour and glow. */
export function earthTexture(sunLongitude: number) {
  const w = 512
  const h = 256
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    const lat = (0.5 - y / h) * Math.PI
    for (let x = 0; x < w; x++) {
      const lon = (x / w) * Math.PI * 2
      const u = (x / w) * 8
      const v = (y / h) * 4
      const land = smoothstep(0.52, 0.58, fbm(u, v, 5, 11, 8))
      const cloud = smoothstep(0.5, 0.75, fbm(u * 1.7 + 3, v * 2.4, 5, 91, 0)) * 0.9
      const ice = smoothstep(1.15, 1.35, Math.abs(lat))
      let r = 20 + land * 70
      let g = 60 + land * 50
      let b = 150 - land * 95
      const white = Math.max(cloud, ice)
      r += (245 - r) * white
      g += (248 - g) * white
      b += (255 - b) * white
      // Lambert falloff from the sub-solar point, with a thin twilight band.
      const lit = Math.max(0, Math.cos(lat) * Math.cos(lon - sunLongitude) + Math.sin(lat) * 0.12)
      const k = 0.03 + 0.97 * Math.pow(lit, 0.7)
      const i = (y * w + x) * 4
      data[i] = r * k
      data[i + 1] = g * k
      data[i + 2] = b * k
      data[i + 3] = 255
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(w, h)
  image.data.set(data)
  ctx.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
