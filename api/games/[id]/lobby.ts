import { LobbyOpRequest } from '../../../src/net/protocol'
import { PlayerConfig } from '../../../src/engine/actions'
import { getRedis } from '../../_lib/redis'
import { findSeatByToken } from '../../_lib/auth'
import { applyActionToDoc, buildSnapshot, mutateGameDoc } from '../../_lib/gameDoc'
import {
  ApiRequest,
  ApiResponse,
  readJsonBody,
  sendJson,
  sendError,
  methodNotAllowed,
  getPlayerToken,
  getGameId,
} from '../../_lib/http'

const VALID_GENRES = ['Ballad', 'Folk', 'Hymn', 'Shanty']

/** POST /api/games/[id]/lobby — ready/unready/leave/start. */
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const gameId = getGameId(req)
  if (!gameId) return sendError(res, 400, 'bad_request', 'Missing game id')
  const token = getPlayerToken(req)
  if (!token) return sendError(res, 401, 'unauthorized', 'Missing player token')

  const body = await readJsonBody<LobbyOpRequest>(req)
  if (!body?.op) return sendError(res, 400, 'bad_request', 'Missing op')

  const redis = await getRedis()

  const result = await mutateGameDoc(redis, gameId, (doc) => {
    const seat = findSeatByToken(doc, token)
    if (!seat) return { ok: false as const, status: 403, code: 'forbidden' as const, message: 'Not seated in this game' }
    const isHost = seat.seatId === doc.hostSeatId

    switch (body.op) {
      case 'ready':
      case 'unready': {
        if (doc.status !== 'lobby') {
          return { ok: false as const, status: 422, code: 'illegal' as const, message: 'Game already started' }
        }
        const seats = doc.seats.map((s) => {
          if (s.seatId !== seat.seatId) return s
          return {
            ...s,
            ready: body.op === 'ready',
            starterGenre:
              body.starterGenre && VALID_GENRES.includes(body.starterGenre)
                ? body.starterGenre
                : s.starterGenre,
            color: body.color ?? s.color,
          }
        })
        return {
          doc: { ...doc, seats },
          entry: { actorSeatId: seat.seatId, actionType: 'LOBBY_READY', seed: 0, events: [] },
        }
      }

      case 'leave': {
        if (doc.status !== 'lobby') {
          return { ok: false as const, status: 422, code: 'illegal' as const, message: 'Cannot leave a started game' }
        }
        const seats = doc.seats.filter((s) => s.seatId !== seat.seatId)
        // Host leaving promotes the next seat
        const hostSeatId = isHost && seats.length > 0 ? seats[0].seatId : doc.hostSeatId
        return {
          doc: { ...doc, seats, hostSeatId },
          entry: { actorSeatId: seat.seatId, actionType: 'LOBBY_LEAVE', seed: 0, events: [] },
        }
      }

      case 'start': {
        if (!isHost) {
          return { ok: false as const, status: 403, code: 'forbidden' as const, message: 'Only the host can start' }
        }
        if (doc.status !== 'lobby') {
          return { ok: false as const, status: 422, code: 'illegal' as const, message: 'Game already started' }
        }
        if (doc.seats.length < 1) {
          return { ok: false as const, status: 422, code: 'illegal' as const, message: 'No players seated' }
        }
        if (!doc.seats.every((s) => s.ready)) {
          return { ok: false as const, status: 422, code: 'illegal' as const, message: 'All players must be ready' }
        }

        const playerConfigs: PlayerConfig[] = doc.seats.map((s) => ({
          name: s.name,
          starterGenre: s.starterGenre,
          color: s.color,
        }))

        const applied = applyActionToDoc(
          doc,
          { type: 'START_GAME', playerConfigs },
          { kind: 'seat', playerId: 'host', isHost: true },
          seat.seatId
        )
        if ('ok' in applied) {
          return { ok: false as const, status: applied.status, code: applied.code, message: applied.message }
        }

        // Engine creates player-1..player-N in seat order — bind seats now
        const seats = applied.doc.seats.map((s, index) => ({
          ...s,
          playerId: applied.doc.engineState.players[index]?.id ?? null,
        }))
        return {
          doc: { ...applied.doc, seats, status: 'active' as const },
          entry: applied.entry,
        }
      }

      default:
        return { ok: false as const, status: 400, code: 'illegal' as const, message: `Unknown op` }
    }
  })

  if (!result.ok) return sendError(res, result.status, result.code, result.message)
  sendJson(res, 200, { snapshot: await buildSnapshot(redis, result.doc) })
}
