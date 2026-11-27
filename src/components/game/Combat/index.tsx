import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useGameStore, selectCanAct, selectMyPlayerId } from '@/store'
import { useShallow } from 'zustand/react/shallow'
import { MonsterCard } from './MonsterCard'
import { SongCard } from './SongCard'
import { FeaturedSongs } from './FeaturedSongs'
import { SongGrid } from './SongGrid'
import { makeReroll } from './reroll'
import { DamageCell } from './DamageBreakdown'
import { DamagePopups, DamagePopupEntry, createDamagePopups } from './DamagePopup'
import { calculateMonsterFameValue } from '@/game-logic/fame/calculator'
import { computeCombatRewards } from '@/engine/reducer'
import { Monster, Song, StyleId } from '@/types'
import type { EngineEvent } from '@/engine/events'
import { GENRE_THEME, ALL_GENRES } from '@/data/genreTheme'
import { diceBus, useDiceTrayBusy, useHeldWhileRolling } from '@/components/dice3d/diceBus'
import { STYLES } from '@/data/styles'
import { counterpointMultiplier, fermataCanRefresh, rubatoCanReroll, rubatoUsesLeft, staccatoCanRefresh } from '@/game-logic/styles/styleEffects'
import { getTunables } from '@/data/tunables'
import { songIsImmune, songsCanStillDamage } from '@/game-logic/combat/damageCalculator'
import { CombatStyles } from '../DraftShop/StyleShelf'
import { ArrowLeft, Flag, Map as MapIcon, RotateCcw, Sparkles, Target } from 'lucide-react'
import { COMBAT_STAGE_BACKDROPS } from '@/assets/combat/stages'

