import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post } from '../api/http'
import { useStore, Friend } from '../store'
import { useI18n } from '../hooks/useI18n'

export default function Contacts() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const friends = useStore(s => s.friends)
  const groups = useStore(s => s.groups)
  const setFriends = useStore(s => s.setFriends)
  const setGroups = useStore(s => s.setGroups)

  const [tab, setTab] = useState<'friends' | 'groups' | 'requests'>('friends')
  const [requests, setRequests] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  useEffect(() => {
    get<Friend[]>('/api/friends').then(setFriends).catch(() => {})
    get('/api/groups').then(setGroups).catch(() => {})
    get('/api/friends/requests').then(setRequests).catch(() => {})
  }, [])

  const searchUsers = async () => {
    if (!searchQ.trim()) return
    try {
      const res = await get(`/api/users/search?q=${encodeURIComponent(searchQ)}`)
      setSearchResults(res)
    } catch {}
  }

  const sendFriendRequest = async (friendId: string) => {
    try {
      await post('/api/friends/request', { friend_id: friendId })
      searchUsers()
    } catch {}
  }

  const acceptRequest = async (friendId: string) => {
    try {
      await post('/api/friends/accept', { friend_id: friendId })
      setRequests(prev => prev.filter(r => r.id !== friendId))
      get<Friend[]>('/api/friends').then(setFriends).catch(() => {})
    } catch {}
  }

  return (
    <div className="page" id="contacts-page">
      <div className="page-header">
        <h1>{t('contacts.title')}</h1>
        <button className="btn btn-sm btn-secondary" onClick={() => setShowAdd(!showAdd)} style={{ marginLeft: 'auto' }}>
          {showAdd ? '✕' : '➕'}
        </button>
      </div>

      {showAdd && (
        <div style={{ padding: '8px 16px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input" id="search-user-input"
              placeholder={t('contacts.search_user')}
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchUsers()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={searchUsers}>{t('common.search')}</button>
          </div>
          {searchResults.map(u => (
            <div key={u.id} className="list-item">
              <div className="avatar avatar-sm">{u.avatar ? <img src={u.avatar} alt="" /> : u.nickname?.[0]}</div>
              <div className="list-content">
                <div className="name">{u.nickname}</div>
                <div className="preview">@{u.username}</div>
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => sendFriendRequest(u.id)}>
                {t('contacts.add_friend')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {(['friends', 'groups', 'requests'] as const).map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none',
              color: tab === tb ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === tb ? '2px solid var(--accent)' : 'none',
              fontWeight: tab === tb ? 600 : 400, fontSize: 14, cursor: 'pointer',
            }}
          >
            {t(`contacts.${tb}`)}
            {tb === 'requests' && requests.length > 0 && ` (${requests.length})`}
          </button>
        ))}
      </div>

      <div className="page-body">
        {tab === 'friends' && friends.map(f => (
          <div key={f.id} className="list-item" onClick={() => navigate(`/chat/${f.id}`)}>
            <div className="avatar" style={{ position: 'relative' }}>
              {f.avatar ? <img src={f.avatar} alt="" /> : f.nickname[0]?.toUpperCase()}
              {f.is_online && <span className="online-dot" />}
            </div>
            <div className="list-content">
              <div className="name">{f.nickname}</div>
              <div className="preview">@{f.username}</div>
            </div>
          </div>
        ))}

        {tab === 'groups' && (
          <>
            <div style={{ padding: 16 }}>
              <button className="btn btn-primary btn-full" onClick={() => {/* TODO: Create group modal */}}>
                {t('group.create')}
              </button>
            </div>
            {groups.map(g => (
              <div key={g.id} className="list-item" onClick={() => navigate(`/chat/${g.id}?group=1`)}>
                <div className="avatar">{g.avatar ? <img src={g.avatar} alt="" /> : '👥'}</div>
                <div className="list-content">
                  <div className="name">{g.name}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'requests' && requests.map(r => (
          <div key={r.id} className="list-item">
            <div className="avatar">{r.avatar ? <img src={r.avatar} alt="" /> : r.nickname?.[0]}</div>
            <div className="list-content">
              <div className="name">{r.nickname}</div>
              {r.message && <div className="preview">{r.message}</div>}
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => acceptRequest(r.id)}>
              {t('contacts.accept')}
            </button>
          </div>
        ))}

        {tab === 'friends' && friends.length === 0 && (
          <div className="empty-state"><div className="icon">👥</div><div>{t('contacts.empty')}</div></div>
        )}
      </div>
    </div>
  )
}
