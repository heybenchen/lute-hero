# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lute Hero is a multiplayer tabletop board game where Bards defeat monsters using music. Players navigate a 14-space graph board, encounter monsters spawned by genre tags, use songs with slotted dice to deal damage (with genre-based multipliers), earn Fame and EXP, and progress through three phases: Main Game → Underground Scene → Final Boss.

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — TypeScript compile + Vite production build
- `npm run lint` — ESLint
- `npm test` — Run Vitest tests
- `npm test -- --run <path>` — Run a single test file
- `npm run test:coverage` — Coverage report

## Tech Stack

React 18 + TypeScript (strict) + Vite + Zustand + Tailwind CSS. Tests use Vitest with jsdom. Path alias `@/` maps to `src/`.

## Architecture

**Pure game logic** lives in `src/game-logic/` — framework-agnostic, unit-tested functions for dice rolling, damage calculation, monster spawning, fame/EXP math, and board graph construction. These are called by Zustand actions, never directly by components.

**State management** uses Zustand with a slices pattern in `src/store/`:
- `gameSlice` — Phase transitions, round/turn tracking
- `boardSlice` — 14 board spaces, genre tags, monster placement
- `playersSlice` — Player data, movement, songs, dice inventory
- `combatSlice` — Active combat state, damage calculations, song usage

All slices merge into one store (`src/store/index.ts`) with devtools middleware. Selectors like `selectCurrentPlayer` and `selectCollectiveFame` are exported from the store.

**Components** in `src/components/game/` map to game systems: `Board/` (graph visualization with SVG connections), `Combat/` (battle modal), `PlayerPanel/` (turn actions sidebar), `DraftShop/` (card drafting). `GameView.tsx` is the main layout; `Setup.tsx` handles lobby.

**Types** are centralized in `src/types/index.ts` — defines Genre, DiceType, GamePhase, TrackEffect, Song, Monster, Player, BoardSpace, CombatState, and DamageCalculation.

**Static data** in `src/data/` defines starter dice, track effects (12+ special modifiers like doubleCrit, flip, explosive), draft card generation, and monster templates.

## Key Game Mechanics

- **Damage flow**: Roll dice → apply track effects → sum base damage + crit bonuses (+5 per max roll) → apply genre multipliers (2x vulnerable, 0.5x resistant) → apply effect multipliers → each song hits ALL monsters (AOE)
- **Monster spawning**: Each round adds 1 genre tag per space; every 2 tags of a genre spawns 1 monster of that genre
- **Phase progression**: Collective fame thresholds (30 → Underground, 50 → Final Boss)
- **Dice upgrade path**: d4 → d6 → d12 → d20
- **Turn structure**: Move up to 2 spaces, fight up to 2 combats, then draft

## Styling

Tailwind with custom theme: `parchment-*` and `wood-*` color palettes for medieval aesthetic, per-genre colors (pop pink, rock crimson, electronic cyan, classical purple, hiphop orange). Custom CSS component classes (`.card`, `.btn-primary`, `.genre-*`) in `src/index.css`. Fonts: Cinzel (headers) and Barlow (body) via Google Fonts.
