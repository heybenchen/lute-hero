/**
 * Where does Inspiration go? Plays normal smart-bot games (genres on sale) and
 * counts, per bard per game: Inspiration earned (clearing a space), bought with
 * EXP, spent on fight rerolls / Studio refreshes / showdown rerolls, and left
 * unspent when the game ends.
 *
 *   npx tsx scripts/inspiration-audit.ts [games=200]
 *   TUNE='{"inspirationCostStep":0}' npx tsx scripts/inspiration-audit.ts 200
 *   PARAMS='{"inspirationValue":3}' npx tsx scripts/inspiration-audit.ts 200
 */
import { applyAction, ActionCtx } from '../src/engine/reducer.js'
import { createInitialEngineState } from '../src/engine/state.js'
import { SmartBot, SmartParams } from '../src/sim/smartBot.js'
import { mulberry32 } from '../src/engine/rng.js'
import { ALL_ELEMENTS } from '../src/data/elementTheme.js'
import type { GameAction } from '../src/engine/actions.js'

const GAMES = Number(process.argv[2] ?? 200)
const PLAYERS = 3
const TUNE = JSON.parse(process.env.TUNE ?? '{}')
const PARAMS: Partial<SmartParams> = JSON.parse(process.env.PARAMS ?? '{}')

const acc = { bought: 0, expOnInsp: 0, fightReroll: 0, shelfRefresh: 0, showdownReroll: 0, leftAtShowdown: 0, leftAtEnd: 0, earned: 0, fame: 0, fandom: 0, wins: 0 }
for (let g = 0; g < GAMES; g++) {
  const rng = mulberry32(7000 + g)
  const ctx: ActionCtx = { rng, actor: { kind: 'hotseat' } }
  const elements = [...ALL_ELEMENTS].sort(() => rng() - 0.5).slice(0, PLAYERS)
  const init = createInitialEngineState()
  const r = applyAction({ ...init, tunables: { ...init.tunables, ...TUNE } }, { type: 'START_GAME', playerConfigs: elements.map((x, i) => ({ name: `B${i}`, starterElement: x })) }, ctx)
  if (!r.ok) throw new Error(r.message)
  const bot = new SmartBot(r.state, rng, PARAMS)
  const counts = { bought: 0, expOnInsp: 0, fightReroll: 0, shelfRefresh: 0, showdownReroll: 0 }
  const realAct = bot.act.bind(bot)
  bot.act = (a: GameAction) => {
    const before = bot.state
    const ok = realAct(a)
    if (ok) {
      if (a.type === 'BUY_INSPIRATION') {
        counts.bought++
        const p0 = before.players[before.currentTurnPlayerIndex]
        const p1 = bot.state.players[before.currentTurnPlayerIndex]
        counts.expOnInsp += p0.exp - p1.exp
      } else if (a.type === 'REROLL_SONG' && !('bebop' in a && a.bebop)) counts.fightReroll++
      else if (a.type === 'REFRESH_ELEMENT_OFFERS' || a.type === 'REFRESH_GENRE_OFFERS') counts.shelfRefresh++
      else if (a.type === 'REROLL_SHOWDOWN_SONG') counts.showdownReroll++
    }
    return ok
  }
  for (let t = 0; t < 40 * PLAYERS && bot.state.phase === 'main'; t++) bot.takeTurn()
  const atShowdown = bot.state.players.reduce((s, p) => s + p.inspiration, 0)
  for (let t = 0; t < 40 && bot.state.showdownActive && !bot.state.showdownComplete; t++) bot.playShowdownTurn()
  const left = bot.state.players.reduce((s, p) => s + p.inspiration, 0)
  const spent = counts.fightReroll + counts.shelfRefresh + counts.showdownReroll
  acc.bought += counts.bought
  acc.expOnInsp += counts.expOnInsp
  acc.fightReroll += counts.fightReroll
  acc.shelfRefresh += counts.shelfRefresh
  acc.showdownReroll += counts.showdownReroll
  acc.leftAtShowdown += atShowdown
  acc.leftAtEnd += left
  acc.earned += spent + left - counts.bought
  acc.fandom += Object.values(bot.state.showdownFandom).reduce((s, x) => s + x, 0)
}
const per = (x: number) => (x / GAMES / PLAYERS).toFixed(2)
console.log(`${GAMES} games, per bard per game${process.env.TUNE ? ' ' + process.env.TUNE : ''}${process.env.PARAMS ? ' ' + process.env.PARAMS : ''}:`)
console.log(`  earned from clears ${per(acc.earned)} | bought ${per(acc.bought)} (EXP spent ${per(acc.expOnInsp)})`)
console.log(`  spent: fight rerolls ${per(acc.fightReroll)} | shelf refreshes ${per(acc.shelfRefresh)} | showdown rerolls ${per(acc.showdownReroll)}`)
console.log(`  held at the showdown start ${per(acc.leftAtShowdown)} | left at the end ${per(acc.leftAtEnd)} | table showdown fandom ${(acc.fandom / GAMES).toFixed(0)}`)
