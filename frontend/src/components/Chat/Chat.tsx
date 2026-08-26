import { useEffect } from 'react'
import { ChannelSelector } from './ChannelSelector'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { OnlineUsers } from './OnlineUsers'
import { setChatActive, useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'

export function Chat() {
  const user = useAuthStore((state) => state.user)
  const settings = useAuthStore((state) => state.settings)
  const {
    messages,
    currentChannel,
    channels,
    unreadCount,
    onlineUsers,
    typingUsers,
    replyTo,
    hasMore,
    loading,
    connect,
    setChannel,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    pinMessage,
    setTyping,
    setReplyTo,
  } = useChatStore()

  useEffect(() => {
    setChatActive(true)
    connect()
    void setChannel(useChatStore.getState().currentChannel)
    if (settings.notifications && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
    return () => setChatActive(false)
  }, [connect, setChannel, settings.notifications])

  const typingLabel = typingUsers
    .filter((id) => id !== user?.id)
    .map((id) => onlineUsers.find((item) => item.id === id)?.username || 'Кто-то')
    .join(', ')

  return (
    <section className="chat-page">
      <div className="chat-shell liquid-glass">
        <ChannelSelector
          channels={channels}
          current={currentChannel}
          unread={unreadCount}
          onChange={(channel) => void setChannel(channel)}
        />
        <div className="chat-main">
          <MessageList
            messages={messages}
            hasMore={hasMore}
            loading={loading}
            onLoadMore={() => {
              const first = messages[0]
              if (first) void loadMessages(currentChannel, first.id)
            }}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onReply={setReplyTo}
            onPin={pinMessage}
            onReact={addReaction}
            onUnreact={removeReaction}
          />
          {typingLabel && <p className="chat-typing">{typingLabel} печатает…</p>}
          <MessageInput
            onSend={(content) => sendMessage(content)}
            onTyping={() => setTyping(true)}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>
        <OnlineUsers users={onlineUsers} />
      </div>
    </section>
  )
}
