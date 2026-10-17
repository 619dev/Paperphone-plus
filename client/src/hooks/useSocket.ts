import { securityText, securityErrorText } from '../i18n/security'
import { t as translate, type LangCode } from '../i18n'
import { useEffect } from 'react'
import { useStore } from '../store'
import { connectWs, disconnectWs, forceReconnect, onWs } from '../api/socket'
import { syncMessages } from '../api/sync'
import { endSession } from '../utils/session'
import { useNotificationStore } from '../store/notificationStore'
import { playMessageSound, showBrowserNotification, getMessagePreview } from '../utils/notification'
import { getKeys } from '../crypto/keystore'
import { decryptSignedMessage } from '../crypto/authenticatedMessaging'
import { clearGroupSenderKeys, retireOwnSenderKeys } from '../crypto/groupCrypto'
import { decryptGroupMessage, fetchGroupKeys, importGroupDistribution, ensureGroupSenderKey, MissingGroupKey } from '../crypto/signedGroups'
import { get } from '../api/http'
import { decodeMessagePayload } from '../utils/messagePayload'
import { unprotectPresentationText } from '../crypto/presentationCrypto'

/** Retry cached ciphertexts after historical epoch keys or identity pins arrive. */
async function retryDecryptGroupMessages(groupId: string) {
  const owner = useStore.getState().user?.id
  const messages = useStore.getState().messages[groupId] || []
  for (const message of messages) {
    if ((message.signature_valid && !message.decryption_pending) || !message.header?.startsWith('ppg1.')) continue
    try {
      const decoded = await decryptGroupMessage(message, true)
      if (useStore.getState().user?.id !== owner) return
      useStore.getState().updateMessage(groupId, message.id, decoded)
    }
    catch { /* Keep ciphertext for the next key/identity recovery. */ }
  }
}
const recoveryJobs = new Map<string, Promise<void>>()
function recoverGroups(): Promise<void> {
  const owner = useStore.getState().user?.id
  if (!owner) return Promise.resolve()
  const running = recoveryJobs.get(owner)
  if (running) return running
  const job = (async () => {
    const groups = await get('/api/groups')
    if (useStore.getState().user?.id !== owner) return
    for (const previous of useStore.getState().groups) {
      if (!groups.some((group: any) => group.id === previous.id)) clearGroupSenderKeys(previous.id)
    }
    useStore.getState().setGroups(groups)
    for (const group of groups) {
      if (useStore.getState().user?.id !== owner) return
      await fetchGroupKeys(group.id).catch(() => {})
      await retryDecryptGroupMessages(group.id)
      // Offline members may have missed the rotation event: always read epoch.
      await ensureGroupSenderKey(group.id).catch(error => console.warn('[Group] Key update pending:', error))
    }
  })().finally(() => { recoveryJobs.delete(owner) })
  recoveryJobs.set(owner, job)
  return job
}

