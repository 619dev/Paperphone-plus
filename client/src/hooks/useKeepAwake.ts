import { useEffect } from 'react'

type WakeLockSentinel = EventTarget & {
  released: boolean
  release(): Promise<void>
}

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>
  }
}

/** Keep the screen awake while an activity such as a call or recording is active. */
export function useKeepAwake(enabled: boolean) {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null
    let disposed = false

    const request = async () => {
      if (!enabled || disposed || document.visibilityState !== 'visible') return
      try {
        const wakeLock = (navigator as WakeLockNavigator).wakeLock
        if (!wakeLock) return
        sentinel = await wakeLock.request('screen')
      } catch (error) {
        console.warn('[KeepAwake] Unable to acquire screen wake lock:', error)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) {
        void request()
      }
    }

    void request()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [enabled])
}
