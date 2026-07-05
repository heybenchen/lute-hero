import { StateCreator } from 'zustand'
import { DraftCard, Genre } from '@/types'
import { generateNameCard } from '@/data/draftCards'
import { createElementBag, drawFromBag, ELEMENT_OFFER_COUNT } from '@/data/elementBag'

const NAME_POOL_SIZE = 3

export interface ShopSlice {
  // State
  namePool: DraftCard[]
  elementBag: Genre[] // Chips still in the bag
  elementDiscard: Genre[] // Chips out of the bag (consumed or cycled out)
  elementOffers: Genre[] // Chips currently on display in the store

  // Actions
  initializeShop: (numPlayers: number) => void
  refreshElementOffers: () => void
  consumeElementOffer: (offerIndex: number) => void
  purchaseFromNamePool: (cardId: string) => void
  refreshNamePool: () => void
  resetShop: () => void
}

function freshNamePool(): DraftCard[] {
  const namePool: DraftCard[] = []
  for (let i = 0; i < NAME_POOL_SIZE; i++) {
    namePool.push(generateNameCard())
  }
  return namePool
}

export const createShopSlice: StateCreator<ShopSlice> = (set, get) => ({
  // Initial state
  namePool: [],
  elementBag: [],
  elementDiscard: [],
  elementOffers: [],

  // Actions
  initializeShop: (numPlayers) => {
    const fullBag = createElementBag(numPlayers)
    const { drawn, bag, discard } = drawFromBag(fullBag, [], ELEMENT_OFFER_COUNT)

    set({
      namePool: freshNamePool(),
      elementBag: bag,
      elementDiscard: discard,
      elementOffers: drawn,
    })
  },

  refreshElementOffers: () => {
    // Current offers leave the display and join the discard pile
    const discard = [...get().elementDiscard, ...get().elementOffers]
    const { drawn, bag, discard: remainingDiscard } = drawFromBag(
      get().elementBag,
      discard,
      ELEMENT_OFFER_COUNT,
    )

    set({
      elementBag: bag,
      elementDiscard: remainingDiscard,
      elementOffers: drawn,
    })
  },

  consumeElementOffer: (offerIndex) => {
    const offers = get().elementOffers
    if (offerIndex < 0 || offerIndex >= offers.length) return

    set({
      elementOffers: offers.filter((_, idx) => idx !== offerIndex),
      elementDiscard: [...get().elementDiscard, offers[offerIndex]],
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
    set({ namePool: freshNamePool() })
  },

  resetShop: () => {
    set({ namePool: [], elementBag: [], elementDiscard: [], elementOffers: [] })
  },
})
