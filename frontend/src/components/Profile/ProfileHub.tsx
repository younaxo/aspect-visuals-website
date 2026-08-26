import { NavLink, Outlet } from 'react-router-dom'
import { isPanelAdmin } from '../../utils/discordRoles'
import { useAuth } from '../../hooks/useAuth'

const items = [
  { to: '/profile', label: 'Аккаунт', end: true, icon: 'user' },
  { to: '/chat', label: 'Сообщество', icon: 'users' },
  { to: '/profile/balance', label: 'Баланс', icon: 'wallet' },
  { to: '/shop', label: 'Магазин', icon: 'bag' },
  { to: '/profile/subscriptions', label: 'Подписки', icon: 'star' },
  { to: '/profile/download', label: 'Скачать клиент', icon: 'download' },
  { to: '/profile/settings', label: 'Настройки', icon: 'gear' },
  { to: '/profile/support', label: 'Поддержка', icon: 'help' },
]

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    user: 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.13a4 4 0 0 1 0 7.75M22 21v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    wallet: 'M20 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1ZM16 12h.01',
    bag: 'M6 6h12l1 14H5L6 6ZM9 6V5a3 3 0 0 1 6 0v1',
    star: 'm12 3 2.4 6.6H21l-5.4 4 2.1 6.4L12 16.8 6.3 20l2.1-6.4L3 9.6h6.6Z',
    download: 'M12 3v12m0 0 4-4m-4 4-4-4M5 21h14',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
    help: 'M9 9a3 3 0 1 1 4.2 2.8c-.8.4-1.2.9-1.2 1.7V14m0 4h.01',
    shield: 'M12 3 4 7v5c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V7l-8-4Z',
  }
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name] || paths.user} />
    </svg>
  )
}

export function ProfileHub() {
  const { user } = useAuth()

  return (
    <section className="profile-hub">
      <aside className="profile-hub-side">
        <h1>Мой профиль</h1>
        <nav aria-label="Разделы профиля">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `profile-hub-link ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
          {isPanelAdmin(user) && (
            <NavLink to="/admin" className={({ isActive }) => `profile-hub-link ${isActive ? 'is-active' : ''}`}>
              <Icon name="shield" />
              Админ-панель
            </NavLink>
          )}
        </nav>
      </aside>
      <div className="profile-hub-main">
        <Outlet />
      </div>
    </section>
  )
}
