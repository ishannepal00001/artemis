import { BoxGeometry, type BufferGeometry, CylinderGeometry, Euler, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export type Vec3 = [number, number, number]

const ONE = new Vector3(1, 1, 1)

/**
 * Collects static geometry by material and merges each group into a single
 * mesh, so hundreds of detail parts cost one draw call per material.
 */
export class Kit<M extends string> {
  private parts = new Map<M, BufferGeometry[]>()

  /** uvTile: metres per texture repeat for box parts, per material. Others keep a 1 m tile. */
  constructor(private uvTile: Partial<Record<M, number>> = {}) {}

  add(mat: M, geometry: BufferGeometry, pos: Vec3, rot: Vec3 = [0, 0, 0], worldUV = false) {
    const matrix = new Matrix4().compose(new Vector3(...pos), new Quaternion().setFromEuler(new Euler(...rot)), ONE)
    geometry.applyMatrix4(matrix)
    if (worldUV) projectWorldUV(geometry, this.uvTile[mat] ?? 1)
    const list = this.parts.get(mat) ?? []
    list.push(geometry)
    this.parts.set(mat, list)
    return this
  }

  box(mat: M, size: Vec3, pos: Vec3, rot?: Vec3) {
    return this.add(mat, new BoxGeometry(...size), pos, rot, true)
  }

  /** Cylinder along Y unless rotated. */
  cyl(mat: M, radiusTop: number, radiusBottom: number, height: number, pos: Vec3, rot?: Vec3, segments = 16) {
    return this.add(mat, new CylinderGeometry(radiusTop, radiusBottom, height, segments), pos, rot)
  }

  sphere(mat: M, radius: number, pos: Vec3, thetaLength = Math.PI, rot?: Vec3) {
    return this.add(mat, new SphereGeometry(radius, 24, 14, 0, Math.PI * 2, 0, thetaLength), pos, rot)
  }

  /** Ring lying flat in the XZ plane unless rotated. */
  torus(mat: M, radius: number, tube: number, pos: Vec3, rot: Vec3 = [0, 0, 0]) {
    return this.add(mat, new TorusGeometry(radius, tube, 8, 32), pos, [rot[0] + Math.PI / 2, rot[1], rot[2]])
  }

  build(): { mat: M; geometry: BufferGeometry }[] {
    return [...this.parts].map(([mat, list]) => ({ mat, geometry: mergeGeometries(list, false) }))
  }
}

/**
 * Rewrites UVs from world position, projected along each face's dominant axis,
 * so a tiling texture keeps one scale and lines up across separate boxes.
 */
function projectWorldUV(geometry: BufferGeometry, tile: number) {
  const pos = geometry.attributes.position
  const normal = geometry.attributes.normal
  const uv = geometry.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(normal.getX(i))
    const ay = Math.abs(normal.getY(i))
    const az = Math.abs(normal.getZ(i))
    if (ay >= ax && ay >= az) uv.setXY(i, pos.getX(i) / tile, pos.getZ(i) / tile)
    else if (ax >= az) uv.setXY(i, pos.getZ(i) / tile, pos.getY(i) / tile)
    else uv.setXY(i, pos.getX(i) / tile, pos.getY(i) / tile)
  }
}
