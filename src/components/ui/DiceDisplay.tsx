import { Dice, DiceType } from '@/types'
import { GenreBadge } from './GenreBadge'

interface DiceDisplayProps {
  dice: Dice
  value?: number
  isCrit?: boolean
  className?: string
}

const diceIcons: Record<DiceType, string> = {
  d4: '△',
  d6: '⚄',
  d12: '⬢',
  d20: '⬟',
}

export function DiceDisplay({
  dice,
  value,
  isCrit = false,
  className = '',
}: DiceDisplayProps) {
  return (
    <div className={`die ${isCrit ? 'ring-4 ring-yellow-400' : ''} ${className}`}>
      <div className="flex flex-col items-center">
        <div className="text-3xl">{diceIcons[dice.type]}</div>
        {value !== undefined && (
          <div className={`text-2xl font-bold ${isCrit ? 'text-yellow-600' : ''}`}>
            {value}
          </div>
        )}
        <div className="text-xs mt-1">
          <GenreBadge genre={dice.genre} />
        </div>
      </div>
    </div>
  )
}
