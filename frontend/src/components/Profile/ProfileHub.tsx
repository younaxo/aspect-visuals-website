import { NavLink, Outlet } from 'react-router-dom'
import { isPanelAdmin } from '../../utils/discordRoles'
import { useAuth } from '../../hooks/useAuth'

type NavItem = { to: string; label: string; icon: string; end?: boolean }
type NavEntry = NavItem | { sep: true }

const items: NavEntry[] = [
  { to: '/account', label: 'Аккаунт', end: true, icon: 'user' },
  { to: '/account/me', label: 'Профиль', icon: 'id' },
  { to: '/account/balance', label: 'Баланс', icon: 'wallet' },
  { to: '/account/subscriptions', label: 'Подписки', icon: 'star' },
  { to: '/account/download', label: 'Скачать клиент', icon: 'download' },
  { to: '/account/sessions', label: 'Подключённые клиенты', icon: 'plug' },
  { to: '/account/settings', label: 'Настройки', icon: 'gear' },
  { sep: true },
  { to: '/account/bonus', label: 'Ежедневный бонус', icon: 'gift' },
  { to: '/account/configs', label: 'Конфиги', icon: 'sliders' },
  { to: '/account/cosmetics', label: 'Косметика', icon: 'spark' },
  { sep: true },
  { to: '/account/support', label: 'Поддержка', icon: 'help' },
]

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    user: 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    id: 'M4 6h16v12H4zM8 10h8M8 14h5',
    gift: 'M20 12v8H4v-8M2 7h20v5H2zM12 7V3M12 22V12',
    sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4',
    spark: 'm12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
    wallet: 'M20 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1ZM16 12h.01',
    star: 'm12 3 2.4 6.6H21l-5.4 4 2.1 6.4L12 16.8 6.3 20 2.1-6.4L3 9.6h6.6Z',
    download: 'M12 3v12m0 0 4-4m-4 4-4-4M5 21h14',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
    help: 'M9 9a3 3 0 1 1 4.2 2.8c-.8.4-1.2.9-1.2 1.7V14m0 4h.01',
    shield: 'M12 3 4 7v5c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V7l-8-4Z',
    plug: 'M9 3v5M15 3v5M7 8h10v4a5 5 0 0 1-10 0V8ZM12 17v4',
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
        <h1>Мой аккаунт</h1>
        <nav aria-label="Разделы аккаунта">
          {items.map((item, index) =>
            'sep' in item ? (
              <div key={`sep-${index}`} className="profile-hub-sep" />
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `profile-hub-link ${isActive ? 'is-active' : ''}`}
              >
                <Icon name={item.icon} />
                {item.label}
              </NavLink>
            ),
          )}
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
