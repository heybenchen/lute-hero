import { Player } from '@/types'
import { SHOWDOWN_TURNS } from '@/game-logic/showdown/showdown'

interface BossStageProps {
  turn: number
  resistedPlayer: Player | null
  weakenedPlayer: Player | null
  fandom: Record<string, number>
  players: Player[]
  /** Ramps the boss's visual instability as its defeat approaches */
  defeated?: boolean
}

/** The Eternal Silence — a void orb that grows more unstable each turn. */
export function BossStage({ turn, resistedPlayer, weakenedPlayer, fandom, players, defeated }: BossStageProps) {
  const totalFandom = players.reduce((sum, p) => sum + (fandom[p.id] || 0), 0)

  return (
    <div className="flex flex-col items-center">
      {/* Turn pips */}
      <div className="flex items-center gap-2 mb-3">
        {Array.from({ length: SHOWDOWN_TURNS }, (_, i) => i + 1).map((t) => (
          <div key={t} className="flex items-center gap-2">
            <div
              className="rounded-full transition-all duration-500 flex items-center justify-center font-bold text-[10px]"
              style={{
                width: t === turn && !defeated ? 22 : 14,
                height: t === turn && !defeated ? 22 : 14,
                background: t < turn || defeated
                  ? 'rgba(212, 168, 83, 0.85)'
                  : t === turn
                    ? 'rgba(147, 51, 234, 0.9)'
                    : 'rgba(255,255,255,0.08)',
                border: t === turn && !defeated ? '2px solid rgba(216, 180, 254, 0.8)' : '1px solid rgba(255,255,255,0.15)',
                boxShadow: t === turn && !defeated ? '0 0 12px rgba(147, 51, 234, 0.6)' : 'none',
                color: t < turn || defeated ? '#1a1410' : '#e9d5ff',
              }}
            >
              {(t < turn || defeated) ? '✓' : t === turn ? t : ''}
            </div>
            {t < SHOWDOWN_TURNS && <div className="w-6 h-px" style={{ background: 'rgba(212,168,83,0.25)' }} />}
          </div>
        ))}
      </div>
      <div className="text-xs font-medieval uppercase tracking-[0.3em] text-purple-300/70 mb-4">
        {defeated ? 'The Silence Falls' : `Verse ${turn} of ${SHOWDOWN_TURNS}`}
      </div>

      {/* Boss orb */}
      <div className={`relative mb-4 ${defeated ? 'animate-boss-shatter' : turn >= 3 ? 'animate-boss-unstable' : ''}`}>
        {/* Outer aura */}
        <div
          className="absolute -inset-8 rounded-full animate-boss-aura pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(124, 58, 237, ${0.12 + turn * 0.06}) 0%, transparent 70%)`,
          }}
        />
        {/* Rotating rune ring */}
        <div
          className="absolute -inset-3 rounded-full animate-rune-spin pointer-events-none"
          style={{ border: '1px dashed rgba(168, 85, 247, 0.35)' }}
        />
        <div
          className="w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center relative overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 38% 32%, #2e1065 0%, #0c0316 55%, #000 100%)',
            border: '2px solid rgba(147, 51, 234, 0.5)',
            boxShadow: `0 0 ${25 + turn * 15}px rgba(124, 58, 237, ${0.25 + turn * 0.12}), inset 0 0 30px rgba(0,0,0,0.9)`,
          }}
        >
          <span
            className="text-4xl sm:text-5xl select-none animate-boss-breathe"
            style={{ filter: 'grayscale(1) brightness(0.5) drop-shadow(0 0 10px rgba(168, 85, 247, 0.6))' }}
          >
            🎵
          </span>
          {/* Void swallow effect over the note */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.75) 75%)' }} />
        </div>
      </div>

      <div
        className="font-display text-2xl sm:text-3xl text-purple-200 mb-1 text-center"
        style={{ textShadow: '0 0 20px rgba(168, 85, 247, 0.5)' }}
      >
        The Eternal Silence
      </div>
      <div className="text-xs text-parchment-500 italic mb-3 text-center max-w-xs">
        The antithesis of all music — outlast it, and let the crowd decide who shone brightest.
      </div>

      {/* Adaptation badges */}
      {(resistedPlayer || weakenedPlayer) && (
        <div className="flex flex-wrap justify-center gap-2 mb-4 animate-slide-up">
          {resistedPlayer && (
            <span
              className="text-xs font-medieval font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{
                background: 'rgba(232, 32, 64, 0.12)',
                border: '1px solid rgba(232, 32, 64, 0.4)',
                color: '#ff9d9d',
              }}
            >
              🛡 Hardened against {resistedPlayer.name} — ×½ fandom
            </span>
          )}
          {weakenedPlayer && (
            <span
              className="text-xs font-medieval font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{
                background: 'rgba(76, 175, 80, 0.12)',
                border: '1px solid rgba(76, 175, 80, 0.45)',
                color: '#a7f3ad',
              }}
            >
              💥 Cracks before {weakenedPlayer.name} — ×2 fandom
            </span>
          )}
        </div>
      )}

      {/* Live fandom race */}
      <div className="w-full max-w-lg">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-xs font-medieval uppercase tracking-wider text-parchment-500">Roar of the Crowd</span>
          <span className="text-sm font-bold text-gold-400 tabular-nums">{totalFandom} total fandom</span>
        </div>
        <div className="hp-bar h-3 bar-sheen mb-2">
          <div className="flex h-full">
            {players.map((p) => {
              const share = totalFandom > 0 ? ((fandom[p.id] || 0) / totalFandom) * 100 : 0
              return (
                <div
                  key={p.id}
                  className="h-full transition-[width] duration-700 ease-out first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${share}%`, background: p.color, boxShadow: `0 0 8px ${p.color}66` }}
                />
              )
            })}
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {[...players]
            .sort((a, b) => (fandom[b.id] || 0) - (fandom[a.id] || 0))
            .map((p) => (
              <span key={p.id} className="text-xs flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.color }} />
                <span className="text-parchment-300 font-bold">{p.name}</span>
                <span className="text-gold-400 font-bold tabular-nums">{fandom[p.id] || 0}</span>
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}
