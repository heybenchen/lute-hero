import { useState, useEffect } from 'react'
import { DamageCalculation, Monster } from '@/types'

export interface DamagePopupEntry {
  id: string
  monsterId: string
  monsterName: string
  damage: number
  isCrit: boolean
  isKill: boolean
  x: number // 0-based index for horizontal offset
}

interface DamagePopupProps {
  entries: DamagePopupEntry[]
  onComplete: (id: string) => void
}

export function DamagePopups({ entries, onComplete }: DamagePopupProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {entries.map((entry) => (
        <FloatingNumber key={entry.id} entry={entry} onComplete={onComplete} />
      ))}
    </div>
  )
}

function FloatingNumber({ entry, onComplete }: { entry: DamagePopupEntry; onComplete: (id: string) => void }) {
  const [phase, setPhase] = useState<'enter' | 'float' | 'exit'>('enter')

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('float'), 50)
    const exitTimer = setTimeout(() => setPhase('exit'), 1200)
    const removeTimer = setTimeout(() => onComplete(entry.id), 1800)
    return () => {
      clearTimeout(enterTimer)
      clearTimeout(exitTimer)
      clearTimeout(removeTimer)
    }
  }, [entry.id, onComplete])

  const baseX = 50 + (entry.x - 1) * 22 // spread across screen horizontally
  const jitterX = ((parseInt(entry.id.slice(-4), 16) || 0) % 30) - 15 // deterministic jitter

  return (
    <div
      className="absolute transition-all"
      style={{
        left: `${baseX + jitterX}%`,
        top: phase === 'enter' ? '55%' : phase === 'float' ? '30%' : '22%',
        transform: `translateX(-50%) scale(${phase === 'enter' ? 0.5 : phase === 'float' ? 1 : 0.8})`,
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'enter'
          ? 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
          : 'all 0.6s ease-out',
      }}
    >
      <div className="text-center">
        {/* Damage number */}
        <div
          className={`font-bold tabular-nums leading-none ${
            entry.isKill
              ? 'text-green-400 text-5xl'
              : entry.isCrit
              ? 'text-gold-300 text-5xl'
              : 'text-red-400 text-4xl'
          }`}
          style={{
            textShadow: entry.isKill
              ? '0 0 20px rgba(74, 222, 128, 0.6), 0 2px 8px rgba(0,0,0,0.8)'
              : entry.isCrit
              ? '0 0 20px rgba(240, 215, 140, 0.6), 0 2px 8px rgba(0,0,0,0.8)'
              : '0 0 12px rgba(232, 80, 80, 0.4), 0 2px 8px rgba(0,0,0,0.8)',
            WebkitTextStroke: entry.isCrit || entry.isKill ? '1px rgba(0,0,0,0.3)' : undefined,
          }}
        >
          -{entry.damage}
        </div>

        {/* Label */}
        {entry.isCrit && !entry.isKill && (
          <div
            className="text-gold-400 font-medieval font-bold text-sm mt-1 tracking-wider uppercase"
            style={{ textShadow: '0 0 8px rgba(240, 215, 140, 0.4)' }}
          >
            Critical!
          </div>
        )}
        {entry.isKill && (
          <div
            className="text-green-400 font-medieval font-bold text-sm mt-1 tracking-wider uppercase"
            style={{ textShadow: '0 0 8px rgba(74, 222, 128, 0.4)' }}
          >
            Defeated!
          </div>
        )}

        {/* Monster name */}
        <div className="text-parchment-500 text-xs mt-0.5 opacity-80">
          {entry.monsterName}
        </div>
      </div>
    </div>
  )
}

/** Build popup entries from damage calculations + monster states */
export function createDamagePopups(
  calculations: DamageCalculation[],
  monstersBeforeDamage: Monster[],
  monstersAfterDamage: Monster[],
): DamagePopupEntry[] {
  return calculations.map((calc, idx) => {
    const monsterBefore = monstersBeforeDamage[idx]
    const monsterAfter = monstersAfterDamage[idx]
    if (!monsterBefore || !monsterAfter) return null

    // Skip if monster was already dead
    if (monsterBefore.currentHP <= 0) return null

    return {
      id: `dmg-${monsterBefore.id}-${Date.now()}-${idx}`,
      monsterId: monsterBefore.id,
      monsterName: monsterBefore.name,
      damage: calc.totalDamage,
      isCrit: calc.critBonuses > 0,
      isKill: monsterAfter.currentHP <= 0 && monsterBefore.currentHP > 0,
      x: idx,
    }
  }).filter((e): e is DamagePopupEntry => e !== null && e.damage > 0)
}
