import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get, post, put } from '../api/http'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'

export default function UserProfile() {
  const { id } = useParams<{ id: string }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const me = useStore(s => s.user)
  const friends = useStore(s => s.friends)
  const friend = friends.find(f => f.id === id)

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Privacy
  const [hideTheir, setHideTheir] = useState(false)
  const [hideMine, setHideMine] = useState(false)

  // Remark
  const [remark, setRemark] = useState('')
  const [editingRemark, setEditingRemark] = useState(false)
  const [remarkInput, setRemarkInput] = useState('')

  // Latest moments
  const [moments, setMoments] = useState<any[]>([])

  useEffect(() => {
    if (!id) return
    setLoading(true)

    // Load user info
    get(`/api/users/${id}`).then(setUser).catch(() => {})

    // Load privacy settings
    get(`/api/moments/privacy/${id}`).then((data: any) => {
      setHideTheir(!!data.hide_their)
      setHideMine(!!data.hide_mine)
    }).catch(() => {})

    // Load latest moments
    get(`/api/moments/user/${id}?limit=3`).then(setMoments).catch(() => {})

    // Set remark from friend store
    if (friend?.remark) setRemark(friend.remark)

    setLoading(false)
  }, [id])

  // Update remark from friend data
  useEffect(() => {
    if (friend?.remark) setRemark(friend.remark)
  }, [friend?.remark])

  const handleTogglePrivacy = async (field: 'hide_their' | 'hide_mine', value: boolean) => {
    const payload: any = { target_id: id }
    if (field === 'hide_their') {
      setHideTheir(value)
      payload.hide_their = value
      payload.hide_mine = hideMine
    } else {
      setHideMine(value)
      payload.hide_their = hideTheir
      payload.hide_mine = value
    }
    try { await post('/api/moments/privacy', payload) } catch {}
  }

  const saveRemark = async () => {
    const val = remarkInput.trim() || null
    try {
      await put('/api/friends/remark', { friend_id: id, remark: val })
      setRemark(val || '')
      setEditingRemark(false)
      // Refresh friends list
      const f = await get('/api/friends')
      useStore.getState().setFriends(f)
    } catch {}
  }

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts
    if (diff < 60000) return t('time.just_now')
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t('time.minutes_ago')}`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${t('time.hours_ago')}`
    return new Date(ts).toLocaleDateString()
  }

  if (loading || !user) return <div className="page"><div className="loading-spinner" /></div>

  const displayName = remark || user.nickname

  return (
    <div className="page" id="user-profile-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>{displayName}</h1>
      </div>
      <div className="page-body">
        {/* Profile card */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '28px 16px 20px',
          background: 'var(--surface)',
          borderRadius: 16, margin: '8px 12px',
        }}>
          <div className="avatar avatar-lg" style={{ marginBottom: 12 }}>
            {user.avatar ? <img src={user.avatar} alt="" /> : user.nickname?.[0]?.toUpperCase()}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{displayName}</div>
          {remark && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {t('friend.original_name')}: {user.nickname}
            </div>
          )}
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>@{user.username}</div>
          <div style={{
            fontSize: 12, padding: '2px 10px', borderRadius: 10,
            background: user.is_online ? 'rgba(76,175,80,0.15)' : 'rgba(158,158,158,0.15)',
            color: user.is_online ? '#4caf50' : '#9e9e9e',
            marginBottom: 16,
          }}>
            {user.is_online ? '● ' + t('contacts.online') : '○ ' + t('contacts.offline')}
          </div>
          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 280 }}>
            <button className="btn btn-primary btn-full" onClick={() => navigate(`/chat/${id}`)}>
              💬 {t('chat.send')}
            </button>
            <button className="btn btn-secondary btn-full" onClick={() => navigate(`/chat/${id}`)}>
              📞 {t('call.voice')}
            </button>
          </div>
        </div>

        {/* Remark */}
        <div className="section-title" style={{ padding: '16px 16px 6px' }}>
          ✏️ {t('friend.remark')}
        </div>
        {editingRemark ? (
          <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
            <input
              className="input"
              value={remarkInput}
              onChange={e => setRemarkInput(e.target.value)}
              placeholder={t('friend.remark_placeholder')}
              maxLength={128}
              autoFocus
              style={{ flex: 1 }}
            />
            <button className="btn btn-sm btn-primary" onClick={saveRemark}>{t('common.save')}</button>
            <button className="btn btn-sm btn-secondary" onClick={() => setEditingRemark(false)}>{t('common.cancel')}</button>
          </div>
        ) : (
          <div
            className="settings-item"
            onClick={() => { setRemarkInput(remark); setEditingRemark(true) }}
            style={{ cursor: 'pointer' }}
          >
            <span className="label" style={{ color: remark ? 'var(--text)' : 'var(--text-muted)' }}>
              {remark || t('friend.no_remark')}
            </span>
            <span className="arrow">›</span>
          </div>
        )}

        {/* Privacy settings */}
        <div className="section-title" style={{ padding: '16px 16px 6px' }}>
          🔒 {t('friend.privacy')}
        </div>

        <div className="settings-item" onClick={() => handleTogglePrivacy('hide_their', !hideTheir)} style={{ cursor: 'pointer' }}>
          <span className="label">{t('friend.hide_their_moments')}</span>
          <div style={{
            width: 44, height: 24, borderRadius: 12,
            background: hideTheir ? 'var(--accent)' : 'var(--border)',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10,
              background: '#fff', position: 'absolute', top: 2,
              left: hideTheir ? 22 : 2, transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>

        <div className="settings-item" onClick={() => handleTogglePrivacy('hide_mine', !hideMine)} style={{ cursor: 'pointer' }}>
          <span className="label">{t('friend.hide_my_moments')}</span>
          <div style={{
            width: 44, height: 24, borderRadius: 12,
            background: hideMine ? 'var(--accent)' : 'var(--border)',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10,
              background: '#fff', position: 'absolute', top: 2,
              left: hideMine ? 22 : 2, transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>

        {/* Latest moments */}
        <div className="section-title" style={{ padding: '16px 16px 6px' }}>
          📷 {t('friend.latest_moments')}
        </div>

        {moments.length === 0 ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            {t('friend.no_moments')}
          </div>
        ) : (
          moments.map(m => (
            <div key={m.id} style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
            }}>
              {m.text_content && (
                <div style={{ fontSize: 14, marginBottom: 8, lineHeight: 1.5 }}>
                  {m.text_content.length > 120 ? m.text_content.slice(0, 120) + '...' : m.text_content}
                </div>
              )}

              {/* Images preview — show up to 3 thumbnails */}
              {m.images?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {m.images.slice(0, 3).map((url: string, i: number) => (
                    <img key={i} src={url} alt="" style={{
                      width: 64, height: 64, objectFit: 'cover', borderRadius: 6,
                    }} loading="lazy" />
                  ))}
                  {m.images.length > 3 && (
                    <div style={{
                      width: 64, height: 64, borderRadius: 6,
                      background: 'var(--surface)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: 'var(--text-muted)',
                    }}>+{m.images.length - 3}</div>
                  )}
                </div>
              )}

              {/* Video indicator */}
              {m.videos?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 4 }}>
                  🎬 {t('friend.has_video')}
                </div>
              )}

              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {formatTime(m.created_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
