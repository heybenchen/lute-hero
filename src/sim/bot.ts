/**
 * A heuristic bard that plays full games through the real engine
 * (`applyAction`), used to measure what bards realistically own at each round
 * (`scripts/sim-round-profiles.ts` → `src/data/roundProfiles.ts`).
 *
 * The policy is a sensible-player greedy, not an optimal one:
 *  - Move (up to the move limit) to the reachable space whose monsters its
 *    dice can best tame, weighting Fame by how likely the kill is.
 *  - Fight it: each play is the song/target pair most likely to land a kill
 *    (smallest sufficient die), else the biggest expected hit. Rallying Cry
 *    and Nimble Fingers are used when ready; Inspiration rerolls a missed kill
 *    while it holds more than 2. Featured songs from bards on the space go
 *    last, once its own songs are out.
 *  - Shop: fill empty song slots with new d4s, learn affordable styles while
 *    it has room, upgrade its biggest upgradable die on a matching chip, and
 *    bank spare EXP as Inspiration (up to 3).
 *
 * Every helper here uses only shared code via relative imports.
 */
import { applyAction, ActionCtx } from '../engine/reducer.js'
import { EngineState, createInitialEngineState } from '../engine/state.js'
import { GameAction } from '../engine/actions.js'
import { Dice, DiceType, Genre, Monster, Player, Rng, Song } from '../types/index.js'
import { getGenreMultiplier } from '../game-logic/combat/damageCalculator.js'
import { calculateMonsterFameValue } from '../game-logic/fame/calculator.js'
import { getValidMoves } from '../game-logic/board/graphBuilder.js'
import { getTunables, withTunables } from '../data/tunables.js'
import { getUpgradeCost, newD4Cost, getInspirationCost } from '../data/draftCards.js'
import { styleCost, maxStyles } from '../data/styles.js'
import { ALL_GENRES } from '../data/genreTheme.js'
import type { BardSnapshot } from '../data/roundProfiles.js'

const FACES: Record<DiceType, number> = { d4: 4, d8: 8, d12: 12, d20: 20 }

/** Mean of a die including its crit cascade (top face rolls again). */
export function expectedDieValue(type: DiceType): number {
  const n = FACES[type]
  return ((n + 1) / 2) * (n / (n - 1))
}

function songDie(song: Song): Dice | null {
  return song.slots.find((s) => s.dice)?.dice ?? null
}

function expectedHit(song: Song, monster: Monster): number {
  const die = songDie(song)
  return die ? expectedDieValue(die.type) * getGenreMultiplier(die.genre, monster) : 0
}

export class Bot {
  state: EngineState
  private ctx: ActionCtx
  private refreshedThisTurn = false

  constructor(state: EngineState, rng: Rng) {
    this.state = state
    this.ctx = { rng, actor: { kind: 'hotseat' } }
  }

  /** Apply an action; returns false (and changes nothing) if it was refused. */
  act(action: GameAction): boolean {
    const result = applyAction(this.state, action, this.ctx)
    if (!result.ok) return false
    this.state = result.state
    return true
  }

  private get me(): Player {
    return this.state.players[this.state.currentTurnPlayerIndex]
  }

  /** Read tunables the way the engine does (they live in the state). */
  private tuned<T>(fn: () => T): T {
    return withTunables(this.state.tunables, fn)
  }

  /** Play the current bard's whole turn. */
  takeTurn(): void {
    const playerId = this.me.id
    this.move()
    this.fight()
    this.shop()
    if (this.state.phase === 'main' && this.state.players[this.state.currentTurnPlayerIndex]?.id === playerId) {
      this.act({ type: 'END_TURN' })
    }
  }

  private spaceScore(spaceId: number, me: Player): number {
    const space = this.state.spaces.find((s) => s.id === spaceId)!
    const songs = me.songs.filter((s) => songDie(s))
    return space.monsters.reduce((sum, m) => {
      const hits = songs.map((s) => expectedHit(s, m)).filter((h) => h > 0)
      if (hits.length === 0) return sum
      const total = hits.reduce((a, b) => a + b, 0)
      return sum + calculateMonsterFameValue(m.level) * Math.min(1, total / m.currentHP)
    }, 0)
  }

  private move(): void {
    const me = this.me
    const maxMoves = this.tuned(() => getTunables().maxMovesPerTurn)
    // Breadth-first over reachable spaces, remembering the first step
    const reach = new Map<number, number[]>([[me.position, []]])
    let frontier = [me.position]
    for (let d = 0; d < maxMoves; d++) {
      const next: number[] = []
      for (const from of frontier) {
        for (const to of getValidMoves(from, this.state.spaces)) {
          if (reach.has(to.id)) continue
          reach.set(to.id, [...reach.get(from)!, to.id])
          next.push(to.id)
        }
      }
      frontier = next
    }
    let best = me.position
    let bestScore = this.tuned(() => this.spaceScore(me.position, me))
    for (const id of reach.keys()) {
      const score = this.tuned(() => this.spaceScore(id, me))
      if (score > bestScore + 0.01) {
        best = id
        bestScore = score
      }
    }
    for (const step of reach.get(best)!) {
      if (!this.act({ type: 'MOVE', playerId: me.id, toSpaceId: step })) break
    }
  }

