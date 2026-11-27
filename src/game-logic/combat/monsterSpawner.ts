import { BoardSpace, Monster, Element, MonsterTemplate, Rng, NewId } from '../../types/index.js'
import { getMonsterByElement } from '../../data/monsters.js'
import { getTunables } from '../../data/tunables.js'

/**
 * Count tags by element and find the dominant element
 */
export function countTagsByElement(elementTags: Element[]): Map<Element, number> {
  const counts = new Map<Element, number>()
  elementTags.forEach((tag) => {
    counts.set(tag, (counts.get(tag) || 0) + 1)
  })
  return counts
}

/**
 * Get the dominant genre and its count from tags
 */
export function getDominantElement(elementTags: Element[]): { element: Element; count: number } | null {
  if (elementTags.length === 0) return null

  const counts = countTagsByElement(elementTags)
  let maxElement: Element | null = null
  let maxCount = 0

  counts.forEach((count, element) => {
    if (count > maxCount) {
      maxCount = count
      maxElement = element
    }
  })

  return maxElement ? { element: maxElement, count: maxCount } : null
}

/** Monster levels never exceed this; HP, fame, EXP, and naming all top out here. */
export function maxMonsterLevel(): number {
  return getTunables().maxMonsterLevel
}

/** Clamp any raw level into the valid 1..maxMonsterLevel() range. */
export function clampMonsterLevel(level: number): number {
  return Math.min(Math.max(Math.floor(level), 1), maxMonsterLevel())
}

/**
 * HP multiplier for a monster level. Defaults: Lv1 1x, Lv2 1.75x, Lv3 3x,
 * Lv4 5x, Lv5 7.5x. Levels past the multiplier table reuse its last entry.
 */
export function getHPMultiplier(level: number): number {
  const multipliers = getTunables().hpMultipliers
  const index = Math.min(clampMonsterLevel(level), multipliers.length) - 1
  return multipliers[index] ?? 1
}

/**
 * HP a monster of the given level spawns with. Every monster starts from the
 * same `monsterBaseHp` regardless of template — templates differ only in
 * flavour — scaled by the level multiplier and the global `monsterHpScale`
 * (the debug panel's "make fights faster/slower" dial).
 */
export function monsterSpawnHp(level: number): number {
  const { monsterBaseHp, monsterHpScale } = getTunables()
  return Math.max(1, Math.floor(monsterBaseHp * getHPMultiplier(level) * monsterHpScale))
}

/** Size/power titles that mirror the five visual monster evolutions. */
export const MONSTER_LEVEL_PREFIXES = ['Lesser', '', 'Greater', 'Elder', 'Apex'] as const

/** Get a monster name whose title clearly communicates its level. */
export function getMonsterNameWithLevel(baseName: string, level: number): string {
  const prefix = MONSTER_LEVEL_PREFIXES[clampMonsterLevel(level) - 1]
  return prefix ? `${prefix} ${baseName}` : baseName
}

/**
 * Spawn one monster per unique genre present in tags. A monster's level is
 * simply the count of its element's tags — the same number the board shows on
 * that genre's chip — so what you see on a space matches what you fight.
 * The round parameter only selects tougher templates in later rounds.
 * e.g. [Pop, Pop, Rock] -> 1 Lv2 Pop monster + 1 Lv1 Rock monster
 */
export function spawnMonstersFromTags(
  elementTags: Element[],
  spaceId: number,
  round: number = 1,
  rng: Rng = Math.random,
  newId?: NewId
): Monster[] {
  const counts = countTagsByElement(elementTags)
  const monsters: Monster[] = []
  let index = 0

  counts.forEach((count, element) => {
    const template = getMonsterByElement(element, round, rng)
    const monster = createMonsterFromTemplate(template, spaceId, index, count, newId)
    monsters.push(monster)
    index++
  })

  return monsters
}

/**
 * Spawn monsters for initial board setup — one per unique element chip, exactly
 * like entering the space later, so the starting board's monsters match its
 * chips.
 */
export function spawnInitialMonsters(
  elementTags: Element[],
  spaceId: number,
  round: number = 1,
  rng: Rng = Math.random,
  newId?: NewId
): Monster[] {
  return spawnMonstersFromTags(elementTags, spaceId, round, rng, newId)
}

/**
 * Create a monster instance from a template
 */
export function createMonsterFromTemplate(
  template: MonsterTemplate,
  spaceId: number,
  index: number,
  level: number = 1,
  newId?: NewId
): Monster {
  const cappedLevel = clampMonsterLevel(level)
  const scaledHP = monsterSpawnHp(cappedLevel)

  return {
    id: newId ? newId('monster') : `monster-${spaceId}-${index}-${Date.now()}`,
    templateId: template.id,
    name: getMonsterNameWithLevel(template.name, cappedLevel),
    currentHP: scaledHP,
    maxHP: scaledHP,
    vulnerability: template.vulnerability,
    resistance: template.resistance,
    isBoss: template.isBoss || false,
    level: cappedLevel,
  }
}

/**
 * Clear monsters from a space and reset element tags
 */
export function clearSpace(space: BoardSpace): BoardSpace {
  return {
    ...space,
    monsters: [],
    elementTags: [],
  }
}
