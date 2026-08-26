import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../Common/Button'
import { useAuth } from '../../hooks/useAuth'
import { useToastStore } from '../../store/toastStore'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const showToast = useToastStore((state) => state.showToast)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }

    setBusy(true)
    try {
      await register(email, password, username)
      showToast('Аккаунт создан', 'success')
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось зарегистрироваться'
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page content-panel">
      <h1 className="page-title">Регистрация</h1>
      <p className="page-text">Создайте аккаунт по email. Discord можно привязать позже в профиле.</p>

      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label className="profile-field">
          <span>Имя пользователя</span>
          <input
            className="profile-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength={3}
            maxLength={32}
            required
          />
        </label>
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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>
        <label className="profile-field">
          <span>Подтверждение пароля</span>
          <input
            className="profile-input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            minLength={6}
            required
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Создаём…' : 'Зарегистрироваться'}
        </Button>
      </form>

      <p className="auth-links">
        <Link to="/login">Уже есть аккаунт? Войти</Link>
      </p>
    </section>
  )
}
