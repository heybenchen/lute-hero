import { Dice } from '@/types'
import { DiceShape } from './DiceShape'
import { useRollAnimation } from './useRollAnimation'
import { getMaxValue } from '@/game-logic/dice/roller'
import { GENRE_THEME } from '@/data/genreTheme'

interface DiceDisplayProps {
  dice: Dice
  value?: number
  isCrit?: boolean
  cascadeRolls?: number[]
  className?: string
  compact?: boolean
  /** Play a tumbling roll animation before settling on the value (battle page) */
  animateRoll?: boolean
}

export function DiceDisplay({
  dice,
  value,
  isCrit = false,
  cascadeRolls = [],
  className = '',
  compact = false,
  animateRoll = false,
}: DiceDisplayProps) {
  const maxValue = getMaxValue(dice.type)
  const { displayValue, rolling } = useRollAnimation(value, maxValue, animateRoll, dice.id)
  const genreColor = GENRE_THEME[dice.genre].color
  const isCritical = isCrit && !rolling
  const result = displayValue === undefined
    ? dice.genre
    : isCritical && cascadeRolls.length > 0
      ? [displayValue, ...cascadeRolls].join(' + ')
      : String(displayValue)

  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded-lg bg-[#2a2118] px-3 pb-3 pt-4 ${
        compact ? 'h-[76px] w-16 gap-2' : 'h-[90px] w-20 gap-3'
      } ${className}`}
      style={{ border: `1px solid ${genreColor}` }}
    >
      <div className={`flex shrink-0 items-center justify-center ${compact ? 'h-6 w-6' : 'h-[30px] w-[30px]'}`}>
        <DiceShape
          type={dice.type}
          size={compact ? 40 : 50}
          className={rolling ? 'animate-dice-roll' : ''}
        />
      </div>
      <div
        className="w-full break-words text-center font-['Spectral:Bold'] text-xs font-bold leading-[1.25] tabular-nums"
        style={{ color: isCritical ? '#f0d78c' : genreColor }}
      >
        {result}
      </div>
    </div>
  )
}