export function CombatModal() {
  const isActive = useGameStore((state) => state.isActive)
  const playerId = useGameStore((state) => state.playerId)
  const selectedSpreadGenre = useGameStore((state) => state.selectedSpreadGenre)
  const dispatch = useGameStore((state) => state.dispatch)
  const canAct = useGameStore(selectCanAct)
  const remoteEntry = useGameStore((state) => state.remoteEntry)
  const online = useGameStore((state) => state.mode === 'online')
  const myPlayerId = useGameStore(selectMyPlayerId)
  const spaceId = useGameStore((state) => state.spaceId)
  const featureRequest = useGameStore((state) => state.featureRequest)
  // Everything a roll changes, held at its pre-roll value while the 3D dice
  // are in the air: HP, spent songs, rewards and roll results only appear
  // once the throw lands.
  const liveView = useGameStore(
    useShallow((state) => ({
      monsters: state.monsters,
      spentSongIds: state.spentSongIds,
      killCredits: state.killCredits,
      rolls: state.rolls,
      currentSongId: state.currentSongId,
      lastDamageCalculations: state.lastDamageCalculations,
      lastPlayedSongId: state.lastPlayedSongId,
      lastTargetMonsterId: state.lastTargetMonsterId,
      lockedTargetMonsterId: state.lockedTargetMonsterId,
      players: state.players,
      stylesUsed: state.stylesUsed,
      specFired: state.specFired,
      styleNotes: state.styleNotes,
      rallyReady: state.rallyReady,
      featuredPlayerIds: state.featuredPlayerIds,
      turnStartInspiration: state.turnStartInspiration,
      soulActive: state.soulActive,
    }))
  )
  const {
    monsters,
    spentSongIds,
    killCredits,
    rolls,
    currentSongId,
    lastDamageCalculations,
    lastPlayedSongId,
    lastTargetMonsterId,
    lockedTargetMonsterId,
    players,
    stylesUsed,
    specFired,
    styleNotes,
    rallyReady,
    featuredPlayerIds,
    turnStartInspiration,
    soulActive,
  } = useHeldWhileRolling(liveView)
  const diceBusy = useDiceTrayBusy()

  const [chosenTargetId, setChosenTargetId] = useState<string | null>(null)
  const lockedTarget = monsters.find((m) => m.id === lockedTargetMonsterId && m.currentHP > 0)
  const selectedTargetId = lockedTarget?.id ?? chosenTargetId

  const isSongSpent = useCallback(
    (songId: string) => spentSongIds.includes(songId),
    [spentSongIds]
  )

  const player = players.find((p) => p.id === playerId)

  const [popups, setPopups] = useState<DamagePopupEntry[]>([])
  // Retreating with damage left on the table asks once more
  const [confirmingRetreat, setConfirmingRetreat] = useState(false)
  // Choices for the next song (Gospel's call, Soul's paid bonus); reset after each play
  const [callIt, setCallIt] = useState(false)
  const [soul, setSoul] = useState(false)
  // Victory rewards stay unresolved while the player briefly checks the board.
  const [previewingMap, setPreviewingMap] = useState(false)
  const [rollDisplayDismissed, setRollDisplayDismissed] = useState(false)

  const handlePopupComplete = useCallback((id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id))
  }, [])

  // Reward math lives in the engine.
  const rewards = useMemo(
    () => computeCombatRewards({ monsters, killCredits }, player?.styles),
    [monsters, killCredits, player?.styles]
  )
  // Keep a live monster targeted: default to the first, and re-pick when the
  // current target is defeated.
  useEffect(() => {
    if (!isActive) return
    const alive = monsters.filter((m) => m.currentHP > 0)
    if (lockedTarget) {
      setChosenTargetId(lockedTarget.id)
    } else if (!alive.some((m) => m.id === chosenTargetId)) {
      setChosenTargetId(alive[0]?.id ?? null)
    }
  }, [isActive, monsters, chosenTargetId, lockedTarget])

  // A fresh result is relevant again. Choosing another target below dismisses
  // the old result for good rather than letting it reappear when switching back.
  useEffect(() => {
    setRollDisplayDismissed(false)
  }, [rolls])

  // Any new play (or a new fight) drops a pending retreat confirmation
  useEffect(() => {
    setConfirmingRetreat(false)
  }, [isActive, monsters, spentSongIds])

  /** Damage numbers pop once the 3D dice have landed, not while they're airborne. */
  const showDamageEvents = useCallback(async (events: EngineEvent[]) => {
    await diceBus.whenSettled()
    for (const event of events) {
      if (event.type !== 'damageDealt') continue
      const newPopups = createDamagePopups(event.calculations, event.monstersBefore, event.monstersAfter)
      setPopups((prev) => [...prev, ...newPopups])
    }
  }, [])

  const lastRemoteEntry = useRef(remoteEntry)
  // Spectators animate other players' songs from the SSE event stream. Not
  // cancelled when the next entry arrives: a spectator still watching this
  // throw must get its popups even if the next action lands meanwhile.
  useEffect(() => {
    if (!remoteEntry || lastRemoteEntry.current === remoteEntry || !isActive) return
    lastRemoteEntry.current = remoteEntry
    void showDamageEvents(remoteEntry.events)
  }, [remoteEntry, isActive, showDamageEvents])

  if (!isActive || !player) return null

  const lastPlayedSong: Song | null = lastPlayedSongId
    ? player.songs.find((s) => s.id === lastPlayedSongId) ?? null
    : null

  const allMonstersDefeated = monsters.every((m: Monster) => m.currentHP <= 0)
  const playableSongs = player.songs.filter((s) => s.slots.some((slot) => slot.dice))
  const ownSongsRemaining = playableSongs.filter((s) => !isSongSpent(s.id)).length

  // Bards sharing the space can each lend one featured song this fight
  const guests = players.filter((p) => p.id !== player.id && p.position === spaceId)
  const featurableSongs = guests
    .filter((g) => !featuredPlayerIds.includes(g.id))
    .flatMap((g) => g.songs.filter((s) => s.slots.some((slot) => slot.dice)))

  // No fixed song cap now: fight on while you have unspent songs (defeating a
  // monster returns that song's dice; a song that only wounds is spent) or a
  // featured song still to borrow.
  const canContinue = ownSongsRemaining > 0 || featurableSongs.length > 0

  const hasLiveTarget = selectedTargetId !== null && monsters.some((m) => m.id === selectedTargetId && m.currentHP > 0)
  const rollMatchesSelectedTarget =
    !rollDisplayDismissed && selectedTargetId !== null && selectedTargetId === lastTargetMonsterId
  const totalExp = rewards.totalExp
  const isCombatOver = allMonstersDefeated || !canContinue
  const stageBackdrop = COMBAT_STAGE_BACKDROPS[Math.min(15, Math.max(0, spaceId ?? 0))]

  /**
   * Reroll is offered only for a song whose dice are SPENT — it damaged without
   * defeating. A song that landed the kill refreshes instead, so it must show
   * "Perform" again to be replayed against another monster.
   */
  const canRerollSong = (songId: string) =>
    currentSongId === songId && isSongSpent(songId) && !allMonstersDefeated

  // No new roll while the last one is still on the table, or while a guest
  // is deciding whether to feature their song
  const canRoll = canAct && !diceBusy && !featureRequest
  const canPaidReroll = !!lastPlayedSong && canRerollSong(lastPlayedSong.id)

  // Choices for the next song: Gospel's call and Soul's paid bonus. Both reset after a play.
  const t = getTunables()
  const canCall = player.styles.includes('staccato') && !stylesUsed.includes('staccato')
  const canSoul = player.styles.includes('inspired-play') && !soulActive &&
    (turnStartInspiration ?? 0) >= t.inspiredPlayMin && player.inspiration >= t.inspiredPlayCost

  const handleSelectTarget = (monsterId: string) => {
    if (monsterId !== selectedTargetId) setRollDisplayDismissed(true)
    setChosenTargetId(monsterId)
  }

  const handlePlaySong = async (songId: string) => {
    if (!canRoll || isSongSpent(songId) || !selectedTargetId || !hasLiveTarget) return
    const result = await dispatch({
      type: 'PLAY_SONG',
      songId,
      targetMonsterId: selectedTargetId,
      ...(callIt && canCall ? { staccatoCall: true } : {}),
      ...(soul && canSoul ? { inspiredPlay: true } : {}),
    })
    setCallIt(false)
    setSoul(false)
    if (result.ok) void showDamageEvents(result.events)
  }

  const handleReroll = async () => {
    if (!canRoll || !lastPlayedSong || player.inspiration <= 0) return
    const result = await dispatch({ type: 'REROLL_SONG' })
    if (result.ok) void showDamageEvents(result.events)
  }

  // Rubato: a free reroll of a d4/d8 song, once per turn
  // Gospel: a called monster was won over; the bard picks a spent song to refresh
  const canRally = canRoll && rallyReady && player.styles.includes('staccato')
  const handleRally = (songId: string) => {
    if (!canRally) return
    void dispatch({ type: 'RALLY_SONG', songId })
  }
  // Blues: pay Inspiration to refresh a spent d20 song, once per turn
  const canLinger = canRoll && player.styles.includes('fermata') && !stylesUsed.includes('fermata') &&
    player.inspiration >= t.fermataInspirationCost
  const handleLinger = (songId: string) => {
    if (!canLinger) return
    void dispatch({ type: 'LINGER_SONG', songId })
  }
  const refreshFor = (song: Song): { onRefresh: () => void; refreshTitle: string } | undefined => {
    if (!isSongSpent(song.id)) return undefined
    if (canRally && staccatoCanRefresh(song)) {
      return { onRefresh: () => handleRally(song.id), refreshTitle: `${STYLES.staccato.name}: your call came true. Refresh this song` }
    }
    if (canLinger && fermataCanRefresh(song)) {
      return { onRefresh: () => handleLinger(song.id), refreshTitle: `${STYLES.fermata.name}: refresh this song for ${t.fermataInspirationCost} Inspiration (once per turn)` }
    }
    return undefined
  }
  const hasSpentOwnSong = player.songs.some((sg) => isSongSpent(sg.id))

  const canRubato = (song: Song) =>
    player.styles.includes('rubato') && rubatoUsesLeft(stylesUsed) > 0 && rubatoCanReroll(song)
  const canNimbleReroll = canPaidReroll && !!lastPlayedSong && canRubato(lastPlayedSong)

  const handleRubato = async () => {
    if (!canRoll || !lastPlayedSong || !canRubato(lastPlayedSong)) return
    const result = await dispatch({ type: 'REROLL_SONG', rubato: true })
    if (result.ok) void showDamageEvents(result.events)
  }

  // The reroll sits on the dice of the song just played (free with Nimble Fingers, else 1 Inspiration)
  const reroll = canPaidReroll
    ? makeReroll({
        free: canNimbleReroll ? { name: STYLES.rubato.name, onClick: handleRubato } : undefined,
        inspiration: player.inspiration,
        enabled: canRoll,
        subject: 'song',
        onPaid: handleReroll,
      })
    : undefined

  // Hotseat: the guest always agrees, so the song just plays. Online: ask.
  const handleFeature = async (guestPlayerId: string, songId: string) => {
    if (!canRoll || !selectedTargetId || !hasLiveTarget) return
    if (online) {
      void dispatch({ type: 'REQUEST_FEATURE', guestPlayerId, songId, targetMonsterId: selectedTargetId })
      return
    }
    const result = await dispatch({ type: 'PLAY_FEATURED_SONG', guestPlayerId, songId, targetMonsterId: selectedTargetId })
    if (result.ok) void showDamageEvents(result.events)
  }
  const handleFeatureAnswer = async (accept: boolean) => {
    const result = await dispatch({ type: 'ANSWER_FEATURE', accept })
    if (result.ok) void showDamageEvents(result.events)
  }

  // Songs that could still hurt something: if every remaining die is immune
  // against every living monster, retreating gives nothing up — no confirm.
  // (Featured songs roll without styles, so Dissonance doesn't soften theirs.)
  const remainingSongs = playableSongs.filter((s) => !isSongSpent(s.id))
  const target = monsters.find((monster) => monster.id === selectedTargetId)
  const lastTargetIndex = monsters.findIndex((monster) => monster.id === lastTargetMonsterId)
  const lastHitMonster = lastTargetIndex >= 0 ? monsters[lastTargetIndex] : undefined
  const lastHitCalculation = lastTargetIndex >= 0 ? lastDamageCalculations[lastTargetIndex] : undefined
  const availableTargets = lockedTarget ? [lockedTarget] : monsters
  const damageOptions = {
    immuneMultiplier: counterpointMultiplier({ styles: player.styles, used: stylesUsed, firstRoll: false, allElements: false, elementCount: 0 }),
  }
  const retreatForfeitsDamage =
    canContinue &&
    !allMonstersDefeated &&
    (songsCanStillDamage(remainingSongs, availableTargets, damageOptions) || songsCanStillDamage(featurableSongs, availableTargets))

  const handleRetreatClick = () => {
    if (retreatForfeitsDamage && !confirmingRetreat) {
      setConfirmingRetreat(true)
      return
    }
    setConfirmingRetreat(false)
    handleEndCombat()
  }

  const handleEndCombat = () => {
    // The engine awards EXP/fame, clears or re-tags the space, and checks
    // the phase transition — all in one atomic action. Retreat is allowed at
    // any point (e.g. when only immune dice are left).
    dispatch({ type: 'END_COMBAT' })
  }

  if (previewingMap && allMonstersDefeated) {
    return (
      <>
        <div className="pointer-events-none fixed inset-0 z-40 ring-inset ring-2 ring-gold-500/20" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setPreviewingMap(false)}
          className="fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-lg border border-gold-500/50 bg-wood-950/95 px-4 py-3 font-medieval text-sm font-bold text-gold-200 shadow-xl shadow-black/60 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Return to Fame &amp; Glory
        </button>
      </>
    )
  }

  return (
    <div className="modal-overlay">
      <DamagePopups entries={popups} onComplete={handlePopupComplete} />
      <div className="modal-content combat-pixel-modal max-w-7xl animate-scale-in">
        <div className="p-3 sm:p-5">
          {/* Header — once the concert is over it becomes the rewards summary */}
          {isCombatOver ? (
            <div
              className="mb-4 rounded-xl px-4 py-3 text-center animate-fade-in sm:px-5 sm:py-4"
              style={{
                background: allMonstersDefeated
                  ? 'linear-gradient(135deg, rgba(45, 140, 48, 0.1), rgba(42, 33, 24, 0.5))'
                  : 'rgba(42, 33, 24, 0.5)',
                border: `1px solid ${allMonstersDefeated ? 'rgba(76, 175, 80, 0.25)' : 'rgba(212, 168, 83, 0.15)'}`,
                boxShadow: allMonstersDefeated ? '0 0 30px rgba(76, 175, 80, 0.08)' : undefined,
              }}
            >
              <div className="font-medieval text-sm uppercase tracking-wider text-parchment-400">
                {allMonstersDefeated ? 'Won Over' : 'Out of Songs'} — {player.name}'s Rewards{!canAct ? ' (watching live)' : ''}
              </div>
              <div className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-1 mt-1">
                <span className="font-display text-2xl sm:text-3xl text-gold-400 tabular-nums" style={{ textShadow: '0 0 12px rgba(212, 168, 83, 0.2)' }}>
                  +{rewards.fighterFame} Fame
                </span>
                <span className="font-display text-2xl sm:text-3xl text-gold-400 tabular-nums" style={{ textShadow: '0 0 12px rgba(212, 168, 83, 0.2)' }}>
                  +{totalExp} EXP
                </span>
                {allMonstersDefeated && (
                  <span className="font-display text-xl sm:text-2xl tabular-nums" style={{ color: '#d9c2ff' }} title="Winning over a whole space earns 1 Inspiration">
                    +1 &#x2728;
                  </span>
                )}
              </div>
              {Object.entries(rewards.guestRewards).map(([guestId, share]) => (
                <div key={guestId} className="mt-1 text-sm text-parchment-300">
                  Guest song: {players.find((p) => p.id === guestId)?.name ?? 'Guest'} +{share.fame} Fame, +{share.exp} EXP
                </div>
              ))}
            </div>
          ) : (
            <div className="pixel-combat-header mb-3 flex flex-col gap-2 animate-fade-in sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-['Cinzel:Bold'] text-[9px] uppercase tracking-[0.3em] text-[#a88953]">Combat encounter</div>
                <div className="font-['MedievalSharp:Regular'] text-2xl leading-none text-[#f0d78c] sm:text-3xl">The Concert</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-['Spectral:Regular'] text-sm text-parchment-400">
                  <span>{player.name}{!canAct ? ' · watching live' : ''}</span>
                  <span className="inline-flex items-center gap-1 border-l border-gold-700/30 pl-2 text-violet-200" title="Current Inspiration">
                    <Sparkles size={12} aria-hidden="true" />
                    {player.inspiration} Inspiration
                  </span>
                </div>
              </div>
              <div className="pixel-last-hit-slot h-[52px]">
                {lastHitMonster && lastHitCalculation ? (
                  <DamageCell
                    calc={lastHitCalculation}
                    monster={lastHitMonster}
                    styleNotes={styleNotes}
                  />
                ) : canContinue ? (
                  <p className="flex h-full items-end justify-end gap-2 text-sm text-parchment-300">
                    {lockedTarget ? 'Win over the monster you moved, or end the concert.' : 'Pick a monster, then play a song.'}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {/* Once every monster is won over, the radiate choice replaces the monster cards. */}
          {allMonstersDefeated ? (
            <div className="mb-5 animate-fade-in">
              <div className="mb-4 text-center">
                <div className="font-display text-xl sm:text-2xl text-green-300">Radiate an Element</div>
                <p className="mt-1 text-sm sm:text-base text-parchment-400">
                  Choose an element. Every bordering space gains 1 chip of it.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ALL_GENRES.map((genre) => {
                  const { emoji, rgb } = GENRE_THEME[genre]
                  const isChosen = selectedSpreadGenre === genre
                  return (
                    <button
                      key={genre}
                      disabled={!canAct}
                      onClick={() => dispatch({
                        type: 'SELECT_COMBAT_SPREAD',
                        genre: isChosen ? null : genre,
                      })}
                      className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg px-3 py-3 transition-all duration-200 ${canAct ? 'hover:-translate-y-0.5' : 'cursor-default'}`}
                      style={{
                        background: isChosen
                          ? `rgba(${rgb},0.22)`
                          : 'rgba(255,255,255,0.025)',
                        border: `1px solid rgba(${rgb},${isChosen ? 0.85 : 0.28})`,
                        boxShadow: isChosen
                          ? `0 0 18px rgba(${rgb},0.18)`
                          : 'none',
                      }}
                    >
                      <span className="text-2xl leading-none">
                        {emoji}
                      </span>
                      <span className="font-medieval text-sm sm:text-base font-bold uppercase tracking-wider" style={{ color: `rgb(${rgb})` }}>
                        {genre}
                      </span>
                      {isChosen && (
                        <span
                          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                          style={{ background: `rgb(${rgb})`, color: '#fff' }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={handleEndCombat}
                disabled={!canAct || !selectedSpreadGenre}
                className="btn-primary mt-3 w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #3d8c40, #2d6e30)',
                  border: '1px solid rgba(100, 220, 100, 0.4)',
                  color: '#d4ffd6',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                  boxShadow: 'none',
                }}
                title={selectedSpreadGenre ? undefined : 'Choose an element to radiate first'}
              >
                {selectedSpreadGenre ? 'Claim Fame & Glory' : 'Choose an Element'}
              </button>
              <button
                type="button"
                onClick={() => setPreviewingMap(true)}
                className="btn-secondary mt-2 flex w-full items-center justify-center gap-2 px-4 py-3 text-base"
              >
                <MapIcon size={15} aria-hidden="true" />
                View Map
              </button>
            </div>
          ) : (
            <section
              className="combat-battlefield mb-4"
              style={{ backgroundImage: `linear-gradient(180deg, rgba(8,6,12,.08), rgba(8,5,3,.42)), url(${stageBackdrop})` }}
            >
              <div className="pixel-stage-header">
                <span>Chamber {(spaceId ?? 0) + 1}</span>
                <span>{monsters.filter((monster) => monster.currentHP > 0).length} hostiles remain</span>
              </div>
              <div className="pixel-stage-scanlines" aria-hidden="true" />
              <div className="pixel-monster-grid">
                {monsters.map((monster: Monster, idx: number) => (
                  // One column per monster: the card, with its damage lined up right below
                  <div key={monster.id} className="flex min-w-0 flex-col gap-2">
                    <MonsterCard
                      monster={monster}
                      index={idx}
                      fameValue={calculateMonsterFameValue(monster.level)}
                      isSelected={selectedTargetId === monster.id}
                      onSelect={canRoll && !lockedTarget && monster.currentHP > 0 ? () => handleSelectTarget(monster.id) : undefined}
                      lastDamage={
                        monster.id === lastTargetMonsterId
                          ? lastDamageCalculations[idx]?.totalDamage
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Songs Section */}
          {!allMonstersDefeated && (
            <section className="pixel-command-deck mb-4 pt-3">
              <SectionHeader
                label={`Choose a song · ${ownSongsRemaining} ready`}
              />
              {canRally && hasSpentOwnSong && (
                <div className="mb-3 flex items-center justify-center gap-2 border-l-2 border-orange-300/40 py-1.5 pl-3 text-center text-sm text-orange-100 animate-fade-in">
                  <RotateCcw size={15} aria-hidden="true" />
                  <span><strong>{STYLES.staccato.name}</strong>: your call came true. Choose a spent song to refresh.</span>
                </div>
              )}
              {soulActive && player.styles.includes('inspired-play') && (
                <p className="mb-2 text-center text-xs text-amber-200"><strong>{STYLES['inspired-play'].name}</strong>: +{t.inspiredPlayBonus} on every song this concert</p>
              )}
              {canRoll && (canCall || canSoul) && (
                <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-xs" role="group" aria-label="Choices for your next song">
                  {canCall && (
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gold-700/30 px-3 py-1 text-parchment-200 hover:bg-white/5">
                      <input type="checkbox" checked={callIt} onChange={(e) => setCallIt(e.target.checked)} />
                      <span><strong>{STYLES.staccato.name}</strong>: call it (this song wins over {target?.name ?? 'the target'})</span>
                    </label>
                  )}
                  {canSoul && (
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gold-700/30 px-3 py-1 text-parchment-200 hover:bg-white/5">
                      <input type="checkbox" checked={soul} onChange={(e) => setSoul(e.target.checked)} />
                      <span><strong>{STYLES['inspired-play'].name}</strong>: +{t.inspiredPlayBonus} on every song this concert, for {t.inspiredPlayCost} Inspiration</span>
                    </label>
                  )}
                </div>
              )}
              <SongGrid count={playableSongs.length}>
                {playableSongs.map((song, idx) => (
                  <SongCard
                    key={song.id}
                    song={{ ...song, used: isSongSpent(song.id) }}
                    resisted={!!target && songIsImmune(song, target, damageOptions)}
                    onPlay={() => handlePlaySong(song.id)}
                    disabled={!canRoll || isSongSpent(song.id) || !hasLiveTarget}
                    index={idx}
                    rolls={rollMatchesSelectedTarget && currentSongId === song.id ? rolls : undefined}
                    reroll={rollMatchesSelectedTarget && reroll && lastPlayedSong?.id === song.id ? reroll : undefined}
                    {...refreshFor(song)}
                  />
                ))}
              </SongGrid>
              <CombatStyles player={player} usedStyleIds={[...stylesUsed, ...((specFired ?? []) as StyleId[])]} />
            </section>
          )}

          {!allMonstersDefeated && (
            <FeaturedSongs
              target={target}
              fighter={player}
              guests={guests}
              featuredPlayerIds={featuredPlayerIds}
              featureRequest={featureRequest}
              monsters={monsters}
              currentSongId={currentSongId}
              rolls={rollMatchesSelectedTarget ? rolls : []}
              canFeature={canRoll && hasLiveTarget}
              online={online}
              myPlayerId={myPlayerId}
              onFeature={handleFeature}
              onAnswer={handleFeatureAnswer}
            />
          )}

          {/* Actions */}
          {!allMonstersDefeated && (
            <div className="flex w-full flex-col gap-2 border-t border-gold-700/15 pt-4 sm:flex-row sm:justify-end animate-fade-in">
              {/* Ending the concert is always on offer, even before a song is played */}
              {confirmingRetreat && retreatForfeitsDamage ? (
                <div
                  className="flex flex-col gap-2 rounded-lg p-3 animate-fade-in sm:flex-row sm:items-center"
                  style={{ background: 'rgba(130, 68, 48, 0.18)', border: '1px solid rgba(224, 124, 90, 0.38)' }}
                  role="alertdialog"
                  aria-label="Confirm ending the concert"
                >
                  <span className="text-sm text-parchment-200 sm:mr-2">
                    You still have songs that can move a monster. End the concert anyway? Monsters you moved will level up.
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmingRetreat(false)}
                      className="btn-secondary min-h-11 flex-1 px-4 text-sm"
                    >
                      Keep playing
                    </button>
                    <button
                      onClick={handleRetreatClick}
                      disabled={!canRoll}
                      className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 font-medieval text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        background: 'linear-gradient(145deg, rgba(150, 70, 45, 0.6), rgba(70, 38, 28, 0.9))',
                        border: '1px solid rgba(224, 124, 90, 0.55)',
                        color: '#f6d2bf',
                      }}
                    >
                      <Flag size={15} className="shrink-0" aria-hidden="true" />
                      End concert
                    </button>
                  </div>
                </div>
              ) : (
              <button
                onClick={handleRetreatClick}
                disabled={!canRoll}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${canContinue ? 'self-end' : 'sm:min-w-40'}`}
                style={{
                  background: canContinue
                    ? 'linear-gradient(145deg, rgba(92, 70, 52, 0.48), rgba(50, 39, 30, 0.82))'
                    : 'linear-gradient(145deg, rgba(130, 68, 48, 0.42), rgba(60, 36, 28, 0.86))',
                  border: `1px solid ${canContinue ? 'rgba(212, 168, 83, 0.28)' : 'rgba(224, 124, 90, 0.38)'}`,
                  color: canContinue ? '#d8c7a5' : '#f0c1aa',
                  boxShadow: 'none',
                }}
                title="End the concert now — you earn EXP for every monster you moved and Fame for each one you won over. Monsters you moved but didn't win over level up."
              >
                <Flag size={16} className="shrink-0 opacity-80" aria-hidden="true" />
                <span className="font-medieval font-bold">{canContinue ? 'End concert' : 'Finish concert'}</span>
              </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Quiet step label: the cards carry the actual state. */
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-2.5 font-medieval text-xs font-bold uppercase tracking-widest text-parchment-400">
      {label}
    </div>
  )
}
