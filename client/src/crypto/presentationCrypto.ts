import { deleteBrowserSecret, getBrowserSecret } from './browserSecretStore'
import { decodePresentationBytes, encodePresentationBytes, type PresentationCodecId } from './presentationCodec'

const SETTINGS_KEY = 'pp_presentation_crypto_v1'
const LEGACY_SECRET_NAME = 'presentation-password-v1'
const PREFIX = 'ppx1|'
const PRIVATE_PREFIX = '§'
const CODEC_MARKERS: Record<PresentationCodecId, string> = {
  buddha: '佛', chinese: '文', yijing: '☷', hangul: '한',
  egyptian: '𓀀', cuneiform: '𒀀', values: '和', alphanumeric: 'A',
}
const AAD = new TextEncoder().encode('PaperPhonePlus-presentation-v1')
const VERIFY_TEXT = 'PaperPhonePlus-presentation-password-check-v1'
const iterations = 210_000
let password: string | null = null
let backgroundAt: number | null = null
let lockTimer: ReturnType<typeof setTimeout> | null = null
const keyCache = new Map<string, Promise<CryptoKey>>()
const presentationByPlaintext = new Map<string, string>()

export interface PresentationSettings {
  enabled: boolean
  codec: PresentationCodecId
  salt?: string
  verifierIv?: string
  verifier?: string
  lockMinutes: 5 | 15 | 30 | 60
}

export function getPresentationSettings(): PresentationSettings {
  const fallback: PresentationSettings = { enabled: false, codec: 'buddha', lockMinutes: 5 }
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') || {}) } }
  catch { return fallback }
}

function saveSettings(settings: PresentationSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  window.dispatchEvent(new Event('paperphone:presentation-state-changed'))
}

export function updatePresentationSettings(patch: Partial<PresentationSettings>): void {
  saveSettings({ ...getPresentationSettings(), ...patch })
}

const account = () => { try { return JSON.parse(localStorage.getItem('user') || 'null')?.id || null } catch { return null } }
const b64 = (data: Uint8Array) => btoa(String.fromCharCode(...data))
const unb64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0))

async function deriveKey(pass: string, salt: Uint8Array): Promise<CryptoKey> {
  const cacheId = `${pass}:${b64(salt)}`
  let derived = keyCache.get(cacheId)
  if (!derived) {
    derived = crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey'])
      .then(material => crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']))
    keyCache.set(cacheId, derived)
  }
  return derived
}

async function makeVerifier(pass: string, salt: Uint8Array): Promise<{ verifierIv: string; verifier: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(pass, salt)
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, new TextEncoder().encode(VERIFY_TEXT)))
  return { verifierIv: b64(iv), verifier: b64(encrypted) }
}

export async function hydratePresentationCrypto(accountId: string): Promise<void> {
  password = null
  keyCache.clear()
  // One-time migration: convert the previously persisted password into a verifier,
  // then remove it. The app remains locked after migration.
  const legacy = await getBrowserSecret(accountId, LEGACY_SECRET_NAME)
  const settings = getPresentationSettings()
  if (legacy && settings.enabled && settings.salt && !settings.verifier) {
    saveSettings({ ...settings, ...(await makeVerifier(legacy, unb64(settings.salt))) })
  }
  await deleteBrowserSecret(accountId, LEGACY_SECRET_NAME).catch(() => {})
}

export function isPresentationUnlocked(): boolean { return password !== null }
export function presentationCiphertextForPlaintext(plaintext?: string): string | undefined {
  return plaintext ? presentationByPlaintext.get(plaintext) : undefined
}

export async function enablePresentationCrypto(codec: PresentationCodecId, newPassword: string): Promise<void> {
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  keyCache.clear()
  const verifier = await makeVerifier(newPassword, salt)
  password = newPassword
  saveSettings({ enabled: true, codec, salt: b64(salt), lockMinutes: getPresentationSettings().lockMinutes, ...verifier })
}

