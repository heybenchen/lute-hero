import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_TUNABLES as T } from './data/tunables'
import { ALL_STYLE_IDS, STYLES, styleCost, styleRule } from './data/styles'

/**
 * rulebook/RULEBOOK.md quotes the game's numbers. This keeps it honest: when a
 * balance number changes, this fails and says what to update. Regenerate the
 * diagrams and the style list with:  npx tsx scripts/rulebook-visuals.ts
 */
const rulebookDir = resolve(process.cwd(), 'rulebook')
const md = readFileSync(resolve(rulebookDir, 'RULEBOOK.md'), 'utf8')

describe('rulebook', () => {
  it('has every section the rules promise', () => {
    for (const h of ['1. Introduction', '2. Setup', '3. Rounds', '4. Turns', '5. Playing Songs', '6. The Studio', '7. Monster Rules', '8. Fame', '9. The Final Showdown', '10. Scoring']) {
      expect(md).toContain(`## ${h}`)
    }
  })

  it('references only diagrams that exist', () => {
    const imgs = [...md.matchAll(/src="(img\/[a-z-]+\.svg)"/g)].map((m) => m[1])
    expect(imgs.length).toBeGreaterThan(10)
    for (const img of imgs) expect(existsSync(resolve(rulebookDir, img)), img).toBe(true)
  })

  it('quotes the monster table from the game', () => {
    const names = ['(none)', 'Strong', 'Veteran', 'Legendary', 'Mythic']
    for (let l = 1; l <= 5; l++) {
      const hp = Math.max(1, Math.floor(T.monsterBaseHp * T.hpMultipliers[l - 1]))
      const row = `| ${l} | ${names[l - 1]} | ${hp} | ${T.monsterFameByLevel[l - 1]} | ${l * T.monsterExpPerLevel} |`
      expect(md, `monster table row for level ${l}`).toContain(row)
    }
  })

  it('quotes the setup, turn and pricing numbers', () => {
    expect(md).toContain(`**${T.fameFinalBossThreshold} Fame**`)
    expect(md).toContain(`**1 Inspiration**`.replace('1', String(T.startingInspiration)))
    expect(md).toContain(`**${T.chipsPerElementPerPlayer} element chips of each element for every bard**`)
    expect(md).toContain(`Draw **${T.elementOfferCount} chips**`)
    expect(md).toContain(`### 1. Move: up to ${T.maxMovesPerTurn} spaces`)
    expect(md).toContain(`d8: ${T.upgradeCostD8} EXP, d12: ${T.upgradeCostD12} EXP, d20: ${T.upgradeCostD20} EXP`)
    expect(md).toContain(`| **Buy a new d4** | ${T.newD4Cost} EXP |`)
    expect(md).toContain(`| **Buy Inspiration** | ${T.inspirationBaseCost} EXP each |`)
    expect(md).toContain(`**${T.maxTagsPerGenre} chips of the same element**`)
    expect(md).toContain(`Fame for taming`)
    expect(md).toContain(`**5, 10, 25, 50, 75**`.replace('5, 10, 25, 50, 75', T.monsterFameByLevel.join(', ')))
    expect(T.showdownTurns).toBe(3) // the book says "three verses" throughout
    expect(T.maxStyles).toBe(2) // "hold 2 styles"
  })

  it('lists every style with its live rule and price (Appendix A is generated)', () => {
    for (const id of ALL_STYLE_IDS) {
      const row = `| **${STYLES[id].name}** | ${styleCost(id)} | ${styleRule(id)} |`
      expect(md, `Appendix A row for ${STYLES[id].name}; run: npx tsx scripts/rulebook-visuals.ts`).toContain(row)
    }
  })
})
