import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { DiceType, Genre } from '@/types'
import { GENRE_THEME, readableTextColor } from '@/data/genreTheme'
import { getDieShape, labelsShowing, type DieShape } from './dieShapes'
import { FRAME_RATE, simulateThrow, type Arena, type ThrowResult } from './simulate'
import type { TrayRequest } from './diceBus'

export interface TrayBadge {
  id: string
  x: number
  y: number
  text: string
  color: string
  crit: boolean
}

const TEXTURE_SIZE = 256
/** Face polygons are drawn into the texture at this fraction of its half-size. */
const FACE_SCALE = 0.92
const HOLD_MS = 1050
const CRIT_PAUSE_MS = 650
const FADE_MS = 360
const CAMERA_TILT = THREE.MathUtils.degToRad(17)
const FOV = 30

// ------------------------------------------------------------------
// Render geometry + face textures (shared across dice)
// ------------------------------------------------------------------

interface RenderShape {
  geometry: THREE.BufferGeometry
  /** Every face of a regular die projects to this same 2D polygon (unit circumradius). */
  polygon: THREE.Vector2[]
}

const renderShapes = new Map<DiceType, RenderShape>()

function renderShape(shape: DieShape): RenderShape {
  const cached = renderShapes.get(shape.type)
  if (cached) return cached

  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const geometry = new THREE.BufferGeometry()
  let polygon: THREE.Vector2[] = []
  let circumradius = 1

  shape.faces.forEach((face, f) => {
    const centroid = shape.centroids[f]
    const normal = shape.normals[f]
    const u = new THREE.Vector3().subVectors(shape.vertices[face[0]], centroid).normalize()
    const w = new THREE.Vector3().crossVectors(normal, u)
    circumradius = shape.vertices[face[0]].distanceTo(centroid)
    const flat = face.map((id) => {
      const d = new THREE.Vector3().subVectors(shape.vertices[id], centroid)
      return new THREE.Vector2(d.dot(u), d.dot(w)).divideScalar(circumradius)
    })
    if (f === 0) polygon = flat
    const start = positions.length / 3
    for (let i = 1; i < face.length - 1; i++) {
      for (const k of [0, i, i + 1]) {
        const v = shape.vertices[face[k]]
        positions.push(v.x, v.y, v.z)
        normals.push(normal.x, normal.y, normal.z)
        uvs.push(0.5 + flat[k].x * 0.5 * FACE_SCALE, 0.5 + flat[k].y * 0.5 * FACE_SCALE)
      }
    }
    geometry.addGroup(start, positions.length / 3 - start, f)
  })

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  const result = { geometry, polygon }
  renderShapes.set(shape.type, result)
  return result
}

function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, Math.min(1, hsl.s * 1.05), THREE.MathUtils.clamp(hsl.l + amount, 0, 1))
  return `#${c.getHexString()}`
}

const FONT_PX: Record<DiceType, number> = { d4: 50, d8: 84, d12: 90, d20: 74 }
const textures = new Map<string, THREE.CanvasTexture>()

