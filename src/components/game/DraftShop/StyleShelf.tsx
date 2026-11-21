import { useEffect, useState } from 'react'
import { useGameStore } from '@/store'
import { Player, StyleId } from '@/types'
import { STYLES, styleCost, styleRule, maxStyles } from '@/data/styles'
import { Music } from 'lucide-react'

interface StyleOfferCardProps {
  id: StyleId
  cost: number
  affordable: boolean
  choosing: boolean
  full: boolean
  cap: number
  ownedStyles: StyleId[]
  canInteract: boolean
  onBuy: (replaceStyleId?: StyleId) => void
  onChooseReplacement: () => void
  onCancelReplacement: () => void
}

function StyleOfferCard({
  id,
  cost,
  affordable,
  choosing,
  full,
  cap,
  ownedStyles,
  canInteract,
  onBuy,
  onChooseReplacement,
  onCancelReplacement,
}: StyleOfferCardProps) {
  const style = STYLES[id]

  return (
    <div className="style-offer flex h-full flex-col animate-scale-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Music size={15} className="flex-shrink-0 text-gold-400" aria-hidden="true" />
            <span className="font-display text-xl leading-none text-gold-300">{style.name}</span>
          </div>
          <div className="mt-1 text-[11px] italic text-parchment-500">{style.flavor}</div>
        </div>
        <span className="whitespace-nowrap text-sm font-bold text-gold-300">{cost} EXP</span>
      </div>
      <p className="mt-2 text-sm leading-snug text-parchment-200">{styleRule(id)}</p>

      {choosing ? (
        <div className="mt-auto space-y-1.5 pt-3 animate-fade-in">
          <div className="text-xs text-parchment-400">You can hold {cap}. Replace which style?</div>
          <div className="flex flex-wrap gap-1.5">
            {ownedStyles.map((owned) => (
              <button
                key={owned}
                onClick={() => onBuy(owned)}
                className="btn-secondary px-2.5 py-1 text-xs"
                title={styleRule(owned)}
              >
                Drop {STYLES[owned].name}
              </button>
            ))}
            <button onClick={onCancelReplacement} className="px-2 text-xs text-parchment-500 hover:text-parchment-300">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-auto pt-3">
          <button
            onClick={full ? onChooseReplacement : () => onBuy()}
            disabled={!canInteract || !affordable}
            className="btn-primary w-full py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            title={affordable ? undefined : `Needs ${cost} EXP`}
          >
            {full ? `Learn ${style.name} (replace one)` : `Learn ${style.name}`}
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * The Studio's style shelf. At the cap, buying asks which owned style to give
 * up. Refreshing happens through the combined Elements & Styles control.
 */
export function StyleShelf({ player, canInteract }: { player: Player; canInteract: boolean }) {
  const dispatch = useGameStore((state) => state.dispatch)
  const offers = useGameStore((state) => state.styleOffers)
  // Offer the player is choosing a replacement for (at the style cap)
  const [replacingFor, setReplacingFor] = useState<number | null>(null)

  const cap = maxStyles()
  const full = player.styles.length >= cap

  useEffect(() => {
    setReplacingFor(null)
  }, [offers])

  const buy = (offerIndex: number, replaceStyleId?: StyleId) => {
    setReplacingFor(null)
    void dispatch({ type: 'BUY_STYLE', offerIndex, replaceStyleId })
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider">Styles</div>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212, 168, 83, 0.2), transparent)' }} />
      </div>

      {offers.length === 0 ? (
        <div className="rounded-lg p-4 text-sm text-parchment-500 italic text-center"
          style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(212, 168, 83, 0.15)' }}
        >
          No styles on the shelf — empty slots refill after the turn, or refresh now with Inspiration
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {offers.map((id, offerIndex) => {
            const cost = styleCost(id)
            const affordable = player.exp >= cost
            const choosing = replacingFor === offerIndex
            return (
              <StyleOfferCard
                key={`${id}-${offerIndex}`}
                id={id}
                cost={cost}
                affordable={affordable}
                choosing={choosing}
                full={full}
                cap={cap}
                ownedStyles={player.styles}
                canInteract={canInteract}
                onBuy={(replaceStyleId) => buy(offerIndex, replaceStyleId)}
                onChooseReplacement={() => setReplacingFor(offerIndex)}
                onCancelReplacement={() => setReplacingFor(null)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * The bard's own styles with their full effects, shown under Your Songs so
 * it's clear what every song is already getting. Empty slots show how many
 * more can be learned.
 */
export function OwnedStyles({ player }: { player: Player }) {
  const cap = maxStyles()
  const empty = Math.max(0, cap - player.styles.length)
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider">Your Styles</div>
        <div className="text-xs text-parchment-500">({player.styles.length}/{cap}) — these apply to every song</div>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212, 168, 83, 0.2), transparent)' }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {player.styles.map((id) => (
          <div key={id} className="style-offer">
            <div className="flex items-center gap-2">
              <Music size={15} className="text-gold-400 flex-shrink-0" aria-hidden="true" />
              <span className="font-display text-lg text-gold-300 leading-none">{STYLES[id].name}</span>
            </div>
            <div className="text-[11px] italic text-parchment-500 mt-1">{STYLES[id].flavor}</div>
            <p className="text-sm text-parchment-200 mt-2 leading-snug">{styleRule(id)}</p>
          </div>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <div key={`empty-${i}`} className="rounded-lg p-3 sm:p-4 flex items-center justify-center text-sm italic text-parchment-500"
            style={{ border: '1px dashed rgba(212, 168, 83, 0.2)', background: 'rgba(255, 255, 255, 0.02)' }}
          >
            Empty style slot
          </div>
        ))}
      </div>
    </div>
  )
}

/** Compact combat reference: full rules stay readable without repeating shop-sized cards. */
export function CombatStyles({ player, usedStyleIds }: { player: Player; usedStyleIds: StyleId[] }) {
  if (player.styles.length === 0) return null
  return (
    <div className="mt-4 grid border-t border-gold-700/15 sm:grid-cols-2 sm:divide-x sm:divide-gold-700/15">
      {player.styles.map((id) => (
        <div
          key={id}
          className={`py-3 first:sm:pr-4 last:sm:pl-4 ${
            usedStyleIds.includes(id) ? 'opacity-55' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <Music size={14} className="shrink-0 text-gold-400" aria-hidden="true" />
            <span className="font-medieval text-sm font-bold text-gold-300">{STYLES[id].name}</span>
            {usedStyleIds.includes(id) && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-parchment-500">Used</span>
            )}
          </div>
          <p className="mt-1 text-xs leading-snug text-parchment-300">{styleRule(id)}</p>
        </div>
      ))}
    </div>
  )
}