  private fight(): void {
    const me = this.me
    const space = this.state.spaces.find((s) => s.id === me.position)!
    if (space.monsters.length === 0 || this.tuned(() => this.spaceScore(space.id, me)) <= 0) return
    if (!this.act({ type: 'START_COMBAT', playerId: me.id })) return

    for (let guard = 0; guard < 40 && this.state.combat.isActive; guard++) {
      const combat = this.state.combat
      const fighter = this.me
      const alive = combat.monsters.filter((m) => m.currentHP > 0)
      if (alive.length === 0) break

      // Rallying Cry: refresh the best spent song
      if (combat.rallyReady && fighter.styles.includes('staccato') && !combat.stylesUsed.includes('staccato')) {
        const spent = fighter.songs
          .filter((s) => combat.spentSongIds.includes(s.id) && songDie(s))
          .sort((a, b) => expectedDieValue(songDie(b)!.type) - expectedDieValue(songDie(a)!.type))[0]
        if (spent && this.act({ type: 'RALLY_SONG', songId: spent.id })) continue
      }

      const ready = fighter.songs.filter((s) => songDie(s) && !combat.spentSongIds.includes(s.id))
      const pick = this.tuned(() => bestPlay(ready, alive))
      if (pick) {
        const hpBefore = alive.find((m) => m.id === pick.monster.id)!.currentHP
        if (!this.act({ type: 'PLAY_SONG', songId: pick.song.id, targetMonsterId: pick.monster.id })) break
        this.maybeReroll(pick.monster.id, hpBefore)
        continue
      }

      // Own songs are out: borrow featured songs from bards on this space
      const guests = this.state.players.filter(
        (p) => p.id !== fighter.id && p.position === combat.spaceId && !combat.featuredPlayerIds.includes(p.id)
      )
      let featured = false
      for (const guest of guests) {
        const songs = guest.songs.filter((s) => songDie(s))
        const guestPick = this.tuned(() => bestPlay(songs, alive))
        if (!guestPick) continue
        featured = this.act({
          type: 'PLAY_FEATURED_SONG',
          guestPlayerId: guest.id,
          songId: guestPick.song.id,
          targetMonsterId: guestPick.monster.id,
        })
        if (featured) break
      }
      if (!featured) break
    }

    const spread = this.mainElement(this.me)
    this.act({ type: 'END_COMBAT', spreadGenre: spread })
  }

  /** After a play that missed its kill: free Nimble Fingers, else Inspiration while it holds more than 2. */
  private maybeReroll(monsterId: string, hpBefore: number): void {
    for (let i = 0; i < 3; i++) {
      const combat = this.state.combat
      const target = combat.monsters.find((m) => m.id === monsterId)
      if (!target || target.currentHP <= 0) return
      const lastId = combat.lastPlayedSongId
      if (!lastId || !combat.spentSongIds.includes(lastId)) return
      const song = this.me.songs.find((s) => s.id === lastId)!
      // Only worth it when a reroll can plausibly finish the target
      if (expectedHit(song, { ...target, currentHP: hpBefore }) < hpBefore * 0.6) return
      if (this.act({ type: 'REROLL_SONG', rubato: true })) continue
      if (this.me.inspiration > 2 && this.act({ type: 'REROLL_SONG' })) continue
      return
    }
  }

  private mainElement(player: Player): Genre {
    const weight = new Map<Genre, number>()
    for (const song of player.songs) {
      const die = songDie(song)
      if (die) weight.set(die.genre, (weight.get(die.genre) ?? 0) + expectedDieValue(die.type))
    }
    let best: Genre = player.starterGenre
    for (const [genre, w] of weight) if (w > (weight.get(best) ?? 0)) best = genre
    return best
  }

  private shop(): void {
    const me = this.me
    if (!this.act({ type: 'OPEN_STUDIO', playerId: me.id })) return
    this.refreshedThisTurn = false
    for (let guard = 0; guard < 30; guard++) {
      if (!this.shopStep()) break
    }
    this.act({ type: 'CLOSE_STUDIO' })
  }

