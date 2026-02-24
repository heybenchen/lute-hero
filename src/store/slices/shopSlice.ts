import { StateCreator } from 'zustand'
import { DraftCard, Dice, InspirationDie, Genre } from '@/types'
import {
  generateNameCard,
  createInspirationPool,
  drawInspirationDice,
  getAllowedDiceTypes,
} from '@/data/draftCards'

const NAME_POOL_SIZE = 2
const INSPIRATION_DRAW_COUNT = 4

export interface ShopSlice {
  // State
  namePool: DraftCard[]
  inspirationPool: Dice[]
  inspirationRevealed: InspirationDie[]
  inspirationRollCount: number

  // Actions
  initializeShop: (numPlayers: number, collectiveFame?: number) => void
  findInspiration: (playerGenreCounts?: Record<Genre, number>, collectiveFame?: number) => void
  rerollInspiration: (playerGenreCounts?: Record<Genre, number>, collectiveFame?: number) => void
  purchaseInspirationDie: (dieIndex: number, playerGenreCounts?: Record<Genre, number>, collectiveFame?: number) => Dice | null
  closeInspiration: () => void
  purchaseFromNamePool: (cardId: string) => void
  refreshNamePool: () => void
  resetShop: () => void
}

export const createShopSlice: StateCreator<ShopSlice> = (set, get) => ({
  // Initial state
  namePool: [],
  inspirationPool: [],
  inspirationRevealed: [],
  inspirationRollCount: 0,

  // Actions
  initializeShop: (numPlayers, collectiveFame = 0) => {
    const namePool: DraftCard[] = []
    for (let i = 0; i < NAME_POOL_SIZE; i++) {
      namePool.push(generateNameCard())
    }

    const fullPool = createInspirationPool(numPlayers)
    const allowedTypes = getAllowedDiceTypes(collectiveFame)
    const { drawn, remainingPool } = drawInspirationDice(fullPool, INSPIRATION_DRAW_COUNT, undefined, allowedTypes)

    set({ namePool, inspirationPool: remainingPool, inspirationRevealed: drawn, inspirationRollCount: 0 })
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

  purchaseFromNamePool: (cardId) => {
    const pool = get().namePool
    set({
      namePool: pool.map((card) =>
        card.id === cardId ? generateNameCard() : card
      ),
    })
  },

  refreshNamePool: () => {
    const namePool: DraftCard[] = []
    for (let i = 0; i < NAME_POOL_SIZE; i++) {
      namePool.push(generateNameCard())
    }
    set({ namePool })
  },

  resetShop: () => {
    set({
      namePool: [],
      inspirationPool: [],
      inspirationRevealed: [],
      inspirationRollCount: 0,
    })
  },
})
