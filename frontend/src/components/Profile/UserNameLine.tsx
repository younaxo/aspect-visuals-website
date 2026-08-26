import type { KeyboardEvent } from 'react'
import type { User } from '../../types'
import {
  DISCORD_ROLE_LABELS,
  getRoleIconUrl,
  getRoleKeyByDiscordId,
  sortRolesByHierarchy,
} from '../../utils/discordRoles'
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
  const roles = sortRolesByHierarchy(user.roles)
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
      {roles.map((role) => {
        const key = getRoleKeyByDiscordId(role.discordId)
        const label = key ? DISCORD_ROLE_LABELS[key] : role.name
        const icon = getRoleIconUrl(key)
        return icon ? (
          <Tooltip key={role.id} content={label}>
            <img className="role-icon" src={icon} alt={label} draggable={false} />
          </Tooltip>
        ) : (
          <span key={role.id} className="role-chip compact">
            {label}
          </span>
        )
      })}
      {uid !== null && (
        <Tooltip content="Уникальный номер профиля">
          <span className="profile-uid">#{uid}</span>
        </Tooltip>
      )}
    </div>
  )
}
