import { DiceType } from '@/types'
import d4Icon from '@/assets/dice/d4.svg'
import d8Icon from '@/assets/dice/d8.svg'
import d12Icon from '@/assets/dice/d12.svg'
import d20Icon from '@/assets/dice/d20.svg'

/** Existing white-faced, black-outlined die illustrations. */
const DICE_ICONS: Record<DiceType, string> = {
  d4: d4Icon,
  d8: d8Icon,
  d12: d12Icon,
  d20: d20Icon,
}

interface DiceShapeProps {
  type: DiceType
  className?: string
  /** Explicit icon height in pixels; otherwise the icon follows current font size. */
  size?: number
}

/**
 * Renders each die as its illustrated icon. By default it scales to the current
 * font size so it can drop into text like a glyph.
 */
export function DiceShape({ type, className = '', size }: DiceShapeProps) {
  return (
    <img
      src={DICE_ICONS[type]}
      alt={type}
      draggable={false}
      className={`inline-block align-middle ${className}`}
      style={{ height: size ?? '1em', width: 'auto', maxWidth: 'none' }}
    />
  )
}
