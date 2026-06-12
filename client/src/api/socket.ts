import { useStore } from '../store'

type MessageHandler = (data: any) => void | Promise<void>

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
const handlers = new Map<string, Set<MessageHandler>>()

/**
 * Sequential async event queue.
 *
 * Critical WS events (sender_key_distribution, message) share a single queue
 * so that a sender_key_distribution handler ALWAYS completes before any
 * subsequent message handler runs. Without this, the async
 * receiveSenderKey() inside the distribution handler yields at `await`,
 * and the message handler fires before the key is stored → 🔒.
 */
const SEQUENCED_TYPES = new Set(['sender_key_distribution', 'sender_key_invalidated', 'message'])
let _eventQueue: Promise<void> = Promise.resolve()

function enqueueSequenced(fn: () => Promise<void>) {
  _eventQueue = _eventQueue.then(fn, fn) // always chain, even on error
}

function getWsUrl(): string {
  const custom = import.meta.env.VITE_WS_URL
  if (custom) return custom

  // Derive from user-configured serverUrl or VITE_API_URL
  const apiUrl = localStorage.getItem('serverUrl') || import.meta.env.VITE_API_URL
  if (apiUrl) {
    const url = apiUrl.replace(/\/$/, '') // trim trailing slash
    const wsUrl = url.replace(/^http/, 'ws') // http→ws, https→wss
    return `${wsUrl}/ws`
  }

  // Fallback: same host (frontend and backend co-located)
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/ws`
}

export function connectWs() {
  const token = useStore.getState().token
  if (!token || ws?.readyState === WebSocket.OPEN) return

  ws = new WebSocket(getWsUrl())

  ws.onopen = () => {
    // Authenticate
    ws!.send(JSON.stringify({ type: 'auth', token }))
    useStore.getState().setWsConnected(true)

    // Heartbeat
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      const type = data.type as string

      const dispatch = async () => {
        const typeHandlers = handlers.get(type)
        if (typeHandlers) {
          for (const h of typeHandlers) {
            try { await h(data) } catch (err) {
              console.error(`[WS] handler error for "${type}":`, err)
            }
          }
        }
        // Also fire '*' handlers
        const allHandlers = handlers.get('*')
        if (allHandlers) {
          for (const h of allHandlers) {
            try { await h(data) } catch (err) {
              console.error('[WS] handler error for "*":', err)
            }
          }
        }
      }

      if (SEQUENCED_TYPES.has(type)) {
        // Queue: sender_key_distribution must finish before message runs
        enqueueSequenced(dispatch)
      } else {
        // Non-critical events fire immediately (ack, typing, online, etc.)
        dispatch()
      }
    } catch { /* ignore parse errors */ }
  }

  ws.onclose = () => {
    useStore.getState().setWsConnected(false)
    cleanup()
    scheduleReconnect()
  }

  ws.onerror = () => {
    ws?.close()
  }
}

export function disconnectWs() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
  cleanup()
  ws?.close()
  ws = null
}

function cleanup() {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectWs()
  }, 3000)
}

export function sendWs(data: any): boolean {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
    return true
  }
  return false
}

export function onWs(type: string, handler: MessageHandler): () => void {
  if (!handlers.has(type)) handlers.set(type, new Set())
  handlers.get(type)!.add(handler)
  return () => { handlers.get(type)?.delete(handler) }
}
