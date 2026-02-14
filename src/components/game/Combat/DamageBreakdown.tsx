import { DamageCalculation, Monster } from '@/types'
import { GenreBadge } from '@/components/ui/GenreBadge'

interface DamageBreakdownProps {
  calculations: DamageCalculation[]
  monsters: Monster[]
}

export function DamageBreakdown({ calculations, monsters }: DamageBreakdownProps) {
  if (calculations.length === 0) return null

  return (
    <div className="p-4 rounded-lg" style={{ background: 'rgba(61, 48, 32, 0.4)', border: '1px solid rgba(212, 168, 83, 0.15)' }}>
      <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider mb-2">
        Damage Breakdown
      </div>

      <div className="space-y-2">
        {calculations.map((calc, idx) => {
          const monster = monsters[idx]
          if (!monster) return null

          return (
            <div key={idx} className="p-2 rounded" style={{ background: 'rgba(42, 33, 24, 0.6)', border: '1px solid rgba(212, 168, 83, 0.1)' }}>
              {/* Monster name and total damage */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-parchment-200">{monster.name}</span>
                <span className="text-red-400 font-bold text-base">-{calc.totalDamage} HP</span>
              </div>

              {/* Compact damage formula */}
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-parchment-500 text-xs">Rolls:</span>
                  {calc.genreMultipliers.map((gm, gmIdx) => (
                    <div key={gmIdx} className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(212, 168, 83, 0.08)', border: '1px solid rgba(212, 168, 83, 0.1)' }}
                    >
                      <GenreBadge genre={gm.genre} className="text-[10px] px-1.5 py-0.5" />
                      {gm.multiplier !== 1 && (
                        <span className={`font-bold text-xs ${
                          gm.multiplier === 2 ? 'text-green-400' :
                          gm.multiplier === 0.5 ? 'text-red-400' :
                          'text-parchment-300'
                        }`}>
                          x{gm.multiplier}
                        </span>
                      )}
                    </div>
                  ))}
                  {calc.critBonuses > 0 && (
                    <span className="text-gold-400 font-bold text-xs">+ {calc.critBonuses} crit</span>
                  )}
                  {calc.effectBonuses > 0 && (
                    <span className="text-classical font-bold text-xs">+ {calc.effectBonuses} effects</span>
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
