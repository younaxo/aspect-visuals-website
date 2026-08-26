import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../Common/Logo'
import { authApi } from '../../api'
import { useToastStore } from '../../store/toastStore'
import axios from 'axios'

export function ForgotPasswordPage() {
  const showToast = useToastStore((state) => state.showToast)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
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
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <Logo className="h-7 w-7" />
          </div>
          <div>
            <p className="auth-brand-title">Aspect Visuals</p>
            <p className="auth-brand-sub">Восстановление пароля</p>
          </div>
        </div>
        {done ? (
          <p className="auth-brand-sub" style={{ marginBottom: 16 }}>
            Проверьте почту. Если письма нет, загляните в спам.
          </p>
        ) : (
          <form className="auth-form-gate" onSubmit={(event) => void submit(event)}>
            <label className="auth-label-wrap">
              <span className="auth-label">Email</span>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? 'Отправляем…' : 'Отправить ссылку'}
            </button>
            <p className="auth-error">{error}</p>
          </form>
        )}
        <Link to="/login" className="auth-forgot">
          Назад ко входу
        </Link>
      </div>
    </div>
  )
}
