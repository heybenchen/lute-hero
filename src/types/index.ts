// ============================================
// CORE GAME TYPES
// ============================================

export type Element = "Ballad" | "Folk" | "Hymn" | "Shanty";

/**
 * Random number source, drop-in for Math.random (returns [0, 1)).
 * All game logic takes an Rng so the server can seed rolls deterministically;
 * defaults to Math.random for local/hotseat use.
 */
export type Rng = () => number;

/** Deterministic id factory (server: seq-based; hotseat: counter-based). */
export type NewId = (prefix: string) => string;

export type DiceType = "d4" | "d8" | "d12" | "d20";

export type GamePhase = "setup" | "main" | "finalBoss" | "gameOver";

// ============================================
// DICE & COMBAT
// ============================================

export interface Dice {
  id: string;
  type: DiceType;
  element: Element;
}

export interface DiceRoll {
  diceId: string;
  /** Original slotted die when a genre substitutes another die for it. */
  sourceDiceId?: string;
  /** Physical die type rolled when it differs from the slotted die. */
  rolledType?: DiceType;
  /** Element carried by a substituted die. */
  element?: Element;
  value: number;
  isCrit: boolean; // True if the roll crit (max face, or a genre's crit rule)
  critBonus: number; // Sum of cascade roll values
  cascadeRolls: number[]; // Each additional die value from cascading crits
  /** Flat damage added by genres (Opera, Screamo, Barbershop). Absent = 0. */
  bonus?: number;
}

/** Purchasable genres; each affects every song its bard performs. */
export type GenreId =
  | "gospel"
  | "new-age"
  | "indie"
  | "bebop"
  | "bluegrass"
  | "opera"
  | "blues"
  | "crossover"
  | "barbershop"
  | "screamo"
  | "disco"
  | "pop"
  // Studio genres promoted from the genre lab (effects are data-defined specs)
  | "country"
  | "lo-fi"
  | "soul"
  | "baroque"
  | "rap"
  | "house"
  | "orchestra"
  | "mariachi"
  // Genres added with the rename (also data-defined specs)
  | "punk"
  | "soft-rock"
  | "prog-rock"
  | "ska"
  | "k-pop"
  | "emo"
  | "trance"
  | "grunge"
  | "dubstep"
  | "trip-hop";

export interface SongSlot {
  dice: Dice | null;
}

export interface Song {
  id: string;
  slots: [SongSlot]; // 1 die per song (6 songs per bard)
  used: boolean; // Can only use each song once per combat
}

// ============================================
// MONSTERS
// ============================================

export interface MonsterTemplate {
  id: string;
  name: string;
  // Difficulty rank used to pace which template shows up as rounds progress.
  // It does NOT affect HP — every monster spawns from the monsterBaseHp
  // tunable. Omitted for the final boss, which is never spawned this way.
  tier?: number;
  vulnerability: Element | null; // Single weakness - 2x damage
  resistance: Element | null; // Single resistance - 0x damage (immune)
  description: string;
  isBoss?: boolean;
}

export interface Monster {
  id: string;
  templateId: string;
  name: string;
  currentHP: number;
  maxHP: number;
  vulnerability: Element | null;
  resistance: Element | null;
  isBoss: boolean;
  level: number; // Monster level (higher = more HP)
}

// ============================================
// BOARD & SPACES
// ============================================

export interface SpaceConnection {
  targetSpaceId: number;
}

export interface BoardSpace {
  id: number;
  name: string;
  connections: number[]; // IDs of connected spaces
  elementTags: Element[]; // Accumulates each round, each unique genre = 1 monster
  monsters: Monster[];
  isEdge: boolean; // Players start on edge spaces
}

// ============================================
// PLAYER
// ============================================

export interface Player {
  id: string;
  name: string;
  color: string;
  starterElement: Element; // Element the player started with (drives their themed color)
  position: number; // Current space ID
  songs: Song[];
  exp: number;
  fame: number;
  monstersDefeated: number;
  isEliminated: boolean; // For final boss phase
  totalBossDamage: number; // For final boss ranking
  movesThisTurn: number; // Track moves for 2-move limit
  fightsThisTurn: number; // Track fights for 1-fight limit
  hasShoppedThisTurn: boolean; // Track if player has shopped this turn
  inspiration: number; // Inspiration tokens held (spend to reroll or refresh the shop)
  inspirationBoughtThisTurn: number; // Escalates the buy cost; resets each turn
  genres: GenreId[]; // Owned genres (capped by tunables.maxGenres)
  /** Data-defined genres under test (genre lab only; see game-logic/genres/specs.ts). */
  specGenres?: string[];
}

// ============================================
// DRAFTING / SHOP
// ============================================

// A purchased-but-unresolved reward, queued so buying more never discards it.
export type PendingReward = { kind: "die"; id: string; dice: Dice };

// ============================================
// COMBAT STATE
// ============================================

export interface SongUsage {
  songId: string;
}

export interface KillCredit {
  monsterId: string;
  /** Tamed by a featured song: this bard splits the monster's Fame and EXP. */
  featuredPlayerId?: string;
}

// ============================================
// HELPER TYPES
// ============================================

export interface DamageCalculation {
  baseDamage: number;
  elementMultipliers: { element: Element; multiplier: number }[];
  critBonuses: number;
  totalDamage: number;
  // Per-die contribution against this monster, for the damage-report breakdown
  perDie: DieContribution[];
  /** Crossover turned an immune hit into a partial one. */
  softenedImmunity?: boolean;
}

export interface DieContribution {
  element: Element | null; // null for extra dice with no slotted element
  value: number; // rolled face value
  critBonus: number; // extra damage from cascading crits (sum of cascadeRolls)
  cascadeRolls: number[]; // each cascading-crit roll, shown separately in the report
  multiplier: number; // element multiplier applied to this die
  bonus?: number; // flat genre bonus added before the multiplier
  damage: number; // (value + bonus + critBonus) × multiplier — this die's contribution
}
