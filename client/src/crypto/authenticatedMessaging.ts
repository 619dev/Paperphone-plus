import { securityText, SecurityError } from '../i18n/security'
import { get } from '../api/http'
import { sendWs } from '../api/socket'
import { getKeys } from './keystore'
import { getBrowserSecret, setBrowserSecret } from './browserSecretStore'
import { encryptHybrid, decryptHybrid, initSodium, signMessage } from './ratchet'
import { deriveSafetyNumber } from './safetyNumber'
import { getPresentationSettings, isPresentationUnlocked, encryptIdentityText, decryptIdentityText } from './presentationCrypto'

const DOMAIN = 'PaperPhone-signed-private-v1'
const PREFIX = 'pps1.'
interface Trust { ik: string; sign: string; own: string; ownSign: string; nonce: string; received?: string; acknowledged?: boolean }
const account = () => JSON.parse(localStorage.getItem('user') || 'null')?.id as string
const recordName = (id: string) => `identity-verification-v1:${id}`
async function readTrust(id: string): Promise<Trust | null> {
  const raw = await getBrowserSecret(account(), recordName(id))
  return raw ? JSON.parse(raw) : null
}
async function saveTrust(id: string, value: Trust) {
  await setBrowserSecret(account(), recordName(id), JSON.stringify(value))
  window.dispatchEvent(new Event('paperphone:identity-changed'))
}
export async function identityVerified(id: string, ik?: string, sign?: string): Promise<boolean> {
  const state = await readTrust(id)
  return !!(state && state.own === getKeys()?.ik_pub && state.ownSign === getKeys()?.sign_pub && state.ik === ik && (!sign || state.sign === sign) && state.received && state.acknowledged)
}

async function checkPeer(id: string, ik: string, sign: string) {
  const trust = await readTrust(id)
  if (trust && (trust.ik !== ik || trust.sign !== sign || trust.own !== getKeys()?.ik_pub || trust.ownSign !== getKeys()?.sign_pub)) {
    await saveTrust(id, { ...trust, acknowledged: false, received: undefined })
    throw new SecurityError('crypto.key_changed')
  }
}

export async function encryptSignedPair(to: string, ik: string, sign: string, body: string, type: string) {
  const keys = getKeys()
  if (!keys) throw new SecurityError('crypto.local_keys')
  await checkPeer(to, ik, sign)
  const from = account()
  async function seal(target: string, copy: 'recipient' | 'self') {
    // kem_pub is historically the Ed25519 public key in this client, not an ML-KEM key.
    const encrypted = await encryptHybrid(target, null, body)
    const fields = [DOMAIN, from, to, type, copy, keys!.ik_pub, ik, keys!.sign_pub, encrypted.header, encrypted.ciphertext]
    const signature = await signMessage(new TextEncoder().encode(JSON.stringify(fields)), keys!.sign_priv)
    return { ciphertext: encrypted.ciphertext, header: PREFIX + JSON.stringify({ fields: fields.slice(0, 9), signature }) }
  }
  const recipient = await seal(ik, 'recipient')
  const self = await seal(keys.ik_pub, 'self')
  return { ciphertext: recipient.ciphertext, header: recipient.header, self_ciphertext: self.ciphertext, self_header: self.header }
}

let proofQueue: Promise<unknown> = Promise.resolve()
export async function decryptSignedMessage(msg: any, options?: { processIdentity?: boolean }): Promise<string> {
  const keys = getKeys()
  if (!keys) throw new SecurityError('crypto.local_keys')
  const own = msg.from === account()
  const header = own ? msg.self_header : msg.header
  const ciphertext = own ? msg.self_ciphertext : msg.ciphertext
  const peerId = own ? msg.to : msg.from
  if (!header?.startsWith(PREFIX)) {
    // Legacy history is readable but explicitly never proves identity.
    if (await readTrust(peerId)) throw new SecurityError('crypto.unsigned')
    return securityText('verify.unsigned_history', { text: await decryptHybrid(header, keys.ik_priv, null, ciphertext) })
  }
  const envelope = JSON.parse(header.slice(PREFIX.length))
  const f = envelope.fields
  if (!Array.isArray(f) || f.length !== 9 || f[0] !== DOMAIN || f[1] !== msg.from || f[2] !== msg.to || f[3] !== msg.msg_type || f[4] !== (own ? 'self' : 'recipient') || (own ? f[5] : f[6]) !== keys.ik_pub) throw new SecurityError('crypto.context')
  const sodium = await initSodium()
  if (!sodium.crypto_sign_verify_detached(sodium.from_base64(envelope.signature), new TextEncoder().encode(JSON.stringify([...f, ciphertext])), sodium.from_base64(f[7]))) throw new SecurityError('crypto.signature')
  const peer = await get(`/api/users/${peerId}`).catch(async error => {
    const pinned = await readTrust(peerId)
    if (!pinned) throw error
    return { ik_pub: pinned.ik, kem_pub: pinned.sign }
  })
  await checkPeer(peerId, peer.ik_pub, peer.kem_pub)
  const sender = own ? keys : { ik_pub: peer.ik_pub, sign_pub: peer.kem_pub }
  if (f[5] !== sender.ik_pub || f[7] !== sender.sign_pub || f[6] !== (own ? peer.ik_pub : keys.ik_pub)) throw new SecurityError('crypto.identity_mismatch')
  const text = await decryptHybrid(f[8], keys.ik_priv, null, ciphertext)
  if (msg.msg_type === 'identity_verification') {
    if (options?.processIdentity === false) return text
    if (own) return securityText('verify.sent')
    if (!isPresentationUnlocked()) return securityText('verify.message_locked')
    const task = proofQueue.then(() => receiveProof(peerId, peer, text))
    proofQueue = task.catch(() => {})
    await task
    return securityText('verify.checked')
  }
  return text
}

