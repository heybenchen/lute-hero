// KEEP IN SYNC: genres.md (repo root) documents every genre's rule, price, tunables and simulated strength. When you change genre logic, rule text, a price or a genre tunable's default, or add or remove a genre, update genres.md in the same change.
/**
 * Data-defined genres (see game-logic/genres/specs.ts).
 *
 *  - `studioSpec(id)`: the Studio genres promoted from the genre lab. Their
 *    effects are specs built from the live tunables on every call, so the
 *    debug console and saves can retune them like any other genre.
 *  - `GENRE_SPECS`: the genre lab catalog, designed and simulated with
 *    `scripts/genre-lab.ts`. A player only holds those through
 *    `Player.specGenres`, which the genre lab sets. Batches live in
 *    ./genreSpecBatches.
 */
import type { GenreSpec } from '../game-logic/genres/specs.js'
import type { Player, GenreId } from '../types/index.js'
import { GENRE_SPEC_BATCHES, GENRE_SPEC_REWORKS } from './genreSpecBatches.js'
import { getTunables } from './tunables.js'

export const GENRE_SPECS: Record<string, GenreSpec> = Object.fromEntries(
  [...GENRE_SPEC_BATCHES.flat(), ...GENRE_SPEC_REWORKS].map((spec) => [spec.id, spec])
)

/** The spec behind a Studio genre, or null for genres the engine handles directly. */
export function studioSpec(id: GenreId): GenreSpec | null {
  const t = getTunables()
  const base = { id, name: id, theme: 'studio', rule: '', cost: 0 }
  switch (id) {
    case 'country':
      return { ...base, roll: [{ when: { element: 'starter' }, critBonus: t.countryBonus }] }
    case 'lo-fi':
      return { ...base, economy: { upgradeCost: -t.loFiDiscount } }
    // Soul is a choice the bard makes per play (PLAY_SONG soul),
    // so the engine adds its bonus through soulSpec() rather than here
    case 'baroque':
      return { ...base, roll: [{ floor: t.baroqueFloor }] }
    case 'rap':
      return { ...base, onTurnStart: [{ reward: { exp: t.rapExp } }] }
    case 'house': {
      // House: no cap by default (0 = none), and a smaller bonus per link in the Final Showdown
      const cap = t.houseCap > 0 ? { bonusCap: t.houseCap } : {}
      return { ...base, roll: [
        { when: { showdown: false }, perComboBonus: t.houseBonus, ...cap },
        { when: { showdown: true }, perComboBonus: t.houseShowdownBonus, ...cap },
      ] }
    }
    case 'orchestra':
      // Orchestra: while enough monsters remain, every die's rolled value goes up (it can crit)
      return { ...base, roll: [{ when: { monstersAtLeast: t.orchestraMin }, critBonus: t.orchestraBonus }] }
    case 'mariachi':
      return { ...base, roll: [{ when: { sharingSpace: true }, flat: t.mariachiBonus }] }
    // Genres added with the rename from genres to genres
    case 'punk':
      // Punk: a bonus on the song whenever its die crits
      return { ...base, roll: [{ critFlat: t.punkBonus }] }
    case 'soft-rock':
      return { ...base, roll: [{ when: { dice: ['d8', 'd12'] }, critBonus: t.softRockBonus }] }
    case 'prog-rock':
      return { ...base, roll: [{ when: { playIndexAtLeast: t.progRockFrom - 1, showdown: false }, flat: t.progRockBonus }] }
    case 'ska':
      return { ...base, roll: [{ oddBonus: t.skaBonus }] }
    // K-Pop's Fame for a big concert is paid in endCombat (it counts the concert's wins)
    case 'emo':
      // Emo's bonus rides on the song the bard declares their last (PLAY_SONG emoFinale), via emoFinaleSpec()
      return null
    case 'trance':
      return { ...base, roll: [{ when: { inspirationAtMost: 0 }, flat: t.tranceBonus }] }
    case 'grunge':
      // Grunge substitutes dice in rollSongWithGenres rather than modifying a face.
      return null
    case 'dubstep':
      return { ...base, roll: [{ when: { afterMove: true }, flat: t.dubstepBonus }] }
    default:
      return null
  }
}

/** Emo: the bonus on the song a bard declares their last of the concert. */
export function emoFinaleSpec(): GenreSpec {
  return { id: 'emo', name: 'emo', theme: 'studio', rule: '', cost: 0, roll: [{ flat: getTunables().emoBonus }] }
}

/** Soul: the +bonus a bard buys for one play by spending Inspiration. */
export function soulSpec(): GenreSpec {
  return { id: 'soul', name: 'soul', theme: 'studio', rule: '', cost: 0, roll: [{ flat: getTunables().soulBonus }] }
}

/** Specs for a set of Studio genres plus any genre-lab specs. */
export function specsForGenres(genres: readonly GenreId[] = [], specGenres: readonly string[] = []): GenreSpec[] {
  const out: GenreSpec[] = []
  for (const id of genres) {
    const spec = studioSpec(id)
    if (spec) out.push(spec)
  }
  for (const id of specGenres) {
    const spec = GENRE_SPECS[id]
    if (spec) out.push(spec)
  }
  return out
}

/** The data-defined genres a player holds (Studio ones and genre-lab ones). */
export function specsOf(player: Pick<Player, 'specGenres' | 'genres'> | undefined): GenreSpec[] {
  if (!player) return []
  return specsForGenres(player.genres, player.specGenres)
}
