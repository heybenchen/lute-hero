import { Genre } from "@/types";
import { ALL_GENRES } from "./genreTheme";

// 6 chips of each element per player go into the bag at game start
export const CHIPS_PER_ELEMENT_PER_PLAYER = 6;
// The store presents 4 chips at a time
export const ELEMENT_OFFER_COUNT = 4;

/** Fisher-Yates shuffle (returns a new array). */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Build and shuffle the full element bag for a game. */
export function createElementBag(numPlayers: number): Genre[] {
  const bag: Genre[] = [];
  for (const genre of ALL_GENRES) {
    for (let i = 0; i < CHIPS_PER_ELEMENT_PER_PLAYER * numPlayers; i++) {
      bag.push(genre);
    }
  }
  return shuffle(bag);
}

/**
 * Draw `count` chips from the bag. If the bag runs empty mid-draw, the
 * discard pile is shuffled back in and drawing continues.
 */
export function drawFromBag(
  bag: Genre[],
  discard: Genre[],
  count: number,
): { drawn: Genre[]; bag: Genre[]; discard: Genre[] } {
  let workingBag = [...bag];
  let workingDiscard = [...discard];
  const drawn: Genre[] = [];

  for (let i = 0; i < count; i++) {
    if (workingBag.length === 0) {
      if (workingDiscard.length === 0) break;
      workingBag = shuffle(workingDiscard);
      workingDiscard = [];
    }
    drawn.push(workingBag.pop()!);
  }

  return { drawn, bag: workingBag, discard: workingDiscard };
}
