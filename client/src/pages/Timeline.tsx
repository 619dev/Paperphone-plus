import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post, del } from '../api/http'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'

const MAX_IMAGES = 50
const MAX_TEXT = 2048
const MAX_VIDEO_MINUTES = 10

export default function Timeline() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)

  const loadPosts = async () => {
    try {
      const data = await get('/api/timeline')
      setPosts(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadPosts() }, [])

  if (showComposer) {
    return <PostComposer t={t} onBack={() => setShowComposer(false)} onPublished={() => { setShowComposer(false); loadPosts() }} />
  }

  if (selectedPost) {
    return <PostDetail t={t} postId={selectedPost} user={user} onBack={() => { setSelectedPost(null); loadPosts() }} />
  }

  return (
    <div className="page" id="timeline-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>{t('timeline.title')}</h1>
        <button className="btn btn-sm btn-primary" onClick={() => setShowComposer(true)} style={{ marginLeft: 'auto' }}>
          ✏️ {t('timeline.post')}
        </button>
      </div>
      <div className="page-body" style={{ padding: '4px 4px 80px' }}>
        {loading && <div className="loading-spinner" />}

        {!loading && posts.length === 0 && (
          <div className="empty-state">
            <div className="icon">📝</div>
            <div>{t('timeline.empty')}</div>
          </div>
        )}

        {/* Masonry / Waterfall two-column grid */}
        <div style={{ columnCount: 2, columnGap: 4 }}>
          {posts.map(p => {
            const cover = p.media?.[0]
            const isVideo = cover?.media_type === 'video'
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPost(p.id)}
                style={{
                  breakInside: 'avoid',
                  marginBottom: 4,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                {/* Cover image/video thumbnail */}
                {cover && (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={isVideo ? (cover.thumbnail || cover.url) : cover.url}
                      alt=""
                      loading="lazy"
                      style={{ width: '100%', display: 'block' }}
                    />
                    {isVideo && (
                      <div style={{
                        position: 'absolute', bottom: 6, right: 6,
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        padding: '2px 6px', borderRadius: 4, fontSize: 11,
                      }}>
                        ▶ {Math.floor((cover.duration || 0) / 60)}:{String((cover.duration || 0) % 60).padStart(2, '0')}
                      </div>
                    )}
                    {p.media?.length > 1 && !isVideo && (
                      <div style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'rgba(0,0,0,0.5)', color: '#fff',
                        padding: '1px 6px', borderRadius: 8, fontSize: 11,
                      }}>{p.media.length}</div>
                    )}
                  </div>
                )}
                {/* Text preview */}
                <div style={{ padding: '8px 10px 6px' }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500, lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    marginBottom: 6,
                  }}>
                    {p.text_content || ''}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: 11, color: 'var(--text-muted)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div className="avatar" style={{ width: 16, height: 16, fontSize: 9 }}>
                        {p.is_anonymous ? '🎭' : (p.user?.avatar ? <img src={p.user.avatar} alt="" /> : p.user?.nickname?.[0])}
                      </div>
                      <span>{p.is_anonymous ? t('timeline.anonymous') : p.user?.nickname}</span>
                    </div>
                    <span>❤️ {p.like_count || 0}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Post Detail — full-screen view with comments
   ═══════════════════════════════════════════════════════════════════════════ */
function PostDetail({ t, postId, user, onBack }: {
  t: (k: string) => string, postId: number, user: any, onBack: () => void
}) {
  const [p, setPost] = useState<any>(null)
  const [commentText, setCommentText] = useState('')
  const [isAnon, setIsAnon] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)

  const loadPost = async () => {
    try { const data = await get(`/api/timeline/${postId}`); setPost(data) } catch {}
  }
  useEffect(() => { loadPost() }, [postId])

  const toggleLike = async () => {
    if (!p) return
    const liked = p.likes?.some((l: any) => l.id === user?.id)
    try {
      if (liked) await del(`/api/timeline/${postId}/like`)
      else await post(`/api/timeline/${postId}/like`, {})
      loadPost()
    } catch {}
  }

  const submitComment = async () => {
    if (!commentText.trim()) return
    try {
      await post(`/api/timeline/${postId}/comments`, { text_content: commentText.trim(), is_anonymous: isAnon })
      setCommentText('')
      loadPost()
    } catch {}
  }

  const deletePost = async () => {
    try { await del(`/api/timeline/${postId}`); onBack() } catch {}
  }

  if (!p) return <div className="page"><div className="loading-spinner" /></div>

  const liked = p.likes?.some((l: any) => l.id === user?.id)
  const isOwner = p.user_id === user?.id
  const images = p.media?.filter((m: any) => m.media_type === 'image') || []
  const video = p.media?.find((m: any) => m.media_type === 'video')

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h1>{t('timeline.detail')}</h1>
        {isOwner && (
          <button className="icon-btn" onClick={deletePost} style={{ marginLeft: 'auto', color: 'var(--danger)' }}>🗑</button>
        )}
      </div>
      <div className="page-body" style={{ paddingBottom: 80 }}>
        {/* Media carousel / viewer */}
        {images.length > 0 && (
          <div>
            <div style={{ position: 'relative', background: '#000', minHeight: 200 }}>
              <img
                src={images[imgIdx]?.url}
                alt=""
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block' }}
              />
              {images.length > 1 && (
                <>
                  {imgIdx > 0 && (
                    <button onClick={() => setImgIdx(i => i - 1)} style={{
                      position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                      width: 32, height: 32, borderRadius: 16, background: 'rgba(0,0,0,0.5)',
                      color: '#fff', border: 'none', fontSize: 16, cursor: 'pointer',
                    }}>‹</button>
                  )}
                  {imgIdx < images.length - 1 && (
                    <button onClick={() => setImgIdx(i => i + 1)} style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      width: 32, height: 32, borderRadius: 16, background: 'rgba(0,0,0,0.5)',
                      color: '#fff', border: 'none', fontSize: 16, cursor: 'pointer',
                    }}>›</button>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 10px',
                    borderRadius: 10, fontSize: 12,
                  }}>{imgIdx + 1} / {images.length}</div>
                </>
              )}
            </div>
            {/* Thumbnail strip for many images */}
            {images.length > 1 && (
              <div style={{
                display: 'flex', gap: 2, overflowX: 'auto', padding: '4px 8px',
                background: 'var(--surface)',
              }}>
                {images.map((img: any, i: number) => (
                  <img
                    key={i}
                    src={img.url}
                    alt=""
                    onClick={() => setImgIdx(i)}
                    style={{
                      width: 48, height: 48, objectFit: 'cover', borderRadius: 4,
                      border: i === imgIdx ? '2px solid var(--accent)' : '2px solid transparent',
                      cursor: 'pointer', flexShrink: 0, opacity: i === imgIdx ? 1 : 0.6,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {video && (
          <video
            src={video.url}
            poster={video.thumbnail || undefined}
            controls
            style={{ width: '100%', maxHeight: '60vh', background: '#000' }}
          />
        )}

        {/* Author + content */}
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div className="avatar avatar-sm">
              {p.is_anonymous ? '🎭' : (p.user?.avatar ? <img src={p.user.avatar} alt="" /> : p.user?.nickname?.[0]?.toUpperCase())}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {p.is_anonymous ? t('timeline.anonymous') : p.user?.nickname}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(p.created_at).toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 16 }}>
            {p.text_content}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <button
              className={`btn btn-sm ${liked ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleLike}
            >
              {liked ? '❤️' : '🤍'} {p.likes?.length || 0}
            </button>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 13, color: 'var(--text-muted)',
            }}>
              💬 {p.comments?.length || 0} {t('timeline.comments')}
            </span>
          </div>
        </div>

        {/* Liked avatars */}
        {p.likes?.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 16px 12px',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>❤️</span>
            {p.likes.map((l: any) => (
              <div key={l.id} title={l.nickname} style={{
                width: 22, height: 22, borderRadius: 11, overflow: 'hidden',
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
              }}>
                {l.avatar ? <img src={l.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : l.nickname?.[0]?.toUpperCase()}
              </div>
            ))}
          </div>
        )}

        {/* Comments */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            💬 {t('timeline.comments')} ({p.comments?.length || 0})
          </div>
          {(p.comments || []).map((c: any) => (
            <div key={c.id} style={{
              padding: '8px 0', borderBottom: '1px solid var(--border)',
              display: 'flex', gap: 8,
            }}>
              <div className="avatar" style={{ width: 28, height: 28, fontSize: 12, flexShrink: 0 }}>
                {c.is_anonymous ? '🎭' : c.nickname?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                  {c.is_anonymous ? t('timeline.anonymous') : c.nickname}
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{c.text_content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment input bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', gap: 8, padding: '10px 12px',
        background: 'var(--bg)', borderTop: '1px solid var(--border)',
        alignItems: 'center',
      }}>
        <button
          onClick={() => setIsAnon(!isAnon)}
          style={{
            width: 32, height: 32, borderRadius: 16, border: 'none',
            background: isAnon ? 'var(--accent)' : 'var(--surface)',
            fontSize: 16, cursor: 'pointer', flexShrink: 0,
          }}
          title={t('timeline.anonymous')}
        >{isAnon ? '🎭' : '👤'}</button>
        <input
          className="input"
          placeholder={t('timeline.write_comment')}
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitComment()}
          style={{ flex: 1, fontSize: 14 }}
        />
        <button className="btn btn-sm btn-primary" onClick={submitComment}>
          {t('common.send')}
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Post Composer — create new post
   ═══════════════════════════════════════════════════════════════════════════ */
function PostComposer({ t, onBack, onPublished }: {
  t: (k: string) => string
  onBack: () => void
  onPublished: () => void
}) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [videoDuration, setVideoDuration] = useState(0)
  const [mediaMode, setMediaMode] = useState<'none' | 'images' | 'video'>('none')
  const [isAnon, setIsAnon] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

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
      } catch { setError(t('timeline.upload_failed')) }
    }
    e.target.value = ''
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    const duration = await getVideoDuration(file)
    if (duration > MAX_VIDEO_MINUTES * 60) {
      setError(t('timeline.video_too_long'))
      e.target.value = ''
      return
    }
    try {
      const url = await uploadFile(file)
      setVideoUrl(url)
      setVideoDuration(Math.round(duration))
      setMediaMode('video')
    } catch { setError(t('timeline.upload_failed')) }
    e.target.value = ''
  }

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration) }
      v.onerror = () => resolve(0)
      v.src = URL.createObjectURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    if (images.length <= 1) setMediaMode('none')
  }

  const removeVideo = () => { setVideoUrl(''); setVideoDuration(0); setMediaMode('none') }

  const handlePublish = async () => {
    if (!text.trim() && images.length === 0 && !videoUrl) return
    if (text.length > MAX_TEXT) { setError(t('timeline.text_too_long')); return }
    setSubmitting(true)
    setError('')

    const media: any[] = []
    if (mediaMode === 'images') {
      images.forEach(url => media.push({ url, media_type: 'image' }))
    }
    if (mediaMode === 'video' && videoUrl) {
      media.push({ url: videoUrl, media_type: 'video', duration: videoDuration })
    }

    try {
      await post('/api/timeline', {
        text_content: text.trim(),
        is_anonymous: isAnon,
        media: media.length > 0 ? media : undefined,
      })
      onPublished()
    } catch { setError(t('timeline.publish_failed')) }
    finally { setSubmitting(false) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h1>{t('timeline.new_post')}</h1>
        <button
          className="btn btn-sm btn-primary"
          onClick={handlePublish}
          disabled={submitting || (!text.trim() && images.length === 0 && !videoUrl)}
          style={{ marginLeft: 'auto' }}
        >
          {submitting ? t('common.loading') : t('timeline.post')}
        </button>
      </div>
      <div className="page-body" style={{ padding: 16 }}>
        {/* Anonymous toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          padding: '8px 12px', borderRadius: 10, background: isAnon ? 'rgba(255,152,0,0.1)' : 'var(--surface)',
        }}>
          <button
            onClick={() => setIsAnon(!isAnon)}
            style={{
              width: 36, height: 36, borderRadius: 18, border: 'none',
              background: isAnon ? '#ff9800' : 'var(--border)',
              fontSize: 18, cursor: 'pointer',
            }}
          >{isAnon ? '🎭' : '👤'}</button>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {isAnon ? t('timeline.posting_anonymous') : t('timeline.posting_public')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {isAnon ? t('timeline.anon_desc') : t('timeline.public_desc')}
            </div>
          </div>
        </div>

        {/* Text input */}
        <textarea
          className="input"
          placeholder={t('timeline.write_something')}
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={MAX_TEXT}
          style={{ minHeight: 140, resize: 'vertical', fontSize: 15, lineHeight: 1.6 }}
        />
        <div style={{ textAlign: 'right', fontSize: 12, color: text.length > MAX_TEXT * 0.9 ? 'var(--danger)' : 'var(--text-muted)', marginBottom: 12 }}>
          {text.length}/{MAX_TEXT}
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

        {/* Image previews */}
        {mediaMode === 'images' && images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 12 }}>
            {images.map((url, i) => (
              <div key={i} style={{ position: 'relative', paddingTop: '100%' }}>
                <img src={url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                <button
                  onClick={() => removeImage(i)}
                  style={{
                    position: 'absolute', top: 2, right: 2,
                    width: 20, height: 20, borderRadius: 10,
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    border: 'none', fontSize: 11, cursor: 'pointer',
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
            <video src={videoUrl} controls style={{ width: '100%', borderRadius: 8, maxHeight: 260 }} />
            <button
              onClick={removeVideo}
              style={{
                position: 'absolute', top: 8, right: 8,
                width: 28, height: 28, borderRadius: 14,
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                border: 'none', fontSize: 14, cursor: 'pointer',
              }}
            >✕</button>
          </div>
        )}

        {/* Media buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          {mediaMode !== 'video' && (
            <button className="btn btn-secondary btn-sm" onClick={() => imageInputRef.current?.click()} disabled={images.length >= MAX_IMAGES}>
              🖼️ {t('timeline.add_images')} ({images.length}/{MAX_IMAGES})
            </button>
          )}
          {(mediaMode !== 'images' || images.length === 0) && !videoUrl && (
            <button className="btn btn-secondary btn-sm" onClick={() => videoInputRef.current?.click()}>
              🎬 {t('timeline.add_video')}
            </button>
          )}
        </div>
        <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageSelect} />
        <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={handleVideoSelect} />
      </div>
    </div>
  )
}
