import { Genre } from '../types/index.js'
import { MONSTER_TEMPLATES } from './monsters.js'

/**
 * How one monster element relates to the four song genres, derived straight
 * from the monster templates so the type chart can never drift from the rules
 * the engine actually applies.
 *
 * A monster is named for its element and is always weak (2×) to that element's
 * matching genre and immune (0×) to the opposing element's genre. The two
 * opposing pairs are mutual: Ballad (Fire) ⟷ Shanty (Water) and
 * Folk (Earth) ⟷ Hymn (Wind).
 */
export interface ElementMatchup {
  /** The monster's element — equal to the genre it is weak to. */
  element: Genre
  /** Genre whose dice deal 2× (super effective). */
  weakTo: Genre
  /** Genre whose dice deal 0× (immune). */
  immuneTo: Genre
}

/** One matchup per element, in template order (Ballad, Folk, Hymn, Shanty). */
export const ELEMENT_MATCHUPS: ElementMatchup[] = (() => {
  const byElement = new Map<Genre, ElementMatchup>()
  for (const template of MONSTER_TEMPLATES) {
    if (template.isBoss || !template.vulnerability || !template.resistance) continue
    if (byElement.has(template.vulnerability)) continue
    byElement.set(template.vulnerability, {
      element: template.vulnerability,
      weakTo: template.vulnerability,
      immuneTo: template.resistance,
    })
  }
  return [...byElement.values()]
})()

/** Look up a single element's matchup. */
export function getMatchup(element: Genre): ElementMatchup | undefined {
  return ELEMENT_MATCHUPS.find((m) => m.element === element)
}
