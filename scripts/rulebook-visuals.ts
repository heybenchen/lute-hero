/**
 * Draws the diagrams in rulebook/RULEBOOK.md as print-friendly SVGs
 * (cream paper, dark ink, so they photocopy well).
 *
 *   npx tsx scripts/rulebook-visuals.ts
 *
 * Numbers (monster HP, Fame and EXP, dice prices, the fame gate, ...) come from
 * the game's default tunables, so the pictures cannot drift from the code. The
 * prose in RULEBOOK.md is checked against the same values by
 * src/rulebook.test.ts.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { DEFAULT_TUNABLES as T } from '../src/data/tunables.js'
import { createBoardGraph } from '../src/game-logic/board/graphBuilder.js'
import { ALL_STYLE_IDS, STYLES, styleCost, styleRule } from '../src/data/styles.js'

const OUT = new URL('../rulebook/img/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

// ---------------------------------------------------------------- palette
const PAPER = '#fbf6e9'
const INK = '#3b2a1a'
const SOFT = '#7a6650'
const LINE = '#cdbb98'
const GOLD = '#b8861b'
const ELEMENTS = [
  { name: 'Ballad', color: '#c23b3b', tint: '#f3d4d0', letter: 'B' },
  { name: 'Folk', color: '#3f8f4a', tint: '#d5ead7', letter: 'F' },
  { name: 'Hymn', color: '#cf9a00', tint: '#f6e8b8', letter: 'H' },
  { name: 'Shanty', color: '#2f6fb5', tint: '#d3e2f3', letter: 'S' },
] as const
const FONT = "Georgia, 'Times New Roman', serif"

// ---------------------------------------------------------------- helpers
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function svg(w: number, h: number, body: string, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}" font-family="${FONT}">
<title>${esc(title)}</title>
<rect width="${w}" height="${h}" fill="${PAPER}"/>
<rect x="3" y="3" width="${w - 6}" height="${h - 6}" fill="none" stroke="${LINE}" stroke-width="1.5" rx="10"/>
${body}
</svg>
`
}

interface TextOpts { size?: number; weight?: 'normal' | 'bold'; fill?: string; anchor?: 'start' | 'middle' | 'end'; italic?: boolean; spacing?: number }
function text(x: number, y: number, s: string, o: TextOpts = {}): string {
  const { size = 14, weight = 'normal', fill = INK, anchor = 'start', italic = false, spacing } = o
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${italic ? ' font-style="italic"' : ''}${spacing ? ` letter-spacing="${spacing}"` : ''}>${esc(s)}</text>`
}
/** Several lines of text, `lh` apart. */
function lines(x: number, y: number, ls: string[], o: TextOpts & { lh?: number } = {}): string {
  const lh = o.lh ?? (o.size ?? 14) * 1.35
  return ls.map((l, i) => text(x, y + i * lh, l, o)).join('\n')
}
function rect(x: number, y: number, w: number, h: number, o: { fill?: string; stroke?: string; sw?: number; r?: number; dash?: string } = {}): string {
  const { fill = 'none', stroke = INK, sw = 1.5, r = 8, dash } = o
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
}
function circle(cx: number, cy: number, r: number, o: { fill?: string; stroke?: string; sw?: number } = {}): string {
  const { fill = 'none', stroke = INK, sw = 1.5 } = o
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
}
function line(x1: number, y1: number, x2: number, y2: number, o: { stroke?: string; sw?: number; dash?: string } = {}): string {
  const { stroke = INK, sw = 1.5, dash } = o
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
}
/** A straight arrow with a small head. */
function arrow(x1: number, y1: number, x2: number, y2: number, o: { stroke?: string; sw?: number } = {}): string {
  const { stroke = INK, sw = 2 } = o
  const a = Math.atan2(y2 - y1, x2 - x1)
  const hx = (d: number) => x2 - 9 * Math.cos(a + d)
  const hy = (d: number) => y2 - 9 * Math.sin(a + d)
  return `${line(x1, y1, x2, y2, { stroke, sw })}<path d="M${x2},${y2} L${hx(0.45)},${hy(0.45)} L${hx(-0.45)},${hy(-0.45)} Z" fill="${stroke}"/>`
}
/** An element chip: a coloured disc with its initial. */
function chip(cx: number, cy: number, el: (typeof ELEMENTS)[number], r = 13): string {
  return `${circle(cx, cy, r, { fill: el.color, stroke: INK, sw: 1.2 })}${text(cx, cy + r * 0.36, el.letter, { size: r * 1.05, weight: 'bold', fill: '#fff', anchor: 'middle' })}`
}
/** A die icon: triangle, diamond, pentagon or hexagon, with its name inside. */
function die(type: 'd4' | 'd8' | 'd12' | 'd20', cx: number, cy: number, r: number, fill: string, stroke = INK): string {
  const sides = { d4: 3, d8: 4, d12: 5, d20: 6 }[type]
  const rot = { d4: -90, d8: -90, d12: -90, d20: 0 }[type]
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = ((rot + (360 / sides) * i) * Math.PI) / 180
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  const ty = type === 'd4' ? cy + r * 0.28 : cy + 5
  return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>${text(cx, ty, type, { size: r * 0.42, weight: 'bold', anchor: 'middle' })}`
}
/** A numbered step badge. */
function badge(cx: number, cy: number, n: number | string): string {
  return `${circle(cx, cy, 13, { fill: INK })}${text(cx, cy + 5, String(n), { size: 14, weight: 'bold', fill: PAPER, anchor: 'middle' })}`
}
/** A titled panel. */
function panel(x: number, y: number, w: number, h: number, title: string, fill = '#fffdf6'): string {
  return `${rect(x, y, w, h, { fill, stroke: INK, sw: 1.6 })}${rect(x, y, w, 30, { fill: INK, stroke: INK, sw: 1.6 })}${text(x + w / 2, y + 21, title, { size: 14, weight: 'bold', fill: PAPER, anchor: 'middle', spacing: 1.5 })}`
}
const write = (name: string, content: string) => writeFileSync(OUT + name, content)

// =================================================================== cover
{
  const lute = (x: number, y: number) => `
    <g transform="translate(${x} ${y}) rotate(-28)">
      <rect x="-9" y="-150" width="18" height="110" rx="3" fill="#8a5a2b" stroke="${INK}" stroke-width="2"/>
      <rect x="-15" y="-172" width="30" height="26" rx="6" fill="#6b4220" stroke="${INK}" stroke-width="2"/>
      ${[-7, 0, 7].map((o) => line(o * 0.6, -40, o * 0.6, 70, { stroke: SOFT, sw: 1 })).join('')}
      <ellipse cx="0" cy="38" rx="52" ry="64" fill="#d9a35f" stroke="${INK}" stroke-width="2.5"/>
      ${circle(0, 30, 17, { fill: '#5a381b', sw: 2 })}
      <rect x="-30" y="78" width="60" height="7" rx="3" fill="#6b4220" stroke="${INK}" stroke-width="1.5"/>
      ${[-10, -3, 4, 11].map((o) => line(o, -40, o * 1.2, 80, { stroke: '#fffdf6', sw: 1.2 })).join('')}
    </g>`
  let b = lute(655, 190)
  b += text(60, 120, 'LUTE HERO', { size: 62, weight: 'bold', spacing: 5 })
  b += line(62, 140, 470, 140, { stroke: GOLD, sw: 3 })
  b += text(62, 176, 'Songs Against the Silence', { size: 28, italic: true, fill: GOLD })
  b += text(62, 214, 'A board game of music, monsters and fame for 2–4 bards', { size: 16, fill: SOFT })
  ELEMENTS.forEach((el, i) => {
    b += chip(80 + i * 118, 262, el, 17)
    b += text(104 + i * 118, 268, el.name, { size: 15, weight: 'bold', fill: el.color })
  })
  b += text(60, 60, 'THE OFFICIAL RULEBOOK', { size: 14, spacing: 5, fill: SOFT })
  write('cover.svg', svg(760, 310, b, 'Lute Hero cover'))
}

// =================================================================== setup
{
  let b = ''
  // bard mat
  b += panel(24, 24, 440, 330, "A BARD'S MAT")
  b += text(44, 74, 'Setlist: six songs, one die each', { size: 13, fill: SOFT, italic: true })
  for (let i = 0; i < 6; i++) {
    const x = 44 + (i % 3) * 138
    const y = 90 + Math.floor(i / 3) * 112
    b += rect(x, y, 124, 98, { fill: i === 0 ? ELEMENTS[0].tint : '#fffdf6', stroke: i === 0 ? ELEMENTS[0].color : LINE, sw: i === 0 ? 2.5 : 1.5, dash: i === 0 ? undefined : '5 4' })
    b += text(x + 8, y + 18, `Song ${i + 1}`, { size: 12, weight: 'bold', fill: SOFT })
    if (i === 0) {
      b += die('d8', x + 62, y + 52, 28, ELEMENTS[0].color)
      b += text(x + 62, y + 90, 'your starter d8', { size: 10.5, anchor: 'middle', fill: ELEMENTS[0].color, weight: 'bold' })
    } else b += text(x + 62, y + 62, 'empty', { size: 12, anchor: 'middle', fill: LINE, italic: true })
  }
  // trackers
  const track = (x: number, label: string, val: string) =>
    rect(x, 318, 128, 26, { fill: '#fffdf6', stroke: LINE }) + text(x + 8, 336, label, { size: 12, fill: SOFT }) + text(x + 120, 336, val, { size: 15, weight: 'bold', anchor: 'end' })
  b += track(44, 'Fame', '0') + track(182, 'EXP', '0') + track(320, 'Inspiration', String(T.startingInspiration))
  // steps
  const steps = [
    ['Pick your element', 'Each bard picks a different one: Ballad, Folk, Hymn or Shanty.'],
    ['Place the board', 'The 4×4 realm of 16 spaces. Bards start on the corners.'],
    ['Take your mat', `One ${'d8'} of your element in Song 1. ${T.startingInspiration} Inspiration, 0 Fame, 0 EXP.`],
    ['Deal the chips', 'One element chip per space, the same number of each element, shuffled.'],
    ['Fix your corner', 'Swap chips so your starting space holds a chip of your own element.'],
    ['Stock the Studio', `Draw ${T.elementOfferCount} element chips and ${T.styleOfferCount} styles to the shelves.`],
  ]
  steps.forEach(([h, d], i) => {
    const y = 48 + i * 54
    b += badge(500, y + 6, i + 1)
    b += text(522, y + 2, h, { size: 14, weight: 'bold' })
    b += lines(522, y + 19, wrap(d, 40), { size: 11.5, fill: SOFT, lh: 14 })
  })
  write('setup.svg', svg(760, 380, b, 'Setup: a bard mat and the six setup steps'))
}

/** Greedy word-wrap by character count. */
function wrap(s: string, n: number): string[] {
  const out: string[] = []
  let cur = ''
  for (const w of s.split(' ')) {
    if ((cur + ' ' + w).trim().length > n) {
      out.push(cur)
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) out.push(cur)
  return out
}

// =================================================================== board
{
  const spaces = createBoardGraph()
  const W = 168
  const H = 112
  const X0 = 30
  const Y0 = 30
  const GAP = 8
  const pos = (id: number) => ({ x: X0 + (id % 4) * (W + GAP), y: Y0 + Math.floor(id / 4) * (H + GAP) })
  const start: Record<number, string> = { 0: 'P1', 3: 'P2', 12: 'P3', 15: 'P4' }
  const reach1 = new Set([1, 4])
  const reach2 = new Set([2, 5, 8])
  let b = ''
  for (const s of spaces) {
    const { x, y } = pos(s.id)
    const one = reach1.has(s.id)
    const two = reach2.has(s.id)
    b += rect(x, y, W, H, { fill: one ? '#f8e6b4' : two ? '#fbf0d2' : '#fffdf6', stroke: start[s.id] ? INK : LINE, sw: start[s.id] ? 3 : 1.6 })
    b += text(x + 10, y + 20, `${s.id + 1}`, { size: 12, weight: 'bold', fill: SOFT })
    b += lines(x + W / 2, y + 52, wrap(s.name, 17), { size: 14, weight: 'bold', anchor: 'middle', lh: 17 })
    if (start[s.id]) {
      b += circle(x + W - 22, y + 22, 14, { fill: INK })
      b += text(x + W - 22, y + 27, start[s.id], { size: 12, weight: 'bold', fill: PAPER, anchor: 'middle' })
      b += text(x + W / 2, y + H - 12, 'start', { size: 11, anchor: 'middle', fill: SOFT, italic: true })
    }
    if (one) b += text(x + W / 2, y + H - 12, '1 move', { size: 12, weight: 'bold', anchor: 'middle', fill: GOLD })
    if (two) b += text(x + W / 2, y + H - 12, '2 moves', { size: 12, weight: 'bold', anchor: 'middle', fill: GOLD })
  }
  // sample chips on a couple of spaces
  const sample = (id: number, els: number[]) => {
    const { x, y } = pos(id)
    els.forEach((e, i) => (b += chip(x + 44 + i * 19, y + 16, ELEMENTS[e], 8)))
  }
  sample(5, [1, 1, 3])
  sample(10, [0])
  sample(6, [2, 2, 2])
  // legend
  const ly = Y0 + 4 * (H + GAP) + 6
  b += rect(30, ly, 20, 14, { fill: '#f8e6b4', stroke: LINE })
  b += text(58, ly + 12, 'Next door: costs 1 move', { size: 12.5 })
  b += rect(250, ly, 20, 14, { fill: '#fbf0d2', stroke: LINE })
  b += text(278, ly + 12, 'Two steps away: costs 2 moves', { size: 12.5 })
  b += chip(500, ly + 7, ELEMENTS[3], 8) + text(515, ly + 12, 'Element chips (the monsters on a space)', { size: 12.5 })
  b += text(30, ly + 38, 'Spaces touch the spaces above, below and beside them (no diagonals). Example shown: P1 on The Forgotten Stage with 2 moves left.', { size: 12, fill: SOFT, italic: true })
  write('board.svg', svg(760, ly + 56, b, 'The 4 by 4 board with starting corners and movement range'))
}

// ================================================================ elements
{
  let b = ''
  b += text(380, 38, 'How much damage a song deals to a monster', { size: 17, weight: 'bold', anchor: 'middle' })
  const cx0 = 214
  const cy0 = 120
  const cw = 130
  const ch = 52
  b += text(cx0 + (cw * 4) / 2, 78, "THE MONSTER'S ELEMENT", { size: 12, spacing: 3, anchor: 'middle', fill: SOFT })
  b += text(100, cy0 - 14, 'YOUR SONG', { size: 12, spacing: 3, anchor: 'middle', fill: SOFT })
  ELEMENTS.forEach((el, i) => {
    b += rect(cx0 + i * cw, 88, cw - 6, 32, { fill: el.color, stroke: INK })
    b += text(cx0 + i * cw + (cw - 6) / 2, 109, el.name, { size: 15, weight: 'bold', fill: '#fff', anchor: 'middle' })
    b += rect(30, cy0 + i * ch, 172, ch - 6, { fill: el.color, stroke: INK })
    b += text(116, cy0 + i * ch + 28, el.name, { size: 15, weight: 'bold', fill: '#fff', anchor: 'middle' })
  })
  const opposite = [3, 2, 1, 0] // Ballad<->Shanty, Folk<->Hymn
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const weak = r === c
      const immune = opposite[r] === c
      const x = cx0 + c * cw
      const y = cy0 + r * ch
      b += rect(x, y, cw - 6, ch - 6, { fill: weak ? '#f8e6b4' : immune ? '#e6d2cc' : '#fffdf6', stroke: weak ? GOLD : immune ? '#9a4a3a' : LINE, sw: weak || immune ? 2.5 : 1.3 })
      b += text(x + (cw - 6) / 2, y + 27, weak ? '×2  weak' : immune ? '×0  immune' : '×1', { size: weak || immune ? 15 : 14, weight: weak || immune ? 'bold' : 'normal', anchor: 'middle', fill: weak ? GOLD : immune ? '#9a4a3a' : SOFT })
    }
  }
  b += text(30, 350, 'A monster is named for its element. It is weak to songs of that element (double damage)', { size: 12.5, fill: SOFT })
  b += text(30, 368, 'and immune to songs of the opposite element (none). Opposites: Ballad and Shanty, Folk and Hymn.', { size: 12.5, fill: SOFT })
  write('elements.svg', svg(760, 392, b, 'Element matchup chart'))
}

// ============================================================ dice ladder
{
  let b = text(380, 36, 'The dice ladder', { size: 17, weight: 'bold', anchor: 'middle' })
  const types = ['d4', 'd8', 'd12', 'd20'] as const
  const costs = [T.newD4Cost, T.upgradeCostD8, T.upgradeCostD12, T.upgradeCostD20]
  let total = 0
  types.forEach((t, i) => {
    const x = 90 + i * 195
    total += costs[i]
    b += die(t, x, 120, 46 + i * 5, ELEMENTS[i === 0 ? 1 : i === 1 ? 0 : i === 2 ? 2 : 3].tint)
    b += text(x, 196, i === 0 ? `buy new: ${costs[i]} EXP` : `upgrade: ${costs[i]} EXP`, { size: 14, weight: 'bold', anchor: 'middle' })
    b += text(x, 214, `total so far ${total} EXP`, { size: 12, anchor: 'middle', fill: SOFT })
    if (i < 3) b += arrow(x + 62 + i * 5, 120, x + 133 - i * 3, 120, { stroke: GOLD, sw: 3 })
  })
  b += text(380, 252, 'To upgrade a die, pay the EXP and also spend a Studio chip of the same element as that die.', { size: 12.5, anchor: 'middle', fill: SOFT, italic: true })
  write('dice-ladder.svg', svg(760, 274, b, 'Dice ladder from d4 to d20 with EXP prices'))
}

// ============================================================= turn flow
{
  let b = text(380, 34, 'Your turn', { size: 17, weight: 'bold', anchor: 'middle' })
  const boxes = [
    ['MOVE', `up to ${T.maxMovesPerTurn} spaces`, 'Each step is one move. Take back the last step until you fight.'],
    ['FIGHT', `${T.maxFightsPerTurn} fight`, 'Optional. Play songs against the monsters where you stand.'],
    ['STUDIO', 'any time, not mid-fight', 'Spend EXP and Inspiration on dice and styles.'],
    ['END TURN', 'pass the lute', 'Unspent EXP is yours to keep for later.'],
  ]
  boxes.forEach(([h, sub, d], i) => {
    const x = 28 + i * 181
    b += rect(x, 56, 166, 170, { fill: '#fffdf6', stroke: INK, sw: 1.8 })
    b += rect(x, 56, 166, 36, { fill: INK, stroke: INK, sw: 1.8 })
    b += badge(x + 20, 74, i + 1)
    b += text(x + 40, 80, h, { size: 15, weight: 'bold', fill: PAPER, spacing: 1.5 })
    b += text(x + 83, 120, sub, { size: 13, weight: 'bold', anchor: 'middle', fill: GOLD })
    b += lines(x + 83, 146, wrap(d, 21), { size: 12, anchor: 'middle', fill: SOFT, lh: 15 })
    if (i < 3) b += arrow(x + 166, 141, x + 181, 141, { sw: 2.5 })
  })
  b += text(380, 254, 'Moving and the Studio can happen in any order around your fight. You only ever get one fight.', { size: 12.5, anchor: 'middle', fill: SOFT, italic: true })
  write('turn-flow.svg', svg(760, 276, b, 'The four steps of a turn'))
}

// ============================================================ roll anatomy
{
  let b = text(380, 34, 'Reading a roll: an example', { size: 17, weight: 'bold', anchor: 'middle' })
  const items: [string, string, string, string][] = [
    ['ROLL', '8', 'A d8 lands on its top face', '#f8e6b4'],
    ['CRIT', '+5', 'Top face: roll the die again and add it', '#f8e6b4'],
    ['STYLE', '+2', 'A style adds to the roll’s value', '#fffdf6'],
    ['ELEMENT', '×2', 'The monster is weak to your element', '#e3efe0'],
  ]
  items.forEach(([h, v, d, fill], i) => {
    const x = 30 + i * 175
    b += rect(x, 60, 150, 128, { fill, stroke: INK, sw: 1.8 })
    b += text(x + 75, 82, h, { size: 12, weight: 'bold', anchor: 'middle', spacing: 3, fill: SOFT })
    b += text(x + 75, 134, v, { size: 46, weight: 'bold', anchor: 'middle' })
    b += lines(x + 75, 160, wrap(d, 22), { size: 11.5, anchor: 'middle', fill: SOFT, lh: 14 })
    if (i < 3) b += text(x + 162, 134, i === 2 ? '×' : '+', { size: 26, weight: 'bold', anchor: 'middle', fill: GOLD })
  })
  b += rect(30, 218, 700, 54, { fill: INK, stroke: INK })
  b += text(380, 252, '(8 + 5 + 2) = 15,  then × 2  =  30 damage to the target', { size: 20, weight: 'bold', fill: PAPER, anchor: 'middle' })
  b += text(380, 296, 'Add the roll, the crit dice and any style bonus first, then multiply by the element, and round down.', { size: 12.5, anchor: 'middle', fill: SOFT, italic: true })
  write('roll-anatomy.svg', svg(760, 318, b, 'Worked example of a roll: 8 plus 5 plus 2 times 2 equals 30'))
}

// ============================================================ fight flow
{
  let b = ''
  const box = (x: number, y: number, w: number, h: number, head: string, body: string[], fill = '#fffdf6', hc = INK) => {
    b += rect(x, y, w, h, { fill, stroke: hc, sw: 1.8 })
    b += text(x + w / 2, y + 22, head, { size: 13.5, weight: 'bold', anchor: 'middle', fill: hc })
    b += lines(x + w / 2, y + 41, body, { size: 11.5, anchor: 'middle', fill: SOFT, lh: 14 })
  }
  b += text(380, 32, 'Anatomy of a fight', { size: 17, weight: 'bold', anchor: 'middle' })
  box(28, 52, 200, 66, 'START', ['Fight the monsters', 'on your space (once a turn)'], '#f8e6b4', GOLD)
  box(280, 52, 200, 66, '1 · PICK A TARGET', ['One monster at a time.', 'Songs are single-target.'])
  box(532, 52, 200, 66, '2 · PLAY A SONG', ['Tap a die to roll it.', 'One die per song.'])
  b += arrow(228, 85, 280, 85) + arrow(480, 85, 532, 85)
  box(532, 150, 200, 66, '3 · DAMAGE', ['Roll + crits + bonuses,', 'times the element, = damage'])
  b += arrow(632, 118, 632, 150)
  // branch
  b += arrow(532, 183, 480, 183)
  box(280, 150, 200, 66, 'Is the target at 0 HP?', ['Yes → tamed.', 'No → wounded.'], '#fffdf6', INK)
  b += arrow(380, 216, 142, 264) + arrow(380, 216, 380, 264) + arrow(380, 216, 618, 264)
  box(28, 264, 228, 92, 'TAMED', ['You earn its Fame.', 'The die comes back: that', 'song can be played again.'], '#e3efe0', '#3f8f4a')
  box(266, 264, 228, 92, 'WOUNDED', ['The song is spent this fight.', 'The target is locked in until', 'it is tamed or you retreat.'], '#fbf0d2', GOLD)
  box(504, 264, 228, 92, 'THEN, YOUR CHOICE', ['Reroll the song (1 Inspiration)', 'Play another song', 'Or retreat, any time'], '#fffdf6', INK)
  b += arrow(380, 356, 380, 384)
  box(110, 384, 540, 80, 'FIGHT ENDS', ['Every monster tamed: claim Fame & Glory. Clear the space, gain 1 Inspiration,', 'and radiate an element to the spaces next door.  Retreat: keep what you earned.', 'EXP is paid for every monster you wounded (all of them after a win).'], '#e3efe0', '#3f8f4a')
  write('fight-flow.svg', svg(760, 488, b, 'Flow of a fight'))
}

// ================================================================ monsters
{
  let b = text(380, 34, 'Monsters by level', { size: 17, weight: 'bold', anchor: 'middle' })
  const names = ['', 'Strong', 'Veteran', 'Legendary', 'Mythic']
  const hp = [1, 2, 3, 4, 5].map((l) => Math.max(1, Math.floor(T.monsterBaseHp * T.hpMultipliers[l - 1])))
  const rows = [
    ['Chips on the space', null],
    ['HP', hp],
    ['Fame for taming', T.monsterFameByLevel],
    ['EXP', [1, 2, 3, 4, 5].map((l) => l * T.monsterExpPerLevel)],
  ] as const
  const x0 = 172
  const cw = 112
  for (let l = 0; l < 5; l++) {
    b += rect(x0 + l * cw, 52, cw - 6, 52, { fill: INK, stroke: INK })
    b += text(x0 + l * cw + (cw - 6) / 2, 74, `Lv ${l + 1}`, { size: 15, weight: 'bold', fill: PAPER, anchor: 'middle' })
    b += text(x0 + l * cw + (cw - 6) / 2, 93, names[l] || 'plain', { size: 11, fill: '#e9dcbf', anchor: 'middle', italic: true })
  }
  rows.forEach(([label, vals], r) => {
    const y = 112 + r * 62
    b += rect(28, y, 136, 56, { fill: '#f0e5c8', stroke: LINE })
    b += text(40, y + 33, label, { size: 13, weight: 'bold' })
    for (let l = 0; l < 5; l++) {
      b += rect(x0 + l * cw, y, cw - 6, 56, { fill: '#fffdf6', stroke: LINE })
      const cx = x0 + l * cw + (cw - 6) / 2
      if (vals === null) {
        for (let k = 0; k <= l; k++) b += chip(cx - l * 8 + k * 16, y + 28, ELEMENTS[0], 7)
      } else b += text(cx, y + 36, String(vals[l]), { size: 24, weight: 'bold', anchor: 'middle', fill: r === 2 ? GOLD : INK })
    }
  })
  b += text(380, 372, 'A space with N chips of one element holds one Level N monster of that element (at most 5 chips of an element).', { size: 12.5, anchor: 'middle', fill: SOFT, italic: true })
  write('monsters.svg', svg(760, 394, b, 'Monster table: HP, Fame and EXP by level'))
}

// ================================================================== studio
{
  let b = ''
  b += panel(24, 24, 712, 372, 'THE STUDIO')
  // shelf
  b += text(48, 76, `Element shelf (${T.elementOfferCount} chips, refilled after every turn)`, { size: 13, weight: 'bold' })
  ;[0, 1, 2, 3].forEach((i) => (b += chip(62 + i * 44, 104, ELEMENTS[[1, 3, 0, 3][i]], 16)))
  b += text(48, 150, `Style shelf (${T.styleOfferCount} styles; a bard holds at most ${T.maxStyles})`, { size: 13, weight: 'bold' })
  ;[0, 1].forEach((i) => {
    b += rect(48 + i * 100, 160, 90, 52, { fill: '#fffdf6', stroke: GOLD, sw: 2 })
    b += text(48 + i * 100 + 45, 182, i ? 'Style B' : 'Style A', { size: 12, weight: 'bold', anchor: 'middle', fill: GOLD })
    b += text(48 + i * 100 + 45, 200, 'see Songbook', { size: 10.5, anchor: 'middle', fill: SOFT, italic: true })
  })
  // menu
  const menu: [string, string, string][] = [
    ['Buy a new d4', `${T.newD4Cost} EXP`, 'Take any shelf chip. The d4 of that element goes in an empty song, or replaces a die.'],
    ['Upgrade a die', `${T.upgradeCostD8} / ${T.upgradeCostD12} / ${T.upgradeCostD20} EXP`, 'To d8 / d12 / d20. Also spend a shelf chip of the die’s element.'],
    ['Buy Inspiration', `${T.inspirationBaseCost} EXP`, 'Each one costs the same, however many you buy.'],
    ['Learn a style', 'price on the card', 'Changes how all your songs play. Learning a third replaces one.'],
    ['Refresh the shelves', `${T.inspirationSpend} Inspiration`, 'Redraw all the element chips and both styles.'],
  ]
  menu.forEach(([h, c, d], i) => {
    const y = 56 + i * 66
    b += rect(340, y, 380, 60, { fill: '#fffdf6', stroke: LINE })
    b += text(352, y + 21, h, { size: 14, weight: 'bold' })
    b += text(708, y + 21, c, { size: 13, weight: 'bold', fill: GOLD, anchor: 'end' })
    b += lines(352, y + 38, wrap(d, 60), { size: 11, fill: SOFT, lh: 13 })
  })
  b += rect(48, 250, 260, 110, { fill: '#f6f0dd', stroke: LINE, dash: '5 4' })
  b += lines(60, 276, ['EXP is earned in fights.', 'Inspiration comes from clearing a', 'space, or from the Studio.', 'You keep both between turns.'], { size: 12, fill: SOFT, lh: 16 })
  write('studio.svg', svg(760, 420, b, 'The Studio: shelves and what you can buy'))
}

// ================================================================== rounds
{
  let b = text(380, 34, 'A round', { size: 17, weight: 'bold', anchor: 'middle' })
  const turns = ['Bard 1', 'Bard 2', 'Bard 3', 'Bard 4']
  turns.forEach((t, i) => {
    const x = 28 + i * 118
    b += rect(x, 58, 100, 60, { fill: ELEMENTS[i].tint, stroke: ELEMENTS[i].color, sw: 2 })
    b += text(x + 50, 84, t, { size: 14, weight: 'bold', anchor: 'middle' })
    b += text(x + 50, 103, 'takes a turn', { size: 11, anchor: 'middle', fill: SOFT })
    if (i < 3) b += arrow(x + 100, 88, x + 118, 88, { sw: 2.5 })
  })
  b += text(28, 138, '(With fewer bards, the round is shorter.)', { size: 11.5, fill: SOFT, italic: true })
  b += arrow(500, 88, 524, 88, { sw: 2.5 })
  b += rect(524, 50, 208, 150, { fill: '#f8e6b4', stroke: GOLD, sw: 2.2 })
  b += text(628, 74, 'ROUND END', { size: 14, weight: 'bold', anchor: 'middle', fill: GOLD, spacing: 2 })
  b += lines(628, 96, ['Every bard adds one chip of each', 'element (4 chips each), scattered', 'across different spaces.', 'All monsters reset to match chips.', 'The Studio shelf refills.'], { size: 11.5, anchor: 'middle', lh: 15 })
  ELEMENTS.forEach((el, i) => (b += chip(562 + i * 34, 186, el, 9)))
  b += rect(28, 218, 704, 78, { fill: '#fffdf6', stroke: INK, sw: 1.8 })
  b += text(44, 242, `The fame gate: ${T.fameFinalBossThreshold} Fame`, { size: 14, weight: 'bold' })
  b += lines(44, 262, ['When any bard reaches the gate, the table finishes the current round and plays ONE more full round.', 'There are no reinforcements at the end of that last round. Then the Final Showdown begins.'], { size: 12, fill: SOFT, lh: 16 })
  write('rounds.svg', svg(760, 318, b, 'Round structure and the fame gate'))
}

// ================================================================== fame bar
{
  let b = text(380, 34, 'The road to the Showdown', { size: 17, weight: 'bold', anchor: 'middle' })
  const X0 = 40
  const W = 680
  const gate = T.fameFinalBossThreshold
  b += rect(X0, 70, W, 26, { fill: '#fffdf6', stroke: INK, sw: 1.8 })
  b += `<rect x="${X0 + 1}" y="71" width="${W * 0.62}" height="24" rx="6" fill="${GOLD}" opacity="0.55"/>`
  for (let f = 0; f <= gate; f += 25) {
    const x = X0 + (f / gate) * W
    b += line(x, 96, x, 106, { stroke: INK, sw: 1.3 })
    b += text(x, 122, String(f), { size: 11, anchor: 'middle', fill: SOFT })
  }
  b += line(X0 + W, 56, X0 + W, 110, { stroke: '#9a4a3a', sw: 3 })
  b += text(X0 + W, 50, `${gate} · the gate`, { size: 13, weight: 'bold', anchor: 'end', fill: '#9a4a3a' })
  const lv = T.monsterFameByLevel
  b += text(380, 158, 'Fame per tamed monster', { size: 13, weight: 'bold', anchor: 'middle' })
  lv.forEach((f, i) => {
    const x = 72 + i * 138
    b += rect(x - 56, 172, 112, 56, { fill: '#fffdf6', stroke: LINE })
    b += text(x, 196, `Lv ${i + 1}`, { size: 12, anchor: 'middle', fill: SOFT })
    b += text(x, 220, `+${f}`, { size: 22, weight: 'bold', anchor: 'middle', fill: GOLD })
  })
  write('fame.svg', svg(760, 250, b, 'Fame bar with the gate and Fame by monster level'))
}

// ============================================================== showdown
{
  let b = text(380, 34, 'The Final Showdown: three verses', { size: 17, weight: 'bold', anchor: 'middle' })
  for (let v = 0; v < T.showdownTurns; v++) {
    const x = 24 + v * 238
    b += panel(x, 54, 222, 232, `VERSE ${v + 1}`)
    b += lines(x + 111, 100, ['Each bard performs once, in turn:', 'pick ONE element.', 'Every die of that element', 'in your setlist rolls together.', 'The total is your fandom.'], { size: 12, anchor: 'middle', lh: 16 })
    b += rect(x + 14, 190, 194, 46, { fill: v === 0 ? '#e3efe0' : '#e6d2cc', stroke: v === 0 ? '#3f8f4a' : '#9a4a3a', sw: 1.8 })
    b += lines(x + 111, 210, v === 0 ? ['The Silence is not immune', 'to anything yet.'] : ['The Silence is IMMUNE (×0) to the', 'element of the last verse’s best.'], { size: 11, anchor: 'middle', lh: 14 })
    b += text(x + 111, 262, 'No weakness, ever: ×1 or ×0.', { size: 11, anchor: 'middle', fill: SOFT, italic: true })
    if (v < T.showdownTurns - 1) b += arrow(x + 222, 170, x + 238, 170, { sw: 2.5 })
  }
  b += rect(24, 304, 712, 58, { fill: INK, stroke: INK })
  b += text(380, 330, 'After verse 3, each bard’s fandom is added to their Fame.', { size: 16, weight: 'bold', fill: PAPER, anchor: 'middle' })
  b += text(380, 351, 'Highest Fame wins.', { size: 13, fill: '#e9dcbf', anchor: 'middle' })
  write('showdown.svg', svg(760, 384, b, 'Three verses of the Final Showdown'))
}

// ================================================================= scoring
{
  let b = text(380, 34, 'Scoring: an example', { size: 17, weight: 'bold', anchor: 'middle' })
  const rows = [
    { n: 'Ava', board: 214, fans: 61, c: ELEMENTS[0] },
    { n: 'Ben', board: 201, fans: 84, c: ELEMENTS[1] },
    { n: 'Cam', board: 188, fans: 70, c: ELEMENTS[2] },
  ]
  const scale = 2.0
  rows.forEach((r, i) => {
    const y = 66 + i * 60
    b += text(30, y + 26, r.n, { size: 15, weight: 'bold' })
    b += rect(90, y, r.board * scale, 38, { fill: r.c.tint, stroke: r.c.color, sw: 1.6, r: 4 })
    b += text(90 + (r.board * scale) / 2, y + 25, `${r.board} board Fame`, { size: 12.5, anchor: 'middle' })
    b += rect(90 + r.board * scale, y, r.fans * scale, 38, { fill: r.c.color, stroke: r.c.color, r: 4 })
    b += text(90 + r.board * scale + (r.fans * scale) / 2, y + 25, `+${r.fans}`, { size: 13, weight: 'bold', fill: '#fff', anchor: 'middle' })
    b += text(90 + (r.board + r.fans) * scale + 10, y + 26, `= ${r.board + r.fans}`, { size: 17, weight: 'bold' })
  })
  b += text(380, 258, 'Ben wins on 285 Fame (201 board + 84 fandom), though Ava led on the board.', { size: 12.5, anchor: 'middle', fill: SOFT, italic: true })
  b += text(380, 276, 'Tied on Fame? The bard with more Showdown fandom wins.', { size: 12.5, anchor: 'middle', fill: SOFT, italic: true })
  write('scoring.svg', svg(760, 300, b, 'Scoring example: board Fame plus Showdown fandom'))
}

// ===================================================== Appendix A (styles)
{
  const md = new URL('../rulebook/RULEBOOK.md', import.meta.url).pathname
  const text = readFileSync(md, 'utf8')
  const start = '<!-- STYLES:START -->'
  const end = '<!-- STYLES:END -->'
  const rows = ALL_STYLE_IDS.map((id) => `| **${STYLES[id].name}** | ${styleCost(id)} | ${styleRule(id)} |`)
  const table = ['| Style | EXP | What it does |', '|---|---|---|', ...rows].join('\n')
  const a = text.indexOf(start)
  const b = text.indexOf(end)
  if (a === -1 || b === -1) throw new Error('RULEBOOK.md is missing the STYLES markers')
  writeFileSync(md, `${text.slice(0, a + start.length)}\n${table}\n${text.slice(b)}`)
}

console.log(`Wrote the rulebook visuals to ${OUT} and refreshed Appendix A`)
