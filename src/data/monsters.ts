import { MonsterTemplate, Genre } from '@/types'

export const MONSTER_TEMPLATES: MonsterTemplate[] = [
  // Fire monsters — vulnerable to Ballad (Fire), resistant to Shanty (Water)
  {
    id: 'ember_wraith',
    name: 'Ember Wraith',
    baseHP: 15,
    vulnerability: 'Ballad',
    resistance: 'Shanty',
    description: 'A smoldering spirit drawn to passionate melodies',
  },
  {
    id: 'cinder_drake',
    name: 'Cinder Drake',
    baseHP: 22,
    vulnerability: 'Ballad',
    resistance: 'Shanty',
    description: 'A fiery beast that feeds on silence',
  },

  // Earth monsters — vulnerable to Folk (Earth), resistant to Hymn (Wind)
  {
    id: 'stone_troll',
    name: 'Stone Troll',
    baseHP: 20,
    vulnerability: 'Folk',
    resistance: 'Hymn',
    description: 'A lumbering creature of root and rock',
  },
  {
    id: 'moss_golem',
    name: 'Moss Golem',
    baseHP: 25,
    vulnerability: 'Folk',
    resistance: 'Hymn',
    description: 'An ancient guardian overgrown with moss',
  },

  // Wind monsters — vulnerable to Hymn (Wind), resistant to Folk (Earth)
  {
    id: 'gale_phantom',
    name: 'Gale Phantom',
    baseHP: 18,
    vulnerability: 'Hymn',
    resistance: 'Folk',
    description: 'A howling specter born of restless winds',
  },
  {
    id: 'storm_harpy',
    name: 'Storm Harpy',
    baseHP: 22,
    vulnerability: 'Hymn',
    resistance: 'Folk',
    description: 'A shrieking creature riding the tempest',
  },

  // Water monsters — vulnerable to Shanty (Water), resistant to Ballad (Fire)
  {
    id: 'tide_lurker',
    name: 'Tide Lurker',
    baseHP: 18,
    vulnerability: 'Shanty',
    resistance: 'Ballad',
    description: 'A creature of the deep that surfaces at high tide',
  },
  {
    id: 'fog_serpent',
    name: 'Fog Serpent',
    baseHP: 24,
    vulnerability: 'Shanty',
    resistance: 'Ballad',
    description: 'A mist-wreathed serpent from the harbor depths',
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
