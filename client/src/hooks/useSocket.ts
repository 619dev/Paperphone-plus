import { useEffect } from 'react'
import { useStore } from '../store'
import { connectWs, disconnectWs, onWs } from '../api/socket'

export function useSocket() {
  const token = useStore(s => s.token)
  const addMessage = useStore(s => s.addMessage)
  const incrementUnread = useStore(s => s.incrementUnread)

  useEffect(() => {
    if (!token) return

    connectWs()

    // Listen for messages and route to store
    const unsub = onWs('message', (data) => {
      const chatId = data.group_id || (data.from === useStore.getState().user?.id ? data.to : data.from)
      if (chatId) {
        useStore.getState().addMessage(chatId, data)
        // If not on that chat page, increment unread
        if (!window.location.pathname.includes(chatId)) {
          useStore.getState().incrementUnread(chatId)
        }
      }
    })

    return () => {
      unsub()
      disconnectWs()
    }
  }, [token])
}
