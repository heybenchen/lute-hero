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

export function generateDicePairCard(playerId: string): DraftCard {
  const template = DICE_PAIR_TEMPLATES[Math.floor(Math.random() * DICE_PAIR_TEMPLATES.length)]

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
