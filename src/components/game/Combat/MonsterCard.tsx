import { Monster } from '@/types'
import { GenreBadge } from '@/components/ui/GenreBadge'

interface MonsterCardProps {
  monster: Monster
}

export function MonsterCard({ monster }: MonsterCardProps) {
  const hpPercent = (monster.currentHP / monster.maxHP) * 100
  const isDefeated = monster.currentHP <= 0

  return (
    <div
      className={`card min-w-[190px] transition-all duration-300 ${isDefeated ? 'opacity-40 grayscale' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-medieval text-base font-bold text-gold-400 truncate">
          {monster.name}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {monster.isElite && <span className="text-gold-400 text-sm">&#x2605;</span>}
          {monster.isBoss && <span className="text-classical text-sm">&#x265B;</span>}
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-parchment-400">HP</span>
          <span className="font-bold text-parchment-200">
            {monster.currentHP} / {monster.maxHP}
          </span>
        </div>
        <div className="hp-bar">
          <div
            className="hp-fill"
            style={{
              width: `${Math.max(0, hpPercent)}%`,
              background: hpPercent > 50
                ? 'linear-gradient(90deg, #2d8c30, #4caf50)'
                : hpPercent > 25
                ? 'linear-gradient(90deg, #b8922e, #e6c35a)'
                : 'linear-gradient(90deg, #c43030, #e85050)',
            }}
          />
        </div>
      </div>

      {/* Vulnerability */}
      {monster.vulnerability && (
        <div className="mb-2">
          <div className="text-[10px] font-bold text-green-400 mb-1">
            Vulnerable (2x):
          </div>
          <GenreBadge genre={monster.vulnerability} className="text-[10px]" />
        </div>
      )}

      {/* Resistance */}
      {monster.resistance && (
        <div>
          <div className="text-[10px] font-bold text-red-400 mb-1">
            Resistant (0.5x):
          </div>
          <GenreBadge genre={monster.resistance} className="text-[10px]" />
        </div>
      )}

      {isDefeated && (
        <div className="mt-3 text-center font-medieval font-bold text-green-400 text-sm">
          CONVERTED &#x266B;
        </div>
      )}
    </div>
  )
}
