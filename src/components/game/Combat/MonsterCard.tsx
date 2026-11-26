import { Monster, Genre } from '@/types'
import { GenreBadge } from '@/components/ui/GenreBadge'
import { calculateMonsterExp } from '@/game-logic/fame/calculator'
import { Crown } from 'lucide-react'
import emberSprite from '@/assets/combat/ember.png'
import golemSprite from '@/assets/combat/golem.png'
import harpySprite from '@/assets/combat/harpy.png'
import serpentSprite from '@/assets/combat/serpent.png'

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

const spriteByGenre: Record<Genre, string> = {
  Ballad: emberSprite,
  Folk: golemSprite,
  Hymn: harpySprite,
  Shanty: serpentSprite,
}

const glowByGenre: Record<Genre, string> = {
  Ballad: 'rgba(232, 32, 64, .55)',
  Folk: 'rgba(76, 175, 80, .55)',
  Hymn: 'rgba(186, 230, 253, .55)',
  Shanty: 'rgba(41, 121, 255, .55)',
}

export function MonsterCard({ monster, index = 0, fameValue, isSelected = false, onSelect }: MonsterCardProps) {
  const hpPercent = Math.max(0, (monster.currentHP / monster.maxHP) * 100)
  const isDefeated = monster.currentHP <= 0
  const spriteGenre = monster.vulnerability ?? monster.resistance ?? 'Ballad'
  const selectable = !!onSelect && !isDefeated
  const TargetCard = selectable ? 'button' : 'div'

  return (
    <div
      className="pixel-monster-slot animate-slide-up"
      style={{
        animationDelay: `${index * 80}ms`,
        animationFillMode: 'both',
        '--monster-glow': glowByGenre[spriteGenre],
      } as React.CSSProperties}
    >
      <TargetCard
        onClick={selectable ? onSelect : undefined}
        type={selectable ? 'button' : undefined}
        aria-pressed={selectable ? isSelected : undefined}
        className={`pixel-monster-target ${selectable ? 'cursor-pointer' : ''} ${isSelected ? 'is-targeted' : ''} ${isDefeated ? 'is-defeated' : ''}`}
      >
        <span className="pixel-monster-level">LV {monster.level}</span>
        <img
          className="pixel-monster-sprite"
          src={spriteByGenre[spriteGenre]}
          alt={`${monster.name}, level ${monster.level}`}
        />
        {isDefeated && <span className="pixel-defeated-label">TAMED</span>}
      </TargetCard>

      <div className={`pixel-stat-panel ${isSelected ? 'is-targeted' : ''}`}>
        <div className="pixel-stat-heading">
          <div className="min-w-0">
            <div className="truncate font-['MedievalSharp:Regular'] text-base leading-tight text-[#fff0c2] sm:text-lg">
              {monster.name}
            </div>
            <div className="mt-0.5 flex items-center gap-2 font-['Spectral:Bold'] text-[9px] uppercase tracking-[0.12em] text-[#d4b77d]">
              {monster.isBoss && <span className="flex items-center gap-1"><Crown size={9} /> Boss</span>}
              {!!fameValue && <span>{fameValue} Fame</span>}
              <span>{calculateMonsterExp(monster.level)} EXP</span>
            </div>
          </div>
          <span className="font-['MedievalSharp:Regular'] text-lg tabular-nums text-[#f8f3e8]">
            {Math.max(0, monster.currentHP)}<small className="text-[10px] text-[#b9a47f]">/{monster.maxHP}</small>
          </span>
        </div>

        <div className="pixel-hp-track" aria-label={`${Math.max(0, monster.currentHP)} of ${monster.maxHP} Resolve`}>
          <span style={{ width: `${hpPercent}%` }} />
        </div>

        <div className="pixel-matchups">
          {monster.vulnerability && (
            <div title="Weak — songs of this element count double">
              <span className="pixel-matchup-label">Weak</span>
              <GenreBadge genre={monster.vulnerability} className="rounded-none px-1.5 py-0.5 text-[10px]" />
              <strong className="text-[#9af0a2]">×2</strong>
            </div>
          )}
          {monster.resistance && (
            <div title="Immune — songs of this element count for nothing">
              <span className="pixel-matchup-label">Null</span>
              <GenreBadge genre={monster.resistance} className="rounded-none px-1.5 py-0.5 text-[10px]" />
              <strong className="text-[#d8e0ea]">×0</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
