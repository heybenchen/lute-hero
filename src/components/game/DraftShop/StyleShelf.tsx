import { useState } from 'react'
import { useGameStore } from '@/store'
import { Player, StyleId } from '@/types'
import { STYLES, styleCost, styleRule, maxStyles } from '@/data/styles'
import { Music } from 'lucide-react'

export function StyleShelf({ player, canInteract }: { player: Player; canInteract: boolean }) {
  const dispatch = useGameStore((state) => state.dispatch)
  const offers = useGameStore((state) => state.styleOffers)
  const [selected, setSelected] = useState<StyleId | null>(null)
  const cap = maxStyles()
  const full = player.styles.length >= cap
  const ready = canInteract && selected !== null && offers.includes(selected) && player.exp >= styleCost(selected)

  async function place(replaceStyleId?: StyleId) {
    if (!selected || !ready) return
    setSelected(null)
    await dispatch({ type: 'BUY_STYLE', offerIndex: offers.indexOf(selected), expectedStyleId: selected, replaceStyleId })
  }

  return (
    <section>
      <h3 className="module-label">On the shelf</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {offers.map((id) => (
          <button key={id} type="button" aria-pressed={selected === id}
            disabled={!canInteract || player.exp < styleCost(id)}
            onClick={() => setSelected(selected === id ? null : id)}
            className="style-offer text-left disabled:opacity-60 aria-pressed:ring-2 aria-pressed:ring-gold-400">
            <span className="flex justify-between gap-2"><strong className="font-display text-xl text-gold-300">{STYLES[id].name}</strong><span>{styleCost(id)} EXP</span></span>
            <span className="block text-xs italic text-parchment-400">{STYLES[id].flavor}</span>
            <span className="mt-2 block text-sm">{styleRule(id)}</span>
          </button>
        ))}
      </div>
      {!offers.length && <p>Genres refill after the turn or when you refresh.</p>}
      <h3 className="module-label mt-5">Your styles · {player.styles.length}/{cap}</h3>
      <p className="mb-2 text-sm text-parchment-300">{ready
        ? full ? 'Choose the genre to replace.' : 'Choose the empty slot to learn this genre.'
        : 'Select a genre on the shelf.'}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {player.styles.map((id) => (
          <button key={id} type="button" disabled={!full || !ready} onClick={() => place(id)} className="style-offer text-left enabled:ring-1 enabled:ring-gold-400">
            <strong className="font-display text-lg text-gold-300">{STYLES[id].name}</strong>
            <span className="block text-sm">{styleRule(id)}</span>
          </button>
        ))}
        {!full && <button type="button" disabled={!ready} onClick={() => place()} className="rounded-lg border border-dashed border-gold-700 p-4 enabled:ring-1 enabled:ring-gold-400">
          Empty genre slot
        </button>}
      </div>
    </section>
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
