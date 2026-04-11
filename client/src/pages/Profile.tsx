import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'
import { clearKeys } from '../crypto/keystore'
import { disconnectWs } from '../api/socket'

export default function Profile() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const theme = useStore(s => s.theme)
  const toggleTheme = useStore(s => s.toggleTheme)
  const logout = useStore(s => s.logout)
  const lang = useStore(s => s.lang)

  const handleLogout = () => {
    disconnectWs()
    clearKeys()
    logout()
    navigate('/login')
  }

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

        {/* Settings */}
        <div className="section-title">{t('profile.account')}</div>
        <div className="settings-item" onClick={() => {}}>
          <span className="label">{t('profile.change_password')}</span>
          <span className="arrow">›</span>
        </div>
        <div className="settings-item" onClick={() => {}}>
          <span className="label">{t('profile.two_factor')}</span>
          <span className="arrow">›</span>
        </div>
        <div className="settings-item" onClick={() => {}}>
          <span className="label">{t('profile.sessions')}</span>
          <span className="arrow">›</span>
        </div>
        <div className="settings-item" onClick={() => {}}>
          <span className="label">{t('profile.tags')}</span>
          <span className="arrow">›</span>
        </div>

        <div className="divider" />

        <div className="section-title">{t('profile.account')}</div>
        <div className="settings-item" onClick={toggleTheme}>
          <span className="label">{t('profile.theme')}</span>
          <div className={`toggle ${theme === 'dark' ? 'active' : ''}`} />
        </div>
        <div className="settings-item">
          <span className="label">{t('profile.language')}</span>
          <span className="value">{lang.toUpperCase()}</span>
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
