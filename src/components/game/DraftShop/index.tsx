import { useState } from 'react'
import { useGameStore, selectPlayerById } from '@/store'
import { DraftCard, Genre, Dice, PendingReward } from '@/types'
import { DraftCardDisplay } from './DraftCardDisplay'
import { describeTrackEffect } from '@/data/trackEffects'
import { getMaxValue } from '@/game-logic/dice/roller'
import { GenreBadge } from '@/components/ui/GenreBadge'
import { DiceShape } from '@/components/ui/DiceShape'
import {
  NEW_D4_COST,
  getNextDiceType,
  getUpgradeCost,
  getInspirationCost,
  INSPIRATION_SPEND,
} from '@/data/draftCards'
import { GENRE_THEME } from '@/data/genreTheme'

interface DraftShopProps {
  playerId: string
  onClose: () => void
}

interface OwnedDie {
  dice: Dice
  songName: string
  songIndex: number
  slotIndex: number
}

// Stable empty reference so the selector doesn't churn when a player has no rewards
const EMPTY_REWARDS: PendingReward[] = []

export function DraftShop({ playerId, onClose }: DraftShopProps) {
  const player = useGameStore(selectPlayerById(playerId))
  const dispatch = useGameStore((state) => state.dispatch)

  // Shop state
  const namePool = useGameStore((state) => state.namePool)
  const elementOffers = useGameStore((state) => state.elementOffers)
  const elementBag = useGameStore((state) => state.elementBag)

  // Pending-reward queue (persists so buying more never discards unresolved rewards)
  const pendingRewards = useGameStore((state) => state.pendingRewards[playerId]) ?? EMPTY_REWARDS

  const [selectedOfferIdx, setSelectedOfferIdx] = useState<number | null>(null)
  const [activeRewardId, setActiveRewardId] = useState<string | null>(null)

  const selectedElement: Genre | null =
    selectedOfferIdx !== null ? elementOffers[selectedOfferIdx] ?? null : null

  const activeReward = pendingRewards.find((r) => r.id === activeRewardId) ?? null
  const activeDie = activeReward?.kind === 'die' ? activeReward.dice : null
  const activeName = activeReward?.kind === 'name' ? activeReward : null

  const handleRefreshNames = () => {
    if (!player || player.inspiration < INSPIRATION_SPEND) return
    dispatch({ type: 'REFRESH_NAME_POOL' })
  }

  const handleBuyInspiration = () => {
    dispatch({ type: 'BUY_INSPIRATION' })
  }

  // The engine mints reward ids; grab the newest one to auto-select it
  const selectNewestReward = () => {
    const rewards = useGameStore.getState().pendingRewards[playerId] ?? []
    setActiveRewardId(rewards[rewards.length - 1]?.id ?? null)
  }

  if (!player) return null

  const inspirationCost = getInspirationCost(player.inspirationBoughtThisTurn)

  // All dice the player owns of the selected element, with their location
  const ownedDiceOfElement: OwnedDie[] = selectedElement
    ? player.songs.flatMap((song, songIndex) =>
        song.slots.flatMap((slot, slotIndex) =>
          slot.dice && slot.dice.genre === selectedElement
            ? [{ dice: slot.dice, songName: song.name, songIndex, slotIndex }]
            : []
        )
      )
    : []

  const handleBuyNewD4 = async () => {
    if (selectedOfferIdx === null || !selectedElement || player.exp < NEW_D4_COST) return
    const result = await dispatch({ type: 'BUY_DIE', offerIndex: selectedOfferIdx })
    if (result.ok) selectNewestReward()
    setSelectedOfferIdx(null)
  }

  const handleUpgradeDie = (die: Dice) => {
    if (selectedOfferIdx === null) return
    const cost = getUpgradeCost(die.type)
    if (cost === null || player.exp < cost) return
    dispatch({ type: 'UPGRADE_DIE', offerIndex: selectedOfferIdx, diceId: die.id })
    setSelectedOfferIdx(null)
  }

  const handleRefreshElements = () => {
    if (player.inspiration < INSPIRATION_SPEND) return
    setSelectedOfferIdx(null)
    dispatch({ type: 'REFRESH_ELEMENT_OFFERS' })
  }

  const handlePurchaseName = async (card: DraftCard) => {
    if (!player || player.exp < card.cost) return
    const result = await dispatch({ type: 'BUY_NAME', cardId: card.id })
    if (result.ok) selectNewestReward()
  }

  const handleApplyName = (songId: string) => {
    if (!activeName) return
    dispatch({ type: 'SLOT_NAME_REWARD', rewardId: activeName.id, songId })
    setActiveRewardId(null)
  }

  const handleSlotDice = (songId: string, slotIndex: number, isReplacement: boolean = false) => {
    if (!activeDie || !activeReward) return

    const song = player.songs.find((s) => s.id === songId)
    if (!song) return

    if (!isReplacement && song.slots[slotIndex].dice) return

    dispatch({ type: 'SLOT_DIE_REWARD', rewardId: activeReward.id, songId, slotIndex })
    setActiveRewardId(null)
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
                <span className="mx-1.5 text-parchment-600">&middot;</span>
                <span title="Inspiration">&#x2728; <span className="font-bold" style={{ color: '#d9c2ff' }}>{player.inspiration}</span></span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              <button
                onClick={handleBuyInspiration}
                disabled={player.exp < inspirationCost}
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
              <button onClick={onClose} className="btn-secondary text-sm">
                Close Shop
              </button>
            </div>
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
                  if (reward.kind === 'die') {
                    const { rgb } = GENRE_THEME[reward.dice.genre]
                    return (
                      <button
                        key={reward.id}
                        onClick={() => setActiveRewardId(isActive ? null : reward.id)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-150 hover:-translate-y-0.5"
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
                  }
                  return (
                    <button
                      key={reward.id}
                      onClick={() => setActiveRewardId(isActive ? null : reward.id)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-150 hover:-translate-y-0.5"
                      style={{
                        background: isActive ? 'rgba(176, 124, 255, 0.2)' : 'rgba(0,0,0,0.25)',
                        border: `1px solid rgba(176, 124, 255, ${isActive ? 0.8 : 0.35})`,
                        boxShadow: isActive ? '0 0 12px rgba(176, 124, 255, 0.3)' : undefined,
                      }}
                    >
                      <span className="text-sm">🎵</span>
                      <span className="text-sm font-bold text-classical">"{reward.name}"</span>
                      {reward.effect && (
                        <span className="text-[10px] text-classical/70 hidden sm:inline">
                          {describeTrackEffect(reward.effect)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {activeReward && (
                <div className="mt-2.5 text-xs text-parchment-400">
                  {activeDie
                    ? 'Click a song slot below to place this die (replacing an existing die = remix).'
                    : 'Click a song below to name it and grant its effect.'}
                </div>
              )}
            </div>
          )}

          {/* Element chips drawn from the bag */}
          <div className="mb-6">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
              <div className="flex items-center gap-3">
                <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider">
                  Elements
                </div>
                <div className="text-sm text-parchment-500">
                  Take a chip: new d4 ({NEW_D4_COST} EXP) or an upgrade &middot; {elementBag.length} left in bag
                </div>
              </div>
              <button
                onClick={handleRefreshElements}
                disabled={player.inspiration < INSPIRATION_SPEND}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                title={player.inspiration >= INSPIRATION_SPEND ? 'Discard these chips and draw 4 new ones from the bag' : 'Requires Inspiration'}
              >
                Draw New (&#x2728; {INSPIRATION_SPEND})
              </button>
            </div>

            {elementOffers.length === 0 ? (
              <div className="rounded-lg p-4 text-sm text-parchment-500 italic text-center"
                style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(212, 168, 83, 0.15)' }}
              >
                No chips on display — draw new ones from the bag
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {elementOffers.map((genre, offerIdx) => {
                  const { emoji, rgb } = GENRE_THEME[genre]
                  const isSelected = selectedOfferIdx === offerIdx
                  return (
                    <button
                      key={`${genre}-${offerIdx}`}
                      className="group relative rounded-lg p-3 cursor-pointer transition-all duration-200 ease-out hover:-translate-y-1 animate-scale-in"
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
                      onClick={() => setSelectedOfferIdx(isSelected ? null : offerIdx)}
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

            {/* Options for the selected element */}
            {selectedElement && (
              <div className="rounded-lg p-4 mt-3 animate-slide-up"
                style={{
                  background: 'rgba(212, 168, 83, 0.05)',
                  border: '1px solid rgba(212, 168, 83, 0.25)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <GenreBadge genre={selectedElement} className="text-xs" />
                  <span className="text-sm text-parchment-400">
                    — buy a new die or upgrade an existing one
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 items-stretch">
                  {/* New d4 */}
                  <button
                    onClick={handleBuyNewD4}
                    disabled={player.exp < NEW_D4_COST}
                    className="btn-primary text-sm px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <DiceShape type="d4" /> New d4 &mdash; {NEW_D4_COST} EXP
                  </button>

                  {/* Upgrades for owned dice of this element */}
                  {ownedDiceOfElement.length === 0 ? (
                    <div className="text-sm text-parchment-500 italic self-center">
                      No {selectedElement} dice slotted in your songs yet
                    </div>
                  ) : (
                    ownedDiceOfElement.map(({ dice, songName, songIndex, slotIndex }) => {
                      const nextType = getNextDiceType(dice.type)
                      const cost = getUpgradeCost(dice.type)
                      const affordable = cost !== null && player.exp >= cost
                      return (
                        <button
                          key={dice.id}
                          onClick={() => handleUpgradeDie(dice)}
                          disabled={!nextType || !affordable}
                          className="btn-secondary text-sm px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed text-left"
                        >
                          <div className="font-bold">
                            <DiceShape type={dice.type} /> {dice.type}
                            {nextType ? (
                              <span> &rarr; <DiceShape type={nextType} /> {nextType} &mdash; {cost} EXP</span>
                            ) : (
                              <span className="text-parchment-500"> (max)</span>
                            )}
                          </div>
                          <div className="text-[10px] text-parchment-500 font-normal">
                            {songName || `Song ${songIndex + 1}`} &middot; slot {slotIndex + 1}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Song name cards */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider">
                  Song Names
                </div>
                <div className="text-sm text-parchment-500 hidden sm:block">
                  ({namePool.length} available) &mdash; Names grant effects to your songs
                </div>
              </div>
              <button
                onClick={handleRefreshNames}
                disabled={player.inspiration < INSPIRATION_SPEND}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                title={player.inspiration >= INSPIRATION_SPEND ? 'Draw a fresh set of song names' : 'Requires Inspiration'}
              >
                Refresh (&#x2728; {INSPIRATION_SPEND})
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {namePool.map((card) => (
                <DraftCardDisplay
                  key={card.id}
                  card={card}
                  onPurchase={() => handlePurchaseName(card)}
                  canAfford={player.exp >= card.cost}
                />
              ))}
            </div>
          </div>

          {/* Player's songs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider">
                Your Songs
              </div>
              <div className="text-sm text-parchment-500">
                ({player.songs.length})
                {activeName
                  ? ' — click a song to apply name'
                  : activeDie
                  ? ' — click any slot to place die (replace existing = remix)'
                  : ' — buy an element or name above to improve your songs'
                }
              </div>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212, 168, 83, 0.2), transparent)' }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {player.songs.map((song) => (
                <div
                  key={song.id}
                  className={`card w-full max-w-[280px] mx-auto transition-all duration-150 ${activeName ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                  style={activeName ? {
                    border: '1px solid rgba(176, 124, 255, 0.4)',
                    boxShadow: '0 0 12px rgba(176, 124, 255, 0.1)',
                  } : undefined}
                  onClick={() => activeName && handleApplyName(song.id)}
                >
                  <div className="font-medieval text-base font-bold text-gold-400 mb-2 pb-2"
                    style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.2)' }}
                  >
                    {song.name || <span className="text-parchment-500 italic">Untitled</span>}
                    {activeName && song.name && (
                      <span className="text-xs text-classical/60 font-normal ml-1">(rename)</span>
                    )}
                  </div>

                  {/* Show song effect */}
                  {song.effect ? (
                    <div className="mb-2">
                      <div className="p-1.5 rounded text-xs flex items-center gap-1.5"
                        style={{ background: 'rgba(176, 124, 255, 0.08)', border: '1px solid rgba(176, 124, 255, 0.15)' }}
                      >
                        <span className="font-bold text-classical shrink-0">FX:</span>
                        <span className="text-classical/80 truncate">
                          {describeTrackEffect(song.effect)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2 p-1.5 rounded text-xs text-parchment-500 italic"
                      style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(212, 168, 83, 0.1)' }}
                    >
                      No effects — buy a name to add effects
                    </div>
                  )}

                  <div className="flex justify-center gap-3">
                    {song.slots.map((slot, idx) => {
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSlotDice(song.id, idx, !!slot.dice)}
                          disabled={!activeDie}
                          className="w-20 h-20 aspect-square shrink-0 rounded-lg flex flex-col items-center justify-center text-xs relative transition-all duration-150"
                          style={{
                            background: slot.dice
                              ? activeDie
                                ? 'rgba(200, 100, 0, 0.1)'
                                : 'rgba(212, 168, 83, 0.1)'
                              : activeDie && !slot.dice
                              ? 'rgba(0, 100, 200, 0.1)'
                              : 'rgba(255, 255, 255, 0.02)',
                            border: slot.dice
                              ? activeDie
                                ? '1px solid rgba(255, 180, 100, 0.4)'
                                : '1px solid rgba(212, 168, 83, 0.25)'
                              : activeDie
                              ? '1px solid rgba(100, 180, 255, 0.4)'
                              : '1px dashed rgba(212, 168, 83, 0.12)',
                            cursor: activeDie ? 'pointer' : 'default',
                          }}
                        >
                          {slot.dice ? (
                            <div className="text-center relative">
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
                          ) : (
                            <div className="text-parchment-500/30 text-xs">Empty</div>
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
