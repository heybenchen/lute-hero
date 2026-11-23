import { DamageCalculation, Monster } from '@/types'

interface DamageCellProps {
  calc: DamageCalculation
  monster: Monster
}

/** Format a multiplier compactly: 0 → "0×", others → "×2", "×0.5", etc. */
function formatMultiplier(multiplier: number): string {
  return multiplier === 0 ? '0×' : `×${multiplier}`
}

/**
 * The damage a single song did to one monster — the total plus a per-die math
 * breakdown. Rendered directly beneath its monster card so the two line up.
 */
export function DamageCell({ calc }: DamageCellProps) {
  return (
    <div className="flex w-full flex-col gap-2 border-l-2 border-red-400/30 py-1.5 pl-3 animate-scale-in">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-parchment-500">Last song</span>
        <span className="text-xl font-bold leading-none tabular-nums text-red-400"
          style={{ textShadow: '0 0 6px rgba(232, 80, 80, 0.2)' }}
        >
          -{calc.totalDamage} Resolve
        </span>
      </div>

      {/* Per-die math — numbers only, no genre tags */}
      <div className="flex w-full flex-col gap-1">
        {(calc.perDie ?? []).map((die, dieIdx) => (
          <div key={dieIdx} className="flex flex-wrap items-center justify-end gap-1 text-xs tabular-nums">
            <span className="text-parchment-300">{die.value}</span>
            {/* Flat style bonus (Fortissimo, Overture, Tutti) */}
            {!!die.bonus && <span className="text-amber-300" title="Style bonus">+{die.bonus}</span>}
            {/* Each cascading crit shown separately */}
            {(die.cascadeRolls ?? []).map((crit, critIdx) => (
              <span key={critIdx} className="text-gold-400">+{crit}</span>
            ))}
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
      </div>
    </div>
  )
}
