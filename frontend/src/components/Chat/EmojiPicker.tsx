import EmojiPicker, { Theme } from 'emoji-picker-react'

interface ChatEmojiPickerProps {
  onSelect: (emoji: string) => void
}

export function ChatEmojiPicker({ onSelect }: ChatEmojiPickerProps) {
  return (
    <EmojiPicker
      onEmojiClick={(emoji) => onSelect(emoji.emoji)}
      width="100%"
      height={300}
      theme={Theme.DARK}
      previewConfig={{ showPreview: false }}
    />
  )
}
