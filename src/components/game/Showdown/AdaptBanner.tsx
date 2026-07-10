import { Genre, Player } from '@/types'
import { ShowdownPerformance } from '@/game-logic/showdown/showdown'
import { GENRE_THEME } from '@/data/genreTheme'

interface AdaptBannerProps {
  turnEnded: number
  performances: ShowdownPerformance[]
  players: Player[]
  resistGenre: Genre | null
  weakGenre: Genre | null
  onContinue: () => void
}

/** Between-turn interlude: recap of the verse, then the boss's elemental adaptation. */
export function AdaptBanner({
  turnEnded,
  performances,
  players,
  resistGenre,
  weakGenre,
  onContinue,
}: AdaptBannerProps) {
  const byId = new Map(players.map((p) => [p.id, p]))
  const ranked = [...performances].sort((a, b) => b.fandom - a.fandom)

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Void backdrop pulse */}
      <div
        className="absolute inset-0 pointer-events-none animate-boss-aura"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(88, 28, 135, 0.25) 0%, transparent 60%)' }}
      />

      <div className="relative z-10 w-full max-w-2xl card-ornate p-6 sm:p-10 animate-scale-in text-center">
        <div className="text-xs font-medieval uppercase tracking-[0.35em] text-purple-300/80 mb-2">
          Verse {turnEnded} Complete
        </div>
        <div className="font-display text-3xl sm:text-4xl text-gold-400 mb-6" style={{ textShadow: '0 0 20px rgba(212,168,83,0.3)' }}>
          The Silence Listens...
        </div>

        {/* Verse recap */}
        <div className="space-y-2 mb-7 max-w-md mx-auto">
          {ranked.map((perf, idx) => {
            const player = byId.get(perf.playerId)
            if (!player) return null
            const topFandom = ranked[0].fandom || 1
            const theme = perf.genre ? GENRE_THEME[perf.genre] : null
            return (
              <div
                key={perf.playerId}
                className="flex items-center gap-3 animate-slide-up"
                style={{ animationDelay: `${idx * 140 + 100}ms`, animationFillMode: 'both' }}
              >
                <div className="player-avatar w-8 h-8 text-xs flex-shrink-0" style={{ backgroundColor: player.color }}>
                  {player.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline mb-0.5 gap-2">
                    <span className="text-sm font-bold text-parchment-200 truncate">
                      {player.name}
                      {theme && (
                        <span className="ml-1.5 text-xs font-normal" style={{ color: theme.color }}>
                          {theme.emoji} {perf.genre}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-bold text-gold-400 tabular-nums flex-shrink-0">
                      +{perf.fandom} fandom
                    </span>
                  </div>
                  <div className="hp-bar h-1.5">
                    <div
                      className="hp-fill rounded-full"
                      style={{
                        width: `${(perf.fandom / topFandom) * 100}%`,
                        background: player.color,
                        boxShadow: `0 0 6px ${player.color}88`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Adaptation announcement */}
        <div className="divider-ornate" />
        <div className="mt-5 mb-7 space-y-3">
          {resistGenre || weakGenre ? (
            <>
              {resistGenre && (
                <div
                  className="animate-slide-up rounded-lg px-4 py-3 max-w-md mx-auto"
                  style={{
                    animationDelay: '600ms',
                    animationFillMode: 'both',
                    background: 'rgba(232, 32, 64, 0.08)',
                    border: '1px solid rgba(232, 32, 64, 0.35)',
                  }}
                >
                  <span className="text-sm text-parchment-300">
                    🛡 It hardens against the mightiest sound —{' '}
                    <span className="font-bold" style={{ color: GENRE_THEME[resistGenre].color }}>
                      {GENRE_THEME[resistGenre].emoji} {resistGenre}
                    </span>{' '}
                    dice deal <span className="font-bold text-red-300">no damage</span> next verse.
                  </span>
                </div>
              )}
              {weakGenre && (
                <div
                  className="animate-slide-up rounded-lg px-4 py-3 max-w-md mx-auto"
                  style={{
                    animationDelay: '850ms',
                    animationFillMode: 'both',
                    background: 'rgba(76, 175, 80, 0.08)',
                    border: '1px solid rgba(76, 175, 80, 0.35)',
                  }}
                >
                  <span className="text-sm text-parchment-300">
                    💥 But the faintest note opens a crack —{' '}
                    <span className="font-bold" style={{ color: GENRE_THEME[weakGenre].color }}>
                      {GENRE_THEME[weakGenre].emoji} {weakGenre}
                    </span>{' '}
                    dice deal <span className="font-bold text-green-300">double damage</span> next verse!
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-parchment-400 italic animate-slide-up" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
              The performances rang too alike — the Silence cannot adapt.
            </div>
          )}
        </div>

        <button
          onClick={onContinue}
          className="btn-primary text-base px-10 py-3 animate-slide-up"
          style={{ animationDelay: '1100ms', animationFillMode: 'both' }}
        >
          ♪ Begin Verse {turnEnded + 1}
        </button>
      </div>
    </div>
  )
}
