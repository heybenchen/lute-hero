import { randomBytes } from 'node:crypto'
import { DebugPreset, DebugPresetSummary } from '../../src/net/protocol.js'
import { changedTunablePaths, normalizeTunables } from '../../src/data/tunables.js'
import {
  RedisLike,
  presetKey,
  PRESET_INDEX_KEY,
  PRESET_TTL_SECONDS,
  MAX_PRESETS,
} from './redis.js'

export function newPresetId(): string {
  return `p_${randomBytes(6).toString('base64url')}`
}

/** Strip the engine state down to the metadata the picker list shows. */
export function toSummary(preset: DebugPreset): DebugPresetSummary {
  const state = preset.engineState
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    createdAt: preset.createdAt,
    changedTunables: changedTunablePaths(normalizeTunables(state?.tunables)).length,
    players: state?.players?.length ?? 0,
    round: state?.currentRound ?? 0,
    phase: state?.phase ?? 'setup',
  }
}

/**
 * The index is one JSON array under a single key rather than a Redis list —
 * RedisLike only exposes list *reads*, and a couple hundred summaries is far
 * too small to be worth widening that interface for.
 */
export async function loadIndex(redis: RedisLike): Promise<DebugPresetSummary[]> {
  const raw = await redis.get(PRESET_INDEX_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DebugPresetSummary[]) : []
  } catch {
    return []
  }
}

async function saveIndex(redis: RedisLike, index: DebugPresetSummary[]): Promise<void> {
  await redis.set(PRESET_INDEX_KEY, JSON.stringify(index), { ex: PRESET_TTL_SECONDS })
}

export async function loadPreset(redis: RedisLike, id: string): Promise<DebugPreset | null> {
  const raw = await redis.get(presetKey(id))
  if (!raw) return null
  try {
    return JSON.parse(raw) as DebugPreset
  } catch {
    return null
  }
}

/** Store a preset and put it at the head of the index, trimming the oldest. */
export async function savePreset(redis: RedisLike, preset: DebugPreset): Promise<DebugPresetSummary> {
  const summary = toSummary(preset)
  await redis.set(presetKey(preset.id), JSON.stringify(preset), { ex: PRESET_TTL_SECONDS })

  const index = await loadIndex(redis)
  const next = [summary, ...index.filter((p) => p.id !== preset.id)]
  const dropped = next.slice(MAX_PRESETS)
  if (dropped.length > 0) {
    await redis.del(...dropped.map((p) => presetKey(p.id)))
  }
  await saveIndex(redis, next.slice(0, MAX_PRESETS))
  return summary
}

export async function deletePreset(redis: RedisLike, id: string): Promise<boolean> {
  const existing = await loadPreset(redis, id)
  if (!existing) return false
  await redis.del(presetKey(id))
  const index = await loadIndex(redis)
  await saveIndex(redis, index.filter((p) => p.id !== id))
  return true
}
