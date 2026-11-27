import { Song } from '@/types'
import { DiceShape } from '@/components/ui/DiceShape'
import { ELEMENT_THEME } from '@/data/elementTheme'

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
            // Tint each die by its element color
            const elementColor = slot.dice ? ELEMENT_THEME[slot.dice.element].color : ''
            return (
              <div
                key={idx}
                className="flex-1 min-w-0 h-8 lg:h-[72px] rounded-lg flex flex-col items-center justify-center text-xs"
                style={{
                  background: elementColor ? `${elementColor}1f` : 'rgba(255, 255, 255, 0.02)',
                  border: elementColor ? `1px solid ${elementColor}80` : '1px dashed rgba(212, 168, 83, 0.12)',
                }}
              >
                {slot.dice ? (
                  <div className="text-center">
                    <div className="text-base lg:text-2xl mb-0.5" style={{ color: elementColor }}><DiceShape type={slot.dice.type} /></div>
                    <div className="hidden lg:block font-bold text-[9px]" style={{ color: elementColor }}>{slot.dice.element}</div>
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
