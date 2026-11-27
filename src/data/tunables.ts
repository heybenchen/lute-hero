/**
 * Every balance number in the game, in one editable place.
 *
 * The playtest debug panel writes these; the engine reads them. Tunables live
 * inside `EngineState`, so they travel with saves and sync to every online
 * client automatically, and `applyAction` stays deterministic for a given
 * (state, action, rng) triple.
 *
 * Reading happens through the module-level "active" set rather than a threaded
 * parameter — `applyAction` scopes it to `state.tunables` around the reduce
 * (see `withTunables`), which keeps ~50 call sites free of plumbing.
 */

export interface Tunables {
  // --- Progression ---
  /** Fame any single player must reach to trigger the Final Showdown. */
  fameFinalBossThreshold: number
  /** Fame a defeated monster is worth, indexed by level 1..5. */
  monsterFameByLevel: number[]
  /** EXP a monster is worth per level (Lv N = N × this). */
  monsterExpPerLevel: number

  // --- Turn structure ---
  maxMovesPerTurn: number
  maxFightsPerTurn: number
  /** Chips of EACH element every bard is dealt to place at round end. */
  roundEndChipsPerElement: number

  // --- Board ---
  /** Cap on chips of ONE element per space. A space's total is uncapped. */
  maxTagsPerElement: number
  /** Chips every space carries when the game begins. */
  startingTagsPerSpace: number

  // --- Monsters ---
  maxMonsterLevel: number
  /** HP a level-1 monster spawns with, before the level multiplier. */
  monsterBaseHp: number
  /** HP multiplier by monster level 1..5, applied to the template's base HP. */
  hpMultipliers: number[]
  /** Global scale on every monster's spawn HP (1 = template value). */
  monsterHpScale: number

  // --- Combat multipliers ---
  /** Damage multiplier when a die's element matches the monster's weakness. */
  vulnerabilityMultiplier: number
  /** Damage multiplier when it matches the monster's immunity. */
  resistanceMultiplier: number
  /** Cap on chained crit re-rolls for a single die. */
  maxCritCascades: number

  // --- Economy ---
  startingInspiration: number
  newD4Cost: number
  upgradeCostD8: number
  upgradeCostD12: number
  upgradeCostD20: number
  /** First Inspiration of a turn costs this; each further one adds the step. */
  inspirationBaseCost: number
  inspirationCostStep: number
  /** Inspiration spent per reroll / travel / shop refresh. */
  inspirationSpend: number

  // --- Shop ---
  elementOfferCount: number
  chipsPerElementPerPlayer: number

  // --- Final Showdown ---
  showdownTurns: number

  // --- Genres (see src/data/genres.ts) ---
  // KEEP IN SYNC: genres.md (repo root) documents every genre's rule, price, tunables and simulated strength. When you change genre logic, rule text, a price or a genre tunable's default, or add or remove a genre, update genres.md in the same change.
  /** Genres a bard can own at once; buying past this replaces one. */
  maxGenres: number
  /** Number of persistent genre offers shown in the Studio. */
  genreOfferCount: number
  /** EXP price of each genre. */
  genreCostGospel: number
  genreCostNewAge: number
  genreCostIndie: number
  genreCostBebop: number
  genreCostBluegrass: number
  genreCostOpera: number
  genreCostBlues: number
  genreCostCrossover: number
  genreCostBarbershop: number
  genreCostScreamo: number
  genreCostDisco: number
  genreCostPop: number
  /** Opera: added to every d20 roll (can crit). */
  operaBonus: number
  /** Screamo: added to the value of your first song each turn (can't crit). */
  screamoBonus: number
  /** Barbershop: added to the value of the song for each die rolled while you hold all four elements (can't crit). */
  barbershopBonus: number
  /** Indie: lowest d4 face that crits (cascade dice still need a 4). */
  indieCritFace: number
  /** Crossover: multiplier on the first immune hit each turn. */
  crossoverMultiplier: number
  /** Disco: extra Fame per monster tamed. */
  discoFamePerTame: number
  /** Lingering Note: smallest die (faces) whose missed song isn't spent. */
  bluesMinFaces: number
  /** Rallying Cry: largest die (faces) a refreshed song may hold. */
  gospelMaxFaces: number
  /** Nimble Fingers: largest die (faces) the free reroll works on. */
  bebopMaxFaces: number
  /** Master's Touch: smallest die (faces) that rolls twice. */
  bluegrassMinFaces: number
  /** Master's Touch: the largest die (faces) it rolls twice. */
  bluegrassMaxFaces: number
  /** Harmony: distinct elements the setlist must hold. */
  barbershopElements: number
  /** Ending a concert early: 0 = only moved (wounded) monsters level up, 1 = every monster left levels up. */
  retreatLevelsUpAll: number
  /** Muse's Favor: Inspiration topped up to at the start of each turn. */
  popMin: number
  /** Muse's Favor: Inspiration gained at the start of each turn (after the floor). */
  popPerTurn: number
  /** Lingering Note: Inspiration paid to keep a missed song (0 = free). */
  bluesInspirationCost: number
  /** War Drums: largest die (faces) whose crit face drops by the same amount as a d4's. */
  indieMaxFaces: number
  /** Nimble Fingers: free rerolls per turn. */
  bebopUsesPerTurn: number
  /** War Drums: extra charm per crit bonus die from a die it affects. */
  indieCascadeBonus: number
  /** War Drums: bonus dice chain on this face or higher (4 = a d4's top face only). */
  indieChainFace: number
  /** Crowd Favorite: only tames of monsters at this level or higher pay its Fame. */
  discoMinLevel: number

