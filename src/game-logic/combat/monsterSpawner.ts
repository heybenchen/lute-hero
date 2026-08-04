import { BoardSpace, Monster, Genre, MonsterTemplate, Rng, NewId } from '../../types/index.js'
import { getMonsterByGenre } from '../../data/monsters.js'
import { getTunables } from '../../data/tunables.js'

/**
 * Count tags by genre and find the dominant genre
 */
export function countTagsByGenre(genreTags: Genre[]): Map<Genre, number> {
  const counts = new Map<Genre, number>()
  genreTags.forEach((tag) => {
    counts.set(tag, (counts.get(tag) || 0) + 1)
  })
  return counts
}

/**
 * Get the dominant genre and its count from tags
 */
export function getDominantGenre(genreTags: Genre[]): { genre: Genre; count: number } | null {
  if (genreTags.length === 0) return null

  const counts = countTagsByGenre(genreTags)
  let maxGenre: Genre | null = null
  let maxCount = 0

  counts.forEach((count, genre) => {
    if (count > maxCount) {
      maxCount = count
      maxGenre = genre
    }
  })

  return maxGenre ? { genre: maxGenre, count: maxCount } : null
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

/**
 * Get monster name with level prefix
 */
export function getMonsterNameWithLevel(baseName: string, level: number): string {
  if (level === 1) return baseName
  if (level === 2) return `Strong ${baseName}`
  if (level === 3) return `Veteran ${baseName}`
  if (level === 4) return `Legendary ${baseName}`
  return `Mythic ${baseName}`
}

/**
 * Spawn one monster per unique genre present in tags. A monster's level is
 * simply the count of its genre's tags — the same number the board shows on
 * that genre's chip — so what you see on a space matches what you fight.
 * The round parameter only selects tougher templates in later rounds.
 * e.g. [Pop, Pop, Rock] -> 1 Lv2 Pop monster + 1 Lv1 Rock monster
 */
export function spawnMonstersFromTags(
  genreTags: Genre[],
  spaceId: number,
  round: number = 1,
  rng: Rng = Math.random,
  newId?: NewId
): Monster[] {
  const counts = countTagsByGenre(genreTags)
  const monsters: Monster[] = []
  let index = 0

  counts.forEach((count, genre) => {
    const template = getMonsterByGenre(genre, round, rng)
    const monster = createMonsterFromTemplate(template, spaceId, index, count, newId)
    monsters.push(monster)
    index++
  })

  return monsters
}

/**
 * Spawn monsters for initial board setup — one per unique genre chip, exactly
 * like entering the space later, so the starting board's monsters match its
 * chips.
 */
export function spawnInitialMonsters(
  genreTags: Genre[],
  spaceId: number,
  round: number = 1,
  rng: Rng = Math.random,
  newId?: NewId
): Monster[] {
  return spawnMonstersFromTags(genreTags, spaceId, round, rng, newId)
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
 * Clear monsters from a space and reset genre tags
 */
export function clearSpace(space: BoardSpace): BoardSpace {
  return {
    ...space,
    monsters: [],
    genreTags: [],
  }
}
