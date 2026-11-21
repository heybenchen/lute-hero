import { maxMonsterLevel, getMonsterNameWithLevel, monsterSpawnHp } from '@/game-logic/combat/monsterSpawner'
import { calculateMonsterFameValue, calculateMonsterExp } from '@/game-logic/fame/calculator'

/**
 * Reference table of what each monster level is worth. Every number is pulled
 * from the same functions the engine uses, so it can't drift from real play.
 * A monster's level equals the number of matching genre chips on its space.
 */

const LEVELS = Array.from({ length: maxMonsterLevel() }, (_, i) => i + 1)

export function MonsterLevelTable({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <table className="w-full text-xs tabular-nums border-collapse">
        <thead>
          <tr className="text-gold-300 font-medieval uppercase tracking-wider text-[10px]">
            <th className="text-left py-1 pr-2 font-bold">Level</th>
            <th className="text-right py-1 px-2 font-bold" title="Hit points at this level">❤ HP</th>
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
              <td className="text-right py-1 px-2 text-parchment-300">{monsterSpawnHp(level)}</td>
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
