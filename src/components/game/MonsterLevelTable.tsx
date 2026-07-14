import { MONSTER_TEMPLATES } from '@/data/monsters'
import { getHPMultiplier, MAX_MONSTER_LEVEL, getMonsterNameWithLevel } from '@/game-logic/combat/monsterSpawner'
import { calculateMonsterFameValue, calculateMonsterExp } from '@/game-logic/fame/calculator'

/**
 * Reference table of what each monster level is worth. Every number is pulled
 * from the same functions the engine uses, so it can't drift from real play.
 * A monster's level equals the number of matching genre chips on its space.
 */

// Base-HP range across the (non-boss) monster templates, so the Health column
// can show a real range instead of an abstract multiplier.
const baseHPs = MONSTER_TEMPLATES.filter((t) => !t.isBoss).map((t) => t.baseHP ?? 0)
const MIN_BASE_HP = Math.min(...baseHPs)
const MAX_BASE_HP = Math.max(...baseHPs)

const LEVELS = Array.from({ length: MAX_MONSTER_LEVEL }, (_, i) => i + 1)

function healthRange(level: number): string {
  const mult = getHPMultiplier(level)
  const lo = Math.floor(MIN_BASE_HP * mult)
  const hi = Math.floor(MAX_BASE_HP * mult)
  return lo === hi ? `${lo}` : `${lo}–${hi}`
}

export function MonsterLevelTable({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <table className="w-full text-xs tabular-nums border-collapse">
        <thead>
          <tr className="text-gold-300 font-medieval uppercase tracking-wider text-[10px]">
            <th className="text-left py-1 pr-2 font-bold">Level</th>
            <th className="text-right py-1 px-2 font-bold" title="Hit points (varies by monster)">❤ HP</th>
            <th className="text-right py-1 px-2 font-bold" title="Fame awarded on defeat">⭐ Fame</th>
            <th className="text-right py-1 pl-2 font-bold" title="EXP awarded on defeat">✨ EXP</th>
          </tr>
        </thead>
        <tbody>
          {LEVELS.map((level) => (
            <tr
              key={level}
              className="border-t"
              style={{ borderColor: 'rgba(212, 168, 83, 0.12)' }}
            >
              <td className="text-left py-1 pr-2 text-parchment-200">
                Lv.{level}
                <span className="text-parchment-500 ml-1.5">
                  {getMonsterNameWithLevel('', level).trim() || 'Base'}
                </span>
              </td>
              <td className="text-right py-1 px-2 text-parchment-300">{healthRange(level)}</td>
              <td className="text-right py-1 px-2 text-gold-400 font-bold">{calculateMonsterFameValue(level)}</td>
              <td className="text-right py-1 pl-2 text-classical font-bold">{calculateMonsterExp(level)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-parchment-500 italic">
        A monster's level equals how many of its element's chips sit on the space.
      </p>
    </div>
  )
}
