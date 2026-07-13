import { useState } from 'react'
import { DraftCard } from '@/types'
import { TRACK_EFFECT_NAMES, describeTrackEffect } from '@/data/trackEffects'

interface DraftCardDisplayProps {
  card: DraftCard
  selected: boolean
  onSelect: () => void
  canAfford: boolean
  disabled?: boolean
}

export function DraftCardDisplay({
  card,
  selected,
  onSelect,
  canAfford,
  disabled = false,
}: DraftCardDisplayProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const selectable = canAfford && !disabled

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
      title={canAfford ? 'Select, then Buy above' : 'Not enough EXP'}
      className={`card relative transition-all duration-200 ${
        !selectable
          ? 'opacity-40 cursor-not-allowed'
          : `cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 ${selected ? 'shadow-card-hover -translate-y-0.5' : ''}`
      }`}
      style={selected ? { border: '1px solid rgba(212, 168, 83, 0.55)' } : undefined}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Song preview */}
      <div>
        <div className="text-base font-bold text-center mb-2 text-parchment-200 truncate">
          {card.songName}
        </div>
        <div className="space-y-1 text-xs">
          {card.songEffect && (
            <div className="p-2 rounded flex flex-col gap-0.5"
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
      </div>

      {/* Tooltip for songs */}
      {showTooltip && card.songEffect && (
        <div className="absolute z-50 p-3 rounded-lg shadow-2xl left-1/2 transform -translate-x-1/2 -top-2 -translate-y-full w-52 animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, #2a2118, #1a1410)',
            border: '1px solid rgba(212, 168, 83, 0.3)',
          }}
        >
          <div className="font-bold mb-2 text-center text-gold-400 text-sm truncate">{card.songName}</div>
          <div className="text-xs space-y-1.5 text-parchment-300">
            <div className="flex flex-col gap-0.5">
              <span className="text-classical font-bold">
                {TRACK_EFFECT_NAMES[card.songEffect.type] || card.songEffect.type}
              </span>
              <span className="text-[11px] text-parchment-400">
                {describeTrackEffect(card.songEffect)}
              </span>
            </div>
            <div className="text-[10px] text-parchment-400 pt-2" style={{ borderTop: '1px solid rgba(212, 168, 83, 0.15)' }}>
              Apply this name to one of your songs to grant its effect
            </div>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent" style={{ borderTopColor: 'rgba(212, 168, 83, 0.3)' }}></div>
          </div>
        </div>
      )}

      {/* Cost — the Buy button lives in the section header */}
      <div className="mt-2 text-center text-xs font-bold text-gold-400">
        {card.cost} EXP
      </div>
    </div>
  )
}