  // --- Studio genres built from the genre lab ---
  genreCostCountry: number
  genreCostBaroque: number
  genreCostLoFi: number
  genreCostSoul: number
  genreCostRap: number
  genreCostHouse: number
  genreCostOrchestra: number
  genreCostMariachi: number
  /** Country: bonus (can crit) to dice of the bard's starting element. */
  countryBonus: number
  /** Baroque: a natural roll below this face counts as showing this face. */
  baroqueFloor: number
  /** Rap: EXP gained at the start of each of the bard's turns. */
  rapExp: number
  /** Lo-fi: EXP off every upgrade. */
  loFiDiscount: number
  /** Soul: bonus to every song while holding enough Inspiration. */
  soulBonus: number
  soulMin: number
  /** Soul: Inspiration spent for the bonus. */
  soulCost: number
  /** House: bonus per same-element song played in a row before this one, and its cap. */
  houseBonus: number
  houseCap: number
  /** House: bonus per link in the Final Showdown. */
  houseShowdownBonus: number
  /** Orchestra: bonus to every song in fights with enough monsters. */
  orchestraBonus: number
  orchestraMin: number
  /** Mariachi: bonus to every song while sharing a space with another bard. */
  mariachiBonus: number
  genreCostPunk: number
  genreCostSoftRock: number
  genreCostProgRock: number
  genreCostSka: number
  genreCostKPop: number
  genreCostEmo: number
  genreCostTrance: number
  genreCostGrunge: number
  genreCostDubstep: number
  genreCostTripHop: number
  /** Punk: bonus to d4 songs. */
  punkBonus: number
  /** Soft Rock: face value added to d8s and d12s (can crit). */
  softRockBonus: number
  /** Prog Rock: bonus from this song of a concert on (3 = the 3rd). */
  progRockFrom: number
  progRockBonus: number
  /** Ska: bonus when a die lands on an odd face. */
  skaBonus: number
  /** K-Pop: Fame for a song that moves its monster without winning it over. */
  /** K-Pop: Fame for winning over 3 / 4+ monsters in one concert. */
  kPopFame3: number
  kPopFame4: number
  /** Emo: bonus per spent song, and its cap. */
  /** Emo: bonus on the song the bard declares their last of the concert. */
  emoBonus: number
  /** Opera: 1 = its bonus raises the d20's rolled value (it can crit), 0 = a flat bonus. */
  operaRaisesFace: number
  /** Dubstep: bonus to the song after moving a monster without winning it over. */
  dubstepBonus: number
  /** Trance: bonus while holding no Inspiration. */
  tranceBonus: number
}

