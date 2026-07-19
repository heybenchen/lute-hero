// Persistence layer.
//
// In production on Vercel, set a KV (Upstash Redis) store on the project and
// these env vars appear automatically:
//   KV_REST_API_URL  +  KV_REST_API_TOKEN   (Vercel KV naming)
// or
//   UPSTASH_REDIS_REST_URL  +  UPSTASH_REDIS_REST_TOKEN
//
// With no KV configured (e.g. local `next dev`), it falls back to an
// in-memory copy so the app still runs — but that copy resets on restart.

import { seedMonsters } from "./seed.js";

const KEY = "bestiary:monsters";

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const useKV = Boolean(REST_URL && REST_TOKEN);

// ---- Upstash/Vercel-KV REST helpers (no SDK, just fetch) ----
async function kvCommand(command) {
  const res = await fetch(REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV error ${res.status}`);
  const data = await res.json();
  return data.result;
}

// ---- in-memory fallback (dev only) ----
globalThis.__bestiary = globalThis.__bestiary || null;

export async function getMonsters() {
  if (useKV) {
    const raw = await kvCommand(["GET", KEY]);
    if (raw) return JSON.parse(raw);
    const seeded = seedMonsters();
    await kvCommand(["SET", KEY, JSON.stringify(seeded)]);
    return seeded;
  }
  if (!globalThis.__bestiary) globalThis.__bestiary = seedMonsters();
  return globalThis.__bestiary;
}

export async function setMonsters(monsters) {
  if (useKV) {
    await kvCommand(["SET", KEY, JSON.stringify(monsters)]);
  } else {
    globalThis.__bestiary = monsters;
  }
  return monsters;
}
