// Hand-drawn map illustration for each board space, keyed by the space's
// row-major grid id (0–15). Keying by id — not name — keeps the art stable
// across space renames and persisted saves.
import forgottenStage from '@/assets/board/forgotten-stage.png'
import echoChamber from '@/assets/board/echo-chamber.png'
import melodyJunction from '@/assets/board/melody-junction.png'
import lastVenue from '@/assets/board/last-venue.png'
import harmonyCrossroads from '@/imports/Image.png'
import soundwaveNexus from '@/assets/board/soundwave-nexus.png'
import resonancePlaza from '@/assets/board/resonance-plaza.png'
import silentAmphitheater from '@/assets/board/silent-amphitheater.png'
import symphonyRuins from '@/assets/board/symphony-ruins.png'
import dissonanceSquare from '@/assets/board/dissonance-square.png'
import mutedHall from '@/assets/board/muted-hall.png'
import brokenChord from '@/assets/board/broken-chord.png'
import quietQuarter from '@/assets/board/quiet-quarter.png'
import crescendoHeights from '@/assets/board/crescendo-heights.png'
import fadingRefrain from '@/assets/board/fading-refrain.png'
import rhythmsEnd from '@/assets/board/rhythms-end.png'

export const SPACE_ILLUSTRATIONS: Record<number, string> = {
  0: forgottenStage,
  1: echoChamber,
  2: melodyJunction,
  3: lastVenue,
  4: harmonyCrossroads,
  5: soundwaveNexus,
  6: resonancePlaza,
  7: silentAmphitheater,
  8: symphonyRuins,
  9: dissonanceSquare,
  10: mutedHall,
  11: brokenChord,
  12: quietQuarter,
  13: crescendoHeights,
  14: fadingRefrain,
  15: rhythmsEnd,
}
