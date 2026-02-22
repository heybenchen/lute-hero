# Lute Hero — TODO

## High Priority

- [ ] When starting the game, ensure all spaces only have one genre tag
- [ ] Make the first inspiration seek free
- [ ] Improve the UI that shows the players' stats
- [ ] Change it back to adding 1 tag per round to all spaces
- [ ] When all the monsters are defeated in a space, add 1 tag to all adjacent
      spaces
- [ ] Improve the layout of the map so it looks like an organized grid

## Medium Priority

(none)

## Low Priority

- [x] Update notification hook — changed from blocking MessageBox to two-tone beep

## Completed

- [x] Remove elite monsters & rework spawning (types, data, spawner, calculator, UI, tests)
- [x] Rework `undergroundSceneProgress` — now driven by collective fame thresholds (300 → underground, 500 → finalBoss), checked after combat via `checkPhaseTransition`
- [x] Verify boardSlice spawning integration — added integration tests for `spawnMonstersAtSpace`, `spawnInitialMonstersOnBoard`, `clearSpaceAfterCombat`, and full round flow
- [x] Add studio level concept — `getStudioLevel(monstersDefeated)` returns Lv1-3, weighted dice tier selection in DraftShop (Lv1 favors cheap, Lv3 favors expensive)
