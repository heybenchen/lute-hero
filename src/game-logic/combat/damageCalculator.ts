import { Song, Monster, DiceRoll, Genre, DamageCalculation, DieContribution, Rng } from '../../types/index.js';
import { rollDiceWithCrit } from "../dice/roller.js";

/**
 * Calculate damage multiplier for a genre against a monster
 */
export function getGenreMultiplier(genre: Genre, monster: Monster): number {
  if (monster.vulnerability === genre) {
    return 2.0; // Vulnerable: 2x damage
  }

  if (monster.resistance === genre) {
    return 0; // Resistant: 0x damage (immune)
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
): DamageCalculation {
  // 1. Calculate base damage (sum of all roll values)
  const baseDamage = rolls.reduce((sum, roll) => sum + roll.value, 0);

  // 2. Calculate crit bonuses
  const critBonuses = rolls.reduce((sum, roll) => sum + roll.critBonus, 0);

  // 3. Calculate genre multipliers for each die
  const genreMultipliers: { genre: Genre; multiplier: number }[] = [];
  const perDie: DieContribution[] = [];
  let genreAdjustedDamage = 0;

  rolls.forEach((roll) => {
    // Find the slot that created this roll
    const slotIdx = song.slots.findIndex((s) => s.dice?.id === roll.diceId);
    const slot = slotIdx >= 0 ? song.slots[slotIdx] : undefined;
    const dice = slot?.dice;

    if (dice) {
      const multiplier = getGenreMultiplier(dice.genre, monster);
      genreMultipliers.push({ genre: dice.genre, multiplier });

      const damage = (roll.value + roll.critBonus) * multiplier;
      genreAdjustedDamage += damage;
      perDie.push({ genre: dice.genre, value: roll.value, critBonus: roll.critBonus, cascadeRolls: roll.cascadeRolls, multiplier, damage });
    } else {
      // Extra dice with no slotted genre — no genre multiplier lookup
      const damage = roll.value + roll.critBonus;
      genreAdjustedDamage += damage;
      perDie.push({ genre: null, value: roll.value, critBonus: roll.critBonus, cascadeRolls: roll.cascadeRolls, multiplier: 1, damage });
    }
  });

  const totalDamage = Math.floor(genreAdjustedDamage);

  return {
    baseDamage,
    genreMultipliers,
    critBonuses,
    totalDamage,
    perDie,
  };
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

/**
 * Calculate damage against multiple monsters (AOE)
 */
export function calculateAOEDamage(
  song: Song,
  rolls: DiceRoll[],
  monsters: Monster[],
): {
  damageCalculations: DamageCalculation[];
  updatedMonsters: Monster[];
} {
  const damageCalculations: DamageCalculation[] = [];
  const updatedMonsters: Monster[] = [];

  monsters.forEach((monster) => {
    const damageCalc = calculateDamage(song, rolls, monster);
    damageCalculations.push(damageCalc);

    const updatedMonster = applyDamageToMonster(monster, damageCalc.totalDamage);
    updatedMonsters.push(updatedMonster);
  });

  return {
    damageCalculations,
    updatedMonsters,
  };
}
