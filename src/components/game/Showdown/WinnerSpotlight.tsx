import { useEffect, useMemo, useState } from 'react'
import { Player } from '@/types'
import { calculateFinalRankings } from '@/game-logic/fame/calculator'

interface WinnerSpotlightProps {
  players: Player[]
  showdownFandom: Record<string, number>
  onContinue: () => void
}

const NOTE_GLYPHS = ['♪', '♫', '♬', '♩', '★', '✦']

/** Deterministic pseudo-random confetti layout so re-renders don't reshuffle. */
function buildConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const seed = (i * 2654435761) % 1000
    return {
      id: i,
      glyph: NOTE_GLYPHS[i % NOTE_GLYPHS.length],
      left: (seed % 100),
      delay: (seed % 47) / 10,
      duration: 4 + ((seed % 31) / 10),
      size: 14 + (seed % 22),
      hue: [212, 168, 83],
    }
  })
}

/** Animated count-up for the winner's fan total. */
function useCountUp(target: number, durationMs: number, start: boolean) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    let frame: number
    const t0 = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - t0) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs, start])
  return value
}

export function WinnerSpotlight({ players, showdownFandom, onContinue }: WinnerSpotlightProps) {
  const ranked = useMemo(() => calculateFinalRankings(players), [players])
  const winner = ranked[0]
  const confetti = useMemo(() => buildConfetti(28), [])

  // Staged reveal: spotlights sweep → winner appears → scores roll in
  const [revealStage, setRevealStage] = useState(0)
  useEffect(() => {
    const timers = [
      setTimeout(() => setRevealStage(1), 900), // spotlights lock, winner appears
      setTimeout(() => setRevealStage(2), 1800), // fan count rolls
      setTimeout(() => setRevealStage(3), 2900), // scoreboard + button
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const winnerFans = useCountUp(winner?.fame ?? 0, 1600, revealStage >= 2)

  if (!winner) return null

  return (
    <div className="min-h-[100dvh] relative overflow-hidden flex flex-col items-center justify-center px-4 py-10" style={{ background: '#07050a' }}>
      {/* Sweeping stage spotlights */}
      <div
        className={`absolute -top-10 left-1/2 origin-top pointer-events-none ${revealStage >= 1 ? 'animate-spotlight-lock-l' : 'animate-spotlight-sweep-l'}`}
        style={{
          width: 'min(46vw, 420px)',
          height: '120vh',
          marginLeft: 'calc(min(-23vw, -210px))',
          background: 'linear-gradient(to bottom, rgba(240, 215, 140, 0.22), rgba(240, 215, 140, 0.02) 70%, transparent)',
          clipPath: 'polygon(46% 0, 54% 0, 100% 100%, 0 100%)',
          filter: 'blur(2px)',
        }}
      />
      <div
        className={`absolute -top-10 left-1/2 origin-top pointer-events-none ${revealStage >= 1 ? 'animate-spotlight-lock-r' : 'animate-spotlight-sweep-r'}`}
        style={{
          width: 'min(46vw, 420px)',
          height: '120vh',
          marginLeft: 'calc(min(-23vw, -210px))',
          background: 'linear-gradient(to bottom, rgba(216, 180, 254, 0.16), rgba(216, 180, 254, 0.02) 70%, transparent)',
          clipPath: 'polygon(46% 0, 54% 0, 100% 100%, 0 100%)',
          filter: 'blur(2px)',
        }}
      />

      {/* Music-note confetti */}
      {revealStage >= 1 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confetti.map((c) => (
            <span
              key={c.id}
              className="absolute animate-note-fall select-none"
              style={{
                left: `${c.left}%`,
                top: '-6%',
                fontSize: c.size,
                color: c.id % 3 === 0 ? '#f0d78c' : c.id % 3 === 1 ? '#d8b4fe' : winner.color,
                textShadow: '0 0 10px rgba(240, 215, 140, 0.5)',
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
              }}
            >
              {c.glyph}
            </span>
          ))}
        </div>
      )}

      {/* Winner reveal */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div
          className={`text-xs sm:text-sm font-medieval uppercase tracking-[0.5em] text-gold-500/80 mb-6 transition-all duration-700 ${revealStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}
        >
          The Realm Has Chosen
        </div>

        <div className={`relative mb-5 transition-all duration-700 ${revealStage >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          {/* Crown */}
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-4xl animate-crown-bob" style={{ filter: 'drop-shadow(0 0 12px rgba(240, 215, 140, 0.7))' }}>
            👑
          </div>
          {/* Radiant ring */}
          <div className="absolute -inset-5 rounded-full animate-winner-ring pointer-events-none" style={{ border: '2px solid rgba(240, 215, 140, 0.5)' }} />
          <div
            className="player-avatar w-28 h-28 sm:w-32 sm:h-32 text-5xl animate-winner-glow"
            style={{ backgroundColor: winner.color, border: '3px solid rgba(240, 215, 140, 0.9)' }}
          >
            {winner.name.charAt(0)}
          </div>
        </div>

        <div
          className={`font-display text-4xl sm:text-6xl text-gold-300 mb-2 transition-all duration-700 delay-150 ${revealStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ textShadow: '0 0 30px rgba(240, 215, 140, 0.55), 0 4px 12px rgba(0,0,0,0.6)' }}
        >
          {winner.name}
        </div>
        <div
          className={`font-medieval text-sm sm:text-base uppercase tracking-[0.35em] text-parchment-300 mb-5 transition-all duration-700 delay-300 ${revealStage >= 1 ? 'opacity-100' : 'opacity-0'}`}
        >
          ★ Legend of the Realm ★
        </div>

        <div className={`mb-8 transition-all duration-500 ${revealStage >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <span className="font-bold text-5xl sm:text-7xl text-gold-400 tabular-nums" style={{ textShadow: '0 0 40px rgba(212, 168, 83, 0.5)' }}>
            {winnerFans}
          </span>
          <span className="block text-sm text-parchment-400 font-medieval uppercase tracking-widest mt-1">Adoring Fans</span>
        </div>

        {/* Final score breakdown */}
        <div
          className={`w-full max-w-xl transition-all duration-700 ${revealStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <div className="card-ornate p-4 sm:p-6">
            <div className="text-xs font-medieval uppercase tracking-[0.3em] text-parchment-500 mb-4">Final Standings</div>
            <div className="space-y-2.5">
              {ranked.map((p, idx) => {
                const fandom = showdownFandom[p.id] || 0
                const tourFame = p.fame - fandom
                const topFame = ranked[0].fame || 1
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 animate-slide-up"
                    style={{ animationDelay: `${idx * 130}ms`, animationFillMode: 'both' }}
                  >
                    <div className="w-7 text-center font-display text-lg" style={{ color: idx === 0 ? '#f0d78c' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#8a7a60' }}>
                      {idx + 1}
                    </div>
                    <div className="player-avatar w-9 h-9 text-sm flex-shrink-0" style={{ backgroundColor: p.color }}>
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className={`text-sm font-bold truncate ${idx === 0 ? 'text-gold-300' : 'text-parchment-200'}`}>{p.name}</span>
                        <span className="text-sm font-bold text-gold-400 tabular-nums flex-shrink-0">{p.fame} fans</span>
                      </div>
                      <div className="flex justify-between items-baseline gap-2 text-[11px] text-parchment-500">
                        <span>{tourFame} on tour · {fandom} in the showdown</span>
                      </div>
                      <div className="hp-bar h-1.5 mt-1">
                        <div
                          className="hp-fill rounded-full"
                          style={{ width: `${(p.fame / topFame) * 100}%`, background: p.color, boxShadow: `0 0 6px ${p.color}88` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <button onClick={onContinue} className="btn-primary text-base px-10 py-3 mt-6">
            📜 View Tour Stats
          </button>
        </div>
      </div>
    </div>
  )
}
