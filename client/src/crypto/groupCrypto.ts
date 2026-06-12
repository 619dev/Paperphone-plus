/**
 * Group E2E Encryption — Sender Key Protocol
 *
 * Each member generates a symmetric "Sender Key" for each encrypted group.
 * The Sender Key is distributed to other members via existing 1:1 ECDH channels.
 * Messages are encrypted with the sender's Sender Key using XSalsa20-Poly1305.
 *
 * Key rotation: When a member leaves, all remaining members rotate their Sender Keys.
 *
 * This is a simplified implementation inspired by Signal's Sender Keys protocol.
 */

import { initSodium, encryptHybrid, decryptHybrid } from './ratchet'

// ── Sender Key Store ────────────────────────────────────────────────────────

const SK_STORAGE_KEY = '__pp_sender_keys'

interface SenderKeyEntry {
  groupId: string
  userId: string        // The owner of this sender key
  senderKey: string     // base64-encoded 32-byte symmetric key
  keyVersion: number
  distributed?: boolean // Whether this key has been successfully distributed (only for own keys)
}

/** In-memory + localStorage cache of sender keys */
let senderKeyCache: SenderKeyEntry[] = []

function loadSenderKeys(): SenderKeyEntry[] {
  if (senderKeyCache.length > 0) return senderKeyCache
  try {
    const raw = localStorage.getItem(SK_STORAGE_KEY)
    if (raw) senderKeyCache = JSON.parse(raw)
  } catch { senderKeyCache = [] }
  return senderKeyCache
}

function saveSenderKeys() {
  try {
    localStorage.setItem(SK_STORAGE_KEY, JSON.stringify(senderKeyCache))
  } catch { /* localStorage full */ }
}

/**
 * Store a sender key for a specific user in a specific group.
 */
export function storeSenderKey(groupId: string, userId: string, senderKey: string, keyVersion: number, distributed?: boolean) {
  loadSenderKeys()
  // Replace existing entry for same group+user
  senderKeyCache = senderKeyCache.filter(
    sk => !(sk.groupId === groupId && sk.userId === userId)
  )
  senderKeyCache.push({ groupId, userId, senderKey, keyVersion, distributed })
  saveSenderKeys()
}

/**
 * Check if own sender key has been distributed to other members.
 */
export function isSenderKeyDistributed(groupId: string, userId: string): boolean {
  const sk = getSenderKey(groupId, userId)
  return sk?.distributed === true
}

/**
 * Mark own sender key as distributed.
 */
export function markSenderKeyDistributed(groupId: string, userId: string) {
  loadSenderKeys()
  const entry = senderKeyCache.find(
    sk => sk.groupId === groupId && sk.userId === userId
  )
  if (entry) {
    entry.distributed = true
    saveSenderKeys()
  }
}

/**
 * Get the sender key for a specific user in a group.
 */
export function getSenderKey(groupId: string, userId: string): SenderKeyEntry | null {
  loadSenderKeys()
  return senderKeyCache.find(
    sk => sk.groupId === groupId && sk.userId === userId
  ) || null
}

/**
 * Get my own sender key for a group.
 */
export function getMySenderKey(groupId: string, myUserId: string): SenderKeyEntry | null {
  return getSenderKey(groupId, myUserId)
}

/**
 * Remove all sender keys for a group (when encryption mode changes).
 */
export function clearGroupSenderKeys(groupId: string) {
  loadSenderKeys()
  senderKeyCache = senderKeyCache.filter(sk => sk.groupId !== groupId)
  saveSenderKeys()
}

/**
 * Remove ALL sender keys across all groups (when own identity keys change).
 * All previously distributed sender keys become undecryptable with the new key pair.
 */
export function clearAllSenderKeys() {
  senderKeyCache = []
  saveSenderKeys()
}

/**
 * Remove a specific user's sender key (when they leave the group).
 */
