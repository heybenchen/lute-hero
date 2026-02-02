import { useGameStore, selectCurrentPlayer } from '@/store'
import { GenreBadge } from '@/components/ui/GenreBadge'
import { getMaxValue } from '@/game-logic/dice/roller'

export function CurrentPlayerDisplay() {
  const currentPlayer = useGameStore(selectCurrentPlayer)

  if (!currentPlayer) return null

  return (
    <div className="card p-3 mb-4">
      <div className="flex items-center gap-4">
        {/* Player avatar */}
        <div
          className="w-12 h-12 rounded-full border-3 border-wood-600 flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ backgroundColor: currentPlayer.color }}
        >
          {currentPlayer.name.charAt(0)}
        </div>

        {/* Songs display */}
        <div className="flex-1 overflow-x-auto">
          <div className="text-xs font-bold text-wood-600 mb-1">
            {currentPlayer.name}'s Songs
          </div>
          <div className="flex gap-2">
            {currentPlayer.songs.map((song) => (
              <div
                key={song.id}
                className="bg-parchment-200 rounded-lg p-2 border border-wood-400 min-w-fit"
              >
                <div className="text-[10px] font-bold text-wood-700 mb-1 truncate max-w-[120px]">
                  {song.name}
                </div>
                <div className="flex gap-1">
                  {song.slots.map((slot, idx) => (
                    <div
                      key={idx}
                      className={`w-8 h-8 rounded border flex flex-col items-center justify-center text-[8px] ${
                        slot.dice
                          ? 'bg-wood-100 border-wood-500'
                          : 'bg-parchment-100 border-dashed border-wood-300'
                      } ${slot.effect ? 'border-purple-400 border-2' : ''}`}
                    >
                      {slot.dice ? (
                        <>
                          <div className="text-xs">🎲</div>
                          <div className="font-bold text-[7px]">{getMaxValue(slot.dice.type)}</div>
                        </>
                      ) : slot.effect ? (
                        <div className="text-xs">✨</div>
                      ) : (
                        <div className="text-wood-400 text-xs">∅</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
