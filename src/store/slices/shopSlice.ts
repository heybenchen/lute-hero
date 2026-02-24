import { StateCreator } from 'zustand'
import { DraftCard, Dice, InspirationDie, Genre } from '@/types'
import {
  generateSongCard,
  createInspirationPool,
  drawInspirationDice,
  getAllowedDiceTypes,
} from '@/data/draftCards'

const SONG_POOL_SIZE = 2
const INSPIRATION_DRAW_COUNT = 4

export interface ShopSlice {
  // State
  songPool: DraftCard[]
  inspirationPool: Dice[]
  inspirationRevealed: InspirationDie[]
  inspirationRollCount: number

  // Actions
  initializeShop: (numPlayers: number, collectiveFame?: number) => void
  findInspiration: (playerGenreCounts?: Record<Genre, number>, collectiveFame?: number) => void
  rerollInspiration: (playerGenreCounts?: Record<Genre, number>, collectiveFame?: number) => void
  purchaseInspirationDie: (dieIndex: number, playerGenreCounts?: Record<Genre, number>, collectiveFame?: number) => Dice | null
  closeInspiration: () => void
  purchaseFromSongPool: (cardId: string) => void
  refreshSongPool: () => void
  resetShop: () => void
}

export const createShopSlice: StateCreator<ShopSlice> = (set, get) => ({
  // Initial state
  songPool: [],
  inspirationPool: [],
  inspirationRevealed: [],
  inspirationRollCount: 0,

  // Actions
  initializeShop: (numPlayers, collectiveFame = 0) => {
    const songPool: DraftCard[] = []
    for (let i = 0; i < SONG_POOL_SIZE; i++) {
      songPool.push(generateSongCard())
    }

    const fullPool = createInspirationPool(numPlayers)
    const allowedTypes = getAllowedDiceTypes(collectiveFame)
    const { drawn, remainingPool } = drawInspirationDice(fullPool, INSPIRATION_DRAW_COUNT, undefined, allowedTypes)

    set({ songPool, inspirationPool: remainingPool, inspirationRevealed: drawn, inspirationRollCount: 0 })
  },

  findInspiration: (playerGenreCounts, collectiveFame = 0) => {
    const pool = get().inspirationPool
    const allowedTypes = getAllowedDiceTypes(collectiveFame)
    const { drawn, remainingPool } = drawInspirationDice(pool, INSPIRATION_DRAW_COUNT, playerGenreCounts, allowedTypes)

    set({
      inspirationPool: remainingPool,
      inspirationRevealed: drawn,
    })
  },

  rerollInspiration: (playerGenreCounts, collectiveFame = 0) => {
    // Return currently revealed dice to pool before drawing new ones
    const pool = [...get().inspirationPool, ...get().inspirationRevealed.map((d) => d.dice)]
    const rollCount = get().inspirationRollCount + 1
    const allowedTypes = getAllowedDiceTypes(collectiveFame)
    const { drawn, remainingPool } = drawInspirationDice(pool, INSPIRATION_DRAW_COUNT, playerGenreCounts, allowedTypes)

    set({
      inspirationPool: remainingPool,
      inspirationRevealed: drawn,
      inspirationRollCount: rollCount,
    })
  },

  purchaseInspirationDie: (dieIndex, playerGenreCounts, collectiveFame = 0) => {
    const revealed = get().inspirationRevealed
    if (dieIndex < 0 || dieIndex >= revealed.length) return null

    const selected = revealed[dieIndex]
    const remainingRevealed = revealed.filter((_, idx) => idx !== dieIndex)

    // Draw 1 replacement die to keep 4 shown
    const pool = get().inspirationPool
    const allowedTypes = getAllowedDiceTypes(collectiveFame)
    const { drawn, remainingPool } = drawInspirationDice(pool, 1, playerGenreCounts, allowedTypes)
    const replacement = drawn[0]

    const newRevealed: InspirationDie[] = replacement
      ? [...remainingRevealed, replacement]
      : remainingRevealed

    set({
      inspirationPool: remainingPool,
      inspirationRevealed: newRevealed,
      inspirationRollCount: 0,
    })

    return selected.dice
  },

  closeInspiration: () => {
    // Return all revealed dice to pool
    const revealed = get().inspirationRevealed
    set({
      inspirationPool: [...get().inspirationPool, ...revealed.map((d) => d.dice)],
      inspirationRevealed: [],
      inspirationRollCount: 0,
    })
  },

  purchaseFromSongPool: (cardId) => {
    const pool = get().songPool
    set({
      songPool: pool.map((card) =>
        card.id === cardId ? generateSongCard() : card
      ),
    })
  },

  refreshSongPool: () => {
    const songPool: DraftCard[] = []
    for (let i = 0; i < SONG_POOL_SIZE; i++) {
      songPool.push(generateSongCard())
    }
    set({ songPool })
  },

  resetShop: () => {
    set({
      songPool: [],
      inspirationPool: [],
      inspirationRevealed: [],
      inspirationRollCount: 0,
    })
  },
})
