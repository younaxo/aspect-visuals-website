import { useState } from 'react'
import axios from 'axios'
import api from '../api'
import type { DiscordAuthUrl } from '../types'

export function getDiscordAvatarUrl(discordId: string, avatar?: string | null): string {
  if (!avatar) {
    return `https://cdn.discordapp.com/embed/avatars/${Number(discordId) % 5}.png`
  }

  const format = avatar.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${format}`
}

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

  const login = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { data } = await api.get<DiscordAuthUrl>('/api/auth/discord')
      window.location.href = data.url
    } catch (err: unknown) {
      setIsLoading(false)
      setError(getErrorMessage(err))
    }
  }

  return {
    login,
    isLoading,
    error,
    getAvatarUrl: getDiscordAvatarUrl,
  }
}
