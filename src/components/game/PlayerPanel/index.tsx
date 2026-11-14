import { useGameStore, selectCurrentPlayer, selectCanAct, selectIsHost } from '@/store'
import { SongCard } from '../SongCard'
import { GENRE_THEME, readableTextColor } from '@/data/genreTheme'
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

export function PlayerPanel() {
  const players = useGameStore((state) => state.players)
  const spaces = useGameStore((state) => state.spaces)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const dispatch = useGameStore((state) => state.dispatch)
  const canAct = useGameStore(selectCanAct)
  const isHost = useGameStore(selectIsHost)
  const mode = useGameStore((state) => state.mode)
  const lobby = useGameStore((state) => state.lobby)

  if (!currentPlayer) return null

  const currentSpace = spaces.find((s) => s.id === currentPlayer.position)
  const hasMonsters = currentSpace && currentSpace.monsters.length > 0
  const canFight = hasMonsters && currentPlayer.fightsThisTurn < 1 && canAct

  // Combat no longer opens the Studio for you — once you've fought, the button
  // pulses until you visit it, so freshly earned EXP doesn't go unnoticed.
  const shouldHintStudio =
    canAct && currentPlayer.fightsThisTurn > 0 && !currentPlayer.hasShoppedThisTurn

  // Online presence per engine player (via their seat)
  const presenceFor = (playerId: string): boolean | null => {
    if (mode !== 'online' || !lobby) return null
    const seat = lobby.seats.find((se) => se.playerId === playerId)
    if (!seat) return null
    return lobby.presence[seat.seatId] !== false
  }

  const handleEndTurn = () => {
    dispatch({ type: 'END_TURN' })
  }

  const handleFight = () => {
    if (currentSpace && canFight) {
      dispatch({ type: 'START_COMBAT', playerId: currentPlayer.id })
    }
  }

  return (
    <div className="player-console lg:h-full flex flex-col gap-3 p-3 sm:p-4">
      {/* All players */}
      <section>
        <div className="module-label">Score track</div>
        <div className="grid grid-cols-2 gap-1.5">
        {players.map((player) => {
          const isCurrentTurn = player.id === currentPlayer.id
          const genreColor = GENRE_THEME[player.starterGenre]?.color ?? player.color
          const online = presenceFor(player.id)
          return (
            <div
              key={player.id}
              className={`score-tile transition-all duration-300 min-w-0 overflow-hidden ${isCurrentTurn ? 'score-tile-active' : ''}`}
              style={{
                '--player-color': genreColor,
              } as CSSProperties}
            >
              <div className="flex items-center gap-2 p-2">
                <div className="score-token" style={{ background: genreColor, color: readableTextColor(genreColor) }}>
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
          <div
            className="player-piece w-11 h-11 text-base"
            style={{ backgroundColor: currentPlayer.color }}
          >
            {currentPlayer.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-medieval text-base font-bold text-gold-200 truncate">{currentPlayer.name}</div>
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

      {/* Actions */}
      <div className="space-y-2 mt-auto pt-1">
        {mode === 'online' && !canAct && (
          <div className="text-center text-sm text-parchment-500 italic py-2 animate-pulse-slow">
            Waiting for {currentPlayer.name}&rsquo;s turn&hellip;
          </div>
        )}
        {mode === 'online' && !canAct && isHost && presenceFor(currentPlayer.id) === false && (
          <button
            onClick={() => dispatch({ type: 'HOST_SKIP_TURN', targetPlayerId: currentPlayer.id })}
            className="w-full py-2 text-sm font-medieval font-bold rounded-lg transition-all duration-150 hover:-translate-y-0.5"
            style={{
              background: 'rgba(255, 180, 60, 0.1)',
              border: '1px solid rgba(255, 180, 60, 0.4)',
              color: '#ffd591',
            }}
            title="The current player looks disconnected — skip their turn (auto-retreats their combat)"
          >
            &#x23ED; Skip {currentPlayer.name}&apos;s Turn (offline)
          </button>
        )}

        {hasMonsters && canAct && (
          <button
            onClick={handleFight}
            disabled={!canFight}
            className={`w-full py-1.5 px-2.5 text-sm sm:py-2.5 sm:px-4 sm:text-base font-medieval font-bold rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:brightness-110 hover:enabled:-translate-y-0.5 active:enabled:translate-y-0 ${canFight ? 'animate-danger-pulse' : ''}`}
            style={{
              background: canFight
                ? 'linear-gradient(135deg, #c43030, #8c2020)'
                : 'rgba(100, 30, 30, 0.3)',
              border: '1px solid rgba(232, 80, 80, 0.4)',
              color: '#ffd4d4',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
              boxShadow: canFight ? '0 0 12px rgba(232, 32, 64, 0.2)' : 'none',
            }}
          >
            <Swords size={16} aria-hidden="true" /> Fight {currentSpace!.monsters.length} Monster{currentSpace!.monsters.length > 1 ? 's' : ''}
            {!canFight && ' (No fights left)'}
          </button>
        )}

        {canAct && (
          <>
            <button
              onClick={() => dispatch({ type: 'OPEN_STUDIO', playerId: currentPlayer.id })}
              className={`btn-secondary w-full text-sm py-1.5 px-3 sm:text-base sm:py-2.5 sm:px-5 ${
                shouldHintStudio ? 'animate-gentle-flash' : ''
              }`}
              title={shouldHintStudio ? 'You fought this turn — spend your EXP before ending the turn' : undefined}
            >
              <Store size={15} aria-hidden="true" /> Studio <span className="opacity-60">({currentPlayer.exp} EXP)</span>
            </button>
            <button
              onClick={handleEndTurn}
              disabled={canFight}
              title={canFight ? 'Fight the monster here before ending your turn' : undefined}
              className="btn-primary w-full text-sm py-1.5 px-3 sm:text-base sm:py-2.5 sm:px-5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Flag size={15} aria-hidden="true" /> End Turn
            </button>
          </>
        )}
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
