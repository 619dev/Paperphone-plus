import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get, post, put, del, normalizeFileUrl } from '../api/http'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'
import { getKeys } from '../crypto/keystore'
import { Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Film, Fingerprint, Lock, MessageCircle, Pencil, Phone, ShieldCheck, Flag, Ban } from 'lucide-react'

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

  // Safety number
  const [safetyNumber, setSafetyNumber] = useState('')
  const [showSafetyNumber, setShowSafetyNumber] = useState(false)
  const [copied, setCopied] = useState(false)

  // Report
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetail, setReportDetail] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)

  // Block
  const blockedUsers = useStore(s => s.blockedUsers)
  const addBlockedUser = useStore(s => s.addBlockedUser)
  const removeBlockedUser = useStore(s => s.removeBlockedUser)
  const isBlocked = blockedUsers.includes(id || '')

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

  // Compute safety number when user data is loaded
  useEffect(() => {
    if (!user?.ik_pub) return
    computeSafetyNumber(user.ik_pub)
  }, [user?.ik_pub])

  const computeSafetyNumber = async (theirIkPub: string) => {
    try {
      const keys = getKeys()
      const myIkPub = keys?.ik_pub || me?.ik_pub
      if (!myIkPub || !theirIkPub) {
        setSafetyNumber('—')
        return
      }

      // Decode base64 to bytes
      const decode = (b64: string) => {
        const raw = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
        const bytes = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
        return bytes
      }

      const myBytes = decode(myIkPub)
      const theirBytes = decode(theirIkPub)

      // Sort keys lexicographically for deterministic order
      // (so both parties compute the same result)
      let first: Uint8Array, second: Uint8Array
      const myHex = Array.from(myBytes).map(b => b.toString(16).padStart(2, '0')).join('')
      const theirHex = Array.from(theirBytes).map(b => b.toString(16).padStart(2, '0')).join('')
      if (myHex <= theirHex) {
        first = myBytes
        second = theirBytes
      } else {
        first = theirBytes
        second = myBytes
      }

      // Concatenate sorted keys
      const combined = new Uint8Array(first.length + second.length)
      combined.set(first, 0)
      combined.set(second, first.length)

      // SHA-256 hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', combined)
      const hashArray = new Uint8Array(hashBuffer)

      // Format as 5-digit decimal groups (Signal-style)
      // Convert 32 bytes to 12 groups of 5 digits
      const groups: string[] = []
      for (let i = 0; i < 12; i++) {
        const offset = i * 2
        const val = (hashArray[offset % 32] << 8) | hashArray[(offset + 1) % 32]
        groups.push(String(val * 3 + i).padStart(5, '0').slice(-5))
      }
      setSafetyNumber(groups.join(' '))
    } catch {
      setSafetyNumber('—')
    }
  }

  const handleCopySafety = () => {
    navigator.clipboard.writeText(safetyNumber).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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

  const REPORT_REASONS = [
    { key: 'report.reason_offensive', value: 'offensive' },
    { key: 'report.reason_spam', value: 'spam' },
    { key: 'report.reason_harassment', value: 'harassment' },
    { key: 'report.reason_violence', value: 'violence' },
    { key: 'report.reason_misinformation', value: 'misinformation' },
    { key: 'report.reason_other', value: 'other' },
  ]

  const handleReport = async () => {
    if (!reportReason) return
    setReportSubmitting(true)
    try {
      await post('/api/report', {
        target_type: 'user',
        target_id: id,
        reason: reportReason,
        detail: reportDetail.trim() || undefined,
      })
      alert(t('report.success'))
      setShowReport(false)
      setReportReason('')
      setReportDetail('')
    } catch {
      alert(t('report.failed'))
    } finally {
      setReportSubmitting(false)
    }
  }

  const handleBlock = async () => {
    if (!confirm(t('block.confirm_desc'))) return
    try {
      await post('/api/users/block', { user_id: id })
      addBlockedUser(id!)
      alert(t('block.success'))
    } catch {
      alert(t('block.failed'))
    }
  }

  const handleUnblock = async () => {
    try {
      await del(`/api/users/block/${id}`)
      removeBlockedUser(id!)
      alert(t('unblock.success'))
    } catch {
      alert(t('unblock.failed'))
    }
  }

  return (
    <div className="page" id="user-profile-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
        <h1>{displayName}</h1>
      </div>
      <div className="page-body">
        {/* Profile card */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '28px 16px 20px',
          background: 'var(--bg-card)',
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
              <MessageCircle size={16} /> {t('chat.send')}
            </button>
            <button className="btn btn-secondary btn-full" onClick={() => navigate(`/chat/${id}`)}>
              <Phone size={16} /> {t('call.voice')}
            </button>
          </div>
        </div>

        {/* Remark */}
        <div className="section-title" style={{ padding: '16px 16px 6px' }}>
          <Pencil size={14} /> {t('friend.remark')}
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
            <span className="label" style={{ color: remark ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {remark || t('friend.no_remark')}
            </span>
            <span className="arrow"><ChevronRight size={14} /></span>
          </div>
        )}

        {/* Privacy settings */}
        <div className="section-title" style={{ padding: '16px 16px 6px' }}>
          <Lock size={14} /> {t('friend.privacy')}
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

        {/* Safety Number — E2E verification */}
        <div className="section-title" style={{ padding: '16px 16px 6px' }}>
          <ShieldCheck size={14} /> {t('safety.title')}
        </div>
        <div
          className="settings-item"
          onClick={() => setShowSafetyNumber(!showSafetyNumber)}
          style={{ cursor: 'pointer' }}
        >
          <span className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Fingerprint size={14} />
            {t('safety.verify_encryption')}
          </span>
          <span className="arrow">{showSafetyNumber ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        </div>

        {showSafetyNumber && safetyNumber && (
          <div style={{
            margin: '0 12px 8px', padding: 20, borderRadius: 16,
            background: 'var(--bg-card)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5,
            }}>
              {t('safety.description')}
            </div>

            {/* Safety number grid */}
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: 12, padding: '16px 20px',
              width: '100%', maxWidth: 300,
            }}>
              <div style={{
                fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
                fontSize: 18, lineHeight: 2.2,
                textAlign: 'center', letterSpacing: 2,
                color: 'var(--text-primary)',
              }}>
                {(() => {
                  const nums = safetyNumber.split(' ')
                  const rows: string[][] = []
                  for (let i = 0; i < nums.length; i += 4) rows.push(nums.slice(i, i + 4))
                  return rows.map((row, i) => <div key={i}>{row.join('  ')}</div>)
                })()}
              </div>
            </div>

            {/* Participants */}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              {me?.nickname} ↔ {displayName}
            </div>

            {/* Copy button */}
            <button
              className="btn btn-sm btn-secondary"
              onClick={(e) => { e.stopPropagation(); handleCopySafety() }}
              style={{ minWidth: 140 }}
            >
              {copied ? <><Check size={12} /> {t('fingerprint.copied')}</> : <><Copy size={12} /> {t('fingerprint.copy')}</>}
            </button>

            {/* How to verify */}
            <div style={{
              fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
              background: 'var(--bg-primary)', borderRadius: 10, padding: 12, width: '100%',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
                {t('safety.how_to_verify')}
              </div>
              {t('safety.verify_steps')}
            </div>
          </div>
        )}

        {/* Latest moments */}
        <div className="section-title" style={{ padding: '16px 16px 6px' }}>
          <Camera size={16} /> {t('friend.latest_moments')}
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
                    <img key={i} src={normalizeFileUrl(url)} alt="" style={{
                      width: 64, height: 64, objectFit: 'cover', borderRadius: 6,
                    }} loading="lazy" />
                  ))}
                  {m.images.length > 3 && (
                    <div style={{
                      width: 64, height: 64, borderRadius: 6,
                      background: 'var(--bg-card)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: 'var(--text-muted)',
                    }}>+{m.images.length - 3}</div>
                  )}
                </div>
              )}

              {/* Video indicator */}
              {m.videos?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 4 }}>
                  <Film size={16} /> {t('friend.has_video')}
                </div>
              )}

              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {formatTime(m.created_at)}
              </div>
            </div>
          ))
        )}

        {/* Report & Block section */}
        <div className="section-title" style={{ padding: '16px 16px 6px' }}>
          <Flag size={14} /> {t('report.report_user')}
        </div>
        <div className="settings-item" onClick={() => setShowReport(!showReport)} style={{ cursor: 'pointer' }}>
          <span className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <Flag size={14} /> {t('report.report_user')}
          </span>
          <span className="arrow"><ChevronRight size={14} /></span>
        </div>
        {showReport && (
          <div style={{ margin: '0 12px 8px', padding: 16, borderRadius: 12, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t('report.reason')}</div>
            {REPORT_REASONS.map(r => (
              <div key={r.value} onClick={() => setReportReason(r.value)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: reportReason === r.value ? 'rgba(239,68,68,0.08)' : 'transparent', transition: 'background 0.2s' }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, border: reportReason === r.value ? '2px solid #ef4444' : '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {reportReason === r.value && <div style={{ width: 10, height: 10, borderRadius: 5, background: '#ef4444' }} />}
                </div>
                <span style={{ fontSize: 13 }}>{t(r.key)}</span>
              </div>
            ))}
            <textarea className="input" placeholder={t('report.detail_placeholder')} value={reportDetail} onChange={e => setReportDetail(e.target.value)} style={{ minHeight: 60, fontSize: 13, resize: 'vertical' }} />
            <button className="btn btn-sm" onClick={handleReport} disabled={!reportReason || reportSubmitting} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 14, opacity: !reportReason || reportSubmitting ? 0.5 : 1 }}>
              {reportSubmitting ? t('common.loading') : t('report.submit')}
            </button>
          </div>
        )}
        <div className="settings-item" onClick={isBlocked ? handleUnblock : handleBlock} style={{ cursor: 'pointer' }}>
          <span className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: isBlocked ? 'var(--accent)' : '#ef4444' }}>
            <Ban size={14} /> {isBlocked ? t('unblock.user') : t('block.user')}
          </span>
        </div>

      </div>
    </div>
  )
}
