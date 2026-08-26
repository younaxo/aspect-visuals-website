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
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2m10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2M7.2 14.8l.1.2c.1.2.4.5.7.5h9.3c.4 0 .7-.2.9-.6l3.2-5.9c.1-.2 0-.5-.1-.7-.2-.2-.4-.3-.7-.3H6.5L5.3 4H2v2h2l3.6 7.6L6.3 16c-.2.3-.3.7-.3 1.1 0 1.1.9 2 2 2h10v-2H8.1c-.1 0-.2-.1-.2-.2v-.1L7.2 14.8Z"
          />
        </svg>
        {cartCount > 0 && <span className="edge-dock-badge">{cartCount}</span>}
      </Link>
      <Link
        to="/chat"
        className={`edge-dock-btn ${pathname.startsWith('/chat') ? 'is-active' : ''}`}
        aria-label="Чат"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H6l-2 2V4h16z"
          />
        </svg>
        {unreadTotal > 0 && <span className="edge-dock-badge">{unreadTotal}</span>}
      </Link>
    </div>
  )
}
