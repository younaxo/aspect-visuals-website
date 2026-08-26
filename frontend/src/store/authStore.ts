import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import axios from 'axios'
import { authApi } from '../api'
import type { AuthResponse, User, UserSettings } from '../types'
import { DEFAULT_SETTINGS } from '../utils/settings'

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

interface AuthState {
  user: User | null
  settings: UserSettings
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string, settings?: UserSettings) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: User | null) => void
  updateUser: (data: Partial<User>) => void
  setSettings: (settings: UserSettings) => void
  loginWithEmail: (email: string, password: string, turnstileToken?: string) => Promise<void>
  register: (email: string, password: string, username: string, turnstileToken?: string) => Promise<void>
  logout: () => void
  linkDiscord: (code: string, state?: string) => Promise<void>
  unlinkDiscord: () => Promise<void>
  checkDiscordStatus: () => Promise<boolean>
}

function applyAuth(set: (partial: Partial<AuthState>) => void, data: AuthResponse) {
  set({
    user: data.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    isAuthenticated: true,
    ...(data.settings ? { settings: data.settings } : {}),
  })
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      settings: DEFAULT_SETTINGS,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken, settings) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          ...(settings ? { settings } : {}),
        }),
      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),
      setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),
      setSettings: (settings) => set({ settings }),
      loginWithEmail: async (email, password, turnstileToken) => {
        try {
          const { data } = await authApi.login({ email, password, turnstileToken })
          applyAuth(set, data as AuthResponse)
        } catch (error: unknown) {
          throw new Error(getErrorMessage(error, 'Не удалось войти'))
        }
      },
      register: async (email, password, username, turnstileToken) => {
        try {
          const { data } = await authApi.register({ email, password, username, turnstileToken })
          applyAuth(set, data as AuthResponse)
        } catch (error: unknown) {
          throw new Error(getErrorMessage(error, 'Не удалось зарегистрироваться'))
        }
      },
      logout: () =>
        set({
          user: null,
          settings: DEFAULT_SETTINGS,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
      linkDiscord: async (code, state) => {
        try {
          const { data } = await authApi.linkDiscord({ code, state })
          const user = (data as { user: User }).user
          get().setUser(user)
        } catch (error: unknown) {
          throw new Error(getErrorMessage(error, 'Не удалось привязать Discord'))
        }
      },
      unlinkDiscord: async () => {
        try {
          const { data } = await authApi.unlinkDiscord()
          const user = (data as { user: User }).user
          get().setUser(user)
        } catch (error: unknown) {
          throw new Error(getErrorMessage(error, 'Не удалось отвязать Discord'))
        }
      },
      checkDiscordStatus: async () => {
        try {
          const { data } = await authApi.discordStatus()
          const linked = Boolean((data as { discordLinked?: boolean }).discordLinked)
          get().updateUser({ discordLinked: linked })
          return linked
        } catch (error: unknown) {
          throw new Error(getErrorMessage(error, 'Не удалось проверить привязку Discord'))
        }
      },
    }),
    {
      name: 'aspect-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
