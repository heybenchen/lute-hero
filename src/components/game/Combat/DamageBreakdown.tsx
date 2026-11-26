import { DamageCalculation, Monster } from '@/types'

interface DamageCellProps {
  calc: DamageCalculation
  monster: Monster
  styleNotes?: string[]
}

/** Format a multiplier compactly: 0 → "0×", others → "×2", "×0.5", etc. */
function formatMultiplier(multiplier: number): string {
  return multiplier === 0 ? '0×' : `×${multiplier}`
}

/**
 * The most recent song's damage, kept in the combat header so it never changes
 * the height of an individual monster column.
 */
export function DamageCell({ calc, monster, styleNotes = [] }: DamageCellProps) {
  return (
    <div className="pixel-last-hit animate-fade-in">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 text-right">
          <div className="font-['Cinzel:Bold'] text-[8px] uppercase tracking-[0.2em] text-[#a88953]">Last hit</div>
          <div className="truncate font-['Spectral:Regular'] text-xs text-[#d9c49f]">{monster.name}</div>
        </div>
        <span className="shrink-0 font-['MedievalSharp:Regular'] text-xl leading-none tabular-nums text-red-400"
          style={{ textShadow: '0 0 6px rgba(232, 80, 80, 0.2)' }}
        >
          -{calc.totalDamage} Resolve
        </span>
      </div>

      {/* Per-die math — numbers only, no genre tags */}
      <div className="mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
        {(calc.perDie ?? []).map((die, dieIdx) => (
          <div key={dieIdx} className="flex items-center justify-end gap-1 text-[11px] tabular-nums">
            <span className="text-parchment-300">{die.value}</span>
            {/* Flat style bonus (Fortissimo, Overture, Tutti) */}
            {!!die.bonus && <span className="text-amber-300" title="Genre bonus">+{die.bonus}</span>}
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
        {styleNotes.map((name) => (
          <span key={name} className="text-[9px] text-gold-300/80">&#x266A; {name}</span>
        ))}
      </div>
    </div>
  )
}
