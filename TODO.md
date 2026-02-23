# Lute Hero — TODO

## High Priority

- [] Change the colors to be more distinct from one another on the map
- [] Only designate 4 starting spaces. Make each starting space as far away from
  the others as possible.
- [] Update all songs to only have one effect
- [] Make it so that all players have 4 songs by default which they can slot
  dice into, but with no effects or song titles. Buying the song title is what adds the effect.

## Medium Priority

(none)

## Low Priority

- [x] Update notification hook — changed from blocking MessageBox to two-tone beep

## Completed

- [x] Remove elite monsters & rework spawning (types, data, spawner, calculator, UI, tests)
- [x] Rework `undergroundSceneProgress` — now driven by collective fame thresholds (300 → underground, 500 → finalBoss), checked after combat via `checkPhaseTransition`
- [x] Verify boardSlice spawning integration — added integration tests for `spawnMonstersAtSpace`, `spawnInitialMonstersOnBoard`, `clearSpaceAfterCombat`, and full round flow
- [x] Add studio level concept — `getStudioLevel(monstersDefeated)` returns Lv1-3, weighted dice tier selection in DraftShop (Lv1 favors cheap, Lv3 favors expensive)
