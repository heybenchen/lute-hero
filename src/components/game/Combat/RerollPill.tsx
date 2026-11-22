import { RotateCcw, Sparkles } from 'lucide-react'
import type { RerollOption } from './reroll'

/**
 * The reroll button that sits on a song card's dice (hanging off their lower
 * edge so the rolled numbers stay readable). Used by fights and the Showdown.
 */
export function RerollPill({ reroll }: { reroll: RerollOption }) {
  const free = reroll.kind === 'free'
  return (
    <button
      type="button"
      onClick={reroll.onClick}
      disabled={reroll.disabled}
      aria-label={`Reroll: ${reroll.title}`}
      title={reroll.title}
      className={`absolute left-1/2 top-full z-10 flex h-8 -translate-x-1/2 -translate-y-[28%] items-center gap-1 whitespace-nowrap rounded-full px-3 font-medieval text-[11px] font-bold shadow-md shadow-black/50 transition-all duration-150 hover:enabled:-translate-y-[34%] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400 disabled:cursor-not-allowed disabled:opacity-45 ${
        free
          ? 'border border-gold-400/60 bg-wood-900 text-gold-200 hover:enabled:bg-wood-800'
          : 'border border-violet-300/50 bg-wood-900 text-violet-100 hover:enabled:bg-wood-800'
      }`}
    >
      <RotateCcw size={13} aria-hidden="true" />
      {free ? (
        <span>Free</span>
      ) : (
        <span className="flex items-center gap-0.5">
          <Sparkles size={11} aria-hidden="true" />1
        </span>
      )}
    </button>
  )
}
