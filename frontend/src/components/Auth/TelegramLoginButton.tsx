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
  turnstileToken?: string
}

export function TelegramLoginButton({ onError, turnstileToken }: TelegramLoginButtonProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [busy, setBusy] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    const mount = async () => {
      try {
        const { data } = await api.get<{ botUsername: string }>('/api/auth/telegram/config')
        if (cancelled || !hostRef.current || !data.botUsername) {
          if (!cancelled) setAvailable(false)
          return
        }

        window.onTelegramAuth = async (user) => {
          setBusy(true)
          try {
            const { data: auth } = await api.post<AuthResponse>('/api/auth/telegram', {
              ...user,
              turnstileToken,
            })
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
        script.onerror = () => {
          if (!cancelled) setAvailable(false)
        }
        hostRef.current.appendChild(script)
        setAvailable(true)
      } catch {
        if (!cancelled) setAvailable(false)
      }
    }

    void mount()
    return () => {
      cancelled = true
      delete window.onTelegramAuth
    }
  }, [navigate, onError, setAuth, turnstileToken])

  if (available === false) {
    return (
      <button type="button" className="auth-oauth-btn" disabled>
        <svg className="icon icon-fill" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 6.63c-.684.276-1.14.85-1.14 1.5 0 .52.316.98.84 1.24l4.18 2.05 1.66 5.74c.18.63.75 1.04 1.38.95.4-.05.74-.28.95-.62l2.35-3.9 4.56 3.36c.55.4 1.3.3 1.68-.22.2-.28.26-.62.18-.95L21.9 4.02c.18-.76-.2-1.35-.7-1.59z" />
        </svg>
        Войти через Telegram
        <span className="auth-oauth-hint">пока недоступно</span>
      </button>
    )
  }

  return (
    <div className="telegram-login-wrap">
      {busy ? <p className="page-text">Входим…</p> : null}
      {available === null ? (
        <button type="button" className="auth-oauth-btn" disabled>
          Войти через Telegram
        </button>
      ) : null}
      <div ref={hostRef} />
    </div>
  )
}
