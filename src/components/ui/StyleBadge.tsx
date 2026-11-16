import { StyleId } from '@/types'
import { STYLES, styleRule } from '@/data/styles'
import { Music } from 'lucide-react'

/**
 * A compact chip naming one of a bard's styles; hover shows its rule.
 * `spent` greys out a once-per-turn style that has fired this turn.
 */
export function StyleChip({ id, spent = false, className = '' }: { id: StyleId; spent?: boolean; className?: string }) {
  const style = STYLES[id]
  return (
    <span
      className={`style-chip ${spent ? 'style-chip-spent' : ''} ${className}`}
      title={`${style.name} (${style.meaning}): ${styleRule(id)}${spent ? ' — used this turn' : ''}`}
    >
      <Music size={11} aria-hidden="true" />
      {style.name}
    </span>
  )
}
