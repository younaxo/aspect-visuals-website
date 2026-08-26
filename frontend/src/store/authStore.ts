import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { User, UserSettings } from '../types'
import { DEFAULT_SETTINGS } from '../utils/settings'

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
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
      logout: () =>
        set({
          user: null,
          settings: DEFAULT_SETTINGS,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'aspect-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
