import { useState, useCallback, useEffect, useMemo } from 'react'
import { useGameStore, selectCanAct } from '@/store'
import { useShallow } from 'zustand/react/shallow'
import { MonsterCard } from './MonsterCard'
import { SongCard } from './SongCard'
import { DamageCell } from './DamageBreakdown'
import { DamagePopups, DamagePopupEntry, createDamagePopups } from './DamagePopup'
import { calculateMonsterFameValue } from '@/game-logic/fame/calculator'
import { computeCombatRewards } from '@/engine/reducer'
import { Monster, Song } from '@/types'
import type { EngineEvent } from '@/engine/events'
import { GENRE_THEME, ALL_GENRES } from '@/data/genreTheme'
import { diceBus, useDiceTrayBusy, useHeldWhileRolling } from '@/components/dice3d/diceBus'

export function CombatModal() {
  const isActive = useGameStore((state) => state.isActive)
  const playerId = useGameStore((state) => state.playerId)
  const spaceId = useGameStore((state) => state.spaceId)
  const selectedSpreadGenre = useGameStore((state) => state.selectedSpreadGenre)
  const dispatch = useGameStore((state) => state.dispatch)
  const canAct = useGameStore(selectCanAct)
  const remoteEntry = useGameStore((state) => state.remoteEntry)
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
      players: state.players,
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
    players,
  } = useHeldWhileRolling(liveView)
  const diceBusy = useDiceTrayBusy()

  // The chosen single-target monster for the next song
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)

  const isSongSpent = useCallback(
    (songId: string) => spentSongIds.includes(songId),
    [spentSongIds]
  )

  const player = players.find((p) => p.id === playerId)

  // Co-located players lend cover songs
  const colocatedPlayers = useMemo(
    () => players.filter((p) => p.position === spaceId && p.id !== playerId && !p.isEliminated),
    [players, spaceId, playerId]
  )

  const [popups, setPopups] = useState<DamagePopupEntry[]>([])

  const handlePopupComplete = useCallback((id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id))
  }, [])

  // All hooks must be called before any early return (Rules of Hooks)
  const allAvailableSongs = useMemo(() => {
    if (!player) return []
    const songs = [...player.songs]
    colocatedPlayers.forEach((p) => songs.push(...p.songs))
    return songs
  }, [player, colocatedPlayers])

  // Reward math lives in the engine; the component only maps names for display
  const rewards = useMemo(
    () => computeCombatRewards({ monsters, killCredits }),
    [monsters, killCredits]
  )
  const monstersDefeatedCount = rewards.monstersDefeatedCount

  const fameBreakdown = useMemo(() => {
    const coverFameByPlayer = new Map<string, { name: string; fame: number }>()
    rewards.coverFameByOwner.forEach((fame, ownerId) => {
      const ownerPlayer = colocatedPlayers.find((p) => p.id === ownerId)
      if (ownerPlayer) coverFameByPlayer.set(ownerId, { name: ownerPlayer.name, fame })
    })
    return { playerFame: rewards.fighterFame, coverFameByPlayer }
  }, [rewards, colocatedPlayers])

  // Keep a live monster targeted: default to the first, and re-pick when the
  // current target is defeated.
  useEffect(() => {
    if (!isActive) return
    const alive = monsters.filter((m) => m.currentHP > 0)
    if (alive.length === 0) {
      if (selectedTargetId !== null) setSelectedTargetId(null)
      return
    }
    if (!selectedTargetId || !alive.some((m) => m.id === selectedTargetId)) {
      setSelectedTargetId(alive[0].id)
    }
  }, [isActive, monsters, selectedTargetId])

  /** Damage numbers pop once the 3D dice have landed, not while they're airborne. */
  const showDamageEvents = useCallback(async (events: EngineEvent[]) => {
    await diceBus.whenSettled()
    for (const event of events) {
      if (event.type !== 'damageDealt') continue
      const newPopups = createDamagePopups(event.calculations, event.monstersBefore, event.monstersAfter)
      setPopups((prev) => [...prev, ...newPopups])
    }
  }, [])

  // Spectators animate other players' songs from the SSE event stream. Not
  // cancelled when the next entry arrives: a spectator still watching this
  // throw must get its popups even if the next action lands meanwhile.
  useEffect(() => {
    if (!remoteEntry || !isActive) return
    void showDamageEvents(remoteEntry.events)
  }, [remoteEntry, isActive, showDamageEvents])

  if (!isActive || !player) return null

  const lastPlayedSong: Song | null = lastPlayedSongId
    ? allAvailableSongs.find((s) => s.id === lastPlayedSongId) ?? null
    : null

  const allMonstersDefeated = monsters.every((m: Monster) => m.currentHP <= 0)
  const playableSongs = player.songs.filter((s) => s.slots.some((slot) => slot.dice))
  const ownSongsRemaining = playableSongs.filter((s) => !isSongSpent(s.id)).length

  // Cover songs available from co-located players
  const coverPlayersWithSongs = colocatedPlayers
    .map((p) => ({
      player: p,
      songs: p.songs.filter((s) => s.slots.some((slot) => slot.dice) && !isSongSpent(s.id)),
    }))
    .filter((entry) => entry.songs.length > 0)

  const hasCoverSongsLeft = coverPlayersWithSongs.length > 0
  // No fixed song cap now: fight on while you have unspent songs (defeating a
  // monster returns that song's dice; a song that only wounds is spent).
  const canContinue = ownSongsRemaining > 0 || hasCoverSongsLeft

  const monstersAliveCount = monsters.filter((m: Monster) => m.currentHP > 0).length
  const hasLiveTarget = selectedTargetId !== null && monsters.some((m) => m.id === selectedTargetId && m.currentHP > 0)
  const totalExp = rewards.totalExp
  const isCombatOver = allMonstersDefeated || !canContinue

  /**
   * Reroll is offered only for a song whose dice are SPENT — it damaged without
   * defeating. A song that landed the kill refreshes instead, so it must show
   * "Perform" again to be replayed against another monster.
   */
  const canRerollSong = (songId: string) =>
    currentSongId === songId && isSongSpent(songId) && !allMonstersDefeated

  // No new roll while the last one is still on the table
  const canRoll = canAct && !diceBusy

  const handlePlaySong = async (songId: string, ownerId: string) => {
    if (!canRoll || isSongSpent(songId) || !selectedTargetId || !hasLiveTarget) return
    const result = await dispatch({ type: 'PLAY_SONG', songId, ownerId, targetMonsterId: selectedTargetId })
    if (result.ok) void showDamageEvents(result.events)
  }

  const handleReroll = async () => {
    if (!canRoll || !lastPlayedSong || player.inspiration <= 0) return
    const result = await dispatch({ type: 'REROLL_SONG' })
    if (result.ok) void showDamageEvents(result.events)
  }

  const handleEndCombat = () => {
    // The engine awards EXP/fame, clears or re-tags the space, and checks
    // the phase transition — all in one atomic action. Retreat is allowed at
    // any point (e.g. when only immune dice are left).
    dispatch({ type: 'END_COMBAT' })
  }

  return (
    <div className="modal-overlay">
      <DamagePopups entries={popups} onComplete={handlePopupComplete} />
      <div className="modal-content max-w-6xl animate-scale-in">
        {/* Atmospheric top gradient */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.4), transparent)' }} />

        <div className="p-4 sm:p-6">
          {/* Header — once the fight is over it becomes the rewards summary */}
          {isCombatOver ? (
            <div
              className="mb-4 sm:mb-5 rounded-xl px-4 py-3 text-center animate-fade-in"
              style={{
                background: allMonstersDefeated
                  ? 'linear-gradient(135deg, rgba(45, 140, 48, 0.1), rgba(42, 33, 24, 0.5))'
                  : 'rgba(42, 33, 24, 0.5)',
                border: `1px solid ${allMonstersDefeated ? 'rgba(76, 175, 80, 0.25)' : 'rgba(212, 168, 83, 0.15)'}`,
                boxShadow: allMonstersDefeated ? '0 0 30px rgba(76, 175, 80, 0.08)' : undefined,
              }}
            >
              <div className="text-xs sm:text-sm font-medieval text-parchment-500 uppercase tracking-wider">
                {allMonstersDefeated ? 'Victory' : 'Out of Songs'} — {player.name}'s Rewards{!canAct ? ' (watching live)' : ''}
              </div>
              <div className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-1 mt-1">
                <span className="font-display text-2xl sm:text-3xl text-gold-400 tabular-nums" style={{ textShadow: '0 0 12px rgba(212, 168, 83, 0.2)' }}>
                  +{fameBreakdown.playerFame} Fame
                </span>
                <span className="font-display text-2xl sm:text-3xl text-gold-400 tabular-nums" style={{ textShadow: '0 0 12px rgba(212, 168, 83, 0.2)' }}>
                  +{totalExp} EXP
                </span>
                {allMonstersDefeated && (
                  <span className="font-display text-xl sm:text-2xl tabular-nums" style={{ color: '#d9c2ff' }} title="Clearing a space earns 1 Inspiration">
                    +1 &#x2728;
                  </span>
                )}
              </div>
              <div className="text-xs text-parchment-500 mt-1">
                {monstersDefeatedCount} of {monsters.length} monster{monsters.length !== 1 ? 's' : ''} defeated
                {Array.from(fameBreakdown.coverFameByPlayer.entries()).map(([ownerId, { name, fame }]) => (
                  <span key={ownerId} style={{ color: '#4dd0e1' }}> · +{fame} Fame to {name} (cover)</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 mb-4 sm:mb-5 text-center animate-fade-in">
              <div className="font-display text-2xl sm:text-3xl text-gold-400" style={{ textShadow: '0 0 20px rgba(212, 168, 83, 0.2)' }}>
                The Mashup
              </div>
              <p className="text-sm sm:text-base text-parchment-500 font-game tracking-wide">
                {player.name}'s Performance{!canAct ? ' — watching live' : ''}
              </p>
              <span className="text-sm text-parchment-400" title="Inspiration — spend to reroll a song">
                &#x2728; <span className="font-bold" style={{ color: '#d9c2ff' }}>{player.inspiration}</span> Inspiration
              </span>
            </div>
          )}

          {/* Monsters Section */}
          <div className="mb-4 sm:mb-5">
            <SectionHeader
              label="Monsters"
              detail={monstersAliveCount > 0 ? `${monstersAliveCount} remaining · pick a target` : 'All converted!'}
              detailColor={monstersAliveCount > 0 ? 'text-red-400' : 'text-green-400'}
            />
            <div className="flex overflow-x-auto sm:overflow-x-visible sm:grid sm:grid-cols-4 gap-3 sm:gap-4 pb-2 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
              {monsters.map((monster: Monster, idx: number) => (
                // One column per monster: the card, with its damage lined up right below
                <div key={monster.id} className="w-[320px] shrink-0 sm:w-full flex flex-col gap-3">
                  <MonsterCard
                    monster={monster}
                    index={idx}
                    fameValue={calculateMonsterFameValue(monster.level)}
                    isSelected={selectedTargetId === monster.id}
                    onSelect={canAct && monster.currentHP > 0 ? () => setSelectedTargetId(monster.id) : undefined}
                  />
                  {monster.id === lastTargetMonsterId && lastDamageCalculations[idx] && (
                    <DamageCell calc={lastDamageCalculations[idx]} monster={monster} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Songs Section */}
          <div className="mb-4 sm:mb-5">
            <SectionHeader
              label="Your Songs"
              detail={`${ownSongsRemaining} unspent`}
              detailColor="text-gold-400"
            />
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {player.songs.map((song, idx) => (
                <SongCard
                  key={song.id}
                  song={{ ...song, used: isSongSpent(song.id) }}
                  onPlay={() => handlePlaySong(song.id, player.id)}
                  disabled={!canRoll || isSongSpent(song.id) || !hasLiveTarget}
                  index={idx}
                  rolls={currentSongId === song.id ? rolls : undefined}
                  onReroll={canRoll && canRerollSong(song.id) ? handleReroll : undefined}
                  inspiration={player.inspiration}
                />
              ))}
            </div>
          </div>

          {/* Cover Songs Section */}
          {coverPlayersWithSongs.length > 0 && (
            <div className="mb-4 sm:mb-5">
              <SectionHeader
                label="Cover Songs"
                detail={`${coverPlayersWithSongs.reduce((n, e) => n + e.songs.length, 0)} available`}
                detailColor="text-cyan-400"
              />
              {coverPlayersWithSongs.map(({ player: coverPlayer, songs }) => (
                <div key={coverPlayer.id} className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: coverPlayer.color, color: '#1a1410' }}
                    >
                      {coverPlayer.name[0]}
                    </div>
                    <span className="text-sm font-medieval text-parchment-400">
                      {coverPlayer.name}'s Songs
                    </span>
                  </div>
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                    {songs.map((song, idx) => (
                      <SongCard
                        key={song.id}
                        song={{ ...song, used: isSongSpent(song.id) }}
                        onPlay={() => handlePlaySong(song.id, coverPlayer.id)}
                        disabled={!canRoll || isSongSpent(song.id) || !hasLiveTarget}
                        index={idx}
                        isCover
                        ownerName={coverPlayer.name}
                        rolls={currentSongId === song.id ? rolls : undefined}
                        onReroll={canRoll && canRerollSong(song.id) ? handleReroll : undefined}
                        inspiration={player.inspiration}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {allMonstersDefeated ? (
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 pt-1 animate-fade-in">
              {/* Element choice — radiates to cardinal neighbors */}
              <div className="md:w-48 shrink-0 text-center md:text-left">
                <div className="text-sm font-medieval text-parchment-400 uppercase tracking-wider">
                  Radiate an Element
                </div>
                <p className="text-xs text-parchment-500">
                  Every bordering space gains 1 tag of it.
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 flex-1">
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
                      className={`relative rounded-lg py-1.5 flex items-center justify-center gap-1.5 transition-all duration-200 ease-out ${canAct ? 'hover:-translate-y-0.5' : 'cursor-default'}`}
                      style={{
                        background: isChosen
                          ? `linear-gradient(160deg, rgba(${rgb},0.28), rgba(${rgb},0.08))`
                          : `linear-gradient(160deg, rgba(${rgb},0.1), rgba(42,33,24,0.9))`,
                        border: `1px solid rgba(${rgb},${isChosen ? 0.75 : 0.3})`,
                        boxShadow: isChosen
                          ? `0 0 16px rgba(${rgb},0.35), inset 0 1px 0 rgba(255,255,255,0.08)`
                          : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                      }}
                    >
                      <span className="text-xl leading-none" style={{ filter: `drop-shadow(0 0 6px rgba(${rgb},${isChosen ? 0.6 : 0.3}))` }}>
                        {emoji}
                      </span>
                      <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wide" style={{ color: `rgb(${rgb})` }}>
                        {genre}
                      </span>
                      {isChosen && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: `rgb(${rgb})`, color: '#fff' }}>
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
                className="md:w-60 shrink-0 px-6 py-3 font-medieval font-bold rounded-lg text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #3d8c40, #2d6e30)',
                  border: '1px solid rgba(100, 220, 100, 0.4)',
                  color: '#d4ffd6',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                  boxShadow: '0 0 25px rgba(100, 220, 100, 0.15), 0 4px 15px rgba(0,0,0,0.3)',
                }}
                title={selectedSpreadGenre ? undefined : 'Choose an element to radiate first'}
              >
                {selectedSpreadGenre ? 'Claim Fame & Glory' : 'Choose an Element'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 pt-1 animate-fade-in">
              {canContinue && (
                <p className="text-base text-parchment-500 italic font-game animate-pulse-slow text-center">
                  Pick a target monster, then a song to perform...
                </p>
              )}
              {/* Retreat is always on offer, even before a song is played */}
              <button
                onClick={handleEndCombat}
                disabled={!canRoll}
                className={`btn-secondary disabled:opacity-40 disabled:cursor-not-allowed ${
                  canContinue ? 'text-sm px-6 py-2' : 'text-base sm:text-lg px-10 py-3 w-full max-w-md'
                }`}
                title="Leave the fight now — you earn EXP for every monster you wounded and Fame for each one you defeated"
              >
                Retreat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Reusable section header with label, detail count, and decorative line */
function SectionHeader({ label, detail, detailColor }: { label: string; detail: string; detailColor: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-sm font-medieval text-parchment-500 uppercase tracking-widest">
        {label}
      </div>
      <div className={`text-sm font-bold ${detailColor}`}>
        {detail}
      </div>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212, 168, 83, 0.15), transparent)' }} />
    </div>
  )
}
