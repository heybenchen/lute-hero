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

    // Create monster instance
    const monster = createMonsterFromTemplate(template, spaceId, i)
    monsters.push(monster)
  }

  return monsters
}

/**
 * Create a monster instance from a template
 */
export function createMonsterFromTemplate(
  template: MonsterTemplate,
  spaceId: number,
  index: number
): Monster {
  return {
    id: `monster-${spaceId}-${index}-${Date.now()}`,
    templateId: template.id,
    name: template.name,
    currentHP: template.baseHP,
    maxHP: template.baseHP,
    vulnerabilities: template.vulnerabilities,
    resistances: template.resistances,
    isElite: template.isElite || false,
    isBoss: template.isBoss || false,
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
