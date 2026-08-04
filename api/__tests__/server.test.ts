// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { MemoryRedis, setRedisForTesting, eventsKey } from '../_lib/redis'
import createLobby from '../lobbies/index'
import joinLobby from '../lobbies/join'
import lobbyOp from '../games/[id]/lobby'
import actions from '../games/[id]/actions'
import stateRoute from '../games/[id]/state'
import { ApiRequest, ApiResponse } from '../_lib/http'
import { Snapshot } from '../../src/net/protocol'
import { loadGameDoc, casWriteDoc } from '../_lib/gameDoc'

let redis: MemoryRedis

beforeEach(() => {
  redis = new MemoryRedis()
  setRedisForTesting(redis)
})

// ---- Minimal req/res doubles over Node primitives ----

function makeReq(method: string, url: string, opts: { token?: string; body?: unknown } = {}): ApiRequest {
  const req = new EventEmitter() as unknown as ApiRequest & { [Symbol.asyncIterator]: () => AsyncIterator<Buffer> }
  req.method = method
  req.url = url
  req.headers = opts.token ? { 'x-player-token': opts.token } : {}
  ;(req as ApiRequest).body = opts.body
  // No streamed body — handlers use req.body when present
  ;(req as unknown as { [Symbol.asyncIterator]: unknown })[Symbol.asyncIterator] = async function* () {}
  return req
}

interface CapturedResponse {
  status: number
  json: () => unknown
}

function call(handler: (req: ApiRequest, res: ApiResponse) => Promise<void>, req: ApiRequest): Promise<CapturedResponse> {
  return new Promise((resolve, reject) => {
    let bodyText = ''
    const res = {
      statusCode: 200,
      writableEnded: false,
      setHeader() {},
      write(chunk: string) {
        bodyText += chunk
        return true
      },
      end(chunk?: string) {
        if (chunk) bodyText += chunk
        ;(res as { writableEnded: boolean }).writableEnded = true
        resolve({ status: res.statusCode, json: () => JSON.parse(bodyText) })
      },
      on() {},
    } as unknown as ApiResponse
    handler(req, res).catch(reject)
  })
}

// ---- Scenario helpers ----

const TOKEN_A = 'token-aaaa'
const TOKEN_B = 'token-bbbb'

async function createGame() {
  const res = await call(createLobby, makeReq('POST', '/api/lobbies', { token: TOKEN_A, body: { name: 'Alba' } }))
  expect(res.status).toBe(200)
  return res.json() as { gameId: string; joinCode: string; seatId: string; snapshot: Snapshot }
}

async function joinGame(joinCode: string, token: string, name: string) {
  const res = await call(joinLobby, makeReq('POST', '/api/lobbies/join', { token, body: { joinCode, name } }))
  return { status: res.status, data: res.json() as { gameId: string; seatId: string; rejoined: boolean; snapshot: Snapshot } }
}

async function ready(gameId: string, token: string) {
  return call(lobbyOp, makeReq('POST', `/api/games/${gameId}/lobby`, { token, body: { op: 'ready' } }))
}

async function start(gameId: string, token: string) {
  return call(lobbyOp, makeReq('POST', `/api/games/${gameId}/lobby`, { token, body: { op: 'start' } }))
}

async function startedTwoPlayerGame() {
  const created = await createGame()
  const joined = await joinGame(created.joinCode, TOKEN_B, 'Bryn')
  await ready(created.gameId, TOKEN_A)
  await ready(created.gameId, TOKEN_B)
  const startRes = await start(created.gameId, TOKEN_A)
  expect(startRes.status).toBe(200)
  const snap = (startRes.json() as { snapshot: Snapshot }).snapshot
  return { gameId: created.gameId, joinCode: created.joinCode, snap, seatA: created.seatId, seatB: joined.data.seatId }
}

function act(gameId: string, token: string, action: object, clientActionId = `ca-${Math.random()}`) {
  return call(
    actions,
    makeReq('POST', `/api/games/${gameId}/actions`, { token, body: { clientActionId, action } })
  )
}

// ---- Tests ----

