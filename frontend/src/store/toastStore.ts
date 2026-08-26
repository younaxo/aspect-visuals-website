import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'primary' | 'neutral'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message: string
  duration: number
  createdAt: number
}

interface ToastState {
  toasts: ToastItem[]
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void
  dismissToast: (id: string) => void
}

const MAX_TOASTS = 3
const DEFAULT_DURATION = 4200

const DEFAULT_TITLES: Record<ToastType, string> = {
  success: 'Успешно',
  error: 'Ошибка',
  warning: 'Внимание',
  info: 'Уведомление',
  primary: 'Важно',
  neutral: 'Сообщение',
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message, type = 'info', title, duration = DEFAULT_DURATION) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const item: ToastItem = {
      id,
      type,
      title: title || DEFAULT_TITLES[type],
      message,
      duration,
      createdAt: Date.now(),
    }

    set((state) => {
      const next = [...state.toasts, item]
      // Максимум 3: убираем самые старые
      return { toasts: next.slice(-MAX_TOASTS) }
    })
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}))
