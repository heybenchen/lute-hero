/**
 * Style lab batches: 100 data-defined styles in ten themed batches, plus
 * candidate reworks of existing styles. Each entry is a complete style;
 * `scripts/style-lab.ts` simulates any of them against a no-style baseline
 * with smart bots. None is in the shipped Studio.
 */
import type { StyleSpec } from '../game-logic/styles/specs.js'

const BIG = ['d12', 'd20'] as const
const SMALL = ['d4', 'd8'] as const

const spec = (s: Omit<StyleSpec, 'cost'> & { cost?: number }): StyleSpec => ({ cost: 3, ...s })

// 1 — Element-specific
const ELEMENT: StyleSpec[] = [
  spec({ id: 'ember-heart', name: 'Ember Heart', theme: 'element', rule: 'Your Ballad dice get +2 (can crit).',
    roll: [{ when: { element: 'Ballad' }, critBonus: 2 }] }),
  spec({ id: 'greenwood', name: 'Greenwood Ballad', theme: 'element', rule: 'Your Folk dice reroll a 1 or 2 once.',
    roll: [{ when: { element: 'Folk' }, rerollAtMost: 2 }] }),
  spec({ id: 'choir-of-dawn', name: 'Choir of Dawn', theme: 'element', rule: 'Your Hymn dice roll twice; keep the higher.',
    roll: [{ when: { element: 'Hymn' }, advantage: true }] }),
  spec({ id: 'sea-legs', name: 'Sea Legs', theme: 'element', rule: 'Your Shanty dice never roll below 3.',
    roll: [{ when: { element: 'Shanty' }, floor: 3 }] }),
  spec({ id: 'hometown-hero', name: 'Hometown Hero', theme: 'element', rule: 'Dice of your starting element get +1 (can crit).',
    roll: [{ when: { element: 'starter' }, critBonus: 1 }] }),
  spec({ id: 'true-voice', name: 'True Voice', theme: 'element', rule: 'Dice of your starting element deal ×3 (not ×2) to monsters weak to them.',
    multiplier: [{ when: { element: 'starter' }, adored: 3 }] }),
  spec({ id: 'defiant-tune', name: 'Defiant Tune', theme: 'element', rule: 'Dice of your starting element deal full damage to monsters immune to them.',
    multiplier: [{ when: { element: 'starter' }, immune: 1 }] }),
  spec({ id: 'signature-sound', name: 'Signature Sound', theme: 'element', rule: 'Dice of your starting element crit one face lower.',
    roll: [{ when: { element: 'starter' }, critFaceDelta: 1 }] }),
  spec({ id: 'attuned', name: 'Attuned', theme: 'element', rule: '+1 Inspiration whenever a die of your starting element tames a monster.',
    onTame: [{ when: { element: 'starter' }, reward: { inspiration: 1 } }] }),
  spec({ id: 'purist', name: 'Purist', theme: 'element', rule: 'Once per turn, a die of your starting element gets +4.',
    roll: [{ when: { element: 'starter', oncePerTurn: true }, flat: 4 }] }),
]

// 2 — Dice-specific
const DICE: StyleSpec[] = [
  spec({ id: 'drumline', name: 'Drumline', theme: 'dice', rule: 'Your d4s get +2.',
    roll: [{ when: { dice: ['d4'] }, flat: 2 }] }),
  spec({ id: 'lute-player', name: "Lute Player's Pride", theme: 'dice', rule: 'Your d8s crit on a 7 or 8.',
    roll: [{ when: { dice: ['d8'] }, critFaceDelta: 1 }] }),
  spec({ id: 'harp-strings', name: 'Harp Strings', theme: 'dice', rule: 'Your d12s never roll below 4.',
    roll: [{ when: { dice: ['d12'] }, floor: 4 }] }),
  spec({ id: 'organ-pipes', name: 'Organ Pipes', theme: 'dice', rule: 'Your d20s reroll a 1–5 once.',
    roll: [{ when: { dice: ['d20'] }, rerollAtMost: 5 }] }),
  spec({ id: 'pocket-drums', name: 'Pocket Drums', theme: 'dice', rule: 'Each crit bonus die from a d4 adds +2.',
    roll: [{ when: { dice: ['d4'] }, cascadeBonus: 2 }] }),
  spec({ id: 'big-band', name: 'Big Band', theme: 'dice', rule: 'Your d12s and d20s get +1.',
    roll: [{ when: { dice: [...BIG] }, flat: 1 }] }),
  spec({ id: 'small-ensemble', name: 'Small Ensemble', theme: 'dice', rule: 'Your d4s and d8s roll twice; keep the higher.',
    roll: [{ when: { dice: [...SMALL] }, advantage: true }] }),
  spec({ id: 'war-horn', name: 'War Horn', theme: 'dice', rule: 'Your d20s crit on 18–20.',
    roll: [{ when: { dice: ['d20'] }, critFaceDelta: 2 }] }),
  spec({ id: 'quick-strum', name: 'Quick Strum', theme: 'dice', rule: "A d4 song that misses isn't spent.",
    onMiss: [{ when: { dice: ['d4'] }, keepSong: true }] }),
  spec({ id: 'cheap-tuning', name: 'Cheap Tuning', theme: 'dice', rule: 'New d4s cost 1 less EXP.',
    economy: { d4Cost: -1 } }),
]

