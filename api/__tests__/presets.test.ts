// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { MemoryRedis, setRedisForTesting } from '../_lib/redis'
import presets from '../debug/presets'
import { ApiRequest, ApiResponse } from '../_lib/http'
import { createInitialEngineState, EngineState } from '../../src/engine/state'
import { DEFAULT_TUNABLES } from '../../src/data/tunables'
import { Player } from '../../src/types/index'
import {
  ListPresetsResponse,
  GetPresetResponse,
  SavePresetResponse,
} from '../../src/net/protocol'

const TOKEN = 'token-playtester'

let redis: MemoryRedis

beforeEach(() => {
  redis = new MemoryRedis()
  setRedisForTesting(redis)
})

function makeReq(method: string, url: string, opts: { token?: string; body?: unknown } = {}): ApiRequest {
  const req = new EventEmitter() as unknown as ApiRequest
  req.method = method
  req.url = url
  req.headers = opts.token ? { 'x-player-token': opts.token, host: 'play.example' } : { host: 'play.example' }
  ;(req as ApiRequest).body = opts.body
  ;(req as unknown as { [Symbol.asyncIterator]: unknown })[Symbol.asyncIterator] = async function* () {}
  return req
}

function call(req: ApiRequest): Promise<{ status: number; json: () => unknown }> {
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
        resolve({ status: res.statusCode, json: () => JSON.parse(bodyText) })
      },
      on() {},
    } as unknown as ApiResponse
    presets(req, res).catch(reject)
  })
}

/** A playable-looking state with two players and two tweaked balance values. */
function sampleState(): EngineState {
  const player = (id: string, name: string, fame: number): Player => ({
    id,
    name,
    color: '#3b82f6',
    starterGenre: 'Ballad',
    position: 0,
    songs: [],
    exp: 0,
    fame,
    monstersDefeated: 0,
    isEliminated: false,
    totalBossDamage: 0,
    movesThisTurn: 0,
    fightsThisTurn: 0,
    hasShoppedThisTurn: false,
    inspiration: 1,
    inspirationBoughtThisTurn: 0,
  })

  return {
    ...createInitialEngineState(),
    phase: 'main',
    currentRound: 4,
    players: [player('player-1', 'Alba', 120), player('player-2', 'Bryn', 40)],
    spaces: [
      { id: 0, name: 'The Forgotten Stage', connections: [1], genreTags: [], monsters: [], isEdge: true },
    ],
    tunables: { ...DEFAULT_TUNABLES, fameFinalBossThreshold: 60, newD4Cost: 9 },
  }
}

function save(body: unknown, token: string | undefined = TOKEN) {
  return call(makeReq('POST', '/api/debug/presets', { token, body }))
}

describe('preset endpoints', () => {
  it('requires a player token', async () => {
    const res = await call(makeReq('GET', '/api/debug/presets'))
    expect(res.status).toBe(401)
  })

  it('saves a named preset and returns a shareable restore URL', async () => {
    const res = await save({ name: 'Late game', description: 'both near the gate', engineState: sampleState() })
    expect(res.status).toBe(200)
    const data = res.json() as SavePresetResponse

    expect(data.preset.name).toBe('Late game')
    expect(data.preset.players).toBe(2)
    expect(data.preset.round).toBe(4)
    // fameFinalBossThreshold + newD4Cost differ from the shipped defaults
    expect(data.preset.changedTunables).toBe(2)
    expect(data.url).toBe(`https://play.example/?preset=${data.preset.id}`)
  })

  it('rejects a missing name or a non-game-state body', async () => {
    expect((await save({ name: '  ', engineState: sampleState() })).status).toBe(400)
    expect((await save({ name: 'x' })).status).toBe(400)
    expect((await save({ name: 'x', engineState: { nope: true } })).status).toBe(400)
  })

  it('lists summaries newest-first without shipping engine state', async () => {
    await save({ name: 'First', engineState: sampleState() })
    await save({ name: 'Second', engineState: sampleState() })

    const res = await call(makeReq('GET', '/api/debug/presets', { token: TOKEN }))
    const data = res.json() as ListPresetsResponse
    expect(data.presets.map((p) => p.name)).toEqual(['Second', 'First'])
    expect(data.presets[0]).not.toHaveProperty('engineState')
  })

  it('fetches one preset in full and 404s an unknown id', async () => {
    const saved = (await save({ name: 'Scenario', engineState: sampleState() })).json() as SavePresetResponse

    const res = await call(makeReq('GET', `/api/debug/presets?id=${saved.preset.id}`, { token: TOKEN }))
    expect(res.status).toBe(200)
    const { preset } = res.json() as GetPresetResponse
    expect(preset.name).toBe('Scenario')
    expect(preset.engineState.currentRound).toBe(4)
    expect(preset.engineState.tunables.fameFinalBossThreshold).toBe(60)

    expect((await call(makeReq('GET', '/api/debug/presets?id=p_nope', { token: TOKEN }))).status).toBe(404)
  })

  it('normalizes a stored state so an incomplete preset still restores', async () => {
    const partial = { ...sampleState(), tunables: undefined, studio: undefined } as unknown as EngineState
    const saved = (await save({ name: 'Partial', engineState: partial })).json() as SavePresetResponse
    const { preset } = (
      await call(makeReq('GET', `/api/debug/presets?id=${saved.preset.id}`, { token: TOKEN }))
    ).json() as GetPresetResponse

    expect(preset.engineState.tunables).toEqual(DEFAULT_TUNABLES)
    expect(preset.engineState.studio.playerId).toBeNull()
  })

  it('deletes a preset and drops it from the index', async () => {
    const saved = (await save({ name: 'Temp', engineState: sampleState() })).json() as SavePresetResponse

    const del = await call(makeReq('DELETE', `/api/debug/presets?id=${saved.preset.id}`, { token: TOKEN }))
    expect(del.status).toBe(200)

    const list = (
      await call(makeReq('GET', '/api/debug/presets', { token: TOKEN }))
    ).json() as ListPresetsResponse
    expect(list.presets).toHaveLength(0)
    expect((await call(makeReq('DELETE', `/api/debug/presets?id=${saved.preset.id}`, { token: TOKEN }))).status).toBe(404)
  })

  it('rejects unsupported methods', async () => {
    const res = await call(makeReq('PUT', '/api/debug/presets', { token: TOKEN }))
    expect(res.status).toBe(405)
  })
})
