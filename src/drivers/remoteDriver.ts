import { GameAction } from '../engine/actions'
import { Driver, DispatchResult } from './types'
import { Snapshot, UpdateMessage, PresenceMessage, EventLogEntry } from '../net/protocol'
import { sendAction, ApiRequestError } from '../net/api'
import { GameStream } from '../net/sse'

export interface RemoteDriverCallbacks {
  /** Full snapshot on every (re)connect — reconcile wholesale. */
  onSnapshot(snapshot: Snapshot): void
  /** Incremental update accepted by the server. */
  onUpdate(message: UpdateMessage): void
  /** Animation events from OTHER seats' actions (own events come from dispatch). */
  onRemoteEntry(entry: EventLogEntry): void
  onPresence(message: PresenceMessage): void
  onConnectionChange(connected: boolean): void
}

/**
 * Online driver: actions go to the Vercel API; authoritative state and
 * everyone's animation events arrive over SSE. A per-seq dedup set makes
 * sure the acting client never animates its own dice twice (once from the
 * POST response, once from the stream).
 */
export class RemoteDriver implements Driver {
  private stream: GameStream
  private animatedSeqs = new Set<number>()

  constructor(
    private token: string,
    private gameId: string,
    private callbacks: RemoteDriverCallbacks
  ) {
    this.stream = new GameStream(token, gameId, {
      onSnapshot: (msg) => this.callbacks.onSnapshot(msg.snapshot),
      onUpdate: (msg) => {
        this.callbacks.onUpdate(msg)
        if (msg.entry.events.length > 0 && !this.animatedSeqs.has(msg.entry.seq)) {
          this.animatedSeqs.add(msg.entry.seq)
          this.callbacks.onRemoteEntry(msg.entry)
        }
        this.pruneAnimated()
      },
      onPresence: (msg) => this.callbacks.onPresence(msg),
      onConnectionChange: (connected) => this.callbacks.onConnectionChange(connected),
    })
  }

  start(): void {
    this.stream.start()
  }

  async dispatch(action: GameAction): Promise<DispatchResult> {
    try {
      const response = await sendAction(this.token, this.gameId, action, crypto.randomUUID())
      // The actor animates from this response; suppress the SSE copy
      this.animatedSeqs.add(response.seq)
      return { ok: true, events: response.events }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        return { ok: false, events: [], error: err.message }
      }
      return { ok: false, events: [], error: 'Connection problem — action not sent' }
    }
  }

  private pruneAnimated(): void {
    if (this.animatedSeqs.size > 300) {
      const sorted = [...this.animatedSeqs].sort((a, b) => a - b)
      sorted.slice(0, sorted.length - 100).forEach((s) => this.animatedSeqs.delete(s))
    }
  }

  stop(): void {
    this.stream.stop()
  }
}
