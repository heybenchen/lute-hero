# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lute Hero is a multiplayer tabletop board game where Bards defeat monsters using music. Players navigate a 16-space grid board, encounter monsters spawned by genre tags, use songs with slotted dice to deal damage (with genre-based multipliers), earn Fame and EXP, and finish with a 3-verse Final Showdown against The Eternal Silence. It plays two ways: **hotseat** (everyone on one device) and **online multiplayer** (lobbies with join codes, server-authoritative state on Vercel).

## Commands

This project uses **pnpm** as its package manager.

- `pnpm install` — Install dependencies
- `pnpm dev` — Start Vite dev server (proxies `/api` to :8787)
- `pnpm dev:api` — Start the local API harness (in-memory Redis) for online mode
- `pnpm build` — TypeScript compile + Vite production build
- `pnpm typecheck:api` — Type-check the serverless functions
- `pnpm lint` — ESLint
- `pnpm test` — Run Vitest tests
- `pnpm test -- --run <path>` — Run a single test file
- `pnpm test:coverage` — Coverage report

## Tech Stack

React 18 + TypeScript (strict) + Vite + Zustand + Tailwind CSS. Server: Vercel Node functions in `api/` + Upstash Redis. Tests use Vitest (jsdom for UI, node for `api/__tests__`). Path alias `@/` maps to `src/` — but **shared code (`src/types`, `src/engine`, `src/game-logic`, `src/data`, `src/net/protocol.ts`) must use relative imports** because the serverless functions import it directly.

## Architecture

**The engine** (`src/engine/`) is the single source of game rules: a pure, deterministic reducer `applyAction(state, action, ctx)` over a serializable `EngineState`. Every mutation is one atomic `GameAction` (START_GAME, MOVE, PLAY_SONG, END_COMBAT, END_TURN, BUY_DIE, PLAY_SHOWDOWN_SONG, …), validated by `validate.ts` (rule legality + online seat authorization). `ctx` injects a seeded RNG (`mulberry32`) and id factory so the server and hotseat produce identical mechanics; all randomness in `src/game-logic/` and `src/data/` takes an `rng` parameter (defaulting to `Math.random`). `applyAction` returns `EngineEvent`s (dice rolls, damage, showdown beats) that drive UI animations.

**Drivers** (`src/drivers/`) own the authoritative state per play mode and push it into the store:
- `LocalDriver` — hotseat: applies actions synchronously, persists saves to localStorage (v9)
- `RemoteDriver` — online: POSTs actions to the API, mirrors state from the SSE stream, dedupes animation events per action seq (actor animates from the POST response, spectators from SSE)

**The store** (`src/store/index.ts`) is a render mirror: engine state (combat flattened to top level) + UI state (mode, connection, lobby) + one `dispatch(action)` routed to the active driver. Selectors: `selectCurrentPlayer`, `selectCanAct` (turn gating), `selectCanPerform` (showdown gating), `selectIsHost`.

