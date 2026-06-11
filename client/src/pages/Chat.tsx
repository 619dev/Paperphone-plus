import { useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'
import { useCallContext } from '../contexts/CallContext'
import { useGroupCallContext } from '../contexts/GroupCallContext'
import { get, post, put, uploadFileWithProgress, normalizeFileUrl } from '../api/http'
import { sendWs, onWs } from '../api/socket'
import { getKeys } from '../crypto/keystore'
import { encryptHybrid, decryptHybrid } from '../crypto/ratchet'
import { getMySenderKey, getSenderKey, generateSenderKey, encryptWithSenderKey, decryptWithSenderKey, distributeSenderKey, storeSenderKey, receiveSenderKey } from '../crypto/groupCrypto'
import { Shield } from 'lucide-react'
import { ChevronLeft, Lock, Settings, Timer, ImageIcon, Film, Plus, Mic, Download, Paperclip, AlertTriangle, Clock, Package as PackageIcon, FileText, File as FileIcon, Image as LucideImage, Music, Video, Check, CheckCheck, Phone, VideoIcon, SendHorizonal, Smile, WifiOff, X, ZoomIn, ZoomOut } from 'lucide-react'
import TgsPlayer from '../components/TgsPlayer'

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

// ── Image Viewer Component ──────────────────────────────────────
function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastTap, setLastTap] = useState(0)
  const [initialPinchDist, setInitialPinchDist] = useState(0)
  const [initialPinchScale, setInitialPinchScale] = useState(1)
  const imgRef = useRef<HTMLDivElement>(null)

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setScale(2.5)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      setInitialPinchDist(dist)
      setInitialPinchScale(scale)
    } else if (e.touches.length === 1) {
      // Double tap detection
      const now = Date.now()
      if (now - lastTap < 300) {
        handleDoubleClick()
        setLastTap(0)
        return
      }
      setLastTap(now)

      // Drag start (only when zoomed)
      if (scale > 1) {
        setIsDragging(true)
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        })
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      if (initialPinchDist > 0) {
        const newScale = Math.min(5, Math.max(0.5, initialPinchScale * (dist / initialPinchDist)))
        setScale(newScale)
      }
      e.preventDefault()
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      })
      e.preventDefault()
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setInitialPinchDist(0)
    if (scale <= 0.8) {
      onClose()
    } else if (scale < 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.2 : 0.2
    setScale(prev => Math.min(5, Math.max(0.5, prev + delta)))
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `image_${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // Fallback: open in new tab
      window.open(src, '_blank')
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.92)', display: 'flex',
        flexDirection: 'column', animation: 'fade-in .2s ease',
      }}
      onClick={handleBackdropClick}
    >
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', paddingTop: 'max(12px, env(safe-area-inset-top))',
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18,
          background: 'rgba(255,255,255,0.15)', border: 'none',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><X size={20} /></button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.5))} style={{
            width: 36, height: 36, borderRadius: 18,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><ZoomOut size={18} /></button>
          <button onClick={() => setScale(s => Math.min(5, s + 0.5))} style={{
            width: 36, height: 36, borderRadius: 18,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><ZoomIn size={18} /></button>
        </div>
      </div>

      {/* Image area */}
      <div
        ref={imgRef}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', cursor: scale > 1 ? 'grab' : 'default',
          touchAction: 'none',
        }}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.2s ease',
            userSelect: 'none',
          }}
        />
      </div>

      {/* Bottom bar */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 24,
        padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        flexShrink: 0,
      }}>
        <button onClick={handleDownload} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', color: '#fff',
          cursor: 'pointer', fontSize: 11,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 22,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Download size={20} /></div>
          Save
        </button>
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
  const friends = useStore(s => s.friends)
  const groups = useStore(s => s.groups)
  const wsConnected = useStore(s => s.wsConnected)

  // ── WebRTC Call (global context) ──
  const call = useCallContext()
  const groupCall = useGroupCallContext()

  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sending, setSending] = useState(false)
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
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
  const [recordVoiceMode, setRecordVoiceMode] = useState<'normal'|'slow'|'fast'>('normal')

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
  const audioCtxRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recordVoiceModeRef = useRef<'normal'|'slow'|'fast'>('normal')
  recordVoiceModeRef.current = recordVoiceMode

  const friend = friends.find(f => f.id === id)
  const group = groups.find(g => g.id === id)
  const chatName = isGroup ? (group?.name || id) : (friend?.nickname || id)
  const isOwner = isGroup && group?.owner_id === user?.id
  const currentAutoDelete = isGroup ? (group?.auto_delete ?? 0) : (friend?.auto_delete ?? 0)

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

  // ── Load history + decrypt + merge with cache ──
  useEffect(() => {
    if (!id) return
    const path = isGroup ? `/api/messages/group/${id}?limit=50000` : `/api/messages/private/${id}?limit=50000`

    const loadMessages = async () => {
      // For encrypted groups, fetch sender keys from server BEFORE loading messages
      // This ensures keys distributed while we were offline are available for decryption
      if (isGroup && group?.encrypted) {
        try {
          const keys = getKeys()
          if (keys) {
            const skData = await get(`/api/groups/${id}/sender-keys`)
            if (skData?.keys && Array.isArray(skData.keys)) {
              for (const k of skData.keys) {
                // Only import if we don't already have this sender's key
                if (!getSenderKey(id!, k.from_id)) {
                  try {
                    const senderKey = await receiveSenderKey(
                      k.encrypted_key,
                      k.header,
                      keys.ik_priv,
                      null
                    )
                    storeSenderKey(id!, k.from_id, senderKey, k.key_version || 1)
                  } catch {}
                }
              }
            }
          }
        } catch {}
      }

      const msgs = await get(path)
      if (!Array.isArray(msgs)) return

      // Client-side defense: filter out expired messages based on auto_delete
      const autoDeleteSec = isGroup ? (group?.auto_delete ?? 0) : (friend?.auto_delete ?? 0)
      let filtered = msgs
      if (autoDeleteSec > 0) {
        const cutoff = Date.now() - autoDeleteSec * 1000
        filtered = msgs.filter(m => m.ts > cutoff)
      }

      let serverMessages: any[]
      if (!isGroup) {
        const keys = getKeys()
        serverMessages = await Promise.all(filtered.map(async (msg) => {
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
      } else if (group?.encrypted) {
        // Encrypted group: decrypt with sender keys
        serverMessages = await Promise.all(filtered.map(async (msg) => {
          if (msg.nonce && msg.sender_key_version) {
            try {
              const sk = getSenderKey(id!, msg.from)
              if (sk) {
                const text = await decryptWithSenderKey(msg.ciphertext, msg.nonce, sk.senderKey)
                return { ...msg, decrypted: text }
              }
            } catch {}
            return { ...msg, decrypted: '\ud83d\udd12' }
          }
          return { ...msg, decrypted: msg.ciphertext }
        }))
      } else {
        serverMessages = filtered.map(m => ({ ...m, decrypted: m.ciphertext }))
      }

      // Merge: use server messages as base, append any local-only messages
      // (messages received via WebSocket that aren't in the server response yet)
      const serverIds = new Set(serverMessages.filter(m => m.id).map(m => m.id))
      const localMsgs = useStore.getState().messages[id] || []
      const localOnly = localMsgs.filter(m => m.id && !serverIds.has(m.id))
      const merged = [...serverMessages, ...localOnly].sort((a, b) => (a.ts || 0) - (b.ts || 0))
      setMessages(id, merged)
    }

    loadMessages().catch(() => {})
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

    // Send read receipts for unread incoming private messages
    if (!isGroup && id && user) {
      const unreadIds = messages
        .filter(m => m.from !== user.id && !m.read_at && m.id)
        .map(m => m.id)
      if (unreadIds.length > 0) {
        sendWs({ type: 'msg_read', msg_ids: unreadIds })
      }
    }
  }, [messages.length])

  useEffect(() => {
    const unsub = onWs('typing', (data: any) => {
      if (data.from !== user?.id) {
        setTyping(true)
        if (typingTimer.current) clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setTyping(false), 3000)
      }
    })
    return unsub
  }, [])

  // NOTE: The duplicate onWs('message') handler has been removed.
  // All incoming messages are now handled by the global useSocket.ts handler,
  // which performs decryption and deduplication via addMessage in the store.

  // ── Send message ──
  const sendMessage = async (text?: string, msgType = 'text', _extra: any = {}) => {
    const content = text || input.trim()
    if (msgType === 'text' && !content) return
    if (!id || !user || sending) return
    setSending(true)
    try {
      if (msgType === 'text') setInput('')

      // Prepare pending message metadata for ack handler (real-time display)
      const pendingMsg: any = {
        from: user.id,
        msg_type: msgType,
        decrypted: content,
        ciphertext: content,
      }
      if (isGroup) {
        pendingMsg.group_id = id
      } else {
        pendingMsg.to = id
      }
      ;(window as any).__pendingMsg = pendingMsg

      let sent = false
      if (isGroup) {
        if (group?.encrypted) {
          // Encrypted group: use sender key
          try {
            let sk = getMySenderKey(id!, user.id)
            if (!sk) {
              // Generate and distribute sender key
              const newKey = await generateSenderKey()
              storeSenderKey(id!, user.id, newKey, 1)
              // Distribute to group members
              const groupInfo = groups.find(g => g.id === id)
              if (groupInfo?.members) {
                const keys = getKeys()
                const distributions: any[] = []
                for (const m of groupInfo.members) {
                  if (m.id === user.id) continue
                  // We need member's public key; get from friends or the member data
                  const friendEntry = friends.find(f => f.id === m.id)
                  if (friendEntry?.ik_pub && keys) {
                    try {
                      const dist = await distributeSenderKey(newKey, friendEntry.ik_pub, friendEntry.kem_pub)
                      distributions.push({ to_id: m.id, encrypted_key: dist.encrypted_key, header: dist.header })
                    } catch {}
                  }
                }
                if (distributions.length > 0) {
                  await post(`/api/groups/${id}/sender-keys`, { distributions, key_version: 1 })
                }
              }
              sk = { groupId: id!, userId: user.id, senderKey: newKey, keyVersion: 1 }
            }
            const encrypted = await encryptWithSenderKey(content, sk.senderKey)
            sent = sendWs({ type: 'message', msg_type: msgType, group_id: id, ciphertext: encrypted.ciphertext, nonce: encrypted.nonce, sender_key_version: sk.keyVersion })
          } catch (encErr) {
            console.warn('[Chat] Group encryption failed:', encErr)
            sent = sendWs({ type: 'message', msg_type: msgType, group_id: id, ciphertext: content })
          }
        } else {
          sent = sendWs({ type: 'message', msg_type: msgType, group_id: id, ciphertext: content })
        }
      } else {
        const keys = getKeys()
        const recipientPub = friend?.ik_pub
        const recipientKem = friend?.kem_pub
        if (!recipientPub || !keys) {
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
            sent = sendWs({ type: 'message', msg_type: msgType, to: id, ciphertext: content })
          }
        }
      }

      if (!sent) {
        ;(window as any).__pendingMsg = null
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
  const applyVoiceEffect = (stream: MediaStream): MediaStream => {
    try {
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const destination = audioCtx.createMediaStreamDestination()

      const bufferSize = 4096
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1)
      let outputPhase = 0
      const rates = { slow: 0.8, normal: 1.0, fast: 1.2 }

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        const output = e.outputBuffer.getChannelData(0)
        const rate = rates[recordVoiceModeRef.current]

        for (let i = 0; i < output.length; i++) {
          const readIndex = outputPhase
          const intIndex = Math.floor(readIndex)
          const frac = readIndex - intIndex

          if (intIndex < input.length - 1) {
            output[i] = input[intIndex] * (1 - frac) + input[intIndex + 1] * frac
          } else if (intIndex < input.length) {
            output[i] = input[intIndex]
          } else {
            output[i] = 0
          }
          outputPhase += rate
        }
        outputPhase = outputPhase % input.length
      }

      source.connect(processor)
      processor.connect(destination)

      const processedStream = new MediaStream()
      destination.stream.getAudioTracks().forEach(t => processedStream.addTrack(t))

      return processedStream
    } catch (err) {
      console.warn('[Chat] Voice effect failed:', err)
      return stream
    }
  }

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const processedStream = applyVoiceEffect(stream)
      const rec = new MediaRecorder(processedStream)
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
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    setRecordVoiceMode('normal')
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

  const sendSticker = (sticker: any) => {
    const stickerType = sticker.type || 'static'
    if (stickerType === 'static') {
      // Backward compatible: static stickers send plain URL
      sendMessage(sticker.url, 'sticker', { url: sticker.url })
    } else {
      // Animated/video stickers send JSON with type and file_id for proxy
      const payload = JSON.stringify({
        url: sticker.url,
        stickerType,
        fileId: sticker.file_id || '',
      })
      sendMessage(payload, 'sticker', { url: sticker.url })
    }
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
      const imgUrl = normalizeFileUrl(displayText)
      return <img className="msg-image" src={imgUrl} alt="" style={{ maxWidth: 240, borderRadius: 8, cursor: 'pointer' }} onClick={() => setViewingImage(imgUrl)} />
    }
    if (msg.msg_type === 'sticker') {
      // Try to parse as JSON for animated/video stickers
      let stickerUrl = displayText
      let stickerType = 'static'
      let fileId = ''
      try {
        const parsed = JSON.parse(displayText)
        if (parsed.url) {
          stickerUrl = parsed.url
          stickerType = parsed.stickerType || 'static'
          fileId = parsed.fileId || ''
        }
      } catch {
        // Plain URL = static sticker (backward compatible)
      }

      if (stickerType === 'animated' && fileId) {
        return <TgsPlayer src={`/api/stickers/proxy/${fileId}`} width={160} height={160} alt="sticker" />
      }
      if (stickerType === 'video') {
        return (
          <video
            src={normalizeFileUrl(stickerUrl)}
            autoPlay loop muted playsInline
            style={{ maxWidth: 160, maxHeight: 160, display: 'block', background: 'transparent' }}
          />
        )
      }
      return <img src={normalizeFileUrl(stickerUrl)} alt="sticker" style={{ maxWidth: 160, maxHeight: 160, display: 'block', background: 'transparent' }} loading="lazy" />
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

      {/* Image viewer overlay */}
      {viewingImage && <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}

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

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {(['slow', 'normal', 'fast'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setRecordVoiceMode(mode)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 16,
                    border: 'none',
                    background: recordVoiceMode === mode ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(128,128,128,0.2)',
                    color: recordVoiceMode === mode ? '#fff' : 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: recordVoiceMode === mode ? '0 2px 8px rgba(102,126,234,0.4)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {mode === 'slow' ? '🐢 ' + (t('call.voice_slow') || '0.8x') : mode === 'fast' ? '🐇 ' + (t('call.voice_fast') || '1.2x') : '🔊 ' + (t('call.voice_normal') || '1.0x')}
                </button>
              ))}
            </div>
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
          {isGroup && group?.encrypted && <span style={{ fontSize: 14, opacity: 0.7, color: 'var(--accent)' }} title={t('group.encryption_on')}><Shield size={16} /></span>}
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          {!isGroup && (
            <>
              <button className="icon-btn" title={t('call.voice')}
                onClick={() => call.startCall(id!, false)}
                style={{ fontSize: 18 }}><Phone size={18} /></button>
              <button className="icon-btn" title={t('call.video')}
                onClick={() => call.startCall(id!, true)}
                style={{ fontSize: 18 }}><VideoIcon size={18} /></button>
            </>
          )}
          {isGroup && (
            <>
              <button className="icon-btn" title={t('call.group_voice') || 'Group Voice Call'}
                onClick={() => groupCall.startGroupCall(id!, false, group?.name)}
                style={{ fontSize: 18 }}><Phone size={18} /></button>
              <button className="icon-btn" title={t('call.group_video') || 'Group Video Call'}
                onClick={() => groupCall.startGroupCall(id!, true, group?.name)}
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

      {isGroup && group?.encrypted && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', fontSize: 12,
          color: 'var(--accent)', background: 'rgba(76, 175, 80, 0.08)',
          borderBottom: '1px solid rgba(76, 175, 80, 0.15)',
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}><Shield size={14} /></span>
          <span>{t('group.encrypted_banner')}</span>
        </div>
      )}
      {isGroup && !group?.encrypted && (
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
                <div className="msg-time">
                  {formatTime(msg.ts)}
                  {isMe && !isGroup && (
                    <span style={{ marginLeft: 3, display: 'inline-flex', verticalAlign: 'middle' }}>
                      {msg.read_at
                        ? <CheckCheck size={13} style={{ color: '#3b82f6' }} />
                        : <Check size={13} style={{ opacity: 0.5 }} />}
                    </span>
                  )}
                </div>
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
                    if (stickers.length === 0) return <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>{t('chat.no_stickers')}</div>
                    return stickers.map((sticker: any, i: number) => {
                      const sType = sticker.type || (sticker.is_video ? 'video' : sticker.is_animated ? 'animated' : 'static')
                      return (
                        <div key={sticker.file_id || i} onClick={() => sendSticker(sticker)} title={sticker.emoji || 'sticker'}
                          style={{ width: 72, height: 72, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, transition: 'background .15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          {sType === 'animated' ? (
                            <TgsPlayer src={`/api/stickers/proxy/${sticker.file_id}`} width={64} height={64} alt={sticker.emoji || ''} hoverPlay />
                          ) : sType === 'video' ? (
                            <video src={sticker.url} autoPlay loop muted playsInline
                              style={{ maxWidth: 64, maxHeight: 64, objectFit: 'contain' }}
                              onError={e => { (e.target as HTMLVideoElement).style.display = 'none' }} />
                          ) : (
                            <img src={sticker.url} alt={sticker.emoji || ''} loading="lazy"
                              style={{ maxWidth: 64, maxHeight: 64, objectFit: 'contain' }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          )}
                        </div>
                      )
                    })
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
