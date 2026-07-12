import { getRedis } from '../../_lib/redis'
import { findSeatByToken } from '../../_lib/auth'
import { buildSnapshot, loadGameDoc } from '../../_lib/gameDoc'
import {
  ApiRequest,
  ApiResponse,
  sendJson,
  sendError,
  methodNotAllowed,
  getPlayerToken,
  getGameId,
} from '../../_lib/http'

/** GET /api/games/[id]/state — full snapshot (reconnect fallback). */
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET')

  const gameId = getGameId(req)
  if (!gameId) return sendError(res, 400, 'bad_request', 'Missing game id')

  const redis = await getRedis()
  const doc = await loadGameDoc(redis, gameId)
  if (!doc) return sendError(res, 404, 'not_found', 'Game not found')

  const seat = findSeatByToken(doc, getPlayerToken(req))
  if (!seat) return sendError(res, 403, 'forbidden', 'Not seated in this game')

  sendJson(res, 200, { snapshot: await buildSnapshot(redis, doc) })
}
