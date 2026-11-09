import { useRef } from 'react'
import { useGameStore, selectPlayerById } from '@/store'
import { Genre, Dice, PendingReward } from '@/types'
import { getMaxValue } from '@/game-logic/dice/roller'
import { GenreBadge } from '@/components/ui/GenreBadge'
import { DiceShape } from '@/components/ui/DiceShape'
import {
  newD4Cost,
  getNextDiceType,
  getUpgradeCost,
  getInspirationCost,
  inspirationSpend,
} from '@/data/draftCards'
import { GENRE_THEME } from '@/data/genreTheme'

interface DraftShopProps {
  playerId: string
  canInteract: boolean
  onClose: () => void
}

// Stable empty reference so the selector doesn't churn when a player has no rewards
const EMPTY_REWARDS: PendingReward[] = []

export function DraftShop({ playerId, canInteract, onClose }: DraftShopProps) {
  const buyingIntoSlot = useRef(false)
  const player = useGameStore(selectPlayerById(playerId))
  const dispatch = useGameStore((state) => state.dispatch)

  // Shop state
  const elementOffers = useGameStore((state) => state.elementOffers)
  const elementBag = useGameStore((state) => state.elementBag)

  // Pending-reward queue (persists so buying more never discards unresolved rewards)
  const pendingRewards = useGameStore((state) => state.pendingRewards[playerId]) ?? EMPTY_REWARDS

  const selectedOfferIdx = useGameStore((state) => state.studio.selectedOfferIdx)
  const activeRewardId = useGameStore((state) => state.studio.activeRewardId)

  const selectedElement: Genre | null =
    selectedOfferIdx !== null ? elementOffers[selectedOfferIdx] ?? null : null

  const activeReward = pendingRewards.find((r) => r.id === activeRewardId) ?? null
  const activeDie = activeReward?.kind === 'die' ? activeReward.dice : null

  const handleBuyInspiration = () => {
    if (!canInteract) return
    dispatch({ type: 'BUY_INSPIRATION' })
  }

  if (!player) return null

  const inspirationCost = getInspirationCost(player.inspirationBoughtThisTurn)

  const handleUpgradeDie = (die: Dice) => {
    if (!canInteract || selectedOfferIdx === null) return
    const cost = getUpgradeCost(die.type)
    if (cost === null || player.exp < cost) return
    dispatch({ type: 'UPGRADE_DIE', offerIndex: selectedOfferIdx, diceId: die.id })
  }

  // Buy a d4 of the chosen element and drop it straight into the clicked slot
  // (into an empty slot, or replacing a die of another element)
  const handleBuyIntoSlot = async (songId: string, slotIndex: number) => {
    if (!canInteract || selectedOfferIdx === null || !selectedElement || player.exp < newD4Cost() || buyingIntoSlot.current) return
    buyingIntoSlot.current = true
    const existingIds = new Set((useGameStore.getState().pendingRewards[playerId] ?? []).map((reward) => reward.id))
    let unsubscribe = () => {}
    let timer: ReturnType<typeof setTimeout> | undefined
    // Online purchases arrive through SSE, which can follow the POST response.
    // Watch for this purchase rather than slotting a previously selected reward.
    const rewardReady = new Promise<string | null>((resolve) => {
      unsubscribe = useGameStore.subscribe((state) => {
        const reward = state.pendingRewards[playerId]?.find((item) =>
          !existingIds.has(item.id) && item.kind === 'die' && item.dice.genre === selectedElement
        )
        if (reward) resolve(reward.id)
      })
      // If the stream is unavailable, the purchase remains in Unclaimed Rewards.
      timer = setTimeout(() => resolve(null), 10000)
    })
    try {
      const result = await dispatch({ type: 'BUY_DIE', offerIndex: selectedOfferIdx })
      if (!result.ok) return
      const rewardId = await rewardReady
      const state = useGameStore.getState()
      if (rewardId && state.studio.playerId === playerId && state.players[state.currentTurnPlayerIndex]?.id === playerId) {
        await dispatch({ type: 'SLOT_DIE_REWARD', rewardId, songId, slotIndex })
      }
    } finally {
      unsubscribe()
      clearTimeout(timer)
      buyingIntoSlot.current = false
    }
  }

  const handleRefreshElements = () => {
    if (!canInteract || player.inspiration < inspirationSpend()) return
    dispatch({ type: 'REFRESH_ELEMENT_OFFERS' })
  }

  const handleSlotDice = (songId: string, slotIndex: number) => {
    if (!canInteract || !activeReward || !activeDie) return
    dispatch({ type: 'SLOT_DIE_REWARD', rewardId: activeReward.id, songId, slotIndex })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-6xl">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex justify-between items-start gap-3 mb-5 sm:mb-6">
            <div>
              <div className="font-display text-2xl text-gold-400">
                Studio
              </div>
              <p className="text-base text-parchment-400">
                {player.name} &mdash; <span className="text-gold-400 font-bold">{player.exp} EXP</span>
              </p>
              {!canInteract && (
                <div
                  className="inline-flex mt-2 rounded-full px-3 py-1 text-xs font-medieval font-bold text-sky-200"
                  style={{ background: 'rgba(80, 150, 220, 0.12)', border: '1px solid rgba(110, 180, 240, 0.35)' }}
                >
                  Watching {player.name}&rsquo;s Studio live
                </div>
              )}
              <div className="text-sm text-parchment-400 flex items-center gap-2 mt-1">
                <button
                  onClick={handleBuyInspiration}
                  disabled={!canInteract || player.exp < inspirationCost}
                  className="text-sm font-medieval font-bold rounded-lg px-3 py-1.5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5 whitespace-nowrap"
                  style={{
                    background: 'rgba(176, 124, 255, 0.14)',
                    border: '1px solid rgba(176, 124, 255, 0.45)',
                    color: '#d9c2ff',
                  }}
                  title={`Buy 1 Inspiration for ${inspirationCost} EXP (cost rises each purchase this turn)`}
                >
                  &#x2728; Buy Inspiration ({inspirationCost} EXP)
                </button>
                <span title="Inspiration">&#x2728; <span className="font-bold" style={{ color: '#d9c2ff' }}>{player.inspiration}</span></span>
              </div>
            </div>
            {canInteract && (
              <button
                onClick={onClose}
                className="text-parchment-400 hover:text-parchment-200 transition-colors text-xl leading-none p-1"
                title="Close Studio"
              >
                &#x2715;
              </button>
            )}
          </div>

          {/* Element chips drawn from the bag */}
          <div className="mb-6">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
              <div className="flex items-center gap-3">
                <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider">
                  Elements
                </div>
                <div className="text-sm text-parchment-500">
                  {elementBag.length} left in bag
                </div>
              </div>
              <button
                onClick={handleRefreshElements}
                disabled={!canInteract || player.inspiration < inspirationSpend()}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                title={player.inspiration >= inspirationSpend() ? 'Discard these chips and draw 4 new ones from the bag' : 'Requires Inspiration'}
              >
                Draw New (&#x2728; {inspirationSpend()})
              </button>
            </div>

            {elementOffers.length === 0 ? (
              <div className="rounded-lg p-4 text-sm text-parchment-500 italic text-center"
                style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(212, 168, 83, 0.15)' }}
              >
                No chips on display — draw new ones from the bag
              </div>
            ) : (
              <div className="flex w-full gap-3">
                {elementOffers.map((genre, offerIdx) => {
                  const { emoji, rgb } = GENRE_THEME[genre]
                  const isSelected = selectedOfferIdx === offerIdx
                  return (
                    <button
                      key={`${genre}-${offerIdx}`}
                      disabled={!canInteract}
                      className={`group relative w-full rounded-lg p-3 transition-all duration-200 ease-out animate-scale-in ${canInteract ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default'}`}
                      style={{
                        background: isSelected
                          ? `linear-gradient(160deg, rgba(${rgb}, 0.22) 0%, rgba(${rgb}, 0.06) 100%)`
                          : `linear-gradient(160deg, rgba(${rgb}, 0.1) 0%, rgba(42, 33, 24, 0.9) 100%)`,
                        border: isSelected
                          ? `1px solid rgba(${rgb}, 0.7)`
                          : `1px solid rgba(${rgb}, 0.25)`,
                        boxShadow: isSelected
                          ? `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 18px rgba(${rgb}, 0.3), 0 4px 10px rgba(0,0,0,0.4)`
                          : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 4px rgba(0,0,0,0.3)',
                      }}
                      onClick={() => dispatch({
                        type: 'SELECT_STUDIO_OFFER',
                        offerIndex: isSelected ? null : offerIdx,
                      })}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className="text-4xl transition-transform duration-200 ease-out group-hover:scale-110"
                          style={{ filter: `drop-shadow(0 0 8px rgba(${rgb}, ${isSelected ? 0.6 : 0.3}))` }}
                        >
                          {emoji}
                        </div>
                        <GenreBadge genre={genre} className="text-xs" />
                      </div>
                      {isSelected && (
                        <div
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold animate-scale-in"
                          style={{
                            background: `rgb(${rgb})`,
                            color: '#fff',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* With an element chosen, the song slots themselves become the shop */}
            {canInteract && !activeDie && (
              <div className="rounded-lg px-4 py-3 mt-3 animate-slide-up flex flex-wrap items-center gap-2 text-sm text-parchment-200"
                style={{
                  background: selectedElement ? 'rgba(212, 168, 83, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                  border: selectedElement ? '1px solid rgba(212, 168, 83, 0.25)' : '1px dashed rgba(212, 168, 83, 0.15)',
                }}
              >
                {!selectedElement ? (
                  <span className="text-parchment-400">Choose an element, then click a slot in Your Songs to buy or upgrade a die there.</span>
                ) : player.exp < newD4Cost() ? (
                  <>
                    <GenreBadge genre={selectedElement} className="text-xs" />
                    <span className="text-parchment-400">chosen, but a new d4 costs {newD4Cost()} EXP and you have {player.exp}.</span>
                  </>
                ) : (
                  <>
                    <GenreBadge genre={selectedElement} className="text-xs" />
                    <span>chosen. Now click a slot in Your Songs:</span>
                    <span className="font-bold text-gold-300">an empty slot buys a new <DiceShape type="d4" /> d4 ({newD4Cost()} EXP)</span>
                    <span className="text-parchment-500">&middot;</span>
                    <span className="font-bold text-gold-300">a {selectedElement} die upgrades it</span>
                    <span className="text-parchment-500">&middot;</span>
                    <span className="text-orange-300">any other die can be swapped for the new d4</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Pending rewards tray — queued purchases waiting to be placed */}
          {pendingRewards.length > 0 && (
            <div className="rounded-lg p-3 sm:p-4 mb-6 animate-fade-in"
              style={{
                background: 'rgba(212, 168, 83, 0.06)',
                border: '1px solid rgba(212, 168, 83, 0.3)',
              }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-sm font-bold text-gold-300">Unclaimed Rewards</span>
                <span className="text-xs text-parchment-500">
                  ({pendingRewards.length}) — pick one, then click a song below to place it
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {pendingRewards.map((reward) => {
                  const isActive = reward.id === activeRewardId
                  const { rgb } = GENRE_THEME[reward.dice.genre]
                  return (
                    <button
                      key={reward.id}
                      disabled={!canInteract}
                      onClick={() => dispatch({ type: 'SELECT_STUDIO_REWARD', rewardId: isActive ? null : reward.id })}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-150 ${canInteract ? 'hover:-translate-y-0.5' : 'cursor-default'}`}
                      style={{
                        background: isActive ? `rgba(${rgb}, 0.2)` : 'rgba(0,0,0,0.25)',
                        border: `1px solid rgba(${rgb}, ${isActive ? 0.8 : 0.35})`,
                        boxShadow: isActive ? `0 0 12px rgba(${rgb}, 0.3)` : undefined,
                      }}
                    >
                      <span className="text-lg text-gold-400"><DiceShape type={reward.dice.type} /></span>
                      <span className="text-sm font-bold text-parchment-200">{reward.dice.type}</span>
                      <GenreBadge genre={reward.dice.genre} className="text-[10px] px-1.5 py-0" />
                    </button>
                  )
                })}
              </div>
              {activeReward && (
                <div className="mt-2.5 text-xs text-parchment-400">
                  Click a song slot below to place this die (replacing an existing die = remix).
                </div>
              )}
            </div>
          )}

          {/* Player's songs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider">
                Your Songs
              </div>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212, 168, 83, 0.2), transparent)' }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {player.songs.map((song, songIndex) => (
                <div
                  key={song.id}
                  className="card w-full max-w-[280px] mx-auto transition-all duration-150"
                >
                  <div className="font-medieval text-base font-bold text-gold-400 mb-2 pb-2 text-center"
                    style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.2)' }}
                  >
                    Song {songIndex + 1}
                  </div>

                  <div className="flex justify-center gap-3">
                    {song.slots.map((slot, idx) => {
                      const upgradeCost = slot.dice ? getUpgradeCost(slot.dice.type) : null
                      const canAffordD4 = player.exp >= newD4Cost()
                      let offerAction: 'buy' | 'upgrade' | 'replace' | 'locked' | null = null
                      if (selectedElement && !activeDie) {
                        if (slot.dice?.genre === selectedElement) {
                          offerAction = upgradeCost !== null && player.exp >= upgradeCost ? 'upgrade' : 'locked'
                        } else if (canAffordD4) {
                          offerAction = slot.dice ? 'replace' : 'buy'
                        } else {
                          offerAction = 'locked'
                        }
                      }
                      const isOffer = offerAction === 'buy' || offerAction === 'upgrade' || offerAction === 'replace'
                      const slotLabel =
                        offerAction === 'buy'
                          ? `Buy a ${selectedElement} d4 for ${newD4Cost()} EXP into Song ${songIndex + 1}`
                          : offerAction === 'upgrade' && slot.dice
                          ? `Upgrade Song ${songIndex + 1}'s ${slot.dice.genre} ${slot.dice.type} to ${getNextDiceType(slot.dice.type)} for ${upgradeCost} EXP`
                          : offerAction === 'replace' && slot.dice
                          ? `Swap Song ${songIndex + 1}'s ${slot.dice.genre} ${slot.dice.type} for a new ${selectedElement} d4 (${newD4Cost()} EXP)`
                          : undefined
                      const offerRgb = selectedElement ? GENRE_THEME[selectedElement].rgb : '212, 168, 83'
                      const nextType = slot.dice ? getNextDiceType(slot.dice.type) : null
                      const onSlotClick = () => {
                        if (offerAction === 'buy' || offerAction === 'replace') return handleBuyIntoSlot(song.id, idx)
                        if (offerAction === 'upgrade' && slot.dice) return handleUpgradeDie(slot.dice)
                        handleSlotDice(song.id, idx)
                      }
                      return (
                        <button
                          key={idx}
                          onClick={onSlotClick}
                          disabled={!canInteract || (!activeDie && !isOffer)}
                          aria-label={slotLabel}
                          title={slotLabel}
                          className={`flex-1 h-24 rounded-lg flex flex-col items-center justify-center text-xs relative transition-all duration-150 ${songIndex === 0 && idx === 0 ? 'gap-1.5 py-2' : ''} ${isOffer ? 'hover:-translate-y-0.5' : ''}`}
                          style={{
                            opacity: offerAction === 'locked' ? 0.35 : 1,
                            background:
                              offerAction === 'buy' || offerAction === 'upgrade'
                                ? `rgba(${offerRgb}, 0.14)`
                                : slot.dice
                                ? activeDie
                                  ? 'rgba(200, 100, 0, 0.1)'
                                  : 'rgba(212, 168, 83, 0.1)'
                                : activeDie
                                ? 'rgba(0, 100, 200, 0.1)'
                                : 'rgba(255, 255, 255, 0.02)',
                            border:
                              offerAction === 'buy'
                                ? `1px dashed rgba(${offerRgb}, 0.8)`
                                : offerAction === 'replace'
                                ? '1px dashed rgba(255, 170, 90, 0.45)'
                                : offerAction === 'upgrade'
                                ? `1px solid rgba(${offerRgb}, 0.85)`
                                : slot.dice
                                ? activeDie
                                  ? '1px solid rgba(255, 180, 100, 0.4)'
                                  : '1px solid rgba(212, 168, 83, 0.25)'
                                : activeDie
                                ? '1px solid rgba(100, 180, 255, 0.4)'
                                : '1px dashed rgba(212, 168, 83, 0.12)',
                            boxShadow: offerAction === 'buy' || offerAction === 'upgrade' ? `0 0 14px rgba(${offerRgb}, 0.25)` : undefined,
                            cursor: (activeDie || isOffer) && canInteract ? 'pointer' : 'default',
                          }}
                        >
                          {slot.dice ? (
                            <div className={`text-center relative flex flex-col ${songIndex === 0 && idx === 0 ? 'items-center' : ''}`}>
                              <div className="text-2xl mb-0.5 text-gold-400"><DiceShape type={slot.dice.type} /></div>
                              <div className="absolute -top-1 -right-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                style={{
                                  background: 'linear-gradient(135deg, #b8922e, #d4a853)',
                                  color: '#1a1410',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                }}
                              >
                                {getMaxValue(slot.dice.type)}
                              </div>
                              <GenreBadge genre={slot.dice.genre} className="text-[9px] px-1 py-0" />
                            </div>
                          ) : offerAction === 'buy' ? (
                            <div className="text-center leading-tight">
                              <div className="text-sm font-bold text-parchment-100">+ <DiceShape type="d4" /> d4</div>
                              <div className="text-[11px] font-bold text-gold-300 mt-1">{newD4Cost()} EXP</div>
                            </div>
                          ) : (
                            <div className="text-parchment-500/30 text-xs">Empty</div>
                          )}
                          {nextType && offerAction === 'upgrade' && (
                            <div className={`${songIndex === 0 && idx === 0 ? 'mt-0.5 border-t border-gold-400/20 px-1.5 pt-1' : 'absolute bottom-1'} text-[10px] font-bold leading-none text-gold-300 whitespace-nowrap`}>
                              &uarr; {nextType} &middot; {upgradeCost} EXP
                            </div>
                          )}
                          {offerAction === 'replace' && (
                            <div className="absolute bottom-1 text-[10px] font-bold text-orange-300/80 whitespace-nowrap">
                              &#x21C4; swap &middot; {newD4Cost()} EXP
                            </div>
                          )}
                          {activeDie && slot.dice && (
                            <div className="absolute bottom-1 text-[10px] text-orange-400 font-bold">
                              Remix
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
