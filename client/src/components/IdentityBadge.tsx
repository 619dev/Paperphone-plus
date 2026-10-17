import { useI18n } from '../hooks/useI18n'
import { useEffect, useState } from 'react'
import { identityVerified } from '../crypto/authenticatedMessaging'

type IdentityProps = { id: string; ik?: string; sign?: string; refreshing?: boolean }

function useVerified({ id, ik, sign, refreshing = false }: IdentityProps) {
  const [verified, setVerified] = useState(false)
  useEffect(() => {
    let active = true
    let revision = 0
    const update = () => {
      const request = ++revision
      void identityVerified(id, ik, sign).then(value => { if (active && request === revision) setVerified(value) })
        .catch(() => { if (active && request === revision) setVerified(false) })
    }
    setVerified(false)
    if (refreshing) return
    update()
    window.addEventListener('paperphone:identity-changed', update)
    return () => { active = false; window.removeEventListener('paperphone:identity-changed', update) }
  }, [id, ik, sign, refreshing])
  return !refreshing && verified
}

export default function IdentityBadge(props: IdentityProps) {
  const { t } = useI18n()
  const verified = useVerified(props)
  return verified ? <span style={{ color: '#22c55e', marginLeft: 4 }} title={t('verify.badge_title')} aria-label={t('verify.badge_label')}>✅</span> : null
}

export function IdentityPrompt(props: IdentityProps & { onVerify: () => void }) {
  const { t } = useI18n()
  const verified = useVerified(props)
  if (verified) return null
  return <div style={{ padding: '8px 14px', fontSize: 12, lineHeight: 1.6, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
    <strong>{t('verify.setup_notice')}</strong>
    <div>{t('verify.notice')}</div>
    <button className="btn btn-sm btn-secondary" onClick={props.onVerify}>{t('verify.title')}</button>
  </div>
}