describe('lobby lifecycle', () => {
  it('creates a lobby with a host seat and join code', async () => {
    const created = await createGame()
    expect(created.joinCode).toMatch(/^[A-Z2-9]{6}$/)
    expect(created.snapshot.status).toBe('lobby')
    expect(created.snapshot.seats).toHaveLength(1)
    expect(created.snapshot.hostSeatId).toBe(created.seatId)
    // Token hashes never leak to clients
    expect(JSON.stringify(created.snapshot)).not.toContain('tokenHash')
  })

  it('joins by code, rejoins by token, rejects a started game for new tokens', async () => {
    const created = await createGame()
    const joined = await joinGame(created.joinCode, TOKEN_B, 'Bryn')
    expect(joined.status).toBe(200)
    expect(joined.data.rejoined).toBe(false)
    expect(joined.data.snapshot.seats).toHaveLength(2)

    // Same token joining again = reconnect to the same seat
    const rejoin = await joinGame(created.joinCode, TOKEN_B, 'Bryn')
    expect(rejoin.data.rejoined).toBe(true)
    expect(rejoin.data.seatId).toBe(joined.data.seatId)

    await ready(created.gameId, TOKEN_A)
    await ready(created.gameId, TOKEN_B)
    await start(created.gameId, TOKEN_A)

    // New token can't join a started game
    const late = await joinGame(created.joinCode, 'token-cccc', 'Cass')
    expect(late.status).toBe(403)

    // ...but a seated token still reconnects
    const back = await joinGame(created.joinCode, TOKEN_A, 'Alba')
    expect(back.status).toBe(200)
    expect(back.data.rejoined).toBe(true)
    expect(back.data.snapshot.status).toBe('active')
  })

  it('requires all seats ready and the host to start', async () => {
    const created = await createGame()
    await joinGame(created.joinCode, TOKEN_B, 'Bryn')
    await ready(created.gameId, TOKEN_A)

    const notReady = await start(created.gameId, TOKEN_A)
    expect(notReady.status).toBe(422)

    await ready(created.gameId, TOKEN_B)
    const nonHost = await start(created.gameId, TOKEN_B)
    expect(nonHost.status).toBe(403)

    const ok = await start(created.gameId, TOKEN_A)
    expect(ok.status).toBe(200)
    const snap = (ok.json() as { snapshot: Snapshot }).snapshot
    expect(snap.status).toBe('active')
    expect(snap.engineState.phase).toBe('main')
    expect(snap.engineState.players).toHaveLength(2)
    // Seats bound to engine players in join order
    expect(snap.seats[0].playerId).toBe('player-1')
    expect(snap.seats[1].playerId).toBe('player-2')
  })
})

