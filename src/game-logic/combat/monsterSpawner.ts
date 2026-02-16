import { BoardSpace, Monster, Genre, MonsterTemplate } from '@/types'
import { getMonsterByGenre, getRoundLevelBonus } from '@/data/monsters'

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

/**
 * Calculate HP multiplier based on monster level
 * Level 1 = 1x, Level 2 = 1.75x, Level 3 = 2.5x, Level 4 = 3.25x
 */
export function getHPMultiplier(level: number): number {
  return 1 + (level - 1) * 0.75
}

/**
 * Get monster name with level prefix
 */
export function getMonsterNameWithLevel(baseName: string, level: number): string {
  if (level === 1) return baseName
  if (level === 2) return `Strong ${baseName}`
  if (level === 3) return `Veteran ${baseName}`
  return `Legendary ${baseName}`
}

/**
 * Spawn one monster per unique genre present in tags.
 * Duplicate tags of the same genre increase that monster's level.
 * The round parameter selects tougher templates and adds a level bonus in later rounds.
 * e.g. [Pop, Pop, Rock] -> 1 Lv2 Pop monster + 1 Lv1 Rock monster
 */
export function spawnMonstersFromTags(
  genreTags: Genre[],
  spaceId: number,
  round: number = 1
): Monster[] {
  const counts = countTagsByGenre(genreTags)
  const monsters: Monster[] = []
  const levelBonus = getRoundLevelBonus(round)
  let index = 0

  counts.forEach((count, genre) => {
    const template = getMonsterByGenre(genre, round)
    const monster = createMonsterFromTemplate(template, spaceId, index, count + levelBonus)
    monsters.push(monster)
    index++
  })

  return monsters
}

/**
 * Spawn a single monster based on the dominant genre tag
 * Level is determined by the count of that genre's tags
 */
export function spawnMonsterFromDominantTag(
  genreTags: Genre[],
  spaceId: number,
  index: number = 0,
  round: number = 1
): Monster | null {
  const dominant = getDominantGenre(genreTags)
  if (!dominant) return null

  const levelBonus = getRoundLevelBonus(round)
  const template = getMonsterByGenre(dominant.genre, round)
  return createMonsterFromTemplate(template, spaceId, index, dominant.count + levelBonus)
}

/**
 * Spawn monsters for initial board setup
 * Each space gets one monster based on dominant genre, with level based on tag count
 */
export function spawnInitialMonsters(
  genreTags: Genre[],
  spaceId: number,
  round: number = 1
): Monster[] {
  if (genreTags.length === 0) return []

  const monster = spawnMonsterFromDominantTag(genreTags, spaceId, 0, round)
  return monster ? [monster] : []
}

/**
 * Create a monster instance from a template
 */
export function createMonsterFromTemplate(
  template: MonsterTemplate,
  spaceId: number,
  index: number,
  level: number = 1
): Monster {
  const hpMultiplier = getHPMultiplier(level)
  const scaledHP = Math.floor(template.baseHP * hpMultiplier)

  return {
    id: `monster-${spaceId}-${index}-${Date.now()}`,
    templateId: template.id,
    name: getMonsterNameWithLevel(template.name, level),
    currentHP: scaledHP,
    maxHP: scaledHP,
    vulnerability: template.vulnerability,
    resistance: template.resistance,
    isBoss: template.isBoss || false,
    level,
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
