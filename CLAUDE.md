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

**Components** in `src/components/game/` map to game systems: `Board/` (4x4 tile grid), `Combat/` (battle modal with spectator mode), `PlayerPanel/` (turn actions + presence dots + host skip-turn), `DraftShop/` (Studio purchases), `Showdown/` (final boss), `FinalSummary/`, `DebugPanel/` (playtest console). `src/components/lobby/` holds `ModeSelect` and `LobbyRoom`. All write through `dispatch`; never mutate state directly.

**3D dice** (`src/components/dice3d/`) are a UI-only layer over rolls the engine has already decided. The store announces every `diceRolled` event (own dispatches and spectators' SSE entries) to `diceBus`, which queues throws for `DiceRollHost` (always mounted in `App`, lazy-loads the three.js/cannon-es `DiceRollOverlay` chunk). `simulate.ts` runs a cannon-es throw and `dieShapes.labelsShowing` relabels faces so the landed face shows the real value. `useRollAnimation(..., dieId)` keeps cards tumbling while their die is in flight; await `diceBus.whenSettled()` before showing result popups. No host mounted, reduced motion or no WebGL means a no-op.

**The Bestiary** (`/bestiary`) is a standalone Monster Manual on the same deployment, independent of the game engine. `main.tsx` does path routing (`/bestiary` → `src/bestiary/Bestiary.tsx`, everything else → the game `App`), each side lazy-loaded so their bundles stay separate. Shared roster/effects/level-builder live in `src/bestiary/data.ts` and feed both the UI and the CRUD API (`api/monsters/index.ts` for GET/POST, `api/monsters/[id].ts` for PUT/DELETE), which persists to the same Upstash Redis via `getRedis()` under `bestiary:monsters` (seeded on first read, in-memory fallback in dev/tests). `vercel.json` adds a SPA rewrite (excluding `/api`) so the route deep-links in production.

**Types** are centralized in `src/types/index.ts`; wire types (GameDoc, Snapshot, SSE messages, debug presets) in `src/net/protocol.ts`.

**Tunables** (`src/data/tunables.ts`) hold every balance number. They live in `EngineState.tunables`, so tweaks persist in saves and sync to every online seat, and `applyAction` publishes them to a module-level active set via `withTunables` for the duration of one reduce — that is why game-logic reads `getTunables().x` instead of taking a parameter. Never re-add a hardcoded balance constant: add a field plus a `TUNABLE_FIELDS` entry instead.

## Key Game Mechanics

- **Damage flow**: Roll dice (crits cascade) → genre multipliers (2x vulnerable, 0x immune) → damage hits ONE chosen target monster (songs are single-target, not AOE)
- **Combat rewards**: Fame per kill; EXP only for monsters the bard *wounded* (`currentHP < maxHP`) — every monster on a victory, but untouched ones pay nothing on a retreat (`computeCombatRewards`). Retreat is allowed at any point.
- **Song economy in combat**: defeating the target returns that song's dice (it stays playable); damaging without defeating spends the song for that fight (`combat.spentSongIds`). There is no fixed song cap.
- **Featured songs**: in a fight, the bard may play one song from each other bard on the same space (`combat.featuredPlayerIds`). Hotseat plays it directly (`PLAY_FEATURED_SONG`; players always agree); online the fighter asks (`REQUEST_FEATURE`, which pauses their plays) and the guest's seat answers (`ANSWER_FEATURE`; either side can decline/withdraw). Featured songs roll plain (no styles), never spend or refresh anything, and can't be rerolled. A featured tame is a `KillCredit` with `featuredPlayerId`: the guest gets the rounded-down half of that monster's Fame and EXP (`computeCombatRewards().guestRewards`).
- **Chip limits**: a space holds any number of monster chips, but at most `maxTagsPerGenre` (default 5) of the *same* element — the cap that keeps a monster from exceeding Lv5. Use `canAddGenreTag`/`addGenreTag`/`capGenreTags` from `graphBuilder` rather than checking `genreTags.length`.
- **Monster spawning**: one monster per unique genre tag on a space; duplicate tags raise its level (a monster's level equals its genre's tag count, so the board chip matches the fight; capped at Lv5); fame per kill = 5/10/25/50/75 and EXP = 1/2/3/4/5 by level (Lv1–Lv5+)
- **Monster HP**: uniform per level, from `monsterBaseHp` (8) × the level multiplier — 8/14/24/40/60 for Lv1–5. Templates carry no HP: `MonsterTemplate.tier` only paces *which* monster shows up as rounds progress. Use `monsterSpawnHp(level)` rather than recomputing.
- **Turn structure**: Move up to 2 connected spaces (there is no Inspiration travel), fight 1 combat, shop in the Studio, end turn. Clearing every monster on a space earns +1 Inspiration and radiates a chosen element to neighbors. Combat does NOT open the Studio — the Studio button pulses (`hasShoppedThisTurn`) until the player visits it.
- **Round end**: after every player has taken a turn the board is reinforced automatically — one chip of *every* element per bard (`roundEndChipsPerElement`, default 1), scattered to random spaces with `scatterChipsRandomly` so no two of that round's chips share a space. No player input; the round just advances. This is the only way the board grows.
- **Phase progression**: any single player reaching the fame gate (default 200, `tunables.fameFinalBossThreshold`) grants one "final turn," then triggers the Final Showdown (3 verses; each verse a bard performs one element — every die of it rolls together via `showdownElementSongs`, rerollable with Inspiration — between verses the boss becomes immune (0×) to the strongest performance's element — it has no weakness; damage = fandom; most total fans wins)
- **Styles**: Studio purchases that change how ALL of a bard's songs play — a bard holds at most `maxStyles` (2). Two are on the shelf (`EngineState.styleOffers`), redrawn at the start of every turn (`beginTurn`) or for Inspiration (`REFRESH_STYLE_OFFERS`); `BUY_STYLE` at the cap names one to replace. Catalog + live rule text in `src/data/styles.ts`. Players see high-fantasy names (Rallying Cry, Extra Verse, War Drums, Nimble Fingers, Master's Touch, Dragon's Roar, Lingering Note, Dissonance, Harmony, Fanfare, Crowd Favorite, Muse's Favor); the ids are the original musical working names (`staccato`, `coda`, `ostinato`, `rubato`, `virtuoso`, `fortissimo`, `fermata`, `counterpoint`, `tutti`, `overture`, `bravo`, `ispirato`) and stay fixed so saves keep their styles; roll/damage effects in `src/game-logic/styles/styleEffects.ts`, shared by combat and the showdown. "Once per turn" styles fire automatically and are tracked in `combat.stylesUsed` (part of the reroll snapshot, so rerolls replay them) — except Nimble Fingers (`rubato`), a free `REROLL_SONG { rubato: true }`, and Rallying Cry (`staccato`), which a tame arms (`combat.rallyReady`) so the bard can refresh a spent song of their choice with `RALLY_SONG`. In fights a song is performed by clicking its die. Extra Verse (`coda`) adds a 7th song (`<playerId>-coda`); losing it returns that song's die as an unclaimed reward. Every price and effect size is a tunable in the Styles group.
- **Dice upgrade path**: d4 → d8 → d12 → d20 (2/2/4 EXP; a new d4 costs 1 — totals 1/3/5/9, so every upgrade step pays roughly the same damage per EXP). Every bard starts with one d8 of their chosen element, in song 1.
- **EXP scale**: EXP is a small, tight currency — monsters pay 1 per level and everything in the Studio costs single digits. All of it is tunable (`monsterExpPerLevel`, `newD4Cost`, `upgradeCost*`, `inspirationBaseCost`/`Step`).
- **Opening board**: monster chips are dealt from an exactly balanced pool — the same count per element — shuffled across the spaces (`dealBalancedGenreTags`), so no element is over- or under-represented at setup. `ensureStarterChips` then swaps chips so every bard's starting space holds a monster of their own element, keeping the per-element totals intact.

## Playtest debug mode

`DebugPanel/` is a live tuning console for playtesting. Open it with `?debug=1`, the Menu's "Playtest Console" entry, or Ctrl/⌘+Shift+D.

- **Values** — every tunable, grouped, with sliders and clamped number inputs
- **Players** — per-player fame/EXP/Inspiration/position/counters, plus phase, round, turn index and shortcuts ("arm showdown", "jump to fame gate")
- **Simulate** — pick a round with a large −/+ stepper, then **Play on from round N+1** or **Showdown after round N** (`DEBUG_SIMULATE`: bots replay this table — same bards, elements and tunables — from a fresh deal through the real engine)
- **Board** — add/remove monster chips per space, clear the board, respawn monsters
- **Presets** — save the whole `EngineState` to the server under a name, then reload it later or share `?preset=<id>`

The simulation plays with the **smart bot** (`src/sim/smartBot.ts`), driven by exact roll/damage distributions (`src/sim/odds.ts`, verified against the engine's dice in `odds.test.ts`): it picks each fight play by tame probability and the cost of losing the song (a tame returns the die), prices rerolls/Inspiration by stage and banks Inspiration for the showdown, uses Lingering Note / Nimble Fingers / Rallying Cry / featured songs deliberately, wounds untouched monsters for EXP, shops by how much each option raises its odds against the monsters on the board (styles and style pairs included), and plans showdown verses around the boss's immunity. `simulateRounds` runs it inside the reducer (`simulateToRound`), so it works the same in hotseat and on the server. The original greedy bot in `src/sim/bot.ts` stays as the yardstick: `npx tsx scripts/bot-tournament.ts [games] [lineup]` plays mixed tables (e.g. `SBB`; `PARAMS`/`VS` env vars tune or pit variants) — the smart bot wins ~86% head-to-head and ~76% of seats against two baselines. `scripts/style-audit.ts` measures styles and style pairs (`STYLES=a+b`, `PAIRS=1`) with smart bots in every seat. If a bot game reaches the showdown before round N, up to 12 games are tried and the furthest is used (rounds are capped at `MAX_SIMULATED_ROUND`). `src/data/roundProfiles.ts` only holds when bot games typically reach the showdown (shown next to the control); it is GENERATED by `npx tsx scripts/sim-round-profiles.ts`, which also prints per-round holdings — regenerate after balance changes.

Edits flow through host-gated engine actions so online games stay server-authoritative: `DEBUG_PATCH` (partial tweaks, every value clamped), `DEBUG_LOAD_STATE` (full state replace, used by preset restore) and `DEBUG_SIMULATE`. Presets live in Redis behind `api/debug/presets` (90-day TTL, newest-first index capped at `MAX_PRESETS`). Set `LUTE_HERO_DISABLE_DEBUG=1` to turn the preset endpoints off on a deployment.

## Deploying online multiplayer (Vercel)

1. Import the repo into Vercel (framework: Vite). `api/**` deploys as Node functions automatically; `vercel.json` raises `maxDuration` for the SSE stream.
2. Add **Upstash Redis** from the Vercel Marketplace (or set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or the `KV_REST_API_*` equivalents). Without them the API falls back to per-invocation in-memory storage, which does NOT work across serverless invocations — Redis is required in production.
3. Hobby-plan note: streams rotate every ~300s (the client reconnects seamlessly); each connected client polls Redis ~2x/s.

## Task Tracking

All tasks, bugs, and feature requests are tracked in `TODO.md` at the repo root. At the start of every session, read `TODO.md` to understand outstanding work. When tasks are completed, move them to the **Completed** section. When new tasks are identified, add them under the appropriate priority section (**High**, **Medium**, or **Low**). Keep `TODO.md` up to date as work progresses.

## Styling

Tailwind with custom theme: `parchment-*` and `wood-*` color palettes for medieval aesthetic, per-genre colors (Ballad red, Folk green, Hymn yellow, Shanty blue in `src/data/genreTheme.ts`). Custom CSS component classes (`.card`, `.btn-primary`, `.genre-*`) in `src/index.css`. Fonts: Cinzel (headers) and Spectral (body) via Google Fonts.
