/**
 * 4-tier key persistence:
 *   1. In-memory (fastest, lost on tab close)
 *   2. localStorage (survives page refresh)
 *   3. sessionStorage (survives navigation, lost on tab close)
 *   4. IndexedDB (most persistent, survives browser restart)
 *
 * Keys are always read from memory first. On startup, keys are loaded
 * from persisted storage in priority order: IndexedDB → localStorage → sessionStorage.
 */

const DB_NAME = 'PaperPhoneKeys'
const STORE_NAME = 'keys'
const MEM_KEY = '__pp_keys'

interface KeyBundle {
  ik_pub: string
  ik_priv: string
  spk_pub: string
  spk_priv: string
  spk_sig: string
  sign_pub: string
  sign_priv: string
  opks: Array<{ key_id: number; pub: string; priv: string }>
}

// In-memory store
let memKeys: KeyBundle | null = null

export function getKeys(): KeyBundle | null {
  if (memKeys) return memKeys

  // Try localStorage
  const ls = localStorage.getItem(MEM_KEY)
  if (ls) {
    try {
      memKeys = JSON.parse(ls)
      return memKeys
    } catch {}
  }

  // Try sessionStorage
  const ss = sessionStorage.getItem(MEM_KEY)
  if (ss) {
    try {
      memKeys = JSON.parse(ss)
      return memKeys
    } catch {}
  }

  return null
}

export function setKeys(keys: KeyBundle) {
  memKeys = keys
  // Persist to all tiers
  const json = JSON.stringify(keys)
  try { localStorage.setItem(MEM_KEY, json) } catch {}
  try { sessionStorage.setItem(MEM_KEY, json) } catch {}
  saveToIndexedDB(keys).catch(() => {})
}

export function clearKeys() {
  memKeys = null
  try { localStorage.removeItem(MEM_KEY) } catch {}
  try { sessionStorage.removeItem(MEM_KEY) } catch {}
  clearIndexedDB().catch(() => {})
}

export async function loadFromIndexedDB(): Promise<KeyBundle | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const get = store.get('bundle')
        get.onsuccess = () => {
          if (get.result) {
            memKeys = get.result
            // Also persist to other tiers
            const json = JSON.stringify(get.result)
            try { localStorage.setItem(MEM_KEY, json) } catch {}
            try { sessionStorage.setItem(MEM_KEY, json) } catch {}
          }
          resolve(get.result || null)
        }
        get.onerror = () => resolve(null)
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function saveToIndexedDB(keys: KeyBundle): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.put(keys, 'bundle')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    } catch (e) {
      reject(e)
    }
  })
}

async function clearIndexedDB(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onsuccess = () => {
        const db = req.result
        if (db.objectStoreNames.contains(STORE_NAME)) {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          tx.objectStore(STORE_NAME).clear()
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        } else {
          resolve()
        }
      }
      req.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}