export function removeSenderKey(groupId: string, userId: string) {
  loadSenderKeys()
  senderKeyCache = senderKeyCache.filter(
    sk => !(sk.groupId === groupId && sk.userId === userId)
  )
  saveSenderKeys()
}

// ── Key Generation ──────────────────────────────────────────────────────────

/**
 * Generate a new 32-byte random Sender Key.
 * Returns base64-encoded key.
 */
export async function generateSenderKey(): Promise<string> {
  const sodium = await initSodium()
  const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES) // 32 bytes
  return sodium.to_base64(key)
}

// ── Message Encryption / Decryption ─────────────────────────────────────────

/**
 * Encrypt a message using a Sender Key (XSalsa20-Poly1305 symmetric encryption).
 * Returns { ciphertext: base64, nonce: base64 }
 */
export async function encryptWithSenderKey(
  plaintext: string,
  senderKeyBase64: string
): Promise<{ ciphertext: string; nonce: string }> {
  const sodium = await initSodium()
  const key = sodium.from_base64(senderKeyBase64)
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES) // 24 bytes
  const ct = sodium.crypto_secretbox_easy(sodium.from_string(plaintext), nonce, key)
  return {
    ciphertext: sodium.to_base64(ct),
    nonce: sodium.to_base64(nonce),
  }
}

/**
 * Decrypt a message using a Sender Key.
 */
export async function decryptWithSenderKey(
  ciphertextBase64: string,
  nonceBase64: string,
  senderKeyBase64: string
): Promise<string> {
  const sodium = await initSodium()
  const key = sodium.from_base64(senderKeyBase64)
  const nonce = sodium.from_base64(nonceBase64)
  const ct = sodium.from_base64(ciphertextBase64)
  const plain = sodium.crypto_secretbox_open_easy(ct, nonce, key)
  return sodium.to_string(plain)
}

// ── Sender Key Distribution ─────────────────────────────────────────────────

/**
 * Encrypt a Sender Key for distribution to a specific recipient.
 * Uses the existing ECDH-based encryption (encryptHybrid).
 *
 * @param senderKey - The sender key to distribute (base64)
 * @param recipientIkPub - Recipient's identity public key (base64)
 * @param recipientKemPub - Recipient's KEM public key (base64, optional)
 * @returns { encrypted_key, header } for storage/transmission
 */
export async function distributeSenderKey(
  senderKey: string,
  recipientIkPub: string,
  recipientKemPub: string | null | undefined
): Promise<{ encrypted_key: string; header: string }> {
  try {
    const result = await encryptHybrid(recipientIkPub, recipientKemPub, senderKey)
    return {
      encrypted_key: result.ciphertext,
      header: result.header,
    }
  } catch (err) {
    console.error('[groupCrypto] distributeSenderKey failed:', {
      recipientIkPubLen: recipientIkPub?.length,
      kemPubPresent: !!recipientKemPub,
      senderKeyLen: senderKey?.length,
      error: err,
    })
    throw err
  }
}

/**
 * Decrypt a received Sender Key distribution.
 * Uses the existing ECDH-based decryption (decryptHybrid).
 *
 * @param encryptedKey - The encrypted sender key (base64)
 * @param header - The encryption header (base64)
 * @param myPrivKey - My identity private key (base64)
 * @param myKemPriv - My KEM private key (base64, optional)
 * @returns The decrypted sender key (base64)
 */
export async function receiveSenderKey(
  encryptedKey: string,
  header: string,
  myPrivKey: string,
  myKemPriv: string | null | undefined
): Promise<string> {
  try {
    const result = await decryptHybrid(header, myPrivKey, myKemPriv, encryptedKey)
    return result
  } catch (err) {
    console.error('[groupCrypto] receiveSenderKey decryption failed:', {
      encryptedKeyLen: encryptedKey?.length,
      headerLen: header?.length,
      myPrivKeyLen: myPrivKey?.length,
      kemPrivPresent: !!myKemPriv,
      error: err,
    })
    throw err
  }
}
