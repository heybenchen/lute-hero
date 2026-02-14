import { DamageCalculation, Monster } from '@/types'
import { GenreBadge } from '@/components/ui/GenreBadge'

interface DamageBreakdownProps {
  calculations: DamageCalculation[]
  monsters: Monster[]
}

export function DamageBreakdown({ calculations, monsters }: DamageBreakdownProps) {
  if (calculations.length === 0) return null

  const totalAllDamage = calculations.reduce((sum, c) => sum + c.totalDamage, 0)

  return (
    <div
      className="rounded-xl overflow-hidden animate-scale-in"
      style={{
        background: 'rgba(42, 33, 24, 0.5)',
        border: '1px solid rgba(212, 168, 83, 0.15)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3.5"
        style={{ background: 'rgba(30, 24, 18, 0.6)', borderBottom: '1px solid rgba(212, 168, 83, 0.1)' }}
      >
        <div className="text-sm font-medieval text-parchment-400 uppercase tracking-wider">
          Damage Report
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-parchment-500">Total</span>
          <span className="text-xl font-bold text-red-400 tabular-nums"
            style={{ textShadow: '0 0 8px rgba(232, 80, 80, 0.3)' }}
          >
            -{totalAllDamage}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {calculations.map((calc, idx) => {
          const monster = monsters[idx]
          if (!monster) return null
          const isKill = monster.currentHP <= 0

          return (
            <div
              key={idx}
              className="p-4 rounded-lg"
              style={{
                background: isKill ? 'rgba(45, 140, 48, 0.06)' : 'rgba(30, 24, 18, 0.5)',
                border: `1px solid ${isKill ? 'rgba(76, 175, 80, 0.15)' : 'rgba(212, 168, 83, 0.08)'}`,
              }}
            >
              {/* Monster name and damage */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-lg text-parchment-200">{monster.name}</span>
                  {isKill && (
                    <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                      KO
                    </span>
                  )}
                </div>
                <span className="text-red-400 font-bold text-xl tabular-nums"
                  style={{ textShadow: '0 0 6px rgba(232, 80, 80, 0.2)' }}
                >
                  -{calc.totalDamage}
                </span>
              </div>

              {/* Damage formula row */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {calc.genreMultipliers.map((gm, gmIdx) => (
                  <div key={gmIdx} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(212, 168, 83, 0.06)', border: '1px solid rgba(212, 168, 83, 0.08)' }}
                  >
                    <GenreBadge genre={gm.genre} className="text-xs px-2 py-0.5 rounded" />
                    {gm.multiplier !== 1 && (
                      <span className={`font-bold text-sm ${
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
                  <span className="text-sm font-bold text-gold-400 px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(230, 195, 90, 0.08)', border: '1px solid rgba(230, 195, 90, 0.12)' }}
                  >
                    +{calc.critBonuses} crit
                  </span>
                )}
                {calc.effectBonuses > 0 && (
                  <span className="text-sm font-bold text-classical px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(176, 124, 255, 0.08)', border: '1px solid rgba(176, 124, 255, 0.12)' }}
                  >
                    +{calc.effectBonuses} fx
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
