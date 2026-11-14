import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameStore, selectCanAct, selectCanPerform } from '@/store'
import type { DiceType, Genre } from '@/types'

type CriticalFace = { type: DiceType; genre: Genre; value: number }

const criticalTheme = {
  Ballad: { color: '#e66346', particles: '#ffaf51' },
  Folk: { color: '#62894b', particles: '#a8c875' },
  Hymn: { color: '#d6a748', particles: '#ffe5a3' },
  Shanty: { color: '#488bc6', particles: '#94e6ff' },
}

let threeModule: Promise<typeof import('three')> | undefined
function loadThree() {
  return threeModule ??= import('three')
}

function DiceToss({ face, onDone }: { face: CriticalFace; onDone: () => void }) {
  const surface = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = surface.current
    if (!host || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let cancelled = false
    let dispose: (() => void) | undefined
    void loadThree().then((THREE) => {
      if (cancelled) return
      let renderer: InstanceType<typeof THREE.WebGLRenderer>
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      } catch {
        return
      }
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(38, 2, 0.1, 30)
      camera.position.set(0, 3.4, 5.7)
      camera.lookAt(0, 0.5, 0)
      const palette = criticalTheme[face.genre]
      const shape = {
        d4: THREE.TetrahedronGeometry,
        d8: THREE.OctahedronGeometry,
        d12: THREE.DodecahedronGeometry,
        d20: THREE.IcosahedronGeometry,
      }[face.type]
      const geometry = new shape(0.82)
      geometry.computeBoundingBox()
      const material = new THREE.MeshStandardMaterial({ color: palette.color, roughness: 0.48, metalness: 0.12, flatShading: true })
      const die = new THREE.Mesh(geometry, material)
      const edges = new THREE.EdgesGeometry(geometry)
      const edgeMaterial = new THREE.LineBasicMaterial({ color: palette.particles, transparent: true, opacity: 0.65 })
      die.add(new THREE.LineSegments(edges, edgeMaterial))
      scene.add(die, new THREE.HemisphereLight(0xffefcf, 0x553326, 2.2))
      const light = new THREE.DirectionalLight(0xffeacc, 2.8)
      light.position.set(-3, 5, 4)
      scene.add(light)

      const moteCount = 28
      const motes = new Float32Array(moteCount * 3)
      const moteGeometry = new THREE.BufferGeometry()
      const positions = new THREE.BufferAttribute(motes, 3)
      moteGeometry.setAttribute('position', positions)
      const stamp = document.createElement('canvas')
      stamp.width = stamp.height = 32
      const ink = stamp.getContext('2d')!
      ink.fillStyle = '#ffffff'
      ink.beginPath()
      if (face.genre === 'Shanty') {
        ink.moveTo(16, 2)
        ink.bezierCurveTo(11, 11, 5, 16, 7, 23)
        ink.bezierCurveTo(10, 34, 26, 30, 26, 21)
        ink.bezierCurveTo(26, 15, 20, 9, 16, 2)
      } else if (face.genre === 'Folk') {
        ink.moveTo(4, 27)
        ink.quadraticCurveTo(4, 6, 28, 5)
        ink.quadraticCurveTo(26, 27, 4, 27)
      } else {
        ink.moveTo(16, 1)
        ink.lineTo(face.genre === 'Hymn' ? 20 : 23, 12)
        ink.lineTo(31, 16)
        ink.lineTo(20, 20)
        ink.lineTo(16, 31)
        ink.lineTo(12, 20)
        ink.lineTo(face.genre === 'Hymn' ? 1 : 7, 16)
        ink.lineTo(12, 12)
      }
      ink.closePath()
      ink.fill()
      const moteTexture = new THREE.CanvasTexture(stamp)
      const moteMaterial = new THREE.PointsMaterial({
        color: palette.particles, map: moteTexture, size: 0.105, transparent: true, opacity: 0, depthWrite: false,
      })
      const particles = new THREE.Points(moteGeometry, moteMaterial)
      particles.frustumCulled = false
      scene.add(particles)
      const impact = new THREE.Group()
      const impactMaterial = new THREE.LineBasicMaterial({ color: palette.particles, transparent: true, opacity: 0 })
      const impactPaths: InstanceType<typeof THREE.BufferGeometry>[] = []
      for (let i = 0; i < (face.genre === 'Folk' ? 7 : 2); i++) {
        const points: InstanceType<typeof THREE.Vector3>[] = []
        if (face.genre === 'Folk') {
          const angle = i / 7 * Math.PI * 2
          for (let j = 0; j < 6; j++) {
            const radius = j * 0.23
            const turn = angle + Math.sin(j * 1.8 + i) * 0.22
            points.push(new THREE.Vector3(Math.cos(turn) * radius, 0, Math.sin(turn) * radius))
          }
          const tip = points[points.length - 1]
          points.push(points[3], new THREE.Vector3(tip.x * 0.78 - Math.sin(angle) * 0.32, 0, tip.z * 0.78 + Math.cos(angle) * 0.32))
        } else {
          for (let j = 0; j <= 40; j++) {
            const angle = j / 40 * Math.PI * 2
            const radius = 0.65 + i * 0.35
            points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
          }
        }
        const path = new THREE.BufferGeometry().setFromPoints(points)
        impactPaths.push(path)
        impact.add(new THREE.Line(path, impactMaterial))
      }
      scene.add(impact)
      const resize = () => {
        const width = Math.max(1, host.clientWidth)
        const height = Math.max(1, host.clientHeight)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height, false)
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
      host.appendChild(renderer.domElement)
      const observer = new ResizeObserver(resize)
      observer.observe(host)
      resize()
      const start = performance.now()
      let frame = 0
      const animate = (time: number) => {
        const elapsed = (time - start) / 1000
        const travel = Math.min(1, elapsed / 0.63)
        const bounce = Math.max(0, elapsed - 0.47)
        const arc = Math.sin(Math.PI * travel) * 1.03
        die.position.set((1 - travel) * -1.6, 0.69 + arc + Math.abs(Math.sin(bounce * 24)) * Math.max(0, 0.22 - bounce * 0.4), 0)
        const spin = 1 - (1 - travel) ** 2
        die.rotation.set(0.3 + spin * 6.9, 0.2 + spin * 7.2, 0.2 + spin * 6.1)
        const splash = Math.max(0, Math.min(1, (elapsed - 0.55) / 0.65))
        const fade = splash > 0 ? (1 - splash) ** 1.4 : 0
        impact.scale.setScalar(0.06 + splash * 1.6)
        impactMaterial.opacity = fade * 0.85
        moteMaterial.opacity = fade
        for (let i = 0; i < moteCount; i++) {
          const angle = i * 2.39996
          const radius = splash * (0.55 + (i % 7) * 0.15)
          positions.setXYZ(i, Math.cos(angle) * radius, Math.sin(splash * Math.PI) * (0.15 + (i % 6) * 0.13), Math.sin(angle) * radius)
        }
        positions.needsUpdate = true
        renderer.render(scene, camera)
        if (elapsed < 1.35) frame = requestAnimationFrame(animate)
        else onDone()
      }
      frame = requestAnimationFrame(animate)
      dispose = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        geometry.dispose()
        material.dispose()
        edges.dispose()
        edgeMaterial.dispose()
        moteGeometry.dispose()
        moteTexture.dispose()
        moteMaterial.dispose()
        impactPaths.forEach((path) => path.dispose())
        impactMaterial.dispose()
        renderer.dispose()
        renderer.domElement.remove()
      }
    }).catch(() => { /* The actual roll remains readable if WebGL cannot load. */ })
    return () => { cancelled = true; dispose?.() }
  }, [face, onDone])
  return <div ref={surface} className="mx-auto h-40 w-full overflow-hidden" aria-hidden="true" />
}

