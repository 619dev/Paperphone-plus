import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get } from '../api/http'
import { useI18n } from '../hooks/useI18n'

export default function GroupInfo() {
  const { id } = useParams<{ id: string }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [group, setGroup] = useState<any>(null)

  useEffect(() => {
    if (id) get(`/api/groups/${id}`).then(setGroup).catch(() => {})
  }, [id])

  if (!group) return <div className="page"><div className="loading-spinner" /></div>

  return (
    <div className="page" id="group-info-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>{group.name}</h1>
      </div>
      <div className="page-body">
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div className="avatar avatar-lg" style={{ margin: '0 auto 12px' }}>
            {group.avatar ? <img src={group.avatar} alt="" /> : '👥'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{group.name}</div>
          {group.notice && <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>{group.notice}</div>}
        </div>

        <div className="divider" />
        <div className="section-title">{t('group.members')} ({group.members?.length || 0})</div>

        {group.members?.map((m: any) => (
          <div key={m.id} className="list-item" onClick={() => navigate(`/user/${m.id}`)}>
            <div className="avatar avatar-sm">
              {m.avatar ? <img src={m.avatar} alt="" /> : m.nickname?.[0]?.toUpperCase()}
            </div>
            <div className="list-content">
              <div className="name">{m.nickname}</div>
              <div className="preview" style={{ fontSize: 12 }}>{m.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
