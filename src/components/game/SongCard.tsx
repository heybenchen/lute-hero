import { Song } from '@/types'
import { DiceShape } from '@/components/ui/DiceShape'
import { GENRE_THEME } from '@/data/genreTheme'

interface SongCardProps {
  song: Song
}

/**
 * Read-only presentation of a song — its dice slots.
 * Matches the song cards shown in the Studio (DraftShop).
 */
export function SongCard({ song }: SongCardProps) {
  return (
    <div className="card flex-1 min-w-0 p-1 lg:p-1.5 lg:w-full">
      <div className="flex items-stretch">
        {/* Dice slots */}
        <div className="flex flex-1 min-w-0 gap-1.5 lg:gap-2">
          {song.slots.map((slot, idx) => {
            // Tint each die by its genre element color
            const genreColor = slot.dice ? GENRE_THEME[slot.dice.genre].color : ''
            return (
              <div
                key={idx}
                className="flex-1 min-w-0 h-8 lg:h-[72px] rounded-lg flex flex-col items-center justify-center text-xs"
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
      </div>
    </div>
  )
}