export function CriticalRollDialog() {
  const pendingDieId = useGameStore((state) => state.pendingCriticalDieId)
  const ownerId = useGameStore((state) => state.lastPlayedOwnerId)
  const songId = useGameStore((state) => state.currentSongId)
  const players = useGameStore((state) => state.players)
  const rolls = useGameStore((state) => state.rolls)
  const combatCanAct = useGameStore(selectCanAct)
  const showdownCanAct = useGameStore(selectCanPerform)
  const showdownCritical = useGameStore((state) => state.showdownCritical)
  const showdownUndo = useGameStore((state) => state.showdownUndo)
  const canAct = showdownCritical ? showdownCanAct : combatCanAct
  const dispatch = useGameStore((state) => state.dispatch)
  const dialog = useRef<HTMLDialogElement>(null)
  const inFlight = useRef(false)
  const timer = useRef<number>()
  const [busy, setBusy] = useState(false)
  const [toss, setToss] = useState<CriticalFace | null>(null)
  const [error, setError] = useState('')
  const performerId = showdownCritical ? showdownUndo?.performerId : ownerId
  const performingSongId = showdownCritical ? showdownUndo?.songId : songId
  const dieId = showdownCritical?.dieId ?? pendingDieId
  const song = players.find((player) => player.id === performerId)?.songs.find((item) => item.id === performingSongId)
  const die = song?.slots.find((slot) => slot.dice?.id === dieId)?.dice
  const pending = (showdownCritical?.rolls ?? rolls).find((roll) => roll.diceId === dieId)
  const open = Boolean(pending && die) || busy
  const finish = useCallback(() => {
    window.clearTimeout(timer.current)
    setToss(null)
    setBusy(false)
    inFlight.current = false
  }, [])
  useEffect(() => {
    const element = dialog.current
    if (open && element && !element.open) {
      element.showModal()
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) void loadThree().catch(() => undefined)
    }
    if (!open && element?.open) element.close()
  }, [open])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function rollAgain() {
    if (!die || !pending || !canAct || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const criticalStep = useGameStore.getState().nextIdSeq
      const type = showdownCritical ? 'REROLL_SHOWDOWN_SONG' : 'REROLL_SONG'
      const result = await dispatch({ type, criticalStep })
      if (!result.ok) {
        setError(result.error || 'The critical roll could not be completed. Try again.')
        finish()
        return
      }
      const finished = result.events.find((event) => event.type === 'diceRolled')
      const state = useGameStore.getState()
      const inProgress = showdownCritical ? state.showdownCritical?.rolls ?? [] : state.rolls
      const updated = (finished?.type === 'diceRolled' ? finished.rolls : inProgress)
        .find((roll) => roll.diceId === die.id)
      const value = updated?.cascadeRolls[pending.cascadeRolls.length]
      if (value === undefined) { finish(); return }
      setToss({ type: die.type, genre: die.genre, value })
      timer.current = window.setTimeout(finish, matchMedia('(prefers-reduced-motion: reduce)').matches ? 500 : 3000)
    } catch {
      setError('The critical roll could not be completed. Try again.')
      finish()
    }
  }

  return (
    <dialog ref={dialog} onCancel={(event) => event.preventDefault()} aria-labelledby="critical-title"
      className="w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-amber-600/50 bg-[#231815] p-6 text-center text-amber-50 shadow-2xl backdrop:bg-black/70">
      <h2 id="critical-title" className="font-display text-2xl text-amber-200">Critical Roll</h2>
      <div aria-live="polite">
        {toss ? (
          <>
            <DiceToss face={toss} onDone={finish} />
            <p className="text-xl font-bold" style={{ color: criticalTheme[toss.genre].particles }}>
              {toss.genre} {toss.type} rolled {toss.value}
            </p>
          </>
        ) : pending && die ? (
          <p className="my-5 text-amber-100">
            {die.genre} {die.type} rolled {pending.cascadeRolls[pending.cascadeRolls.length - 1] ?? pending.value}. {canAct ? 'Roll again to add bonus damage.' : 'Waiting for the active bard to roll again.'}
          </p>
        ) : <p className="my-5">Rolling…</p>}
      </div>
      {error && <p role="alert" className="mt-3 text-red-200">{error}</p>}
      {canAct && <button type="button" className="btn-primary mt-4 disabled:opacity-60" disabled={busy || !pending} onClick={() => void rollAgain()}>
        {busy ? 'Rolling…' : 'Roll Again'}
      </button>}
    </dialog>
  )
}
