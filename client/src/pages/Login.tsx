import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { post } from '../api/http'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'
import { allLangs, langNames, LangCode } from '../i18n'
import { generateKeyPair, generateSignKeyPair, signMessage, initSodium } from '../crypto/ratchet'
import { setKeys } from '../crypto/keystore'

export default function Login() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const setAuth = useStore(s => s.setAuth)
  const lang = useStore(s => s.lang)
  const setLang = useStore(s => s.setLang)

  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 2FA state
  const [needs2fa, setNeeds2fa] = useState(false)
  const [loginToken, setLoginToken] = useState('')
  const [totpCode, setTotpCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
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
          <div className="login-logo">🔐</div>
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
            <span className="security-icon">🔒</span>
            <span className="security-text">{t('security.local_keys')}</span>
          </div>
          <div className="security-badge">
            <span className="security-icon">🛡️</span>
            <span className="security-text">{t('security.e2e')}</span>
          </div>
          <div className="security-badge">
            <span className="security-icon">🔗</span>
            <span className="security-text">{t('security.forward')}</span>
          </div>
          <div className="security-badge">
            <span className="security-icon">⚛️</span>
            <span className="security-text">{t('security.quantum')}</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
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
      </div>
    </div>
  )
}
