import { useEffect, useRef, useState } from 'react'
import { Button } from '../Common/Button'
import { ChatEmojiPicker } from './EmojiPicker'
import type { ChatMessage } from '../../store/chatStore'

interface MessageInputProps {
  onSend: (content: string) => void
  onTyping: () => void
  replyTo: ChatMessage | null
  onCancelReply: () => void
}

export function MessageInput({ onSend, onTyping, replyTo, onCancelReply }: MessageInputProps) {
  const [value, setValue] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [replyTo])

  const submit = () => {
    const content = value.trim()
    if (!content) return
    onSend(content)
    setValue('')
    setEmojiOpen(false)
  }

  return (
    <div className="chat-input-wrap">
      {replyTo && (
        <div className="chat-reply-bar">
          <span>
            Ответ для {replyTo.user.username}: {replyTo.content.slice(0, 80)}
          </span>
          <button type="button" className="btn-ghost" onClick={onCancelReply}>
            Отмена
          </button>
        </div>
      )}
      {emojiOpen && (
        <div className="chat-emoji-pop">
          <ChatEmojiPicker
            onSelect={(emoji) => {
              setValue((current) => current + emoji)
              setEmojiOpen(false)
              ref.current?.focus()
            }}
          />
        </div>
      )}
      <div className="chat-input-row">
        <button type="button" className="btn-ghost chat-emoji-btn" onClick={() => setEmojiOpen((open) => !open)}>
          ☺
        </button>
        <textarea
          ref={ref}
          className="profile-input chat-textarea"
          rows={2}
          value={value}
          placeholder="Сообщение… Markdown и эмодзи поддерживаются. Enter — отправить, Shift+Enter — новая строка"
          onChange={(event) => {
            setValue(event.target.value)
            onTyping()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
        />
        <Button disabled={!value.trim()} onClick={submit}>
          Отправить
        </Button>
      </div>
    </div>
  )
}
