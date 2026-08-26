import { useEffect, useState } from 'react'
import api from '../../api'
import { Button } from '../Common/Button'

interface LogRow {
  id: string
  action: string
  targetType: string
  targetId: string | null
  ip: string | null
  createdAt: string
  details: unknown
  admin: { username: string }
}

export function AdminLogs() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [action, setAction] = useState('')

  const load = async () => {
    const { data } = await api.get('/api/admin/logs', { params: { page, q, action, pageSize: 20 } })
    const payload = data as { logs: LogRow[]; total: number }
    setLogs(payload.logs)
    setTotal(payload.total)
  }

  useEffect(() => {
    void load()
  }, [page, action])

  return (
    <article className="admin-card liquid-glass">
      <h2 className="shop-section-title">Логи администраторов</h2>
      <div className="admin-form-row">
        <input className="profile-input" placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void load()} />
        <select className="profile-input" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Все действия</option>
          {['CREATE', 'UPDATE', 'DELETE', 'BAN', 'UNBAN', 'REFUND'].map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Администратор</th>
              <th>Действие</th>
              <th>Объект</th>
              <th>IP</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((item) => (
              <tr key={item.id}>
                <td>{item.admin.username}</td>
                <td>{item.action}</td>
                <td>{item.targetType} {item.targetId ? item.targetId.slice(-8) : ''}</td>
                <td>{item.ip || '—'}</td>
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
    </article>
  )
}
