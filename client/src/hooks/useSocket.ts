import { useEffect } from 'react'
import { useStore } from '../store'
import { connectWs, disconnectWs, onWs } from '../api/socket'
import { useNotificationStore } from '../store/notificationStore'
import { playMessageSound, showBrowserNotification, getMessagePreview } from '../utils/notification'
import { getKeys } from '../crypto/keystore'
import { decryptHybrid } from '../crypto/ratchet'
import { getSenderKey, storeSenderKey, clearGroupSenderKeys, receiveSenderKey, removeSenderKey } from '../crypto/groupCrypto'
import { decryptWithSenderKey } from '../crypto/groupCrypto'
import { get } from '../api/http'

/**
 * Try to fetch and store sender keys from the server for a given group.
 * Returns true if at least one new key was imported.
 */
async function fetchAndStoreSenderKeys(groupId: string): Promise<boolean> {
  const keys = getKeys()
  if (!keys) return false
  try {
    const skData = await get(`/api/groups/${groupId}/sender-keys`)
    if (!skData?.keys || !Array.isArray(skData.keys)) return false
    let imported = false
    for (const k of skData.keys) {
      if (!getSenderKey(groupId, k.from_id)) {
        try {
          const senderKey = await receiveSenderKey(
            k.encrypted_key, k.header, keys.ik_priv, null
          )
          storeSenderKey(groupId, k.from_id, senderKey, k.key_version || 1)
          imported = true
        } catch (err) {
          console.warn(`[useSocket] Failed to decrypt sender key from ${k.from_id} for group ${groupId}:`, err)
        }
      }
    }
    return imported
  } catch (err) {
    console.warn(`[useSocket] Failed to fetch sender keys for group ${groupId}:`, err)
    return false
  }
}

/**
 * Re-decrypt any 🔒 messages in the store for a given group+sender
 * after their sender key becomes available.
 */
async function retryDecryptGroupMessages(groupId: string, senderId: string) {
  const sk = getSenderKey(groupId, senderId)
  if (!sk) return
  const msgs = useStore.getState().messages[groupId] || []
  for (const msg of msgs) {
    if (msg.from === senderId && msg.decrypted === '🔒' && msg.id) {
      // This message failed to decrypt before — retry now
      const nonce = (msg as any).nonce
      if (msg.ciphertext && nonce) {
        try {
          const text = await decryptWithSenderKey(msg.ciphertext, nonce, sk.senderKey)
          useStore.getState().updateMessage(groupId, msg.id, { decrypted: text })
        } catch (err) {
          console.warn(`[useSocket] Retry decrypt failed for msg ${msg.id}:`, err)
        }
      }
    }
  }
}

