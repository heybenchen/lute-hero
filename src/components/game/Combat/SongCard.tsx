import { Song, SongSlot, DiceRoll } from '@/types'
import { DiceShape } from '@/components/ui/DiceShape'
import { useRollAnimation } from '@/components/ui/useRollAnimation'
import { getMaxValue } from '@/game-logic/dice/roller'
import { GENRE_THEME } from '@/data/genreTheme'

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
}

/**
 * A single dice slot. When a roll is present it tumbles, then settles on the
 * rolled value (with a crit glow); otherwise it shows the die's genre label.
 */
function SlotDie({ slot, roll }: { slot: SongSlot; roll?: DiceRoll }) {
  const genreColor = slot.dice ? GENRE_THEME[slot.dice.genre].color : ''
  const maxValue = slot.dice ? getMaxValue(slot.dice.type) : 0
  const { displayValue, rolling } = useRollAnimation(roll?.value, maxValue, true)
  const isCrit = roll?.isCrit ?? false
  const cascadeSum = roll?.cascadeRolls?.reduce((s, v) => s + v, 0) ?? 0

  return (
    <div
      className="w-[60px] h-[60px] aspect-square shrink-0 rounded-lg flex flex-col items-center justify-center text-xs"
      style={{
        background: genreColor ? `${genreColor}1f` : 'rgba(255, 255, 255, 0.02)',
        border: genreColor ? `1px solid ${genreColor}80` : '1px dashed rgba(212, 168, 83, 0.12)',
        boxShadow: isCrit && !rolling ? `0 0 10px ${genreColor}80` : undefined,
      }}
    >
      {slot.dice ? (
        <div className={`text-center ${rolling ? 'animate-dice-roll' : ''}`}>
          <div className="text-xl leading-none mb-0.5" style={{ color: genreColor }}>
            <DiceShape type={slot.dice.type} />
          </div>
          {displayValue !== undefined ? (
            <div
              className="font-bold text-base leading-none tabular-nums"
              style={{ color: rolling ? `${genreColor}cc` : isCrit ? '#f0d78c' : '#e8dcc0' }}
            >
              {displayValue}
              {!rolling && cascadeSum > 0 && (
                <span className="text-[8px] align-top text-gold-400">+{cascadeSum}</span>
              )}
            </div>
          ) : (
            <div className="font-bold text-[9px]" style={{ color: genreColor }}>{slot.dice.genre}</div>
          )}
        </div>
      ) : (
        <div className="text-parchment-500/40 text-[10px]">-</div>
      )}
    </div>
  )
}

export function SongCard({ song, onPlay, disabled, index = 0, isCover, ownerName, rolls, onReroll, inspiration = 0 }: SongCardProps) {
  const hasDice = song.slots.some((s) => s.dice)
  // The just-played song shows its roll results, so keep it fully lit (not dimmed)
  const isCurrent = !!rolls && rolls.length > 0
  const dimmed = song.used && !isCurrent

  return (
    <div
      className="animate-slide-up snap-center shrink-0"
      style={{ animationDelay: `${index * 100 + 150}ms`, animationFillMode: 'both' }}
    >
      <div
        className={`relative min-w-[320px] max-w-[350px] rounded-xl overflow-hidden transition-all duration-300 ${
          song.used && !isCurrent ? 'opacity-35 scale-[0.98]' : !song.used ? 'hover:scale-[1.02]' : ''
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

        <div className="p-5">
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

          {/* Dice */}
          <div className="mb-4 space-y-3">
            <div className="flex gap-2 justify-center">
              {song.slots.map((slot, idx) => (
                <SlotDie
                  key={idx}
                  slot={slot}
                  roll={slot.dice ? rolls?.find((r) => r.diceId === slot.dice!.id) : undefined}
                />
              ))}
            </div>
          </div>

          {/* Reroll (just-played song) or Perform button */}
          {onReroll ? (
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
              &#x2728; Reroll &mdash; {inspiration} Insp
            </button>
          ) : (
            <button
              onClick={onPlay}
              disabled={disabled || song.used || !hasDice}
              className="w-full py-3 font-medieval font-bold rounded-lg transition-all duration-200 text-base disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: song.used
                  ? 'rgba(100, 200, 100, 0.06)'
                  : 'linear-gradient(135deg, #6d5638, #5a4529)',
                border: song.used
                  ? '1px solid rgba(100, 200, 100, 0.12)'
                  : '1px solid rgba(212, 168, 83, 0.4)',
                color: song.used ? 'rgba(100, 200, 100, 0.4)' : '#f0d78c',
                textShadow: song.used ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)',
                boxShadow: song.used ? 'none' : '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {song.used ? '✓ Spent' : !hasDice ? 'No Dice' : '♫ Perform'}
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