/** Engraved number(s) on a resin face, with a soft bevel highlight at the edges. */
function faceTexture(shape: DieShape, genre: Genre, labels: number[], face: number, maxAnisotropy: number): THREE.CanvasTexture {
  const faceLabels = shape.readsVertex ? shape.faces[face].map((v) => labels[v]) : [labels[face]]
  const key = `${shape.type}|${genre}|${faceLabels.join(',')}`
  const cached = textures.get(key)
  if (cached) return cached

  const { polygon } = renderShape(shape)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = TEXTURE_SIZE
  const ctx = canvas.getContext('2d')!
  const half = TEXTURE_SIZE / 2
  const toCanvas = (p: THREE.Vector2, scale = 1) => ({
    x: half + p.x * half * FACE_SCALE * scale,
    y: half - p.y * half * FACE_SCALE * scale,
  })
  const base = GENRE_THEME[genre].color
  const ink = readableTextColor(base) === '#ffffff' ? '#fbf6ea' : '#21170c'

  // Resin body: a gentle radial falloff so faces don't read as flat stickers
  const body = ctx.createRadialGradient(half * 0.85, half * 0.8, 4, half, half, half * 1.05)
  body.addColorStop(0, shade(base, 0.08))
  body.addColorStop(0.65, base)
  body.addColorStop(1, shade(base, -0.14))
  ctx.fillStyle = body
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

  // Bevel: a lighter rim just inside each edge, darker right at the edge
  const trace = (scale: number) => {
    ctx.beginPath()
    polygon.forEach((p, i) => {
      const c = toCanvas(p, scale)
      if (i === 0) ctx.moveTo(c.x, c.y)
      else ctx.lineTo(c.x, c.y)
    })
    ctx.closePath()
  }
  ctx.lineJoin = 'round'
  trace(1)
  ctx.strokeStyle = shade(base, -0.22)
  ctx.lineWidth = 10
  ctx.stroke()
  trace(0.93)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 5
  ctx.stroke()

  const engrave = (text: string, x: number, y: number, angle: number, size: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.font = `700 ${size}px Cinzel, Georgia, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // Inset shadow then fill reads as paint-filled engraving
    ctx.fillStyle = 'rgba(0,0,0,0.38)'
    ctx.fillText(text, 0, size * 0.04 + 2)
    ctx.fillStyle = ink
    ctx.fillText(text, 0, 0)
    if ((text === '6' || text === '9') && shape.sides >= 9) {
      ctx.fillRect(-size * 0.22, size * 0.42, size * 0.44, Math.max(3, size * 0.06))
    }
    ctx.restore()
  }

  const size = FONT_PX[shape.type]
  if (shape.readsVertex) {
    // d4: each corner shows the value of the vertex it points at
    polygon.forEach((p, i) => {
      const theta = Math.atan2(p.y, p.x)
      const at = toCanvas(p, 0.52)
      engrave(String(faceLabels[i]), at.x, at.y, Math.PI / 2 - theta, size)
    })
  } else {
    // Numbers point toward the face's first vertex, like a printed die
    const nudge = shape.faces[0].length === 3 ? -0.04 : 0
    const at = toCanvas(new THREE.Vector2(nudge, 0))
    const text = String(faceLabels[0])
    engrave(text, at.x, at.y, Math.PI / 2, text.length > 1 ? size * 0.8 : size)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  texture.generateMipmaps = true
  textures.set(key, texture)
  return texture
}

let halo: THREE.CanvasTexture | null = null
function haloTexture(): THREE.CanvasTexture {
  if (halo) return halo
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  halo = new THREE.CanvasTexture(canvas)
  return halo
}

// ------------------------------------------------------------------
// The tray
// ------------------------------------------------------------------

interface LiveDie {
  shape: DieShape
  mesh: THREE.Mesh
  materials: THREE.MeshPhysicalMaterial[]
  value: number
  crit: boolean
  genre: Genre
}

export class DiceTray {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 200)
  private keyLight: THREE.DirectionalLight
  private arena: Arena = { minX: -6, maxX: 6, minZ: -3.5, maxZ: 3.5 }
  private dice: LiveDie[] = []
  private frame = 0
  private cancelled = false
  private skipRequested = false
  private width = 1
  private height = 1

  constructor(
    private host: HTMLElement,
    private onBadges: (badges: TrayBadge[]) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 0.95
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const canvas = this.renderer.domElement
    canvas.style.position = 'absolute'
    canvas.style.inset = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    host.appendChild(canvas)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.4
    pmrem.dispose()

    this.scene.add(new THREE.HemisphereLight(0xfff1d6, 0x2a1c10, 0.55))
    this.keyLight = new THREE.DirectionalLight(0xffe2b8, 2.6)
    this.keyLight.castShadow = true
    this.keyLight.shadow.mapSize.set(2048, 2048)
    this.keyLight.shadow.bias = -0.0004
    this.keyLight.shadow.normalBias = 0.02
    this.keyLight.shadow.radius = 5
    this.scene.add(this.keyLight, this.keyLight.target)
    const rim = new THREE.DirectionalLight(0xb9d4ff, 0.7)
    rim.position.set(6, 5, -10)
    this.scene.add(rim)

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.42 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.scene.add(floor)

    this.resize()
  }

  /** Fit the camera so a die is a comfortable size on screen, and wall the tray to the visible floor. */
  resize() {
    this.width = Math.max(1, this.host.clientWidth)
    this.height = Math.max(1, this.host.clientHeight)
    this.renderer.setSize(this.width, this.height, false)
    const aspect = this.width / this.height
    this.camera.aspect = aspect
    const diePx = THREE.MathUtils.clamp(Math.min(this.width, this.height) * 0.1, 58, 92)
    const worldWidth = (this.width / diePx) * 1.75
    const distance = worldWidth / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * aspect)
    this.camera.position.set(0, distance * Math.cos(CAMERA_TILT), distance * Math.sin(CAMERA_TILT))
    this.camera.lookAt(0, 0, 0)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()

    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const raycaster = new THREE.Raycaster()
    const hit = (x: number, y: number) => {
      raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera)
      return raycaster.ray.intersectPlane(floorPlane, new THREE.Vector3()) ?? new THREE.Vector3()
    }
    const topLeft = hit(-1, 1), topRight = hit(1, 1), bottomLeft = hit(-1, -1), bottomRight = hit(1, -1)
    const margin = 1.05
    this.arena = {
      minX: Math.max(topLeft.x, bottomLeft.x) + margin,
      maxX: Math.min(topRight.x, bottomRight.x) - margin,
      minZ: Math.max(topLeft.z, topRight.z) + margin * 1.4,
      maxZ: Math.min(bottomLeft.z, bottomRight.z) - margin,
    }

    const span = Math.max(this.arena.maxX - this.arena.minX, this.arena.maxZ - this.arena.minZ)
    this.keyLight.position.set(-span * 0.35, 18, span * 0.25)
    const cam = this.keyLight.shadow.camera
    cam.left = cam.bottom = -span * 0.7
    cam.right = cam.top = span * 0.7
    cam.near = 1
    cam.far = 60
    cam.updateProjectionMatrix()
    this.render()
  }

  skip() {
    this.skipRequested = true
  }

  /** Throw every die in the request (then any crit cascades) and resolve once they've landed and faded. */
  async play(request: TrayRequest): Promise<void> {
    this.cancelled = false
    this.skipRequested = false
    this.clear()
    this.host.style.transition = ''
    this.host.style.opacity = '1'

    const waves = Math.max(...request.dice.map((d) => d.values.length))
    for (let wave = 0; wave < waves && !this.cancelled && !this.skipRequested; wave++) {
      const throwing = request.dice.filter((d) => d.values.length > wave)
      const shapes = throwing.map((d) => getDieShape(d.type))
      const resting = this.dice.map((d) => ({ shape: d.shape, position: d.mesh.position.clone(), quaternion: d.mesh.quaternion.clone() }))
      const sim = simulateThrow(shapes, resting, this.arena)
      if (!sim) break

      const added = throwing.map((d, i) => {
        const value = d.values[wave]
        const live = this.spawn(shapes[i], d.genre, sim.landed[i], value)
        live.crit = value === shapes[i].sides && d.values.length > wave + 1
        return live
      })
      await this.playback(sim, added)
      this.publishBadges()
      if (added.some((d) => d.crit) && wave < waves - 1) await this.critFlash(added.filter((d) => d.crit))
    }

    if (!this.cancelled) await this.wait(this.skipRequested ? 120 : HOLD_MS)
    if (!this.cancelled) {
      this.host.style.transition = `opacity ${FADE_MS}ms ease-out`
      this.host.style.opacity = '0'
      await this.wait(FADE_MS)
    }
    this.clear()
    this.onBadges([])
    this.render()
  }

  private spawn(shape: DieShape, genre: Genre, landed: number, value: number): LiveDie {
    const labels = labelsShowing(shape, landed, value)
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy()
    const materials = shape.faces.map((_, f) => new THREE.MeshPhysicalMaterial({
      map: faceTexture(shape, genre, labels, f, maxAnisotropy),
      roughness: 0.3,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      sheen: 0.15,
      emissive: new THREE.Color(0xffc75a),
      emissiveIntensity: 0,
    }))
    const mesh = new THREE.Mesh(renderShape(shape).geometry, materials)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.visible = false
    this.scene.add(mesh)
    const live: LiveDie = { shape, mesh, materials, value, crit: false, genre }
    this.dice.push(live)
    return live
  }

  private playback(sim: ThrowResult, dice: LiveDie[]): Promise<void> {
    const qa = new THREE.Quaternion()
    const qb = new THREE.Quaternion()
    const apply = (t: number) => {
      const f = Math.min(sim.frameCount - 1, t * FRAME_RATE)
      const i0 = Math.floor(f)
      const i1 = Math.min(sim.frameCount - 1, i0 + 1)
      const k = f - i0
      dice.forEach((die, d) => {
        const track = sim.tracks[d]
        const a = i0 * 7, b = i1 * 7
        die.mesh.position.set(
          track[a] + (track[b] - track[a]) * k,
          track[a + 1] + (track[b + 1] - track[a + 1]) * k,
          track[a + 2] + (track[b + 2] - track[a + 2]) * k,
        )
        qa.set(track[a + 3], track[a + 4], track[a + 5], track[a + 6])
        qb.set(track[b + 3], track[b + 4], track[b + 5], track[b + 6])
        die.mesh.quaternion.slerpQuaternions(qa, qb, k)
        die.mesh.visible = true
      })
    }
    const duration = sim.frameCount / FRAME_RATE
    return new Promise((resolve) => {
      const start = performance.now()
      const tick = () => {
        const now = performance.now()
        if (this.cancelled) return resolve()
        const t = this.skipRequested ? duration : (now - start) / 1000
        apply(t)
        this.render()
        if (t >= duration) return resolve()
        this.frame = requestAnimationFrame(tick)
      }
      this.frame = requestAnimationFrame(tick)
    })
  }

  private critFlash(dice: LiveDie[]): Promise<void> {
    if (this.skipRequested) return Promise.resolve()
    // A gold halo blooms under each crit die and a warm light kisses its faces
    const halos = dice.map((die) => {
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: haloTexture(),
        color: 0xffc75a,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      }))
      halo.position.copy(die.mesh.position).setY(0.05)
      const light = new THREE.PointLight(0xffc066, 0, 6, 1.6)
      light.position.copy(die.mesh.position).setY(2.2)
      this.scene.add(halo, light)
      return { halo, light }
    })
    const cleanup = () => halos.forEach(({ halo, light }) => {
      this.scene.remove(halo, light)
      halo.material.dispose()
      light.dispose()
    })
    return new Promise((resolve) => {
      const start = performance.now()
      const tick = () => {
        const now = performance.now()
        if (this.cancelled) { cleanup(); return resolve() }
        const t = Math.min(1, (now - start) / CRIT_PAUSE_MS)
        const pulse = Math.sin(t * Math.PI)
        halos.forEach(({ halo, light }) => {
          halo.material.opacity = pulse * 0.9
          halo.scale.setScalar(1.6 + t * 3.2)
          light.intensity = pulse * 14
        })
        dice.forEach((die) => die.materials.forEach((m) => { m.emissiveIntensity = pulse * 0.22 }))
        this.render()
        if (t >= 1 || this.skipRequested) {
          dice.forEach((die) => die.materials.forEach((m) => { m.emissiveIntensity = 0.06 }))
          cleanup()
          this.render()
          return resolve()
        }
        this.frame = requestAnimationFrame(tick)
      }
      this.frame = requestAnimationFrame(tick)
    })
  }

  private publishBadges() {
    const rect = this.host.getBoundingClientRect()
    const v = new THREE.Vector3()
    this.onBadges(this.dice.map((die, i) => {
      v.copy(die.mesh.position)
      v.y += 1.25
      v.project(this.camera)
      return {
        id: `${i}`,
        x: (v.x * 0.5 + 0.5) * rect.width,
        y: (-v.y * 0.5 + 0.5) * rect.height,
        text: String(die.value),
        color: GENRE_THEME[die.genre].color,
        crit: die.crit,
      }
    }))
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now()
      const tick = () => {
        const now = performance.now()
        if (this.cancelled || now - start >= ms || (this.skipRequested && now - start >= Math.min(ms, 120))) return resolve()
        this.frame = requestAnimationFrame(tick)
      }
      this.frame = requestAnimationFrame(tick)
    })
  }

  private render() {
    this.renderer.render(this.scene, this.camera)
  }

  private clear() {
    for (const die of this.dice) {
      this.scene.remove(die.mesh)
      die.materials.forEach((m) => m.dispose())
    }
    this.dice = []
  }

  dispose() {
    this.cancelled = true
    cancelAnimationFrame(this.frame)
    this.clear()
    this.scene.environment?.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
