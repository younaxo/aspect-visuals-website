import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '../../api'
import { Button } from '../Common/Button'
import { CustomSelect } from '../Common/CustomSelect'
import { useToastStore } from '../../store/toastStore'

const empty = { name: '', description: '', price: '99', type: 'BETA', isActive: true }

export function ProductsList() {
  const showToast = useToastStore((s) => s.showToast)
  const [items, setItems] = useState<Array<typeof empty & { id: string }>>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = async () => {
    const { data } = await api.get('/api/admin/products')
    setItems((data as { products: Array<typeof empty & { id: string }> }).products)
  }
  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    const payload = { ...form, price: Number(form.price) }
    try {
      if (editingId) await api.put(`/api/admin/products/${editingId}`, payload)
      else await api.post('/api/admin/products', payload)
      showToast('Товар сохранён', 'success')
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
        <h2 className="shop-section-title">{editingId ? 'Редактирование' : 'Создать товар'}</h2>
        <div className="admin-form">
          <input className="profile-input" placeholder="Название" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea className="profile-input" placeholder="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="admin-form-row">
            <input className="profile-input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <CustomSelect
              value={form.type}
              onChange={(type) => setForm({ ...form, type })}
              options={[
                { value: 'BETA', label: 'BETA' },
                { value: 'HWID_RESET', label: 'HWID_RESET' },
                { value: 'SKIN', label: 'SKIN' },
                { value: 'OTHER', label: 'OTHER' },
              ]}
            />
          </div>
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
                  {item.price} ₽ · {item.type}
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
                      type: item.type,
                      isActive: item.isActive,
                    })
                  }}
                >
                  Изменить
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm('Отключить товар?')) return
                    await api.delete(`/api/admin/products/${item.id}`)
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
