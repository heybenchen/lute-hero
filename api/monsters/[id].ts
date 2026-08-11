import {
  ApiRequest,
  ApiResponse,
  readJsonBody,
  sendJson,
  sendError,
  methodNotAllowed,
  getQueryParam,
} from '../_lib/http.js'
import type { Monster } from '../../src/bestiary/data.js'
import { loadMonsters, saveMonsters } from './index.js'

/** Monster id for /api/monsters/[id]: Vercel query param or URL segment. */
function getMonsterId(req: ApiRequest): string | null {
  const fromQuery = getQueryParam(req, 'id')
  if (fromQuery) return fromQuery
  const url = new URL(req.url ?? '/', 'http://localhost')
  const match = url.pathname.match(/\/api\/monsters\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/** PUT /api/monsters/[id] — patch fields · DELETE — remove. */
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const id = getMonsterId(req)
  if (!id) return sendError(res, 400, 'bad_request', 'Missing monster id.')

  if (req.method === 'PUT') {
    const updates = await readJsonBody<Partial<Monster>>(req)
    if (!updates) return sendError(res, 400, 'bad_request', 'Invalid body.')

    const monsters = await loadMonsters()
    const idx = monsters.findIndex((m) => m.id === id)
    if (idx === -1) return sendError(res, 404, 'not_found', 'Not found.')

    const merged: Monster = { ...monsters[idx], ...updates, id }
    await saveMonsters(monsters.map((m, i) => (i === idx ? merged : m)))
    return sendJson(res, 200, merged)
  }

  if (req.method === 'DELETE') {
    const monsters = await loadMonsters()
    await saveMonsters(monsters.filter((m) => m.id !== id))
    return sendJson(res, 200, { ok: true })
  }

  return methodNotAllowed(res, 'PUT, DELETE')
}
