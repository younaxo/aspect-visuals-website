import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Button } from '../Common/Button'
import api, { authApi } from '../../api'
import { useToastStore } from '../../store/toastStore'

interface ResetCheck {
  valid: boolean
  reason?: string
  message?: string
}

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  return fallback
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.showToast)
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ссылку проверяем сразу при открытии, чтобы не заполнять форму впустую.
  // Токен при этой проверке не расходуется.
  const checkQuery = useQuery({
    queryKey: ['reset-check', token],
    queryFn: async () => {
      const { data } = await api.get('/api/auth/reset-password/check', { params: { token } })
      return data as ResetCheck
    },
    enabled: Boolean(token),
    retry: false,
  })

  const linkBroken = !token || checkQuery.isError
  const linkMessage = !token
    ? 'В ссылке нет токена сброса'
    : errorMessage(checkQuery.error, 'Ссылка недействительна. Запросите новую.')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

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
      const message = errorMessage(err, 'Не удалось сбросить пароль')
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page content-panel liquid-glass ui-modal size-sm" style={{ margin: '40px auto' }}>
      <h1 className="page-title">Новый пароль</h1>

      {checkQuery.isPending && token && <p className="page-text">Проверяем ссылку…</p>}

      {linkBroken && (
        <>
          <p className="error-text">{linkMessage}</p>
          <p className="page-text">Ссылка действует один час и срабатывает один раз.</p>
          <Link to="/forgot-password">
            <Button>Запросить новую ссылку</Button>
          </Link>
        </>
      )}

      {checkQuery.data?.valid && (
        <>
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
        </>
      )}

      <p className="auth-links">
        <Link to="/login">Войти</Link>
      </p>
    </section>
  )
}
