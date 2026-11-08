import { DiceType } from '@/types'

/** Figma-authored white-faced, black-outlined die illustrations. */
const DICE_ICONS: Record<DiceType, string> = {
  d4: '/assets/2d4da.svg',
  d8: '/assets/3c7b4.svg',
  d12: '/assets/be4dd.svg',
  d20: '/assets/9a175.svg',
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
