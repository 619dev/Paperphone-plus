import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from './store'
import { useSocket } from './hooks/useSocket'
import { loadFromIndexedDB } from './crypto/keystore'
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
import TabBar from './components/TabBar'
import CallOverlay from './components/CallOverlay'
import GroupCallOverlay from './components/GroupCallOverlay'
import NotificationToast from './components/NotificationToast'
import { CallProvider } from './contexts/CallContext'
import { GroupCallProvider } from './contexts/GroupCallContext'
import { registerServiceWorker, subscribePush, isPushSubscribed } from './api/push'
import { initOneSignal, loginOneSignal } from './api/onesignal'
import { get, post } from './api/http'
import { isNativePlatform } from './utils/platform'
import { initNativePush } from './api/nativePush'

function ProtectedLayout() {
  useSocket()

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
    } else {
      // ── Web/PWA: use Service Worker + Web Push + OneSignal ──
      registerServiceWorker().then(() => {
        console.log('[Push] Service worker ready')
      }).catch(() => {})

      // Web Push (VAPID)
      ;(async () => {
        try {
          if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission()
          }
          if ('Notification' in window && Notification.permission === 'granted') {
            const alreadySub = await isPushSubscribed()
            if (!alreadySub) {
              const ok = await subscribePush()
              if (ok) console.log('[Push] Web Push subscribed successfully')
            }
          }
        } catch (e) {
          console.warn('[Push] Web Push subscription failed:', e)
        }
      })()

      // OneSignal Web SDK v16
      ;(async () => {
        try {
          const token = useStore.getState().token
          if (!token) return
          const userId = getUserIdFromToken(token)
          if (!userId) return
          const ok = await initOneSignal()
          if (ok) {
            await loginOneSignal(userId)
            console.log('[OneSignal] ✅ Web SDK v16 fully initialized')
          }
        } catch (e) {
          console.warn('[OneSignal] Web SDK init failed:', e)
        }
      })()

      // OneSignal Median.co native wrapper fallback
      let attempt = 0
      const maxAttempts = 20
      const tryRegisterMedian = () => {
        const w = window as any
        if (w.median?.onesignal?.onesignalInfo) {
          w.median.onesignal.onesignalInfo((info: any) => {
            if (info?.oneSignalUserId) {
              post('/api/push/onesignal', {
                player_id: info.oneSignalUserId,
                platform: info.platform || 'android',
              }).catch(() => {})
            }
          })
        } else if (w.gonative?.onesignal?.onesignalInfo) {
          w.gonative.onesignal.onesignalInfo((info: any) => {
            if (info?.oneSignalUserId) {
              post('/api/push/onesignal', {
                player_id: info.oneSignalUserId,
                platform: info.platform || 'android',
              }).catch(() => {})
            }
          })
        } else {
          attempt++
          if (attempt < maxAttempts) setTimeout(tryRegisterMedian, 500)
        }
      }
      tryRegisterMedian()

      // Android battery optimization guidance (web only)
      showAndroidBatteryGuide()
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
  const theme = useStore(s => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Hydrate crypto keys from IndexedDB (tier 4 of 4-tier key persistence)
  useEffect(() => {
    loadFromIndexedDB().catch(() => {})
  }, [])

  // ── Capacitor: Deep Link handler ──
  // Handles paperphone:// URLs to navigate within the app
  useEffect(() => {
    if (!isNativePlatform()) return
    let cleanup: (() => void) | undefined
    import('@capacitor/app').then(({ App: CapApp }) => {
      const listener = CapApp.addListener('appUrlOpen', (event) => {
        console.log('[DeepLink] URL opened:', event.url)
        // paperphone://chat/123  → /chat/123
        // paperphone://user/abc  → /user/abc
        // paperphone://add-friend?id=xxx → /contacts?add=xxx
        try {
          const url = new URL(event.url)
          const path = url.pathname || url.host + (url.pathname || '')
          if (path) {
            window.location.href = '/' + path.replace(/^\/+/, '')
          }
        } catch {
          // Fallback: strip scheme and navigate
          const path = event.url.replace(/^paperphone:\/\//, '')
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
        <Route path="/*" element={token ? <ProtectedLayout /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

/**
 * Decode user_id from a JWT token without a library.
 * JWT format: header.payload.signature — we only need the payload.
 */
function getUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.id || payload.sub || null
  } catch {
    return null
  }
}

/**
 * Show a one-time guidance popup for Android users about disabling battery optimization.
 * This dramatically improves push notification reliability on Chinese OEM devices.
 */
function showAndroidBatteryGuide(): void {
  // Only show on Android
  if (!/Android/i.test(navigator.userAgent)) return

  // Only show once
  const STORAGE_KEY = 'android_battery_guide_shown'
  if (localStorage.getItem(STORAGE_KEY)) return
  localStorage.setItem(STORAGE_KEY, '1')

  // Delay to avoid blocking initial render
  setTimeout(() => {
    const isZH = /zh/i.test(navigator.language)

    const title = isZH ? '📱 开启消息通知' : '📱 Enable Notifications'
    const message = isZH
      ? '为确保消息及时送达，请进行以下设置：\n\n'
        + '1️⃣ 允许 PaperPhone 发送通知\n'
        + '2️⃣ 关闭电池优化（设置 → 电池 → 不受限制）\n'
        + '3️⃣ 允许后台运行\n\n'
        + '不同品牌操作路径略有不同：\n'
        + '• 小米/红米：设置 → 应用管理 → 省电策略 → 无限制\n'
        + '• 华为/荣耀：设置 → 电池 → 启动管理 → 手动管理\n'
        + '• OPPO/vivo：设置 → 电池 → 后台耗电管理\n'
        + '• 三星：设置 → 电池 → 后台使用限制\n'
      : 'To ensure timely message delivery:\n\n'
        + '1️⃣ Allow PaperPhone to send notifications\n'
        + '2️⃣ Disable battery optimization for this app\n'
        + '3️⃣ Allow background activity\n\n'
        + 'Go to: Settings → Battery → Unrestricted'

    // Use a non-blocking alert
    if ('Notification' in window && Notification.permission === 'default') {
      // If notification permission hasn't been requested yet, show guidance after
      console.log('[Android] Battery optimization guide:', message)
    } else {
      alert(message)
    }
  }, 3000)
}
