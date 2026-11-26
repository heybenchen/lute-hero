import { useRef, useState } from 'react'
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
import { getTunables } from '@/data/tunables'
import { StyleShelf } from './StyleShelf'
import { RefreshCw } from 'lucide-react'

interface DraftShopProps {
  playerId: string
  canInteract: boolean
  onClose: () => void
}

// Stable empty reference so the selector doesn't churn when a player has no rewards
const EMPTY_REWARDS: PendingReward[] = []

export function DraftShop({ playerId, canInteract, onClose }: DraftShopProps) {
  const [replaceMode, setReplaceMode] = useState(false)
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

  const setlistFull = player.songs.every((song) => song.slots[0].dice)
  const handleBuyIntoSlot = async (songId: string, previousDieId: string | null) => {
    if (!canInteract || selectedOfferIdx === null || !selectedElement || buyingIntoSlot.current) return
    buyingIntoSlot.current = true
    try {
      const result = await dispatch({ type: 'BUY_DIE', offerIndex: selectedOfferIdx,
        destination: { songId, previousDieId, genre: selectedElement } })
      if (result.ok) setReplaceMode(false)
    } finally {
      buyingIntoSlot.current = false
    }
  }

  const handleRefreshOffers = () => {
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
            <div className="min-w-0 flex-1">
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
              {/* Inspiration: buy one, or spend one to redraw the elements and styles on offer */}
              <div className="mt-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <button
                  onClick={handleBuyInspiration}
                  disabled={!canInteract || player.exp < inspirationCost}
                  className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medieval font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:-translate-y-0.5 sm:px-3"
                  style={{
                    background: 'rgba(176, 124, 255, 0.14)',
                    border: '1px solid rgba(176, 124, 255, 0.45)',
                    color: '#d9c2ff',
                  }}
                  title={`Buy 1 Inspiration for ${inspirationCost} EXP${getTunables().inspirationCostStep > 0 ? ' (cost rises each purchase this turn)' : ''}`}
                >
                  Buy &#x2728; <span className="font-normal opacity-80">({inspirationCost} EXP)</span>
                </button>
                <span className="whitespace-nowrap pl-1" title="Inspiration you hold">
                  &#x2728; <span className="font-bold" style={{ color: '#d9c2ff' }}>{player.inspiration}</span>
                </span>
                <button
                  onClick={handleRefreshOffers}
                  disabled={!canInteract || player.inspiration < inspirationSpend()}
                  className="btn-secondary ml-auto flex items-center gap-1 whitespace-nowrap px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-sm"
                  title={player.inspiration >= inspirationSpend()
                    ? `Spend ${inspirationSpend()} Inspiration to draw new element cubes and new genre offers`
                    : 'Requires Inspiration'}
                >
                  <RefreshCw size={13} aria-hidden="true" /> Refresh <span className="font-normal opacity-80">(&#x2728;{inspirationSpend()})</span>
                </button>
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

          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-8">
            <section
              className="rounded-xl p-4 sm:p-5"
              style={{
                background: 'rgba(17, 12, 8, 0.42)',
                border: '1px solid rgba(212, 168, 83, 0.18)',
              }}
            >
              <StudioSection
                title="Available to Learn"
              />

              {/* Element chips drawn from the bag */}
              <div>
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider">
                      Dice Elements
                    </div>
                    <div className="text-sm text-parchment-500">
                      {elementBag.length} left in bag
                    </div>
                  </div>
                </div>

                {elementOffers.length === 0 ? (
                  <div className="rounded-lg p-4 text-sm text-parchment-500 italic text-center"
                    style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(212, 168, 83, 0.15)' }}
                  >
                    No chips on display — draw new ones from the bag
                  </div>
                ) : (
                  <div className="grid w-full grid-cols-2 gap-2">
                    {elementOffers.map((genre, offerIdx) => {
                      const { emoji, rgb } = GENRE_THEME[genre]
                      const isSelected = selectedOfferIdx === offerIdx
                      return (
                        <button
                          key={`${genre}-${offerIdx}`}
                          disabled={!canInteract}
                          className={`group relative w-full min-w-0 rounded-lg px-1 py-3 transition-all duration-200 ease-out animate-scale-in ${canInteract ? 'cursor-pointer' : 'cursor-default'}`}
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
                              className="text-4xl transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-110"
                              style={{ filter: `drop-shadow(0 0 8px rgba(${rgb}, ${isSelected ? 0.6 : 0.3}))` }}
                            >
                              {emoji}
                            </div>
                            <GenreBadge genre={genre} className="text-xs transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-105" />
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
                {canInteract && !activeDie && selectedElement && (
                  <div className="rounded-lg px-3 py-3 mt-3 animate-slide-up flex flex-wrap items-center gap-2 text-sm text-parchment-200"
                    style={{
                      background: 'rgba(212, 168, 83, 0.05)',
                      border: '1px solid rgba(212, 168, 83, 0.25)',
                    }}
                  >
                    {setlistFull ? (
                      <>
                        <span>{replaceMode ? `Choose the die to replace with a ${selectedElement} d4 (${newD4Cost()} EXP).` : `Choose a matching die to upgrade, or buy a new ${selectedElement} d4.`}</span>
                        <button className="btn-secondary" aria-pressed={replaceMode} onClick={() => setReplaceMode(!replaceMode)}>
                          {replaceMode ? 'Cancel replacement' : `Replace a die · ${newD4Cost()} EXP`}
                        </button>
                      </>
                    ) : player.exp < newD4Cost() ? (
                      <>
                        <GenreBadge genre={selectedElement} className="text-xs" />
                        <span className="text-parchment-400">chosen, but a new d4 costs {newD4Cost()} EXP and you have {player.exp}.</span>
                      </>
                    ) : (
                      <>
                        <GenreBadge genre={selectedElement} className="text-xs" />
                        <span>chosen. Use your setlist to buy a new <DiceShape type="d4" /> d4 ({newD4Cost()} EXP) or upgrade a matching die.</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section
              className="rounded-xl p-4 sm:p-5"
              style={{
                background: 'rgba(58, 43, 27, 0.3)',
                border: '1px solid rgba(212, 168, 83, 0.24)',
              }}
            >
              <StudioSection
                title="Your collection"
              />

              {/* Pending rewards tray — queued purchases waiting to be placed */}
              {pendingRewards.length > 0 && (
                <div className="rounded-lg p-3 sm:p-4 mb-5 animate-fade-in"
                  style={{
                    background: 'rgba(212, 168, 83, 0.06)',
                    border: '1px solid rgba(212, 168, 83, 0.3)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-sm font-bold text-gold-300">Unclaimed Purchases</span>
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
                      Click an empty song slot below to place this die.
                    </div>
                  )}
                </div>
              )}

              {/* The bard's setlist: every song they can perform */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider">
                    Songs
                  </div>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212, 168, 83, 0.2), transparent)' }} />
                </div>
                <div className={`grid grid-cols-3 gap-2 sm:gap-3 ${player.songs.length > 6 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
                  {player.songs.map((song, songIndex) => (
                    <div
                      key={song.id}
                      className="card w-full min-w-0 mx-auto transition-all duration-150"
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
                          let offerAction: 'buy' | 'buy-locked' | 'upgrade' | 'upgrade-locked' | 'locked' | null = null
                          if (selectedElement && !activeDie) {
                            if (setlistFull && replaceMode) {
                              offerAction = canAffordD4 ? 'buy' : 'buy-locked'
                            } else if (slot.dice?.genre === selectedElement) {
                              offerAction = upgradeCost === null
                                ? 'locked'
                                : player.exp >= upgradeCost
                                ? 'upgrade'
                                : 'upgrade-locked'
                            } else if (!slot.dice) {
                              offerAction = canAffordD4 ? 'buy' : 'buy-locked'
                            } else {
                              offerAction = 'locked'
                            }
                          }
                          const isOffer = offerAction === 'buy' || offerAction === 'upgrade'
                          const slotLabel =
                            (offerAction === 'buy' || offerAction === 'buy-locked')
                              ? `${slot.dice ? 'Replace ' + slot.dice.genre + ' ' + slot.dice.type + ' with' : 'Buy'} a ${selectedElement} d4 for ${newD4Cost()} EXP into Song ${songIndex + 1}`
                              : (offerAction === 'upgrade' || offerAction === 'upgrade-locked') && slot.dice
                              ? `Upgrade Song ${songIndex + 1}'s ${slot.dice.genre} ${slot.dice.type} to ${getNextDiceType(slot.dice.type)} for ${upgradeCost} EXP`
                              : undefined
                          const offerRgb = selectedElement ? GENRE_THEME[selectedElement].rgb : '212, 168, 83'
                          const nextType = slot.dice ? getNextDiceType(slot.dice.type) : null
                          const onSlotClick = () => {
                            if (offerAction === 'buy') return handleBuyIntoSlot(song.id, slot.dice?.id ?? null)
                            if (offerAction === 'upgrade' && slot.dice) return handleUpgradeDie(slot.dice)
                            handleSlotDice(song.id, idx)
                          }
                          return (
                            <button
                              key={idx}
                              onClick={onSlotClick}
                              disabled={!canInteract || (activeDie ? Boolean(slot.dice) : !isOffer)}
                              aria-label={slotLabel}
                              title={slotLabel}
                              className={`flex-1 h-24 rounded-lg flex flex-col items-center justify-center gap-1.5 py-2 text-xs relative transition-all duration-150 ${isOffer ? 'hover:-translate-y-0.5' : ''}`}
                              style={{
                                opacity: offerAction === 'locked' || offerAction === 'buy-locked' || offerAction === 'upgrade-locked' || (activeDie && slot.dice) ? 0.35 : 1,
                                background:
                                  offerAction === 'buy' || offerAction === 'buy-locked' || offerAction === 'upgrade' || offerAction === 'upgrade-locked'
                                    ? `rgba(${offerRgb}, 0.14)`
                                    : slot.dice
                                    ? activeDie
                                      ? 'rgba(200, 100, 0, 0.1)'
                                      : 'rgba(212, 168, 83, 0.1)'
                                    : activeDie
                                    ? 'rgba(0, 100, 200, 0.1)'
                                    : 'rgba(255, 255, 255, 0.02)',
                                border:
                                  offerAction === 'buy' || offerAction === 'buy-locked'
                                    ? `1px dashed rgba(${offerRgb}, 0.8)`
                                    : offerAction === 'upgrade' || offerAction === 'upgrade-locked'
                                    ? `1px solid rgba(${offerRgb}, 0.85)`
                                    : slot.dice
                                    ? activeDie
                                      ? '1px solid rgba(255, 180, 100, 0.4)'
                                      : '1px solid rgba(212, 168, 83, 0.25)'
                                    : activeDie
                                    ? '1px solid rgba(100, 180, 255, 0.4)'
                                    : '1px dashed rgba(212, 168, 83, 0.12)',
                                boxShadow: offerAction === 'buy' || offerAction === 'upgrade' ? `0 0 14px rgba(${offerRgb}, 0.25)` : undefined,
                                cursor: offerAction === 'buy-locked' || offerAction === 'upgrade-locked'
                                  ? 'not-allowed'
                                  : (activeDie || isOffer) && canInteract
                                  ? 'pointer'
                                  : 'default',
                              }}
                            >
                              {slot.dice ? (
                                <div className="text-center relative flex flex-col items-center">
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
                              ) : offerAction === 'buy' || offerAction === 'buy-locked' ? (
                                <div className="text-center leading-tight">
                                  <div className="text-sm font-bold text-parchment-100">+ <DiceShape type="d4" /> d4</div>
                                  <div className={`mt-1 text-[11px] font-bold ${offerAction === 'buy-locked' ? 'text-parchment-100' : 'text-gold-300'}`}>
                                    {newD4Cost()} EXP
                                  </div>
                                </div>
                              ) : (
                                <div className="text-parchment-500/30 text-xs">Empty</div>
                              )}
                              {slot.dice && offerAction === 'buy' && <span className="text-xs text-gold-300">Replace · {newD4Cost()} EXP</span>}
                              {nextType && (offerAction === 'upgrade' || offerAction === 'upgrade-locked') && (
                                <div
                                  className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg text-center leading-tight"
                                  style={{
                                    background: `linear-gradient(rgba(${offerRgb}, 0.14), rgba(${offerRgb}, 0.14)), rgb(42, 33, 24)`,
                                  }}
                                >
                                  <div className="flex items-center gap-1 text-sm font-bold text-parchment-100">
                                    <span aria-hidden="true">&uarr;</span>
                                    <DiceShape type={nextType} />
                                    <span>{nextType}</span>
                                  </div>
                                  <div className={`mt-1 text-[11px] font-bold ${offerAction === 'upgrade-locked' ? 'text-parchment-100' : 'text-gold-300'}`}>
                                    {upgradeCost} EXP
                                  </div>
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
            </section>

            {/* ===== Genres: offers on the left, learned genres on the right ===== */}
            <div className="lg:col-span-2">
              <StyleShelf player={player} canInteract={canInteract} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** A heading for one side of the Studio's market/collection split. */
function StudioSection({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="font-display text-xl text-gold-300">{title}</div>
      {subtitle && <p className="text-sm text-parchment-400">{subtitle}</p>}
    </div>
  )
}
