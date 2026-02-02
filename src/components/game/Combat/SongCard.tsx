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
    <div className={`card ${song.used ? 'opacity-50' : ''} min-w-[300px]`}>
      <div className="card-header">{song.name}</div>

      {/* Dice slots */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {song.slots.map((slot, idx) => (
          <div key={idx} className="relative">
            {slot.dice ? (
              <DiceDisplay dice={slot.dice} className="w-full h-full" />
            ) : (
              <div className="w-16 h-16 border-2 border-dashed border-wood-400 rounded-lg flex items-center justify-center text-xs text-wood-400">
                Empty
              </div>
            )}

            {/* Effect indicator */}
            {slot.effect && (
              <div
                className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold"
                title={TRACK_EFFECT_DESCRIPTIONS[slot.effect.type] || slot.effect.type}
              >
                ✨
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Track effects list */}
      <div className="text-xs mb-3">
        {song.slots.map((slot, idx) => {
          if (!slot.effect) return null

          const desc = TRACK_EFFECT_DESCRIPTIONS[slot.effect.type] || slot.effect.type

          return (
            <div key={idx} className="text-purple-700 mb-1">
              <strong>Slot {idx + 1}:</strong> {desc}
            </div>
          )
        })}
      </div>

      {/* Play button */}
      <button
        onClick={onPlay}
        disabled={disabled || song.used}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {song.used ? '✓ Played' : '🎵 Play Song'}
      </button>
    </div>
  )
}
