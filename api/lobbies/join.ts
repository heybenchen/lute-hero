import { JoinLobbyRequest, JoinLobbyResponse, Seat } from '../../src/net/protocol.js'
import { getRedis, joinCodeKey } from '../_lib/redis.js'
import { hashToken, newSeatId, findSeatByToken } from '../_lib/auth.js'
import { buildSnapshot, loadGameDoc, mutateGameDoc } from '../_lib/gameDoc.js'
import { ApiRequest, ApiResponse, readJsonBody, sendJson, sendError, methodNotAllowed, getPlayerToken } from '../_lib/http.js'

import { ALL_GENRES, playerColorFor } from '../../src/data/genreTheme.js'

/** One seat per element: four elements, four bards. */
const MAX_SEATS = ALL_GENRES.length

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
    // Newcomers take the first element nobody has claimed
    const starterGenre = ALL_GENRES.find((g) => !doc.seats.some((s) => s.starterGenre === g)) ?? ALL_GENRES[0]
    const seat: Seat = {
      seatId,
      playerId: null,
      name,
      color: playerColorFor(starterGenre),
      starterGenre,
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
