import type { KeyboardEvent } from 'react'
import type { User } from '../../types'
import { getHighestRole, getHighestRoleKey, getRoleIconUrl } from '../../utils/discordRoles'
import { Tooltip } from '../Common/Tooltip'

interface UserNameLineProps {
  user: User
  editing?: boolean
  username?: string
  compact?: boolean
  disabled?: boolean
  onUsernameChange?: (value: string) => void
  onUsernameBlur?: () => void
  onUsernameKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function UserNameLine({
  user,
  editing = false,
  username,
  compact = false,
  disabled = false,
  onUsernameChange,
  onUsernameBlur,
  onUsernameKeyDown,
}: UserNameLineProps) {
  const role = getHighestRole(user)
  const icon = getRoleIconUrl(getHighestRoleKey(user))
  const uid = typeof user.uid === 'number' ? user.uid : null

  return (
    <div className={`profile-name-row ${compact ? 'compact' : ''}`}>
      {editing ? (
        <input
          className={`profile-input ${compact ? 'profile-input-compact' : ''}`}
          value={username ?? user.username}
          onChange={(event) => onUsernameChange?.(event.target.value)}
          onBlur={onUsernameBlur}
          onKeyDown={onUsernameKeyDown}
          maxLength={32}
          disabled={disabled}
          aria-label="Никнейм"
        />
      ) : (
        <span className={compact ? 'profile-name' : 'profile-display-name'}>{user.username}</span>
      )}
      {icon && (
        <Tooltip content={role?.name ?? 'Роль'} side="top">
          <img className="role-icon" src={icon} alt={role?.name ?? ''} draggable={false} />
        </Tooltip>
      )}
      {uid !== null && (
        <Tooltip content="Уникальный номер профиля" side="top">
          <span className="profile-uid">#{uid}</span>
        </Tooltip>
      )}
    </div>
  )
}
