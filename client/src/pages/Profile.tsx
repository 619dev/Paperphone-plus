import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'
import { clearKeys, getKeys } from '../crypto/keystore'
import { disconnectWs } from '../api/socket'
import { get, post, put, del, uploadFile } from '../api/http'
import { allLangs, langNames, LangCode } from '../i18n'
import { QRCodeCanvas } from '../components/QRCode'
import { isPushSupported, isPushSubscribed, subscribePush, unsubscribePush } from '../api/push'
import { logoutOneSignal } from '../api/onesignal'
import { Camera, ChevronLeft, ChevronRight, Smartphone, Check, Copy, KeyRound, Shield, Fingerprint, Moon, Globe, Bell, Download as DownloadIcon, Monitor, CheckCircle, FileText } from 'lucide-react'

type SubView = null | 'password' | 'avatar' | '2fa' | 'sessions' | 'language' | 'fingerprint' | 'myqr'

export default function Profile() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const setAuth = useStore(s => s.setAuth)
  const theme = useStore(s => s.theme)
  const toggleTheme = useStore(s => s.toggleTheme)
  const logout = useStore(s => s.logout)
  const lang = useStore(s => s.lang) as LangCode
  const setLang = useStore(s => s.setLang)

  const [subView, setSubView] = useState<SubView>(null)

  // Push notifications state
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const pushSupported = isPushSupported()

  // iOS standalone detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  const showIOSInstall = isIOS && !isStandalone

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled)
  }, [])

  const togglePush = async () => {
    setPushLoading(true)
    try {
      if (pushEnabled) {
        await unsubscribePush()
        setPushEnabled(false)
      } else {
        const ok = await subscribePush()
        setPushEnabled(ok)
        if (!ok) {
          // Check why it failed
          if ('Notification' in window && Notification.permission === 'denied') {
            alert(t('profile.push_blocked') || 'Notifications are blocked. Please enable them in your browser settings.')
          } else {
            alert(t('profile.push_failed') || 'Failed to enable notifications. Check console for details.')
          }
        }
      }
    } catch (e) {
      console.error('[Push] Toggle failed:', e)
    }
    setPushLoading(false)
  }

  const handleLogout = () => {
    disconnectWs()
    clearKeys()
    logoutOneSignal()
    logout()
    navigate('/login')
  }

  if (subView === 'password') return <ChangePassword onBack={() => setSubView(null)} t={t} />
  if (subView === 'avatar') return <ChangeAvatar onBack={() => setSubView(null)} t={t} user={user} setAuth={setAuth} />
  if (subView === '2fa') return <TwoFactorAuth onBack={() => setSubView(null)} t={t} />
  if (subView === 'sessions') return <Sessions onBack={() => setSubView(null)} t={t} />
  if (subView === 'language') return <LanguagePicker onBack={() => setSubView(null)} t={t} lang={lang} setLang={setLang} />
  if (subView === 'fingerprint') return <KeyFingerprint onBack={() => setSubView(null)} t={t} user={user} />
  if (subView === 'myqr') return <MyQRCode onBack={() => setSubView(null)} t={t} user={user} />

  return (
    <div className="page" id="profile-page">
      <div className="page-header">
        <h1>{t('profile.title')}</h1>
      </div>
      <div className="page-body">
        {/* User card */}
        <div className="list-item" style={{ padding: '20px 16px' }}>
          <div className="avatar avatar-lg">
            {user?.avatar ? <img src={user.avatar} alt="" /> : user?.nickname?.[0]?.toUpperCase()}
          </div>
          <div className="list-content">
            <div className="name" style={{ fontSize: 18 }}>{user?.nickname}</div>
            <div className="preview">@{user?.username}</div>
          </div>
        </div>

        <div className="divider" />

        {/* Account */}
        <div className="section-title">{t('profile.account')}</div>
        <div className="settings-item" onClick={() => setSubView('avatar')}>
          <span className="label"><Camera size={16} /> {t('avatar.title')}</span>
          <span className="arrow"><ChevronRight size={14} /></span>
        </div>
        <div className="settings-item" onClick={() => setSubView('myqr')}>
          <span className="label"><Smartphone size={16} /> {t('profile.my_qr')}</span>
          <span className="arrow"><ChevronRight size={14} /></span>
        </div>
        <div className="settings-item" onClick={() => setSubView('password')}>
          <span className="label"><KeyRound size={16} /> {t('profile.change_password')}</span>
          <span className="arrow"><ChevronRight size={14} /></span>
        </div>
        <div className="settings-item" onClick={() => setSubView('2fa')}>
          <span className="label"><Shield size={16} /> {t('profile.two_factor')}</span>
          <span className="arrow"><ChevronRight size={14} /></span>
        </div>
        <div className="settings-item" onClick={() => setSubView('sessions')}>
          <span className="label"><Smartphone size={16} /> {t('profile.sessions')}</span>
          <span className="arrow"><ChevronRight size={14} /></span>
        </div>
        <div className="settings-item" onClick={() => setSubView('fingerprint')}>
          <span className="label"><Fingerprint size={16} /> {t('fingerprint.title')}</span>
          <span className="arrow"><ChevronRight size={14} /></span>
        </div>

        <div className="divider" />

        {/* Appearance */}
        <div className="section-title">{t('profile.appearance')}</div>
        <div className="settings-item" onClick={toggleTheme}>
          <span className="label"><Moon size={16} /> {t('profile.theme')}</span>
          <div className={`toggle ${theme === 'dark' ? 'active' : ''}`} />
        </div>
        <div className="settings-item" onClick={() => setSubView('language')}>
          <span className="label"><Globe size={16} /> {t('profile.language')}</span>
          <span className="value">{langNames[lang]}</span>
        </div>

        {/* Push notifications */}
        {pushSupported && (
          <div className="settings-item" onClick={togglePush} style={{ opacity: pushLoading ? 0.5 : 1 }}>
            <span className="label"><Bell size={16} /> {t('profile.notifications')}</span>
            <div className={`toggle ${pushEnabled ? 'active' : ''}`} />
          </div>
        )}

        {/* iOS PWA Install Guide */}
        {showIOSInstall && (
          <>
            <div className="divider" />
            <div style={{
              margin: '0 16px', padding: '16px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))',
              border: '1px solid rgba(99,102,241,0.2)',
            }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
                <DownloadIcon size={16} /> {t('pwa.install_title')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {t('pwa.install_step1')}<br />
                {t('pwa.install_step2')}<br />
                {t('pwa.install_step3')}
              </div>
            </div>
          </>
        )}

        <div className="divider" />

        {/* About */}
        <div className="section-title">{t('profile.about')}</div>
        <div className="settings-item" onClick={() => navigate('/privacy')}>
          <span className="label"><FileText size={16} /> {t('privacy.title')}</span>
          <span className="arrow"><ChevronRight size={14} /></span>
        </div>

        <div className="divider" />

        <div style={{ padding: '24px 16px' }}>
          <button className="btn btn-danger btn-full" id="logout-btn" onClick={handleLogout}>
            {t('profile.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-VIEW: Change Password
   ═══════════════════════════════════════════════════════════════════════════ */
function ChangePassword({ onBack, t }: { onBack: () => void; t: (k: string) => string }) {
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPw.length < 6) { setError(t('password.too_short')); return }
    if (newPw !== confirmPw) { setError(t('password.mismatch')); return }
    setLoading(true)
    try {
      await put('/api/users/password', { old_password: oldPw, new_password: newPw })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="page">
        <div className="page-header">
          <button className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
          <h1>{t('profile.change_password')}</h1>
        </div>
        <div className="page-body" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, color: 'var(--accent)' }}><CheckCircle size={48} /></div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{t('password.changed')}</div>
          <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={onBack}>{t('common.ok')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <h1>{t('profile.change_password')}</h1>
      </div>
      <div className="page-body">
        <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="input" type="password" placeholder={t('password.old')} value={oldPw} onChange={e => setOldPw(e.target.value)} required />
          <input className="input" type="password" placeholder={t('password.new')} value={newPw} onChange={e => setNewPw(e.target.value)} required />
          <input className="input" type="password" placeholder={t('auth.confirm_password')} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
          {error && <div className="error-msg">{error}</div>}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-VIEW: Change Avatar
   ═══════════════════════════════════════════════════════════════════════════ */
function ChangeAvatar({ onBack, t, user, setAuth }: { onBack: () => void; t: (k: string) => string; user: any; setAuth: any }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(user?.avatar || '')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      // Upload file
      const res = await uploadFile(file)
      // Update avatar
      await put('/api/users/avatar', { avatar: res.url })
      setPreview(res.url)
      // Update local store
      const token = localStorage.getItem('token') || ''
      setAuth(token, { ...user, avatar: res.url })
    } catch {
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <h1>{t('avatar.title')}</h1>
      </div>
      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32, gap: 20 }}>
        <div className="avatar" style={{ width: 120, height: 120, fontSize: 48, borderRadius: 60 }}>
          {preview ? <img src={preview} alt="" style={{ width: '100%', height: '100%', borderRadius: 60, objectFit: 'cover' }} /> : user?.nickname?.[0]?.toUpperCase()}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? t('common.loading') : t('avatar.upload')}
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-VIEW: Two-Factor Authentication
   ═══════════════════════════════════════════════════════════════════════════ */
function TwoFactorAuth({ onBack, t }: { onBack: () => void; t: (k: string) => string }) {
  const [step, setStep] = useState<'loading' | 'off' | 'setup' | 'on'>('loading')
  const [secret, setSecret] = useState('')
  const [uri, setUri] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if 2FA is enabled via the dedicated status endpoint
    get<{ enabled: boolean }>('/api/totp/status').then(res => {
      setStep(res.enabled ? 'on' : 'off')
    }).catch(() => setStep('off'))
  }, [])

  const handleSetup = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await post<{ secret: string; uri: string; recovery_codes: string[] }>('/api/totp/setup', {})
      setSecret(res.secret)
      setUri(res.uri)
      setRecoveryCodes(res.recovery_codes)
      setStep('setup')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEnable = async () => {
    setLoading(true)
    setError('')
    try {
      await post('/api/totp/enable', { code })
      setStep('on')
    } catch (err: any) {
      setError(err.message || t('totp.invalid_code'))
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    setLoading(true)
    setError('')
    try {
      await post('/api/totp/disable', { code: disableCode })
      setStep('off')
      setDisableCode('')
    } catch (err: any) {
      setError(err.message || t('totp.invalid_code'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <h1>{t('profile.two_factor')}</h1>
      </div>
      <div className="page-body" style={{ padding: 16 }}>
        {step === 'loading' && <div className="loading-spinner" />}

        {step === 'off' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16, color: 'var(--accent)' }}><Shield size={48} /></div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>{t('totp.title')}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>{t('totp.description')}</div>
            <button className="btn btn-primary" onClick={handleSetup} disabled={loading}>
              {loading ? t('common.loading') : t('totp.setup')}
            </button>
          </div>
        )}

        {step === 'setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div style={{ fontWeight: 600, alignSelf: 'flex-start' }}>{t('totp.scan_qr')}</div>
            {uri && (
              <div style={{
                background: '#fff', padding: 16, borderRadius: 16,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              }}>
                <QRCodeCanvas data={uri} size={200} />
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{t('totp.or_enter_secret')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', wordBreak: 'break-all', background: 'var(--bg-card)', padding: 12, borderRadius: 8, width: '100%', textAlign: 'center', fontFamily: 'monospace' }}>
              {secret}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('totp.enter_code')}</div>
            <input className="input" placeholder="000000" value={code} onChange={e => setCode(e.target.value)} maxLength={6} style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }} />
            {error && <div className="error-msg">{error}</div>}
            <button className="btn btn-primary btn-full" onClick={handleEnable} disabled={loading || code.length < 6}>
              {loading ? t('common.loading') : t('totp.enable')}
            </button>

            {recoveryCodes.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{t('totp.recovery_codes')}</div>
                <div style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 14 }}>
                  {recoveryCodes.map((c, i) => <div key={i}>{c}</div>)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{t('totp.save_codes')}</div>
              </div>
            )}
          </div>
        )}

        {step === 'on' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16, color: 'var(--accent)' }}><CheckCircle size={48} /></div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{t('totp.enabled')}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>{t('totp.enabled_desc')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
              <input className="input" type="text" placeholder={t('totp.enter_to_disable')} value={disableCode} onChange={e => setDisableCode(e.target.value)} maxLength={6} style={{ textAlign: 'center', fontSize: 20, letterSpacing: 6 }} />
              {error && <div className="error-msg">{error}</div>}
              <button className="btn btn-danger btn-full" onClick={handleDisable} disabled={loading || disableCode.length < 6}>
                {loading ? t('common.loading') : t('totp.disable')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-VIEW: Sessions (Devices)
   ═══════════════════════════════════════════════════════════════════════════ */
function Sessions({ onBack, t }: { onBack: () => void; t: (k: string) => string }) {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await get<any[]>('/api/sessions')
      setSessions(res)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const revokeOne = async (id: string) => {
    try {
      await del(`/api/sessions/${id}`)
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch {}
  }

  const revokeAll = async () => {
    try {
      await post('/api/sessions/others/revoke', {})
      load()
    } catch {}
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const otherSessions = sessions.filter(s => !s.is_current)

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <h1>{t('profile.sessions')}</h1>
      </div>
      <div className="page-body">
        {loading && <div className="loading-spinner" />}

        {/* Current session */}
        {sessions.filter(s => s.is_current).map(s => (
          <div key={s.id} style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <div className="section-title">{t('sessions.current')}</div>
            <div className="list-item" style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 28, marginRight: 12 }}>
                {s.device_type === 'mobile' ? <Smartphone size={18} /> : <Monitor size={18} />}
              </div>
              <div className="list-content">
                <div className="name">{s.browser || s.device_name || t('sessions.unknown')}</div>
                <div className="preview">{s.os} · {s.ip_address || ''}</div>
                <div className="preview" style={{ fontSize: 11 }}>{t('sessions.active')}: {formatTime(s.last_active)}</div>
              </div>
              <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} /> {t('sessions.this_device')}</span>
            </div>
          </div>
        ))}

        {/* Other sessions */}
        {otherSessions.length > 0 && (
          <div style={{ padding: '0 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div className="section-title" style={{ margin: 0 }}>{t('sessions.others')} ({otherSessions.length})</div>
              <button className="btn btn-sm btn-danger" onClick={revokeAll}>{t('sessions.revoke_all')}</button>
            </div>
            {otherSessions.map(s => (
              <div key={s.id} className="list-item" style={{ borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 24, marginRight: 12 }}>
                  {s.device_type === 'mobile' ? <Smartphone size={18} /> : <Monitor size={18} />}
                </div>
                <div className="list-content">
                  <div className="name">{s.browser || s.device_name || t('sessions.unknown')}</div>
                  <div className="preview">{s.os} · {s.ip_address || ''}</div>
                  <div className="preview" style={{ fontSize: 11 }}>{formatTime(s.last_active)}</div>
                </div>
                <button className="btn btn-sm btn-danger" onClick={() => revokeOne(s.id)}>{t('sessions.revoke')}</button>
              </div>
            ))}
          </div>
        )}

        {!loading && otherSessions.length === 0 && sessions.length > 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            {t('sessions.no_others')}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-VIEW: Language Picker
   ═══════════════════════════════════════════════════════════════════════════ */
function LanguagePicker({ onBack, t, lang, setLang }: { onBack: () => void; t: (k: string) => string; lang: LangCode; setLang: (l: string) => void }) {
  const [selected, setSelected] = useState<LangCode>(lang)

  const flags: Record<LangCode, string> = {
    zh: '🇨🇳', en: '🇺🇸', ja: '🇯🇵', ko: '🇰🇷',
    fr: '🇫🇷', de: '🇩🇪', ru: '🇷🇺', es: '🇪🇸',
  }

  // Secondary label: show the language name in that language if it differs from current
  const nativeNames: Record<LangCode, string> = {
    zh: '中文', en: 'English', ja: '日本語', ko: '한국어',
    fr: 'Français', de: 'Deutsch', ru: 'Русский', es: 'Español',
  }

  const handleSelect = (l: LangCode) => {
    setSelected(l)
    setLang(l)
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <h1>{t('profile.language')}</h1>
      </div>
      <div className="page-body">
        {allLangs.map(l => {
          const isSelected = l === selected
          return (
            <div
              key={l}
              className="settings-item"
              onClick={() => handleSelect(l)}
              style={{
                background: isSelected ? 'var(--bg-card)' : undefined,
                transition: 'background 0.2s ease',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <span style={{ fontSize: 28 }}>{flags[l]}</span>
                <div>
                  <div style={{ fontWeight: isSelected ? 600 : 400, fontSize: 15 }}>{nativeNames[l]}</div>
                  {l !== lang && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{langNames[l]}</div>
                  )}
                </div>
              </div>
              {isSelected && (
                <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 18 }}><Check size={18} /></span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-VIEW: Key Fingerprint
   ═══════════════════════════════════════════════════════════════════════════ */
function KeyFingerprint({ onBack, t, user }: { onBack: () => void; t: (k: string) => string; user: any }) {
  const [fingerprint, setFingerprint] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    computeFingerprint()
  }, [])

  const computeFingerprint = async () => {
    // Use ik_pub from both keystore (local) and user store (server)
    const keys = getKeys()
    const ikPub = keys?.ik_pub || user?.ik_pub
    if (!ikPub) {
      setFingerprint('—')
      return
    }

    try {
      // Decode base64 to bytes
      const raw = atob(ikPub.replace(/-/g, '+').replace(/_/g, '/'))
      const bytes = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)

      // SHA-256 hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
      const hashArray = new Uint8Array(hashBuffer)

      // Format as hex blocks: "AB12 CD34 EF56 ..."
      const hex = Array.from(hashArray)
        .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
        .join('')

      // Group into blocks of 4 chars (2 bytes each)
      const blocks = hex.match(/.{1,4}/g) || []
      setFingerprint(blocks.join(' '))
    } catch {
      setFingerprint('—')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(fingerprint).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Split fingerprint into rows of 4 blocks for display
  const blocks = fingerprint.split(' ')
  const rows: string[][] = []
  for (let i = 0; i < blocks.length; i += 4) {
    rows.push(blocks.slice(i, i + 4))
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <h1>{t('fingerprint.my_key_title')}</h1>
      </div>
      <div className="page-body" style={{ padding: 16 }}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16, color: 'var(--accent)' }}><Fingerprint size={48} /></div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
            {t('fingerprint.my_key_subtitle')}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
            {t('fingerprint.my_key_desc')}
          </div>
        </div>

        {/* Fingerprint display */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          padding: '20px 16px',
          margin: '0 auto',
          maxWidth: 340,
        }}>
          <div style={{
            fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
            fontSize: 16,
            lineHeight: 2,
            textAlign: 'center',
            letterSpacing: 1,
            color: 'var(--text-primary)',
          }}>
            {rows.map((row, i) => (
              <div key={i}>{row.join('  ')}</div>
            ))}
          </div>
        </div>

        {/* User info */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          @{user?.username}
        </div>

        {/* Copy button */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn btn-primary" onClick={handleCopy} style={{ minWidth: 180 }}>
            {copied ? <><Check size={14} /> {t('fingerprint.copied')}</> : <><Copy size={14} /> {t('fingerprint.copy')}</>}
          </button>
        </div>

        {/* How to verify */}
        <div style={{
          marginTop: 32,
          padding: 16,
          background: 'var(--bg-card)',
          borderRadius: 12,
          fontSize: 13,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            {t('safety.how_to_verify')}
          </div>
          {t('fingerprint.my_key_verify_hint')}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-VIEW: My QR Code
   ═══════════════════════════════════════════════════════════════════════════ */
function MyQRCode({ onBack, t, user }: { onBack: () => void; t: (k: string) => string; user: any }) {
  const qrData = `paperphone://friend/${user?.id}`

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <h1>{t('profile.my_qr')}</h1>
      </div>
      <div className="page-body" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 32, gap: 20,
      }}>
        <div className="avatar" style={{ width: 80, height: 80, fontSize: 36, borderRadius: 40 }}>
          {user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: 40, objectFit: 'cover' }} /> : user?.nickname?.[0]?.toUpperCase()}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{user?.nickname}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>@{user?.username}</div>
        </div>
        <div style={{
          background: '#fff', padding: 16, borderRadius: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        }}>
          <QRCodeCanvas data={qrData} size={220} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 280 }}>
          {t('profile.qr_scan_hint')}
        </div>
      </div>
    </div>
  )
}
