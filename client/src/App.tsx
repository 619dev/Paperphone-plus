import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import TabBar from './components/TabBar'
import { subscribePush, isPushSubscribed } from './api/push'
import { post } from './api/http'

function ProtectedLayout() {
  useSocket()

  // Auto-subscribe to push notifications when authenticated
  // Only auto-subscribe if permission already granted (to avoid browser blocking).
  // First-time permission prompt is triggered via Profile settings (user interaction).
  useEffect(() => {
    (async () => {
      // Web Push (VAPID)
      try {
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

      // OneSignal registration
      try {
        const w = window as any
        // Median.co native app wrapper
        if (w.median?.onesignal?.onesignalInfo) {
          w.median.onesignal.onesignalInfo((info: any) => {
            if (info?.oneSignalUserId) {
              post('/api/push/onesignal', {
                player_id: info.oneSignalUserId,
                platform: info.platform || 'unknown',
              }).catch(() => {})
            }
          })
        }
        // OneSignal Web SDK
        if (w.OneSignal) {
          const playerId = await w.OneSignal.getUserId?.()
          if (playerId) {
            post('/api/push/onesignal', {
              player_id: playerId,
              platform: 'web',
            }).catch(() => {})
          }
        }
      } catch {}
    })()
  }, [])

  return (
    <>
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
        <Route path="*" element={<Navigate to="/chats" replace />} />
      </Routes>
      <TabBar />
    </>
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/chats" replace /> : <Login />} />
        <Route path="/*" element={token ? <ProtectedLayout /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
