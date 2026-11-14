import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import type { DieShape } from './dieShapes'

export interface Arena {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface RestingDie {
  shape: DieShape
  position: THREE.Vector3
  quaternion: THREE.Quaternion
}

export interface ThrowResult {
  /** Per die: frameCount × [px, py, pz, qx, qy, qz, qw], sampled at FRAME_RATE. */
  tracks: Float32Array[]
  frameCount: number
  /** Per die: the face (or d4 vertex) that ended up on top. */
  landed: number[]
}

export const FRAME_RATE = 60
const SUBSTEPS = 2
const MAX_SECONDS = 6
const GRAVITY = -42
const UP = new THREE.Vector3(0, 1, 0)

const diceMaterial = new CANNON.Material('dice')
const floorMaterial = new CANNON.Material('floor')
const wallMaterial = new CANNON.Material('wall')

const shapeCache = new WeakMap<DieShape, CANNON.ConvexPolyhedron>()
function physicsShape(shape: DieShape): CANNON.ConvexPolyhedron {
  let poly = shapeCache.get(shape)
  if (!poly) {
    poly = new CANNON.ConvexPolyhedron({
      vertices: shape.vertices.map((v) => new CANNON.Vec3(v.x, v.y, v.z)),
      faces: shape.faces.map((f) => [...f]),
    })
    shapeCache.set(shape, poly)
  }
  return poly
}

function buildWorld(arena: Arena) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) })
  world.allowSleep = false
  world.broadphase = new CANNON.NaiveBroadphase()
  ;(world.solver as CANNON.GSSolver).iterations = 20
  world.defaultContactMaterial.friction = 0.3
  world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial, floorMaterial, { friction: 0.4, restitution: 0.4 }))
  world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial, wallMaterial, { friction: 0.05, restitution: 0.6 }))
  world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial, diceMaterial, { friction: 0.12, restitution: 0.45 }))

  const plane = (material: CANNON.Material, position: CANNON.Vec3, axis: CANNON.Vec3, angle: number) => {
    const body = new CANNON.Body({ mass: 0, material, shape: new CANNON.Plane() })
    body.position.copy(position)
    body.quaternion.setFromAxisAngle(axis, angle)
    world.addBody(body)
  }
  const X = new CANNON.Vec3(1, 0, 0)
  const Y = new CANNON.Vec3(0, 1, 0)
  plane(floorMaterial, new CANNON.Vec3(0, 0, 0), X, -Math.PI / 2)
  plane(wallMaterial, new CANNON.Vec3(0, 9, 0), X, Math.PI / 2)
  plane(wallMaterial, new CANNON.Vec3(arena.minX, 0, 0), Y, Math.PI / 2)
  plane(wallMaterial, new CANNON.Vec3(arena.maxX, 0, 0), Y, -Math.PI / 2)
  plane(wallMaterial, new CANNON.Vec3(0, 0, arena.minZ), Y, 0)
  plane(wallMaterial, new CANNON.Vec3(0, 0, arena.maxZ), Y, Math.PI)
  return world
}

/** Which face (or d4 vertex) points up for a die at this orientation, and how squarely. */
export function topOf(shape: DieShape, quaternion: THREE.Quaternion): { index: number; alignment: number } {
  const dirs = shape.readsVertex ? shape.vertices.map((v) => v.clone().normalize()) : shape.normals
  let index = 0
  let alignment = -Infinity
  const d = new THREE.Vector3()
  dirs.forEach((dir, i) => {
    const dot = d.copy(dir).applyQuaternion(quaternion).dot(UP)
    if (dot > alignment) {
      alignment = dot
      index = i
    }
  })
  return { index, alignment }
}

