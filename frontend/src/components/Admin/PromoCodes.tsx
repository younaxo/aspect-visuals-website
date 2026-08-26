import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import api from '../../api'
import { Button } from '../Common/Button'
import { useToastStore } from '../../store/toastStore'
import { FolderField } from './FolderField'
import { CustomSelect } from '../Common/CustomSelect'

interface PromoRow {
  id: string
  code: string
  type: string
  value: number
  minOrderAmount: number
  subscriptionType: string | null
  durationDays: number | null
  note: string | null
  folderId: string | null
  folder?: { name: string } | null
  validUntil: string | null
  maxUses: number
  usedCount: number
  isActive: boolean
}

const emptyForm = {
  code: '',
  type: 'BASIC',
  value: '10',
  minOrderAmount: '0',
  durationDays: '7',
  note: '',
  folderId: '',
  validUntil: '',
  maxUses: '10',
}

export function PromoCodes() {
  const showToast = useToastStore((state) => state.showToast)
  const [items, setItems] = useState<PromoRow[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [folderFilter, setFolderFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const isDiscount = form.type === 'PERCENTAGE' || form.type === 'FIXED'

  const load = async () => {
    const { data } = await api.get('/api/admin/promo')
    setItems((data as { promoCodes: PromoRow[] }).promoCodes)
  }

  useEffect(() => {
    void load()
  }, [])

  const visible = useMemo(
    () => items.filter((item) => !folderFilter || item.folderId === folderFilter),
    [items, folderFilter],
  )

  const save = async () => {
    setBusy(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value) || 0,
        minOrderAmount: Number(form.minOrderAmount) || 0,
        subscriptionType: isDiscount ? null : form.type,
        durationDays: isDiscount ? null : Number(form.durationDays) || 0,
        note: form.note.trim() || null,
        folderId: form.folderId || null,
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

  return (
    <div className="admin-grid">
      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">{editingId ? 'Редактирование' : 'Новый промокод'}</h2>
        <p className="page-text">Выдаёт дни подписки по типу (BASIC/PREMIUM) с кастомным сроком или скидку в корзине.</p>
        <div className="admin-form">
          <label className="profile-field">
            <span>Код</span>
            <input
              className="profile-input"
              value={form.code}
              disabled={Boolean(editingId)}
              placeholder="Автогенерация, если пусто"
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
            />
          </label>
          <label className="profile-field">
            <span>Тип</span>
            <CustomSelect
              value={form.type}
              onChange={(type) => setForm({ ...form, type })}
              options={[
                { value: 'BASIC', label: 'Подписка BASIC' },
                { value: 'PREMIUM', label: 'Подписка PREMIUM' },
                { value: 'PERCENTAGE', label: 'Скидка %' },
                { value: 'FIXED', label: 'Скидка ₽' },
              ]}
            />
          </label>
          {isDiscount ? (
            <div className="admin-form-row">
              <input className="profile-input" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              <input className="profile-input" type="number" placeholder="Мин. сумма" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
            </div>
          ) : (
            <label className="profile-field">
              <span>Срок в днях (0 — навсегда)</span>
              <input className="profile-input" type="number" min={0} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
            </label>
          )}
          <label className="profile-field">
            <span>Заметка</span>
            <textarea className="profile-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <FolderField kind="PROMO" value={form.folderId} onChange={(folderId) => setForm({ ...form, folderId })} />
          <div className="admin-form-row">
            <input className="profile-input" type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
            <input className="profile-input" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </div>
          <Button disabled={busy} onClick={() => void save()}>
            {editingId ? 'Сохранить' : 'Создать промокод'}
          </Button>
        </div>
      </article>

      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">Список</h2>
        <FolderField kind="PROMO" value={folderFilter} onChange={setFolderFilter} />
        <ul className="admin-list">
          {visible.map((item) => (
            <li key={item.id} className={`admin-list-item ${item.isActive ? '' : 'is-off'}`}>
              <div>
                <strong className="admin-code">{item.code}</strong>
                <p className="page-text">
                  {item.type === 'PERCENTAGE' || item.type === 'FIXED'
                    ? `${item.type === 'PERCENTAGE' ? `${item.value}%` : `${item.value} ₽`}`
                    : `${item.durationDays === 0 ? 'навсегда' : `${item.durationDays} дн.`} · ${item.subscriptionType || item.type}`}
                  {' · '}
                  {item.usedCount}/{item.maxUses}
                  {item.folder ? ` · ${item.folder.name}` : ''}
                </p>
                {item.note && <p className="page-text">{item.note}</p>}
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
                      durationDays: String(item.durationDays ?? 0),
                      note: item.note || '',
                      folderId: item.folderId || '',
                      validUntil: item.validUntil ? item.validUntil.slice(0, 10) : '',
                      maxUses: String(item.maxUses),
                    })
                  }}
                >
                  Изменить
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm('Выключить промокод?')) return
                    await api.delete(`/api/admin/promo/${item.id}`)
                    await load()
                  }}
                >
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
