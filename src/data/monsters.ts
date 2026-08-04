import { MonsterTemplate, Genre, Rng } from '../types/index.js'

export const MONSTER_TEMPLATES: MonsterTemplate[] = [
  // Fire monsters — vulnerable to Ballad (Fire), resistant to Shanty (Water)
  {
    id: 'ember_wraith',
    name: 'Ember Wraith',
    tier: 9,
    vulnerability: 'Ballad',
    resistance: 'Shanty',
    description: 'A smoldering spirit drawn to passionate melodies',
  },
  {
    id: 'cinder_drake',
    name: 'Cinder Drake',
    tier: 10,
    vulnerability: 'Ballad',
    resistance: 'Shanty',
    description: 'A fiery beast that feeds on silence',
  },
  {
    id: 'magma_imp',
    name: 'Magma Imp',
    tier: 8,
    vulnerability: 'Ballad',
    resistance: 'Shanty',
    description: 'A mischievous creature of living lava',
  },
  {
    id: 'inferno_choir',
    name: 'Inferno Choir',
    tier: 11,
    vulnerability: 'Ballad',
    resistance: 'Shanty',
    description: 'A chorus of flame spirits singing in unison',
  },

  // Earth monsters — vulnerable to Folk (Earth), resistant to Hymn (Wind)
  {
    id: 'stone_troll',
    name: 'Stone Troll',
    tier: 9,
    vulnerability: 'Folk',
    resistance: 'Hymn',
    description: 'A lumbering creature of root and rock',
  },
  {
    id: 'moss_golem',
    name: 'Moss Golem',
    tier: 10,
    vulnerability: 'Folk',
    resistance: 'Hymn',
    description: 'An ancient guardian overgrown with moss',
  },
  {
    id: 'thorn_sprite',
    name: 'Thorn Sprite',
    tier: 8,
    vulnerability: 'Folk',
    resistance: 'Hymn',
    description: 'A prickly fey born from tangled briars',
  },
  {
    id: 'quake_beetle',
    name: 'Quake Beetle',
    tier: 11,
    vulnerability: 'Folk',
    resistance: 'Hymn',
    description: 'A colossal insect whose steps crack the ground',
  },

  // Wind monsters — vulnerable to Hymn (Wind), resistant to Folk (Earth)
  {
    id: 'gale_phantom',
    name: 'Gale Phantom',
    tier: 9,
    vulnerability: 'Hymn',
    resistance: 'Folk',
    description: 'A howling specter born of restless winds',
  },
  {
    id: 'storm_harpy',
    name: 'Storm Harpy',
    tier: 10,
    vulnerability: 'Hymn',
    resistance: 'Folk',
    description: 'A shrieking creature riding the tempest',
  },
  {
    id: 'zephyr_wisp',
    name: 'Zephyr Wisp',
    tier: 8,
    vulnerability: 'Hymn',
    resistance: 'Folk',
    description: 'A flickering breeze given form and malice',
  },
  {
    id: 'thunder_roc',
    name: 'Thunder Roc',
    tier: 11,
    vulnerability: 'Hymn',
    resistance: 'Folk',
    description: 'A massive bird trailing bolts of lightning',
  },

  // Water monsters — vulnerable to Shanty (Water), resistant to Ballad (Fire)
  {
    id: 'tide_lurker',
    name: 'Tide Lurker',
    tier: 9,
    vulnerability: 'Shanty',
    resistance: 'Ballad',
    description: 'A creature of the deep that surfaces at high tide',
  },
  {
    id: 'fog_serpent',
    name: 'Fog Serpent',
    tier: 10,
    vulnerability: 'Shanty',
    resistance: 'Ballad',
    description: 'A mist-wreathed serpent from the harbor depths',
  },
  {
    id: 'coral_crab',
    name: 'Coral Crab',
    tier: 8,
    vulnerability: 'Shanty',
    resistance: 'Ballad',
    description: 'An armored crustacean encrusted with living reef',
  },
  {
    id: 'abyssal_leviathan',
    name: 'Abyssal Leviathan',
    tier: 11,
    vulnerability: 'Shanty',
    resistance: 'Ballad',
    description: 'An ancient terror from the ocean floor',
  },

  // Final Boss - No weakness or resistance. It has no HP: the Final Showdown
  // is decided by total fandom over three verses, never by depleting the boss.
  {
    id: 'boss_silence',
    name: 'The Eternal Silence',
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
 * In later rounds, higher-tier templates are more likely. Tiers change which
 * monster you meet, not how tough it is — HP comes from the tunables.
 */
export function getMonsterByGenre(genre: Genre, round: number = 1, rng: Rng = Math.random): MonsterTemplate {
  const candidates = templatesByGenre[genre]
  if (!candidates || candidates.length === 0) {
    const allNonBoss = MONSTER_TEMPLATES.filter((m) => !m.isBoss)
    return allNonBoss[Math.floor(rng() * allNonBoss.length)]
  }

  // Sort by ascending tier (candidates are always spawnable monsters, so tier is set)
  const sorted = [...candidates].sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))

  // In early rounds (1-3), favor lighter monsters; later rounds favor heavier ones
  if (round <= 2) {
    // Weight toward first half
    const pool = sorted.slice(0, Math.ceil(sorted.length * 0.75))
    return pool[Math.floor(rng() * pool.length)]
  }
  if (round <= 5) {
    // Uniform random
    return sorted[Math.floor(rng() * sorted.length)]
  }
  // Round 6+: weight toward second half (tougher monsters)
  const pool = sorted.slice(Math.floor(sorted.length * 0.25))
  return pool[Math.floor(rng() * pool.length)]
}

// Helper to get final boss
export function getFinalBoss(): MonsterTemplate {
  return MONSTER_TEMPLATES.find((m) => m.isBoss)!
}
