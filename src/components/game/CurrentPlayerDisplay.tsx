import { useState } from 'react'
import { useGameStore, selectCurrentPlayer } from '@/store'
import { GenreBadge } from '@/components/ui/GenreBadge'
import { getMaxValue } from '@/game-logic/dice/roller'
import { TRACK_EFFECT_DESCRIPTIONS } from '@/data/trackEffects'
import { Song } from '@/types'

export function CurrentPlayerDisplay() {
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const [hoveredSong, setHoveredSong] = useState<string | null>(null)

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
                className="bg-parchment-200 rounded-lg p-2 border border-wood-400 min-w-fit relative"
                onMouseEnter={() => setHoveredSong(song.id)}
                onMouseLeave={() => setHoveredSong(null)}
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

                {/* Hover tooltip */}
                {hoveredSong === song.id && (
                  <div className="absolute z-50 bg-wood-700 text-parchment-100 p-3 rounded-lg shadow-2xl top-full mt-2 left-0 w-64 border-2 border-wood-500 pointer-events-none">
                    <div className="font-bold mb-2 text-yellow-300">{song.name}</div>
                    <div className="space-y-2 text-xs">
                      {song.slots.map((slot, idx) => (
                        <div key={idx} className="border-b border-wood-600 pb-1 last:border-0">
                          <div className="font-bold text-parchment-300">Slot {idx + 1}:</div>
                          {slot.dice && (
                            <div className="mt-1">
                              <div className="flex items-center gap-1">
                                <span className="text-parchment-200">{slot.dice.type}</span>
                                <GenreBadge genre={slot.dice.genre} className="text-[8px]" />
                              </div>
                              <div className="text-[10px] text-parchment-300">
                                Roll: 1-{getMaxValue(slot.dice.type)} (+5 on max)
                              </div>
                            </div>
                          )}
                          {slot.effect && (
                            <div className="mt-1 text-purple-300">
                              ✨ {TRACK_EFFECT_DESCRIPTIONS[slot.effect.type] || slot.effect.type}
                            </div>
                          )}
                          {!slot.dice && !slot.effect && (
                            <div className="text-wood-400 text-[10px]">Empty slot</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
