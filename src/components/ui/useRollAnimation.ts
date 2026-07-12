import { useState, useEffect } from 'react'

/**
 * Cycle through random face values for a beat, then settle on the real roll.
 * Returns the number to show and whether the die is still tumbling.
 */
export function useRollAnimation(value: number | undefined, maxValue: number, enabled: boolean) {
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
