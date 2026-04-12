import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get, post, put } from '../api/http'
import { uploadFileWithProgress } from '../api/http'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../store'
import { QRCodeCanvas } from '../components/QRCode'

const INVITE_EXPIRY_OPTIONS = [
  { days: 7, key: 'group.qr_expire_1w' },
  { days: 30, key: 'group.qr_expire_1m' },
  { days: 90, key: 'group.qr_expire_3m' },
]

export default function GroupInfo() {
  const { id } = useParams<{ id: string }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const [group, setGroup] = useState<any>(null)
  const [editing, setEditing] = useState<'name' | 'notice' | null>(null)
  const [editVal, setEditVal] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(-1)
  const [myMuted, setMyMuted] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [inviteId, setInviteId] = useState('')
  const [inviteExpiry, setInviteExpiry] = useState(7)
  const [inviteLoading, setInviteLoading] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  const isOwner = group?.owner_id === user?.id

  const reload = () => {
    if (id) get(`/api/groups/${id}`).then((g: any) => {
      setGroup(g)
      // Find current user's mute status
      const me = g.members?.find((m: any) => m.id === user?.id)
      if (me) setMyMuted(!!me.muted)
    }).catch(() => {})
  }

  useEffect(() => { reload() }, [id])

  // ── Avatar upload ──
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    setUploadProgress(0)
    try {
      const res = await uploadFileWithProgress(file, (pct) => setUploadProgress(pct))
      await put(`/api/groups/${id}`, { avatar: res.url })
      setGroup((prev: any) => ({ ...prev, avatar: res.url }))
      // Also refresh groups in global store
      get('/api/groups').then(g => useStore.getState().setGroups(g))
    } catch {}
    setUploadProgress(-1)
    setUploading(false)
  }

  // ── Save edits ──
  const saveEdit = async () => {
    if (!editing || !id) return
    const body: any = {}
    body[editing] = editVal
    try {
      await put(`/api/groups/${id}`, body)
      setGroup((prev: any) => ({ ...prev, [editing]: editVal }))
      if (editing === 'name') {
        get('/api/groups').then(g => useStore.getState().setGroups(g))
      }
    } catch {}
    setEditing(null)
  }

  // ── Mute toggle ──
  const toggleMute = async () => {
    if (!id) return
    const newVal = !myMuted
    try {
      await post(`/api/groups/${id}/mute`, { muted: newVal })
      setMyMuted(newVal)
    } catch {}
  }

  if (!group) return <div className="page"><div className="loading-spinner" /></div>

  return (
    <div className="page" id="group-info-page">
      {/* Upload progress overlay */}
      {uploadProgress >= 0 && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 20, padding: '32px 48px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{ position: 'relative', width: 72, height: 72 }}>
              <svg width={72} height={72} viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={36} cy={36} r={30} fill="none" stroke="var(--border)" strokeWidth={5} />
                <circle cx={36} cy={36} r={30} fill="none" stroke="var(--accent)" strokeWidth={5}
                  strokeDasharray={188.5} strokeDashoffset={188.5 * (1 - uploadProgress / 100)}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset .3s ease' }} />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 16, color: 'var(--accent)',
              }}>{uploadProgress}%</div>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{t('group.uploading_avatar')}</div>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fade-in .2s ease',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, padding: 24,
            width: 'min(360px, 90vw)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              {editing === 'name' ? t('group.edit_name') : t('group.edit_notice')}
            </div>
            {editing === 'notice' ? (
              <textarea
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                rows={4}
                maxLength={500}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontSize: 14, resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                maxLength={64}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontSize: 14,
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') saveEdit() }}
              />
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)}
                style={{
                  padding: '8px 20px', borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: 14,
                }}>{t('common.cancel')}</button>
              <button onClick={saveEdit}
                style={{
                  padding: '8px 20px', borderRadius: 10, border: 'none',
                  background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                }}>{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />

      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>{t('group.info')}</h1>
      </div>

      <div className="page-body">
        {/* ── Avatar + Name card ── */}
        <div style={{
          textAlign: 'center', padding: '28px 16px 20px',
          background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)',
        }}>
          <div
            className="avatar avatar-lg"
            style={{
              margin: '0 auto 14px', cursor: isOwner ? 'pointer' : 'default',
              position: 'relative', overflow: 'visible',
            }}
            onClick={() => isOwner && avatarRef.current?.click()}
          >
            {group.avatar ? <img src={group.avatar} alt="" /> : '👥'}
            {isOwner && (
              <div style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 24, height: 24, borderRadius: 12,
                background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg)', fontSize: 12,
              }}>📷</div>
            )}
          </div>

          {/* Name — tap to edit if owner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{group.name}</div>
            {isOwner && (
              <button onClick={() => { setEditVal(group.name); setEditing('name') }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.5, padding: 4 }}
                title={t('group.edit_name')}>✏️</button>
            )}
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {group.members?.length || 0} {t('group.members_count')}
          </div>
        </div>

        {/* ── Notice ── */}
        <div style={{
          margin: '0 16px 12px', padding: 14, borderRadius: 12,
          background: 'var(--surface)', display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>📢</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('group.notice')}</div>
            <div style={{ fontSize: 14, color: 'var(--text)', wordBreak: 'break-word' }}>
              {group.notice || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{t('group.no_notice')}</span>}
            </div>
          </div>
          {isOwner && (
            <button onClick={() => { setEditVal(group.notice || ''); setEditing('notice') }}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.5, padding: 4, flexShrink: 0 }}>✏️</button>
          )}
        </div>

        {/* ── Settings section ── */}
        <div style={{ margin: '0 16px 8px' }}>
          <div className="section-title" style={{ padding: '8px 0' }}>⚙️ {t('group.settings')}</div>

          {/* Mute toggle */}
          <div className="list-item" onClick={toggleMute} style={{ cursor: 'pointer', borderRadius: 12, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <span style={{ fontSize: 20 }}>🔕</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{t('group.mute')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('group.mute_desc')}</div>
              </div>
            </div>
            {/* Toggle switch */}
            <div style={{
              width: 44, height: 24, borderRadius: 12, padding: 2,
              background: myMuted ? 'var(--accent)' : 'var(--border)',
              transition: 'background .2s ease', cursor: 'pointer', flexShrink: 0,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 10,
                background: '#fff',
                transform: myMuted ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform .2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>

          {/* Send message */}
          <div className="list-item" onClick={() => navigate(`/chat/${id}?group=1`)}
            style={{ cursor: 'pointer', borderRadius: 12, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>💬</span>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{t('group.send_message')}</div>
            </div>
            <span style={{ opacity: 0.4, fontSize: 14 }}>›</span>
          </div>
          {/* Group QR Code */}
          <div className="list-item" onClick={async () => {
              if (!showQR) {
                setInviteLoading(true)
                try {
                  const res = await post(`/api/groups/${id}/invite`, { expires_days: inviteExpiry })
                  setInviteId(res.invite_id)
                  setShowQR(true)
                } catch {}
                setInviteLoading(false)
              } else {
                setShowQR(false)
              }
            }}
            style={{ cursor: 'pointer', borderRadius: 12, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📱</span>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{t('group.qr_code')}</div>
            </div>
            <span style={{ opacity: 0.4, fontSize: 14 }}>{inviteLoading ? '...' : showQR ? '▼' : '›'}</span>
          </div>

          {/* Inline invite QR panel */}
          {showQR && inviteId && (
            <div style={{
              margin: '0 0 12px', padding: 20, borderRadius: 16,
              background: 'var(--surface)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 14,
            }}>
              {/* Expiry picker */}
              <div style={{ display: 'flex', gap: 6 }}>
                {INVITE_EXPIRY_OPTIONS.map(opt => (
                  <button
                    key={opt.days}
                    onClick={async () => {
                      setInviteExpiry(opt.days)
                      setInviteLoading(true)
                      try {
                        const res = await post(`/api/groups/${id}/invite`, { expires_days: opt.days })
                        setInviteId(res.invite_id)
                      } catch {}
                      setInviteLoading(false)
                    }}
                    style={{
                      padding: '6px 14px', borderRadius: 10, border: 'none', fontSize: 12,
                      fontWeight: inviteExpiry === opt.days ? 700 : 400, cursor: 'pointer',
                      background: inviteExpiry === opt.days ? 'var(--accent)' : 'var(--bg)',
                      color: inviteExpiry === opt.days ? '#fff' : 'var(--text)',
                      transition: 'all .15s ease',
                    }}
                  >
                    {t(opt.key)}
                  </button>
                ))}
              </div>

              {/* QR code */}
              <QRCodeCanvas data={`paperphone://invite/${inviteId}`} size={200} />

              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                {t('group.qr_hint')}
              </div>
            </div>
          )}
        </div>

        <div className="divider" />

        {/* ── Members ── */}
        <div style={{ margin: '0 16px' }}>
          <div className="section-title" style={{ padding: '8px 0' }}>
            👥 {t('group.members')} ({group.members?.length || 0})
          </div>

          {group.members?.map((m: any) => (
            <div key={m.id} className="list-item" onClick={() => navigate(`/user/${m.id}`)}
              style={{ cursor: 'pointer', borderRadius: 12, marginBottom: 4 }}>
              <div className="avatar avatar-sm">
                {m.avatar ? <img src={m.avatar} alt="" /> : m.nickname?.[0]?.toUpperCase()}
              </div>
              <div className="list-content" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="name">{m.nickname}</span>
                  {m.role === 'owner' && (
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 6,
                      background: 'var(--accent)', color: '#fff', fontWeight: 600,
                    }}>{t('group.owner')}</span>
                  )}
                </div>
                <div className="preview" style={{ fontSize: 12 }}>@{m.username}</div>
              </div>
              <span style={{ opacity: 0.4, fontSize: 14 }}>›</span>
            </div>
          ))}
        </div>

        <div className="divider" />

        {/* ── Danger zone ── */}
        <div style={{ padding: '8px 16px 32px' }}>
          {isOwner ? (
            <button onClick={async () => {
              if (!window.confirm(t('group.disband_confirm'))) return
              try {
                const { del } = await import('../api/http')
                await del(`/api/groups/${id}`)
                const g = await get('/api/groups')
                useStore.getState().setGroups(g)
                navigate('/chats')
              } catch {}
            }}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                background: 'rgba(255, 59, 48, 0.12)', color: '#ff3b30',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>{t('group.disband')}</button>
          ) : (
            <button onClick={async () => {
              if (!window.confirm(t('group.leave_confirm'))) return
              try {
                await post(`/api/groups/${id}/leave`)
                const g = await get('/api/groups')
                useStore.getState().setGroups(g)
                navigate('/chats')
              } catch {}
            }}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                background: 'rgba(255, 149, 0, 0.12)', color: '#ff9500',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>{t('group.leave')}</button>
          )}
        </div>
      </div>
    </div>
  )
}
