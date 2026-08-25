import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { DiscordLogin } from '../Auth/DiscordLogin'
import { Button } from '../Common/Button'
import { Logo } from '../Common/Logo'
import { useAuth } from '../../hooks/useAuth'
import { getDiscordAvatarUrl } from '../../hooks/useDiscord'
import { getHighestRole } from '../../utils/discordRoles'

const navItems = [
  { to: '/', label: 'Главная' },
  { to: '/news', label: 'Новости' },
  { to: '/shop', label: 'Магазин' },
]

const fallbackAvatar =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%2327272a'/%3E%3Ccircle cx='32' cy='24' r='12' fill='%2352525b'/%3E%3Cpath d='M8 58c4-14 16-20 24-20s20 6 24 20' fill='%2352525b'/%3E%3C/svg%3E"

export function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const role = getHighestRole(user)
  const avatar = user ? getDiscordAvatarUrl(user.discordId, user.avatar) : fallbackAvatar

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const closeMenus = () => {
    setMenuOpen(false)
    setProfileOpen(false)
  }

  return (
    <header className="site-header liquid-glass">
      <Link to="/" className="site-brand" onClick={closeMenus} aria-label="Aspect Visuals">
        <Logo className="h-8 w-8" />
        <span className="site-brand-name">Aspect Visuals</span>
      </Link>

      <nav className="header-nav" aria-label="Основная навигация">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="header-actions">
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg className="icon" viewBox="0 0 24 24">
            {menuOpen ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>

        {isAuthenticated && user ? (
          <div className="profile-menu" ref={profileRef}>
            <button
              type="button"
              className={`profile-chip ${profileOpen ? 'open' : ''}`}
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="avatar-wrap">
                <img className="avatar" src={avatar} alt="" draggable={false} />
                <span className="online-dot" aria-hidden="true" />
              </span>
              <span className="profile-meta">
                <span className="profile-name">{user.username}</span>
                <span className="profile-role">{role?.name ?? 'Профиль'}</span>
              </span>
            </button>
            {profileOpen && (
              <div className="profile-dropdown liquid-glass" role="menu">
                <div className="profile-dropdown-banner" />
                <div className="profile-dropdown-body">
                  <div className="profile-dropdown-user">
                    <span className="avatar-wrap avatar-lg">
                      <img className="avatar" src={avatar} alt="" draggable={false} />
                      <span className="online-dot" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="profile-name">{user.username}</p>
                      <p className="profile-role">{role?.name ?? 'Пользователь'}</p>
                    </div>
                  </div>
                  <Link to="/settings" className="dropdown-link" role="menuitem" onClick={closeMenus}>
                    Настройки
                  </Link>
                  <Button
                    variant="logout"
                    onClick={() => {
                      closeMenus()
                      void logout()
                    }}
                  >
                    Выйти
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <DiscordLogin />
        )}
      </div>

      {menuOpen && (
        <nav className="mobile-nav" aria-label="Мобильная навигация">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
              onClick={closeMenus}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
