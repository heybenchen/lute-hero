import { useState, useCallback, useEffect, useMemo } from 'react'
import { useGameStore, selectPlayerById, selectPlayersAtSpace, selectCanAct } from '@/store'
import { useShallow } from 'zustand/react/shallow'
import { MonsterCard } from './MonsterCard'
import { SongCard } from './SongCard'
import { DamageBreakdown } from './DamageBreakdown'
import { DamagePopups, DamagePopupEntry, createDamagePopups } from './DamagePopup'
import { calculateMonsterFameValue, calculateTotalMonsterExp } from '@/game-logic/fame/calculator'
import { computeCombatRewards } from '@/engine/reducer'
import { MAX_SONGS_PER_COMBAT } from '@/engine/validate'
import { Genre, Monster, Song, SongUsage } from '@/types'
import { GENRE_THEME, ALL_GENRES } from '@/data/genreTheme'

/** Check if a song ID has been used in this combat */
function isSongUsed(songsUsed: SongUsage[], songId: string): boolean {
  return songsUsed.some((su) => su.songId === songId)
}

export function CombatModal() {
  const isActive = useGameStore((state) => state.isActive)
  const playerId = useGameStore((state) => state.playerId)
  const spaceId = useGameStore((state) => state.spaceId)
  const monsters = useGameStore((state) => state.monsters)
  const songsUsed = useGameStore((state) => state.songsUsed)
  const killCredits = useGameStore((state) => state.killCredits)
  const rolls = useGameStore((state) => state.rolls)
  const currentSongId = useGameStore((state) => state.currentSongId)
  const lastDamageCalculations = useGameStore((state) => state.lastDamageCalculations)
  const lastPlayedSongId = useGameStore((state) => state.lastPlayedSongId)
  const dispatch = useGameStore((state) => state.dispatch)
  const canAct = useGameStore(selectCanAct)
  const remoteEntry = useGameStore((state) => state.remoteEntry)

  const [chosenElement, setChosenElement] = useState<Genre | null>(null)

  const player = useGameStore(
    selectPlayerById(playerId || '')
  )

  // Get co-located players for cover songs
  const colocatedPlayers = useGameStore(
    useShallow(selectPlayersAtSpace(spaceId ?? -1, playerId ?? undefined))
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
  const totalFameEarned = rewards.totalFameEarned

  const fameBreakdown = useMemo(() => {
    const coverFameByPlayer = new Map<string, { name: string; fame: number }>()
    rewards.coverFameByOwner.forEach((fame, ownerId) => {
      const ownerPlayer = colocatedPlayers.find((p) => p.id === ownerId)
      if (ownerPlayer) coverFameByPlayer.set(ownerId, { name: ownerPlayer.name, fame })
    })
    return { playerFame: rewards.fighterFame, coverFameByPlayer }
  }, [rewards, colocatedPlayers])

  // Spectators animate other players' songs from the SSE event stream
  useEffect(() => {
    if (!remoteEntry || !isActive) return
    for (const event of remoteEntry.events) {
      if (event.type === 'damageDealt') {
        const newPopups = createDamagePopups(event.calculations, event.monstersBefore, event.monstersAfter)
        setPopups((prev) => [...prev, ...newPopups])
      }
    }
  }, [remoteEntry, isActive])

  if (!isActive || !player) return null

  const lastPlayedSong: Song | null = lastPlayedSongId
    ? allAvailableSongs.find((s) => s.id === lastPlayedSongId) ?? null
    : null

  const allMonstersDefeated = monsters.every((m: Monster) => m.currentHP <= 0)
  const playableSongs = player.songs.filter((s) => s.slots.some((slot) => slot.dice))
  const ownSongsRemaining = playableSongs.filter((s) => !isSongUsed(songsUsed, s.id)).length

  // Cover songs available from co-located players
  const coverPlayersWithSongs = colocatedPlayers
    .map((p) => ({
      player: p,
      songs: p.songs.filter((s) => s.slots.some((slot) => slot.dice) && !isSongUsed(songsUsed, s.id)),
    }))
    .filter((entry) => entry.songs.length > 0)

  const hasCoverSongsLeft = coverPlayersWithSongs.length > 0
  const hasReachedSongLimit = songsUsed.length >= MAX_SONGS_PER_COMBAT
  const canContinue = !hasReachedSongLimit && (ownSongsRemaining > 0 || hasCoverSongsLeft)

  const monstersAliveCount = monsters.filter((m: Monster) => m.currentHP > 0).length
  const totalExp = calculateTotalMonsterExp(monsters)
  const isCombatOver = allMonstersDefeated || !canContinue

  const showDamageEvents = (events: { type: string }[]) => {
    for (const event of events) {
      if (event.type === 'damageDealt') {
        const dmg = event as {
          type: 'damageDealt'
          calculations: Parameters<typeof createDamagePopups>[0]
          monstersBefore: Monster[]
          monstersAfter: Monster[]
        }
        const newPopups = createDamagePopups(dmg.calculations, dmg.monstersBefore, dmg.monstersAfter)
        setPopups((prev) => [...prev, ...newPopups])
      }
    }
  }

  const handlePlaySong = async (songId: string, ownerId: string) => {
    if (!canAct || isSongUsed(songsUsed, songId)) return
    const result = await dispatch({ type: 'PLAY_SONG', songId, ownerId })
    if (result.ok) showDamageEvents(result.events)
  }

  const handleReroll = async () => {
    if (!canAct || !lastPlayedSong || player.inspiration <= 0) return
    const result = await dispatch({ type: 'REROLL_SONG' })
    if (result.ok) showDamageEvents(result.events)
  }

  const handleEndCombat = () => {
    setChosenElement(null)
    // The engine awards EXP/fame, clears or re-tags the space, and checks
    // the phase transition — all in one atomic action
    dispatch({ type: 'END_COMBAT', spreadGenre: chosenElement ?? undefined })
  }

  return (
    <div className="modal-overlay">
      <DamagePopups entries={popups} onComplete={handlePopupComplete} />
      <div className="modal-content max-w-6xl animate-scale-in">
        {/* Atmospheric top gradient */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.4), transparent)' }} />

        <div className="p-4 sm:p-6 lg:p-10">
          {/* Header */}
          <div className="text-center mb-5 sm:mb-8 animate-fade-in">
            <div className="font-display text-2xl sm:text-4xl text-gold-400 mb-1.5"
              style={{ textShadow: '0 0 20px rgba(212, 168, 83, 0.2)' }}
            >
              The Mashup
            </div>
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="hidden sm:block h-px w-20" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.3))' }} />
              <p className="text-sm sm:text-base text-parchment-500 font-game tracking-wide">
                {player.name}'s Performance{!canAct ? ' — watching live' : ''}
              </p>
              <div className="hidden sm:block h-px w-20" style={{ background: 'linear-gradient(to left, transparent, rgba(212, 168, 83, 0.3))' }} />
            </div>
          </div>

          {/* Monsters Section */}
          <div className="mb-6 sm:mb-8">
            <SectionHeader
              label="Monsters"
              detail={monstersAliveCount > 0 ? `${monstersAliveCount} remaining` : 'All converted!'}
              detailColor={monstersAliveCount > 0 ? 'text-red-400' : 'text-green-400'}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {monsters.map((monster: Monster, idx: number) => (
                <MonsterCard
                  key={monster.id}
                  monster={monster}
                  index={idx}
                  fameValue={calculateMonsterFameValue(monster.level)}
                />
              ))}
            </div>
          </div>

          {/* Damage report — sits right under the monsters it applies to */}
          {lastDamageCalculations.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <DamageBreakdown
                calculations={lastDamageCalculations}
                monsters={monsters}
              />
            </div>
          )}

          {/* Songs Section */}
          <div className="mb-6 sm:mb-8">
            <SectionHeader
              label="Your Songs"
              detail={`${ownSongsRemaining} remaining · ${songsUsed.length}/${MAX_SONGS_PER_COMBAT} played`}
              detailColor="text-gold-400"
            />
            <div className="flex gap-3 sm:gap-5 overflow-x-auto pb-2 -mx-1 px-1">
              {player.songs.map((song, idx) => (
                <SongCard
                  key={song.id}
                  song={{ ...song, used: isSongUsed(songsUsed, song.id) }}
                  onPlay={() => handlePlaySong(song.id, player.id)}
                  disabled={!canAct || isSongUsed(songsUsed, song.id) || hasReachedSongLimit}
                  index={idx}
                  rolls={currentSongId === song.id ? rolls : undefined}
                  onReroll={canAct && currentSongId === song.id && !allMonstersDefeated ? handleReroll : undefined}
                  inspiration={player.inspiration}
                />
              ))}
            </div>
          </div>

          {/* Cover Songs Section */}
          {coverPlayersWithSongs.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <SectionHeader
                label="Cover Songs"
                detail={`${coverPlayersWithSongs.reduce((n, e) => n + e.songs.length, 0)} available`}
                detailColor="text-cyan-400"
              />
              {coverPlayersWithSongs.map(({ player: coverPlayer, songs }) => (
                <div key={coverPlayer.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
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
                  <div className="flex gap-3 sm:gap-5 overflow-x-auto pb-2 -mx-1 px-1">
                    {songs.map((song, idx) => (
                      <SongCard
                        key={song.id}
                        song={{ ...song, used: isSongUsed(songsUsed, song.id) }}
                        onPlay={() => handlePlaySong(song.id, coverPlayer.id)}
                        disabled={!canAct || isSongUsed(songsUsed, song.id) || hasReachedSongLimit}
                        index={idx}
                        isCover
                        ownerName={coverPlayer.name}
                        rolls={currentSongId === song.id ? rolls : undefined}
                        onReroll={canAct && currentSongId === song.id && !allMonstersDefeated ? handleReroll : undefined}
                        inspiration={player.inspiration}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rewards — always shown when combat is over */}
          {isCombatOver && (
            <div
              className="mb-6 sm:mb-8 rounded-xl overflow-hidden animate-slide-up"
              style={{
                background: allMonstersDefeated
                  ? 'linear-gradient(135deg, rgba(45, 140, 48, 0.08), rgba(42, 33, 24, 0.5))'
                  : 'rgba(42, 33, 24, 0.5)',
                border: `1px solid ${allMonstersDefeated ? 'rgba(76, 175, 80, 0.2)' : 'rgba(212, 168, 83, 0.12)'}`,
                boxShadow: allMonstersDefeated ? '0 0 30px rgba(76, 175, 80, 0.08)' : undefined,
              }}
            >
              <div className="px-4 sm:px-8 py-4 sm:py-5 text-center">
                <div className="text-sm font-medieval text-parchment-500 uppercase tracking-wider mb-1.5">
                  {allMonstersDefeated ? 'Victory' : 'Retreat'} — Rewards Earned
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-2">
                  {totalFameEarned > 0 && (
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold text-gold-400 tabular-nums"
                        style={{ textShadow: '0 0 12px rgba(212, 168, 83, 0.2)' }}
                      >
                        +{fameBreakdown.playerFame} Fame
                      </div>
                      <div className="text-xs text-parchment-500 mt-0.5">
                        {monstersDefeatedCount} monster{monstersDefeatedCount !== 1 ? 's' : ''} defeated
                      </div>
                      {fameBreakdown.coverFameByPlayer.size > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {Array.from(fameBreakdown.coverFameByPlayer.entries()).map(([ownerId, { name, fame }]) => (
                            <div key={ownerId} className="text-xs" style={{ color: '#4dd0e1' }}>
                              +{fame} Fame to {name} (cover)
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-gold-400 tabular-nums"
                      style={{ textShadow: '0 0 12px rgba(212, 168, 83, 0.2)' }}
                    >
                      +{totalExp} EXP
                    </div>
                    <div className="text-xs text-parchment-500 mt-0.5">
                      {monsters.map((m, i) => <span key={m.id}>{i > 0 && ' + '}{calculateTotalMonsterExp([m])} <span className="text-parchment-600">(Lv.{m.level})</span></span>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col items-center gap-4 pt-4">
            {allMonstersDefeated ? (
              <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
                {/* Element choice — radiates to cardinal neighbors */}
                <div className="w-full max-w-md text-center">
                  <div className="text-sm font-medieval text-parchment-400 uppercase tracking-wider mb-1">
                    Radiate an Element
                  </div>
                  <p className="text-xs text-parchment-500 mb-3">
                    Every space bordering this one gains 1 tag of your chosen element.
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {ALL_GENRES.map((genre) => {
                      const { emoji, rgb } = GENRE_THEME[genre]
                      const isChosen = chosenElement === genre
                      return (
                        <button
                          key={genre}
                          onClick={() => setChosenElement(isChosen ? null : genre)}
                          className="relative rounded-lg py-2.5 flex flex-col items-center gap-1 transition-all duration-200 ease-out hover:-translate-y-0.5"
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
                          <span className="text-2xl leading-none" style={{ filter: `drop-shadow(0 0 6px rgba(${rgb},${isChosen ? 0.6 : 0.3}))` }}>
                            {emoji}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: `rgb(${rgb})` }}>
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
                </div>

                <button
                  onClick={handleEndCombat}
                  disabled={!canAct || !chosenElement}
                  className="w-full max-w-md px-6 sm:px-10 py-3.5 font-medieval font-bold rounded-lg text-base sm:text-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #3d8c40, #2d6e30)',
                    border: '1px solid rgba(100, 220, 100, 0.4)',
                    color: '#d4ffd6',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                    boxShadow: '0 0 25px rgba(100, 220, 100, 0.15), 0 4px 15px rgba(0,0,0,0.3)',
                  }}
                  title={chosenElement ? undefined : 'Choose an element to radiate first'}
                >
                  {chosenElement ? 'Claim Fame & Glory' : 'Choose an Element Above'}
                </button>
              </div>
            ) : canContinue ? (
              <div className="flex items-center gap-4 animate-fade-in">
                <div className="hidden sm:block h-px w-12" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.2))' }} />
                <p className="text-base sm:text-lg text-parchment-500 italic font-game animate-pulse-slow text-center">
                  Choose a song to perform...
                </p>
                <div className="hidden sm:block h-px w-12" style={{ background: 'linear-gradient(to left, transparent, rgba(212, 168, 83, 0.2))' }} />
              </div>
            ) : (
              <button
                onClick={handleEndCombat}
                disabled={!canAct}
                className="btn-secondary text-base sm:text-lg px-10 py-3.5 animate-fade-in w-full max-w-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Retreat
              </button>
            )}
          </div>
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
