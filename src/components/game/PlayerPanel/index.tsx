import { useGameStore, selectCurrentPlayer, selectCanAct, selectIsHost } from '@/store'
import { SongCard } from '../SongCard'
import { readableTextColor } from '@/data/genreTheme'
import {
  Award,
  CircleDot,
  Flag,
  Lightbulb,
  MapPin,
  Sparkles,
  Store,
  Swords,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { StyleChip } from '@/components/ui/StyleBadge'

/** Everything the turn console and the mobile turn bar need to know about the active turn. */
function useTurnState() {
  const spaces = useGameStore((state) => state.spaces)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const dispatch = useGameStore((state) => state.dispatch)
  const canAct = useGameStore(selectCanAct)
  const isHost = useGameStore(selectIsHost)
  const mode = useGameStore((state) => state.mode)
  const lobby = useGameStore((state) => state.lobby)

  const currentSpace = currentPlayer ? spaces.find((s) => s.id === currentPlayer.position) : undefined
  const monsterCount = currentSpace?.monsters.length ?? 0
  const canFight = !!currentPlayer && monsterCount > 0 && currentPlayer.fightsThisTurn < 1 && canAct

  // Online presence per engine player (via their seat)
  const presenceFor = (playerId: string): boolean | null => {
    if (mode !== 'online' || !lobby) return null
    const seat = lobby.seats.find((se) => se.playerId === playerId)
    if (!seat) return null
    return lobby.presence[seat.seatId] !== false
  }

  return { currentPlayer, currentSpace, monsterCount, canFight, canAct, isHost, mode, dispatch, presenceFor }
}

/**
 * Fight / Studio / End Turn, plus the online waiting and host-skip states.
 * `compact` lays the buttons out in one row for the mobile turn bar.
 */
function TurnActions({ compact = false }: { compact?: boolean }) {
  const { currentPlayer, currentSpace, monsterCount, canFight, canAct, isHost, mode, dispatch, presenceFor } = useTurnState()
  if (!currentPlayer) return null

  // Combat no longer opens the Studio for you — once you've fought, the button
  // pulses until you visit it, so freshly earned EXP doesn't go unnoticed.
  const shouldHintStudio =
    canAct && currentPlayer.fightsThisTurn > 0 && !currentPlayer.hasShoppedThisTurn

  const handleFight = () => {
    if (currentSpace && canFight) dispatch({ type: 'START_COMBAT', playerId: currentPlayer.id })
  }

  const size = compact
    ? 'min-w-0 flex-1 py-2.5 px-2 text-sm'
    : 'w-full py-1.5 px-3 text-sm sm:py-2.5 sm:px-5 sm:text-base'

  return (
    <div className={compact ? 'flex gap-2' : 'space-y-2'}>
      {mode === 'online' && !canAct && (
        <div className={`text-center text-sm text-parchment-500 italic animate-pulse-slow ${compact ? 'flex-1 py-2.5' : 'py-2'}`}>
          Waiting for {currentPlayer.name}&rsquo;s turn&hellip;
        </div>
      )}
      {mode === 'online' && !canAct && isHost && presenceFor(currentPlayer.id) === false && (
        <button
          onClick={() => dispatch({ type: 'HOST_SKIP_TURN', targetPlayerId: currentPlayer.id })}
          className={`${compact ? 'flex-shrink-0 px-3' : 'w-full'} py-2 text-sm font-medieval font-bold rounded-lg transition-all duration-150 hover:-translate-y-0.5`}
          style={{
            background: 'rgba(255, 180, 60, 0.1)',
            border: '1px solid rgba(255, 180, 60, 0.4)',
            color: '#ffd591',
          }}
          title="The current player looks disconnected — skip their turn (auto-retreats their combat)"
        >
          &#x23ED; Skip{compact ? '' : ` ${currentPlayer.name}'s Turn (offline)`}
        </button>
      )}

      {monsterCount > 0 && canAct && (
        <button
          onClick={handleFight}
          disabled={!canFight}
          className={`${size} flex items-center justify-center gap-2 font-medieval font-bold rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:brightness-110 hover:enabled:-translate-y-0.5 active:enabled:translate-y-0 ${canFight ? 'animate-danger-pulse' : ''}`}
          style={{
            background: canFight ? 'linear-gradient(135deg, #c43030, #8c2020)' : 'rgba(100, 30, 30, 0.3)',
            border: '1px solid rgba(232, 80, 80, 0.4)',
            color: '#ffd4d4',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
            boxShadow: canFight ? '0 0 12px rgba(232, 32, 64, 0.2)' : 'none',
          }}
          title={canFight ? undefined : 'You have already fought this turn'}
        >
          <Swords size={16} aria-hidden="true" />
          <span className="truncate">
            {compact ? 'Fight' : `Fight ${monsterCount} Monster${monsterCount > 1 ? 's' : ''}`}
            {!canFight && !compact && ' (No fights left)'}
          </span>
        </button>
      )}

      {canAct && (
        <>
          <button
            onClick={() => dispatch({ type: 'OPEN_STUDIO', playerId: currentPlayer.id })}
            className={`btn-secondary ${size} flex items-center justify-center gap-2 ${shouldHintStudio ? 'animate-gentle-flash' : ''}`}
            title={shouldHintStudio ? 'You fought this turn — spend your EXP before ending the turn' : undefined}
          >
            <Store size={15} aria-hidden="true" />
            <span className="truncate">Studio <span className="opacity-60">({currentPlayer.exp}{compact ? '' : ' EXP'})</span></span>
          </button>
          <button
            onClick={() => dispatch({ type: 'END_TURN' })}
            disabled={canFight}
            title={canFight ? 'Fight the monster here before ending your turn' : undefined}
            className={`btn-primary ${size} flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Flag size={15} aria-hidden="true" />
            <span className="truncate">End Turn</span>
          </button>
        </>
      )}
    </div>
  )
}

/** The bard whose turn it is, as a colored token. */
function BardToken({ name, color, className = '' }: { name: string; color: string; className?: string }) {
  return (
    <div className={`player-piece flex-shrink-0 ${className}`} style={{ backgroundColor: color, color: readableTextColor(color) }}>
      {name.charAt(0)}
    </div>
  )
}

/**
 * Phone-only turn bar pinned to the bottom of the screen: who's up, their
 * resources and moves at a glance, and the turn actions — so the map and the
 * Fight / Studio buttons are all on screen without scrolling.
 */
export function MobileTurnBar() {
  const { currentPlayer } = useTurnState()
  if (!currentPlayer) return null
  const movesLeft = Math.max(0, 2 - currentPlayer.movesThisTurn)

  return (
    <div className="mobile-turn-bar lg:hidden fixed inset-x-0 bottom-0 z-30 px-2.5 pt-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <BardToken name={currentPlayer.name} color={currentPlayer.color} className="w-7 h-7 text-[11px]" />
        <div className="min-w-0 flex-1 truncate font-medieval font-bold text-sm text-parchment-100">{currentPlayer.name}</div>
        <div className="flex items-center gap-2.5 text-xs tabular-nums text-parchment-300 flex-shrink-0">
          <span className="flex items-center gap-1" title="Fame"><Award size={13} className="text-gold-400" aria-hidden="true" />{currentPlayer.fame}</span>
          <span className="flex items-center gap-1" title="EXP"><Sparkles size={13} className="text-gold-400" aria-hidden="true" />{currentPlayer.exp}</span>
          <span className="flex items-center gap-1" title="Inspiration"><Lightbulb size={13} className="text-gold-400" aria-hidden="true" />{currentPlayer.inspiration}</span>
          <span className="flex items-center gap-1" title={`${movesLeft} move${movesLeft === 1 ? '' : 's'} left`}>
            {[0, 1].map((move) => <i key={move} className={`turn-pip ${move >= currentPlayer.movesThisTurn ? 'turn-pip-ready' : ''}`} />)}
          </span>
        </div>
      </div>
      <TurnActions compact />
    </div>
  )
}

export function PlayerPanel() {
  const players = useGameStore((state) => state.players)
  const { currentPlayer, currentSpace, presenceFor } = useTurnState()

  if (!currentPlayer) return null

  return (
    <div className="player-console lg:h-full flex flex-col gap-3 p-3 sm:p-4">
      {/* All players */}
      <section>
        <div className="module-label">Score track</div>
        <div className="grid grid-cols-2 gap-1.5">
          {players.map((player) => {
            const isCurrentTurn = player.id === currentPlayer.id
            const online = presenceFor(player.id)
            return (
              <div
                key={player.id}
                className={`score-tile transition-all duration-300 min-w-0 overflow-hidden ${isCurrentTurn ? 'score-tile-active' : ''}`}
                style={{ '--player-color': player.color } as CSSProperties}
              >
                <div className="flex items-center gap-2 p-2">
                  <div className="score-token" style={{ background: player.color, color: readableTextColor(player.color) }}>
                    {player.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medieval font-bold text-[10px] text-parchment-200 flex items-center gap-1">
                      {online !== null && (
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                          style={{ background: online ? '#1f7a1f' : 'rgba(0,0,0,0.45)' }}
                          title={online ? 'Online' : 'Disconnected'}
                        />
                      )}
                      <span className="truncate">{player.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <strong className="font-display text-lg text-gold-300 leading-none">{player.fame}</strong>
                      <span className="text-[8px] uppercase tracking-wider text-parchment-500">Fame</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Current player */}
      <section className="turn-module">
        <div className="module-label">Active bard</div>
        <div className="flex items-center gap-3">
          <BardToken name={currentPlayer.name} color={currentPlayer.color} className="w-11 h-11 text-base" />
          <div className="min-w-0">
            <div className="font-medieval text-base font-bold text-gold-300 truncate">{currentPlayer.name}</div>
            <div className="flex items-center gap-1 text-[10px] text-parchment-500 truncate">
              <MapPin size={11} aria-hidden="true" />
              {currentSpace?.name ?? 'Unknown location'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mt-3">
          <ResourceTile icon={<Award size={14} />} label="Fame" value={currentPlayer.fame} />
          <ResourceTile icon={<Sparkles size={14} />} label="EXP" value={currentPlayer.exp} />
          <ResourceTile icon={<Lightbulb size={14} />} label="Inspiration" value={currentPlayer.inspiration} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="module-label mb-0 mr-1">Styles</span>
          {currentPlayer.styles.length > 0
            ? currentPlayer.styles.map((id) => <StyleChip key={id} id={id} />)
            : <span className="text-[10px] italic text-parchment-500">None yet — learn them in the Studio</span>}
        </div>
      </section>

      <section className="song-rack-module">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="module-label mb-0">Song rack</div>
          <span className="text-[9px] text-parchment-500">{currentPlayer.songs.length} songs</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {currentPlayer.songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-1.5">
        <div className="turn-counter">
          <span className="flex items-center gap-1.5"><CircleDot size={12} /> Movement</span>
          <div className="flex gap-1">
            {[0, 1].map((move) => <i key={move} className={`turn-pip ${move >= currentPlayer.movesThisTurn ? 'turn-pip-ready' : ''}`} />)}
          </div>
        </div>
        <div className="turn-counter">
          <span className="flex items-center gap-1.5"><Swords size={12} /> Battle</span>
          <strong className={currentPlayer.fightsThisTurn < 1 ? 'text-emerald-300' : 'text-parchment-500'}>
            {currentPlayer.fightsThisTurn < 1 ? 'Ready' : 'Spent'}
          </strong>
        </div>
      </section>

      {/* On phones the actions live in the pinned MobileTurnBar instead */}
      <div className="hidden lg:block mt-auto pt-1">
        <TurnActions />
      </div>
    </div>
  )
}

function ResourceTile({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="resource-tile">
      <span className="text-gold-400">{icon}</span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