**The server** (`api/`) is Vercel Node functions sharing the engine via relative imports: `lobbies/` (create, join-by-code; the same token rejoining gets its seat back — that's reconnect), `games/[id]/actions` (validated engine actions, crypto-seeded RNG, idempotent clientActionIds, CAS retry), `games/[id]/stream` (SSE: snapshot on connect, per-action updates, presence deltas, `goodbye` before the duration cap). Storage is Upstash Redis behind `api/_lib/redis.ts` (`RedisLike` with atomic Lua CAS; in-memory fallback for tests/dev). `scripts/api-dev.ts` runs the same handlers locally.

**Identity** (`src/net/identity.ts`): anonymous `crypto.randomUUID()` token per browser in localStorage; sha256 hash binds it to a seat. `lute-hero-online-session` stores the current game for auto-rejoin on reload.

**Components** in `src/components/game/` map to game systems: `Board/` (4x4 tile grid), `Combat/` (battle modal with spectator mode), `RoundEnd/` (round-end chip redistribution), `PlayerPanel/` (turn actions + presence dots + host skip-turn), `DraftShop/` (Studio purchases), `Showdown/` (final boss), `FinalSummary/`, `DebugPanel/` (playtest console). `src/components/lobby/` holds `ModeSelect` and `LobbyRoom`. All write through `dispatch`; never mutate state directly.

**Types** are centralized in `src/types/index.ts`; wire types (GameDoc, Snapshot, SSE messages, debug presets) in `src/net/protocol.ts`.

**Tunables** (`src/data/tunables.ts`) hold every balance number. They live in `EngineState.tunables`, so tweaks persist in saves and sync to every online seat, and `applyAction` publishes them to a module-level active set via `withTunables` for the duration of one reduce — that is why game-logic reads `getTunables().x` instead of taking a parameter. Never re-add a hardcoded balance constant: add a field plus a `TUNABLE_FIELDS` entry instead.

## Key Game Mechanics

- **Damage flow**: Roll dice (crits cascade) → genre multipliers (2x vulnerable, 0x immune) → damage hits ONE chosen target monster (songs are single-target, not AOE)
- **Song economy in combat**: defeating the target returns that song's dice (it stays playable); damaging without defeating spends the song for that fight (`combat.spentSongIds`). There is no fixed song cap.
- **Monster spawning**: one monster per unique genre tag on a space; duplicate tags raise its level (a monster's level equals its genre's tag count, so the board chip matches the fight; capped at Lv5); fame per kill = 5/10/25/50/75 and EXP = 1/2/3/4/5 by level (Lv1–Lv5+)
- **Turn structure**: Move up to 2 spaces, fight 1 combat, shop in the Studio, end turn. Clearing every monster on a space earns +1 Inspiration and radiates a chosen element to neighbors. Combat does NOT open the Studio — the Studio button pulses (`hasShoppedThisTurn`) until the player visits it.
- **Round end**: after every player has taken a turn, each bard is dealt one monster chip of *every* element (`roundEndChipsPerElement`, default 1) and places them anywhere on the board — one chip per tile, per bard — before the next round (`redistribution` state). This is the only way the board grows.
- **Phase progression**: any single player reaching the fame gate (default 150, `tunables.fameFinalBossThreshold`) grants one "final turn," then triggers the Final Showdown (3 verses, one song each, boss adapts elementally between verses; damage = fandom; most total fans wins)
- **Dice upgrade path**: d4 → d8 → d12 → d20 (2/3/6 EXP; a new d4 costs 1). Every bard starts with a single d8 of their chosen element in song 1, slot 1.
- **EXP scale**: EXP is a small, tight currency — monsters pay 1 per level and everything in the Studio costs single digits. All of it is tunable (`monsterExpPerLevel`, `newD4Cost`, `upgradeCost*`, `inspirationBaseCost`/`Step`).
- **Opening board**: monster chips are dealt from an exactly balanced pool — the same count per element — shuffled across the spaces (`dealBalancedGenreTags`), so no element is over- or under-represented at setup.

## Playtest debug mode

`DebugPanel/` is a live tuning console for playtesting. Open it with `?debug=1`, the Menu's "Playtest Console" entry, or Ctrl/⌘+Shift+D.

- **Values** — every tunable, grouped, with sliders and clamped number inputs
- **Players** — per-player fame/EXP/Inspiration/position/counters, plus phase, round, turn index and shortcuts ("arm showdown", "jump to fame gate")
- **Board** — add/remove monster chips per space, clear the board, respawn monsters
- **Presets** — save the whole `EngineState` to the server under a name, then reload it later or share `?preset=<id>`

Edits flow through two host-gated engine actions so online games stay server-authoritative: `DEBUG_PATCH` (partial tweaks, every value clamped) and `DEBUG_LOAD_STATE` (full state replace, used by preset restore). Presets live in Redis behind `api/debug/presets` (90-day TTL, newest-first index capped at `MAX_PRESETS`). Set `LUTE_HERO_DISABLE_DEBUG=1` to turn the preset endpoints off on a deployment.

## Deploying online multiplayer (Vercel)

1. Import the repo into Vercel (framework: Vite). `api/**` deploys as Node functions automatically; `vercel.json` raises `maxDuration` for the SSE stream.
2. Add **Upstash Redis** from the Vercel Marketplace (or set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or the `KV_REST_API_*` equivalents). Without them the API falls back to per-invocation in-memory storage, which does NOT work across serverless invocations — Redis is required in production.
3. Hobby-plan note: streams rotate every ~300s (the client reconnects seamlessly); each connected client polls Redis ~2x/s.

## Task Tracking

All tasks, bugs, and feature requests are tracked in `TODO.md` at the repo root. At the start of every session, read `TODO.md` to understand outstanding work. When tasks are completed, move them to the **Completed** section. When new tasks are identified, add them under the appropriate priority section (**High**, **Medium**, or **Low**). Keep `TODO.md` up to date as work progresses.

## Styling

Tailwind with custom theme: `parchment-*` and `wood-*` color palettes for medieval aesthetic, per-genre colors (Ballad red, Folk green, Hymn yellow, Shanty blue in `src/data/genreTheme.ts`). Custom CSS component classes (`.card`, `.btn-primary`, `.genre-*`) in `src/index.css`. Fonts: Cinzel (headers) and Spectral (body) via Google Fonts.