export const DEFAULT_TUNABLES: Tunables = {
  fameFinalBossThreshold: 200,
  monsterFameByLevel: [5, 10, 25, 50, 75],
  monsterExpPerLevel: 1,

  maxMovesPerTurn: 2,
  maxFightsPerTurn: 1,
  roundEndChipsPerElement: 1,

  maxTagsPerElement: 5,
  startingTagsPerSpace: 1,

  maxMonsterLevel: 5,
  monsterBaseHp: 8,
  hpMultipliers: [1, 1.75, 3, 5, 7.5],
  monsterHpScale: 1,

  vulnerabilityMultiplier: 2,
  resistanceMultiplier: 0,
  maxCritCascades: 10,

  startingInspiration: 1,
  newD4Cost: 1,
  upgradeCostD8: 2,
  upgradeCostD12: 2,
  upgradeCostD20: 4,
  inspirationBaseCost: 1,
  inspirationCostStep: 0,
  inspirationSpend: 1,

  elementOfferCount: 4,
  chipsPerElementPerPlayer: 6,

  showdownTurns: 3,

  maxGenres: 2,
  genreOfferCount: 2,
  // Genre defaults: changing any of these means updating genres.md
  genreCostGospel: 2,
  genreCostNewAge: 1,
  genreCostIndie: 2,
  genreCostBebop: 1,
  genreCostBluegrass: 2,
  genreCostOpera: 2,
  genreCostBlues: 3,
  genreCostCrossover: 2,
  genreCostBarbershop: 2,
  genreCostScreamo: 2,
  genreCostDisco: 3,
  genreCostPop: 1,
  operaBonus: 2,
  screamoBonus: 3,
  barbershopBonus: 1,
  indieCritFace: 3,
  crossoverMultiplier: 1,
  discoFamePerTame: 10,
  bluesMinFaces: 20,
  gospelMaxFaces: 20,
  bebopMaxFaces: 20,
  bluegrassMinFaces: 8,
  bluegrassMaxFaces: 8,
  barbershopElements: 4,
  retreatLevelsUpAll: 0,
  popMin: 1,
  popPerTurn: 2,
  bluesInspirationCost: 1,
  indieMaxFaces: 20,
  bebopUsesPerTurn: 1,
  indieCascadeBonus: 0,
  indieChainFace: 4,
  discoMinLevel: 3,

  genreCostCountry: 1,
  genreCostBaroque: 1,
  genreCostLoFi: 3,
  genreCostSoul: 2,
  genreCostRap: 2,
  genreCostHouse: 2,
  genreCostOrchestra: 2,
  genreCostMariachi: 2,
  countryBonus: 1,
  baroqueFloor: 3,
  rapExp: 2,
  loFiDiscount: 1,
  soulBonus: 2,
  soulMin: 2,
  soulCost: 1,
  houseBonus: 2,
  houseCap: 0,
  houseShowdownBonus: 1,
  orchestraBonus: 1,
  orchestraMin: 3,
  mariachiBonus: 2,
  genreCostPunk: 2,
  genreCostSoftRock: 2,
  genreCostProgRock: 2,
  genreCostSka: 2,
  genreCostKPop: 2,
  genreCostEmo: 2,
  genreCostTrance: 2,
  genreCostGrunge: 2,
  genreCostDubstep: 2,
  genreCostTripHop: 1,
  punkBonus: 4,
  softRockBonus: 1,
  progRockFrom: 3,
  progRockBonus: 2,
  skaBonus: 1,
  kPopFame3: 15,
  kPopFame4: 25,
  emoBonus: 8,
  operaRaisesFace: 1,
  dubstepBonus: 2,
  tranceBonus: 3,
}

// ============================================================
// Field metadata — drives the debug panel's controls
// ============================================================

export type TunableGroup =
  | 'Progression'
  | 'Turn structure'
  | 'Board'
  | 'Monsters'
  | 'Concerts'
  | 'Economy'
  | 'Shop'
  | 'Showdown'
  | 'Genres'

export interface TunableField {
  /** Scalar key, or `key.index` for one slot of an array tunable. */
  path: string
  label: string
  group: TunableGroup
  min: number
  max: number
  step: number
  help?: string
}

/** Numeric keys of Tunables (everything except the array-valued ones). */
type ScalarKey = Exclude<keyof Tunables, 'monsterFameByLevel' | 'hpMultipliers'>

