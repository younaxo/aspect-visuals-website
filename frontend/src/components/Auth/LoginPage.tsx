import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../Common/Button'
import { useAuth } from '../../hooks/useAuth'
import { useToastStore } from '../../store/toastStore'

export function LoginPage() {
  const navigate = useNavigate()
  const { loginWithEmail } = useAuth()
  const showToast = useToastStore((state) => state.showToast)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await loginWithEmail(email, password)
      showToast('Вы вошли в аккаунт', 'success')
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось войти'
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page content-panel">
      <h1 className="page-title">Вход</h1>
      <p className="page-text">Войдите по email или через привязанный Discord.</p>

      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label className="profile-field">
          <span>Email</span>
          <input
            className="profile-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="profile-field">
          <span>Пароль</span>
          <input
            className="profile-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Входим…' : 'Войти'}
        </Button>
      </form>

      <div className="auth-links">
        <Link to="/forgot-password">Забыли пароль?</Link>
        <Link to="/register">Регистрация</Link>
        <Link to="/discord-login">Войти через Discord</Link>
      </div>
    </section>
  )
}
