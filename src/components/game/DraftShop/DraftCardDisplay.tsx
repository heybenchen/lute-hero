import { useState } from 'react'
import { DraftCard } from '@/types'
import { DiceDisplay } from '@/components/ui/DiceDisplay'
import { TRACK_EFFECT_DESCRIPTIONS } from '@/data/trackEffects'
import { getMaxValue } from '@/game-logic/dice/roller'

interface DraftCardDisplayProps {
  card: DraftCard
  onPurchase: () => void
  canAfford: boolean
  disabled?: boolean
}

export function DraftCardDisplay({
  card,
  onPurchase,
  canAfford,
  disabled = false,
}: DraftCardDisplayProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className={`card min-w-[250px] relative ${!canAfford ? 'opacity-50' : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="card-header flex justify-between items-center">
        <span>{card.type === 'dice' ? '🎲 Dice Pair' : '🎵 New Song'}</span>
        <span className="text-yellow-600 font-bold">{card.cost} EXP</span>
      </div>

      {/* Dice preview */}
      {card.type === 'dice' && card.dice && (
        <div className="mb-4">
          <div className="flex gap-3 justify-center mb-2">
            {card.dice.map((dice) => (
              <div key={dice.id} className="relative">
                <DiceDisplay dice={dice} />
                {/* Max value display */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg">
                  {getMaxValue(dice.type)}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-wood-600">
            {card.dice[0].genre} Dice Pair
          </div>
        </div>
      )}

      {/* Tooltip for dice */}
      {showTooltip && card.type === 'dice' && card.dice && (
        <div className="absolute z-50 bg-wood-600 text-parchment-100 p-3 rounded-lg shadow-2xl left-1/2 transform -translate-x-1/2 -top-2 -translate-y-full w-64 border-2 border-wood-400">
          <div className="font-bold mb-2 text-center">{card.dice[0].genre} Dice Pair</div>
          <div className="text-sm space-y-1">
            {card.dice.map((dice, idx) => (
              <div key={idx} className="flex justify-between">
                <span>Die {idx + 1}:</span>
                <span className="font-bold">{dice.type} (1-{getMaxValue(dice.type)})</span>
              </div>
            ))}
            <div className="border-t border-parchment-300 pt-2 mt-2">
              <div className="text-xs text-parchment-300">
                Rolling max value grants <span className="text-yellow-400 font-bold">+5 crit bonus</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-wood-600"></div>
          </div>
        </div>
      )}

      {/* Song preview */}
      {card.type === 'song' && (
        <div className="mb-4">
          <div className="text-lg font-bold text-center mb-3">
            {card.songName}
          </div>
          <div className="space-y-1 text-xs">
            {card.songEffect && (
              <div className="bg-purple-100 p-2 rounded border border-purple-300">
                <div className="font-bold text-purple-800 mb-1">Slot 3:</div>
                <div className="text-purple-700">
                  ✨ {TRACK_EFFECT_DESCRIPTIONS[card.songEffect.type] || card.songEffect.type}
                </div>
              </div>
            )}
            {card.songEffect2 && (
              <div className="bg-purple-100 p-2 rounded border border-purple-300">
                <div className="font-bold text-purple-800 mb-1">Slot 4:</div>
                <div className="text-purple-700">
                  ✨ {TRACK_EFFECT_DESCRIPTIONS[card.songEffect2.type] || card.songEffect2.type}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tooltip for songs */}
      {showTooltip && card.type === 'song' && (card.songEffect || card.songEffect2) && (
        <div className="absolute z-50 bg-wood-600 text-parchment-100 p-3 rounded-lg shadow-2xl left-1/2 transform -translate-x-1/2 -top-2 -translate-y-full w-72 border-2 border-wood-400">
          <div className="font-bold mb-2 text-center">{card.songName}</div>
          <div className="text-sm space-y-2">
            {card.songEffect && (
              <div>
                <div className="text-purple-300 font-bold mb-1">Slot 3 Effect:</div>
                <div className="bg-wood-500 p-2 rounded text-parchment-200 text-xs">
                  {TRACK_EFFECT_DESCRIPTIONS[card.songEffect.type] || card.songEffect.type}
                </div>
              </div>
            )}
            {card.songEffect2 && (
              <div>
                <div className="text-purple-300 font-bold mb-1">Slot 4 Effect:</div>
                <div className="bg-wood-500 p-2 rounded text-parchment-200 text-xs">
                  {TRACK_EFFECT_DESCRIPTIONS[card.songEffect2.type] || card.songEffect2.type}
                </div>
              </div>
            )}
            <div className="text-xs text-parchment-300 mt-2 border-t border-parchment-400 pt-2">
              Slots 1-2 are empty and can be filled with any dice
            </div>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-wood-600"></div>
          </div>
        </div>
      )}

      {/* Purchase button */}
      <button
        onClick={onPurchase}
        disabled={!canAfford || disabled}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {canAfford ? 'Purchase' : 'Not Enough EXP'}
      </button>
    </div>
  )
}
