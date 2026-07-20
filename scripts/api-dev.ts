/**
 * Local API harness: serves the Vercel functions in api/ on a plain Node
 * http server (in-memory Redis) so the full multiplayer stack runs without
 * Vercel or Upstash. Run with: npx tsx scripts/api-dev.ts
 * Vite proxies /api to this server in dev (see vite.config.ts).
 */
import { createServer } from 'node:http'
import createLobby from '../api/lobbies/index'
import joinLobby from '../api/lobbies/join'
import lobbyOp from '../api/games/[id]/lobby'
import actions from '../api/games/[id]/actions'
import state from '../api/games/[id]/state'
import stream from '../api/games/[id]/stream'
import monsters from '../api/monsters/index'
import monsterById from '../api/monsters/[id]'
import { ApiRequest, ApiResponse } from '../api/_lib/http'

const PORT = Number(process.env.API_PORT) || 8787

type Handler = (req: ApiRequest, res: ApiResponse) => Promise<void>

function route(method: string | undefined, path: string): Handler | null {
  if (path === '/api/lobbies' && method === 'POST') return createLobby
  if (path === '/api/lobbies/join' && method === 'POST') return joinLobby
  if (path === '/api/monsters' && (method === 'GET' || method === 'POST')) return monsters
  if (/^\/api\/monsters\/[^/]+$/.test(path) && (method === 'PUT' || method === 'DELETE'))
    return monsterById
  const game = path.match(/^\/api\/games\/[^/]+\/(lobby|actions|state|stream)$/)
  if (game) {
    if (game[1] === 'lobby' && method === 'POST') return lobbyOp
    if (game[1] === 'actions' && method === 'POST') return actions
    if (game[1] === 'state' && method === 'GET') return state
    if (game[1] === 'stream' && method === 'GET') return stream
  }
  return null
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const handler = route(req.method, url.pathname)
  if (!handler) {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Not found', code: 'not_found' }))
    return
  }
  try {
    await handler(req as ApiRequest, res)
  } catch (err) {
    console.error(`[api-dev] ${req.method} ${url.pathname} crashed:`, err)
    if (!res.writableEnded) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Internal error', code: 'server_error' }))
    }
  }
})

server.listen(PORT, () => {
  console.log(`[api-dev] Lute Hero API harness on http://localhost:${PORT} (in-memory Redis)`)
})
