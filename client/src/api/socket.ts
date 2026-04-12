import { useStore } from '../store'

type MessageHandler = (data: any) => void

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
const handlers = new Map<string, Set<MessageHandler>>()

function getWsUrl(): string {
  const custom = import.meta.env.VITE_WS_URL
  if (custom) return custom

  // Derive from VITE_API_URL (backend address) when frontend is deployed separately
  const apiUrl = import.meta.env.VITE_API_URL
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
      const typeHandlers = handlers.get(type)
      if (typeHandlers) {
        typeHandlers.forEach(h => h(data))
      }
      // Also fire '*' handlers
      const allHandlers = handlers.get('*')
      if (allHandlers) {
        allHandlers.forEach(h => h(data))
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
