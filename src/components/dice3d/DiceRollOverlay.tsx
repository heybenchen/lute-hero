import { useEffect, useRef, useState } from 'react'
import { diceBus, type TrayRequest } from './diceBus'
import { DiceTray, type TrayBadge } from './tray'

/**
 * Full-screen 3D dice tray. Lives in its own lazy chunk (three.js + cannon-es)
 * and stays mounted once loaded so the WebGL context is reused across rolls.
 */
export function DiceRollOverlay({ request }: { request: TrayRequest | null }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const trayRef = useRef<DiceTray | null>(null)
  const [badges, setBadges] = useState<TrayBadge[]>([])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let tray: DiceTray
    try {
      tray = new DiceTray(host, setBadges)
    } catch {
      // No WebGL: the 2D card animation carries every roll instead
      diceBus.disable()
      return
    }
    trayRef.current = tray
    const observer = new ResizeObserver(() => tray.resize())
    observer.observe(host)
    return () => {
      observer.disconnect()
      tray.dispose()
      trayRef.current = null
    }
  }, [])

  useEffect(() => {
    const tray = trayRef.current
    if (!request) return
    if (!tray) {
      diceBus.finish(request.id)
      return
    }
    let active = true
    tray.play(request).then(() => {
      if (active) diceBus.finish(request.id)
    }, () => diceBus.finish(request.id))
    return () => {
      active = false
    }
  }, [request])

  useEffect(() => {
    if (!request) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') trayRef.current?.skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [request])

  return (
    <div
      className="fixed inset-0 z-[80]"
      style={{ pointerEvents: request ? 'auto' : 'none', visibility: request ? 'visible' : 'hidden' }}
      onClick={() => trayRef.current?.skip()}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: request ? 1 : 0,
          background: 'radial-gradient(ellipse at 50% 55%, rgba(10, 7, 4, 0.18) 0%, rgba(10, 7, 4, 0.5) 100%)',
        }}
      />
      <div ref={hostRef} className="absolute inset-0">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="dice-badge pointer-events-none absolute"
            style={{ left: badge.x, top: badge.y, '--badge-color': badge.color } as React.CSSProperties}
          >
            {badge.crit && <span className="dice-badge-crit">Crit!</span>}
            <span className="dice-badge-value">{badge.text}</span>
          </div>
        ))}
      </div>
      {request && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.25em] text-parchment-400/70 select-none">
          Tap to skip
        </div>
      )}
    </div>
  )
}
