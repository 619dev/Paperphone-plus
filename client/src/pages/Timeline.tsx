import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../api/http'
import { useI18n } from '../hooks/useI18n'

export default function Timeline() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get('/api/timeline').then(data => { setPosts(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="page" id="timeline-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>{t('timeline.title')}</h1>
      </div>
      <div className="page-body">
        {loading && <div className="loading-spinner" />}

        <div className="timeline-grid">
          {posts.map(p => (
            <div key={p.id} className="timeline-card">
              {p.media?.length > 0 && (
                <img src={p.media[0].url} alt="" loading="lazy" />
              )}
              <div className="timeline-card-body">
                <div className="title">{p.text_content}</div>
              </div>
              <div className="timeline-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div className="avatar" style={{ width: 18, height: 18, fontSize: 10 }}>
                    {p.user?.avatar ? <img src={p.user.avatar} alt="" /> : (p.is_anonymous ? '🎭' : p.user?.nickname?.[0])}
                  </div>
                  <span>{p.is_anonymous ? t('timeline.anonymous') : p.user?.nickname}</span>
                </div>
                <div>❤️ {p.like_count} · 💬 {p.comment_count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
