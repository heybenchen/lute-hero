import { useState } from 'react'
import { useGameStore, selectPlayerById } from '@/store'
import { DraftCard, Song, DiceType } from '@/types'
import { getStudioLevel } from '@/data/draftCards'
import { DraftCardDisplay } from './DraftCardDisplay'
import { TRACK_EFFECT_DESCRIPTIONS } from '@/data/trackEffects'
import { getMaxValue } from '@/game-logic/dice/roller'
import { GenreBadge } from '@/components/ui/GenreBadge'
import { MAX_SONGS } from '@/store/slices/playersSlice'

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

export function DraftShop({ playerId, onClose }: DraftShopProps) {
  const player = useGameStore(selectPlayerById(playerId))
  const awardPlayerExp = useGameStore((state) => state.awardPlayerExp)
  const addSongToPlayer = useGameStore((state) => state.addSongToPlayer)
  const replaceSongForPlayer = useGameStore((state) => state.replaceSongForPlayer)

  // Shared pool from store
  const dicePool = useGameStore((state) => state.dicePool)
  const songPool = useGameStore((state) => state.songPool)
  const purchaseFromDicePool = useGameStore((state) => state.purchaseFromDicePool)
  const purchaseFromSongPool = useGameStore((state) => state.purchaseFromSongPool)
  const refreshDicePool = useGameStore((state) => state.refreshDicePool)
  const refreshSongPool = useGameStore((state) => state.refreshSongPool)

  const [selectedDice, setSelectedDice] = useState<{
    dice: any[]
    cardId: string
  } | null>(null)

  // Pending song that needs a replacement target (remaster)
  const [pendingSong, setPendingSong] = useState<{
    song: Song
    cardId: string
  } | null>(null)

  const studioLevel = getStudioLevel(player?.monstersDefeated ?? 0)

  const handleRefreshDice = () => {
    if (!player || player.exp < REFRESH_COST) return

    awardPlayerExp(playerId, -REFRESH_COST)
    refreshDicePool(studioLevel)
  }

  const handleRefreshSongs = () => {
    if (!player || player.exp < REFRESH_COST) return

    awardPlayerExp(playerId, -REFRESH_COST)
    refreshSongPool()
  }

  if (!player) return null

  const isAtMaxSongs = player.songs.length >= MAX_SONGS

  const handlePurchase = (card: DraftCard) => {
    // Check if player has enough EXP
    if (!player || player.exp < card.cost) return

    if (card.type === 'dice' && card.dice) {
      // Consume EXP
      awardPlayerExp(playerId, -card.cost)
      setSelectedDice({ dice: card.dice, cardId: card.id })
      purchaseFromDicePool(card.id, studioLevel)
    } else if (card.type === 'song') {
      const newSong: Song = {
        id: `${playerId}-song-${Date.now()}`,
        name: card.songName || 'New Song',
        slots: [
          { dice: null, effect: null },
          { dice: null, effect: null },
          { dice: null, effect: card.songEffect || null },
          { dice: null, effect: card.songEffect2 || null },
        ],
        used: false,
      }

      if (isAtMaxSongs) {
        // At max songs — consume EXP and prompt for replacement (remaster)
        awardPlayerExp(playerId, -card.cost)
        setPendingSong({ song: newSong, cardId: card.id })
        purchaseFromSongPool(card.id)
      } else {
        // Under limit — add directly
        awardPlayerExp(playerId, -card.cost)
        addSongToPlayer(playerId, newSong)
        purchaseFromSongPool(card.id)
      }
    }
  }

  const handleReplaceSong = (oldSongId: string) => {
    if (!pendingSong) return
    replaceSongForPlayer(playerId, oldSongId, pendingSong.song)
    setPendingSong(null)
  }

  const handleSlotDice = (songId: string, slotIndex: number, isReplacement: boolean = false) => {
    if (!selectedDice || selectedDice.dice.length === 0) return

    const song = player.songs.find((s) => s.id === songId)
    if (!song) return

    // Allow slotting into empty slots or replacing existing dice (remix)
    if (!isReplacement && song.slots[slotIndex].dice) return

    // Slot only the first die
    useGameStore.getState().addDiceToPlayer(playerId, selectedDice.dice[0], songId, slotIndex)

    // Keep remaining dice in selectedDice, or clear if none left
    if (selectedDice.dice.length > 1) {
      setSelectedDice({
        ...selectedDice,
        dice: selectedDice.dice.slice(1),
      })
    } else {
      setSelectedDice(null)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-6xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="font-display text-2xl text-gold-400">
                Studio
                <span className="text-sm font-medieval text-parchment-400 ml-2">Lv.{studioLevel}</span>
              </div>
              <p className="text-sm text-parchment-400">
                {player.name} &mdash; <span className="text-gold-400 font-bold">{player.exp} EXP</span> Available
              </p>
            </div>
            <button onClick={onClose} className="btn-secondary text-sm">
              Close Shop
            </button>
          </div>

          {/* Pending song replacement (remaster) */}
          {pendingSong && (
            <div className="rounded-lg p-4 mb-6 animate-fade-in"
              style={{
                background: 'rgba(200, 100, 0, 0.1)',
                border: '1px solid rgba(255, 180, 100, 0.3)',
              }}
            >
              <div className="font-bold text-orange-300 mb-2 text-sm">
                Remaster: Choose a song to replace with "{pendingSong.song.name}":
              </div>
              <div className="flex gap-3">
                {player.songs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => handleReplaceSong(song.id)}
                    className="px-4 py-2 rounded-lg font-medieval text-sm transition-all duration-150 hover:scale-105"
                    style={{
                      background: 'rgba(200, 100, 0, 0.15)',
                      border: '1px solid rgba(255, 180, 100, 0.4)',
                      color: '#ffd4a0',
                    }}
                  >
                    {song.name}
                  </button>
                ))}
                <button
                  onClick={() => setPendingSong(null)}
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

          {/* Selected dice to slot */}
          {selectedDice && (
            <div className="rounded-lg p-4 mb-6 animate-fade-in"
              style={{
                background: 'rgba(0, 100, 200, 0.1)',
                border: '1px solid rgba(100, 180, 255, 0.3)',
              }}
            >
              <div className="font-bold text-blue-300 mb-2 text-sm">
                Click a slot below to place your new dice (Remix: you can replace existing dice):
              </div>
              <div className="flex gap-3">
                {selectedDice.dice.map((dice: any, idx: number) => (
                  <div key={idx} className="text-xl text-gold-400">{diceIcons[dice.type as DiceType]} {dice.type}</div>
                ))}
              </div>
            </div>
          )}

          {/* Dice cards */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-medieval text-parchment-400 uppercase tracking-wider">
                  Dice Pairs
                </div>
                <div className="text-xs text-parchment-500">({dicePool.length} available)</div>
              </div>
              <button
                onClick={handleRefreshDice}
                disabled={!player || player.exp < REFRESH_COST}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                title={`Refresh dice selection for ${REFRESH_COST} EXP`}
              >
                Refresh ({REFRESH_COST} EXP)
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {dicePool.map((card) => (
                <DraftCardDisplay
                  key={card.id}
                  card={card}
                  onPurchase={() => handlePurchase(card)}
                  canAfford={player.exp >= card.cost}
                />
              ))}
            </div>
          </div>

          {/* Song cards */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-medieval text-parchment-400 uppercase tracking-wider">
                  Song Tracks
                </div>
                <div className="text-xs text-parchment-500">
                  ({songPool.length} available)
                  {isAtMaxSongs && <span className="text-orange-400 ml-1">&mdash; Max {MAX_SONGS} songs (buy to remaster)</span>}
                </div>
              </div>
              <button
                onClick={handleRefreshSongs}
                disabled={!player || player.exp < REFRESH_COST}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                title={`Refresh song selection for ${REFRESH_COST} EXP`}
              >
                Refresh ({REFRESH_COST} EXP)
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {songPool.map((card) => (
                <DraftCardDisplay
                  key={card.id}
                  card={card}
                  onPurchase={() => handlePurchase(card)}
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
                ({player.songs.length}/{MAX_SONGS})
                {selectedDice
                  ? ' — click any slot to place dice (replace existing = remix)'
                  : ' — click empty slots to add dice'
                }
              </div>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212, 168, 83, 0.2), transparent)' }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {player.songs.map((song) => (
                <div key={song.id} className="card">
                  <div className="font-medieval text-base font-bold text-gold-400 mb-2 pb-2"
                    style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.2)' }}
                  >
                    {song.name}
                  </div>

                  {/* Show slot effects */}
                  <div className="mb-2 space-y-0.5">
                    {song.slots.map((slot, idx) => slot.effect && (
                      <div key={idx} className="p-1 rounded text-[11px] flex items-center gap-1.5"
                        style={{ background: 'rgba(176, 124, 255, 0.08)', border: '1px solid rgba(176, 124, 255, 0.15)' }}
                      >
                        <span className="font-bold text-classical shrink-0">{idx + 1}:</span>
                        <span className="text-classical/80 truncate">
                          {TRACK_EFFECT_DESCRIPTIONS[slot.effect.type] || slot.effect.type}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {song.slots.map((slot, idx) => {
                      const canSlotHere = selectedDice && (!slot.dice || true) // Can always slot when dice selected (remix)
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSlotDice(song.id, idx, !!slot.dice)}
                          disabled={!selectedDice}
                          className="h-20 rounded-lg flex flex-col items-center justify-center text-xs relative transition-all duration-150"
                          style={{
                            background: slot.dice
                              ? selectedDice
                                ? 'rgba(200, 100, 0, 0.1)'
                                : 'rgba(212, 168, 83, 0.1)'
                              : selectedDice && !slot.dice
                              ? 'rgba(0, 100, 200, 0.1)'
                              : 'rgba(255, 255, 255, 0.02)',
                            border: slot.dice
                              ? selectedDice
                                ? '1px solid rgba(255, 180, 100, 0.4)'
                                : '1px solid rgba(212, 168, 83, 0.25)'
                              : canSlotHere
                              ? '1px solid rgba(100, 180, 255, 0.4)'
                              : '1px dashed rgba(212, 168, 83, 0.12)',
                            cursor: selectedDice ? 'pointer' : 'default',
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
                          {slot.effect && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                              style={{
                                background: 'rgba(176, 124, 255, 0.3)',
                                border: '1px solid rgba(176, 124, 255, 0.4)',
                                color: '#e8d0ff',
                              }}
                            >
                              &#x2728;
                            </div>
                          )}
                          {selectedDice && slot.dice && (
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
