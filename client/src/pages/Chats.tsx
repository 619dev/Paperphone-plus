import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../api/http'
import { useStore, Friend, Group } from '../store'
import { useI18n } from '../hooks/useI18n'

export default function Chats() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const friends = useStore(s => s.friends)
  const groups = useStore(s => s.groups)
  const setFriends = useStore(s => s.setFriends)
  const setGroups = useStore(s => s.setGroups)
  const messages = useStore(s => s.messages)
  const unread = useStore(s => s.unread)
  const clearUnread = useStore(s => s.clearUnread)
  const [search, setSearch] = useState('')

  useEffect(() => {
    get<Friend[]>('/api/friends').then(setFriends).catch(() => {})
    get<Group[]>('/api/groups').then(setGroups).catch(() => {})
  }, [])

  // Build chat list from friends + groups with last message
  const chatList = [
    ...friends.map(f => ({
      id: f.id,
      name: f.nickname || f.username,
      avatar: f.avatar,
      isOnline: f.is_online,
      isGroup: false,
      lastMsg: messages[f.id]?.at(-1),
      unreadCount: unread[f.id] || 0,
    })),
    ...groups.map(g => ({
      id: g.id,
      name: g.name,
      avatar: g.avatar,
      isOnline: false,
      isGroup: true,
      lastMsg: messages[g.id]?.at(-1),
      unreadCount: unread[g.id] || 0,
    })),
  ].filter(c => {
    if (!search) return true
    return c.name.toLowerCase().includes(search.toLowerCase())
  }).sort((a, b) => {
    const tsA = a.lastMsg?.ts || 0
    const tsB = b.lastMsg?.ts || 0
    return tsB - tsA
  })

  const formatTime = (ts?: number) => {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const getPreview = (msg?: any) => {
    if (!msg) return ''
    switch (msg.msg_type) {
      case 'image': return t('chats.image')
      case 'file': return t('chats.file')
      case 'voice': return t('chats.voice')
      case 'video': return t('chats.video')
      case 'sticker': return t('chats.sticker')
      default: return msg.decrypted || msg.ciphertext?.substring(0, 30) || ''
    }
  }

  return (
    <div className="page" id="chats-page">
      <div className="page-header">
        <h1>{t('chats.title')}</h1>
      </div>

      <div className="search-bar">
        <input
          type="text" id="chat-search"
          placeholder={t('chats.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="page-body">
        {chatList.length === 0 ? (
          <div className="empty-state">
            <div className="icon">💬</div>
            <div>{t('chats.empty')}</div>
            <div style={{ marginTop: 4, fontSize: 13 }}>{t('chats.empty_hint')}</div>
          </div>
        ) : (
          chatList.map(chat => (
            <div
              key={chat.id}
              className="list-item"
              id={`chat-${chat.id}`}
              onClick={() => {
                clearUnread(chat.id)
                navigate(chat.isGroup ? `/chat/${chat.id}?group=1` : `/chat/${chat.id}`)
              }}
            >
              <div className="avatar" style={{ position: 'relative' }}>
                {chat.avatar ? <img src={chat.avatar} alt="" /> : (chat.isGroup ? '👥' : chat.name[0]?.toUpperCase())}
                {chat.isOnline && <span className="online-dot" />}
              </div>
              <div className="list-content">
                <div className="name">{chat.name}</div>
                <div className="preview">{getPreview(chat.lastMsg)}</div>
              </div>
              <div className="list-meta">
                <span className="time">{formatTime(chat.lastMsg?.ts)}</span>
                {chat.unreadCount > 0 && (
                  <span className="badge" style={{ position: 'static' }}>
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
