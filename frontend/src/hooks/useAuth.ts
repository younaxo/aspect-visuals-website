import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import api from '../api'
import { useAuthStore } from '../store/authStore'
import type { AuthResponse, User, UserSettings } from '../types'

interface DiscordLoginPayload {
  code: string
  state?: string
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function useAuth() {
  const queryClient = useQueryClient()
  const { user, accessToken, isAuthenticated, setAuth, logout: clearAuth } = useAuthStore()

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get<{ user: User; settings?: UserSettings }>('/api/auth/me')
      useAuthStore.getState().setUser(data.user)
      if (data.settings) useAuthStore.getState().setSettings(data.settings)
      return data.user
    },
    enabled: Boolean(accessToken),
    retry: false,
  })

  const discordLogin = useMutation({
    mutationFn: async ({ code, state }: DiscordLoginPayload) => {
      const { data } = await api.post<AuthResponse>('/api/auth/discord/callback', { code, state })
      return data
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken, data.settings)
      queryClient.setQueryData(['auth', 'me'], data.user)
    },
  })

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    await useAuthStore.getState().loginWithEmail(email, password)
    queryClient.setQueryData(['auth', 'me'], useAuthStore.getState().user)
  }, [queryClient])

  const register = useCallback(async (email: string, password: string, username: string) => {
    await useAuthStore.getState().register(email, password, username)
    queryClient.setQueryData(['auth', 'me'], useAuthStore.getState().user)
  }, [queryClient])

  const linkDiscord = useCallback(async (code: string, state?: string) => {
    await useAuthStore.getState().linkDiscord(code, state)
    queryClient.setQueryData(['auth', 'me'], useAuthStore.getState().user)
  }, [queryClient])

  const unlinkDiscord = useCallback(async () => {
    await useAuthStore.getState().unlinkDiscord()
    queryClient.setQueryData(['auth', 'me'], useAuthStore.getState().user)
  }, [queryClient])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {
        refreshToken: useAuthStore.getState().refreshToken,
      })
    } catch {
      // Даже если сервер недоступен, очищаем локальную сессию
    } finally {
      clearAuth()
      queryClient.removeQueries({ queryKey: ['auth'] })
      queryClient.removeQueries({ queryKey: ['profile'] })
      queryClient.removeQueries({ queryKey: ['settings'] })
    }
  }, [clearAuth, queryClient])

  const loginWithDiscord = useCallback(
    async (payload: DiscordLoginPayload) => {
      try {
        return await discordLogin.mutateAsync(payload)
      } catch (error: unknown) {
        throw new Error(getErrorMessage(error, 'Не удалось войти через Discord'))
      }
    },
    [discordLogin.mutateAsync],
  )

  return {
    user: meQuery.data ?? user,
    accessToken,
    isAuthenticated,
    isLoading: (Boolean(accessToken) && meQuery.isLoading) || discordLogin.isPending,
    error: meQuery.error ?? discordLogin.error,
    loginWithDiscord,
    loginWithEmail,
    register,
    linkDiscord,
    unlinkDiscord,
    logout,
  }
}
