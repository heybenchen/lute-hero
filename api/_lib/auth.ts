import { createHash, randomBytes } from 'node:crypto'
import { GameDoc, Seat } from '../../src/net/protocol.js'

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Find the seat bound to a player token, or null. */
export function findSeatByToken(doc: GameDoc, token: string | null): Seat | null {
  if (!token) return null
  const tokenHash = hashToken(token)
  return doc.seats.find((s) => s.tokenHash === tokenHash) ?? null
}

export function newGameId(): string {
  return `g_${randomBytes(9).toString('base64url')}`
}

export function newSeatId(): string {
  return `seat_${randomBytes(6).toString('base64url')}`
}

// Join codes avoid ambiguous characters (0/O, 1/I)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function newJoinCode(): string {
  const bytes = randomBytes(6)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return code
}
