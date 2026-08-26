import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCartStore } from '../../store/cartStore'
import { useChatStore } from '../../store/chatStore'

export function EdgeDock() {
  const { isAuthenticated } = useAuth()
  const cartCount = useCartStore((state) => state.items.length)
  const unread = useChatStore((state) => state.unreadCount)
  const unreadTotal = Object.values(unread).reduce((sum, value) => sum + value, 0)
  const { pathname } = useLocation()

  if (!isAuthenticated) return null

  return (
    <div className="edge-dock" aria-label="Быстрые действия">
      <Link
        to="/shop/cart"
        className={`edge-dock-btn ${pathname.startsWith('/shop/cart') ? 'is-active' : ''}`}
        aria-label="Корзина"
      >
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6h15l-1.5 9h-12z" />
          <path d="M6 6 5 3H2" />
          <circle cx="9" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
        </svg>
        {cartCount > 0 && <span className="edge-dock-badge">{cartCount}</span>}
      </Link>
      <Link
        to="/chat"
        className={`edge-dock-btn ${pathname.startsWith('/chat') ? 'is-active' : ''}`}
        aria-label="Чат"
      >
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 1 1 18 0Z" />
        </svg>
        {unreadTotal > 0 && <span className="edge-dock-badge">{unreadTotal}</span>}
      </Link>
    </div>
  )
}