export function useSocket() {
  const token = useStore(s => s.token)

  useEffect(() => {
    if (!token) return

    connectWs()

    // Listen for incoming messages and route to store
    const unsubMsg = onWs('message', async (data) => {
      const myId = useStore.getState().user?.id
      const chatId = data.group_id || (data.from === myId ? data.to : data.from)
      if (chatId) {
        // Filter out expired offline messages based on auto_delete settings
        if (data.offline && data.ts) {
          const friends = useStore.getState().friends
          const groups = useStore.getState().groups
          let autoDeleteSec = 0
          if (data.group_id) {
            const group = groups.find(g => g.id === data.group_id)
            autoDeleteSec = group?.auto_delete ?? 0
          } else {
            const friend = friends.find(f => f.id === (data.from === myId ? data.to : data.from))
            autoDeleteSec = friend?.auto_delete ?? 0
          }
          if (autoDeleteSec > 0) {
            const cutoff = Date.now() - autoDeleteSec * 1000
            if (data.ts < cutoff) return // Skip expired message
          }
        }

        // Decrypt private messages before adding to store
        let msgToAdd = data
        if (!data.group_id && data.ciphertext && data.header) {
          try {
            const keys = getKeys()
            if (keys) {
              const isMe = data.from === myId
              if (isMe && data.self_ciphertext && data.self_header) {
                const text = await decryptHybrid(data.self_header, keys.ik_priv, null, data.self_ciphertext)
                msgToAdd = { ...data, decrypted: text }
              } else if (!isMe) {
                const text = await decryptHybrid(data.header, keys.ik_priv, null, data.ciphertext)
                msgToAdd = { ...data, decrypted: text }
              }
            }
          } catch {
            // Decryption failed, keep original data
          }
        } else if (data.group_id) {
          // Group messages - check if encrypted
          if (data.sender_key_version && data.nonce) {
            // Encrypted group message — decrypt with sender's key
            try {
              let sk = getSenderKey(data.group_id, data.from)
              if (!sk) {
                // Don't have sender key yet — fetch from server
                console.log(`[useSocket] No sender key for ${data.from} in group ${data.group_id}, fetching from server...`)
                await fetchAndStoreSenderKeys(data.group_id)
                sk = getSenderKey(data.group_id, data.from)
              }
              if (sk) {
                const text = await decryptWithSenderKey(data.ciphertext, data.nonce, sk.senderKey)
                msgToAdd = { ...data, decrypted: text }
              } else {
                // Still don't have sender key — store as 🔒 but keep nonce in data for retry
                console.warn(`[useSocket] Still no sender key for ${data.from} in group ${data.group_id} after fetch. Message will show 🔒`)
                msgToAdd = { ...data, decrypted: '🔒' }
              }
            } catch (err) {
              console.warn(`[useSocket] Group message decrypt failed for msg from ${data.from}:`, err)
              msgToAdd = { ...data, decrypted: '🔒' }
            }
          } else {
            // Unencrypted group message
            msgToAdd = { ...data, decrypted: data.ciphertext }
          }
        }

        useStore.getState().addMessage(chatId, msgToAdd)

        // If not on that chat page AND message is not from me, trigger notification
        const isFromMe = data.from === myId
        const isOnChat = window.location.pathname.includes(chatId)

        if (!isFromMe && !isOnChat) {
          useStore.getState().incrementUnread(chatId)

          // Skip all notifications for offline catch-up messages
          // (they are historical and should not ring/toast)
          if (data.offline) return

          // Check if this group is muted
          const groups = useStore.getState().groups
          const group = data.group_id ? groups.find(g => g.id === data.group_id) : null
          if (data.group_id) {
            // If groups haven't loaded yet, skip notification (fail-closed)
            // If group is muted, also skip
            if (!group || group.muted) return
          }

          // Resolve sender info
          const friends = useStore.getState().friends
          const friend = friends.find(f => f.id === data.from)
          const senderName = data.from_nickname || friend?.nickname || friend?.username || data.from || '?'
          const chatName = group ? group.name : senderName
          const avatar = friend?.avatar || group?.avatar

          // Message preview
          let preview: string
          if (data.msg_type && data.msg_type !== 'text') {
            preview = getMessagePreview(data.msg_type, getI18nT())
          } else {
            // For text: show decrypted if available, else ciphertext preview
            const text = msgToAdd.decrypted || data.ciphertext || ''
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

    // Listen for group encryption mode changes
    const unsubEncChange = onWs('group_encryption_changed', (data) => {
      if (data.group_id) {
        // Clear local messages for this group
        useStore.getState().setMessages(data.group_id, [])
        // Clear sender keys for this group
        clearGroupSenderKeys(data.group_id)
        // Refresh groups list to get updated encryption status
        get('/api/groups').then(g => useStore.getState().setGroups(g)).catch(() => {})
      }
    })

    // Listen for sender key distributions
    const unsubSKDist = onWs('sender_key_distribution', async (data) => {
      if (data.group_id && data.from_id && data.encrypted_key && data.header) {
        try {
          const keys = getKeys()
          if (keys) {
            const senderKey = await receiveSenderKey(
              data.encrypted_key,
              data.header,
              keys.ik_priv,
              null
            )
            storeSenderKey(data.group_id, data.from_id, senderKey, data.key_version || 1)
            console.log(`[useSocket] Stored sender key from ${data.from_id} for group ${data.group_id}`)
            // Re-decrypt any 🔒 messages from this sender that we couldn't decrypt before
            await retryDecryptGroupMessages(data.group_id, data.from_id)
          }
        } catch (err) {
          console.error(`[useSocket] Failed to decrypt sender key distribution from ${data.from_id}:`, err)
        }
      }
    })

    // Listen for sender key rotation requests
    const unsubSKRotate = onWs('sender_key_rotate', (data) => {
      if (data.group_id && data.removed_user) {
        // Remove the departed user's sender key from local cache
        removeSenderKey(data.group_id, data.removed_user)
      }
    })

    return () => {
      unsubMsg()
      unsubAck()
      unsubRead()
      unsubOnline()
      unsubOffline()
      unsubEncChange()
      unsubSKDist()
      unsubSKRotate()
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

