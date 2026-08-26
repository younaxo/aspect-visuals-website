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
  const [busy, setBusy] = useState(false)

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
    if (processedCodes.has(code) || busy) return
    processedCodes.add(code)
    setBusy(true)

    loginWithDiscord({ code, state })
      .then(() => navigate('/', { replace: true }))
      .catch((err: unknown) => {
        processedCodes.delete(code)
        const message = err instanceof Error ? err.message : 'Не удалось войти через Discord'
        setError(message)
        setBusy(false)
      })
  }, [busy, loginWithDiscord, navigate, params])

  if (error) {
    return (
      <section className="content-panel">
        <h1 className="page-title">Вход через Discord</h1>
        <p className="page-text error-text">{error}</p>
        <div className="hero-actions" style={{ marginTop: 20 }}>
          <button type="button" className="btn-primary" onClick={() => navigate('/', { replace: true })}>
            На главную
          </button>
        </div>
      </section>
    )
  }

  return <Loader label="Входим через Discord…" progress={64} />
}
