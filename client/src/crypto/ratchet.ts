/**
 * Stateless ECDH + XSalsa20-Poly1305 encryption using libsodium-wrappers.
 * This mirrors the original PaperPhone E2EE protocol.
 *
 * For E2E private messages:
 *   encrypt(recipientPublicKey, senderPrivateKey, plaintext) → { ciphertext, header }
 *   decrypt(senderPublicKey, recipientPrivateKey, ciphertext, header) → plaintext
 *
 * For group messages: plaintext is sent (no E2E — groups use server-side storage).
 */

let _sodium: typeof import('libsodium-wrappers-sumo') | null = null

export async function initSodium() {
  if (_sodium) return _sodium
  const _SodiumPlus = await import('libsodium-wrappers-sumo')
  await _SodiumPlus.ready
  _sodium = _SodiumPlus
  return _sodium
}

export async function generateKeyPair() {
  const sodium = await initSodium()
  const kp = sodium.crypto_box_keypair()
  return {
    publicKey: sodium.to_base64(kp.publicKey),
    privateKey: sodium.to_base64(kp.privateKey),
  }
}

export async function generateSignKeyPair() {
  const sodium = await initSodium()
  const kp = sodium.crypto_sign_keypair()
  return {
    publicKey: sodium.to_base64(kp.publicKey),
    privateKey: sodium.to_base64(kp.privateKey),
  }
}

export async function signMessage(message: Uint8Array, privateKey: string) {
  const sodium = await initSodium()
  const sig = sodium.crypto_sign_detached(message, sodium.from_base64(privateKey))
  return sodium.to_base64(sig)
}

export async function encrypt(
  recipientPubKey: string,
  senderPrivKey: string,
  plaintext: string
): Promise<{ ciphertext: string; header: string }> {
  const sodium = await initSodium()

  // Generate ephemeral keypair
  const ephemeral = sodium.crypto_box_keypair()
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)

  // Compute shared secret with recipient's public key
  const recipientPub = sodium.from_base64(recipientPubKey)
  const ciphertext = sodium.crypto_box_easy(
    sodium.from_string(plaintext),
    nonce,
    recipientPub,
    ephemeral.privateKey
  )

  // Header = ephemeral public key + nonce
  const header = new Uint8Array(ephemeral.publicKey.length + nonce.length)
  header.set(ephemeral.publicKey)
  header.set(nonce, ephemeral.publicKey.length)

  return {
    ciphertext: sodium.to_base64(ciphertext),
    header: sodium.to_base64(header),
  }
}

export async function encryptForSelf(
  ownPubKey: string,
  ownPrivKey: string,
  plaintext: string
): Promise<{ ciphertext: string; header: string }> {
  return encrypt(ownPubKey, ownPrivKey, plaintext)
}

export async function decrypt(
  senderHeader: string,
  recipientPrivKey: string,
  ciphertext: string
): Promise<string> {
  const sodium = await initSodium()

  const headerBytes = sodium.from_base64(senderHeader)
  const ephemeralPub = headerBytes.slice(0, sodium.crypto_box_PUBLICKEYBYTES)
  const nonce = headerBytes.slice(sodium.crypto_box_PUBLICKEYBYTES)
  const ct = sodium.from_base64(ciphertext)
  const privKey = sodium.from_base64(recipientPrivKey)

  const plaintext = sodium.crypto_box_open_easy(ct, nonce, ephemeralPub, privKey)
  return sodium.to_string(plaintext)
}
