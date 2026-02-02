import { MonsterTemplate, Genre } from '@/types'

export const MONSTER_TEMPLATES: MonsterTemplate[] = [
  // Regular Monsters
  {
    id: 'groupie',
    name: 'Wandering Groupie',
    baseHP: 15,
    vulnerabilities: ['Pop'],
    resistances: ['Classical'],
    description: 'A lost fan searching for their favorite band',
  },
  {
    id: 'headbanger',
    name: 'Wild Headbanger',
    baseHP: 20,
    vulnerabilities: ['Rock'],
    resistances: ['Electronic'],
    description: 'An aggressive fan who only respects heavy music',
  },
  {
    id: 'raver',
    name: 'Hyperactive Raver',
    baseHP: 18,
    vulnerabilities: ['Electronic'],
    resistances: ['Classical'],
    description: 'Dancing non-stop to beats only they can hear',
  },
  {
    id: 'critic',
    name: 'Pretentious Critic',
    baseHP: 25,
    vulnerabilities: ['Classical'],
    resistances: ['Pop'],
    description: 'Only appreciates "real" music',
  },
  {
    id: 'freestyler',
    name: 'Battle Freestyler',
    baseHP: 22,
    vulnerabilities: ['HipHop'],
    resistances: ['Rock'],
    description: 'Ready to throw down in a rap battle',
  },

  // Dual Weakness Monsters (Harder)
  {
    id: 'fusion_fan',
    name: 'Fusion Fan',
    baseHP: 30,
    vulnerabilities: ['Rock', 'Electronic'],
    resistances: ['Pop'],
    description: 'Loves genre-bending mashups',
  },
  {
    id: 'orchestra_rebel',
    name: 'Orchestra Rebel',
    baseHP: 28,
    vulnerabilities: ['Classical', 'HipHop'],
    resistances: ['Electronic'],
    description: 'Classical training meets street beats',
  },

  // Elite Monsters (Underground Scene)
  {
    id: 'elite_pop_star',
    name: 'Fallen Pop Star',
    baseHP: 50,
    vulnerabilities: ['Pop'],
    resistances: ['Rock', 'Classical'],
    description: 'A former idol seeking redemption',
    isElite: true,
  },
  {
    id: 'elite_rockstar',
    name: 'Legendary Rockstar',
    baseHP: 55,
    vulnerabilities: ['Rock'],
    resistances: ['Pop', 'Electronic'],
    description: 'The ghost of rock and roll past',
    isElite: true,
  },
  {
    id: 'elite_dj',
    name: 'Rogue AI DJ',
    baseHP: 52,
    vulnerabilities: ['Electronic'],
    resistances: ['Classical', 'HipHop'],
    description: 'Sentient music software gone wild',
    isElite: true,
  },
  {
    id: 'elite_conductor',
    name: 'Mad Conductor',
    baseHP: 58,
    vulnerabilities: ['Classical'],
    resistances: ['Electronic', 'Pop'],
    description: 'Orchestrating chaos itself',
    isElite: true,
  },
  {
    id: 'elite_mc',
    name: 'Battle MC Supreme',
    baseHP: 54,
    vulnerabilities: ['HipHop'],
    resistances: ['Rock', 'Classical'],
    description: 'The final word in verbal combat',
    isElite: true,
  },

  // Final Boss
  {
    id: 'boss_silence',
    name: 'The Eternal Silence',
    baseHP: 150,
    vulnerabilities: [], // No vulnerabilities
    resistances: [], // No resistances - but high HP
    description: 'The antithesis of all music, the end of sound itself',
    isBoss: true,
  },
]

// Helper to get random monster by genre weakness
export function getMonsterByGenre(genre: Genre, isElite = false): MonsterTemplate {
  const candidates = MONSTER_TEMPLATES.filter(
    (m) => m.vulnerabilities.includes(genre) && m.isElite === isElite && !m.isBoss
  )

  if (candidates.length === 0) {
    // Fallback to any monster with that vulnerability
    const anyMatch = MONSTER_TEMPLATES.filter((m) => m.vulnerabilities.includes(genre) && !m.isBoss)
    return anyMatch[Math.floor(Math.random() * anyMatch.length)]
  }

  return candidates[Math.floor(Math.random() * candidates.length)]
}

// Helper to get elite monster by genre
export function getEliteMonster(genre: Genre): MonsterTemplate {
  return getMonsterByGenre(genre, true)
}

// Helper to get final boss
export function getFinalBoss(): MonsterTemplate {
  return MONSTER_TEMPLATES.find((m) => m.isBoss)!
}
