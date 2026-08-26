import { create } from 'zustand'
import axios from 'axios'
import api from '../api'
import { useCartStore } from './cartStore'

export interface AppliedPromo {
  id: string
  code: string
  type: string
  value: number
}

interface PromoState {
  promoCode: AppliedPromo | null
  discount: number
  error: string | null
  applyPromo: (code: string, amount: number) => Promise<boolean>
  validatePromo: (code: string, amount: number) => Promise<boolean>
  removePromo: () => Promise<void>
  clearPromo: () => void
}

export const usePromoStore = create<PromoState>((set) => ({
  promoCode: null,
  discount: 0,
  error: null,
  applyPromo: async (code, amount) => {
    const normalized = code.trim().toUpperCase()
    const cart = useCartStore.getState()
    if (cart.promoDiscount > 0 && cart.promoCode && cart.promoCode !== normalized) {
      set({ error: 'Промокод нельзя применить поверх другой скидки' })
      return false
    }
    try {
      const { data } = await api.post('/api/promo/apply', { code: normalized, amount })
      const payload = data as { promo: AppliedPromo; discount: number }
      useCartStore.getState().applyPromo(payload.promo.code, payload.discount)
      set({ promoCode: payload.promo, discount: payload.discount, error: null })
      return true
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Промокод недействителен'
      set({ error: message || 'Промокод недействителен', promoCode: null, discount: 0 })
      useCartStore.getState().removePromo()
      return false
    }
  },
  validatePromo: async (code, amount) => {
    try {
      await api.post('/api/promo/validate', { code: code.trim().toUpperCase(), amount })
      set({ error: null })
      return true
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Промокод недействителен'
      set({ error: message || 'Промокод недействителен' })
      return false
    }
  },
  removePromo: async () => {
    try {
      await api.delete('/api/promo/remove')
    } catch {
      // локально всё равно снимаем
    }
    useCartStore.getState().removePromo()
    set({ promoCode: null, discount: 0, error: null })
  },
  clearPromo: () => {
    useCartStore.getState().removePromo()
    set({ promoCode: null, discount: 0, error: null })
  },
}))
