/**
 * Capacitor Native Push Notifications (FCM)
 *
 * Used on Android (Capacitor) instead of Web Push / OneSignal.
 * Registers the device's FCM token with our server and handles
 * incoming push notification events.
 */
import { PushNotifications } from '@capacitor/push-notifications'
import { post } from './http'

let registered = false

/**
 * Initialize native push notifications.
 * - Requests permission
 * - Registers with FCM
 * - Sends FCM token to our server
 * - Sets up notification listeners
 */
export async function initNativePush(): Promise<void> {
  if (registered) return

  try {
    // Check / request permission
    let permStatus = await PushNotifications.checkPermissions()
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions()
    }
    if (permStatus.receive !== 'granted') {
      console.warn('[NativePush] Permission not granted')
      return
    }

    // Listen for registration success (FCM token)
    PushNotifications.addListener('registration', async (token) => {
      console.log('[NativePush] ✅ FCM Token:', token.value.substring(0, 20) + '...')
      // Register FCM token on our server
      try {
        await post('/api/push/fcm', {
          fcm_token: token.value,
          platform: 'android',
        })
        console.log('[NativePush] ✅ FCM token registered on server')
      } catch (e) {
        console.error('[NativePush] Failed to register FCM token on server:', e)
      }
    })

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[NativePush] Registration error:', err.error)
    })

    // Listen for incoming push when app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[NativePush] Received in foreground:', notification)
      // The notification is automatically shown by the system.
      // If you want custom handling, you can process it here.
    })

    // Listen for push notification tap (app opened from notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[NativePush] Notification tapped:', action)
      const data = action.notification.data
      // Navigate to chat if the notification contains a chat_id
      if (data?.chat_id) {
        window.location.hash = ''
        window.location.href = `/chat/${data.chat_id}`
      }
    })

    // Register with FCM
    await PushNotifications.register()
    registered = true
    console.log('[NativePush] ✅ Registered with FCM')
  } catch (e) {
    console.error('[NativePush] Init failed:', e)
  }
}

/**
 * Remove FCM token from server on logout.
 */
export async function unregisterNativePush(): Promise<void> {
  if (!registered) return
  try {
    await PushNotifications.removeAllListeners()
    registered = false
    console.log('[NativePush] Unregistered')
  } catch (e) {
    console.error('[NativePush] Unregister failed:', e)
  }
}
