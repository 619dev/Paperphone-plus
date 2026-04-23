/**
 * Platform detection utilities for Capacitor native vs Web environment.
 */

/**
 * Returns true when running inside a Capacitor native shell (Android/iOS).
 * In a browser / PWA context this returns false.
 */
export function isNativePlatform(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

/**
 * Returns the platform string: 'android' | 'ios' | 'web'
 */
export function getPlatform(): 'android' | 'ios' | 'web' {
  const cap = (window as any).Capacitor
  if (!cap) return 'web'
  const platform = cap.getPlatform?.()
  if (platform === 'android') return 'android'
  if (platform === 'ios') return 'ios'
  return 'web'
}
