import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '../../api'
import { useActivationStore } from '../../store/activationStore'
import { useToastStore } from '../../store/toastStore'
import { Button } from '../Common/Button'

export function ActivationInput() {
  const activateKey = useActivationStore((state) => state.activateKey)
  const keys = useActivationStore((state) => state.keys)
  const loadUserKeys = useActivationStore((state) => state.loadUserKeys)
  const lastActivated = useActivationStore((state) => state.lastActivated)
  const showToast = useToastStore((state) => state.showToast)
  const [value, setValue] = useState('')
  const [bonus, setBonus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void loadUserKeys()
  }, [loadUserKeys])

  const submit = async () => {
    setBusy(true)
    const result = await activateKey(value.trim().toUpperCase())
    setBusy(false)
    if (result.ok) {
      showToast(result.message, 'success', 'Ключ активирован')
      setValue('')
    } else {
      showToast(result.message, 'error', 'Ошибка активации')
    }
  }

  const redeemBonus = async () => {
    setBusy(true)
    try {
      const { data } = await api.post('/api/bonus/redeem', { code: bonus.trim().toUpperCase() })
      const payload = data as { days: number; name: string }
      showToast(`Начислено ${payload.days} дн.: ${payload.name}`, 'success', 'Бонус-код')
      setBonus('')
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Не удалось применить бонус-код'
      showToast(message || 'Неверный бонус-код', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="profile-section" aria-label="Ключ активации">
      <h2>Ключ активации</h2>
      <label className="profile-field">
        <span>XXXX-XXXX-XXXX</span>
        <div className="cart-promo">
          <input
            className="profile-input"
            value={value}
            onChange={(event) => setValue(event.target.value.toUpperCase())}
            placeholder="ABCD-EFGH-IJKL"
          />
          <Button disabled={busy || !value.trim()} onClick={() => void submit()}>
            Активировать
          </Button>
        </div>
      </label>
      <label className="profile-field">
        <span>Бонус-код</span>
        <div className="cart-promo">
          <input
            className="profile-input"
            value={bonus}
            onChange={(event) => setBonus(event.target.value.toUpperCase())}
            placeholder="BONUS2026"
          />
          <Button disabled={busy || !bonus.trim()} onClick={() => void redeemBonus()}>
            Применить
          </Button>
        </div>
      </label>
      {lastActivated && <p className="promo-ok">Получено: {lastActivated}</p>}
      {keys.length > 0 && (
        <ul className="cart-list">
          {keys.map((item) => (
            <li key={item.id} className="cart-item">
              <span>{item.key}</span>
              <strong>{item.itemName}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
