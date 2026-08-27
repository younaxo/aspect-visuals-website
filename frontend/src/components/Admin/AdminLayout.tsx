import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAdminAccess } from '../../hooks/useAdminAccess'
import { Loader } from '../Common/Loader'

const links = [
  { to: '/admin', label: 'Дашборд', end: true },
  { to: '/admin/users', label: 'Пользователи' },
  { to: '/admin/subscriptions', label: 'Подписки' },
  { to: '/admin/products', label: 'Товары' },
  { to: '/admin/promo', label: 'Промокоды' },
  { to: '/admin/bonus', label: 'Бонус-коды' },
  { to: '/admin/keys', label: 'Ключи' },
  { to: '/admin/news', label: 'Новости' },
  { to: '/admin/purchases', label: 'Покупки' },
  { to: '/admin/logs', label: 'Логи' },
  { to: '/admin/settings', label: 'Настройки' },
]

export function AdminLayout() {
  const { user } = useAuth()
  const { allowed, checking, isAuthenticated } = useAdminAccess()

  if (checking) return <Loader label="Проверяем доступ…" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!allowed) return <Navigate to="/" replace />

  return (
    <section className="profile-hub admin-shell">
      <aside className="profile-hub-side">
        <h1>Админ-панель</h1>
        <p className="page-text">{user?.username}</p>
        <nav className="admin-side-nav" aria-label="Разделы админки">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `profile-hub-link ${isActive ? 'is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="profile-hub-main admin-content">
        <Outlet />
      </div>
    </section>
  )
}
