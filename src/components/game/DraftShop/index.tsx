import { useState } from 'react'
import { useGameStore, selectPlayerById, selectCollectiveFame } from '@/store'
import { DraftCard, Song, DiceType, Genre, Dice, TrackEffect } from '@/types'
import { DraftCardDisplay } from './DraftCardDisplay'
import { TRACK_EFFECT_DESCRIPTIONS } from '@/data/trackEffects'
import { getMaxValue } from '@/game-logic/dice/roller'
import { GenreBadge } from '@/components/ui/GenreBadge'
import { getInspirationCost, D12_FAME_THRESHOLD, D20_FAME_THRESHOLD } from '@/data/draftCards'

const diceIcons: Record<DiceType, string> = {
  d4: '\u25B3',
  d6: '\u2684',
  d12: '\u2B22',
  d20: '\u2B1F',
}

interface DraftShopProps {
  playerId: string
  onClose: () => void
}

const REFRESH_COST = 5

/**
 * Count total dice of each genre across all players (for inspiration weighting).
 */
function getPlayerGenreCounts(players: { songs: Song[] }[]): Record<Genre, number> {
  const counts: Record<Genre, number> = { Ballad: 0, Folk: 0, Hymn: 0, Shanty: 0 }
  for (const player of players) {
    for (const song of player.songs) {
      for (const slot of song.slots) {
        if (slot.dice) {
          counts[slot.dice.genre]++
        }
      }
    }
  }
  return counts
}

