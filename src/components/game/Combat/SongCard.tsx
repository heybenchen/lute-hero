import { Song, SongSlot, DiceRoll } from '@/types'
import { DiceShape } from '@/components/ui/DiceShape'
import { GENRE_THEME } from '@/data/genreTheme'
import { STYLES } from '@/data/styles'

interface SongCardProps {
  song: Song
  onPlay: () => void
  disabled: boolean
  index?: number
  isCover?: boolean
  ownerName?: string
  /** Dice results from this song's most recent performance, shown in-card */
  rolls?: DiceRoll[]
  /** When set, this song was just played and can be rerolled for Inspiration */
  onReroll?: () => void
  /** Player's current Inspiration, used to gate the in-card reroll */
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
function SlotDie({ slot, roll, caption }: { slot: SongSlot; roll?: DiceRoll; caption?: string }) {
  const genreColor = slot.dice ? GENRE_THEME[slot.dice.genre].color : ''
  const displayValue = roll?.value
  const isCrit = roll?.isCrit ?? false
  const cascadeSum = roll?.cascadeRolls?.reduce((s, v) => s + v, 0) ?? 0
  const styleBonus = roll?.bonus ?? 0

  return (
    <div
      className="flex-1 min-w-0 h-[80px] rounded-lg flex flex-col items-center justify-center text-xs"
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
                <span className="text-[8px] align-top text-amber-300" title="Style bonus">+{styleBonus}</span>
              )}
              {cascadeSum > 0 && (
                <span className="text-[8px] align-top text-gold-400" title="Crit bonus dice">+{cascadeSum}</span>
              )}
            </div>
          ) : (
            <div className="font-bold text-[9px]" style={{ color: genreColor }}>{slot.dice.genre}</div>
          )}
          {caption && (
            <div className="mt-1 text-[9px] font-medieval font-bold uppercase tracking-wider text-parchment-400">{caption}</div>
          )}
        </div>
      ) : (
        <div className="text-parchment-500/40 text-[10px]">-</div>
      )}
    </div>
  )
}

export function SongCard({ song, onPlay, disabled, index = 0, isCover, ownerName, rolls, onReroll, inspiration = 0, onRubato, onRally }: SongCardProps) {
  const hasDice = song.slots.some((s) => s.dice)
  // The just-played song shows its roll results, so keep it fully lit (not dimmed);
  // a spent song on offer for Rallying Cry stays lit too.
  const isCurrent = !!rolls && rolls.length > 0
  const dimmed = song.used && !isCurrent && !onRally
  // Clicking the die itself performs the song
  const playable = hasDice && !song.used && !disabled && !onReroll
  const caption = !hasDice ? undefined : playable ? 'Tap to play' : song.used && !onReroll ? 'Spent' : undefined

  return (
    <div
      className="animate-slide-up min-w-0"
      style={{ animationDelay: `${index * 100 + 150}ms`, animationFillMode: 'both' }}
    >
      <div
        className={`relative w-full rounded-xl overflow-hidden transition-all duration-300 ${
          dimmed ? 'opacity-35 scale-[0.98]' : !song.used ? 'hover:scale-[1.02]' : ''
        }`}
        style={{
          background: dimmed
            ? 'rgba(30, 24, 18, 0.5)'
            : 'linear-gradient(165deg, rgba(42, 33, 24, 0.95), rgba(30, 24, 18, 0.98))',
          border: dimmed
            ? '1px solid rgba(100, 200, 100, 0.15)'
            : isCover
              ? '1px solid rgba(0, 188, 212, 0.3)'
              : '1px solid rgba(212, 168, 83, 0.25)',
          boxShadow: dimmed
            ? 'none'
            : '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212, 168, 83, 0.08)',
        }}
      >
        {/* Top decorative bar */}
        {!dimmed && (
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.3), transparent)' }} />
        )}

        <div className="p-3">
          {/* Cover badge */}
          {isCover && ownerName && (
            <div className="mb-2 flex items-center gap-1.5">
              <span
                className="text-xs font-medieval font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(0, 188, 212, 0.12)',
                  border: '1px solid rgba(0, 188, 212, 0.3)',
                  color: '#4dd0e1',
                }}
              >
                Cover from {ownerName}
              </span>
            </div>
          )}

          {/* Dice: click them to perform the song */}
          <button
            type="button"
            onClick={playable ? onPlay : undefined}
            disabled={!playable}
            aria-label={playable ? 'Perform this song' : undefined}
            className={`w-full flex gap-2 rounded-lg transition-all duration-200 ${
              playable ? 'cursor-pointer hover:-translate-y-0.5 hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400' : 'cursor-default'
            } ${onReroll || onRubato || onRally ? 'mb-3' : ''}`}
          >
            {song.slots.map((slot, idx) => (
              <SlotDie
                key={idx}
                slot={slot}
                roll={slot.dice ? rolls?.find((r) => r.diceId === slot.dice!.id) : undefined}
                caption={idx === 0 ? caption : undefined}
              />
            ))}
          </button>

          {/* Rallying Cry: bring this spent song back */}
          {onRally && (
            <button
              onClick={onRally}
              className="w-full py-2.5 font-medieval font-bold rounded-lg transition-all duration-200 text-sm hover:-translate-y-0.5 animate-gentle-flash"
              style={{
                background: 'linear-gradient(135deg, rgba(232, 120, 60, 0.3), rgba(180, 80, 40, 0.22))',
                border: '1px solid rgba(255, 180, 120, 0.55)',
                color: '#ffe0c7',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
              }}
              title={`${STYLES.staccato.name}: refresh this spent song (once per turn)`}
            >
              &#x21BB; {STYLES.staccato.name}: refresh
            </button>
          )}

          {/* Rubato: a free reroll from the bard's style, offered ahead of the paid one */}
          {onReroll && onRubato && (
            <button
              onClick={onRubato}
              className="w-full mb-2 py-2.5 font-medieval font-bold rounded-lg transition-all duration-200 text-sm hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(212, 168, 83, 0.3), rgba(160, 120, 50, 0.22))',
                border: '1px solid rgba(240, 215, 140, 0.55)',
                color: '#f8e7b5',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
              }}
              title={`${STYLES.rubato.name}: reroll this d4/d8 song for free (once per turn)`}
            >
              &#x266A; {STYLES.rubato.name} (free reroll)
            </button>
          )}

          {/* Reroll the just-played song for Inspiration */}
          {onReroll && (
            <button
              onClick={onReroll}
              disabled={inspiration <= 0}
              className="w-full py-3 font-medieval font-bold rounded-lg transition-all duration-200 text-base disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(176, 124, 255, 0.28), rgba(138, 90, 220, 0.22))',
                border: '1px solid rgba(176, 124, 255, 0.5)',
                color: '#e6d9ff',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
              title={inspiration > 0 ? 'Reroll this song for 1 Inspiration' : 'Requires Inspiration'}
            >
              &#x2728; Reroll
            </button>
          )}
        </div>

        {/* Used overlay */}
        {dimmed && (
          <div className="absolute inset-0 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)' }} />
        )}
      </div>
    </div>
  )
}
