import { create } from 'zustand'
import api from '../api'
import { chatSocket } from '../services/socket'
import { useAuthStore } from './authStore'
import { useToastStore } from './toastStore'

export interface ChatUserInfo {
  id: string
  username: string
  avatar: string | null
  discordId?: string | null
  status: string
  isOnline?: boolean
}

export interface ChatReaction {
  emoji: string
  userIds: string[]
  count: number
}

export interface ChatMessage {
  id: string
  content: string
  userId: string
  channel: string
  parentId: string | null
  isPinned: boolean
  isEdited: boolean
  isDeleted: boolean
  editedAt: string | null
  createdAt: string
  user: ChatUserInfo
  reactions: ChatReaction[]
  replyCount?: number
}

interface ChatState {
  messages: ChatMessage[]
  currentChannel: string
  onlineUsers: ChatUserInfo[]
  typingUsers: string[]
  unreadCount: Record<string, number>
  channels: string[]
  replyTo: ChatMessage | null
  loading: boolean
  hasMore: boolean
  connected: boolean
  connect: () => void
  disconnect: () => void
  loadMessages: (channel: string, before?: string) => Promise<void>
  setChannel: (channel: string) => Promise<void>
  sendMessage: (content: string, channel?: string) => void
  editMessage: (id: string, content: string) => void
  deleteMessage: (id: string) => void
  addReaction: (messageId: string, emoji: string) => void
  removeReaction: (messageId: string, emoji: string) => void
  pinMessage: (messageId: string, pinned: boolean) => void
  setTyping: (isTyping: boolean) => void
  setReplyTo: (message: ChatMessage | null) => void
  markAsRead: (channel: string) => Promise<void>
  refreshUnread: () => Promise<void>
}

function applyReaction(
  messages: ChatMessage[],
  payload: { messageId: string; emoji: string; userId: string },
  add: boolean,
) {
  return messages.map((message) => {
    if (message.id !== payload.messageId) return message
    const reactions = [...message.reactions]
    const index = reactions.findIndex((item) => item.emoji === payload.emoji)
    if (add) {
      if (index === -1) {
        reactions.push({ emoji: payload.emoji, userIds: [payload.userId], count: 1 })
      } else if (!reactions[index].userIds.includes(payload.userId)) {
        const userIds = [...reactions[index].userIds, payload.userId]
        reactions[index] = { emoji: payload.emoji, userIds, count: userIds.length }
      }
    } else if (index !== -1) {
      const userIds = reactions[index].userIds.filter((id) => id !== payload.userId)
      if (!userIds.length) reactions.splice(index, 1)
      else reactions[index] = { ...reactions[index], userIds, count: userIds.length }
    }
    return { ...message, reactions }
  })
}

let listenersBound = false
let typingTimer: number | null = null
let chatActive = false

export function setChatActive(value: boolean) {
  chatActive = value
}

