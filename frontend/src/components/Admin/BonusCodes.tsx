import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import api from '../../api'
import { Button } from '../Common/Button'
import { useToastStore } from '../../store/toastStore'
import { FolderField } from './FolderField'

interface BonusRow {
  id: string
  code: string
  amount: number
  days: number
  subscriptionType: string
  note: string | null
  folderId: string | null
  folder?: { name: string } | null
  maxUses: number
  usedCount: number
  isActive: boolean
  validUntil: string | null
}

const emptyForm = {
  code: '',
  amount: '100',
  maxUses: '50',
  note: '',
  folderId: '',
  validUntil: '',
}

export function BonusCodes() {
  const showToast = useToastStore((state) => state.showToast)
  const [items, setItems] = useState<BonusRow[]>([])
  const [form, setForm] = useState(emptyForm)
  const [folderFilter, setFolderFilter] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await api.get('/api/admin/bonus')
    setItems((data as { bonusCodes: BonusRow[] }).bonusCodes)
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
      await api.post('/api/admin/bonus', {
        code: form.code.trim().toUpperCase(),
        amount: Number(form.amount),
        subscriptionType: 'BALANCE',
        maxUses: Number(form.maxUses),
        note: form.note.trim() || null,
        folderId: form.folderId || null,
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
        <p className="page-text">Начисляет деньги на баланс пользователя.</p>
        <div className="admin-form">
          <input className="profile-input" placeholder="Код" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <input className="profile-input" type="number" min={1} placeholder="Сумма, ₽" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <label className="profile-field">
            <span>Заметка</span>
            <textarea className="profile-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <FolderField kind="BONUS" value={form.folderId} onChange={(folderId) => setForm({ ...form, folderId })} />
          <div className="admin-form-row">
            <input className="profile-input" type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
            <input className="profile-input" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </div>
          <Button disabled={busy} onClick={() => void save()}>
            Создать бонус-код
          </Button>
        </div>
      </article>

      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">Список</h2>
        <FolderField kind="BONUS" value={folderFilter} onChange={setFolderFilter} />
        <ul className="admin-list">
          {visible.map((item) => (
            <li key={item.id} className={`admin-list-item ${item.isActive ? '' : 'is-off'}`}>
              <div>
                <strong className="admin-code">{item.code}</strong>
                <p className="page-text">
                  {Number(item.amount) > 0 ? `${item.amount} ₽ на баланс` : `${item.days} дн.`} · {item.usedCount}/{item.maxUses}
                  {item.folder ? ` · ${item.folder.name}` : ''}
                </p>
                {item.note && <p className="page-text">{item.note}</p>}
              </div>
              {item.isActive && (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm('Выключить бонус-код?')) return
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
