import { StyleId } from '@/types'
import { STYLES, styleRule } from '@/data/styles'
import { Music } from 'lucide-react'
import { useId } from 'react'

/**
 * A compact chip naming one of a bard's styles; hover shows its rule.
 * `spent` greys out a once-per-turn style that has fired this turn.
 */
export function StyleChip({
  id,
  spent = false,
  className = '',
  showTooltip = false,
}: {
  id: StyleId
  spent?: boolean
  className?: string
  showTooltip?: boolean
}) {
  const style = STYLES[id]
  const tooltipId = useId()
  const rule = styleRule(id)

  return (
    <span
      className={`style-chip ${showTooltip ? 'style-chip-with-tooltip' : ''} ${spent ? 'style-chip-spent' : ''} ${className}`}
      title={showTooltip ? undefined : `${style.name}: ${rule}${spent ? ' — used this turn' : ''}`}
      tabIndex={showTooltip ? 0 : undefined}
      aria-describedby={showTooltip ? tooltipId : undefined}
    >
      <Music size={11} aria-hidden="true" />
      {style.name}
      {showTooltip && (
        <span id={tooltipId} role="tooltip" className="style-rule-tooltip">
          <strong>{style.name}</strong>
          <span>{rule}</span>
          {spent && <em>Used this turn</em>}
        </span>
      )}
    </span>
  )
}
