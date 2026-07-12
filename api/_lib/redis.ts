/**
 * Storage abstraction over Upstash Redis (production, via Vercel Marketplace
 * env vars) with an in-memory fallback for tests and the local dev harness.
 */

export interface CasGameWriteArgs {
  docKey: string
  versionKey: string
  eventsKey: string
  /** Version the caller loaded; the write only lands if it still matches. */
  expectedVersion: number
  docJson: string
  eventJson: string
  ttlSeconds: number
  maxEvents: number
}

export interface RedisLike {
  get(key: string): Promise<string | null>
  set(key: string, value: string, opts?: { ex?: number }): Promise<void>
  del(...keys: string[]): Promise<void>
  mget(keys: string[]): Promise<(string | null)[]>
  lrange(key: string, start: number, stop: number): Promise<string[]>
  /**
   * Atomic optimistic-concurrency game write: verifies the stored version,
   * writes the doc + version mirror, appends to the event log (trimmed), and
   * refreshes TTLs. Returns false when the version check fails (conflict).
   */
  casGameWrite(args: CasGameWriteArgs): Promise<boolean>
}

// ============================================================
// In-memory implementation (tests + local dev harness)
// ============================================================

interface MemoryEntry {
  value: string | string[]
  expiresAt: number | null
}

export class MemoryRedis implements RedisLike {
  private store = new Map<string, MemoryEntry>()

  private live(key: string): MemoryEntry | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry
  }

  async get(key: string): Promise<string | null> {
    const entry = this.live(key)
    return entry && typeof entry.value === 'string' ? entry.value : null
  }

  async set(key: string, value: string, opts?: { ex?: number }): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: opts?.ex ? Date.now() + opts.ex * 1000 : null,
    })
  }

  async del(...keys: string[]): Promise<void> {
    keys.forEach((k) => this.store.delete(k))
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map((k) => this.get(k)))
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const entry = this.live(key)
    if (!entry || !Array.isArray(entry.value)) return []
    const list = entry.value
    const end = stop === -1 ? list.length : stop + 1
    return list.slice(start, end)
  }

  async casGameWrite(args: CasGameWriteArgs): Promise<boolean> {
    // Single-threaded JS: this block is atomic by construction
    const current = await this.get(args.versionKey)
    const currentVersion = current === null ? 0 : parseInt(current, 10)
    if (currentVersion !== args.expectedVersion) return false

    const expiresAt = Date.now() + args.ttlSeconds * 1000
    this.store.set(args.docKey, { value: args.docJson, expiresAt })
    this.store.set(args.versionKey, { value: String(args.expectedVersion + 1), expiresAt })

    const eventsEntry = this.live(args.eventsKey)
    const list = eventsEntry && Array.isArray(eventsEntry.value) ? eventsEntry.value : []
    list.push(args.eventJson)
    while (list.length > args.maxEvents) list.shift()
    this.store.set(args.eventsKey, { value: list, expiresAt })
    return true
  }

  /** Test helper */
  clear(): void {
    this.store.clear()
  }
}

// ============================================================
// Upstash implementation (production)
// ============================================================

// Lua: atomic version check + doc/version write + event append/trim + TTLs
const CAS_SCRIPT = `
local current = redis.call('GET', KEYS[2])
if current == false then current = '0' end
if current ~= ARGV[1] then return 0 end
local next = tostring(tonumber(ARGV[1]) + 1)
redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[4]))
redis.call('SET', KEYS[2], next, 'EX', tonumber(ARGV[4]))
redis.call('RPUSH', KEYS[3], ARGV[3])
redis.call('LTRIM', KEYS[3], -tonumber(ARGV[5]), -1)
redis.call('EXPIRE', KEYS[3], tonumber(ARGV[4]))
return 1
`

interface UpstashClient {
  get(key: string): Promise<unknown>
  set(key: string, value: string, opts?: { ex?: number }): Promise<unknown>
  del(...keys: string[]): Promise<unknown>
  mget(...keys: string[]): Promise<unknown[]>
  lrange(key: string, start: number, stop: number): Promise<unknown[]>
  eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>
}

class UpstashRedis implements RedisLike {
  constructor(private client: UpstashClient) {}

  private str(v: unknown): string | null {
    if (v === null || v === undefined) return null
    return typeof v === 'string' ? v : JSON.stringify(v)
  }

  async get(key: string): Promise<string | null> {
    return this.str(await this.client.get(key))
  }

  async set(key: string, value: string, opts?: { ex?: number }): Promise<void> {
    await this.client.set(key, value, opts?.ex ? { ex: opts.ex } : undefined)
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length) await this.client.del(...keys)
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    if (!keys.length) return []
    const values = await this.client.mget(...keys)
    return values.map((v) => this.str(v))
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const values = await this.client.lrange(key, start, stop)
    return values.map((v) => this.str(v)!).filter((v) => v !== null)
  }

  async casGameWrite(args: CasGameWriteArgs): Promise<boolean> {
    const result = await this.client.eval(
      CAS_SCRIPT,
      [args.docKey, args.versionKey, args.eventsKey],
      [String(args.expectedVersion), args.docJson, args.eventJson, args.ttlSeconds, args.maxEvents]
    )
    return result === 1 || result === '1'
  }
}

// ============================================================
// Factory
// ============================================================

let instance: RedisLike | null = null
let warned = false

export async function getRedis(): Promise<RedisLike> {
  if (instance) return instance

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

  if (url && token) {
    const { Redis } = await import('@upstash/redis')
    instance = new UpstashRedis(new Redis({ url, token, automaticDeserialization: false }) as unknown as UpstashClient)
  } else {
    if (!warned) {
      console.warn('[lute-hero] No Upstash env vars found — using in-memory storage (dev/test only)')
      warned = true
    }
    instance = new MemoryRedis()
  }
  return instance
}

/** Test/dev hook: force a specific backend. */
export function setRedisForTesting(redis: RedisLike | null): void {
  instance = redis
}

// Key helpers
export const gameKey = (id: string) => `game:${id}`
export const versionKey = (id: string) => `game:${id}:version`
export const eventsKey = (id: string) => `game:${id}:events`
export const joinCodeKey = (code: string) => `joincode:${code.toUpperCase()}`
export const presenceKey = (gameId: string, seatId: string) => `presence:${gameId}:${seatId}`

export const GAME_TTL_SECONDS = 60 * 60 * 24 // 24h, refreshed on every write
export const PRESENCE_TTL_SECONDS = 15
export const MAX_EVENT_LOG = 200
