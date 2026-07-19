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
    <div className="w-full p-2 rounded-lg flex flex-col items-center gap-1 text-center animate-scale-in"
      style={{ border: '1px solid rgba(212, 168, 83, 0.12)' }}
    >
      {/* Damage total */}
      <span className="text-red-400 font-bold text-lg leading-none tabular-nums"
        style={{ textShadow: '0 0 6px rgba(232, 80, 80, 0.2)' }}
      >
        -{calc.totalDamage}
      </span>

      {/* Per-die math — numbers only, no genre tags */}
      <div className="flex flex-col items-center gap-0.5 w-full">
        {(calc.perDie ?? []).map((die, dieIdx) => (
          <div key={dieIdx} className="flex items-center justify-center flex-wrap gap-1 text-[10px] tabular-nums">
            <span className="text-parchment-300">{die.value}</span>
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
