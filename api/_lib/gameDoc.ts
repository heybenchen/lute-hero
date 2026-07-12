import {
  GameDoc,
  EventLogEntry,
  Snapshot,
  toPublicSeat,
} from '../../src/net/protocol'
import { GameAction, ActorSeat } from '../../src/engine/actions'
import { applyAction } from '../../src/engine/reducer'
import { mulberry32, randomSeed } from '../../src/engine/rng'
import {
  RedisLike,
  gameKey,
  versionKey,
  eventsKey,
  presenceKey,
  GAME_TTL_SECONDS,
  MAX_EVENT_LOG,
} from './redis'

export async function loadGameDoc(redis: RedisLike, gameId: string): Promise<GameDoc | null> {
  const raw = await redis.get(gameKey(gameId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as GameDoc
  } catch {
    return null
  }
}

/** Persist a doc whose version was already bumped, atomically vs. its predecessor. */
export async function casWriteDoc(
  redis: RedisLike,
  doc: GameDoc,
  entry: EventLogEntry
): Promise<boolean> {
  return redis.casGameWrite({
    docKey: gameKey(doc.id),
    versionKey: versionKey(doc.id),
    eventsKey: eventsKey(doc.id),
    expectedVersion: doc.version - 1,
    docJson: JSON.stringify(doc),
    eventJson: JSON.stringify(entry),
    ttlSeconds: GAME_TTL_SECONDS,
    maxEvents: MAX_EVENT_LOG,
  })
}

export type MutateResult =
  | { ok: true; doc: GameDoc; entry: EventLogEntry }
  | { ok: false; status: number; code: 'not_found' | 'forbidden' | 'illegal' | 'conflict'; message: string }

/**
 * Load-mutate-CAS loop with retries. `mutate` receives a fresh doc and either
 * returns the next doc (version NOT yet bumped — this helper bumps it) plus
 * the log entry payload, or an error.
 */
export async function mutateGameDoc(
  redis: RedisLike,
  gameId: string,
  mutate: (doc: GameDoc) => MutateResult | { doc: GameDoc; entry: Omit<EventLogEntry, 'seq' | 'ts'> },
  maxRetries = 3
): Promise<MutateResult> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const doc = await loadGameDoc(redis, gameId)
    if (!doc) return { ok: false, status: 404, code: 'not_found', message: 'Game not found' }

    const outcome = mutate(doc)
    if ('ok' in outcome) return outcome // mutate() decided (error path)

    const seq = doc.version + 1
    const next: GameDoc = { ...outcome.doc, version: seq, updatedAt: Date.now() }
    const entry: EventLogEntry = { ...outcome.entry, seq, ts: next.updatedAt }

    if (await casWriteDoc(redis, next, entry)) {
      return { ok: true, doc: next, entry }
    }
    // Someone else wrote first — reload and re-validate
  }
  return { ok: false, status: 409, code: 'conflict', message: 'Concurrent update; please retry' }
}

/**
 * Run a game action through the engine against a doc. Shared by the actions
 * route and the lobby start op. Returns the updated doc + entry payload, or
 * a typed error.
 */
export function applyActionToDoc(
  doc: GameDoc,
  action: GameAction,
  actor: ActorSeat,
  actorSeatId: string
):
  | { doc: GameDoc; entry: Omit<EventLogEntry, 'seq' | 'ts'> }
  | { ok: false; status: number; code: 'forbidden' | 'illegal'; message: string } {
  const seed = randomSeed()
  const result = applyAction(doc.engineState, action, {
    rng: mulberry32(seed),
    actor,
    idSeed: String(doc.version + 1),
  })

  if (!result.ok) {
    return {
      ok: false,
      status: result.code === 'forbidden' ? 403 : 422,
      code: result.code,
      message: result.message,
    }
  }

  let status = doc.status
  if (action.type === 'RESET_GAME') status = 'lobby'
  if (result.state.phase === 'gameOver') status = 'finished'

  return {
    doc: { ...doc, engineState: result.state, status },
    entry: {
      actorSeatId,
      actionType: action.type,
      seed,
      events: result.events,
    },
  }
}

export async function buildSnapshot(redis: RedisLike, doc: GameDoc): Promise<Snapshot> {
  const presenceKeys = doc.seats.map((s) => presenceKey(doc.id, s.seatId))
  const presenceValues = presenceKeys.length ? await redis.mget(presenceKeys) : []
  const presence: Record<string, boolean> = {}
  doc.seats.forEach((seat, i) => {
    presence[seat.seatId] = presenceValues[i] !== null && presenceValues[i] !== undefined
  })

  return {
    gameId: doc.id,
    status: doc.status,
    joinCode: doc.joinCode,
    hostSeatId: doc.hostSeatId,
    seats: doc.seats.map(toPublicSeat),
    presence,
    engineState: doc.engineState,
    version: doc.version,
    lastSeq: doc.version,
  }
}
