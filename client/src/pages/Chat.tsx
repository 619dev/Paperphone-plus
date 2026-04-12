import { useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'
import { get, post, put, uploadFileWithProgress, normalizeFileUrl } from '../api/http'
import { sendWs, onWs } from '../api/socket'
import { getKeys } from '../crypto/keystore'
import { encryptHybrid, decryptHybrid } from '../crypto/ratchet'
import { ChevronLeft, Lock, Settings, Timer, ImageIcon, Film, Plus, Mic, Download, Paperclip, AlertTriangle, Clock, Package as PackageIcon, FileText, File as FileIcon, Image as LucideImage, Music, Video, Check, Phone, VideoIcon, SendHorizonal, Smile, WifiOff } from 'lucide-react'

// Auto-delete options (seconds)
const AUTO_DELETE_OPTIONS = [
  { value: 0, key: 'auto_delete.off' },
  { value: 86400, key: 'auto_delete.1d' },
  { value: 259200, key: 'auto_delete.3d' },
  { value: 604800, key: 'auto_delete.7d' },
  { value: 2592000, key: 'auto_delete.30d' },
]

// Emoji data
const EMOJI_CATEGORIES = [
  { icon: '😊', label: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫡','🤫','🤔','🫠','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥶','🥵','😱','😨','😰','😥','😢','😭','😤','😠','😡','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'] },
  { icon: '👋', label: 'Gestures', emojis: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','💪','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁️','👅','👄'] },
  { icon: '❤️', label: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫀','💋','💌','💐','🌹','🥀','🌷','🌸','🌺','🌻','🌼','💎','✨','🌟','⭐','🔥','💫','⚡','☀️','🌈'] },
  { icon: '🎉', label: 'Celebrate', emojis: ['🎉','🎊','🎈','🎁','🎀','🎗️','🏆','🏅','🥇','🥈','🥉','⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🎿','🏂','🏋️','🤸','⛹️','🤾','🚴','🏊','🤽','🧗','🏄','🎮','🎯','🎲','🎰','🎵','🎶','🎤','🎸','🎹','🎺','🎻','🥁','📷','🎬','🎨'] },
  { icon: '🐱', label: 'Animals', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦄','🐴','🫏','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪲','🪳','🐢','🐍','🦎','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊'] },
  { icon: '🍔', label: 'Food', emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🌮','🌯','🫔','🥙','🧆','🥗','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🎂','🍰','🍩','🍪','🍫','🍬','🍭','🍮','🍯','🍼','🥤','☕','🍵','🧃','🍶','🍺','🍷','🥂','🍹'] },
  { icon: '🚀', label: 'Travel', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛹','🛼','🚁','🛸','🚀','✈️','🛩️','🛰️','🚢','⛵','🛥️','🚤','⛴️','🏠','🏡','🏢','🏬','🏭','🏗️','🗼','🗽','⛪','🕌','🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🌆','🌇','🌉','🌌','🎠','🎡','🎢','🏖️','🏝️','🏰','🗻','🌋'] },
  { icon: '💡', label: 'Objects', emojis: ['💡','🔦','🕯️','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💾','💿','📀','📷','📹','🎥','📞','☎️','📺','📻','🎙️','⏰','⌚','📡','🔋','🪫','🔌','💰','💸','💳','💎','⚖️','🔧','🪛','🔨','⛏️','🪚','🔩','⚙️','🧲','🔬','🔭','📡','💉','💊','🩹','🩺','🚪','🪞','🛏️','🪑','🚽','🧹','🧺','🧼','📦','📮','📬','📨','📩','📝','📁','📂','📅','📆','📎','📌','📍','✂️','🔒','🔓','🗝️','🔑'] },
]

const RECENT_EMOJI_KEY = 'pp_recent_emoji'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ── Upload progress overlay component ──────────────────────────
function UploadOverlay({ progress, label }: { progress: number; label: string }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fade-in .2s ease',
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 20, padding: '32px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {/* Animated ring */}
        <div style={{ position: 'relative', width: 72, height: 72 }}>
          <svg width={72} height={72} viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={36} cy={36} r={30} fill="none" stroke="var(--border)" strokeWidth={5} />
            <circle cx={36} cy={36} r={30} fill="none" stroke="var(--accent)" strokeWidth={5}
              strokeDasharray={188.5} strokeDashoffset={188.5 * (1 - progress / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset .3s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: 'var(--accent)',
          }}>
            {progress}%
          </div>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'center' }}>
          {label}
        </div>
      </div>
    </div>
  )
}

const EMPTY_MSGS: any[] = []

export default function Chat() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isGroup = searchParams.get('group') === '1'
  const { t } = useI18n()
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const messages = useStore(s => s.messages[id!] ?? EMPTY_MSGS)
  const setMessages = useStore(s => s.setMessages)
  const addMessage = useStore(s => s.addMessage)
  const friends = useStore(s => s.friends)
  const groups = useStore(s => s.groups)
  const wsConnected = useStore(s => s.wsConnected)

  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sending, setSending] = useState(false)
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [showAttachPanel, setShowAttachPanel] = useState(false)
  const [emojiTab, setEmojiTab] = useState<'emoji' | 'sticker'>('emoji')
  const [emojiCat, setEmojiCat] = useState(-1)
  const [stickerPacks, setStickerPacks] = useState<any[]>([])
  const [currentPack, setCurrentPack] = useState(0)
  const [stickerCache, setStickerCache] = useState<Record<string, any[]>>({})
  const [loadingStickers, setLoadingStickers] = useState(false)
  // Upload progress
  const [uploadProgress, setUploadProgress] = useState(-1) // -1 = hidden
  const [uploadLabel, setUploadLabel] = useState('')
  // Voice recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<any>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const recChunksRef = useRef<Blob[]>([])
  const recStartRef = useRef<number>(0)
  const recIntervalRef = useRef<any>(null)

  const friend = friends.find(f => f.id === id)
  const group = groups.find(g => g.id === id)
  const chatName = isGroup ? (group?.name || id) : (friend?.nickname || id)
  const isOwner = isGroup && group?.owner_id === user?.id
  const currentAutoDelete = isGroup ? (group?.auto_delete ?? 604800) : (friend?.auto_delete ?? 604800)

  // ── Recent emoji helpers ──
  const getRecentEmojis = (): string[] => {
    try { return JSON.parse(localStorage.getItem(RECENT_EMOJI_KEY) || '[]') } catch { return [] }
  }
  const addRecentEmoji = (em: string) => {
    let recent = getRecentEmojis().filter(e => e !== em)
    recent.unshift(em)
    if (recent.length > 24) recent = recent.slice(0, 24)
    localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(recent))
  }

  // ── Upload helper with progress ──
  const uploadWithProgress = async (file: File, label: string): Promise<{ url: string }> => {
    setUploadProgress(0)
    setUploadLabel(label)
    try {
      const res = await uploadFileWithProgress(file, (pct) => setUploadProgress(pct))
      setUploadProgress(-1)
      return res
    } catch (err) {
      setUploadProgress(-1)
      throw err
    }
  }

  // ── Load history + decrypt ──
  useEffect(() => {
    if (!id) return
    const path = isGroup ? `/api/messages/group/${id}` : `/api/messages/private/${id}`
    get(path).then(async (msgs: any[]) => {
      if (!Array.isArray(msgs)) return
      if (!isGroup) {
        const keys = getKeys()
        const decrypted = await Promise.all(msgs.map(async (msg) => {
          try {
            const isMe = msg.from === user?.id
            if (isMe && msg.self_ciphertext && msg.self_header) {
              const text = await decryptHybrid(msg.self_header, keys?.ik_priv || '', null, msg.self_ciphertext)
              return { ...msg, decrypted: text }
            } else if (!isMe && msg.ciphertext && msg.header) {
              const text = await decryptHybrid(msg.header, keys?.ik_priv || '', null, msg.ciphertext)
              return { ...msg, decrypted: text }
            }
          } catch {}
          return { ...msg, decrypted: msg.decrypted || undefined }
        }))
        setMessages(id, decrypted)
      } else {
        setMessages(id, msgs.map(m => ({ ...m, decrypted: m.ciphertext })))
      }
    }).catch(() => {})
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

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

  useEffect(() => {
    const unsub = onWs('message', async (data) => {
      const chatId = data.group_id || (data.from === user?.id ? data.to : data.from)
      if (chatId !== id) return
      if (!isGroup && data.ciphertext && data.header) {
        try {
          const keys = getKeys()
          const text = await decryptHybrid(data.header, keys?.ik_priv || '', null, data.ciphertext)
          addMessage(chatId, { ...data, decrypted: text })
        } catch {
          addMessage(chatId, data)
        }
      } else {
        addMessage(chatId, { ...data, decrypted: data.ciphertext })
      }
    })
    return unsub
  }, [id, isGroup])

  // ── Send message ──
  const sendMessage = async (text?: string, msgType = 'text', _extra: any = {}) => {
    const content = text || input.trim()
    if (msgType === 'text' && !content) return
    if (!id || !user || sending) return
    setSending(true)
    try {
      if (msgType === 'text') setInput('')

      let sent = false
      if (isGroup) {
        sent = sendWs({ type: 'message', msg_type: msgType, group_id: id, ciphertext: content })
      } else {
        const keys = getKeys()
        const recipientPub = friend?.ik_pub
        const recipientKem = friend?.kem_pub
        if (!recipientPub || !keys) {
          // No encryption keys available — send unencrypted
          sent = sendWs({ type: 'message', msg_type: msgType, to: id, ciphertext: content })
        } else {
          try {
            const forRecipient = await encryptHybrid(recipientPub, recipientKem, content)
            const forSelf = await encryptHybrid(keys.ik_pub, null, content)
            sent = sendWs({
              type: 'message', msg_type: msgType, to: id,
              ciphertext: forRecipient.ciphertext, header: forRecipient.header,
              self_ciphertext: forSelf.ciphertext, self_header: forSelf.header,
            })
          } catch (encErr) {
            console.warn('[Chat] Encryption failed, sending unencrypted:', encErr)
            // Fallback: send unencrypted so the message still goes through
            sent = sendWs({ type: 'message', msg_type: msgType, to: id, ciphertext: content })
          }
        }
      }

      if (!sent) {
        // Restore input so user doesn't lose their message
        if (msgType === 'text' && content) setInput(content)
        alert(t('chat.ws_disconnected') || 'Connection lost. Please check your network and try again.')
      }
    } catch (err) {
      console.error('[Chat] sendMessage error:', err)
    } finally {
      setSending(false)
    }
  }

  // ── Media upload handlers ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const { url } = await uploadWithProgress(file, t('chat.uploading_image'))
      sendMessage(url, 'image', { url })
    } catch {
      alert(t('chat.upload_failed'))
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setShowAttachPanel(false)
    try {
      const { url } = await uploadWithProgress(file, t('chat.uploading_video'))
      const meta = JSON.stringify({ url, fileName: file.name, fileSize: file.size, fileType: file.type })
      sendMessage(meta, 'video', { url })
    } catch {
      alert(t('chat.upload_failed'))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setShowAttachPanel(false)
    try {
      const { url } = await uploadWithProgress(file, t('chat.uploading_file'))
      const meta = JSON.stringify({ url, fileName: file.name, fileSize: file.size, fileType: file.type })
      sendMessage(meta, 'file', { url, fileName: file.name, fileSize: file.size, fileType: file.type })
    } catch {
      alert(t('chat.upload_failed'))
    }
  }

  // ── Voice recording ──
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      recChunksRef.current = []
      recStartRef.current = Date.now()
      setRecordDuration(0)
      rec.ondataavailable = (e) => recChunksRef.current.push(e.data)
      rec.start()
      mediaRecRef.current = rec
      setIsRecording(true)
      recIntervalRef.current = setInterval(() => {
        setRecordDuration(Math.floor((Date.now() - recStartRef.current) / 1000))
      }, 500)
    } catch {
      alert(t('chat.mic_failed'))
    }
  }

  const stopVoice = async () => {
    const rec = mediaRecRef.current
    if (!rec || rec.state === 'inactive') return
    clearInterval(recIntervalRef.current)
    setIsRecording(false)
    const duration = Math.round((Date.now() - recStartRef.current) / 1000)
    rec.stop()
    rec.onstop = async () => {
      const blob = new Blob(recChunksRef.current, { type: 'audio/webm' })
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
      try {
        const { url } = await uploadWithProgress(file, t('chat.uploading_voice'))
        sendMessage(url, 'voice', { url, duration })
      } catch {
        alert(t('chat.upload_failed'))
      }
    }
    rec.stream.getTracks().forEach(t => t.stop())
  }

  const handleTyping = () => {
    const payload: any = { type: 'typing' }
    if (isGroup) payload.group_id = id
    else payload.to = id
    sendWs(payload)
  }

  const handleAutoDelete = async (seconds: number) => {
    try {
      if (isGroup) {
        await put(`/api/groups/${id}/auto-delete`, { auto_delete: seconds })
      } else {
        await post('/api/friends/auto-delete', { friend_id: id, auto_delete: seconds })
      }
      if (isGroup) {
        const g = await get('/api/groups')
        useStore.getState().setGroups(g)
      } else {
        const f = await get('/api/friends')
        useStore.getState().setFriends(f)
      }
    } catch {}
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const autoDeleteLabel = (seconds: number) => {
    const opt = AUTO_DELETE_OPTIONS.find(o => o.value === seconds)
    return opt ? t(opt.key) : t('auto_delete.off')
  }

  // ── Sticker loading ──
  const loadStickerPacks = useCallback(async () => {
    if (stickerPacks.length > 0) return
    try {
      const data = await get('/api/stickers/packs')
      setStickerPacks(data.packs || [])
    } catch { setStickerPacks([]) }
  }, [stickerPacks.length])

  const loadStickerPack = useCallback(async (packName: string) => {
    if (stickerCache[packName]) return
    setLoadingStickers(true)
    try {
      const data = await get(`/api/stickers/pack/${encodeURIComponent(packName)}`)
      setStickerCache(prev => ({ ...prev, [packName]: data.stickers || [] }))
    } catch {
      setStickerCache(prev => ({ ...prev, [packName]: [] }))
    }
    setLoadingStickers(false)
  }, [stickerCache])

  useEffect(() => {
    if (showEmojiPanel && emojiTab === 'sticker') loadStickerPacks()
  }, [showEmojiPanel, emojiTab])

  useEffect(() => {
    if (stickerPacks.length > 0 && emojiTab === 'sticker') {
      const pack = stickerPacks[currentPack]
      if (pack) loadStickerPack(pack.name)
    }
  }, [stickerPacks, currentPack, emojiTab])

  const sendSticker = (url: string) => {
    sendMessage(url, 'sticker', { url })
    setShowEmojiPanel(false)
  }

  const insertEmoji = (emoji: string) => {
    setInput(prev => prev + emoji)
    addRecentEmoji(emoji)
    setShowEmojiPanel(false)
    inputRef.current?.focus()
  }

  // ── Parse file meta from message text ──
  const parseFileMeta = (text: string) => {
    try {
      const m = JSON.parse(text)
      return m as { url: string; fileName?: string; fileSize?: number; fileType?: string }
    } catch { return null }
  }

  // ── Render message bubble content ──
  const renderBubble = (msg: any, displayText: string, isEncFailed: boolean) => {
    if (isEncFailed) {
      return <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}><Lock size={16} /> {t('chat.decrypt_failed')}</span>
    }
    if (msg.msg_type === 'image') {
      return <img className="msg-image" src={normalizeFileUrl(displayText)} alt="" style={{ maxWidth: 240, borderRadius: 8, cursor: 'pointer' }} />
    }
    if (msg.msg_type === 'sticker') {
      return <img src={normalizeFileUrl(displayText)} alt="sticker" style={{ maxWidth: 160, maxHeight: 160, display: 'block', background: 'transparent' }} loading="lazy" />
    }
    if (msg.msg_type === 'voice') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}><Mic size={20} /></span>
          <audio src={normalizeFileUrl(displayText)} controls style={{ height: 32, maxWidth: 200 }} />
        </div>
      )
    }
    if (msg.msg_type === 'video') {
      const meta = parseFileMeta(displayText)
      const videoUrl = meta?.url || displayText
      return <video src={normalizeFileUrl(videoUrl)} controls style={{ maxWidth: 260, borderRadius: 8 }} />
    }
    if (msg.msg_type === 'file') {
      const meta = parseFileMeta(displayText)
      if (meta) {
        const icon = getFileIcon(meta.fileType || '')
        return (
          <a href={normalizeFileUrl(meta.url)} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit',
              padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.05)', minWidth: 180,
            }}>
            <span style={{ fontSize: 28 }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {meta.fileName || t('chat.file')}
              </div>
              {meta.fileSize && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatFileSize(meta.fileSize)}</div>}
            </div>
            <span style={{ fontSize: 18, color: 'var(--accent)' }}><Download size={18} /></span>
          </a>
        )
      }
      return <a href={normalizeFileUrl(displayText)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}><Paperclip size={14} /> {t('chat.file')}</a>
    }
    return displayText
  }

  // ── Settings panel ──
  if (showSettings) {
    const canEdit = isGroup ? isOwner : true
    return (
      <div className="page" id="chat-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => setShowSettings(false)}><ChevronLeft size={20} /></button>
          <h1>{t('chat.settings')}</h1>
        </div>
        <div className="page-body">
          {!isGroup && (
            <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', margin: '8px 16px', borderRadius: 12 }}>
              <span style={{ fontSize: 24 }}><Lock size={16} /></span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t('chat.e2e_enabled')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('chat.e2e_desc')}</div>
              </div>
            </div>
          )}
          <div className="section-title" style={{ padding: '16px 16px 8px' }}><Timer size={14} /> {t('auto_delete.title')}</div>
          <div style={{ padding: '0 16px 8px', fontSize: 12, color: 'var(--text-muted)' }}>
            {isGroup ? t('auto_delete.group_desc') : t('auto_delete.private_desc')}
          </div>
          {!canEdit && (
            <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('auto_delete.owner_only')}</div>
          )}
          {AUTO_DELETE_OPTIONS.map(opt => {
            const selected = currentAutoDelete === opt.value
            return (
              <div key={opt.value} className="settings-item"
                onClick={() => canEdit && handleAutoDelete(opt.value)}
                style={{ cursor: canEdit ? 'pointer' : 'default', opacity: canEdit ? 1 : 0.5, background: selected ? 'var(--bg-card)' : undefined }}>
                <span className="label">{t(opt.key)}</span>
                {selected && <span style={{ color: 'var(--accent)', fontWeight: 600 }}><Check size={16} /></span>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="page" id="chat-page" style={{ position: 'relative' }}>
      {/* Upload progress overlay */}
      {uploadProgress >= 0 && <UploadOverlay progress={uploadProgress} label={uploadLabel} />}

      {/* Voice recording overlay */}
      {isRecording && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fade-in .2s ease',
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 20, padding: '32px 48px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff4444, #ff6666)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse-ring 1.5s infinite',
            }}>
              <span style={{ fontSize: 28 }}><Mic size={28} /></span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>
              {Math.floor(recordDuration / 60).toString().padStart(2, '0')}:{(recordDuration % 60).toString().padStart(2, '0')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('chat.recording')}</div>
            <button onClick={stopVoice} style={{
              marginTop: 8, padding: '10px 36px', borderRadius: 12, border: 'none',
              background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>{t('chat.stop_recording')}</button>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
      <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoUpload} />
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />

      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          onClick={() => isGroup ? navigate(`/group/${id}`) : navigate(`/user/${id}`)}>
          {chatName}
          {!isGroup && <span style={{ fontSize: 14, opacity: 0.7 }} title={t('chat.e2e_enabled')}><Lock size={16} /></span>}
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          {!isGroup && (
            <>
              <button className="icon-btn" title={t('call.voice')}
                onClick={() => alert(t('call.outgoing'))}
                style={{ fontSize: 18 }}><Phone size={18} /></button>
              <button className="icon-btn" title={t('call.video')}
                onClick={() => alert(t('call.outgoing'))}
                style={{ fontSize: 18 }}><VideoIcon size={18} /></button>
            </>
          )}
          <button className="icon-btn" onClick={() => setShowSettings(true)} style={{ fontSize: 18 }} title={t('chat.settings')}><Settings size={18} /></button>
        </div>
      </div>

      {!wsConnected && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px', fontSize: 12, color: '#fff', background: '#ef4444', animation: 'fade-in .3s ease' }}>
          <WifiOff size={14} /> {t('chat.ws_disconnected') || 'Connection lost, reconnecting...'}
        </div>
      )}

      {currentAutoDelete > 0 && (
        <div style={{ textAlign: 'center', padding: '4px 12px', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <Timer size={14} /> {t('auto_delete.active_indicator')} {autoDeleteLabel(currentAutoDelete)}
        </div>
      )}

      {isGroup && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', fontSize: 12,
          color: '#b8860b', background: 'rgba(255, 193, 7, 0.1)',
          borderBottom: '1px solid rgba(255, 193, 7, 0.15)',
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}><AlertTriangle size={14} /></span>
          <span>{t('chat.group_unencrypted_warning')}</span>
        </div>
      )}

      <div className="chat-messages">
        {messages.map((msg, i) => {
          const isMe = msg.from === user?.id
          const displayText = msg.decrypted || msg.ciphertext
          const isEncFailed = !isGroup && !msg.decrypted && msg.header
          const isSticker = msg.msg_type === 'sticker'
          return (
            <div key={msg.id || i} className={`msg-row ${isMe ? 'outgoing' : ''}`}>
              {!isMe && isGroup && (
                <div className="avatar avatar-sm">
                  {msg.from_avatar ? <img src={msg.from_avatar} alt="" /> : (msg.from_nickname?.[0] || '?')}
                </div>
              )}
              <div>
                {!isMe && isGroup && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{msg.from_nickname || msg.from}</div>
                )}
                <div className="msg-bubble" style={isSticker ? { background: 'transparent', boxShadow: 'none', padding: 0 } : undefined}>
                  {renderBubble(msg, displayText, !!isEncFailed)}
                </div>
                <div className="msg-time">{formatTime(msg.ts)}</div>
              </div>
            </div>
          )
        })}

        {typing && (
          <div className="msg-row" style={{ opacity: 0.6 }}>
            <div className="msg-bubble" style={{ fontStyle: 'italic', fontSize: 13 }}>{t('chat.typing')}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ═══ Emoji / Sticker Panel ═══ */}
      {showEmojiPanel && (
        <div style={{
          position: 'absolute', bottom: 56, left: 0, right: 0,
          background: 'var(--bg-primary)', borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', height: 280, zIndex: 100,
          animation: 'slide-up .2s ease',
        }}>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {emojiTab === 'emoji' ? (
              <>
                <div style={{ display: 'flex', gap: 2, padding: '6px 8px', overflowX: 'auto', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                  <button onClick={() => setEmojiCat(-1)} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: emojiCat === -1 ? 'var(--accent)' : 'transparent', cursor: 'pointer', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: emojiCat === -1 ? '#fff' : 'var(--text-secondary)' }}><Clock size={16} /></button>
                  {EMOJI_CATEGORIES.map((cat, i) => (
                    <button key={i} onClick={() => setEmojiCat(i)} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: emojiCat === i ? 'var(--accent)' : 'transparent', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>{cat.icon}</button>
                  ))}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: 2 }}>
                  {emojiCat === -1 ? (
                    getRecentEmojis().length === 0 ? (
                      <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', padding: 32, fontSize: 13 }}>{t('chat.no_recent_emoji')}</div>
                    ) : (
                      getRecentEmojis().map((em, i) => (
                        <button key={i} onClick={() => insertEmoji(em)} style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', fontSize: 22, borderRadius: 6 }}>{em}</button>
                      ))
                    )
                  ) : (
                    EMOJI_CATEGORIES[emojiCat]?.emojis.map((em, i) => (
                      <button key={i} onClick={() => insertEmoji(em)} style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', fontSize: 22, borderRadius: 6 }}>{em}</button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 4, padding: '6px 8px', overflowX: 'auto', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                  {stickerPacks.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 4 }}>{t('chat.loading_stickers')}</div>}
                  {stickerPacks.map((pack, i) => (
                    <button key={pack.name} onClick={() => setCurrentPack(i)} style={{
                      padding: '4px 10px', border: 'none', borderRadius: 12,
                      background: currentPack === i ? 'var(--accent)' : 'var(--bg-card)',
                      color: currentPack === i ? '#fff' : 'var(--text-primary)',
                      cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0,
                      fontWeight: currentPack === i ? 600 : 400,
                    }}>{pack.label}</button>
                  ))}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: 4, justifyContent: 'center' }}>
                  {loadingStickers ? (
                    <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', padding: 32, fontSize: 13 }}>{t('common.loading')}</div>
                  ) : !stickerPacks[currentPack] ? (
                    <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>{t('chat.no_stickers')}</div>
                  ) : (() => {
                    const packName = stickerPacks[currentPack]?.name
                    const stickers = stickerCache[packName] || []
                    const staticStickers = stickers.filter((s: any) => !s.is_animated && !s.is_video)
                    if (staticStickers.length === 0) return <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>{t('chat.no_stickers')}</div>
                    return staticStickers.map((sticker: any, i: number) => (
                      <div key={sticker.file_id || i} onClick={() => sendSticker(sticker.url)} title={sticker.emoji || 'sticker'}
                        style={{ width: 72, height: 72, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, transition: 'background .15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <img src={sticker.url} alt={sticker.emoji || ''} loading="lazy"
                          style={{ maxWidth: 64, maxHeight: 64, objectFit: 'contain' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                    ))
                  })()}
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <button onClick={() => setEmojiTab('emoji')} style={{
              flex: 1, padding: '10px 0', border: 'none',
              background: emojiTab === 'emoji' ? 'var(--bg-primary)' : 'transparent',
              cursor: 'pointer', fontSize: 13, fontWeight: emojiTab === 'emoji' ? 600 : 400,
              color: emojiTab === 'emoji' ? 'var(--accent)' : 'var(--text-primary)',
              borderBottom: emojiTab === 'emoji' ? '2px solid var(--accent)' : '2px solid transparent',
            }}><Smile size={14} /> Emoji</button>
            <button onClick={() => setEmojiTab('sticker')} style={{
              flex: 1, padding: '10px 0', border: 'none',
              background: emojiTab === 'sticker' ? 'var(--bg-primary)' : 'transparent',
              cursor: 'pointer', fontSize: 13, fontWeight: emojiTab === 'sticker' ? 600 : 400,
              color: emojiTab === 'sticker' ? 'var(--accent)' : 'var(--text-primary)',
              borderBottom: emojiTab === 'sticker' ? '2px solid var(--accent)' : '2px solid transparent',
            }}>Stickers</button>
          </div>
        </div>
      )}

      {/* ═══ Attachment Panel ═══ */}
      {showAttachPanel && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowAttachPanel(false)} />
          <div style={{
            position: 'absolute', bottom: 56, left: 0, right: 0,
            background: 'var(--bg-primary)', borderTop: '1px solid var(--border)',
            padding: 16, zIndex: 100, animation: 'slide-up .2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: 12 }}>
              {/* Video */}
              <button onClick={() => { setShowAttachPanel(false); videoInputRef.current?.click() }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', padding: 8 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 24, color: '#fff' }}><Film size={24} /></span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{t('chat.attach_video')}</span>
              </button>
              {/* File */}
              <button onClick={() => { setShowAttachPanel(false); fileInputRef.current?.click() }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', padding: 8 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #11998e, #38ef7d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 24, color: '#fff' }}><FileIcon size={24} /></span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{t('chat.attach_file')}</span>
              </button>
              {/* Voice */}
              <button onClick={() => { setShowAttachPanel(false); startVoice() }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', padding: 8 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #fc5c7d, #6a82fb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 24, color: '#fff' }}><Mic size={24} /></span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{t('chat.attach_voice')}</span>
              </button>
            </div>
            <button onClick={() => setShowAttachPanel(false)} style={{
              display: 'block', width: '100%', marginTop: 12, padding: '10px 0',
              border: 'none', borderRadius: 10, background: 'var(--bg-card)',
              color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
            }}>{t('common.cancel')}</button>
          </div>
        </>
      )}

      {/* ═══ Input Bar ═══ */}
      <div className="chat-input-bar">
        <button className="icon-btn" title="Emoji"
          onClick={() => { setShowEmojiPanel(!showEmojiPanel); setShowAttachPanel(false) }}
          style={{ color: showEmojiPanel ? 'var(--accent)' : undefined }}><Smile size={20} /></button>
        <textarea ref={inputRef} id="chat-input" rows={1}
          placeholder={t('chat.placeholder')} value={input}
          onChange={e => { setInput(e.target.value); handleTyping() }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          onFocus={() => { setShowEmojiPanel(false); setShowAttachPanel(false) }}
        />
        {/* Image quick button */}
        <button className="icon-btn" title={t('chat.attach_image')}
          onClick={() => imageInputRef.current?.click()}
          style={{ fontSize: 18 }}><ImageIcon size={16} /></button>
        {/* More attachments */}
        <button className="icon-btn" title={t('chat.attach_more')}
          onClick={() => { setShowAttachPanel(!showAttachPanel); setShowEmojiPanel(false) }}
          style={{ fontSize: 18, color: showAttachPanel ? 'var(--accent)' : undefined }}><Plus size={16} /></button>
        {/* Voice recording */}
        <button className="icon-btn" title={t('chat.attach_voice')}
          onClick={() => isRecording ? stopVoice() : startVoice()}
          style={{ fontSize: 18, color: isRecording ? '#ef4444' : undefined }}><Mic size={18} /></button>
        <button className="send-btn" id="send-btn" onClick={() => sendMessage()} disabled={sending}><SendHorizonal size={18} /></button>
      </div>
    </div>
  )
}

function getFileIcon(fileType: string): ReactNode {
  if (fileType.startsWith('image/')) return <LucideImage size={22} />
  if (fileType.startsWith('video/')) return <Video size={22} />
  if (fileType.startsWith('audio/')) return <Music size={22} />
  if (fileType.includes('pdf')) return <FileText size={22} />
  if (fileType.includes('word') || fileType.includes('document')) return <FileText size={22} />
  if (fileType.includes('sheet') || fileType.includes('excel')) return <FileText size={22} />
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return <FileText size={22} />
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z') || fileType.includes('tar')) return <PackageIcon size={22} />
  if (fileType.includes('text')) return <FileText size={22} />
  return <FileIcon size={22} />
}
