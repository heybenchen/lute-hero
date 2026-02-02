import { useState, useEffect } from 'react'
import { useGameStore, selectPlayerById } from '@/store'
import { DraftCard, Song } from '@/types'
import { generateDicePairCard, generateSongCard } from '@/data/draftCards'
import { DraftCardDisplay } from './DraftCardDisplay'

interface DraftShopProps {
  playerId: string
  onClose: () => void
}

const REFRESH_COST = 5

export function DraftShop({ playerId, onClose }: DraftShopProps) {
  const player = useGameStore(selectPlayerById(playerId))
  const awardPlayerExp = useGameStore((state) => state.awardPlayerExp)
  const addSongToPlayer = useGameStore((state) => state.addSongToPlayer)

  const [diceCards, setDiceCards] = useState<DraftCard[]>([])
  const [songCards, setSongCards] = useState<DraftCard[]>([])
  const [selectedDice, setSelectedDice] = useState<{
    dice: any[]
    cardId: string
  } | null>(null)

  useEffect(() => {
    // Generate initial cards: 3 dice, 2 songs
    setDiceCards([
      generateDicePairCard(playerId),
      generateDicePairCard(playerId),
      generateDicePairCard(playerId),
    ])
    setSongCards([
      generateSongCard(),
      generateSongCard(),
    ])
  }, [playerId])

  const handleRefreshDice = () => {
    if (!player || player.exp < REFRESH_COST) return

    awardPlayerExp(playerId, -REFRESH_COST)
    setDiceCards([
      generateDicePairCard(playerId),
      generateDicePairCard(playerId),
      generateDicePairCard(playerId),
    ])
  }

  const handleRefreshSongs = () => {
    if (!player || player.exp < REFRESH_COST) return

    awardPlayerExp(playerId, -REFRESH_COST)
    setSongCards([
      generateSongCard(),
      generateSongCard(),
    ])
  }

  if (!player) return null

  const handlePurchase = (card: DraftCard) => {
    if (!player || player.exp < card.cost) return

    // Deduct EXP
    awardPlayerExp(playerId, -card.cost)

    if (card.type === 'dice' && card.dice) {
      // Store dice for player to slot into songs
      setSelectedDice({ dice: card.dice, cardId: card.id })

      // Remove purchased card and add new one
      setDiceCards((prev) => {
        const newCards = prev.filter((c) => c.id !== card.id)
        newCards.push(generateDicePairCard(playerId))
        return newCards
      })
    } else if (card.type === 'song') {
      // Create new song
      const newSong: Song = {
        id: `${playerId}-song-${Date.now()}`,
        name: card.songName || 'New Song',
        slots: [
          { dice: null, effect: card.songEffect || null },
          { dice: null, effect: null },
          { dice: null, effect: null },
          { dice: null, effect: null },
        ],
        used: false,
      }
      addSongToPlayer(playerId, newSong)

      // Remove purchased card and add new one
      setSongCards((prev) => {
        const newCards = prev.filter((c) => c.id !== card.id)
        newCards.push(generateSongCard())
        return newCards
      })
    }
  }

  const handleSlotDice = (songId: string, slotIndex: number) => {
    if (!selectedDice) return

    const song = player.songs.find((s) => s.id === songId)
    if (!song || song.slots[slotIndex].dice) return

    // Slot the first dice
    useGameStore.getState().addDiceToPlayer(playerId, selectedDice.dice[0], songId, slotIndex)

    // If there's a second slot available, try to slot it
    if (selectedDice.dice.length > 1) {
      const nextEmptySlot = song.slots.findIndex((s, idx) => idx > slotIndex && !s.dice)
      if (nextEmptySlot !== -1) {
        useGameStore.getState().addDiceToPlayer(playerId, selectedDice.dice[1], songId, nextEmptySlot)
      }
    }

    setSelectedDice(null)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-8">
      <div className="bg-parchment-100 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-medieval text-3xl text-wood-600">
                🎪 Draft Shop
              </h2>
              <p className="text-lg text-wood-500">
                {player.name} - {player.exp} EXP Available
              </p>
            </div>
            <button onClick={onClose} className="btn-secondary">
              Close Shop
            </button>
          </div>

          {/* Selected dice to slot */}
          {selectedDice && (
            <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-blue-900 mb-2">
                📦 Click an empty slot below to place your new dice:
              </h3>
              <div className="flex gap-3">
                {selectedDice.dice.map((dice, idx) => (
                  <div key={idx} className="text-2xl">🎲 {dice.type}</div>
                ))}
              </div>
            </div>
          )}

          {/* Dice cards */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medieval text-xl text-wood-600">
                🎲 Dice Pairs (3 available)
              </h3>
              <button
                onClick={handleRefreshDice}
                disabled={!player || player.exp < REFRESH_COST}
                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Refresh dice selection for ${REFRESH_COST} EXP`}
              >
                🔄 Refresh ({REFRESH_COST} EXP)
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {diceCards.map((card) => (
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
              <h3 className="font-medieval text-xl text-wood-600">
                🎵 Song Tracks (2 available)
              </h3>
              <button
                onClick={handleRefreshSongs}
                disabled={!player || player.exp < REFRESH_COST}
                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Refresh song selection for ${REFRESH_COST} EXP`}
              >
                🔄 Refresh ({REFRESH_COST} EXP)
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {songCards.map((card) => (
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
            <h3 className="font-medieval text-xl text-wood-600 mb-3">
              Your Songs (click empty slots to add dice)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {player.songs.map((song) => (
                <div key={song.id} className="card">
                  <div className="card-header">{song.name}</div>
                  <div className="grid grid-cols-4 gap-2">
                    {song.slots.map((slot, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSlotDice(song.id, idx)}
                        disabled={!selectedDice || !!slot.dice}
                        className={`
                          h-20 rounded-lg border-2 flex flex-col items-center justify-center text-xs
                          ${slot.dice
                            ? 'bg-parchment-200 border-wood-500 cursor-not-allowed'
                            : selectedDice
                            ? 'bg-blue-50 border-blue-500 hover:bg-blue-100 cursor-pointer'
                            : 'bg-parchment-200 border-dashed border-wood-400'
                          }
                        `}
                      >
                        {slot.dice ? (
                          <div className="text-center">
                            <div className="text-2xl">🎲</div>
                            <div className="font-bold">{slot.dice.type}</div>
                          </div>
                        ) : (
                          <div className="text-wood-400">Empty</div>
                        )}
                        {slot.effect && (
                          <div className="text-purple-600 mt-1">✨</div>
                        )}
                      </button>
                    ))}
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
