import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader } from '../components/Common/Loader'
import { useAuth } from '../hooks/useAuth'

export function DiscordCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithDiscord } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = params.get('code')
    if (!code) {
      setError('Код авторизации Discord не получен')
      return
    }

    loginWithDiscord({ code })
      .then(() => navigate('/', { replace: true }))
      .catch((err: unknown) => {
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
