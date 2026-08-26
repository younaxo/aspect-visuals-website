import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Logo } from '../Common/Logo'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { useCartStore } from '../../store/cartStore'
import { isAdmin } from '../../utils/discordRoles'

const navItems = [
  { to: '/', label: 'Главная' },
  { to: '/news', label: 'Новости' },
  { to: '/shop', label: 'Магазин' },
]

export function Header() {
  const { user, isAuthenticated } = useAuth()
  const cartCount = useCartStore((state) => state.items.length)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const closeMenus = () => {
    setMenuOpen(false)
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
          <>
            {isAdmin(user) && (
              <>
                <Link to="/admin/promo" className="btn-ghost header-login">
                  Промо
                </Link>
                <Link to="/admin/keys" className="btn-ghost header-login">
                  Ключи
                </Link>
              </>
            )}
            <Link to="/shop/cart" className="btn-ghost header-login">
              Корзина{cartCount ? ` (${cartCount})` : ''}
            </Link>
            <Sidebar />
          </>
        ) : (
          <Link to="/login" className="btn-primary header-login">
            Войти
          </Link>
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
          {isAuthenticated ? (
            <>
              {user && isAdmin(user) && (
                <>
                  <NavLink
                    to="/admin/promo"
                    className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
                    onClick={closeMenus}
                  >
                    Промокоды
                  </NavLink>
                  <NavLink
                    to="/admin/keys"
                    className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
                    onClick={closeMenus}
                  >
                    Ключи
                  </NavLink>
                </>
              )}
              <NavLink
                to="/shop/cart"
                className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
                onClick={closeMenus}
              >
                Корзина
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
                onClick={closeMenus}
              >
                Профиль
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
                onClick={closeMenus}
              >
                Настройки
              </NavLink>
            </>
          ) : (
            <NavLink
              to="/login"
              className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
              onClick={closeMenus}
            >
              Войти
            </NavLink>
          )}
        </nav>
      )}
    </header>
  )
}
