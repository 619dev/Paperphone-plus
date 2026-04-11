import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post } from '../api/http'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'

export default function Moments() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const [moments, setMoments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get('/api/moments').then(data => { setMoments(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const toggleLike = async (id: number, liked: boolean) => {
    try {
      if (liked) {
        await fetch(`/api/moments/${id}/like`, { method: 'DELETE', headers: { Authorization: `Bearer ${useStore.getState().token}` } })
      } else {
        await post(`/api/moments/${id}/like`, {})
      }
      // Refresh
      const data = await get('/api/moments')
      setMoments(data)
    } catch {}
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const now = Date.now()
    const diff = now - ts
    if (diff < 60000) return t('time.just_now')
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t('time.minutes_ago')}`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${t('time.hours_ago')}`
    return d.toLocaleDateString()
  }

  return (
    <div className="page" id="moments-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>{t('moments.title')}</h1>
      </div>
      <div className="page-body">
        {loading && <div className="loading-spinner" />}

        {moments.map(m => {
          const liked = m.likes?.some((l: any) => l.id === user?.id)
          const imgCount = m.images?.length || 0
          return (
            <div key={m.id} className="moment-card">
              <div className="moment-header">
                <div className="avatar avatar-sm">
                  {m.user?.avatar ? <img src={m.user.avatar} alt="" /> : m.user?.nickname?.[0]}
                </div>
                <div>
                  <div className="moment-user">{m.user?.nickname}</div>
                  <div className="moment-time">{formatTime(m.created_at)}</div>
                </div>
              </div>

              {m.text_content && <div className="moment-text">{m.text_content}</div>}

              {imgCount > 0 && (
                <div className={`moment-images grid-${Math.min(imgCount, 9)}`}>
                  {m.images.map((url: string, i: number) => (
                    <img key={i} src={url} alt="" loading="lazy" />
                  ))}
                </div>
              )}

              {m.videos?.length > 0 && (
                <video src={m.videos[0].url} controls style={{ width: '100%', borderRadius: 8, marginBottom: 10 }} />
              )}

              <div className="moment-actions">
                <button className={liked ? 'liked' : ''} onClick={() => toggleLike(m.id, liked)}>
                  {liked ? '❤️' : '🤍'} {m.likes?.length || 0}
                </button>
                <button>💬 {m.comments?.length || 0}</button>
              </div>

              {m.comments?.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  {m.comments.map((c: any) => (
                    <div key={c.id} style={{ fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, marginRight: 4 }}>{c.nickname}</span>
                      {c.text_content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
