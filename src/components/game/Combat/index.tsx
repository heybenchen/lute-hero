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
      // Award fame
      const fameEarned = calculateFameEarned(
        player.monstersDefeated,
        result.monstersDefeated
      )
      awardPlayerFame(player.id, fameEarned)

      // Award base EXP (10 per monster)
      awardPlayerExp(player.id, result.monstersDefeated * 10)

      // Increment monsters defeated
      incrementPlayerMonstersDefeated(player.id, result.monstersDefeated)

      // Clear space
      if (spaceId !== null) {
        clearSpaceAfterCombat(spaceId)
      }
    } else {
      // Failure: bonus EXP (catchup mechanic)
      const baseExp = monsters.length * 10
      const bonusExp = calculateFailureBonus(baseExp)
      awardPlayerExp(player.id, bonusExp)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-8">
      <div className="bg-parchment-100 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="font-medieval text-3xl text-wood-600 mb-2">
              🎸 THE MASHUP 🎸
            </h2>
            <p className="text-lg text-wood-500">
              {player.name}'s Battle - Convert these fans!
            </p>
          </div>

          {/* Monsters */}
          <div className="mb-6">
            <h3 className="font-medieval text-xl text-wood-600 mb-3">
              Monsters ({monsters.filter((m: Monster) => m.currentHP > 0).length} remaining)
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {monsters.map((monster: Monster) => (
                <MonsterCard key={monster.id} monster={monster} />
              ))}
            </div>
          </div>

          {/* Songs */}
          <div className="mb-6">
            <h3 className="font-medieval text-xl text-wood-600 mb-3">
              Your Songs ({player.songs.length - songsUsed.length} remaining)
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
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
            <div className="mb-6 bg-wood-100 p-4 rounded-lg">
              <h3 className="font-medieval text-lg text-wood-600 mb-3">
                🎲 Last Roll
              </h3>
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
          <div className="flex gap-4 justify-center">
            {allMonstersDefeated ? (
              <button onClick={handleEndCombat} className="btn-primary text-xl">
                ✓ Victory! Claim Fame
              </button>
            ) : canContinue ? (
              <p className="text-lg text-wood-600">
                Select a song to play...
              </p>
            ) : (
              <button onClick={handleEndCombat} className="btn-secondary text-xl">
                Retreat (Gain Bonus EXP)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
