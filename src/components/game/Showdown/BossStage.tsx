import { ChordStage, type ChordStrike } from './ChordStage'
import { Genre, Player } from '@/types'
import { showdownTurns } from '@/game-logic/showdown/showdown'
import { GENRE_THEME } from '@/data/genreTheme'

interface BossStageProps {
  strike?: ChordStrike
  turn: number
  resistGenre: Genre | null
  fandom: Record<string, number>
  players: Player[]
  /** Ramps the boss's visual instability as its defeat approaches */
  defeated?: boolean
}

/** The Eternal Silence — a void orb that grows more unstable each turn. */
export function BossStage({ turn, resistGenre, fandom, players, defeated, strike }: BossStageProps) {
  const totalFandom = players.reduce((sum, p) => sum + (fandom[p.id] || 0), 0)

  return (
    <div className="flex flex-col items-center">
      {/* Turn pips */}
      <div className="flex items-center gap-2 mb-3">
        {Array.from({ length: showdownTurns() }, (_, i) => i + 1).map((t) => (
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
            {t < showdownTurns() && <div className="w-6 h-px" style={{ background: 'rgba(212,168,83,0.25)' }} />}
          </div>
        ))}
      </div>
      <div className="text-xs font-medieval uppercase tracking-[0.3em] text-purple-300/70 mb-4">
        {defeated ? 'The Silence Falls' : `Verse ${turn} of ${showdownTurns()}`}
      </div>

      <ChordStage verse={turn} element={resistGenre} strike={strike} />

      <div
        className="font-display text-2xl sm:text-3xl text-purple-200 mb-1 text-center"
        style={{ textShadow: '0 0 20px rgba(168, 85, 247, 0.5)' }}
      >
        The Eternal Silence
      </div>
      <div className="text-xs text-parchment-500 italic mb-3 text-center max-w-xs">
        The antithesis of all music — outlast it, and let the crowd decide who shone brightest.
      </div>

      {/* Elemental adaptation badges — same mechanics as monster strengths/weaknesses */}
      {resistGenre && (
        <div className="flex flex-wrap justify-center gap-2 mb-4 animate-slide-up">
          {resistGenre && (
            <span
              className="text-xs font-medieval font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{
                background: 'rgba(232, 32, 64, 0.12)',
                border: '1px solid rgba(232, 32, 64, 0.4)',
                color: '#ff9d9d',
              }}
              title={`${resistGenre} dice deal no damage this verse`}
            >
              🛡 0× {GENRE_THEME[resistGenre].emoji} <span style={{ color: GENRE_THEME[resistGenre].color }}>{resistGenre}</span> — immune
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