function attempt(dice: DieShape[], resting: RestingDie[], arena: Arena, rng: () => number): ThrowResult | null {
  const world = buildWorld(arena)
  for (const still of resting) {
    const body = new CANNON.Body({ mass: 0, material: diceMaterial, shape: physicsShape(still.shape) })
    body.position.set(still.position.x, still.position.y, still.position.z)
    body.quaternion.set(still.quaternion.x, still.quaternion.y, still.quaternion.z, still.quaternion.w)
    world.addBody(body)
  }

  // Toss from the near edge of the table (the player's side) away toward the
  // middle, with forward topspin like dice leaving a hand.
  const width = arena.maxX - arena.minX
  const depth = arena.maxZ - arena.minZ
  const centerX = (arena.minX + arena.maxX) / 2
  const centerZ = (arena.minZ + arena.maxZ) / 2
  const releaseX = centerX + (rng() - 0.5) * width * 0.35
  const bodies = dice.map((shape, i) => {
    const body = new CANNON.Body({
      mass: 1,
      material: diceMaterial,
      shape: physicsShape(shape),
      linearDamping: 0.14,
      angularDamping: shape.faces.length > 8 ? 0.32 : 0.2,
    })
    const spread = (i - (dice.length - 1) / 2) * 1.5
    const startX = THREE.MathUtils.clamp(releaseX + spread + (rng() - 0.5) * 0.4, arena.minX + 1, arena.maxX - 1)
    const startZ = arena.maxZ - 0.9 - rng() * 0.5
    body.position.set(startX, 2.6 + rng() * 1.2 + (i % 2) * 0.4, startZ)
    const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2))
    body.quaternion.set(quat.x, quat.y, quat.z, quat.w)
    const targetX = centerX + spread * 1.3 + (rng() - 0.5) * width * 0.25
    const targetZ = centerZ + (rng() - 0.5) * depth * 0.25
    const travel = Math.hypot(targetX - startX, targetZ - startZ)
    const speed = THREE.MathUtils.clamp(travel * 0.92, 5.5, 12) * (0.9 + rng() * 0.2)
    const dirX = (targetX - startX) / travel
    const dirZ = (targetZ - startZ) / travel
    body.velocity.set(dirX * speed, 1 + rng() * 2.5, dirZ * speed)
    // Topspin about the axis perpendicular to travel, plus a little wobble
    const roll = 12 + rng() * 12
    body.angularVelocity.set(
      dirZ * roll + (rng() - 0.5) * 8,
      (rng() - 0.5) * 10,
      -dirX * roll + (rng() - 0.5) * 8,
    )
    world.addBody(body)
    return body
  })

  const maxFrames = MAX_SECONDS * FRAME_RATE
  const raw: number[][] = bodies.map(() => [])
  const dt = 1 / (FRAME_RATE * SUBSTEPS)
  let calmFrames = 0
  let frame = 0
  for (; frame < maxFrames; frame++) {
    for (let s = 0; s < SUBSTEPS; s++) world.step(dt)
    bodies.forEach((body, i) => {
      // Rolling resistance: cannon-es has none, so a slow die on the felt would
      // rock for seconds. Bleed energy progressively as it slows, as cloth does.
      const speed = body.velocity.length()
      const spin = body.angularVelocity.length()
      const onFloor = body.position.y < 1.4
      if (onFloor && speed < 2.5 && spin < 6) {
        const drag = speed < 0.8 && spin < 2.5 ? 0.86 : 0.95
        body.angularVelocity.scale(drag, body.angularVelocity)
        body.velocity.x *= drag
        body.velocity.z *= drag
      }
      raw[i].push(body.position.x, body.position.y, body.position.z,
        body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
    })
    const calm = bodies.every((b) => b.velocity.length() < 0.06 && b.angularVelocity.length() < 0.08)
    calmFrames = calm ? calmFrames + 1 : 0
    if (calmFrames >= 18 && frame > FRAME_RATE * 0.8) break
  }
  if (calmFrames < 18) return null

  const landed: number[] = []
  for (const [i, body] of bodies.entries()) {
    const q = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
    const top = topOf(dice[i], q)
    // Reject a die left cocked against a wall or another die
    if (top.alignment < (dice[i].readsVertex ? 0.94 : 0.985)) return null
    const p = body.position
    if (p.x < arena.minX || p.x > arena.maxX || p.z < arena.minZ || p.z > arena.maxZ) return null
    landed.push(top.index)
  }

  // Trim the imperceptible creep before the solver calls everything calm, so
  // playback ends the moment the dice visibly stop.
  const total = Math.min(frame + 1, maxFrames)
  let lastMotion = 0
  for (let f = 1; f < total; f++) {
    const moving = raw.some((track) => {
      const a = (f - 1) * 7, b = f * 7
      const dp = Math.hypot(track[b] - track[a], track[b + 1] - track[a + 1], track[b + 2] - track[a + 2])
      const dot = Math.abs(track[a + 3] * track[b + 3] + track[a + 4] * track[b + 4] + track[a + 5] * track[b + 5] + track[a + 6] * track[b + 6])
      return dp > 0.0025 || dot < 0.999995
    })
    if (moving) lastMotion = f
  }
  const frameCount = Math.min(total, lastMotion + 4)
  const tracks = raw.map((r) => {
    // Hold the true resting pose on the final frame
    const track = Float32Array.from(r.slice(0, frameCount * 7))
    track.set(r.slice((total - 1) * 7, total * 7), (frameCount - 1) * 7)
    return track
  })
  return { tracks, frameCount, landed }
}

/**
 * Throw dice with real rigid-body physics. Returns a recorded trajectory for
 * playback plus which face each die came to rest on; the caller relabels the
 * faces so the landed one shows the engine's predetermined result.
 */
export function simulateThrow(dice: DieShape[], resting: RestingDie[], arena: Arena, rng: () => number = Math.random): ThrowResult | null {
  for (let tries = 0; tries < 12; tries++) {
    const result = attempt(dice, resting, arena, rng)
    if (result) return result
  }
  return null
}
