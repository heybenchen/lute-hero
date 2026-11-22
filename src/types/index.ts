// ============================================
// CORE GAME TYPES
// ============================================

export type Genre = "Ballad" | "Folk" | "Hymn" | "Shanty";

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
  genre: Genre;
}

export interface DiceRoll {
  diceId: string;
  value: number;
  isCrit: boolean; // True if the roll crit (max face, or a style's crit rule)
  critBonus: number; // Sum of cascade roll values
  cascadeRolls: number[]; // Each additional die value from cascading crits
  /** Flat damage added by styles (Fortissimo, Overture, Tutti). Absent = 0. */
  bonus?: number;
}

/** Purchasable play styles; each affects every song its bard performs. */
export type StyleId =
  | "staccato"
  | "coda"
  | "ostinato"
  | "rubato"
  | "virtuoso"
  | "fortissimo"
  | "fermata"
  | "counterpoint"
  | "tutti"
  | "overture"
  | "bravo"
  | "ispirato";

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
  vulnerability: Genre | null; // Single weakness - 2x damage
  resistance: Genre | null; // Single resistance - 0x damage (immune)
  description: string;
  isBoss?: boolean;
}

export interface Monster {
  id: string;
  templateId: string;
  name: string;
  currentHP: number;
  maxHP: number;
  vulnerability: Genre | null;
  resistance: Genre | null;
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
  genreTags: Genre[]; // Accumulates each round, each unique genre = 1 monster
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
  starterGenre: Genre; // Element the player started with (drives their themed color)
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
  styles: StyleId[]; // Owned play styles (capped by tunables.maxStyles)
  /** Data-defined styles under test (style lab only; see game-logic/styles/specs.ts). */
  specStyles?: string[];
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
  genreMultipliers: { genre: Genre; multiplier: number }[];
  critBonuses: number;
  totalDamage: number;
  // Per-die contribution against this monster, for the damage-report breakdown
  perDie: DieContribution[];
  /** Counterpoint turned an immune hit into a partial one. */
  softenedImmunity?: boolean;
}

export interface DieContribution {
  genre: Genre | null; // null for extra dice with no slotted genre
  value: number; // rolled face value
  critBonus: number; // extra damage from cascading crits (sum of cascadeRolls)
  cascadeRolls: number[]; // each cascading-crit roll, shown separately in the report
  multiplier: number; // genre multiplier applied to this die
  bonus?: number; // flat style bonus added before the multiplier
  damage: number; // (value + bonus + critBonus) × multiplier — this die's contribution
}
