import { StateCreator } from 'zustand'
import { DraftCard, Dice, InspirationDie, Genre } from '@/types'
import {
  generateSongCard,
  createInspirationPool,
  drawInspirationDice,
} from '@/data/draftCards'

const SONG_POOL_SIZE = 2

export interface ShopSlice {
  // State
  songPool: DraftCard[]
  inspirationPool: Dice[]
  inspirationRevealed: InspirationDie[]
  inspirationRollCount: number

  // Actions
  initializeShop: (numPlayers: number) => void
  findInspiration: (playerGenreCounts?: Record<Genre, number>) => void
  rerollInspiration: (playerGenreCounts?: Record<Genre, number>) => void
  purchaseInspirationDie: (dieIndex: number) => Dice | null
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
  initializeShop: (numPlayers) => {
    const songPool: DraftCard[] = []
    for (let i = 0; i < SONG_POOL_SIZE; i++) {
      songPool.push(generateSongCard())
    }

    const inspirationPool = createInspirationPool(numPlayers)

    set({ songPool, inspirationPool, inspirationRevealed: [], inspirationRollCount: 0 })
  },

  findInspiration: (playerGenreCounts) => {
    const pool = get().inspirationPool
    const { drawn, remainingPool } = drawInspirationDice(pool, 3, playerGenreCounts)

    set({
      inspirationPool: remainingPool,
      inspirationRevealed: drawn,
    })
  },

  rerollInspiration: (playerGenreCounts) => {
    // Return currently revealed dice to pool
    const pool = [...get().inspirationPool, ...get().inspirationRevealed.map((d) => d.dice)]
    const rollCount = get().inspirationRollCount + 1

    const { drawn, remainingPool } = drawInspirationDice(pool, 3, playerGenreCounts)

    set({
      inspirationPool: remainingPool,
      inspirationRevealed: drawn,
      inspirationRollCount: rollCount,
    })
  },

  purchaseInspirationDie: (dieIndex) => {
    const revealed = get().inspirationRevealed
    if (dieIndex < 0 || dieIndex >= revealed.length) return null

    const selected = revealed[dieIndex]
    // Return unchosen dice to pool
    const unchosen = revealed.filter((_, idx) => idx !== dieIndex).map((d) => d.dice)

    set({
      inspirationPool: [...get().inspirationPool, ...unchosen],
      inspirationRevealed: [],
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
