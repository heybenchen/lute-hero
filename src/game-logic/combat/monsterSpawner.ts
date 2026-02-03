import { BoardSpace, Monster, Genre, MonsterTemplate } from '@/types'
import { getMonsterByGenre } from '@/data/monsters'

/**
 * Determine how many monsters should spawn based on genre tags
 * Rule: Every 2 genre tags = 1 monster
 */
export function calculateMonsterSpawnCount(genreTags: Genre[]): number {
  return Math.floor(genreTags.length / 2)
}

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
 * Level 1 = 1x, Level 2 = 1.5x, Level 3 = 2x, etc.
 */
export function getHPMultiplier(level: number): number {
  return 1 + (level - 1) * 0.5
}

/**
 * Get monster name with level prefix
 */
export function getMonsterNameWithLevel(baseName: string, level: number): string {
  if (level === 1) return baseName
  if (level === 2) return `Strong ${baseName}`
  if (level === 3) return `Elite ${baseName}`
  return `Legendary ${baseName}`
}

/**
 * Randomly select monsters from available genre tags
 */
export function spawnMonstersFromTags(
  genreTags: Genre[],
  spaceId: number
): Monster[] {
  const spawnCount = calculateMonsterSpawnCount(genreTags)

  if (spawnCount === 0) {
    return []
  }

  const monsters: Monster[] = []

  for (let i = 0; i < spawnCount; i++) {
    // Randomly select a genre from available tags
    const randomGenre = genreTags[Math.floor(Math.random() * genreTags.length)]

    // Get monster template with that vulnerability
    const template = getMonsterByGenre(randomGenre)

    // Create monster instance (level 1 for standard spawning)
    const monster = createMonsterFromTemplate(template, spaceId, i, 1)
    monsters.push(monster)
  }

  return monsters
}

/**
 * Spawn a single monster based on the dominant genre tag
 * Level is determined by the count of that genre's tags
 */
export function spawnMonsterFromDominantTag(
  genreTags: Genre[],
  spaceId: number,
  index: number = 0
): Monster | null {
  const dominant = getDominantGenre(genreTags)
  if (!dominant) return null

  const template = getMonsterByGenre(dominant.genre)
  return createMonsterFromTemplate(template, spaceId, index, dominant.count)
}

/**
 * Spawn monsters for initial board setup
 * Each space gets one monster based on dominant genre, with level based on tag count
 */
export function spawnInitialMonsters(
  genreTags: Genre[],
  spaceId: number
): Monster[] {
  if (genreTags.length === 0) return []

  const monster = spawnMonsterFromDominantTag(genreTags, spaceId, 0)
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
    isElite: template.isElite || false,
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

/**
 * Check if a space should become more powerful (ignored for multiple rounds)
 * Returns true if it should spawn extra monsters
 */
export function shouldSpawnExtraMonsters(genreTags: Genre[]): boolean {
  // If there are 4+ tags (ignored for 2+ rounds), spawn extra
  return genreTags.length >= 4
}
