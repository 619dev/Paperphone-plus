import { deleteBrowserSecret, getBrowserSecret, setBrowserSecret } from './browserSecretStore'

const LEGACY_DB_NAME = 'PaperPhonePlusKeys'
const LEGACY_STORE_NAME = 'keys'
const LEGACY_MEM_KEY = '__pp_keys'
const SECRET_NAME = 'identity-keys-v1'

export interface KeyBundle {
  ik_pub: string
  ik_priv: string
  spk_pub: string
  spk_priv: string
  spk_sig: string
  sign_pub: string
  sign_priv: string
  opks: Array<{ key_id: number; pub: string; priv: string }>
}

let memKeys: KeyBundle | null = null
let memAccount: string | null = null

function currentAccount(explicit?: string): string | null {
  if (explicit) return explicit
  try { return JSON.parse(localStorage.getItem('user') || 'null')?.id || null } catch { return null }
}

export function getKeys(): KeyBundle | null {
  const account = currentAccount()
  return account && memAccount === account ? memKeys : null
}

export async function setKeys(keys: KeyBundle, accountId?: string): Promise<void> {
  const account = currentAccount(accountId)
  if (!account) throw new Error('Cannot persist identity keys without an account')
  memKeys = keys
  memAccount = account
  await setBrowserSecret(account, SECRET_NAME, JSON.stringify(keys))
  removeLegacyBrowserCopies()
  await clearLegacyIndexedDB()
}

export function clearKeys(accountId?: string): void {
  const account = currentAccount(accountId) || memAccount
  memKeys = null
  memAccount = null
  if (account) void deleteBrowserSecret(account, SECRET_NAME).catch(() => {})
  removeLegacyBrowserCopies()
  void clearLegacyIndexedDB()
}

/** Legacy name retained to avoid broad call-site churn. */
export async function loadFromIndexedDB(accountId?: string): Promise<KeyBundle | null> {
  const account = currentAccount(accountId)
  if (!account) return null
  if (memKeys && memAccount === account) return memKeys
  memKeys = null
  memAccount = account

  const secure = await getBrowserSecret(account, SECRET_NAME)
  if (secure) {
    memKeys = JSON.parse(secure)
    removeLegacyBrowserCopies()
    await clearLegacyIndexedDB()
    return memKeys
  }

  const legacy = await readLegacyKeys()
  if (legacy) {
    memKeys = legacy
    await setBrowserSecret(account, SECRET_NAME, JSON.stringify(legacy))
  }
  removeLegacyBrowserCopies()
  await clearLegacyIndexedDB()
  return memKeys
}

function removeLegacyBrowserCopies(): void {
  try { localStorage.removeItem(LEGACY_MEM_KEY) } catch {}
  try { sessionStorage.removeItem(LEGACY_MEM_KEY) } catch {}
}

async function readLegacyKeys(): Promise<KeyBundle | null> {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const raw = storage.getItem(LEGACY_MEM_KEY)
      if (raw) return JSON.parse(raw)
    } catch {}
  }
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(LEGACY_DB_NAME, 1)
      req.onsuccess = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(LEGACY_STORE_NAME)) { db.close(); resolve(null); return }
        const get = db.transaction(LEGACY_STORE_NAME, 'readonly').objectStore(LEGACY_STORE_NAME).get('bundle')
        get.onsuccess = () => { db.close(); resolve(get.result || null) }
        get.onerror = () => { db.close(); resolve(null) }
      }
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

async function clearLegacyIndexedDB(): Promise<void> {
  return new Promise(resolve => {
    try {
      const req = indexedDB.deleteDatabase(LEGACY_DB_NAME)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    } catch { resolve() }
  })
}
