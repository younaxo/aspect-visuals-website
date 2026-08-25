import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api'
import { useAuthStore } from '../store/authStore'
import type { AuthResponse, User } from '../types'

interface DiscordLoginPayload {
  code: string
}

export function useAuth() {
  const queryClient = useQueryClient()
  const { user, accessToken, isAuthenticated, setAuth, logout: clearAuth } = useAuthStore()

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get<{ user: User }>('/api/auth/me')
      useAuthStore.getState().setUser(data.user)
      return data.user
    },
    enabled: Boolean(accessToken),
    retry: false,
  })

  const discordLogin = useMutation({
    mutationFn: async ({ code }: DiscordLoginPayload) => {
      const { data } = await api.post<AuthResponse>('/api/auth/discord', { code })
      return data
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      queryClient.setQueryData(['auth', 'me'], data.user)
    },
  })

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // Даже если сервер недоступен, очищаем локальную сессию
    } finally {
      clearAuth()
      queryClient.removeQueries({ queryKey: ['auth'] })
    }
  }, [clearAuth, queryClient])

  return {
    user: meQuery.data ?? user,
    isAuthenticated,
    isLoading: meQuery.isLoading || discordLogin.isPending,
    error: meQuery.error ?? discordLogin.error,
    loginWithDiscord: discordLogin.mutateAsync,
    logout,
  }
}
