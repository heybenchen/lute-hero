import { DamageCalculation, Monster } from '@/types'
import { GenreBadge } from '@/components/ui/GenreBadge'

interface DamageBreakdownProps {
  calculations: DamageCalculation[]
  monsters: Monster[]
}

/** Format a multiplier compactly: 0 → "0×", others → "×2", "×0.5", etc. */
function formatMultiplier(multiplier: number): string {
  return multiplier === 0 ? '0×' : `×${multiplier}`
}

export function DamageBreakdown({ calculations, monsters }: DamageBreakdownProps) {
  if (calculations.length === 0) return null

  return (
    <div
      className="rounded-xl overflow-hidden animate-scale-in"
      style={{
        background: 'rgba(42, 33, 24, 0.5)',
        border: '1px solid rgba(212, 168, 83, 0.15)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {calculations.map((calc, idx) => {
            const monster = monsters[idx]
            if (!monster) return null
            const isKill = monster.currentHP <= 0

            return (
              <div
                key={idx}
                className="p-2 rounded-lg flex flex-col items-center gap-1.5 text-center"
                style={{
                  background: isKill ? 'rgba(45, 140, 48, 0.06)' : 'rgba(30, 24, 18, 0.5)',
                  border: `1px solid ${isKill ? 'rgba(76, 175, 80, 0.15)' : 'rgba(212, 168, 83, 0.08)'}`,
                }}
              >
                {/* Monster name + KO */}
                <div className="flex items-center justify-center gap-1 max-w-full">
                  <span className="font-bold text-xs text-parchment-200 truncate">{monster.name}</span>
                  {isKill && (
                    <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-1 py-0.5 rounded shrink-0">
                      KO
                    </span>
                  )}
                </div>

                {/* Damage total */}
                <span className="text-red-400 font-bold text-lg leading-none tabular-nums"
                  style={{ textShadow: '0 0 6px rgba(232, 80, 80, 0.2)' }}
                >
                  -{calc.totalDamage}
                </span>

                {/* Per-die math breakdown */}
                <div className="flex flex-col items-center gap-1 w-full">
                  {calc.perDie.map((die, dieIdx) => (
                    <div
                      key={dieIdx}
                      className="flex items-center justify-center gap-1 px-1 py-0.5 rounded text-[10px] tabular-nums"
                      style={{ background: 'rgba(212, 168, 83, 0.06)', border: '1px solid rgba(212, 168, 83, 0.08)' }}
                    >
                      {die.genre && <GenreBadge genre={die.genre} className="text-[9px] px-1 py-0 rounded" />}
                      <span className="text-parchment-300">{die.value}</span>
                      {die.critBonus > 0 && <span className="text-gold-400">+{die.critBonus}</span>}
                      {die.multiplier !== 1 && (
                        <span
                          className="font-bold"
                          style={{ color: die.multiplier === 0 ? '#cbd5e1' : die.multiplier > 1 ? '#f5c542' : '#f0a35a' }}
                        >
                          {formatMultiplier(die.multiplier)}
                        </span>
                      )}
                      <span className="text-parchment-500">=</span>
                      <span className="font-bold text-parchment-100">{Math.round(die.damage)}</span>
                    </div>
                  ))}
                  {calc.effectBonuses > 0 && (
                    <span className="text-[10px] font-bold text-classical px-1 py-0.5 rounded"
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
    </div>
  )
}