const SCALAR_FIELDS: { key: ScalarKey; label: string; group: TunableGroup; min: number; max: number; step: number; help?: string }[] = [
  { key: 'fameFinalBossThreshold', label: 'Final Showdown fame gate', group: 'Progression', min: 1, max: 1000, step: 5, help: 'Any single player reaching this grants one final turn, then the boss.' },
  { key: 'monsterExpPerLevel', label: 'EXP per monster level', group: 'Progression', min: 0, max: 20, step: 1 },

  { key: 'maxMovesPerTurn', label: 'Moves per turn', group: 'Turn structure', min: 0, max: 16, step: 1 },
  { key: 'maxFightsPerTurn', label: 'Concerts per turn', group: 'Turn structure', min: 0, max: 10, step: 1 },
  { key: 'roundEndChipsPerElement', label: 'Round-end chips per element', group: 'Turn structure', min: 0, max: 5, step: 1, help: 'At round end every bard is dealt this many chips of each element to place.' },

  { key: 'maxTagsPerElement', label: 'Max chips per element, per space', group: 'Board', min: 1, max: 20, step: 1, help: 'A space holds any number of chips; only same-element chips are capped.' },
  { key: 'startingTagsPerSpace', label: 'Starting chips per space', group: 'Board', min: 0, max: 10, step: 1, help: 'Applied when a new game starts.' },

  { key: 'maxMonsterLevel', label: 'Max monster level', group: 'Monsters', min: 1, max: 10, step: 1 },
  { key: 'monsterBaseHp', label: 'Base Resolve (Lv.1)', group: 'Monsters', min: 1, max: 100, step: 1, help: 'Every monster spawns from this, times its level multiplier.' },
  { key: 'monsterHpScale', label: 'Monster Resolve scale', group: 'Monsters', min: 0.1, max: 10, step: 0.1, help: 'Global multiplier on spawn Resolve. Lower = faster concerts.' },

  { key: 'vulnerabilityMultiplier', label: 'Weakness multiplier', group: 'Concerts', min: 0, max: 10, step: 0.25 },
  { key: 'resistanceMultiplier', label: 'Immunity multiplier', group: 'Concerts', min: 0, max: 10, step: 0.25 },
  { key: 'retreatLevelsUpAll', label: 'Ending early levels up untouched monsters too (1) or only moved ones (0)', group: 'Concerts', min: 0, max: 1, step: 1 },
  { key: 'maxCritCascades', label: 'Max crit cascades', group: 'Concerts', min: 1, max: 50, step: 1 },

  { key: 'startingInspiration', label: 'Starting Inspiration', group: 'Economy', min: 0, max: 20, step: 1 },
  { key: 'newD4Cost', label: 'New d4 cost', group: 'Economy', min: 0, max: 20, step: 1 },
  { key: 'upgradeCostD8', label: 'Upgrade → d8', group: 'Economy', min: 0, max: 20, step: 1 },
  { key: 'upgradeCostD12', label: 'Upgrade → d12', group: 'Economy', min: 0, max: 30, step: 1 },
  { key: 'upgradeCostD20', label: 'Upgrade → d20', group: 'Economy', min: 0, max: 40, step: 1 },
  { key: 'inspirationBaseCost', label: 'Inspiration base cost', group: 'Economy', min: 0, max: 20, step: 1 },
  { key: 'inspirationCostStep', label: 'Inspiration cost step', group: 'Economy', min: 0, max: 20, step: 1, help: 'Added per Inspiration already bought this turn (0 = always the base cost).' },
  { key: 'inspirationSpend', label: 'Inspiration per use', group: 'Economy', min: 0, max: 10, step: 1 },

  { key: 'elementOfferCount', label: 'Element chips on offer', group: 'Shop', min: 1, max: 12, step: 1 },
  { key: 'chipsPerElementPerPlayer', label: 'Bag chips per element/player', group: 'Shop', min: 1, max: 30, step: 1 },

  { key: 'showdownTurns', label: 'Showdown verses', group: 'Showdown', min: 1, max: 10, step: 1 },

  { key: 'maxGenres', label: 'Genres per bard', group: 'Genres', min: 0, max: 12, step: 1 },
  { key: 'genreOfferCount', label: 'Genres on offer', group: 'Genres', min: 0, max: 12, step: 1 },
  { key: 'genreCostGospel', label: 'Gospel cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostNewAge', label: 'New Age cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostIndie', label: 'Indie cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostBebop', label: 'Bebop cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostBluegrass', label: 'Bluegrass cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostOpera', label: 'Opera cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostBlues', label: 'Blues cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostCrossover', label: 'Crossover cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostBarbershop', label: 'Barbershop cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostScreamo', label: 'Screamo cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostDisco', label: 'Disco cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostPop', label: 'Pop cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'operaBonus', label: "Opera: d20 bonus", group: 'Genres', min: 0, max: 20, step: 1 },
  { key: 'screamoBonus', label: 'Screamo: first-roll bonus', group: 'Genres', min: 0, max: 20, step: 1 },
  { key: 'barbershopBonus', label: 'Barbershop: bonus to the song', group: 'Genres', min: 0, max: 10, step: 1 },
  { key: 'indieCritFace', label: 'Indie: d4 crits from', group: 'Genres', min: 1, max: 4, step: 1 },
  { key: 'crossoverMultiplier', label: 'Crossover: immune ×', group: 'Genres', min: 0, max: 2, step: 0.25 },
  { key: 'discoFamePerTame', label: 'Disco: Fame per monster won over', group: 'Genres', min: 0, max: 20, step: 1 },
  { key: 'bluesMinFaces', label: 'Blues: smallest refreshed die (faces)', group: 'Genres', min: 4, max: 20, step: 4 },
  { key: 'gospelMaxFaces', label: 'Gospel: largest refreshed die (faces)', group: 'Genres', min: 4, max: 20, step: 4 },
  { key: 'bebopMaxFaces', label: 'Bebop: largest die (faces)', group: 'Genres', min: 4, max: 20, step: 4 },
  { key: 'bluegrassMinFaces', label: "Bluegrass: smallest die (faces)", group: 'Genres', min: 4, max: 20, step: 4 },
  { key: 'bluegrassMaxFaces', label: "Bluegrass: largest die (faces)", group: 'Genres', min: 4, max: 20, step: 4 },
  { key: 'barbershopElements', label: 'Barbershop: elements needed', group: 'Genres', min: 1, max: 4, step: 1 },
  { key: 'popMin', label: "Pop: Inspiration floor", group: 'Genres', min: 0, max: 5, step: 1 },
  { key: 'popPerTurn', label: "Pop: Inspiration per concert", group: 'Genres', min: 0, max: 3, step: 1 },
  { key: 'bluesInspirationCost', label: 'Blues: Inspiration per use', group: 'Genres', min: 0, max: 3, step: 1 },
  { key: 'indieMaxFaces', label: 'Indie: largest die (faces)', group: 'Genres', min: 4, max: 20, step: 4 },
  { key: 'bebopUsesPerTurn', label: 'Bebop: free encores per turn', group: 'Genres', min: 1, max: 3, step: 1 },
  { key: 'indieCascadeBonus', label: 'Indie: bonus per crit die', group: 'Genres', min: 0, max: 10, step: 1 },
  { key: 'indieChainFace', label: 'Indie: bonus dice chain from', group: 'Genres', min: 2, max: 20, step: 1 },
  { key: 'discoMinLevel', label: 'Disco: lowest paying level', group: 'Genres', min: 1, max: 5, step: 1 },
  { key: 'genreCostCountry', label: 'Country cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostBaroque', label: 'Baroque cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostLoFi', label: 'Lo-fi cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostSoul', label: 'Soul cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostRap', label: 'Rap cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostHouse', label: 'House cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostOrchestra', label: 'Orchestra cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostMariachi', label: 'Mariachi cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'countryBonus', label: 'Country: starting-element bonus', group: 'Genres', min: 0, max: 10, step: 1 },
  { key: 'baroqueFloor', label: 'Baroque: minimum rolled value', group: 'Genres', min: 1, max: 12, step: 1 },
  { key: 'rapExp', label: 'Rap: EXP per turn', group: 'Genres', min: 0, max: 5, step: 1 },
  { key: 'loFiDiscount', label: 'Lo-fi: EXP off upgrades', group: 'Genres', min: 0, max: 5, step: 1 },
  { key: 'soulBonus', label: 'Soul: bonus to the song', group: 'Genres', min: 0, max: 10, step: 1 },
  { key: 'soulMin', label: 'Soul: Inspiration needed', group: 'Genres', min: 1, max: 10, step: 1 },
  { key: 'soulCost', label: 'Soul: Inspiration spent', group: 'Genres', min: 0, max: 5, step: 1 },
  { key: 'houseBonus', label: 'House: bonus per link', group: 'Genres', min: 0, max: 10, step: 1 },
  { key: 'houseCap', label: 'House: bonus cap (0 = none)', group: 'Genres', min: 0, max: 20, step: 1 },
  { key: 'houseShowdownBonus', label: 'House: bonus per link in the showdown', group: 'Genres', min: 0, max: 10, step: 1 },
  { key: 'orchestraBonus', label: 'Orchestra: bonus to the song', group: 'Genres', min: 0, max: 10, step: 1 },
  { key: 'orchestraMin', label: 'Orchestra: monsters needed', group: 'Genres', min: 2, max: 6, step: 1 },
  { key: 'mariachiBonus', label: 'Mariachi: bonus to the song', group: 'Genres', min: 0, max: 10, step: 1 },
  { key: 'genreCostPunk', label: 'Punk cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostSoftRock', label: 'Soft Rock cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostProgRock', label: 'Prog Rock cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostSka', label: 'Ska cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostKPop', label: 'K-Pop cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostEmo', label: 'Emo cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostTrance', label: 'Trance cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostGrunge', label: 'Grunge cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostDubstep', label: 'Dubstep cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'genreCostTripHop', label: 'Trip-Hop cost', group: 'Genres', min: 0, max: 30, step: 1 },
  { key: 'punkBonus', label: 'Punk: bonus on a crit', group: 'Genres', min: 0, max: 20, step: 1 },
  { key: 'softRockBonus', label: 'Soft Rock: d8/d12 face bonus', group: 'Genres', min: 0, max: 5, step: 1 },
  { key: 'progRockFrom', label: 'Prog Rock: from song number', group: 'Genres', min: 2, max: 7, step: 1 },
  { key: 'progRockBonus', label: 'Prog Rock: bonus to the song', group: 'Genres', min: 0, max: 10, step: 1 },
  { key: 'skaBonus', label: 'Ska: bonus on odd faces', group: 'Genres', min: 0, max: 10, step: 1 },
  { key: 'kPopFame3', label: 'K-Pop: Fame for 3 monsters in a concert', group: 'Genres', min: 0, max: 50, step: 1 },
  { key: 'kPopFame4', label: 'K-Pop: Fame for 4+ monsters in a concert', group: 'Genres', min: 0, max: 50, step: 1 },
  { key: 'emoBonus', label: 'Emo: bonus on your declared final song', group: 'Genres', min: 0, max: 20, step: 1 },
  { key: 'operaRaisesFace', label: 'Opera: raises the rolled value (1) or flat bonus (0)', group: 'Genres', min: 0, max: 1, step: 1 },
  { key: 'dubstepBonus', label: 'Dubstep: bonus after moving a monster', group: 'Genres', min: 0, max: 10, step: 1 },
  { key: 'tranceBonus', label: 'Trance: bonus at 0 Inspiration', group: 'Genres', min: 0, max: 10, step: 1 },
]

const LEVEL_COUNT = 5

export const TUNABLE_FIELDS: TunableField[] = [
  ...SCALAR_FIELDS.filter((f) => f.group === 'Progression').map(toField),
  ...Array.from({ length: LEVEL_COUNT }, (_, i) => ({
    path: `monsterFameByLevel.${i}`,
    label: `Fame — Lv.${i + 1} monster`,
    group: 'Progression' as const,
    min: 0,
    max: 500,
    step: 1,
  })),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Turn structure').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Board').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Monsters').map(toField),
  ...Array.from({ length: LEVEL_COUNT }, (_, i) => ({
    path: `hpMultipliers.${i}`,
    label: `Resolve × — Lv.${i + 1}`,
    group: 'Monsters' as const,
    min: 0.1,
    max: 25,
    step: 0.25,
  })),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Concerts').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Economy').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Shop').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Showdown').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Genres').map(toField),
]

