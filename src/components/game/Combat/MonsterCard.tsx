import { Monster, Genre } from '@/types'
import { GenreBadge } from '@/components/ui/GenreBadge'

interface MonsterCardProps {
  monster: Monster
  index?: number
}

const genreAccentColors: Record<Genre, { border: string; glow: string; bg: string }> = {
  Pop: { border: 'rgba(255, 92, 170, 0.4)', glow: 'rgba(255, 92, 170, 0.15)', bg: 'rgba(255, 92, 170, 0.06)' },
  Rock: { border: 'rgba(232, 32, 64, 0.4)', glow: 'rgba(232, 32, 64, 0.15)', bg: 'rgba(232, 32, 64, 0.06)' },
  Electronic: { border: 'rgba(0, 229, 255, 0.4)', glow: 'rgba(0, 229, 255, 0.15)', bg: 'rgba(0, 229, 255, 0.06)' },
  Classical: { border: 'rgba(176, 124, 255, 0.4)', glow: 'rgba(176, 124, 255, 0.15)', bg: 'rgba(176, 124, 255, 0.06)' },
  HipHop: { border: 'rgba(255, 157, 27, 0.4)', glow: 'rgba(255, 157, 27, 0.15)', bg: 'rgba(255, 157, 27, 0.06)' },
}

export function MonsterCard({ monster, index = 0 }: MonsterCardProps) {
  const hpPercent = (monster.currentHP / monster.maxHP) * 100
  const isDefeated = monster.currentHP <= 0
  const isLowHP = hpPercent > 0 && hpPercent <= 25

  const accentGenre = monster.vulnerability || monster.resistance
  const accent = accentGenre ? genreAccentColors[accentGenre] : null

  return (
    <div
      className="animate-slide-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <div
        className={`relative min-w-[260px] max-w-[300px] rounded-xl overflow-hidden transition-all duration-500 ${
          isDefeated ? 'opacity-30 scale-[0.97] grayscale' : isLowHP ? 'animate-pulse-slow' : ''
        }`}
        style={{
          background: isDefeated
            ? 'rgba(30, 24, 18, 0.6)'
            : accent
            ? `linear-gradient(160deg, rgba(30, 24, 18, 0.95), ${accent.bg})`
            : 'rgba(30, 24, 18, 0.95)',
          border: `1px solid ${isDefeated ? 'rgba(100, 200, 100, 0.2)' : accent ? accent.border : 'rgba(212, 168, 83, 0.2)'}`,
          boxShadow: isDefeated
            ? 'none'
            : accent
            ? `0 4px 20px rgba(0,0,0,0.4), 0 0 25px ${accent.glow}`
            : '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Top accent stripe */}
        {!isDefeated && accent && (
          <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${accent.border}, transparent)` }} />
        )}

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="font-medieval text-lg font-bold text-gold-400 truncate leading-tight">
                {monster.name}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {monster.isElite && (
                  <span className="text-xs font-bold text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded" style={{ border: '1px solid rgba(212, 168, 83, 0.2)' }}>
                    ELITE
                  </span>
                )}
                {monster.isBoss && (
                  <span className="text-xs font-bold text-classical bg-classical/10 px-2 py-0.5 rounded" style={{ border: '1px solid rgba(176, 124, 255, 0.2)' }}>
                    BOSS
                  </span>
                )}
                <span className="text-sm text-parchment-500">Lv.{monster.level}</span>
              </div>
            </div>

            {/* HP number */}
            <div className="text-right flex-shrink-0">
              <div className={`text-3xl font-bold leading-none tabular-nums ${
                isDefeated ? 'text-green-400/60' : hpPercent > 50 ? 'text-parchment-200' : hpPercent > 25 ? 'text-gold-400' : 'text-red-400'
              }`}>
                {Math.max(0, monster.currentHP)}
              </div>
              <div className="text-sm text-parchment-500">/{monster.maxHP}</div>
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

          {/* Vulnerability & Resistance */}
          <div className="flex gap-2.5">
            {monster.vulnerability && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm"
                style={{ background: 'rgba(45, 140, 48, 0.12)', border: '1px solid rgba(76, 175, 80, 0.2)' }}
              >
                <span className="text-green-400 font-bold">2x</span>
                <GenreBadge genre={monster.vulnerability} className="text-xs px-2 py-0.5 rounded" />
              </div>
            )}
            {monster.resistance && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm"
                style={{ background: 'rgba(196, 48, 48, 0.1)', border: '1px solid rgba(232, 80, 80, 0.2)' }}
              >
                <span className="text-red-400 font-bold">.5x</span>
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