// 3 — Inspiration & economy
const INSPIRATION: StyleSpec[] = [
  spec({ id: 'patron', name: 'Patron', theme: 'inspiration', rule: 'Buying Inspiration costs 1 less EXP.',
    economy: { inspirationCost: -1 } }),
  spec({ id: 'bard-of-means', name: 'Bard of Means', theme: 'inspiration', rule: 'In the Studio, each Inspiration can pay for 2 EXP.',
    economy: { inspirationAsExp: 2 } }),
  spec({ id: 'golden-take', name: 'Golden Take', theme: 'inspiration', rule: 'Inspiration rerolls keep whichever result was better.',
    inspiration: { rerollKeepBetter: true } }),
  spec({ id: 'empowered-encore', name: 'Empowered Encore', theme: 'inspiration', rule: 'Inspiration rerolls add +3 to the die.',
    inspiration: { rerollBonus: 3 } }),
  spec({ id: 'second-take', name: 'Second Take', theme: 'inspiration', rule: 'Your first Inspiration reroll each turn is free.',
    inspiration: { freeRerollsPerTurn: 1 } }),
  spec({ id: 'muse-of-victory', name: 'Muse of Victory', theme: 'inspiration', rule: '+1 more Inspiration when you clear a space.',
    onClear: { inspiration: 1 } }),
  spec({ id: 'saving-for-glory', name: 'Saving for Glory', theme: 'inspiration', rule: 'When the showdown ends, each unspent Inspiration is worth 4 fans.',
    showdownEnd: { perInspiration: 4 } }),
  spec({ id: 'inspired-play', name: 'Inspired Play', theme: 'inspiration', rule: '+2 to every die while you hold 3+ Inspiration.',
    roll: [{ when: { inspirationAtLeast: 3 }, flat: 2 }] }),
  spec({ id: 'tip-jar', name: 'Tip Jar', theme: 'inspiration', rule: '+1 Inspiration whenever you tame a Lv3+ monster.',
    onTame: [{ when: { targetLevelAtLeast: 3 }, reward: { inspiration: 1 } }] }),
  spec({ id: 'studio-regular', name: 'Studio Regular', theme: 'inspiration', rule: 'Upgrades cost 1 less EXP.',
    economy: { upgradeCost: -1 } }),
]

