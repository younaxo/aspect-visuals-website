import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

const SOCKET_URL =
  import.meta.env.VITE_WEBSOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin)

let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      auth: {
        token: useAuthStore.getState().accessToken,
      },
    })
  }
  return socket
}

export const chatSocket = {
  connect: () => {
    const token = useAuthStore.getState().accessToken
    if (!token) return
    const client = getSocket()
    client.auth = { token }
    if (!client.connected) client.connect()
  },
  disconnect: () => {
    socket?.disconnect()
  },
  joinChannel: (channel: string) => getSocket().emit('join-channel', channel),
  sendMessage: (data: { content: string; channel: string; parentId?: string | null }) =>
    getSocket().emit('send-message', data),
  editMessage: (data: { messageId: string; content: string; channel: string }) =>
    getSocket().emit('edit-message', data),
  deleteMessage: (data: { messageId: string; channel: string }) => getSocket().emit('delete-message', data),
  addReaction: (data: { messageId: string; emoji: string; channel: string }) =>
    getSocket().emit('add-reaction', data),
  removeReaction: (data: { messageId: string; emoji: string; channel: string }) =>
    getSocket().emit('remove-reaction', data),
  pinMessage: (data: { messageId: string; pinned: boolean }) => getSocket().emit('pin-message', data),
  setTyping: (channel: string) => getSocket().emit('typing', { channel }),
  on: (event: string, callback: (...args: unknown[]) => void) => {
    getSocket().on(event, callback)
  },
  off: (event: string, callback?: (...args: unknown[]) => void) => {
    if (callback) getSocket().off(event, callback)
    else getSocket().off(event)
  },
  connected: () => Boolean(socket?.connected),
}
