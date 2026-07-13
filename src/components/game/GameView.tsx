import { useEffect, useState, type ReactNode } from 'react'
import { Board } from './Board'
import { CombatModal } from './Combat'
import { PlayerPanel } from './PlayerPanel'
import { useGameStore, selectIsHost, clearSavedGame } from '@/store'

export function GameView() {
  const dispatch = useGameStore((state) => state.dispatch)
  const mode = useGameStore((state) => state.mode)
  const connection = useGameStore((state) => state.connection)
  const isHost = useGameStore(selectIsHost)
  const leaveOnline = useGameStore((state) => state.leaveOnline)
  const goToModeSelect = useGameStore((state) => state.goToModeSelect)
  const lastError = useGameStore((state) => state.lastError)
  const _setUi = useGameStore((state) => state._setUi)
  const currentRound = useGameStore((state) => state.currentRound)
  const pendingPhase = useGameStore((state) => state.pendingPhase)
  const finalTurnGranted = useGameStore((state) => state.finalTurnGranted)
  const [showMenu, setShowMenu] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)

  // Rejected actions (422/403/409) surface briefly, then clear
  useEffect(() => {
    if (!lastError) return
    const timer = setTimeout(() => _setUi({ lastError: null }), 4000)
    return () => clearTimeout(timer)
  }, [lastError, _setUi])

  const handleNewGame = () => {
    setShowMenu(false)
    if (mode === 'online') {
      // Online: reset the shared game back to its lobby, staying online
      dispatch({ type: 'RESET_GAME' })
    } else {
      // Local: abandon the saved game and return to mode select so the
      // player can pick local or online for the new game
      clearSavedGame()
      goToModeSelect()
    }
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden relative">
      {/* Atmospheric background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(212, 168, 83, 0.04) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 30%, rgba(109, 86, 56, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%, rgba(139, 111, 71, 0.05) 0%, transparent 40%)
          `,
        }}
      />

      {/* Title bar */}
      <div className="relative z-10 flex items-center justify-center py-2 sm:py-3 px-3 sm:px-6 flex-shrink-0">
        <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
          <button
            onClick={() => setShowMenu(true)}
            className="absolute left-3 sm:left-6 px-3 py-1.5 rounded-lg font-medieval text-sm text-parchment-400 transition-all duration-150 hover:text-gold-400"
            style={{
              background: 'rgba(61, 48, 32, 0.4)',
              border: '1px solid rgba(212, 168, 83, 0.15)',
            }}
          >
            Menu
          </button>
          <div
            className="hidden sm:block h-px w-16"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.5))',
            }}
          />
          <h1
            className="font-display text-2xl sm:text-3xl text-gold-400 tracking-wide"
            style={{ textShadow: '0 0 20px rgba(212, 168, 83, 0.35), 0 2px 4px rgba(0, 0, 0, 0.5)' }}
          >
            Lute Hero
          </h1>
          {mode === 'online' && connection !== 'connected' && (
            <span
              className="text-[10px] font-medieval font-bold px-2 py-0.5 rounded-full animate-pulse"
              style={{
                background: 'rgba(255, 180, 60, 0.1)',
                border: '1px solid rgba(255, 180, 60, 0.4)',
                color: '#ffd591',
              }}
            >
              Reconnecting…
            </span>
          )}
          <div
            className="hidden sm:block h-px w-16"
            style={{
              background: 'linear-gradient(to left, transparent, rgba(212, 168, 83, 0.5))',
            }}
          />
          <div className="absolute right-3 sm:right-6 flex items-center gap-2">
            <span className="font-display text-sm text-gold-400">Round {currentRound}</span>
            {pendingPhase && finalTurnGranted && (
              <span className="text-xs font-medieval font-bold text-amber-300 tracking-wide animate-pulse">
                Final Turn!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Menu modal */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.6)' }}>
          <div className="card-ornate max-w-sm w-full p-8 animate-scale-in">
            <div className="text-center mb-6">
              <div className="font-display text-2xl text-gold-400 mb-2">Menu</div>
              <div className="h-px mx-auto w-32" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.4), transparent)' }} />
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowMenu(false)}
                className="btn-secondary w-full py-3"
              >
                Resume Game
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowHowTo(true) }}
                className="btn-secondary w-full py-3"
              >
                How to Play
              </button>
              {isHost && (
                <button
                  onClick={handleNewGame}
                  className="w-full py-3 font-medieval font-bold rounded-lg transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #8c3d3d, #6e2d2d)',
                    border: '1px solid rgba(220, 100, 100, 0.4)',
                    color: '#ffd4d4',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {mode === 'online' ? 'Back to Lobby (reset)' : 'New Game'}
                </button>
              )}
              {mode === 'online' ? (
                <button onClick={leaveOnline} className="btn-secondary w-full py-3">
                  Leave Online Game
                </button>
              ) : (
                <button onClick={goToModeSelect} className="btn-secondary w-full py-3">
                  Exit to Menu
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* How to Play modal */}
      {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}

      {/* Main content */}
      <div className="relative z-10 flex flex-col lg:flex-row gap-2 sm:gap-3 flex-1 min-h-0 px-2 sm:px-3 pb-2 sm:pb-3">
        {/* Player panel */}
        <div className="w-full max-h-[50dvh] lg:max-h-none lg:w-80 flex-shrink-0 overflow-auto min-h-0">
          <PlayerPanel />
        </div>

        {/* Board area */}
        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 overflow-hidden rounded-xl" style={{
            border: '1px solid rgba(212, 168, 83, 0.15)',
          }}>
            <Board />
          </div>
        </div>
      </div>

      {/* Combat modal overlay */}
      <CombatModal />

      {/* Error toast */}
      {lastError && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-lg text-sm font-medieval animate-slide-up"
          style={{
            background: 'rgba(40, 18, 20, 0.95)',
            border: '1px solid rgba(232, 32, 64, 0.45)',
            color: '#ffb3b3',
            boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
          }}
        >
          {lastError}
        </div>
      )}
    </div>
  )
}

