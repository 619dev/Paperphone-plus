import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post, del } from '../api/http'
import { useStore, Friend } from '../store'
import { useI18n } from '../hooks/useI18n'

const MAX_IMAGES = 9
const MAX_TEXT = 1024
const MAX_VIDEO_MINUTES = 10

interface Tag { id: number; name: string; color: string }

export default function Moments() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const friends = useStore(s => s.friends)
  const [moments, setMoments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)

  useEffect(() => {
    get('/api/moments').then(data => { setMoments(data); setLoading(false) }).catch(() => setLoading(false))
    get<Friend[]>('/api/friends').then(f => useStore.getState().setFriends(f)).catch(() => {})
  }, [])

  const refresh = async () => {
    try { const data = await get('/api/moments'); setMoments(data) } catch {}
  }

  const toggleLike = async (id: number, liked: boolean) => {
    try {
      if (liked) await del(`/api/moments/${id}/like`)
      else await post(`/api/moments/${id}/like`, {})
      refresh()
    } catch {}
  }

  const deleteMoment = async (id: number) => {
    try { await del(`/api/moments/${id}`); refresh() } catch {}
  }

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts
    if (diff < 60000) return t('time.just_now')
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t('time.minutes_ago')}`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${t('time.hours_ago')}`
    return new Date(ts).toLocaleDateString()
  }

  // Comment inline
  const [commentingId, setCommentingId] = useState<number | null>(null)
  const [commentText, setCommentText] = useState('')

  const submitComment = async (momentId: number) => {
    if (!commentText.trim()) return
    try {
      await post(`/api/moments/${momentId}/comments`, { text_content: commentText.trim() })
      setCommentText('')
      setCommentingId(null)
      refresh()
    } catch {}
  }

  if (showComposer) {
    return <MomentComposer
      t={t}
      friends={friends}
      onBack={() => setShowComposer(false)}
      onPublished={() => { setShowComposer(false); refresh() }}
    />
  }

  return (
    <div className="page" id="moments-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>{t('moments.title')}</h1>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => setShowComposer(true)}
          style={{ marginLeft: 'auto' }}
        >
          ➕ {t('moments.post')}
        </button>
      </div>
      <div className="page-body">
        {loading && <div className="loading-spinner" />}

        {!loading && moments.length === 0 && (
          <div className="empty-state">
            <div className="icon">📷</div>
            <div>{t('moments.empty')}</div>
          </div>
        )}

        {moments.map(m => {
          const liked = m.likes?.some((l: any) => l.id === user?.id)
          const imgCount = m.images?.length || 0
          const isOwner = m.user_id === user?.id
          return (
            <div key={m.id} className="moment-card">
              <div className="moment-header">
                <div className="avatar avatar-sm">
                  {m.user?.avatar ? <img src={m.user.avatar} alt="" /> : m.user?.nickname?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="moment-user">{m.user?.nickname}</div>
                  <div className="moment-time">{formatTime(m.created_at)}</div>
                </div>
                {isOwner && (
                  <button
                    className="icon-btn"
                    onClick={() => deleteMoment(m.id)}
                    style={{ fontSize: 14, color: 'var(--text-muted)' }}
                    title={t('common.delete')}
                  >✕</button>
                )}
              </div>

              {m.text_content && <div className="moment-text">{m.text_content}</div>}

              {/* Images grid */}
              {imgCount > 0 && (
                <div className={`moment-images grid-${Math.min(imgCount, 9)}`}>
                  {m.images.slice(0, 9).map((url: string, i: number) => (
                    <img key={i} src={url} alt="" loading="lazy" />
                  ))}
                </div>
              )}

              {/* Video */}
              {m.videos?.length > 0 && (
                <video
                  src={m.videos[0].url}
                  poster={m.videos[0].thumbnail || undefined}
                  controls
                  preload="metadata"
                  style={{ width: '100%', borderRadius: 8, marginBottom: 10, maxHeight: 400 }}
                />
              )}

              {/* Visibility badge */}
              {m.visibility && m.visibility !== 'public' && isOwner && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {m.visibility === 'whitelist' ? '👁 ' + t('moments.whitelist') : '🚫 ' + t('moments.blacklist')}
                </div>
              )}

              {/* Actions */}
              <div className="moment-actions">
                <button className={liked ? 'liked' : ''} onClick={() => toggleLike(m.id, liked)}>
                  {liked ? '❤️' : '🤍'} {m.likes?.length || 0}
                </button>
                <button onClick={() => setCommentingId(commentingId === m.id ? null : m.id)}>
                  💬 {m.comments?.length || 0}
                </button>
              </div>

              {/* Liked avatars */}
              {m.likes?.length > 0 && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
                  padding: '6px 0', borderBottom: m.comments?.length > 0 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 13, marginRight: 4 }}>❤️</span>
                  {m.likes.map((l: any) => (
                    <div key={l.id} title={l.nickname} style={{
                      width: 24, height: 24, borderRadius: 12, overflow: 'hidden',
                      background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0,
                      border: '1.5px solid var(--border)',
                    }}>
                      {l.avatar
                        ? <img src={l.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : l.nickname?.[0]?.toUpperCase()
                      }
                    </div>
                  ))}
                </div>
              )}

              {/* Comments */}
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

              {/* Comment input */}
              {commentingId === m.id && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    className="input"
                    placeholder={t('moments.write_comment')}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitComment(m.id)}
                    style={{ flex: 1, fontSize: 13 }}
                    autoFocus
                  />
                  <button className="btn btn-sm btn-primary" onClick={() => submitComment(m.id)}>
                    {t('common.send')}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Moment Composer — full-featured post creation
   ═══════════════════════════════════════════════════════════════════════════ */
function MomentComposer({ t, friends, onBack, onPublished }: {
  t: (k: string) => string
  friends: Friend[]
  onBack: () => void
  onPublished: () => void
}) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [videoThumb, setVideoThumb] = useState('')
  const [videoDuration, setVideoDuration] = useState(0)
  const [mediaMode, setMediaMode] = useState<'none' | 'images' | 'video'>('none')

  // Visibility
  const [visibility, setVisibility] = useState<'public' | 'whitelist' | 'blacklist'>('public')
  const [showVisSettings, setShowVisSettings] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    get<Tag[]>('/api/tags').then(setTags).catch(() => {})
  }, [])

  // Upload file helper
  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('file', file)
    const token = useStore.getState().token
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
    const data = await res.json()
    return data.url
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const remaining = MAX_IMAGES - images.length
    const toUpload = files.slice(0, remaining)
    setError('')

    for (const file of toUpload) {
      try {
        const url = await uploadFile(file)
        setImages(prev => [...prev, url])
        setMediaMode('images')
      } catch {
        setError(t('moments.upload_failed'))
      }
    }
    e.target.value = ''
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    // Check duration client-side
    const duration = await getVideoDuration(file)
    if (duration > MAX_VIDEO_MINUTES * 60) {
      setError(t('moments.video_too_long'))
      e.target.value = ''
      return
    }

    try {
      const url = await uploadFile(file)
      setVideoUrl(url)
      setVideoDuration(Math.round(duration))
      setMediaMode('video')
    } catch {
      setError(t('moments.upload_failed'))
    }
    e.target.value = ''
  }

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src)
        resolve(video.duration)
      }
      video.onerror = () => resolve(0)
      video.src = URL.createObjectURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    if (images.length <= 1) setMediaMode('none')
  }

  const removeVideo = () => {
    setVideoUrl('')
    setVideoThumb('')
    setVideoDuration(0)
    setMediaMode('none')
  }

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  const toggleTag = (id: number) => {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  const handlePublish = async () => {
    if (!text.trim() && images.length === 0 && !videoUrl) return
    if (text.length > MAX_TEXT) { setError(t('moments.text_too_long')); return }
    setSubmitting(true)
    setError('')

    // Build visibility rules
    const visibility_rules = (visibility !== 'public')
      ? [
          ...selectedFriends.map(id => ({ target_type: 'user', target_id: id })),
          ...selectedTags.map(id => ({ target_type: 'tag', target_id: String(id) })),
        ]
      : undefined

    const payload: any = {
      text_content: text.trim(),
      visibility,
      visibility_rules,
    }
    if (mediaMode === 'images' && images.length > 0) {
      payload.images = images
    }
    if (mediaMode === 'video' && videoUrl) {
      payload.video = { url: videoUrl, thumbnail: videoThumb || null, duration: videoDuration }
    }

    try {
      await post('/api/moments', payload)
      onPublished()
    } catch {
      setError(t('moments.publish_failed'))
    } finally {
      setSubmitting(false)
    }
  }

  // Visibility settings sub-view
  if (showVisSettings) {
    return (
      <div className="page">
        <div className="page-header">
          <button className="back-btn" onClick={() => setShowVisSettings(false)}>←</button>
          <h1>{t('moments.visibility')}</h1>
        </div>
        <div className="page-body">
          {/* Visibility type selector */}
          {(['public', 'whitelist', 'blacklist'] as const).map(v => (
            <div key={v} className="settings-item" onClick={() => setVisibility(v)} style={{ cursor: 'pointer' }}>
              <span className="label">
                {v === 'public' ? '🌍' : v === 'whitelist' ? '👁' : '🚫'} {t(`moments.${v}`)}
              </span>
              {visibility === v && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>✓</span>}
            </div>
          ))}

          {visibility !== 'public' && (
            <>
              <div className="divider" />
              <div className="section-title" style={{ padding: '12px 16px 4px' }}>
                {t('moments.select_scope')}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <>
                  <div style={{ padding: '8px 16px 4px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    🏷️ {t('contacts.tags')}
                  </div>
                  {tags.map(tag => {
                    const sel = selectedTags.includes(tag.id)
                    return (
                      <div key={`tag-${tag.id}`} className="list-item" onClick={() => toggleTag(tag.id)} style={{ cursor: 'pointer' }}>
                        <div style={{ width: 14, height: 14, borderRadius: 7, background: tag.color, marginRight: 12 }} />
                        <div className="list-content"><div className="name">{tag.name}</div></div>
                        <span style={{
                          width: 20, height: 20, borderRadius: 6,
                          border: sel ? 'none' : '2px solid var(--text-muted)',
                          background: sel ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 700,
                        }}>{sel ? '✓' : ''}</span>
                      </div>
                    )
                  })}
                </>
              )}

              {/* Friends */}
              <div style={{ padding: '8px 16px 4px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                👥 {t('contacts.friends')}
              </div>
              {friends.map(f => {
                const sel = selectedFriends.includes(f.id)
                return (
                  <div key={f.id} className="list-item" onClick={() => toggleFriend(f.id)} style={{ cursor: 'pointer' }}>
                    <div className="avatar avatar-sm">
                      {f.avatar ? <img src={f.avatar} alt="" /> : f.nickname[0]?.toUpperCase()}
                    </div>
                    <div className="list-content">
                      <div className="name">{f.nickname}</div>
                    </div>
                    <span style={{
                      width: 20, height: 20, borderRadius: 6,
                      border: sel ? 'none' : '2px solid var(--text-muted)',
                      background: sel ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 13, fontWeight: 700,
                    }}>{sel ? '✓' : ''}</span>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h1>{t('moments.new_post')}</h1>
        <button
          className="btn btn-sm btn-primary"
          onClick={handlePublish}
          disabled={submitting || (!text.trim() && images.length === 0 && !videoUrl)}
          style={{ marginLeft: 'auto' }}
        >
          {submitting ? t('common.loading') : t('moments.post')}
        </button>
      </div>
      <div className="page-body" style={{ padding: 16 }}>
        {/* Text input */}
        <textarea
          className="input"
          placeholder={t('moments.write_something')}
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={MAX_TEXT}
          style={{ minHeight: 120, resize: 'vertical', fontSize: 15, lineHeight: 1.6 }}
        />
        <div style={{ textAlign: 'right', fontSize: 12, color: text.length > MAX_TEXT * 0.9 ? 'var(--danger)' : 'var(--text-muted)', marginBottom: 12 }}>
          {text.length}/{MAX_TEXT}
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

        {/* Image previews */}
        {mediaMode === 'images' && images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 12 }}>
            {images.map((url, i) => (
              <div key={i} style={{ position: 'relative', paddingTop: '100%' }}>
                <img src={url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                <button
                  onClick={() => removeImage(i)}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 22, height: 22, borderRadius: 11,
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    border: 'none', fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Video preview */}
        {mediaMode === 'video' && videoUrl && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <video src={videoUrl} controls style={{ width: '100%', borderRadius: 8, maxHeight: 300 }} />
            <button
              onClick={removeVideo}
              style={{
                position: 'absolute', top: 8, right: 8,
                width: 28, height: 28, borderRadius: 14,
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                border: 'none', fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {Math.floor(videoDuration / 60)}:{String(videoDuration % 60).padStart(2, '0')}
            </div>
          </div>
        )}

        {/* Media buttons */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {(mediaMode !== 'video') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => imageInputRef.current?.click()}
              disabled={images.length >= MAX_IMAGES}
            >
              🖼️ {t('moments.add_images')} ({images.length}/{MAX_IMAGES})
            </button>
          )}
          {(mediaMode !== 'images' || images.length === 0) && !videoUrl && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => videoInputRef.current?.click()}
            >
              🎬 {t('moments.add_video')}
            </button>
          )}
        </div>

        <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageSelect} />
        <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={handleVideoSelect} />

        {/* Visibility control */}
        <div className="divider" />
        <div
          className="settings-item"
          onClick={() => setShowVisSettings(true)}
          style={{ cursor: 'pointer', marginTop: 8 }}
        >
          <span className="label">
            {visibility === 'public' ? '🌍' : visibility === 'whitelist' ? '👁' : '🚫'}
            {' '}{t('moments.visibility')}: {t(`moments.${visibility}`)}
          </span>
          <span className="arrow">›</span>
        </div>

        {visibility !== 'public' && (selectedFriends.length > 0 || selectedTags.length > 0) && (
          <div style={{ padding: '4px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
            {selectedTags.length > 0 && `${selectedTags.length} ${t('contacts.tags')}`}
            {selectedTags.length > 0 && selectedFriends.length > 0 && ' + '}
            {selectedFriends.length > 0 && `${selectedFriends.length} ${t('contacts.friends')}`}
          </div>
        )}
      </div>
    </div>
  )
}
