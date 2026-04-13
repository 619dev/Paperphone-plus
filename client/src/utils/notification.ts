/**
 * Notification utilities: sounds + browser Notification API
 *
 * Uses Web Audio API to generate tones (no external audio files needed).
 */

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

// ── Message notification sound ──────────────────────────────────
// Short, pleasant two-tone chime

export function playMessageSound() {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()

    const now = ctx.currentTime

    // First tone
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.value = 880 // A5
    gain1.gain.setValueAtTime(0.15, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    osc1.connect(gain1).connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.15)

    // Second tone (higher, slightly delayed)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.value = 1175 // D6
    gain2.gain.setValueAtTime(0.12, now + 0.1)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc2.connect(gain2).connect(ctx.destination)
    osc2.start(now + 0.1)
    osc2.stop(now + 0.3)
  } catch {
    // Audio not available — silently ignore
  }
}

// ── Call ringtone ───────────────────────────────────────────────
// Repeating ring pattern: ring(0.8s) → pause(0.4s) → ring(0.8s) → ...

let ringtoneInterval: ReturnType<typeof setInterval> | null = null
let ringtoneCtx: AudioContext | null = null

function playRingBurst() {
  try {
    if (!ringtoneCtx) ringtoneCtx = new AudioContext()
    const ctx = ringtoneCtx
    if (ctx.state === 'suspended') ctx.resume()

    const now = ctx.currentTime

    // Ring pattern: two alternating frequencies (classic phone ring)
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = i % 2 === 0 ? 440 : 500 // A4 / B4 alternating
      const start = now + i * 0.2
      gain.gain.setValueAtTime(0.2, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.18)
    }
  } catch {
    // ignore
  }
}

export function playCallRingtone() {
  stopRingtone()
  playRingBurst() // play immediately
  ringtoneInterval = setInterval(playRingBurst, 1200) // repeat every 1.2s
}

export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval)
    ringtoneInterval = null
  }
  if (ringtoneCtx) {
    ringtoneCtx.close().catch(() => {})
    ringtoneCtx = null
  }
}

// ── Browser Notification API ────────────────────────────────────

export function showBrowserNotification(title: string, body: string, onClick?: () => void) {
  // Only show if tab is hidden (not focused)
  if (document.visibilityState !== 'hidden') return

  if (!('Notification' in window)) return

  if (Notification.permission === 'granted') {
    const n = new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      tag: 'paperphone-' + Date.now(),
      requireInteraction: false,
    })
    if (onClick) {
      n.onclick = () => {
        window.focus()
        onClick()
        n.close()
      }
    }
    // Auto-close after 5s
    setTimeout(() => n.close(), 5000)
  } else if (Notification.permission === 'default') {
    // Don't request here — let the user enable in settings
  }
}

// ── Helpers ─────────────────────────────────────────────────────

/** Get preview text for notification based on message type */
export function getMessagePreview(msgType: string, t: (key: string) => string): string {
  switch (msgType) {
    case 'image': return t('notification.image') || '[Image]'
    case 'voice': return t('notification.voice') || '[Voice]'
    case 'file': return t('notification.file') || '[File]'
    case 'video': return t('notification.video') || '[Video]'
    case 'sticker': return t('notification.sticker') || '[Sticker]'
    default: return ''
  }
}
