import { useState } from 'react'
import { useGameStore } from '@/store'
import { Player, StyleId } from '@/types'
import { STYLES, styleCost, styleRule, maxStyles } from '@/data/styles'
import { Music } from 'lucide-react'

interface StyleShelfProps {
  player: Player
  canInteract: boolean
  view: 'offers' | 'owned'
  selected: StyleId | null
  onSelectedChange: (styleId: StyleId | null) => void
}

export function StyleShelf({
  player,
  canInteract,
  view,
  selected,
  onSelectedChange,
}: StyleShelfProps) {
  const dispatch = useGameStore((state) => state.dispatch)
  const offers = useGameStore((state) => state.styleOffers)
  const cap = maxStyles()
  const full = player.styles.length >= cap
  const ready = canInteract && selected !== null && offers.includes(selected) && player.exp >= styleCost(selected)
  // New Age: replacing it while its 7th song holds a die means choosing a song to give up
  const [givingUp, setGivingUp] = useState(false)
  const codaInUse = player.songs.some((sg) => sg.id === `${player.id}-coda` && sg.slots[0]?.dice)
  const songsWithDice = player.songs.filter((sg) => sg.slots[0]?.dice)

  async function place(replaceStyleId?: StyleId, giveUpSongId?: string) {
    if (!selected || !ready) return
    if (replaceStyleId === 'coda' && codaInUse && !giveUpSongId) {
      setGivingUp(true)
      return
    }
    onSelectedChange(null)
    setGivingUp(false)
    await dispatch({
      type: 'BUY_STYLE',
      offerIndex: offers.indexOf(selected),
      expectedStyleId: selected,
      replaceStyleId,
      ...(giveUpSongId ? { giveUpSongId } : {}),
    })
  }

  if (view === 'offers') {
    return (
      <div className="mt-4 border-t border-gold-700/20 pt-4">
        <h3 className="mb-3 font-display text-lg text-gold-300">Genres</h3>
        <div className="grid auto-rows-fr grid-cols-1 gap-3">
          {offers.map((id) => (
            <button key={id} type="button" aria-pressed={selected === id}
              disabled={!canInteract || player.exp < styleCost(id)}
              onClick={() => onSelectedChange(selected === id ? null : id)}
              className="style-offer flex min-h-28 flex-col text-left disabled:opacity-60 aria-pressed:ring-2 aria-pressed:ring-gold-400">
              <span className="flex justify-between gap-2"><strong className="font-display text-xl text-gold-300">{STYLES[id].name}</strong><span>{styleCost(id)} EXP</span></span>
              <span className="mt-2 block text-sm">{styleRule(id)}</span>
            </button>
          ))}
        </div>
        {!offers.length && <p className="text-sm text-parchment-400">Genres refill after the turn or when you refresh.</p>}
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-gold-700/20 pt-4">
        <h3 className="mb-3 font-display text-lg text-gold-300">Your Genres</h3>
        <div className="grid auto-rows-fr grid-cols-1 gap-3">
          {player.styles.map((id) => (
            <button key={id} type="button" disabled={!full || !ready} onClick={() => place(id)} className="style-offer flex h-32 flex-col text-left enabled:ring-1 enabled:ring-gold-400">
              <strong className="font-display text-xl text-gold-300">{STYLES[id].name}</strong>
              <span className="mt-2 block text-sm">{styleRule(id)}</span>
            </button>
          ))}
          {Array.from({ length: cap - player.styles.length }, (_, index) => (
            <button
              key={`empty-style-${index}`}
              type="button"
              disabled={!ready}
              onClick={() => place()}
              className="style-offer flex h-32 items-center justify-center border-dashed text-center text-parchment-500 enabled:ring-1 enabled:ring-gold-400"
            >
              Empty genre slot
            </button>
          ))}
        </div>
      {givingUp && ready && (
        <div className="mt-4 rounded-lg border border-gold-700/40 p-3" role="group" aria-label="Choose a song to give up">
          <p className="mb-2 text-sm text-parchment-200">
            Giving up <strong>{STYLES.coda.name}</strong> leaves you 6 songs. Choose the song to give up (its die is lost).
          </p>
          <div className="flex flex-wrap gap-2">
            {songsWithDice.map((sg) => {
              const die = sg.slots[0]!.dice!
              return (
                <button key={sg.id} type="button" onClick={() => place('coda', sg.id)}
                  className="rounded-md border border-gold-700/50 px-3 py-1.5 text-sm hover:bg-white/5">
                  Song {player.songs.indexOf(sg) + 1}: {die.genre} {die.type}
                </button>
              )
            })}
            <button type="button" onClick={() => setGivingUp(false)} className="px-3 py-1.5 text-sm text-parchment-400">Cancel</button>
          </div>
        </div>
      )}
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
