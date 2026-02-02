import { useGameStore, selectPlayerById } from '@/store'
import { MonsterCard } from './MonsterCard'
import { SongCard } from './SongCard'
import { DiceDisplay } from '@/components/ui/DiceDisplay'
import { DamageBreakdown } from './DamageBreakdown'
import { calculateFameEarned, calculateFailureBonus } from '@/game-logic/fame/calculator'
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
      awardPlayerExp(player.id, result.monstersDefeated * 10)
      incrementPlayerMonstersDefeated(player.id, result.monstersDefeated)
      if (spaceId !== null) {
        clearSpaceAfterCombat(spaceId)
      }
    } else {
      const baseExp = monsters.length * 10
      const bonusExp = calculateFailureBonus(baseExp)
      awardPlayerExp(player.id, bonusExp)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-6xl">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="font-display text-3xl text-gold-400 mb-1">
              The Mashup
            </div>
            <div className="h-px mx-auto w-48 mb-2" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.4), transparent)' }} />
            <p className="text-sm text-parchment-400 italic font-game">
              {player.name}'s Battle &mdash; Convert these fans!
            </p>
          </div>

          {/* Monsters */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-[10px] font-medieval text-parchment-400 uppercase tracking-wider">
                Monsters
              </div>
              <div className="text-xs text-red-400 font-bold">
                ({monsters.filter((m: Monster) => m.currentHP > 0).length} remaining)
              </div>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212, 168, 83, 0.2), transparent)' }} />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {monsters.map((monster: Monster) => (
                <MonsterCard key={monster.id} monster={monster} />
              ))}
            </div>
          </div>

          {/* Songs */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-[10px] font-medieval text-parchment-400 uppercase tracking-wider">
                Your Songs
              </div>
              <div className="text-xs text-gold-400 font-bold">
                ({player.songs.length - songsUsed.length} remaining)
              </div>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212, 168, 83, 0.2), transparent)' }} />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {player.songs.map((song) => (
                <SongCard
                  key={song.id}
                  song={{ ...song, used: songsUsed.includes(song.id) }}
                  onPlay={() => handlePlaySong(song.id)}
                  disabled={songsUsed.includes(song.id)}
                />
              ))}
            </div>
          </div>

          {/* Last roll result */}
          {rolls.length > 0 && (
            <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(61, 48, 32, 0.4)', border: '1px solid rgba(212, 168, 83, 0.15)' }}>
              <div className="text-[10px] font-medieval text-parchment-400 uppercase tracking-wider mb-3">
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
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Damage breakdown */}
          {lastDamageCalculations.length > 0 && (
            <div className="mb-6">
              <DamageBreakdown
                calculations={lastDamageCalculations}
                monsters={monsters}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-center pt-2">
            {allMonstersDefeated ? (
              <button onClick={handleEndCombat}
                className="px-8 py-3 font-medieval font-bold rounded-lg text-lg transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #3d8c40, #2d6e30)',
                  border: '1px solid rgba(100, 220, 100, 0.5)',
                  color: '#d4ffd6',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                  boxShadow: '0 0 20px rgba(100, 220, 100, 0.2), 0 4px 15px rgba(0,0,0,0.3)',
                }}
              >
                &#x2713; Victory! Claim Fame
              </button>
            ) : canContinue ? (
              <p className="text-base text-parchment-400 italic font-game animate-pulse-slow">
                Select a song to play...
              </p>
            ) : (
              <button onClick={handleEndCombat} className="btn-secondary text-lg px-8">
                Retreat (Gain Bonus EXP)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