async function sendProof(id: string, peer: any, state: Trust, ack?: string, ackOnly = false) {
  const keys = getKeys()!
  const safety = await deriveSafetyNumber(keys.ik_pub, peer.ik_pub)
  const binding = JSON.stringify({ from: account(), to: id, ik: keys.ik_pub, recipient: peer.ik_pub, sign: keys.sign_pub, safety, nonce: ackOnly ? null : state.nonce, ack: ack || null })
  const protectedText = JSON.stringify({ binding, encrypted: await encryptIdentityText(binding) })
  const pair = await encryptSignedPair(id, peer.ik_pub, peer.kem_pub, protectedText, 'identity_verification')
  if (!sendWs({ type: 'message', to: id, msg_type: 'identity_verification', client_msg_id: crypto.randomUUID(), ...pair })) throw new SecurityError('crypto.disconnected')
}
export async function startIdentityVerification(id: string) {
  if (!getPresentationSettings().enabled || !isPresentationUnlocked()) throw new Error(securityText('crypto.setup_password') + '\n' + securityText('verify.notice'))
  const peer = await get(`/api/users/${id}`)
  const state: Trust = { ik: peer.ik_pub, sign: peer.kem_pub, own: getKeys()!.ik_pub, ownSign: getKeys()!.sign_pub, nonce: crypto.randomUUID() }
  // Explicit initiation is the only action that can replace an old pin.
  await saveTrust(id, state)
  await sendProof(id, peer, state, state.received)
}
async function receiveProof(id: string, peer: any, text: string) {
  let proof: any
  try {
    const envelope = JSON.parse(text)
    if (await decryptIdentityText(envelope.binding, envelope.encrypted) !== 'paperphone.app') throw new SecurityError('crypto.invalid_proof')
    proof = JSON.parse(envelope.binding)
  } catch { throw new SecurityError('crypto.password_mismatch') }
  const keys = getKeys()!
  if (proof.from !== id || proof.to !== account() || proof.ik !== peer.ik_pub || proof.recipient !== keys.ik_pub || proof.sign !== peer.kem_pub || proof.safety !== await deriveSafetyNumber(keys.ik_pub, peer.ik_pub) || (proof.nonce !== null && (typeof proof.nonce !== 'string' || proof.nonce.length !== 36))) throw new SecurityError('crypto.proof_mismatch')
  let state = await readTrust(id)
  const previous = JSON.stringify(state)
  if (!state) state = { ik: peer.ik_pub, sign: peer.kem_pub, own: keys.ik_pub, ownSign: keys.sign_pub, nonce: crypto.randomUUID() }
  if (proof.ack === state.nonce) state.acknowledged = true
  const needsReply = proof.nonce && state.received !== proof.nonce
  if (proof.nonce) state.received = proof.nonce
  if (JSON.stringify(state) !== previous) await saveTrust(id, state)
  if (needsReply) await sendProof(id, peer, state, proof.nonce, proof.ack === state.nonce)
}

/** A signature key must be anchored in the offline password handshake, not in
 * an arbitrary server response. Group key distribution uses the same anchor. */
export async function verifiedIdentity(id: string): Promise<{ ik_pub: string; kem_pub: string }> {
  const keys = getKeys()
  if (id === account() && keys) return { ik_pub: keys.ik_pub, kem_pub: keys.sign_pub }
  const pin = await readTrust(id)
  if (!pin || !await identityVerified(id, pin.ik, pin.sign)) throw new SecurityError('crypto.verify_member', { id })
  return { ik_pub: pin.ik, kem_pub: pin.sign }
}

export type IdentityStatus = 'verified' | 'unverified' | 'pending' | 'locked' | 'changed'
export interface PublishedIdentity { id: string; ik_pub?: string; kem_pub?: string }

