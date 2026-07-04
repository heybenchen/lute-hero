import { useState } from 'react'
import { useGameStore, selectPlayerById } from '@/store'
import { DraftCard, DiceType, Genre, Dice, TrackEffect } from '@/types'
import { DraftCardDisplay } from './DraftCardDisplay'
import { TRACK_EFFECT_DESCRIPTIONS } from '@/data/trackEffects'
import { getMaxValue } from '@/game-logic/dice/roller'
import { GenreBadge } from '@/components/ui/GenreBadge'
import {
  NEW_D4_COST,
  createElementalDie,
  getNextDiceType,
  getUpgradeCost,
} from '@/data/draftCards'

const diceIcons: Record<DiceType, string> = {
  d4: '△',
  d6: '⚄',
  d12: '⬠',
  d20: '⬡',
}

// Element cards: per-genre color (rgb triplet) for gradients, borders, glows
const ELEMENTS: { genre: Genre; emoji: string; rgb: string }[] = [
  { genre: 'Ballad', emoji: '🔥', rgb: '232, 32, 64' },
  { genre: 'Folk', emoji: '🌿', rgb: '76, 175, 80' },
  { genre: 'Hymn', emoji: '💨', rgb: '0, 184, 212' },
  { genre: 'Shanty', emoji: '🌊', rgb: '41, 121, 255' },
]

interface DraftShopProps {
  playerId: string
  onClose: () => void
}

const REFRESH_COST = 5

interface OwnedDie {
  dice: Dice
  songName: string
  songIndex: number
  slotIndex: number
}

export function DraftShop({ playerId, onClose }: DraftShopProps) {
  const player = useGameStore(selectPlayerById(playerId))
  const awardPlayerExp = useGameStore((state) => state.awardPlayerExp)
  const applyNameToSong = useGameStore((state) => state.applyNameToSong)
  const upgradeDice = useGameStore((state) => state.upgradeDice)

  // Shop state
  const namePool = useGameStore((state) => state.namePool)
  const purchaseFromNamePool = useGameStore((state) => state.purchaseFromNamePool)
  const refreshNamePool = useGameStore((state) => state.refreshNamePool)

  const [selectedElement, setSelectedElement] = useState<Genre | null>(null)
  const [selectedDie, setSelectedDie] = useState<Dice | null>(null)

  // Pending name that needs a target song
  const [pendingName, setPendingName] = useState<{
    name: string
    effects: TrackEffect[]
    cardId: string
  } | null>(null)

  const handleRefreshNames = () => {
    if (!player || player.exp < REFRESH_COST) return
    awardPlayerExp(playerId, -REFRESH_COST)
    refreshNamePool()
  }

  if (!player) return null

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

  const handleBuyNewD4 = () => {
    if (!selectedElement || player.exp < NEW_D4_COST) return
    awardPlayerExp(playerId, -NEW_D4_COST)
    setSelectedDie(createElementalDie(selectedElement))
    setSelectedElement(null)
  }

  const handleUpgradeDie = (die: Dice) => {
    const cost = getUpgradeCost(die.type)
    if (cost === null || player.exp < cost) return
    awardPlayerExp(playerId, -cost)
    upgradeDice(playerId, die.id)
  }

  const handlePurchaseName = (card: DraftCard) => {
    if (!player || player.exp < card.cost) return

    const effects: TrackEffect[] = card.songEffect ? [card.songEffect] : []

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
              <p className="text-base text-parchment-400">
                {player.name} &mdash; <span className="text-gold-400 font-bold">{player.exp} EXP</span> Available
              </p>
            </div>
            <button onClick={onClose} className="btn-secondary text-sm">
              Close Shop
            </button>
          </div>

          {/* Pending name — click a song below to apply */}
          {pendingName && (
            <div className="rounded-lg p-4 mb-6 animate-fade-in"
              style={{
                background: 'rgba(176, 124, 255, 0.08)',
                border: '1px solid rgba(176, 124, 255, 0.3)',
              }}
            >
              <div className="font-bold text-classical mb-2 text-base">
                Click a song below to name it "{pendingName.name}":
              </div>
              <div className="flex gap-3 items-center">
                {pendingName.effects.map((effect, idx) => (
                  <span key={idx} className="text-sm text-classical/80">
                    {TRACK_EFFECT_DESCRIPTIONS[effect.type] || effect.type}
                  </span>
                ))}
                <button
                  onClick={() => setPendingName(null)}
                  className="ml-auto text-xs text-parchment-500 hover:text-parchment-300"
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
              <div className="font-bold text-blue-300 mb-2 text-base">
                Click a slot below to place your new die (Remix: you can replace existing dice):
              </div>
              <div className="flex gap-3 items-center">
                <div className="text-xl text-gold-400">{diceIcons[selectedDie.type]} {selectedDie.type}</div>
                <GenreBadge genre={selectedDie.genre} className="text-xs" />
              </div>
            </div>
          )}

          {/* Element selection */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider">
                Elements
              </div>
              <div className="text-sm text-parchment-500">
                Pick an element to buy a new d4 ({NEW_D4_COST} EXP) or upgrade your dice
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ELEMENTS.map(({ genre, emoji, rgb }) => {
                const isSelected = selectedElement === genre
                return (
                  <button
                    key={genre}
                    className="group relative rounded-lg p-3 cursor-pointer transition-all duration-200 ease-out hover:-translate-y-1"
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
                    onClick={() => setSelectedElement(isSelected ? null : genre)}
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
                    {diceIcons.d4} New d4 &mdash; {NEW_D4_COST} EXP
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
                            {diceIcons[dice.type]} {dice.type}
                            {nextType ? (
                              <span> &rarr; {diceIcons[nextType]} {nextType} &mdash; {cost} EXP</span>
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
                <div className="text-sm text-parchment-500">
                  ({namePool.length} available) &mdash; Names grant effects to your songs
                </div>
              </div>
              <button
                onClick={handleRefreshNames}
                disabled={!player || player.exp < REFRESH_COST}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                title={`Refresh name selection for ${REFRESH_COST} EXP`}
              >
                Refresh ({REFRESH_COST} EXP)
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
                ({player.songs.length}/3)
                {pendingName
                  ? ' — click a song to apply name'
                  : selectedDie
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
                  className={`card transition-all duration-150 ${pendingName ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                  style={pendingName ? {
                    border: '1px solid rgba(176, 124, 255, 0.4)',
                    boxShadow: '0 0 12px rgba(176, 124, 255, 0.1)',
                  } : undefined}
                  onClick={() => pendingName && handleApplyName(song.id)}
                >
                  <div className="font-medieval text-base font-bold text-gold-400 mb-2 pb-2"
                    style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.2)' }}
                  >
                    {song.name || <span className="text-parchment-500 italic">Untitled</span>}
                    {pendingName && song.name && (
                      <span className="text-xs text-classical/60 font-normal ml-1">(rename)</span>
                    )}
                  </div>

                  {/* Show song effects */}
                  {song.effects.length > 0 ? (
                    <div className="mb-2 space-y-0.5">
                      {song.effects.map((effect, idx) => (
                        <div key={idx} className="p-1.5 rounded text-xs flex items-center gap-1.5"
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
                    <div className="mb-2 p-1.5 rounded text-xs text-parchment-500 italic"
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
                          {selectedDie && slot.dice && (
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
