import { getUserAvatarUrl } from '../../utils/media'
import type { ChatUserInfo } from '../../store/chatStore'

interface OnlineUsersProps {
  users: ChatUserInfo[]
}

export function OnlineUsers({ users }: OnlineUsersProps) {
  const online = users.filter((user) => user.isOnline !== false)

  return (
    <aside className="chat-online" aria-label="Онлайн">
      <p className="chat-online-title">Онлайн · {online.length}</p>
      <ul className="chat-online-list">
        {online.map((user) => (
          <li key={user.id} className="chat-online-item">
            <span className="avatar-wrap status-online">
              <img className="avatar" src={getUserAvatarUrl(user)} alt="" />
              <span className="online-dot" aria-hidden="true" />
            </span>
            <span>{user.username}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
