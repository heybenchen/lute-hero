import { DamageCalculation, Monster } from '@/types'

interface DamageCellProps {
  calc: DamageCalculation
  monster: Monster
  genreNotes?: string[]
}

/** Format a multiplier compactly: 0 → "0×", others → "×2", "×0.5", etc. */
function formatMultiplier(multiplier: number): string {
  return multiplier === 0 ? '0×' : `×${multiplier}`
}

/**
 * The most recent song's damage, kept in the combat header so it never changes
 * the height of an individual monster column.
 */
export function DamageCell({ calc, monster, genreNotes = [] }: DamageCellProps) {
  return (
    <div className="pixel-last-hit animate-fade-in">
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="min-w-0 flex-1 text-left">
          <div className="font-['Cinzel:Bold'] text-[10px] uppercase tracking-[0.18em] text-[#a88953]">Last hit</div>
          <div className="mt-0.5 truncate font-['Spectral:Bold'] text-sm leading-tight text-[#e8d9b8]">{monster.name}</div>
        </div>
        <span className="shrink-0 text-right font-['MedievalSharp:Regular'] text-2xl leading-none tabular-nums text-red-400"
          style={{ textShadow: '0 0 6px rgba(232, 80, 80, 0.2)' }}
        >
          -{calc.totalDamage} Resolve
        </span>
      </div>

      {/* Per-die math — numbers only, no element tags */}
      <div className="mt-2 flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1 border-t border-gold-700/20 pt-1.5">
        {(calc.perDie ?? []).map((die, dieIdx) => (
          <div key={dieIdx} className="flex items-center justify-end gap-1 text-xs tabular-nums">
            <span className="text-parchment-300">{die.value}</span>
            {/* Flat genre bonus (Opera, Screamo, Barbershop) */}
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
        {genreNotes.map((name) => (
          <span key={name} className="text-[11px] text-gold-300/80">&#x266A; {name}</span>
        ))}
      </div>
    </div>
  )
}
