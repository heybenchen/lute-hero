import { DiceType } from '@/types'
import d4Icon from '@/assets/dice/d4.svg'
import d6Icon from '@/assets/dice/d6.svg'
import d12Icon from '@/assets/dice/d12.svg'
import d20Icon from '@/assets/dice/d20.svg'

/** Illustrated icon per die type (white-faced, black-outlined SVGs). */
const DICE_ICONS: Record<DiceType, string> = {
  d4: d4Icon,
  d6: d6Icon,
  d12: d12Icon,
  d20: d20Icon,
}

interface DiceShapeProps {
  type: DiceType
  className?: string
}

/**
 * Renders each die as its illustrated icon, scaled to the current font-size so
 * it drops into text like a glyph. Width follows each icon's aspect ratio.
 */
export function DiceShape({ type, className = '' }: DiceShapeProps) {
  return (
    <img
      src={DICE_ICONS[type]}
      alt={type}
      draggable={false}
      className={`inline-block align-middle ${className}`}
      style={{ height: '1em', width: 'auto' }}
    />
  )
}
