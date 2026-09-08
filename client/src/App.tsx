import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useStore } from './store'
import { useSocket } from './hooks/useSocket'
import { loadFromIndexedDB } from './crypto/keystore'
import { hydrateSenderKeys } from './crypto/groupCrypto'
import { handlePresentationAppState, hydratePresentationCrypto, isPresentationUnlocked, presentationCiphertextForPlaintext } from './crypto/presentationCrypto'
import { applyNativeProxy } from './api/proxy-bridge'
import Login from './pages/Login'
import Chats from './pages/Chats'
import Chat from './pages/Chat'
import Contacts from './pages/Contacts'
import Discover from './pages/Discover'
import Profile from './pages/Profile'
import UserProfile from './pages/UserProfile'
import GroupInfo from './pages/GroupInfo'
import Moments from './pages/Moments'
import Timeline from './pages/Timeline'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfUse from './pages/TermsOfUse'
import TabBar from './components/TabBar'
import CallOverlay from './components/CallOverlay'
import GroupCallOverlay from './components/GroupCallOverlay'
import CallKeepAwake from './components/CallKeepAwake'
import NotificationToast from './components/NotificationToast'
import { CallProvider } from './contexts/CallContext'
import { GroupCallProvider } from './contexts/GroupCallContext'
import { get, post, initializeLegacyFileMapping } from './api/http'
import { isNativePlatform } from './utils/platform'
import { initNativePush } from './api/nativePush'
import { useAutoDeleteCleanup } from './hooks/useAutoDeleteCleanup'

function ProtectedLayout() {
  useSocket()
  useAutoDeleteCleanup()
  const [, setFileMappingRevision] = useState(0)

  useEffect(() => {
    initializeLegacyFileMapping().finally(() => setFileMappingRevision(v => v + 1))
  }, [])

  // Auto-subscribe to push notifications when authenticated
  useEffect(() => {
    if (isNativePlatform()) {
      // ── Capacitor Native: use FCM directly ──
      initNativePush().catch(e => console.warn('[NativePush] Init failed:', e))

      // ── ntfy fallback: auto-register topic for Chinese Android without GMS ──
      ;(async () => {
        try {
          const topicRes = await get<{ ntfy_topic: string }>('/api/push/ntfy-topic')
          if (topicRes?.ntfy_topic) {
            const statusRes = await get<any>('/api/push/status')
            if (!statusRes?.user_ntfy_subscriptions || statusRes.user_ntfy_subscriptions === 0) {
              await post('/api/push/ntfy', { ntfy_topic: topicRes.ntfy_topic, platform: 'android' })
              console.log('[ntfy] ✅ Auto-registered topic:', topicRes.ntfy_topic)
            }
          }
        } catch (e) {
          console.warn('[ntfy] Auto-register failed:', e)
        }
      })()
    }
  }, [])

  // ── Capacitor: Android back button handling ──
  useEffect(() => {
    if (!isNativePlatform()) return
    let cleanup: (() => void) | undefined
    import('@capacitor/app').then(({ App }) => {
      const listener = App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back()
        } else {
          App.exitApp()
        }
      })
      cleanup = () => { listener.then(l => l.remove()) }
    })
    return () => { cleanup?.() }
  }, [])

  return (
    <CallProvider>
      <GroupCallProvider>
        <CallKeepAwake />
        <Routes>
          <Route path="/chats" element={<Chats />} />
          <Route path="/chat/:id" element={<Chat />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/group/:id" element={<GroupInfo />} />
          <Route path="/moments" element={<Moments />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="*" element={<Navigate to="/chats" replace />} />
        </Routes>
        <TabBar />
        <CallOverlay />
        <GroupCallOverlay />
        <NotificationToast />
      </GroupCallProvider>
    </CallProvider>
  )
}

export default function App() {
  const token = useStore(s => s.token)
  const user = useStore(s => s.user)
  const theme = useStore(s => s.theme)
  const [hydratedAccount, setHydratedAccount] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    let cancelled = false
    if (!token || !user?.id) {
      setHydratedAccount(null)
      return
    }
    Promise.all([loadFromIndexedDB(user.id), hydrateSenderKeys(user.id), hydratePresentationCrypto(user.id)])
      .then(() => { if (!cancelled) setHydratedAccount(user.id) })
      .catch(err => {
        console.error('[App] Secure crypto state hydration failed:', err)
        if (!cancelled) setHydratedAccount(user.id)
      })
    return () => { cancelled = true }
  }, [token, user?.id])

  useEffect(() => {
    const onVisibility = () => handlePresentationAppState(document.visibilityState === 'visible')
    const onPresentationState = () => {
      if (isPresentationUnlocked()) return
      const messages = useStore.getState().messages
      const locked = Object.fromEntries(Object.entries(messages).map(([chatId, items]) => [
        chatId,
        items.map(({ decrypted, ...message }) => ({ ...message, ...(presentationCiphertextForPlaintext(decrypted) ? { decrypted: presentationCiphertextForPlaintext(decrypted) } : {}) })),
      ]))
      useStore.setState({ messages: locked })
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('paperphone:presentation-state-changed', onPresentationState)
    let removeNative: (() => void) | undefined
    import('@capacitor/app').then(({ App: CapApp }) => CapApp.addListener('appStateChange', ({ isActive }) => handlePresentationAppState(isActive)))
      .then(handle => { removeNative = () => void handle.remove() }).catch(() => {})
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('paperphone:presentation-state-changed', onPresentationState)
      removeNative?.()
    }
  }, [])

  // Apply persisted proxy settings on app startup (native Android)
  useEffect(() => {
    const { proxyList, activeProxyId } = useStore.getState()
    if (activeProxyId) {
      const activeProxy = proxyList.find(p => p.id === activeProxyId)
      if (activeProxy && activeProxy.host && activeProxy.port) {
        applyNativeProxy(activeProxy)
      }
    }
  }, [])

  // ── Capacitor: Deep Link handler ──
  // Handles paperphoneplus:// URLs to navigate within the app
  useEffect(() => {
    if (!isNativePlatform()) return
    let cleanup: (() => void) | undefined
    import('@capacitor/app').then(({ App: CapApp }) => {
      const listener = CapApp.addListener('appUrlOpen', (event) => {
        console.log('[DeepLink] URL opened:', event.url)
        // paperphoneplus://chat/123  → /chat/123
        // paperphoneplus://user/abc  → /user/abc
        // paperphoneplus://add-friend?id=xxx → /contacts?add=xxx
        try {
          const url = new URL(event.url)
          const path = url.pathname || url.host + (url.pathname || '')
          if (path) {
            window.location.href = '/' + path.replace(/^\/+/, '')
          }
        } catch {
          // Fallback: strip scheme and navigate
          const path = event.url.replace(/^paperphoneplus:\/\//, '')
          if (path) window.location.href = '/' + path
        }
      })
      cleanup = () => { listener.then(l => l.remove()) }
    })
    return () => { cleanup?.() }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/chats" replace /> : <Login />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
        <Route path="/*" element={token && user?.id && hydratedAccount === user.id ? <ProtectedLayout /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
