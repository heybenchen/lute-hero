import { DraftCard } from '@/types'
import { TRACK_EFFECT_NAMES, describeTrackEffect } from '@/data/trackEffects'

interface DraftCardDisplayProps {
  card: DraftCard
  selected: boolean
  onSelect: () => void
  canAfford: boolean
  disabled?: boolean
  readOnly?: boolean
}

export function DraftCardDisplay({
  card,
  selected,
  onSelect,
  canAfford,
  disabled = false,
  readOnly = false,
}: DraftCardDisplayProps) {
  const selectable = canAfford && !disabled && !readOnly

  return (
    <div
      role="button"
      tabIndex={selectable ? 0 : -1}
      onClick={() => selectable && onSelect()}
      onKeyDown={(e) => {
        if (selectable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onSelect()
        }
      }}
      title={readOnly ? 'Watching the active player' : canAfford ? 'Select, then Buy above' : 'Not enough EXP'}
      className={`card relative w-full max-w-[280px] mx-auto transition-all duration-200 ${
        readOnly
          ? 'cursor-default'
          : !selectable
          ? 'opacity-40 cursor-not-allowed'
          : `cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 ${selected ? 'shadow-card-hover -translate-y-0.5' : ''}`
      }`}
      style={selected ? { border: '1px solid rgba(212, 168, 83, 0.55)' } : undefined}
    >
      {/* Title (left) + EXP cost (right) on one row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-base font-bold text-parchment-200 truncate">
          {card.songName}
        </div>
        <div className="text-xs font-bold text-gold-400 shrink-0">
          {card.cost} EXP
        </div>
      </div>

      {/* Effect */}
      {card.songEffect && (
        <div className="p-2 rounded flex flex-col gap-0.5 text-xs"
          style={{ background: 'rgba(176, 124, 255, 0.08)', border: '1px solid rgba(176, 124, 255, 0.15)' }}
        >
          <span className="font-bold text-classical text-xs">
            {TRACK_EFFECT_NAMES[card.songEffect.type] || card.songEffect.type}
          </span>
          <span className="text-parchment-400 text-[11px]">
            {describeTrackEffect(card.songEffect)}
          </span>
        </div>
      )}
    </div>
  )
}
