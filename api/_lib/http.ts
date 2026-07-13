import type { IncomingMessage, ServerResponse } from 'node:http'
import { ApiError } from '../../src/net/protocol.js'

/**
 * Handlers are written against plain Node req/res so the same code runs under
 * the Vercel Node runtime (which pre-parses query/body onto the request) and
 * the local dev harness (which does not).
 */
export type ApiRequest = IncomingMessage & {
  query?: Record<string, string | string[]>
  body?: unknown
}
export type ApiResponse = ServerResponse

export async function readJsonBody<T>(req: ApiRequest): Promise<T | null> {
  if (req.body !== undefined && req.body !== null) {
    // Vercel already parsed it (object) or left it as a string
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body) as T
      } catch {
        return null
      }
    }
    return req.body as T
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  if (chunks.length === 0) return null
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T
  } catch {
    return null
  }
}

export function getQueryParam(req: ApiRequest, name: string): string | null {
  const fromVercel = req.query?.[name]
  if (typeof fromVercel === 'string') return fromVercel
  if (Array.isArray(fromVercel)) return fromVercel[0] ?? null
  const url = new URL(req.url ?? '/', 'http://localhost')
  return url.searchParams.get(name)
}

/** Game id for /api/games/[id]/... routes: Vercel query param or URL segment. */
export function getGameId(req: ApiRequest): string | null {
  const fromQuery = getQueryParam(req, 'id')
  if (fromQuery) return fromQuery
  const url = new URL(req.url ?? '/', 'http://localhost')
  const match = url.pathname.match(/\/api\/games\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/** The player's secret token: header for POSTs, query for EventSource. */
export function getPlayerToken(req: ApiRequest): string | null {
  const header = req.headers['x-player-token']
  if (typeof header === 'string' && header.length > 0) return header
  return getQueryParam(req, 'token')
}

export function sendJson(res: ApiResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

export function sendError(res: ApiResponse, status: number, code: ApiError['code'], error: string): void {
  sendJson(res, status, { error, code } satisfies ApiError)
}

export function methodNotAllowed(res: ApiResponse, allowed: string): void {
  res.setHeader('Allow', allowed)
  sendError(res, 405, 'bad_request', `Method not allowed; use ${allowed}`)
}
