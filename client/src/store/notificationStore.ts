/**
 * Notification Toast State Management
 *
 * Manages in-app toast notification queue displayed at the top of the screen.
 */
import { create } from 'zustand'

export interface ToastNotification {
  id: string
  type: 'message' | 'call'
  title: string
  body: string
  avatar?: string
  /** Chat ID to navigate to when clicked */
  chatId?: string
  isGroup?: boolean
  /** Auto-dismiss timeout in ms (default 4000) */
  duration?: number
  timestamp: number
}

interface NotificationStore {
  toasts: ToastNotification[]
  showToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void
  dismissToast: (id: string) => void
  clearAll: () => void
}

let toastCounter = 0

export const useNotificationStore = create<NotificationStore>((set) => ({
  toasts: [],

  showToast: (toast) => {
    const id = `toast-${++toastCounter}-${Date.now()}`
    const newToast: ToastNotification = {
      ...toast,
      id,
      timestamp: Date.now(),
      duration: toast.duration ?? 4000,
    }

    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast], // keep max 5
    }))

    // Auto-dismiss
    const timeout = newToast.duration!
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, timeout)
  },

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearAll: () => set({ toasts: [] }),
}))
