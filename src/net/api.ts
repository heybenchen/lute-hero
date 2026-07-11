import {
  CreateLobbyResponse,
  JoinLobbyResponse,
  LobbyOpRequest,
  ActionRequest,
  ActionResponse,
  Snapshot,
  ApiError,
} from './protocol'
import { GameAction } from '../engine/actions'

const BASE = '/api'

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: ApiError['code'],
    message: string
  ) {
    super(message)
  }
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-player-token': token,
      ...init?.headers,
    },
  })
  const data = (await res.json().catch(() => null)) as T | ApiError | null
  if (!res.ok) {
    const err = data as ApiError | null
    throw new ApiRequestError(res.status, err?.code ?? 'server_error', err?.error ?? `Request failed (${res.status})`)
  }
  return data as T
}

export function createLobby(token: string, name: string): Promise<CreateLobbyResponse> {
  return request('/lobbies', token, { method: 'POST', body: JSON.stringify({ name }) })
}

export function joinLobby(token: string, joinCode: string, name: string): Promise<JoinLobbyResponse> {
  return request('/lobbies/join', token, { method: 'POST', body: JSON.stringify({ joinCode, name }) })
}

export function lobbyOp(
  token: string,
  gameId: string,
  op: LobbyOpRequest
): Promise<{ snapshot: Snapshot }> {
  return request(`/games/${gameId}/lobby`, token, { method: 'POST', body: JSON.stringify(op) })
}

export function sendAction(
  token: string,
  gameId: string,
  action: GameAction,
  clientActionId: string
): Promise<ActionResponse> {
  const body: ActionRequest = { clientActionId, action }
  return request(`/games/${gameId}/actions`, token, { method: 'POST', body: JSON.stringify(body) })
}

export function fetchState(token: string, gameId: string): Promise<{ snapshot: Snapshot }> {
  return request(`/games/${gameId}/state`, token, { method: 'GET' })
}

export function streamUrl(token: string, gameId: string): string {
  return `${BASE}/games/${gameId}/stream?token=${encodeURIComponent(token)}`
}
