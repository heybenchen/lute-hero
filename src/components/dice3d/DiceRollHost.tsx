import { useEffect, useState, type ComponentType } from 'react'
import { diceBus, useTrayRequest, type TrayRequest } from './diceBus'

type Overlay = ComponentType<{ request: TrayRequest | null }>

/** Longest a single throw may hold the table before we let the game carry on. */
const WATCHDOG_MS = 15000

function loadOverlay() {
  return import('./DiceRollOverlay').then((m) => m.DiceRollOverlay)
}

/**
 * Always-mounted, tiny entry point for the 3D dice. It registers with the bus
 * (so rolls get queued), prefetches the three.js chunk when the browser is
 * idle, and renders the overlay once it has loaded.
 */
export function DiceRollHost() {
  const request = useTrayRequest()
  const [Overlay, setOverlay] = useState<Overlay | null>(null)

  useEffect(() => diceBus.registerHost(), [])

  useEffect(() => {
    if (Overlay) return
    let cancelled = false
    const load = () => {
      loadOverlay().then(
        (component) => { if (!cancelled) setOverlay(() => component) },
        () => diceBus.disable(),
      )
    }
    if (request) {
      load()
    } else {
      const timer = window.setTimeout(load, 2500)
      return () => { cancelled = true; window.clearTimeout(timer) }
    }
    return () => { cancelled = true }
  }, [request, Overlay])

  useEffect(() => {
    if (!request) return
    const timer = window.setTimeout(() => diceBus.finish(request.id), WATCHDOG_MS)
    return () => window.clearTimeout(timer)
  }, [request])

  return Overlay ? <Overlay request={request} /> : null
}
