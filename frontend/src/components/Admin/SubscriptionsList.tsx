import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '../../api'
import { Button } from '../Common/Button'
import { CustomSelect } from '../Common/CustomSelect'
import { useToastStore } from '../../store/toastStore'

const empty = {
  name: '',
  description: '',
  price: '199',
  duration: '30',
  type: 'BASIC',
  discordRoleId: '',
  isActive: true,
}

export function SubscriptionsList() {
  const showToast = useToastStore((s) => s.showToast)
  const [items, setItems] = useState<Array<typeof empty & { id: string }>>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = async () => {
    const { data } = await api.get('/api/admin/subscriptions')
    setItems((data as { subscriptions: Array<typeof empty & { id: string }> }).subscriptions)
  }
  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    const payload = { ...form, price: Number(form.price), duration: Number(form.duration), discordRoleId: form.discordRoleId || null }
    try {
      if (editingId) await api.put(`/api/admin/subscriptions/${editingId}`, payload)
      else await api.post('/api/admin/subscriptions', payload)
      showToast('Подписка сохранена', 'success')
      setForm(empty)
      setEditingId(null)
      await load()
    } catch (error) {
      const message = axios.isAxiosError(error) ? (error.response?.data as { message?: string })?.message : 'Ошибка'
      showToast(message || 'Ошибка', 'error')
    }
  }

  return (
    <div className="admin-grid">
      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">{editingId ? 'Редактирование' : 'Создать подписку'}</h2>
        <div className="admin-form">
          <input className="profile-input" placeholder="Название" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea className="profile-input" placeholder="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="admin-form-row">
            <input className="profile-input" type="number" placeholder="Цена" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input className="profile-input" type="number" placeholder="Дней (0 — навсегда)" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          </div>
          <div className="admin-form-row">
            <CustomSelect
              value={form.type}
              onChange={(type) => setForm({ ...form, type })}
              options={[
                { value: 'BASIC', label: 'BASIC' },
                { value: 'PREMIUM', label: 'PREMIUM' },
                { value: 'LIFETIME', label: 'LIFETIME' },
              ]}
            />
            <input className="profile-input" placeholder="Discord роль" value={form.discordRoleId} onChange={(e) => setForm({ ...form, discordRoleId: e.target.value })} />
          </div>
          <label className="profile-field">
            <span>Активна</span>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          </label>
          <Button onClick={() => void save()}>{editingId ? 'Сохранить' : 'Создать'}</Button>
        </div>
      </article>
      <article className="admin-card liquid-glass">
        <ul className="admin-list">
          {items.map((item) => (
            <li key={item.id} className={`admin-list-item ${item.isActive ? '' : 'is-off'}`}>
              <div>
                <strong>{item.name}</strong>
                <p className="page-text">
                  {item.price} ₽ · {item.duration} дн. · {item.type}
                </p>
              </div>
              <div className="shop-sub-actions">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingId(item.id)
                    setForm({
                      name: item.name,
                      description: item.description || '',
                      price: String(item.price),
                      duration: String(item.duration),
                      type: item.type,
                      discordRoleId: item.discordRoleId || '',
                      isActive: item.isActive,
                    })
                  }}
                >
                  Изменить
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm('Отключить подписку?')) return
                    await api.delete(`/api/admin/subscriptions/${item.id}`)
                    await load()
                  }}
                >
                  Удалить
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}