export function useSocket() {
  const token = useStore(s => s.token)

  useEffect(() => {
    if (!token) return

    connectWs()

    const recover = () => forceReconnect()
    const onVisible = () => { if (document.visibilityState === 'visible') recover() }
    window.addEventListener('online', recover)
    window.addEventListener('pageshow', recover)
    window.addEventListener('paperphone:network-changed', recover)
    document.addEventListener('visibilitychange', onVisible)
    let removeNativeListener: (() => void) | undefined
    import('@capacitor/app').then(({ App }) => App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) recover()
    })).then(handle => { removeNativeListener = () => void handle.remove() }).catch(() => {})

    // Network loss, failed auth, and address changes only reconnect. The local
    // login ends solely when the server sends an explicit termination event.
    const logoutSignals = ['logout', 'force_logout', 'session_revoked', 'session_terminated']
    const unsubLogoutSignals = logoutSignals.map(type => onWs(type, () => endSession(type)))
    const unsubAuthOk = onWs('auth_ok', async () => {
      await recoverGroups().catch(error => console.warn('[Group] Recovery failed:', error))
      await syncMessages().catch(error => console.warn('[Sync] catch-up failed:', error))
    })
    const onIdentityChanged = () => { void recoverGroups().catch(() => {}) }
    window.addEventListener('paperphone:identity-changed', onIdentityChanged)

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
                const decrypted = await decryptSignedMessage(data)
                const text = await unprotectPresentationText(decrypted)
                msgToAdd = { ...data, decrypted: text }
              } else if (!isMe) {
                const decrypted = await decryptSignedMessage(data)
                const text = await unprotectPresentationText(decrypted)
                msgToAdd = { ...data, decrypted: text }
              }
            }
          } catch {
            msgToAdd = { ...data, decrypted: securityText('verify.signature_failed') }
          }
        } else if (data.group_id) {
          try { msgToAdd = { ...data, ...await decryptGroupMessage(data, !!data.offline) } }
          catch (error) { msgToAdd = { ...data, signature_valid: false, decrypted: error instanceof MissingGroupKey ? '🔒' : `⚠️ ${securityErrorText(error)}` } }
        }

        if (useStore.getState().user?.id !== myId) return
        const isNewMessage = useStore.getState().addMessage(chatId, msgToAdd)

        // If not on that chat page AND message is not from me, trigger notification
        const isFromMe = data.from === myId
        const isOnChat = window.location.pathname.includes(chatId)

        if (isNewMessage && !isFromMe && !isOnChat) {
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
            const text = decodeMessagePayload(msgToAdd.decrypted || data.ciphertext || '').body
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
        } else if (isNewMessage && !isFromMe && isOnChat) {
          // On the chat page but still play a subtle sound for new messages
          // (skip if it's a self message)
        }
      }
    })

    // Listen for ack: add sent message to local store for real-time display
    const unsubAck = onWs('ack', (data) => {
      const pending = (window as any).__pendingMsg
      if (pending && data.msg_id && (!data.client_msg_id || pending.client_msg_id === data.client_msg_id)) {
        const chatId = pending.group_id || pending.to
        if (chatId) {
          // Build the message to add. For encrypted group messages, pendingMsg
          // now carries encryption metadata (ciphertext, nonce, sender_key_version)
          // set during the encryption step in Chat.tsx.
          const msgToStore: any = {
            ...pending,
            id: data.msg_id,
            ts: data.ts || Date.now(),
          }
          useStore.getState().updateMessage(chatId, pending.id, { ...msgToStore, delivery_status: 'sent' })
        }
        ;(window as any).__pendingMsg = null
      }
      if (data.client_msg_id && data.msg_id) {
        const state = useStore.getState()
        for (const [chatId, messages] of Object.entries(state.messages)) {
          const optimistic = messages.find(m => m.client_msg_id === data.client_msg_id)
          if (optimistic) state.updateMessage(chatId, optimistic.id, {
            id: data.msg_id, server_seq: data.server_seq, ts: data.ts || optimistic.ts,
            delivery_status: 'sent',
          })
        }
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

    const unsubSKDist = onWs('sender_key_distribution', async data => {
      try {
        await importGroupDistribution(data.group_id, data)
        await retryDecryptGroupMessages(data.group_id)
      } catch (error) { console.warn('[Group] Rejected sender key:', error) }
    })
    const unsubSKRotate = onWs('sender_key_rotate', async data => {
      if (!data.group_id) return
      const myId = useStore.getState().user?.id
      if (myId) retireOwnSenderKeys(data.group_id, myId)
      await ensureGroupSenderKey(data.group_id).catch(error => console.warn('[Group] Rotation pending; sending blocked:', error))
      // Run outside this sequenced event handler: sync itself dispatches queued events.
      void syncMessages().catch(error => console.warn('[Group] Rotation catch-up failed:', error))
    })
    const unsubSKInvalid = onWs('sender_key_invalidated', async data => {
      const myId = useStore.getState().user?.id
      if (myId && data.group_id) retireOwnSenderKeys(data.group_id, myId)
      await recoverGroups().catch(() => {})
    })
    const unsubAdded = onWs('group_member_added', () => recoverGroups().catch(() => {}))
    const unsubRemoved = onWs('group_removed', data => {
      clearGroupSenderKeys(data.group_id)
      useStore.getState().setGroups(useStore.getState().groups.filter(group => group.id !== data.group_id))
      window.dispatchEvent(new CustomEvent('paperphone:group-removed', { detail: data.group_id }))
    })
    const unsubFailed = onWs('message_failed', data => {
      const messages = useStore.getState().messages[data.group_id] || []
      for (const message of messages) if (message.client_msg_id === data.client_msg_id) {
        useStore.getState().updateMessage(data.group_id, message.id, { delivery_status: 'failed', signature_valid: false, decrypted: securityText(data.code === 'not_group_member' ? 'grouptrust.not_member' : data.code === 'group_signature_required' ? 'grouptrust.signature_required' : data.code === 'client_message_conflict' ? 'grouptrust.message_conflict' : 'grouptrust.send_failed') })
      }
      const myId = useStore.getState().user?.id
      if (myId && data.group_id) retireOwnSenderKeys(data.group_id, myId)
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
      unsubSKInvalid()
      unsubRemoved()
      unsubAdded()
      unsubFailed()
      window.removeEventListener('paperphone:identity-changed', onIdentityChanged)
      unsubLogoutSignals.forEach(unsubscribe => unsubscribe())
      unsubAuthOk()
      window.removeEventListener('online', recover)
      window.removeEventListener('pageshow', recover)
      window.removeEventListener('paperphone:network-changed', recover)
      document.removeEventListener('visibilitychange', onVisible)
      removeNativeListener?.()
      disconnectWs()
    }
  }, [token])
}

/**
 * Helper to get the i18n translation function outside of React components.
 * Falls back to English defaults.
 */
function getI18nT(): (key: string) => string {
  return (key: string) => translate(key, useStore.getState().lang as LangCode)
}
