import { Dice, DiceType } from '@/types'
import { GenreBadge } from './GenreBadge'

interface DiceDisplayProps {
  dice: Dice
  value?: number
  isCrit?: boolean
  className?: string
  compact?: boolean
}

const diceIcons: Record<DiceType, string> = {
  d4: '\u25B3',
  d6: '\u2684',
  d12: '\u2B22',
  d20: '\u2B1F',
}

export function DiceDisplay({
  dice,
  value,
  isCrit = false,
  className = '',
  compact = false,
}: DiceDisplayProps) {
  if (compact) {
    return (
      <div
        className={`die p-1 ${className}`}
        style={{
          boxShadow: isCrit
            ? '0 0 8px rgba(230, 195, 90, 0.5), 0 0 3px rgba(230, 195, 90, 0.3)'
            : undefined,
          borderColor: isCrit ? 'rgba(230, 195, 90, 0.7)' : undefined,
          minWidth: '40px',
          minHeight: '40px',
        }}
      >
        <div className="flex flex-col items-center">
          <div className="text-base text-gold-400">{diceIcons[dice.type]}</div>
          {value !== undefined && (
            <div className={`text-sm font-bold ${isCrit ? 'text-gold-300' : 'text-parchment-200'}`}>
              {value}
            </div>
          )}
          <GenreBadge genre={dice.genre} className="text-[6px] px-0.5 py-0" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`die ${className}`}
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
          <GenreBadge genre={dice.genre} className="text-[8px] px-1 py-0" />
        </div>
      </div>
    </div>
  )
}
