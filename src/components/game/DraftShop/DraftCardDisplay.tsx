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
      className={`card relative transition-all duration-200 ${!canAfford ? 'opacity-40' : 'hover:shadow-card-hover'}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex justify-between items-center mb-3 pb-2" style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.2)' }}>
        <span className="font-medieval font-bold text-gold-400">
          {card.type === 'dice' ? 'Dice Pair' : 'New Song'}
        </span>
        <span className="text-gold-300 font-bold text-sm">{card.cost} EXP</span>
      </div>

      {/* Dice preview */}
      {card.type === 'dice' && card.dice && (
        <div className="mb-4">
          <div className="flex gap-3 justify-center mb-2">
            {card.dice.map((dice) => (
              <div key={dice.id} className="relative">
                <DiceDisplay dice={dice} />
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #b8922e, #d4a853)',
                    color: '#1a1410',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  {getMaxValue(dice.type)}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center text-xs text-parchment-400">
            {card.dice[0].genre} Dice Pair
          </div>
        </div>
      )}

      {/* Tooltip for dice */}
      {showTooltip && card.type === 'dice' && card.dice && (
        <div className="absolute z-50 p-3 rounded-lg shadow-2xl left-1/2 transform -translate-x-1/2 -top-2 -translate-y-full w-60 animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, #2a2118, #1a1410)',
            border: '1px solid rgba(212, 168, 83, 0.3)',
          }}
        >
          <div className="font-bold mb-2 text-center text-gold-400 text-sm">{card.dice[0].genre} Dice Pair</div>
          <div className="text-xs space-y-1 text-parchment-300">
            {card.dice.map((dice, idx) => (
              <div key={idx} className="flex justify-between">
                <span>Die {idx + 1}:</span>
                <span className="font-bold text-parchment-200">{dice.type} (1-{getMaxValue(dice.type)})</span>
              </div>
            ))}
            <div className="pt-2 mt-2" style={{ borderTop: '1px solid rgba(212, 168, 83, 0.15)' }}>
              <div className="text-[10px] text-parchment-400">
                Rolling max value grants <span className="text-gold-400 font-bold">+5 crit bonus</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent" style={{ borderTopColor: 'rgba(212, 168, 83, 0.3)' }}></div>
          </div>
        </div>
      )}

      {/* Song preview */}
      {card.type === 'song' && (
        <div className="mb-4">
          <div className="text-base font-bold text-center mb-3 text-parchment-200 truncate">
            {card.songName}
          </div>
          <div className="space-y-1 text-xs">
            {card.songEffect && (
              <div className="p-1.5 rounded flex items-center gap-2"
                style={{ background: 'rgba(176, 124, 255, 0.08)', border: '1px solid rgba(176, 124, 255, 0.15)' }}
              >
                <span className="font-bold text-classical shrink-0">3:</span>
                <span className="text-classical/80 truncate">
                  {TRACK_EFFECT_DESCRIPTIONS[card.songEffect.type] || card.songEffect.type}
                </span>
              </div>
            )}
            {card.songEffect2 && (
              <div className="p-1.5 rounded flex items-center gap-2"
                style={{ background: 'rgba(176, 124, 255, 0.08)', border: '1px solid rgba(176, 124, 255, 0.15)' }}
              >
                <span className="font-bold text-classical shrink-0">4:</span>
                <span className="text-classical/80 truncate">
                  {TRACK_EFFECT_DESCRIPTIONS[card.songEffect2.type] || card.songEffect2.type}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tooltip for songs */}
      {showTooltip && card.type === 'song' && (card.songEffect || card.songEffect2) && (
        <div className="absolute z-50 p-3 rounded-lg shadow-2xl left-1/2 transform -translate-x-1/2 -top-2 -translate-y-full w-52 animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, #2a2118, #1a1410)',
            border: '1px solid rgba(212, 168, 83, 0.3)',
          }}
        >
          <div className="font-bold mb-2 text-center text-gold-400 text-sm truncate">{card.songName}</div>
          <div className="text-xs space-y-1.5 text-parchment-300">
            {card.songEffect && (
              <div className="flex items-start gap-2">
                <span className="text-classical font-bold shrink-0">Slot 3:</span>
                <span className="text-[11px]">
                  {TRACK_EFFECT_DESCRIPTIONS[card.songEffect.type] || card.songEffect.type}
                </span>
              </div>
            )}
            {card.songEffect2 && (
              <div className="flex items-start gap-2">
                <span className="text-classical font-bold shrink-0">Slot 4:</span>
                <span className="text-[11px]">
                  {TRACK_EFFECT_DESCRIPTIONS[card.songEffect2.type] || card.songEffect2.type}
                </span>
              </div>
            )}
            <div className="text-[10px] text-parchment-400 pt-2" style={{ borderTop: '1px solid rgba(212, 168, 83, 0.15)' }}>
              Slots 1-2 can be filled with dice
            </div>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent" style={{ borderTopColor: 'rgba(212, 168, 83, 0.3)' }}></div>
          </div>
        </div>
      )}

      {/* Purchase button */}
      <button
        onClick={onPurchase}
        disabled={!canAfford || disabled}
        className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {canAfford ? 'Purchase' : 'Not Available'}
      </button>
    </div>
  )
}
