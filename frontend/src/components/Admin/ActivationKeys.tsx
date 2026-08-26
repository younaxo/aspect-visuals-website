import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import api, { shopApi } from '../../api'
import { Button } from '../Common/Button'
import { useToastStore } from '../../store/toastStore'
import type { ShopProduct, ShopSubscription } from '../../types'

interface KeyRow {
  id: string
  key: string
  fullKey?: string
  isUsed: boolean
  itemName: string
  product: { id: string } | null
  subscription: { id: string } | null
  expiresAt: string | null
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
  const [subs, setSubs] = useState<ShopSubscription[]>([])
  const [target, setTarget] = useState('')
  const [count, setCount] = useState('5')
  const [expiresAt, setExpiresAt] = useState('')
  const [filter, setFilter] = useState('all')
  const [generated, setGenerated] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const [{ data }, productsRes, subsRes] = await Promise.all([
      api.get('/api/admin/keys'),
      shopApi.products(),
      shopApi.subscriptions(),
    ])
    const payload = data as { keys: KeyRow[]; stats: Stats }
    setKeys(payload.keys)
    setStats(payload.stats)
    setProducts((productsRes.data as { products: ShopProduct[] }).products)
    setSubs((subsRes.data as { subscriptions: ShopSubscription[] }).subscriptions)
  }

  useEffect(() => {
    void load()
  }, [])

  const visible = useMemo(() => {
    return keys.filter((item) => {
      if (filter === 'used') return item.isUsed
      if (filter === 'free') return !item.isUsed
      if (filter.startsWith('p:')) return item.product?.id === filter.slice(2)
      if (filter.startsWith('s:')) return item.subscription?.id === filter.slice(2)
      return true
    })
  }, [keys, filter])

  const generate = async () => {
    setBusy(true)
    try {
      const [kind, id] = target.split(':')
      const { data } = await api.post('/api/admin/keys/generate', {
        productId: kind === 'p' ? id : undefined,
        subscriptionId: kind === 's' ? id : undefined,
        count: Number(count) || 1,
        expiresAt: expiresAt || undefined,
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
    const text = generated.join('\n')
    await navigator.clipboard.writeText(text)
    showToast('Ключи скопированы', 'success')
  }

  const exportCsv = () => {
    const rows = [['key', 'item', 'used'], ...visible.map((item) => [item.fullKey || item.key, item.itemName, String(item.isUsed)])]
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
    <section className="content-panel shop-cart">
      <p className="eyebrow">Админ</p>
      <h1 className="page-title">Ключи активации</h1>
      <p className="page-text">
        Всего {stats.total} · использовано {stats.used} · осталось {stats.remaining}
      </p>

      <div className="admin-form">
        <label className="profile-field">
          <span>Товар или подписка</span>
          <select className="profile-input" value={target} onChange={(event) => setTarget(event.target.value)}>
            <option value="">Выберите</option>
            {subs.map((item) => (
              <option key={item.id} value={`s:${item.id}`}>
                Подписка: {item.name}
              </option>
            ))}
            {products.map((item) => (
              <option key={item.id} value={`p:${item.id}`}>
                Товар: {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="profile-field">
          <span>Количество</span>
          <input className="profile-input" type="number" min={1} max={200} value={count} onChange={(event) => setCount(event.target.value)} />
        </label>
        <label className="profile-field">
          <span>Истекает (необязательно)</span>
          <input className="profile-input" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
        </label>
        <Button disabled={busy || !target} onClick={() => void generate()}>
          Сгенерировать
        </Button>
      </div>

      {generated.length > 0 && (
        <div className="test-sub-box">
          <p className="shop-section-title">Новые ключи</p>
          <pre className="keys-pre">{generated.join('\n')}</pre>
          <div className="shop-sub-actions">
            <Button variant="ghost" onClick={() => void copyAll()}>
              Копировать все
            </Button>
          </div>
        </div>
      )}

      <label className="profile-field">
        <span>Фильтр</span>
        <select className="profile-input" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">Все</option>
          <option value="free">Свободные</option>
          <option value="used">Использованные</option>
          {subs.map((item) => (
            <option key={item.id} value={`s:${item.id}`}>
              {item.name}
            </option>
          ))}
          {products.map((item) => (
            <option key={item.id} value={`p:${item.id}`}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <Button variant="ghost" onClick={exportCsv}>
        Экспорт CSV
      </Button>

      <ul className="cart-list">
        {visible.map((item) => (
          <li key={item.id} className="cart-item">
            <div>
              <strong>{item.fullKey || item.key}</strong>
              <p className="page-text">
                {item.itemName} · {item.isUsed ? 'использован' : 'свободен'}
              </p>
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
    </section>
  )
}
