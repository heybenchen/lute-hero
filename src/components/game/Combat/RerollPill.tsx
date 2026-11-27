import { RotateCcw, Sparkles } from 'lucide-react'
import type { RerollOption } from './reroll'

/**
 * The reroll button overlays the lower corner of a song's dice so appearing
 * never changes the song card's height. Used by fights and the Showdown.
 */
export function RerollPill({ reroll }: { reroll: RerollOption }) {
  const free = reroll.kind === 'free'
  return (
    <button
      type="button"
      onClick={reroll.onClick}
      disabled={reroll.disabled}
      aria-label={`Encore: ${reroll.title}`}
      title={reroll.title}
      className={`absolute bottom-1 right-1 z-10 flex h-6 items-center gap-1 whitespace-nowrap rounded-sm px-2 font-medieval text-[10px] font-bold shadow-md shadow-black/60 transition-[filter,transform] duration-150 hover:enabled:-translate-y-0.5 hover:enabled:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400 disabled:cursor-not-allowed disabled:opacity-45 ${
        free
          ? 'border border-gold-400/70 bg-wood-950/95 text-gold-200'
          : 'border border-violet-300/60 bg-wood-950/95 text-violet-100'
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
