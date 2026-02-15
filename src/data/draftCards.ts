import { DraftCard, Dice, Genre, DiceType } from '@/types'
import { TRACK_EFFECTS } from './trackEffects'

let cardIdCounter = 0

function generateCardId(): string {
  return `card-${Date.now()}-${cardIdCounter++}`
}

// Dice pair configurations with costs
// Pricing is based on total dice face value (sum of max faces).
// A total value of 18 (e.g. d6+d12) is "average" at 15 EXP.
// Two d20s are never sold.
export const DICE_PAIR_TEMPLATES: Array<{
  genre: Genre
  dice1: DiceType
  dice2: DiceType
  cost: number
  name: string
}> = [
  // d4 + d4 (value 8) — 7 EXP, cheapest
  { genre: 'Pop', dice1: 'd4', dice2: 'd4', cost: 7, name: 'Pop Warmup' },
  { genre: 'Rock', dice1: 'd4', dice2: 'd4', cost: 7, name: 'Rock Warmup' },
  { genre: 'Electronic', dice1: 'd4', dice2: 'd4', cost: 7, name: 'Electronic Warmup' },
  { genre: 'Classical', dice1: 'd4', dice2: 'd4', cost: 7, name: 'Classical Warmup' },
  { genre: 'HipHop', dice1: 'd4', dice2: 'd4', cost: 7, name: 'Hip-Hop Warmup' },

  // d4 + d6 (value 10) — 8 EXP
  { genre: 'Pop', dice1: 'd4', dice2: 'd6', cost: 8, name: 'Pop Opener' },
  { genre: 'Rock', dice1: 'd4', dice2: 'd6', cost: 8, name: 'Rock Opener' },
  { genre: 'Electronic', dice1: 'd4', dice2: 'd6', cost: 8, name: 'Electronic Opener' },
  { genre: 'Classical', dice1: 'd4', dice2: 'd6', cost: 8, name: 'Classical Opener' },
  { genre: 'HipHop', dice1: 'd4', dice2: 'd6', cost: 8, name: 'Hip-Hop Opener' },

  // d6 + d6 (value 12) — 10 EXP
  { genre: 'Pop', dice1: 'd6', dice2: 'd6', cost: 10, name: 'Pop Duo' },
  { genre: 'Rock', dice1: 'd6', dice2: 'd6', cost: 10, name: 'Rock Duo' },
  { genre: 'Electronic', dice1: 'd6', dice2: 'd6', cost: 10, name: 'Electronic Duo' },
  { genre: 'Classical', dice1: 'd6', dice2: 'd6', cost: 10, name: 'Classical Duo' },
  { genre: 'HipHop', dice1: 'd6', dice2: 'd6', cost: 10, name: 'Hip-Hop Duo' },

  // d4 + d12 (value 16) — 12 EXP
  { genre: 'Pop', dice1: 'd4', dice2: 'd12', cost: 12, name: 'Pop Gambit' },
  { genre: 'Rock', dice1: 'd4', dice2: 'd12', cost: 12, name: 'Rock Gambit' },
  { genre: 'Electronic', dice1: 'd4', dice2: 'd12', cost: 12, name: 'Electronic Gambit' },
  { genre: 'Classical', dice1: 'd4', dice2: 'd12', cost: 12, name: 'Classical Gambit' },
  { genre: 'HipHop', dice1: 'd4', dice2: 'd12', cost: 12, name: 'Hip-Hop Gambit' },

  // d6 + d12 (value 18) — 15 EXP, the "average" baseline
  { genre: 'Pop', dice1: 'd6', dice2: 'd12', cost: 15, name: 'Pop Hit' },
  { genre: 'Rock', dice1: 'd6', dice2: 'd12', cost: 15, name: 'Rock Riff' },
  { genre: 'Electronic', dice1: 'd6', dice2: 'd12', cost: 15, name: 'Electronic Beat' },
  { genre: 'Classical', dice1: 'd6', dice2: 'd12', cost: 15, name: 'Classical Movement' },
  { genre: 'HipHop', dice1: 'd6', dice2: 'd12', cost: 15, name: 'Hip-Hop Flow' },

  // d4 + d20 (value 24) — 18 EXP, high variance
  { genre: 'Pop', dice1: 'd4', dice2: 'd20', cost: 18, name: 'Pop Power Ballad' },
  { genre: 'Rock', dice1: 'd4', dice2: 'd20', cost: 18, name: 'Rock Anthem' },
  { genre: 'Electronic', dice1: 'd4', dice2: 'd20', cost: 18, name: 'Electronic Drop' },
  { genre: 'Classical', dice1: 'd4', dice2: 'd20', cost: 18, name: 'Classical Crescendo' },
  { genre: 'HipHop', dice1: 'd4', dice2: 'd20', cost: 18, name: 'Hip-Hop Banger' },

  // d12 + d12 (value 24) — 20 EXP
  { genre: 'Pop', dice1: 'd12', dice2: 'd12', cost: 20, name: 'Pop Megahit' },
  { genre: 'Rock', dice1: 'd12', dice2: 'd12', cost: 20, name: 'Rock Solo' },
  { genre: 'Electronic', dice1: 'd12', dice2: 'd12', cost: 20, name: 'Electronic Remix' },
  { genre: 'Classical', dice1: 'd12', dice2: 'd12', cost: 20, name: 'Classical Symphony' },
  { genre: 'HipHop', dice1: 'd12', dice2: 'd12', cost: 20, name: 'Hip-Hop Cypher' },

  // d20 + d6 (value 26) — 20 EXP
  { genre: 'Pop', dice1: 'd20', dice2: 'd6', cost: 20, name: 'Pop Showstopper' },
  { genre: 'Rock', dice1: 'd20', dice2: 'd6', cost: 20, name: 'Rock Showstopper' },
  { genre: 'Electronic', dice1: 'd20', dice2: 'd6', cost: 20, name: 'Electronic Showstopper' },
  { genre: 'Classical', dice1: 'd20', dice2: 'd6', cost: 20, name: 'Classical Showstopper' },
  { genre: 'HipHop', dice1: 'd20', dice2: 'd6', cost: 20, name: 'Hip-Hop Showstopper' },

  // d20 + d12 (value 32) — 25 EXP, most expensive
  { genre: 'Pop', dice1: 'd20', dice2: 'd12', cost: 25, name: 'Pop Legendary' },
  { genre: 'Rock', dice1: 'd20', dice2: 'd12', cost: 25, name: 'Rock Legendary' },
  { genre: 'Electronic', dice1: 'd20', dice2: 'd12', cost: 25, name: 'Electronic Legendary' },
  { genre: 'Classical', dice1: 'd20', dice2: 'd12', cost: 25, name: 'Classical Legendary' },
  { genre: 'HipHop', dice1: 'd20', dice2: 'd12', cost: 25, name: 'Hip-Hop Legendary' },
]

