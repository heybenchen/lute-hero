import { MonsterTemplate, Genre } from '@/types'

export const MONSTER_TEMPLATES: MonsterTemplate[] = [
  // Fire monsters — vulnerable to Ballad (Fire), resistant to Shanty (Water)
  {
    id: 'ember_wraith',
    name: 'Ember Wraith',
    baseHP: 9,
    vulnerability: 'Ballad',
    resistance: 'Shanty',
    description: 'A smoldering spirit drawn to passionate melodies',
  },
  {
    id: 'cinder_drake',
    name: 'Cinder Drake',
    baseHP: 13,
    vulnerability: 'Ballad',
    resistance: 'Shanty',
    description: 'A fiery beast that feeds on silence',
  },
  {
    id: 'magma_imp',
    name: 'Magma Imp',
    baseHP: 7,
    vulnerability: 'Ballad',
    resistance: 'Shanty',
    description: 'A mischievous creature of living lava',
  },
  {
    id: 'inferno_choir',
    name: 'Inferno Choir',
    baseHP: 17,
    vulnerability: 'Ballad',
    resistance: 'Shanty',
    description: 'A chorus of flame spirits singing in unison',
  },

  // Earth monsters — vulnerable to Folk (Earth), resistant to Hymn (Wind)
  {
    id: 'stone_troll',
    name: 'Stone Troll',
    baseHP: 12,
    vulnerability: 'Folk',
    resistance: 'Hymn',
    description: 'A lumbering creature of root and rock',
  },
  {
    id: 'moss_golem',
    name: 'Moss Golem',
    baseHP: 15,
    vulnerability: 'Folk',
    resistance: 'Hymn',
    description: 'An ancient guardian overgrown with moss',
  },
  {
    id: 'thorn_sprite',
    name: 'Thorn Sprite',
    baseHP: 8,
    vulnerability: 'Folk',
    resistance: 'Hymn',
    description: 'A prickly fey born from tangled briars',
  },
  {
    id: 'quake_beetle',
    name: 'Quake Beetle',
    baseHP: 18,
    vulnerability: 'Folk',
    resistance: 'Hymn',
    description: 'A colossal insect whose steps crack the ground',
  },

  // Wind monsters — vulnerable to Hymn (Wind), resistant to Folk (Earth)
  {
    id: 'gale_phantom',
    name: 'Gale Phantom',
    baseHP: 11,
    vulnerability: 'Hymn',
    resistance: 'Folk',
    description: 'A howling specter born of restless winds',
  },
  {
    id: 'storm_harpy',
    name: 'Storm Harpy',
    baseHP: 13,
    vulnerability: 'Hymn',
    resistance: 'Folk',
    description: 'A shrieking creature riding the tempest',
  },
  {
    id: 'zephyr_wisp',
    name: 'Zephyr Wisp',
    baseHP: 6,
    vulnerability: 'Hymn',
    resistance: 'Folk',
    description: 'A flickering breeze given form and malice',
  },
  {
    id: 'thunder_roc',
    name: 'Thunder Roc',
    baseHP: 19,
    vulnerability: 'Hymn',
    resistance: 'Folk',
    description: 'A massive bird trailing bolts of lightning',
  },

  // Water monsters — vulnerable to Shanty (Water), resistant to Ballad (Fire)
  {
    id: 'tide_lurker',
    name: 'Tide Lurker',
    baseHP: 11,
    vulnerability: 'Shanty',
    resistance: 'Ballad',
    description: 'A creature of the deep that surfaces at high tide',
  },
  {
    id: 'fog_serpent',
    name: 'Fog Serpent',
    baseHP: 14,
    vulnerability: 'Shanty',
    resistance: 'Ballad',
    description: 'A mist-wreathed serpent from the harbor depths',
  },
  {
    id: 'coral_crab',
    name: 'Coral Crab',
    baseHP: 10,
    vulnerability: 'Shanty',
    resistance: 'Ballad',
    description: 'An armored crustacean encrusted with living reef',
  },
  {
    id: 'abyssal_leviathan',
    name: 'Abyssal Leviathan',
    baseHP: 20,
    vulnerability: 'Shanty',
    resistance: 'Ballad',
    description: 'An ancient terror from the ocean floor',
  },

  // Final Boss - No weakness or resistance
  {
    id: 'boss_silence',
    name: 'The Eternal Silence',
    baseHP: 90,
    vulnerability: null,
    resistance: null,
    description: 'The antithesis of all music, the end of sound itself',
    isBoss: true,
  },
]

/** All non-boss templates grouped by vulnerability genre */
const templatesByGenre: Record<Genre, MonsterTemplate[]> = {
  Ballad: MONSTER_TEMPLATES.filter((m) => m.vulnerability === 'Ballad' && !m.isBoss),
  Folk: MONSTER_TEMPLATES.filter((m) => m.vulnerability === 'Folk' && !m.isBoss),
  Hymn: MONSTER_TEMPLATES.filter((m) => m.vulnerability === 'Hymn' && !m.isBoss),
  Shanty: MONSTER_TEMPLATES.filter((m) => m.vulnerability === 'Shanty' && !m.isBoss),
}

/**
 * Get a random monster template for a given genre.
 * In later rounds, heavier templates (higher baseHP) are more likely.
 */
export function getMonsterByGenre(genre: Genre, round: number = 1): MonsterTemplate {
  const candidates = templatesByGenre[genre]
  if (!candidates || candidates.length === 0) {
    const allNonBoss = MONSTER_TEMPLATES.filter((m) => !m.isBoss)
    return allNonBoss[Math.floor(Math.random() * allNonBoss.length)]
  }

  // Sort by ascending baseHP
  const sorted = [...candidates].sort((a, b) => a.baseHP - b.baseHP)

  // In early rounds (1-3), favor lighter monsters; later rounds favor heavier ones
  if (round <= 2) {
    // Weight toward first half
    const pool = sorted.slice(0, Math.ceil(sorted.length * 0.75))
    return pool[Math.floor(Math.random() * pool.length)]
  }
  if (round <= 5) {
    // Uniform random
    return sorted[Math.floor(Math.random() * sorted.length)]
  }
  // Round 6+: weight toward second half (tougher monsters)
  const pool = sorted.slice(Math.floor(sorted.length * 0.25))
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Get a bonus level boost based on the current round.
 * Monsters get +1 level every 3 rounds past round 1.
 */
export function getRoundLevelBonus(round: number): number {
  if (round <= 1) return 0
  return Math.floor((round - 1) / 3)
}

// Helper to get final boss
export function getFinalBoss(): MonsterTemplate {
  return MONSTER_TEMPLATES.find((m) => m.isBoss)!
}
