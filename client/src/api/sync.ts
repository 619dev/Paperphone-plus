import { get } from './http'
import { dispatchIncoming } from './socket'
import { useStore } from '../store'

let syncInFlight: Promise<void> | null = null

function cursorKey(): string {
  return `pp_sync_cursor:${useStore.getState().user?.id || 'unknown'}`
}

export function syncMessages(): Promise<void> {
  if (syncInFlight) return syncInFlight
  syncInFlight = (async () => {
    let cursor = Number(localStorage.getItem(cursorKey()) || 0)
    for (let page = 0; page < 100; page++) {
      const result = await get<{messages:any[];next_cursor:number;has_more:boolean}>(
        `/api/messages/sync?after=${cursor}&limit=500`
      )
      for (const message of result.messages || []) {
        await dispatchIncoming({ ...message, type: 'message', offline: true })
      }
      const next = Number(result.next_cursor || cursor)
      if (next > cursor) {
        cursor = next
        localStorage.setItem(cursorKey(), String(cursor))
      }
      if (!result.has_more || next === cursor && !(result.messages || []).length) break
    }
  })().finally(() => { syncInFlight = null })
  return syncInFlight
}