/**
 * Calculate studio level from monsters defeated.
 * Level 1 (0-4 kills): prioritizes cheap dice
 * Level 2 (5-9 kills): balanced mix
 * Level 3 (10+ kills): prioritizes expensive dice
 */
export function getStudioLevel(monstersDefeated: number): number {
  if (monstersDefeated >= 10) return 3
  if (monstersDefeated >= 5) return 2
  return 1
}

// Cost tier boundaries
const COST_TIERS = {
  cheap: { min: 0, max: 10 },    // d4+d4(7), d4+d6(8), d6+d6(10)
  mid: { min: 11, max: 15 },     // d4+d12(12), d6+d12(15)
  expensive: { min: 16, max: 99 }, // d4+d20(18), d12+d12(20), d20+d6(20), d20+d12(25)
}

// Weights per studio level: [cheap, mid, expensive]
const TIER_WEIGHTS: Record<number, [number, number, number]> = {
  1: [60, 30, 10],
  2: [25, 50, 25],
  3: [10, 30, 60],
}

function getTemplatesByTier() {
  return {
    cheap: DICE_PAIR_TEMPLATES.filter((t) => t.cost <= COST_TIERS.cheap.max),
    mid: DICE_PAIR_TEMPLATES.filter((t) => t.cost > COST_TIERS.cheap.max && t.cost <= COST_TIERS.mid.max),
    expensive: DICE_PAIR_TEMPLATES.filter((t) => t.cost > COST_TIERS.mid.max),
  }
}

function pickWeightedTemplate(studioLevel: number) {
  const weights = TIER_WEIGHTS[studioLevel] || TIER_WEIGHTS[1]
  const tiers = getTemplatesByTier()
  const tierArrays = [tiers.cheap, tiers.mid, tiers.expensive]

  // Weighted random selection of tier
  const roll = Math.random() * 100
  let tierIndex = 0
  let cumulative = 0
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i]
    if (roll < cumulative) {
      tierIndex = i
      break
    }
  }

  const selectedTier = tierArrays[tierIndex]
  return selectedTier[Math.floor(Math.random() * selectedTier.length)]
}

export function generateDicePairCard(playerId: string, studioLevel: number = 1): DraftCard {
  const template = pickWeightedTemplate(studioLevel)

  const dice: Dice[] = [
    {
      id: `${playerId}-dice-${generateCardId()}-1`,
      type: template.dice1,
      genre: template.genre,
    },
    {
      id: `${playerId}-dice-${generateCardId()}-2`,
      type: template.dice2,
      genre: template.genre,
    },
  ]

  return {
    id: generateCardId(),
    type: 'dice',
    cost: template.cost,
    dice,
  }
}

export function generateSongCard(): DraftCard {
  const effects = Object.keys(TRACK_EFFECTS)
  const randomEffect1 = effects[Math.floor(Math.random() * effects.length)]
  const randomEffect2 = effects[Math.floor(Math.random() * effects.length)]

  const songNames = [
    'Acoustic Serenade',
    'Bass Drop Anthem',
    'Melody of Hope',
    'Rhythm Revolution',
    'Harmony Unleashed',
    'Symphony of Chaos',
    'Beat Machine',
    'Lyrical Storm',
    'Crescendo Rising',
    'Digital Dreams',
  ]

  return {
    id: generateCardId(),
    type: 'song',
    cost: 5,
    songName: songNames[Math.floor(Math.random() * songNames.length)],
    songEffect: TRACK_EFFECTS[randomEffect1],
    songEffect2: TRACK_EFFECTS[randomEffect2], // All songs now have 2 effects
  }
}

export function generateDraftCards(playerId: string, count: number = 3): DraftCard[] {
  const cards: DraftCard[] = []

  for (let i = 0; i < count; i++) {
    // 70% chance for dice, 30% for song
    if (Math.random() < 0.7) {
      cards.push(generateDicePairCard(playerId))
    } else {
      cards.push(generateSongCard())
    }
  }

  return cards
}
