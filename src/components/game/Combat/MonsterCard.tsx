import { Monster, Genre } from '@/types'
import { GenreBadge } from '@/components/ui/GenreBadge'
import { calculateMonsterExp } from '@/game-logic/fame/calculator'

interface MonsterCardProps {
  monster: Monster
  index?: number
  /** Fame this monster is worth if defeated, at the player's current fame tier */
  fameValue?: number
  /** When true, the card is the chosen single-target for the next song. */
  isSelected?: boolean
  /** When set, the card is clickable to become the combat target. */
  onSelect?: () => void
}

const genreAccentColors: Record<Genre, { border: string; glow: string; bg: string }> = {
  Ballad: { border: 'rgba(232, 32, 64, 0.4)', glow: 'rgba(232, 32, 64, 0.15)', bg: 'rgba(232, 32, 64, 0.16)' },
  Folk: { border: 'rgba(76, 175, 80, 0.4)', glow: 'rgba(76, 175, 80, 0.15)', bg: 'rgba(76, 175, 80, 0.16)' },
  Hymn: { border: 'rgba(250, 204, 21, 0.4)', glow: 'rgba(250, 204, 21, 0.15)', bg: 'rgba(250, 204, 21, 0.16)' },
  Shanty: { border: 'rgba(41, 121, 255, 0.4)', glow: 'rgba(41, 121, 255, 0.15)', bg: 'rgba(41, 121, 255, 0.16)' },
}

export function MonsterCard({ monster, index = 0, fameValue, isSelected = false, onSelect }: MonsterCardProps) {
  const hpPercent = (monster.currentHP / monster.maxHP) * 100
  const isDefeated = monster.currentHP <= 0
  const isLowHP = hpPercent > 0 && hpPercent <= 25

  const accentGenre = monster.vulnerability || monster.resistance
  const accent = accentGenre ? genreAccentColors[accentGenre] : null
  const selectable = !!onSelect && !isDefeated

  return (
    <div
      className="animate-slide-up w-full"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <div
        onClick={selectable ? onSelect : undefined}
        role={selectable ? 'button' : undefined}
        aria-pressed={selectable ? isSelected : undefined}
        className={`relative w-full rounded-xl overflow-hidden transition-all duration-500 ${
          isDefeated ? 'opacity-30 scale-[0.97] grayscale' : isLowHP ? 'animate-pulse-slow' : ''
        } ${selectable ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
        style={{
          background: isDefeated
            ? 'rgba(30, 24, 18, 0.6)'
            : accent
            ? `linear-gradient(160deg, ${accent.bg}, ${accent.bg}), rgba(30, 24, 18, 0.95)`
            : 'rgba(30, 24, 18, 0.95)',
          border: isSelected && !isDefeated
            ? '2px solid rgba(240, 200, 110, 0.95)'
            : `1px solid ${isDefeated ? 'rgba(100, 200, 100, 0.2)' : accent ? accent.border : 'rgba(212, 168, 83, 0.2)'}`,
          boxShadow: isDefeated
            ? 'none'
            : isSelected
            ? '0 4px 20px rgba(0,0,0,0.4), 0 0 22px rgba(240, 200, 110, 0.45)'
            : accent
            ? `0 4px 20px rgba(0,0,0,0.4), 0 0 25px ${accent.glow}`
            : '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Target badge */}
        {isSelected && !isDefeated && (
          <div className="absolute top-2 right-2 z-20 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(240, 200, 110, 0.95)', color: '#1a1410' }}>
            🎯 TARGET
          </div>
        )}
        {/* Top accent stripe */}
        {!isDefeated && accent && (
          <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${accent.border}, transparent)` }} />
        )}

        <div className="p-4 sm:p-5">
          {/* Header — name on its own line so the HP never crowds it */}
          <div className="mb-3">
            <div className="font-medieval text-lg font-bold text-gold-400 truncate leading-tight">
              {monster.name}
            </div>
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {monster.isBoss && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: '#4dd0e1', background: 'rgba(0, 188, 212, 0.1)', border: '1px solid rgba(0, 184, 212, 0.2)' }}>
                    BOSS
                  </span>
                )}
                <span className="text-sm text-parchment-500">Lv.{monster.level}</span>
                {fameValue !== undefined && fameValue > 0 && (
                  <span
                    className="flex items-center gap-1 text-xs font-bold text-gold-400"
                    title="Fame earned if this monster is defeated"
                  >
                    &#x2B50; {fameValue}
                  </span>
                )}
                <span
                  className="text-xs font-bold text-parchment-400"
                  title="EXP earned from this monster"
                >
                  {calculateMonsterExp(monster.level)} EXP
                </span>
              </div>

              {/* HP number */}
              <div className="flex items-baseline gap-0.5 flex-shrink-0">
                <span className={`text-2xl font-bold leading-none tabular-nums ${
                  isDefeated ? 'text-green-400/60' : hpPercent > 50 ? 'text-parchment-200' : hpPercent > 25 ? 'text-gold-400' : 'text-red-400'
                }`}>
                  {Math.max(0, monster.currentHP)}
                </span>
                <span className="text-sm text-parchment-500">/{monster.maxHP}</span>
              </div>
            </div>
          </div>

          {/* HP Bar */}
          <div className="mb-4">
            <div className="hp-bar h-4 rounded-full">
              <div
                className="hp-fill rounded-full"
                style={{
                  width: `${Math.max(0, hpPercent)}%`,
                  background: hpPercent > 50
                    ? 'linear-gradient(90deg, #2d8c30, #4caf50)'
                    : hpPercent > 25
                    ? 'linear-gradient(90deg, #b8922e, #e6c35a)'
                    : 'linear-gradient(90deg, #c43030, #e85050)',
                  boxShadow: hpPercent <= 25 && !isDefeated
                    ? '0 0 8px rgba(232, 80, 80, 0.4)'
                    : undefined,
                }}
              />
            </div>
          </div>

          {/* Weakness & Immunity */}
          <div className="flex gap-2 justify-between">
            {monster.vulnerability && (
              <div className="flex flex-col items-start gap-1 px-2 py-1.5 rounded-lg flex-1 min-w-0"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(212, 168, 83, 0.2)' }}
                title="Weak — takes double damage from this genre"
              >
                <span className="font-bold text-green-300 text-xs">Weak 2×</span>
                <GenreBadge genre={monster.vulnerability} className="text-xs px-2 py-0.5 rounded" />
              </div>
            )}
            {monster.resistance && (
              <div className="flex flex-col items-start gap-1 px-2 py-1.5 rounded-lg flex-1 min-w-0"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(212, 168, 83, 0.2)' }}
                title="Immune — takes no damage from this genre"
              >
                <span className="font-bold text-slate-300 text-xs">Immune 0×</span>
                <GenreBadge genre={monster.resistance} className="text-xs px-2 py-0.5 rounded" />
              </div>
            )}
          </div>

          {/* Defeated overlay */}
          {isDefeated && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
              <div className="font-medieval font-bold text-green-400 text-lg tracking-wider"
                style={{ textShadow: '0 0 12px rgba(74, 222, 128, 0.5)' }}
              >
                CONVERTED
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
