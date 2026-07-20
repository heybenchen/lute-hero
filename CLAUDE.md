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

**Components** in `src/components/game/` map to game systems: `Board/` (4x4 tile grid), `Combat/` (battle modal with spectator mode), `PlayerPanel/` (turn actions + presence dots + host skip-turn), `DraftShop/` (Studio purchases), `Showdown/` (final boss), `FinalSummary/`. `src/components/lobby/` holds `ModeSelect` and `LobbyRoom`. All write through `dispatch`; never mutate state directly.

**The Bestiary** (`/bestiary`) is a standalone Monster Manual on the same deployment, independent of the game engine. `main.tsx` does path routing (`/bestiary` → `src/bestiary/Bestiary.tsx`, everything else → the game `App`), each side lazy-loaded so their bundles stay separate. Shared roster/effects/level-builder live in `src/bestiary/data.ts` and feed both the UI and the CRUD API (`api/monsters/index.ts` for GET/POST, `api/monsters/[id].ts` for PUT/DELETE), which persists to the same Upstash Redis via `getRedis()` under `bestiary:monsters` (seeded on first read, in-memory fallback in dev/tests). `vercel.json` adds a SPA rewrite (excluding `/api`) so the route deep-links in production.

**Types** are centralized in `src/types/index.ts`; wire types (GameDoc, Snapshot, SSE messages) in `src/net/protocol.ts`.

## Key Game Mechanics

- **Damage flow**: Roll dice (crits cascade) → genre multipliers (2x vulnerable, 0x resistant/immune) → each song hits ALL monsters (AOE)
- **Monster spawning**: one monster per unique genre tag on a space; duplicate tags raise its level (a monster's level equals its genre's tag count, so the board chip matches the fight; capped at Lv5); fame per kill = 5/10/25/50/75 and EXP = 5/10/15/20/25 by level (Lv1–Lv5+)
- **Turn structure**: Move up to 2 spaces, fight 1 combat (up to 3 songs), shop in the Studio, end turn
- **Phase progression**: any single player reaching 150 fame (`FAME_THRESHOLDS.finalBoss`) grants one "final turn," then triggers the Final Showdown (3 verses, one song each, boss adapts elementally between verses; damage = fandom; most total fans wins)
- **Dice upgrade path**: d4 → d6 → d12 → d20

## Deploying online multiplayer (Vercel)

1. Import the repo into Vercel (framework: Vite). `api/**` deploys as Node functions automatically; `vercel.json` raises `maxDuration` for the SSE stream.
2. Add **Upstash Redis** from the Vercel Marketplace (or set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or the `KV_REST_API_*` equivalents). Without them the API falls back to per-invocation in-memory storage, which does NOT work across serverless invocations — Redis is required in production.
3. Hobby-plan note: streams rotate every ~300s (the client reconnects seamlessly); each connected client polls Redis ~2x/s.

## Task Tracking

All tasks, bugs, and feature requests are tracked in `TODO.md` at the repo root. At the start of every session, read `TODO.md` to understand outstanding work. When tasks are completed, move them to the **Completed** section. When new tasks are identified, add them under the appropriate priority section (**High**, **Medium**, or **Low**). Keep `TODO.md` up to date as work progresses.

## Styling

Tailwind with custom theme: `parchment-*` and `wood-*` color palettes for medieval aesthetic, per-genre colors (Ballad red, Folk green, Hymn yellow, Shanty blue in `src/data/genreTheme.ts`). Custom CSS component classes (`.card`, `.btn-primary`, `.genre-*`) in `src/index.css`. Fonts: Cinzel (headers) and Spectral (body) via Google Fonts.
