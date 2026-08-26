import { useState } from 'react'
import axios from 'axios'
import api from '../api'
import type { DiscordAuthUrl } from '../types'
import { getDiscordAvatarUrl } from '../utils/media'

export { getDiscordAvatarUrl }

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  return 'Не удалось начать вход через Discord'
}

export function useDiscord() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startOAuth = async (intent: 'login' | 'link') => {
    try {
      setIsLoading(true)
      setError(null)
      sessionStorage.setItem('discord_oauth_intent', intent)
      const { data } = await api.get<DiscordAuthUrl>('/api/auth/discord', {
        params: intent === 'link' ? { intent: 'link' } : undefined,
      })
      window.location.href = data.url
    } catch (err: unknown) {
      setIsLoading(false)
      sessionStorage.removeItem('discord_oauth_intent')
      setError(getErrorMessage(err))
      throw err
    }
  }

  return {
    login: () => startOAuth('login'),
    link: () => startOAuth('link'),
    isLoading,
    error,
    getAvatarUrl: getDiscordAvatarUrl,
  }
}
