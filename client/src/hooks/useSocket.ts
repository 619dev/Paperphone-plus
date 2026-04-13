import { useEffect } from 'react'
import { useStore } from '../store'
import { connectWs, disconnectWs, onWs } from '../api/socket'
import { useNotificationStore } from '../store/notificationStore'
import { playMessageSound, showBrowserNotification, getMessagePreview } from '../utils/notification'

export function useSocket() {
  const token = useStore(s => s.token)

  useEffect(() => {
    if (!token) return

    connectWs()

    // Listen for incoming messages and route to store
    const unsubMsg = onWs('message', (data) => {
      const myId = useStore.getState().user?.id
      const chatId = data.group_id || (data.from === myId ? data.to : data.from)
      if (chatId) {
        useStore.getState().addMessage(chatId, data)

        // If not on that chat page AND message is not from me, trigger notification
        const isFromMe = data.from === myId
        const isOnChat = window.location.pathname.includes(chatId)

        if (!isFromMe && !isOnChat) {
          useStore.getState().incrementUnread(chatId)

          // Resolve sender info
          const friends = useStore.getState().friends
          const groups = useStore.getState().groups
          const friend = friends.find(f => f.id === data.from)
          const group = data.group_id ? groups.find(g => g.id === data.group_id) : null
          const senderName = data.from_nickname || friend?.nickname || friend?.username || data.from || '?'
          const chatName = group ? group.name : senderName
          const avatar = friend?.avatar || group?.avatar

          // Message preview
          let preview: string
          if (data.msg_type && data.msg_type !== 'text') {
            preview = getMessagePreview(data.msg_type, getI18nT())
          } else {
            // For text: show decrypted if available, else ciphertext preview
            const text = data.decrypted || data.ciphertext || ''
            preview = text.length > 50 ? text.substring(0, 50) + '...' : text
          }

          // In-app toast notification
          useNotificationStore.getState().showToast({
            type: 'message',
            title: chatName,
            body: group ? `${senderName}: ${preview}` : preview,
            avatar,
            chatId,
            isGroup: !!data.group_id,
          })

          // Play sound
          playMessageSound()

          // Browser notification (only if tab hidden)
          showBrowserNotification(
            chatName,
            group ? `${senderName}: ${preview}` : preview,
            () => {
              window.location.href = data.group_id
                ? `/chat/${chatId}?group=1`
                : `/chat/${chatId}`
            }
          )
        } else if (!isFromMe && isOnChat) {
          // On the chat page but still play a subtle sound for new messages
          // (skip if it's a self message)
        }
      }
    })

    // Listen for ack: add sent message to local store for real-time display
    const unsubAck = onWs('ack', (data) => {
      const pending = (window as any).__pendingMsg
      if (pending && data.msg_id) {
        const chatId = pending.group_id || pending.to
        if (chatId) {
          useStore.getState().addMessage(chatId, {
            ...pending,
            id: data.msg_id,
            ts: data.ts || Date.now(),
          })
        }
        ;(window as any).__pendingMsg = null
      }
    })

    // Listen for read receipts
    const unsubRead = onWs('msg_read', (data) => {
      if (data.msg_ids && data.ts) {
        useStore.getState().markMessagesRead(data.msg_ids, data.ts)
      }
    })

    // Listen for online/offline status
    const unsubOnline = onWs('online', (data) => {
      if (data.user_id) {
        useStore.getState().updateFriendOnline(data.user_id, true)
      }
    })

    const unsubOffline = onWs('offline', (data) => {
      if (data.user_id) {
        useStore.getState().updateFriendOnline(data.user_id, false)
      }
    })

    return () => {
      unsubMsg()
      unsubAck()
      unsubRead()
      unsubOnline()
      unsubOffline()
      disconnectWs()
    }
  }, [token])
}

/**
 * Helper to get the i18n translation function outside of React components.
 * Falls back to English defaults.
 */
function getI18nT(): (key: string) => string {
  // Access i18n translations from the store
  try {
    const lang = useStore.getState().lang || 'en'
    // Dynamic import not possible here, use a simple fallback map
    const fallbacks: Record<string, string> = {
      'notification.image': lang === 'zh' ? '[图片]' : '[Image]',
      'notification.voice': lang === 'zh' ? '[语音]' : '[Voice]',
      'notification.file': lang === 'zh' ? '[文件]' : '[File]',
      'notification.video': lang === 'zh' ? '[视频]' : '[Video]',
      'notification.sticker': lang === 'zh' ? '[表情]' : '[Sticker]',
    }
    return (key: string) => fallbacks[key] || key
  } catch {
    return (key: string) => key
  }
}
