import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '../../api'
import { Button } from '../Common/Button'
import { useToastStore } from '../../store/toastStore'

interface BonusRow {
  id: string
  code: string
  days: number
  subscriptionType: string
  maxUses: number
  usedCount: number
  isActive: boolean
  validUntil: string | null
}

const emptyForm = {
  code: '',
  days: '7',
  subscriptionType: 'BASIC',
  maxUses: '50',
  validUntil: '',
}

export function BonusCodes() {
  const showToast = useToastStore((state) => state.showToast)
  const [items, setItems] = useState<BonusRow[]>([])
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await api.get('/api/admin/bonus')
    setItems((data as { bonusCodes: BonusRow[] }).bonusCodes)
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    setBusy(true)
    try {
      await api.post('/api/admin/bonus', {
        code: form.code.trim().toUpperCase(),
        days: Number(form.days),
        subscriptionType: form.subscriptionType,
        maxUses: Number(form.maxUses),
        validUntil: form.validUntil || null,
      })
      showToast('Бонус-код создан', 'success')
      setForm(emptyForm)
      await load()
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Не удалось создать'
      showToast(message || 'Не удалось создать', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-grid">
      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">Новый бонус-код</h2>
        <p className="page-text">Начисляет дни подписки напрямую, без оплаты.</p>
        <div className="admin-form">
          <label className="profile-field">
            <span>Код</span>
            <input
              className="profile-input"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
            />
          </label>
          <div className="admin-form-row">
            <label className="profile-field">
              <span>Дней</span>
              <input
                className="profile-input"
                type="number"
                min={1}
                value={form.days}
                onChange={(event) => setForm({ ...form, days: event.target.value })}
              />
            </label>
            <label className="profile-field">
              <span>Подписка</span>
              <select
                className="profile-input"
                value={form.subscriptionType}
                onChange={(event) => setForm({ ...form, subscriptionType: event.target.value })}
              >
                <option value="BASIC">Базовая</option>
                <option value="PREMIUM">Премиум</option>
              </select>
            </label>
          </div>
          <div className="admin-form-row">
            <label className="profile-field">
              <span>Максимум использований</span>
              <input
                className="profile-input"
                type="number"
                value={form.maxUses}
                onChange={(event) => setForm({ ...form, maxUses: event.target.value })}
              />
            </label>
            <label className="profile-field">
              <span>Дата окончания</span>
              <input
                className="profile-input"
                type="date"
                value={form.validUntil}
                onChange={(event) => setForm({ ...form, validUntil: event.target.value })}
              />
            </label>
          </div>
          <Button disabled={busy || !form.code.trim()} onClick={() => void save()}>
            Создать бонус-код
          </Button>
        </div>
      </article>

      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">Список</h2>
        <ul className="admin-list">
          {items.map((item) => (
            <li key={item.id} className={`admin-list-item ${item.isActive ? '' : 'is-off'}`}>
              <div>
                <strong className="admin-code">{item.code}</strong>
                <p className="page-text">
                  {item.days} дн. · {item.subscriptionType === 'PREMIUM' ? 'Премиум' : 'Базовая'} · {item.usedCount}/
                  {item.maxUses}
                </p>
              </div>
              {item.isActive && (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await api.delete(`/api/admin/bonus/${item.id}`)
                    await load()
                  }}
                >
                  Выключить
                </Button>
              )}
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}
