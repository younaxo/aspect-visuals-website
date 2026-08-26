import type { Role } from '../../types'
import {
  DISCORD_ROLE_LABELS,
  getRoleIconUrl,
  getRoleKeyByDiscordId,
  sortRolesByHierarchy,
} from '../../utils/discordRoles'

export function RoleHierarchy({ roles }: { roles: Role[] }) {
  const ordered = sortRolesByHierarchy(roles)

  if (!ordered.length) {
    return <span>Def</span>
  }

  return (
    <span className="role-hierarchy">
      {ordered.map((role) => {
        const key = getRoleKeyByDiscordId(role.discordId)
        const label = key ? DISCORD_ROLE_LABELS[key] : role.name
        const icon = getRoleIconUrl(key)
        return (
          <span key={role.id} className="role-chip">
            {icon && <img className="role-icon" src={icon} alt="" draggable={false} />}
            {label}
          </span>
        )
      })}
    </span>
  )
}
