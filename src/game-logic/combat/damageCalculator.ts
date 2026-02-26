import { Song, Monster, DiceRoll, Genre, DamageCalculation, TrackEffect } from "@/types";
import { rollDiceWithCrit } from "../dice/roller";
import {
  applyTrackEffect,
  calculateEffectBonuses,
  calculateHarmonizeBonus,
  calculateOffbeatMultiplier,
  calculateCrescendoBonus,
  calculateTempoBonus,
  calculateDynamicRangeBonus,
  calculateDropTheBassBonus,
  calculateLucky7Bonus,
} from "../dice/effects";

/**
 * Calculate damage multiplier for a genre against a monster
 */
export function getGenreMultiplier(genre: Genre, monster: Monster): number {
  if (monster.vulnerability === genre) {
    return 2.0; // Vulnerable: 2x damage
  }

  if (monster.resistance === genre) {
    return 0.5; // Resistant: 0.5x damage
  }

  return 1.0; // Neutral
}

/**
 * Roll all dice in a song and apply track effects.
 * A single effect (song.effects[0]) applies to every dice slot.
 * Special case: monoOut rolls once and shares that value across both slots.
 */
export function rollSong(song: Song): {
  rolls: DiceRoll[];
  updatedSong: Song;
} {
  // monoOut: roll one die for both slots (both must be filled)
  if (song.effects[0]?.type === "monoOut") {
    const slot0 = song.slots[0];
    const slot1 = song.slots[1];
    if (slot0.dice && slot1.dice) {
      const singleRoll = rollDiceWithCrit(slot0.dice);
      return {
        rolls: [
          { ...singleRoll, diceId: slot0.dice.id },
          { ...singleRoll, diceId: slot1.dice.id },
        ],
        updatedSong: song,
      };
    }
  }

  const allRolls: DiceRoll[] = [];
  const updatedEffects = [...song.effects];

  for (let idx = 0; idx < song.slots.length; idx++) {
    const slot = song.slots[idx];
    if (!slot.dice) continue;

    const baseRoll = rollDiceWithCrit(slot.dice);

    // Single effect shared across all slots; read the latest (may have used-flag updated)
    const effect = updatedEffects[0] ?? null;
    const { modifiedRoll, updatedEffect, additionalRolls } = applyTrackEffect(
      baseRoll,
      slot.dice,
      effect,
    );

    allRolls.push(modifiedRoll);
    allRolls.push(...additionalRolls);

    if (updatedEffect !== null && updatedEffects.length > 0) {
      updatedEffects[0] = updatedEffect;
    }
  }

  return {
    rolls: allRolls,
    updatedSong: {
      ...song,
      slots: song.slots,
      effects: updatedEffects.filter((e): e is TrackEffect => e !== null),
    },
  };
}

/**
 * Calculate total damage dealt to a monster from a song
 */
export function calculateDamage(
  song: Song,
  rolls: DiceRoll[],
  monster: Monster,
): DamageCalculation {
  // Primary rolls: only those tied to an actual slot die (not extras from wildDice etc.)
  const slotDiceIds = new Set(song.slots.map((s) => s.dice?.id).filter(Boolean));
  const primaryRolls = rolls.filter((r) => slotDiceIds.has(r.diceId));

  // 1. Calculate base damage (sum of all roll values)
  const baseDamage = rolls.reduce((sum, roll) => sum + roll.value, 0);

  // 2. Calculate crit bonuses
  const critBonuses = rolls.reduce((sum, roll) => sum + roll.critBonus, 0);

  // 3. Calculate effect bonuses (flat + song-level effects)
  const effectBonuses =
    calculateEffectBonuses(song.effects) +
    calculateHarmonizeBonus(song.effects, rolls) +
    calculateTempoBonus(song.effects, primaryRolls) +
    calculateCrescendoBonus(song.effects, rolls) +
    calculateDynamicRangeBonus(song.effects, primaryRolls) +
    calculateDropTheBassBonus(song.effects, primaryRolls) +
    calculateLucky7Bonus(song.effects, rolls);

  // 4. Calculate genre multipliers for each die
  const genreMultipliers: { genre: Genre; multiplier: number }[] = [];
  let genreAdjustedDamage = 0;

  rolls.forEach((roll) => {
    // Find the slot that created this roll
    const slotIdx = song.slots.findIndex((s) => s.dice?.id === roll.diceId);
    const slot = slotIdx >= 0 ? song.slots[slotIdx] : undefined;
    const dice = slot?.dice;

    if (dice) {
      const genreMultiplier = getGenreMultiplier(dice.genre, monster);
      genreMultipliers.push({ genre: dice.genre, multiplier: genreMultiplier });

      // Use shared song effect for offbeat multiplier
      const sharedEffect = song.effects[0] ?? null;
      const offbeatMultiplier = calculateOffbeatMultiplier(roll, sharedEffect);

      genreAdjustedDamage += (roll.value + roll.critBonus) * genreMultiplier * offbeatMultiplier;
    } else {
      // Extra dice (e.g. from wildDice) — no genre multiplier lookup
      genreAdjustedDamage += roll.value + roll.critBonus;
    }
  });

  // 5. Add flat effect bonuses (after genre multipliers)
  const totalDamage = Math.floor(genreAdjustedDamage + effectBonuses);

  return {
    baseDamage,
    genreMultipliers,
    effectBonuses,
    critBonuses,
    totalDamage,
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
