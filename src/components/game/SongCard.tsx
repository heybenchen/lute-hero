import { Song } from '@/types'
import { DiceShape } from '@/components/ui/DiceShape'
import { describeTrackEffect } from '@/data/trackEffects'
import { GENRE_THEME } from '@/data/genreTheme'

interface SongCardProps {
  song: Song
}

/**
 * Read-only presentation of a song — title, effect, and dice slots.
 * Matches the song cards shown in the Studio (DraftShop).
 */
export function SongCard({ song }: SongCardProps) {
  return (
    <div className="card flex-1 min-w-0 p-1.5 lg:p-3 lg:flex-none lg:w-full lg:max-w-[280px] lg:mx-auto">
      {/* Title — hidden on mobile where cards are compact */}
      <div
        className="hidden lg:block font-medieval text-base font-bold text-gold-400 mb-2 pb-2 text-center"
        style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.2)' }}
      >
        {song.name || <span className="text-parchment-500 italic">Untitled</span>}
      </div>

      <div className="flex items-stretch justify-center lg:justify-start gap-3">
        {/* Dice on the left */}
        <div className="flex gap-1.5 lg:gap-2 shrink-0">
          {song.slots.map((slot, idx) => {
            // Tint each die by its genre element color
            const genreColor = slot.dice ? GENRE_THEME[slot.dice.genre].color : ''
            return (
              <div
                key={idx}
                className="w-8 h-8 lg:w-[60px] lg:h-[60px] aspect-square shrink-0 rounded-lg flex flex-col items-center justify-center text-xs"
                style={{
                  background: genreColor ? `${genreColor}1f` : 'rgba(255, 255, 255, 0.02)',
                  border: genreColor ? `1px solid ${genreColor}80` : '1px dashed rgba(212, 168, 83, 0.12)',
                }}
              >
                {slot.dice ? (
                  <div className="text-center">
                    <div className="text-base lg:text-2xl mb-0.5" style={{ color: genreColor }}><DiceShape type={slot.dice.type} /></div>
                    <div className="hidden lg:block font-bold text-[9px]" style={{ color: genreColor }}>{slot.dice.genre}</div>
                  </div>
                ) : (
                  <div className="text-parchment-500/40 text-[8px] lg:text-[10px]">-</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Effect on the right — hidden on mobile */}
        <div className="hidden lg:flex flex-1 min-w-0">
          {song.effect ? (
            <div className="h-full w-full p-1.5 rounded text-xs flex flex-wrap items-center justify-center gap-1.5 text-center"
              style={{ background: 'rgba(176, 124, 255, 0.08)', border: '1px solid rgba(176, 124, 255, 0.15)' }}
            >
              <span className="font-bold text-classical shrink-0">FX:</span>
              <span className="text-classical/80 break-words">{describeTrackEffect(song.effect)}</span>
            </div>
          ) : (
            <div className="h-full w-full p-1.5 rounded text-xs text-parchment-500 italic flex items-center justify-center text-center"
              style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(212, 168, 83, 0.1)' }}
            >
              No effects
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
