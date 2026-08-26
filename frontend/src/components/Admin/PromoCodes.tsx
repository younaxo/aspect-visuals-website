import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '../../api'
import { Button } from '../Common/Button'
import { useToastStore } from '../../store/toastStore'

interface PromoRow {
  id: string
  code: string
  type: string
  value: number
  minOrderAmount: number
  validUntil: string | null
  maxUses: number
  usedCount: number
  uses: number
  isActive: boolean
}

const emptyForm = {
  code: '',
  type: 'PERCENTAGE',
  value: '10',
  minOrderAmount: '0',
  validUntil: '',
  maxUses: '10',
}

export function PromoCodes() {
  const showToast = useToastStore((state) => state.showToast)
  const [items, setItems] = useState<PromoRow[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await api.get('/api/admin/promo')
    setItems((data as { promoCodes: PromoRow[] }).promoCodes)
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    setBusy(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minOrderAmount: Number(form.minOrderAmount) || 0,
        validUntil: form.validUntil || null,
        maxUses: Number(form.maxUses) || 1,
      }
      if (editingId) {
        await api.put(`/api/admin/promo/${editingId}`, payload)
        showToast('Промокод обновлён', 'success')
      } else {
        await api.post('/api/admin/promo', payload)
        showToast('Промокод создан', 'success')
      }
      setForm(emptyForm)
      setEditingId(null)
      await load()
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Не удалось сохранить'
      showToast(message || 'Не удалось сохранить', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    await api.delete(`/api/admin/promo/${id}`)
    showToast('Промокод деактивирован, история сохранена', 'info')
    await load()
  }

  return (
    <div className="admin-grid">
      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">{editingId ? 'Редактирование' : 'Новый промокод'}</h2>
        <div className="admin-form">
          <label className="profile-field">
            <span>Код</span>
            <input
              className="profile-input"
              value={form.code}
              disabled={Boolean(editingId)}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
            />
          </label>
          <div className="admin-form-row">
            <label className="profile-field">
              <span>Тип скидки</span>
              <select
                className="profile-input"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                <option value="PERCENTAGE">Процент</option>
                <option value="FIXED">Фиксированная сумма</option>
              </select>
            </label>
            <label className="profile-field">
              <span>Значение</span>
              <input
                className="profile-input"
                type="number"
                value={form.value}
                onChange={(event) => setForm({ ...form, value: event.target.value })}
              />
            </label>
          </div>
          <div className="admin-form-row">
            <label className="profile-field">
              <span>Минимальная сумма, ₽</span>
              <input
                className="profile-input"
                type="number"
                value={form.minOrderAmount}
                onChange={(event) => setForm({ ...form, minOrderAmount: event.target.value })}
              />
            </label>
            <label className="profile-field">
              <span>Максимум использований</span>
              <input
                className="profile-input"
                type="number"
                value={form.maxUses}
                onChange={(event) => setForm({ ...form, maxUses: event.target.value })}
              />
            </label>
          </div>
          <label className="profile-field">
            <span>Дата окончания</span>
            <input
              className="profile-input"
              type="date"
              value={form.validUntil}
              onChange={(event) => setForm({ ...form, validUntil: event.target.value })}
            />
          </label>
          <Button disabled={busy} onClick={() => void save()}>
            {editingId ? 'Сохранить' : 'Создать промокод'}
          </Button>
        </div>
      </article>

      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">Активные и архивные</h2>
        <ul className="admin-list">
          {items.map((item) => (
            <li key={item.id} className={`admin-list-item ${item.isActive ? '' : 'is-off'}`}>
              <div>
                <strong className="admin-code">{item.code}</strong>
                <p className="page-text">
                  {item.type === 'PERCENTAGE' ? `${item.value}%` : `${item.value} ₽`} · мин. {item.minOrderAmount} ₽ ·{' '}
                  {item.usedCount}/{item.maxUses}
                  {!item.isActive ? ' · выключен' : ''}
                </p>
              </div>
              <div className="shop-sub-actions">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingId(item.id)
                    setForm({
                      code: item.code,
                      type: item.type,
                      value: String(item.value),
                      minOrderAmount: String(item.minOrderAmount),
                      validUntil: item.validUntil ? item.validUntil.slice(0, 10) : '',
                      maxUses: String(item.maxUses),
                    })
                  }}
                >
                  Изменить
                </Button>
                <Button variant="ghost" onClick={() => void remove(item.id)}>
                  Выключить
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}
