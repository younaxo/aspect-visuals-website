import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '../../api'
import { Button } from '../Common/Button'
import { CustomSelect } from '../Common/CustomSelect'
import { Modal } from '../Common/Modal'
import { useToastStore } from '../../store/toastStore'
import { DISCORD_ROLE_IDS, DISCORD_ROLE_LABELS, ROLE_PRIORITY } from '../../utils/discordRoles'

interface AdminUser {
  id: string
  username: string
  email: string | null
  discordId: string | null
  createdAt: string
  banned: boolean
  roles: Array<{ discordId: string; name: string }>
  subscriptions: Array<{ name: string }>
}

export function UsersList() {
  const showToast = useToastStore((s) => s.showToast)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [roleUser, setRoleUser] = useState<AdminUser | null>(null)
  const [roleId, setRoleId] = useState('')
  const [banUser, setBanUser] = useState<AdminUser | null>(null)
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const load = async () => {
    const { data } = await api.get('/api/admin/users', { params: { page, q, role, pageSize: 20 } })
    const payload = data as { users: AdminUser[]; total: number }
    setUsers(payload.users)
    setTotal(payload.total)
  }

  useEffect(() => {
    void load()
  }, [page, role])

  return (
    <article className="admin-card liquid-glass">
      <h2 className="shop-section-title">Пользователи</h2>
      <div className="admin-form-row">
        <input
          className="profile-input"
          placeholder="Поиск по имени или email"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void load()
          }}
        />
        <CustomSelect
          value={role}
          onChange={setRole}
          placeholder="Все роли"
          options={[
            { value: '', label: 'Все роли' },
            ...ROLE_PRIORITY.map((key) => ({ value: DISCORD_ROLE_IDS[key], label: DISCORD_ROLE_LABELS[key] })),
          ]}
        />
        <Button variant="ghost" onClick={() => void load()}>
          Найти
        </Button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя</th>
              <th>Discord</th>
              <th>Email</th>
              <th>Роли</th>
              <th>Подписки</th>
              <th>Регистрация</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id.slice(-8)}</td>
                <td>{user.username}</td>
                <td>{user.discordId || '—'}</td>
                <td>{user.email || '—'}</td>
                <td>
                  {user.roles
                    .slice()
                    .sort((a, b) => {
                      const ia = ROLE_PRIORITY.findIndex((key) => DISCORD_ROLE_IDS[key] === a.discordId)
                      const ib = ROLE_PRIORITY.findIndex((key) => DISCORD_ROLE_IDS[key] === b.discordId)
                      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
                    })
                    .map((item) => {
                      const key = ROLE_PRIORITY.find((k) => DISCORD_ROLE_IDS[k] === item.discordId)
                      return key ? DISCORD_ROLE_LABELS[key] : item.name
                    })
                    .join(' · ') || '—'}
                </td>
                <td>{user.subscriptions.map((item) => item.name).join(', ') || '—'}</td>
                <td>{new Date(user.createdAt).toLocaleDateString('ru')}</td>
                <td>{user.banned ? 'Бан' : 'Активен'}</td>
                <td>
                  <div className="shop-sub-actions">
                    <Button variant="ghost" onClick={() => { setRoleUser(user); setRoleId(user.roles[0]?.discordId || '') }}>
                      Роль
                    </Button>
                    {user.banned ? (
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          await api.delete(`/api/admin/users/${user.id}/ban`)
                          showToast('Пользователь разбанен', 'success')
                          await load()
                        }}
                      >
                        Разбан
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => setBanUser(user)}>
                        Бан
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="shop-sub-actions">
        <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Назад
        </Button>
        <span className="page-text">
          {page} / {Math.max(1, Math.ceil(total / 20))}
        </span>
        <Button variant="ghost" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>
          Далее
        </Button>
      </div>

      {roleUser && (
        <Modal title={`Роль: ${roleUser.username}`} onClose={() => setRoleUser(null)}>
          <CustomSelect
            value={roleId}
            onChange={setRoleId}
            options={ROLE_PRIORITY.map((key) => ({
              value: DISCORD_ROLE_IDS[key],
              label: DISCORD_ROLE_LABELS[key],
            }))}
          />
          <div className="shop-sub-actions">
            <Button
              onClick={async () => {
                try {
                  await api.put(`/api/admin/users/${roleUser.id}/role`, { roleId })
                  showToast('Роль обновлена', 'success')
                  setRoleUser(null)
                  await load()
                } catch (error) {
                  const message = axios.isAxiosError(error)
                    ? (error.response?.data as { message?: string })?.message
                    : 'Ошибка'
                  showToast(message || 'Ошибка', 'error')
                }
              }}
            >
              Сохранить
            </Button>
            <Button variant="ghost" onClick={() => setRoleUser(null)}>
              Отмена
            </Button>
          </div>
        </Modal>
      )}

      {banUser && (
        <Modal title={`Бан: ${banUser.username}`} onClose={() => setBanUser(null)}>
          <input className="profile-input" placeholder="Причина" value={reason} onChange={(e) => setReason(e.target.value)} />
          <input className="profile-input" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          <div className="shop-sub-actions">
            <Button
              onClick={async () => {
                await api.post(`/api/admin/users/${banUser.id}/ban`, {
                  reason,
                  expiresAt: expiresAt || null,
                  isPermanent: !expiresAt,
                })
                showToast('Пользователь заблокирован', 'info')
                setBanUser(null)
                await load()
              }}
            >
              Забанить
            </Button>
            <Button variant="ghost" onClick={() => setBanUser(null)}>
              Отмена
            </Button>
          </div>
        </Modal>
      )}
    </article>
  )
}
