import { useState, useEffect, useRef } from 'react'
import { useDieInFlight } from '@/components/dice3d/diceBus'

/**
 * Cycle through random face values for a beat, then settle on the real roll.
 * Returns the number to show and whether the die is still tumbling.
 *
 * When `dieId` is given and that die is being thrown in the 3D dice tray, the
 * card keeps tumbling until the 3D die lands, then settles straight on the
 * value so the result is never revealed before the throw finishes.
 */
export function useRollAnimation(value: number | undefined, maxValue: number, enabled: boolean, dieId?: string) {
  const [displayValue, setDisplayValue] = useState(value)
  const [rolling, setRolling] = useState(false)
  const inFlight = useDieInFlight(dieId)
  const wasInFlight = useRef(false)

  useEffect(() => {
    const landed = wasInFlight.current && !inFlight
    wasInFlight.current = inFlight

    if (value === undefined) {
      setDisplayValue(undefined)
      setRolling(false)
      return
    }
    if (!enabled || landed) {
      setDisplayValue(value)
      setRolling(false)
      return
    }

    setRolling(true)
    let ticks = 0
    const maxTicks = 9
    const interval = setInterval(() => {
      ticks++
      if (ticks >= maxTicks && !inFlight) {
        clearInterval(interval)
        setDisplayValue(value)
        setRolling(false)
      } else {
        setDisplayValue(Math.floor(Math.random() * maxValue) + 1)
      }
    }, inFlight ? 90 : 55)

    return () => clearInterval(interval)
    // Re-run whenever the underlying roll changes or its 3D throw lands
  }, [value, maxValue, enabled, inFlight])

  return { displayValue, rolling }
}
