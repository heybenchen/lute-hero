import { useEffect, useMemo, useState } from 'react'
import { useGameStore, selectCanPerform } from '@/store'
import { Song, DiceRoll } from '@/types'
import { SongCard } from '../Combat/SongCard'
import { DiceDisplay } from '@/components/ui/DiceDisplay'
import { BossStage } from './BossStage'
import { AdaptBanner } from './AdaptBanner'
import { WinnerSpotlight } from './WinnerSpotlight'
import { getPlayableSongs, ShowdownPerformance } from '@/game-logic/showdown/showdown'

type Stage = 'intro' | 'perform' | 'adapt' | 'finale' | 'winner'

interface FandomPopup {
  id: string
  fandom: number
  hadCrit: boolean
  hitWeakness: boolean
  wasResisted: boolean
}

export function FinalShowdown() {
  const players = useGameStore((state) => state.players)
  const showdownComplete = useGameStore((state) => state.showdownComplete)
  const showdownTurn = useGameStore((state) => state.showdownTurn)
  const showdownOrder = useGameStore((state) => state.showdownOrder)
  const showdownPerformerIdx = useGameStore((state) => state.showdownPerformerIdx)
  const showdownResistGenre = useGameStore((state) => state.showdownResistGenre)
  const showdownWeakGenre = useGameStore((state) => state.showdownWeakGenre)
  const showdownSongsUsed = useGameStore((state) => state.showdownSongsUsed)
  const showdownCurrentFandom = useGameStore((state) => state.showdownCurrentFandom)
  const showdownFandom = useGameStore((state) => state.showdownFandom)
  const showdownHistory = useGameStore((state) => state.showdownHistory)
  const dispatch = useGameStore((state) => state.dispatch)
  const canPerform = useGameStore(selectCanPerform)
  const remoteEntry = useGameStore((state) => state.remoteEntry)
  const mode = useGameStore((state) => state.mode)

  // The engine starts the showdown when END_TURN flips the phase, so it is
  // already active on mount. Show the intro only for a fresh showdown;
  // resume mid-fight (after a refresh) straight into the perform stage.
  const [stage, setStage] = useState<Stage>(() => {
    if (showdownComplete) return 'winner'
    const fresh =
      showdownTurn === 1 &&
      showdownPerformerIdx === 0 &&
      showdownSongsUsed.length === 0 &&
      showdownHistory.length === 0
    return fresh ? 'intro' : 'perform'
  })
  const [lastRolls, setLastRolls] = useState<{ song: Song; rolls: DiceRoll[] } | null>(null)
  const [popups, setPopups] = useState<FandomPopup[]>([])
  const [adaptRecap, setAdaptRecap] = useState<ShowdownPerformance[]>([])
  const [adaptTurnEnded, setAdaptTurnEnded] = useState(1)

  // Boss-shatter finale plays out, then the winner takes the stage
  useEffect(() => {
    if (stage !== 'finale') return
    const timer = setTimeout(() => setStage('winner'), 3200)
    return () => clearTimeout(timer)
  }, [stage])

  // Spectators follow other performers live via the SSE event stream
  useEffect(() => {
    if (!remoteEntry) return
    for (const event of remoteEntry.events) {
      if (event.type === 'diceRolled' && event.context === 'showdown') {
        const owner = useGameStore.getState().players.find((p) => p.id === event.playerId)
        const song = owner?.songs.find((sg) => sg.id === event.songId)
        if (song) setLastRolls({ song, rolls: event.rolls })
      }
      if (event.type === 'showdownPlay') {
        const popup: FandomPopup = {
          id: `fandom-${event.playerId}-${Date.now()}`,
          fandom: event.fandom,
          hadCrit: event.hadCrit,
          hitWeakness: event.hitWeakness,
          wasResisted: event.wasResisted,
        }
        setPopups((prev) => [...prev, popup])
        setTimeout(() => setPopups((prev) => prev.filter((pp) => pp.id !== popup.id)), 1900)
      }
      if (event.type === 'showdownAdvance') {
        setLastRolls(null)
        if (event.advance === 'bossAdapts') {
          setAdaptRecap(event.recap ?? [])
          setAdaptTurnEnded(event.turnEnded ?? 1)
          setStage('adapt')
        } else if (event.advance === 'showdownComplete') {
          setStage('finale')
        }
      }
    }
  }, [remoteEntry])

  const performerId = showdownOrder[showdownPerformerIdx]
  const performer = players.find((p) => p.id === performerId)

  const playableSongs = useMemo(
    () => (performer ? getPlayableSongs(performer.songs) : []),
    [performer]
  )
  // Each player performs exactly one song per turn
  const hasPerformed = showdownSongsUsed.length >= 1
  const performanceDone = hasPerformed || playableSongs.length === 0

  const handlePlaySong = async (song: Song) => {
    const result = await dispatch({ type: 'PLAY_SHOWDOWN_SONG', songId: song.id })
    if (!result.ok) return
    for (const event of result.events) {
      if (event.type === 'diceRolled') {
        setLastRolls({ song, rolls: event.rolls })
      }
      if (event.type === 'showdownPlay') {
        const popup: FandomPopup = {
          id: `fandom-${Date.now()}`,
          fandom: event.fandom,
          hadCrit: event.hadCrit,
          hitWeakness: event.hitWeakness,
          wasResisted: event.wasResisted,
        }
        setPopups((prev) => [...prev, popup])
        setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popup.id)), 1900)
      }
    }
  }

  const handleFinishPerformance = async () => {
    const turnNow = showdownTurn
    const result = await dispatch({ type: 'FINISH_SHOWDOWN_PERFORMANCE' })
    setLastRolls(null)
    if (!result.ok) return

    const advance = result.events.find((e) => e.type === 'showdownAdvance')
    if (!advance || advance.type !== 'showdownAdvance') return
    if (advance.advance === 'bossAdapts') {
      setAdaptRecap(advance.recap ?? [])
      setAdaptTurnEnded(advance.turnEnded ?? turnNow)
      setStage('adapt')
    } else if (advance.advance === 'showdownComplete') {
      setStage('finale')
    }
  }

  if (players.length === 0) return null

  if (stage === 'intro') {
    return <ShowdownIntro onBegin={() => setStage('perform')} playerCount={players.length} />
  }

  if (stage === 'adapt') {
    return (
      <AdaptBanner
        turnEnded={adaptTurnEnded}
        performances={adaptRecap}
        players={players}
        resistGenre={showdownResistGenre}
        weakGenre={showdownWeakGenre}
        onContinue={() => setStage('perform')}
      />
    )
  }

  if (stage === 'finale') {
    return <ShowdownFinale players={players} showdownFandom={showdownFandom} showdownHistory={showdownHistory} />
  }

  if (stage === 'winner') {
    return (
      <WinnerSpotlight
        players={players}
        showdownFandom={showdownFandom}
        onContinue={() => dispatch({ type: 'ADVANCE_TO_SUMMARY' })}
      />
    )
  }

  // ==== Perform stage ====
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: 'radial-gradient(ellipse at 50% -10%, #1e1033 0%, #0d0a07 55%)' }}>
      {/* Fandom popups */}
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
        {popups.map((p) => (
          <div key={p.id} className="absolute left-1/2 top-[38%] -translate-x-1/2 animate-fandom-pop text-center">
            <div
              className={`font-bold tabular-nums leading-none ${
                p.wasResisted && p.fandom === 0
                  ? 'text-red-300 text-5xl'
                  : p.hadCrit || p.hitWeakness
                    ? 'text-gold-300 text-6xl'
                    : 'text-gold-400 text-5xl'
              }`}
              style={{ textShadow: '0 0 24px rgba(240, 215, 140, 0.7), 0 2px 8px rgba(0,0,0,0.8)' }}
            >
              +{p.fandom}
            </div>
            <div className="text-parchment-300 font-medieval font-bold text-sm mt-1 tracking-wider uppercase" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}>
              ♪ Fandom
            </div>
            {p.hitWeakness && (
              <div className="text-green-300 font-medieval font-bold text-xs tracking-widest uppercase">Weakness ×2!</div>
            )}
            {p.wasResisted && (
              <div className="text-red-300 font-medieval font-bold text-xs tracking-widest uppercase">Resisted...</div>
            )}
            {p.hadCrit && (
              <div className="text-gold-400 font-medieval font-bold text-xs tracking-widest uppercase animate-pulse">Encore!</div>
            )}
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
        {/* Header */}
        <div className="text-center mb-5">
          <h1
            className="font-display text-2xl sm:text-4xl text-gold-400 tracking-wide"
            style={{ textShadow: '0 0 25px rgba(212, 168, 83, 0.4)' }}
          >
            ⚡ The Final Showdown ⚡
          </h1>
        </div>

        <div className="card-ornate p-4 sm:p-8 mb-4" style={{ background: 'rgba(20, 14, 28, 0.75)' }}>
          <BossStage
            turn={showdownTurn}
            resistGenre={showdownResistGenre}
            weakGenre={showdownWeakGenre}
            fandom={showdownFandom}
            players={players}
          />
        </div>

        {/* Performer panel */}
        {performer && (
          <div className="card-ornate p-4 sm:p-6" key={`${showdownTurn}-${performerId}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="player-avatar w-12 h-12 text-xl animate-token-bob" style={{ backgroundColor: performer.color }}>
                  {performer.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medieval text-lg font-bold text-gold-300">
                    {performer.name} takes the stage
                  </div>
                  <div className="text-xs text-parchment-500">
                    Verse {showdownTurn} · {hasPerformed ? 'performance complete' : 'choose one song to perform'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-gold-400 tabular-nums" style={{ textShadow: '0 0 12px rgba(212,168,83,0.3)' }}>
                  +{showdownCurrentFandom}
                </div>
                <div className="text-[10px] text-parchment-500 uppercase tracking-wider">fandom this verse</div>
              </div>
            </div>

            {/* Songs */}
            <div className="flex gap-3 sm:gap-5 overflow-x-auto pb-2 -mx-1 px-1 mb-4">
              {performer.songs.map((song, idx) => (
                <SongCard
                  key={song.id}
                  song={{ ...song, used: showdownSongsUsed.includes(song.id) }}
                  onPlay={() => handlePlaySong(song)}
                  disabled={hasPerformed || !canPerform}
                  index={idx}
                />
              ))}
            </div>

            {/* Last roll */}
            {lastRolls && (
              <div
                className="rounded-xl p-4 mb-4 animate-fade-in max-w-full overflow-x-auto"
                style={{ background: 'rgba(42, 33, 24, 0.5)', border: '1px solid rgba(212, 168, 83, 0.12)' }}
              >
                <div className="text-sm font-medieval text-parchment-500 uppercase tracking-wider mb-3">Last Roll</div>
                <div className="flex gap-3 items-center flex-wrap">
                  {lastRolls.rolls.map((roll, idx) => {
                    const dice = lastRolls.song.slots.find((slot) => slot.dice?.id === roll.diceId)?.dice
                    if (!dice) return null
                    return (
                      <DiceDisplay
                        key={idx}
                        dice={dice}
                        value={roll.value}
                        isCrit={roll.isCrit}
                        cascadeRolls={roll.cascadeRolls}
                        compact
                        animateRoll
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Finish performance */}
            <div className="flex justify-center pt-2">
              {!canPerform && mode === 'online' ? (
                <p className="text-base text-parchment-500 italic font-game animate-pulse-slow">
                  {performer.name} holds the stage — watch the show...
                </p>
              ) : performanceDone ? (
                <button
                  onClick={handleFinishPerformance}
                  className="btn-primary text-base px-10 py-3 animate-fade-in w-full max-w-md"
                >
                  🎤 Drop the Mic — End Performance
                </button>
              ) : (
                <p className="text-base text-parchment-500 italic font-game animate-pulse-slow">
                  One song, one shot — make it count...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Cinematic opening: the boss reveal and the rules of the showdown. */
function ShowdownIntro({ onBegin, playerCount }: { onBegin: () => void; playerCount: number }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 30%, #1e1033 0%, #07050a 70%)' }}>
      <div
        className="absolute inset-0 pointer-events-none animate-boss-aura"
        style={{ background: 'radial-gradient(circle at 50% 35%, rgba(124, 58, 237, 0.18) 0%, transparent 55%)' }}
      />

      <div className="relative z-10 text-center max-w-2xl">
        <div className="text-xs sm:text-sm font-medieval uppercase tracking-[0.5em] text-purple-300/70 mb-4 animate-fade-in">
          The music dies...
        </div>

        {/* Boss reveal orb */}
        <div className="relative inline-block mb-6 animate-scale-in" style={{ animationDuration: '1.1s' }}>
          <div className="absolute -inset-10 rounded-full animate-boss-aura pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124, 58, 237, 0.3) 0%, transparent 70%)' }} />
          <div className="absolute -inset-4 rounded-full animate-rune-spin pointer-events-none" style={{ border: '1px dashed rgba(168, 85, 247, 0.4)' }} />
          <div
            className="w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center relative overflow-hidden mx-auto"
            style={{
              background: 'radial-gradient(circle at 38% 32%, #2e1065 0%, #0c0316 55%, #000 100%)',
              border: '2px solid rgba(147, 51, 234, 0.5)',
              boxShadow: '0 0 60px rgba(124, 58, 237, 0.4), inset 0 0 40px rgba(0,0,0,0.9)',
            }}
          >
            <span className="text-6xl select-none animate-boss-breathe" style={{ filter: 'grayscale(1) brightness(0.5) drop-shadow(0 0 12px rgba(168, 85, 247, 0.6))' }}>
              🎵
            </span>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.75) 75%)' }} />
          </div>
        </div>

        <h1
          className="font-display text-4xl sm:text-6xl text-purple-200 mb-3 animate-slide-up"
          style={{ textShadow: '0 0 40px rgba(168, 85, 247, 0.6)', animationDelay: '300ms', animationFillMode: 'both' }}
        >
          The Eternal Silence
        </h1>
        <p className="text-parchment-400 text-sm sm:text-base mb-8 animate-slide-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
          The end of all sound has come. It cannot be slain — only outshone.
        </p>

        <div
          className="card-ornate p-5 sm:p-6 text-left mb-8 animate-slide-up"
          style={{ animationDelay: '700ms', animationFillMode: 'both', background: 'rgba(20, 14, 28, 0.8)' }}
        >
          <div className="text-xs font-medieval uppercase tracking-[0.3em] text-gold-500 mb-3 text-center">How the Showdown Works</div>
          <ul className="space-y-2.5 text-sm text-parchment-300">
            <li className="flex gap-2.5"><span className="text-gold-400 flex-shrink-0">♪</span><span>Three verses. Each verse, every bard performs <span className="text-gold-300 font-bold">one song</span> against the Silence.</span></li>
            <li className="flex gap-2.5"><span className="text-gold-400 flex-shrink-0">♪</span><span>Every point of damage earns you <span className="text-gold-300 font-bold">1 fandom</span>.</span></li>
            <li className="flex gap-2.5"><span className="text-gold-400 flex-shrink-0">♪</span><span>Between verses it adapts like any monster: it becomes <span className="text-red-300 font-bold">immune (0×)</span> to the element of the strongest attack and <span className="text-green-300 font-bold">weak (2×)</span> to the element of the weakest.</span></li>
            <li className="flex gap-2.5"><span className="text-gold-400 flex-shrink-0">♪</span><span>After the third verse the Silence shatters — and the bard with the most fans is crowned <span className="text-gold-300 font-bold">Legend of the Realm</span>.</span></li>
          </ul>
        </div>

        <button
          onClick={onBegin}
          className="btn-primary text-lg px-12 py-4 animate-slide-up animate-glow-pulse"
          style={{ animationDelay: '900ms', animationFillMode: 'both' }}
        >
          🎸 {playerCount > 1 ? 'Take the Stage' : 'Face the Silence'}
        </button>
      </div>
    </div>
  )
}

/** The Silence shatters — a short auto-advancing cinematic before the winner reveal. */
function ShowdownFinale({
  players,
  showdownFandom,
  showdownHistory,
}: {
  players: { id: string }[]
  showdownFandom: Record<string, number>
  showdownHistory: ShowdownPerformance[][]
}) {
  const totalFandom = players.reduce((sum, p) => sum + (showdownFandom[p.id] || 0), 0)
  const songsPlayed = showdownHistory.flat().length

  return (
    <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden" style={{ background: '#07050a' }}>
      {/* Shockwave rings */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-shockwave"
            style={{
              width: 80,
              height: 80,
              border: '2px solid rgba(240, 215, 140, 0.6)',
              animationDelay: `${i * 0.45}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-4">
        {/* The orb, shattering */}
        <div className="relative inline-block mb-8">
          <div
            className="w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center mx-auto animate-boss-shatter"
            style={{
              background: 'radial-gradient(circle at 38% 32%, #2e1065 0%, #0c0316 55%, #000 100%)',
              border: '2px solid rgba(147, 51, 234, 0.5)',
              boxShadow: '0 0 60px rgba(124, 58, 237, 0.5)',
            }}
          >
            <span className="text-6xl select-none" style={{ filter: 'grayscale(1) brightness(0.5)' }}>🎵</span>
          </div>
        </div>

        <h1
          className="font-display text-4xl sm:text-6xl text-gold-300 mb-4 animate-scale-in"
          style={{ textShadow: '0 0 50px rgba(240, 215, 140, 0.6)', animationDelay: '600ms', animationFillMode: 'both' }}
        >
          The Silence Is Broken!
        </h1>
        <p
          className="text-parchment-300 text-base sm:text-lg animate-slide-up"
          style={{ animationDelay: '1100ms', animationFillMode: 'both' }}
        >
          {songsPlayed} songs performed · {totalFandom} fans won over · music returns to the realm
        </p>
        <p
          className="text-parchment-500 text-sm mt-6 italic animate-pulse-slow animate-fade-in"
          style={{ animationDelay: '1800ms', animationFillMode: 'both' }}
        >
          The crowd turns to its champion...
        </p>
      </div>
    </div>
  )
}
