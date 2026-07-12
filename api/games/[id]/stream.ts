import { EventLogEntry, StreamMessage, toPublicSeat } from '../../../src/net/protocol'
import { getRedis, versionKey, eventsKey, presenceKey, PRESENCE_TTL_SECONDS } from '../../_lib/redis'
import { findSeatByToken } from '../../_lib/auth'
import { buildSnapshot, loadGameDoc } from '../../_lib/gameDoc'
import { ApiRequest, ApiResponse, sendError, methodNotAllowed, getPlayerToken, getGameId, getQueryParam } from '../../_lib/http'

const POLL_MS = 500
const PRESENCE_SCAN_EVERY = 4 // ticks (2s)
const PING_EVERY = 30 // ticks (15s)
// Leave headroom before Vercel's maxDuration kills the function
const DEFAULT_LIFETIME_MS = 280_000

/**
 * GET /api/games/[id]/stream?token=... — Server-Sent Events.
 * Emits `snapshot` on connect, `update` for every accepted action,
 * `presence` deltas, and `goodbye` shortly before the duration cap so the
 * client can reconnect without a gap.
 */
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET')

  const gameId = getGameId(req)
  if (!gameId) return sendError(res, 400, 'bad_request', 'Missing game id')

  const redis = await getRedis()
  const doc = await loadGameDoc(redis, gameId)
  if (!doc) return sendError(res, 404, 'not_found', 'Game not found')

  const seat = findSeatByToken(doc, getPlayerToken(req))
  if (!seat) return sendError(res, 403, 'forbidden', 'Not seated in this game')

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  const send = (message: StreamMessage, id?: number) => {
    if (res.writableEnded) return
    if (id !== undefined) res.write(`id: ${id}\n`)
    res.write(`event: ${message.type}\n`)
    res.write(`data: ${JSON.stringify(message)}\n\n`)
  }

  // Resume point: Last-Event-ID header (EventSource) or explicit lastSeq param
  const lastEventId = req.headers['last-event-id']
  const lastSeqParam = getQueryParam(req, 'lastSeq')
  let lastSeq = Number(
    (typeof lastEventId === 'string' && lastEventId) || lastSeqParam || 0
  )
  if (!Number.isFinite(lastSeq)) lastSeq = 0

  // Fresh snapshot on every (re)connect — clients reconcile wholesale
  const snapshot = await buildSnapshot(redis, doc)
  send({ type: 'snapshot', snapshot }, snapshot.version)
  let knownVersion = snapshot.version
  const knownPresence: Record<string, boolean> = { ...snapshot.presence }

  const lifetimeMs = Number(process.env.STREAM_MAX_MS) || DEFAULT_LIFETIME_MS
  const startedAt = Date.now()
  let tick = 0
  let closed = false
  let looping = false

  const finish = (goodbye: boolean) => {
    if (closed) return
    closed = true
    clearInterval(interval)
    if (goodbye) send({ type: 'goodbye' })
    res.end()
  }

  req.on('close', () => finish(false))

  const interval = setInterval(async () => {
    if (closed || looping) return
    looping = true
    try {
      tick++

      // This connection IS this seat's presence
      await redis.set(presenceKey(gameId, seat.seatId), '1', { ex: PRESENCE_TTL_SECONDS })

      if (Date.now() - startedAt > lifetimeMs) {
        finish(true)
        return
      }

      if (tick % PING_EVERY === 0 && !res.writableEnded) {
        res.write(`: ping\n\n`)
      }

      // Version bump → fetch doc + the event entries we haven't sent yet
      const rawVersion = await redis.get(versionKey(gameId))
      const version = rawVersion ? parseInt(rawVersion, 10) : 0
      if (version > knownVersion) {
        const fresh = await loadGameDoc(redis, gameId)
        if (fresh) {
          const rawEntries = await redis.lrange(eventsKey(gameId), -50, -1)
          const entries = rawEntries
            .map((raw) => {
              try {
                return JSON.parse(raw) as EventLogEntry
              } catch {
                return null
              }
            })
            .filter((e): e is EventLogEntry => e !== null && e.seq > Math.max(lastSeq, knownVersion))
            .sort((a, b) => a.seq - b.seq)

          for (const entry of entries) {
            send(
              {
                type: 'update',
                version: fresh.version,
                status: fresh.status,
                seats: fresh.seats.map(toPublicSeat),
                engineState: fresh.engineState,
                entry,
              },
              entry.seq
            )
          }
          knownVersion = fresh.version
          lastSeq = fresh.version
        }
      }

      // Presence deltas for the other seats
      if (tick % PRESENCE_SCAN_EVERY === 0) {
        const fresh = await loadGameDoc(redis, gameId)
        if (fresh) {
          const keys = fresh.seats.map((s) => presenceKey(gameId, s.seatId))
          const values = keys.length ? await redis.mget(keys) : []
          fresh.seats.forEach((s, i) => {
            const online = values[i] !== null && values[i] !== undefined
            if (knownPresence[s.seatId] !== online) {
              knownPresence[s.seatId] = online
              send({ type: 'presence', seatId: s.seatId, online })
            }
          })
        }
      }
    } catch {
      // Transient Redis failure: keep the stream alive and retry next tick
    } finally {
      looping = false
    }
  }, POLL_MS)
}

export const config = {
  maxDuration: 300,
}
