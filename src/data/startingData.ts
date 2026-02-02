import { Genre, DiceType, Dice, Song, SongSlot } from '@/types'
import { TRACK_EFFECTS } from './trackEffects'

// Starter dice for each genre
export const STARTER_DICE: { [key in Genre]: Dice[] } = {
  Pop: [
    { id: 'pop-starter-1', type: 'd6', genre: 'Pop' },
    { id: 'pop-starter-2', type: 'd6', genre: 'Pop' },
  ],
  Rock: [
    { id: 'rock-starter-1', type: 'd6', genre: 'Rock' },
    { id: 'rock-starter-2', type: 'd6', genre: 'Rock' },
  ],
  Electronic: [
    { id: 'electronic-starter-1', type: 'd6', genre: 'Electronic' },
    { id: 'electronic-starter-2', type: 'd6', genre: 'Electronic' },
  ],
  Classical: [
    { id: 'classical-starter-1', type: 'd6', genre: 'Classical' },
    { id: 'classical-starter-2', type: 'd6', genre: 'Classical' },
  ],
  HipHop: [
    { id: 'hiphop-starter-1', type: 'd6', genre: 'HipHop' },
    { id: 'hiphop-starter-2', type: 'd6', genre: 'HipHop' },
  ],
}

// Helper to create a starting song
export function createStarterSong(genre: Genre, playerId: string): Song {
  const starterDice = STARTER_DICE[genre]

  const slots: [SongSlot, SongSlot, SongSlot, SongSlot] = [
    { dice: starterDice[0], effect: null },
    { dice: starterDice[1], effect: null },
    { dice: null, effect: TRACK_EFFECTS.addFlat3 }, // Slot 3 has effect 1
    { dice: null, effect: TRACK_EFFECTS.rerollOnes }, // Slot 4 has effect 2 (all songs have 2 effects)
  ]

  return {
    id: `${playerId}-starter-song`,
    name: `${genre} Anthem`,
    slots,
    used: false,
  }
}

// Dice upgrade path
export const DICE_UPGRADE_PATH: { [key in DiceType]: DiceType | null } = {
  d4: 'd6',
  d6: 'd12',
  d12: 'd20',
  d20: null, // Max level
}

// Fame thresholds for phase transitions
export const FAME_THRESHOLDS = {
  undergroundScene: 300, // Total collective fame needed
  finalBoss: 500, // Total collective fame needed
}

// Fame multipliers based on total monsters defeated
export function calculateFameMultiplier(monstersDefeated: number): number {
  if (monstersDefeated >= 10) return 4
  if (monstersDefeated >= 7) return 3
  if (monstersDefeated >= 4) return 2
  return 1
}
