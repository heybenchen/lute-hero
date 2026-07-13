import { ActionRequest, ActionResponse, GameDoc, EventLogEntry } from '../../../src/net/protocol.js'
import { getRedis } from '../../_lib/redis.js'
import { findSeatByToken } from '../../_lib/auth.js'
import { applyActionToDoc, casWriteDoc, loadGameDoc } from '../../_lib/gameDoc.js'
import {
  ApiRequest,
  ApiResponse,
  readJsonBody,
  sendJson,
  sendError,
  methodNotAllowed,
  getPlayerToken,
  getGameId,
} from '../../_lib/http.js'

const MAX_RECENT_ACTION_IDS = 20
const MAX_CAS_RETRIES = 3

/** POST /api/games/[id]/actions — submit one engine action. */
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const gameId = getGameId(req)
  if (!gameId) return sendError(res, 400, 'bad_request', 'Missing game id')
  const token = getPlayerToken(req)
  if (!token) return sendError(res, 401, 'unauthorized', 'Missing player token')

  const body = await readJsonBody<ActionRequest>(req)
  if (!body?.action?.type || !body.clientActionId) {
    return sendError(res, 400, 'bad_request', 'clientActionId and action are required')
  }

  const redis = await getRedis()

  for (let attempt = 0; attempt <= MAX_CAS_RETRIES; attempt++) {
    const doc = await loadGameDoc(redis, gameId)
    if (!doc) return sendError(res, 404, 'not_found', 'Game not found')

    // Idempotent retry: this clientActionId already landed
    const dup = doc.recentClientActionIds.find((r) => r.clientActionId === body.clientActionId)
    if (dup) {
      return sendJson(res, 200, {
        seq: dup.seq,
        version: doc.version,
        events: [],
      } satisfies ActionResponse)
    }

    const seat = findSeatByToken(doc, token)
    if (!seat) return sendError(res, 403, 'forbidden', 'Not seated in this game')
    if (doc.status === 'lobby') {
      return sendError(res, 422, 'illegal', 'Game has not started yet')
    }
    if (doc.status === 'finished' && body.action.type !== 'RESET_GAME') {
      return sendError(res, 422, 'illegal', 'Game is over')
    }
    if (!seat.playerId && body.action.type !== 'RESET_GAME') {
      return sendError(res, 403, 'forbidden', 'Your seat has no player')
    }

    const applied = applyActionToDoc(
      doc,
      body.action,
      {
        kind: 'seat',
        playerId: seat.playerId ?? '',
        isHost: seat.seatId === doc.hostSeatId,
      },
      seat.seatId
    )
    if ('ok' in applied) {
      return sendError(res, applied.status, applied.code, applied.message)
    }

    const seq = doc.version + 1
    const now = Date.now()
    const next: GameDoc = {
      ...applied.doc,
      version: seq,
      updatedAt: now,
      recentClientActionIds: [
        ...doc.recentClientActionIds.slice(-(MAX_RECENT_ACTION_IDS - 1)),
        { clientActionId: body.clientActionId, seq },
      ],
    }
    const entry: EventLogEntry = { ...applied.entry, seq, ts: now }

    if (await casWriteDoc(redis, next, entry)) {
      return sendJson(res, 200, { seq, version: seq, events: entry.events } satisfies ActionResponse)
    }
    // CAS conflict: reload and re-validate against the newer doc
  }

  sendError(res, 409, 'conflict', 'Concurrent update; please retry')
}
