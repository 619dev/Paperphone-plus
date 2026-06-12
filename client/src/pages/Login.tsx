import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post, put } from '../api/http'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'
import { ShieldCheck, Lock, Shield, Link, Atom, Server, Wifi, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { allLangs, langNames, LangCode } from '../i18n'
import { generateKeyPair, generateSignKeyPair, signMessage, initSodium } from '../crypto/ratchet'
import { setKeys, getKeys, loadFromIndexedDB } from '../crypto/keystore'
import { clearAllSenderKeys } from '../crypto/groupCrypto'

export default function Login() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const setAuth = useStore(s => s.setAuth)
  const lang = useStore(s => s.lang)
  const setLang = useStore(s => s.setLang)
  const serverUrl = useStore(s => s.serverUrl)
  const setServerUrl = useStore(s => s.setServerUrl)

  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Proxy state (list-based)
  const proxyList = useStore(s => s.proxyList)
  const activeProxyId = useStore(s => s.activeProxyId)
  const setActiveProxy = useStore(s => s.setActiveProxy)
  const addProxy = useStore(s => s.addProxy)
  const removeProxy = useStore(s => s.removeProxy)
  const [showProxy, setShowProxy] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [latency, setLatency] = useState<Record<string, number | 'testing'>>({})

  // Add-proxy form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<'socks5' | 'http' | 'https'>('http')
  const [formHost, setFormHost] = useState('')
  const [formPort, setFormPort] = useState('')
  const [formUser, setFormUser] = useState('')
  const [formPass, setFormPass] = useState('')

  const resetProxyForm = () => {
    setFormName(''); setFormType('http'); setFormHost(''); setFormPort('')
    setFormUser(''); setFormPass('')
  }

  const handleAddProxy = () => {
    if (!formHost || !formPort) return
    const name = formName || `${formType.toUpperCase()} ${formHost}:${formPort}`
    addProxy({ id: Date.now().toString(), name, type: formType, host: formHost, port: formPort, username: formUser, password: formPass })
    setShowAddForm(false)
    resetProxyForm()
  }

  const handleActivateProxy = async (id: string) => {
    if (activeProxyId === id) {
      setActiveProxy(null)
      setLatency(prev => { const n = { ...prev }; delete n[id]; return n })
    } else {
      setActiveProxy(id)
      setLatency(prev => ({ ...prev, [id]: 'testing' }))
      await new Promise(r => setTimeout(r, 300))
      const { testProxyLatency } = await import('../api/proxy-bridge')
      const ms = await testProxyLatency(serverUrl)
      setLatency(prev => ({ ...prev, [id]: ms }))
    }
  }

  const handleRetestLatency = async (id: string) => {
    setLatency(prev => ({ ...prev, [id]: 'testing' }))
    const { testProxyLatency } = await import('../api/proxy-bridge')
    const ms = await testProxyLatency(serverUrl)
    setLatency(prev => ({ ...prev, [id]: ms }))
  }

  // 2FA state
  const [needs2fa, setNeeds2fa] = useState(false)
  const [loginToken, setLoginToken] = useState('')
  const [totpCode, setTotpCode] = useState('')

  // Restore keys from IndexedDB or generate new ones on a new device
  const ensureKeysExist = async () => {
    // 1. Try memory / localStorage / sessionStorage
    if (getKeys()) return
    // 2. Try IndexedDB
    const idbKeys = await loadFromIndexedDB()
    if (idbKeys) return
    // 3. Generate fresh keys and upload public bundle
    // This means the user lost their local keys (new device, cleared data, etc.)
    // We MUST also reset sender key distributions on the server, because
    // other group members' sender keys were encrypted with the OLD ik_pub
    // and cannot be decrypted with the NEW ik_priv.
    try {
      const sodium = await initSodium()
      const ikPair = await generateKeyPair()
      const spkPair = await generateKeyPair()
      const signPair = await generateSignKeyPair()
      const spkPubBytes = sodium.from_base64(spkPair.publicKey)
      const spkSig = await signMessage(spkPubBytes, signPair.privateKey)
      const opks: Array<{ key_id: number; pub: string; priv: string }> = []
      for (let i = 0; i < 20; i++) {
        const opk = await generateKeyPair()
        opks.push({ key_id: i, pub: opk.publicKey, priv: opk.privateKey })
      }
      setKeys({
        ik_pub: ikPair.publicKey, ik_priv: ikPair.privateKey,
        spk_pub: spkPair.publicKey, spk_priv: spkPair.privateKey,
        spk_sig: spkSig,
        sign_pub: signPair.publicKey, sign_priv: signPair.privateKey,
        opks,
      })
      // Upload public keys to server
      await put('/api/users/keys', {
        ik_pub: ikPair.publicKey,
        spk_pub: spkPair.publicKey,
        spk_sig: spkSig,
        kem_pub: signPair.publicKey,
        prekeys: opks.map(k => ({ key_id: k.key_id, opk_pub: k.pub })),
      })
      // Reset all sender key distributions on the server and notify group members.
      // Old distributions were encrypted with the previous ik_pub and are now useless.
      await post('/api/users/reset-sender-keys', {})
      // Clear local sender key cache — all cached keys are invalid with new identity
      clearAllSenderKeys()
      console.log('[Login] New identity keys generated, sender keys reset')
    } catch (err) {
      console.warn('[Login] ensureKeysExist failed:', err)
    }
  }

  /**
   * One-time key consistency check for existing old accounts.
   * If the local ik_pub doesn't match what's stored on the server,
   * sync the local key to the server and reset sender key distributions.
   * This handles the case where an old account still has its original
   * local keys but the server has a different ik_pub (from a prior
   * ensureKeysExist on another device).
   */
  const checkKeyConsistency = async () => {
    try {
      const keys = getKeys()
      if (!keys) return
      const me = await get('/api/users/me')
      if (!me?.ik_pub) return
      if (me.ik_pub === keys.ik_pub) return // Keys match — no action needed
      // Mismatch! Local key is the source of truth (we have the private key).
      // Update server to use our local ik_pub and reset stale sender keys.
      console.warn('[Login] Key mismatch detected: local ik_pub differs from server. Syncing...')
      await put('/api/users/keys', {
        ik_pub: keys.ik_pub,
        spk_pub: keys.spk_pub,
        spk_sig: keys.spk_sig,
        kem_pub: keys.sign_pub,
        prekeys: keys.opks?.map(k => ({ key_id: k.key_id, opk_pub: k.pub })),
      })
      await post('/api/users/reset-sender-keys', {})
      clearAllSenderKeys()
      console.log('[Login] Key consistency restored, sender keys reset')
    } catch (err) {
      console.warn('[Login] checkKeyConsistency failed:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!agreedToTerms) {
        setError(t('terms.must_agree'))
        setLoading(false)
        return
      }

      if (isRegister) {
        // Generate crypto keys
        const sodium = await initSodium()
        const ikPair = await generateKeyPair()
        const spkPair = await generateKeyPair()
        const signPair = await generateSignKeyPair()

        // Sign the SPK with the signing key
        const spkPubBytes = sodium.from_base64(spkPair.publicKey)
        const spkSig = await signMessage(spkPubBytes, signPair.privateKey)

        // Generate one-time prekeys
        const opks = []
        for (let i = 0; i < 20; i++) {
          const opk = await generateKeyPair()
          opks.push({ key_id: i, pub: opk.publicKey, priv: opk.privateKey })
        }

        const res = await post('/api/auth/register', {
          username,
          nickname: nickname || username,
          password,
          ik_pub: ikPair.publicKey,
          spk_pub: spkPair.publicKey,
          spk_sig: spkSig,
          kem_pub: signPair.publicKey,
          prekeys: opks.map(k => ({ key_id: k.key_id, opk_pub: k.pub })),
        })

        // Store keys locally
        setKeys({
          ik_pub: ikPair.publicKey,
          ik_priv: ikPair.privateKey,
          spk_pub: spkPair.publicKey,
          spk_priv: spkPair.privateKey,
          spk_sig: spkSig,
          sign_pub: signPair.publicKey,
          sign_priv: signPair.privateKey,
          opks,
        })

        setAuth(res.token, res.user)
        navigate('/chats')
      } else {
        const res = await post('/api/auth/login', { username, password })

        if (res.requires_2fa) {
          setNeeds2fa(true)
          setLoginToken(res.login_token)
        } else {
          setAuth(res.token, res.user)
          // Restore or generate keys after login
          await ensureKeysExist()
          // Check if local keys match server (fixes existing old accounts)
          await checkKeyConsistency()
          navigate('/chats')
        }
      }
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handle2fa = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await post('/api/totp/verify', { login_token: loginToken, code: totpCode })
      setAuth(res.token, res.user)
      await ensureKeysExist()
      await checkKeyConsistency()
      navigate('/chats')
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  if (needs2fa) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo"><ShieldCheck size={36} /></div>
          <h1 className="login-title">{t('auth.totp_required')}</h1>
          <form className="login-form" onSubmit={handle2fa}>
            <div className="input-group">
              <input
                className="input" id="totp-code"
                type="text" inputMode="numeric" autoComplete="one-time-code"
                placeholder={t('auth.totp_code')}
                value={totpCode} onChange={e => setTotpCode(e.target.value)}
              />
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{error}</div>}
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? t('common.loading') : t('auth.verify')}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/icons/icon-512.png" alt="PaperPhone" className="login-logo-img" />
        </div>
        <h1 className="login-title">{t('app.name')}</h1>
        <p className="login-subtitle">{t('auth.subtitle')}</p>

        {/* Security Features */}
        <div className="security-badges">
          <div className="security-badge">
            <span className="security-icon"><Lock size={16} /></span>
            <span className="security-text">{t('security.local_keys')}</span>
          </div>
          <div className="security-badge">
            <span className="security-icon"><Shield size={16} /></span>
            <span className="security-text">{t('security.e2e')}</span>
          </div>
          <div className="security-badge">
            <span className="security-icon"><Link size={16} /></span>
            <span className="security-text">{t('security.forward')}</span>
          </div>
          <div className="security-badge">
            <span className="security-icon"><Atom size={16} /></span>
            <span className="security-text">{t('security.quantum')}</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <div className="server-url-input">
              <Server size={16} className="server-url-icon" />
              <input
                className="input" id="server-url-input"
                type="url"
                placeholder={t('auth.server_url_placeholder')}
                value={serverUrl} onChange={e => setServerUrl(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Proxy Settings Toggle */}
          <div
            id="login-proxy-toggle"
            onClick={() => setShowProxy(!showProxy)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: activeProxyId ? 'var(--accent)' : 'var(--text-muted)',
              background: activeProxyId
                ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))'
                : 'var(--bg-card)',
              border: activeProxyId
                ? '1px solid rgba(99,102,241,0.25)'
                : '1px solid var(--border)',
              transition: 'all 0.3s ease',
              userSelect: 'none',
            }}
          >
            <Wifi size={14} />
            {t('proxy.title')}
            {activeProxyId && <span style={{ fontSize: 11, opacity: 0.7 }}>●</span>}
            {showProxy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>

          {/* Proxy Selector Panel */}
          {showProxy && (
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 12,
              padding: '10px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              animation: 'slideDown 0.25s ease',
            }}>
              {/* Direct option */}
              <div
                onClick={() => setActiveProxy(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  background: !activeProxyId ? 'rgba(34,197,94,0.08)' : 'transparent',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 9,
                  border: !activeProxyId ? '2px solid #22c55e' : '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {!activeProxyId && <div style={{ width: 10, height: 10, borderRadius: 5, background: '#22c55e' }} />}
                </div>
                <span style={{ fontSize: 13, fontWeight: !activeProxyId ? 600 : 400 }}>{t('proxy.direct')}</span>
              </div>

              {/* Saved proxies */}
              {proxyList.map(p => {
                const isActive = activeProxyId === p.id
                const lat = latency[p.id]
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8,
                      background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                      transition: 'background 0.2s',
                    }}
                  >
                    {/* Radio + info (tap to activate) */}
                    <div
                      onClick={() => handleActivateProxy(p.id)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0 }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 9,
                        border: isActive ? '2px solid var(--accent)' : '2px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {isActive && <div style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--accent)' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.type.toUpperCase()} · {p.host}:{p.port}
                        </div>
                      </div>
                    </div>

                    {/* Latency badge (active only) */}
                    {isActive && (
                      <div
                        onClick={(e) => { e.stopPropagation(); handleRetestLatency(p.id) }}
                        style={{
                          padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
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

                    {/* Delete button */}
                    <div
                      onClick={(e) => { e.stopPropagation(); removeProxy(p.id) }}
                      style={{ cursor: 'pointer', fontSize: 12, padding: '2px 4px', opacity: 0.5, flexShrink: 0 }}
                      title={t('common.delete')}
                    >🗑️</div>
                  </div>
                )
              })}

              {/* Add proxy button / form */}
              {!showAddForm && proxyList.length < 5 && (
                <div
                  onClick={() => setShowAddForm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    border: '1.5px dashed var(--border)', marginTop: 2,
                    fontSize: 12, color: 'var(--text-muted)', fontWeight: 500,
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{ fontSize: 15 }}>+</span> {t('proxy.add')}
                </div>
              )}

              {/* Inline add form */}
              {showAddForm && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 8,
                  padding: '10px', borderRadius: 10,
                  border: '1px solid var(--border)', marginTop: 2,
                  background: 'var(--bg-secondary)',
                }}>
                  {/* Name */}
                  <input
                    className="input" type="text" placeholder={t('proxy.name_placeholder')}
                    value={formName} onChange={e => setFormName(e.target.value)}
                    style={{ fontSize: 13 }}
                  />

                  {/* Type selector */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['http', 'https', 'socks5'] as const).map(tp => (
                      <button
                        key={tp} type="button"
                        className={`btn btn-sm ${formType === tp ? 'btn-primary' : ''}`}
                        onClick={() => setFormType(tp)}
                        style={{ flex: 1, borderRadius: 8, fontSize: 11, padding: '6px 0' }}
                      >{tp.toUpperCase()}</button>
                    ))}
                  </div>

                  {/* Host + Port */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      className="input" type="text" placeholder={t('proxy.host')}
                      value={formHost} onChange={e => setFormHost(e.target.value)}
                      style={{ flex: 3, fontSize: 13 }}
                    />
                    <input
                      className="input" type="text" inputMode="numeric" placeholder={t('proxy.port')}
                      value={formPort} onChange={e => setFormPort(e.target.value.replace(/\D/g, ''))}
                      style={{ flex: 1, fontSize: 13 }}
                    />
                  </div>

                  {/* Auth */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      className="input" type="text" autoComplete="off"
                      placeholder={`${t('proxy.username')} (${t('proxy.optional')})`}
                      value={formUser} onChange={e => setFormUser(e.target.value)}
                      style={{ flex: 1, fontSize: 12 }}
                    />
                    <input
                      className="input" type="password" autoComplete="off"
                      placeholder={`${t('proxy.password')} (${t('proxy.optional')})`}
                      value={formPass} onChange={e => setFormPass(e.target.value)}
                      style={{ flex: 1, fontSize: 12 }}
                    />
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button" className="btn btn-primary btn-full btn-sm"
                      onClick={handleAddProxy}
                      disabled={!formHost || !formPort}
                      style={{ flex: 2, borderRadius: 8, fontSize: 12 }}
                    >{t('common.save')}</button>
                    <button
                      type="button" className="btn btn-full btn-sm"
                      onClick={() => { setShowAddForm(false); resetProxyForm() }}
                      style={{ flex: 1, borderRadius: 8, fontSize: 12 }}
                    >{t('common.cancel')}</button>
                  </div>
                </div>
              )}

              {proxyList.length >= 5 && !showAddForm && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0', opacity: 0.6 }}>
                  {t('proxy.max_reached')}
                </div>
              )}
            </div>
          )}

          <div className="input-group">
            <input
              className="input" id="username-input"
              type="text" autoComplete="username"
              placeholder={t('auth.username')}
              value={username} onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <div className="input-group">
              <input
                className="input" id="nickname-input"
                type="text"
                placeholder={t('auth.nickname')}
                value={nickname} onChange={e => setNickname(e.target.value)}
              />
            </div>
          )}

          <div className="input-group">
            <input
              className="input" id="password-input"
              type="password" autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder={t('auth.password')}
              value={password} onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{error}</div>}

          <button className="btn btn-primary btn-full" type="submit" id="submit-btn" disabled={loading}>
            {loading
              ? (isRegister ? t('auth.registering') : t('auth.logging_in'))
              : (isRegister ? t('auth.register') : t('auth.login'))
            }
          </button>
        </form>

        {/* Terms of Use checkbox (login & registration) */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '8px 4px', fontSize: 13, color: 'var(--text-secondary)',
        }}>
          <input
            type="checkbox"
            id="terms-checkbox"
            checked={agreedToTerms}
            onChange={e => setAgreedToTerms(e.target.checked)}
            style={{ marginTop: 2, accentColor: 'var(--accent)', width: 18, height: 18, flexShrink: 0 }}
          />
          <label htmlFor="terms-checkbox" style={{ lineHeight: 1.4 }}>
            {t('terms.agree_prefix')}
            <a onClick={() => navigate('/terms')} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
              {t('terms.agree_link')}
            </a>
          </label>
        </div>

        <div className="login-toggle">
          {isRegister ? t('auth.has_account') : t('auth.no_account')}{' '}
          <a onClick={() => { setIsRegister(!isRegister); setError('') }}>
            {isRegister ? t('auth.login') : t('auth.register')}
          </a>
        </div>

        <div className="login-lang">
          {allLangs.map(l => (
            <button
              key={l}
              className={lang === l ? 'active' : ''}
              onClick={() => setLang(l)}
            >
              {langNames[l]}
            </button>
          ))}
        </div>

        <div className="login-privacy-link" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <a onClick={() => navigate('/terms')}>{t('terms.title')}</a>
          <span style={{ opacity: 0.3 }}>|</span>
          <a onClick={() => navigate('/privacy')}>{t('privacy.title')}</a>
        </div>
      </div>
    </div>
  )
}
