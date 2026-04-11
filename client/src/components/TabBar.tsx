import { NavLink, useLocation } from 'react-router-dom'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../store'

export default function TabBar() {
  const { t } = useI18n()
  const location = useLocation()
  const unread = useStore(s => s.unread)

  // Hide TabBar on chat, user profile, group info pages
  const hiddenPaths = ['/chat/', '/user/', '/group/', '/moments', '/timeline']
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0)

  return (
    <nav className="tabbar" id="main-tabbar">
      <NavLink to="/chats" className={({ isActive }) => `tabbar-item ${isActive ? 'active' : ''}`}>
        <span className="tab-icon">💬</span>
        <span>{t('tab.chats')}</span>
        {totalUnread > 0 && <span className="badge">{totalUnread > 99 ? '99+' : totalUnread}</span>}
      </NavLink>
      <NavLink to="/contacts" className={({ isActive }) => `tabbar-item ${isActive ? 'active' : ''}`}>
        <span className="tab-icon">👥</span>
        <span>{t('tab.contacts')}</span>
      </NavLink>
      <NavLink to="/discover" className={({ isActive }) => `tabbar-item ${isActive ? 'active' : ''}`}>
        <span className="tab-icon">🧭</span>
        <span>{t('tab.discover')}</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `tabbar-item ${isActive ? 'active' : ''}`}>
        <span className="tab-icon">👤</span>
        <span>{t('tab.profile')}</span>
      </NavLink>
    </nav>
  )
}
