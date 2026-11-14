import * as THREE from 'three'
import type { DiceType } from '@/types'

/**
 * A die as a convex polyhedron: unique vertices plus logical faces (triangles,
 * pentagons...) with vertex indices wound counter-clockwise seen from outside,
 * which is what both the renderer and cannon-es expect.
 */
export interface DieShape {
  type: DiceType
  sides: number
  vertices: THREE.Vector3[]
  faces: number[][]
  normals: THREE.Vector3[]
  centroids: THREE.Vector3[]
  /** d4s are read from the vertex pointing up; every other die from its top face. */
  readsVertex: boolean
  /** For each face (or d4 vertex), the index of the one opposite it, or -1. */
  opposite: number[]
}

const RADIUS: Record<DiceType, number> = { d4: 1.25, d8: 1.0, d12: 0.98, d20: 1.02 }
const SIDES: Record<DiceType, number> = { d4: 4, d8: 8, d12: 12, d20: 20 }

function sourceGeometry(type: DiceType): THREE.BufferGeometry {
  const r = RADIUS[type]
  switch (type) {
    case 'd4': return new THREE.TetrahedronGeometry(r, 0)
    case 'd8': return new THREE.OctahedronGeometry(r, 0)
    case 'd12': return new THREE.DodecahedronGeometry(r, 0)
    case 'd20': return new THREE.IcosahedronGeometry(r, 0)
  }
}

function buildShape(type: DiceType): DieShape {
  const geometry = sourceGeometry(type)
  const pos = geometry.getAttribute('position')
  const vertices: THREE.Vector3[] = []
  const vertexIndex = (v: THREE.Vector3) => {
    const found = vertices.findIndex((u) => u.distanceToSquared(v) < 1e-6)
    if (found >= 0) return found
    vertices.push(v.clone())
    return vertices.length - 1
  }

  // Group the triangles three.js emits into coplanar logical faces
  const groups: { normal: THREE.Vector3; verts: Set<number> }[] = []
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i)
    b.fromBufferAttribute(pos, i + 1)
    c.fromBufferAttribute(pos, i + 2)
    const normal = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize()
    let group = groups.find((g) => g.normal.dot(normal) > 0.999)
    if (!group) {
      group = { normal, verts: new Set() }
      groups.push(group)
    }
    group.verts.add(vertexIndex(a)).add(vertexIndex(b)).add(vertexIndex(c))
  }
  geometry.dispose()

  const faces: number[][] = []
  const normals: THREE.Vector3[] = []
  const centroids: THREE.Vector3[] = []
  for (const group of groups) {
    const ids = [...group.verts]
    const centroid = ids.reduce((acc, id) => acc.add(vertices[id]), new THREE.Vector3()).divideScalar(ids.length)
    // Make sure the normal points outward, then sort CCW around it
    const normal = group.normal.clone()
    if (normal.dot(centroid) < 0) normal.negate()
    const u = new THREE.Vector3().subVectors(vertices[ids[0]], centroid).normalize()
    const w = new THREE.Vector3().crossVectors(normal, u)
    const angle = (id: number) => {
      const d = new THREE.Vector3().subVectors(vertices[id], centroid)
      return Math.atan2(d.dot(w), d.dot(u))
    }
    ids.sort((p, q) => angle(p) - angle(q))
    faces.push(ids)
    normals.push(normal)
    centroids.push(centroid)
  }

  const readsVertex = type === 'd4'
  const directions = readsVertex ? vertices.map((v) => v.clone().normalize()) : normals
  const opposite = directions.map((d, i) =>
    directions.findIndex((e, j) => j !== i && d.dot(e) < -0.999))

  return { type, sides: SIDES[type], vertices, faces, normals, centroids, readsVertex, opposite }
}

const cache = new Map<DiceType, DieShape>()

export function getDieShape(type: DiceType): DieShape {
  let shape = cache.get(type)
  if (!shape) {
    shape = buildShape(type)
    cache.set(type, shape)
  }
  return shape
}

/**
 * Default labels in the style of real dice: opposite faces sum to sides + 1
 * where the shape has opposite faces. Indexed by face (or vertex for a d4).
 */
export function defaultLabels(shape: DieShape): number[] {
  const count = shape.readsVertex ? shape.vertices.length : shape.faces.length
  const labels = new Array<number>(count).fill(0)
  let next = 1
  for (let i = 0; i < count; i++) {
    if (labels[i]) continue
    labels[i] = next
    const opp = shape.opposite[i]
    if (opp >= 0 && !labels[opp]) labels[opp] = shape.sides + 1 - next
    next++
  }
  return labels
}

/**
 * Relabel so the face (or vertex) the die physically landed on shows `value`,
 * swapping opposite pairs together so the "opposites sum to N+1" rule holds.
 */
export function labelsShowing(shape: DieShape, landed: number, value: number): number[] {
  const labels = defaultLabels(shape)
  const holder = labels.indexOf(value)
  if (holder < 0 || holder === landed) return labels
  const swap = (i: number, j: number) => { [labels[i], labels[j]] = [labels[j], labels[i]] }
  swap(holder, landed)
  const oppHolder = shape.opposite[holder]
  const oppLanded = shape.opposite[landed]
  if (oppHolder >= 0 && oppLanded >= 0 && oppHolder !== landed && oppLanded !== holder) swap(oppHolder, oppLanded)
  return labels
}
