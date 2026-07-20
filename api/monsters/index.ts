import { getRedis } from '../_lib/redis.js'
import {
  ApiRequest,
  ApiResponse,
  readJsonBody,
  sendJson,
  sendError,
  methodNotAllowed,
} from '../_lib/http.js'
import {
  BESTIARY_TYPES,
  buildLevels,
  seedMonsters,
  slug,
  type BestiaryType,
  type Monster,
} from '../../src/bestiary/data.js'

const BESTIARY_KEY = 'bestiary:monsters'

/**
 * Read the roster from storage, seeding it from the shared roster on first
 * access so a fresh Redis (or in-memory) store is never empty.
 */
async function loadMonsters(): Promise<Monster[]> {
  const redis = await getRedis()
  const raw = await redis.get(BESTIARY_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as Monster[]
    } catch {
      /* corrupt value — reseed below */
    }
  }
  const seeded = seedMonsters()
  await redis.set(BESTIARY_KEY, JSON.stringify(seeded))
  return seeded
}

async function saveMonsters(monsters: Monster[]): Promise<void> {
  const redis = await getRedis()
  await redis.set(BESTIARY_KEY, JSON.stringify(monsters))
}

export { BESTIARY_KEY, loadMonsters, saveMonsters }

interface CreateMonsterBody {
  name?: string
  type?: string
  baseHp?: number | string
  tagline?: string
  imageUrl?: string
  levels?: Monster['levels']
}

/** GET /api/monsters — list all · POST /api/monsters — create one. */
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method === 'GET') {
    return sendJson(res, 200, await loadMonsters())
  }

  if (req.method === 'POST') {
    const body = await readJsonBody<CreateMonsterBody>(req)
    const name = body?.name?.trim()
    if (!name) return sendError(res, 400, 'bad_request', 'Name is required.')

    const type: BestiaryType = BESTIARY_TYPES.includes(body?.type as BestiaryType)
      ? (body!.type as BestiaryType)
      : 'fire'
    const baseHp = Number(body?.baseHp) || 0

    const monster: Monster = {
      id: `${slug(name)}-${Date.now()}`,
      name,
      type,
      baseHp,
      tagline: (body?.tagline || '').trim(),
      imageUrl: body?.imageUrl || '',
      hidden: false,
      levels: body?.levels || buildLevels(baseHp, type),
    }

    const monsters = await loadMonsters()
    await saveMonsters([monster, ...monsters])
    return sendJson(res, 201, monster)
  }

  return methodNotAllowed(res, 'GET, POST')
}
