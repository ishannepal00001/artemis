import { Color, MeshStandardMaterial, type MeshStandardMaterialParameters } from 'three'
import { floorSurface, metalSurface, regolithSurface, wallSurface, type SurfaceMaps } from './textures'

export type Mat =
  | 'wall'
  | 'ceiling'
  | 'floor'
  | 'trim'
  | 'metal'
  | 'paint'
  | 'dark'
  | 'blue'
  | 'orange'
  | 'solar'
  | 'glass'
  | 'glowBlue'
  | 'glowOrange'
  | 'ledGreen'
  | 'ledAmber'
  | 'ledRed'

/** Metres per texture repeat for box parts. Anything not listed tiles every metre. */
export const UV_TILE: Partial<Record<Mat, number>> = { wall: 2, ceiling: 2, floor: 1 }

/** Materials that should not block light: glass and anything that is itself a light. */
export const NO_SHADOW = new Set<Mat>(['glass', 'glowBlue', 'glowOrange', 'ledGreen', 'ledAmber', 'ledRed'])

// With the packed map in place, the roughness and metalness numbers act as
// multipliers on what the texture holds.
function surface(maps: SurfaceMaps, params: MeshStandardMaterialParameters & { bump?: number }) {
  const { bump = 1, ...rest } = params
  const material = new MeshStandardMaterial({
    map: maps.map,
    normalMap: maps.normalMap,
    aoMap: maps.ormMap,
    roughnessMap: maps.ormMap,
    metalnessMap: maps.ormMap,
    roughness: 1,
    metalness: 1,
    ...rest,
  })
  material.normalScale.setScalar(bump)
  return material
}

function glow(color: string, intensity: number) {
  return new MeshStandardMaterial({ color: '#050505', emissive: new Color(color), emissiveIntensity: intensity, roughness: 0.4 })
}

function create() {
  const wall = wallSurface()
  const floor = floorSurface()
  const metal = metalSurface()
  const regolith = regolithSurface()

  // The ground repeats the regolith tile every 4 m across a 520 m plane.
  const ground: SurfaceMaps = { map: regolith.map.clone(), normalMap: regolith.normalMap.clone(), ormMap: regolith.ormMap.clone() }
  for (const t of Object.values(ground)) t.repeat.setScalar(130)

  const kit: Record<Mat, MeshStandardMaterial> = {
    // Painted composite panels, so only slightly metallic.
    wall: surface(wall, { color: '#dfe2e6' }),
    ceiling: surface(wall, { color: '#b9bec6' }),
    floor: surface(floor, { color: '#8f96a1' }),
    // Structural and bare metal: high metalness, medium roughness.
    trim: surface(metal, { color: '#3b4350', metalness: 0.85, roughness: 1 }),
    metal: surface(metal, { color: '#b4bac3', metalness: 0.95, roughness: 0.85 }),
    dark: surface(metal, { color: '#1c2129', metalness: 0.7, roughness: 1.1 }),
    // Painted equipment.
    paint: surface(metal, { color: '#e2e5e8', metalness: 0.25, roughness: 1.2, bump: 0.5 }),
    blue: surface(metal, { color: '#1f5fd0', metalness: 0.25, roughness: 1.2, bump: 0.5 }),
    orange: surface(metal, { color: '#f2701a', metalness: 0.25, roughness: 1.2, bump: 0.5 }),
    solar: new MeshStandardMaterial({ color: '#0b1838', metalness: 0.9, roughness: 0.22 }),
    glass: new MeshStandardMaterial({ color: '#9fc4ff', transparent: true, opacity: 0.1, roughness: 0.4, depthWrite: false }),
    glowBlue: glow('#2f6fe6', 0.9),
    glowOrange: glow('#ff7a1a', 0.7),
    ledGreen: glow('#3fd39a', 2.6),
    ledAmber: glow('#ff9a2a', 2.6),
    ledRed: glow('#ff3b30', 3),
  }

  return {
    kit,
    ground: surface(ground, { color: '#8e9197' }),
    rock: surface(regolith, { color: '#7c7f85', bump: 1.4 }),
  }
}

let cache: ReturnType<typeof create> | null = null

/** Built on first use, since the textures need a document to draw on. */
export function getMaterials() {
  return (cache ??= create())
}
