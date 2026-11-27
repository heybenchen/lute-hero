import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_TUNABLES as T } from './data/tunables'
import { ALL_STYLE_IDS, STYLES, styleCost, styleRule } from './data/styles'

/**
 * rulebook/RULEBOOK.md quotes the game's numbers. This keeps it honest: when a
 * balance number changes, this fails and says what to update. Regenerate the
 * diagrams and the genre list with:  npx tsx scripts/rulebook-visuals.ts
 */
const rulebookDir = resolve(process.cwd(), 'rulebook')
const md = readFileSync(resolve(rulebookDir, 'RULEBOOK.md'), 'utf8')

describe('rulebook', () => {
  it('has every section the rules promise', () => {
    for (const h of ['1. Introduction', '2. Setup', '3. Turns', '4. End of Round', '5. Concerts', '6. The Studio', '7. Monsters', '8. The Final Showdown', '9. Scoring', 'Appendix A: The Genres', 'Appendix B: Edge Cases']) {
      expect(md).toContain(`## ${h}`)
    }
  })

  it('ends with edge cases, then a one-page quick reference as the last page', () => {
    expect(md).toContain('## Appendix B: Edge Cases')
    const lastPage = md.split('page-break-after: always').pop() ?? ''
    expect(lastPage).toContain('## Quick Reference')
  })

  it('references only diagrams that exist', () => {
    const imgs = [...md.matchAll(/src="(img\/[a-z-]+\.svg)"/g)].map((m) => m[1])
    expect(imgs.length).toBeGreaterThanOrEqual(4)
    for (const img of imgs) expect(existsSync(resolve(rulebookDir, img)), img).toBe(true)
  })

  it('quotes the monster table from the game', () => {
    for (let l = 1; l <= 5; l++) {
      const hp = Math.max(1, Math.floor(T.monsterBaseHp * T.hpMultipliers[l - 1]))
      const row = `| ${l} | ${hp} | ${T.monsterFameByLevel[l - 1]} | ${l * T.monsterExpPerLevel} |`
      expect(md, `monster table row for level ${l}`).toContain(row)
    }
  })

  it('quotes the setup, turn and pricing numbers', () => {
    expect(md).toContain(`**${T.fameFinalBossThreshold} Fame**`)
    expect(md).toContain(`**1 Inspiration**`.replace('1', String(T.startingInspiration)))
    expect(md).toContain(`**${T.chipsPerElementPerPlayer} element cubes of each element for every bard**`)
    expect(md).toContain(`Draw **${T.elementOfferCount} cubes**`)
    expect(md).toContain(`**Move** up to **${T.maxMovesPerTurn}** spaces`)
    expect(md).toContain(`d8: ${T.upgradeCostD8} EXP, d12: ${T.upgradeCostD12} EXP, d20: ${T.upgradeCostD20} EXP`)
    expect(md).toContain(`| **Buy a new d4** | ${T.newD4Cost} EXP |`)
    expect(md).toContain(`| **Buy Inspiration** | ${T.inspirationBaseCost} EXP each |`)
    expect(md).toContain(`**${T.maxTagsPerGenre} chips of the same element**`)
    expect(T.showdownTurns).toBe(3) // the book says "three verses" throughout
    expect(md).toContain(`**rounded down to a multiple of ${T.showdownFameRounding}**`)
    expect(md).toContain(`- **Beat it:** take **+${T.showdownCrownBeatBonus} Fame**.`)
    expect(md).toContain(`- **Match it exactly:** take **+${T.showdownCrownTieBonus} Fame**.`)
    expect(T.showdownFandomMultiplier).toBe(1) // "take their fandom as Fame"
    expect(T.maxStyles).toBe(2) // "hold 2 genres"
  })

  it('talks about concerts, never fighting', () => {
    const rules = md.replace(/<!--[\s\S]*?-->/g, '')
    expect(rules).not.toMatch(/\b(fight|tam(e|ed|es|ing)|wound(ed)?|damage|attack|HP)\b/i)
  })

  it('lists every genre with its live rule and price (Appendix A is generated)', () => {
    for (const id of ALL_STYLE_IDS) {
      const row = `| **${STYLES[id].name}** | ${styleCost(id)} | ${styleRule(id)} |`
      expect(md, `Appendix A row for ${STYLES[id].name}; run: npx tsx scripts/rulebook-visuals.ts`).toContain(row)
    }
  })
})
