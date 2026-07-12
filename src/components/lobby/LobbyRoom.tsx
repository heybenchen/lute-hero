import { useState } from 'react'
import { useGameStore } from '@/store'
import { Genre } from '@/types'
import { GENRE_THEME, ALL_GENRES } from '@/data/genreTheme'
import { GenreBadge } from '@/components/ui/GenreBadge'

/**
 * The online waiting room: shows the join code, every seat with its
 * ready/host/presence status, and lets each player pick their starter
 * element before readying up. The host starts once everyone is ready.
 */
export function LobbyRoom() {
  const lobby = useGameStore((state) => state.lobby)
  const connection = useGameStore((state) => state.connection)
  const lastError = useGameStore((state) => state.lastError)
  const sendLobbyOp = useGameStore((state) => state.sendLobbyOp)
  const leaveOnline = useGameStore((state) => state.leaveOnline)

  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!lobby) return null

  const mySeat = lobby.seats.find((s) => s.seatId === lobby.mySeatId)
  const isHost = lobby.mySeatId === lobby.hostSeatId
  const allReady = lobby.seats.length >= 1 && lobby.seats.every((s) => s.ready)

  const op = async (name: 'ready' | 'unready' | 'leave' | 'start', extras?: { starterGenre?: Genre }) => {
    setBusy(true)
    await sendLobbyOp(name, extras)
    setBusy(false)
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobby.joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — the code is visible anyway
    }
  }

  const handleGenrePick = (genre: Genre) => {
    if (!mySeat || mySeat.ready) return
    // Genre choice rides on an unready op so it can change until ready
    op('unready', { starterGenre: genre })
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-3 sm:p-8 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(212, 168, 83, 0.06) 0%, transparent 60%)' }}
      />

      <div className="card-ornate max-w-lg w-full relative z-10 p-5 sm:p-8">
        {/* Header + join code */}
        <div className="text-center mb-6">
          <div className="text-xs font-medieval uppercase tracking-[0.4em] text-parchment-500 mb-2">The Green Room</div>
          <h1 className="font-display text-3xl sm:text-4xl text-gold-400 mb-4">Band Lobby</h1>
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-150 hover:-translate-y-0.5"
            style={{ background: 'rgba(212, 168, 83, 0.08)', border: '1px solid rgba(212, 168, 83, 0.35)' }}
            title="Copy join code"
          >
            <span className="font-display text-2xl tracking-[0.35em] text-gold-300">{lobby.joinCode}</span>
            <span className="text-xs text-parchment-500">{copied ? '✓ copied' : '⧉'}</span>
          </button>
          <p className="text-xs text-parchment-500 mt-2">Share this code — friends join from their own device</p>
          {connection === 'reconnecting' && (
            <p className="text-xs text-amber-300 mt-2 animate-pulse">Reconnecting…</p>
          )}
        </div>

        {/* Seats */}
        <div className="space-y-2.5 mb-6">
          {lobby.seats.map((seat) => {
            const online = lobby.presence[seat.seatId] !== false
            const isMe = seat.seatId === lobby.mySeatId
            const seatIsHost = seat.seatId === lobby.hostSeatId
            const theme = GENRE_THEME[seat.starterGenre]
            return (
              <div
                key={seat.seatId}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{
                  background: isMe ? 'rgba(212, 168, 83, 0.07)' : 'rgba(61, 48, 32, 0.35)',
                  border: `1px solid ${isMe ? 'rgba(212, 168, 83, 0.35)' : 'rgba(212, 168, 83, 0.12)'}`,
                }}
              >
                <div className="relative">
                  <div className="player-avatar w-10 h-10 text-base" style={{ backgroundColor: seat.color }}>
                    {seat.name.charAt(0)}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{
                      background: online ? '#4caf50' : '#6b6b6b',
                      borderColor: '#1e1812',
                    }}
                    title={online ? 'Online' : 'Offline'}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-parchment-200 truncate">{seat.name}</span>
                    {isMe && <span className="text-[10px] text-parchment-500">(you)</span>}
                    {seatIsHost && <span className="text-[10px]" title="Host">👑</span>}
                  </div>
                  <div className="text-xs" style={{ color: theme.color }}>
                    {theme.emoji} {seat.starterGenre}
                  </div>
                </div>
                <span
                  className="text-xs font-medieval font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: seat.ready ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${seat.ready ? 'rgba(76, 175, 80, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                    color: seat.ready ? '#a7f3ad' : '#8a7a60',
                  }}
                >
                  {seat.ready ? '✓ Ready' : 'Not ready'}
                </span>
              </div>
            )
          })}
          {lobby.seats.length < 4 && (
            <div className="p-3 rounded-lg text-center text-xs text-parchment-500 italic"
              style={{ border: '1px dashed rgba(212, 168, 83, 0.15)' }}
            >
              {4 - lobby.seats.length} more seat{4 - lobby.seats.length !== 1 ? 's' : ''} open
            </div>
          )}
        </div>

        {/* My starter element */}
        {mySeat && !mySeat.ready && (
          <div className="mb-6">
            <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider mb-2 text-center">
              Your Starter Element
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ALL_GENRES.map((genre) => {
                const { emoji, rgb } = GENRE_THEME[genre]
                const isChosen = mySeat.starterGenre === genre
                return (
                  <button
                    key={genre}
                    onClick={() => handleGenrePick(genre)}
                    disabled={busy}
                    className="rounded-lg py-2 flex flex-col items-center gap-1 transition-all duration-150 hover:-translate-y-0.5"
                    style={{
                      background: isChosen ? `rgba(${rgb}, 0.2)` : 'rgba(0,0,0,0.25)',
                      border: `1px solid rgba(${rgb}, ${isChosen ? 0.7 : 0.25})`,
                    }}
                  >
                    <span className="text-xl">{emoji}</span>
                    <GenreBadge genre={genre} className="text-[9px] px-1 py-0" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5">
          {mySeat && (
            <button
              onClick={() => op(mySeat.ready ? 'unready' : 'ready')}
              disabled={busy}
              className={`w-full py-3 font-medieval font-bold rounded-lg transition-all duration-200 disabled:opacity-40 ${mySeat.ready ? 'btn-secondary' : ''}`}
              style={
                mySeat.ready
                  ? undefined
                  : {
                      background: 'linear-gradient(135deg, #3d8c40, #2d6e30)',
                      border: '1px solid rgba(100, 220, 100, 0.4)',
                      color: '#d4ffd6',
                    }
              }
            >
              {mySeat.ready ? 'Not Ready After All' : '✓ Ready Up'}
            </button>
          )}
          {isHost && (
            <button
              onClick={() => op('start')}
              disabled={busy || !allReady}
              className="btn-primary w-full py-3 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
              title={allReady ? 'Start the tour!' : 'Everyone must ready up first'}
            >
              🎵 Start the Tour
            </button>
          )}
          {!isHost && allReady && (
            <p className="text-center text-sm text-parchment-500 italic animate-pulse-slow">
              Waiting for the host to start…
            </p>
          )}
          <button
            onClick={() => (lobby.status === 'lobby' ? op('leave') : leaveOnline())}
            disabled={busy}
            className="w-full text-sm text-parchment-500 hover:text-red-300 transition-colors py-1.5"
          >
            Leave Lobby
          </button>
        </div>

        {lastError && (
          <div className="mt-4 text-sm text-red-300 text-center rounded-lg px-3 py-2"
            style={{ background: 'rgba(232, 32, 64, 0.08)', border: '1px solid rgba(232, 32, 64, 0.3)' }}
          >
            {lastError}
          </div>
        )}
      </div>
    </div>
  )
}
