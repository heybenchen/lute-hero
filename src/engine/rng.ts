import { Rng } from '../types/index.js'

/**
 * mulberry32 — small, fast, deterministic PRNG. Given the same 32-bit seed
 * it produces the same sequence everywhere (server and browser), which is
 * what lets the server own dice rolls and clients replay them.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A fresh unpredictable 32-bit seed (crypto where available). */
export function randomSeed(): number {
  const cryptoObj = globalThis.crypto
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(1)
    cryptoObj.getRandomValues(buf)
    return buf[0]
  }
  return Math.floor(Math.random() * 0xffffffff)
}
