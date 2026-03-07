import { useState, useCallback, useMemo } from 'react'
import { useGameStore, selectPlayerById, selectPlayersAtSpace } from '@/store'
import { useShallow } from 'zustand/react/shallow'
import { MonsterCard } from './MonsterCard'
import { SongCard } from './SongCard'
import { DiceDisplay } from '@/components/ui/DiceDisplay'
import { DamageBreakdown } from './DamageBreakdown'
import { DamagePopups, DamagePopupEntry, createDamagePopups } from './DamagePopup'
import { calculateFameEarned, calculateTotalMonsterExp } from '@/game-logic/fame/calculator'
import { calculateCoverFameSplit } from '@/game-logic/fame/coverSongFame'
import { MAX_SONGS_PER_COMBAT } from '@/store/slices/combatSlice'
import { Genre, Monster, Player, SongUsage } from '@/types'

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
  const playSong = useGameStore((state) => state.playSong)
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
    ? calculateFameEarned(player.monstersDefeated, monstersDefeatedCount)
    : 0

  const fameBreakdown = useMemo(() => {
    if (monstersDefeatedCount === 0 || totalFameEarned === 0) {
      return { playerFame: 0, coverFameByPlayer: new Map<string, { name: string; fame: number }>() }
    }

    const ownKills = killCredits.filter((kc) => !kc.isCover).length
    const coverKillsByOwner = new Map<string, number>()
    killCredits.filter((kc) => kc.isCover).forEach((kc) => {
      coverKillsByOwner.set(kc.songOwnerId, (coverKillsByOwner.get(kc.songOwnerId) || 0) + 1)
    })

    const famePerKill = monstersDefeatedCount > 0 ? totalFameEarned / monstersDefeatedCount : 0

    let playerFame = Math.round(ownKills * famePerKill)
    const coverFameByPlayer = new Map<string, { name: string; fame: number }>()

    coverKillsByOwner.forEach((killCount, ownerId) => {
      const coverFame = Math.round(killCount * famePerKill)
      const splitShare = calculateCoverFameSplit(coverFame)
      const ownerPlayer = colocatedPlayers.find((p: Player) => p.id === ownerId)
      if (ownerPlayer && splitShare > 0) {
        coverFameByPlayer.set(ownerId, { name: ownerPlayer.name, fame: splitShare })
      }
      playerFame += splitShare // Fighting player also gets their half
    })

    return { playerFame, coverFameByPlayer }
  }, [killCredits, monstersDefeatedCount, totalFameEarned, colocatedPlayers])

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

  const handleEndCombat = () => {
    const success = allMonstersDefeated
    const { playerFame, coverFameByPlayer } = fameBreakdown
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

        <div className="p-10">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="font-display text-4xl text-gold-400 mb-1.5"
              style={{ textShadow: '0 0 20px rgba(212, 168, 83, 0.2)' }}
            >
              The Mashup
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="h-px w-20" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.3))' }} />
              <p className="text-base text-parchment-500 font-game tracking-wide">
                {player.name}'s Performance
              </p>
              <div className="h-px w-20" style={{ background: 'linear-gradient(to left, transparent, rgba(212, 168, 83, 0.3))' }} />
            </div>
          </div>

          {/* Monsters Section */}
          <div className="mb-8">
            <SectionHeader
              label="Monsters"
              detail={monstersAliveCount > 0 ? `${monstersAliveCount} remaining` : 'All converted!'}
              detailColor={monstersAliveCount > 0 ? 'text-red-400' : 'text-green-400'}
            />
            <div className="flex gap-5 overflow-x-auto pb-2 -mx-1 px-1">
              {monsters.map((monster: Monster, idx: number) => (
                <MonsterCard key={monster.id} monster={monster} index={idx} />
              ))}
            </div>
          </div>

          {/* Songs Section */}
          <div className="mb-8">
            <SectionHeader
              label="Your Songs"
              detail={`${ownSongsRemaining} remaining · ${songsUsed.length}/${MAX_SONGS_PER_COMBAT} played`}
              detailColor="text-gold-400"
            />
            <div className="flex gap-5 overflow-x-auto pb-2 -mx-1 px-1">
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
            <div className="mb-8">
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
                  <div className="flex gap-5 overflow-x-auto pb-2 -mx-1 px-1">
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
            <div className={`mb-8 ${rolls.length > 0 && lastDamageCalculations.length > 0 ? 'grid grid-cols-[auto_1fr] gap-5' : ''}`}>
              {/* Last roll result */}
              {rolls.length > 0 && (
                <div
                  className="rounded-xl p-5 animate-fade-in self-start"
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
                        />
                      )
                    })}
                  </div>
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
              className="mb-8 rounded-xl overflow-hidden animate-slide-up"
              style={{
                background: allMonstersDefeated
                  ? 'linear-gradient(135deg, rgba(45, 140, 48, 0.08), rgba(42, 33, 24, 0.5))'
                  : 'rgba(42, 33, 24, 0.5)',
                border: `1px solid ${allMonstersDefeated ? 'rgba(76, 175, 80, 0.2)' : 'rgba(212, 168, 83, 0.12)'}`,
                boxShadow: allMonstersDefeated ? '0 0 30px rgba(76, 175, 80, 0.08)' : undefined,
              }}
            >
              <div className="px-8 py-5 text-center">
                <div className="text-sm font-medieval text-parchment-500 uppercase tracking-wider mb-1.5">
                  {allMonstersDefeated ? 'Victory' : 'Retreat'} — Rewards Earned
                </div>
                <div className="flex items-center justify-center gap-6 mt-2">
                  {totalFameEarned > 0 && (
                    <div>
                      <div className="text-3xl font-bold text-gold-400 tabular-nums"
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
                    <div className="text-3xl font-bold text-gold-400 tabular-nums"
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
          <div className="flex gap-4 justify-center pt-4">
            {allMonstersDefeated ? (
              <button
                onClick={handleEndCombat}
                className="px-10 py-3.5 font-medieval font-bold rounded-lg text-lg transition-all duration-200 animate-fade-in"
                style={{
                  background: 'linear-gradient(135deg, #3d8c40, #2d6e30)',
                  border: '1px solid rgba(100, 220, 100, 0.4)',
                  color: '#d4ffd6',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                  boxShadow: '0 0 25px rgba(100, 220, 100, 0.15), 0 4px 15px rgba(0,0,0,0.3)',
                }}
              >
                Claim Fame &amp; Glory
              </button>
            ) : canContinue ? (
              <div className="flex items-center gap-4 animate-fade-in">
                <div className="h-px w-12" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.2))' }} />
                <p className="text-lg text-parchment-500 italic font-game animate-pulse-slow">
                  Choose a song to perform...
                </p>
                <div className="h-px w-12" style={{ background: 'linear-gradient(to left, transparent, rgba(212, 168, 83, 0.2))' }} />
              </div>
            ) : (
              <button
                onClick={handleEndCombat}
                className="btn-secondary text-lg px-10 py-3.5 animate-fade-in"
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
