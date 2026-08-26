import { useEffect, useState } from 'react'
import api from '../../api'
import { Button } from '../Common/Button'
import { useToastStore } from '../../store/toastStore'

interface PurchaseRow {
  id: string
  amount: number
  status: string
  createdAt: string
  name: string
  user: { username: string; email: string | null }
}

export function PurchasesList() {
  const showToast = useToastStore((s) => s.showToast)
  const [items, setItems] = useState<PurchaseRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<PurchaseRow | null>(null)

  const load = async () => {
    const { data } = await api.get('/api/admin/purchases', { params: { page, status, pageSize: 20 } })
    const payload = data as { purchases: PurchaseRow[]; total: number }
    setItems(payload.purchases)
    setTotal(payload.total)
  }

  useEffect(() => {
    void load()
  }, [page, status])

  return (
    <article className="admin-card liquid-glass">
      <h2 className="shop-section-title">Покупки</h2>
      <select className="profile-input" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Все статусы</option>
        <option value="COMPLETED">COMPLETED</option>
        <option value="PENDING">PENDING</option>
        <option value="REFUNDED">REFUNDED</option>
      </select>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Пользователь</th>
              <th>Товар</th>
              <th>Сумма</th>
              <th>Статус</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td>{item.id.slice(-8)}</td>
                <td>{item.user.username}</td>
                <td>{item.name}</td>
                <td>{item.amount} ₽</td>
                <td>{item.status}</td>
                <td>{new Date(item.createdAt).toLocaleString('ru')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="shop-sub-actions">
        <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Назад</Button>
        <span className="page-text">{page} / {Math.max(1, Math.ceil(total / 20))}</span>
        <Button variant="ghost" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>Далее</Button>
      </div>
      {selected && (
        <div className="admin-modal liquid-glass">
          <h3>{selected.name}</h3>
          <p className="page-text">{selected.user.username} · {selected.amount} ₽ · {selected.status}</p>
          {selected.status !== 'REFUNDED' && (
            <Button
              onClick={async () => {
                await api.post(`/api/admin/purchases/${selected.id}/refund`)
                showToast('Возврат выполнен', 'info')
                setSelected(null)
                await load()
              }}
            >
              Рефанд
            </Button>
          )}
          <Button variant="ghost" onClick={() => setSelected(null)}>Закрыть</Button>
        </div>
      )}
    </article>
  )
}
