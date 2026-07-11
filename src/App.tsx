import { useEffect, useRef, useState } from 'react'
import { useGameStore, hasSavedGame } from './store'
import { getOnlineSession } from './net/identity'
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

  // On first load, resume whatever was in progress: a joined online game
  // takes priority, then a saved hotseat game, else the mode-select screen.
  const [booting, setBooting] = useState(true)
  const bootedRef = useRef(false)
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    const boot = async () => {
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
  }, [resumeOnlineSession, startHotseat])

  if (booting) return null

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

export default App
