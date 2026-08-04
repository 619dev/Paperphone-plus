import { useStore } from '../store'
import { ensureRefreshToken, refreshAccessToken } from './http'

type MessageHandler = (data: any) => void | Promise<void>

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let authTimer: ReturnType<typeof setTimeout> | null = null
let ready = false
let lastPongAt = 0
let reconnectAttempt = 0
let upgradingLegacySession = false
let legacyUpgradeAttemptAt = 0
const handlers = new Map<string, Set<MessageHandler>>()

function outboxKey() { return `pp_outbox:${useStore.getState().user?.id || 'unknown'}` }
function readOutbox(): any[] {
  try { return JSON.parse(localStorage.getItem(outboxKey()) || '[]') } catch { return [] }
}
function writeOutbox(items: any[]) { localStorage.setItem(outboxKey(), JSON.stringify(items.slice(-500))) }
function queueOutbound(data: any) {
  const items = readOutbox()
  if (!items.some(item => item.client_msg_id === data.client_msg_id)) {
    items.push(data); writeOutbox(items)
  }
}
function acknowledgeOutbound(clientMsgId?: string) {
  if (clientMsgId) writeOutbox(readOutbox().filter(item => item.client_msg_id !== clientMsgId))
}
function flushOutbox(socket: WebSocket) {
  for (const item of readOutbox()) socket.send(JSON.stringify(item))
}

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
  return _eventQueue
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
  if (!token || ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return
  if (!localStorage.getItem('refreshToken') && !upgradingLegacySession && Date.now() - legacyUpgradeAttemptAt > 60000) {
    legacyUpgradeAttemptAt = Date.now()
    upgradingLegacySession = true
    void ensureRefreshToken().finally(() => { upgradingLegacySession = false; connectWs() })
    return
  }

  const socket = new WebSocket(getWsUrl())
  ws = socket

  socket.onopen = () => {
    // Authenticate
    socket.send(JSON.stringify({ type: 'auth', token }))
    authTimer = setTimeout(() => socket.close(), 10000)
  }

  socket.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      const type = data.type as string

      if (type === 'auth_ok') {
        if (authTimer) clearTimeout(authTimer)
        authTimer = null
        ready = true
        lastPongAt = Date.now()
        reconnectAttempt = 0
        useStore.getState().setWsConnected(true)
        flushOutbox(socket)
        heartbeatTimer = setInterval(() => {
          if (socket.readyState !== WebSocket.OPEN) return
          if (Date.now() - lastPongAt > 70000) {
            socket.close(4000, 'heartbeat timeout')
            return
          }
          socket.send(JSON.stringify({ type: 'ping', id: Date.now() }))
        }, 25000)
      } else if (type === 'pong') {
        lastPongAt = Date.now()
      } else if (type === 'auth_error' && data.refreshable) {
        void refreshAccessToken().finally(() => socket.close())
      }
      if (type === 'ack') acknowledgeOutbound(data.client_msg_id)

      dispatchIncoming(data)
    } catch { /* ignore parse errors */ }
  }

  socket.onclose = () => {
    if (ws !== socket) return
    ws = null
    ready = false
    useStore.getState().setWsConnected(false)
    cleanup()
    scheduleReconnect()
  }

  socket.onerror = () => {
    socket.close()
  }
}

export function dispatchIncoming(data: any): Promise<void> {
  const type = data?.type as string
  const dispatch = async () => {
    for (const h of handlers.get(type) || []) {
      try { await h(data) } catch (err) { console.error(`[WS] handler error for "${type}":`, err) }
    }
    for (const h of handlers.get('*') || []) {
      try { await h(data) } catch (err) { console.error('[WS] handler error for "*":', err) }
    }
  }
  if (SEQUENCED_TYPES.has(type)) return enqueueSequenced(dispatch)
  return dispatch()
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
  if (authTimer) clearTimeout(authTimer)
  authTimer = null
  ready = false
  useStore.getState().setWsConnected(false)
}

function scheduleReconnect() {
  if (reconnectTimer) return
  const delay = Math.min(30000, 1000 * 2 ** Math.min(reconnectAttempt++, 5))
  const jitter = Math.floor(Math.random() * 500)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectWs()
  }, delay + jitter)
}

export function forceReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
  reconnectAttempt = 0
  const old = ws
  ws = null
  cleanup()
  old?.close(4001, 'network changed')
  connectWs()
}

export function sendWs(data: any): boolean {
  if (data?.type === 'message') {
    data.client_msg_id ||= crypto.randomUUID()
    queueOutbound(data)
    if (!ready || ws?.readyState !== WebSocket.OPEN) return !!useStore.getState().token
  }
  if (ready && ws?.readyState === WebSocket.OPEN) {
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
