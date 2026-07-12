import { beforeEach } from 'vitest'

/**
 * jsdom (as wired up by vitest) exposes `localStorage` as an empty object with
 * no methods, which makes zustand's `persist` middleware throw
 * "storage.setItem is not a function" the moment any store updates. Install a
 * spec-compliant in-memory Storage so persisted stores behave as they do in a
 * real browser during tests.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

const memoryStorage = new MemoryStorage()

Object.defineProperty(globalThis, 'localStorage', {
  value: memoryStorage,
  configurable: true,
  writable: true,
})

// Keep persisted state from leaking across tests.
beforeEach(() => {
  memoryStorage.clear()
})