function toField(f: (typeof SCALAR_FIELDS)[number]): TunableField {
  return { path: f.key, label: f.label, group: f.group, min: f.min, max: f.max, step: f.step, help: f.help }
}

export const TUNABLE_GROUPS: TunableGroup[] = [
  'Progression',
  'Turn structure',
  'Board',
  'Monsters',
  'Concerts',
  'Economy',
  'Shop',
  'Showdown',
  'Genres',
]

// ============================================================
// Read / write a tunable by its field path
// ============================================================

export function readTunable(tunables: Tunables, path: string): number {
  const [key, index] = path.split('.')
  const value = (tunables as unknown as Record<string, number | number[]>)[key]
  if (Array.isArray(value)) return value[Number(index)] ?? 0
  return typeof value === 'number' ? value : 0
}

/** Immutably set one field path, clamped to its declared range. */
export function writeTunable(tunables: Tunables, path: string, raw: number): Tunables {
  const field = TUNABLE_FIELDS.find((f) => f.path === path)
  if (!field || !Number.isFinite(raw)) return tunables
  const value = Math.min(Math.max(raw, field.min), field.max)

  const [key, index] = path.split('.')
  const current = (tunables as unknown as Record<string, number | number[]>)[key]
  if (Array.isArray(current)) {
    const next = [...current]
    next[Number(index)] = value
    return { ...tunables, [key]: next }
  }
  return { ...tunables, [key]: value }
}

