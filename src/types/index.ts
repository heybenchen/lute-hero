// ============================================
// CORE GAME TYPES
// ============================================

export type Genre = "Ballad" | "Folk" | "Hymn" | "Shanty";

export type DiceType = "d4" | "d6" | "d8" | "d12";

export type GamePhase = "setup" | "main" | "underground" | "finalBoss" | "gameOver";

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
  critBonus: number; // Equals roll value if crit (double damage)
}

// Track effects that modify dice behavior
export type TrackEffect =
  | { type: "freeReroll"; used: boolean }
  | { type: "upgrade"; used: boolean } // d4 -> d6 -> d12 -> d20
  | { type: "flip" } // Only flips if it nets a higher value
  | { type: "addFlat"; amount: number }
  | { type: "addDice"; diceType: DiceType; used: boolean }
  | { type: "rollTwiceKeepHigher" }
  | { type: "explosive" } // Max roll triggers another roll
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
  effects: TrackEffect[]; // Song effects (typically 2), separate from dice slots
  used: boolean; // Can only use each song once per combat
}

export interface InspirationDie {
  dice: Dice;
  cost: number; // Purchase cost based on die type
}

// ============================================
// MONSTERS
// ============================================

export interface MonsterTemplate {
  id: string;
  name: string;
  baseHP: number;
  vulnerability: Genre | null; // Single weakness - 2x damage
  resistance: Genre | null; // Single resistance - 0.5x damage
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

// ============================================
// COMBAT STATE
// ============================================

export interface CombatState {
  isActive: boolean;
  playerId: string | null;
  spaceId: number | null;
  monsters: Monster[];
  songsUsed: string[]; // Song IDs already played
  currentSongId: string | null;
  damageDealt: number;
  totalDamage: number;
  rolls: DiceRoll[];
  lastDamageCalculations: DamageCalculation[]; // Damage breakdown per monster
}

// ============================================
// GAME STATE
// ============================================

export interface GameState {
  phase: GamePhase;
  currentRound: number;
  currentTurnPlayerId: string | null;
  turnOrder: string[]; // Player IDs
  players: Player[];
  board: BoardSpace[];
  combat: CombatState;

  // Phase-specific state
  undergroundSceneProgress: {
    [playerId: string]: boolean; // Has completed underground scene
  };

  finalBoss: Monster | null;

  // Fame thresholds for progression
  fameThresholds: {
    undergroundScene: number;
    finalBoss: number;
  };
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
}
