import { useState, useCallback, useMemo } from 'react'
import { useGameStore, selectPlayerById, selectPlayersAtSpace } from '@/store'
import { useShallow } from 'zustand/react/shallow'
import { MonsterCard } from './MonsterCard'
import { SongCard } from './SongCard'
import { DiceDisplay } from '@/components/ui/DiceDisplay'
import { DamageBreakdown } from './DamageBreakdown'
import { DamagePopups, DamagePopupEntry, createDamagePopups } from './DamagePopup'
import { calculateFameEarned, calculateMonsterFameValue, calculateTotalMonsterExp } from '@/game-logic/fame/calculator'
import { calculateCoverFameSplit } from '@/game-logic/fame/coverSongFame'
import { MAX_SONGS_PER_COMBAT } from '@/store/slices/combatSlice'
import { Genre, Monster, Player, SongUsage } from '@/types'
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
  const lastDamageCalculations = useGameStore((state) => state.lastDamageCalculations)
  const lastPlayedSong = useGameStore((state) => state.lastPlayedSong)
  const playSong = useGameStore((state) => state.playSong)
  const rerollLastSong = useGameStore((state) => state.rerollLastSong)
  const spendInspiration = useGameStore((state) => state.spendInspiration)
  const endCombat = useGameStore((state) => state.endCombat)
  const clearSpaceAfterCombat = useGameStore((state) => state.clearSpaceAfterCombat)
  const awardPlayerFame = useGameStore((state) => state.awardPlayerFame)
  const awardPlayerExp = useGameStore((state) => state.awardPlayerExp)
  const incrementPlayerMonstersDefeated = useGameStore(
    (state) => state.incrementPlayerMonstersDefeated
  )
  const checkPhaseTransition = useGameStore((state) => state.checkPhaseTransition)
  const addGenreTagsForMonsters = useGameStore((state) => state.addGenreTagsForMonsters)
  const removeGenreTagsForDefeatedMonsters = useGameStore((state) => state.removeGenreTagsForDefeatedMonsters)
  const spreadElementToNeighbors = useGameStore((state) => state.spreadElementToNeighbors)

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

  const monstersDefeatedCount = monsters.filter((m: Monster) => m.currentHP <= 0).length
  const totalFameEarned = player && monstersDefeatedCount > 0
    ? calculateFameEarned(
        monsters.filter((m: Monster) => m.currentHP <= 0).map((m: Monster) => m.level)
      )
    : 0

  const fameBreakdown = useMemo(() => {
    if (monstersDefeatedCount === 0 || totalFameEarned === 0) {
      return { playerFame: 0, coverFameByPlayer: new Map<string, { name: string; fame: number }>() }
    }

    // Fame per kill scales with the killed monster's level
    const fameForKill = (monsterId: string) => {
      const level = monsters.find((m: Monster) => m.id === monsterId)?.level ?? 1
      return calculateMonsterFameValue(level)
    }

    let playerFame = killCredits
      .filter((kc) => !kc.isCover)
      .reduce((sum, kc) => sum + fameForKill(kc.monsterId), 0)

    const coverFameByOwner = new Map<string, number>()
    killCredits.filter((kc) => kc.isCover).forEach((kc) => {
      coverFameByOwner.set(kc.songOwnerId, (coverFameByOwner.get(kc.songOwnerId) || 0) + fameForKill(kc.monsterId))
    })

    const coverFameByPlayer = new Map<string, { name: string; fame: number }>()
    coverFameByOwner.forEach((coverFame, ownerId) => {
      const splitShare = calculateCoverFameSplit(coverFame)
      const ownerPlayer = colocatedPlayers.find((p: Player) => p.id === ownerId)
      if (ownerPlayer && splitShare > 0) {
        coverFameByPlayer.set(ownerId, { name: ownerPlayer.name, fame: splitShare })
      }
      playerFame += splitShare // Fighting player also gets their half
    })

    return { playerFame, coverFameByPlayer }
  }, [killCredits, monsters, monstersDefeatedCount, totalFameEarned, colocatedPlayers])

  if (!isActive || !player) return null

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

  const handlePlaySong = (songId: string, ownerId: string) => {
    // Find the song from the correct owner
    const owner = ownerId === player.id
      ? player
      : colocatedPlayers.find((p: Player) => p.id === ownerId)
    const song = owner?.songs.find((s) => s.id === songId)
    if (!song || isSongUsed(songsUsed, songId)) return

    // Snapshot monsters before damage
    const monstersBefore = monsters.map((m) => ({ ...m }))

    const result = playSong(song, ownerId)

    // Create floating damage popups
    const newPopups = createDamagePopups(
      result.damageCalculations,
      monstersBefore,
      result.updatedMonsters,
    )
    setPopups((prev) => [...prev, ...newPopups])
  }

  const handleReroll = () => {
    if (!lastPlayedSong || player.inspiration <= 0) return
    if (!spendInspiration(player.id, 1)) return
    const result = rerollLastSong()
    if (!result) return
    // Show the new performance's damage relative to the pre-play monster state
    const newPopups = createDamagePopups(
      result.damageCalculations,
      result.monstersBefore,
      result.updatedMonsters,
    )
    setPopups((prev) => [...prev, ...newPopups])
  }

  const handleEndCombat = () => {
    const success = allMonstersDefeated
    const { playerFame, coverFameByPlayer } = fameBreakdown
    setChosenElement(null)
    endCombat(success)

    // EXP is always awarded for the full encounter
    awardPlayerExp(player.id, calculateTotalMonsterExp(monsters))

    // Fame awarded for each monster defeated, even on retreat
    if (monstersDefeatedCount > 0) {
      // Award fighting player their share
      if (playerFame > 0) {
        awardPlayerFame(player.id, playerFame)
      }
      // Award cover source players their share
      coverFameByPlayer.forEach(({ fame }, ownerId) => {
        awardPlayerFame(ownerId, fame)
      })
      incrementPlayerMonstersDefeated(player.id, monstersDefeatedCount)
      checkPhaseTransition()
    }

    if (success && spaceId !== null) {
      clearSpaceAfterCombat(spaceId)
      // Victor radiates their chosen element to all cardinal neighbors
      if (chosenElement) {
        spreadElementToNeighbors(spaceId, chosenElement)
      }
    }

    // On retreat, remove genre tags for defeated monsters and add tags for surviving ones
    if (!success && spaceId !== null) {
      // Remove genre tags equal to each defeated monster's level
      const defeatedTags: Genre[] = monsters
        .filter((m: Monster) => m.currentHP <= 0 && m.vulnerability !== null)
        .flatMap((m: Monster) => Array(m.level).fill(m.vulnerability!))
      if (defeatedTags.length > 0) {
        removeGenreTagsForDefeatedMonsters(spaceId, defeatedTags)
      }

      const survivingGenres = monsters
        .filter((m: Monster) => m.currentHP > 0 && m.vulnerability !== null)
        .map((m: Monster) => m.vulnerability!)
      if (survivingGenres.length > 0) {
        addGenreTagsForMonsters(spaceId, survivingGenres)
      }
    }
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
                {player.name}'s Performance
              </p>
              <div className="hidden sm:block h-px w-20" style={{ background: 'linear-gradient(to left, transparent, rgba(212, 168, 83, 0.3))' }} />
            </div>

            {/* Live EXP counter — EXP is fixed per monster level, so this total
                holds steady throughout the fight (not just in the end summary) */}
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm"
              style={{
                background: 'rgba(212, 168, 83, 0.08)',
                border: '1px solid rgba(212, 168, 83, 0.2)',
              }}
            >
              <span className="text-parchment-500">EXP this fight:</span>
              <span className="font-bold text-gold-400 tabular-nums">+{totalExp}</span>
            </div>
          </div>

          {/* Monsters Section */}
          <div className="mb-6 sm:mb-8">
            <SectionHeader
              label="Monsters"
              detail={monstersAliveCount > 0 ? `${monstersAliveCount} remaining` : 'All converted!'}
              detailColor={monstersAliveCount > 0 ? 'text-red-400' : 'text-green-400'}
            />
            <div className="flex gap-3 sm:gap-5 overflow-x-auto pb-2 -mx-1 px-1">
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
                  disabled={isSongUsed(songsUsed, song.id) || hasReachedSongLimit}
                  index={idx}
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
                        disabled={isSongUsed(songsUsed, song.id) || hasReachedSongLimit}
                        index={idx}
                        isCover
                        ownerName={coverPlayer.name}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Last Roll + Damage — side by side when both present */}
          {(rolls.length > 0 || lastDamageCalculations.length > 0) && (
            <div className={`mb-6 sm:mb-8 ${rolls.length > 0 && lastDamageCalculations.length > 0 ? 'grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4 lg:gap-5' : ''}`}>
              {/* Last roll result */}
              {rolls.length > 0 && (
                <div
                  className="rounded-xl p-4 sm:p-5 animate-fade-in self-start max-w-full overflow-x-auto"
                  style={{
                    background: 'rgba(42, 33, 24, 0.5)',
                    border: '1px solid rgba(212, 168, 83, 0.12)',
                  }}
                >
                  <div className="text-sm font-medieval text-parchment-500 uppercase tracking-wider mb-3">
                    Last Roll
                  </div>
                  <div className="flex gap-3 items-center flex-wrap">
                    {rolls.map((roll, idx) => {
                      const dice = allAvailableSongs
                        .flatMap((s) => s.slots)
                        .find((slot) => slot.dice?.id === roll.diceId)?.dice

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

                  {/* Reroll the last song with Inspiration */}
                  {lastPlayedSong && !allMonstersDefeated && (
                    <button
                      onClick={handleReroll}
                      disabled={player.inspiration <= 0}
                      className="mt-3 text-sm font-medieval font-bold rounded-lg px-3 py-1.5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5"
                      style={{
                        background: 'rgba(176, 124, 255, 0.12)',
                        border: '1px solid rgba(176, 124, 255, 0.4)',
                        color: '#d9c2ff',
                      }}
                      title={player.inspiration > 0 ? 'Reroll this song for 1 Inspiration' : 'Requires Inspiration'}
                    >
                      &#x2728; Reroll &mdash; {player.inspiration} Inspiration
                    </button>
                  )}
                </div>
              )}

              {/* Damage breakdown */}
              {lastDamageCalculations.length > 0 && (
                <DamageBreakdown
                  calculations={lastDamageCalculations}
                  monsters={monsters}
                />
              )}
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
                  disabled={!chosenElement}
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
                className="btn-secondary text-base sm:text-lg px-10 py-3.5 animate-fade-in w-full max-w-md"
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
