import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EngineEvent } from '../engine/events'
import type { UpdateMessage } from '../net/protocol'
import type { StreamCallbacks } from '../net/sse'

// Capture the stream callbacks so tests can push SSE messages by hand
let stream: StreamCallbacks
vi.mock('../net/sse', () => ({
  GameStream: class {
    constructor(_token: string, _gameId: string, callbacks: StreamCallbacks) {
      stream = callbacks
    }
    start() {}
    stop() {}
  },
}))

const sendAction = vi.fn()
vi.mock('../net/api', () => ({
  sendAction: (...args: unknown[]) => sendAction(...args),
  ApiRequestError: class extends Error {},
}))

const { RemoteDriver } = await import('./remoteDriver')

const rolled: EngineEvent = {
  type: 'diceRolled', playerId: 'p1', songId: 's1', context: 'combat',
  rolls: [{ diceId: 'd1', value: 3, isCrit: false, critBonus: 0, cascadeRolls: [] }],
}

function update(seq: number): UpdateMessage {
  return {
    type: 'update', version: seq, status: 'active', seats: [],
    engineState: {} as UpdateMessage['engineState'],
    entry: { seq, actorSeatId: 'seat-1', actionType: 'PLAY_SONG', seed: 1, events: [rolled], ts: 0 },
  }
}

describe('RemoteDriver animation dedupe', () => {
  const onRemoteEntry = vi.fn()
  let driver: InstanceType<typeof RemoteDriver>

  beforeEach(() => {
    onRemoteEntry.mockReset()
    sendAction.mockReset()
    driver = new RemoteDriver('token', 'game', {
      onSnapshot: vi.fn(),
      onUpdate: vi.fn(),
      onRemoteEntry,
      onPresence: vi.fn(),
      onConnectionChange: vi.fn(),
    })
  })

  it('animates its own action from the POST response and skips the SSE copy', async () => {
    sendAction.mockResolvedValue({ seq: 7, events: [rolled] })
    const result = await driver.dispatch({ type: 'END_TURN' })
    expect(result).toEqual({ ok: true, events: [rolled] })

    stream.onUpdate(update(7))
    expect(onRemoteEntry).not.toHaveBeenCalled()
  })

  it('animates once when the stream delivers its own action before the POST returns', async () => {
    let respond!: (value: unknown) => void
    sendAction.mockReturnValue(new Promise((resolve) => { respond = resolve }))
    const pending = driver.dispatch({ type: 'END_TURN' })

    stream.onUpdate(update(9))
    expect(onRemoteEntry).toHaveBeenCalledTimes(1)

    respond({ seq: 9, events: [rolled] })
    expect(await pending).toEqual({ ok: true, events: [] })
  })

  it("animates other seats' actions from the stream", () => {
    stream.onUpdate(update(3))
    stream.onUpdate(update(3)) // a replayed update is not animated twice
    expect(onRemoteEntry).toHaveBeenCalledTimes(1)
  })
})
