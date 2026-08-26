import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import api, { shopApi } from '../../api'
import { Button } from '../Common/Button'
import { CustomSelect } from '../Common/CustomSelect'
import { useToastStore } from '../../store/toastStore'
import type { ShopProduct } from '../../types'
import { FolderField } from './FolderField'

interface KeyRow {
  id: string
  key: string
  fullKey?: string
  isUsed: boolean
  itemName: string
  durationDays: number | null
  note?: string | null
  folderId?: string | null
  product: { id: string } | null
  subscription: { id: string } | null
}

interface Stats {
  total: number
  used: number
  remaining: number
}

export function ActivationKeys() {
  const showToast = useToastStore((state) => state.showToast)
  const [keys, setKeys] = useState<KeyRow[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, used: 0, remaining: 0 })
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [target, setTarget] = useState('s:BASIC')
  const [count, setCount] = useState('5')
  const [durationDays, setDurationDays] = useState('30')
  const [expiresAt, setExpiresAt] = useState('')
  const [note, setNote] = useState('')
  const [folderId, setFolderId] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [generated, setGenerated] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const selectedIsSub = target.startsWith('s:')

  const load = async () => {
    const [{ data }, productsRes] = await Promise.all([api.get('/api/admin/keys'), shopApi.products()])
    const payload = data as { keys: KeyRow[]; stats: Stats }
    setKeys(payload.keys)
    setStats(payload.stats)
    setProducts((productsRes.data as { products: ShopProduct[] }).products)
  }

  useEffect(() => {
    void load()
  }, [])

  const visible = useMemo(() => {
    return keys.filter((item) => {
      if (search && !(item.fullKey || item.key).toLowerCase().includes(search.toLowerCase())) return false
      if (filter === 'used') return item.isUsed
      if (filter === 'free') return !item.isUsed
      if (filter.startsWith('folder:')) return item.folderId === filter.slice(7)
      if (filter.startsWith('p:')) return item.product?.id === filter.slice(2)
      return true
    })
  }, [keys, filter, search])

  const generate = async () => {
    setBusy(true)
    try {
      const [kind, id] = target.split(':')
      const { data } = await api.post('/api/admin/keys/generate', {
        productId: kind === 'p' ? id : undefined,
        subscriptionType: kind === 's' ? id : undefined,
        count: Number(count) || 1,
        durationDays: kind === 's' ? Number(durationDays) : undefined,
        expiresAt: expiresAt || undefined,
        note: note.trim() || null,
        folderId: folderId || null,
      })
      const payload = data as { keys: Array<{ fullKey?: string; key: string }> }
      const list = payload.keys.map((item) => item.fullKey || item.key)
      setGenerated(list)
      showToast(`Сгенерировано ключей: ${list.length}`, 'success')
      await load()
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : 'Не удалось сгенерировать'
      showToast(message || 'Не удалось сгенерировать', 'error')
    } finally {
      setBusy(false)
    }
  }

  const copyAll = async () => {
    await navigator.clipboard.writeText(generated.join('\n'))
    showToast('Ключи скопированы', 'success')
  }

  const exportCsv = () => {
    const rows = [
      ['key', 'item', 'days', 'used', 'note'],
      ...visible.map((item) => [
        item.fullKey || item.key,
        item.itemName,
        String(item.durationDays ?? ''),
        String(item.isUsed),
        item.note || '',
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'activation-keys.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-grid">
      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">Генерация ключей</h2>
        <p className="page-text">Для подписки выбирается только тип и свой срок, без привязки к карточке из каталога.</p>
        <div className="admin-form">
          <label className="profile-field">
            <span>Товар</span>
            <CustomSelect
              value={target}
              onChange={setTarget}
              options={[
                { value: 's:BASIC', label: 'Базовая', group: 'Подписки' },
                { value: 's:PREMIUM', label: 'Премиум', group: 'Подписки' },
                ...products.map((item) => ({ value: `p:${item.id}`, label: item.name, group: 'Дополнительно' })),
              ]}
            />
          </label>
          {selectedIsSub && (
            <label className="profile-field">
              <span>Срок в днях (0 — навсегда)</span>
              <input className="profile-input" type="number" min={0} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
            </label>
          )}
          <label className="profile-field">
            <span>Заметка</span>
            <textarea className="profile-input" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <FolderField kind="KEY" value={folderId} onChange={setFolderId} />
          <div className="admin-form-row">
            <input className="profile-input" type="number" min={1} max={200} value={count} onChange={(e) => setCount(e.target.value)} />
            <input className="profile-input" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <Button disabled={busy} onClick={() => void generate()}>
            Сгенерировать
          </Button>
        </div>
        {generated.length > 0 && (
          <div className="test-sub-box">
            <p className="shop-section-title">Новые ключи</p>
            <pre className="keys-pre">{generated.join('\n')}</pre>
            <Button variant="ghost" onClick={() => void copyAll()}>
              Копировать все
            </Button>
          </div>
        )}
      </article>

      <article className="admin-card liquid-glass">
        <div className="admin-stats">
          <span>Всего {stats.total}</span>
          <span>Использовано {stats.used}</span>
          <span>Свободно {stats.remaining}</span>
        </div>
        <input className="profile-input" placeholder="Поиск по ключу" value={search} onChange={(e) => setSearch(e.target.value)} />
        <CustomSelect
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'free', label: 'Свободные' },
            { value: 'used', label: 'Использованные' },
          ]}
        />
        <Button variant="ghost" onClick={exportCsv}>
          Экспорт CSV
        </Button>
        <ul className="admin-list">
          {visible.map((item) => (
            <li key={item.id} className="admin-list-item">
              <div>
                <strong className="admin-code">{item.fullKey || item.key}</strong>
                <p className="page-text">
                  {item.itemName}
                  {item.durationDays != null ? ` · ${item.durationDays === 0 ? 'навсегда' : `${item.durationDays} дн.`}` : ''}
                  {' · '}
                  {item.isUsed ? 'использован' : 'свободен'}
                </p>
                {item.note && <p className="page-text">{item.note}</p>}
              </div>
              {!item.isUsed && (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await api.delete(`/api/admin/keys/${item.id}`)
                    await load()
                  }}
                >
                  Удалить
                </Button>
              )}
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}
