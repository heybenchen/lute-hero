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
/** A titled panel. */
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
  // A cross: opposites sit at the ends of the same bar.
  let b = ''
  const W = 560
  const cx = W / 2
  const cy = 222
  const arm = 128
  b += text(cx, 34, 'Elements: weak and immune', { size: 17, weight: 'bold', anchor: 'middle' })
  b += line(cx, cy - arm, cx, cy + arm, { stroke: '#9a4a3a', sw: 6 })
  b += line(cx - arm * 1.45, cy, cx + arm * 1.45, cy, { stroke: '#9a4a3a', sw: 6 })
  b += circle(cx, cy, 30, { fill: '#e6d2cc', stroke: '#9a4a3a', sw: 2.5 })
  b += text(cx, cy + 6, '×0', { size: 19, weight: 'bold', anchor: 'middle', fill: '#9a4a3a' })
  const spots: [number, number][] = [[cx, cy - arm], [cx - arm * 1.45, cy], [cx + arm * 1.45, cy], [cx, cy + arm]]
  // ELEMENTS order: Ballad, Folk, Hymn, Shanty -> top, left, right, bottom
  ELEMENTS.forEach((el, i) => {
    const [x, y] = spots[i]
    b += circle(x, y, 40, { fill: el.color, stroke: INK, sw: 2 })
    b += text(x, y + 5, el.name, { size: 15, weight: 'bold', fill: '#fff', anchor: 'middle' })
    const vertical = i === 0 || i === 3
    b += vertical
      ? text(x + 52, y + 5, '×2 to itself', { size: 13, weight: 'bold', fill: GOLD })
      : text(x, y + 62, '×2 to itself', { size: 13, weight: 'bold', anchor: 'middle', fill: GOLD })
  })
  b += text(cx, 420, 'Same element: ×2 (weak).  Across the cross: ×0 (immune).  Next door: ×1.', { size: 13.5, anchor: 'middle', fill: INK })
  write('elements.svg', svg(W, 440, b, 'Element cross: a monster is weak to its own element and immune to the opposite one'))
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
  b += text(380, 252, 'To upgrade a die, pay the EXP and also spend a Studio cube of the same element as that die.', { size: 12.5, anchor: 'middle', fill: SOFT, italic: true })
  write('dice-ladder.svg', svg(760, 274, b, 'Dice ladder from d4 to d20 with EXP prices'))
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
