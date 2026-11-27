import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ELEMENT_THEME } from '@/data/elementTheme'
import type { Element } from '@/types'

export interface ChordStrike {
  id: string
  element: Element | null
  hadCrit: boolean
  wasResisted: boolean
}

interface Props {
  verse: number
  element?: Element | null
  strike?: ChordStrike
  finale?: boolean
  absorb?: boolean
}

/** Five sympathetic strings frame a fractured sound hole. Engine results cue each pluck. */
export function ChordStage({ verse, element, strike, finale, absorb }: Props) {
  const mount = useRef<HTMLDivElement>(null)
  const latest = useRef(strike)
  useEffect(() => { if (strike) latest.current = strike }, [strike])

  useEffect(() => {
    const host = mount.current
    if (!host || !window.WebGL2RenderingContext) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }) } catch { return }
    renderer.domElement.className = 'absolute inset-0'
    host.appendChild(renderer.domElement)
    host.dataset.rendering = 'true'
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-5, 5, 1.85, -1.85, .1, 40)
    camera.position.z = 10
    const hue = element ? ELEMENT_THEME[element].color : '#ad83ff'
    const body = new THREE.Group()
    scene.add(body)
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.86, 0),
      new THREE.MeshStandardMaterial({ color: '#261535', metalness: .55, roughness: .32, flatShading: true }))
    body.add(core)
    scene.add(new THREE.HemisphereLight('#ead7ff', '#31142a', 2))
    const light = new THREE.PointLight(hue, 65)
    light.position.set(-2, 2, 3)
    scene.add(light)
    const rings = Array.from({ length: 3 }, (_, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.98 + i * .1, .012, 6, 92),
        new THREE.MeshBasicMaterial({ color: i === 1 ? '#e2bb75' : hue }))
      body.add(ring)
      return ring
    })
    const wires = Array.from({ length: 5 }, (_, i) => {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(81 * 3), 3))
      const wire = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: '#bea46e', transparent: true, opacity: .5 - .05 * i}))
      wire.frustumCulled = false
      scene.add(wire)
      return wire
    })
    const sparks = Array.from({length: 32}, () => {
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(.06), new THREE.MeshBasicMaterial({color: hue}))
      scene.add(spark)
      return spark
    })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const start = performance.now()
    let cueAt = absorb && element ? 0 : -100
    let seen: string | undefined
    function draw(now: number) {
      const t = (now - start) / 1000
      const cue = latest.current
      if (cue && cue.id !== seen) { seen = cue.id; cueAt = t }
      const age = t - cueAt
      const motion = reduced.matches ? 0 : t
      body.rotation.set(.25, motion * .25, -.12)
      const burst = finale ? Math.max(0, t - .65) : 0
      body.scale.setScalar(reduced.matches ? 1 : Math.max(0, 1 - burst * 2) * (1 + .09 * Math.exp(-8 * Math.abs(age - .38))))
      rings.forEach((ring, i) => ring.rotation.set(.5 + i * .79, .35 + motion * (.22 + verse * .06) + i, i + motion * .13))
      wires.forEach((wire, i) => {
        const positions = wire.geometry.attributes.position
        for (let j = 0; j <= 80; j++) {
          const x = (j / 80 - .5) * 18
          const pluck = Math.exp(-3 * Math.max(0, age)) * Math.sin(22 * age - Math.abs(x) * 2)
          positions.setXYZ(j, x, (i - 2) * .17 + (reduced.matches ? 0 : .06 * Math.sin(x + motion + i) + .24 * pluck), -.9)
        }
        positions.needsUpdate = true
      })
      sparks.forEach((spark, i) => {
        const angle = i * 2.39996
        const flight = age - .38
        spark.visible = !reduced.matches && (finale ? burst > 0 && burst < 2.4 : age >= 0 && age < 1.15)
        if (!spark.visible) return
        const distance = finale ? burst * (1.2 + i % 5) : absorb ? 0 : Math.max(0, flight) * (cue?.wasResisted ? 1.4 : 3.6)
        const inbound = finale ? 0 : Math.max(0, -flight) * (8 + i % 4)
        spark.position.set(Math.cos(angle) * distance + (i % 2 ? inbound : -inbound), Math.sin(angle) * distance + (i % 5 - 2) * .12, 1)
        spark.material.color.set(cue?.element ? ELEMENT_THEME[cue.element].color : hue)
        spark.scale.setScalar((finale ? 3.2 : cue?.hadCrit ? 1.7 : 1) * Math.max(.1, finale ? 1 - burst / 2.4 : 1 - Math.max(0, flight)))
      })
      renderer.render(scene, camera)
    }
    function resize() {
      if (!host) return
      const {clientWidth: w, clientHeight: h} = host
      renderer.setSize(w, h)
      camera.right = 1.85 * w / Math.max(h, 1)
      camera.left = -camera.right
      camera.updateProjectionMatrix()
      if (reduced.matches) draw(performance.now())
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    const renderMode = () => {
      renderer.setAnimationLoop(reduced.matches ? null : draw)
      draw(performance.now())
    }
    reduced.addEventListener('change', renderMode)
    renderMode()
    return () => {
      reduced.removeEventListener('change', renderMode)
      observer.disconnect()
      renderer.setAnimationLoop(null)
      for (const item of [core, ...rings, ...wires, ...sparks]) { item.geometry.dispose(); item.material.dispose() }
      renderer.dispose()
      renderer.domElement.remove()
      delete host.dataset.rendering
    }
  }, [verse, element, finale, absorb])

  return <div ref={mount} aria-hidden="true" className="group relative mx-auto w-full h-36 sm:h-44 overflow-hidden grid place-items-center" style={{background: 'radial-gradient(ellipse at center, #39294b 0%, #1b1426 24%, transparent 66%)'}}>
    <div className="group-data-[rendering=true]:hidden grid place-items-center rounded-full border border-purple-400/60 w-20 h-20 text-3xl text-purple-200" style={{background: 'radial-gradient(circle at 30% 25%, #654578, #170b20 65%)'}}>♫</div>
  </div>
}
