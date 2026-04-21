/**
 * OneSignal Web SDK v16 integration
 *
 * Handles:
 * 1. SDK initialization with appId from server
 * 2. User login (external_id = PaperPhone user_id) so push targets the right user
 * 3. Subscription ID registration on our server for server-side push
 * 4. Subscription change listener to keep server in sync
 */
import { get, post } from './http'

let initialized = false
let currentExternalId: string | null = null

/** Get the OneSignal global object (v16 deferred pattern) */
function getOneSignal(): any {
  return (window as any).OneSignal
}

/**
 * Initialize OneSignal Web SDK v16.
 * Fetches the App ID from the server so it doesn't need to be hardcoded.
 */
export async function initOneSignal(): Promise<boolean> {
  if (initialized) return true

  const OneSignal = getOneSignal()
  if (!OneSignal) {
    console.warn('[OneSignal] SDK not loaded yet')
    return false
  }

  try {
    // Fetch App ID from server
    const resp = await get<{ onesignal_app_id?: string }>('/api/push/onesignal-app-id')
    const appId = resp.onesignal_app_id
    if (!appId) {
      console.warn('[OneSignal] App ID not configured on server')
      return false
    }

    // Initialize SDK
    await OneSignal.init({
      appId,
      // Let OneSignal manage its own SW alongside our sw.js
      serviceWorkerParam: { scope: '/push/onesignal/' },
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      // Don't show the default prompt — we handle permission ourselves
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: true,
    })

    initialized = true
    console.log('[OneSignal] ✅ SDK initialized with appId:', appId.substring(0, 8) + '...')

    // Listen for subscription changes to keep server in sync
    OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
      console.log('[OneSignal] Subscription changed:', event)
      const subscriptionId = OneSignal.User.PushSubscription.id
      if (subscriptionId) {
        await registerSubscriptionOnServer(subscriptionId)
      }
    })

    return true
  } catch (e) {
    console.error('[OneSignal] Init failed:', e)
    return false
  }
}

/**
 * Login the user so OneSignal maps this browser/device to the right PaperPhone user.
 * This also enables server-side push targeting via external_id.
 */
export async function loginOneSignal(userId: string): Promise<void> {
  if (!initialized) {
    const ok = await initOneSignal()
    if (!ok) return
  }

  const OneSignal = getOneSignal()
  if (!OneSignal) return

  try {
    // Only login if the user changed
    if (currentExternalId === userId) return
    currentExternalId = userId

    // OneSignal.login() sets the external_id
    await OneSignal.login(userId)
    console.log('[OneSignal] ✅ Logged in as:', userId)

    // Request push permission if not yet granted
    const permission = OneSignal.Notifications.permission
    if (!permission) {
      console.log('[OneSignal] Requesting notification permission...')
      await OneSignal.Notifications.requestPermission()
    }

    // Register subscription on our server
    // Retry a few times since subscription ID may take a moment to populate
    let retries = 0
    const maxRetries = 10
    const tryRegister = async () => {
      const subscriptionId = OneSignal.User.PushSubscription.id
      if (subscriptionId) {
        await registerSubscriptionOnServer(subscriptionId)
        return
      }
      retries++
      if (retries < maxRetries) {
        setTimeout(tryRegister, 1000)
      } else {
        console.warn('[OneSignal] Subscription ID not available after retries')
      }
    }
    await tryRegister()
  } catch (e) {
    console.error('[OneSignal] Login failed:', e)
  }
}

/**
 * Logout from OneSignal (on user logout)
 */
export async function logoutOneSignal(): Promise<void> {
  const OneSignal = getOneSignal()
  if (!OneSignal || !initialized) return

  try {
    await OneSignal.logout()
    currentExternalId = null
    console.log('[OneSignal] Logged out')
  } catch (e) {
    console.warn('[OneSignal] Logout failed:', e)
  }
}

/**
 * Register the OneSignal subscription ID on our server.
 * This is the ID used for server-to-OneSignal push targeting.
 */
async function registerSubscriptionOnServer(subscriptionId: string): Promise<void> {
  try {
    await post('/api/push/onesignal', {
      player_id: subscriptionId, // server field is still called player_id
      platform: detectPlatform(),
    })
    console.log('[OneSignal] ✅ Subscription ID registered on server:', subscriptionId.substring(0, 12) + '...')
  } catch (e) {
    console.error('[OneSignal] Failed to register subscription on server:', e)
  }
}

/**
 * Detect the current platform for logging/analytics
 */
function detectPlatform(): string {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  return 'web'
}
