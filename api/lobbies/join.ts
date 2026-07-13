import { JoinLobbyRequest, JoinLobbyResponse, Seat } from '../../src/net/protocol.js'
import { getRedis, joinCodeKey } from '../_lib/redis.js'
import { hashToken, newSeatId, findSeatByToken } from '../_lib/auth.js'
import { buildSnapshot, loadGameDoc, mutateGameDoc } from '../_lib/gameDoc.js'
import { ApiRequest, ApiResponse, readJsonBody, sendJson, sendError, methodNotAllowed, getPlayerToken } from '../_lib/http.js'

const SEAT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']
const SEAT_GENRES = ['Ballad', 'Folk', 'Hymn', 'Shanty'] as const
const MAX_SEATS = 4

/**
 * POST /api/lobbies/join — join a lobby by code. If the caller's token is
 * already bound to a seat in that game, this is a reconnect: their existing
 * seat is returned regardless of game status.
 */
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const token = getPlayerToken(req)
  if (!token) return sendError(res, 401, 'unauthorized', 'Missing player token')

  const body = await readJsonBody<JoinLobbyRequest>(req)
  const joinCode = body?.joinCode?.trim().toUpperCase()
  const name = body?.name?.trim().slice(0, 24)
  if (!joinCode || !name) return sendError(res, 400, 'bad_request', 'joinCode and name are required')

  const redis = await getRedis()
  const gameId = await redis.get(joinCodeKey(joinCode))
  if (!gameId) return sendError(res, 404, 'not_found', 'No game with that code')

  // Reconnect path: token already owns a seat
  const existing = await loadGameDoc(redis, gameId)
  if (!existing) return sendError(res, 404, 'not_found', 'Game not found')
  const existingSeat = findSeatByToken(existing, token)
  if (existingSeat) {
    const response: JoinLobbyResponse = {
      gameId,
      seatId: existingSeat.seatId,
      rejoined: true,
      snapshot: await buildSnapshot(redis, existing),
    }
    return sendJson(res, 200, response)
  }

  if (existing.status !== 'lobby') {
    return sendError(res, 403, 'forbidden', 'That game has already started')
  }

  const seatId = newSeatId()
  const result = await mutateGameDoc(redis, gameId, (doc) => {
    if (doc.status !== 'lobby') {
      return { ok: false, status: 403, code: 'forbidden', message: 'That game has already started' }
    }
    if (doc.seats.length >= MAX_SEATS) {
      return { ok: false, status: 403, code: 'forbidden', message: 'Lobby is full' }
    }
    const index = doc.seats.length
    const seat: Seat = {
      seatId,
      playerId: null,
      name,
      color: SEAT_COLORS[index % SEAT_COLORS.length],
      starterGenre: SEAT_GENRES[index % SEAT_GENRES.length],
      ready: false,
      tokenHash: hashToken(token),
    }
    return {
      doc: { ...doc, seats: [...doc.seats, seat] },
      entry: { actorSeatId: seatId, actionType: 'LOBBY_JOIN', seed: 0, events: [] },
    }
  })

  if (result.ok === false) return sendError(res, result.status, result.code, result.message)

  const response: JoinLobbyResponse = {
    gameId,
    seatId,
    rejoined: false,
    snapshot: await buildSnapshot(redis, result.doc),
  }
  sendJson(res, 200, response)
}
