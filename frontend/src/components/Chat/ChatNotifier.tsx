import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { useUiStore } from '../../store/uiStore'

export function ChatNotifier() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accessToken = useAuthStore((state) => state.accessToken)
  const chatOpen = useUiStore((state) => state.chatOpen)
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
    if (chatOpen && isAuthenticated) {
      void refreshUnread()
    }
  }, [chatOpen, isAuthenticated, location.pathname, refreshUnread])

  return null
}
