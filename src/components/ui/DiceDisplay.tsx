import { Dice, DiceType } from '@/types'
import { GenreBadge } from './GenreBadge'
import { getMaxValue } from '@/game-logic/dice/roller'

interface DiceDisplayProps {
  dice: Dice
  value?: number
  isCrit?: boolean
  cascadeRolls?: number[]
  className?: string
  compact?: boolean
}

const diceIcons: Record<DiceType, string> = {
  d4: '\u25B3',
  d6: '\u2684',
  d8: '\u2B21',
  d12: '\u2B22',
}

export function DiceDisplay({
  dice,
  value,
  isCrit = false,
  cascadeRolls = [],
  className = '',
  compact = false,
}: DiceDisplayProps) {
  const maxValue = getMaxValue(dice.type)

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {/* Original die */}
        <div
          className="die p-1.5"
          style={{
            boxShadow: isCrit
              ? '0 0 10px rgba(230, 195, 90, 0.5), 0 0 4px rgba(230, 195, 90, 0.3)'
              : undefined,
            borderColor: isCrit ? 'rgba(230, 195, 90, 0.7)' : undefined,
            minWidth: '52px',
            minHeight: '52px',
          }}
        >
          <div className="flex flex-col items-center">
            <div className="text-lg text-gold-400">{diceIcons[dice.type]}</div>
            {value !== undefined && (
              <div className={`text-base font-bold ${isCrit ? 'text-gold-300' : 'text-parchment-200'}`}>
                {value}
              </div>
            )}
            <GenreBadge genre={dice.genre} className="text-[10px] px-1 py-0" />
          </div>
        </div>

        {/* Cascade dice */}
        {cascadeRolls.map((cascadeValue, idx) => {
          const cascadeCrit = cascadeValue === maxValue
          return (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="text-gold-400 font-bold text-xs">+</span>
              <div
                className="die p-1"
                style={{
                  boxShadow: cascadeCrit
                    ? '0 0 10px rgba(230, 195, 90, 0.5), 0 0 4px rgba(230, 195, 90, 0.3)'
                    : '0 0 6px rgba(230, 195, 90, 0.15)',
                  borderColor: cascadeCrit
                    ? 'rgba(230, 195, 90, 0.7)'
                    : 'rgba(230, 195, 90, 0.3)',
                  minWidth: '44px',
                  minHeight: '44px',
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="text-sm text-gold-400">{diceIcons[dice.type]}</div>
                  <div className={`text-sm font-bold ${cascadeCrit ? 'text-gold-300' : 'text-gold-400'}`}>
                    {cascadeValue}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Original die */}
      <div
        className="die"
        style={{
          boxShadow: isCrit
            ? '0 0 12px rgba(230, 195, 90, 0.5), 0 0 4px rgba(230, 195, 90, 0.3)'
            : undefined,
          borderColor: isCrit ? 'rgba(230, 195, 90, 0.7)' : undefined,
        }}
      >
        <div className="flex flex-col items-center">
          <div className="text-2xl text-gold-400">{diceIcons[dice.type]}</div>
          {value !== undefined && (
            <div className={`text-xl font-bold ${isCrit ? 'text-gold-300' : 'text-parchment-200'}`}>
              {value}
            </div>
          )}
          <div className="text-xs mt-0.5">
            <GenreBadge genre={dice.genre} className="text-[10px] px-1 py-0" />
          </div>
        </div>
      </div>

      {/* Cascade dice */}
      {cascadeRolls.map((cascadeValue, idx) => {
        const cascadeCrit = cascadeValue === maxValue
        return (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-gold-400 font-bold text-sm">+</span>
            <div
              className="die"
              style={{
                boxShadow: cascadeCrit
                  ? '0 0 12px rgba(230, 195, 90, 0.5), 0 0 4px rgba(230, 195, 90, 0.3)'
                  : '0 0 8px rgba(230, 195, 90, 0.15)',
                borderColor: cascadeCrit
                  ? 'rgba(230, 195, 90, 0.7)'
                  : 'rgba(230, 195, 90, 0.3)',
              }}
            >
              <div className="flex flex-col items-center">
                <div className="text-2xl text-gold-400">{diceIcons[dice.type]}</div>
                <div className={`text-xl font-bold ${cascadeCrit ? 'text-gold-300' : 'text-gold-400'}`}>
                  {cascadeValue}
                </div>
                <div className="text-xs mt-0.5">
                  <GenreBadge genre={dice.genre} className="text-[10px] px-1 py-0" />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