  /** One purchase or placement; false when nothing worthwhile is left. */
  private shopStep(): boolean {
    const me = this.me
    const pending = this.state.pendingRewards[me.id] ?? []
    const emptySong = me.songs.find((s) => !songDie(s))

    // Place a bought die
    const reward = pending.find((r) => r.kind === 'die')
    if (reward && emptySong) {
      return this.act({ type: 'SLOT_DIE_REWARD', rewardId: reward.id, songId: emptySong.id, slotIndex: 0 })
    }

    const offers = this.state.elementOffers
    const d4Cost = this.tuned(() => newD4Cost())
    // Fill an empty song with a new d4, preferring its strongest element
    if (emptySong && !reward && me.exp >= d4Cost && offers.length > 0) {
      const main = this.mainElement(me)
      const idx = Math.max(0, offers.indexOf(main))
      return this.act({ type: 'BUY_DIE', offerIndex: idx })
    }

    // Learn a style while there is room
    const cap = this.tuned(() => maxStyles())
    if (me.styles.length < cap) {
      const idx = this.state.styleOffers.findIndex((id) => !me.styles.includes(id) && me.exp >= this.tuned(() => styleCost(id)))
      if (idx !== -1 && this.act({ type: 'BUY_STYLE', offerIndex: idx })) return true
    }

    // Upgrade the biggest die that a chip on offer matches
    const dice = me.songs
      .map(songDie)
      .filter((d): d is Dice => !!d)
      .sort((a, b) => FACES[b.type] - FACES[a.type])
    for (const die of dice) {
      const cost = this.tuned(() => getUpgradeCost(die.type))
      if (cost === null || me.exp < cost) continue
      const idx = offers.indexOf(die.genre)
      if (idx === -1) continue
      if (this.act({ type: 'UPGRADE_DIE', offerIndex: idx, diceId: die.id })) return true
    }

    // EXP piling up with no matching chip: spend Inspiration on a fresh draw (once a turn)
    const cheapestUpgrade = Math.min(...dice.map((d) => this.tuned(() => getUpgradeCost(d.type)) ?? Infinity))
    if (!this.refreshedThisTurn && me.inspiration >= 2 && me.exp >= cheapestUpgrade * 2) {
      this.refreshedThisTurn = true
      if (this.act({ type: 'REFRESH_ELEMENT_OFFERS' })) return true
    }

    // Bank spare EXP as Inspiration
    const inspCost = this.tuned(() => getInspirationCost(me.inspirationBoughtThisTurn))
    if (me.inspiration < 3 && me.exp >= inspCost && me.exp - inspCost >= 0) {
      // Keep enough to upgrade next turn if a die is waiting on a chip
      if (me.exp - inspCost >= cheapestUpgrade || me.exp >= 6) return this.act({ type: 'BUY_INSPIRATION' })
    }
    return false
  }
}

/** The song/target pair to play: a likely kill with the smallest sufficient die, else the biggest expected hit. */
function bestPlay(songs: Song[], alive: Monster[]): { song: Song; monster: Monster } | null {
  let kill: { song: Song; monster: Monster; score: number } | null = null
  let hit: { song: Song; monster: Monster; score: number } | null = null
  for (const song of songs) {
    for (const monster of alive) {
      const exp = expectedHit(song, monster)
      if (exp <= 0) continue
      if (exp >= monster.currentHP) {
        // Prefer the most valuable kill, then the smallest die that makes it
        const score = calculateMonsterFameValue(monster.level) * 100 - exp
        if (!kill || score > kill.score) kill = { song, monster, score }
      } else {
        const score = exp / monster.currentHP
        if (!hit || score > hit.score) hit = { song, monster, score }
      }
    }
  }
  return kill ?? hit
}

export function snapshotBard(player: Player): BardSnapshot {
  const base = ALL_GENRES.indexOf(player.starterGenre)
  return {
    fame: player.fame,
    exp: player.exp,
    inspiration: player.inspiration,
    monstersDefeated: player.monstersDefeated,
    styles: [...player.styles],
    dice: player.songs
      .map(songDie)
      .filter((d): d is Dice => !!d)
      .map((d) => [d.type, (ALL_GENRES.indexOf(d.genre) - base + ALL_GENRES.length) % ALL_GENRES.length]),
  }
}

/**
 * Play one full game with bots until the showdown starts (or `maxRounds`).
 * `onRoundEnd(roundsCompleted, state)` fires after every completed round.
 */
export function simulateGame(
  playerCount: number,
  rng: Rng,
  onRoundEnd: (roundsCompleted: number, state: EngineState) => void = () => {},
  maxRounds = 40
): { showdownAfterRound: number | null; state: EngineState } {
  const genres = shuffleGenres(rng).slice(0, playerCount)
  const started = applyAction(
    createInitialEngineState(),
    { type: 'START_GAME', playerConfigs: genres.map((g, i) => ({ name: `Bot ${i + 1}`, starterGenre: g })) },
    { rng, actor: { kind: 'hotseat' } }
  )
  if (!started.ok) throw new Error(started.message)
  const bot = new Bot(started.state, rng)

  let round = bot.state.currentRound
  for (let turns = 0; turns < maxRounds * playerCount + playerCount; turns++) {
    if (bot.state.phase !== 'main') break
    bot.takeTurn()
    if (bot.state.currentRound !== round) {
      onRoundEnd(round, bot.state)
      round = bot.state.currentRound
      if (round > maxRounds) break
    }
  }
  return { showdownAfterRound: bot.state.showdownActive ? round - 1 : null, state: bot.state }
}

function shuffleGenres(rng: Rng): Genre[] {
  const list = [...ALL_GENRES]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}
