import { Song } from '@/types'
import { DiceDisplay } from '@/components/ui/DiceDisplay'
import { TRACK_EFFECT_DESCRIPTIONS, TRACK_EFFECT_NAMES } from '@/data/trackEffects'

interface SongCardProps {
  song: Song
  onPlay: () => void
  disabled: boolean
  index?: number
}

export function SongCard({ song, onPlay, disabled, index = 0 }: SongCardProps) {
  const hasEffects = song.effects.length > 0
  const hasDice = song.slots.some((s) => s.dice)
  const filledSlots = song.slots.filter((s) => s.dice).length

  return (
    <div
      className="animate-slide-up"
      style={{ animationDelay: `${index * 100 + 150}ms`, animationFillMode: 'both' }}
    >
      <div
        className={`relative min-w-[320px] max-w-[350px] rounded-xl overflow-hidden transition-all duration-300 ${
          song.used ? 'opacity-35 scale-[0.98]' : 'hover:scale-[1.02]'
        }`}
        style={{
          background: song.used
            ? 'rgba(30, 24, 18, 0.5)'
            : 'linear-gradient(165deg, rgba(42, 33, 24, 0.95), rgba(30, 24, 18, 0.98))',
          border: song.used
            ? '1px solid rgba(100, 200, 100, 0.15)'
            : '1px solid rgba(212, 168, 83, 0.25)',
          boxShadow: song.used
            ? 'none'
            : '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212, 168, 83, 0.08)',
        }}
      >
        {/* Top decorative bar */}
        {!song.used && (
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.3), transparent)' }} />
        )}

        <div className="p-5">
          {/* Song title */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className={`font-medieval text-lg font-bold truncate leading-tight flex-1 ${song.name ? 'text-gold-400' : 'text-parchment-500 italic'}`}>
              {song.name || 'Untitled'}
            </div>
            <div className="text-sm text-parchment-500 flex-shrink-0 tabular-nums">
              {filledSlots}/2
            </div>
          </div>

          {/* Dice slots - visual track */}
          <div className="flex gap-4 mb-4">
            {song.slots.map((slot, idx) => (
              <div key={idx} className="relative flex-1">
                {slot.dice ? (
                  <DiceDisplay dice={slot.dice} className="w-full h-full" compact />
                ) : (
                  <div
                    className="h-14 rounded-lg flex items-center justify-center"
                    style={{
                      border: '1px dashed rgba(212, 168, 83, 0.15)',
                      background: 'rgba(13, 10, 7, 0.3)',
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-parchment-600/30" />
                  </div>
                )}

                {/* Slot connector line */}
                {idx < 1 && (
                  <div className="absolute top-1/2 -right-2.5 w-4 h-px bg-parchment-600/15" />
                )}
              </div>
            ))}
          </div>

          {/* Effects list */}
          {hasEffects && (
            <div className="mb-4 space-y-1.5">
              {song.effects.map((effect, idx) => {
                const name = TRACK_EFFECT_NAMES[effect.type] || effect.type
                const desc = TRACK_EFFECT_DESCRIPTIONS[effect.type] || effect.type
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #9040cc, #6a20aa)',
                        border: '1px solid rgba(176, 124, 255, 0.5)',
                        boxShadow: '0 0 6px rgba(176, 124, 255, 0.3)',
                      }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                    </div>
                    <span className="text-classical/70 truncate" title={desc}>{name}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Play button */}
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
            {song.used ? '\u2713 Played' : !hasDice ? 'No Dice' : '\u266B Perform'}
          </button>
        </div>

        {/* Used overlay */}
        {song.used && (
          <div className="absolute inset-0 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)' }} />
        )}
      </div>
    </div>
  )
}