/** Rules reference opened from the Menu. */
function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="card-ornate max-w-lg w-full max-h-[85dvh] overflow-y-auto p-6 sm:p-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <div className="font-display text-2xl text-gold-400 mb-2">How to Play</div>
          <div className="h-px mx-auto w-40" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.4), transparent)' }} />
        </div>

        <div className="space-y-5 text-sm text-parchment-200 leading-relaxed">
          <Section title="🎯 Goal">
            You are a Bard defeating monsters with music. Earn <Hl>Fame</Hl> by winning
            fights. The first bard to reach <Hl>150 Fame</Hl> triggers the Final Showdown,
            and whoever has the most Fame after it is crowned Legend of the Realm.
          </Section>

          <Section title="🔄 Your Turn">
            <List items={[
              <>Move up to <Hl>2 spaces</Hl> across the board (or spend 1 Inspiration to travel to any space).</>,
              <>If monsters are on your space, <Hl>Fight</Hl> once — one combat per turn.</>,
              <>Visit the <Hl>Studio</Hl> to spend EXP on dice and song names (unlimited buys).</>,
              <>Press <Hl>End Turn</Hl> to pass to the next bard.</>,
            ]} />
          </Section>

          <Section title="🎲 Combat">
            <List items={[
              <>Play up to <Hl>3 songs</Hl> per fight. Each song rolls the dice slotted into it.</>,
              <>Every song is <Hl>AOE</Hl> — its damage hits <Hl>all</Hl> monsters at once.</>,
              <>Rolling a die's highest face <Hl>crits</Hl>, rolling again for bonus damage.</>,
              <>Spend <Hl>Inspiration</Hl> to reroll the song you just performed.</>,
            ]} />
          </Section>

          <Section title="🎵 Genres & Elements">
            <p className="mb-2">Each die belongs to an element. Monsters are weak or immune to certain elements:</p>
            <List items={[
              <><Hl>2× damage</Hl> from the element a monster is <Hl>weak</Hl> to.</>,
              <><Hl>0× damage</Hl> (immune) from the element a monster <Hl>resists</Hl>.</>,
              <>Elements: <span className="text-red-300">Ballad (Fire)</span>, <span className="text-green-300">Folk (Earth)</span>, <span className="text-yellow-200">Hymn (Wind)</span>, <span className="text-blue-300">Shanty (Water)</span>.</>,
            ]} />
          </Section>

          <Section title="🛠 The Studio (Shop)">
            <List items={[
              <>Spend <Hl>EXP</Hl> to buy new dice or upgrade them: <Hl>d4 → d6 → d12 → d20</Hl>.</>,
              <>Buy <Hl>song names</Hl> that grant powerful effects to a song.</>,
              <>Spend EXP to buy <Hl>Inspiration</Hl> — used for rerolls, travel, and refreshing offers.</>,
            ]} />
          </Section>

          <Section title="⚡ The Final Showdown">
            <List items={[
              <>Three verses; each verse every bard performs <Hl>one song</Hl> against The Eternal Silence.</>,
              <>Every point of damage earns <Hl>1 fandom</Hl>, banked into your Fame.</>,
              <>Between verses the boss <Hl>adapts</Hl>: immune to the strongest attack's element, weak to the weakest.</>,
              <>The bard with the most Fame at the end wins.</>,
            ]} />
          </Section>
        </div>

        <button onClick={onClose} className="btn-primary w-full py-3 mt-6">
          Got it
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-medieval font-bold text-gold-300 mb-1.5">{title}</div>
      {children}
    </div>
  )
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-2">
          <span className="text-gold-400 flex-shrink-0">♪</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Hl({ children }: { children: ReactNode }) {
  return <span className="font-bold text-gold-300">{children}</span>
}
