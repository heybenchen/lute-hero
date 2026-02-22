import { Song, Monster, DiceRoll, Genre, DamageCalculation, SongSlot, TrackEffect } from "@/types";
import { rollDiceWithCrit } from "../dice/roller";
import {
  applyTrackEffect,
  calculateEffectBonuses,
  calculateHarmonizeBonus,
  calculateOffbeatMultiplier,
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
 * Effects are paired positionally with slots (effect[i] applies to slot[i]'s die).
 */
export function rollSong(song: Song): {
  rolls: DiceRoll[];
  updatedSong: Song;
} {
  const allRolls: DiceRoll[] = [];
  const updatedEffects = [...song.effects];

  const updatedSlots = song.slots.map((slot, idx) => {
    if (!slot.dice) return slot;

    // Roll the die
    const baseRoll = rollDiceWithCrit(slot.dice);

    // Apply the corresponding effect (by position)
    const effect = song.effects[idx] ?? null;
    const { modifiedRoll, updatedEffect, additionalRolls } = applyTrackEffect(
      baseRoll,
      slot.dice,
      effect,
    );

    allRolls.push(modifiedRoll);
    allRolls.push(...additionalRolls);

    if (idx < updatedEffects.length && updatedEffect !== null) {
      updatedEffects[idx] = updatedEffect;
    }

    return slot;
  });

  return {
    rolls: allRolls,
    updatedSong: {
      ...song,
      slots: updatedSlots as [SongSlot, SongSlot],
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
  // 1. Calculate base damage (sum of all roll values)
  const baseDamage = rolls.reduce((sum, roll) => sum + roll.value, 0);

  // 2. Calculate crit bonuses
  const critBonuses = rolls.reduce((sum, roll) => sum + roll.critBonus, 0);

  // 3. Calculate effect bonuses (flat additions) + harmonize bonus
  const effectBonuses =
    calculateEffectBonuses(song.effects) + calculateHarmonizeBonus(song.effects, rolls);

  // 4. Calculate genre multipliers for each die
  const genreMultipliers: { genre: Genre; multiplier: number }[] = [];
  let genreAdjustedDamage = 0;

  rolls.forEach((roll) => {
    // Find the slot that created this roll
    const slotIdx = song.slots.findIndex((s) => s.dice?.id === roll.diceId);
    const slot = slotIdx >= 0 ? song.slots[slotIdx] : undefined;
    const dice = slot?.dice;
    // Get the corresponding effect for offbeat check
    const effect = slotIdx >= 0 ? (song.effects[slotIdx] ?? null) : null;

    if (dice) {
      const genreMultiplier = getGenreMultiplier(dice.genre, monster);
      genreMultipliers.push({ genre: dice.genre, multiplier: genreMultiplier });

      // Calculate offbeat multiplier (odd = 2x, even = 0.5x)
      const offbeatMultiplier = calculateOffbeatMultiplier(roll, effect);

      // Apply genre and offbeat multipliers to this specific die's damage
      genreAdjustedDamage += (roll.value + roll.critBonus) * genreMultiplier * offbeatMultiplier;
    } else {
      // No slot found (shouldn't happen), add unadjusted
      genreAdjustedDamage += roll.value + roll.critBonus;
    }
  });

  // 5. Add flat effect bonuses (after genre multipliers)
  const damageAfterBonuses = genreAdjustedDamage + effectBonuses;

  // 6. Apply effect multipliers (last step)
  const totalDamage = Math.floor(damageAfterBonuses);

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
