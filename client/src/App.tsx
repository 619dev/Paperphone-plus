import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from './store'
import { useSocket } from './hooks/useSocket'
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

function ProtectedLayout() {
  useSocket()
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/chats" replace /> : <Login />} />
        <Route path="/*" element={token ? <ProtectedLayout /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
