import { StateCreator } from 'zustand'
import { DraftCard } from '@/types'
import { generateNameCard } from '@/data/draftCards'

const NAME_POOL_SIZE = 3

export interface ShopSlice {
  // State
  namePool: DraftCard[]

  // Actions
  initializeShop: () => void
  purchaseFromNamePool: (cardId: string) => void
  refreshNamePool: () => void
  resetShop: () => void
}

export const createShopSlice: StateCreator<ShopSlice> = (set, get) => ({
  // Initial state
  namePool: [],

  // Actions
  initializeShop: () => {
    const namePool: DraftCard[] = []
    for (let i = 0; i < NAME_POOL_SIZE; i++) {
      namePool.push(generateNameCard())
    }
    set({ namePool })
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
    set({ namePool: [] })
  },
})