export async function unlockPresentationCrypto(candidate: string): Promise<boolean> {
  const settings = getPresentationSettings()
  if (!settings.enabled || !settings.salt || !settings.verifier || !settings.verifierIv) return false
  keyCache.clear()
  try {
    const key = await deriveKey(candidate, unb64(settings.salt))
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(settings.verifierIv), additionalData: AAD }, key, unb64(settings.verifier))
    if (new TextDecoder().decode(plain) !== VERIFY_TEXT) return false
    password = candidate
    window.dispatchEvent(new Event('paperphone:presentation-state-changed'))
    return true
  } catch {
    keyCache.clear()
    password = null
    return false
  }
}

export async function disablePresentationCrypto(): Promise<void> {
  const id = account()
  if (id) await deleteBrowserSecret(id, LEGACY_SECRET_NAME).catch(() => {})
  lockPresentationCrypto()
  const settings = getPresentationSettings()
  saveSettings({ enabled: false, codec: settings.codec, lockMinutes: settings.lockMinutes })
}

export function lockPresentationCrypto(): void {
  password = null
  keyCache.clear()
  if (lockTimer) clearTimeout(lockTimer)
  lockTimer = null
  window.dispatchEvent(new Event('paperphone:presentation-state-changed'))
}

export function handlePresentationAppState(active: boolean): void {
  if (active) {
    if (backgroundAt && Date.now() - backgroundAt >= getPresentationSettings().lockMinutes * 60_000) lockPresentationCrypto()
    backgroundAt = null
    if (lockTimer) clearTimeout(lockTimer)
    lockTimer = null
    return
  }
  backgroundAt = Date.now()
  if (lockTimer) clearTimeout(lockTimer)
  lockTimer = setTimeout(lockPresentationCrypto, getPresentationSettings().lockMinutes * 60_000)
}

export async function protectPresentationText(text: string): Promise<string> {
  const settings = getPresentationSettings()
  if (!settings.enabled) return text
  if (!password || !settings.salt) throw new Error('Presentation password is locked')
  const salt = unb64(settings.salt)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, new TextEncoder().encode(text)))
  // v2 keeps all cryptographic metadata inside the selected presentation
  // alphabet. Only a neutral sentinel and a one-character codec marker remain
  // outside, so salts, IVs, protocol names and Base64 never leak into bubbles.
  const frame = new Uint8Array(1 + salt.length + iv.length + encrypted.length)
  frame[0] = 2
  frame.set(salt, 1)
  frame.set(iv, 1 + salt.length)
  frame.set(encrypted, 1 + salt.length + iv.length)
  const presented = `${PRIVATE_PREFIX}${CODEC_MARKERS[settings.codec]}${encodePresentationBytes(frame, settings.codec)}`
  presentationByPlaintext.set(text, presented)
  return presented
}

export async function unprotectPresentationText(text: string): Promise<string> {
  if (!password) return text
  try {
    if (text.startsWith(PRIVATE_PREFIX)) {
      const marker = Array.from(text.slice(PRIVATE_PREFIX.length))[0]
      const codec = (Object.entries(CODEC_MARKERS).find(([, value]) => value === marker)?.[0]) as PresentationCodecId | undefined
      if (!codec) return text
      const payload = text.slice(PRIVATE_PREFIX.length + marker.length)
      const frame = decodePresentationBytes(payload, codec)
      if (frame[0] !== 2 || frame.length < 30) return text
      const salt = frame.slice(1, 17)
      const iv = frame.slice(17, 29)
      const encrypted = frame.slice(29)
      const key = await deriveKey(password, salt)
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, encrypted)
      const plaintext = new TextDecoder().decode(plain)
      presentationByPlaintext.set(plaintext, text)
      return plaintext
    }
    // Backward compatibility for messages created by 2.4.1.
    if (!text.startsWith(PREFIX)) return text
    const [, codec, salt64, iv64, payload] = text.split('|')
    const key = await deriveKey(password, unb64(salt64))
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv64), additionalData: AAD }, key, decodePresentationBytes(payload, codec as PresentationCodecId))
    const plaintext = new TextDecoder().decode(plain)
    presentationByPlaintext.set(plaintext, text)
    return plaintext
  } catch { return text }
}
