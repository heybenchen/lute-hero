import { useState } from 'react'
import { useGameStore, hasSavedGame } from '@/store'
import { getIdentity } from '@/net/identity'

/**
 * Landing screen: play locally on one device (hotseat) or online.
 * Online asks for a name plus create-or-join; hotseat goes straight to
 * the classic Setup (resuming any saved local game).
 */
export function ModeSelect() {
  const startHotseat = useGameStore((state) => state.startHotseat)
  const createOnlineLobby = useGameStore((state) => state.createOnlineLobby)
  const joinOnlineLobby = useGameStore((state) => state.joinOnlineLobby)
  const lastError = useGameStore((state) => state.lastError)

  const [showOnline, setShowOnline] = useState(false)
  const [name, setName] = useState(() => getIdentity().name)
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)

  const canSubmit = name.trim().length > 0 && !busy

  const handleCreate = async () => {
    if (!canSubmit) return
    setBusy(true)
    await createOnlineLobby(name.trim())
    setBusy(false)
  }

  const handleJoin = async () => {
    if (!canSubmit || joinCode.trim().length < 4) return
    setBusy(true)
    await joinOnlineLobby(joinCode.trim().toUpperCase(), name.trim())
    setBusy(false)
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-3 sm:p-8 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, rgba(212, 168, 83, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(109, 86, 56, 0.08) 0%, transparent 50%)
          `,
        }}
      />

      <div className="card-ornate max-w-md w-full relative z-10 p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl text-gold-400 mb-3">Lute Hero</h1>
          <div className="h-px mx-auto w-64 mb-4" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.5), transparent)' }} />
          <p className="text-parchment-400 italic font-game text-base">
            Gather your band — around one screen, or across the realm.
          </p>
        </div>

        {!showOnline ? (
          <div className="space-y-3 animate-fade-in">
            <button
              onClick={() => startHotseat()}
              className="btn-primary w-full text-lg py-4"
              style={{ boxShadow: '0 0 20px rgba(212, 168, 83, 0.15), 0 4px 15px rgba(0,0,0,0.3)' }}
            >
              🎸 Play on This Device
            </button>
            {hasSavedGame() && (
              <p className="text-center text-xs text-parchment-500 -mt-1">
                Resumes your saved local game
              </p>
            )}
            <button onClick={() => setShowOnline(true)} className="btn-secondary w-full text-lg py-4">
              🌐 Play Online
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block font-medieval text-sm text-parchment-400 uppercase tracking-wider mb-2">
                Your Bard Name
              </label>
              <input
                type="text"
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-w-0 px-3 sm:px-4 py-2.5 rounded-lg text-white font-game placeholder:text-parchment-500"
                style={{ background: 'rgba(42, 33, 24, 0.9)', border: '1px solid rgba(212, 168, 83, 0.2)' }}
                placeholder="e.g. Alba the Bold"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={!canSubmit}
              className="btn-primary w-full text-lg py-3.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Working...' : '✨ Create a Lobby'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(212, 168, 83, 0.2)' }} />
              <span className="text-xs text-parchment-500 uppercase tracking-widest">or join</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(212, 168, 83, 0.2)' }} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                maxLength={6}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 rounded-lg text-white font-game tracking-[0.3em] text-center uppercase placeholder:tracking-normal placeholder:text-parchment-500"
                style={{ background: 'rgba(42, 33, 24, 0.9)', border: '1px solid rgba(212, 168, 83, 0.2)' }}
                placeholder="Join code"
              />
              <button
                onClick={handleJoin}
                disabled={!canSubmit || joinCode.trim().length < 4}
                className="btn-secondary px-6 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>

            {lastError && (
              <div className="text-sm text-red-300 text-center rounded-lg px-3 py-2"
                style={{ background: 'rgba(232, 32, 64, 0.08)', border: '1px solid rgba(232, 32, 64, 0.3)' }}
              >
                {lastError}
              </div>
            )}

            <button onClick={() => setShowOnline(false)} className="w-full text-sm text-parchment-500 hover:text-parchment-300 transition-colors py-1">
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
