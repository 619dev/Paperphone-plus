import { SecurityError } from '../i18n/security'
import { get } from './http'
import { dispatchIncoming } from './socket'
import { useStore, flushMessageCache } from '../store'

const syncJobs = new Map<string, Promise<void>>()

function cursorKey(): string {
  return `pp_sync_cursor:${useStore.getState().user?.id || 'unknown'}`
}

export function syncMessages(): Promise<void> {
  const owner = useStore.getState().user?.id
  if (!owner) return Promise.resolve()
  const running = syncJobs.get(owner)
  if (running) return running
  const job = (async () => {
    const key = cursorKey()
    let cursor = Number(localStorage.getItem(key) || 0)
    while (useStore.getState().user?.id === owner) {
      const previous = cursor
      const result = await get<{messages:any[];next_cursor:number;has_more:boolean}>(
        `/api/messages/sync?after=${cursor}&limit=500`
      )
      if (useStore.getState().user?.id !== owner) return
      for (const message of result.messages || []) {
        if (useStore.getState().user?.id !== owner) return
        await dispatchIncoming({ ...message, type: 'message', offline: true })
      }
      if (useStore.getState().user?.id !== owner) return
      flushMessageCache()
      const next = Number(result.next_cursor || cursor)
      if (next > cursor) {
        cursor = next
        localStorage.setItem(key, String(cursor))
      }
      if (!result.has_more) break
      if (next <= previous) throw new SecurityError('crypto.cursor_stalled')
    }
  })().finally(() => { syncJobs.delete(owner) })
  syncJobs.set(owner, job)
  return job
}
