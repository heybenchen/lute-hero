import { GameDoc, CreateLobbyRequest, CreateLobbyResponse, Seat } from '../../src/net/protocol'
import { createInitialEngineState } from '../../src/engine/state'
import { getRedis, gameKey, versionKey, joinCodeKey, GAME_TTL_SECONDS } from '../_lib/redis'
import { hashToken, newGameId, newSeatId, newJoinCode } from '../_lib/auth'
import { buildSnapshot } from '../_lib/gameDoc'
import { ApiRequest, ApiResponse, readJsonBody, sendJson, sendError, methodNotAllowed, getPlayerToken } from '../_lib/http'

const SEAT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']
const SEAT_GENRES = ['Ballad', 'Folk', 'Hymn', 'Shanty'] as const

/** POST /api/lobbies — create a lobby; the creator takes the host seat. */
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const token = getPlayerToken(req)
  if (!token) return sendError(res, 401, 'unauthorized', 'Missing player token')

  const body = await readJsonBody<CreateLobbyRequest>(req)
  const name = body?.name?.trim().slice(0, 24)
  if (!name) return sendError(res, 400, 'bad_request', 'A display name is required')

  const redis = await getRedis()

  const hostSeat: Seat = {
    seatId: newSeatId(),
    playerId: null,
    name,
    color: SEAT_COLORS[0],
    starterGenre: SEAT_GENRES[0],
    ready: false,
    tokenHash: hashToken(token),
  }

  // Retry join-code collisions (tiny probability, cheap to retry)
  for (let attempt = 0; attempt < 5; attempt++) {
    const joinCode = newJoinCode()
    if (await redis.get(joinCodeKey(joinCode))) continue

    const now = Date.now()
    const doc: GameDoc = {
      id: newGameId(),
      status: 'lobby',
      joinCode,
      hostSeatId: hostSeat.seatId,
      seats: [hostSeat],
      engineState: createInitialEngineState(),
      version: 1,
      recentClientActionIds: [],
      createdAt: now,
      updatedAt: now,
    }

    await redis.set(gameKey(doc.id), JSON.stringify(doc), { ex: GAME_TTL_SECONDS })
    await redis.set(versionKey(doc.id), String(doc.version), { ex: GAME_TTL_SECONDS })
    await redis.set(joinCodeKey(joinCode), doc.id, { ex: GAME_TTL_SECONDS })

    const response: CreateLobbyResponse = {
      gameId: doc.id,
      joinCode,
      seatId: hostSeat.seatId,
      snapshot: await buildSnapshot(redis, doc),
    }
    return sendJson(res, 200, response)
  }

  sendError(res, 500, 'server_error', 'Could not allocate a join code')
}
