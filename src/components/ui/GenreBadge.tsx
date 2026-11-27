import { GenreId } from '@/types'
import { GENRES, genreRule } from '@/data/genres'
import { Music } from 'lucide-react'
import { useId } from 'react'

/**
 * A compact chip naming one of a bard's genres; hover shows its rule.
 * `spent` greys out a once-per-turn genre that has fired this turn.
 */
export function GenreChip({
  id,
  spent = false,
  className = '',
  showTooltip = false,
}: {
  id: GenreId
  spent?: boolean
  className?: string
  showTooltip?: boolean
}) {
  const genre = GENRES[id]
  const tooltipId = useId()
  const rule = genreRule(id)

  return (
    <span
      className={`genre-chip ${showTooltip ? 'genre-chip-with-tooltip' : ''} ${spent ? 'genre-chip-spent' : ''} ${className}`}
      title={showTooltip ? undefined : `${genre.name}: ${rule}${spent ? ' — used this turn' : ''}`}
      tabIndex={showTooltip ? 0 : undefined}
      aria-describedby={showTooltip ? tooltipId : undefined}
    >
      <Music size={11} aria-hidden="true" />
      {genre.name}
      {showTooltip && (
        <span id={tooltipId} role="tooltip" className="genre-rule-tooltip">
          <strong>{genre.name}</strong>
          <span>{rule}</span>
          {spent && <em>Used this turn</em>}
        </span>
      )}
    </span>
  )
}
