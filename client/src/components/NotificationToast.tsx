/**
 * Global Toast Notification Component
 *
 * Renders in-app notification toasts at the top of the screen.
 * Imported at the App level, above all routes.
 */
import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from '../store/notificationStore'
import { MessageCircle, Phone, X } from 'lucide-react'

export default function NotificationToast() {
  const toasts = useNotificationStore((s) => s.toasts)
  const dismiss = useNotificationStore((s) => s.dismissToast)
  const navigate = useNavigate()

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9500,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => {
            dismiss(toast.id)
            if (toast.chatId) {
              const path = toast.isGroup
                ? `/chat/${toast.chatId}?group=1`
                : `/chat/${toast.chatId}`
              navigate(path)
            }
          }}
          style={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: 420,
            background: 'var(--bg-card, #1e1e2e)',
            borderRadius: 16,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            backdropFilter: 'blur(20px)',
            animation: 'toast-slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          {/* Icon / Avatar */}
          <div style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: toast.type === 'call'
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : 'linear-gradient(135deg, var(--accent, #667eea), #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            overflow: 'hidden',
          }}>
            {toast.avatar ? (
              <img src={toast.avatar} alt="" style={{
                width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover',
              }} />
            ) : toast.type === 'call' ? (
              <Phone size={20} />
            ) : (
              <MessageCircle size={20} />
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary, #fff)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {toast.title}
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary, rgba(255,255,255,0.7))',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 2,
            }}>
              {toast.body}
            </div>
          </div>

          {/* Dismiss */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              dismiss(toast.id)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, rgba(255,255,255,0.4))',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}

      {/* Animation keyframes injected inline */}
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
