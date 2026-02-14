import { useGameStore, selectPlayerById } from '@/store'
import { MonsterCard } from './MonsterCard'
import { SongCard } from './SongCard'
import { DiceDisplay } from '@/components/ui/DiceDisplay'
import { DamageBreakdown } from './DamageBreakdown'
import { calculateFameEarned, calculateFailureBonus, calculateTotalMonsterExp } from '@/game-logic/fame/calculator'
import { Monster } from '@/types'

export function CombatModal() {
  const isActive = useGameStore((state) => state.isActive)
  const playerId = useGameStore((state) => state.playerId)
  const spaceId = useGameStore((state) => state.spaceId)
  const monsters = useGameStore((state) => state.monsters)
  const songsUsed = useGameStore((state) => state.songsUsed)
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

  const player = useGameStore(
    selectPlayerById(playerId || '')
  )

  if (!isActive || !player) return null

  const allMonstersDefeated = monsters.every((m: Monster) => m.currentHP <= 0)
  const canContinue = songsUsed.length < player.songs.length
  const defeatedMonsters = monsters.filter((m: Monster) => m.currentHP <= 0)
  const monstersAliveCount = monsters.filter((m: Monster) => m.currentHP > 0).length
  const victoryExp = calculateTotalMonsterExp(defeatedMonsters)
  const retreatExp = Math.floor(calculateTotalMonsterExp(monsters) * 1.5)
  const isCombatOver = allMonstersDefeated || !canContinue

  const handlePlaySong = (songId: string) => {
    const song = player.songs.find((s) => s.id === songId)
    if (!song || songsUsed.includes(songId)) return

    playSong(song)
  }

  const handleEndCombat = () => {
    const success = allMonstersDefeated
    const result = endCombat(success)

    if (success) {
      const fameEarned = calculateFameEarned(
        player.monstersDefeated,
        result.monstersDefeated
      )
      awardPlayerFame(player.id, fameEarned)
      awardPlayerExp(player.id, calculateTotalMonsterExp(monsters))
      incrementPlayerMonstersDefeated(player.id, result.monstersDefeated)
      if (spaceId !== null) {
        clearSpaceAfterCombat(spaceId)
      }
    } else {
      const baseExp = calculateTotalMonsterExp(monsters)
      const bonusExp = calculateFailureBonus(baseExp)
      awardPlayerExp(player.id, bonusExp)
    }
  }

  return (
    <div className="modal-overlay">
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
              detail={`${player.songs.length - songsUsed.length} remaining`}
              detailColor="text-gold-400"
            />
            <div className="flex gap-5 overflow-x-auto pb-2 -mx-1 px-1">
              {player.songs.map((song, idx) => (
                <SongCard
                  key={song.id}
                  song={{ ...song, used: songsUsed.includes(song.id) }}
                  onPlay={() => handlePlaySong(song.id)}
                  disabled={songsUsed.includes(song.id)}
                  index={idx}
                />
              ))}
            </div>
          </div>

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
                      const dice = player.songs
                        .flatMap((s) => s.slots)
                        .find((slot) => slot.dice?.id === roll.diceId)?.dice

                      if (!dice) return null

                      return (
                        <DiceDisplay
                          key={idx}
                          dice={dice}
                          value={roll.value}
                          isCrit={roll.isCrit}
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

          {/* EXP Reward — only when combat is over */}
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
                  {allMonstersDefeated ? 'Victory Reward' : 'Consolation Prize'}
                </div>
                <div className="text-3xl font-bold text-gold-400 tabular-nums"
                  style={{ textShadow: '0 0 12px rgba(212, 168, 83, 0.2)' }}
                >
                  +{allMonstersDefeated ? victoryExp : retreatExp} EXP
                </div>
                <div className="text-base text-parchment-500 mt-1.5">
                  {allMonstersDefeated
                    ? <>{defeatedMonsters.map((m, i) => <span key={m.id}>{i > 0 && ' + '}{calculateTotalMonsterExp([m])} <span className="text-parchment-600">(Lv.{m.level})</span></span>)}</>
                    : <>Level-scaled EXP &times; 1.5 <span className="text-parchment-600">(50% failure bonus)</span></>
                  }
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
