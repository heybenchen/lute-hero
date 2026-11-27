import type { Element } from '@/types'
import ballad1 from './ballad-l1.png'
import ballad2 from './ballad-l2.png'
import ballad3 from './ballad-l3.png'
import ballad4 from './ballad-l4.png'
import ballad5 from './ballad-l5.png'
import folk1 from './folk-l1.png'
import folk2 from './folk-l2.png'
import folk3 from './folk-l3.png'
import folk4 from './folk-l4.png'
import folk5 from './folk-l5.png'
import hymn1 from './hymn-l1.png'
import hymn2 from './hymn-l2.png'
import hymn3 from './hymn-l3.png'
import hymn4 from './hymn-l4.png'
import hymn5 from './hymn-l5.png'
import shanty1 from './shanty-l1.png'
import shanty2 from './shanty-l2.png'
import shanty3 from './shanty-l3.png'
import shanty4 from './shanty-l4.png'
import shanty5 from './shanty-l5.png'

type LevelSprites = readonly [string, string, string, string, string]

/** Elemental monster art in level order, matching the game's Lv1–Lv5 cap. */
export const MONSTER_LEVEL_SPRITES: Record<Element, LevelSprites> = {
  Ballad: [ballad1, ballad2, ballad3, ballad4, ballad5],
  Folk: [folk1, folk2, folk3, folk4, folk5],
  Hymn: [hymn1, hymn2, hymn3, hymn4, hymn5],
  Shanty: [shanty1, shanty2, shanty3, shanty4, shanty5],
}
