import { DamageCalculation, Monster } from '@/types'
import { GenreBadge } from '@/components/ui/GenreBadge'

interface DamageBreakdownProps {
  calculations: DamageCalculation[]
  monsters: Monster[]
}

export function DamageBreakdown({ calculations, monsters }: DamageBreakdownProps) {
  if (calculations.length === 0) return null

  return (
    <div className="bg-wood-100 p-3 rounded-lg">
      <h3 className="font-medieval text-base text-wood-600 mb-2">
        📊 Damage Breakdown
      </h3>

      <div className="space-y-2">
        {calculations.map((calc, idx) => {
          const monster = monsters[idx]
          if (!monster) return null

          return (
            <div key={idx} className="bg-parchment-100 p-2 rounded border border-wood-400">
              {/* Monster name and total damage */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-wood-600">{monster.name}</span>
                <span className="text-red-600 font-bold text-lg">-{calc.totalDamage} HP</span>
              </div>

              {/* Compact damage formula */}
              <div className="text-xs space-y-1">
                {/* Base + Crits */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-wood-500">Rolls:</span>
                  {calc.genreMultipliers.map((gm, gmIdx) => (
                    <div key={gmIdx} className="flex items-center gap-1 bg-parchment-200 px-2 py-0.5 rounded">
                      <GenreBadge genre={gm.genre} className="text-[10px]" />
                      {gm.multiplier !== 1 && (
                        <span className={`font-bold ${
                          gm.multiplier === 2 ? 'text-green-600' :
                          gm.multiplier === 0.5 ? 'text-red-600' :
                          'text-wood-600'
                        }`}>
                          ×{gm.multiplier}
                        </span>
                      )}
                    </div>
                  ))}
                  {calc.critBonuses > 0 && (
                    <span className="text-yellow-600 font-bold">+ {calc.critBonuses} crit</span>
                  )}
                  {calc.effectBonuses > 0 && (
                    <span className="text-purple-600 font-bold">+ {calc.effectBonuses} effects</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
