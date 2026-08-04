import { useCallback, useEffect, useState } from 'react'
import { useGameStore, unflattenEngineState, selectIsHost, type GameStore } from '@/store'
import {
  TUNABLE_FIELDS,
  TUNABLE_GROUPS,
  DEFAULT_TUNABLES,
  readTunable,
  writeTunable,
  changedTunablePaths,
  type TunableGroup,
} from '@/data/tunables'
import { GENRE_THEME, ALL_GENRES, readableTextColor } from '@/data/genreTheme'
import { getIdentity } from '@/net/identity'
import * as api from '@/net/api'
import type { DebugPresetSummary } from '@/net/protocol'
import type { Genre, GamePhase } from '@/types'

type Tab = 'values' | 'players' | 'board' | 'presets'

/**
 * Playtesting console. Every balance number, every player's stats, the board's
 * monster chips and the game-flow position are editable live, and any resulting
 * scenario can be saved to the server under a name and reopened from its URL.
 *
 * Open it with `?debug=1`, the Menu entry, or Ctrl/Cmd+Shift+D.
 */
export function DebugPanel() {
  const open = useGameStore((state) => state.debugOpen)
  const _setUi = useGameStore((state) => state._setUi)
  const isHost = useGameStore(selectIsHost)
  const [tab, setTab] = useState<Tab>('values')

  // Ctrl/Cmd+Shift+D toggles the panel from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        _setUi({ debugOpen: !useGameStore.getState().debugOpen })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [_setUi])

  if (!open) return null

  return (
    <div className="fixed inset-y-0 right-0 z-[80] w-full sm:w-[420px] flex flex-col shadow-2xl"
      style={{
        background: 'linear-gradient(180deg, rgba(24, 19, 13, 0.99), rgba(18, 14, 10, 0.99))',
        borderLeft: '1px solid rgba(212, 168, 83, 0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.2)' }}>
        <div>
          <div className="font-display text-lg text-gold-400 leading-none">Playtest Console</div>
          <div className="text-[10px] text-parchment-500 mt-1">Ctrl/⌘ + Shift + D to toggle</div>
        </div>
        <button
          onClick={() => _setUi({ debugOpen: false })}
          className="px-2.5 py-1 rounded-lg text-sm text-parchment-400 hover:text-gold-400 transition-colors"
          style={{ background: 'rgba(61, 48, 32, 0.5)', border: '1px solid rgba(212, 168, 83, 0.2)' }}
        >
          ✕
        </button>
      </div>

      {!isHost && (
        <div className="px-4 py-2 text-xs text-amber-300" style={{ background: 'rgba(255, 180, 60, 0.08)' }}>
          You are not the host — edits will be rejected by the server.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.12)' }}>
        {(['values', 'players', 'board', 'presets'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medieval font-bold capitalize transition-all"
            style={{
              background: tab === t ? 'rgba(212, 168, 83, 0.22)' : 'rgba(61, 48, 32, 0.35)',
              border: `1px solid rgba(212, 168, 83, ${tab === t ? 0.55 : 0.15})`,
              color: tab === t ? '#f0d78c' : '#a89878',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'values' && <ValuesTab />}
        {tab === 'players' && <PlayersTab />}
        {tab === 'board' && <BoardTab />}
        {tab === 'presets' && <PresetsTab />}
      </div>
    </div>
  )
}

// ============================================================
// Shared bits
// ============================================================

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-medieval uppercase tracking-widest text-parchment-500 mt-4 mb-1.5 first:mt-0">
      {children}
    </div>
  )
}

function NumberRow({
  label,
  value,
  min,
  max,
  step,
  help,
  modified,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  help?: string
  modified?: boolean
  onChange: (next: number) => void
}) {
  return (
    <div className="flex items-center gap-2 py-1" title={help}>
      <span className={`flex-1 text-xs truncate ${modified ? 'text-gold-300 font-bold' : 'text-parchment-300'}`}>
        {modified && <span className="mr-1">•</span>}
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 accent-amber-400"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 px-1.5 py-1 rounded text-xs text-right tabular-nums text-parchment-100"
        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(212, 168, 83, 0.25)' }}
      />
    </div>
  )
}

/** The engine state as the panel sees it — the store mirror, un-flattened. */
function useEngineSnapshot(): () => ReturnType<typeof unflattenEngineState> {
  return useCallback(() => unflattenEngineState(useGameStore.getState() as unknown as GameStore), [])
}

// ============================================================
// Values (tunables)
// ============================================================

function ValuesTab() {
  const tunables = useGameStore((state) => state.tunables)
  const dispatch = useGameStore((state) => state.dispatch)
  const changed = changedTunablePaths(tunables)

  const setPath = (path: string, raw: number) => {
    const next = writeTunable(tunables, path, raw)
    dispatch({ type: 'DEBUG_PATCH', patch: { tunables: next } })
  }

  const resetAll = () => dispatch({ type: 'DEBUG_PATCH', patch: { tunables: DEFAULT_TUNABLES } })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-parchment-400">
          {changed.length > 0 ? `${changed.length} changed from default` : 'All values at default'}
        </span>
        <button
          onClick={resetAll}
          disabled={changed.length === 0}
          className="px-2 py-1 rounded text-[11px] font-bold text-parchment-300 disabled:opacity-35 transition-colors hover:enabled:text-gold-300"
          style={{ background: 'rgba(61, 48, 32, 0.5)', border: '1px solid rgba(212, 168, 83, 0.2)' }}
        >
          Reset all
        </button>
      </div>

      {TUNABLE_GROUPS.map((group: TunableGroup) => {
        const fields = TUNABLE_FIELDS.filter((f) => f.group === group)
        if (fields.length === 0) return null
        return (
          <div key={group}>
            <SectionTitle>{group}</SectionTitle>
            {fields.map((field) => (
              <NumberRow
                key={field.path}
                label={field.label}
                value={readTunable(tunables, field.path)}
                min={field.min}
                max={field.max}
                step={field.step}
                help={field.help}
                modified={changed.includes(field.path)}
                onChange={(v) => setPath(field.path, v)}
              />
            ))}
          </div>
        )
      })}

      <p className="text-[10px] text-parchment-500 mt-4 leading-relaxed">
        Values apply immediately and travel with the game — they persist in the local save and sync
        to every seat in an online game. Board/monster changes (HP scale, starting chips) affect
        monsters spawned <em>after</em> the change; use “Respawn monsters” on the Board tab to
        re-derive the whole board now.
      </p>
    </div>
  )
}

// ============================================================
// Players & flow
// ============================================================

const PLAYER_FIELDS: { key: 'fame' | 'exp' | 'inspiration' | 'movesThisTurn' | 'fightsThisTurn' | 'monstersDefeated'; label: string; max: number }[] = [
  { key: 'fame', label: 'Fame', max: 500 },
  { key: 'exp', label: 'EXP', max: 500 },
  { key: 'inspiration', label: 'Inspiration', max: 50 },
  { key: 'movesThisTurn', label: 'Moves used', max: 16 },
  { key: 'fightsThisTurn', label: 'Fights used', max: 10 },
  { key: 'monstersDefeated', label: 'Monsters beaten', max: 200 },
]

const PHASES: GamePhase[] = ['setup', 'main', 'finalBoss', 'gameOver']

function PlayersTab() {
  const players = useGameStore((state) => state.players)
  const spaces = useGameStore((state) => state.spaces)
  const phase = useGameStore((state) => state.phase)
  const currentRound = useGameStore((state) => state.currentRound)
  const currentTurnPlayerIndex = useGameStore((state) => state.currentTurnPlayerIndex)
  const pendingPhase = useGameStore((state) => state.pendingPhase)
  const finalTurnGranted = useGameStore((state) => state.finalTurnGranted)
  const fameGate = useGameStore((state) => state.tunables.fameFinalBossThreshold)
  const dispatch = useGameStore((state) => state.dispatch)

  if (players.length === 0) {
    return <p className="text-xs text-parchment-500">No game running — start one first.</p>
  }

  const patchPlayer = (id: string, key: string, value: number) =>
    dispatch({ type: 'DEBUG_PATCH', patch: { players: { [id]: { [key]: value } } } })

  return (
    <div>
      <SectionTitle>Game flow</SectionTitle>
      <div className="flex items-center gap-2 py-1">
        <span className="flex-1 text-xs text-parchment-300">Phase</span>
        <select
          value={phase}
          onChange={(e) => dispatch({ type: 'DEBUG_PATCH', patch: { flow: { phase: e.target.value as GamePhase } } })}
          className="px-2 py-1 rounded text-xs text-parchment-100"
          style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(212, 168, 83, 0.25)' }}
        >
          {PHASES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <NumberRow
        label="Round"
        value={currentRound}
        min={1}
        max={99}
        step={1}
        onChange={(v) => dispatch({ type: 'DEBUG_PATCH', patch: { flow: { currentRound: v } } })}
      />
      <NumberRow
        label="Turn (player index)"
        value={currentTurnPlayerIndex}
        min={0}
        max={Math.max(players.length - 1, 0)}
        step={1}
        onChange={(v) => dispatch({ type: 'DEBUG_PATCH', patch: { flow: { currentTurnPlayerIndex: v } } })}
      />
      <div className="flex flex-wrap gap-1.5 mt-2">
        <MiniButton
          onClick={() =>
            dispatch({ type: 'DEBUG_PATCH', patch: { flow: { pendingPhase: 'finalBoss', finalTurnGranted: true } } })
          }
        >
          Arm showdown (next round end)
        </MiniButton>
        <MiniButton
          onClick={() =>
            dispatch({
              type: 'DEBUG_PATCH',
              patch: { players: { [players[0].id]: { fame: fameGate } } },
            })
          }
        >
          {players[0].name} → fame gate
        </MiniButton>
        {pendingPhase && (
          <MiniButton
            onClick={() =>
              dispatch({ type: 'DEBUG_PATCH', patch: { flow: { pendingPhase: null, finalTurnGranted: false } } })
            }
          >
            Cancel pending {pendingPhase}
          </MiniButton>
        )}
      </div>
      {pendingPhase && (
        <div className="text-[10px] text-amber-300 mt-1.5">
          Pending: {pendingPhase}{finalTurnGranted ? ' — final turn granted' : ''}
        </div>
      )}

      {players.map((player) => (
        <div key={player.id} className="mt-4 rounded-lg p-2.5"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(212, 168, 83, 0.15)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: player.color, color: readableTextColor(player.color) }}>
              {player.name[0]}
            </span>
            <span className="text-xs font-bold text-gold-300 flex-1 truncate">{player.name}</span>
            <span className="text-[10px] text-parchment-500">{player.starterGenre}</span>
          </div>
          {PLAYER_FIELDS.map((f) => (
            <NumberRow
              key={f.key}
              label={f.label}
              value={player[f.key]}
              min={0}
              max={f.max}
              step={1}
              onChange={(v) => patchPlayer(player.id, f.key, v)}
            />
          ))}
          <div className="flex items-center gap-2 py-1">
            <span className="flex-1 text-xs text-parchment-300">Space</span>
            <select
              value={player.position}
              onChange={(e) => patchPlayer(player.id, 'position', Number(e.target.value))}
              className="px-2 py-1 rounded text-xs text-parchment-100 max-w-[160px]"
              style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(212, 168, 83, 0.25)' }}
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>{s.id} — {s.name}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  )
}

function MiniButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 rounded text-[11px] font-bold text-parchment-300 transition-colors hover:text-gold-300"
      style={{ background: 'rgba(61, 48, 32, 0.5)', border: '1px solid rgba(212, 168, 83, 0.2)' }}
    >
      {children}
    </button>
  )
}

// ============================================================
// Board
// ============================================================

function BoardTab() {
  const spaces = useGameStore((state) => state.spaces)
  const maxTags = useGameStore((state) => state.tunables.maxGenreTags)
  const dispatch = useGameStore((state) => state.dispatch)

  if (spaces.length === 0) {
    return <p className="text-xs text-parchment-500">No game running — start one first.</p>
  }

  const setTags = (spaceId: number, tags: Genre[]) =>
    dispatch({ type: 'DEBUG_PATCH', patch: { spaceTags: { [spaceId]: tags }, respawnMonsters: true } })

  const clearBoard = () =>
    dispatch({
      type: 'DEBUG_PATCH',
      patch: {
        spaceTags: Object.fromEntries(spaces.map((s) => [s.id, [] as Genre[]])),
        respawnMonsters: true,
      },
    })

  return (
    <div>
      <div className="flex gap-1.5 mb-2">
        <MiniButton onClick={clearBoard}>Clear all chips</MiniButton>
        <MiniButton onClick={() => dispatch({ type: 'DEBUG_PATCH', patch: { respawnMonsters: true } })}>
          Respawn monsters
        </MiniButton>
      </div>
      <p className="text-[10px] text-parchment-500 mb-2">
        Tap an element to add a chip; tap a chip in the row to remove it. Monsters re-derive
        immediately, so a space's roster always matches its chips.
      </p>

      {spaces.map((space) => (
        <div key={space.id} className="py-1.5" style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.08)' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-parchment-300 truncate flex-1">
              <span className="text-parchment-500">{space.id}</span> {space.name}
            </span>
            <span className="text-[10px] text-parchment-500 tabular-nums">
              {space.genreTags.length}/{maxTags}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {ALL_GENRES.map((genre) => {
              const { color, emoji } = GENRE_THEME[genre]
              return (
                <button
                  key={genre}
                  disabled={space.genreTags.length >= maxTags}
                  onClick={() => setTags(space.id, [...space.genreTags, genre])}
                  title={`Add ${genre}`}
                  className="w-6 h-6 rounded flex items-center justify-center text-xs disabled:opacity-30 transition-transform hover:enabled:-translate-y-0.5"
                  style={{ background: `${color}33`, border: `1px solid ${color}80` }}
                >
                  {emoji}
                </button>
              )
            })}
            <span className="w-px h-4 mx-1" style={{ background: 'rgba(212, 168, 83, 0.2)' }} />
            {space.genreTags.map((genre, i) => {
              const { color } = GENRE_THEME[genre]
              return (
                <button
                  key={i}
                  onClick={() => setTags(space.id, space.genreTags.filter((_, idx) => idx !== i))}
                  title={`Remove ${genre}`}
                  className="px-1.5 h-5 rounded text-[10px] font-bold transition-transform hover:-translate-y-0.5"
                  style={{ background: color, color: readableTextColor(color) }}
                >
                  {genre[0]}
                </button>
              )
            })}
            {space.genreTags.length === 0 && (
              <span className="text-[10px] text-parchment-500 italic">empty</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Presets
// ============================================================

function PresetsTab() {
  const snapshot = useEngineSnapshot()
  const players = useGameStore((state) => state.players)
  const loadPresetState = useGameStore((state) => state.loadPresetState)
  const _setUi = useGameStore((state) => state._setUi)

  const [presets, setPresets] = useState<DebugPresetSummary[] | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [savedUrl, setSavedUrl] = useState<string | null>(null)

  /**
   * Build the restore link from the page's own origin. The server also returns
   * one, but it only sees the API host — behind the dev proxy that is a
   * different port, so the browser's origin is the authoritative answer.
   */
  const presetUrl = (id: string) => `${window.location.origin}/?preset=${encodeURIComponent(id)}`

  const refresh = useCallback(async () => {
    try {
      const { token } = getIdentity()
      const res = await api.listPresets(token)
      setPresets(res.presets)
    } catch (err) {
      setPresets([])
      setStatus(err instanceof Error ? err.message : 'Could not load presets')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleSave = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    setStatus(null)
    setSavedUrl(null)
    try {
      const { token } = getIdentity()
      const res = await api.savePreset(token, {
        name: name.trim(),
        description: description.trim(),
        engineState: snapshot(),
      })
      const url = presetUrl(res.preset.id)
      await navigator.clipboard?.writeText(url).catch(() => undefined)
      setSavedUrl(url)
      setStatus(`Saved “${res.preset.name}” — link copied to clipboard`)
      setName('')
      setDescription('')
      await refresh()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save preset')
    } finally {
      setBusy(false)
    }
  }

  const handleLoad = async (id: string) => {
    setBusy(true)
    setStatus(null)
    try {
      const { token } = getIdentity()
      const { preset } = await api.fetchPreset(token, id)
      const ok = await loadPresetState(preset.engineState)
      setStatus(ok ? `Loaded “${preset.name}”` : 'Load was rejected (host only)')
      if (ok) _setUi({ debugOpen: false })
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load preset')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    setBusy(true)
    try {
      const { token } = getIdentity()
      await api.deletePreset(token, id)
      await refresh()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not delete preset')
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async (id: string) => {
    const url = presetUrl(id)
    await navigator.clipboard?.writeText(url).catch(() => undefined)
    setSavedUrl(url)
    setStatus('Link copied to clipboard')
  }

  return (
    <div>
      <SectionTitle>Save this scenario</SectionTitle>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (e.g. “Round 5, both at fame gate”)"
        maxLength={60}
        className="w-full px-2 py-1.5 rounded text-xs text-parchment-100 mb-1.5"
        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(212, 168, 83, 0.25)' }}
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional note — what to look at"
        maxLength={280}
        className="w-full px-2 py-1.5 rounded text-xs text-parchment-100 mb-1.5"
        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(212, 168, 83, 0.25)' }}
      />
      <button
        onClick={handleSave}
        disabled={!name.trim() || busy || players.length === 0}
        className="btn-primary w-full py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {players.length === 0 ? 'Start a game first' : 'Save preset & copy link'}
      </button>

      {(status || savedUrl) && (
        <div className="mt-2 rounded p-2"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212, 168, 83, 0.15)' }}>
          {status && <div className="text-[10px] text-parchment-300">{status}</div>}
          {savedUrl && (
            <input
              readOnly
              value={savedUrl}
              onFocus={(e) => e.currentTarget.select()}
              data-testid="preset-url"
              className="w-full mt-1 px-1.5 py-1 rounded text-[10px] text-gold-300 tabular-nums"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(212, 168, 83, 0.2)' }}
            />
          )}
        </div>
      )}

      <SectionTitle>Saved presets</SectionTitle>
      {presets === null && <p className="text-xs text-parchment-500">Loading…</p>}
      {presets?.length === 0 && <p className="text-xs text-parchment-500">Nothing saved yet.</p>}
      {presets?.map((preset) => (
        <div key={preset.id} className="rounded-lg p-2 mb-1.5"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(212, 168, 83, 0.15)' }}>
          <div className="text-xs font-bold text-gold-300 truncate">{preset.name}</div>
          {preset.description && (
            <div className="text-[10px] text-parchment-400 mt-0.5">{preset.description}</div>
          )}
          <div className="text-[10px] text-parchment-500 mt-0.5">
            {preset.players}p · round {preset.round} · {preset.phase}
            {preset.changedTunables > 0 && ` · ${preset.changedTunables} tweaked`}
          </div>
          <div className="flex gap-1.5 mt-1.5">
            <MiniButton onClick={() => void handleLoad(preset.id)}>Load</MiniButton>
            <MiniButton onClick={() => void copyLink(preset.id)}>Copy link</MiniButton>
            <MiniButton onClick={() => void handleDelete(preset.id)}>Delete</MiniButton>
          </div>
        </div>
      ))}
    </div>
  )
}
