import { FormEvent, useState } from 'react'
import axios from 'axios'
import { authApi } from '../../api'
import { useToastStore } from '../../store/toastStore'
import { Button } from '../Common/Button'
import { Modal } from '../Common/Modal'

interface ForgotPasswordModalProps {
  onClose: () => void
  defaultEmail?: string
}

export function ForgotPasswordModal({ onClose, defaultEmail = '' }: ForgotPasswordModalProps) {
  const showToast = useToastStore((state) => state.showToast)
  const [email, setEmail] = useState(defaultEmail)
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
    <Modal title="Сброс пароля" onClose={onClose}>
      {done ? (
        <p className="page-text">Проверьте почту. Если письма нет, загляните в спам.</p>
      ) : (
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <p className="page-text">Отправим ссылку для нового пароля на email аккаунта.</p>
          <label className="profile-field">
            <span>Email</span>
            <input
              className="profile-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Отправляем…' : 'Отправить ссылку'}
          </Button>
        </form>
      )}
    </Modal>
  )
}
