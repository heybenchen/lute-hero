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

export type DiceType = "d4" | "d6" | "d12" | "d20";

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
  isCrit: boolean; // True if rolled max value
  critBonus: number; // Sum of cascade roll values
  cascadeRolls: number[]; // Each additional die value from cascading crits
}

// Track effects that modify dice behavior
export type TrackEffect =
  | { type: "freeReroll"; used: boolean }
  | { type: "upgrade"; used: boolean } // d4 -> d6 -> d12 -> d20
  | { type: "flip" } // Only flips if it nets a higher value
  | { type: "addFlat"; amount: number }
  | { type: "addDice"; diceType: DiceType; used: boolean }
  | { type: "rollTwiceKeepHigher" }
  | { type: "harmonize"; bonusDamage: number } // Bonus if 2+ dice roll same value
  | { type: "offbeat" } // Odd rolls 2x damage, even rolls 0.5x damage
  | { type: "wildDice"; used: boolean } // Once per song: add one extra d4 roll
  | { type: "tempo" } // Add the lowest die's result as bonus damage
  | { type: "dynamicRange" } // |die1 - die2| >= 6: +4 damage
  | { type: "dropTheBass" } // Both primary dice roll 1: +9 damage
  | { type: "lucky7" } // Any die shows 7: +3 damage
  | { type: "powerChord" } // Each 3 rolled deals double (6) damage
  | { type: "crescendo" } // Total roll >= 15: +5 damage
  | { type: "monoOut" }; // Roll once, apply to both slots (both must be filled)

export interface SongSlot {
  dice: Dice | null;
}

export interface Song {
  id: string;
  name: string;
  slots: [SongSlot, SongSlot]; // 2 dice slots
  effect: TrackEffect | null; // A song has at most one effect (granted by its name)
  used: boolean; // Can only use each song once per combat
}

// ============================================
// MONSTERS
// ============================================

export interface MonsterTemplate {
  id: string;
  name: string;
  baseHP: number;
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
  inspiration: number; // Inspiration tokens held (spend to reroll, travel, or refresh shop)
  inspirationBoughtThisTurn: number; // Escalates the buy cost; resets each turn
}

// ============================================
// DRAFTING / SHOP
// ============================================

export interface DraftCard {
  id: string;
  type: "name";
  cost: number;
  songName?: string;
  songEffect?: TrackEffect;
}

// A purchased-but-unresolved reward, queued so buying more never discards it.
export type PendingReward =
  | { kind: "die"; id: string; dice: Dice }
  | { kind: "name"; id: string; name: string; effect: TrackEffect | null };

// ============================================
// COMBAT STATE
// ============================================

export interface SongUsage {
  songId: string;
  ownerId: string; // Player who owns the song
  isCover: boolean; // True if played by someone other than the owner
}

export interface KillCredit {
  monsterId: string;
  songOwnerId: string; // Who owned the song that killed this monster
  isCover: boolean;
}

// ============================================
// HELPER TYPES
// ============================================

export interface DamageCalculation {
  baseDamage: number;
  genreMultipliers: { genre: Genre; multiplier: number }[];
  effectBonuses: number;
  critBonuses: number;
  totalDamage: number;
  // Per-die contribution against this monster, for the damage-report breakdown
  perDie: DieContribution[];
}

export interface DieContribution {
  genre: Genre | null; // null for extra dice (e.g. wildDice) with no slotted genre
  value: number; // rolled face value
  critBonus: number; // extra damage from cascading crits (sum of cascadeRolls)
  cascadeRolls: number[]; // each cascading-crit roll, shown separately in the report
  multiplier: number; // genre × offbeat multiplier applied to this die
  damage: number; // (value + critBonus) × multiplier — this die's contribution
}
