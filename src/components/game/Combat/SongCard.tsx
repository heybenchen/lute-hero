import { Song, SongSlot, DiceRoll } from '@/types'
import { DiceShape } from '@/components/ui/DiceShape'
import { ELEMENT_THEME } from '@/data/elementTheme'
import { Ban, RotateCcw } from 'lucide-react'
import { RerollPill } from './RerollPill'
import type { RerollOption } from './reroll'

interface SongCardProps {
  song: Song
  resisted?: boolean
  onPlay: () => void
  disabled: boolean
  index?: number
  /** Dice results from this song's most recent performance, shown in-card */
  rolls?: DiceRoll[]
  /** When set, these are the most recently rolled dice: a reroll button sits on them */
  reroll?: RerollOption
  /** Refresh this spent song: Gospel after a called win, or Blues for Inspiration */
  onRefresh?: () => void
  /** Tooltip naming the genre that refreshes it */
  refreshTitle?: string
}

/**
 * A single dice slot: the rolled value (with a crit glow) when a roll is
 * present, otherwise the die's genre label. No in-card tumble — the combat
 * view holds new rolls back until the 3D dice land, then shows the result.
 */
function SlotDie({ slot, roll }: { slot: SongSlot; roll?: DiceRoll }) {
  const elementColor = slot.dice ? ELEMENT_THEME[slot.dice.element].color : ''
  const displayValue = roll?.value
  const isCrit = roll?.isCrit ?? false
  const cascadeSum = roll?.cascadeRolls?.reduce((s, v) => s + v, 0) ?? 0
  const genreBonus = roll?.bonus ?? 0

  return (
    <div
      className="flex h-[64px] min-w-0 flex-1 flex-col items-center justify-center rounded-md text-xs"
      style={{
        background: elementColor ? `${elementColor}1f` : 'rgba(255, 255, 255, 0.02)',
        border: elementColor ? `1px solid ${elementColor}80` : '1px dashed rgba(212, 168, 83, 0.12)',
        boxShadow: isCrit ? `0 0 10px ${elementColor}80` : undefined,
      }}
    >
      {slot.dice ? (
        <div className="text-center">
          <div className="text-xl leading-none mb-0.5" style={{ color: elementColor }}>
            <DiceShape type={slot.dice.type} />
          </div>
          {displayValue !== undefined ? (
            <div
              className="font-bold text-base leading-none tabular-nums"
              style={{ color: isCrit ? '#f0d78c' : '#e8dcc0' }}
            >
              {displayValue}
              {genreBonus > 0 && (
                <span className="ml-0.5 align-top text-[10px] text-amber-300" title="Genre bonus">+{genreBonus}</span>
              )}
              {cascadeSum > 0 && (
                <span className="ml-0.5 align-top text-[10px] text-gold-400" title="Crit bonus dice">+{cascadeSum}</span>
              )}
            </div>
          ) : (
            <div className="mt-1 text-[11px] font-bold leading-none" style={{ color: elementColor }}>{slot.dice.element}</div>
          )}
        </div>
      ) : (
        <div className="text-xs text-parchment-500/40">Empty</div>
      )}
    </div>
  )
}

export function SongCard({ song, resisted, onPlay, disabled, index = 0, rolls, reroll, onRefresh, refreshTitle }: SongCardProps) {
  const hasDice = song.slots.some((s) => s.dice)
  // The just-played song shows its roll results, so keep it fully lit (not dimmed);
  // a spent song on offer for Rallying Cry stays lit too.
  const isCurrent = !!rolls && rolls.length > 0
  const dimmed = song.used && !isCurrent && !onRefresh
  // Clicking the die itself performs the song
  const playable = hasDice && !song.used && !disabled

  return (
    <div
      className="pixel-song-slot h-full min-w-0 animate-slide-up"
      style={{ animationDelay: `${index * 100 + 150}ms`, animationFillMode: 'both' }}
    >
      <div
        className={`pixel-song-card relative h-full w-full overflow-hidden transition-all duration-200 ${
          dimmed ? 'opacity-40' : !song.used ? 'hover:border-gold-500/45' : ''
        }`}
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(212, 168, 83, 0.16)',
        }}
      >
        <div className="p-2">
          {/* Dice: click them to perform the song. Reroll overlays the last
              roll so its appearance never changes the card's footprint. */}
          <div className={`relative ${onRefresh ? 'mb-2.5' : ''}`}>
          <button
            type="button"
            onClick={playable ? onPlay : undefined}
            disabled={!playable}
            aria-label={playable ? `Perform song ${index + 1}: ${song.slots.flatMap(({ dice }) => dice ? [`${dice.element} ${dice.type}`] : []).join(', ')}${resisted ? ', immune: counts for nothing' : ''}` : undefined}
            title={resisted ? 'Immune: these dice count for nothing' : undefined}
            className={`relative flex w-full flex-col rounded-md transition-all duration-200 ${
              playable ? 'cursor-pointer hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400' : 'cursor-default'
            }`}
          >
            <span className={`pixel-dice-row flex w-full gap-1.5 ${resisted ? 'opacity-60' : ''}`}>
              {song.slots.map((slot, idx) => (
                <SlotDie
                  key={idx}
                  slot={slot}
                  roll={slot.dice ? rolls?.find((r) => (r.sourceDiceId ?? r.diceId) === slot.dice!.id) : undefined}
                />
              ))}
            </span>
            {resisted && <Ban aria-hidden="true" data-immune="true" size={16} strokeWidth={2.5} className="pointer-events-none absolute right-1 top-1 rounded-full bg-wood-900 text-parchment-100" />}
          </button>
          {reroll && <RerollPill reroll={reroll} />}
          </div>

          {/* Gospel or Blues: bring this spent song back */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 font-medieval text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 animate-gentle-flash"
              style={{
                background: 'linear-gradient(135deg, rgba(232, 120, 60, 0.3), rgba(180, 80, 40, 0.22))',
                border: '1px solid rgba(255, 180, 120, 0.55)',
                color: '#ffe0c7',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
              }}
              title={refreshTitle ?? 'Refresh this spent song'}
            >
              <RotateCcw size={13} aria-hidden="true" />
              Refresh song
            </button>
          )}

        </div>

      </div>
    </div>
  )
}
