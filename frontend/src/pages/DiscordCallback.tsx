import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader } from '../components/Common/Loader'
import { useAuth } from '../hooks/useAuth'

const processedCodes = new Set<string>()

export function DiscordCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithDiscord } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const oauthError = params.get('error')
    if (oauthError) {
      setError(oauthError === 'access_denied' ? 'Вход через Discord отменён' : 'Не удалось войти через Discord')
      return
    }

    const code = params.get('code')
    const state = params.get('state') ?? undefined
    if (!code) {
      setError('Код авторизации Discord не получен')
      return
    }

    // Код Discord одноразовый: защищаемся от повторного вызова в React StrictMode
    if (processedCodes.has(code)) return
    processedCodes.add(code)

    loginWithDiscord({ code, state })
      .then(() => navigate('/', { replace: true }))
      .catch((err: unknown) => {
        processedCodes.delete(code)
        const message = err instanceof Error ? err.message : 'Не удалось войти через Discord'
        setError(message)
      })
  }, [loginWithDiscord, navigate, params])

  if (error) {
    return (
      <section className="content-panel">
        <h1 className="page-title">Вход через Discord</h1>
        <p className="page-text error-text">{error}</p>
      </section>
    )
  }

  return <Loader label="Входим через Discord…" progress={64} />
}
