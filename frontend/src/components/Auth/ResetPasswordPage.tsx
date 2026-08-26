import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Button } from '../Common/Button'
import { authApi } from '../../api'
import { useToastStore } from '../../store/toastStore'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.showToast)
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError('В ссылке нет токена сброса')
      return
    }

    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }

    setBusy(true)
    try {
      await authApi.resetPassword({ token, newPassword: password })
      showToast('Пароль обновлён', 'success')
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message || 'Не удалось сбросить пароль'
        : 'Не удалось сбросить пароль'
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page content-panel liquid-glass ui-modal size-sm" style={{ margin: '40px auto' }}>
      <h1 className="page-title">Новый пароль</h1>
      <p className="page-text">Придумайте новый пароль для аккаунта.</p>

      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label className="profile-field">
          <span>Новый пароль</span>
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
          <span>Подтверждение</span>
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
          {busy ? 'Сохраняем…' : 'Сбросить пароль'}
        </Button>
      </form>

      <p className="auth-links">
        <Link to="/login">Войти</Link>
      </p>
    </section>
  )
}
