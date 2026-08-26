import { useState } from 'react'
import axios from 'axios'
import api from '../../api'
import { useActivationStore } from '../../store/activationStore'
import { useToastStore } from '../../store/toastStore'
import { Button } from '../Common/Button'

export function KeyActivateBlock() {
  const activateKey = useActivationStore((state) => state.activateKey)
  const showToast = useToastStore((state) => state.showToast)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const code = value.trim().toUpperCase()
    if (!code) return
    setBusy(true)
    try {
      const keyResult = await activateKey(code)
      if (keyResult.ok) {
        showToast(keyResult.message, 'success', 'Ключ активирован')
        setValue('')
        return
      }
      try {
        const { data } = await api.post('/api/promo/redeem', { code })
        const payload = data as { days: number; name: string }
        showToast(`Начислено ${payload.days} дн.: ${payload.name}`, 'success', 'Промокод')
        setValue('')
        return
      } catch {
        /* бонус */
      }
      const { data } = await api.post('/api/bonus/redeem', { code })
      const payload = data as { amount?: number; days?: number; name?: string; kind?: string }
      if (payload.kind === 'BALANCE' || payload.amount) {
        showToast(`На баланс зачислено ${payload.amount} ₽`, 'success', 'Бонус-код')
      } else {
        showToast(`Начислено ${payload.days} дн.: ${payload.name}`, 'success', 'Бонус-код')
      }
      setValue('')
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Не удалось активировать'
      showToast(message || 'Неверный ключ', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="account-activate">
      <h2>Активация ключа</h2>
      <p className="activate-hint">Введите ключ активации</p>
      <input
        className="activate-input"
        value={value}
        onChange={(event) => setValue(event.target.value.toUpperCase())}
        placeholder="xxxx-xxxx-xxxx-xxxx"
        onKeyDown={(event) => {
          if (event.key === 'Enter') void submit()
        }}
      />
      <Button className="activate-btn" disabled={busy || !value.trim()} onClick={() => void submit()}>
        Активировать ключ
      </Button>
    </section>
  )
}
