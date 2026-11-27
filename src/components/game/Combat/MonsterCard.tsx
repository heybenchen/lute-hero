import { Monster, Element } from '@/types'
import { ElementBadge } from '@/components/ui/ElementBadge'
import { Crown } from 'lucide-react'
import { MONSTER_LEVEL_SPRITES } from '@/assets/combat/levels'

interface MonsterCardProps {
  monster: Monster
  index?: number
  /** Fame this monster is worth if defeated, at the player's current fame tier */
  fameValue?: number
  /** When true, the card is the chosen single-target for the next song. */
  isSelected?: boolean
  /** When set, the card is clickable to become the combat target. */
  onSelect?: () => void
  /** Most recent damage dealt to this monster, shown as a trailing HP-loss segment. */
  lastDamage?: number
}

const glowByElement: Record<Element, string> = {
  Ballad: 'rgba(232, 32, 64, .55)',
  Folk: 'rgba(76, 175, 80, .55)',
  Hymn: 'rgba(186, 230, 253, .55)',
  Shanty: 'rgba(41, 121, 255, .55)',
}

export function MonsterCard({ monster, index = 0, fameValue, isSelected = false, onSelect, lastDamage }: MonsterCardProps) {
  const hpPercent = Math.max(0, (monster.currentHP / monster.maxHP) * 100)
  const lastDamagePercent = lastDamage
    ? Math.min(lastDamage, monster.maxHP - Math.max(0, monster.currentHP)) / monster.maxHP * 100
    : 0
  const isDefeated = monster.currentHP <= 0
  const spriteElement = monster.vulnerability ?? monster.resistance ?? 'Ballad'
  const spriteLevel = Math.min(5, Math.max(1, monster.level))
  const sprite = MONSTER_LEVEL_SPRITES[spriteElement][spriteLevel - 1]
  const selectable = !!onSelect && !isDefeated
  const TargetCard = selectable ? 'button' : 'div'

  return (
    <div
      className="pixel-monster-slot animate-slide-up"
      style={{
        animationDelay: `${index * 80}ms`,
        animationFillMode: 'both',
        '--monster-glow': glowByElement[spriteElement],
      } as React.CSSProperties}
    >
      <TargetCard
        onClick={selectable ? onSelect : undefined}
        type={selectable ? 'button' : undefined}
        aria-pressed={selectable ? isSelected : undefined}
        className={`pixel-monster-card-target ${selectable ? 'cursor-pointer' : ''} ${isSelected ? 'is-targeted' : ''} ${isDefeated ? 'is-defeated' : ''}`}
      >
        <div className="pixel-monster-target">
          <img
            className="pixel-monster-sprite"
            src={sprite}
            alt={`${monster.name}, level ${monster.level}`}
          />
          {isDefeated && <span className="pixel-defeated-label">TAMED</span>}
        </div>

        <div className={`pixel-stat-panel mx-auto w-full max-w-[18.5rem] ${isSelected ? 'is-targeted' : ''}`}>
          <div className="pixel-stat-heading">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <div className="truncate font-['MedievalSharp:Regular'] text-base leading-tight text-[#fff0c2] sm:text-lg">
                  {monster.name}
                </div>
              </div>
              <div className="mt-0.5 flex items-center gap-2 font-['Spectral:Bold'] text-[9px] uppercase tracking-[0.12em] text-[#d4b77d]">
                {monster.isBoss && <span className="flex items-center gap-1"><Crown size={9} /> Boss</span>}
                {!!fameValue && (
                  <span className="rounded-sm border border-gold-400/45 bg-gold-500/15 px-1.5 py-0.5 text-gold-200 shadow-[0_0_8px_rgba(212,168,83,0.16)]">
                    {fameValue} Fame
                  </span>
                )}
              </div>
            </div>
            <span className="shrink-0 font-['Cinzel:Bold'] text-[10px] uppercase tracking-[0.12em] text-[#f0d78c]">
              Lv {monster.level}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="pixel-hp-track !mt-0 flex-1" aria-label={`${Math.max(0, monster.currentHP)} of ${monster.maxHP} Resolve`}>
              <span className="pixel-hp-current" style={{ width: `${hpPercent}%` }} />
              {lastDamagePercent > 0 && (
                <span
                  className="pixel-hp-last-hit"
                  style={{ left: `${hpPercent}%`, width: `${lastDamagePercent}%` }}
                  title={`${lastDamage} Resolve lost from the last song`}
                />
              )}
            </div>
            <span className="shrink-0 font-['MedievalSharp:Regular'] text-base tabular-nums text-[#f8f3e8]">
              {Math.max(0, monster.currentHP)}<small className="text-[9px] text-[#b9a47f]">/{monster.maxHP}</small>
            </span>
          </div>

          <div className="pixel-matchups">
            {monster.vulnerability && (
              <div title="Weak — songs of this element count double">
                <strong className="!ml-0 text-[#9af0a2]">×2</strong>
                <ElementBadge element={monster.vulnerability} className="rounded-none px-1.5 py-0.5 text-[10px]" />
              </div>
            )}
            {monster.resistance && (
              <div title="Immune — songs of this element count for nothing">
                <strong className="!ml-0 text-[#d8e0ea]">×0</strong>
                <ElementBadge element={monster.resistance} className="rounded-none px-1.5 py-0.5 text-[10px]" />
              </div>
            )}
          </div>
        </div>
      </TargetCard>
    </div>
  )
}
