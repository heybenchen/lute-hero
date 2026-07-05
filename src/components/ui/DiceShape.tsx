import { DiceType } from '@/types'

/**
 * Visual side-count used for each die's icon. Not the die's actual face
 * count (a d20 icosahedron isn't a hexagon) — this is a simplified 2D
 * glyph, matched to explicit design direction (d12 -> octagon, d20 -> hexagon).
 */
const ICON_SIDES: Record<DiceType, number> = {
  d4: 3,
  d6: 4,
  d12: 8,
  d20: 6,
}

function polygonClipPath(sides: number): string {
  const points: string[] = []
  const startAngle = -Math.PI / 2 // first point at the top
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + (i * 2 * Math.PI) / sides
    const x = 50 + 50 * Math.cos(angle)
    const y = 50 + 50 * Math.sin(angle)
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`)
  }
  return `polygon(${points.join(', ')})`
}

const CLIP_PATHS: Record<DiceType, string> = {
  d4: polygonClipPath(ICON_SIDES.d4),
  d6: polygonClipPath(ICON_SIDES.d6),
  d12: polygonClipPath(ICON_SIDES.d12),
  d20: polygonClipPath(ICON_SIDES.d20),
}

interface DiceShapeProps {
  type: DiceType
  className?: string
}

/**
 * Renders each die as a flat-colored polygon (CSS clip-path) sized to the
 * current font-size, so it drops into text the same way an icon glyph would.
 * Used instead of Unicode geometric-shape characters for d12/d20 so the
 * exact side count (octagon / hexagon) is guaranteed rather than relying on
 * font glyph coverage.
 */
export function DiceShape({ type, className = '' }: DiceShapeProps) {
  return (
    <span
      className={`inline-block align-middle ${className}`}
      style={{
        width: '0.85em',
        height: '0.85em',
        background: 'currentColor',
        clipPath: CLIP_PATHS[type],
      }}
    />
  )
}
