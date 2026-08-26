import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/admin/promo', label: 'Промокоды' },
  { to: '/admin/bonus', label: 'Бонус-коды' },
  { to: '/admin/keys', label: 'Ключи активации' },
]

export function AdminPage() {
  return (
    <section className="admin-page">
      <header className="admin-hero liquid-glass">
        <p className="eyebrow">Панель администратора</p>
        <h1 className="page-title">Выдача и коды</h1>
        <p className="page-text">Создание промокодов, бонус-кодов и ключей активации на любой товар со своим сроком.</p>
        <nav className="admin-tabs" aria-label="Разделы админки">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `admin-tab ${isActive ? 'is-active' : ''}`}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Outlet />
    </section>
  )
}
