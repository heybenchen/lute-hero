import { MonsterTemplate, Genre } from '@/types'

export const MONSTER_TEMPLATES: MonsterTemplate[] = [
  // Regular Monsters - Each with 1 weakness and 1 resistance
  {
    id: 'groupie',
    name: 'Wandering Groupie',
    baseHP: 15,
    vulnerability: 'Pop',
    resistance: 'Classical',
    description: 'A lost fan searching for their favorite band',
  },
  {
    id: 'headbanger',
    name: 'Wild Headbanger',
    baseHP: 20,
    vulnerability: 'Rock',
    resistance: 'Electronic',
    description: 'An aggressive fan who only respects heavy music',
  },
  {
    id: 'raver',
    name: 'Hyperactive Raver',
    baseHP: 18,
    vulnerability: 'Electronic',
    resistance: 'Classical',
    description: 'Dancing non-stop to beats only they can hear',
  },
  {
    id: 'critic',
    name: 'Pretentious Critic',
    baseHP: 25,
    vulnerability: 'Classical',
    resistance: 'Pop',
    description: 'Only appreciates "real" music',
  },
  {
    id: 'freestyler',
    name: 'Battle Freestyler',
    baseHP: 22,
    vulnerability: 'HipHop',
    resistance: 'Rock',
    description: 'Ready to throw down in a rap battle',
  },

  // More variety
  {
    id: 'pop_reject',
    name: 'Pop Reject',
    baseHP: 18,
    vulnerability: 'Rock',
    resistance: 'Pop',
    description: 'Hates mainstream music',
  },
  {
    id: 'classical_snob',
    name: 'Classical Snob',
    baseHP: 24,
    vulnerability: 'Classical',
    resistance: 'HipHop',
    description: 'Only respects the classics',
  },

  // Final Boss - No weakness or resistance
  {
    id: 'boss_silence',
    name: 'The Eternal Silence',
    baseHP: 150,
    vulnerability: null,
    resistance: null,
    description: 'The antithesis of all music, the end of sound itself',
    isBoss: true,
  },
]

// Helper to get random monster by genre weakness
export function getMonsterByGenre(genre: Genre): MonsterTemplate {
  const candidates = MONSTER_TEMPLATES.filter(
    (m) => m.vulnerability === genre && !m.isBoss
  )

  if (candidates.length === 0) {
    // Fallback to any non-boss monster
    const anyMatch = MONSTER_TEMPLATES.filter((m) => !m.isBoss)
    return anyMatch[Math.floor(Math.random() * anyMatch.length)]
  }

  return candidates[Math.floor(Math.random() * candidates.length)]
}

// Helper to get final boss
export function getFinalBoss(): MonsterTemplate {
  return MONSTER_TEMPLATES.find((m) => m.isBoss)!
}
