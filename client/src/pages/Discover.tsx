import { useNavigate } from 'react-router-dom'
import { useI18n } from '../hooks/useI18n'

export default function Discover() {
  const { t } = useI18n()
  const navigate = useNavigate()

  const items = [
    { icon: '📸', label: t('discover.moments'), path: '/moments' },
    { icon: '📰', label: t('discover.timeline'), path: '/timeline' },
    { icon: '📷', label: t('discover.scan'), path: '#scan' },
  ]

  return (
    <div className="page" id="discover-page">
      <div className="page-header">
        <h1>{t('discover.title')}</h1>
      </div>
      <div className="page-body">
        {items.map((item, i) => (
          <div
            key={i}
            className="settings-item"
            onClick={() => item.path.startsWith('/') && navigate(item.path)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              <span className="label">{item.label}</span>
            </div>
            <span className="arrow">›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
