import { Monster, Genre } from '@/types'
import { GenreBadge } from '@/components/ui/GenreBadge'
import { calculateMonsterExp } from '@/game-logic/fame/calculator'
import { Crown, Target } from 'lucide-react'

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

const genreAccentColors: Record<Genre, { border: string; background: string }> = {
  Ballad: { border: 'rgba(232, 32, 64, 0.48)', background: 'rgba(232, 32, 64, 0.11)' },
  Folk: { border: 'rgba(76, 175, 80, 0.48)', background: 'rgba(76, 175, 80, 0.11)' },
  Hymn: { border: 'rgba(250, 204, 21, 0.48)', background: 'rgba(250, 204, 21, 0.1)' },
  Shanty: { border: 'rgba(41, 121, 255, 0.48)', background: 'rgba(41, 121, 255, 0.11)' },
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
        className={`relative h-full w-full overflow-hidden rounded-xl transition-all duration-300 ${
          isDefeated ? 'opacity-30 scale-[0.97] grayscale' : isLowHP ? 'animate-pulse-slow' : ''
        } ${selectable ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
        style={{
          background: accent
            ? `linear-gradient(145deg, ${accent.background}, rgba(255,255,255,0.02))`
            : 'rgba(255,255,255,0.025)',
          border: isSelected && !isDefeated
            ? '2px solid rgba(192, 132, 252, 0.9)'
            : `2px solid ${isDefeated ? 'rgba(100, 200, 100, 0.2)' : accent?.border ?? 'rgba(212, 168, 83, 0.16)'}`,
          boxShadow: isDefeated
            ? 'none'
            : isSelected
            ? '0 0 0 2px rgba(192, 132, 252, 0.14)'
            : 'none',
        }}
      >
        <div className="relative flex h-full flex-col overflow-hidden p-3.5">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-40"
            style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.16), transparent 42%)' }}
          />

          <div className="relative mb-3 flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate font-display text-lg leading-none text-parchment-100 sm:text-xl">
                  {monster.name}
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-parchment-400">
                  Lv. {monster.level}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[11px]">
                {monster.isBoss && (
                  <span className="flex items-center gap-1 font-bold uppercase tracking-wide text-cyan-200">
                    <Crown size={10} aria-hidden="true" /> Boss
                  </span>
                )}
                {fameValue !== undefined && fameValue > 0 && (
                  <span className="font-bold text-gold-300" title="Fame earned if this monster is defeated">
                    {fameValue} Fame
                  </span>
                )}
                <span className="text-parchment-300" title="EXP earned from this monster">
                  {calculateMonsterExp(monster.level)} EXP
                </span>
              </div>
            </div>
            {isSelected && !isDefeated && (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center text-violet-200 drop-shadow-[0_0_8px_rgba(192,132,252,0.65)]"
                aria-label="Selected target"
                title="Selected target"
              >
                <Target size={17} aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="relative mb-3 border-y border-white/10 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-medieval text-[10px] font-bold uppercase tracking-[0.18em] text-parchment-400">Vitality</span>
              <div className="flex items-baseline gap-1">
                <span className={`font-display text-2xl leading-none tabular-nums ${
                  isDefeated ? 'text-green-400/60' : hpPercent > 50 ? 'text-parchment-100' : hpPercent > 25 ? 'text-gold-400' : 'text-red-400'
                }`}>
                  {Math.max(0, monster.currentHP)}
                </span>
                <span className="text-xs text-parchment-500">/ {monster.maxHP} HP</span>
              </div>
            </div>
            <div className="hp-bar h-2.5 rounded-full">
              <div
                className="hp-fill rounded-full"
                style={{
                  width: `${Math.max(0, hpPercent)}%`,
                  background: hpPercent > 50
                    ? 'linear-gradient(90deg, #2d8c30, #6acb6e)'
                    : hpPercent > 25
                    ? 'linear-gradient(90deg, #b8922e, #f0d36f)'
                    : 'linear-gradient(90deg, #c43030, #ff6b6b)',
                  boxShadow: hpPercent <= 25 && !isDefeated
                    ? '0 0 8px rgba(232, 80, 80, 0.5)'
                    : '0 0 6px rgba(255,255,255,0.12)',
                }}
              />
            </div>
          </div>

          <div className="relative mt-auto grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 pt-3">
            {monster.vulnerability && (
              <div
                className="pr-3"
                title="Weak — takes double damage from this genre"
              >
                <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-green-200/70">Weakness</div>
                <div className="flex items-center justify-between gap-2">
                  <GenreBadge genre={monster.vulnerability} className="rounded px-2 py-0.5 text-xs" />
                  <span className="font-display text-xl leading-none text-green-200">×2</span>
                </div>
              </div>
            )}
            {monster.resistance && (
              <div
                className="pl-3"
                title="Immune — takes no damage from this genre"
              >
                <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-300/65">Immunity</div>
                <div className="flex items-center justify-between gap-2">
                  <GenreBadge genre={monster.resistance} className="rounded px-2 py-0.5 text-xs" />
                  <span className="font-display text-xl leading-none text-slate-200">×0</span>
                </div>
              </div>
            )}
          </div>

          {isDefeated && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/45">
              <div className="rounded-full border border-green-300/30 bg-green-950/70 px-4 py-2 font-medieval text-lg font-bold tracking-wider text-green-300"
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