// 4 — Dice manipulation
const MANIPULATION: StyleSpec[] = [
  spec({ id: 'steady-hand', name: 'Steady Hand', theme: 'manipulation', rule: 'Your dice never roll a 1.',
    roll: [{ floor: 2 }] }),
  spec({ id: 'second-chance', name: 'Second Chance', theme: 'manipulation', rule: 'Any die showing a 1 or 2 rerolls once.',
    roll: [{ rerollAtMost: 2 }] }),
  spec({ id: 'mirror-tune', name: 'Mirror Tune', theme: 'manipulation', rule: 'Once per turn, a d8/d12/d20 roll of 1–3 flips to its opposite face.',
    roll: [{ when: { dice: ['d8', 'd12', 'd20'], oncePerTurn: true }, flipAtMost: 3 }] }),
  spec({ id: 'loaded-dice', name: 'Loaded Dice', theme: 'manipulation', rule: 'Your first song each fight rolls twice; keep the higher.',
    roll: [{ when: { firstPlay: true }, advantage: true }] }),
  spec({ id: 'weighted', name: 'Weighted Dice', theme: 'manipulation', rule: 'Your d12s and d20s never roll below 6.',
    roll: [{ when: { dice: [...BIG] }, floor: 6 }] }),
  spec({ id: 'retune', name: 'Retune', theme: 'manipulation', rule: 'Once per turn, a die showing 1–4 rerolls.',
    roll: [{ when: { oncePerTurn: true }, rerollAtMost: 4 }] }),
  spec({ id: 'flip-side', name: 'Flip Side', theme: 'manipulation', rule: 'A roll of 1 flips to the top face (and crits).',
    roll: [{ flipAtMost: 1 }] }),
  spec({ id: 'even-keel', name: 'Even Keel', theme: 'manipulation', rule: "Your dice get +3 but can't crit.",
    roll: [{ flat: 3, noCrit: true }] }),
  spec({ id: 'double-time', name: 'Double Time', theme: 'manipulation', rule: 'Once per turn, a die rolls twice; keep the higher.',
    roll: [{ when: { oncePerTurn: true }, advantage: true }] }),
  spec({ id: 'sleight-of-hand', name: 'Sleight of Hand', theme: 'manipulation', rule: 'Once per turn, a roll below 4 counts as 4.',
    roll: [{ when: { oncePerTurn: true }, floor: 4 }] }),
]

// 5 — Combo rolls
const COMBO: StyleSpec[] = [
  spec({ id: 'motif', name: 'Motif', theme: 'combo', rule: '+2 to a song played right after a song of the same element.',
    roll: [{ when: { sameElementAsLast: true }, flat: 2 }] }),
  spec({ id: 'call-and-response', name: 'Call and Response', theme: 'combo', rule: "+2 to a song whose element differs from the previous song's.",
    roll: [{ when: { differentElementFromLast: true }, flat: 2 }] }),
  spec({ id: 'crescendo', name: 'Crescendo', theme: 'combo', rule: '+1 per song already played this fight (max +4).',
    roll: [{ perPlayBonus: 1, bonusCap: 4 }] }),
  spec({ id: 'medley', name: 'Medley', theme: 'combo', rule: '+1 per different element already played this fight (max +3).',
    roll: [{ perElementPlayed: 1, bonusCap: 3 }] }),
  spec({ id: 'chain-reaction', name: 'Chain Reaction', theme: 'combo', rule: '+2 per same-element song played in a row before this one (max +6).',
    roll: [{ perComboBonus: 2, bonusCap: 6 }] }),
  spec({ id: 'grand-crescendo', name: 'Grand Crescendo', theme: 'combo', rule: 'Your 4th and later songs each fight roll twice; keep the higher.',
    roll: [{ when: { playIndexAtLeast: 3 }, advantage: true }] }),
  spec({ id: 'counter-melody', name: 'Counter-Melody', theme: 'combo', rule: 'A song after one of a different element crits one face lower.',
    roll: [{ when: { differentElementFromLast: true }, critFaceDelta: 1 }] }),
  spec({ id: 'building-hype', name: 'Building Hype', theme: 'combo', rule: 'Tames by your 4th or later song in a fight are worth +5 Fame.',
    onTame: [{ when: { playIndexAtLeast: 3 }, reward: { fame: 5 } }] }),
  spec({ id: 'harmony-line', name: 'Harmony Line', theme: 'combo', rule: 'A same-element follow-up deals ×3 (not ×2) to monsters weak to it.',
    multiplier: [{ when: { sameElementAsLast: true }, adored: 3 }] }),
  spec({ id: 'opening-chord', name: 'Opening Chord', theme: 'combo', rule: 'Your first song each fight gets +4 (can crit).',
    roll: [{ when: { firstPlay: true }, critBonus: 4 }] }),
]

