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
      className={`card min-w-[180px] p-3 transition-all duration-300 ${isDefeated ? 'opacity-40 grayscale' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="font-medieval text-sm font-bold text-gold-400 truncate flex-1">
          {monster.name}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {monster.isElite && <span className="text-gold-400 text-[10px]">&#x2605;</span>}
          {monster.isBoss && <span className="text-classical text-[10px]">&#x265B;</span>}
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-parchment-400">HP</span>
          <span className="font-bold text-parchment-200">
            {monster.currentHP}/{monster.maxHP}
          </span>
        </div>
        <div className="hp-bar h-2.5">
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

      {/* Vulnerability & Resistance inline */}
      <div className="flex gap-2 text-[11px]">
        {monster.vulnerability && (
          <div className="flex-1">
            <div className="font-bold text-green-400 mb-0.5">2x:</div>
            <GenreBadge genre={monster.vulnerability} className="text-[10px] px-1.5 py-0.5" />
          </div>
        )}
        {monster.resistance && (
          <div className="flex-1">
            <div className="font-bold text-red-400 mb-0.5">0.5x:</div>
            <GenreBadge genre={monster.resistance} className="text-[10px] px-1.5 py-0.5" />
          </div>
        )}
      </div>

      {isDefeated && (
        <div className="mt-2 text-center font-medieval font-bold text-green-400 text-xs">
          CONVERTED &#x266B;
        </div>
      )}
    </div>
  )
}
