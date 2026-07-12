import { SnapshotMessage, UpdateMessage, PresenceMessage } from './protocol'
import { streamUrl } from './api'

export interface StreamCallbacks {
  onSnapshot(message: SnapshotMessage): void
  onUpdate(message: UpdateMessage): void
  onPresence(message: PresenceMessage): void
  onConnectionChange(connected: boolean): void
}

/**
 * EventSource wrapper for the game stream. Handles the server's `goodbye`
 * (duration cap) by reconnecting immediately, and browser-level drops via
 * EventSource's native retry. Every (re)connect receives a fresh snapshot,
 * so no client-side gap tracking is needed.
 */
export class GameStream {
  private es: EventSource | null = null
  private stopped = false

  constructor(
    private token: string,
    private gameId: string,
    private callbacks: StreamCallbacks
  ) {}

  start(): void {
    this.stopped = false
    this.open()
  }

  private open(): void {
    if (this.stopped) return
    this.es?.close()

    const es = new EventSource(streamUrl(this.token, this.gameId))
    this.es = es

    es.addEventListener('open', () => this.callbacks.onConnectionChange(true))
    es.addEventListener('error', () => {
      // EventSource retries automatically while in CONNECTING; if the browser
      // gave up (CLOSED), reopen ourselves after a short backoff.
      this.callbacks.onConnectionChange(false)
      if (es.readyState === EventSource.CLOSED && !this.stopped) {
        setTimeout(() => this.open(), 1500)
      }
    })

    es.addEventListener('snapshot', (e) => {
      this.callbacks.onSnapshot(JSON.parse((e as MessageEvent).data) as SnapshotMessage)
    })
    es.addEventListener('update', (e) => {
      this.callbacks.onUpdate(JSON.parse((e as MessageEvent).data) as UpdateMessage)
    })
    es.addEventListener('presence', (e) => {
      this.callbacks.onPresence(JSON.parse((e as MessageEvent).data) as PresenceMessage)
    })
    es.addEventListener('goodbye', () => {
      // Planned rotation before the serverless duration cap — reconnect now
      if (!this.stopped) this.open()
    })
  }

  stop(): void {
    this.stopped = true
    this.es?.close()
    this.es = null
  }
}
