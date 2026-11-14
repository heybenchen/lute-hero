import { useEffect, useRef, useState } from 'react'
import { useGameStore, hasSavedGame } from './store'
import { CriticalRollDialog } from './components/game/CriticalRollDialog'
import { getOnlineSession, getIdentity } from './net/identity'
import * as api from './net/api'
import { DebugPanel } from './components/game/DebugPanel'
import { Setup } from './components/game/Setup'
import { GameView } from './components/game/GameView'
import { FinalShowdown } from './components/game/Showdown'
import { FinalSummary } from './components/game/FinalSummary'
import { ModeSelect } from './components/lobby/ModeSelect'
import { LobbyRoom } from './components/lobby/LobbyRoom'

function App() {
  const phase = useGameStore((state) => state.phase)
  const mode = useGameStore((state) => state.mode)
  const lobby = useGameStore((state) => state.lobby)
  const startHotseat = useGameStore((state) => state.startHotseat)
  const resumeOnlineSession = useGameStore((state) => state.resumeOnlineSession)
  const loadPresetState = useGameStore((state) => state.loadPresetState)
  const _setUi = useGameStore((state) => state._setUi)

  // On first load, resume whatever was in progress. A `?preset=` link wins over
  // everything — it exists precisely to drop you into a specific playtest state.
  const [booting, setBooting] = useState(true)
  const bootedRef = useRef(false)
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    const boot = async () => {
      const params = new URLSearchParams(window.location.search)
      const presetId = params.get('preset')
      if (presetId) {
        try {
          const { token } = getIdentity()
          const { preset } = await api.fetchPreset(token, presetId)
          if (await loadPresetState(preset.engineState)) {
            _setUi({ debugOpen: true })
            setBooting(false)
            return
          }
        } catch {
          // Fall through to the normal boot path; the URL may be stale.
        }
      }
      if (params.get('debug') === '1') _setUi({ debugOpen: true })

      if (getOnlineSession() && (await resumeOnlineSession())) {
        setBooting(false)
        return
      }
      if (hasSavedGame()) {
        startHotseat()
      }
      setBooting(false)
    }
    void boot()
  }, [resumeOnlineSession, startHotseat, loadPresetState, _setUi])

  if (booting) return null

  // The debug panel overlays every screen, so a playtester can open it from the
  // mode select, a lobby, mid-combat or the summary alike.
  return (
    <>
      {renderScreen()}
      <DebugPanel />
      <CriticalRollDialog />
    </>
  )

  function renderScreen() {
    if (mode === null) {
      return <ModeSelect />
    }

    // Online: the waiting room until the host starts (and again after a reset)
    if (mode === 'online' && (!lobby || lobby.status === 'lobby')) {
      return <LobbyRoom />
    }

    if (phase === 'setup') {
      return mode === 'hotseat' ? <Setup /> : <LobbyRoom />
    }

    if (phase === 'finalBoss') {
      return <FinalShowdown />
    }

    if (phase === 'gameOver') {
      return <FinalSummary />
    }

    return <GameView />
  }
}

export default App
