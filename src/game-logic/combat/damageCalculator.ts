import { Song, Monster, Dice, DiceRoll, Element, DamageCalculation, DieContribution, Rng } from '../../types/index.js';
import { rollDiceWithCrit } from "../dice/roller.js";
import { getTunables } from "../../data/tunables.js";

/**
 * Calculate damage multiplier for a genre against a monster
 */
export function getElementMultiplier(element: Element, monster: Monster): number {
  const { vulnerabilityMultiplier, resistanceMultiplier } = getTunables();

  if (monster.vulnerability === element) {
    return vulnerabilityMultiplier; // Vulnerable: 2x damage by default
  }

  if (monster.resistance === element) {
    return resistanceMultiplier; // Immune: 0x damage by default
  }

  return 1.0; // Neutral
}

/**
 * Roll every die slotted into a song.
 */
export function rollSong(song: Song, rng: Rng = Math.random): DiceRoll[] {
  const rolls: DiceRoll[] = [];
  for (const slot of song.slots) {
    if (!slot.dice) continue;
    rolls.push(rollDiceWithCrit(slot.dice, rng));
  }
  return rolls;
}

/**
 * Calculate total damage dealt to a monster from a song
 */
export function calculateDamage(
  song: Song,
  rolls: DiceRoll[],
  monster: Monster,
  opts: DamageOptions = {},
): DamageCalculation {
  // 1. Calculate base damage (sum of all roll values)
  const baseDamage = rolls.reduce((sum, roll) => sum + roll.value, 0);

  // 2. Calculate crit bonuses
  const critBonuses = rolls.reduce((sum, roll) => sum + roll.critBonus, 0);

  // 3. Calculate element multipliers for each die
  const elementMultipliers: { element: Element; multiplier: number }[] = [];
  const perDie: DieContribution[] = [];
  let elementAdjustedDamage = 0;
  let softenedImmunity = false;

  rolls.forEach((roll) => {
    // Find the slot that created this roll
    const sourceDiceId = roll.sourceDiceId ?? roll.diceId;
    const slotIdx = song.slots.findIndex((s) => s.dice?.id === sourceDiceId);
    const slot = slotIdx >= 0 ? song.slots[slotIdx] : undefined;
    const dice = slot?.dice
      ? {
          ...slot.dice,
          ...(roll.rolledType ? { type: roll.rolledType } : {}),
          ...(roll.element ? { element: roll.element } : {}),
        }
      : undefined;

    const bonus = roll.bonus ?? 0;
    if (dice) {
      let multiplier = getElementMultiplier(dice.element, monster);
      if (opts.multiplierFor) multiplier = opts.multiplierFor(dice, monster, multiplier);
      // Crossover: an immune hit lands at a reduced multiplier instead
      if (opts.immuneMultiplier !== undefined && monster.resistance === dice.element && multiplier < opts.immuneMultiplier) {
        multiplier = opts.immuneMultiplier;
        softenedImmunity = true;
      }
      elementMultipliers.push({ element: dice.element, multiplier });

      const damage = (roll.value + bonus + roll.critBonus) * multiplier;
      elementAdjustedDamage += damage;
      perDie.push({ element: dice.element, value: roll.value, critBonus: roll.critBonus, cascadeRolls: roll.cascadeRolls, multiplier, damage, ...(bonus ? { bonus } : {}) });
    } else {
      // Extra dice with no slotted element — no element multiplier lookup
      const damage = roll.value + bonus + roll.critBonus;
      elementAdjustedDamage += damage;
      perDie.push({ element: null, value: roll.value, critBonus: roll.critBonus, cascadeRolls: roll.cascadeRolls, multiplier: 1, damage, ...(bonus ? { bonus } : {}) });
    }
  });

  const totalDamage = Math.floor(elementAdjustedDamage);

  return {
    baseDamage,
    elementMultipliers,
    critBonuses,
    totalDamage,
    perDie,
    ...(softenedImmunity ? { softenedImmunity } : {}),
  };
}

/** Per-play damage adjustments from genres. */
export interface DamageOptions {
  /** Crossover: multiplier to use instead of immunity's (if higher). */
  immuneMultiplier?: number;
  /** Data-defined genres: adjust a die's element multiplier against a monster. */
  multiplierFor?: (dice: Dice, monster: Monster, base: number) => number;
}

/**
 * Apply damage to a monster and return updated monster
 */
export function applyDamageToMonster(monster: Monster, damage: number): Monster {
  const newHP = Math.max(0, monster.currentHP - damage);

  return {
    ...monster,
    currentHP: newHP,
  };
}

/**
 * Check if monster is defeated
 */
export function isMonsterDefeated(monster: Monster): boolean {
  return monster.currentHP <= 0;
}

/** A calculation with no damage, used for monsters a single-target song misses. */
function zeroDamageCalculation(): DamageCalculation {
  return {
    baseDamage: 0,
    elementMultipliers: [],
    critBonuses: 0,
    totalDamage: 0,
    perDie: [],
  };
}

/**
 * Calculate damage against a single chosen monster. Songs are no longer AOE:
 * only the targeted monster takes damage. The returned arrays stay aligned to
 * the full monster roster (untargeted monsters get a zero calculation and are
 * left unchanged) so the combat UI can keep indexing by monster position.
 */
export function calculateSingleTargetDamage(
  song: Song,
  rolls: DiceRoll[],
  monsters: Monster[],
  targetMonsterId: string,
  opts: DamageOptions = {},
): {
  damageCalculations: DamageCalculation[];
  updatedMonsters: Monster[];
} {
  const damageCalculations: DamageCalculation[] = [];
  const updatedMonsters: Monster[] = [];

  monsters.forEach((monster) => {
    if (monster.id === targetMonsterId) {
      const damageCalc = calculateDamage(song, rolls, monster, opts);
      damageCalculations.push(damageCalc);
      updatedMonsters.push(applyDamageToMonster(monster, damageCalc.totalDamage));
    } else {
      damageCalculations.push(zeroDamageCalculation());
      updatedMonsters.push(monster);
    }
  });

  return {
    damageCalculations,
    updatedMonsters,
  };
}

/**
 * Could any of these songs still hurt a living monster? A die counts when its
 * element isn't immune for at least one living monster — or, with an immune
 * hit softened (Dissonance's `immuneMultiplier`), whenever it holds a die.
 * Used to decide whether retreating gives up real damage.
 */
export function songsCanStillDamage(
  songs: Song[],
  monsters: Monster[],
  opts: DamageOptions = {},
): boolean {
  const alive = monsters.filter((m) => m.currentHP > 0);
  if (alive.length === 0) return false;
  const softened = (opts.immuneMultiplier ?? 0) > 0;
  return songs.some((song) =>
    song.slots.some((slot) => {
      if (!slot.dice) return false;
      if (softened) return true;
      const element = slot.dice.element;
      return alive.some((m) => getElementMultiplier(element, m) > 0);
    }),
  );
}

/**
 * Would every die in this song do zero damage to this monster because of its
 * immunity (Dissonance's `immuneMultiplier` softening a hit counts as damage)?
 * Shared by fights and the Final Showdown, where the boss has no HP to speak of,
 * so unlike `songsCanStillDamage` this looks only at elements.
 */
export function songIsImmune(song: Song, monster: Monster, opts: DamageOptions = {}): boolean {
  const dice = song.slots.flatMap((slot) => (slot.dice ? [slot.dice] : []));
  if (dice.length === 0) return false;
  if ((opts.immuneMultiplier ?? 0) > 0) return false;
  return dice.every((die) => getElementMultiplier(die.element, monster) === 0);
}
