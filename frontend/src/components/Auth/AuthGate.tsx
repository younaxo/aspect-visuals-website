import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../Common/Logo'
import { useAuth } from '../../hooks/useAuth'
import { useDiscord } from '../../hooks/useDiscord'
import { useToastStore } from '../../store/toastStore'
import { ForgotPasswordModal } from './ForgotPasswordModal'
import { TelegramLoginButton } from './TelegramLoginButton'
import { Turnstile, turnstileEnabled } from './Turnstile'

type AuthMode = 'login' | 'register'

interface AuthGateProps {
  mode: AuthMode
}

export function AuthGate({ mode }: AuthGateProps) {
  const navigate = useNavigate()
  const { loginWithEmail, register } = useAuth()
  const { login: discordLogin, isLoading: discordBusy } = useDiscord()
  const showToast = useToastStore((state) => state.showToast)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [errorTone, setErrorTone] = useState<'error' | 'muted'>('error')
  const [forgotOpen, setForgotOpen] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const onTelegramError = useCallback((message: string) => {
    setErrorTone('error')
    setError(message)
  }, [])

  const isSignUp = mode === 'register'

  useEffect(() => {
    setError('')
  }, [mode])

  const setMode = (next: AuthMode) => {
    navigate(next === 'register' ? '/register' : '/login')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setErrorTone('error')

    if (!email.trim() || !password) {
      setError('Заполните email и пароль.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Введите корректный email.')
      return
    }
    if (password.length < 6) {
      setError('Пароль слишком короткий (минимум 6 символов).')
      return
    }
    if (isSignUp) {
      if (nickname.trim().length < 3) {
        setError('Укажите никнейм (минимум 3 символа).')
        return
      }
      if (password !== confirm) {
        setError('Пароли не совпадают.')
        return
      }
    }

    if (turnstileEnabled() && !turnstileToken) {
      setError('Подтвердите капчу CloudFlare.')
      return
    }

    setBusy(true)
    try {
      if (isSignUp) {
        await register(email.trim(), password, nickname.trim(), turnstileToken)
        showToast('Аккаунт создан', 'success')
      } else {
        await loginWithEmail(email.trim(), password, turnstileToken)
        showToast('Вы вошли в аккаунт', 'success')
      }
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка авторизации'
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`auth-gate ${isSignUp ? 'signup' : ''}`}>
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <Logo className="h-7 w-7" />
          </div>
          <div>
            <p className="auth-brand-title">Aspect Visuals</p>
            <p className="auth-brand-sub">Войдите, чтобы продолжить</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isSignUp ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Вход
          </button>
          <button
            type="button"
            className={`auth-tab ${isSignUp ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            Регистрация
          </button>
        </div>

        <form className="auth-form-gate" onSubmit={(event) => void submit(event)} autoComplete="on" noValidate>
          {isSignUp && (
            <label className="auth-label-wrap">
              <span className="auth-label">Никнейм</span>
              <input
                className="auth-input"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Ваш ник"
                autoComplete="nickname"
                maxLength={32}
              />
            </label>
          )}

          <label className="auth-label-wrap">
            <span className="auth-label">Email</span>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="auth-label-wrap">
            <span className="auth-label">Пароль</span>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="минимум 6 символов"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
            {!isSignUp && (
              <div className="auth-forgot-wrap">
                <button type="button" className="auth-forgot" onClick={() => setForgotOpen(true)}>
                  Забыли пароль?
                </button>
              </div>
            )}
          </label>

          {isSignUp && (
            <label className="auth-label-wrap">
              <span className="auth-label">Повтор пароля</span>
              <input
                className="auth-input"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="повторите пароль"
                autoComplete="new-password"
              />
            </label>
          )}

          <Turnstile onToken={setTurnstileToken} />

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Подождите…' : isSignUp ? 'Зарегистрироваться' : 'Войти'}
          </button>

          {!isSignUp && (
            <div className="auth-login-only">
              <div className="auth-or">
                <span>ИЛИ</span>
              </div>
              <div className="auth-oauth">
                <button
                  type="button"
                  className="auth-oauth-btn"
                  disabled={discordBusy}
                  onClick={() => void discordLogin()}
                >
                  <svg className="icon icon-fill" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  {discordBusy ? 'Открываем Discord…' : 'Войти через Discord'}
                </button>
                <TelegramLoginButton onError={onTelegramError} turnstileToken={turnstileToken} />
              </div>
            </div>
          )}

          <p className={`auth-error ${errorTone === 'muted' ? 'is-muted' : ''}`}>{error}</p>
        </form>
      </div>
      {forgotOpen && <ForgotPasswordModal defaultEmail={email} onClose={() => setForgotOpen(false)} />}
    </div>
  )
}
