import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'
import { get } from '../api/http'
import { sendWs, onWs } from '../api/socket'

export default function Chat() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isGroup = searchParams.get('group') === '1'
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const messages = useStore(s => s.messages[id!] || [])
  const setMessages = useStore(s => s.setMessages)
  const addMessage = useStore(s => s.addMessage)
  const friends = useStore(s => s.friends)
  const groups = useStore(s => s.groups)

  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<any>(null)

  const chatName = isGroup
    ? groups.find(g => g.id === id)?.name || id
    : friends.find(f => f.id === id)?.nickname || id

  // Load history
  useEffect(() => {
    if (!id) return
    const path = isGroup ? `/api/messages/group/${id}` : `/api/messages/private/${id}`
    get(path).then(msgs => {
      if (Array.isArray(msgs)) setMessages(id, msgs)
    }).catch(() => {})
  }, [id])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Listen for typing indicator
  useEffect(() => {
    const unsub = onWs('typing', (data) => {
      if (data.from !== user?.id) {
        setTyping(true)
        if (typingTimer.current) clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setTyping(false), 3000)
      }
    })
    return unsub
  }, [])

  const sendMessage = () => {
    if (!input.trim() || !id || !user) return

    const payload: any = {
      type: 'message',
      msg_type: 'text',
      ciphertext: input.trim(), // For group messages, plaintext. For private, would be encrypted.
    }

    if (isGroup) {
      payload.group_id = id
    } else {
      payload.to = id
    }

    sendWs(payload)
    setInput('')
  }

  const handleTyping = () => {
    const payload: any = { type: 'typing' }
    if (isGroup) payload.group_id = id
    else payload.to = id
    sendWs(payload)
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="page" id="chat-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>{chatName}</h1>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => {
          const isMe = msg.from === user?.id
          return (
            <div key={msg.id || i} className={`msg-row ${isMe ? 'outgoing' : ''}`}>
              {!isMe && isGroup && (
                <div className="avatar avatar-sm">
                  {msg.from_avatar ? <img src={msg.from_avatar} alt="" /> : (msg.from_nickname?.[0] || '?')}
                </div>
              )}
              <div>
                {!isMe && isGroup && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                    {msg.from_nickname || msg.from}
                  </div>
                )}
                <div className="msg-bubble">
                  {msg.msg_type === 'image' ? (
                    <img className="msg-image" src={msg.decrypted || msg.ciphertext} alt="" />
                  ) : (
                    msg.decrypted || msg.ciphertext
                  )}
                </div>
                <div className="msg-time">{formatTime(msg.ts)}</div>
              </div>
            </div>
          )
        })}

        {typing && (
          <div className="msg-row" style={{ opacity: 0.6 }}>
            <div className="msg-bubble" style={{ fontStyle: 'italic', fontSize: 13 }}>
              {t('chat.typing')}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <button className="icon-btn" title="Emoji">😊</button>
        <textarea
          id="chat-input"
          rows={1}
          placeholder={t('chat.placeholder')}
          value={input}
          onChange={e => { setInput(e.target.value); handleTyping() }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
        />
        <button className="icon-btn" title="File">📎</button>
        <button className="send-btn" id="send-btn" onClick={sendMessage}>➤</button>
      </div>
    </div>
  )
}
