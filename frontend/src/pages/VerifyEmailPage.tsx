import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { authApi } from '../api'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('Подтверждаем email…')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('В ссылке нет токена подтверждения')
      return
    }

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('ok')
        setMessage('Email подтверждён. Можно пользоваться аккаунтом.')
      })
      .catch((err: unknown) => {
        setStatus('error')
        const text = axios.isAxiosError(err)
          ? (err.response?.data as { message?: string })?.message
          : undefined
        setMessage(text || 'Не удалось подтвердить email')
      })
  }, [token])

  return (
    <section className="auth-page content-panel">
      <h1 className="page-title">Подтверждение email</h1>
      <p className={`page-text ${status === 'error' ? 'error-text' : ''}`}>{message}</p>
      <p className="auth-links">
        <Link to="/login">Войти</Link>
      </p>
    </section>
  )
}
