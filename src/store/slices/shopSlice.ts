import { StateCreator } from 'zustand'
import { DraftCard } from '@/types'
import { generateDicePairCard, generateSongCard } from '@/data/draftCards'

const DICE_POOL_SIZE = 4
const SONG_POOL_SIZE = 2

export interface ShopSlice {
  // State
  dicePool: DraftCard[]
  songPool: DraftCard[]

  // Actions
  initializeShop: (studioLevel: number) => void
  purchaseFromDicePool: (cardId: string, studioLevel: number) => void
  purchaseFromSongPool: (cardId: string) => void
  refreshDicePool: (studioLevel: number) => void
  refreshSongPool: () => void
  resetShop: () => void
}

export const createShopSlice: StateCreator<ShopSlice> = (set, get) => ({
  // Initial state
  dicePool: [],
  songPool: [],

  // Actions
  initializeShop: (studioLevel) => {
    const dicePool: DraftCard[] = []
    for (let i = 0; i < DICE_POOL_SIZE; i++) {
      dicePool.push(generateDicePairCard('shop', studioLevel))
    }

    const songPool: DraftCard[] = []
    for (let i = 0; i < SONG_POOL_SIZE; i++) {
      songPool.push(generateSongCard())
    }

    set({ dicePool, songPool })
  },

  purchaseFromDicePool: (cardId, studioLevel) => {
    const pool = get().dicePool
    set({
      dicePool: pool.map((card) =>
        card.id === cardId ? generateDicePairCard('shop', studioLevel) : card
      ),
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

  refreshDicePool: (studioLevel) => {
    const dicePool: DraftCard[] = []
    for (let i = 0; i < DICE_POOL_SIZE; i++) {
      dicePool.push(generateDicePairCard('shop', studioLevel))
    }
    set({ dicePool })
  },

  refreshSongPool: () => {
    const songPool: DraftCard[] = []
    for (let i = 0; i < SONG_POOL_SIZE; i++) {
      songPool.push(generateSongCard())
    }
    set({ songPool })
  },

  resetShop: () => {
    set({ dicePool: [], songPool: [] })
  },
})
