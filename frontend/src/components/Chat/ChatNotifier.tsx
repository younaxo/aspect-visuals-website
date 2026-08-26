import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'

export function ChatNotifier() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accessToken = useAuthStore((state) => state.accessToken)
  const connect = useChatStore((state) => state.connect)
  const disconnect = useChatStore((state) => state.disconnect)
  const refreshUnread = useChatStore((state) => state.refreshUnread)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      disconnect()
      return
    }
    connect()
    void refreshUnread()
  }, [accessToken, connect, disconnect, isAuthenticated, refreshUnread])

  useEffect(() => {
    if (location.pathname.startsWith('/chat') && isAuthenticated) {
      void refreshUnread()
    }
  }, [isAuthenticated, location.pathname, refreshUnread])

  return null
}
