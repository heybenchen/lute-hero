import { Song, SongSlot, DiceRoll } from '@/types'
import { DiceShape } from '@/components/ui/DiceShape'
import { GENRE_THEME } from '@/data/genreTheme'
import { STYLES } from '@/data/styles'
import { Ban, RotateCcw } from 'lucide-react'

interface SongCardProps {
  song: Song
  resisted?: boolean
  onPlay: () => void
  disabled: boolean
  index?: number
  /** Dice results from this song's most recent performance, shown in-card */
  rolls?: DiceRoll[]
  /** When set, this song was just played and can be rerolled for Inspiration */
  onReroll?: () => void
  /** Retained for shared Showdown card compatibility; paid reroll renders outside combat cards. */
  inspiration?: number
  /** Rubato's free reroll, when the bard has it unspent and this is a d4/d8 song */
  onRubato?: () => void
  /** Rallying Cry: offered on a spent song once a tame has armed it */
  onRally?: () => void
}

/**
 * A single dice slot: the rolled value (with a crit glow) when a roll is
 * present, otherwise the die's genre label. No in-card tumble — the combat
 * view holds new rolls back until the 3D dice land, then shows the result.
 */
function SlotDie({ slot, roll }: { slot: SongSlot; roll?: DiceRoll }) {
  const genreColor = slot.dice ? GENRE_THEME[slot.dice.genre].color : ''
  const displayValue = roll?.value
  const isCrit = roll?.isCrit ?? false
  const cascadeSum = roll?.cascadeRolls?.reduce((s, v) => s + v, 0) ?? 0
  const styleBonus = roll?.bonus ?? 0

  return (
    <div
      className="flex h-[64px] min-w-0 flex-1 flex-col items-center justify-center rounded-md text-xs"
      style={{
        background: genreColor ? `${genreColor}1f` : 'rgba(255, 255, 255, 0.02)',
        border: genreColor ? `1px solid ${genreColor}80` : '1px dashed rgba(212, 168, 83, 0.12)',
        boxShadow: isCrit ? `0 0 10px ${genreColor}80` : undefined,
      }}
    >
      {slot.dice ? (
        <div className="text-center">
          <div className="text-xl leading-none mb-0.5" style={{ color: genreColor }}>
            <DiceShape type={slot.dice.type} />
          </div>
          {displayValue !== undefined ? (
            <div
              className="font-bold text-base leading-none tabular-nums"
              style={{ color: isCrit ? '#f0d78c' : '#e8dcc0' }}
            >
              {displayValue}
              {styleBonus > 0 && (
                <span className="ml-0.5 align-top text-[10px] text-amber-300" title="Style bonus">+{styleBonus}</span>
              )}
              {cascadeSum > 0 && (
                <span className="ml-0.5 align-top text-[10px] text-gold-400" title="Crit bonus dice">+{cascadeSum}</span>
              )}
            </div>
          ) : (
            <div className="mt-1 text-[11px] font-bold leading-none" style={{ color: genreColor }}>{slot.dice.genre}</div>
          )}
        </div>
      ) : (
        <div className="text-xs text-parchment-500/40">Empty</div>
      )}
    </div>
  )
}

export function SongCard({ song, resisted, onPlay, disabled, index = 0, rolls, onReroll, onRubato, onRally }: SongCardProps) {
  const hasDice = song.slots.some((s) => s.dice)
  // The just-played song shows its roll results, so keep it fully lit (not dimmed);
  // a spent song on offer for Rallying Cry stays lit too.
  const isCurrent = !!rolls && rolls.length > 0
  const dimmed = song.used && !isCurrent && !onRally
  // Clicking the die itself performs the song
  const playable = hasDice && !song.used && !disabled && !onReroll

  return (
    <div
      className="h-full min-w-0 animate-slide-up"
      style={{ animationDelay: `${index * 100 + 150}ms`, animationFillMode: 'both' }}
    >
      <div
        className={`relative h-full w-full overflow-hidden rounded-lg transition-all duration-200 ${
          dimmed ? 'opacity-40' : !song.used ? 'hover:border-gold-500/45' : ''
        }`}
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(212, 168, 83, 0.16)',
        }}
      >
        <div className="p-2">
          {/* Dice: click them to perform the song */}
          <button
            type="button"
            onClick={playable ? onPlay : undefined}
            disabled={!playable}
            aria-label={playable ? `Perform song ${index + 1}: ${song.slots.flatMap(({ dice }) => dice ? [`${dice.genre} ${dice.type}`] : []).join(', ')}${resisted ? ', 0 damage to this target' : ''}` : undefined}
            className={`relative flex w-full flex-col rounded-md transition-all duration-200 ${
              playable ? 'cursor-pointer hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400' : 'cursor-default'
            } ${onRubato || onRally ? 'mb-2.5' : ''}`}
          >
            <span className={`flex w-full gap-1.5 ${resisted ? 'opacity-60' : ''}`}>
              {song.slots.map((slot, idx) => (
                <SlotDie
                  key={idx}
                  slot={slot}
                  roll={slot.dice ? rolls?.find((r) => r.diceId === slot.dice!.id) : undefined}
                />
              ))}
            </span>
            {resisted && <Ban aria-hidden="true" size={16} strokeWidth={2.5} className="pointer-events-none absolute right-1 top-1 rounded-full bg-wood-900 text-parchment-100" />}
          </button>

          {/* Rallying Cry: bring this spent song back */}
          {onRally && (
            <button
              onClick={onRally}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 font-medieval text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 animate-gentle-flash"
              style={{
                background: 'linear-gradient(135deg, rgba(232, 120, 60, 0.3), rgba(180, 80, 40, 0.22))',
                border: '1px solid rgba(255, 180, 120, 0.55)',
                color: '#ffe0c7',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
              }}
              title={`${STYLES.staccato.name}: refresh this spent song (once per turn)`}
            >
              <RotateCcw size={13} aria-hidden="true" />
              Refresh song
            </button>
          )}

          {/* Rubato: a free reroll from the bard's style, offered ahead of the paid one */}
          {onReroll && onRubato && (
            <button
              onClick={onRubato}
              className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 font-medieval text-xs font-bold transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(212, 168, 83, 0.3), rgba(160, 120, 50, 0.22))',
                border: '1px solid rgba(240, 215, 140, 0.55)',
                color: '#f8e7b5',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
              }}
              title={`${STYLES.rubato.name}: reroll this d4/d8 song for free (once per turn)`}
            >
              <RotateCcw size={13} aria-hidden="true" />
              {STYLES.rubato.name}
            </button>
          )}

        </div>

      </div>
    </div>
  )
}