// 6 — Gambles
const GAMBLE: StyleSpec[] = [
  spec({ id: 'all-or-nothing', name: 'All or Nothing', theme: 'gamble', rule: 'Your dice roll twice and keep the LOWER, but deal double.',
    roll: [{ disadvantage: true, times: 2 }] }),
  spec({ id: 'showboat', name: 'Showboat', theme: 'gamble', rule: '+5 Fame per tame, −3 Fame per miss.',
    onTame: [{ reward: { fame: 5 } }], onMiss: [{ reward: { fame: -3 } }] }),
  spec({ id: 'double-or-bust', name: 'Double or Bust', theme: 'gamble', rule: "Your d20s deal ×1.5 but can't crit.",
    roll: [{ when: { dice: ['d20'] }, times: 1.5, noCrit: true }] }),
  spec({ id: 'reckless', name: 'Reckless', theme: 'gamble', rule: 'Dice roll twice and keep the lower, but crit one face lower and each crit die adds +3.',
    roll: [{ disadvantage: true, critFaceDelta: 1, cascadeBonus: 3 }] }),
  spec({ id: 'last-stand', name: 'Last Stand', theme: 'gamble', rule: 'While you have the least Fame, your dice deal ×1.5.',
    roll: [{ when: { trailingFame: true }, times: 1.5 }] }),
  spec({ id: 'glass-cannon', name: 'Glass Cannon', theme: 'gamble', rule: '+3 to every die, but each miss costs 1 EXP.',
    roll: [{ flat: 3 }], onMiss: [{ reward: { exp: -1 } }] }),
  spec({ id: 'house-money', name: 'House Money', theme: 'gamble', rule: 'Taming a Lv4+ monster earns 2 Inspiration; missing one costs 1.',
    onTame: [{ when: { targetLevelAtLeast: 4 }, reward: { inspiration: 2 } }],
    onMiss: [{ when: { targetLevelAtLeast: 4 }, reward: { inspiration: -1 } }] }),
  spec({ id: 'triple-threat', name: 'Triple Threat', theme: 'gamble', rule: 'Your first song each fight deals ×3, but if it misses you lose 5 Fame.',
    roll: [{ when: { firstPlay: true }, times: 3 }], onMiss: [{ when: { firstPlay: true }, reward: { fame: -5 } }] }),
  spec({ id: 'gamblers-shot', name: "Gambler's Shot", theme: 'gamble', rule: 'Dice roll twice and keep the lower, but each crit bonus die adds +10.',
    roll: [{ disadvantage: true, cascadeBonus: 10 }] }),
  spec({ id: 'risky-business', name: 'Risky Business', theme: 'gamble', rule: "Missed songs aren't spent, but each miss costs 1 Inspiration.",
    onMiss: [{ keepSong: true, reward: { inspiration: -1 } }] }),
]

// 7 — Crits
const CRIT: StyleSpec[] = [
  spec({ id: 'sharp-ear', name: 'Sharp Ear', theme: 'crit', rule: 'All your dice crit one face lower.',
    roll: [{ critFaceDelta: 1 }] }),
  spec({ id: 'resonance', name: 'Resonance', theme: 'crit', rule: 'Each crit bonus die adds +2.',
    roll: [{ cascadeBonus: 2 }] }),
  spec({ id: 'echo-chamber', name: 'Echo Chamber', theme: 'crit', rule: 'Your d12s and d20s crit one face lower, and their crit dice add +1.',
    roll: [{ when: { dice: [...BIG] }, critFaceDelta: 1, cascadeBonus: 1 }] }),
  spec({ id: 'power-chord', name: 'Power Chord', theme: 'crit', rule: 'Your d8s and d12s get +3 (can crit).',
    roll: [{ when: { dice: ['d8', 'd12'] }, critBonus: 3 }] }),
  spec({ id: 'stage-dive', name: 'Stage Dive', theme: 'crit', rule: 'Your first song each fight crits on its top three faces.',
    roll: [{ when: { firstPlay: true }, critFaceDelta: 2 }] }),
  spec({ id: 'thunderclap', name: 'Thunderclap', theme: 'crit', rule: "Your d20s crit on 17–20, but your other dice can't crit.",
    roll: [{ when: { dice: ['d20'] }, critFaceDelta: 3 }, { when: { dice: ['d4', 'd8', 'd12'] }, noCrit: true }] }),
  spec({ id: 'glimmer', name: 'Glimmer', theme: 'crit', rule: 'Your d4s and d8s crit on their top two faces.',
    roll: [{ when: { dice: [...SMALL] }, critFaceDelta: 1 }] }),
  spec({ id: 'grand-encore', name: 'Grand Encore', theme: 'crit', rule: 'Each crit bonus die adds +4.',
    roll: [{ cascadeBonus: 4 }] }),
  spec({ id: 'hunters-crit', name: "Hunter's Crit", theme: 'crit', rule: 'Against Lv3+ monsters your dice crit one face lower.',
    roll: [{ when: { targetLevelAtLeast: 3 }, critFaceDelta: 1 }] }),
  spec({ id: 'fever-pitch', name: 'Fever Pitch', theme: 'crit', rule: 'From your 3rd song each fight, dice crit one face lower and crit dice add +1.',
    roll: [{ when: { playIndexAtLeast: 2 }, critFaceDelta: 1, cascadeBonus: 1 }] }),
]

