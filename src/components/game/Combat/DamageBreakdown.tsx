import { DamageCalculation, Monster } from '@/types'
import { GenreBadge } from '@/components/ui/GenreBadge'

interface DamageBreakdownProps {
  calculations: DamageCalculation[]
  monsters: Monster[]
}

export function DamageBreakdown({ calculations, monsters }: DamageBreakdownProps) {
  if (calculations.length === 0) return null

  return (
    <div className="bg-wood-100 p-4 rounded-lg space-y-3">
      <h3 className="font-medieval text-lg text-wood-600 mb-3">
        📊 Damage Breakdown
      </h3>

      {calculations.map((calc, idx) => {
        const monster = monsters[idx]
        if (!monster) return null

        return (
          <div key={idx} className="bg-parchment-100 p-3 rounded-lg border-2 border-wood-400">
            <div className="font-bold text-wood-600 mb-2 flex items-center gap-2">
              <span>{monster.name}</span>
              {calc.totalDamage > 0 && (
                <span className="text-red-600">-{calc.totalDamage} HP</span>
              )}
            </div>

            <div className="space-y-1 text-sm">
              {/* Base damage from dice */}
              <div className="flex justify-between">
                <span className="text-wood-500">Base Dice Rolls:</span>
                <span className="font-mono font-bold">{calc.baseDamage}</span>
              </div>

              {/* Crit bonuses */}
              {calc.critBonuses > 0 && (
                <div className="flex justify-between text-yellow-700">
                  <span>Critical Hit Bonuses:</span>
                  <span className="font-mono font-bold">+{calc.critBonuses}</span>
                </div>
              )}

              {/* Genre multipliers */}
              {calc.genreMultipliers.length > 0 && (
                <div className="border-t border-wood-300 pt-1 mt-1">
                  <div className="text-xs text-wood-500 mb-1">Genre Multipliers:</div>
                  {calc.genreMultipliers.map((gm, gmIdx) => (
                    <div key={gmIdx} className="flex justify-between items-center pl-2">
                      <div className="flex items-center gap-1">
                        <GenreBadge genre={gm.genre} className="text-xs" />
                        {gm.multiplier === 2 && (
                          <span className="text-green-600 text-xs">VULNERABLE</span>
                        )}
                        {gm.multiplier === 0.5 && (
                          <span className="text-red-600 text-xs">RESISTANT</span>
                        )}
                      </div>
                      <span className={`font-mono text-xs ${
                        gm.multiplier === 2 ? 'text-green-600' :
                        gm.multiplier === 0.5 ? 'text-red-600' :
                        'text-wood-600'
                      }`}>
                        ×{gm.multiplier}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Effect bonuses */}
              {calc.effectBonuses > 0 && (
                <div className="flex justify-between text-purple-700">
                  <span>Track Effect Bonuses:</span>
                  <span className="font-mono font-bold">+{calc.effectBonuses}</span>
                </div>
              )}

              {/* Total */}
              <div className="border-t-2 border-wood-500 pt-2 mt-2 flex justify-between text-lg font-bold">
                <span>Total Damage:</span>
                <span className="text-red-600">{calc.totalDamage}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
