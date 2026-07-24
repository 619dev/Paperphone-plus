import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, ProxyConfig } from '../store'
import { useI18n } from '../hooks/useI18n'
import { clearKeys, getKeys } from '../crypto/keystore'
import { clearAllSenderKeys } from '../crypto/groupCrypto'
import { disconnectWs } from '../api/socket'
import { get, post, put, del, uploadFile } from '../api/http'
import { allLangs, langNames, LangCode } from '../i18n'
import { QRCodeCanvas } from '../components/QRCode'
import { isPushSupported, isPushSubscribed, subscribePush, unsubscribePush } from '../api/push'
import { logoutOneSignal } from '../api/onesignal'
import { Camera, ChevronLeft, ChevronRight, Smartphone, Check, Copy, KeyRound, Shield, Fingerprint, Moon, Globe, Bell, Download as DownloadIcon, Monitor, CheckCircle, FileText, ExternalLink, Wifi, Trash2, AlertTriangle } from 'lucide-react'
import { clearOfflineCache } from '../utils/offlineCache'

type SubView = null | 'password' | 'avatar' | '2fa' | 'sessions' | 'language' | 'fingerprint' | 'myqr' | 'proxy'

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
  const [clearingCache, setClearingCache] = useState(false)

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

  // ntfy state
  const [ntfyTopic, setNtfyTopic] = useState('')
  const [ntfyUrl, setNtfyUrl] = useState('')
  const [ntfyRegistered, setNtfyRegistered] = useState(false)
  const [ntfyLoading, setNtfyLoading] = useState(false)
  const [ntfyCopied, setNtfyCopied] = useState(false)
  const isAndroid = /Android/i.test(navigator.userAgent)

  useEffect(() => {
    if (!isAndroid) return
    // Fetch ntfy topic and check subscription status
    get<{ ntfy_topic: string; ntfy_url: string }>('/api/push/ntfy-topic')
      .then(res => {
        setNtfyTopic(res.ntfy_topic)
        setNtfyUrl(res.ntfy_url)
      })
      .catch(() => {})
    get<any>('/api/push/status')
      .then(res => {
        if (res.user_ntfy_subscriptions > 0) setNtfyRegistered(true)
      })
      .catch(() => {})
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
    // Preserve identity keys (ik_pub/ik_priv) across logout/login cycles.
    // Clearing them would force ensureKeysExist() to generate a new keypair,
    // breaking sender key distributions for all group members.
    // Only clear sender key cache (it will be re-fetched on next login).
    clearAllSenderKeys()
    logoutOneSignal()
    logout()
    navigate('/login')
  }

  const handleClearCache = async () => {
    if (!window.confirm(t('profile.clear_cache_confirm'))) return
    setClearingCache(true)
    try {
      await clearOfflineCache()
      useStore.getState().clearCachedContent()
      alert(t('profile.cache_cleared'))
    } finally {
      setClearingCache(false)
    }
  }

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError(t('profile.delete_need_password'))
      return
    }
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await post('/api/users/delete', { password: deletePassword })
      disconnectWs()
      clearKeys()
      logoutOneSignal()
      logout()
      navigate('/login')
    } catch (err: any) {
      setDeleteError(err.message || t('common.error'))
    } finally {
      setDeleteLoading(false)
    }
  }

  if (subView === 'password') return <ChangePassword onBack={() => setSubView(null)} t={t} />
  if (subView === 'avatar') return <ChangeAvatar onBack={() => setSubView(null)} t={t} user={user} setAuth={setAuth} />
  if (subView === '2fa') return <TwoFactorAuth onBack={() => setSubView(null)} t={t} />
  if (subView === 'sessions') return <Sessions onBack={() => setSubView(null)} t={t} />
  if (subView === 'language') return <LanguagePicker onBack={() => setSubView(null)} t={t} lang={lang} setLang={setLang} />
  if (subView === 'fingerprint') return <KeyFingerprint onBack={() => setSubView(null)} t={t} user={user} />
  if (subView === 'myqr') return <MyQRCode onBack={() => setSubView(null)} t={t} user={user} />
  if (subView === 'proxy') return <ProxySettings onBack={() => setSubView(null)} t={t} />

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

        <div className="divider" />

        {/* Network */}
        <div className="section-title">{t('profile.network')}</div>
        <div className="settings-item" onClick={() => setSubView('proxy')}>
          <span className="label"><Wifi size={16} /> {t('proxy.title')}</span>
          <span className="arrow"><ChevronRight size={14} /></span>
        </div>
        <div className="settings-item" onClick={handleClearCache} style={{ opacity: clearingCache ? 0.55 : 1 }}>
          <span className="label"><Trash2 size={16} /> {t('profile.clear_cache')}</span>
          <span className="value">{clearingCache ? t('common.loading') : ''}</span>
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

        {/* ntfy Push for Chinese Android */}
        {isAndroid && ntfyTopic && (
          <>
            <div className="divider" />
            <div style={{
              margin: '0 16px', padding: '16px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(59,130,246,0.10))',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Bell size={16} /> {t('ntfy.title')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
                {t('ntfy.description')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                {t('ntfy.step1')}<br />
                {t('ntfy.step2')}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 8,
                background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px',
              }}>
                <code style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--accent)', wordBreak: 'break-all' }}>
                  {ntfyTopic}
                </code>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(ntfyTopic)
                    setNtfyCopied(true)
                    setTimeout(() => setNtfyCopied(false), 2000)
                  }}
                  style={{ minWidth: 70, fontSize: 12 }}
                >
                  {ntfyCopied ? <><Check size={12} /> {t('ntfy.copied')}</> : <><Copy size={12} /> {t('ntfy.copy_topic')}</>}
                </button>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                {t('ntfy.step3')}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`btn btn-sm ${ntfyRegistered ? '' : 'btn-primary'}`}
                  disabled={ntfyLoading || ntfyRegistered}
                  style={{ flex: 1 }}
                  onClick={async () => {
                    setNtfyLoading(true)
                    try {
                      await post('/api/push/ntfy', { ntfy_topic: ntfyTopic, platform: 'android' })
                      setNtfyRegistered(true)
                    } catch {
                      alert(t('ntfy.register_failed'))
                    }
                    setNtfyLoading(false)
                  }}
                >
                  {ntfyRegistered ? t('ntfy.registered') : ntfyLoading ? t('common.loading') : t('ntfy.register')}
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => window.open('https://ntfy.sh', '_blank')}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <ExternalLink size={12} /> {t('ntfy.download_ntfy')}
                </button>
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

        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-danger btn-full" id="logout-btn" onClick={handleLogout}>
            {t('profile.logout')}
          </button>
          <button
            className="btn btn-full" id="delete-account-btn"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: 'transparent',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: 14,
            }}
          >
            <Trash2 size={14} style={{ marginRight: 6 }} /> {t('profile.delete_account')}
          </button>
        </div>

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }} onClick={() => setShowDeleteConfirm(false)}>
            <div style={{
              background: 'var(--bg-primary)', borderRadius: 16, padding: 24,
              maxWidth: 360, width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }} onClick={e => e.stopPropagation()}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <AlertTriangle size={40} style={{ color: 'var(--danger)', marginBottom: 8 }} />
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  {t('profile.delete_account')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {t('profile.delete_warning')}
                </div>
              </div>
              <input
                className="input"
                type="password"
                placeholder={t('profile.delete_enter_password')}
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              {deleteError && <div className="error-msg" style={{ marginBottom: 12 }}>{deleteError}</div>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="btn btn-full"
                  onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError('') }}
                  style={{ flex: 1 }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="btn btn-danger btn-full"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || !deletePassword}
                  style={{ flex: 1 }}
                >
                  {deleteLoading ? t('common.loading') : t('profile.delete_confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
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
  const qrData = `paperphoneplus://friend/${user?.id}`

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

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-VIEW: Proxy Settings (multi-proxy list with latency display)
   ═══════════════════════════════════════════════════════════════════════════ */
function ProxySettings({ onBack, t }: { onBack: () => void; t: (k: string) => string }) {
  const proxyList = useStore(s => s.proxyList)
  const activeProxyId = useStore(s => s.activeProxyId)
  const addProxy = useStore(s => s.addProxy)
  const updateProxy = useStore(s => s.updateProxy)
  const removeProxy = useStore(s => s.removeProxy)
  const setActiveProxy = useStore(s => s.setActiveProxy)
  const serverUrl = useStore(s => s.serverUrl)

  const [editingProxy, setEditingProxy] = useState<ProxyConfig | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [latency, setLatency] = useState<Record<string, number | 'testing'>>({})

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<'socks5' | 'http' | 'https'>('http')
  const [formHost, setFormHost] = useState('')
  const [formPort, setFormPort] = useState('')
  const [formUser, setFormUser] = useState('')
  const [formPass, setFormPass] = useState('')

  const resetForm = () => {
    setFormName(''); setFormType('http'); setFormHost(''); setFormPort('')
    setFormUser(''); setFormPass('')
  }

  const openAddForm = () => {
    resetForm()
    setEditingProxy(null)
    setIsAdding(true)
  }

  const openEditForm = (p: ProxyConfig) => {
    setFormName(p.name); setFormType(p.type); setFormHost(p.host); setFormPort(p.port)
    setFormUser(p.username); setFormPass(p.password)
    setEditingProxy(p)
    setIsAdding(true)
  }

  const handleSave = () => {
    if (!formHost || !formPort) return
    const name = formName || `${formType.toUpperCase()} ${formHost}:${formPort}`
    if (editingProxy) {
      updateProxy({ ...editingProxy, name, type: formType, host: formHost, port: formPort, username: formUser, password: formPass })
    } else {
      addProxy({ id: Date.now().toString(), name, type: formType, host: formHost, port: formPort, username: formUser, password: formPass })
    }
    setIsAdding(false)
    setEditingProxy(null)
    resetForm()
  }

  const handleActivate = async (id: string) => {
    if (activeProxyId === id) {
      // Deactivate
      setActiveProxy(null)
      setLatency(prev => { const n = { ...prev }; delete n[id]; return n })
    } else {
      // Activate and test latency
      setActiveProxy(id)
      setLatency(prev => ({ ...prev, [id]: 'testing' }))
      // Small delay to let native proxy apply
      await new Promise(r => setTimeout(r, 300))
      const { testProxyLatency } = await import('../api/proxy-bridge')
      const ms = await testProxyLatency(serverUrl)
      setLatency(prev => ({ ...prev, [id]: ms }))
    }
  }

  const handleTestLatency = async (id: string) => {
    setLatency(prev => ({ ...prev, [id]: 'testing' }))
    const { testProxyLatency } = await import('../api/proxy-bridge')
    const ms = await testProxyLatency(serverUrl)
    setLatency(prev => ({ ...prev, [id]: ms }))
  }

  const typeOptions: Array<{ value: 'socks5' | 'http' | 'https'; label: string }> = [
    { value: 'http', label: 'HTTP' },
    { value: 'https', label: 'HTTPS' },
    { value: 'socks5', label: 'SOCKS5' },
  ]

  return (
    <div className="page" id="proxy-settings-page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <h1>{t('proxy.title')}</h1>
      </div>
      <div className="page-body" style={{ padding: 16 }}>

        {/* "Direct" option */}
        <div
          onClick={() => setActiveProxy(null)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderRadius: 14,
            background: !activeProxyId
              ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.12))'
              : 'var(--bg-card)',
            border: !activeProxyId
              ? '1.5px solid rgba(34,197,94,0.35)'
              : '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: !activeProxyId ? 'rgba(34,197,94,0.2)' : 'var(--bg-secondary)',
              color: !activeProxyId ? '#22c55e' : 'var(--text-muted)',
              fontSize: 18,
            }}>⚡</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t('proxy.direct')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('proxy.direct_desc')}</div>
            </div>
          </div>
          {!activeProxyId && <Check size={18} style={{ color: '#22c55e' }} />}
        </div>

        {/* Proxy list */}
        {proxyList.map(p => {
          const isActive = activeProxyId === p.id
          const lat = latency[p.id]
          return (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 14, marginBottom: 8,
                background: isActive
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))'
                  : 'var(--bg-card)',
                border: isActive
                  ? '1.5px solid rgba(99,102,241,0.35)'
                  : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
            >
              {/* Tap area to activate */}
              <div
                onClick={() => handleActivate(p.id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'rgba(99,102,241,0.2)' : 'var(--bg-secondary)',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                  <Wifi size={16} />
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.type.toUpperCase()} · {p.host}:{p.port}
                    {p.username ? ' · 🔑' : ''}
                  </div>
                </div>
              </div>

              {/* Latency badge (only for active) */}
              {isActive && (
                <div
                  onClick={(e) => { e.stopPropagation(); handleTestLatency(p.id) }}
                  style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    background: lat === 'testing'
                      ? 'rgba(250,204,21,0.15)'
                      : lat === -1
                        ? 'rgba(239,68,68,0.15)'
                        : typeof lat === 'number'
                          ? lat < 200 ? 'rgba(34,197,94,0.15)' : lat < 500 ? 'rgba(250,204,21,0.15)' : 'rgba(239,68,68,0.15)'
                          : 'rgba(99,102,241,0.15)',
                    color: lat === 'testing'
                      ? '#eab308'
                      : lat === -1
                        ? '#ef4444'
                        : typeof lat === 'number'
                          ? lat < 200 ? '#22c55e' : lat < 500 ? '#eab308' : '#ef4444'
                          : 'var(--accent)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {lat === 'testing'
                    ? t('proxy.testing')
                    : lat === -1
                      ? t('proxy.timeout')
                      : typeof lat === 'number'
                        ? `${lat}ms`
                        : t('proxy.test')}
                </div>
              )}

              {/* Edit / Delete buttons */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  className="btn btn-sm"
                  onClick={(e) => { e.stopPropagation(); openEditForm(p) }}
                  style={{ padding: '6px 8px', borderRadius: 8, minWidth: 0 }}
                  title={t('common.edit')}
                >✏️</button>
                <button
                  className="btn btn-sm"
                  onClick={(e) => { e.stopPropagation(); removeProxy(p.id) }}
                  style={{ padding: '6px 8px', borderRadius: 8, minWidth: 0 }}
                  title={t('common.delete')}
                >🗑️</button>
              </div>
            </div>
          )
        })}

        {/* Add button */}
        {proxyList.length < 5 && !isAdding && (
          <button
            className="btn btn-full"
            onClick={openAddForm}
            style={{
              marginTop: 4, marginBottom: 16, borderRadius: 14, padding: '14px 0',
              border: '2px dashed var(--border)', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: 'var(--text-muted)', fontSize: 14, fontWeight: 500,
            }}
          >
            <span style={{ fontSize: 18 }}>+</span> {t('proxy.add')}
          </button>
        )}

        {proxyList.length >= 5 && !isAdding && (
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '8px 0 16px', opacity: 0.7 }}>
            {t('proxy.max_reached')}
          </div>
        )}

        {/* Add / Edit form */}
        {isAdding && (
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, padding: 16,
            border: '1px solid var(--border)', marginTop: 4, marginBottom: 16,
            display: 'flex', flexDirection: 'column', gap: 12,
            animation: 'slideDown 0.25s ease',
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
              {editingProxy ? t('common.edit') : t('proxy.add')}
            </div>

            {/* Name */}
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('proxy.name')}</div>
              <input
                className="input" type="text"
                placeholder={t('proxy.name_placeholder')}
                value={formName} onChange={e => setFormName(e.target.value)}
              />
            </div>

            {/* Type selector */}
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('proxy.type')}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {typeOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`btn btn-sm ${formType === opt.value ? 'btn-primary' : ''}`}
                    onClick={() => setFormType(opt.value)}
                    style={{ flex: 1, borderRadius: 10, fontSize: 13, fontWeight: formType === opt.value ? 700 : 400, padding: '10px 0' }}
                  >{opt.label}</button>
                ))}
              </div>
            </div>

            {/* Host + Port */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 3 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('proxy.host')}</div>
                <input
                  className="input" type="text" placeholder="proxy.example.com"
                  value={formHost} onChange={e => setFormHost(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('proxy.port')}</div>
                <input
                  className="input" type="text" inputMode="numeric" placeholder="1080"
                  value={formPort} onChange={e => setFormPort(e.target.value.replace(/\D/g, ''))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Auth */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('proxy.username')}</div>
                <input
                  className="input" type="text" autoComplete="off"
                  placeholder={t('proxy.optional')}
                  value={formUser} onChange={e => setFormUser(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('proxy.password')}</div>
                <input
                  className="input" type="password" autoComplete="off"
                  placeholder={t('proxy.optional')}
                  value={formPass} onChange={e => setFormPass(e.target.value)}
                />
              </div>
            </div>

            {/* Form buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className="btn btn-primary btn-full"
                onClick={handleSave}
                disabled={!formHost || !formPort}
                style={{ flex: 2, borderRadius: 10 }}
              >{t('common.save')}</button>
              <button
                className="btn btn-full"
                onClick={() => { setIsAdding(false); setEditingProxy(null); resetForm() }}
                style={{ flex: 1, borderRadius: 10 }}
              >{t('common.cancel')}</button>
            </div>
          </div>
        )}

        {/* Hint */}
        <div style={{
          padding: '12px 14px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 12,
          fontSize: 13,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}>
          {t('proxy.hint')}
        </div>
      </div>
    </div>
  )
}
