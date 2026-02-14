import { Song } from '@/types'
import { DiceDisplay } from '@/components/ui/DiceDisplay'
import { TRACK_EFFECT_DESCRIPTIONS } from '@/data/trackEffects'

interface SongCardProps {
  song: Song
  onPlay: () => void
  disabled: boolean
}

export function SongCard({ song, onPlay, disabled }: SongCardProps) {
  return (
    <div className={`card min-w-[240px] p-3 transition-all duration-200 ${song.used ? 'opacity-40' : ''}`}>
      <div className="font-medieval text-base font-bold text-gold-400 mb-2 pb-1.5 truncate"
        style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.2)' }}
      >
        {song.name}
      </div>

      {/* Dice slots */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {song.slots.map((slot, idx) => (
          <div key={idx} className="relative">
            {slot.dice ? (
              <DiceDisplay dice={slot.dice} className="w-full h-full" compact />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[8px]"
                style={{
                  border: '1px dashed rgba(212, 168, 83, 0.2)',
                  color: 'rgba(212, 168, 83, 0.3)',
                }}
              >
                Empty
              </div>
            )}

            {/* Effect indicator */}
            {slot.effect && (
              <div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                title={TRACK_EFFECT_DESCRIPTIONS[slot.effect.type] || slot.effect.type}
                style={{
                  background: 'linear-gradient(135deg, #9040cc, #6a20aa)',
                  border: '1px solid rgba(176, 124, 255, 0.5)',
                  color: '#e8d0ff',
                  boxShadow: '0 0 6px rgba(176, 124, 255, 0.3)',
                }}
              >
                &#x2728;
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Track effects list - compact */}
      <div className="text-xs mb-3 space-y-0.5 max-h-16 overflow-hidden">
        {song.slots.map((slot, idx) => {
          if (!slot.effect) return null

          const desc = TRACK_EFFECT_DESCRIPTIONS[slot.effect.type] || slot.effect.type

          return (
            <div key={idx} className="flex items-center gap-1 text-classical/80">
              <strong className="text-classical shrink-0">{idx + 1}:</strong>
              <span className="truncate">{desc}</span>
            </div>
          )
        })}
      </div>

      {/* Play button */}
      <button
        onClick={onPlay}
        disabled={disabled || song.used}
        className={`w-full py-2 font-medieval font-bold rounded-lg transition-all duration-200 text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
          song.used ? '' : ''
        }`}
        style={{
          background: song.used
            ? 'rgba(255, 255, 255, 0.05)'
            : 'linear-gradient(135deg, #6d5638, #5a4529)',
          border: song.used
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(212, 168, 83, 0.4)',
          color: song.used ? 'rgba(255, 255, 255, 0.3)' : '#f0d78c',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
        }}
      >
        {song.used ? '\u2713 Played' : '\u266B Play'}
      </button>
    </div>
  )
}
