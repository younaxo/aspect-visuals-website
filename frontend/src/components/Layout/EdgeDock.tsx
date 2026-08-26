import { useAuth } from '../../hooks/useAuth'
import { useChatStore } from '../../store/chatStore'
import { useUiStore } from '../../store/uiStore'

export function EdgeDock() {
  const { isAuthenticated } = useAuth()
  const unread = useChatStore((state) => state.unreadCount)
  const unreadTotal = Object.values(unread).reduce((sum, value) => sum + value, 0)
  const chatOpen = useUiStore((state) => state.chatOpen)
  const setChatOpen = useUiStore((state) => state.setChatOpen)

  if (!isAuthenticated) return null

  return (
    <div className="edge-dock" aria-label="Быстрые действия">
      <button
        type="button"
        className={`edge-dock-btn ${chatOpen ? 'is-active' : ''}`}
        aria-label="Чат"
        onClick={() => setChatOpen(!chatOpen)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H6l-2 2V4h16z"
          />
        </svg>
        {unreadTotal > 0 && <span className="edge-dock-badge">{unreadTotal}</span>}
      </button>
    </div>
  )
}