// 8 — Targeting
const TARGET: StyleSpec[] = [
  spec({ id: 'giant-slayer', name: 'Giant Slayer', theme: 'target', rule: '+3 against Lv4+ monsters.',
    roll: [{ when: { targetLevelAtLeast: 4 }, flat: 3 }] }),
  spec({ id: 'pest-control', name: 'Pest Control', theme: 'target', rule: '+2 (can crit) against Lv1–2 monsters.',
    roll: [{ when: { targetLevelAtMost: 2 }, critBonus: 2 }] }),
  spec({ id: 'first-impression', name: 'First Impression', theme: 'target', rule: '+3 against monsters not yet hit this fight.',
    roll: [{ when: { targetUntouched: true }, flat: 3 }] }),
  spec({ id: 'finisher', name: 'Finisher', theme: 'target', rule: '+3 against already-wounded monsters.',
    roll: [{ when: { targetWounded: true }, flat: 3 }] }),
  spec({ id: 'fan-favorite', name: 'Fan Favorite', theme: 'target', rule: 'Your dice deal ×3 (not ×2) to monsters weak to them.',
    multiplier: [{ adored: 3 }] }),
  spec({ id: 'open-mind', name: 'Open Mind', theme: 'target', rule: 'Monsters immune to your dice take half damage instead of none.',
    multiplier: [{ immune: 0.5 }] }),
  spec({ id: 'crowd-reader', name: 'Crowd Reader', theme: 'target', rule: 'Your dice deal ×1.5 to monsters that are neither weak nor immune to them.',
    multiplier: [{ neutral: 1.5 }] }),
  spec({ id: 'big-game', name: 'Big Game', theme: 'target', rule: '+2 EXP per Lv3+ monster tamed.',
    onTame: [{ when: { targetLevelAtLeast: 3 }, reward: { exp: 2 } }] }),
  spec({ id: 'swarm-singer', name: 'Swarm Singer', theme: 'target', rule: '+2 to every die in fights with 3+ monsters.',
    roll: [{ when: { monstersAtLeast: 3 }, flat: 2 }] }),
  spec({ id: 'bounty-hunter', name: 'Bounty Hunter', theme: 'target', rule: '+8 Fame per Lv4+ monster tamed.',
    onTame: [{ when: { targetLevelAtLeast: 4 }, reward: { fame: 8 } }] }),
]

// 9 — Table position & rivalry
const SOCIAL: StyleSpec[] = [
  spec({ id: 'jam-session', name: 'Jam Session', theme: 'social', rule: '+2 to every die while you share a space with another bard.',
    roll: [{ when: { sharingSpace: true }, flat: 2 }] }),
  spec({ id: 'underdog', name: 'Underdog', theme: 'social', rule: 'While you have the least Fame, +1 Inspiration at the start of your turn.',
    onTurnStart: [{ when: { trailingFame: true }, reward: { inspiration: 1 } }] }),
  spec({ id: 'comeback-kid', name: 'Comeback Kid', theme: 'social', rule: 'While you have the least Fame, your dice get +2 (can crit).',
    roll: [{ when: { trailingFame: true }, critBonus: 2 }] }),
  spec({ id: 'headliner', name: 'Headliner', theme: 'social', rule: 'While you lead in Fame, +3 Fame per tame.',
    onTame: [{ when: { leadingFame: true }, reward: { fame: 3 } }] }),
  spec({ id: 'wanderer', name: 'Wanderer', theme: 'social', rule: '+1 move per turn.',
    economy: { moves: 1 } }),
  spec({ id: 'trailblazer', name: 'Trailblazer', theme: 'social', rule: '+2 moves per turn.',
    economy: { moves: 2 } }),
  spec({ id: 'busker', name: 'Busker', theme: 'social', rule: '+2 EXP whenever a fight ends with monsters left.',
    onRetreat: { exp: 2 } }),
  spec({ id: 'street-performer', name: 'Street Performer', theme: 'social', rule: '+1 EXP at the start of each turn.',
    onTurnStart: [{ reward: { exp: 1 } }] }),
  spec({ id: 'chip-on-shoulder', name: 'Chip on the Shoulder', theme: 'social', rule: 'While you have the least Fame, +3 Fame per tame.',
    onTame: [{ when: { trailingFame: true }, reward: { fame: 3 } }] }),
  spec({ id: 'duet-partner', name: 'Duet Partner', theme: 'social', rule: 'While you share a space with another bard, tames earn +1 Inspiration.',
    onTame: [{ when: { sharingSpace: true }, reward: { inspiration: 1 } }] }),
]

