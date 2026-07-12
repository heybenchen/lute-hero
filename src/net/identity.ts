/**
 * Anonymous identity: a secret token minted once per browser binds this
 * device to its seat in online games. Reconnecting = presenting the same
 * token to /api/lobbies/join.
 */

const IDENTITY_KEY = 'lute-hero-identity'
const SESSION_KEY = 'lute-hero-online-session'

export interface Identity {
  token: string
  name: string
}

export interface OnlineSession {
  gameId: string
  joinCode: string
}

export function getIdentity(): Identity {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Identity
      if (parsed.token) return parsed
    }
  } catch {
    // fall through to mint a fresh identity
  }
  const identity: Identity = { token: crypto.randomUUID(), name: '' }
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
  } catch {
    // private browsing — identity lives for this page only
  }
  return identity
}

export function saveIdentityName(name: string): void {
  const identity = { ...getIdentity(), name }
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
  } catch {
    // best-effort
  }
}

export function getOnlineSession(): OnlineSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OnlineSession
    return parsed.gameId && parsed.joinCode ? parsed : null
  } catch {
    return null
  }
}

export function saveOnlineSession(session: OnlineSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // best-effort
  }
}

export function clearOnlineSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // best-effort
  }
}
