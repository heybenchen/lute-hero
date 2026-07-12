// Hand-drawn map illustration for each board space, keyed by space name.
// Rendered as the tile background in the board grid.
import forgottenStage from '@/assets/board/forgotten-stage.png'
import echoChamber from '@/assets/board/echo-chamber.png'
import melodyJunction from '@/assets/board/melody-junction.png'
import lastVenue from '@/assets/board/last-venue.png'
import harmonyCrossroads from '@/assets/board/harmony-crossroads.png'
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

export const SPACE_ILLUSTRATIONS: Record<string, string> = {
  'The Forgotten Stage': forgottenStage,
  'Echo Chamber': echoChamber,
  'Melody Junction': melodyJunction,
  'The Last Venue': lastVenue,
  'Harmony Crossroads': harmonyCrossroads,
  'The Soundwave Nexus': soundwaveNexus,
  'Resonance Plaza': resonancePlaza,
  'The Silent Amphitheater': silentAmphitheater,
  'Symphony Ruins': symphonyRuins,
  'Dissonance Square': dissonanceSquare,
  'The Muted Hall': mutedHall,
  'The Broken Chord': brokenChord,
  'The Quiet Quarter': quietQuarter,
  'Crescendo Heights': crescendoHeights,
  'The Fading Refrain': fadingRefrain,
  "Rhythm's End": rhythmsEnd,
}
