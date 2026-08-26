import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Loader } from '../components/Common/Loader'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'

const processedCodes = new Set<string>()

export function DiscordCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithDiscord, linkDiscord } = useAuth()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const showToast = useToastStore((state) => state.showToast)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const oauthError = params.get('error')
    if (oauthError) {
      setError(oauthError === 'access_denied' ? 'Действие через Discord отменено' : 'Не удалось завершить Discord OAuth')
      return
    }

    const code = params.get('code')
    const state = params.get('state') ?? undefined
    if (!code) {
      setError('Код авторизации Discord не получен')
      return
    }

    if (processedCodes.has(code) || busy) return
    processedCodes.add(code)
    setBusy(true)

    const intent = sessionStorage.getItem('discord_oauth_intent')
    sessionStorage.removeItem('discord_oauth_intent')
    const linking = intent === 'link' || isAuthenticated

    const run = linking ? linkDiscord(code, state) : loginWithDiscord({ code, state })

    run
      .then(() => {
        showToast(linking ? 'Discord привязан' : 'Вы вошли через Discord', 'success')
        navigate(linking ? '/profile' : '/', { replace: true })
      })
      .catch((err: unknown) => {
        const message = axios.isAxiosError(err)
          ? (err.response?.data as { message?: string })?.message
          : err instanceof Error
            ? err.message
            : linking
              ? 'Не удалось привязать Discord'
              : 'Не удалось войти через Discord'
        setError(message || 'Ошибка Discord')
        showToast(message || 'Ошибка Discord', 'error')
        setBusy(false)
      })
  }, [busy, isAuthenticated, linkDiscord, loginWithDiscord, navigate, params, showToast])

  if (error) {
    return (
      <section className="content-panel">
        <h1 className="page-title">Discord</h1>
        <p className="page-text error-text">{error}</p>
        <div className="hero-actions" style={{ marginTop: 20 }}>
          <button type="button" className="btn-primary" onClick={() => navigate('/login', { replace: true })}>
            Ко входу
          </button>
        </div>
      </section>
    )
  }

  return <Loader label={isAuthenticated ? 'Привязываем Discord…' : 'Входим через Discord…'} progress={64} />
}
