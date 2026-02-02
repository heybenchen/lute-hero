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
      className={`card ${isDefeated ? 'opacity-50 grayscale' : ''} min-w-[200px]`}
    >
      <div className="card-header text-lg">
        {monster.name}
        {monster.isElite && <span className="ml-2 text-yellow-600">⭐</span>}
        {monster.isBoss && <span className="ml-2 text-purple-600">👑</span>}
      </div>

      {/* HP Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span>HP</span>
          <span className="font-bold">
            {monster.currentHP} / {monster.maxHP}
          </span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full transition-all ${
              hpPercent > 50
                ? 'bg-green-500'
                : hpPercent > 25
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.max(0, hpPercent)}%` }}
          />
        </div>
      </div>

      {/* Vulnerabilities */}
      {monster.vulnerabilities.length > 0 && (
        <div className="mb-2">
          <div className="text-xs font-bold text-green-700 mb-1">
            Vulnerable to (2x):
          </div>
          <div className="flex flex-wrap gap-1">
            {monster.vulnerabilities.map((genre, idx) => (
              <GenreBadge key={idx} genre={genre} />
            ))}
          </div>
        </div>
      )}

      {/* Resistances */}
      {monster.resistances.length > 0 && (
        <div>
          <div className="text-xs font-bold text-red-700 mb-1">
            Resistant to (0.5x):
          </div>
          <div className="flex flex-wrap gap-1">
            {monster.resistances.map((genre, idx) => (
              <GenreBadge key={idx} genre={genre} />
            ))}
          </div>
        </div>
      )}

      {isDefeated && (
        <div className="mt-3 text-center text-green-600 font-bold">
          CONVERTED! 🎵
        </div>
      )}
    </div>
  )
}
