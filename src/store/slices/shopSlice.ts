import { StateCreator } from 'zustand'
import { DraftCard, Genre, Player, PendingReward } from '@/types'
import { generateNameCard } from '@/data/draftCards'
import { createElementBag, drawFromBag, ELEMENT_OFFER_COUNT } from '@/data/elementBag'

const NAME_POOL_SIZE = 3

export interface ShopSlice {
  // State
  namePool: DraftCard[]
  elementBag: Genre[] // Chips still in the bag
  elementDiscard: Genre[] // Chips out of the bag (consumed or cycled out)
  elementOffers: Genre[] // Chips currently on display in the store
  pendingRewards: Record<string, PendingReward[]> // Unresolved rewards per player

  // Actions
  initializeShop: (numPlayers: number) => void
  refillShopSlots: () => void
  refreshElementOffers: () => void
  consumeElementOffer: (offerIndex: number) => void
  purchaseFromNamePool: (cardId: string) => void
  refreshNamePool: () => void
  enqueueReward: (playerId: string, reward: PendingReward) => void
  removeReward: (playerId: string, rewardId: string) => void
  resetShop: () => void
}

function freshNamePool(excludeNames: Set<string> = new Set()): DraftCard[] {
  const used = new Set(excludeNames)
  const namePool: DraftCard[] = []
  for (let i = 0; i < NAME_POOL_SIZE; i++) {
    const card = generateNameCard(used)
    if (card.songName) used.add(card.songName)
    namePool.push(card)
  }
  return namePool
}

function collectUsedNames(get: () => ShopSlice): Set<string> {
  const used = new Set<string>()
  // `players` lives on a sibling slice; reach it through the combined store at runtime.
  const players = (get() as unknown as { players?: Player[] }).players
  if (players) {
    for (const p of players) {
      for (const s of p.songs) {
        if (s.name) used.add(s.name)
      }
    }
  }
  for (const card of get().namePool) {
    if (card.songName) used.add(card.songName)
  }
  return used
}

export const createShopSlice: StateCreator<ShopSlice> = (set, get) => ({
  // Initial state
  namePool: [],
  elementBag: [],
  elementDiscard: [],
  elementOffers: [],
  pendingRewards: {},

  // Actions
  initializeShop: (numPlayers) => {
    const fullBag = createElementBag(numPlayers)
    const { drawn, bag, discard } = drawFromBag(fullBag, [], ELEMENT_OFFER_COUNT)

    set({
      namePool: freshNamePool(collectUsedNames(get)),
      elementBag: bag,
      elementDiscard: discard,
      elementOffers: drawn,
      pendingRewards: {},
    })
  },

  // Called at the start of each player's turn: top the element offers back
  // up to a full display and deal a fresh set of song names.
  refillShopSlots: () => {
    const needed = ELEMENT_OFFER_COUNT - get().elementOffers.length
    if (needed > 0) {
      const { drawn, bag, discard } = drawFromBag(get().elementBag, get().elementDiscard, needed)
      set({
        elementOffers: [...get().elementOffers, ...drawn],
        elementBag: bag,
        elementDiscard: discard,
      })
    }
    set({ namePool: freshNamePool(collectUsedNames(get)) })
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
    const used = collectUsedNames(get)
    set({
      namePool: pool.map((card) =>
        card.id === cardId ? generateNameCard(used) : card
      ),
    })
  },

  refreshNamePool: () => {
    set({ namePool: freshNamePool(collectUsedNames(get)) })
  },

  enqueueReward: (playerId, reward) => {
    const current = get().pendingRewards[playerId] ?? []
    set({
      pendingRewards: { ...get().pendingRewards, [playerId]: [...current, reward] },
    })
  },

  removeReward: (playerId, rewardId) => {
    const current = get().pendingRewards[playerId] ?? []
    set({
      pendingRewards: {
        ...get().pendingRewards,
        [playerId]: current.filter((r) => r.id !== rewardId),
      },
    })
  },

  resetShop: () => {
    set({
      namePool: [],
      elementBag: [],
      elementDiscard: [],
      elementOffers: [],
      pendingRewards: {},
    })
  },
})