function bindListeners() {
  if (listenersBound) return
  listenersBound = true

  chatSocket.on('new-message', (raw) => {
    const message = raw as ChatMessage
    const state = useChatStore.getState()
    const me = useAuthStore.getState().user?.id
    const settings = useAuthStore.getState().settings

    if (message.channel === state.currentChannel) {
      if (state.messages.some((item) => item.id === message.id)) return
      useChatStore.setState({ messages: [...state.messages, message] })
      if (chatActive) void state.markAsRead(message.channel)
    } else if (message.userId !== me) {
      useChatStore.setState({
        unreadCount: {
          ...state.unreadCount,
          [message.channel]: (state.unreadCount[message.channel] || 0) + 1,
        },
      })
    }

    if (message.userId !== me && (!chatActive || message.channel !== state.currentChannel)) {
      useToastStore.getState().showToast(`${message.user.username}: ${message.content.slice(0, 80)}`, 'info', 'Чат')
      if (settings.soundEnabled) {
        try {
          const audio = new Audio(
            'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=',
          )
          void audio.play()
        } catch {
          // звук опционален
        }
      }
      if (settings.notifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Aspect Visuals', { body: `${message.user.username}: ${message.content.slice(0, 80)}` })
      }
    }
  })

  chatSocket.on('message-edited', (raw) => {
    const message = raw as ChatMessage
    useChatStore.setState((state) => ({
      messages: state.messages.map((item) => (item.id === message.id ? message : item)),
    }))
  })

  chatSocket.on('message-deleted', (raw) => {
    const payload = raw as { messageId: string }
    useChatStore.setState((state) => ({
      messages: state.messages.map((item) =>
        item.id === payload.messageId ? { ...item, isDeleted: true, content: '' } : item,
      ),
    }))
  })

  chatSocket.on('message-pinned', (raw) => {
    const message = raw as ChatMessage
    useChatStore.setState((state) => ({
      messages: state.messages.map((item) => (item.id === message.id ? message : item)),
    }))
  })

  chatSocket.on('reaction-added', (raw) => {
    const payload = raw as { messageId: string; emoji: string; userId: string }
    useChatStore.setState((state) => ({ messages: applyReaction(state.messages, payload, true) }))
  })

  chatSocket.on('reaction-removed', (raw) => {
    const payload = raw as { messageId: string; emoji: string; userId: string }
    useChatStore.setState((state) => ({ messages: applyReaction(state.messages, payload, false) }))
  })

  chatSocket.on('user-typing', (raw) => {
    const payload = raw as { userId: string; channel: string }
    const state = useChatStore.getState()
    if (payload.channel !== state.currentChannel) return
    if (state.typingUsers.includes(payload.userId)) return
    useChatStore.setState({ typingUsers: [...state.typingUsers, payload.userId] })
    window.setTimeout(() => {
      useChatStore.setState((current) => ({
        typingUsers: current.typingUsers.filter((id) => id !== payload.userId),
      }))
    }, 2500)
  })

  chatSocket.on('online-users', (raw) => {
    useChatStore.setState({ onlineUsers: raw as ChatUserInfo[] })
  })

  chatSocket.on('user-online', () => {
    void useChatStore.getState().refreshUnread()
  })

  chatSocket.on('user-offline', (raw) => {
    const userId = String(raw)
    useChatStore.setState((state) => ({
      onlineUsers: state.onlineUsers.map((user) => (user.id === userId ? { ...user, isOnline: false } : user)),
    }))
  })

  chatSocket.on('chat-error', (raw) => {
    const payload = raw as { message?: string }
    useToastStore.getState().showToast(payload.message || 'Ошибка чата', 'error')
  })
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentChannel: 'general',
  onlineUsers: [],
  typingUsers: [],
  unreadCount: {},
  channels: ['general'],
  replyTo: null,
  loading: false,
  hasMore: true,
  connected: false,

  connect: () => {
    bindListeners()
    chatSocket.connect()
    set({ connected: true })
    void get().refreshUnread()
  },

  disconnect: () => {
    chatSocket.disconnect()
    set({ connected: false, typingUsers: [] })
  },

  loadMessages: async (channel, before) => {
    set({ loading: true })
    const { data } = await api.get(`/api/chat/messages/${channel}${before ? `/${before}` : ''}`)
    const incoming = (data as { messages: ChatMessage[] }).messages
    set((state) => ({
      messages: before ? [...incoming, ...state.messages] : incoming,
      hasMore: incoming.length >= 50,
      loading: false,
    }))
  },

  setChannel: async (channel) => {
    set({ currentChannel: channel, messages: [], hasMore: true, replyTo: null, typingUsers: [] })
    chatSocket.joinChannel(channel)
    await get().loadMessages(channel)
    await get().markAsRead(channel)
  },

  sendMessage: (content, channel) => {
    const target = channel || get().currentChannel
    chatSocket.sendMessage({ content, channel: target, parentId: get().replyTo?.id })
    set({ replyTo: null })
  },

  editMessage: (id, content) => {
    chatSocket.editMessage({ messageId: id, content, channel: get().currentChannel })
  },

  deleteMessage: (id) => {
    chatSocket.deleteMessage({ messageId: id, channel: get().currentChannel })
  },

  addReaction: (messageId, emoji) => {
    chatSocket.addReaction({ messageId, emoji, channel: get().currentChannel })
  },

  removeReaction: (messageId, emoji) => {
    chatSocket.removeReaction({ messageId, emoji, channel: get().currentChannel })
  },

  pinMessage: (messageId, pinned) => {
    chatSocket.pinMessage({ messageId, pinned })
  },

  setTyping: (isTyping) => {
    if (!isTyping) return
    if (typingTimer && Date.now() - typingTimer < 1200) return
    typingTimer = Date.now()
    chatSocket.setTyping(get().currentChannel)
  },

  setReplyTo: (message) => set({ replyTo: message }),

  markAsRead: async (channel) => {
    await api.post('/api/chat/read', { channel })
    set((state) => ({ unreadCount: { ...state.unreadCount, [channel]: 0 } }))
  },

  refreshUnread: async () => {
    const { data } = await api.get('/api/chat/unread')
    const payload = data as { unread: Record<string, number>; channels: string[] }
    set({ unreadCount: payload.unread, channels: payload.channels })
    const { data: online } = await api.get('/api/chat/online')
    set({ onlineUsers: (online as { users: ChatUserInfo[] }).users })
  },
}))
