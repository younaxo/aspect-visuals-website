import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { useAuthStore } from '../../store/authStore'
import type { AuthResponse } from '../../types'

interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void
  }
}

interface TelegramLoginButtonProps {
  onError: (message: string) => void
}

export function TelegramLoginButton({ onError }: TelegramLoginButtonProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    const mount = async () => {
      try {
        const { data } = await api.get<{ botUsername: string }>('/api/auth/telegram/config')
        if (cancelled || !hostRef.current) return

        window.onTelegramAuth = async (user) => {
          setBusy(true)
          try {
            const { data: auth } = await api.post<AuthResponse>('/api/auth/telegram', user)
            setAuth(auth.user, auth.accessToken, auth.refreshToken, auth.settings)
            navigate('/', { replace: true })
          } catch (error) {
            const message = axios.isAxiosError(error)
              ? (error.response?.data as { message?: string })?.message || 'Не удалось войти через Telegram'
              : 'Не удалось войти через Telegram'
            onError(message)
          } finally {
            setBusy(false)
          }
        }

        hostRef.current.innerHTML = ''
        const script = document.createElement('script')
        script.src = 'https://telegram.org/js/telegram-widget.js?22'
        script.async = true
        script.setAttribute('data-telegram-login', data.botUsername)
        script.setAttribute('data-size', 'large')
        script.setAttribute('data-userpic', 'false')
        script.setAttribute('data-request-access', 'write')
        script.setAttribute('data-onauth', 'onTelegramAuth(user)')
        hostRef.current.appendChild(script)
      } catch {
        onError('Telegram-бот ещё не настроен на сервере')
      }
    }

    void mount()
    return () => {
      cancelled = true
      delete window.onTelegramAuth
    }
  }, [navigate, onError, setAuth])

  return (
    <div className="telegram-login-wrap">
      {busy ? <p className="page-text">Входим…</p> : null}
      <div ref={hostRef} />
    </div>
  )
}