/** Refreshing may revoke trust, but may never replace an established pin. */
export async function refreshIdentityTrust(peer: PublishedIdentity): Promise<IdentityStatus> {
  const owner = account()
  const keys = getKeys()
  if (!keys || !peer.ik_pub || !peer.kem_pub) return 'unverified'
  if (peer.id === owner) return peer.ik_pub === keys.ik_pub && peer.kem_pub === keys.sign_pub ? 'verified' : 'changed'
  const pin = await readTrust(peer.id)
  if (account() !== owner) throw new SecurityError('crypto.account_changed')
  if (pin && (pin.ik !== peer.ik_pub || pin.sign !== peer.kem_pub || pin.own !== keys.ik_pub || pin.ownSign !== keys.sign_pub)) {
    if (pin.acknowledged || pin.received) await saveTrust(peer.id, { ...pin, acknowledged: false, received: undefined })
    return 'changed'
  }
  if (await identityVerified(peer.id, peer.ik_pub, peer.kem_pub)) return 'verified'
  if (!getPresentationSettings().enabled || !isPresentationUnlocked()) return 'locked'
  return pin ? 'pending' : 'unverified'
}

const refreshJobs = new Map<string, Promise<IdentityStatus>>()
const lastAutomaticProof = new Map<string, number>()
/** Profile entry recovers signed receipts already in history, then resumes the
 * existing challenge. Reopening never resets a verified or pending challenge. */
export function refreshContactVerification(peer: PublishedIdentity): Promise<IdentityStatus> {
  const owner = account()
  const jobId = `${owner}:${peer.id}`
  const existing = refreshJobs.get(jobId)
  if (existing) return existing
  const job = (async (): Promise<IdentityStatus> => {
    let status = await refreshIdentityTrust(peer)
    if (status === 'changed' || status === 'locked' || (status === 'verified' && !isPresentationUnlocked())) return status
    const messages = await get(`/api/messages/private/${peer.id}?limit=500`)
    if (account() !== owner) throw new SecurityError('crypto.account_changed')
    if (!Array.isArray(messages)) throw new SecurityError('crypto.invalid_history')
    for (const message of [...messages].reverse()) {
      if (message.from !== peer.id || message.to !== owner || message.msg_type !== 'identity_verification') continue
      try {
        const text = await decryptSignedMessage(message, { processIdentity: false })
        const binding = JSON.parse(JSON.parse(text).binding)
        const pin = await readTrust(peer.id)
        if (account() !== owner) throw new SecurityError('crypto.account_changed')
        // Replay only a receipt for this challenge, or the newest peer proof
        // still needed locally. Old challenges must not trigger a reply storm.
        if (pin && binding.ack !== pin.nonce && (!binding.nonce || binding.nonce === pin.received)) continue
        const task = proofQueue.then(() => receiveProof(peer.id, peer, text))
        proofQueue = task.catch(() => {})
        await task
        if (binding.nonce && pin?.received !== binding.nonce) lastAutomaticProof.set(jobId, Date.now())
        status = await refreshIdentityTrust(peer)
        if (status === 'changed' || status === 'verified' || status === 'locked') return status
        if (binding.nonce) break
      } catch { /* Invalid proofs never establish trust. */ }
      if (account() !== owner) throw new SecurityError('crypto.account_changed')
    }
    status = await refreshIdentityTrust(peer)
    if (status === 'changed' || status === 'verified' || status === 'locked') return status
    // Focus/visibility and unlock events can arrive together. Coalesce them and
    // resend the same challenge at most once per 30 seconds.
    if (Date.now() - (lastAutomaticProof.get(jobId) || 0) < 30_000) return status
    let state = await readTrust(peer.id)
    if (account() !== owner) throw new SecurityError('crypto.account_changed')
    if (!state) {
      const keys = getKeys()!
      state = { ik: peer.ik_pub!, sign: peer.kem_pub!, own: keys.ik_pub, ownSign: keys.sign_pub, nonce: crypto.randomUUID() }
      await saveTrust(peer.id, state)
    }
    await sendProof(peer.id, peer, state, state.received)
    lastAutomaticProof.set(jobId, Date.now())
    return refreshIdentityTrust(peer)
  })().finally(() => { refreshJobs.delete(jobId) })
  refreshJobs.set(jobId, job)
  return job
}

export const IDENTITY_STATUS_KEYS: Record<IdentityStatus | 'refreshing' | 'error', string> = {
  refreshing: 'verify.refreshing',
  verified: 'verify.verified',
  unverified: 'verify.unverified',
  pending: 'verify.pending',
  locked: 'verify.locked',
  changed: 'verify.changed',
  error: 'verify.error',
}
