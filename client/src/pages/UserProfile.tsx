import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get } from '../api/http'
import { useI18n } from '../hooks/useI18n'

export default function UserProfile() {
  const { id } = useParams<{ id: string }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    if (id) get(`/api/users/${id}`).then(setUser).catch(() => {})
  }, [id])

  if (!user) return <div className="page"><div className="loading-spinner" /></div>

  return (
    <div className="page" id="user-profile-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>{user.nickname}</h1>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px' }}>
          <div className="avatar avatar-lg" style={{ marginBottom: 16 }}>
            {user.avatar ? <img src={user.avatar} alt="" /> : user.nickname?.[0]?.toUpperCase()}
          </div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{user.nickname}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>@{user.username}</div>
          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 280 }}>
            <button className="btn btn-primary btn-full" onClick={() => navigate(`/chat/${id}`)}>
              💬 {t('chat.send')}
            </button>
            <button className="btn btn-secondary btn-full" onClick={() => navigate(`/chat/${id}`)}>
              📞 {t('call.voice')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
