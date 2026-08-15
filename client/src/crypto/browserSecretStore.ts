const DB_NAME = 'PaperPhonePlusSecureStorage'
const DB_VERSION = 1
const KEY_STORE = 'wrapping-keys'
const SECRET_STORE = 'secrets'
const DEVICE_KEY = 'device-aes-gcm-v1'

interface EncryptedSecret { iv: Uint8Array; ciphertext: ArrayBuffer }
let deviceKeyPromise: Promise<CryptoKey> | null = null

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE)
      if (!db.objectStoreNames.contains(SECRET_STORE)) db.createObjectStore(SECRET_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function requestValue<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getDeviceKey(): Promise<CryptoKey> {
  if (deviceKeyPromise) return deviceKeyPromise
  deviceKeyPromise = (async () => {
    const db = await openDb()
    const existing = await requestValue(db.transaction(KEY_STORE, 'readonly').objectStore(KEY_STORE).get(DEVICE_KEY))
    if (existing instanceof CryptoKey) return existing
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    await requestValue(db.transaction(KEY_STORE, 'readwrite').objectStore(KEY_STORE).put(key, DEVICE_KEY))
    return key
  })()
  return deviceKeyPromise
}

const secretId = (account: string, name: string) => `${account}:${name}`

export async function setBrowserSecret(account: string, name: string, value: string): Promise<void> {
  const key = await getDeviceKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const aad = new TextEncoder().encode(secretId(account, name))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, new TextEncoder().encode(value))
  const db = await openDb()
  await requestValue(db.transaction(SECRET_STORE, 'readwrite').objectStore(SECRET_STORE).put({ iv, ciphertext } satisfies EncryptedSecret, secretId(account, name)))
}

export async function getBrowserSecret(account: string, name: string): Promise<string | null> {
  const db = await openDb()
  const encrypted = await requestValue<EncryptedSecret | undefined>(db.transaction(SECRET_STORE, 'readonly').objectStore(SECRET_STORE).get(secretId(account, name)))
  if (!encrypted) return null
  const key = await getDeviceKey()
  const aad = new TextEncoder().encode(secretId(account, name))
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: encrypted.iv, additionalData: aad }, key, encrypted.ciphertext)
  return new TextDecoder().decode(plaintext)
}

export async function deleteBrowserSecret(account: string, name: string): Promise<void> {
  const db = await openDb()
  await requestValue(db.transaction(SECRET_STORE, 'readwrite').objectStore(SECRET_STORE).delete(secretId(account, name)))
}