describe('actions route', () => {
  it('applies a MOVE from the current seat and bumps the version', async () => {
    const { gameId, snap } = await startedTwoPlayerGame()
    const res = await act(gameId, TOKEN_A, {
      type: 'MOVE',
      playerId: 'player-1',
      toSpaceId: 1,
      inspirationTravel: false,
    })
    expect(res.status).toBe(200)
    const data = res.json() as { seq: number; version: number; events: unknown[] }
    expect(data.version).toBe(snap.version + 1)

    const doc = await loadGameDoc(redis, gameId)
    expect(doc!.engineState.players[0].position).toBe(1)
  })

  it('rejects out-of-turn seats with 403 and illegal moves with 422', async () => {
    const { gameId } = await startedTwoPlayerGame()
    const forbidden = await act(gameId, TOKEN_B, {
      type: 'MOVE',
      playerId: 'player-2',
      toSpaceId: 2,
      inspirationTravel: false,
    })
    expect(forbidden.status).toBe(403)

    const illegal = await act(gameId, TOKEN_A, {
      type: 'MOVE',
      playerId: 'player-1',
      toSpaceId: 15, // not adjacent to corner 0
      inspirationTravel: false,
    })
    expect(illegal.status).toBe(422)
  })

  it('is idempotent per clientActionId', async () => {
    const { gameId } = await startedTwoPlayerGame()
    const action = { type: 'MOVE', playerId: 'player-1', toSpaceId: 1, inspirationTravel: false }
    const first = await act(gameId, TOKEN_A, action, 'ca-fixed')
    const dup = await act(gameId, TOKEN_A, action, 'ca-fixed')
    expect(dup.status).toBe(200)
    const firstData = first.json() as { seq: number }
    const dupData = dup.json() as { seq: number }
    expect(dupData.seq).toBe(firstData.seq)

    // The move only landed once
    const doc = await loadGameDoc(redis, gameId)
    expect(doc!.engineState.players[0].movesThisTurn).toBe(1)
  })

  it('rejects unknown tokens', async () => {
    const { gameId } = await startedTwoPlayerGame()
    const res = await act(gameId, 'token-zzzz', { type: 'END_TURN' })
    expect(res.status).toBe(403)
  })

  it('writes dice events into the event log for spectators', async () => {
    const { gameId } = await startedTwoPlayerGame()
    // Plant a monster on space 1 and start combat
    let doc = await loadGameDoc(redis, gameId)
    await act(gameId, TOKEN_A, { type: 'MOVE', playerId: 'player-1', toSpaceId: 1, inspirationTravel: false })
    doc = await loadGameDoc(redis, gameId)
    const space1 = doc!.engineState.spaces.find((s) => s.id === 1)!
    if (space1.monsters.length === 0) {
      // No tags on space 1 this seed — plant a monster directly for the test
      const next = {
        ...doc!,
        version: doc!.version + 1,
        engineState: {
          ...doc!.engineState,
          spaces: doc!.engineState.spaces.map((s) =>
            s.id === 1
              ? {
                  ...s,
                  monsters: [{
                    id: 'test-monster', templateId: 'ember_wraith', name: 'Ember Wraith',
                    currentHP: 10, maxHP: 10, vulnerability: 'Ballad' as const,
                    resistance: 'Shanty' as const, isBoss: false, level: 1,
                  }],
                }
              : s
          ),
        },
      }
      await casWriteDoc(redis, next, { seq: next.version, actorSeatId: 'test', actionType: 'TEST', seed: 0, events: [], ts: Date.now() })
    }

    const fight = await act(gameId, TOKEN_A, { type: 'START_COMBAT', playerId: 'player-1' })
    expect(fight.status).toBe(200)

    doc = await loadGameDoc(redis, gameId)
    const songId = doc!.engineState.players[0].songs[0].id
    const targetMonsterId = doc!.engineState.combat.monsters[0].id
    const play = await act(gameId, TOKEN_A, { type: 'PLAY_SONG', songId, ownerId: 'player-1', targetMonsterId })
    expect(play.status).toBe(200)
    const playData = play.json() as { seq: number; events: { type: string }[] }
    expect(playData.events.some((e) => e.type === 'diceRolled')).toBe(true)

    // The same events are in the log for SSE consumers
    const rawEntries = await redis.lrange(eventsKey(gameId), 0, -1)
    const entries = rawEntries.map((r) => JSON.parse(r) as { seq: number; events: { type: string }[] })
    const logged = entries.find((e) => e.seq === playData.seq)
    expect(logged).toBeDefined()
    expect(logged!.events.some((e) => e.type === 'diceRolled')).toBe(true)
  })
})

describe('optimistic concurrency', () => {
  it('casGameWrite rejects stale versions', async () => {
    const { gameId } = await startedTwoPlayerGame()
    const doc = await loadGameDoc(redis, gameId)
    const stale = { ...doc!, version: doc!.version } // expectedVersion = version-1, but store is at version
    const wrote = await casWriteDoc(redis, stale, {
      seq: stale.version,
      actorSeatId: 'x',
      actionType: 'TEST',
      seed: 0,
      events: [],
      ts: Date.now(),
    })
    expect(wrote).toBe(false)

    const next = { ...doc!, version: doc!.version + 1 }
    const wrote2 = await casWriteDoc(redis, next, {
      seq: next.version,
      actorSeatId: 'x',
      actionType: 'TEST',
      seed: 0,
      events: [],
      ts: Date.now(),
    })
    expect(wrote2).toBe(true)
  })
})

describe('state route', () => {
  it('returns a snapshot to seated tokens only', async () => {
    const { gameId } = await startedTwoPlayerGame()
    const ok = await call(stateRoute, makeReq('GET', `/api/games/${gameId}/state`, { token: TOKEN_B }))
    expect(ok.status).toBe(200)
    const snap = (ok.json() as { snapshot: Snapshot }).snapshot
    expect(snap.engineState.phase).toBe('main')

    const nope = await call(stateRoute, makeReq('GET', `/api/games/${gameId}/state`, { token: 'token-zzzz' }))
    expect(nope.status).toBe(403)
  })
})
