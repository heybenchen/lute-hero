import { describe, it, expect } from 'vitest'
import { applyAction, ActionCtx } from '../engine/reducer'
import { createInitialEngineState, EngineState } from '../engine/state'
import { mulberry32 } from '../engine/rng'
import { Bot } from './bot'
import { SmartBot } from './smartBot'

function start(seed: number): { state: EngineState; ctx: ActionCtx } {
  const rng = mulberry32(seed)
  const ctx: ActionCtx = { rng, actor: { kind: 'hotseat' } }
  const r = applyAction(createInitialEngineState(), {
    type: 'START_GAME',
    playerConfigs: [{ name: 'A', starterGenre: 'Ballad' }, { name: 'B', starterGenre: 'Folk' }],
  }, ctx)
  if (!r.ok) throw new Error(r.message)
  return { state: r.state, ctx }
}

describe('smart bot', () => {
  it('plays a whole game, showdown included, through the engine', () => {
    const { state, ctx } = start(3)
    const bot = new SmartBot(state, ctx.rng)
    for (let t = 0; t < 100 && bot.state.phase === 'main'; t++) bot.takeTurn()
    expect(bot.state.showdownActive).toBe(true)
    for (let t = 0; t < 20 && !bot.state.showdownComplete; t++) bot.playShowdownTurn()
    expect(bot.state.showdownComplete).toBe(true)
    expect(Object.values(bot.state.showdownFandom).every((f) => f >= 0)).toBe(true)
  })

  it('out-scores the baseline bot head to head', () => {
    let smartFame = 0
    let baseFame = 0
    // 40 games: the true margin is about 1.2x, and 16 games was too noisy to hold a 1.15x bar
    for (let g = 0; g < 40; g++) {
      const { state, ctx } = start(100 + g)
      const smartSeat = g % 2 // alternate who goes first
      const smart = new SmartBot(state, ctx.rng)
      const base = new Bot(state, ctx.rng)
      let s = state
      for (let t = 0; t < 100 && s.phase === 'main'; t++) {
        const bot = s.currentTurnPlayerIndex === smartSeat ? smart : base
        bot.state = s
        bot.takeTurn()
        s = bot.state
      }
      smartFame += s.players[smartSeat].fame
      baseFame += s.players[1 - smartSeat].fame
    }
    expect(smartFame).toBeGreaterThan(baseFame * 1.15)
  })
})
