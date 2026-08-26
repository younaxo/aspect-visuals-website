import { useState } from 'react'
import axios from 'axios'
import api from '../../api'
import { useActivationStore } from '../../store/activationStore'
import { useToastStore } from '../../store/toastStore'

type ActivateKind = 'key' | 'promo' | 'bonus'

const KINDS: Array<{ id: ActivateKind; label: string; hint: string; placeholder: string; button: string }> = [
  {
    id: 'key',
    label: 'Ключ',
    hint: 'Введите ключ активации товара или подписки',
    placeholder: 'xxxx-xxxx-xxxx-xxxx',
    button: 'Активировать ключ',
  },
  {
    id: 'promo',
    label: 'Промокод',
    hint: 'Промокод на дни подписки (BASIC / PREMIUM)',
    placeholder: 'PROMO-XXXX',
    button: 'Активировать промокод',
  },
  {
    id: 'bonus',
    label: 'Бонус-код',
    hint: 'Бонус-код начисляет деньги на баланс',
    placeholder: 'BONUS-XXXX',
    button: 'Активировать бонус',
  },
]

export function KeyActivateBlock() {
  const activateKey = useActivationStore((state) => state.activateKey)
  const showToast = useToastStore((state) => state.showToast)
  const [kind, setKind] = useState<ActivateKind>('key')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const meta = KINDS.find((item) => item.id === kind)!

  const submit = async () => {
    const code = value.trim().toUpperCase()
    if (!code) return
    setBusy(true)
    try {
      if (kind === 'key') {
        const result = await activateKey(code)
        if (!result.ok) {
          showToast(result.message, 'error', 'Ошибка активации')
          return
        }
        showToast(result.message, 'success', 'Ключ активирован')
      } else if (kind === 'promo') {
        const { data } = await api.post('/api/promo/redeem', { code })
        const payload = data as { days: number; name: string }
        showToast(`Начислено ${payload.days} дн.: ${payload.name}`, 'success', 'Промокод')
      } else {
        const { data } = await api.post('/api/bonus/redeem', { code })
        const payload = data as { amount?: number; days?: number; name?: string; kind?: string }
        if (payload.kind === 'BALANCE' || payload.amount) {
          showToast(`На баланс зачислено ${payload.amount} ₽`, 'success', 'Бонус-код')
        } else {
          showToast(`Начислено ${payload.days} дн.: ${payload.name}`, 'success', 'Бонус-код')
        }
      }
      setValue('')
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Не удалось активировать'
      showToast(message || 'Неверный код', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="account-activate">
      <h2>Активация</h2>
      <div className="activate-kinds" role="tablist" aria-label="Что активировать">
        {KINDS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={kind === item.id}
            className={`activate-kind ${kind === item.id ? 'is-active' : ''}`}
            onClick={() => {
              setKind(item.id)
              setValue('')
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="activate-hint">{meta.hint}</p>
      <input
        className="activate-input"
        value={value}
        onChange={(event) => setValue(event.target.value.toUpperCase())}
        placeholder={meta.placeholder}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void submit()
        }}
      />
      <button
        type="button"
        className="activate-btn"
        disabled={busy || !value.trim()}
        onClick={() => void submit()}
      >
        {busy ? 'Проверяем…' : meta.button}
      </button>
    </section>
  )
}
