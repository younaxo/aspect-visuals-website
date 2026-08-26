import { useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ChatEmojiPicker } from './EmojiPicker'
import { getUserAvatarUrl } from '../../utils/media'
import { isAdmin, isStaff } from '../../utils/discordRoles'
import { useAuth } from '../../hooks/useAuth'
import type { ChatMessage } from '../../store/chatStore'

interface MessageItemProps {
  message: ChatMessage
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onReply: (message: ChatMessage) => void
  onPin: (id: string, pinned: boolean) => void
  onReact: (id: string, emoji: string) => void
  onUnreact: (id: string, emoji: string) => void
}

const QUICK = ['👍', '❤️', '🔥', '😂', '👀']

export function MessageItem({
  message,
  onEdit,
  onDelete,
  onReply,
  onPin,
  onReact,
  onUnreact,
}: MessageItemProps) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [picker, setPicker] = useState(false)

  const mine = user?.id === message.userId
  const canDelete = mine || isStaff(user)
  const canPin = isAdmin(user)

  if (message.isDeleted) {
    return (
      <article className="chat-message is-deleted">
        <p className="page-text">Сообщение удалено</p>
      </article>
    )
  }

  return (
    <article className={`chat-message ${message.isPinned ? 'is-pinned' : ''}`}>
      <span className={`avatar-wrap status-${message.user.status || 'online'}`}>
        <img className="avatar" src={getUserAvatarUrl(message.user)} alt="" />
        <span className="online-dot" aria-hidden="true" />
      </span>
      <div className="chat-message-body">
        <header className="chat-message-head">
          <strong>{message.user.username}</strong>
          <time dateTime={message.createdAt}>
            {format(new Date(message.createdAt), 'd MMM HH:mm', { locale: ru })}
          </time>
          {message.isEdited && <span className="chat-edited">отредактировано</span>}
          {message.isPinned && <span className="chat-pin-flag">закреплено</span>}
        </header>
        {editing ? (
          <div className="chat-edit">
            <textarea className="profile-input" value={draft} onChange={(event) => setDraft(event.target.value)} />
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onEdit(message.id, draft)
                setEditing(false)
              }}
            >
              Сохранить
            </button>
          </div>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
        <div className="chat-reactions">
          {message.reactions.map((reaction) => {
            const active = user ? reaction.userIds.includes(user.id) : false
            return (
              <button
                key={reaction.emoji}
                type="button"
                className={`chat-reaction ${active ? 'is-active' : ''}`}
                onClick={() => (active ? onUnreact(message.id, reaction.emoji) : onReact(message.id, reaction.emoji))}
              >
                {reaction.emoji} {reaction.count}
              </button>
            )
          })}
          {QUICK.map((emoji) => (
            <button key={emoji} type="button" className="chat-reaction" onClick={() => onReact(message.id, emoji)}>
              {emoji}
            </button>
          ))}
          <button type="button" className="chat-reaction" onClick={() => setPicker((open) => !open)}>
            +
          </button>
        </div>
        {picker && (
          <div className="chat-emoji-pop">
            <ChatEmojiPicker
              onSelect={(emoji) => {
                onReact(message.id, emoji)
                setPicker(false)
              }}
            />
          </div>
        )}
        <div className="chat-actions">
          <button type="button" onClick={() => onReply(message)}>
            Ответить
          </button>
          {mine && (
            <button
              type="button"
              onClick={() => {
                setDraft(message.content)
                setEditing(true)
              }}
            >
              Изменить
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={() => onDelete(message.id)}>
              Удалить
            </button>
          )}
          {canPin && (
            <button type="button" onClick={() => onPin(message.id, !message.isPinned)}>
              {message.isPinned ? 'Открепить' : 'Закрепить'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
