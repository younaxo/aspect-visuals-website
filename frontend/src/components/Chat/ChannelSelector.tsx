import { Hash, Shield, Lock } from './channelIcons'

interface ChannelSelectorProps {
  channels: string[]
  current: string
  unread: Record<string, number>
  onChange: (channel: string) => void
}

const LABELS: Record<string, string> = {
  general: 'Общий',
  moderator: 'Модераторы',
  admin: 'Админы',
}

export function ChannelSelector({ channels, current, unread, onChange }: ChannelSelectorProps) {
  return (
    <nav className="chat-channels" aria-label="Каналы чата">
      {channels.map((channel) => {
        const count = unread[channel] || 0
        return (
          <button
            key={channel}
            type="button"
            className={`chat-channel ${current === channel ? 'is-active' : ''}`}
            onClick={() => onChange(channel)}
          >
            {channel === 'admin' ? <Lock /> : channel === 'moderator' ? <Shield /> : <Hash />}
            <span>{LABELS[channel] || channel}</span>
            {count > 0 && <span className="chat-badge">{count > 99 ? '99+' : count}</span>}
          </button>
        )
      })}
    </nav>
  )
}
