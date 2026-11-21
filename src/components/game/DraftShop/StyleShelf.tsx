import { useState } from 'react'
import { useGameStore } from '@/store'
import { Player, StyleId } from '@/types'
import { STYLES, styleCost, styleRule, maxStyles } from '@/data/styles'
import { inspirationSpend } from '@/data/draftCards'
import { Music, RefreshCw } from 'lucide-react'

/**
 * The Studio's style shelf: two styles on offer (redrawn every turn, or for
 * Inspiration), and the bard's own styles. At the cap, buying asks which
 * owned style to give up.
 */
export function StyleShelf({ player, canInteract }: { player: Player; canInteract: boolean }) {
  const dispatch = useGameStore((state) => state.dispatch)
  const offers = useGameStore((state) => state.styleOffers)
  // Offer the player is choosing a replacement for (at the style cap)
  const [replacingFor, setReplacingFor] = useState<number | null>(null)

  const cap = maxStyles()
  const full = player.styles.length >= cap

  const buy = (offerIndex: number, replaceStyleId?: StyleId) => {
    setReplacingFor(null)
    void dispatch({ type: 'BUY_STYLE', offerIndex, replaceStyleId })
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider">Styles</div>
          <div className="text-sm text-parchment-500">
            {player.styles.length}/{cap} learned &middot; yours are listed under Your Songs
          </div>
        </div>
        <button
          onClick={() => { setReplacingFor(null); void dispatch({ type: 'REFRESH_STYLE_OFFERS' }) }}
          disabled={!canInteract || player.inspiration < inspirationSpend()}
          className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          title={player.inspiration >= inspirationSpend() ? 'Swap these styles for two new ones' : 'Requires Inspiration'}
        >
          <RefreshCw size={13} aria-hidden="true" /> New Styles (&#x2728; {inspirationSpend()})
        </button>
      </div>

      {offers.length === 0 ? (
        <div className="rounded-lg p-4 text-sm text-parchment-500 italic text-center"
          style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(212, 168, 83, 0.15)' }}
        >
          No styles on the shelf — new ones arrive next turn, or draw them now with Inspiration
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {offers.map((id, offerIndex) => {
            const style = STYLES[id]
            const cost = styleCost(id)
            const affordable = player.exp >= cost
            const choosing = replacingFor === offerIndex
            return (
              <div key={`${id}-${offerIndex}`} className="style-offer animate-scale-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Music size={15} className="text-gold-400 flex-shrink-0" aria-hidden="true" />
                      <span className="font-display text-xl text-gold-300 leading-none">{style.name}</span>
                    </div>
                    <div className="text-[11px] italic text-parchment-500 mt-1">{style.flavor}</div>
                  </div>
                  <span className="text-sm font-bold text-gold-300 whitespace-nowrap">{cost} EXP</span>
                </div>
                <p className="text-sm text-parchment-200 mt-2 leading-snug">{styleRule(id)}</p>

                {choosing ? (
                  <div className="mt-3 space-y-1.5 animate-fade-in">
                    <div className="text-xs text-parchment-400">You can hold {cap}. Replace which style?</div>
                    <div className="flex flex-wrap gap-1.5">
                      {player.styles.map((owned) => (
                        <button
                          key={owned}
                          onClick={() => buy(offerIndex, owned)}
                          className="btn-secondary text-xs py-1 px-2.5"
                          title={styleRule(owned)}
                        >
                          Drop {STYLES[owned].name}
                        </button>
                      ))}
                      <button onClick={() => setReplacingFor(null)} className="text-xs text-parchment-500 hover:text-parchment-300 px-2">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => (full ? setReplacingFor(offerIndex) : buy(offerIndex))}
                    disabled={!canInteract || !affordable}
                    className="btn-primary w-full mt-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    title={affordable ? undefined : `Needs ${cost} EXP`}
                  >
                    {full ? `Learn ${style.name} (replace one)` : `Learn ${style.name}`}
                  </button>
                )}
              </div>
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
            <p className="text-sm text-parchment-200 mt-2 leading-snug">{styleRule(id)}</p>
          </div>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <div key={`empty-${i}`} className="rounded-lg p-3 sm:p-4 flex items-center justify-center text-sm italic text-parchment-500"
            style={{ border: '1px dashed rgba(212, 168, 83, 0.2)', background: 'rgba(255, 255, 255, 0.02)' }}
          >
            Empty style slot — learn one from the shelf above
          </div>
        ))}
      </div>
    </div>
  )
}
