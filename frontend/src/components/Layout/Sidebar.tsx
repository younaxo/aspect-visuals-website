import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { DiscordLogin } from '../Auth/DiscordLogin'
import { Button } from '../Common/Button'
import { useAuth } from '../../hooks/useAuth'
import { getDiscordAvatarUrl } from '../../hooks/useDiscord'
import { getHighestRole } from '../../utils/discordRoles'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Главная',
    icon: (
      <svg className="icon" viewBox="0 0 24 24">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    to: '/news',
    label: 'Новости',
    icon: (
      <svg className="icon" viewBox="0 0 24 24">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8" />
        <path d="M15 18h-5" />
        <path d="M10 6h8v4h-8V6Z" />
      </svg>
    ),
  },
  {
    to: '/shop',
    label: 'Магазин',
    icon: (
      <svg className="icon" viewBox="0 0 24 24">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Настройки',
    icon: (
      <svg className="icon" viewBox="0 0 24 24">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
]

const fallbackAvatar =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%2327272a'/%3E%3Ccircle cx='32' cy='24' r='12' fill='%2352525b'/%3E%3Cpath d='M8 58c4-14 16-20 24-20s20 6 24 20' fill='%2352525b'/%3E%3C/svg%3E"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

function playClick() {
  const audio = new Audio('/sounds/click.wav')
  audio.volume = 0.55
  audio.play().catch(() => undefined)
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, isAuthenticated, logout } = useAuth()
  const role = getHighestRole(user)
  const avatar = user ? getDiscordAvatarUrl(user.discordId, user.avatar) : fallbackAvatar

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <button type="button" className="brand-logo" aria-label="Переключить меню" onClick={onToggle}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" fill="none">
            <g fill="currentColor">
              <polygon points="238,50 60,420 145,420 238,225" />
              <polygon points="262,50 262,225 355,420 440,420" />
              <polygon points="250,380 180,240 320,240" />
              <polygon points="175,445 325,445 345,465 155,465" />
            </g>
          </svg>
        </button>
        <span className="brand-text">Aspect Visuals</span>
      </div>

      <nav className="sidebar-nav" aria-label="Основная навигация">
        {navItems.map((item, index) => (
          <div key={item.to}>
            {(index === 3) && <div className="nav-sep" />}
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item tip ${isActive ? 'active' : ''}`}
              data-tip={item.label}
              onClick={playClick}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </NavLink>
          </div>
        ))}
        <div className="nav-sep" />
      </nav>

      <div className="socials">
        <a className="social-btn tip" href="https://discord.com" target="_blank" rel="noreferrer" data-tip="Discord" aria-label="Discord">
          <svg className="icon-discord icon-fill" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        </a>
        <a className="social-btn tip" href="https://t.me" target="_blank" rel="noreferrer" data-tip="Telegram" aria-label="Telegram">
          <svg className="icon" viewBox="0 0 24 24">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </a>
      </div>

      <div className="p-3 pt-0">
        {isAuthenticated && user ? (
          <div className="flex flex-col gap-2">
            <div className="profile-card tip" data-tip="Профиль">
              <div className="avatar-wrap">
                <img className="avatar" src={avatar} alt={user.username} />
                <span className="online-dot" aria-hidden="true" />
              </div>
              <div className="profile-meta min-w-0">
                <div className="truncate text-sm font-medium text-zinc-50">{user.username}</div>
                <div className="truncate text-xs text-zinc-500">{role?.name ?? '#ASPECT'}</div>
              </div>
            </div>
            {!collapsed && (
              <Button variant="logout" onClick={() => void logout()}>
                <svg className="icon" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                Выйти с аккаунта
              </Button>
            )}
          </div>
        ) : (
          !collapsed && <DiscordLogin />
        )}
      </div>
    </aside>
  )
}
