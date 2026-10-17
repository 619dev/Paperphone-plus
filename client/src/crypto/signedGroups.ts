import { securityText, SecurityError } from '../i18n/security'
import { get, post } from '../api/http'
import { useStore, type ChatMessage } from '../store'
import { getKeys } from './keystore'
import { encryptSignedPair, decryptSignedMessage, verifiedIdentity } from './authenticatedMessaging'
import { initSodium, signMessage } from './ratchet'
import { generateSenderKey, storeSenderKey, getSenderKey, encryptWithSenderKey, decryptWithSenderKey, receiveSenderKey } from './groupCrypto'
import { unprotectPresentationText } from './presentationCrypto'

const DOMAIN = 'PaperPhone-group-message-v1'
const PREFIX = 'ppg1.'
const me = () => useStore.getState().user?.id
const requireAccount = (owner: string | undefined) => { if (!owner || me() !== owner) throw new SecurityError('crypto.account_changed') }
const jobs = new Map<string, Promise<ReturnType<typeof getSenderKey>>>()
export class MissingGroupKey extends Error {}
export interface GroupSignature { group: string; from: string; epoch: number; id: string; type: string; ik: string; sign: string; nonce: string; nickname: string }
const signedBytes = (meta: GroupSignature, ciphertext: string) => new TextEncoder().encode(JSON.stringify([DOMAIN, meta.group, meta.from, meta.epoch, meta.id, meta.type, meta.ik, meta.sign, meta.nonce, meta.nickname, ciphertext]))

export async function importGroupDistribution(group: string, distribution: any) {
  const own = me()!
  const identity = await verifiedIdentity(distribution.from_id)
  const text = await decryptSignedMessage({ from: distribution.from_id, to: own, msg_type: 'group_sender_key',
    header: distribution.header, ciphertext: distribution.encrypted_key,
    self_header: distribution.header, self_ciphertext: distribution.encrypted_key })
  const payload = JSON.parse(text)
  const sodium = await initSodium()
  if (payload.domain !== 'PaperPhone-group-key-v1' || payload.group !== group || payload.from !== distribution.from_id || payload.to !== own || payload.epoch !== distribution.key_version || payload.ik !== identity.ik_pub || payload.sign !== identity.kem_pub || sodium.from_base64(payload.key).length !== 32) throw new SecurityError('grouptrust.key_context')
  requireAccount(own)
  storeSenderKey(group, payload.from, payload.key, payload.epoch, payload.from === own, true)
}

export async function fetchGroupKeys(group: string) {
  const owner = me()
  const result = await get(`/api/groups/${group}/sender-keys`)
  requireAccount(owner)
  for (const distribution of result.keys || []) {
    requireAccount(owner)
    try {
      if (!distribution.header?.startsWith('pps1.') && distribution.key_version < result.key_epoch) {
        // Legacy keys are history-only and can never authorize a new signed epoch.
        const key = await receiveSenderKey(distribution.encrypted_key, distribution.header, getKeys()!.ik_priv, null)
        if (!getSenderKey(group, distribution.from_id, distribution.key_version)?.authenticated) storeSenderKey(group, distribution.from_id, key, distribution.key_version, false, false)
      } else await importGroupDistribution(group, distribution)
    }
    catch (error) { console.warn('[Group] Rejected key distribution:', distribution.from_id, error) }
  }
}

/** Single publisher per group. The server lock and epoch comparison handle
 * concurrent membership changes and other devices publishing the same epoch. */
export function ensureGroupSenderKey(group: string): Promise<ReturnType<typeof getSenderKey>> {
  const owner = me()
  const jobId = `${owner}:${group}`
  const running = jobs.get(jobId)
  if (running) return running
  const job = (async () => {
    const detail = await get(`/api/groups/${group}`)
    requireAccount(owner)
    const epoch = detail.key_epoch
    if (!Number.isSafeInteger(epoch) || epoch < 1 || !detail.members?.some((m: any) => m.id === me())) throw new SecurityError('grouptrust.invalid_membership')
    const identities = new Map<string, { ik_pub: string; kem_pub: string }>()
    for (const member of detail.members) {
      const pinned = await verifiedIdentity(member.id)
      if (pinned.ik_pub !== member.ik_pub || pinned.kem_pub !== member.kem_pub) throw new SecurityError('grouptrust.member_changed', { id: member.nickname || member.id })
      identities.set(member.id, pinned)
    }
    requireAccount(owner)
    let own = getSenderKey(group, me()!, epoch)
    if (own?.authenticated && own.distributed) return own
    await fetchGroupKeys(group)
    requireAccount(owner)
    own = getSenderKey(group, me()!, epoch)
    if (own?.authenticated && own.distributed) return own
    const key = await generateSenderKey()
    const distributions = []
    const keys = getKeys()!
    for (const member of detail.members) {
      const pinned = identities.get(member.id)!
      const body = JSON.stringify({ domain: 'PaperPhone-group-key-v1', group, from: me(), to: member.id, epoch, ik: keys.ik_pub, sign: keys.sign_pub, key })
      const pair = await encryptSignedPair(member.id, pinned.ik_pub, pinned.kem_pub, body, 'group_sender_key')
      distributions.push({ to_id: member.id, encrypted_key: member.id === me() ? pair.self_ciphertext : pair.ciphertext, header: member.id === me() ? pair.self_header : pair.header })
    }
    requireAccount(owner)
    try { await post(`/api/groups/${group}/sender-keys`, { key_version: epoch, distributions }) }
    catch (error) {
      // Recover an upload whose response was lost, or a concurrent publisher.
      await fetchGroupKeys(group)
      const recovered = getSenderKey(group, me()!, epoch)
      if (recovered?.authenticated && recovered.distributed) return recovered
      throw error
    }
    requireAccount(owner)
    storeSenderKey(group, me()!, key, epoch, true, true)
    return getSenderKey(group, me()!, epoch)
  })().finally(() => { jobs.delete(jobId) })
  jobs.set(jobId, job)
  return job
}

