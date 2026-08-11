import {
  DebugPreset,
  SavePresetRequest,
  SavePresetResponse,
  ListPresetsResponse,
  GetPresetResponse,
} from '../../src/net/protocol.js'
import { normalizeEngineState } from '../../src/engine/state.js'
import { getRedis } from '../_lib/redis.js'
import { newPresetId, loadIndex, loadPreset, savePreset, deletePreset } from '../_lib/presets.js'
import {
  ApiRequest,
  ApiResponse,
  readJsonBody,
  sendJson,
  sendError,
  methodNotAllowed,
  getQueryParam,
  getPlayerToken,
} from '../_lib/http.js'

const MAX_NAME = 60
const MAX_DESCRIPTION = 280

/** Presets are a playtesting aid; set this to turn the endpoints off entirely. */
function debugDisabled(): boolean {
  return process.env.LUTE_HERO_DISABLE_DEBUG === '1'
}

/** Absolute origin for the shareable restore link. */
function originOf(req: ApiRequest): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:5173'
  return `${proto}://${host}`
}

/**
 * /api/debug/presets
 *   GET                → list preset summaries
 *   GET  ?id=p_xxx     → fetch one preset in full (engine state included)
 *   POST               → save a named preset, returns its shareable URL
 *   DELETE ?id=p_xxx   → remove one
 */
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (debugDisabled()) {
    return sendError(res, 404, 'not_found', 'Debug mode is disabled on this deployment')
  }

  // Any identified browser may read/write presets — they are shared playtest
  // scenarios, not per-player secrets. Applying one still needs the host seat.
  if (!getPlayerToken(req)) {
    return sendError(res, 401, 'unauthorized', 'Missing player token')
  }

  const redis = await getRedis()

  if (req.method === 'GET') {
    const id = getQueryParam(req, 'id')
    if (!id) {
      return sendJson(res, 200, { presets: await loadIndex(redis) } satisfies ListPresetsResponse)
    }
    const preset = await loadPreset(redis, id)
    if (!preset) return sendError(res, 404, 'not_found', 'No such preset')
    return sendJson(res, 200, { preset } satisfies GetPresetResponse)
  }

  if (req.method === 'POST') {
    const body = await readJsonBody<SavePresetRequest>(req)
    const name = body?.name?.trim().slice(0, MAX_NAME)
    if (!name) return sendError(res, 400, 'bad_request', 'A preset name is required')
    if (!body?.engineState || typeof body.engineState !== 'object') {
      return sendError(res, 400, 'bad_request', 'A game state is required')
    }
    if (!Array.isArray(body.engineState.players) || !Array.isArray(body.engineState.spaces)) {
      return sendError(res, 400, 'bad_request', 'That is not a valid game state')
    }

    const preset: DebugPreset = {
      id: newPresetId(),
      name,
      description: body.description?.trim().slice(0, MAX_DESCRIPTION) ?? '',
      // Normalize on the way in, so a preset saved by an older client still
      // restores into a complete, in-range state later.
      engineState: normalizeEngineState(body.engineState),
      createdAt: Date.now(),
    }

    const summary = await savePreset(redis, preset)
    return sendJson(res, 200, {
      preset: summary,
      url: `${originOf(req)}/?preset=${encodeURIComponent(preset.id)}`,
    } satisfies SavePresetResponse)
  }

  if (req.method === 'DELETE') {
    const id = getQueryParam(req, 'id')
    if (!id) return sendError(res, 400, 'bad_request', 'A preset id is required')
    const removed = await deletePreset(redis, id)
    if (!removed) return sendError(res, 404, 'not_found', 'No such preset')
    return sendJson(res, 200, { ok: true })
  }

  methodNotAllowed(res, 'GET, POST, DELETE')
}
