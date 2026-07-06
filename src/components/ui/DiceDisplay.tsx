import { useState, useEffect } from 'react'
import { Dice } from '@/types'
import { GenreBadge } from './GenreBadge'
import { DiceShape } from './DiceShape'
import { getMaxValue } from '@/game-logic/dice/roller'

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

/**
 * Cycle through random face values for a beat, then settle on the real roll.
 * Returns the number to show and whether the die is still tumbling.
 */
function useRollAnimation(value: number | undefined, maxValue: number, enabled: boolean) {
  const [displayValue, setDisplayValue] = useState(value)
  const [rolling, setRolling] = useState(false)

  useEffect(() => {
    if (value === undefined) {
      setDisplayValue(undefined)
      return
    }
    if (!enabled) {
      setDisplayValue(value)
      return
    }

    setRolling(true)
    let ticks = 0
    const maxTicks = 9
    const interval = setInterval(() => {
      ticks++
      if (ticks >= maxTicks) {
        clearInterval(interval)
        setDisplayValue(value)
        setRolling(false)
      } else {
        setDisplayValue(Math.floor(Math.random() * maxValue) + 1)
      }
    }, 55)

    return () => clearInterval(interval)
    // Re-run whenever the underlying roll changes
  }, [value, maxValue, enabled])

  return { displayValue, rolling }
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
  const { displayValue, rolling } = useRollAnimation(value, maxValue, animateRoll)

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {/* Original die */}
        <div
          className={`die p-1.5 ${rolling ? 'animate-dice-roll' : ''}`}
          style={{
            boxShadow: isCrit && !rolling
              ? '0 0 10px rgba(230, 195, 90, 0.5), 0 0 4px rgba(230, 195, 90, 0.3)'
              : undefined,
            borderColor: isCrit && !rolling ? 'rgba(230, 195, 90, 0.7)' : undefined,
            minWidth: '52px',
            minHeight: '52px',
          }}
        >
          <div className="flex flex-col items-center">
            <div className="text-lg text-gold-400"><DiceShape type={dice.type} /></div>
            {displayValue !== undefined && (
              <div className={`text-base font-bold tabular-nums ${rolling ? 'text-gold-400/80' : isCrit ? 'text-gold-300' : 'text-parchment-200'}`}>
                {displayValue}
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
                  <div className="text-sm text-gold-400"><DiceShape type={dice.type} /></div>
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
        className={`die ${rolling ? 'animate-dice-roll' : ''}`}
        style={{
          boxShadow: isCrit && !rolling
            ? '0 0 12px rgba(230, 195, 90, 0.5), 0 0 4px rgba(230, 195, 90, 0.3)'
            : undefined,
          borderColor: isCrit && !rolling ? 'rgba(230, 195, 90, 0.7)' : undefined,
        }}
      >
        <div className="flex flex-col items-center">
          <div className="text-2xl text-gold-400"><DiceShape type={dice.type} /></div>
          {displayValue !== undefined && (
            <div className={`text-xl font-bold tabular-nums ${rolling ? 'text-gold-400/80' : isCrit ? 'text-gold-300' : 'text-parchment-200'}`}>
              {displayValue}
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
                <div className="text-2xl text-gold-400"><DiceShape type={dice.type} /></div>
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
