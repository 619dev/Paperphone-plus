/**
 * Hybrid E2E Encryption: X25519 ECDH + Kyber KEM + XSalsa20-Poly1305
 *
 * For private messages:
 *   encryptHybrid(recipientPubKey, recipientKemPub, plaintext) → { ciphertext, header }
 *   decryptHybrid(header, recipientPrivKey, recipientKemPriv, ciphertext) → plaintext
 *
 * Dual encryption: sender encrypts once for recipient and once for self,
 * so both parties can decrypt their own message history.
 *
 * Forward secrecy: ephemeral keypair generated per message.
 * Post-quantum: Kyber KEM shared secret mixed via HKDF with ECDH shared secret.
 *
 * Group messages: plaintext (no E2E).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sodium: any = null

export async function initSodium(): Promise<any> {
  if (_sodium) return _sodium
  const mod = await import('libsodium-wrappers-sumo')
  const sodium = (mod as any).default || mod
  await sodium.ready
  _sodium = sodium
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

/* ═══════════════════════════════════════════════════════════════════════════
   Kyber KEM helpers
   ═══════════════════════════════════════════════════════════════════════════ */

let _kyberModule: any = null

async function getKyber(): Promise<any> {
  if (_kyberModule) return _kyberModule
  try {
    const mod = await import('crystals-kyber-js')
    const KyberClass = (mod as any).MlKem768 || (mod as any).Kyber768 || (mod as any).default?.MlKem768
    if (KyberClass) {
      _kyberModule = new KyberClass()
      return _kyberModule
    }
  } catch {}
  return null
}

/** Generate a Kyber keypair → { kemPub: base64, kemPriv: base64 } */
export async function generateKemKeyPair(): Promise<{ kemPub: string; kemPriv: string } | null> {
  const sodium = await initSodium()
  const kyber = await getKyber()
  if (!kyber) return null
  try {
    const [pk, sk] = await kyber.generateKeyPair()
    return {
      kemPub: sodium.to_base64(pk),
      kemPriv: sodium.to_base64(sk),
    }
  } catch {
    return null
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HKDF — derive key from combined secrets
   ═══════════════════════════════════════════════════════════════════════════ */

async function hkdfDerive(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  )
  return new Uint8Array(bits)
}

/* ═══════════════════════════════════════════════════════════════════════════
   Hybrid encrypt / decrypt
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hybrid encryption: X25519 ECDH + Kyber KEM → HKDF → XSalsa20-Poly1305
 *
 * Header layout:
 *   [1 byte: version] [32 bytes: ephemeral X25519 pub] [24 bytes: nonce]
 *   [N bytes: Kyber KEM ciphertext, if version >= 2]
 *
 * Version 1: ECDH only (fallback)
 * Version 2: ECDH + Kyber hybrid
 */
export async function encryptHybrid(
  recipientPubKey: string,
  recipientKemPub: string | null | undefined,
  plaintext: string
): Promise<{ ciphertext: string; header: string }> {
  const sodium = await initSodium()
  const kyber = recipientKemPub ? await getKyber() : null

  // Ephemeral X25519 keypair
  const ephemeral = sodium.crypto_box_keypair()
  const recipientPub = sodium.from_base64(recipientPubKey)

  // ECDH shared secret
  const ecdhSecret = sodium.crypto_scalarmult(ephemeral.privateKey, recipientPub)

  let finalKey: Uint8Array
  let kemCt: Uint8Array | null = null
  let version: number

  if (kyber && recipientKemPub) {
    // Hybrid: ECDH + Kyber KEM
    try {
      const kemPub = sodium.from_base64(recipientKemPub)
      const [ct, kemSharedSecret] = await kyber.encap(kemPub)
      kemCt = ct

      // Combine ECDH + KEM secrets via HKDF
      const combined = new Uint8Array(ecdhSecret.length + kemSharedSecret.length)
      combined.set(ecdhSecret)
      combined.set(kemSharedSecret, ecdhSecret.length)

      const info = new TextEncoder().encode('PaperPhone-Hybrid-E2E-v2')
      finalKey = await hkdfDerive(combined, ephemeral.publicKey, info, 32)
      version = 2
    } catch {
      // Kyber failed, fallback to ECDH only
      finalKey = ecdhSecret
      version = 1
    }
  } else {
    finalKey = ecdhSecret
    version = 1
  }

  // Encrypt with XSalsa20-Poly1305 using secretbox (symmetric)
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const ct = sodium.crypto_secretbox_easy(sodium.from_string(plaintext), nonce, finalKey)

  // Build header
  const headerParts: Uint8Array[] = [
    new Uint8Array([version]),
    ephemeral.publicKey,
    nonce,
  ]
  if (kemCt) headerParts.push(kemCt)

  const headerLen = headerParts.reduce((s, p) => s + p.length, 0)
  const header = new Uint8Array(headerLen)
  let offset = 0
  for (const part of headerParts) {
    header.set(part, offset)
    offset += part.length
  }

  return {
    ciphertext: sodium.to_base64(ct),
    header: sodium.to_base64(header),
  }
}

/**
 * Hybrid decryption
 */
export async function decryptHybrid(
  headerB64: string,
  recipientPrivKey: string,
  recipientKemPriv: string | null | undefined,
  ciphertextB64: string
): Promise<string> {
  const sodium = await initSodium()
  const headerBytes = sodium.from_base64(headerB64)
  const ct = sodium.from_base64(ciphertextB64)
  const privKey = sodium.from_base64(recipientPrivKey)

  const version = headerBytes[0]
  const ephemeralPub = headerBytes.slice(1, 33) // 32 bytes X25519 public key
  const nonce = headerBytes.slice(33, 57) // 24 bytes nonce

  // ECDH shared secret
  const ecdhSecret = sodium.crypto_scalarmult(privKey, ephemeralPub)

  let finalKey: Uint8Array

  if (version >= 2 && recipientKemPriv) {
    // Extract Kyber KEM ciphertext from header
    const kemCt = headerBytes.slice(57)
    const kyber = await getKyber()

    if (kyber && kemCt.length > 0) {
      try {
        const kemPriv = sodium.from_base64(recipientKemPriv)
        const kemSharedSecret = await kyber.decap(kemCt, kemPriv)

        const combined = new Uint8Array(ecdhSecret.length + kemSharedSecret.length)
        combined.set(ecdhSecret)
        combined.set(kemSharedSecret, ecdhSecret.length)

        const info = new TextEncoder().encode('PaperPhone-Hybrid-E2E-v2')
        finalKey = await hkdfDerive(combined, ephemeralPub, info, 32)
      } catch {
        // KEM decap failed, try ECDH only as fallback
        finalKey = ecdhSecret
      }
    } else {
      finalKey = ecdhSecret
    }
  } else {
    finalKey = ecdhSecret
  }

  const plainBytes = sodium.crypto_secretbox_open_easy(ct, nonce, finalKey)
  return sodium.to_string(plainBytes)
}

/* ═══════════════════════════════════════════════════════════════════════════
   Legacy encrypt / decrypt (backward compat — crypto_box based)
   ═══════════════════════════════════════════════════════════════════════════ */

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
