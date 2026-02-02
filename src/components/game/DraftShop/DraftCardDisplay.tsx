import { DraftCard } from '@/types'
import { DiceDisplay } from '@/components/ui/DiceDisplay'
import { TRACK_EFFECT_DESCRIPTIONS } from '@/data/trackEffects'

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
  return (
    <div className={`card min-w-[250px] ${!canAfford ? 'opacity-50' : ''}`}>
      <div className="card-header flex justify-between items-center">
        <span>{card.type === 'dice' ? '🎲 Dice Pair' : '🎵 New Song'}</span>
        <span className="text-yellow-600 font-bold">{card.cost} EXP</span>
      </div>

      {/* Dice preview */}
      {card.type === 'dice' && card.dice && (
        <div className="mb-4">
          <div className="flex gap-3 justify-center mb-2">
            {card.dice.map((dice) => (
              <DiceDisplay key={dice.id} dice={dice} />
            ))}
          </div>
          <div className="text-center text-sm text-wood-600">
            {card.dice[0].genre} Dice Pair
          </div>
        </div>
      )}

      {/* Song preview */}
      {card.type === 'song' && (
        <div className="mb-4">
          <div className="text-lg font-bold text-center mb-2">
            {card.songName}
          </div>
          {card.songEffect && (
            <div className="text-sm text-purple-700 text-center">
              ✨ Slot Effect: {TRACK_EFFECT_DESCRIPTIONS[card.songEffect.type] || card.songEffect.type}
            </div>
          )}
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