// 10 — Showdown & tempo
const TEMPO: StyleSpec[] = [
  spec({ id: 'showstopper', name: 'Showstopper', theme: 'tempo', rule: '+3 to every die in the Final Showdown.',
    roll: [{ when: { showdown: true }, flat: 3 }] }),
  spec({ id: 'grand-finale', name: 'Grand Finale', theme: 'tempo', rule: 'Showdown dice roll twice; keep the higher.',
    roll: [{ when: { showdown: true }, advantage: true }] }),
  spec({ id: 'encore-reserve', name: 'Encore Reserve', theme: 'tempo', rule: '+15 fans when the showdown ends.',
    showdownEnd: { flat: 15 } }),
  spec({ id: 'slow-burn', name: 'Slow Burn', theme: 'tempo', rule: '−1 to dice in fights, +4 in the Final Showdown.',
    roll: [{ when: { showdown: false }, flat: -1 }, { when: { showdown: true }, flat: 4 }] }),
  spec({ id: 'opening-act', name: 'Opening Act', theme: 'tempo', rule: 'Your first song each fight rolls twice, keeps the higher, and gets +2.',
    roll: [{ when: { firstPlay: true }, advantage: true, flat: 2 }] }),
  spec({ id: 'second-wind', name: 'Second Wind', theme: 'tempo', rule: 'Your 3rd and later songs each fight get +2.',
    roll: [{ when: { playIndexAtLeast: 2 }, flat: 2 }] }),
  spec({ id: 'warm-up', name: 'Warm-Up', theme: 'tempo', rule: '+1 EXP at the start of each turn and +1 to showdown dice.',
    onTurnStart: [{ reward: { exp: 1 } }], roll: [{ when: { showdown: true }, flat: 1 }] }),
  spec({ id: 'headline-act', name: 'Headline Act', theme: 'tempo', rule: 'Showdown dice crit one face lower and their crit dice add +2.',
    roll: [{ when: { showdown: true }, critFaceDelta: 1, cascadeBonus: 2 }] }),
  spec({ id: 'stamina', name: 'Stamina', theme: 'tempo', rule: '+1 to every die, +1 more in the Final Showdown.',
    roll: [{ flat: 1 }, { when: { showdown: true }, flat: 1 }] }),
  spec({ id: 'legacy', name: 'Legacy', theme: 'tempo', rule: '+1 Fame at the start of each turn.',
    onTurnStart: [{ reward: { fame: 1 } }] }),
]

export const STYLE_SPEC_BATCHES: StyleSpec[][] = [ELEMENT, DICE, INSPIRATION, MANIPULATION, COMBO, GAMBLE, CRIT, TARGET, SOCIAL, TEMPO]

/** Candidate reworks of existing styles that no tunable could balance. */
export const STYLE_SPEC_REWORKS: StyleSpec[] = [
  spec({ id: 'war-drums-v2', name: 'War Drums (rework A)', theme: 'rework', rule: 'Your d4s and d8s get +1 (can crit).',
    roll: [{ when: { dice: [...SMALL] }, critBonus: 1 }] }),
  spec({ id: 'war-drums-v3', name: 'War Drums (rework B)', theme: 'rework', rule: 'Your d4s crit on a 3 or 4, and their crit dice add +2.',
    roll: [{ when: { dice: ['d4'] }, critFaceDelta: 1, cascadeBonus: 2 }] }),
]