export function DraftShop({ playerId, onClose }: DraftShopProps) {
  const player = useGameStore(selectPlayerById(playerId))
  const players = useGameStore((state) => state.players)
  const collectiveFame = useGameStore(selectCollectiveFame)
  const awardPlayerExp = useGameStore((state) => state.awardPlayerExp)
  const applyNameToSong = useGameStore((state) => state.applyNameToSong)

  // Shop state
  const namePool = useGameStore((state) => state.namePool)
  const purchaseFromNamePool = useGameStore((state) => state.purchaseFromNamePool)
  const refreshNamePool = useGameStore((state) => state.refreshNamePool)

  // Inspiration state
  const inspirationRevealed = useGameStore((state) => state.inspirationRevealed)
  const inspirationRollCount = useGameStore((state) => state.inspirationRollCount)
  const rerollInspiration = useGameStore((state) => state.rerollInspiration)
  const purchaseInspirationDie = useGameStore((state) => state.purchaseInspirationDie)

  const [selectedDie, setSelectedDie] = useState<Dice | null>(null)

  // Pending name that needs a target song
  const [pendingName, setPendingName] = useState<{
    name: string
    effects: TrackEffect[]
    cardId: string
  } | null>(null)

  const rerollCost = getInspirationCost(inspirationRollCount)

  const handleRefreshNames = () => {
    if (!player || player.exp < REFRESH_COST) return
    awardPlayerExp(playerId, -REFRESH_COST)
    refreshNamePool()
  }

  if (!player) return null

  const handleRerollInspiration = () => {
    if (!player || player.exp < rerollCost) return
    awardPlayerExp(playerId, -rerollCost)
    const genreCounts = getPlayerGenreCounts(players)
    rerollInspiration(genreCounts, collectiveFame)
  }

  const handleSelectInspirationDie = (index: number) => {
    const revealed = inspirationRevealed[index]
    if (!revealed || !player || player.exp < revealed.cost) return

    awardPlayerExp(playerId, -revealed.cost)
    const genreCounts = getPlayerGenreCounts(players)
    const die = purchaseInspirationDie(index, genreCounts, collectiveFame)
    if (die) {
      setSelectedDie(die)
    }
  }

  const handlePurchaseName = (card: DraftCard) => {
    if (!player || player.exp < card.cost) return

    const effects: TrackEffect[] = [
      ...(card.songEffect ? [card.songEffect] : []),
      ...(card.songEffect2 ? [card.songEffect2] : []),
    ]

    awardPlayerExp(playerId, -card.cost)
    setPendingName({ name: card.songName || 'New Song', effects, cardId: card.id })
    purchaseFromNamePool(card.id)
  }

  const handleApplyName = (songId: string) => {
    if (!pendingName) return
    applyNameToSong(playerId, songId, pendingName.name, pendingName.effects)
    setPendingName(null)
  }

  const handleSlotDice = (songId: string, slotIndex: number, isReplacement: boolean = false) => {
    if (!selectedDie) return

    const song = player.songs.find((s) => s.id === songId)
    if (!song) return

    if (!isReplacement && song.slots[slotIndex].dice) return

    useGameStore.getState().addDiceToPlayer(playerId, selectedDie, songId, slotIndex)
    setSelectedDie(null)
  }

  // Show which dice tiers are locked
  const d12Locked = collectiveFame < D12_FAME_THRESHOLD
  const d20Locked = collectiveFame < D20_FAME_THRESHOLD

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-6xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="font-display text-2xl text-gold-400">
                Studio
              </div>
              <p className="text-sm text-parchment-400">
                {player.name} &mdash; <span className="text-gold-400 font-bold">{player.exp} EXP</span> Available
              </p>
            </div>
            <button onClick={onClose} className="btn-secondary text-sm">
              Close Shop
            </button>
          </div>

          {/* Pending name application */}
          {pendingName && (
            <div className="rounded-lg p-4 mb-6 animate-fade-in"
              style={{
                background: 'rgba(176, 124, 255, 0.08)',
                border: '1px solid rgba(176, 124, 255, 0.3)',
              }}
            >
              <div className="font-bold text-classical mb-2 text-sm">
                Choose a song to name "{pendingName.name}":
              </div>
              <div className="flex gap-3 flex-wrap">
                {player.songs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => handleApplyName(song.id)}
                    className="px-4 py-2 rounded-lg font-medieval text-sm transition-all duration-150 hover:scale-105"
                    style={{
                      background: 'rgba(176, 124, 255, 0.1)',
                      border: '1px solid rgba(176, 124, 255, 0.3)',
                      color: '#d4b0ff',
                    }}
                  >
                    {song.name || 'Untitled Song'}
                    {song.name && <span className="text-xs text-parchment-500 ml-1">(rename)</span>}
                  </button>
                ))}
                <button
                  onClick={() => setPendingName(null)}
                  className="px-4 py-2 rounded-lg font-medieval text-sm text-parchment-500"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Selected die to slot */}
          {selectedDie && (
            <div className="rounded-lg p-4 mb-6 animate-fade-in"
              style={{
                background: 'rgba(0, 100, 200, 0.1)',
                border: '1px solid rgba(100, 180, 255, 0.3)',
              }}
            >
              <div className="font-bold text-blue-300 mb-2 text-sm">
                Click a slot below to place your new die (Remix: you can replace existing dice):
              </div>
              <div className="flex gap-3 items-center">
                <div className="text-xl text-gold-400">{diceIcons[selectedDie.type]} {selectedDie.type}</div>
                <GenreBadge genre={selectedDie.genre} className="text-xs" />
              </div>
            </div>
          )}

          {/* Dice selection */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <div className="text-[10px] font-medieval text-parchment-400 uppercase tracking-wider">
                  Find Inspiration
                </div>
                {(d12Locked || d20Locked) && (
                  <div className="text-[10px] text-parchment-500">
                    {d12Locked && <span>d12 unlocks at {D12_FAME_THRESHOLD} fame</span>}
                    {d12Locked && d20Locked && <span className="mx-1">&middot;</span>}
                    {d20Locked && <span>d20 unlocks at {D20_FAME_THRESHOLD} fame</span>}
                  </div>
                )}
              </div>
              <button
                onClick={handleRerollInspiration}
                disabled={player.exp < rerollCost}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Seek New ({rerollCost} EXP)
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {inspirationRevealed.map((item, idx) => (
                <div
                  key={idx}
                  className={`card relative transition-all duration-200 ${player.exp < item.cost ? 'opacity-40' : 'hover:shadow-card-hover cursor-pointer'}`}
                  onClick={() => handleSelectInspirationDie(idx)}
                >
                  <div className="flex justify-between items-center mb-3 pb-2" style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.2)' }}>
                    <GenreBadge genre={item.dice.genre} className="text-xs" />
                    <span className="text-gold-300 font-bold text-sm">{item.cost} EXP</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 mb-3">
                    <div className="text-4xl text-gold-400">{diceIcons[item.dice.type]}</div>
                    <div className="text-sm font-medieval text-parchment-200">{item.dice.type}</div>
                    <div className="text-xs text-parchment-400">Range: 1-{getMaxValue(item.dice.type)}</div>
                  </div>
                  <button
                    disabled={player.exp < item.cost}
                    className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {player.exp >= item.cost ? 'Take' : 'Not Available'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Song name cards */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-medieval text-parchment-400 uppercase tracking-wider">
                  Song Names
                </div>
                <div className="text-xs text-parchment-500">
                  ({namePool.length} available) &mdash; Names grant effects to your songs
                </div>
              </div>
              <button
                onClick={handleRefreshNames}
                disabled={!player || player.exp < REFRESH_COST}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                title={`Refresh name selection for ${REFRESH_COST} EXP`}
              >
                Refresh ({REFRESH_COST} EXP)
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <div className="text-[10px] font-medieval text-parchment-400 uppercase tracking-wider">
                Your Songs
              </div>
              <div className="text-xs text-parchment-500">
                ({player.songs.length}/3)
                {selectedDie
                  ? ' — click any slot to place die (replace existing = remix)'
                  : ' — take a die above to slot it here'
                }
              </div>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212, 168, 83, 0.2), transparent)' }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {player.songs.map((song) => (
                <div key={song.id} className="card">
                  <div className="font-medieval text-base font-bold text-gold-400 mb-2 pb-2"
                    style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.2)' }}
                  >
                    {song.name || <span className="text-parchment-500 italic">Untitled</span>}
                  </div>

                  {/* Show song effects */}
                  {song.effects.length > 0 ? (
                    <div className="mb-2 space-y-0.5">
                      {song.effects.map((effect, idx) => (
                        <div key={idx} className="p-1 rounded text-[11px] flex items-center gap-1.5"
                          style={{ background: 'rgba(176, 124, 255, 0.08)', border: '1px solid rgba(176, 124, 255, 0.15)' }}
                        >
                          <span className="font-bold text-classical shrink-0">FX{idx + 1}:</span>
                          <span className="text-classical/80 truncate">
                            {TRACK_EFFECT_DESCRIPTIONS[effect.type] || effect.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-2 p-1 rounded text-[11px] text-parchment-500 italic"
                      style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(212, 168, 83, 0.1)' }}
                    >
                      No effects — buy a name to add effects
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {song.slots.map((slot, idx) => {
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSlotDice(song.id, idx, !!slot.dice)}
                          disabled={!selectedDie}
                          className="h-20 rounded-lg flex flex-col items-center justify-center text-xs relative transition-all duration-150"
                          style={{
                            background: slot.dice
                              ? selectedDie
                                ? 'rgba(200, 100, 0, 0.1)'
                                : 'rgba(212, 168, 83, 0.1)'
                              : selectedDie && !slot.dice
                              ? 'rgba(0, 100, 200, 0.1)'
                              : 'rgba(255, 255, 255, 0.02)',
                            border: slot.dice
                              ? selectedDie
                                ? '1px solid rgba(255, 180, 100, 0.4)'
                                : '1px solid rgba(212, 168, 83, 0.25)'
                              : selectedDie
                              ? '1px solid rgba(100, 180, 255, 0.4)'
                              : '1px dashed rgba(212, 168, 83, 0.12)',
                            cursor: selectedDie ? 'pointer' : 'default',
                          }}
                        >
                          {slot.dice ? (
                            <div className="text-center relative">
                              <div className="text-2xl mb-0.5 text-gold-400">{diceIcons[slot.dice.type]}</div>
                              <div className="absolute -top-1 -right-3 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                                style={{
                                  background: 'linear-gradient(135deg, #b8922e, #d4a853)',
                                  color: '#1a1410',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                }}
                              >
                                {getMaxValue(slot.dice.type)}
                              </div>
                              <GenreBadge genre={slot.dice.genre} className="text-[7px] px-1 py-0" />
                            </div>
                          ) : (
                            <div className="text-parchment-500/30 text-[10px]">Empty</div>
                          )}
                          {selectedDie && slot.dice && (
                            <div className="absolute bottom-1 text-[8px] text-orange-400 font-bold">
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