export async function encryptGroupMessage(group: string, plaintext: string, type: string, id: string) {
  const owner = me()
  const senderKey = await ensureGroupSenderKey(group)
  requireAccount(owner)
  if (!senderKey) throw new SecurityError('grouptrust.no_key')
  const keys = getKeys()!
  const encrypted = await encryptWithSenderKey(plaintext, senderKey.senderKey)
  const meta: GroupSignature = { group, from: owner!, epoch: senderKey.keyVersion, id, type, ik: keys.ik_pub, sign: keys.sign_pub, nonce: encrypted.nonce, nickname: useStore.getState().user?.nickname || me()! }
  const signature = await signMessage(signedBytes(meta, encrypted.ciphertext), keys.sign_priv)
  requireAccount(owner)
  return { ...encrypted, from_nickname: meta.nickname, sender_key_version: senderKey.keyVersion, header: PREFIX + JSON.stringify({ meta, signature }) }
}

export async function decryptGroupMessage(message: ChatMessage, historical = false): Promise<{ decrypted: string; signature_valid: boolean; decryption_pending: boolean; from_nickname?: string }> {
  const owner = me()
  if (!message.header?.startsWith(PREFIX)) {
    if (!historical && !message.offline) return { decrypted: securityText('grouptrust.unsigned'), signature_valid: false, decryption_pending: false }
    let text = message.ciphertext
    if (message.nonce && message.sender_key_version) {
      const key = getSenderKey(message.group_id!, message.from, message.sender_key_version)
      if (!key) throw new MissingGroupKey(securityText('grouptrust.history_key_pending'))
      text = await decryptWithSenderKey(message.ciphertext, message.nonce, key.senderKey)
    }
    requireAccount(owner)
    return { decrypted: securityText('grouptrust.unsigned_history', { text: await unprotectPresentationText(text) }), signature_valid: false, decryption_pending: false }
  }
  const envelope = JSON.parse(message.header.slice(PREFIX.length))
  const meta: GroupSignature = envelope.meta
  if (!meta || meta.group !== message.group_id || meta.from !== message.from || meta.type !== message.msg_type || meta.epoch !== message.sender_key_version || meta.nonce !== message.nonce || !Number.isSafeInteger(meta.epoch) || meta.epoch < 1 || typeof meta.id !== 'string' || typeof meta.nickname !== 'string' || Array.from(meta.nickname).length > 128 || (message.client_msg_id && meta.id !== message.client_msg_id)) throw new SecurityError('grouptrust.context')
  const pinned = await verifiedIdentity(meta.from)
  if (meta.ik !== pinned.ik_pub || meta.sign !== pinned.kem_pub) throw new SecurityError('grouptrust.untrusted_key')
  const sodium = await initSodium()
  if (!sodium.crypto_sign_verify_detached(sodium.from_base64(envelope.signature), signedBytes(meta, message.ciphertext), sodium.from_base64(pinned.kem_pub))) throw new SecurityError('grouptrust.signature_invalid')
  if (!historical && !message.offline) {
    const detail = await get(`/api/groups/${meta.group}`)
    const member = detail.members.find((member: any) => member.id === meta.from)
    if (detail.key_epoch !== meta.epoch || !member || member.ik_pub !== pinned.ik_pub || member.kem_pub !== pinned.kem_pub) throw new SecurityError('grouptrust.retired')
  }
  requireAccount(owner)
  const authenticated = { signature_valid: true, from_nickname: meta.nickname }
  try {
    let key = getSenderKey(meta.group, meta.from, meta.epoch)
    if (!key?.authenticated) {
      await fetchGroupKeys(meta.group)
      key = getSenderKey(meta.group, meta.from, meta.epoch)
    }
    requireAccount(owner)
    if (!key?.authenticated) return { ...authenticated, decrypted: securityText('grouptrust.key_pending'), decryption_pending: true }
    const decrypted = await unprotectPresentationText(await decryptWithSenderKey(message.ciphertext, message.nonce!, key.senderKey))
    requireAccount(owner)
    return { ...authenticated, decrypted, decryption_pending: false }
  } catch {
    requireAccount(owner)
    return { ...authenticated, decrypted: securityText('grouptrust.decrypt_pending'), decryption_pending: true }
  }
}
