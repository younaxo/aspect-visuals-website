import { create } from 'zustand'
import axios from 'axios'
import api from '../api'

export interface UserActivationKey {
  id: string
  key: string
  itemName: string
  isUsed: boolean
  usedAt: string | null
}

interface ActivationState {
  keys: UserActivationKey[]
  lastActivated: string | null
  activateKey: (key: string) => Promise<{ ok: boolean; message: string; itemName?: string }>
  checkKey: (key: string) => Promise<{ valid: boolean; message: string; itemName?: string }>
  loadUserKeys: () => Promise<void>
}

export const useActivationStore = create<ActivationState>((set, get) => ({
  keys: [],
  lastActivated: null,
  activateKey: async (key) => {
    try {
      const { data } = await api.post('/api/activation/activate', { key })
      const payload = data as { itemName: string }
      set({ lastActivated: payload.itemName })
      await get().loadUserKeys()
      return { ok: true, message: `Активировано: ${payload.itemName}`, itemName: payload.itemName }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Не удалось активировать ключ'
      return { ok: false, message: message || 'Неверный ключ' }
    }
  },
  checkKey: async (key) => {
    try {
      const { data } = await api.post('/api/activation/check', { key })
      const payload = data as { valid: boolean; message?: string; itemName?: string; isUsed?: boolean }
      if (!payload.valid) {
        return {
          valid: false,
          message: payload.isUsed ? 'Ключ уже использован' : payload.message || 'Ключ недействителен',
        }
      }
      return { valid: true, message: 'Ключ действителен', itemName: payload.itemName }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Неверный ключ'
      return { valid: false, message: message || 'Неверный ключ' }
    }
  },
  loadUserKeys: async () => {
    const { data } = await api.get('/api/activation/keys')
    set({ keys: (data as { keys: UserActivationKey[] }).keys })
  },
}))
