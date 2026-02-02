import { DraftCard, Dice, Genre, DiceType } from '@/types'
import { TRACK_EFFECTS } from './trackEffects'

let cardIdCounter = 0

function generateCardId(): string {
  return `card-${Date.now()}-${cardIdCounter++}`
}

// Dice pair configurations with costs
export const DICE_PAIR_TEMPLATES: Array<{
  genre: Genre
  dice1: DiceType
  dice2: DiceType
  cost: number
  name: string
}> = [
  // Balanced pairs (mid-tier)
  { genre: 'Pop', dice1: 'd6', dice2: 'd6', cost: 5, name: 'Pop Duo' },
  { genre: 'Rock', dice1: 'd6', dice2: 'd6', cost: 5, name: 'Rock Duo' },
  { genre: 'Electronic', dice1: 'd6', dice2: 'd6', cost: 5, name: 'Electronic Duo' },
  { genre: 'Classical', dice1: 'd6', dice2: 'd6', cost: 5, name: 'Classical Duo' },
  { genre: 'HipHop', dice1: 'd6', dice2: 'd6', cost: 5, name: 'Hip-Hop Duo' },

  // High-low pairs (higher variance)
  { genre: 'Pop', dice1: 'd20', dice2: 'd4', cost: 10, name: 'Pop Power Ballad' },
  { genre: 'Rock', dice1: 'd20', dice2: 'd4', cost: 10, name: 'Rock Anthem' },
  { genre: 'Electronic', dice1: 'd20', dice2: 'd4', cost: 10, name: 'Electronic Drop' },
  { genre: 'Classical', dice1: 'd20', dice2: 'd4', cost: 10, name: 'Classical Crescendo' },
  { genre: 'HipHop', dice1: 'd20', dice2: 'd4', cost: 10, name: 'Hip-Hop Banger' },

  // Mid-range pairs
  { genre: 'Pop', dice1: 'd12', dice2: 'd6', cost: 8, name: 'Pop Hit' },
  { genre: 'Rock', dice1: 'd12', dice2: 'd6', cost: 8, name: 'Rock Riff' },
  { genre: 'Electronic', dice1: 'd12', dice2: 'd6', cost: 8, name: 'Electronic Beat' },
  { genre: 'Classical', dice1: 'd12', dice2: 'd6', cost: 8, name: 'Classical Movement' },
  { genre: 'HipHop', dice1: 'd12', dice2: 'd6', cost: 8, name: 'Hip-Hop Flow' },

  // High-risk high-reward
  { genre: 'Pop', dice1: 'd12', dice2: 'd12', cost: 12, name: 'Pop Megahit' },
  { genre: 'Rock', dice1: 'd12', dice2: 'd12', cost: 12, name: 'Rock Solo' },
  { genre: 'Electronic', dice1: 'd12', dice2: 'd12', cost: 12, name: 'Electronic Remix' },
  { genre: 'Classical', dice1: 'd12', dice2: 'd12', cost: 12, name: 'Classical Symphony' },
  { genre: 'HipHop', dice1: 'd12', dice2: 'd12', cost: 12, name: 'Hip-Hop Cypher' },

  // Ultra rare
  { genre: 'Pop', dice1: 'd20', dice2: 'd12', cost: 15, name: 'Pop Legendary' },
  { genre: 'Rock', dice1: 'd20', dice2: 'd12', cost: 15, name: 'Rock Legendary' },
  { genre: 'Electronic', dice1: 'd20', dice2: 'd12', cost: 15, name: 'Electronic Legendary' },
  { genre: 'Classical', dice1: 'd20', dice2: 'd12', cost: 15, name: 'Classical Legendary' },
  { genre: 'HipHop', dice1: 'd20', dice2: 'd12', cost: 15, name: 'Hip-Hop Legendary' },
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
  const randomEffect = effects[Math.floor(Math.random() * effects.length)]

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
    songEffect: TRACK_EFFECTS[randomEffect],
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
