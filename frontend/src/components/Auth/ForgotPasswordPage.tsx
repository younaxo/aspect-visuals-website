import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../Common/Button'
import { authApi } from '../../api'
import { useToastStore } from '../../store/toastStore'
import axios from 'axios'

export function ForgotPasswordPage() {
  const showToast = useToastStore((state) => state.showToast)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await authApi.forgotPassword(email)
      setDone(true)
      showToast('Если аккаунт существует, ссылка отправлена', 'success')
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message || 'Не удалось отправить ссылку'
        : 'Не удалось отправить ссылку'
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page content-panel">
      <h1 className="page-title">Восстановление пароля</h1>
      <p className="page-text">Укажите email — отправим ссылку для сброса пароля.</p>

      {done ? (
        <p className="page-text">Проверьте почту. Если письма нет, загляните в спам или логи сервера в разработке.</p>
      ) : (
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label className="profile-field">
            <span>Email</span>
            <input
              className="profile-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Отправляем…' : 'Отправить ссылку'}
          </Button>
        </form>
      )}

      <p className="auth-links">
        <Link to="/login">Назад ко входу</Link>
      </p>
    </section>
  )
}
