import { useEffect, useMemo, useRef } from 'react'
import { format, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { MessageItem } from './MessageItem'
import type { ChatMessage } from '../../store/chatStore'

interface MessageListProps {
  messages: ChatMessage[]
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onReply: (message: ChatMessage) => void
  onPin: (id: string, pinned: boolean) => void
  onReact: (id: string, emoji: string) => void
  onUnreact: (id: string, emoji: string) => void
}

export function MessageList({
  messages,
  hasMore,
  loading,
  onLoadMore,
  onEdit,
  onDelete,
  onReply,
  onPin,
  onReact,
  onUnreact,
}: MessageListProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const grouped = useMemo(() => {
    const days: Array<{ label: string; items: ChatMessage[] }> = []
    for (const message of messages) {
      const date = new Date(message.createdAt)
      const last = days[days.length - 1]
      if (!last || !isSameDay(new Date(last.items[0].createdAt), date)) {
        days.push({ label: format(date, 'd MMMM yyyy', { locale: ru }), items: [message] })
      } else {
        last.items.push(message)
      }
    }
    return days
  }, [messages])

  useEffect(() => {
    if (stickToBottom.current && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight
    }
  }, [messages.length])

  return (
    <div
      className="chat-list"
      ref={scroller}
      onScroll={(event) => {
        const el = event.currentTarget
        stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        if (el.scrollTop < 48 && hasMore && !loading) onLoadMore()
      }}
    >
      {loading && <p className="page-text">Загрузка…</p>}
      {grouped.map((group) => (
        <section key={group.label} className="chat-day">
          <h2 className="chat-day-label">{group.label}</h2>
          {group.items.map((message) => (
            <div key={message.id} className={message.parentId ? 'chat-reply-thread' : undefined}>
              <MessageItem
                message={message}
                onEdit={onEdit}
                onDelete={onDelete}
                onReply={onReply}
                onPin={onPin}
                onReact={onReact}
                onUnreact={onUnreact}
              />
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