/**
 * Fill missing keys from defaults and clamp everything into range, so a stale
 * save or a hand-edited preset can never put the engine into a broken state.
 */
export function normalizeTunables(partial: Partial<Tunables> | null | undefined): Tunables {
  const source = (partial ?? {}) as Record<string, unknown>

  // Copy only keys the current schema knows about, so a value retired in a
  // later version (say the old `upgradeCostD6`) is dropped rather than carried
  // around forever inside every save and preset.
  const merged = { ...DEFAULT_TUNABLES } as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_TUNABLES)) {
    if (typeof source[key] === 'number') merged[key] = source[key]
  }
  merged.monsterFameByLevel = fillArray(partial?.monsterFameByLevel, DEFAULT_TUNABLES.monsterFameByLevel)
  merged.hpMultipliers = fillArray(partial?.hpMultipliers, DEFAULT_TUNABLES.hpMultipliers)

  return TUNABLE_FIELDS.reduce(
    (acc, field) => writeTunable(acc, field.path, readTunable(acc, field.path)),
    merged as unknown as Tunables
  )
}

function fillArray(value: number[] | undefined, fallback: number[]): number[] {
  if (!Array.isArray(value)) return [...fallback]
  return fallback.map((def, i) => (typeof value[i] === 'number' && Number.isFinite(value[i]) ? value[i] : def))
}

/** Field paths whose value differs from the shipped default. */
export function changedTunablePaths(tunables: Tunables): string[] {
  return TUNABLE_FIELDS.filter((f) => readTunable(tunables, f.path) !== readTunable(DEFAULT_TUNABLES, f.path)).map(
    (f) => f.path
  )
}

// ============================================================
// Active set
// ============================================================

let active: Tunables = DEFAULT_TUNABLES

/** The tunables the engine and game-logic read right now. */
export function getTunables(): Tunables {
  return active
}

/**
 * Point the engine at a tunable set. `applyAction` calls this via
 * `withTunables` for the duration of one reduce; the store also calls it when
 * mirroring authoritative state so UI reads (costs, caps) match the engine.
 */
export function setActiveTunables(tunables: Partial<Tunables> | null | undefined): void {
  active = normalizeTunables(tunables)
}

/** Run `fn` with `tunables` active, restoring the previous set afterwards. */
export function withTunables<T>(tunables: Partial<Tunables> | null | undefined, fn: () => T): T {
  const previous = active
  active = normalizeTunables(tunables)
  try {
    return fn()
  } finally {
    active = previous
  }
}
