/**
 * Cross-tab communication via BroadcastChannel API.
 * Notifies other browser tabs when data changes so they can refresh.
 */

type DataChangeMessage = {
  type: 'data_changed'
  table: string
  ts: number
}

type CrossTabHandler = (table: string) => void

let bc: BroadcastChannel | null = null
const handlers: Set<CrossTabHandler> = new Set()

/** Initialize BroadcastChannel (call once on app mount) */
export function initCrossTab(): void {
  if (typeof window === 'undefined') return
  if (!('BroadcastChannel' in window)) return
  if (bc) return // already initialized

  bc = new BroadcastChannel('sinabro_erp')
  bc.onmessage = (event: MessageEvent<DataChangeMessage>) => {
    if (event.data?.type === 'data_changed' && event.data.table) {
      handlers.forEach((fn) => fn(event.data.table))
    }
  }
}

/** Cleanup BroadcastChannel (call on logout) */
export function closeCrossTab(): void {
  if (bc) {
    bc.close()
    bc = null
  }
  handlers.clear()
}

/**
 * Notify other tabs that data in a table has changed.
 * Call after successful INSERT/UPDATE/DELETE.
 */
export function notifyOtherTabs(table: string): void {
  if (!bc) return
  try {
    bc.postMessage({
      type: 'data_changed',
      table,
      ts: Date.now(),
    } satisfies DataChangeMessage)
  } catch {
    // BroadcastChannel may be closed
  }
}

/**
 * Subscribe to data change notifications from other tabs.
 * Returns unsubscribe function.
 */
export function onDataChange(handler: CrossTabHandler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}
